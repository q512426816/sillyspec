---
author: flow-machine-draft
created_at: 2026-10-19T07:40:03.128Z
---
# 设计记录（Design Record）— 2026-10-19-thin-review-material-pack

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

轻量评审慢的主因是任务书把原始件原样丢给零上下文评审员：定位类通读（requirements/design 全文找 FR 与绑定）+ 大 patch 整吞 prefill（冻结件实测最大 365KB）。完整流程五阶段 2026-09-19 已为同一病根（评审 ~200x 信息放大）建过材料包（review-material-pack.js，run/prompt.js 注入链在用），本变更把同款机制移植到轻量道：新增纯函数模块 flow-review-pack.js，机械解析两件——requirements.md 的 FR 标题/测试绑定行成表、change.patch 文本成文件级摘要（路径+±行数+hunk 数）——经 renderReviewerTaskbook 新可选参数注入【预消化材料包】段，flow.js 渲染任务书处装配传入。

三条护栏（方案成立条件）：① 只做机械抽取零模型摘要（digest 全部来自确定性行/正则解析，防「自述换皮」破坏「不信自述」评审前提）；② 包=基准面非禁读面（段尾印基准面语义行，照抄完整流程 D-004 语义：包外可定向查证但须列明、包不足写 cannot_verify）；③ 摘要从冻结件本身算不从活 git 算（review-material-pack 的 extractDiffSummary 走活 git 解 base 那条路不能搬——防「包说的」与评审员手里冻结面漂移）。体积帽对齐 PACK_MAX_CHARS=12000 先例，超限截断注记。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- 新增 src/flow-review-pack.js 导出 assembleReviewPack({ changeDir, patchText }) → { lines: string[] } | null：行/正则解析 requirements.md（FR 标题+测试绑定节）与冻结 patch 文本（diff --git 与 @@ 头行），产出注入行；两子源各自可得各自产出、全缺返回 null。
- renderReviewerTaskbook 参数增可选 packLines（string[]）：缺省/空数组零注入——渲染产物与现状逐字一致，既有调用方与既有测试零感知。
- CLI 命令/子命令签名：无变化（flow done 渲染面增强，协议调用数不变）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
不适用——解析对象是渲染时点已落盘的快照件（requirements.md/change.patch 均先行写定），纯读无事件序假设。
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
不适用——材料包只读不写；changeDir 文件被并行修改属既有行为，任务书本就要求评审员以工作区实态为准，摘要不承担实时性。
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
不适用——无状态纯函数，断点续跑重渲染同输入同输出（幂等）。
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
不适用——解析范围仅限本变更 changeDir 两件；跨仓 JSON 冻结面（主仓无 change.patch）不产 patch 摘要、不读活 git 兜底，该子段零产出。

## 文件变更清单（自声明对账面）

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 新增 | src/flow-review-pack.js | 冻结 patch 文件级摘要 + FR 绑定表机械解析、12000 帽截断（纯函数） |
| 修改 | src/flow-review.js | renderReviewerTaskbook 增可选 packLines 注入段（未传零注入） |
| 修改 | src/flow.js | review 子步渲染任务书处装配材料包传入 |
| 新增 | test/flow-review-pack.test.mjs | 零注入一致/注入形态/帽截断三态用例 |

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：评审员把包当证据用（锚定偏差）——靠段尾基准面语义行（包=定位索引、包外查证须列明、包不足 cannot_verify）与任务书既有「材料按需 Read」预算结构对冲。已知局限：收益不可机测（review.json 不记请求数），本变更不动 review.json schema，收益定性观察。已放弃方案：复用 review-material-pack.js 的 extractDiffSummary（从活 git 解 base，与护栏③冲突且引入 verify-postcheck 依赖面）；给 review.json 加 requestsUsed 字段（schema 变更，与本变更解耦另立）。
