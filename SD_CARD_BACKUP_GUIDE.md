# SD 卡备份和恢复指南

## 问题说明

当从 64GB SD 卡备份到 32GB SD 卡时，如果直接使用 `dd` 备份整个磁盘，会遇到以下问题：
1. 64GB 的镜像无法恢复到 32GB 的卡上
2. 即使实际系统占用很小，也需要备份整个 64GB

## 解决方案

使用智能备份脚本，只备份实际使用的分区部分，而不是整个磁盘。

## 使用方法

### 1. 备份 SD 卡

```bash
# 基本用法（使用默认参数）
sudo ./backup-sd-card-smart.sh

# 指定设备
sudo ./backup-sd-card-smart.sh /dev/rdisk7

# 指定设备和备份目录
sudo ./backup-sd-card-smart.sh /dev/rdisk7 ~/backups/lichee-rv-dock

# 指定设备、备份目录和最大备份大小（GB）
sudo ./backup-sd-card-smart.sh /dev/rdisk7 ~/backups/lichee-rv-dock 32
```

### 2. 恢复 SD 卡

```bash
# 基本用法
sudo ./restore-sd-card.sh <backup-file> <target-device>

# 示例
sudo ./restore-sd-card.sh ~/backups/lichee-rv-dock/lichee-rv-dock-backup-20240101-120000.img.gz /dev/rdisk7
```

## 工作原理

1. **读取分区表**：脚本使用 `gpt show` 命令读取 GPT 分区表
2. **计算备份大小**：找到最后一个分区的结束位置，只备份到该位置
3. **添加安全边界**：在最后一个分区结束位置后添加 1MB 的安全边界
4. **应用大小限制**：如果计算出的备份大小超过指定的最大大小（默认 32GB），则限制为最大大小
5. **压缩备份**：使用 `gzip` 压缩备份文件，进一步减小文件大小

## 注意事项

1. **必须使用 sudo**：备份和恢复都需要 root 权限
2. **确认设备**：在运行脚本前，使用 `diskutil list` 确认正确的设备
3. **备份大小**：压缩后的备份通常只有原始大小的 30-50%
4. **恢复验证**：恢复后，系统可能需要扩展分区以使用全部空间

## 手动方法

如果脚本无法正常工作，可以手动指定备份大小：

```bash
# 1. 查看分区信息
diskutil list /dev/disk7
gpt show /dev/disk7

# 2. 计算需要备份的大小
# 找到最后一个分区的结束扇区，然后计算字节数
# 例如：最后一个分区结束于扇区 124553183，则：
# 备份大小 = (124553183 + 2048) * 512 字节
# 2048 是安全边界（1MB）

# 3. 手动备份
sudo dd if=/dev/rdisk7 bs=4m count=8192 | pv -s 32G | gzip -c > ~/backups/backup.img.gz
# count=8192 表示 8192 * 4MB = 32GB

# 4. 恢复
gunzip -c ~/backups/backup.img.gz | sudo dd of=/dev/rdiskX bs=4m
```

## 恢复后扩展分区

如果恢复后分区没有占满整个 SD 卡，可以使用以下工具扩展分区：

### macOS
- 使用 `Disk Utility` 手动调整分区大小
- 或使用命令行工具如 `gdisk` 和 `resize2fs`

### Linux
```bash
# 1. 扩展分区表
sudo parted /dev/sdX resizepart 2 100%

# 2. 扩展文件系统（ext4）
sudo resize2fs /dev/sdX2

# 3. 或者对于其他文件系统，使用相应的工具
```

## 故障排除

1. **无法读取分区表**：脚本会自动使用最大大小限制（默认 32GB）
2. **备份文件过大**：减小 `MAX_SIZE_GB` 参数或手动指定 `count` 参数
3. **恢复失败**：检查目标设备是否有足够空间，检查备份文件是否完整
4. **恢复后无法启动**：可能需要调整分区表或扩展文件系统

## 示例

```bash
# 1. 查看当前磁盘
diskutil list

# 2. 备份 64GB 卡（实际只备份约 32GB）
sudo ./backup-sd-card-smart.sh /dev/rdisk7 ~/backups 32

# 3. 等待备份完成（会显示进度和压缩率）

# 4. 恢复到 32GB 卡
sudo ./restore-sd-card.sh ~/backups/lichee-rv-dock-backup-20240101-120000.img.gz /dev/rdisk8

# 5. 验证恢复（可选）
# 在恢复的系统上检查分区和文件系统
```

## 相关文件

- `backup-sd-card-smart.sh` - 智能备份脚本
- `restore-sd-card.sh` - 恢复脚本
- `backup-lichee-rv-dock.sh` - 远程备份脚本（通过 SSH）

