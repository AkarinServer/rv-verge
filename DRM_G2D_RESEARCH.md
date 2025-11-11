# DRM G2D 支持深入研究

## 系统检查结果

### 内核和驱动信息

**内核版本**: 6.8.0-31-generic

**DRM 驱动**:
- `sun4i-drm` - 主 DRM 驱动
- `sun8i_drm_hdmi` - HDMI 支持
- `sun4i_tcon` - 时序控制器
- `sun8i_tcon_top` - TCON 顶层
- `sun8i_mixer` - 混合器

**DRM 设备**:
- `/dev/dri/card0` - DRM 设备节点
- 驱动: `sun4i-drm`
- 设备: `display-engine`
- 兼容性: `allwinner,sun20i-d1-display-engine`

### G2D 硬件状态

**时钟节点** (确认存在):
- `/sys/kernel/debug/clk/g2d` - G2D 时钟
- `/sys/kernel/debug/clk/bus-g2d` - G2D 总线时钟
- `/sys/kernel/debug/clk/mbus-g2d` - G2D 内存总线时钟

**设备节点** (不存在):
- ❌ `/dev/disp` - 传统 display 设备节点
- ❌ `/dev/g2d` - 传统 G2D 设备节点

**内核模块** (不存在):
- ❌ `sunxi_disp` - 传统 display 模块
- ❌ `sunxi_g2d` - 传统 G2D 模块

### 用户空间库

**libdrm**:
- ✅ 已安装 (需要确认版本)
- ✅ DRM 设备可访问
- ❓ G2D 支持未知

**G2D 库**:
- ❌ 没有用户空间 G2D 库
- ❌ 没有 pkg-config 配置
- ❌ 没有动态库

---

## 驱动代码分析

### fbturbo 驱动的 G2D 使用方式

**设备节点访问**:
```c
// src/sunxi_disp.c:85
ctx->fd_disp = open("/dev/disp", O_RDWR);

// src/sunxi_disp.c:170
ctx->fd_g2d = open("/dev/g2d", O_RDWR);
```

**G2D 操作**:
- 使用 ioctl 调用访问 G2D 硬件
- 使用 `g2d_driver.h` 中定义的命令和结构
- 支持多种像素格式 (ARGB8888, RGB565 等)
- 支持 bitblt、fillrect 等操作

**关键文件**:
- `src/g2d_driver.h` - G2D 驱动接口定义
- `src/sunxi_x_g2d.c` - G2D X server 集成
- `src/sunxi_disp.c` - Display 和 G2D 初始化

---

## DRM G2D 支持研究

### 当前状态

**DRM 驱动**:
- 使用 `sun4i-drm` 驱动
- 支持显示输出 (HDMI, LCD)
- **G2D 支持未知**

**需要研究的问题**:
1. DRM 驱动是否支持 G2D？
2. 是否有 DRM G2D 接口？
3. 是否需要额外的内核模块？
4. 用户空间如何访问 G2D？

### 可能的解决方案

#### 方案 1: 检查 DRM 是否支持 G2D

**步骤**:
1. 检查内核源码中是否有 G2D DRM 驱动
2. 检查设备树中是否有 G2D 节点
3. 检查 DRM 驱动是否导出了 G2D 接口

**可行性**: 需要检查内核源码

#### 方案 2: 创建用户空间适配层

**思路**: 创建一个用户空间守护进程，模拟 `/dev/disp` 和 `/dev/g2d` 设备节点，通过 DRM 接口访问 G2D 硬件。

**步骤**:
1. 研究 DRM 如何访问 G2D (如果支持)
2. 创建虚拟设备节点
3. 实现 ioctl 转换层
4. 将传统 ioctl 调用转换为 DRM 调用

**可行性**: 中等，需要深入了解 DRM 和 G2D

#### 方案 3: 修改驱动使用 DRM 接口

**思路**: 直接修改驱动代码，使用 DRM 接口而不是传统的设备节点。

**步骤**:
1. 研究 DRM G2D 接口 (如果存在)
2. 修改驱动初始化代码
3. 替换 ioctl 调用为 DRM 调用
4. 测试和调试

**可行性**: 中等，需要修改驱动代码

#### 方案 4: 加载传统内核模块

**思路**: 如果内核支持，加载传统的 `sunxi_disp` 和 `sunxi_g2d` 模块。

**步骤**:
1. 检查内核是否编译了传统模块
2. 尝试加载模块
3. 检查是否创建设备节点
4. 测试兼容性

**可行性**: 低，可能与现有 DRM 驱动冲突

---

## 下一步研究

### 立即行动

1. **检查内核源码**:
   - 查找 G2D 相关的 DRM 驱动代码
   - 检查设备树绑定文档
   - 检查是否有 G2D DRM 支持

2. **检查 libdrm**:
   - 确认 libdrm 版本
   - 检查是否有 G2D 相关的 API
   - 查找相关文档和示例

3. **查找相关项目**:
   - 搜索 GitHub 上的相关项目
   - 查找 Allwinner D1 G2D 相关的工作
   - 查找 DRM G2D 的实现

### 中期行动

1. **研究 DRM G2D 接口**:
   - 如果存在，研究接口定义
   - 研究如何使用接口
   - 编写测试程序

2. **开发适配方案**:
   - 选择合适的方案
   - 开发适配代码
   - 测试兼容性

3. **修改驱动**:
   - 如果需要，修改驱动代码
   - 适配新的接口
   - 测试功能

---

## 参考资源

### 内核文档
- Linux DRM 文档
- Allwinner D1 内核源码
- G2D 驱动文档

### 用户空间库
- libdrm 文档
- Mesa 文档
- DRM 用户空间 API

### 社区资源
- Allwinner 开发者论坛
- RISC-V Linux 社区
- DRM 开发社区
- ClockworkPi 论坛

### 相关项目
- yatli 的 fbturbo 驱动
- sun4i-drm 驱动
- 其他 Allwinner D1 项目

---

## 结论

### 当前状态
- G2D 硬件存在
- DRM 驱动运行正常
- 传统设备节点不存在
- G2D 访问方式未知

### 需要研究
1. DRM 是否支持 G2D
2. 如何通过 DRM 访问 G2D
3. 是否需要额外的驱动或模块
4. 用户空间如何访问 G2D

### 推荐行动
1. 深入研究内核源码
2. 检查 libdrm 支持
3. 查找相关项目和资源
4. 制定详细的适配方案

---

## 更新日志

- **2024-11-12**: 开始深入研究 DRM G2D 支持
- **2024-11-12**: 检查系统状态和驱动信息
- **2024-11-12**: 分析驱动代码结构
- **2024-11-12**: 制定研究计划

