# 运行时问题报告

## 问题：Lichee RV Dock Ubuntu 24.10 RISC-V 上的图形驱动错误

### 错误信息
```
libEGL warning: DRI3: Screen seems not DRI3 capable
libEGL warning: DRI2: failed to authenticate
libEGL warning: DRI3: Screen seems not DRI3 capable
MESA: error: ZINK: failed to choose pdev
libEGL warning: egl: failed to create dri2 screen
```

### 环境信息
- **设备**: Lichee RV Dock
- **系统**: Ubuntu 24.10
- **架构**: RISC-V
- **应用**: tauri-riscv64-test

### 问题分析

这些错误与图形驱动和 EGL（Embedded-System Graphics Library）有关：

1. **DRI3 不支持**: 系统不支持 DRI3（Direct Rendering Infrastructure 3）
2. **DRI2 认证失败**: DRI2 认证失败，可能是权限或驱动问题
3. **ZINK 驱动失败**: Mesa 的 ZINK（OpenGL on Vulkan）驱动无法选择设备
4. **无法创建 dri2 screen**: EGL 无法创建 DRI2 屏幕

### 可能的原因

1. **缺少图形驱动**: 系统可能缺少适当的图形驱动
2. **权限问题**: 用户可能没有访问图形设备的权限
3. **Wayland vs X11**: 可能需要在 X11 而不是 Wayland 下运行
4. **Mesa 驱动配置**: Mesa 驱动可能未正确配置

### 需要确认

1. **应用是否实际运行**: 这些是警告还是致命错误？
2. **窗口是否显示**: 应用窗口是否正常显示？
3. **系统图形环境**: 系统使用 X11 还是 Wayland？

---

## 解决方案

### 方案 1: 安装图形驱动和依赖

```bash
# 更新系统
sudo apt-get update

# 安装 Mesa 和图形驱动
sudo apt-get install -y \
  mesa-utils \
  libegl1-mesa \
  libegl1-mesa-dev \
  libgles2-mesa \
  libgles2-mesa-dev \
  xserver-xorg-core \
  xserver-xorg-video-all

# 检查图形驱动
glxinfo | grep -i "opengl\|direct rendering"
```

### 方案 2: 使用 X11 而不是 Wayland

```bash
# 检查当前显示服务器
echo $XDG_SESSION_TYPE

# 如果使用 Wayland，切换到 X11
# 编辑 /etc/gdm3/custom.conf 或使用 X11 会话登录
```

### 方案 3: 设置环境变量

```bash
# 使用软件渲染
export LIBGL_ALWAYS_SOFTWARE=1

# 或使用 llvmpipe
export MESA_GL_VERSION_OVERRIDE=3.3
export MESA_GLSL_VERSION_OVERRIDE=330

# 运行应用
./tauri-riscv64-test
```

### 方案 4: 添加用户到渲染组

```bash
# 将用户添加到 render 组
sudo usermod -aG render $USER

# 重新登录或使用 newgrp
newgrp render
```

### 方案 5: 检查设备权限

```bash
# 检查 /dev/dri 设备
ls -la /dev/dri/

# 如果设备存在但没有权限，添加权限
sudo chmod 666 /dev/dri/card0
sudo chmod 666 /dev/dri/renderD128
```

---

## 诊断步骤

### 1. 检查应用是否实际运行

```bash
# 运行应用并查看是否显示窗口
./tauri-riscv64-test

# 检查进程
ps aux | grep tauri-riscv64-test
```

### 2. 检查图形环境

```bash
# 检查显示服务器
echo $XDG_SESSION_TYPE
echo $DISPLAY
echo $WAYLAND_DISPLAY

# 检查 Mesa 版本
dpkg -l | grep mesa
```

### 3. 检查 EGL 支持

```bash
# 安装 egl 工具
sudo apt-get install -y mesa-utils-extra

# 检查 EGL
eglinfo
```

### 4. 检查权限

```bash
# 检查用户组
groups

# 检查设备权限
ls -la /dev/dri/
```

---

## 建议的修复顺序

1. **首先确认**: 应用是否实际运行？窗口是否显示？
2. **如果只是警告**: 可以忽略，应用可能仍然正常工作
3. **如果应用无法运行**: 
   - 先尝试方案 3（设置环境变量）
   - 然后尝试方案 1（安装驱动）
   - 最后尝试方案 4（权限问题）

---

## 注意事项

- 这些错误可能是**警告**而不是致命错误
- 如果应用窗口正常显示，可以忽略这些警告
- Lichee RV Dock 可能使用软件渲染，性能可能较慢
- 某些图形功能可能不可用，但基本功能应该可以工作

