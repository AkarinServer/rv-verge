# Node.js 22 RISCV64 安装修复

## 问题说明

Node.js **没有官方的 RISCV64 版本**，因此不能使用：
- ❌ nvm（会尝试从官方源安装）
- ❌ NodeSource（不支持 RISCV64）
- ❌ 官方 Node.js 下载源

## 解决方案

直接从 **非官方构建源** 下载 Node.js 22 的 RISCV64 预编译二进制文件。

### 参考资源

- [Node.js Unofficial Builds - RISCV64 Recipe](https://github.com/nodejs/unofficial-builds/tree/main/recipes/riscv64)
- [Unofficial Builds 下载源](https://unofficial-builds.nodejs.org/)
- [Reddit 讨论: Node.js 22 in RISCV64](https://www.reddit.com/r/RISCV/comments/1nvbky2/nodejs_22_in_riscv64/)

## 安装方法

### 直接下载并安装

```bash
# 设置版本和架构
NODE_VERSION="22.11.0"  # Node.js 22
NODE_ARCH="riscv64"
NODE_DIST="node-v${NODE_VERSION}-linux-${NODE_ARCH}"
NODE_URL="https://unofficial-builds.nodejs.org/download/release/v${NODE_VERSION}/${NODE_DIST}.tar.xz"

# 下载
cd /tmp
wget -q "$NODE_URL" -O "${NODE_DIST}.tar.xz"

# 解压并安装
tar -xf "${NODE_DIST}.tar.xz"
mv "${NODE_DIST}" /opt/nodejs
export PATH="/opt/nodejs/bin:$PATH"
ln -sf /opt/nodejs/bin/node /usr/local/bin/node
ln -sf /opt/nodejs/bin/npm /usr/local/bin/npm
ln -sf /opt/nodejs/bin/npx /usr/local/bin/npx

# 验证
node --version
npm --version
```

## 已修复的 Workflows

### ✅ build-riscv64-simple.yml
- 直接从 unofficial-builds.nodejs.org 下载 Node.js 22.11.0
- 如果失败，尝试 Node.js 22.10.0
- 不再使用 nvm

### ✅ build-riscv64-docker.yml
- 同样直接从非官方构建源下载
- 在 Docker 容器中安装

### ⚠️ build-riscv64.yml
- 此 workflow 使用交叉编译方式
- 可能仍需要调整（如果使用 Node.js）

## 版本选择

- **Node.js 22.11.0** - 首选版本
- **Node.js 22.10.0** - 备用版本（如果 22.11.0 不可用）

## 注意事项

1. **非官方构建**: 这些构建由社区维护，不是 Node.js 官方发布
2. **兼容性**: 确保版本与系统库（如 GLIBC）兼容
3. **更新**: 定期检查 unofficial-builds 是否有新版本

## 提交记录

- `d79c949` - Fix: Install Node.js 22 directly from unofficial-builds (no official RISCV64 support)

## 验证

构建成功后，应该看到：
```
node --version
v22.11.0  # 或类似版本

npm --version
10.x.x  # 或类似版本
```

