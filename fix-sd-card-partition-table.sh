#!/bin/bash
# Script to fix corrupted GPT partition table on SD card
# This script attempts to repair or recreate the partition table
# Usage: sudo ./fix-sd-card-partition-table.sh [device] [backup-image]

# Don't use set -e, we want to handle errors explicitly and provide clear messages

# Configuration
SD_CARD_DEVICE="${1:-/dev/rdisk7}"
BACKUP_IMAGE="${2}"

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

# Verify we actually have root privileges
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
    exit 1
fi

log_info "=== SD Card Partition Table Repair ==="
log_info "Device: $SD_CARD_DEVICE (disk: $DISK_DEVICE)"
log_info ""

# Step 1: Check current status
log_step "Step 1: Checking current partition table status..."
GPT_CHECK=$(gpt show "$DISK_DEVICE" 2>&1 || true)

if echo "$GPT_CHECK" | grep -q "bogus map"; then
    log_error "Confirmed: GPT partition table is corrupted"
    CORRUPTED=true
elif echo "$GPT_CHECK" | grep -q "Operation not permitted"; then
    log_error "Permission issue - trying to unmount..."
    diskutil unmountDisk "$DISK_DEVICE" 2>/dev/null || true
    sleep 2
    GPT_CHECK=$(gpt show "$DISK_DEVICE" 2>&1 || true)
    if echo "$GPT_CHECK" | grep -q "bogus map"; then
        CORRUPTED=true
    else
        log_error "Still cannot access device"
        exit 1
    fi
else
    log_info "Partition table appears to be readable"
    log_warn "If you're still experiencing boot issues, the problem may be elsewhere"
    exit 0
fi

log_info ""

# Step 2: Check for backup image
if [ -n "$BACKUP_IMAGE" ] && [ -f "$BACKUP_IMAGE" ]; then
    log_step "Step 2: Backup image provided - using restore script..."
    log_info "Backup image: $BACKUP_IMAGE"
    log_info ""
    log_warn "This will restore the entire SD card from backup"
    log_warn "All current data will be lost!"
    log_info ""
    read -p "Continue with restore? (yes/no) " -r
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        log_info "Restore cancelled"
        exit 0
    fi
    
    # Use the restore script
    if [ -f "./restore-sd-card.sh" ]; then
        log_info "Running restore script..."
        ./restore-sd-card.sh "$BACKUP_IMAGE" "$SD_CARD_DEVICE"
        exit $?
    else
        log_error "restore-sd-card.sh not found in current directory"
        exit 1
    fi
fi

# Step 3: Check for partition info file
log_step "Step 2: Checking for partition information..."
PARTITION_INFO_FILES=$(ls -1 *.partitions 2>/dev/null | head -1)

if [ -n "$PARTITION_INFO_FILES" ]; then
    log_info "Found partition info file: $PARTITION_INFO_FILES"
    log_info "This contains the original partition layout"
    log_warn "Attempting to recreate partition table from info file..."
    log_warn "WARNING: This is risky and may cause data loss if partition sizes don't match"
    log_info ""
    read -p "Continue? (yes/no) " -r
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        log_info "Cancelled"
        exit 0
    fi
    
    # Source the partition info file
    source "$PARTITION_INFO_FILES"
    
    # Get device size
    TARGET_INFO=$(diskutil info "$DISK_DEVICE" 2>/dev/null)
    TARGET_SIZE_BYTES=$(echo "$TARGET_INFO" | grep -i "disk size" | grep -oE "[0-9]+" | head -1)
    if [ -z "$TARGET_SIZE_BYTES" ]; then
        TARGET_SIZE_BYTES=$(diskutil info "$DISK_DEVICE" 2>/dev/null | grep -i "total size" | grep -oE "[0-9]+" | head -1)
    fi
    if [ ${#TARGET_SIZE_BYTES} -lt 10 ]; then
        TARGET_SIZE_BYTES=$(echo "$TARGET_SIZE_BYTES * 1024 * 1024 * 1024" | bc | awk '{print int($1)}')
    fi
    TARGET_SIZE_SECTORS=$((TARGET_SIZE_BYTES / 512))
    
    log_info "Recreating GPT partition table..."
    
    # Destroy existing GPT
    log_info "Destroying corrupted GPT..."
    gpt destroy "$DISK_DEVICE" 2>/dev/null || true
    
    # Create new GPT
    log_info "Creating new GPT..."
    gpt create "$DISK_DEVICE" || {
        log_error "Failed to create GPT"
        exit 1
    }
    
    # Recreate partitions from info file
    # This is a simplified version - the full restore script has better logic
    log_warn "Partition recreation from info file is complex"
    log_warn "It's safer to use the restore script with the backup image"
    log_warn "Aborting manual partition recreation for safety"
    exit 1
fi

# Step 4: No backup available - provide options
log_step "Step 2: No backup or partition info found"
log_error "Cannot automatically repair without backup information"
log_error ""
log_error "Options:"
log_error "  1. Restore from backup image (RECOMMENDED):"
log_error "     sudo ./fix-sd-card-partition-table.sh $SD_CARD_DEVICE <backup-image>"
log_error ""
log_error "  2. Use restore script with backup:"
log_error "     sudo ./restore-sd-card.sh <backup-image> $SD_CARD_DEVICE"
log_error ""
log_error "  3. If you know the exact partition layout, you can manually recreate it"
log_error "     But this is very risky and may cause data loss"
log_error ""
log_warn "Without a backup, data recovery may not be possible"
log_warn "The partition table is corrupted and the exact layout is unknown"

exit 1

