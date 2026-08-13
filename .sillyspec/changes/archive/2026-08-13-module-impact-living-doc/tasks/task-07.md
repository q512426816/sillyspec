---
id: task-07
title: docs/sillyspec/file-lifecycle.md 同步 module-impact 多阶段生成
title_zh: file-lifecycle 同步 module-impact 多阶段生成
author: qinyi
created_at: 2026-08-13 10:29:11
priority: P0
depends_on: []
blocks: []
requirement_ids: []
decision_ids: []
allowed_paths:
  - docs/sillyspec/file-lifecycle.md
goal: >
  file-lifecycle.md 记录 module-impact.md 不再是 archive 专属——large 在 plan review_plan 生成首版，execute/verify 可选更新，archive 终审。
implementation:
  - 找到 file-lifecycle.md 中 module-impact.md 的生命周期描述（当前应为 archive 生成）
  - 更新为：plan review_plan(large) 生成首版 + execute/verify 可选更新 + archive step2 终审
  - 更新文档头部 updated_at 时间戳
acceptance:
  - file-lifecycle.md module-impact.md 段反映 plan 生成 + archive 终审
  - updated_at 已更新
verify:
  - grep file-lifecycle.md 含 plan review_plan + module-impact
constraints:
  - 不改其他文件的生命周期描述
  - 更新 updated_at
---
