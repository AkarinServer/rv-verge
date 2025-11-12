#!/bin/bash
# Smart backup script for SD card - only backups used partitions
# This allows restoring a larger card backup to a smaller card
# Usage: sudo ./backup-sd-card-smart.sh [device] [backup-dir] [max-size-GB]

set -e

# Configuration
DEVICE="${1:-/dev/rdisk7}"
BACKUP_DIR="${2:-$HOME/backups/lichee-rv-dock}"
MAX_SIZE_GB="${3}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="lichee-rv-dock-backup-${TIMESTAMP}.img.gz"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_FILE"
LOG_FILE="$BACKUP_DIR/backup-${TIMESTAMP}.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    log_error "Please run as root or with sudo"
    exit 1
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Check if device exists
DISK_DEVICE=$(echo $DEVICE | sed 's/rdisk/disk/')
if [ ! -b "$DEVICE" ] && [ ! -c "$DEVICE" ]; then
    log_error "Device $DEVICE not found!"
    log_info "Available disks:"
    diskutil list | grep -E "^/dev/disk" | head -10
    exit 1
fi

log_info "=== SD Card Smart Backup Script ==="
log_info "Device: $DEVICE (disk: $DISK_DEVICE)"
log_info "Backup file: $BACKUP_PATH"

# Get disk information
log_info "Analyzing disk structure..."

# Method 1: Try to read GPT partition table using gpt command
log_info "Reading partition table..."
GPT_OUTPUT=$(gpt show "$DISK_DEVICE" 2>&1)
GPT_EXIT_CODE=$?

if [ $GPT_EXIT_CODE -eq 0 ] && [ -n "$GPT_OUTPUT" ]; then
    # Parse GPT output to find the last partition's end sector
    # Format: index start size type uuid name
    LAST_END_SECTOR=0
    while IFS= read -r line; do
        # Skip header and empty lines
        if [[ $line =~ ^[[:space:]]*[0-9]+[[:space:]]+ ]]; then
            # Extract start and size (columns 2 and 3)
            START_SECTOR=$(echo "$line" | awk '{print $2}')
            SIZE_SECTORS=$(echo "$line" | awk '{print $3}')
            if [ -n "$START_SECTOR" ] && [ -n "$SIZE_SECTORS" ] && [ "$START_SECTOR" != "0" ]; then
                END_SECTOR=$((START_SECTOR + SIZE_SECTORS))
                if [ $END_SECTOR -gt $LAST_END_SECTOR ]; then
                    LAST_END_SECTOR=$END_SECTOR
                fi
                log_info "Found partition: start=$START_SECTOR, size=$SIZE_SECTORS, end=$END_SECTOR"
            fi
        fi
    done <<< "$GPT_OUTPUT"
    
    if [ $LAST_END_SECTOR -gt 0 ]; then
        SECTOR_SIZE=512
        LAST_END_BYTES=$((LAST_END_SECTOR * SECTOR_SIZE))
        LAST_END_MB=$((LAST_END_BYTES / 1024 / 1024))
        LAST_END_GB=$(echo "scale=2; $LAST_END_BYTES / 1024 / 1024 / 1024" | bc)
        
        log_info "Last partition ends at sector: $LAST_END_SECTOR"
        log_info "Last partition ends at: ${LAST_END_GB} GB (${LAST_END_MB} MB)"
        
        # Add 1MB safety margin for partition table
        SAFETY_MARGIN=$((1 * 1024 * 1024))
        BACKUP_SIZE=$((LAST_END_BYTES + SAFETY_MARGIN))
        BACKUP_SIZE_GB=$(echo "scale=2; $BACKUP_SIZE / 1024 / 1024 / 1024" | bc)
        log_info "Backup size (with safety margin): ${BACKUP_SIZE_GB} GB"
    else
        log_warn "Could not parse partition table"
        BACKUP_SIZE=0
    fi
else
    log_warn "Could not read GPT partition table: $GPT_OUTPUT"
    BACKUP_SIZE=0
fi

