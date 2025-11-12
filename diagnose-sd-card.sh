#!/bin/bash
# Diagnostic script for SD card partition table issues
# Usage: sudo ./diagnose-sd-card.sh [device]

# Don't use set -e, we want to handle errors explicitly

# Configuration
SD_CARD_DEVICE="${1:-/dev/rdisk7}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    log_error "This script requires root privileges"
    log_error ""
    log_error "Please run with sudo:"
    log_error "  sudo $0 $*"
    exit 1
fi

# Verify we actually have root privileges by testing a privileged operation
if ! diskutil list >/dev/null 2>&1; then
    log_error "Cannot access diskutil - root privileges may not be working correctly"
    log_error "Please ensure you're running with sudo"
    exit 1
fi

# Convert raw device to regular device
DISK_DEVICE=$(echo "$SD_CARD_DEVICE" | sed 's/rdisk/disk/')

# Check if device exists
if [ ! -b "$SD_CARD_DEVICE" ] && [ ! -c "$SD_CARD_DEVICE" ]; then
    log_error "Device $SD_CARD_DEVICE not found!"
    log_info "Available disks:"
    diskutil list | grep -E "^/dev/disk" | head -10
    exit 1
fi

log_info "=== SD Card Partition Table Diagnostic ==="
log_info "Device: $SD_CARD_DEVICE (disk: $DISK_DEVICE)"
log_info ""

# Step 1: Check GPT partition table
log_step "Step 1: Checking GPT partition table..."

# First, check if we can access the device
if [ ! -r "$SD_CARD_DEVICE" ]; then
    log_error "Cannot read device $SD_CARD_DEVICE"
    log_error "This may indicate a permission issue"
    log_error ""
    log_error "Please ensure:"
    log_error "  1. You're running with sudo"
    log_error "  2. The device is not mounted (try: diskutil unmountDisk $DISK_DEVICE)"
    log_error "  3. The device path is correct"
    exit 1
fi

# Try to read GPT partition table
log_info "Attempting to read partition table from $DISK_DEVICE..."
GPT_OUTPUT=$(gpt show "$DISK_DEVICE" 2>&1)
GPT_EXIT_CODE=$?

if [ $GPT_EXIT_CODE -ne 0 ]; then
    log_error "Failed to read GPT partition table"
    log_error "Exit code: $GPT_EXIT_CODE"
    log_error ""
    
    # Show the actual error output
    if [ -n "$GPT_OUTPUT" ]; then
        log_error "Error output:"
        echo "$GPT_OUTPUT" | while IFS= read -r line; do
            log_error "  $line"
        done
    else
        log_error "No error output (command may have failed silently)"
    fi
    log_error ""
    
    # Check for specific error messages
    if echo "$GPT_OUTPUT" | grep -qi "bogus map"; then
        log_error "CRITICAL: GPT partition table is corrupted ('bogus map' error)"
        log_error ""
        log_error "This explains why U-Boot cannot find partitions:"
        log_error "  - 'No valid partitions found'"
        log_error "  - 'Invalid partition 1'"
        log_error "  - 'Couldn't find partition mmc 0:1'"
        log_error ""
        log_error "The partition table structure is damaged and needs to be repaired."
        log_error ""
        log_warn "Options to fix:"
        log_warn "  1. Restore from a backup image (RECOMMENDED):"
        log_warn "     sudo ./restore-sd-card.sh <backup-image> $SD_CARD_DEVICE"
        log_warn ""
        log_warn "  2. If you have the partition info file (.partitions), you can try:"
        log_warn "     - Use the restore script which will recreate the partition table"
        log_warn ""
        log_warn "  3. As a last resort, manually recreate partition table (RISKY):"
        log_warn "     - This requires knowing exact partition layout"
        log_warn "     - May result in data loss if done incorrectly"
    elif echo "$GPT_OUTPUT" | grep -qi "Operation not permitted\|Permission denied"; then
        log_error "PERMISSION DENIED - Cannot access device"
        log_error ""
        log_error "Even though you're using sudo, the system is denying access."
        log_error "This usually means:"
        log_error "  1. The device is mounted or in use"
        log_error "  2. System Integrity Protection (SIP) is blocking access"
        log_error "  3. The device needs to be unmounted first"
        log_error ""
        log_info "Try these steps:"
        log_info "  1. Unmount the device:"
        log_info "     diskutil unmountDisk $DISK_DEVICE"
        log_info ""
        log_info "  2. Wait a few seconds, then try again"
        log_info ""
        log_info "  3. If still failing, check if device is in use:"
        log_info "     diskutil list | grep -A 5 disk7"
    elif echo "$GPT_OUTPUT" | grep -qi "unable to open device"; then
        log_error "Cannot open device - may be in use or locked"
        log_info "Try: diskutil unmountDisk $DISK_DEVICE"
    else
        log_error "Unknown error reading partition table"
        log_error "Please check the error output above for details"
    fi
    
    log_error ""
    log_error "Script stopped due to error. Please fix the issue above and try again."
    exit 1
