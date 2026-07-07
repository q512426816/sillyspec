---
id: task-01
title: progress.js 新增 alignExecuteToPlan + readPlanCheckboxStatus
author: qinyi
created_at: 2026-07-07T07:43:24
priority: P0
depends_on: []
blocks: [task-03]
requirement_ids: [FR-01, FR-02, FR-03]
decision_ids: [D-002@v1, D-003@v2, D-004@v1]
allowed_paths:
  - src/progress.js
goal: >
  按 plan.md 全勾判定对齐 execute 派生进度戳，补 step + 显式置 stage status，打通 cleanup 终态死锁。
provides:
  - ProgressManager.alignExecuteToPlan(cwd, changeName, specBase)  # 给 task-03 / task-02 消费
implementation:
  - 新增辅助 readPlanCheckboxStatus(changeDir)：读 plan.md（回退 tasks.md）所有 task checkbox，返回 {total, checked}；解析 - [ ] / - [x] task-NN 行
  - 新增 alignExecuteToPlan：read(cwd, changeName) 取 progress；execute 阶段不存在/无 step → {ok:false, reason:'execute 阶段无进度数据'}
  - checkbox checked < total → {ok:false, reason:'plan.md 有未勾选 task（X/Y），拒绝对齐'}，不写
  - 全勾 → 遍历 execute stages.execute.steps，status!=='completed' 的改 {status:'completed', completedAt: now(ISO)}；统计 aligned/skipped
  - 显式置 stages.execute.status='completed' + completedAt=now（D-003@v2，绕过 completeStep 推导）
  - dryRun（无 confirm）→ 只报告将补哪些 step + 将置 stage status，不 _write；带 confirm → pm._write 落盘
  - 返回 {ok, aligned, skipped, planTotal, planChecked, reason?, dryRun?}，对齐 run.js:2299-2305 写入形态
acceptance:
  - plan.md 全勾 + --confirm → execute stages.execute.status='completed' 且所有 step status='completed' + completedAt 有值
  - plan.md 有未勾 → {ok:false, reason 含 X/Y}，DB 无任何写入
  - dryRun（无 confirm）→ 返回 dryRun:true + aligned 计数，DB 无写入
  - execute 阶段无进度数据 → {ok:false, reason:'execute 阶段无进度数据'}
  - checkTransition(execute→verify) 在对齐后放行（stage status=completed）
verify:
  - npm test
constraints:
  - 不改 sillyspec.db schema，仅经 _write 写现有 stages/steps 字段
  - 信任 plan.md 声明，不复核代码 / 不要求 git commit（D-002, D-004，verify 阶段兜底）
  - 显式置 stages.execute.status='completed' + completedAt（D-003@v2，因绕过 completeStep 推导）
  - 默认 dryRun，写操作须显式 confirm 才落盘
  - 复用 ProgressManager._write 落盘，不新增写路径
---
