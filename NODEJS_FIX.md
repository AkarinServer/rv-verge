# Node.js 安装问题修复

## 问题描述

### 问题 1: Node.js v22 预编译二进制文件不可用

**错误信息**:
```
curl: (22) The requested URL returned error: 404
Binary download from https://unofficial-builds.nodejs.org/download/release/v22.21.1/node-v22.21.1-linux-riscv64.tar.xz failed
```

**原因**: 
- nvm 默认尝试安装最新版本（v22）
- RISCV64 的预编译二进制文件可能不可用或版本不匹配

### 问题 2: TMPDIR 未绑定变量错误

**错误信息**:
```
/root/.nvm/nvm.sh: line 2041: TMPDIR: unbound variable
```

**原因**: 
- nvm 脚本需要 TMPDIR 环境变量
- 在某些环境中未设置

### 问题 3: GLIBC 版本不兼容

**错误信息** (Docker workflow):
```
node: /lib/riscv64-linux-gnu/libc.so.6: version `GLIBC_2.38' not found (required by node)
```

**原因**: 
- Node.js v22 需要 GLIBC 2.38
- Ubuntu 22.04 只有 GLIBC 2.35
- 版本不兼容

## 修复方案

### 1. 设置 TMPDIR 环境变量

```bash
export TMPDIR=/tmp
```

### 2. 优先使用 Node.js 18 LTS

- Node.js 18 LTS 与 Ubuntu 22.04 (GLIBC 2.35) 兼容
- 更稳定，更可能与系统库兼容

### 3. 使用非官方构建镜像

```bash
export NVM_NODEJS_ORG_MIRROR=https://unofficial-builds.nodejs.org/download/release
```

### 4. 降级策略

如果非官方构建不可用，尝试：
1. 使用官方镜像安装 Node.js 18
2. 如果失败，尝试 Node.js 20
3. 最后尝试从源码编译（会很慢）

## 修复后的安装命令

```bash
# 设置环境变量
export TMPDIR=/tmp
export NVM_NODEJS_ORG_MIRROR=https://unofficial-builds.nodejs.org/download/release

# 安装 nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# 优先安装 Node.js 18 LTS
nvm install 18 --latest-npm || \
(export NVM_NODEJS_ORG_MIRROR=https://nodejs.org/dist && nvm install 18 --latest-npm) || \
nvm install 20 --latest-npm || \
nvm install 20

# 使用 Node.js
nvm use 18 || nvm use 20
```

## 修复的文件

- `.github/workflows/build-riscv64-simple.yml`
- `.github/workflows/build-riscv64-docker.yml`

## 提交记录

- `d94e4eb` - Fix: Prioritize Node.js 18 LTS for better GLIBC compatibility on RISCV64

## 预期结果

- ✅ Node.js 18 LTS 应该能够成功安装
- ✅ 与 Ubuntu 22.04 的 GLIBC 2.35 兼容
- ✅ 避免从源码编译（更快）

## 如果仍然失败

如果 Node.js 安装仍然失败，可以考虑：

1. **使用 Ubuntu 仓库中的 Node.js**（版本较旧但稳定）:
   ```bash
   apt-get install -y nodejs npm
   ```

2. **从源码编译 Node.js**（很慢，但最可靠）:
   ```bash
   nvm install -s 18  # -s 表示从源码编译
   ```

3. **使用预编译的 Node.js 二进制文件**:
   - 手动下载并安装兼容的 Node.js 版本
   - 设置 PATH 环境变量
