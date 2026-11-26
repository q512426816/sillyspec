---
author: flow-machine-draft
created_at: 2026-11-15T00:05:28.922Z
---
# 设计记录（Design Record）— 2026-11-15-sentinel-evidence-channel

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

哨兵（detectFakeCheckCompletion，src/sentinel-assertions.js）的 review 证据通道是死代码：listReviewEvidence（:49-70）扫描 `join(dirname(changeDir), '.runtime', 'execute-runs')` = `.sillyspec/changes/.runtime/execute-runs`——错位一级目录，真实产物在 `.sillyspec/.runtime/execute-runs/`（specBase/.runtime，实测在场），该通道从未命中过（完整流程也一直只靠 commit token 过门——上游 2026-11-14-scan-incremental 的 wt-commit 每笔带 task-NN 正因此）。轻量变更（flow 道）更无 execute-runs，唯一通道=commit token，而 .sillyspec-gitignored 仓的勾选留档不可入库——结构性依赖提交消息带 token，忘带即卡死（2026-11-15-scan-audit-domain 实证三次确认卡超时）。

修复两刀（都在 src/sentinel-assertions.js）：①路径修正 `dirname(dirname(changeDir))`（变更目录的父级 changes 的父级=specBase）——复活 execute 通道（完整流程受益）；②detectFakeCheckCompletion 增第三通道：变更目录下 review.json（轻量道收口评审产物）文本含 task id 即认——轻量道不再单独依赖 commit token。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- `detectFakeCheckCompletion` 行为扩展：证据通道从 2 条（commit token / execute-runs review 路径）变 3 条（+变更目录 review.json 文本命中 task id）；签名/返回形状零变化。
- `listReviewEvidence` 内部路径修正（非导出函数，无对外契约）。无端点/命令/文件格式变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
   答：成立——证据判定是收口时一次性快照读（git log + 文件读取），无时序依赖。
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
   答：review.json 读取是 try/catch best-effort（坏 JSON/半截文件按无证据处理——fail-closed 方向不变，只是不认该通道）。
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
   答：安全——纯读取判定，无状态写入；中断重跑幂等。
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
   答：不会——第三通道只读**本变更目录**的 review.json（changeDir 锚定），task id 字面匹配（taskTokenRe 同源词边界，task-01 不证 task-010——既有 ④ 边界测试锁定）。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？
答：最大风险是第三通道过宽（review.json 里散文提及 task-01 即认）——但该文件本身是收口评审产物（flow done 的 review 子步 schema 校验在场性），伪造面与 commit token 消息伪造成本同级，且哨兵定位是「防假完成主张」非「防恶意伪造」（恶意者可直接伪造 commit token，防线在同层）。放弃的方案：task tick 时写机器证据文件到 .runtime（tick 即证据）——改动面更大（tick 命令+路径约定），且与修复①的复活通道功能重叠，留待真有需要时再上。
