#!/bin/bash
set -e
export DEBIAN_FRONTEND=noninteractive

# 更新系统（添加重试机制，处理镜像同步问题）
apt-get update || {
  echo "警告: apt-get update 失败，等待 5 秒后重试..."
  sleep 5
  apt-get update || {
    echo "警告: 第二次重试失败，使用 --fix-missing 继续"
    apt-get update --fix-missing || true
  }
}

# 安装基础工具
apt-get install -y \
  curl \
  wget \
  build-essential \
  pkg-config \
  ca-certificates \
  gnupg

# 安装 Node.js (从 gounthar/unofficial-builds GitHub Releases 下载)
# 参考: https://github.com/gounthar/unofficial-builds/releases/tag/v24.11.0
# 这个源提供了 Node.js 24.11.0 的 RISCV64 原生构建
NODE_VERSION="24.11.0"
NODE_ARCH="riscv64"
NODE_DIST="node-v${NODE_VERSION}-linux-${NODE_ARCH}"
NODE_URL="https://github.com/gounthar/unofficial-builds/releases/download/v${NODE_VERSION}/${NODE_DIST}.tar.xz"

# 下载并安装 Node.js
cd /tmp
echo "正在从 GitHub Releases 下载 Node.js ${NODE_VERSION} for RISCV64..."
wget -q "$NODE_URL" -O "${NODE_DIST}.tar.xz" || {
  echo "错误: 无法下载 Node.js ${NODE_VERSION} for RISCV64 from GitHub Releases"
  exit 1
}

echo "解压 Node.js..."
tar -xf "${NODE_DIST}.tar.xz"
mv "${NODE_DIST}" /opt/nodejs
export PATH="/opt/nodejs/bin:$PATH"
ln -sf /opt/nodejs/bin/node /usr/local/bin/node
ln -sf /opt/nodejs/bin/npm /usr/local/bin/npm
ln -sf /opt/nodejs/bin/npx /usr/local/bin/npx

# 验证安装
echo "验证 Node.js 安装..."
node --version
npm --version

# 安装 Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source $HOME/.cargo/env

# 添加 RISCV64 目标
rustup target add riscv64gc-unknown-linux-gnu

# 安装系统依赖（注意：RISCV64 仓库中可能没有所有包）
apt-get install -y \
  libwebkit2gtk-4.1-dev \
  libgtk-3-dev \
  librsvg2-dev \
  libayatana-appindicator3-dev \
  libssl-dev \
  libxdo-dev \
  || echo '某些包可能不可用'

# 安装项目依赖
cd /workspace
if [ -f package-lock.json ]; then
  echo "找到 package-lock.json，使用 npm ci"
  npm ci
else
  echo "警告: package-lock.json 不存在，使用 npm install"
  npm install
fi

# 构建前端
npm run build

# 构建 Tauri 应用
npm run tauri build -- --target riscv64gc-unknown-linux-gnu

