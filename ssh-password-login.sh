#!/bin/bash
# 使用密码登录SSH（禁用公钥认证）

IP="192.168.31.177"
USER="minsio"

# 强制使用密码认证，禁用公钥认证
ssh -o PubkeyAuthentication=no -o PreferredAuthentications=password -o GSSAPIAuthentication=no $USER@$IP

