---
author: flow-machine-draft
created_at: 2026-10-08T16:45:36.392Z
---
# 提案书（Proposal）— 2026-10-09-graph-dump-layout

## 动机

任务原话转写：平台仓 2026-10-09-knowledge-graph-fullmap 跨仓前置：knowledge graph dump --layout 子命令——输出全量 {nodes:[{id,type,label,x,y}], edges:[{s,t,type,strength}], stats:summary 同源}；布局=归档原型 prototype-data-gen.cjs 逐行移植（comm 粗分组：decision/fr 按域、module 单组、file 按顶级目录、doc 单组、change、ql、其他；簇 count 降序；主环 sqrt(gi+1)*300；簇内 16*sqrt(j+1) 按节点序；黄金角 2.39999；相位 +gi；Math.round）；确定性硬约束（同输入两次调用逐位一致）；缺 --layout 回 usage 错。

成功标准：
- sillyspec knowledge graph dump --layout --json 输出 ok:true + nodes 数=summary nodes 数 + 坐标全整数
- 连续两次调用 JSON 逐字节一致（确定性）
- dump 不带 --layout 回 layout_required usage 错不崩
- USAGE 行与 stages available 收编 dump
- 同簇节点抽样距离小于跨簇抽样（粗分组视觉成立）
- 既有 11 用例零回归；lint 零问题

## 变更范围

按成功标准机械推导，共 6 条验收面：
1. sillyspec knowledge graph dump --layout --json 输出 ok:true + nodes 数=summary nodes 数 + 坐标全整数
2. 连续两次调用 JSON 逐字节一致（确定性）
3. dump 不带 --layout 回 layout_required usage 错不崩
4. USAGE 行与 stages available 收编 dump
5. 同簇节点抽样距离小于跨簇抽样（粗分组视觉成立）
6. 既有 11 用例零回归；lint 零问题

## 成功标准（可验证）

1. sillyspec knowledge graph dump --layout --json 输出 ok:true + nodes 数=summary nodes 数 + 坐标全整数
2. 连续两次调用 JSON 逐字节一致（确定性）
3. dump 不带 --layout 回 layout_required usage 错不崩
4. USAGE 行与 stages available 收编 dump
5. 同簇节点抽样距离小于跨簇抽样（粗分组视觉成立）
6. 既有 11 用例零回归；lint 零问题
