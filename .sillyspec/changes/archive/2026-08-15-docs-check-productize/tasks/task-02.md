---
id: task-02
title: CLI 注册 docs check 子命令
title_zh: CLI 注册 docs check 子命令
author: qinyi
created_at: 2026-08-15 16:16:00
priority: P0
depends_on: [task-01]
blocks: []
allowed_paths:
  - src/index.js
repo: main
goal: >
  在 src/index.js 注册 docs 命令组的 check 子命令：sillyspec docs check [--paths] [--json]，
  exit code 0/1/2 三档（D-003）。
implementation:
  - import runDocsCheck，case 'docs' 分发（参照现有 modules/worktree 子命令组模式）
  - --paths 逗号分隔覆盖配置；--json 结构化输出
  - 错误分流：invalid 非空 exit 1；配置/IO 错误 exit 2
acceptance:
  - node bin/sillyspec.js docs check 本仓跑通 exit 0
  - --json 输出 { ok, total, invalid, warnings } 结构
verify:
  - node bin/sillyspec.js docs check && echo OK
  - node bin/sillyspec.js docs check --json
constraints:
  - 帮助文本中文；命令注册风格与现有一致
---

## 验收标准

- `sillyspec docs check` 本仓全绿 exit 0（FR-001）
- 注入 fixture（task-04 单测内）exit 1（FR-002）
- --json 结构正确（FR-003）
