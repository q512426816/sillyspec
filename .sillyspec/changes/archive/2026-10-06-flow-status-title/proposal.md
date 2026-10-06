---
author: flow-machine-draft
created_at: 2026-10-06T11:05:59.743Z
---
# 提案书（Proposal）— 2026-10-06-flow-status-title

## 动机

任务原话转写：flow start 已把变更标题（title）写入进度库（面板显示用），但 flow status 人类渲染只打变更名——恢复/查看时看不到标题语义，断点恢复缺上下文。把标题显示出来。

成功标准：
- DB 登记过 title 的活跃变更，flow status 人类输出包含「标题：<title>」行
- flow status --json 输出增加 title 字段（无记录时为 null）
- 无 DB 或无 title 时输出与现状一致（不新增标题行，json 里 title=null）

## 变更范围

按成功标准机械推导，共 3 条验收面：
1. DB 登记过 title 的活跃变更，flow status 人类输出包含「标题：<title>」行
2. flow status --json 输出增加 title 字段（无记录时为 null）
3. 无 DB 或无 title 时输出与现状一致（不新增标题行，json 里 title=null）

## 成功标准（可验证）

1. DB 登记过 title 的活跃变更，flow status 人类输出包含「标题：<title>」行
2. flow status --json 输出增加 title 字段（无记录时为 null）
3. 无 DB 或无 title 时输出与现状一致（不新增标题行，json 里 title=null）
