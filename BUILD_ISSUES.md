# 构建问题分析报告

## 检查时间
2025-11-11

## 当前构建状态

所有 3 个 workflows 都失败了：
- ❌ Build RISCV64 (Simple) - 失败
- ❌ Build RISCV64 with Docker - 失败  
- ❌ Build for RISCV64 - 失败

## 问题 1: Build RISCV64 with Docker

### 错误信息
```
E: Failed to fetch http://ports.ubuntu.com/ubuntu-ports/dists/jammy-updates/main/binary-riscv64/Packages.gz  
File has unexpected size (1361421 != 1361481). Mirror sync in progress? [IP: 91.189.91.103 80]
E: Some index files failed to download. They have been ignored, or old ones used instead.
##[error]Process completed with exit code 100.
```

### 问题分析
- **问题类型**: Ubuntu 软件包索引下载失败
- **原因**: Ubuntu 镜像服务器同步中，文件大小不匹配
- **影响**: `apt-get update` 失败，导致后续安装步骤无法执行
- **严重程度**: 中等（可能是临时性问题）

### 可能原因
1. Ubuntu 镜像服务器正在同步更新
2. 网络连接问题
3. 镜像服务器临时不可用

## 问题 2: Build RISCV64 (Simple)

### 错误信息
```
npm error The `npm ci` command can only install with an existing package-lock.json or
npm error npm-shrinkwrap.json with lockfileVersion >= 1. Run an install with npm@5 or
npm error later to generate a package-lock.json file, then try again.
```

### 问题分析
- **问题类型**: 缺少 package-lock.json 文件
- **原因**: `npm ci` 需要 package-lock.json 文件，但项目中没有这个文件
- **影响**: 无法安装 npm 依赖，构建失败
- **严重程度**: 高（必须修复）

### 可能原因
1. **文件路径问题**: 在 run-on-arch-action 的容器环境中，工作目录可能不同
2. **文件未正确检出**: 虽然文件在 Git 中，但在容器环境中可能没有被正确检出
3. **工作目录问题**: `npm ci` 在错误的工作目录中执行

### 验证
- ✅ package-lock.json 文件存在于本地
- ✅ 文件已提交到 Git（`git ls-files` 确认）
- ❓ 在构建环境中可能无法访问

## 问题 3: Build for RISCV64

### 错误信息
```
error: failed to run custom build command for `glib-sys v0.18.1`
cargo:warning=pkg-config has not been configured to support cross-compilation.
HINT: you may need to install a package such as glib-2.0, glib-2.0-dev or glib-2.0-devel.
```

### 问题分析
- **问题类型**: 在 x86_64 环境中交叉编译到 RISCV64
- **根本原因**: 
  - **GitHub Actions 的默认 runner 是 x86_64 (amd64)**
  - `runs-on: ubuntu-latest` 运行在 x86_64 架构上
  - 虽然设置了 QEMU 支持 RISCV64，但 workflow 本身是在 x86_64 主机上执行的
  - 因此使用的是**交叉编译**方式，而不是原生 RISCV64 环境
- **为什么是交叉编译**:
  - GitHub Actions 的托管 runner 只有 x86_64 和 ARM64（Apple Silicon）
  - **没有原生的 RISCV64 runner**
  - 虽然可以使用 QEMU 模拟 RISCV64，但当前的 workflow 配置是交叉编译模式
- **影响**: Rust 依赖（glib-sys）构建失败，因为无法找到 RISCV64 系统库
- **严重程度**: 高（架构限制）

### 为什么不是原生 RISCV64 环境？

**GitHub Actions 不支持原生 RISCV64 runner**:
- 默认 runner: `ubuntu-latest` = x86_64 (amd64)
- 可用的 runner 架构: x86_64, ARM64 (仅 macOS)
- **没有 RISCV64 原生 runner**

**当前 workflow 的问题**:
- `runs-on: ubuntu-latest` → 运行在 x86_64 上
- 虽然设置了 QEMU，但 workflow 本身在 x86_64 主机执行
- 使用交叉编译工具链 (`gcc-riscv64-linux-gnu`) 编译
- 无法安装 RISCV64 系统库（需要在 RISCV64 环境中）

### 解决方案

**选项 1: 使用 QEMU 模拟的 RISCV64 环境（推荐）**
- 这就是 `build-riscv64-simple.yml` 使用的方案
- 使用 `uraimo/run-on-arch-action` 在 QEMU 模拟的 RISCV64 环境中运行
- 可以在真实的 RISCV64 环境中安装系统库

**选项 2: 使用自托管 RISCV64 runner**
- 需要自己设置 RISCV64 硬件和 runner
- 成本较高，不现实

**选项 3: 禁用此 workflow**
- 由于交叉编译限制，建议只使用 `build-riscv64-simple.yml`

## 建议的解决方案

### 对于问题 1 (Docker workflow - Ubuntu 镜像同步问题)
1. **重试机制**: 添加 `apt-get update` 的重试逻辑（最多重试 3 次）
2. **使用不同的镜像源**: 如果主镜像不可用，切换到备用镜像（如阿里云、清华镜像）
3. **忽略部分错误**: 使用 `--fix-missing` 选项，允许使用旧的索引文件
4. **延迟重试**: 如果失败，等待几秒后重试

### 对于问题 2 (Build RISCV64 Simple - package-lock.json 缺失)
1. **检查工作目录**: 确保 `npm ci` 在正确的工作目录中执行（项目根目录）
2. **使用 npm install**: 如果 package-lock.json 确实不存在，改用 `npm install` 而不是 `npm ci`
3. **显式指定路径**: 在运行 `npm ci` 前，先 `cd` 到项目目录并验证文件存在
4. **生成 lock 文件**: 如果文件确实缺失，先运行 `npm install` 生成 package-lock.json

### 对于问题 3 (Build for RISCV64 - 交叉编译 pkg-config 问题)
1. **使用真实 RISCV64 环境**: 此 workflow 使用交叉编译，建议禁用或改用 `build-riscv64-simple.yml`
2. **配置 sysroot**: 如果必须使用交叉编译，需要配置完整的 RISCV64 sysroot
3. **安装交叉编译库**: 尝试安装 `libglib2.0-dev:riscv64` 等交叉编译包（可能不可用）
4. **禁用此 workflow**: 由于交叉编译限制，建议只使用 `build-riscv64-simple.yml`

## 优先级建议

1. **高优先级**: 修复问题 2（package-lock.json）- 这是最容易修复的
2. **中优先级**: 修复问题 1（Docker workflow 镜像问题）- 添加重试机制
3. **低优先级**: 问题 3（交叉编译）- 建议禁用此 workflow，使用 Simple 版本

## 总结

- **问题 1**: 临时性问题，可以通过重试机制解决
- **问题 2**: 配置问题，需要确保 package-lock.json 在构建环境中可用
- **问题 3**: 架构限制，交叉编译方式不适合，建议使用真实 RISCV64 环境（Simple workflow）

