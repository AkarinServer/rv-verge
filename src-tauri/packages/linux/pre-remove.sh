#!/bin/bash
# 修复脚本格式问题（如果脚本内容是错误的格式）
if [ -f /usr/bin/clash-verge-service-uninstall ]; then
    # 检查脚本内容是否正确（错误格式的文件只有一行，包含字面量 \n）
    line_count=$(wc -l < /usr/bin/clash-verge-service-uninstall 2>/dev/null || echo "0")
    if [ "$line_count" -lt 2 ] || grep -q "\\\\nexit" /usr/bin/clash-verge-service-uninstall 2>/dev/null; then
        # 修复脚本格式：创建正确的脚本内容（包含换行符）
        printf '#!/bin/bash\nexit 0\n' > /usr/bin/clash-verge-service-uninstall
        chmod +x /usr/bin/clash-verge-service-uninstall
    fi
fi
/usr/bin/clash-verge-service-uninstall
