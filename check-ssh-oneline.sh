#!/bin/bash
# 一行命令检查SSH是否允许控制
systemctl is-active sshd >/dev/null 2>&1 && firewall-cmd --list-services 2>/dev/null | grep -q ssh && (ss -tlnp 2>/dev/null | grep -q sshd || netstat -tlnp 2>/dev/null | grep -q sshd) && echo "✓ SSH可用" || echo "✗ SSH不可用"

