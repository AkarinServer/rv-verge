#!/bin/bash
# 在远程Fedora机器上为root用户添加SSH公钥的脚本
# 使用方法：在远程机器上使用sudo运行此脚本，或者切换到root用户后运行

PUBLIC_KEY="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIBODDojWPHavOYotVATo5fnlK1R5FBih1SKJ3aY+iuVE me@akarin.moe"

echo "=== 添加SSH公钥到 root 用户的 authorized_keys ==="
echo ""

# 检查是否有root权限
if [ "$EUID" -ne 0 ]; then 
    echo "⚠️  需要使用root权限运行此脚本"
    echo "请使用: sudo bash $0"
    echo "或者切换到root用户后运行"
    exit 1
fi

# 创建 root 的 .ssh 目录（如果不存在）
mkdir -p /root/.ssh
chmod 700 /root/.ssh

# 检查 authorized_keys 文件是否存在
if [ ! -f /root/.ssh/authorized_keys ]; then
    echo "创建 /root/.ssh/authorized_keys 文件"
    touch /root/.ssh/authorized_keys
    chmod 600 /root/.ssh/authorized_keys
fi

# 检查公钥是否已存在
if grep -q "$PUBLIC_KEY" /root/.ssh/authorized_keys 2>/dev/null; then
    echo "⚠️  公钥已存在于 root 的 authorized_keys 中"
    exit 0
fi

# 添加公钥
echo "$PUBLIC_KEY" >> /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys

echo "✓ 公钥已成功添加到 /root/.ssh/authorized_keys"
echo ""
echo "当前 authorized_keys 内容："
cat /root/.ssh/authorized_keys
echo ""
echo "=== 完成 ==="

