#!/bin/bash
# 将64GB SD卡（/dev/sdb）完整克隆到32GB SD卡（/dev/sdc）
# 包括分区表
# 在远程机器上运行

SOURCE_DEVICE="/dev/sdb"  # 64GB系统卡
TARGET_DEVICE="/dev/sdc"   # 32GB目标卡

echo "=== SD卡完整克隆 ==="
echo "源设备: $SOURCE_DEVICE (64GB系统卡)"
echo "目标设备: $TARGET_DEVICE (32GB目标卡)"
echo ""

# 显示当前分区信息
echo "=== 源设备分区信息 ==="
fdisk -l "$SOURCE_DEVICE"
echo ""

echo "=== 目标设备分区信息（将被覆盖）==="
fdisk -l "$TARGET_DEVICE"
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

# 检查是否还有挂载
REMAINING=$(mount | grep "$TARGET_DEVICE" | wc -l)
if [ "$REMAINING" -gt 0 ]; then
    echo "警告: 仍有分区未卸载，强制卸载..."
    umount -f "$TARGET_DEVICE"* 2>/dev/null || true
    sleep 1
fi

# 确认操作
echo "⚠️  警告: 此操作将完全覆盖 $TARGET_DEVICE 上的所有数据！"
echo "源设备: $(blockdev --getsize64 $SOURCE_DEVICE | numfmt --to=iec-i --suffix=B)"
echo "目标设备: $(blockdev --getsize64 $TARGET_DEVICE | numfmt --to=iec-i --suffix=B)"
echo ""
echo "注意: 由于源设备大于目标设备，将只克隆目标设备大小的数据"
echo "但分区表会完整复制"
echo ""

read -p "确认要继续吗？(输入 yes 继续): " confirm

if [ "$confirm" != "yes" ]; then
    echo "操作已取消"
    exit 0
fi

# 执行克隆
echo ""
echo "=== 开始克隆（使用dd，包括分区表）==="
echo "这可能需要一些时间，请耐心等待..."
echo ""

# 获取目标设备大小（字节）
TARGET_SIZE=$(blockdev --getsize64 "$TARGET_DEVICE")

# 执行克隆，限制大小为目标设备大小
echo "克隆中..."
dd if="$SOURCE_DEVICE" of="$TARGET_DEVICE" bs=4M count=$((TARGET_SIZE / 4194304 + 1)) status=progress oflag=sync

if [ $? -eq 0 ]; then
    echo ""
    echo "✓ 克隆完成！"
    echo ""
    
    # 刷新分区表
    echo "=== 刷新分区表 ==="
    partprobe "$TARGET_DEVICE" 2>/dev/null || echo "partprobe不可用，建议重启系统"
    sleep 2
    echo ""
    
    # 验证分区表
    echo "=== 验证目标设备分区表 ==="
    fdisk -l "$TARGET_DEVICE"
    echo ""
    
    echo "✓ 克隆操作完成！"
    echo "建议: 运行 'partprobe $TARGET_DEVICE' 或重启系统以刷新分区表"
else
    echo ""
    echo "✗ 克隆失败！"
    exit 1
fi

