# 显示分辨率修复 - 1920x1080

## 问题描述
- **桌面环境**: lxqt
- **当前分辨率**: 2560x1600 (可能导致显示问题)
- **目标分辨率**: 1920x1080

---

## 解决方案

### 步骤 1: 更新 modesetting 驱动配置

**配置文件**: `/etc/X11/xorg.conf.d/10-monitor.conf`

**新配置**:
```conf
Section "Device"
	Identifier "Card0"
	Driver "modesetting"
EndSection

Section "Screen"
	Identifier "Screen0"
	Device "Card0"
	DefaultDepth 24
	SubSection "Display"
		Depth 24
		Modes "1920x1080" "1280x720"
	EndSubSection
EndSection
```

### 步骤 2: 重启 X server

```bash
sudo systemctl restart lightdm
```

### 步骤 3: 验证分辨率

```bash
# 检查 X server 日志
grep -iE 'mode|resolution|1920x1080' /var/log/Xorg.0.log

# 检查系统分辨率
cat /sys/class/drm/card0-*/modes
```

---

## lxqt 桌面环境

### 检查 lxqt 状态

```bash
# 检查 lxqt 进程
ps aux | grep -iE 'lxqt|lxqt-session'

# 检查 lightdm 会话
tail -50 /var/log/lightdm/lightdm.log | grep -iE 'lxqt|session'
```

### 设置默认会话（如果需要）

如果 lxqt 不是默认会话，可以设置：

1. **检查可用会话**:
   ```bash
   ls -la /usr/share/xsessions/
   ```

2. **设置用户默认会话**:
   ```bash
   # 编辑用户配置
   sudo nano /var/lib/AccountsService/users/ubuntu
   
   # 添加或修改:
   Session=lxqt
   ```

3. **或者在 lightdm 配置中设置**:
   ```bash
   # 编辑 lightdm 配置
   sudo nano /etc/lightdm/lightdm.conf
   
   # 在 [Seat:*] 部分添加:
   user-session=lxqt
   ```

---

## 验证步骤

### 1. 检查 X server 状态
```bash
systemctl status lightdm
ps aux | grep Xorg
```

### 2. 检查分辨率
```bash
# 从 X server 日志
grep -i 'mode' /var/log/Xorg.0.log | tail -5

# 从系统
cat /sys/class/drm/card0-*/modes
```

### 3. 检查桌面环境
```bash
# 检查 lxqt 进程
ps aux | grep lxqt

# 检查会话日志
tail -30 /var/log/lightdm/x-0.log
```

---

## 故障排除

### 如果分辨率没有改变

1. **检查分辨率是否支持**:
   ```bash
   cat /sys/class/drm/card0-*/modes
   ```

2. **检查 X server 日志**:
   ```bash
   grep -iE 'mode|resolution|error' /var/log/Xorg.0.log | tail -20
   ```

3. **尝试不同的分辨率**:
   - 1280x720
   - 1600x900
   - 1366x768

### 如果桌面环境没有启动

1. **检查会话配置**:
   ```bash
   ls -la /usr/share/xsessions/
   cat /var/lib/AccountsService/users/ubuntu
   ```

2. **检查 lightdm 日志**:
   ```bash
   tail -50 /var/log/lightdm/lightdm.log
   ```

3. **手动启动 lxqt**:
   ```bash
   startlxqt
   ```

---

## 配置状态

### 当前配置

- **驱动**: modesetting (稳定可靠)
- **分辨率**: 1920x1080
- **桌面环境**: lxqt
- **状态**: 待验证

### fbturbo 驱动

- **状态**: 已禁用（由于显示问题）
- **配置**: `/etc/X11/xorg.conf.d/10-d1.conf.disabled`
- **原因**: 导致屏幕闪烁和分段错误

---

## 更新日志

- **2024-11-12**: 发现显示问题 - 屏幕闪烁
- **2024-11-12**: 回滚到 modesetting 驱动
- **2024-11-12**: 更新分辨率为 1920x1080
- **2024-11-12**: 确认桌面环境为 lxqt

---

**状态**: 🔄 配置中
**最后更新**: 2024-11-12

