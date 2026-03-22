#!/bin/bash
# SillySpec v2.0 — 一键初始化
set -e

# 用法：curl -fsSL .../init.sh | bash -s -- [选项]
#   bash -s -- --workspace     安装工作区模式
#   bash -s -- --dir ./myapp   指定项目目录（默认当前目录）

PROJECT_DIR="."
WORKSPACE_MODE=false

while [ $# -gt 0 ]; do
  case "$1" in
    --workspace) WORKSPACE_MODE=true ;;
    --dir) PROJECT_DIR="$2"; shift ;;
    -w) WORKSPACE_MODE=true ;;
    -d) PROJECT_DIR="$2"; shift ;;
  esac
  shift
done

cd "$PROJECT_DIR"

echo "🤪 SillySpec v2.0 — 规范驱动开发"
echo "===================================="
echo ""

# 检查 Claude Code
if ! command -v claude &> /dev/null; then
    echo "⚠️  Claude Code 未安装: npm install -g @anthropic-ai/claude-code"
fi

if [ "${WORKSPACE_MODE}" = true ]; then
  echo "📦 工作区模式"
else
  echo "📦 单项目模式"
fi
echo ""

# 创建目录
mkdir -p .claude/commands/sillyspec
mkdir -p .claude/skills/sillyspec
mkdir -p .sillyspec/changes/archive
mkdir -p .sillyspec/specs
mkdir -p .sillyspec/specs
mkdir -p .sillyspec/plans
mkdir -p .sillyspec/codebase
mkdir -p .sillyspec/phases

mkdir -p ~/.sillyspec/templates

if [ "${WORKSPACE_MODE}" = true ]; then
  mkdir -p .sillyspec/shared
  mkdir -p .sillyspec/workspace
fi

# 下载命令文件
REPO="q512426816/sillyspec"
BRANCH="main"
BASE_URL="https://raw.githubusercontent.com/${REPO}/${BRANCH}"

COMMANDS=(
  init scan explore brainstorm propose plan execute
  continue status verify resume quick handoff archive workspace
)

for cmd in "${COMMANDS[@]}"; do
  echo -n "  下载 /sillyspec:${cmd}... "
  if curl -fsSL "${BASE_URL}/commands/sillyspec/${cmd}.md" -o ".claude/commands/sillyspec/${cmd}.md" 2>/dev/null; then
    echo "✓"
  else
    echo "✗ 跳过"
  fi
done

echo "🔧 $(ls .claude/commands/sillyspec/*.md 2>/dev/null | wc -l | tr -d ' ') 个 slash commands → .claude/commands/sillyspec/ ✓"

# 下载 SKILL.md
echo -n "  下载 SKILL.md... "
if curl -fsSL "${BASE_URL}/SKILL.md" -o ".claude/skills/sillyspec/SKILL.md" 2>/dev/null; then
  echo "✓"
fi
echo "📄 全局 skill → .claude/skills/sillyspec/ ✓"

# .gitignore
if [ ! -f ".gitignore" ]; then
    cat > .gitignore << 'EOF'
.sillyspec/HANDOFF.json
EOF
fi

# 工作区模式：生成 config.yaml
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
  # 跨项目共享规范文件，放在 .sillyspec/shared/ 目录下
  # 示例：
  # - api-contract.md
  # - data-models.md
CONFIG
    echo "📄 .sillyspec/config.yaml → 工作区配置 ✓"
  fi
fi

echo ""
echo "====================================="
if [ "${WORKSPACE_MODE}" = true ]; then
  echo "✅ SillySpec v2.0 安装完成！（工作区模式）"
  echo ""
  echo "重新打开终端，然后："
  echo "  claude"
  echo ""
  echo "工作区模式已启用："
  echo "  /sillyspec:workspace add    — 添加子项目"
  echo "  /sillyspec:workspace status — 查看工作区状态"
  echo "  /sillyspec:scan <name>      — 扫描子项目"
  echo "  /sillyspec:init             — 初始化子项目"
else
  echo "✅ SillySpec v2.0 安装完成！"
  echo ""
  echo "重新打开终端，然后："
  echo "  claude"
  echo ""
  echo "绿地项目（空目录）："
  echo "  /sillyspec:init"
  echo ""
  echo "棕地项目（已有代码）："
  echo "  /sillyspec:scan"
  echo ""
  echo "自由思考（随时可用）："
  echo "  /sillyspec:explore \"你的想法\""
fi
