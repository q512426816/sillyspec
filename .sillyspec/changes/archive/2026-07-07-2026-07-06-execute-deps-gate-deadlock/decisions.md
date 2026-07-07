---
author: qinyi
created_at: 2026-07-07T07:36:55
change: 2026-07-06-execute-deps-gate-deadlock
---

# Decisions 台账

> 稳定版本 ID,详见 design.md 决策记录章节。

## D-001@v2: doctor 对齐入口 = 显式 flag + 诊断/写分离（supersede v1）
- **状态**:accepted
- **内容**:只读诊断项 `execute-progress-plan-mismatch` 进 `doctor-diagnostics.js`（硬约束:绝不写回 db）;写操作进 `ProgressManager.alignExecuteToPlan`;入口为 `index.js` doctor `--align-execute-progress` flag（仿 `--cleanup-remnant`）。
- **来源**:code（doctor-diagnostics.js line 12-18 只读约束,Step 11 自审查证）
- **演进**:v1 主张写操作进 doctor-diagnostics.js → v2 修正（违反只读约束）

## D-002@v1: 判定真相源 = plan.md 所有 task checkbox 全勾
- **状态**:accepted
- **内容**:同 archive.js 第一步;不额外要求 git commit 存在性（避免双真相源）。

## D-003@v2: 对齐动作 = 补 step 戳 + 显式置 stage status（supersede v1,Grill G1）
- **状态**:accepted
- **内容**:`alignExecuteToPlan` 补 step 戳 + **显式置 execute `stageData.status='completed'` + `completedAt`**（绕过 completeStep 推导,否则 checkTransition 仍拦,死锁未打通）。不触发 worktree cleanup。
- **来源**:code（run.js:2299-2305 推导只在 completeStep 内）
- **演进**:v1 主张依赖推导 → v2 修正（Grill G1 发现矛盾）

## D-004@v1: plan 误勾风险由 verify 兜底
- **状态**:accepted
- **内容**:doctor 信任 plan.md 声明,不复核代码;verify 阶段对照 design + 跑测试兜底。

## D-005@v1: fail-loud 仅改拒绝侧
- **状态**:accepted
- **内容**:仅在 `enforceDepsGate` 拒绝时（stderr）加显眼阻断块;不动成功侧 stdout。

## Design Grill 发现（Step 12）
| ID | 等级 | 处置 |
|---|---|---|
| G1 一致性:D-003@v1 推导矛盾 | P0 | supersede 为 D-003@v2 |
| G2 定义:worktreeGone 判定 `!meta` 误判 | P1 | 改 `!existsSync(getWorktreePath(...))` |
| G3 可行性:doctor 顶层 `--change` 解析 | P2 | plan 阶段确认（已留 resolveChangeNameAuto 兜底） |
| G4 可行性:modules 卡片归属 | P2 | plan 阶段确认 |