# If we couldn't determine the backup size, ask user or use default
if [ $BACKUP_SIZE -eq 0 ]; then
    if [ -z "$MAX_SIZE_GB" ]; then
        log_info ""
        log_info "Could not automatically determine backup size."
        log_info "Please specify the backup size:"
        log_info "  1. 32GB (recommended for restoring to 32GB card)"
        log_info "  2. 31GB (conservative)"
        log_info "  3. Custom size (in GB)"
        log_info ""
        read -p "Enter choice (1/2/3) or size in GB: " USER_CHOICE
        
        case "$USER_CHOICE" in
            1)
                MAX_SIZE_GB=32
                ;;
            2)
                MAX_SIZE_GB=31
                ;;
            *)
                # Try to parse as number
                if [[ "$USER_CHOICE" =~ ^[0-9]+(\.[0-9]+)?$ ]]; then
                    MAX_SIZE_GB="$USER_CHOICE"
                else
                    log_warn "Invalid choice, using default: 32GB"
                    MAX_SIZE_GB=32
                fi
                ;;
        esac
    fi
    
    BACKUP_SIZE=$((MAX_SIZE_GB * 1024 * 1024 * 1024))
    BACKUP_SIZE_GB=$MAX_SIZE_GB
    log_info "Using specified size: ${MAX_SIZE_GB}GB"
else
    # Apply maximum size limit if specified
    if [ -n "$MAX_SIZE_GB" ]; then
        MAX_SIZE_BYTES=$((MAX_SIZE_GB * 1024 * 1024 * 1024))
        if [ $BACKUP_SIZE -gt $MAX_SIZE_BYTES ]; then
            log_warn "Calculated backup size (${BACKUP_SIZE_GB}GB) exceeds maximum (${MAX_SIZE_GB}GB)"
            log_info "Limiting backup to ${MAX_SIZE_GB}GB"
            BACKUP_SIZE=$MAX_SIZE_BYTES
            BACKUP_SIZE_GB=$MAX_SIZE_GB
        fi
    fi
fi

# Convert to MB for display
BACKUP_SIZE_MB=$((BACKUP_SIZE / 1024 / 1024))

log_info "Final backup size: ${BACKUP_SIZE_GB} GB (${BACKUP_SIZE_MB} MB)"
log_info "This should fit on a 32GB card after compression"

# Calculate count for dd (in 4MB blocks)
BS=4m
COUNT=$((BACKUP_SIZE / 1024 / 1024 / 4))

log_info "Will backup $COUNT blocks of $BS each"

# Check available disk space
log_info "Checking available disk space..."
AVAILABLE_SPACE=$(df -k "$BACKUP_DIR" | tail -1 | awk '{print $4}')
AVAILABLE_SPACE_GB=$(echo "scale=2; $AVAILABLE_SPACE * 1024 / 1024 / 1024 / 1024" | bc)
log_info "Available space: ${AVAILABLE_SPACE_GB} GB"

# Estimate compressed size (typically 30-50% of original for system images)
ESTIMATED_COMPRESSED=$(echo "scale=2; $BACKUP_SIZE_GB * 0.4" | bc)
log_info "Estimated compressed size: ~${ESTIMATED_COMPRESSED} GB"

if (( $(echo "$AVAILABLE_SPACE_GB < $ESTIMATED_COMPRESSED" | bc -l) )); then
    log_warn "Available space (${AVAILABLE_SPACE_GB} GB) may be insufficient for compressed backup (~${ESTIMATED_COMPRESSED} GB)"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check if pv is installed
if command -v pv &> /dev/null; then
    HAS_PV=true
    log_info "pv is installed, will show progress"
else
    HAS_PV=false
    log_warn "pv is not installed. Install with: brew install pv"
    log_info "Progress will be limited"
fi

# Confirm before proceeding
log_info ""
log_warn "=== Backup Summary ==="
log_info "Source device: $DEVICE"
log_info "Backup size: ${BACKUP_SIZE_GB} GB (${BACKUP_SIZE_MB} MB)"
log_info "Backup file: $BACKUP_PATH"
log_info "Estimated compressed: ~${ESTIMATED_COMPRESSED} GB"
if [ -n "$MAX_SIZE_GB" ]; then
    log_info "Max size limit: ${MAX_SIZE_GB}GB"
