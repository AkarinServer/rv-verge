# 最新修复记录

## 修复时间
2025-11-11

## 发现的问题

### 1. Node.js 二进制文件不存在

**错误**:
```
curl: (22) The requested URL returned error: 404
Binary download from https://nodejs.org/dist/v20.19.5/node-v20.19.5-linux-riscv64.tar.xz failed
```

**原因**: Node.js 官方不提供 RISCV64 架构的预编译二进制文件

**影响**: nvm 无法下载预编译版本，需要从源码编译

### 2. 缺少 Python

**错误**:
```
./configure: 11: exec: python: not found
nvm: install v20.19.5 failed!
```

**原因**: 从源码编译 Node.js 需要 Python，但容器中没有安装

### 3. TMPDIR 未设置

**错误**:
```
/root/.nvm/nvm.sh: line 2041: TMPDIR: unbound variable
```

**原因**: nvm 脚本需要 TMPDIR 环境变量

### 4. 交叉编译缺少系统库

**错误** (build-riscv64.yml):
```
HINT: you may need to install a package such as gdk-3.0, gdk-3.0-dev or gdk-3.0-devel.
```

**原因**: 交叉编译方式无法安装 RISCV64 系统库

## 已应用的修复

### 修复 1: 添加 Python 和构建工具

**文件**: 
- `.github/workflows/build-riscv64-simple.yml`
- `.github/workflows/build-riscv64-docker.yml`

**修复内容**:
```yaml
python3 \
python3-pip \
make \
gcc \
g++
```

### 修复 2: 设置 TMPDIR 环境变量

```bash
export TMPDIR=/tmp
```

### 修复 3: 强制从源码编译 Node.js

```bash
# 使用 -s 标志强制从源码编译
nvm install -s 20 || nvm install -s 18 || nvm install -s 16
nvm use 20 || nvm use 18 || nvm use 16
```

**说明**: 
- `-s` 标志强制从源码编译
- 添加了降级选项（如果 Node 20 失败，尝试 18 或 16）

## 预期影响

### 构建时间

⚠️ **重要**: 从源码编译 Node.js 会显著增加构建时间：
- 预编译版本: ~1-2 分钟
- 从源码编译: ~30-60 分钟（取决于 CPU 性能）

### 构建成功率

✅ 应该能够成功安装 Node.js（虽然很慢）

## 当前状态

新的构建已启动，包含以下修复：
- ✅ 添加了 Python3 和构建工具
- ✅ 设置了 TMPDIR
- ✅ 强制从源码编译 Node.js
- ✅ 添加了降级选项

## 提交记录

- `e30dc41` - Fix: Add Python and build tools for Node.js source compilation on RISCV64

## 下一步

1. ⏳ 等待构建完成（可能需要 30-60 分钟）
2. 📊 检查是否还有其他错误
3. 🔍 如果成功，验证构建产物

## 注意事项

- 从源码编译 Node.js 非常耗时
- 如果构建超时，可能需要增加 GitHub Actions 的超时时间
- 考虑使用预编译的 Node.js 二进制（如果有第三方提供）

