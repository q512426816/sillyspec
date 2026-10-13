---
author: flow-machine-draft
created_at: 2026-10-13T04:30:15.384Z
---
# 设计记录（Design Record）— 2026-10-13-thin-sync-stage

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

问题：平台变更中心「进行中」列表的轻量变更不显示「轻量」徽章。链路实证（线上库）：CLI 对 thin 变更上行的 `changes[0].current_stage` 恒为出生值 `'brainstorm'`（thin 不走阶段机，v8 迁移后出生阶段即 brainstorm，VALID_STAGES 无 thin），顶层 steps 恒空数组；平台读侧 `is_thin` 三分支（stage=thin / change_type=quick / steps 无标准四阶段痕迹）全不命中。平台侧 StageEnum.THIN、前端 STAGE_KIND/STAGE_LABELS「轻量变更」、ingest 守卫 A/B（"平台行 current_stage=='thin' 且上行 status 非 archived → 跳过覆盖"）均已按 `current_stage='thin'` 消费——唯独 CLI 上行缺这一环，双守卫防的"回洗"防了个从不存在的信号。

方案：在 serializeForSync（src/progress.js，六表上行载荷唯一构造点，sync.js push 侧 `_projectStepStart` 等后处理对 'thin' 天然无操作——thin 无 steps 行）构造 changeProj 后加投影覆写：`tier==='thin' && changes 行 status==='active'` 时 `current_stage` 上报 'thin'。只改载荷不落库——本地 DB、`sillyspec status` 本地展示、阶段机零变化；读侧 round-trip（平台 pull import 回写 'thin' 到本地 TEXT 列）无害且 STAGE_LABELS 消费侧有 `|| stage` 原值回退。

readFlowState 需被 progress.js 引用；把 `FLOW_STATE_FILE` + `readFlowState`（自包含：readFileSync + yaml.load，fail→null）上移到新叶子模块 src/flow-state.js（仅依赖 node:fs/node:path/js-yaml），flow.js import 并 re-export 保持 `import('../flow.js')`（run/command.js 既有动态引用）不变。叶子化的收益是依赖面收窄：progress.js（同步链热路径）不必为读一个状态文件拉入 flow 协议整条 import 链（评审 P3 勘误：flow.js 静态 import 闭包经 BFS 实测不达 progress.js，本上移不是循环依赖问题，此前的「大概率反向依赖」判断失实）。writeFlowState 留在 flow.js（仅 flow.js 内部消费，且依赖 writeAtomicSync 等不必上移）。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- 新模块 `src/flow-state.js`：`export const FLOW_STATE_FILE = 'flow-state.yaml'`；`export function readFlowState(changeDir)`（缺文件/损坏 → null，行为与 flow.js 原实现逐字一致）。
- `src/flow.js`：删除本地 readFlowState/FLOW_STATE_FILE 定义，改为 `import { FLOW_STATE_FILE, readFlowState } from './flow-state.js'` + `export { FLOW_STATE_FILE, readFlowState }`——对外导出面不变。
- `src/progress.js` serializeForSync：changes[0].current_stage 在双条件（flow-state tier=thin 且行 status=active）下覆写为 'thin'；对外函数签名、六表结构、其余五表投影零变化。本地 DB 行禁止改动。
- 平台侧（消费端，本变更零改动）：ingest `_apply_cli_stage_status` 行值覆盖、读侧 enrich_summaries 投影、前端徽章/筛选按既有 'thin' 口径接住。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

1. 乱序/迟到到达：覆写在每次 serializeForSync 现算（读 flow-state.yaml 即时值），非持久状态——升厚（tier 翻 thick）后下一次推送自动停报 'thin'，无乱序残留；归档推送（status=archived）不覆写，终态链既有顺序不受影响。
2. 并发写：覆写只改本次调用返回的载荷对象，不写 DB、不写文件；flow-state.yaml 的并发写由 writeFlowState 原子写（既有）承担，读侧 fail→null 不覆写，最坏回退现状行为。
3. 切换/生命周期：进程在 serializeForSync 中途死——载荷未发出即无效果，本地零残留；平台 pull import 回写 'thin' 后本地行与后续上行载荷同值，幂等稳定。
4. 作用域：flow-state 按 changeName 定位（`_changePath(cwd, changeName)` = specDir/changes/<name>，与 _ensureDB 同一 specDir 解析，多 workspace/多 spec 根不串台）；worktree 场景 cwd 解析与 DB 同源（sync.js 以 safePlatformSpecDir 构造 PM，custom specDir 生效）。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：平台读侧对 current_stage='thin' 的未验证消费面（如 pending_review 投影 `_map`）——已核：`_map` 无 thin 分支自然落 None；前端 STAGE_KIND/STAGE_LABELS 有 thin 既有条目；ingest 守卫谓词 row=='thin' 时跳过覆盖（同值幂等）。次风险：旧平台版本（无 thin 消费）收到 'thin'——StageEnum.THIN 自 2026-09-25 即在，裸 JSON 透传无校验拒绝面。

试过但放弃的方案：① 把本地 changes 行 current_stage 直接写 'thin'——动阶段机/本地展示/doctor 校验面，爆炸半径大且本地语义争议（thin 并非"阶段"）；② payload 加 tier 字段 + 平台 `_is_thin_lineage` 加第四分支——需同时改平台仓（跨仓双端协调），且 'thin' 阶段值平台消费面已全部就绪，加字段是重复信号。

已知边角（评审 P3-2，纯展示面、首次 run 自愈，不在本变更修）：平台 pull import 对 current_stage 零校验（既有语义），回写 'thin' 到本地行后、若该变更升厚（只改 flow-state tier 不重置行值），在首次真实 stage 运行重置行值前，上行载荷按行值持续报 'thin'——平台读侧短窗误标。自愈路径：升厚变更跑任一 run <stage> 即按阶段机重写行值。

## 文件变更清单

| 操作 | 路径 | 说明 |
| --- | --- | --- |
| 新增 | src/flow-state.js | FLOW_STATE_FILE + readFlowState 单一源叶子模块（自 flow.js 上移，逐字一致） |
| 修改 | src/flow.js | 删本地定义，import + re-export（对外导出面不变） |
| 修改 | src/progress.js | serializeForSync 加 thin 活跃覆写投影 + import readFlowState |
| 新增 | test/platform-sync-thin-stage.test.mjs | 四形态覆盖（thin active 覆写 / 归档 / 升厚 / 无 flow-state 不覆写） |
