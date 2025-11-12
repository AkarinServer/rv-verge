#!/bin/bash
REPO="AkarinServer/rv-verge"
echo "═══════════════════════════════════════════════════════════"
echo "  GitHub Actions 构建状态 - $(date '+%Y-%m-%d %H:%M:%S')"
echo "═══════════════════════════════════════════════════════════"
echo ""
gh run list --repo "$REPO" --limit 3
echo ""
echo "═══════════════════════════════════════════════════════════"
