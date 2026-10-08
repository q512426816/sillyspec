---
author: flow-machine-draft
created_at: 2026-10-08T16:24:25.004Z
---
# 设计记录（Design Record）— 2026-10-08-explore-knowledge-graph

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | src/stages/explore.js | prompt 操作清单插第 4 项知识图谱查询指引（四命令+场景+防复潮提示），原 4-6 顺延为 5-7；铁律节零变化 |
| 修改 | docs/prompt/_extracted.json | 机械提取重跑产物 |
| 修改 | docs/prompt/explore.md | prompt 正文块替换为 _extracted.json 逐字镜像（脚本回验断言） |
| 修改 | .claude/skills/sillyspec-explore/SKILL.md | 「你可以做的事」节补「查知识图谱」能力段；frontmatter name/description 逐字不变（触发词面零变化） |

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

explore 的调查兵器库只有 rg/ls/cat 文本考古——话题涉及影响面/历史决策/需求谱系时看不到结构化事实（已否决方案、FR 取代链、变更交付面）。本仓 2026-10-08-knowledge-graph 已交付全只读图查询面（impact/neighbors/path/summary，全 JSON 出口），explore 只需把它接进 prompt 操作清单与技能卡能力段：改 prompt 源 src/stages/explore.js（操作清单插一项，铁律与只读姿态零变化——graph 命令全只读不破界），镜像文档走既有 _extract.mjs 机械提取纪律逐字同步，技能卡补能力段但 description 触发词面不动（不改变技能触发行为）。选 prompt 指引而非新步骤：explore 是 1 步无结构阶段，能力以兵器库形式注入而非流程化。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- stages/explore.js definition.steps[0].prompt 文本增一项操作指引（渲染面 `sillyspec run explore` 输出随之多该段）；step 结构/数量/铁律/outputHint 零变化。
- 无函数签名/端点/文件格式变更；SKILL.md 是静态文档（init 拷贝源），frontmatter 逐字不变。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

   不适用：纯 prompt/文档文本变更，无事件面。N/A。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

   不适用：改动面是静态源文件（git 管理并发），无运行时共享态。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

   不适用：prompt 按次渲染无状态；graph 命令调用是即起即落的只读进程。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

   graph 命令锚 cwd/.sillyspec（或 --spec-dir），explore 会话内执行无串台面；技能卡随 init 拷贝到各项目但命令各查各仓。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：旧项目无 knowledge graph 能力（sillyspec < 3.33 未装图命令）时 explore prompt 指引落空——agent 跑命令报 unknown subcommand 后自然回退 rg 考古（fail-soft，无阻断面）；后续 init 升级即补齐。接受：指引措辞是「优先」非「必须」。放弃的方案：把 graph 查询做成 explore 独立步骤（--wait 流程化）——弃，explore 的价值恰在无结构自由姿态，流程化会把思考伙伴变成向导机；在 CLI 侧为 explore 注入图预取数据（{GRAPH_FACTS} 占位符）——弃，探索话题不可预知，全量注入是浪费且复刻知识注入面已有的活。
