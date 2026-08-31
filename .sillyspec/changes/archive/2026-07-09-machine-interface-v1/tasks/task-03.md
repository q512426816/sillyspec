---
id: task-03
title: src/index.js 路由 gate/derive 子命令 + usage 文本
author: qinyi
created_at: 2026-07-09 19:58:30
priority: P0
depends_on: [task-02]
blocks: [task-04, task-07]
allowed_paths:
  - src/index.js
expects_from:
  task-01:
    - contract: machine-interface-module
      needs: [runGate, EXIT_UNKNOWN]
  task-02:
    - contract: derive-api
      needs: [runDerive, FACETS]
provides:
  - contract: cli-machine-commands
    fields: [gate, derive]
goal: |
  接线 CLI：sillyspec gate <stage> --change <name> [--json] 与
  sillyspec derive <facet> --change <name> [--json]。
implementation: |
  改 src/index.js：
  1. 主 switch 增加 'gate' / 'derive' 两个 case：
     - 解析位置参数（stage/facet）与 --change/--json 旗标（沿用文件内既有旗标解析风格）
     - 缺 stage/facet 或缺 --change（且无法唯一自动检测变更）→ usage 到 stderr + exit 2
     - 动态 import('./machine-interface.js')，调 runGate/runDerive，按返回 exitCode 退出
     - --json：envelope 经 emitJson 输出 stdout；无 --json：输出简要人类可读摘要（ok/errors 列表）
  2. usage 帮助文本增加两条命令说明（含 facet 枚举）。
acceptance: |
  - node bin/sillyspec.js gate brainstorm --change <c> --json 输出可 JSON.parse 的单段 stdout
  - 非法用法（缺参数/非法 facet）exit 2
  - 既有命令路由行为不变（全量 npm test 回归）
verify: |
  task-07 用 child_process 实测 CLI 端到端（退出码 + stdout JSON.parse）。
constraints: |
  - 只改 src/index.js；路由层不含任何校验/聚合逻辑（全部在 machine-interface.js）
  - 不改既有命令的解析与输出
---

# task-03: index.js 路由接线

## 目标

见 frontmatter goal。

## 实现蓝图

见 frontmatter implementation。

## 验收标准

见 frontmatter acceptance（3 条）。

## TDD/验证

见 frontmatter verify。
