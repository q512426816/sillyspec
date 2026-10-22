---
author: flow-machine-draft
created_at: 2026-10-22T17:10:34.488Z
---
# 设计记录（Design Record）— 2026-10-23-flow-done-preflight

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

新模块 src/flow-preflight.js 暴露 collectCloseoutPreflight（纯计算零打印，返回结构化 findings），cmdFlowDone 在实测门（ledger 子步 runQuickTestLintGate 调用点、哨兵检查之后）调用：命中任一 finding 时由 flow.js 侧渲染（dirty-gap/orphan 复用既有门的原版处置文案块）+ reportMidFail('patch') + exit 1——把「实测后才发现的便宜阻断」前移到付费实测之前并一次报全。判定与权威门同源同判定：dirty 预判复用 filterCommittedFace+collectFreezeFiles（只读重算，不落冻结件）；orphan 复用 scanOrphanFace（仅独占 worktree）。预检是纯前移报告层，权威门留在原子步原序——预检漏报权威门仍拦（fail-safe 单向），预检与权威门同源判定+同旗标镜像故不会多拦。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

新增 src/flow-preflight.js 导出 collectCloseoutPreflight({ cwd, specBase, change, st, freezeDirty, acceptDirtyGap, acceptOrphanFace, turbo }) → { findings: [{ id: 'dirty-gap'|'orphan-face', ... }] }。cmdFlowDone 实测门前接线（新阻断出口：预检头行+既有门原版处置块；文案与既有 dirty 门语义一致）。CLI 子命令面零变化；退出码：预检拦截 exit 1（与既有中途断点同码）。patch 权威门代码零改动。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

成立：预检读调用时点 git status/diff 盘面快照，与权威门读到的是同一批只读事实；预检与权威门之间盘面变化（并行会话新提交）最坏使权威门多拦一次——权威门原语义不变，预检不构成新序依赖。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

预检全程零写盘（不落冻结件、不 mark 子步、不写 flow-state），与并行会话零写写冲突；git 命令只读（status/diff/reflog 读）。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

安全：拦截即 exit 1 零半态（无子步标记），重入从 artifacts 起全量幂等；预检异常 fail-safe 静默放行——预检崩了权威门照常，流程不因预检新增失败面。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

不串台：dirty 预判用本仓 baseline..HEAD+git status（同权威门）；orphan 预判仅会话独占 worktree（shouldSkipGateSnapshotForWorktree 同判定）；跨仓注册面不触及（预检不含跨仓对账——那是 patch 子步的注册仓窗口探测，advisory 不阻断）。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：预检与权威门判定漂移（多拦=回归、漏报=白做）。对策：同源同判定（复用同一批函数而非重写）+ 旗标语义逐条镜像（turbo 降 advisory/处置旗标在场不拦/patch 子步已 done 跳过）+ e2e 与 unit 直调锁行为。批准后实现期裁剪：review.json schema 预验不做——三路皆负：①schema 违规成本=修正文件+重跑一轮 RTT，与检测时点无关（同轮提前检测不省轮次）；②违规发生的轮次 ledger 子步已 done（预检位于其内不跑）；③豁免轮（--no-review）权威门不读文件，预检先验会多拦权威门不拦的面（判定漂移）。放弃的方案：①把全部实测后门（绑定槽/空面/模块门）搬进预检——绑定自动补全依赖实测产物、空面/模块门依赖冻结面计算，前移需重实现半个 patch 子步，收益小风险大，本切片只搬独立可算的便宜门，弃；②预检写独立判定逻辑——必然漂移，弃。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 增 | src/flow-preflight.js | collectCloseoutPreflight 只读预检（dirty/orphan 双源，纯计算零打印） |
| 改 | src/flow.js | cmdFlowDone 实测门前接线：findings 非空→既有处置文案块一次报全+reportMidFail+exit 1 |
| 增 | test/flow-done-preflight.test.mjs | e2e（dirty 拦/旗标放行/干净静默）+ unit 镜像守卫 |
