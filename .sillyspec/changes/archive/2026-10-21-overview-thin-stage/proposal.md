---
author: flow-machine-draft
created_at: 2026-10-21T00:47:22.875Z
---
# 提案书（Proposal）— 2026-10-21-overview-thin-stage

## 动机

任务原话转写：总览投影补thin覆写修轻量渲染

动机与背景：SillyHub 工作区总览卡经 daemon 采集 progress show --json 渲染，轻量（thin）变更被显示成 brainstorm 主管线+步骤0/0；变更比对弹窗 progress 行本地=brainstorm vs 平台=thin 恒假漂移。根因：2026-10-13-thin-sync-stage 只给平台上行载荷做了 tier=thin→current_stage='thin' 覆写（progress.js serializeForSync），overview()（progress/stage-machine.js:321）漏了同款投影，envelope 仍报 DB 出生值 brainstorm（thin 不走阶段机）。

成功标准：
- progress show --json 对 tier=thin 且活跃变更报 current_stage='thin'、stage_label='◈ 轻量变更'
- tier=thick、无 flow-state、flow-state 损坏三种形态不覆写，维持行值 brainstorm（fail-open 同 sync 口径）
- 归档行不出现在 overview（listChanges 活跃口径不变）
- 既有 platform-sync-thin-stage / change-birth-stage-brainstorm / quick-ghost-exclusion 测试零回归

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. progress show --json 对 tier=thin 且活跃变更报 current_stage='thin'、stage_label='◈ 轻量变更'
2. tier=thick、无 flow-state、flow-state 损坏三种形态不覆写，维持行值 brainstorm（fail-open 同 sync 口径）
3. 归档行不出现在 overview（listChanges 活跃口径不变）
4. 既有 platform-sync-thin-stage / change-birth-stage-brainstorm / quick-ghost-exclusion 测试零回归

## 成功标准（可验证）

1. progress show --json 对 tier=thin 且活跃变更报 current_stage='thin'、stage_label='◈ 轻量变更'
2. tier=thick、无 flow-state、flow-state 损坏三种形态不覆写，维持行值 brainstorm（fail-open 同 sync 口径）
3. 归档行不出现在 overview（listChanges 活跃口径不变）
4. 既有 platform-sync-thin-stage / change-birth-stage-brainstorm / quick-ghost-exclusion 测试零回归
