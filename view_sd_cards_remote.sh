#!/bin/bash
# 通过SSH查看远程机器的SD卡信息
# 在本地运行此脚本

REMOTE_HOST="root@192.168.31.221"

echo "正在连接到 $REMOTE_HOST 查看SD卡信息..."
echo ""

ssh -o PubkeyAuthentication=no -o PreferredAuthentications=password -o GSSAPIAuthentication=no "$REMOTE_HOST" << 'EOF'
echo "=== SD卡设备列表 ==="
lsblk -o NAME,SIZE,TYPE,MOUNTPOINT,FSTYPE,MODEL
echo ""

echo "=== 所有块设备详细信息 ==="
lsblk -f
echo ""

echo "=== 磁盘分区表信息 ==="
for disk in $(lsblk -dno NAME | grep -E "^sd|^mmc"); do
    echo "--- /dev/$disk ---"
    fdisk -l /dev/$disk 2>/dev/null || echo "无法读取 $disk"
    echo ""
done

echo "=== 磁盘大小信息 ==="
for disk in $(lsblk -dno NAME | grep -E "^sd|^mmc"); do
    size=$(blockdev --getsize64 /dev/$disk 2>/dev/null)
    if [ -n "$size" ]; then
        size_h=$(echo "$size" | numfmt --to=iec-i --suffix=B 2>/dev/null || echo "${size} bytes")
        echo "/dev/$disk: $size_h"
    fi
done
echo ""

echo "=== 已挂载的设备 ==="
df -h | grep -E "/dev/sd|/dev/mmc" || echo "无SD卡设备挂载"
echo ""

echo "=== USB/SD卡设备信息 ==="
lsusb 2>/dev/null || echo "lsusb不可用"
echo ""

echo "=== 建议识别方法 ==="
echo "1. 查看设备大小确定64GB和32GB卡"
echo "2. 查看分区表确认系统卡（通常有多个分区）"
echo "3. 确认设备名称（如 /dev/sda, /dev/sdb, /dev/mmcblk0 等）"
EOF