fi
log_info ""
read -p "Continue with backup? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log_info "Backup cancelled"
    exit 0
fi

# Start backup
log_info "Starting backup at $(date)"
START_TIME=$(date +%s)

if [ "$HAS_PV" = true ]; then
    # Backup with progress bar
    log_info "Backing up with progress indicator..."
    dd if="$DEVICE" bs="$BS" count="$COUNT" 2>/dev/null | \
        pv -s "${BACKUP_SIZE_MB}M" | \
        gzip -c > "$BACKUP_PATH" 2>&1 | tee -a "$LOG_FILE"
else
    # Backup without pv
    log_info "Backing up (no progress indicator)..."
    dd if="$DEVICE" bs="$BS" count="$COUNT" status=progress 2>&1 | \
        gzip -c > "$BACKUP_PATH" 2>&1 | tee -a "$LOG_FILE"
fi

BACKUP_EXIT_CODE=${PIPESTATUS[0]}

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
DURATION_MIN=$((DURATION / 60))
DURATION_SEC=$((DURATION % 60))

# Check backup result
if [ $BACKUP_EXIT_CODE -eq 0 ] && [ -f "$BACKUP_PATH" ]; then
    BACKUP_SIZE_STR=$(ls -lh "$BACKUP_PATH" | awk '{print $5}')
    BACKUP_SIZE_BYTES=$(stat -f%z "$BACKUP_PATH" 2>/dev/null || stat -c%s "$BACKUP_PATH" 2>/dev/null)
    
    log_info ""
    log_info "=== Backup Completed Successfully! ==="
    log_info "Backup file: $BACKUP_PATH"
    log_info "Backup size: $BACKUP_SIZE_STR"
    log_info "Duration: ${DURATION_MIN}m ${DURATION_SEC}s"
    
    # Calculate compression ratio
    if [ -n "$BACKUP_SIZE_BYTES" ] && [ "$BACKUP_SIZE_BYTES" -gt 0 ]; then
        COMPRESSION_RATIO=$(echo "scale=2; $BACKUP_SIZE_BYTES * 100 / $BACKUP_SIZE" | bc)
        COMPRESSED_GB=$(echo "scale=2; $BACKUP_SIZE_BYTES / 1024 / 1024 / 1024" | bc)
        log_info "Compression ratio: ${COMPRESSION_RATIO}%"
        log_info "Original size: ${BACKUP_SIZE_GB} GB"
        log_info "Compressed size: ${COMPRESSED_GB} GB"
    fi
    
    # Create checksum
    log_info "Creating SHA256 checksum..."
    shasum -a 256 "$BACKUP_PATH" > "$BACKUP_PATH.sha256"
    log_info "Checksum file: $BACKUP_PATH.sha256"
    
    # Verify the backup can be restored to 32GB card
    if [ -n "$BACKUP_SIZE_BYTES" ]; then
        MAX_32GB=$((32 * 1024 * 1024 * 1024))
        # For compressed backups, we check if compressed size is reasonable
        # and if decompressed size (original backup size) fits on 32GB card
        if [ "$BACKUP_SIZE" -le "$MAX_32GB" ]; then
            log_info "✓ Backup original size (${BACKUP_SIZE_GB}GB) fits on 32GB card"
            log_info "✓ Compressed size (${COMPRESSED_GB}GB) is ready for transfer"
        else
            log_warn "⚠ Backup original size (${BACKUP_SIZE_GB}GB) may not fit on 32GB card"
            log_info "However, compressed size (${COMPRESSED_GB}GB) is manageable"
        fi
    fi
    
    log_info ""
    log_info "To restore, use:"
    log_info "  gunzip -c $BACKUP_PATH | sudo dd of=/dev/rdiskX bs=4m"
    log_info ""
    log_info "Or use the restore script: ./restore-sd-card.sh $BACKUP_PATH /dev/rdiskX"
    
else
    log_error "Backup failed with exit code: $BACKUP_EXIT_CODE"
    if [ -f "$BACKUP_PATH" ]; then
        log_warn "Partial backup file exists: $BACKUP_PATH"
        log_warn "You may want to remove it: rm $BACKUP_PATH"
    fi
    exit 1
fi
