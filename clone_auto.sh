#!/bin/bash
# 自动克隆脚本（非交互式）
# 将64GB SD卡（/dev/sdb）克隆到32GB SD卡（/dev/sdc）

SOURCE_DEVICE="/dev/sdb"
TARGET_DEVICE="/dev/sdc"

echo "=== 自动克隆64GB到32GB SD卡 ==="
echo "源: $SOURCE_DEVICE -> 目标: $TARGET_DEVICE"
echo ""

# 卸载目标设备
echo "卸载目标设备分区..."
for part in sdc1 sdc2 sdc3 sdc4 sdc5 sdc6; do
    umount "/dev/$part" 2>/dev/null || true
done
sleep 1
echo ""

# 克隆分区表
echo "步骤1: 克隆分区表..."
sfdisk -d "$SOURCE_DEVICE" | sfdisk "$TARGET_DEVICE"
partprobe "$TARGET_DEVICE" 2>/dev/null
sleep 2
echo "✓ 分区表克隆完成"
echo ""

# 克隆分区
echo "步骤2: 克隆分区数据..."
echo ""

# sdb1-sdb3
for part_num in 1 2 3; do
    if [ -b "${SOURCE_DEVICE}${part_num}" ] && [ -b "${TARGET_DEVICE}${part_num}" ]; then
        echo "克隆 ${SOURCE_DEVICE}${part_num}..."
        dd if="${SOURCE_DEVICE}${part_num}" of="${TARGET_DEVICE}${part_num}" bs=4M status=progress oflag=sync 2>&1 | tail -1
        echo "✓ 完成"
    fi
done

# sdb4 (UEFI)
if [ -b "${SOURCE_DEVICE}4" ] && [ -b "${TARGET_DEVICE}4" ]; then
    echo "克隆 ${SOURCE_DEVICE}4 (UEFI)..."
    dd if="${SOURCE_DEVICE}4" of="${TARGET_DEVICE}4" bs=4M status=progress oflag=sync 2>&1 | tail -1
    echo "✓ 完成"
fi

# sdb5 (CIDATA)
if [ -b "${SOURCE_DEVICE}5" ] && [ -b "${TARGET_DEVICE}5" ]; then
    echo "克隆 ${SOURCE_DEVICE}5 (CIDATA)..."
    dd if="${SOURCE_DEVICE}5" of="${TARGET_DEVICE}5" bs=4M status=progress oflag=sync 2>&1 | tail -1
    echo "✓ 完成"
fi

# sdb6 (rootfs) - 使用partclone
if [ -b "${SOURCE_DEVICE}6" ] && [ -b "${TARGET_DEVICE}6" ]; then
    echo "克隆 ${SOURCE_DEVICE}6 (rootfs ext4) - 只克隆有效数据..."
    mkfs.ext4 -F "${TARGET_DEVICE}6" > /dev/null 2>&1
    partclone.ext4 -c -s "${SOURCE_DEVICE}6" -o "${TARGET_DEVICE}6" -b
    if [ $? -eq 0 ]; then
        echo "✓ 完成（只克隆了有效数据）"
    else
        echo "✗ partclone失败"
        exit 1
    fi
fi

echo ""
echo "=== 克隆完成 ==="
partprobe "$TARGET_DEVICE" 2>/dev/null
echo "✓ 分区表已刷新"

