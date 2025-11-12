#!/bin/bash
# Restore script for SD card backup
# Usage: ./restore-sd-card.sh [backup-file] [target-device]

set -e

# Configuration
BACKUP_FILE="${1}"
TARGET_DEVICE="${2}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_FILE="$HOME/backups/lichee-rv-dock/restore-${TIMESTAMP}.log"

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

# Check arguments
if [ -z "$BACKUP_FILE" ] || [ -z "$TARGET_DEVICE" ]; then
    log_error "Usage: $0 <backup-file> <target-device>"
    log_info "Example: $0 ~/backups/lichee-rv-dock/lichee-rv-dock-backup-20240101-120000.img.gz /dev/rdisk7"
    exit 1
fi

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    log_error "Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Check if target device exists
if [ ! -b "$TARGET_DEVICE" ] && [ ! -c "$TARGET_DEVICE" ]; then
    log_error "Target device not found: $TARGET_DEVICE"
    log_info "Available disks:"
    diskutil list | grep -E "^/dev/disk" | head -10
    exit 1
fi

log_info "=== SD Card Restore Script ==="
log_info "Backup file: $BACKUP_FILE"
log_info "Target device: $TARGET_DEVICE"

# Get backup file size
BACKUP_SIZE=$(ls -lh "$BACKUP_FILE" | awk '{print $5}')
BACKUP_SIZE_BYTES=$(stat -f%z "$BACKUP_FILE" 2>/dev/null || stat -c%s "$BACKUP_FILE" 2>/dev/null)
log_info "Backup file size: $BACKUP_SIZE"

# Get target device size
TARGET_SIZE_STR=$(diskutil info $(echo $TARGET_DEVICE | sed 's/rdisk/disk/') | grep "Disk Size:" | awk '{for(i=3;i<=NF;i++) printf "%s ", $i; print ""}')
TARGET_SIZE_BYTES=$(diskutil info $(echo $TARGET_DEVICE | sed 's/rdisk/disk/') | grep "Total Size:" | awk '{print $5 $6}' | tr -d '()' || echo "0")

log_info "Target device size: $TARGET_SIZE_STR"

# Verify checksum if exists
CHECKSUM_FILE="${BACKUP_FILE}.sha256"
if [ -f "$CHECKSUM_FILE" ]; then
    log_info "Verifying backup checksum..."
    if shasum -a 256 -c "$CHECKSUM_FILE" > /dev/null 2>&1; then
        log_info "✓ Checksum verified successfully"
    else
        log_error "✗ Checksum verification failed!"
        read -p "Continue anyway? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
else
    log_warn "No checksum file found. Skipping verification."
fi

# Estimate decompressed size (rough estimate: compressed images are typically 2-3x smaller)
# For gzip, we can't know exact size without decompressing, so we'll monitor during restore
log_warn "WARNING: This will overwrite all data on $TARGET_DEVICE"
log_info "Make sure you have selected the correct device!"
log_info ""
read -p "Type 'YES' to confirm: " CONFIRM
if [ "$CONFIRM" != "YES" ]; then
    log_info "Restore cancelled"
    exit 0
fi

# Unmount the device if mounted
log_info "Unmounting target device..."
diskutil unmountDisk $(echo $TARGET_DEVICE | sed 's/rdisk/disk/') 2>/dev/null || true

# Check if pv is installed
if command -v pv &> /dev/null; then
    HAS_PV=true
    log_info "pv is installed, will show progress"
else
    HAS_PV=false
    log_warn "pv is not installed. Install with: brew install pv"
fi

# Start restore
log_info "Starting restore at $(date)"
log_info "This may take a while, please be patient..."
START_TIME=$(date +%s)

if [ "$HAS_PV" = true ]; then
    # Restore with progress bar
    gunzip -c "$BACKUP_FILE" | \
        pv | \
        sudo dd of="$TARGET_DEVICE" bs=4m 2>&1 | tee -a "$LOG_FILE"
else
    # Restore without pv
    gunzip -c "$BACKUP_FILE" | \
        sudo dd of="$TARGET_DEVICE" bs=4m status=progress 2>&1 | tee -a "$LOG_FILE"
fi

RESTORE_EXIT_CODE=${PIPESTATUS[0]}

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
DURATION_MIN=$((DURATION / 60))
DURATION_SEC=$((DURATION % 60))

# Check restore result
if [ $RESTORE_EXIT_CODE -eq 0 ]; then
    log_info ""
    log_info "=== Restore Completed Successfully! ==="
    log_info "Duration: ${DURATION_MIN}m ${DURATION_SEC}s"
    
    # Sync to ensure all data is written
    log_info "Syncing disk..."
    sync
    
    # Eject the disk (optional)
    log_info "Restore completed. You can now safely remove the SD card."
    log_info "To eject: diskutil eject $(echo $TARGET_DEVICE | sed 's/rdisk/disk/')"
    
else
    log_error "Restore failed with exit code: $RESTORE_EXIT_CODE"
    log_error "Please check the log file: $LOG_FILE"
    exit 1
fi

