#!/bin/bash
# 只克隆64GB SD卡的有效数据到32GB SD卡
# 包括分区表和实际使用的数据
# 在远程机器上运行

SOURCE_DEVICE="/dev/sdb"  # 64GB系统卡
TARGET_DEVICE="/dev/sdc"   # 32GB目标卡

echo "=== 只克隆有效数据 ==="
echo "源设备: $SOURCE_DEVICE (64GB系统卡)"
echo "目标设备: $TARGET_DEVICE (32GB目标卡)"
echo ""

# 显示有效数据统计
echo "=== 源设备有效数据统计 ==="
sdb4_size=$(du -sb /run/media/minsio/UEFI1 2>/dev/null | awk '{print $1}')
sdb5_size=$(du -sb /run/media/minsio/CIDATA1 2>/dev/null | awk '{print $1}')
sdb6_size=$(du -sb /run/media/minsio/cloudimg-rootfs 2>/dev/null | awk '{print $1}')
total_data=$((sdb4_size + sdb5_size + sdb6_size + 17408))

echo "sdb4 (UEFI): $(echo $sdb4_size | numfmt --to=iec-i --suffix=B)"
echo "sdb5 (CIDATA): $(echo $sdb5_size | numfmt --to=iec-i --suffix=B)"
echo "sdb6 (rootfs): $(echo $sdb6_size | numfmt --to=iec-i --suffix=B)"
echo "分区表: 17KB"
echo "总有效数据: $(echo $total_data | numfmt --to=iec-i --suffix=B)"
echo ""

# 显示分区信息
echo "=== 源设备分区信息 ==="
fdisk -l "$SOURCE_DEVICE" | head -20
echo ""

# 卸载目标设备的所有分区
echo "=== 卸载目标设备分区 ==="
for part in sdc1 sdc2 sdc3 sdc4 sdc5 sdc6; do
    if mountpoint -q "/dev/$part" 2>/dev/null || mount | grep -q "/dev/$part"; then
        echo "卸载 /dev/$part"
        umount "/dev/$part" 2>/dev/null || true
    fi
done
echo ""

# 确认操作
echo "⚠️  警告: 此操作将完全覆盖 $TARGET_DEVICE 上的所有数据！"
echo "将克隆:"
echo "  1. GPT分区表"
echo "  2. 所有分区的实际数据"
echo ""

read -p "确认要继续吗？(输入 yes 继续): " confirm

if [ "$confirm" != "yes" ]; then
    echo "操作已取消"
    exit 0
fi

echo ""
echo "=== 开始克隆 ==="
echo ""

# 步骤1: 克隆分区表（使用sfdisk）
echo "步骤1: 克隆分区表..."
sfdisk -d "$SOURCE_DEVICE" | sfdisk "$TARGET_DEVICE"
if [ $? -ne 0 ]; then
    echo "✗ 分区表克隆失败"
    exit 1
fi
echo "✓ 分区表克隆完成"
echo ""

# 刷新分区表
echo "刷新分区表..."
partprobe "$TARGET_DEVICE" 2>/dev/null || echo "partprobe不可用，继续..."
sleep 2
echo ""

# 步骤2: 克隆每个分区
echo "步骤2: 克隆分区数据..."
echo ""

# sdb1-sdb3: 未知分区，直接克隆整个分区
for part_num in 1 2 3; do
    source_part="${SOURCE_DEVICE}${part_num}"
    target_part="${TARGET_DEVICE}${part_num}"
    
    if [ -b "$source_part" ] && [ -b "$target_part" ]; then
        source_size=$(blockdev --getsize64 "$source_part" 2>/dev/null)
        echo "克隆 $source_part -> $target_part ($(echo $source_size | numfmt --to=iec-i --suffix=B))"
        dd if="$source_part" of="$target_part" bs=4M status=progress oflag=sync
        echo "✓ $source_part 克隆完成"
        echo ""
    fi
done

# sdb4: UEFI分区 (FAT32)
if [ -b "${SOURCE_DEVICE}4" ] && [ -b "${TARGET_DEVICE}4" ]; then
    echo "克隆 ${SOURCE_DEVICE}4 (UEFI FAT32) -> ${TARGET_DEVICE}4"
    # FAT32分区，直接克隆整个分区（很小，只有105MB）
    dd if="${SOURCE_DEVICE}4" of="${TARGET_DEVICE}4" bs=4M status=progress oflag=sync
    echo "✓ ${SOURCE_DEVICE}4 克隆完成"
    echo ""
fi

# sdb5: CIDATA分区 (FAT32)
if [ -b "${SOURCE_DEVICE}5" ] && [ -b "${TARGET_DEVICE}5" ]; then
    echo "克隆 ${SOURCE_DEVICE}5 (CIDATA FAT32) -> ${TARGET_DEVICE}5"
    # FAT32分区，直接克隆整个分区（很小，只有4MB）
    dd if="${SOURCE_DEVICE}5" of="${TARGET_DEVICE}5" bs=4M status=progress oflag=sync
    echo "✓ ${SOURCE_DEVICE}5 克隆完成"
    echo ""
fi

# sdb6: rootfs分区 (ext4) - 使用partclone只克隆有效数据
if [ -b "${SOURCE_DEVICE}6" ] && [ -b "${TARGET_DEVICE}6" ]; then
    echo "克隆 ${SOURCE_DEVICE}6 (rootfs ext4) -> ${TARGET_DEVICE}6"
    
    # 检查是否有partclone
    if command -v partclone.ext4 &> /dev/null; then
        echo "使用 partclone 只克隆有效数据..."
        partclone.ext4 -c -s "${SOURCE_DEVICE}6" -o "${TARGET_DEVICE}6" -b
        if [ $? -eq 0 ]; then
            echo "✓ ${SOURCE_DEVICE}6 克隆完成（只克隆了有效数据）"
        else
            echo "partclone失败，改用dd..."
            dd if="${SOURCE_DEVICE}6" of="${TARGET_DEVICE}6" bs=4M status=progress oflag=sync
            echo "✓ ${SOURCE_DEVICE}6 克隆完成（完整克隆）"
        fi
    else
        echo "partclone不可用，使用dd完整克隆分区..."
        dd if="${SOURCE_DEVICE}6" of="${TARGET_DEVICE}6" bs=4M status=progress oflag=sync
        echo "✓ ${SOURCE_DEVICE}6 克隆完成"
    fi
    echo ""
fi

# 刷新分区表
echo "刷新分区表..."
partprobe "$TARGET_DEVICE" 2>/dev/null || echo "partprobe不可用"
sleep 2
echo ""

# 验证
echo "=== 验证克隆结果 ==="
echo "目标设备分区表:"
fdisk -l "$TARGET_DEVICE" | head -20
echo ""

echo "✓ 克隆操作完成！"
echo ""
echo "注意:"
echo "  - 分区表已完整克隆"
echo "  - 所有分区数据已克隆"
echo "  - 如果使用了partclone，sdb6只克隆了有效数据（约7GB）"
echo "  - 建议运行 'partprobe $TARGET_DEVICE' 或重启系统"

