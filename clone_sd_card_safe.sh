#!/bin/bash
# SD卡安全克隆脚本（使用partclone，更安全但需要更多步骤）
# 适用于需要验证的场景

SOURCE_DEVICE="${1:-/dev/sda}"
TARGET_DEVICE="${2:-/dev/sdb}"

echo "=== SD卡安全克隆脚本（分步进行）==="
echo "源设备: $SOURCE_DEVICE"
echo "目标设备: $TARGET_DEVICE"
echo ""

# 检查参数
if [ -z "$1" ] || [ -z "$2" ]; then
    echo "错误: 需要指定源设备和目标设备"
    exit 1
fi

# 步骤1: 克隆分区表
echo "=== 步骤1: 克隆分区表 ==="
echo "使用sfdisk克隆分区表..."
sudo sfdisk -d "$SOURCE_DEVICE" | sudo sfdisk "$TARGET_DEVICE"
echo ""

# 步骤2: 刷新分区表
echo "=== 步骤2: 刷新分区表 ==="
sudo partprobe "$TARGET_DEVICE"
sleep 2
echo ""

# 步骤3: 克隆每个分区
echo "=== 步骤3: 克隆分区数据 ==="
for part_num in $(sudo fdisk -l "$SOURCE_DEVICE" | grep "^$SOURCE_DEVICE" | awk '{print $1}' | grep -o '[0-9]*$'); do
    SOURCE_PART="${SOURCE_DEVICE}${part_num}"
    TARGET_PART="${TARGET_DEVICE}${part_num}"
    
    if [ -b "$SOURCE_PART" ] && [ -b "$TARGET_PART" ]; then
        FSTYPE=$(sudo blkid -s TYPE -o value "$SOURCE_PART" 2>/dev/null)
        echo "克隆分区 $SOURCE_PART ($FSTYPE) -> $TARGET_PART"
        
        if [ "$FSTYPE" = "ext4" ] || [ "$FSTYPE" = "ext3" ] || [ "$FSTYPE" = "ext2" ]; then
            # 使用partclone
            if command -v partclone.ext4 &> /dev/null; then
                sudo partclone.ext4 -c -s "$SOURCE_PART" -o "$TARGET_PART" -b
            else
                echo "  使用dd克隆（partclone不可用）"
                sudo dd if="$SOURCE_PART" of="$TARGET_PART" bs=4M status=progress
            fi
        else
            # 其他文件系统使用dd
            sudo dd if="$SOURCE_PART" of="$TARGET_PART" bs=4M status=progress
        fi
        echo ""
    fi
done

echo "✓ 克隆完成！"

