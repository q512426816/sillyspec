#!/bin/bash
# SillySpec 校验：scan 阶段输出
# 用法：validate-scan.sh [codebase-dir]
# 默认检查 .sillyspec/codebase/

CODEBASE_DIR="${1:-.planning/codebase}"
ERRORS=0

REQUIRED_FILES=(
  "STACK.md"
  "ARCHITECTURE.md"
  "STRUCTURE.md"
  "CONVENTIONS.md"
  "INTEGRATIONS.md"
  "TESTING.md"
  "CONCERNS.md"
)

echo "🔍 校验代码库扫描 $CODEBASE_DIR ..."

for f in "${REQUIRED_FILES[@]}"; do
  if [ -f "$CODEBASE_DIR/$f" ]; then
    lines=$(wc -l < "$CODEBASE_DIR/$f" | tr -d ' ')
    if [ "$lines" -gt 3 ]; then
      echo "  ✅ $f ($lines 行)"
    else
      echo "  ⚠️ $f 只有 $lines 行，内容可能不完整"
      ((ERRORS++))
    fi
  else
    echo "  ❌ $f 不存在"
    ((ERRORS++))
  fi
done

# 检查 PROJECT.md
if [ -f ".sillyspec/PROJECT.md" ]; then
  echo "  ✅ PROJECT.md 存在"
else
  echo "  ⚠️ PROJECT.md 不存在（建议生成）"
fi

echo ""
if [ $ERRORS -eq 0 ]; then
  echo "✅ 扫描校验通过"
  exit 0
else
  echo "❌ 扫描校验失败，$ERRORS 个错误"
  exit 1
fi
