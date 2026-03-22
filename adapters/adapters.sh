#!/usr/bin/env bash
# SillySpec 适配器 — 每个工具一个函数，负责 frontmatter 格式和输出目录
set -euo pipefail

# ── 元数据映射（从现有 commands 的 frontmatter 提取） ──

get_description() {
  local name=$1
  case $name in
    init)       echo "绿地项目初始化 — 深度提问、调研、需求文档、路线图" ;;
    scan)       echo "代码库扫描 — 支持快速扫描和深度扫描两阶段" ;;
    explore)    echo "自由思考模式 — 讨论、画图、调研，不写代码" ;;
    brainstorm) echo "需求探索 — 结构化头脑风暴，生成设计文档（创建性工作前必用）" ;;
    propose)    echo "生成结构化规范 — proposal + design + tasks" ;;
    plan)       echo "编写实现计划 — 2-5 分钟粒度，精确到文件路径和代码" ;;
    execute)    echo "波次执行 — 子代理并行 + 强制 TDD + 两阶段审查" ;;
    verify)     echo "验证实现 — 对照规范检查 + 测试套件" ;;
    archive)    echo "归档变更 — 规范沉淀，可追溯" ;;
    status)     echo "查看项目进度和状态" ;;
    continue)   echo "自动判断并执行下一步" ;;
    handoff)    echo "保存工作状态 — GSD Phase Context 模式" ;;
    resume)     echo "恢复工作 — 从中断处继续" ;;
    quick)      echo "快速任务 — 跳过完整流程，直接做" ;;
    workspace)  echo "工作区管理 — 初始化、管理多项目工作区，查看子项目状态" ;;
    export)     echo "导出成功方案为可复用模板" ;;
    *)          echo "SillySpec $name" ;;
  esac
}

get_argument_hint() {
  local name=$1
  case $name in
    init)       echo "[项目名]" ;;
    scan)       echo "[可选：指定区域，如 'api' 或 'auth'] [--deep 深度扫描]" ;;
    explore)    echo "[探索主题]" ;;
    brainstorm) echo "[需求或想法描述]" ;;
    propose)    echo "[变更名]" ;;
    plan)       echo "[计划名]" ;;
    execute)    echo "[任务编号或 'all']" ;;
    verify)     echo "[可选：指定验证范围]" ;;
    archive)    echo "[变更名]" ;;
    status)     echo "" ;;
    continue)   echo "" ;;
    handoff)    echo "[交接备注]" ;;
    resume)     echo "" ;;
    quick)      echo "[任务描述]" ;;
    workspace)  echo "[可选：add/remove/status/info]" ;;
    export)     echo "<change-name> [--to <path>]" ;;
    *)          echo "" ;;
  esac
}

# ── Claude Code commands 适配器 ──

generate_claude() {
  local name=$1 desc=$2 template=$3 arg_hint=$4
  local out_dir=".claude/commands/sillyspec"
  mkdir -p "$out_dir"
  local body
  body=$(cat "$template")
  cat > "$out_dir/${name}.md" <<EOF
---
description: $desc
argument-hint: "$arg_hint"
---

$body
EOF
}

# ── Claude Code skills 适配器 ──

generate_claude_skills() {
  local name=$1 desc=$2 template=$3 arg_hint=$4
  local out_dir=".claude/skills/sillyspec-${name}"
  mkdir -p "$out_dir"
  local body
  body=$(cat "$template")
  cat > "$out_dir/SKILL.md" <<EOF
---
name: sillyspec:${name}
description: $desc
---

$body
EOF
}

# ── Cursor 适配器 ──

generate_cursor() {
  local name=$1 desc=$2 template=$3 arg_hint=$4
  local out_dir=".cursor/commands"
  mkdir -p "$out_dir"
  local body
  body=$(cat "$template")
  cat > "$out_dir/sillyspec-${name}.md" <<EOF
---
name: /sillyspec-${name}
id: sillyspec-${name}
description: $desc
---

$body
EOF
}

# ── Codex 适配器 ──

generate_codex() {
  local name=$1 desc=$2 template=$3 arg_hint=$4
  local out_dir="$HOME/.agents/skills/sillyspec-${name}"
  mkdir -p "$out_dir"
  local body
  body=$(cat "$template")
  cat > "$out_dir/SKILL.md" <<EOF
---
name: sillyspec:${name}
description: $desc
---

$body
EOF
}

# ── OpenCode 适配器 ──

generate_opencode() {
  local name=$1 desc=$2 template=$3 arg_hint=$4
  local out_dir=".opencode/skills/sillyspec-${name}"
  mkdir -p "$out_dir"
  local body
  body=$(cat "$template")
  cat > "$out_dir/SKILL.md" <<EOF
---
name: sillyspec:${name}
description: $desc
---

$body
EOF
}

# ── OpenClaw 适配器 ──

generate_openclaw() {
  local name=$1 desc=$2 template=$3 arg_hint=$4
  local out_dir=".openclaw/skills/sillyspec-${name}"
  mkdir -p "$out_dir"
  local body
  body=$(cat "$template")
  cat > "$out_dir/SKILL.md" <<EOF
---
name: sillyspec:${name}
description: $desc
---

$body
EOF
}

# ── 工具列表 ──

VALID_TOOLS="claude claude_skills cursor codex opencode openclaw"

is_valid_tool() {
  local tool=$1
  for t in $VALID_TOOLS; do
    [ "$t" = "$tool" ] && return 0
  done
  return 1
}
