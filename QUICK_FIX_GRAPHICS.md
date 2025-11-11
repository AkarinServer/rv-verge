# 快速修复：Lichee RV Dock 图形驱动问题

## 问题症状

运行 `tauri-riscv64-test` 时出现：
```
libEGL warning: DRI3: Screen seems not DRI3 capable
libEGL warning: DRI2: failed to authenticate
MESA: error: ZINK: failed to choose pdev
libEGL warning: egl: failed to create dri2 screen
```

## 快速诊断

### 1. 首先确认应用是否实际运行

```bash
# 运行应用
./tauri-riscv64-test

# 在另一个终端检查进程
ps aux | grep tauri-riscv64-test
```

**如果应用窗口正常显示**：这些只是警告，可以忽略或使用下面的方法消除警告。

**如果应用无法启动或窗口不显示**：需要修复图形驱动问题。

---

## 快速修复方案（按优先级）

### 方案 1: 使用软件渲染（最简单，推荐先试）

```bash
# 设置环境变量使用软件渲染
export LIBGL_ALWAYS_SOFTWARE=1
export MESA_GL_VERSION_OVERRIDE=3.3

# 运行应用
./tauri-riscv64-test
```

**永久设置**（添加到 `~/.bashrc`）：
```bash
echo 'export LIBGL_ALWAYS_SOFTWARE=1' >> ~/.bashrc
echo 'export MESA_GL_VERSION_OVERRIDE=3.3' >> ~/.bashrc
source ~/.bashrc
```

### 方案 2: 安装图形驱动和依赖

```bash
sudo apt-get update
sudo apt-get install -y \
  mesa-utils \
  libegl1-mesa \
  libgles2-mesa \
  xserver-xorg-core \
  xserver-xorg-video-all \
  libgl1-mesa-dri \
  libgl1-mesa-glx
```

### 方案 3: 检查并修复权限

```bash
# 检查设备权限
ls -la /dev/dri/

# 如果设备存在但没有权限，添加用户到相关组
sudo usermod -aG render $USER
sudo usermod -aG video $USER

# 重新登录或使用 newgrp
newgrp render
```

### 方案 4: 切换到 X11（如果使用 Wayland）

```bash
# 检查当前显示服务器
echo $XDG_SESSION_TYPE

# 如果是 wayland，编辑登录管理器配置
# 对于 GDM3:
sudo nano /etc/gdm3/custom.conf

# 取消注释或添加：
# WaylandEnable=false

# 重启或重新登录
```

---

## 完整诊断脚本

创建一个诊断脚本：

```bash
cat > diagnose_graphics.sh << 'EOF'
#!/bin/bash

echo "=== 图形环境诊断 ==="
echo ""

echo "1. 显示服务器类型:"
echo "   $XDG_SESSION_TYPE"
echo ""

echo "2. Mesa 版本:"
dpkg -l | grep -i mesa | head -5
echo ""

echo "3. 图形设备权限:"
ls -la /dev/dri/ 2>/dev/null || echo "   /dev/dri 不存在"
echo ""

echo "4. 用户组:"
groups | grep -E "(render|video)" || echo "   用户不在 render 或 video 组中"
echo ""

echo "5. EGL 信息:"
if command -v eglinfo &> /dev/null; then
    eglinfo 2>&1 | head -10
else
    echo "   eglinfo 未安装（运行: sudo apt-get install mesa-utils-extra）"
fi
echo ""

echo "6. OpenGL 信息:"
if command -v glxinfo &> /dev/null; then
    glxinfo | grep -E "(OpenGL|direct rendering)" | head -3
else
    echo "   glxinfo 未安装（运行: sudo apt-get install mesa-utils）"
fi
EOF

chmod +x diagnose_graphics.sh
./diagnose_graphics.sh
```

---

## 推荐修复步骤

1. **先试方案 1**（软件渲染）- 最简单，通常有效
2. **如果不行，试方案 2**（安装驱动）
3. **检查权限**（方案 3）
4. **最后考虑方案 4**（切换显示服务器）

---

## 如果应用仍然无法运行

请提供以下信息：

```bash
# 运行诊断
./diagnose_graphics.sh

# 检查应用错误
./tauri-riscv64-test 2>&1 | tee app_error.log

# 检查系统日志
dmesg | tail -20
```

---

## 注意事项

- Lichee RV Dock 可能使用软件渲染，性能较慢但功能正常
- 这些警告通常不会阻止应用运行
- 如果应用窗口正常显示，可以忽略这些警告

