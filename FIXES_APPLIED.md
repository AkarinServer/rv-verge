# 构建问题修复记录

## 修复时间
2025-11-11

## 已修复的问题

### 1. Docker Workflow - Node.js 安装失败

**问题**: 
```
Error: Unsupported architecture: riscv64. Only amd64, arm64, and armhf are supported.
```

**原因**: NodeSource 的安装脚本不支持 RISCV64 架构

**修复**: 
- 文件: `.github/workflows/build-riscv64-docker.yml`
- 改用 nvm (Node Version Manager) 安装 Node.js
- 添加必要的依赖项（ca-certificates, gnupg）

**修复前**:
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
```

**修复后**:
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm install 20
nvm use 20
```

### 2. Cross-compilation Workflow - QEMU 包冲突

**问题**:
```
qemu-user-binfmt : Conflicts: qemu-user-static but 1:8.2.2+ds-0ubuntu1.10 is to be installed
qemu-user-static : Conflicts: qemu-user-binfmt
E: Unable to correct problems, you have held broken packages.
```

**原因**: `qemu-user-static` 和 `qemu-user-binfmt` 包冲突，不能同时安装

**修复**:
- 文件: `.github/workflows/build-riscv64.yml`
- 移除 `qemu-user-binfmt`，只保留 `qemu-user-static`
- 简化系统依赖安装步骤（交叉编译限制）

**修复前**:
```yaml
qemu-user-static \
qemu-user-binfmt
```

**修复后**:
```yaml
qemu-user-static
```

### 3. 系统依赖安装优化

**问题**: 交叉编译方式无法安装 RISCV64 系统库

**修复**: 
- 在 `build-riscv64.yml` 中跳过系统依赖安装
- 添加注释说明交叉编译限制
- 建议使用 `build-riscv64-simple.yml` 进行实际构建

## 当前 Workflow 状态

### ✅ Build RISCV64 (Simple) - 推荐
- 使用 `run-on-arch-action` 在真实的 RISCV64 环境中构建
- 已修复 Node.js 安装问题（使用 nvm）
- **推荐使用此方案**

### ⚠️ Build RISCV64 with Docker
- 已修复 Node.js 安装问题
- 使用 Docker 容器构建

### ⚠️ Build for RISCV64
- 已修复 QEMU 包冲突
- 交叉编译方式，可能无法安装系统库
- 主要用于测试

## 提交记录

- `ddd2a75` - Fix: Use nvm for Node.js in Docker workflow, fix qemu package conflict

## 下一步

1. 等待新的构建完成
2. 检查是否还有其他错误
3. 如果 `build-riscv64-simple.yml` 成功，可以禁用其他 workflows

## 可能仍存在的问题

1. **系统库不可用**: WebKitGTK 等库在 RISCV64 仓库中可能不可用
2. **构建时间**: QEMU 模拟环境构建较慢（10-30 分钟）
3. **依赖项缺失**: 某些系统依赖项可能需要手动处理

