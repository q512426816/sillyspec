---
author: flow-machine-draft
created_at: 2026-10-08T17:29:00.160Z
---
# 设计记录（Design Record）— 2026-10-09-explore-arsenal-map

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | src/stages/explore.js | 操作清单原第 3/4 项（rg 1 行 + 图谱 8 行）重组织为「话题→兵器映射」小节（4 行：rg/search/graph/status）；清单 7 项→6 项；铁律节零变化 |
| 修改 | docs/prompt/_extracted.json | 机械提取重跑产物 |
| 修改 | docs/prompt/explore.md | prompt 正文块逐字镜像（脚本回验） |
| 修改 | .claude/skills/sillyspec-explore/SKILL.md | 「调查代码库」行与「查知识图谱」段合并为同形态映射块；frontmatter 逐字不变 |
| 修改 | test/explore-graph-guidance.test.mjs | 钉子测试重组织断言（映射节标题/四命令新锚串口径）+ 增 search/status 两兵器断言 |

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

2026-10-08-explore-knowledge-graph 把图查询以 8 行罗列插进操作清单后清单达 7 项——逐条堆兵器会稀释探索注意力。本变更按评审建议（用户采纳）重组织为「话题→兵器映射」一小节：词面考古 rg / 坑史检索 search / 关系面 graph / 在途面 status 四行各带场景，顺带补齐第一梯队两兵器（knowledge search 四层召回防坑考古、sillyspec status 在途变更防撞车）。映射形态按「话题类型」而非「命令族」组织——agent 拿到话题先对号入座再选兵器，prompt 净变短（替换 9 行为 6 行）且可扫。技能卡同步同形态保持双面一致；description 触发词面逐字不动（不改变技能触发行为）。钉子测试断言口径随映射形态更新（neighbors/summary 与 graph 前缀同行共享），并扩两新兵器断言。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- stages/explore.js definition.steps[0].prompt 文本重组织（操作清单 6 项 + 映射节）；step 结构/数量/铁律/outputHint 零变化；`sillyspec run explore` 渲染随新形态。
- 无函数签名/端点/文件格式变更；SKILL.md frontmatter 逐字不变。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

   不适用：纯 prompt/文档文本变更，无事件面。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

   不适用：改动面是 git 管理的静态源文件，无运行时共享态。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

   不适用：prompt 按次渲染无状态；兵器命令（search/status/graph）全只读即起即落。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

   兵器命令均锚 cwd/.sillyspec（或 --spec-dir），各会话各查各仓，无串台面。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：映射行内塞多命令（关系面一行含 impact/neighbors/path/summary 四命令）信息密度高——单行过长可能被 agent 扫读跳过。缓解：行内用顿号分层（主命令 impact 打头、推理链与健康度退居从句）；钉子测试锚串保证四命令不丢。旧版 CLI（<3.33）项目跑新兵器命令报 unknown subcommand 自然回退 rg（fail-soft，与 graph 兵器同款既裁边界）。放弃的方案：兵器逐条加操作项（search/status 各一项）——弃，清单会回到 9 项且场景与兵器割裂；CLI 侧预取注入（{ARSENAL_FACTS} 类占位符）——弃，探索话题不可预知，全量预取浪费且复刻知识注入面。
