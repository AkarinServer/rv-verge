#!/bin/bash
# 一行命令版本：在远程机器上执行
# 使用方法：复制下面的命令到远程机器执行

PUBLIC_KEY="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIBODDojWPHavOYotVATo5fnlK1R5FBih1SKJ3aY+iuVE me@akarin.moe"

mkdir -p ~/.ssh && chmod 700 ~/.ssh && echo "$PUBLIC_KEY" >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && echo "✓ 公钥已添加"

