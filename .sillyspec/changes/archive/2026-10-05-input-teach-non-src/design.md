---
author: flow-machine-draft
created_at: 2026-10-05T15:10:12.699Z
---
# 设计记录（Design Record）— 2026-10-05-input-teach-non-src

> 四节每节必答——问题行原样保留（勿删勿改勿用答案替换），答案另起一行写在问题行下方；小改动可写「不适用：<理由>」；flow done 空节拒收。
> 需要列改动文件时加独立「## 文件变更清单」章节+表格（| 操作 | 路径 | 说明 |）——章节标题是 parseFileChangeList 的识别面，勿写在「接口契约」节内（收口声明面解析不到会误报夹带嫌疑）。
> 四问原文/FR 标题/镜像任务行是收口锚——问题行/标题从本模板原样保留或复制，勿删勿改、勿用答案整块替换问题原文、勿手打重写（标点也要逐字：2026-10-05 三度实证——句号手写成问号、答案整块替换问题原文均被锚对比拒收）。

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

src 教学可照抄化（2026-10-05-input-teach-copyable）向非 src 教学面推广：逐字可照抄三处（CLAUDE.md/flow.md 卡/run-quick.md 卡）改多行实例——命令卡在 bash fenced block 内直接多行化，CLAUDE.md 列表项内嵌 fenced 实例；描述式两处（AGENTS.md 过门格式说明、sillyspec-flow SKILL.md）升级为实例块；倒推行两处（AGENTS.md 选道表 + templates/agents-instruction.md 模板源同款行）引号内联模糊形态改为「格式同上」引用式表述（markdown 表格单元格不可换行，故用引用而非内嵌实例）。同步处置评审 P3：input-teach-copyable.test.mjs ① 断言从定点 6 文件升级为 src 递归遍历（readdirSync 递归 + 排除项），新增 ①b/②b 非 src 面断言。改源不改分发副本的原因：assets/command-cards、.claude/skills、templates/agents-instruction.md 均为 init 分发源（command-cards.js 从 assets 读卡、init.js 从 templates 读 AGENTS 模板、从包内 .claude/skills 复制 SKILL），改源即断新装项目旧形态；本仓 AGENTS.md/CLAUDE.md 为 dogfood 已装副本，一并手改对齐。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

无函数签名变化。文档/资产面变化：assets/command-cards/flow.md 与 run-quick.md 卡内命令示例多行化；CLAUDE.md 第 4 条教学实例化；AGENTS.md 过门格式说明补 fenced 实例、选道表倒推行表述改写；.claude/skills/sillyspec-flow/SKILL.md 过门格式说明实例化；templates/agents-instruction.md 选道表倒推行同步改写；test/input-teach-copyable.test.mjs 断言升级（① 递归化 + ①b/②b 新增）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

不适用——纯静态文档/模板文案与测试断言，无输入事件流。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

不适用——文档编辑由本会话串行提交；init 分发按尾锚三态幂等（既有机制，本变更不改分发逻辑）。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

不适用——已 init 项目不会自动重装（同版本不更新，AGENTS.md 头注语义）；旧副本留存旧形态属可接受存量（本仓自管副本已手改对齐）。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

不适用——源资产随 npm 包分发，各项目独立安装副本；本变更只改包内源与本仓副本。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

风险：已 init 存量项目的 AGENTS.md/命令卡仍是旧形态（同版本不更新机制）——接受，存量项目下次大版本 init 会覆盖；新装项目从本变更起拿到可照抄形态。另一风险：CLAUDE.md 各项目形态各异（本仓是 dogfood 特有完整版），改动不可迁移——本变更只对本仓与包内源负责。试过但放弃：倒推行表格单元格内嵌多行实例（markdown 表格不支持换行，<br> 形态在 markdown 源码里不可照抄）——改用「格式同上」引用式表述。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | assets/command-cards/flow.md | 卡内 flow start 教学改多行实例 |
| 修改 | assets/command-cards/run-quick.md | 重定向卡内教学改多行实例 |
| 修改 | CLAUDE.md | 第 4 条轻量变更教学内嵌 fenced 实例 |
| 修改 | AGENTS.md | 过门格式说明补 fenced 实例；选道表倒推行改引用式表述 |
| 修改 | .claude/skills/sillyspec-flow/SKILL.md | 过门格式说明升级实例块 |
| 修改 | templates/agents-instruction.md | 选道表倒推行同步改引用式表述（init 模板源） |
| 修改 | test/input-teach-copyable.test.mjs | ① src 递归遍历升级 + ①b/②b 非 src 面断言新增 |
