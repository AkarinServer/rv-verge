#!/bin/bash
# 确保 NVM 环境正确加载
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use default 2>/dev/null

# 运行开发服务器
cd "$(dirname "$0")"
npm run dev

