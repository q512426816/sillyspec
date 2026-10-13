---
author: flow-machine-draft
created_at: 2026-10-13T04:30:15.383Z
---
# 提案书（Proposal）— 2026-10-13-thin-sync-stage

## 动机

任务原话转写：平台变更中心「进行中」列表的轻量变更不显示「轻量」徽章：CLI 对 thin 变更上行的 changes[0].current_stage 恒为出生值 brainstorm（thin 不走阶段机、VALID_STAGES 无 thin），平台读侧 is_thin 三分支（stage=thin / type=quick / steps 无标准阶段痕迹）全不命中。平台侧 StageEnum.THIN、列表徽章与筛选、ingest 双守卫均已按 current_stage=thin 消费，唯独 CLI 上行缺这一环（线上库实证：三条 active thin 上行均为 brainstorm 且 steps 空）。

成功标准：
- serializeForSync 对 tier=thin 且 changes 行 status=active 的变更，上行 current_stage 投影为 thin（readFlowState 单一源上移叶子模块 flow-state.js，flow.js re-export 保持既有引用面）
- 归档（status=archived）、升厚（tier=thick）、无 flow-state 的变更上行 stage 不受影响（现状回归）
- 新增测试覆盖 thin active 覆写、归档不覆写、升厚不覆写、无 flow-state 不覆写四形态；相关既有套件零回归

## 变更范围

按成功标准机械推导，共 3 条验收面：
1. serializeForSync 对 tier=thin 且 changes 行 status=active 的变更，上行 current_stage 投影为 thin（readFlowState 单一源上移叶子模块 flow-state.js，flow.js re-export 保持既有引用面）
2. 归档（status=archived）、升厚（tier=thick）、无 flow-state 的变更上行 stage 不受影响（现状回归）
3. 新增测试覆盖 thin active 覆写、归档不覆写、升厚不覆写、无 flow-state 不覆写四形态；相关既有套件零回归

## 成功标准（可验证）

1. serializeForSync 对 tier=thin 且 changes 行 status=active 的变更，上行 current_stage 投影为 thin（readFlowState 单一源上移叶子模块 flow-state.js，flow.js re-export 保持既有引用面）
2. 归档（status=archived）、升厚（tier=thick）、无 flow-state 的变更上行 stage 不受影响（现状回归）
3. 新增测试覆盖 thin active 覆写、归档不覆写、升厚不覆写、无 flow-state 不覆写四形态；相关既有套件零回归
