#!/usr/bin/env bash
# SillySpec v2.2 — 多工具一键初始化
set -euo pipefail

# 加载适配器
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../adapters/adapters.sh"

# ── 参数解析 ──

TOOLS=()
SPECIFIC_TOOL=""
PROJECT_DIR="."
WORKSPACE_MODE=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --tool)      SPECIFIC_TOOL="$2"; shift 2 ;;
    --workspace|-w) WORKSPACE_MODE=true; shift ;;
    --dir|-d)    PROJECT_DIR="$2"; shift 2 ;;
    *)
      echo "未知参数: $1"
      echo "用法: ./init.sh [--tool <claude|claude_skills|cursor|codex|opencode|openclaw>] [--workspace] [--dir <path>]"
      exit 1
      ;;
  esac
done

cd "$PROJECT_DIR"

# ── 自动检测已安装的工具 ──

detect_tools() {
  local found=()
  [ -d .claude ]              && found+=("claude")
  [ -d .claude/skills ]       && found+=("claude_skills")
  [ -d .cursor ]              && found+=("cursor")
  [ -d .opencode ]            && found+=("opencode")
  [ -d .openclaw ]            && found+=("openclaw")
  [ -d ~/.agents/skills ]     && found+=("codex")

  # 如果什么都没检测到，默认安装 claude
  if [ ${#found[@]} -eq 0 ]; then
    found=("claude")
  fi

  echo "${found[@]}"
}

# 确定要安装的工具
if [ -n "$SPECIFIC_TOOL" ]; then
  if ! is_valid_tool "$SPECIFIC_TOOL"; then
    echo "❌ 未知工具: $SPECIFIC_TOOL"
    echo "支持的工具: $VALID_TOOLS"
    exit 1
  fi
  TOOLS=("$SPECIFIC_TOOL")
else
  read -ra TOOLS <<< "$(detect_tools)"
fi

echo "🤪 SillySpec v2.2 — 规范驱动开发"
echo "===================================="
echo ""
echo "📦 安装工具: ${TOOLS[*]}"
if [ "${WORKSPACE_MODE}" = true ]; then
  echo "📦 工作区模式"
fi
echo ""

# ── 创建基础目录 ──

mkdir -p .sillyspec/{codebase,changes,plans,specs}
mkdir -p .sillyspec/changes/archive
mkdir -p .sillyspec/phases
mkdir -p ~/.sillyspec/templates

if [ "${WORKSPACE_MODE}" = true ]; then
  mkdir -p .sillyspec/shared
  mkdir -p .sillyspec/workspace
fi

# .gitignore
if [ ! -f ".gitignore" ]; then
  cat > .gitignore << 'EOF'
.sillyspec/HANDOFF.json
EOF
fi

# ── 为每个工具生成文件 ──

TEMPLATE_DIR="$SCRIPT_DIR/../templates"
TEMPLATE_COUNT=0

for tool in "${TOOLS[@]}"; do
  echo "🔧 安装 $tool..."
  for template_file in "$TEMPLATE_DIR"/*.md; do
    name=$(basename "$template_file" .md)
    desc=$(get_description "$name")
    arg_hint=$(get_argument_hint "$name")
    "generate_${tool}" "$name" "$desc" "$template_file" "$arg_hint"
    ((TEMPLATE_COUNT++)) || true
  done
  echo "  ✅ $tool 完成"
done

echo ""
echo "📄 ${TEMPLATE_COUNT} 个命令已安装"

# ── 工作区模式配置 ──

if [ "${WORKSPACE_MODE}" = true ]; then
  if [ ! -f .sillyspec/config.yaml ]; then
    cat > .sillyspec/config.yaml << 'CONFIG'
# SillySpec 工作区配置
# 修改此文件后运行 /sillyspec:workspace 更新

projects: {}
  # 示例：
  # frontend:
  #   path: ./frontend
  #   role: 前端 - Vue3 + TypeScript
  # backend:
  #   path: ./backend
  #   role: 后端 - Node.js + PostgreSQL

shared: []
CONFIG
    echo "📄 .sillyspec/config.yaml → 工作区配置 ✓"
  fi
fi

# ── 完成 ──

echo ""
echo "====================================="
if [ "${WORKSPACE_MODE}" = true ]; then
  echo "✅ SillySpec v2.2 安装完成！（工作区模式）"
  echo ""
  echo "已安装工具: ${TOOLS[*]}"
  echo ""
  echo "工作区命令："
  echo "  /sillyspec:workspace add    — 添加子项目"
  echo "  /sillyspec:workspace status — 查看工作区状态"
else
  echo "✅ SillySpec v2.2 安装完成！"
  echo ""
  echo "已安装工具: ${TOOLS[*]}"
  echo ""
  echo "入口选择："
  echo "  绿地项目：/sillyspec:init"
  echo "  棕地项目：/sillyspec:scan"
  echo "  自由思考：/sillyspec:explore \"你的想法\""
fi
