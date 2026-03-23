#!/bin/bash
# SillySpec 校验：scan 阶段输出
# 用法：validate-scan.sh [codebase-dir]
# 默认检查 .sillyspec/codebase/

CODEBASE_DIR="${1:-.sillyspec/codebase}"
ERRORS=0

# ── 路径误放检查 ──

MISPLACED=0
TARGET_DOCS="ARCHITECTURE.md STACK.md STRUCTURE.md CONVENTIONS.md INTEGRATIONS.md TESTING.md CONCERNS.md PROJECT.md SCAN-RAW.md"

for name in $TARGET_DOCS; do
  for f in $(find . -maxdepth 2 -name "$name" 2>/dev/null | grep -v "^\.\/$CODEBASE_DIR/"); do
    if [ -f "$f" ]; then
      echo "  ❌ 误放: $f（应在 $CODEBASE_DIR/ 下）"
      ((MISPLACED++))
      ((ERRORS++))
    fi
  done
done

if [ $MISPLACED -gt 0 ]; then
  echo "  💡 运行 /sillyspec:scan 修正路径，或手动移动到 $CODEBASE_DIR/"
fi

# ── 文件完整性检查 ──

echo "🔍 校验代码库扫描 $CODEBASE_DIR ..."

if [ ! -d "$CODEBASE_DIR" ]; then
  echo "  ❌ 目录 $CODEBASE_DIR 不存在"
  exit 1
fi

# 深度扫描 7 份
DEEP_FILES=(
  "STACK.md"
  "ARCHITECTURE.md"
  "STRUCTURE.md"
  "CONVENTIONS.md"
  "INTEGRATIONS.md"
  "TESTING.md"
  "CONCERNS.md"
)

# 快速扫描 2 份 + PROJECT.md
QUICK_FILES=(
  "STACK.md"
  "STRUCTURE.md"
)

# 检查深度扫描文件
for f in "${DEEP_FILES[@]}"; do
  if [ -f "$CODEBASE_DIR/$f" ]; then
    lines=$(wc -l < "$CODEBASE_DIR/$f" | tr -d ' ')
    if [ "$lines" -gt 3 ]; then
      echo "  ✅ $f ($lines 行)"
    else
      echo "  ⚠️ $f 只有 $lines 行，内容可能不完整"
      ((ERRORS++))
    fi
  else
    echo "  ⬜ $f 不存在（深度扫描文件）"
  fi
done

# 检查 PROJECT.md
if [ -f ".sillyspec/PROJECT.md" ]; then
  echo "  ✅ PROJECT.md 存在"
else
  echo "  ⚠️ PROJECT.md 不存在（建议生成）"
fi

# 检查 SCAN-RAW.md
if [ -f "$CODEBASE_DIR/SCAN-RAW.md" ]; then
  echo "  ✅ SCAN-RAW.md 存在（预处理数据）"
fi

# ── 结果 ──

echo ""
if [ $ERRORS -eq 0 ]; then
  echo "✅ 扫描校验通过"
  exit 0
else
  echo "❌ 扫描校验失败，$ERRORS 个问题"
  exit 1
fi
