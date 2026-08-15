---
id: task-03
title: 注入接线
title_zh: 注入接线
author: qinyi
created_at: 2026-08-15 21:16:00
priority: P0
depends_on: [task-01]
blocks: [task-04]
allowed_paths:
  - src/stages/execute.js
  - src/run/prompt.js
repo: main
goal: >
  execute.js Wave prompt 模板尾部加 {DOCS_DEBT} 占位符；prompt.js outputStep 加替换分支
  （stageName==='execute' && 含占位符，KNOWLEDGE_HIT_REPORT 同范式）。changedFiles 口径：
  worktree（meta.json 根）git status --porcelain + diff baselineCommit..HEAD 并集；in-place 退 cwd。
implementation:
  - execute.js 模板占位符（一行）
  - prompt.js 分支：computeDocsDebt 调用 + facts 空 → 替换为空串（无残留）
  - worktree 根解析复用 run/shared.js 既有 worktree 路径逻辑（meta.json 定位）
acceptance:
  - 有债 fixture 注入 [docs-debt] 块；无债无残留占位符
verify:
  - node --test test/docs-debt.test.mjs（集成场景）
  - _extract 镜像重跑
constraints:
  - specBase 三态走 resolvePromptSpecBase（outputStep 现有上下文）
---

## 验收标准

- FR-004/FR-007
