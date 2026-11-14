---
author: flow-machine-draft
created_at: 2026-11-14T14:12:32.544Z
---
# 设计记录（Design Record）— 2026-11-14-wait-ask-tool-and-selfcheck-output

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

两处纯提示词/注入文本修改：① `src/stages/brainstorm.js` 方案步「### 输出」行把自检结果列为必产物（四行检查逐行打勾、✗ 回到对应处理），使 FR-04 自检从过程动作升级为可审计产物——2026-11-13 变更上线实测自检表被整体跳过，根因是输出契约未包含它；② `src/run/prompt.js` outputStep 的「完成后执行」段在 requiresWait / mayNeedWait 两分支注入提问方式指引（优先 harness 交互询问工具、回答逐字带入 --answer），对齐 flow.js 三断点横幅已有的 AskUserQuestion 实践——完整流程 wait 步只给命令模板导致 agent 只发纯文字问题。auto 模式（autoMeta）跳过注入，零变化。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

无函数签名/命令/文件格式变化。变化面：`definition.steps[].prompt` 文本（brainstorm 方案步输出契约行）与 `outputStep` 渲染的注入文本（新增提问方式指引行）；SS-META 机器块、命令模板、waitOptions 均不变。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

成立。指引与输出契约均为无状态文本；用户回答顺序由 waitAnswers 机制既有语义承载，本变更不触碰。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

纯文本文件改动，多会话各自变更目录隔离；docs/prompt 冲突按既有惯例以最新源码重跑 `_extract.mjs` 再生。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

安全。指引随步骤渲染即时生效，不落运行态；中断重入按既有 wait 恢复语义。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

不会。注入文本按 stage/step 渲染，无跨仓数据；AskUserQuestion 为 harness 侧工具调用，不经 sillyspec 状态。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

风险一：指引措辞绑 Claude Code 工具名（AskUserQuestion），非 Claude harness 无此工具——已用「harness 交互询问工具（Claude Code 即 AskUserQuestion）+ 无该工具退纯文字」的双态措辞对冲，与 flow.js 既有实践一致。风险二：输出契约加自检结果后方案步产物变长——四行表格可控。放弃方案：在 CLI 侧解析产物校验自检块存在（强校验）——LLM 产物形态不稳定、解析脆弱，且 violates 文档驱动定位，本次先靠提示词约束 + 测试锁文案。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/stages/brainstorm.js | 方案步「### 输出」行补自检结果产物 |
| 修改 | src/run/prompt.js | 完成后执行段两分支注入提问方式指引（auto 跳过） |
| 修改 | docs/prompt/_extracted.json | 提取脚本再生 |
| 修改 | docs/prompt/brainstorm.md | 提示词正文逐字同步 |
| 修改 | docs/prompt/README.md | 注入框架说明同步新指引 |
| 修改 | test/brainstorm-solution-constraint-gate.test.mjs | 补输出契约断言 |
| 修改 | test/output-step-render.test.mjs | 补注入断言（含 auto 不注入） |
