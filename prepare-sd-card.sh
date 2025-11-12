#!/bin/bash
# Script to prepare SD card for operations (unmount, check status)
# Usage: sudo ./prepare-sd-card.sh [device]

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

# Convert raw device to regular device
DISK_DEVICE=$(echo "$SD_CARD_DEVICE" | sed 's/rdisk/disk/')

log_info "=== SD Card Preparation ==="
log_info "Device: $SD_CARD_DEVICE (disk: $DISK_DEVICE)"
log_info ""

# Step 1: Check current mount status
log_step "Step 1: Checking mount status..."
MOUNT_INFO=$(diskutil info "$DISK_DEVICE" 2>/dev/null | grep -i "mounted" | head -1)

if echo "$MOUNT_INFO" | grep -qi "yes\|mounted"; then
    log_warn "Device appears to be mounted"
    log_info "Attempting to unmount..."
    
    if diskutil unmountDisk "$DISK_DEVICE" 2>/dev/null; then
        log_info "Device unmounted successfully"
        sleep 2
    else
        log_warn "Could not unmount device (may already be unmounted or in use)"
    fi
else
    log_info "Device is not mounted"
fi

log_info ""

# Step 2: Try to read partition table
log_step "Step 2: Testing partition table access..."
GPT_OUTPUT=$(gpt show "$DISK_DEVICE" 2>&1)
GPT_EXIT_CODE=$?

if [ $GPT_EXIT_CODE -eq 0 ]; then
    log_info "✓ Partition table is readable"
    log_info ""
    log_info "Partition table:"
    echo "$GPT_OUTPUT" | grep "GPT part" || log_warn "No partitions found"
elif echo "$GPT_OUTPUT" | grep -qi "bogus map"; then
    log_error "✗ Partition table is corrupted ('bogus map')"
    log_error ""
    log_error "The partition table needs to be repaired or restored from backup"
elif echo "$GPT_OUTPUT" | grep -qi "Operation not permitted"; then
    log_error "✗ Permission denied"
    log_error ""
    log_error "The device may still be in use. Try:"
    log_error "  1. Close any applications accessing the SD card"
    log_error "  2. Wait a few seconds"
    log_error "  3. Run this script again"
else
    log_error "✗ Cannot read partition table"
    log_error "Error: $GPT_OUTPUT"
fi

log_info ""
log_info "=== Preparation Complete ==="
log_info ""
log_info "Next steps:"
if [ $GPT_EXIT_CODE -ne 0 ]; then
    log_info "  1. If partition table is corrupted, restore from backup:"
    log_info "     sudo ./restore-sd-card.sh <backup-image> $SD_CARD_DEVICE"
    log_info ""
    log_info "  2. Run diagnostic again:"
    log_info "     sudo ./diagnose-sd-card.sh $SD_CARD_DEVICE"
else
    log_info "  Device is ready for operations"
fi

