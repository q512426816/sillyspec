---
author: flow-machine-draft
created_at: 2026-10-06T11:32:00.197Z
---
# 设计记录（Design Record）— 2026-10-06-resume-title

> 四节每节必答——问题行原样保留（勿删勿改勿用答案替换），答案另起一行写在问题行下方；小改动可写「不适用：<理由>」；flow done 空节拒收。
> 需要列改动文件时加独立「## 文件变更清单」章节+表格（| 操作 | 路径 | 说明 |）——章节标题是 parseFileChangeList 的识别面，勿写在「接口契约」节内（收口声明面解析不到会误报夹带嫌疑）。
> 四问原文/FR 标题/镜像任务行是收口锚——问题行/标题从本模板原样保留或复制，勿删勿改、勿用答案整块替换问题原文、勿手打重写（标点也要逐字：2026-10-05 三度实证——句号手打成问号、答案整块替换问题原文均被锚对比拒收）。

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

恢复简报（printRecoveryBriefing）是 flow start 重入路径的断点恢复面，与 flow status 查看面同族——status 已显示标题（2026-10-06-flow-status-title），恢复面缺同款上下文。方案：cmdFlowStart 的 resume 分支在渲染简报前经 `new ProgressManager({ specDir: specBase }).getChangeTitle(cwd, change)` 读标题（既有只读访问器单源复用，best-effort try/catch），透传 printRecoveryBriefing 新增可选参数 title；简报在分隔线后、首条「做到哪」前渲染「- 标题：<title>」（仅非空时）。渲染与读取分离，无 DB/无 title 走现状零变化。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- `printRecoveryBriefing({ cwd, specBase, change, changeDir, runtimeRoot, st, digestLines })` 新增可选参数 `title`（string|null，缺省 null 不渲染标题行）——模块内私有函数，无外部签名面。
- `sillyspec flow start --change <名>`（重入恢复路径）：进度库登记了非空 title 时恢复简报多一行「- 标题：<title>」（此前无此行——行为变化本体）；fresh/adopt 路径零变化。
- 其余命令、DB schema、文件格式：无变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
   不适用级别的影响——恢复简报是时点快照读，title 低频写（start/--title 时写）；读到新旧值都是合法时点态，无顺序依赖。
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
   只读 SELECT 与并行会话 updateChangeMeta 写之间是 SQLite 单语句读写（WAL）；getChangeTitle 前置判 DB 在场不建库，无锁竞争面。
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
   恢复简报无状态迁移；标题读取失败走 try/catch 降级 null——与「无 DB」同输出形态，中断无半态。
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
   DB 定位走 specBase 锚定的 ProgressManager（与 start/done/status 同构），读的是同一进度库，不串台。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：恢复路径在测试里跑 cmdFlow start 会拉起 watcher/补起草等副作用——测试须以 SILLYSPEC_WATCHER=0 逃生阀与临时仓隔离（既有 watcher 测试同款），否则测试环境噪声。放弃的方案：① 在 flow-state.yaml 冗余存 title（双源漂移，DB 已是权威源）；② 恢复简报改为直接复用 flow status 的渲染函数（两版面文案/结构不同，强行共用会把 status 的阶段推断耦合进恢复面，超出本变更范围）。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/flow.js | resume 分支读 title 透传；printRecoveryBriefing 渲染标题行 |
| 新增 | test/flow-resume-title.test.mjs | FR-01~03 回归（fixture 临时仓 + 静态单源断言） |
| 修改 | package.json | test:core 清单收录新测试 |
