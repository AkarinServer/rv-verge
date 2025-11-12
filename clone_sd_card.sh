#!/bin/bash
# SD卡完整克隆脚本（包括分区表）
# 使用方法：在远程机器上运行
# 参数：SOURCE_DEVICE TARGET_DEVICE
# 例如：bash clone_sd_card.sh /dev/sda /dev/sdb

SOURCE_DEVICE="${1:-/dev/sda}"
TARGET_DEVICE="${2:-/dev/sdb}"

echo "=== SD卡完整克隆脚本 ==="
echo "源设备: $SOURCE_DEVICE"
echo "目标设备: $TARGET_DEVICE"
echo ""

# 检查参数
if [ -z "$1" ] || [ -z "$2" ]; then
    echo "错误: 需要指定源设备和目标设备"
    echo "用法: $0 <源设备> <目标设备>"
    echo "示例: $0 /dev/sda /dev/sdb"
    exit 1
fi

# 检查设备是否存在
if [ ! -b "$SOURCE_DEVICE" ]; then
    echo "错误: 源设备 $SOURCE_DEVICE 不存在"
    exit 1
fi

if [ ! -b "$TARGET_DEVICE" ]; then
    echo "错误: 目标设备 $TARGET_DEVICE 不存在"
    exit 1
fi

# 显示源设备信息
echo "=== 源设备信息 ==="
sudo fdisk -l "$SOURCE_DEVICE"
echo ""

# 显示目标设备信息
echo "=== 目标设备信息（将被覆盖）==="
sudo fdisk -l "$TARGET_DEVICE"
echo ""

# 检查目标设备是否挂载
MOUNTED=$(mount | grep "$TARGET_DEVICE" | wc -l)
if [ "$MOUNTED" -gt 0 ]; then
    echo "警告: 目标设备有分区已挂载，正在卸载..."
    for part in $(lsblk -nro NAME "$TARGET_DEVICE" | grep -v "^$(basename $TARGET_DEVICE)$"); do
        sudo umount "/dev/$part" 2>/dev/null
    done
fi

# 确认操作
echo "⚠️  警告: 此操作将完全覆盖 $TARGET_DEVICE 上的所有数据！"
echo "源设备大小: $(sudo blockdev --getsize64 $SOURCE_DEVICE | numfmt --to=iec-i --suffix=B)"
echo "目标设备大小: $(sudo blockdev --getsize64 $TARGET_DEVICE | numfmt --to=iec-i --suffix=B)"
echo ""
read -p "确认要继续吗？(yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "操作已取消"
    exit 0
fi

# 方法1: 使用dd完整克隆（包括分区表）
echo ""
echo "=== 开始克隆（使用dd，包括分区表）==="
echo "这可能需要一些时间，请耐心等待..."
echo ""

# 计算源设备大小，确保不超过目标设备
SOURCE_SIZE=$(sudo blockdev --getsize64 "$SOURCE_DEVICE")
TARGET_SIZE=$(sudo blockdev --getsize64 "$TARGET_DEVICE")

if [ "$SOURCE_SIZE" -gt "$TARGET_SIZE" ]; then
    echo "警告: 源设备 ($SOURCE_SIZE 字节) 大于目标设备 ($TARGET_SIZE 字节)"
    echo "将只克隆目标设备大小的数据"
    CLONE_SIZE=$TARGET_SIZE
else
    CLONE_SIZE=$SOURCE_SIZE
fi

# 执行克隆
echo "开始克隆..."
sudo dd if="$SOURCE_DEVICE" of="$TARGET_DEVICE" bs=4M status=progress oflag=sync

if [ $? -eq 0 ]; then
    echo ""
    echo "✓ 克隆完成！"
    echo ""
    echo "=== 验证分区表 ==="
    sudo fdisk -l "$TARGET_DEVICE"
    echo ""
    echo "建议: 运行 'partprobe $TARGET_DEVICE' 或重启系统以刷新分区表"
else
    echo ""
    echo "✗ 克隆失败！"
    exit 1
fi

