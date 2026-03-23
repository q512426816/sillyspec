#!/bin/bash
# SillySpec 综合校验
# 用法：validate-all.sh

echo "========================================="
echo "  SillySpec 综合校验"
echo "========================================="

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ERRORS=0

# 1. 检查 SillySpec 安装
echo ""
echo "📦 检查安装状态..."
if [ -d ".claude/commands/sillyspec" ]; then
  cmd_count=$(ls .claude/commands/sillyspec/*.md 2>/dev/null | wc -l | tr -d ' ')
  echo "  ✅ 已安装 $cmd_count 个 commands"
else
  echo "  ❌ 未安装 SillySpec commands"
  ((ERRORS++))
fi

# 2. 检查当前变更
echo ""
echo "📋 检查变更..."
LATEST=$(ls -d .sillyspec/changes/*/ 2>/dev/null | grep -v archive | tail -1)
if [ -n "$LATEST" ]; then
  echo "  📁 当前变更: $LATEST"
  "$SCRIPT_DIR/validate-proposal.sh" "$LATEST" || ((ERRORS++))
else
  echo "  ℹ️ 无活跃变更"
fi

# 3. 检查代码库文档
echo ""
echo "🗂️ 检查代码库文档..."
if [ -d ".sillyspec/codebase" ]; then
  "$SCRIPT_DIR/validate-scan.sh" ".sillyspec/codebase" || ((ERRORS++))
else
  echo "  ℹ️ 无代码库文档（新项目或未 scan）"
fi

echo ""
echo "========================================="
if [ $ERRORS -eq 0 ]; then
  echo "  ✅ 全部通过"
else
  echo "  ❌ $ERRORS 个问题需要处理"
fi
echo "========================================="
