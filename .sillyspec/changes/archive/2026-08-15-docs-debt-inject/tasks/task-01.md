---
id: task-01
title: docs-debt 核心模块
title_zh: docs-debt 核心模块
author: qinyi
created_at: 2026-08-15 21:16:00
priority: P0
depends_on: []
blocks: [task-03, task-04]
allowed_paths:
  - src/docs-debt.js
repo: main
goal: >
  matchFilesToModules 三级归属（module.paths||core_files → 模块卡 doc 文件路径字面量 → unmapped）
  + computeDocsDebt 双 commit 对账（%h %ct 判方向 + rev-list --count behind + untracked 卡 behind=null
  显式"卡片从未提交"）。全降级不抛（map 缺失/解析空 → ok:false 单行事实；git 失败/超时 5s → 该模块降级注记）。
implementation:
  - matchFilesToModules 纯函数（map 前缀/字面量命中，cardsDir 读卡片内容粗归属）
  - computeDocsDebt IO 入口（每模块 2 次 git log -1 + 条件 rev-list，safeGit 带 timeout）
  - facts 渲染：无债空字符串（调用方零输出）；有债 [docs-debt] 块逐模块两行
acceptance:
  - 归属三级行为与 design §3.1 逐条一致
  - 无 map → ok:false 单行事实不抛
verify:
  - node --test test/docs-debt.test.mjs
constraints:
  - git 调用走 safeGit（数组形式）；超时 5000ms
---

## 验收标准

- FR-001/FR-002/FR-006 核心场景单测过
