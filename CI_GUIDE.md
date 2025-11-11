# GitHub Actions CI 构建指南

## 为什么使用 CI？

在 macOS 上交叉编译 RISCV64 Linux 应用**非常复杂且不现实**，原因包括：

1. **缺少系统库**: GTK、WebKit 等系统库需要 RISCV64 版本
2. **工具链复杂**: 需要配置完整的交叉编译工具链和 sysroot
3. **pkg-config 配置**: 需要为交叉编译配置 pkg-config
4. **维护成本高**: 配置复杂，容易出错

**解决方案**: 使用 GitHub Actions CI 在云端自动构建！

## 可用的 Workflows

项目提供了多个 GitHub Actions workflows：

### 1. 简单方案（推荐）: `build-riscv64-simple.yml`

使用 `uraimo/run-on-arch-action`，在 QEMU 模拟的 RISCV64 Ubuntu 环境中构建。

**优点**:
- 配置简单
- 自动处理 QEMU 设置
- 在真实的 RISCV64 环境中运行

**使用方法**:
```bash
# 推送到 GitHub 后自动触发
git push origin main
```

### 2. Docker 方案: `build-riscv64-docker.yml`

使用 Docker 容器在 RISCV64 环境中构建。

**优点**:
- 完全隔离的环境
- 可复现的构建

### 3. 完整构建: `build-all.yml`

同时构建 macOS ARM64 和 RISCV64 两个平台。

**优点**:
- 一次构建多个平台
- 统一管理

## 如何使用

### 方法 1: 自动触发（推荐）

1. 将代码推送到 GitHub
2. CI 会自动运行（在 push 或 PR 时）
3. 在 GitHub Actions 页面查看构建结果
4. 下载构建产物（Artifacts）

### 方法 2: 手动触发

1. 在 GitHub 仓库页面
2. 点击 "Actions" 标签
3. 选择对应的 workflow
4. 点击 "Run workflow"

## 构建产物

构建成功后，可以在 GitHub Actions 页面下载：

- **macOS ARM64**: `.app` 文件和 `.dmg` 安装包
- **RISCV64**: 可执行文件和 AppImage（如果成功）

## 故障排除

### RISCV64 构建失败

可能的原因：
1. **系统库不可用**: WebKitGTK 等库在 RISCV64 仓库中可能不可用
2. **依赖项缺失**: 某些系统依赖项需要手动安装
3. **QEMU 性能**: 模拟环境可能较慢

**解决方案**:
- 检查构建日志中的具体错误
- 尝试在真实的 RISCV64 硬件上构建
- 考虑使用替代的 WebView 实现

### 性能问题

QEMU 模拟 RISCV64 会有性能损失：
- 构建时间可能较长（10-30 分钟）
- 这是正常的，因为是在 x86_64 上模拟 RISCV64

## 本地测试

虽然交叉编译复杂，但您仍然可以：

1. **测试 macOS 版本**: 在本地构建和测试 macOS ARM64 版本
2. **使用 CI**: 让 GitHub Actions 处理 RISCV64 构建
3. **真实硬件**: 如果有 RISCV64 硬件，直接在上面构建

## 推荐工作流

1. **开发阶段**: 在 macOS 上开发和测试 macOS 版本
2. **CI 构建**: 推送到 GitHub，让 CI 自动构建所有平台
3. **验证**: 下载 CI 构建的 RISCV64 版本进行测试

这样既保证了开发效率，又确保了跨平台构建的可靠性。

