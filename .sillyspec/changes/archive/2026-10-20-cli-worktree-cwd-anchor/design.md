---
author: flow-machine-draft
created_at: 2026-10-20T01:54:00.807Z
---
# 设计记录（Design Record）— 2026-10-20-cli-worktree-cwd-anchor

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

守卫建议的事自动做掉：CLI 入口的 worktree cwd 硬拦（src/index.js:401-417，坑 worktree-cwd-silent-split 的 exit 2 + 「cd 回主仓根重跑」指引）改为「⚠️警告 + 自动重锚定主仓根执行」。detectCwdInsideWorktree 本就从路径结构精确给出 mainRepoRoot——守卫拦下后让 agent 手工 cd 重跑，生产实证每次浪费 1-2 个交互来回（会话 47e2ff1a 三次被拦）；锚定即把指引自动执行。选锚定而非维持硬拦的理由：坑 cli-cwd-coupling 复核（2026-10-13）已确认现行守卫「大幅收窄」了分裂风险，残留痛点就是摩擦——重锚定消摩擦同时保住单源不变量（写入永远落主仓，worktree 副本零写入）；刻意要在 worktree 内独立实例跑的显式路径（--allow-worktree-cwd --spec-dir）在警告中原样保留。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

**src/index.js main() 守卫段（:401-417）**：命中时从 `process.exit(2)` 改为——stderr 四行警告（变更名/原 cwd/锚定主仓根/逃生门整行照贴）+ `dir = wtInfo.mainRepoRoot` 重锚定（dir 为 let，后续未初始化门/命令分发自然消费）。守卫触发条件不变：`!args.includes('--allow-worktree-cwd') && command !== 'wt-commit'`；`guardDir` 取值口径（--dir 显式值或 process.cwd()）不变。

**src/run/shared.js detectCwdInsideWorktree**：零改动（单元行为逐字节不变）。

**CLI 对外行为变化（唯一）**：worktree cwd 内跑命令的退出码从恒 2 变为「命令在主仓口径下的自然退出码」+ stderr 多锚定警告。命令/端点/文件格式签名零变化。

**文档面**：本仓 AGENTS/CLAUDE 未述及硬拦行为（grep 无 '--allow-worktree-cwd' 引用）——不适用；坑文 cli-cwd-coupling 的关闭留痕随归档补。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

不适用：锚定是入口一次性路径重写，无事件序参与；锚定后命令全程单一 dir 值。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

锚定后写入全部落主仓（单源）——与 agent 手工 cd 回主仓跑完全同款并发形态，无新增共享写点；worktree 副本 .sillyspec 从此零 CLI 写入（原硬拦语义的延续，只是不再需要 agent 配合）。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

锚定发生在命令分发前（进程入口），命令中途无切换语义；worktree 本身的生命周期（apply/cleanup）不受影响——锚定只重定向 CLI 的执行目录，不动 worktree 目录与注册。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

mainRepoRoot 由路径结构锚定（.sillyspec/.runtime/worktrees/<change> 段的宿主仓根）——天然同仓，不跨仓；平台模式 specRoot 异位形态不经本守卫（守卫只认主仓内 worktree 段路径），不受影响。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：锚定静默改变「agent 以为在 worktree 跑」的预期——缓解：警告恒输出（stderr 四行，含原 cwd 与锚定目标，agent 可见可纠偏）；逃生门整行照贴保留刻意独立实例路径。次风险：平台 daemon 在 worktree 模式下 spawn CLI 且 cwd=worktree（若存在此形态）被意外锚定——排查：wt-commit 已豁免（子代理 workdir 形态）；daemon 平台模式 specRoot 异位不经本守卫路径段。放弃的方案：①维持硬拦只加更多指引文案（生产实证指引已够清楚，痛点在来回本身）；②按 SILLYSPEC_SESSION_ID/env 锚定主仓（坑文提及的锚点族）——session env 是多会话共享值不标识仓根，路径结构锚点（mainRepoRoot）已完备，env 锚点对 worktree 场景无增益。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/index.js | 守卫段 exit 2 → 警告 + dir 重锚定 mainRepoRoot（触发条件/豁免/guardDir 口径不变） |
| 修改 | test/worktree-cwd-guard.test.mjs | e2e 断言改钉（exit 2 → 非 2 + 锚定警告 + 主仓口径），新增主仓未 init 极端态用例；detectCwdInsideWorktree 单元断言不变 |
