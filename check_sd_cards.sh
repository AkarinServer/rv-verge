#!/bin/bash
# 查看SD卡信息的脚本
# 在远程机器上运行：ssh root@192.168.31.221 "bash -s" < check_sd_cards.sh

echo "=== SD卡设备列表 ==="
lsblk -o NAME,SIZE,TYPE,MOUNTPOINT,FSTYPE,MODEL | grep -E "sd|mmc|disk|part"
echo ""

echo "=== 所有块设备详细信息 ==="
lsblk -f
echo ""

echo "=== 磁盘分区表信息 ==="
for disk in $(lsblk -dno NAME | grep -E "^sd|^mmc"); do
    echo "--- /dev/$disk ---"
    sudo fdisk -l /dev/$disk 2>/dev/null || echo "无法读取 $disk"
    echo ""
done

echo "=== 磁盘大小信息 ==="
for disk in $(lsblk -dno NAME | grep -E "^sd|^mmc"); do
    echo "/dev/$disk: $(sudo blockdev --getsize64 /dev/$disk 2>/dev/null | numfmt --to=iec-i --suffix=B || echo 'N/A')"
done
echo ""

echo "=== 已挂载的设备 ==="
df -h | grep -E "/dev/sd|/dev/mmc"
echo ""

echo "=== 建议的克隆命令（请确认设备名称后使用）==="
echo "# 假设64GB卡是 /dev/sda，32GB卡是 /dev/sdb"
echo "# 1. 确保32GB卡未挂载："
echo "   umount /dev/sdb*"
echo ""
echo "# 2. 使用dd克隆（包括分区表）："
echo "   dd if=/dev/sda of=/dev/sdb bs=4M status=progress"
echo ""
echo "# 或者使用partclone（更安全，但需要分区已存在）："
echo "# 先克隆分区表，再克隆每个分区"

