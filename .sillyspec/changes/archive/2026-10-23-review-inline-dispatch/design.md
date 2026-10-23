---
author: flow-machine-draft
created_at: 2026-10-23T00:04:07.531Z
---
# 设计记录（Design Record）— 2026-10-23-review-inline-dispatch

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

review-dispatch.js 新增导出 runThinReviewInline：复用厚道平台派发链的机械件（probe→createMission(external)→dispatchWorker(readOnly, worktreePath=cwd)→轮询 listWorkers→getWorkerResult），workerPrompt=薄道任务书全文（renderReviewerTaskbook 产物——同一任务书生产权在 CLI，与子代理路径零分叉）；新增薄道专用提取 extractThinReviewFromResult（三通道：artifacts 文件名/kind=review.json、artifacts 文本、answer 正文的 JSON 块）+validateReviewJson 同一源校验，通过则写 changeDir/review.json。flow.js review 缺席分支：键有效时先尝试 inline，成功则落盘后走抽出的共享登记块（原 else 分支抽为局部函数，子代理重跑路径同调用消费）；任何失败打一行留痕后回退现状任务书面。选配置门控（review_inline_wait 秒数即等待预算）而非缺省开启：阻塞等待是 UX 决策，授权权留仓主——与 dirty_gate_ignore/turbo docs-auto 同一治理形态。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

local.yaml 新键 `review_inline_wait: <秒>`（readFlowConfig 增 reviewInlineWaitSeconds，1-600 正整数有效，缺省/坏值 0=off）。review-dispatch.js 新导出 runThinReviewInline({ cwd, specBase, change, changeDir, taskbookText, waitMs, client?, probe?, budgetUsd?, log? }) → { ok:true, missionId, workerId } | { ok:false, reason, missionId? }；内部提取器 extractThinReviewFromResult（模块内私有）。flow.js review 缺席分支重构：登记块抽为局部函数双路复用（子代理路径行为逐字不变）。CLI 子命令面零变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

成立：轮询窗口内按平台状态机到达；超时后到达的结果不进本轮（worker 可能稍后 completed——missionId 留痕可在平台 UI 回看；丢弃该结果不构成假绿，登记仍要求在场合规 review.json）。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

review.json 落盘用 writeAtomicSync；同变更双开收口由既有子步幂等+review 子步判定兜底（第二开看到 review.json 在场即走登记）；inline 不写 dispatch record（不与厚道 --status 记录机制互踩）。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

等待中 Ctrl-C=超时同款（无半态：review.json 未写即未写，重跑按缺席分支再走）；mission 平台侧自然回收（external 模式既有语义）；成功落盘后中断=子代理路径中断同款（review.json 在场，重跑登记）。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

不串台：dispatchWorker 带 worktreePath=cwd（平台 worker 在本工作树只读作业）；review.json 只写本 changeDir；平台凭据/探测与厚道通道同源（SillyHubMcpClient cwd 本位）。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：①平台结果形态漂移（worker 回传的 review 不合规/提取不到）→ 回退任务书面零损失（validateReviewJson 同一源把关，坏产物进不了登记）；②阻塞等待体感（用户盯着 flow done 不动）→ 等待预算=键值秒数（仓主自定），轮询期每 15s 打一行进度心跳，回退路径永远在场。放弃方案：①缺省开启 inline（阻塞 UX 是仓主决策，且本仓平台可用性因环境而异——配置门控与 dirty_gate_ignore/turbo docs-auto 同形态，弃缺省开）；②复用厚道 dispatch record 异步轮询机制（那是跨命令异步形态，单调用要的是有界同步等待，语义不同，弃）；③reviewer 伪装 subagent（不诚实——如实 'platform-inline'，评审抽查面可区分）。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 改 | src/review-dispatch.js | 新导出 runThinReviewInline（probe/create/dispatch/有界轮询/三通道提取/validateReviewJson/落盘） |
| 改 | src/flow.js | readFlowConfig 增 reviewInlineWaitSeconds；review 缺席分支先试 inline；登记块抽局部函数双路复用 |
| 增 | test/review-inline-dispatch.test.mjs | fake client 四态 unit＋e2e 键未配置零回归＋键三态 |
