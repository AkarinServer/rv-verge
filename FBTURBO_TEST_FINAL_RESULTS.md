# fbturbo 驱动测试最终结果

## 测试日期
2024-11-12

## 测试环境
- **设备**: Lichee RV Dock
- **系统**: Ubuntu 24.10 RISC-V
- **内核**: 6.8.0-31-generic
- **X server**: Xorg 1.21.1.13
- **显示管理器**: lightdm

---

## 测试结果总结

### ✅ 成功项目

1. **驱动安装**: ✅ 成功
   - 驱动模块已安装到 `/usr/lib/xorg/modules/drivers/fbturbo_drv.so`
   - 驱动架构: RISC-V 64-bit
   - 驱动大小: 263 KB

2. **驱动加载**: ✅ 成功
   - fbturbo 驱动成功加载
   - 使用 `/dev/fb0` framebuffer 设备
   - 驱动版本: 0.5.1

3. **X server 启动**: ✅ 成功
   - lightdm 服务正常运行
   - X server 进程正在运行
   - 所有扩展成功初始化

4. **配置冲突解决**: ✅ 成功
   - 禁用了 `10-monitor.conf` 中的 modesetting 驱动
   - 仅使用 fbturbo 驱动
   - 无驱动冲突

### ⚠️ 已知问题

1. **G2D 硬件加速**: ❌ 未启用
   - 原因: `/dev/disp` 和 `/dev/g2d` 设备节点不存在
   - 日志消息: `No sunxi-g2d hardware detected (check /dev/disp and /dev/g2d)`
   - 日志消息: `G2D hardware acceleration can't be enabled`
   - 日志消息: `failed to enable the use of sunxi display controller`

2. **FBIOPUTCMAP 警告**: ⚠️ 非关键
   - 错误消息: `FBIOPUTCMAP: Invalid argument`
   - 原因: Framebuffer 设备不支持颜色映射表操作
   - 影响: 不影响正常使用，只是警告

3. **DRI2 不支持**: ⚠️ 预期行为
   - 日志消息: `AIGLX: Screen 0 is not DRI2 capable`
   - 原因: fbturbo 驱动不使用 DRI2
   - 影响: 不影响 2D 加速功能

---

## 日志分析

### 驱动加载日志

```
[    XXX] (II) LoadModule: "fbturbo"
[    XXX] (II) Loading /usr/lib/xorg/modules/drivers/fbturbo_drv.so
[    XXX] (II) Module fbturbo: vendor="X.Org Foundation"
[    XXX] (II) FBTURBO: driver for framebuffer: fbturbo
[    XXX] (II) FBTURBO(0): using /dev/fb0
```

### G2D 加速状态日志

```
[    XXX] (II) FBTURBO(0): sunxi_disp_init: begin
[    XXX] (II) FBTURBO(0): failed to enable the use of sunxi display controller
[    XXX] (II) FBTURBO(0): No sunxi-g2d hardware detected (check /dev/disp and /dev/g2d)
[    XXX] (II) FBTURBO(0): G2D hardware acceleration can't be enabled
```

### X server 初始化日志

```
[    XXX] (II) Initializing extension Generic Event Extension
[    XXX] (II) Initializing extension SHAPE
[    XXX] (II) Initializing extension MIT-SHM
[    XXX] (II) Initializing extension XInputExtension
[    XXX] (II) Initializing extension XTEST
[    XXX] (II) Initializing extension BIG-REQUESTS
[    XXX] (II) Initializing extension SYNC
[    XXX] (II) Initializing extension XKEYBOARD
[    XXX] (II) Initializing extension XC-MISC
[    XXX] (II) Initializing extension SECURITY
[    XXX] (II) Initializing extension XFIXES
[    XXX] (II) Initializing extension RENDER
[    XXX] (II) Initializing extension RANDR
[    XXX] (II) Initializing extension COMPOSITE
[    XXX] (II) Initializing extension DAMAGE
[    XXX] (II) Initializing extension MIT-SCREEN-SAVER
[    XXX] (II) Initializing extension DOUBLE-BUFFER
[    XXX] (II) Initializing extension RECORD
[    XXX] (II) Initializing extension DPMS
[    XXX] (II) Initializing extension Present
[    XXX] (II) Initializing extension DRI3
[    XXX] (II) Initializing extension X-Resource
[    XXX] (II) Initializing extension XVideo
[    XXX] (II) Initializing extension XVideo-MotionCompensation
[    XXX] (II) Initializing extension SELinux
[    XXX] (II) Initializing extension GLX
[    XXX] (II) AIGLX: Screen 0 is not DRI2 capable
```

