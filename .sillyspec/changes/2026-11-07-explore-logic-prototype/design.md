---
author: flow-machine-draft
created_at: 2026-11-07T12:59:56.828Z
---
# 设计记录（Design Record）— 2026-11-07-explore-logic-prototype

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

对照 mattpocock /prototype skill 三方分析（主分析+独立分析+证伪）终局结论：SillySpec 原型体系 UI-only，逻辑/状态模型类歧义缺「可交互证据」模态；但 brainstorm 侧不动（孤儿产物论证——下游 execute/gates/verify 三件套全是 UI 语义，逻辑原型在 brainstorm 生成无任何下游消费），explore 粗选件框架天然适配（手绘合法/不进变更目录/仅用户明确要求），零下游配套。

本变更只改 `src/stages/explore.js`「HTML 原型生成」节 prompt 三处：① 首句扩触发面（+状态机/流程/时序类歧义）；② 新增逻辑形 bullet（三要素+非 JS 复刻失真声明+不进变更目录）；③ 新增对比判据 bullet（结构性分歧+真实数据密度）。随后机械同步 docs/prompt 镜像与 skills 文档。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

无代码接口变化——explore 阶段定义的 name/title/description/steps 结构不变，仅 `steps[0].prompt` 文本增量；输出文件名规则不变（`{SPEC_ROOT}/explore/prototype-<名称>.html`，逻辑形沿用同名习惯——explore 目录不在 gates 扫描面）；CLI 命令面零变化。对外可见变化＝agent 收到的 explore prompt 文本更长（+2 bullet +首句半句，约 +4 行）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

   不适用——纯静态 prompt 文本，无事件序假设。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

   不适用——explore.js 是源码文件，并发由 git 提交流程管；prompt 运行时只读。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

   探索原型仍只在 explore 目录落盘、不进变更目录，变更生命周期不受影响；逻辑形显式排除进变更目录，堵一个交叉缝——既改前端又带逻辑原型的变更中，逻辑原型若被复制进变更目录会误平息 gates 的 UI 视觉证据探针（探针只看 prototype-*.html 文件在场，不验覆盖面）。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

   prompt 措辞开放——非 JS 项目显式定位为「JS 复刻模拟器+翻译失真声明」，不绑定生态（规约 00 工具中立）；`{SPEC_ROOT}` 相对变更库根，多仓不串台。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：逻辑原型真实触发频率未经实证（「差异≠缺陷」元批评成立——knowledge 库无状态机澄清打转的痛点条目），若长期无人触发则本段 prompt 是死重。缓解：增量仅约 4 行且 explore.js 预算宽裕（现 45 行）；下次 dogfood 遇状态机话题可实际验证后决定去留。

已试弃方案：① brainstorm 加逻辑原型分支——孤儿产物（execute.js:1015 纯后端 task 忽略原型注入、gates.js 只认 prototype-*.html UI 语义、verify 视觉证据门不消费逻辑件），生命周期断在生成那一刻；② 原型登记「问题声明」字段——语义错配（实验件元数据套实现原料；方案取舍问题已有 decisions.md question 字段承接）；③ 纯逻辑模块「可搬运」要求——非 JS 仓不立（规约 00）且与 no-tests 原型纪律冲突（正是原文警告的 prototype-rules code 进主干）；④ git 分支留存原型——与显式 pathspec 提交/push 压扁规则冲突，变更目录+归档已等价实现留存与指针。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/stages/explore.js | 「HTML 原型生成」节 prompt：首句扩触发面 + 逻辑形 bullet + 对比判据 bullet |
| 再生 | docs/prompt/_extracted.json | `node docs/prompt/_extract.mjs` 机械提取 |
| 修改 | docs/prompt/explore.md | prompt 正文以提取结果逐字替换 |
| 修改 | .claude/skills/sillyspec-explore/SKILL.md | 「生成 HTML 原型」段同步两形态与触发面 + frontmatter description 触发词 |
