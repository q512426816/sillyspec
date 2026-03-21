#!/bin/bash
# SillySpec 校验：propose 阶段输出
# 用法：validate-proposal.sh <change-dir>
# 示例：validate-proposal.sh .sillyspec/changes/docsite-redesign

CHANGE_DIR="${1:?用法: validate-proposal.sh <change-dir>}"
ERRORS=0

check_section() {
  local file="$1" section="$2"
  if [ -f "$file" ]; then
    if grep -q "## $section" "$file"; then
      echo "  ✅ $file: 包含 '$section'"
    else
      echo "  ❌ $file: 缺少 '$section'"
      ((ERRORS++))
    fi
  else
    echo "  ❌ 文件不存在: $file"
    ((ERRORS++))
  fi
}

check_file_exists() {
  if [ -f "$1" ]; then
    echo "  ✅ $1 存在"
  else
    echo "  ❌ $1 不存在"
    ((ERRORS++))
  fi
}

echo "🔍 校验 $CHANGE_DIR ..."

# proposal.md
echo ""
echo "--- proposal.md ---"
check_section "$CHANGE_DIR/proposal.md" "动机"
check_section "$CHANGE_DIR/proposal.md" "变更范围"
check_section "$CHANGE_DIR/proposal.md" "不在范围内"
check_section "$CHANGE_DIR/proposal.md" "成功标准"

# design.md
echo ""
echo "--- design.md ---"
check_file_exists "$CHANGE_DIR/design.md"
check_section "$CHANGE_DIR/design.md" "文件变更清单"
if [ -f "$CHANGE_DIR/design.md" ]; then
  if grep -q "|" "$CHANGE_DIR/design.md"; then
    echo "  ✅ design.md: 包含变更表格"
  else
    echo "  ❌ design.md: 缺少变更表格"
    ((ERRORS++))
  fi
fi

# tasks.md
echo ""
echo "--- tasks.md ---"
check_file_exists "$CHANGE_DIR/tasks.md"
if [ -f "$CHANGE_DIR/tasks.md" ]; then
  task_count=$(grep -c '^\- \[ \] Task' "$CHANGE_DIR/tasks.md" 2>/dev/null)
  echo "  ✅ tasks.md: $task_count 个 task"
  if [ "$task_count" -eq 0 ]; then
    echo "  ❌ tasks.md: 没有 task"
    ((ERRORS++))
  fi
fi

# requirements.md
echo ""
echo "--- requirements.md ---"
if [ -f "$CHANGE_DIR/specs/requirements.md" ]; then
  check_section "$CHANGE_DIR/specs/requirements.md" "功能需求"
  check_section "$CHANGE_DIR/specs/requirements.md" "用户场景"
else
  check_file_exists "$CHANGE_DIR/specs/requirements.md"
fi

echo ""
if [ $ERRORS -eq 0 ]; then
  echo "✅ 校验通过，无错误"
  exit 0
else
  echo "❌ 校验失败，$ERRORS 个错误"
  exit 1
fi
