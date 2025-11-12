# 快速备份 64GB SD 卡到 32GB SD 卡

## 问题

你想从 64GB SD 卡备份，但恢复目标是 32GB SD 卡。直接使用 `dd` 备份整个 64GB 会失败。

## 解决方案

使用智能备份脚本，只备份实际使用的部分（通常是 32GB 或更少），而不是整个 64GB。

## 快速使用

### 方法 1: 使用智能备份脚本（推荐）

```bash
# 1. 查看 SD 卡设备
diskutil list

# 2. 运行备份脚本（会自动检测分区大小）
sudo ./backup-sd-card-smart.sh /dev/rdisk7

# 3. 如果无法自动检测，脚本会提示你选择备份大小
#    选择 32GB 即可

# 4. 等待备份完成

# 5. 恢复到 32GB 卡
sudo ./restore-sd-card.sh ~/backups/lichee-rv-dock/lichee-rv-dock-backup-*.img.gz /dev/rdisk8
```

### 方法 2: 手动指定备份大小

```bash
# 直接指定备份 32GB
sudo ./backup-sd-card-smart.sh /dev/rdisk7 ~/backups/lichee-rv-dock 32
```

### 方法 3: 手动使用 dd（最简单）

```bash
# 1. 备份 32GB（8192 个 4MB 块 = 32GB）
sudo dd if=/dev/rdisk7 bs=4m count=8192 | pv -s 32G | gzip -c > ~/backups/lichee-rv-dock/backup-$(date +%Y%m%d-%H%M%S).img.gz

# 2. 恢复到 32GB 卡
gunzip -c ~/backups/lichee-rv-dock/backup-*.img.gz | sudo dd of=/dev/rdisk8 bs=4m
```

## 工作原理

1. **只备份使用的部分**：脚本会读取分区表，找到最后一个分区的结束位置
2. **添加安全边界**：在最后一个分区后添加 1MB 的安全边界
3. **限制最大大小**：如果计算出的备份大小超过 32GB，则限制为 32GB
4. **压缩备份**：使用 `gzip` 压缩，进一步减小文件大小（通常压缩到 30-50%）

## 注意事项

1. **必须使用 sudo**：备份和恢复都需要 root 权限
2. **确认设备**：使用 `diskutil list` 确认正确的设备（通常是 `/dev/rdisk7` 或 `/dev/rdisk8`）
3. **备份大小**：32GB 通常足够，但如果系统实际占用更少，可以减小备份大小（例如 31GB 或 30GB）
4. **恢复后**：如果恢复后分区没有占满整个卡，可能需要扩展分区

## 恢复后扩展分区（可选）

如果恢复后分区没有占满整个 32GB 卡，可以扩展分区：

### 在 macOS 上
1. 使用 `Disk Utility` 打开 SD 卡
2. 选择分区，点击 `Resize`
3. 调整到最大大小

### 在 Linux 上
```bash
# 1. 扩展分区表
sudo parted /dev/sdX resizepart 2 100%

# 2. 扩展文件系统（ext4）
sudo resize2fs /dev/sdX2
```

## 故障排除

1. **备份失败**：检查是否有足够的磁盘空间
2. **恢复失败**：检查备份文件是否完整（验证 checksum）
3. **无法启动**：可能需要扩展分区或文件系统
4. **备份文件过大**：减小备份大小（例如使用 31GB 或 30GB）

## 示例

```bash
# 完整的备份和恢复流程

# 1. 查看当前磁盘
diskutil list

# 2. 备份 64GB 卡（只备份 32GB）
sudo ./backup-sd-card-smart.sh /dev/rdisk7 ~/backups 32

# 3. 等待备份完成（会显示进度和压缩率）
#    输出示例：
#    [INFO] Backup size: 32.00 GB (32768 MB)
#    [INFO] Estimated compressed size: ~12.80 GB
#    [INFO] Compression ratio: 40.00%
#    [INFO] Compressed size: 12.80 GB

# 4. 插入 32GB 卡，查看设备
diskutil list

# 5. 恢复到 32GB 卡
sudo ./restore-sd-card.sh ~/backups/lichee-rv-dock-backup-*.img.gz /dev/rdisk8

# 6. 等待恢复完成

# 7. 验证恢复（可选）
#    在恢复的系统上检查分区和文件系统
```

## 相关文件

- `backup-sd-card-smart.sh` - 智能备份脚本
- `restore-sd-card.sh` - 恢复脚本
- `SD_CARD_BACKUP_GUIDE.md` - 详细使用指南

