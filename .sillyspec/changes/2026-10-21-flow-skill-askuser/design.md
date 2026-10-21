---
author: flow-machine-draft
created_at: 2026-10-21T06:18:15.804Z
---
# 设计记录（Design Record）— 2026-10-21-flow-skill-askuser

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

在 `.claude/skills/sillyspec-flow/SKILL.md` frontmatter 之后、「## 何时使用」之前追加「## 交互规范」节，逐句复用 sillyspec-brainstorm 同名节的标准措辞（多选项必须走内置 AskUserQuestion 传参作答、禁止编号列表手输数字）。选逐句同版而非另拟措辞：仓内 brainstorm/commit/auto/explore/init/resume/workspace 七个 skill 已是同版口径，flow 单独另拟会制造第二种口径。skills 复制源即本仓 `.claude/skills/`（init.js:462），改一处即改源，无需另改模板。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

无代码接口变化。对外可见面仅文档：sillyspec-flow SKILL.md 新增一节（消费方为 agent 读取的指令文本，及 init 复制到各工具目录的落盘件——扩散需版本号提升+消费仓重跑 init，本变更不提版本）。不动 CLI、不动 assets/command-cards/flow.md。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
   答：成立——纯静态文档追加，不消费事件流/输入顺序；交互规范是读侧行为约定，与到达顺序无关。
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
   答：本变更为单文件单节追加，无共享可变数据；他 session 若同时编辑该文件，按 AGENTS 规则 9 Edit 前重读最新态即可避撞。
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
   答：安全——追加为一次原子 Edit 落盘，中断只有未写入/已写入两态，无中间态；流程状态由 flow-state.yaml 承担，与本文件无关。
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
   答：不会——改动仅本仓 `.claude/skills/` 源文件；消费仓经 npm 包 init 复制取新版，扩散路径独立于本变更。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：措辞与既有 skill 口径不一致造成双口径——用与 brainstorm 逐句对照验收兜住。放弃方案：① 改 templates/agents-instruction.md（AGENTS.md 生成源）加全局交互规范——放弃：作用域过宽，用户只要求 flow skill 对齐其他 skill 的既有形态，且各 skill 是在 SKILL.md 内自带该节，改全局源反而引入新形态；② 同步改 assets/command-cards/flow.md 命令卡——放弃：命令卡无多选项问询段落，无对齐对象。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | .claude/skills/sillyspec-flow/SKILL.md | frontmatter 后、「## 何时使用」前追加「## 交互规范」节（与 brainstorm 同版措辞） |