fi

log_info "GPT partition table found"
log_info ""

# Step 2: Parse and display partitions
log_step "Step 2: Analyzing partitions..."
PARTITION_COUNT=0
FAT_PARTITION_FOUND=false
LINUX_PARTITION_FOUND=false

while IFS= read -r line; do
    if [[ $line =~ ^[[:space:]]*[0-9]+[[:space:]]+[0-9]+[[:space:]]+[0-9]+[[:space:]]+GPT[[:space:]]+part ]]; then
        PARTITION_COUNT=$((PARTITION_COUNT + 1))
        START_SECTOR=$(echo "$line" | awk '{print $1}')
        SIZE_SECTORS=$(echo "$line" | awk '{print $2}')
        INDEX=$(echo "$line" | awk '{print $3}')
        PARTITION_TYPE=$(echo "$line" | awk '{for(i=5;i<=NF;i++) printf "%s ", $i; print ""}' | xargs)
        
        # Extract partition type GUID
        TYPE_GUID=$(echo "$PARTITION_TYPE" | grep -oE "[A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12}" | head -1)
        
        # Check for common partition types
        if [ -n "$TYPE_GUID" ]; then
            case "$TYPE_GUID" in
                "C12A7328-F81F-11D2-BA4B-00A0C93EC93B")
                    PARTITION_TYPE_NAME="EFI System Partition"
                    ;;
                "EBD0A0A2-B9E5-4433-87C0-68B6B72699C7")
                    PARTITION_TYPE_NAME="Microsoft Basic Data (FAT32)"
                    FAT_PARTITION_FOUND=true
                    ;;
                "0FC63DAF-8483-4772-8E79-3D69D8477DE4")
                    PARTITION_TYPE_NAME="Linux Filesystem"
                    LINUX_PARTITION_FOUND=true
                    ;;
                *)
                    PARTITION_TYPE_NAME="Unknown"
                    ;;
            esac
        else
            PARTITION_TYPE_NAME="Unknown (GUID not found)"
        fi
        
        SIZE_GB=$(echo "scale=2; $SIZE_SECTORS * 512 / 1024 / 1024 / 1024" | bc)
        
        log_info "Partition $INDEX:"
        log_info "  Start sector: $START_SECTOR"
        log_info "  Size: $SIZE_SECTORS sectors (${SIZE_GB} GB)"
        log_info "  Type GUID: ${TYPE_GUID:-NOT FOUND}"
        log_info "  Type: $PARTITION_TYPE_NAME"
        log_info "  Raw type string: $PARTITION_TYPE"
        log_info ""
    fi
done <<< "$GPT_OUTPUT"

log_info "Total partitions found: $PARTITION_COUNT"
log_info ""

# Step 3: Check for critical partitions
log_step "Step 3: Checking for critical partitions..."

