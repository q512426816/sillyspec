---
author: flow-machine-draft
created_at: 2026-11-21T15:51:52.927Z
---
# 设计记录（Design Record）— 2026-11-21-shadow-dispatch-form-respect

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

痛点实证（2026-11-21）：`2026-11-21-verify-gate-scope-speed` 按 `--no-review` 形态收口时，主会话如实报告「不派平台评审」，但 `src/run/gates.js:1744` 的影子旁路在 brainstorm 收口自动向平台派发独立审查会话（pi 会话 23:29:21 被建、12s failed），且 fire-and-forget 使 `ℹ️ 影子审查已后台派发` 披露行落在主会话读不到的时机——形态选择被旁路穿透 + 披露缺口。用户裁决：**形态压过旁路、影子机制保留但派发必须可见**。

两处小改（方案内聚优先）：

1. **形态门（`src/review-dispatch.js`，dispatchShadowReview 内聚）**：create 模式既有前置校验链（tier-missing → tier-not-light → shadow-off → 幂等闸 → client → probe）**最前**插入形态免评审检查——`readFlowState(join(specBase,'changes',changeName))`（`src/flow-state.js` 既有 fail-soft 读取器，缺文件/损坏 → null → 不命中），`st.review_force === false || st.turbo === true` → 走既有 skip 通道留痕 `form-review-exempt（变更声明免评审形态：<形态表述>——形态压过旁路，不派影子对照）`。放函数内而非 gates 挂点层：所有前置校验内聚一处、单测直调无需拉起 gates、gates 挂点保持零条件逻辑。
2. **披露同步（`src/run/gates.js:1744-1771`）**：fire-and-forget Promise 链改 `await`——`dispatchShadowReview` 自身 catch-all 永不抛、skip 路径全本地快速返回、网络面有界（`SillyHubMcpClient` 缺省 timeoutMs=10000，probe 失败快速 skip），await 安全；ℹ️ 披露行保证在收口命令退出前打出。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- `dispatchShadowReview` opts 签名不变（无新参数——形态信息函数内部自读 flow-state，与既有 `readCeremonyLocalConfig` 自读模式同构）；返回值形态不变，新增一种 skip reason 值 `form-review-exempt（…）`（reason 为自由文本，ledger/doctor 消费面天然兼容）。
- `completeStageGates` 对外行为：非免评审形态收口可能多等待影子派发网络面（常态 <2s；平台上界 probe+createMission+dispatchWorker 各 10s 超时 ≈30s 极端尾部）。
- 对 CLI 用户可见输出：ℹ️ 行从「可能不被读到」变为「恒在退出前打出」；skip 场景仍静默（对齐既有零噪音设计）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

flow-state.yaml 由 flow start 立项时落盘、resume 重入亦落盘（`flow.js:873`），先于一切收口存在——不存在「收口时形态未落盘」的乱序；收口瞬间另一进程改形态属时点快照偏差，与既有 tierDoc 读取同口径，可接受。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

形态检查只读 flow-state；skip 留痕走既有 `mutateShadowLedger`（自带并发防线 + slice 截断）；双会话同时收口同一变更由既有幂等闸/文件锁面保护（本变更不触碰）。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

flow-state 缺失（run 五阶段跑道变更）或损坏 → `readFlowState` 返回 null → 不命中形态门 → 既有行为，fail-soft 与 `readCeremonyTierForShadow` 同口径。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

changeDir 由 specBase+changeName 拼接，多工作区各读各的变更目录不串台；跨仓 specRoot 接管场景沿用 `gates.js:1746` 既有 `shadowSpecBase`（platformOpts.specRoot 优先）传参——形态读取的 changeDir 与 tier 文件同根，判定基准一致。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

- **风险：await 引入收口尾部延迟**（平台半死最坏 ~30s）。接受：收口本身是重仪式动作，常态增量 <2s；权衡过 `Promise.race` 超时护栏后放弃——race 输掉后链仍在后台跑、ℹ️ 行仍可能丢，与「派发必须可见」的修复目标自相矛盾。
- **风险：形态三态误判**。对齐 `flow.js:3320` 声明通道语义：只认 `review_force === false`（--no-review）与 `turbo === true`（--turbo）；`null`（未声明）与 `review_force === true`（--review 强制档）均不豁免，语义自洽（强制评审的变更派对照影子无矛盾）。
- **死路：在 gates.js 挂点层做形态判定、skip 时直接不调 dispatchShadowReview**——放弃：校验逻辑分裂两处，ledger skip 记账需在 gates 层重复实现，内聚性差且单测要拉起 gates 全链。
- **死路：docs-auto 配置档（local.yaml `turbo: docs-auto`）一并算免评审形态**——放弃（本变更不覆盖）：docs-auto 是收口时按变更面动态判定（`flow.js:1390`），flow-state.yaml 无落盘字段，硬凑需扩 flow-state 契约面；纯文档面变更通常档位定价即低，留后续按实证需要再议。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/review-dispatch.js | dispatchShadowReview create 前置链最前插入形态免评审 skip（readFlowState 判 review_force=false / turbo=true，reason 含 form-review-exempt） |
| 修改 | src/run/gates.js | 影子派发挂点 fire-and-forget 改 await 同步（披露行退出前恒打出；注释同步改写） |
| 新增 | test/shadow-dispatch-form.test.mjs | 形态 skip/放行/既有文案零漂移三组断言 + gates 挂点 await 结构断言（自研 assert + tmp 目录，对齐 ceremony-tier.test.mjs 风格） |
