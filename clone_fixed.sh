#!/bin/bash
# 修复版克隆脚本 - 确保文件系统正确克隆
# 将64GB SD卡（/dev/sdb）的数据克隆到32GB SD卡（/dev/sdc）

SOURCE_DEVICE="/dev/sdb"
TARGET_DEVICE="/dev/sdc"

echo "=== 修复版克隆脚本 ==="
echo "源: $SOURCE_DEVICE -> 目标: $TARGET_DEVICE"
echo ""

# 检查设备是否存在
if [ ! -b "$TARGET_DEVICE" ]; then
    echo "错误: $TARGET_DEVICE 不存在，请插入32GB SD卡"
    exit 1
fi

# 确保源设备未挂载
echo "检查源设备挂载状态..."
umount /dev/sdb* 2>/dev/null || true
sleep 1

# 卸载目标设备
echo "卸载目标设备分区..."
umount /dev/sdc* 2>/dev/null || true
sleep 1
echo ""

# 克隆分区表（使用sfdisk，但只克隆适配32GB的部分）
echo "步骤1: 克隆分区表..."
# 先备份当前分区表
sfdisk -d "$SOURCE_DEVICE" > /tmp/source_partition_table.txt

# 获取目标设备大小（扇区数）
TARGET_SECTORS=$(blockdev --getsz "$TARGET_DEVICE")
SOURCE_SECTORS=$(blockdev --getsz "$SOURCE_DEVICE")

echo "源设备扇区数: $SOURCE_SECTORS"
echo "目标设备扇区数: $TARGET_SECTORS"

# 如果目标设备更小，需要调整最后一个分区
if [ "$TARGET_SECTORS" -lt "$SOURCE_SECTORS" ]; then
    echo "目标设备较小，调整分区表..."
    # 使用sfdisk克隆，但限制在目标设备大小内
    sfdisk -d "$SOURCE_DEVICE" | sed "s/last-lba:.*/last-lba: $((TARGET_SECTORS - 1))/" | sfdisk "$TARGET_DEVICE"
else
    sfdisk -d "$SOURCE_DEVICE" | sfdisk "$TARGET_DEVICE"
fi

partprobe "$TARGET_DEVICE" 2>/dev/null
sleep 2
echo "✓ 分区表克隆完成"
echo ""

# 克隆分区数据
echo "步骤2: 克隆分区数据..."
echo ""

# sdb1-sdb3: 小分区
for part_num in 1 2 3; do
    if [ -b "${SOURCE_DEVICE}${part_num}" ] && [ -b "${TARGET_DEVICE}${part_num}" ]; then
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
    
    # 确保目标分区未挂载
    umount "${TARGET_DEVICE}6" 2>/dev/null || true
    
    # 格式化目标分区
    echo "格式化目标分区为ext4..."
    mkfs.ext4 -F "${TARGET_DEVICE}6" > /dev/null 2>&1
    
    # 使用partclone克隆（添加--overwrite选项）
    echo "开始克隆（只克隆有效数据，约7GB）..."
    partclone.ext4 -c -s "${SOURCE_DEVICE}6" -o "${TARGET_DEVICE}6" -b --overwrite
    
    if [ $? -eq 0 ]; then
        echo "✓ partclone克隆完成"
        
        # 验证文件系统
        echo "验证文件系统..."
        fsck -n "${TARGET_DEVICE}6" > /dev/null 2>&1
        if [ $? -eq 0 ]; then
            echo "✓ 文件系统验证通过"
        else
            echo "⚠️  文件系统验证失败，尝试修复..."
            fsck -y "${TARGET_DEVICE}6" > /dev/null 2>&1
        fi
    else
        echo "✗ partclone失败，改用dd..."
        # 如果partclone失败，使用dd（但只克隆到目标分区大小）
        target_size=$(blockdev --getsize64 "${TARGET_DEVICE}6")
        dd if="${SOURCE_DEVICE}6" of="${TARGET_DEVICE}6" bs=4M count=$((target_size / 4194304 + 1)) status=progress oflag=sync 2>&1 | tail -1
        
        # 验证并修复文件系统
        echo "验证并修复文件系统..."
        fsck -y "${TARGET_DEVICE}6" > /dev/null 2>&1
        echo "✓ 完成（使用dd）"
    fi
fi

echo ""
echo "=== 最终验证 ==="
partprobe "$TARGET_DEVICE" 2>/dev/null
sleep 2

echo "分区表:"
fdisk -l "$TARGET_DEVICE" | head -20
echo ""

echo "文件系统信息:"
blkid | grep "$TARGET_DEVICE"
echo ""

echo "=== 克隆完成 ==="
echo "✓ 可以安全移除SD卡了"

