#!/bin/bash
# GitHub Actions 构建状态监控脚本
# 每1分钟检查一次构建状态

REPO="AkarinServer/rv-verge"
INTERVAL=60  # 60秒 = 1分钟

echo "🔍 开始监控 GitHub Actions 构建状态..."
echo "📦 仓库: $REPO"
echo "⏱️  检查间隔: ${INTERVAL}秒"
echo "按 Ctrl+C 停止监控"
echo ""

# 获取最新的运行ID
get_latest_runs() {
    gh run list --repo "$REPO" --limit 3 --json databaseId,status,conclusion,name,createdAt,headBranch \
        --jq '.[] | "\(.databaseId)|\(.status)|\(.conclusion // "N/A")|\(.name)|\(.headBranch)|\(.createdAt)"'
}

# 显示状态
show_status() {
    local runs=$(get_latest_runs)
    clear
    echo "═══════════════════════════════════════════════════════════"
    echo "  GitHub Actions 构建状态监控 - $(date '+%Y-%m-%d %H:%M:%S')"
    echo "═══════════════════════════════════════════════════════════"
    echo ""
    
    if [ -z "$runs" ]; then
        echo "⚠️  没有找到构建记录"
        return
    fi
    
    echo "最新构建状态:"
    echo ""
    echo "$runs" | while IFS='|' read -r id status conclusion name branch created; do
        # 状态图标
        case "$status" in
            "completed")
                if [ "$conclusion" = "success" ]; then
                    icon="✅"
                elif [ "$conclusion" = "failure" ]; then
                    icon="❌"
                else
                    icon="⚠️ "
                fi
                ;;
            "in_progress")
                icon="🔄"
                ;;
            "queued")
                icon="⏳"
                ;;
            *)
                icon="❓"
                ;;
        esac
        
        # 格式化时间
        local time_ago=$(gh run view "$id" --repo "$REPO" --json createdAt --jq '.createdAt' 2>/dev/null | xargs -I {} date -u -d {} +"%H:%M:%S" 2>/dev/null || echo "N/A")
        
        printf "%-2s %-20s %-12s %-10s %s\n" "$icon" "$name" "$status" "$conclusion" "$time_ago"
    done
    
    echo ""
    echo "═══════════════════════════════════════════════════════════"
    echo "下次检查: $(date -d "+${INTERVAL} seconds" '+%H:%M:%S')"
    echo "按 Ctrl+C 停止"
}

# 主循环
while true; do
    show_status
    sleep "$INTERVAL"
done

