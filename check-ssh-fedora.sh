#!/bin/bash

echo "=== SSH服务诊断脚本 ==="
echo ""

echo "1. 检查SSH服务状态："
systemctl status sshd --no-pager -l | head -10
echo ""

echo "2. 检查SSH服务是否真的在运行："
if systemctl is-active --quiet sshd; then
    echo "✓ sshd服务状态: active"
else
    echo "✗ sshd服务状态: inactive"
fi
echo ""

echo "3. 检查SSH进程是否存在："
ps aux | grep -E '[s]shd' || echo "未找到sshd进程"
echo ""

echo "4. 检查所有监听的端口（包括非22端口）："
ss -tlnp | grep sshd || echo "未找到sshd监听的端口"
echo ""

echo "5. 检查SSH配置文件中的端口设置："
if [ -f /etc/ssh/sshd_config ]; then
    echo "SSH配置的端口："
    grep -E "^Port|^#Port" /etc/ssh/sshd_config | head -5
else
    echo "未找到 /etc/ssh/sshd_config"
fi
echo ""

echo "6. 检查SSH服务日志（最近10行）："
journalctl -u sshd -n 10 --no-pager 2>/dev/null || echo "无法读取日志"
echo ""

echo "7. 检查防火墙状态："
if command -v firewall-cmd &> /dev/null; then
    sudo firewall-cmd --list-all 2>/dev/null | grep -E "ssh|22" || echo "防火墙中未找到SSH相关规则"
else
    echo "未安装firewall-cmd"
fi
echo ""

echo "8. 检查SELinux状态（如果启用）："
if command -v getenforce &> /dev/null; then
    getenforce
else
    echo "未安装SELinux工具"
fi
echo ""

echo "=== 建议的修复步骤 ==="
echo "如果服务未运行，尝试："
echo "  sudo systemctl start sshd"
echo "  sudo systemctl enable sshd"
echo ""
echo "如果配置有问题，检查："
echo "  sudo sshd -t  # 测试配置文件语法"
echo "  sudo systemctl restart sshd"

