---
author: flow-machine-draft
created_at: 2026-10-19T10:55:18.744Z
---
# 设计记录（Design Record）— 2026-10-19-cross-repo-face-tool-filter

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

平台评审 P2 清偿 + 口径对齐两件：①`collectRepoActual` 的「注册路径不可达」分支此前把本机绝对路径拼进 `degradedReason`，该文案随 change-patch.json 冻结并透出到平台资产卡——改为引用 `local.yaml repos.<key>`（repoPath 字段保留供本机诊断，不进文案）；②`reconcileCrossRepoPlan` 的跨仓文件面此前只过 `filterDeliverableFiles`（platform 档），工具治理模板照进 rows/totals/repos[].patch——在 repoFiles 源头加 `isToolGovernancePath` 过滤（与主仓冻结面同源单一判定），三态计数/patch 正文/未标注探测命中计数随之同口径。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- `collectRepoActual` 返回值 `degradedReason` 文案变更（无绝对路径）；其余字段（含 repoPath）不变。
- `reconcileCrossRepoPlan` 行为变更：跨仓 rows/totals/repos[].patch 不再含 `.claude/.codex/.gemini/.opencode/.zcode/.cursor` 与根级 `CLAUDE.md`。
- flow done 未标注跨仓探测的命中文件数同口径过滤（advisory 文案不变）。
- `isToolGovernancePath` 定义位置不变（flow-parity.js，scope-audit.js 新增导入——无循环依赖，已核 flow-parity 的依赖闭包不引 scope-audit）。
- 无新命令/端点/文件格式。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
   过滤在采集后、对账前一次性执行，纯路径判定无时序依赖；迟到提交落在窗口内同样被过滤。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
   纯读过滤；与并行会话在跨仓的写并发沿用既有窗口/token 归因语义。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
   filter 失败无路径（纯函数）；降级文案变更只影响新冻结件，存量归档的旧文案不回改（读侧按原样展示，属历史事实）。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
   路径判定只看仓内相对路径前缀，各仓独立；跨仓里合法的 skill 专用仓（极端形态）会被整面剔除——与主仓面同取舍，已在风险节披露。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：跨仓 patch 与 totals 的既有读方（平台全屏预览/实时对账卡）看到的文件数变小——这是口径修正（模板本就不该计入交付），非数据丢失；模板改动仍在 git 历史与归档文档。放弃方案：①只过滤 patch 不过滤 rows——会造成 totals 与 patch 文件数不一致（生产 112 vs 110 的既有失真复刻）；②在 filterDeliverableFiles 层过滤——会改变 worktree apply 的交付语义（tool 档是软桶），影响面超出本变更。
