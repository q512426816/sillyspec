---
author: flow-machine-draft
created_at: 2026-10-19T10:31:43.568Z
---
# 设计记录（Design Record）— 2026-10-19-freeze-filter-tool-scaffold

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

消防工作区 4e9eb05b 实证：change.patch 的 61 个文件里 50 个是 `.claude/`（29）、`.codex/`（21）与 `CLAUDE.md`，真实前端交付被淹没。既有冻结面只剔 `.sillyspec/`（除 docs/）。本次在 `flow-parity.js` 增加 `isToolGovernancePath`（六类 agent 工具目录 + 根级 `CLAUDE.md`），并接入三处「交付面」判定：`filterCommittedFace`（提交面冻结）、`collectFreezeFiles` 的 deliverable（独占树脏面）、`scanOrphanFace` 的 deliverable（孤儿提交守卫）。AGENTS.md / INSTRUCTIONS.md 属项目级指令，明确保留为交付面。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- 新增导出 `isToolGovernancePath(path)` → boolean（纯函数，反斜杠归一）。
- `filterCommittedFace` 行为变更：返回面剔除工具治理模板（签名不变）。
- `collectFreezeFiles` / `scanOrphanFace` 的 deliverable 判定同步剔除（签名不变）。
- 无新命令/端点/文件格式；change-patch.json 结构零变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
   纯过滤函数无时序依赖；提交面与脏面各自采集后过同一判定，先后顺序不影响结果。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
   纯读过滤，无写路径；并行会话在 `.claude/**` 的提交不再进入本变更冻结面，进一步降低交叉污染面。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
   过滤在 freeze 计算时点执行；失败不改变既有 fail-soft 路径。只改模板的变更会得到空冻结面并走既有空面哨兵（有意设计：工具治理面不是业务交付）。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
   判定只看路径前缀，与工作区/仓无关；跨仓 repos[] 的 files 过滤仍走 `filterDeliverableFiles`（本次未改其 tool 档，避免影响 apply 语义），跨仓模板混入留待后续按需处理。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：只改 `.claude/skills/**` 的合法 skill 变更将不再进入 change.patch（归档仍保留变更文档与 git 历史）——这是显式取舍：工具注入面不算业务交付，且此类变更常为 init 模板刷新，正是生产污染源。放弃方案：①按文件内容/类别智能判定——漂移且误伤合法 skill 编写；②把 `filterDeliverableFiles` 的 tool 档也硬剔——会影响 worktree apply 的交付语义，超出本次范围；③剔除 AGENTS.md——它是跨 harness 的项目指令，可能是真实交付（本仓 3.33.1 刷新即例），故保留。
