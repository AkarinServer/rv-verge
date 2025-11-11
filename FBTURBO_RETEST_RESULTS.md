# fbturbo 驱动重新测试结果

## 测试日期
2024-11-12

## 测试配置
- **驱动**: fbturbo
- **分辨率**: 1920x1080 (与 modesetting 相同)
- **桌面环境**: lxqt
- **目的**: 测试 fbturbo 驱动在 1920x1080 分辨率下是否正常工作

---

## 测试结果

### ❌ 测试失败

#### 问题 1: 分辨率设置失败
**症状**: 驱动无法找到 1920x1080 模式

**日志消息**:
```
[    XXX] (II) FBTURBO(0): 	mode "1920x1080" test failed
[    XXX] (II) FBTURBO(0): 	mode "1920x1080" not found
[    XXX] (II) FBTURBO(0): 	mode "1280x720" test failed
[    XXX] (II) FBTURBO(0): 	mode "1280x720" not found
[    XXX] (II) FBTURBO(0): Virtual size is 2560x1600 (pitch 2560)
[    XXX] (**) FBTURBO(0):  Built-in mode "current"
```

**原因**: 
- fbturbo 驱动无法正确处理分辨率模式
- 驱动回退到 framebuffer 的当前模式（2560x1600）
- 与 modesetting 驱动不同，fbturbo 无法通过 DRM 获取支持的模式

#### 问题 2: 分段错误 (Segmentation Fault)
**症状**: X server 崩溃，出现分段错误

**错误消息**:
```
[    XXX] (EE) Segmentation fault at address 0x384eb1e000
[    XXX] (EE) Caught signal 11 (Segmentation fault). Server aborting
```

**错误堆栈**:
```
Backtrace:
0: /usr/lib/xorg/Xorg (xorg_backtrace+0x4c)
1: /usr/lib/xorg/Xorg
2: linux-vdso.so.1 (__vdso_rt_sigreturn+0x0)
3: /lib/riscv64-linux-gnu/libpixman-1.so.0 (pixman_fill+0x24)
4: /usr/lib/xorg/Xorg (fbFill+0x224)
5: /usr/lib/xorg/Xorg (fbPolyFillRect+0x100)
6: /usr/lib/xorg/Xorg (miPaintWindow+0x208)
7: /usr/lib/xorg/Xorg (miWindowExposures+0xd6)
8: /usr/lib/xorg/Xorg (MapWindow+0x1fa)
```

**原因**:
- 错误发生在渲染操作中（pixman_fill -> fbFill）
- 可能是内存访问问题
- 可能是驱动与当前 X server 版本不兼容
- 可能是驱动与 pixman 库不兼容

#### 问题 3: G2D 加速未启用
**症状**: G2D 硬件加速无法启用

**日志消息**:
```
[    XXX] (II) FBTURBO(0): No sunxi-g2d hardware detected (check /dev/disp and /dev/g2d)
[    XXX] (II) FBTURBO(0): G2D hardware acceleration can't be enabled
```

**原因**:
- `/dev/disp` 和 `/dev/g2d` 设备节点不存在
- 预期行为，不影响基本功能

---

## 问题分析

### 根本原因

1. **驱动兼容性问题**:
   - fbturbo 驱动与当前 X server 版本 (1.21.1.13) 不兼容
   - 驱动编译时针对的 X server 版本可能较旧
   - 驱动与 pixman 库的接口可能不匹配

2. **分辨率处理问题**:
   - fbturbo 驱动无法通过 DRM 获取支持的分辨率
   - 驱动只能使用 framebuffer 的当前分辨率
   - 无法动态设置分辨率

3. **内存管理问题**:
   - 分段错误表明内存访问问题
   - 可能是驱动在渲染时的内存管理错误
   - 可能是驱动与 shadow framebuffer 的交互问题

### 与 modesetting 驱动的对比

| 特性 | modesetting | fbturbo |
|------|-------------|---------|
| 分辨率支持 | ✅ 支持 1920x1080 | ❌ 无法设置，使用当前模式 |
| 稳定性 | ✅ 稳定 | ❌ 分段错误 |
| DRM 支持 | ✅ 支持 | ❌ 不支持 |
| G2D 加速 | ❌ 不支持 | ❌ 不支持（设备节点缺失） |
| 兼容性 | ✅ 完全兼容 | ❌ 不兼容 |

---

## 结论

### fbturbo 驱动无法使用

**原因**:
1. **分段错误**: 驱动导致 X server 崩溃
2. **分辨率问题**: 无法设置 1920x1080 分辨率
3. **兼容性问题**: 与当前系统不兼容

### 推荐方案

1. **继续使用 modesetting 驱动**:
   - 稳定可靠
   - 支持 1920x1080 分辨率
   - 无兼容性问题

2. **放弃 fbturbo 驱动**:
   - 当前版本无法使用
   - 需要重新编译或更新驱动
   - 需要修复兼容性问题

3. **未来考虑**:
   - 等待驱动更新
   - 研究从源码重新编译驱动
   - 考虑其他硬件加速方案

---

## 回滚操作

### 已执行的回滚

```bash
# 1. 禁用 fbturbo 配置
mv /etc/X11/xorg.conf.d/10-d1.conf /etc/X11/xorg.conf.d/10-d1.conf.disabled-segfault

# 2. 恢复 modesetting 配置
mv /etc/X11/xorg.conf.d/10-monitor.conf.disabled-test /etc/X11/xorg.conf.d/10-monitor.conf

# 3. 重启 X server
systemctl restart lightdm
```

### 当前配置

- **驱动**: modesetting (稳定可靠)
- **分辨率**: 1920x1080
- **桌面环境**: lxqt
- **状态**: 正常工作 ✅

---

## 测试数据

### 驱动加载
- ✅ 驱动成功加载
- ✅ 驱动初始化开始
- ❌ 驱动在渲染时崩溃

### 分辨率设置
- ❌ 无法设置 1920x1080
- ❌ 无法设置 1280x720
- ⚠️ 使用当前模式 (2560x1600)

### G2D 加速
- ❌ G2D 加速未启用（设备节点缺失）
- ⚠️ 预期行为

### 稳定性
- ❌ 分段错误
- ❌ X server 崩溃
- ❌ 无法正常使用

---

## 更新日志

- **2024-11-12**: 开始重新测试 fbturbo 驱动
- **2024-11-12**: 更新配置为 1920x1080 分辨率
- **2024-11-12**: 测试失败 - 分段错误
- **2024-11-12**: 回滚到 modesetting 驱动
- **2024-11-12**: 测试完成，记录结果

---

**测试状态**: ❌ 失败
**最终决定**: 继续使用 modesetting 驱动
**最后更新**: 2024-11-12

