#!/bin/bash
# SSH连接调试脚本

IP="192.168.31.177"
USER="minsio"

echo "=== SSH连接诊断 ==="
echo ""

echo "1. 测试端口连通性："
nc -zv $IP 22
echo ""

echo "2. 测试网络延迟："
ping -c 3 $IP
echo ""

echo "3. 使用详细模式连接（可以看到卡在哪里）："
echo "执行: ssh -v $USER@$IP"
echo ""

echo "4. 跳过DNS解析（如果卡在DNS）："
echo "执行: ssh -v -o GSSAPIAuthentication=no -o PreferredAuthentications=password,keyboard-interactive $USER@$IP"
echo ""

echo "5. 设置较短的超时时间："
echo "执行: ssh -v -o ConnectTimeout=10 -o ServerAliveInterval=5 $USER@$IP"
echo ""

echo "6. 检查本地SSH配置："
cat ~/.ssh/config 2>/dev/null || echo "无 ~/.ssh/config 文件"
echo ""

echo "7. 检查已知主机："
grep $IP ~/.ssh/known_hosts 2>/dev/null || echo "未找到该IP的已知主机记录"
echo ""

