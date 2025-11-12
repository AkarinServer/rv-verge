#!/bin/bash
# 只克隆分区数据，保持目标设备现有的分区表
# 将64GB SD卡（/dev/sdb）的数据克隆到32GB SD卡（/dev/sdc）

SOURCE_DEVICE="/dev/sdb"
TARGET_DEVICE="/dev/sdc"

echo "=== 克隆分区数据（保持现有分区表）==="
echo "源: $SOURCE_DEVICE -> 目标: $TARGET_DEVICE"
echo ""

# 确保源设备未挂载
echo "检查源设备挂载状态..."
umount /dev/sdb* 2>/dev/null || true
sleep 1

# 卸载目标设备
echo "卸载目标设备分区..."
umount /dev/sdc* 2>/dev/null || true
sleep 1
echo ""

# 克隆分区数据
echo "开始克隆分区数据..."
echo ""

# sdb1-sdb3: 小分区，直接克隆
for part_num in 1 2 3; do
    if [ -b "${SOURCE_DEVICE}${part_num}" ] && [ -b "${TARGET_DEVICE}${part_num}" ]; then
        source_size=$(blockdev --getsize64 "${SOURCE_DEVICE}${part_num}" 2>/dev/null)
        target_size=$(blockdev --getsize64 "${TARGET_DEVICE}${part_num}" 2>/dev/null)
        clone_size=$((source_size < target_size ? source_size : target_size))
        
        echo "克隆 ${SOURCE_DEVICE}${part_num}..."
        dd if="${SOURCE_DEVICE}${part_num}" of="${TARGET_DEVICE}${part_num}" bs=4M status=progress oflag=sync 2>&1 | tail -1
        echo "✓ 完成"
    fi
done

# sdb4 (UEFI)
if [ -b "${SOURCE_DEVICE}4" ] && [ -b "${TARGET_DEVICE}4" ]; then
    echo "克隆 ${SOURCE_DEVICE}4 (UEFI FAT32)..."
    dd if="${SOURCE_DEVICE}4" of="${TARGET_DEVICE}4" bs=4M status=progress oflag=sync 2>&1 | tail -1
    echo "✓ 完成"
fi

# sdb5 (CIDATA)
if [ -b "${SOURCE_DEVICE}5" ] && [ -b "${TARGET_DEVICE}5" ]; then
    echo "克隆 ${SOURCE_DEVICE}5 (CIDATA FAT32)..."
    dd if="${SOURCE_DEVICE}5" of="${TARGET_DEVICE}5" bs=4M status=progress oflag=sync 2>&1 | tail -1
    echo "✓ 完成"
fi

# sdb6 (rootfs) - 使用partclone只克隆有效数据
if [ -b "${SOURCE_DEVICE}6" ] && [ -b "${TARGET_DEVICE}6" ]; then
    echo "克隆 ${SOURCE_DEVICE}6 (rootfs ext4) - 使用partclone只克隆有效数据..."
    
    # 格式化目标分区
    echo "格式化目标分区..."
    mkfs.ext4 -F "${TARGET_DEVICE}6" > /dev/null 2>&1
    
    # 使用partclone克隆
    echo "开始克隆（只克隆有效数据，约7GB）..."
    partclone.ext4 -c -s "${SOURCE_DEVICE}6" -o "${TARGET_DEVICE}6" -b --overwrite
    
    if [ $? -eq 0 ]; then
        echo "✓ 完成（只克隆了有效数据）"
    else
        echo "✗ partclone失败，改用dd..."
        # 如果partclone失败，使用dd（但只克隆到目标分区大小）
        target_size=$(blockdev --getsize64 "${TARGET_DEVICE}6")
        dd if="${SOURCE_DEVICE}6" of="${TARGET_DEVICE}6" bs=4M count=$((target_size / 4194304 + 1)) status=progress oflag=sync 2>&1 | tail -1
        echo "✓ 完成（使用dd）"
    fi
fi

echo ""
echo "=== 克隆完成 ==="
partprobe "$TARGET_DEVICE" 2>/dev/null
echo "✓ 完成！可以安全移除SD卡了"

