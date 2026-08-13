---
id: task-08
title: docs/prompt 提示词镜像再生（_extract.mjs）
title_zh: docs/prompt 跑 _extract.mjs 再生镜像
author: qinyi
created_at: 2026-08-13 10:29:11
priority: P0
depends_on: []
blocks: []
requirement_ids: []
decision_ids: []
allowed_paths:
  - docs/prompt/_extracted.json
  - docs/prompt/plan.md
  - docs/prompt/execute.md
  - docs/prompt/verify.md
  - docs/prompt/archive.md
goal: >
  task-01/04/05/06 改了 src/stages/*.js 的步骤 prompt 后，跑 _extract.mjs 再生 docs/prompt 镜像，保持源码与人类可读镜像一致。
implementation:
  - 运行 node docs/prompt/_extract.mjs（源码 → _extracted.json → md）
  - 确认 plan.md/execute.md/verify.md/archive.md 的 prompt 正文已反映 module-impact 注入
  - 必要时更新 docs/prompt/README.md（占位符总表若无变化则跳过）
acceptance:
  - _extracted.json + 4 md 反映新 prompt（含 module-impact 指引）
  - extract 脚本无报错
verify:
  - node docs/prompt/_extract.mjs 退出码 0
  - grep 再生后 md 含 module-impact
constraints:
  - 不手改 md 里的 prompt 原文（脚本再生，手改会被覆盖）
  - 改 prompt 改源码（已在 task-01/04/05/06），本 task 只跑脚本
---
