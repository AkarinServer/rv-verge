#!/bin/bash
# 一行命令版本：为root用户添加SSH公钥
# 使用方法：在远程机器上使用sudo执行，或切换到root后执行

PUBLIC_KEY="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIBODDojWPHavOYotVATo5fnlK1R5FBih1SKJ3aY+iuVE me@akarin.moe"

# 使用sudo执行（如果当前不是root）
sudo mkdir -p /root/.ssh && sudo chmod 700 /root/.ssh && echo "$PUBLIC_KEY" | sudo tee -a /root/.ssh/authorized_keys > /dev/null && sudo chmod 600 /root/.ssh/authorized_keys && echo "✓ root用户公钥已添加"

