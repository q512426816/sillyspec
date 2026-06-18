---
author: qinyi
created_at: 2026-06-18 22:48:00
---

# Revision Mode — 阶段修订

## 核心语义

已完成（completed）的阶段不能直接重跑。必须通过 `--reopen` 进入受控修订模式。

修订模式确保：
- 阶段状态机闭环：completed → revising → completed
- 因果链不断：上游修订时，下游阶段自动标记 stale
- 产物安全：reopen 不删除、不备份、不回滚文件，只改 progress 状态

## 命令

### `--reopen` — 重新打开已完成阶段

```bash
sillyspec run brainstorm --reopen
```

把阶段从 completed 变为 revising。不删除步骤历史，不清空产物文件。

**不带 `--from-step` 时：** 只在阶段存在 pending/stale/waiting/failed 步骤时允许继续。如果所有步骤都是 completed，会拒绝并要求指定 `--from-step`。

### `--reopen --from-step <index|name>` — 从指定步骤开始修订

```bash
# 按序号（1-based）
sillyspec run brainstorm --reopen --from-step 3

# 按名称
sillyspec run brainstorm --reopen --from-step "方案选择"
```

效果：
- from-step 之前的步骤：保持 completed
- from-step 本身：变为 pending
- from-step 之后的步骤：标记为 stale（曾经完成，但因上游修订失效）
- 当前阶段状态：变为 revising
- 所有下游阶段：自动 cascade stale

### `--reset` — 彻底重置（核弹）

```bash
sillyspec run brainstorm --reset
```

清空所有步骤状态，从头开始。不保留任何历史。只在确实需要完全重来时使用。

## 下游 cascade 规则

阶段顺序：`scan → brainstorm → plan → execute → verify → archive`

reopen 任意阶段，其下游所有已 completed 的阶段自动变为 stale，并记录 staleReason。

示例：
```
reopen brainstorm --from-step 2
  → brainstorm: revising
  → plan: stale (上游 brainstorm 已修订)
  → execute: stale
  → verify: stale
  → archive: stale (已有归档文件保留但不再可信)
```

stale 阶段不能直接 `run`，必须 `--reopen --from-step` 或 `--reset`。

## --reopen / --from-step / --reset 对比

| 维度 | --reopen --from-step | --reopen | --reset |
|------|---------------------|----------|---------|
| 步骤历史 | 保留之前的，后面失效 | 保留 | 全部清空 |
| 产物文件 | 不动 | 不动 | 不动 |
| 阶段状态 | revising | revising | pending |
| revision 计数 | +1 | +1 | 不变 |
| 下游 cascade | stale | stale | 不 cascade |
| 适用场景 | 局部返工 | 继续中断 | 彻底重来 |

## 文件策略

- reopen **不触碰**任何产物文件（design.md、plan.md、task docs 等）
- agent 在 revision context 下审视并更新已有产物
- 如需备份/快照功能，后续版本再加

## Revision Context 注入

修订模式下执行步骤时，prompt 前会注入：

```
🔄 Revision Context
本阶段处于修订模式（revision N），不是首次执行。
- 修订起始步骤：index: name
- 当前步骤之前已完成的步骤仍然有效，不需要重做。
- 当前步骤及之后的步骤需要重新生成或调整已有产物。
- 已有产物文件被保留，审视并更新它们，而不是从零创建。
- 不要绕过 CLI 进度追踪。
```

## progress 展示示例

```
🔧 🧠 需求探索
  📋 revision: 2, from step: 2: 加载项目上下文
  ✅ 状态检查          (保持 completed)
  ⬜ 加载项目上下文      (pending — 从这里重做)
  ⚠️ 协作与复用检查     (stale)
  ⚠️ 原型/设计图分析    (stale)
  ...
⚠️ 📐 实现计划
  ⚠️ stale: 上游阶段 brainstorm 已修订 (revision 2)
```
