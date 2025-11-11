# CI 配置说明

## 当前配置

**目标平台**: 仅 RISCV64 Linux

**已移除**: macOS ARM64 构建

## 保留的 Workflows

### 1. Build RISCV64 (Simple) - 推荐
**文件**: `.github/workflows/build-riscv64-simple.yml`

- 使用 `uraimo/run-on-arch-action`
- 在 QEMU 模拟的 RISCV64 Ubuntu 22.04 环境中构建
- 使用 nvm 安装 Node.js
- **推荐使用此方案**

### 2. Build RISCV64 with Docker
**文件**: `.github/workflows/build-riscv64-docker.yml`

- 使用 Docker 容器构建
- 完全隔离的环境

### 3. Build for RISCV64
**文件**: `.github/workflows/build-riscv64.yml`

- 使用 QEMU 和交叉编译工具链
- 在 Ubuntu runner 上交叉编译

## 已删除的 Workflows

- ❌ `build-all.yml` - 包含 macOS ARM64 构建，已删除

## 触发条件

所有 workflows 在以下情况触发：
- Push 到 `main` 或 `master` 分支
- Pull Request 到 `main` 或 `master` 分支
- 手动触发（workflow_dispatch）

## 构建产物

构建成功后，可在 Actions 页面下载：
- RISCV64 可执行文件
- AppImage（如果构建成功）

## 查看构建状态

```bash
# 查看所有构建
gh run list --repo AkarinServer/tauri-test

# 实时监控
gh run watch --repo AkarinServer/tauri-test

# 查看特定构建日志
gh run view <run-id> --repo AkarinServer/tauri-test --log
```

或访问: https://github.com/AkarinServer/tauri-test/actions

