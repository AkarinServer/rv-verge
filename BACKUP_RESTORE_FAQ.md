# SD 卡备份和恢复 FAQ

## 核心问题

### Q1: dd 命令是否可以备份整个 SD 卡的所有分区？

**答案: 是的！**

- `dd if=/dev/rdisk7` 会备份整个磁盘
- 包括：
  - ✅ 分区表（MBR/GPT）
  - ✅ 所有分区（包括 EFI、Linux 系统分区等）
  - ✅ 引导扇区
  - ✅ 所有数据
  - ✅ 文件系统结构

**备份命令**:
```bash
sudo dd if=/dev/rdisk7 of=backup.img bs=4m status=progress
```

**结果**: 生成一个完整的磁盘映像文件 `backup.img`

---

### Q2: 是否可以使用 balenaEtcher 恢复到另一张 SD 卡？

**答案: 是的！**

**步骤**:
1. 打开 balenaEtcher
2. 选择备份的 `.img` 文件
3. 选择目标 SD 卡
4. 点击 "Flash" 开始恢复

**支持的文件格式**:
- ✅ `.img` 文件（完整磁盘映像）
- ✅ `.zip` 文件（压缩的映像）
- ❌ `.img.gz` 文件（需要先解压）

---

### Q3: 恢复后是否可以原封不动恢复系统和数据？

**答案: 是的！**

**恢复后会完全一致**:
- ✅ 所有分区
- ✅ 操作系统
- ✅ 所有数据
- ✅ 所有配置
- ✅ 用户文件
- ✅ 系统设置
- ✅ 已安装的软件

**恢复后可以直接使用**:
- ✅ 插入 Lichee RV Dock 即可启动
- ✅ 所有配置保持不变
- ✅ 所有数据完整

---

## 备份和恢复流程

### 备份流程

```bash
# 1. 插入 SD 卡到 Mac
# 2. 识别设备
diskutil list

# 3. 卸载 SD 卡
diskutil unmountDisk /dev/disk7

# 4. 创建完整备份（未压缩）
sudo dd if=/dev/rdisk7 of=backup.img bs=4m status=progress

# 或者创建压缩备份（需要解压后使用）
sudo dd if=/dev/rdisk7 bs=4m status=progress | gzip -c > backup.img.gz
gunzip backup.img.gz  # 解压后使用 balenaEtcher
```

### 恢复流程

#### 方法 1: 使用 balenaEtcher（推荐）

1. **打开 balenaEtcher**
2. **选择映像文件**: 选择 `backup.img`
3. **选择目标 SD 卡**: 选择要恢复的 SD 卡
4. **点击 Flash**: 开始恢复
5. **等待完成**: 恢复完成后，SD 卡可以直接使用

#### 方法 2: 使用 dd 命令

```bash
# 1. 插入目标 SD 卡
# 2. 识别设备
diskutil list

# 3. 卸载 SD 卡
diskutil unmountDisk /dev/disk2

# 4. 恢复备份
sudo dd if=backup.img of=/dev/rdisk2 bs=4m status=progress

# 5. 弹出 SD 卡
diskutil eject /dev/disk2
```

---

## 重要注意事项

### ⚠️ 备份注意事项

1. **文件格式**:
   - 如果使用 balenaEtcher，备份文件必须是 `.img` 格式
   - 如果是压缩的 `.img.gz`，需要先解压

2. **备份大小**:
   - 完整备份文件大小 = SD 卡大小（例如 32GB）
   - 压缩备份文件大小 = 3-7GB（取决于数据）

3. **备份时间**:
   - 完整备份: 5-15 分钟
   - 压缩备份: 10-20 分钟

### ⚠️ 恢复注意事项

1. **目标 SD 卡大小**:
   - 目标 SD 卡必须 ≥ 源 SD 卡大小
   - 更大的 SD 卡也可以（balenaEtcher 会处理）

2. **数据覆盖**:
   - 恢复会覆盖目标 SD 卡上的所有数据
   - 恢复前请备份目标 SD 卡上的重要数据

3. **分区调整**:
   - 如果目标 SD 卡更大，分区大小会保持原样
   - 可以使用 `gparted` 等工具扩展分区（可选）

---

## 备份文件格式对比

### 格式 1: 未压缩 .img 文件

**优点**:
- ✅ 可以直接用 balenaEtcher 恢复
- ✅ 恢复速度快
- ✅ 不需要解压

**缺点**:
- ❌ 文件大小 = SD 卡大小（例如 32GB）
- ❌ 占用磁盘空间大

**适用**: 如果磁盘空间充足，推荐使用

### 格式 2: 压缩 .img.gz 文件

**优点**:
- ✅ 文件小（3-7GB）
- ✅ 节省磁盘空间
- ✅ 传输方便

**缺点**:
- ❌ 需要先解压才能用 balenaEtcher
- ❌ 解压需要时间

**适用**: 如果磁盘空间有限，推荐使用

---

## 推荐方案

### 方案 1: 使用未压缩备份 + balenaEtcher（推荐）

```bash
# 备份
sudo dd if=/dev/rdisk7 of=backup.img bs=4m status=progress

# 恢复
# 使用 balenaEtcher 选择 backup.img 文件
```

**优点**:
- ✅ 简单直接
- ✅ 恢复速度快
- ✅ 兼容性好

### 方案 2: 使用压缩备份 + 解压 + balenaEtcher

```bash
# 备份
sudo dd if=/dev/rdisk7 bs=4m status=progress | gzip -c > backup.img.gz

# 解压
gunzip backup.img.gz

# 恢复
# 使用 balenaEtcher 选择 backup.img 文件
```

**优点**:
- ✅ 节省磁盘空间
- ✅ 传输方便

---

## 验证备份

### 检查备份文件

```bash
# 查看备份文件大小
ls -lh backup.img

# 查看备份文件类型
file backup.img

# 验证压缩备份
gunzip -t backup.img.gz
```

### 验证恢复

```bash
# 恢复后，插入 SD 卡到 Lichee RV Dock
# 启动系统，检查是否正常
# 检查数据是否完整
# 检查配置是否一致
```

---

## 总结

### ✅ 可以做的事情

1. ✅ 使用 `dd` 备份整个 SD 卡（包括所有分区）
2. ✅ 使用 balenaEtcher 恢复到另一张 SD 卡
3. ✅ 恢复后系统和数据完全一致
4. ✅ 可以直接启动使用

### ⚠️ 需要注意的事情

1. ⚠️ 如果备份是压缩的，需要先解压
2. ⚠️ 目标 SD 卡必须 ≥ 源 SD 卡大小
3. ⚠️ 恢复会覆盖目标 SD 卡上的所有数据
4. ⚠️ 备份文件可能很大（32GB）

---

**最后更新**: 2024-11-12

