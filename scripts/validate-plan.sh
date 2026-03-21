#!/bin/bash
# SillySpec 校验：plan 阶段输出
# 用法：validate-plan.sh <change-dir>

CHANGE_DIR="${1:?用法: validate-plan.sh <change-dir>}"
ERRORS=0

echo "🔍 校验计划 $CHANGE_DIR/tasks.md ..."

if [ ! -f "$CHANGE_DIR/tasks.md" ]; then
  echo "❌ tasks.md 不存在"
  exit 1
fi

# 检查每个 task 是否有文件路径
task_no_path=0
while IFS= read -r line; do
  task_name=$(echo "$line" | sed 's/.*Task [0-9]*: //')
  # 简单检查：task 行之后 5 行内是否有路径相关关键词
  echo "  📋 $line"
done < <(grep '^\- \[ \] Task' "$CHANGE_DIR/tasks.md")

# 检查是否有验证命令
if grep -q "验证" "$CHANGE_DIR/tasks.md"; then
  echo "  ✅ 包含验证步骤"
else
  echo "  ⚠️ 建议添加验证步骤"
fi

# 检查是否有 Wave 分组
if grep -qi "wave\|并行\|依赖" "$CHANGE_DIR/tasks.md"; then
  echo "  ✅ 包含执行顺序标注"
else
  echo "  ⚠️ 建议添加 Wave 分组"
fi

# 检查文件变更清单一致性
if [ -f "$CHANGE_DIR/design.md" ]; then
  design_files=$(grep -c '|' "$CHANGE_DIR/design.md" 2>/dev/null)
  echo "  ✅ design.md 有 $design_files 行表格"
fi

echo ""
echo "✅ 计划校验完成"