---

## 配置更改

### 已应用的配置

1. **禁用 modesetting 驱动**:
   ```bash
   mv /etc/X11/xorg.conf.d/10-monitor.conf /etc/X11/xorg.conf.d/10-monitor.conf.disabled
   ```

2. **fbturbo 配置** (`/etc/X11/xorg.conf.d/10-d1.conf`):
   ```conf
   Section "ServerLayout"
       Identifier  "Layout0"
       Screen  0   "Screen0"
   EndSection

   Section "Module"
       Load    "shadow"
   EndSection

   Section "Device"
       Identifier  "FBDEV"
       Driver      "fbturbo"
       Option      "fbdev" "/dev/fb0"
       Option      "SwapbuffersWait" "true"
       Option      "OffTime" "0"
   EndSection

   Section "Screen"
       Identifier  "Screen0"
       Device      "FBDEV"
       DefaultDepth    24
       
       Subsection "Display"
           Depth   24
           Modes   "2560x1600" "1600x2560"
       EndSubsection
   EndSection
   ```

---

## 性能影响

### 当前状态

- **G2D 硬件加速**: 未启用
- **性能**: 与 modesetting 驱动类似（软件渲染）
- **功能**: 基本显示功能正常

### 预期性能提升（如果启用 G2D）

根据论坛帖子数据：
- **全屏旋转**: 65倍性能提升
- **大矩形填充**: 3-5倍性能提升
- **窗口移动**: 显著改善

---

## 下一步

### 短期方案

1. **测试当前性能**: 
   - 测试窗口移动性能
   - 测试滚动性能
   - 测试应用启动时间

2. **优化配置**:
   - 调整驱动参数
   - 优化分辨率设置

### 中期方案

1. **研究设备节点**:
   - 分析为什么 `/dev/disp` 和 `/dev/g2d` 不存在
   - 研究如何创建这些设备节点
   - 检查内核模块和驱动

2. **开发适配层**:
   - 创建用户空间适配层
   - 或修改驱动以支持 DRM 接口

### 长期方案

1. **内核支持**:
   - 检查内核是否有 G2D 支持但未启用
   - 研究内核模块加载
   - 考虑内核配置修改

2. **驱动适配**:
   - 修改 fbturbo 驱动以支持 DRM 接口
   - 或开发新的驱动适配层

---

## 结论

### 测试结论

1. ✅ **驱动可以正常加载和工作**
2. ✅ **X server 可以正常启动**
3. ✅ **基本显示功能正常**
4. ❌ **G2D 硬件加速未启用**（设备节点不存在）
5. ⚠️ **性能与 modesetting 驱动类似**（软件渲染）

### 推荐行动

1. **继续使用 fbturbo 驱动**:
   - 驱动稳定，无致命错误
   - 基本功能正常
   - 为将来启用 G2D 加速做好准备

2. **研究 G2D 设备节点**:
   - 分析设备节点缺失原因
   - 研究创建设备节点的方法
   - 开发适配方案

3. **性能测试**:
   - 对比 fbturbo 和 modesetting 驱动的性能
   - 测试实际应用性能
   - 记录性能数据

---

## 更新日志

- **2024-11-12**: 开始测试
- **2024-11-12**: 发现驱动冲突问题
- **2024-11-12**: 解决驱动冲突
- **2024-11-12**: 驱动成功加载，X server 正常启动
- **2024-11-12**: G2D 加速未启用（设备节点不存在）
- **2024-11-12**: 测试完成，编写最终报告

---

**测试状态**: ✅ 完成
**最后更新**: 2024-11-12

