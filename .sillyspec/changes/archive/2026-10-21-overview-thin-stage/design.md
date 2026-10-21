---
author: flow-machine-draft
created_at: 2026-10-21T00:47:22.875Z
---
# 设计记录（Design Record）— 2026-10-21-overview-thin-stage

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

答：根因：2026-10-13-thin-sync-stage 只给 `serializeForSync` 平台上行载荷做了 `tier=thin → current_stage='thin'` 覆写（progress.js:608-618），`overview()`（src/progress/stage-machine.js:321）漏了同款投影——envelope 直接报 DB 行值 `brainstorm`（thin 不走阶段机、出生恒 brainstorm），下游 SillyHub 工作区总览卡把轻量变更渲染成 brainstorm 主管线+步骤 0/0，变更比对弹窗 progress 行本地=brainstorm vs 平台=thin 恒假漂移。

方案：在 `overview()` 单点补齐同款投影——循环内对可读行读 `readFlowState`（flow-state.js 叶子模块，progress.js 已有同款 import 先例，零新依赖链），`tier === 'thin'` 时覆写 `entry.current_stage='thin'`；`stage_label` 走既有 `STAGE_LABELS` 查找（shared.js 新增展示键 `thin: '◈ 轻量变更'`）。无需再查行 status：`listChanges` 恒回 `WHERE status='active'` 行（change-registry.js:57），overview 循环天然只见活跃行（sync 需查 status 是因其按名点查任意行）。**steps/stages 对 thin 维持现状**（stages 全 pending + steps {0,0}）——SillyHub daemon 采集器 `buildSillySpecStatusSummary` 的 asCount 把缺省强转 0/0，省略键对下游显示零变化，改 envelope 契约（steps 可选）牵动 backend schema/前端类型而收益为零；「步骤 0/0」文案的隐藏属 SillyHub 前端 cosmetic 面，不入本变更。`_showChange`/show 人类可读视图读 DB 行值（brainstorm）不受影响，本变更不动。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- `progress show --json`（machine-interface `runStatusOverview` → `StageMachine.overview`）：`data.changes[]` 对 thin 活跃变更 `current_stage='thin'`、`stage_label='◈ 轻量变更'`（新增行为，唯一行为变化）；其余字段（name/ghost/last_active/stages/steps/stall）形态与取值不变。
- `STAGE_LABELS`（src/progress/shared.js）：新增展示键 `thin: '◈ 轻量变更'`；`VALID_STAGES`/`STAGE_ORDER`/`MAIN_FLOW_ORDER` 不动——thin 不进阶段机、不建阶段行（已核查 src 无 `Object.keys/entries/values(STAGE_LABELS)` 遍历消费，加展示键安全）。
- 本地 DB schema、flow-state.yaml 格式、CLI 其他命令、`listChanges` 语义：无变化。
- 下游消费方（零改动受益）：SillyHub daemon `buildSillySpecStatusSummary` 六字段原样透传 → 工作区总览卡按 `current_stage==='thin'` 走旁路徽标（前端 2026-09-25-change-center-thin-flow 已备 `◈ thin` 徽标）；变更比对弹窗 progress 行本地侧随之对齐平台 'thin'，假漂移消失。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
   答：overview 是单次快照纯读投影，无事件序假设；flow-state.yaml 由 writeFlowState 原子写，读到瞬时半写态的概率与损坏同路——`readFlowState` 损坏返回 null → fail-open 按行值投影，不抛错不误报 thin。
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
   答：本路径只读零写入，不新增并发面；与 flow done / 升厚（写 flow-state tier）并发时读到的 tier 为 thin 或 thick 任一确定态——升厚瞬间投影差一拍（thin 或 brainstorm），下一拍 daemon 采集自愈，与 sync 上行投影既有风险面同量级。
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
   答：投影无状态、每次现算现返回，无中断恢复面；变更归档后行出 `listChanges`（活跃口径），覆写自然消失；升厚后 tier=thick 不覆写（FR-02 钉住）——生命周期三态（进行中/升厚/归档）均收敛正确。
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
   答：flow-state 定位走 `pm._changePath(cwd, cn)`（cwd 绑定单仓根），无跨根寻址；daemon 多目标采集按 workspace 根各采各的 envelope，本变更不触碰定位链，无串台新面。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

- 最大风险：`STAGE_LABELS` 新增 thin 键被未发现的消费方当阶段清单遍历，产生幽灵阶段——已全源码核查无 `Object.keys/entries/values(STAGE_LABELS)` 用法，且 `VALID_STAGES`（阶段表 INSERT/迭代唯一源）不动，级联与 validate 零影响；既有测试面（收口实测）兜底。
- 放弃①daemon 侧后处理（SillyHub daemon 读 flow-state 覆写 current_stage）：把 CLI 的 flow-state 格式知识复制进 daemon 仓，且 conflictSnapshot progress 条目（比对弹窗本地侧）同样源自 CLI envelope，daemon 后处理要修两处——CLI 单点修一处收全链，弃。
- 放弃②overview 对 thin 省略 steps/stages 键：daemon asCount 把缺省强转 0/0，省略对下游显示是 no-op，纯增 envelope 契约噪音（steps 从必有变可有，backend schema 跟动），弃。
- 放弃③把 'thin' 加入 VALID_STAGES/阶段表：thin 不走阶段机（sync 侧注释明示口径），建空阶段行会扰动 completeStage 级联与 consistency 校验，弃。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/progress/stage-machine.js | overview() 补 tier=thin 投影覆写 + 顶部 import readFlowState（带 .js 扩展名，daemon ESM 惯例同源） |
| 修改 | src/progress/shared.js | STAGE_LABELS 新增 thin 展示键 '◈ 轻量变更' |
| 新增 | test/overview-thin-stage.test.mjs | overview thin 投影五形态测试（thin 覆写+DB 行不动 / thick·无 state·损坏不覆写 / 归档行不出现） |

（本变更仅 sillyspec 仓交付；SillyHub 工作区总览卡 scan 管线问题属 multi-agent-platform 仓，另行走变更，不入本冻结面。）
