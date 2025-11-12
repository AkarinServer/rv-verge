#!/bin/bash
# 最终修复版克隆脚本
# 源设备: /dev/sdc (64GB) -> 目标设备: /dev/sda (32GB)

SOURCE_DEVICE="/dev/sdc"  # 64GB系统卡
TARGET_DEVICE="/dev/sda"   # 32GB目标卡

echo "=== 修复版克隆脚本 ==="
echo "源: $SOURCE_DEVICE (64GB) -> 目标: $TARGET_DEVICE (32GB)"
echo ""

# 检查设备
if [ ! -b "$SOURCE_DEVICE" ]; then
    echo "错误: 源设备 $SOURCE_DEVICE 不存在"
    exit 1
fi

if [ ! -b "$TARGET_DEVICE" ]; then
    echo "错误: 目标设备 $TARGET_DEVICE 不存在"
    exit 1
fi

# 卸载所有分区
echo "卸载所有分区..."
umount /dev/sdc* /dev/sda* 2>/dev/null || true
sleep 2
echo ""

# 克隆分区表（调整以适应32GB）
echo "步骤1: 克隆并调整分区表..."
SOURCE_SECTORS=$(blockdev --getsz "$SOURCE_DEVICE")
TARGET_SECTORS=$(blockdev --getsz "$TARGET_DEVICE")

echo "源设备: $SOURCE_SECTORS 扇区"
echo "目标设备: $TARGET_SECTORS 扇区"

# 克隆分区表，但调整最后一个分区以适应目标设备大小
# 先克隆前5个分区
sfdisk -d "$SOURCE_DEVICE" | grep -E "^/dev/sdc[1-5]" | sfdisk "$TARGET_DEVICE" --force

# 手动创建最后一个分区，限制在目标设备大小内
# 获取sdc6的起始扇区
SDA6_START=268288
# 计算结束扇区（留一些空间给GPT备份）
SDA6_END=$((TARGET_SECTORS - 34))

# 创建最后一个分区
echo "创建最后一个分区 (sda6)..."
parted -s "$TARGET_DEVICE" mkpart "Linux data partition" ext4 ${SDA6_START}s ${SDA6_END}s

partprobe "$TARGET_DEVICE" 2>/dev/null
sleep 2
echo "✓ 分区表克隆完成"
echo ""

# 克隆分区数据
echo "步骤2: 克隆分区数据..."
echo ""

# sdc1-sdc3: 小分区
for part_num in 1 2 3; do
    if [ -b "${SOURCE_DEVICE}${part_num}" ] && [ -b "${TARGET_DEVICE}${part_num}" ]; then
        echo "克隆 ${SOURCE_DEVICE}${part_num}..."
        dd if="${SOURCE_DEVICE}${part_num}" of="${TARGET_DEVICE}${part_num}" bs=4M status=progress oflag=sync 2>&1 | tail -1
        echo "✓ 完成"
    fi
done

# sdc4 (UEFI)
if [ -b "${SOURCE_DEVICE}4" ] && [ -b "${TARGET_DEVICE}4" ]; then
    echo "克隆 ${SOURCE_DEVICE}4 (UEFI FAT32)..."
    dd if="${SOURCE_DEVICE}4" of="${TARGET_DEVICE}4" bs=4M status=progress oflag=sync 2>&1 | tail -1
    echo "✓ 完成"
fi

# sdc5 (CIDATA)
if [ -b "${SOURCE_DEVICE}5" ] && [ -b "${TARGET_DEVICE}5" ]; then
    echo "克隆 ${SOURCE_DEVICE}5 (CIDATA FAT32)..."
    dd if="${SOURCE_DEVICE}5" of="${TARGET_DEVICE}5" bs=4M status=progress oflag=sync 2>&1 | tail -1
    echo "✓ 完成"
fi

# sdc6 (rootfs) - 使用partclone只克隆有效数据
if [ -b "${SOURCE_DEVICE}6" ] && [ -b "${TARGET_DEVICE}6" ]; then
    echo "克隆 ${SOURCE_DEVICE}6 (rootfs ext4) - 使用partclone只克隆有效数据..."
    
    # 确保未挂载
    umount "${TARGET_DEVICE}6" 2>/dev/null || true
    
    # 格式化目标分区（创建新的文件系统，大小匹配目标设备）
    echo "格式化目标分区为ext4（匹配32GB设备大小）..."
    mkfs.ext4 -F "${TARGET_DEVICE}6" > /dev/null 2>&1
    
    # 使用partclone克隆（只克隆有效数据，约7GB）
    echo "开始克隆（只克隆有效数据，约7GB）..."
    partclone.ext4 -c -s "${SOURCE_DEVICE}6" -O "${TARGET_DEVICE}6" -b
    
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
        echo "✗ partclone失败"
        exit 1
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
blkid "${TARGET_DEVICE}6"
echo ""

echo "尝试挂载测试:"
mount "${TARGET_DEVICE}6" /mnt 2>&1
if [ $? -eq 0 ]; then
    echo "✓ 挂载成功！"
    df -h "${TARGET_DEVICE}6"
    umount /mnt
else
    echo "✗ 挂载失败"
fi

echo ""
echo "=== 克隆完成 ==="

