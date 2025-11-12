#!/bin/bash
# fbturbo-driver 安装和测试脚本
# 目标: SSH 192.168.31.145 (Lichee RV Dock)

set -e

SSH_HOST="ubuntu@192.168.31.145"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DRIVER_SO="$SCRIPT_DIR/fbturbo-r01-alpha/.libs/fbturbo_drv.so"
CONFIG_FILE="$SCRIPT_DIR/fbturbo-r01-alpha/10-d1.conf"

echo "=========================================="
echo "fbturbo-driver 安装和测试脚本"
echo "=========================================="
echo ""

# 检查文件是否存在
if [ ! -f "$DRIVER_SO" ]; then
    echo "❌ 错误: 驱动文件不存在: $DRIVER_SO"
    exit 1
fi

if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ 错误: 配置文件不存在: $CONFIG_FILE"
    exit 1
fi

echo "✅ 驱动文件: $DRIVER_SO"
echo "✅ 配置文件: $CONFIG_FILE"
echo ""

# 检查 SSH 连接
echo "检查 SSH 连接..."
if ! ssh -o ConnectTimeout=5 "$SSH_HOST" "echo 'SSH 连接成功'" 2>/dev/null; then
    echo "❌ 错误: 无法连接到 $SSH_HOST"
    echo "请确保:"
    echo "  1. SSH 密钥已配置"
    echo "  2. 主机可以访问"
    exit 1
fi

echo "✅ SSH 连接正常"
echo ""

# 备份当前配置
echo "步骤 1: 备份当前配置..."
ssh "$SSH_HOST" << 'EOF'
    sudo mkdir -p /etc/X11/xorg.conf.d/backup
    if [ -f /etc/X11/xorg.conf.d/10-monitor.conf ]; then
        sudo cp /etc/X11/xorg.conf.d/10-monitor.conf /etc/X11/xorg.conf.d/backup/10-monitor.conf.backup.$(date +%Y%m%d_%H%M%S)
        echo "✅ 已备份 10-monitor.conf"
    fi
    if [ -f /etc/X11/xorg.conf.d/10-d1.conf ]; then
        sudo cp /etc/X11/xorg.conf.d/10-d1.conf /etc/X11/xorg.conf.d/backup/10-d1.conf.backup.$(date +%Y%m%d_%H%M%S)
        echo "✅ 已备份 10-d1.conf"
    fi
EOF

echo ""

# 复制驱动文件
echo "步骤 2: 安装驱动模块..."
scp "$DRIVER_SO" "$SSH_HOST:/tmp/fbturbo_drv.so"
ssh "$SSH_HOST" << 'EOF'
    sudo mkdir -p /usr/lib/xorg/modules/drivers
    sudo cp /tmp/fbturbo_drv.so /usr/lib/xorg/modules/drivers/
    sudo chmod 644 /usr/lib/xorg/modules/drivers/fbturbo_drv.so
    sudo chown root:root /usr/lib/xorg/modules/drivers/fbturbo_drv.so
    echo "✅ 驱动模块已安装到 /usr/lib/xorg/modules/drivers/fbturbo_drv.so"
    ls -lh /usr/lib/xorg/modules/drivers/fbturbo_drv.so
EOF

echo ""

# 复制配置文件
echo "步骤 3: 安装配置文件..."
scp "$CONFIG_FILE" "$SSH_HOST:/tmp/10-d1.conf"
ssh "$SSH_HOST" << 'EOF'
    sudo mkdir -p /etc/X11/xorg.conf.d
    sudo cp /tmp/10-d1.conf /etc/X11/xorg.conf.d/
    sudo chmod 644 /etc/X11/xorg.conf.d/10-d1.conf
    sudo chown root:root /etc/X11/xorg.conf.d/10-d1.conf
    echo "✅ 配置文件已安装到 /etc/X11/xorg.conf.d/10-d1.conf"
    echo ""
    echo "配置文件内容:"
    cat /etc/X11/xorg.conf.d/10-d1.conf
EOF

echo ""

# 禁用 modesetting 配置（如果存在）
echo "步骤 4: 禁用 modesetting 配置..."
ssh "$SSH_HOST" << 'EOF'
    if [ -f /etc/X11/xorg.conf.d/10-monitor.conf ]; then
        sudo mv /etc/X11/xorg.conf.d/10-monitor.conf /etc/X11/xorg.conf.d/10-monitor.conf.disabled
        echo "✅ 已禁用 10-monitor.conf (modesetting 驱动)"
    else
        echo "ℹ️  10-monitor.conf 不存在，跳过"
    fi
EOF

echo ""

# 检查依赖
echo "步骤 5: 检查依赖..."
ssh "$SSH_HOST" << 'EOF'
    echo "检查 shadow 模块..."
    if find /usr/lib/xorg/modules -name "*shadow*" 2>/dev/null | grep -q .; then
        echo "✅ shadow 模块已找到"
        find /usr/lib/xorg/modules -name "*shadow*" | head -3
    else
        echo "⚠️  警告: shadow 模块未找到，可能需要安装"
    fi
    echo ""
    echo "检查驱动依赖..."
    ldd /usr/lib/xorg/modules/drivers/fbturbo_drv.so | head -10
EOF

echo ""

# 检查设备节点
echo "步骤 6: 检查设备节点..."
ssh "$SSH_HOST" << 'EOF'
    echo "检查 /dev/fb0..."
    if [ -c /dev/fb0 ]; then
        echo "✅ /dev/fb0 存在"
        ls -lh /dev/fb0
    else
        echo "❌ /dev/fb0 不存在"
    fi
    echo ""
    echo "检查 /dev/disp..."
    if [ -c /dev/disp ]; then
        echo "✅ /dev/disp 存在"
    else
        echo "⚠️  /dev/disp 不存在（G2D 加速将不可用）"
    fi
    echo ""
    echo "检查 /dev/g2d..."
    if [ -c /dev/g2d ]; then
        echo "✅ /dev/g2d 存在"
    else
        echo "⚠️  /dev/g2d 不存在（G2D 加速将不可用）"
    fi
EOF

echo ""

# 询问是否重启
echo "=========================================="
echo "安装完成！"
echo "=========================================="
echo ""
echo "下一步:"
echo "  1. 重启 X server 或系统"
echo "  2. 检查 X server 日志: /var/log/Xorg.0.log"
echo "  3. 查看是否有 fbturbo 相关消息"
echo ""
read -p "是否现在重启 lightdm? (y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "重启 lightdm..."
    ssh "$SSH_HOST" "sudo systemctl restart lightdm"
    echo "✅ lightdm 已重启"
    echo ""
    echo "等待 10 秒后检查日志..."
    sleep 10
    ssh "$SSH_HOST" << 'EOF'
        echo "=========================================="
        echo "X server 日志 (最后 50 行)"
        echo "=========================================="
        if [ -f /var/log/Xorg.0.log ]; then
            tail -50 /var/log/Xorg.0.log | grep -E "fbturbo|FBTURBO|g2d|G2D|disp|error|Error|ERROR" || tail -50 /var/log/Xorg.0.log
        else
            echo "⚠️  /var/log/Xorg.0.log 不存在，可能 X server 未启动"
        fi
EOF
else
    echo "跳过重启。请手动执行:"
    echo "  ssh $SSH_HOST 'sudo systemctl restart lightdm'"
    echo ""
    echo "然后检查日志:"
    echo "  ssh $SSH_HOST 'tail -50 /var/log/Xorg.0.log | grep -i fbturbo'"
fi

echo ""
echo "=========================================="
echo "完成！"
echo "=========================================="