if [ "$PARTITION_COUNT" -eq 0 ]; then
    log_error "No partitions found! The partition table is empty or corrupted."
    log_error "This explains why U-Boot cannot find partitions."
    exit 1
fi

if [ "$FAT_PARTITION_FOUND" = false ]; then
    log_warn "No FAT32 partition found!"
    log_warn "U-Boot typically requires a FAT32 partition (usually partition 1) for environment variables"
    log_warn "This explains the 'No valid partitions found' error in U-Boot"
fi

if [ "$LINUX_PARTITION_FOUND" = false ]; then
    log_warn "No Linux filesystem partition found!"
    log_warn "The system root filesystem partition is missing"
fi

# Step 4: Check partition order
log_step "Step 4: Checking partition order..."
FIRST_PARTITION_INDEX=$(echo "$GPT_OUTPUT" | grep "GPT part" | head -1 | awk '{print $3}')
if [ -z "$FIRST_PARTITION_INDEX" ]; then
    FIRST_PARTITION_INDEX="N/A"
fi

log_info "First partition index: $FIRST_PARTITION_INDEX"
if [ "$FIRST_PARTITION_INDEX" != "1" ]; then
    log_warn "First partition is not index 1 (it's $FIRST_PARTITION_INDEX)"
    log_warn "U-Boot may expect partition 1 to be the FAT32 partition"
fi

# Step 5: Check for partition gaps or overlaps
log_step "Step 5: Checking partition layout..."
PREV_END=34  # GPT starts at sector 34
HAS_ISSUES=false

while IFS= read -r line; do
    if [[ $line =~ ^[[:space:]]*[0-9]+[[:space:]]+[0-9]+[[:space:]]+[0-9]+[[:space:]]+GPT[[:space:]]+part ]]; then
        START_SECTOR=$(echo "$line" | awk '{print $1}')
        SIZE_SECTORS=$(echo "$line" | awk '{print $2}')
        INDEX=$(echo "$line" | awk '{print $3}')
        END_SECTOR=$((START_SECTOR + SIZE_SECTORS))
        
        if [ "$START_SECTOR" -lt "$PREV_END" ]; then
            log_error "Partition $INDEX overlaps with previous partition!"
            log_error "  Start: $START_SECTOR, Previous end: $PREV_END"
            HAS_ISSUES=true
        elif [ "$START_SECTOR" -gt "$PREV_END" ]; then
            GAP=$((START_SECTOR - PREV_END))
            if [ "$GAP" -gt 100 ]; then
                log_warn "Gap of $GAP sectors between partitions (may be intentional)"
            fi
        fi
        
        PREV_END=$END_SECTOR
    fi
done <<< "$GPT_OUTPUT"

if [ "$HAS_ISSUES" = false ]; then
    log_info "Partition layout appears valid (no overlaps detected)"
fi

log_info ""

# Step 6: Summary and recommendations
log_step "Step 6: Summary and Recommendations"
log_info ""

if [ "$PARTITION_COUNT" -eq 0 ]; then
    log_error "CRITICAL: No partitions found"
    log_error "Recommendation: Restore from backup or recreate partition table"
elif [ "$FAT_PARTITION_FOUND" = false ] || [ "$LINUX_PARTITION_FOUND" = false ]; then
    log_warn "WARNING: Missing critical partitions"
    log_warn "Recommendation: Restore from a known-good backup"
    log_warn "If you have a backup image, run:"
    log_warn "  sudo ./restore-sd-card.sh <backup-image> $SD_CARD_DEVICE"
else
    log_info "✓ All critical partitions found"
    log_info "If U-Boot still cannot boot, the issue may be:"
    log_info "  1. Filesystem corruption inside partitions"
    log_info "  2. Missing or corrupted boot files"
    log_info "  3. U-Boot configuration issues"
fi

log_info ""
log_info "=== Diagnostic Complete ==="

