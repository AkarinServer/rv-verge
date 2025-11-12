#!/bin/bash
# 在远程Fedora机器上添加SSH公钥的脚本
# 使用方法：在远程机器上运行此脚本

PUBLIC_KEY="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIBODDojWPHavOYotVATo5fnlK1R5FBih1SKJ3aY+iuVE me@akarin.moe"

echo "=== 添加SSH公钥到 authorized_keys ==="
echo ""

# 创建 .ssh 目录（如果不存在）
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# 检查 authorized_keys 文件是否存在
if [ ! -f ~/.ssh/authorized_keys ]; then
    echo "创建 ~/.ssh/authorized_keys 文件"
    touch ~/.ssh/authorized_keys
    chmod 600 ~/.ssh/authorized_keys
fi

# 检查公钥是否已存在
if grep -q "$PUBLIC_KEY" ~/.ssh/authorized_keys 2>/dev/null; then
    echo "⚠️  公钥已存在于 authorized_keys 中"
    exit 0
fi

# 添加公钥
echo "$PUBLIC_KEY" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

echo "✓ 公钥已成功添加到 ~/.ssh/authorized_keys"
echo ""
echo "当前 authorized_keys 内容："
cat ~/.ssh/authorized_keys
echo ""
echo "=== 完成 ==="

