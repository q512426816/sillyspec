---
author: flow-machine-draft
created_at: 2026-10-14T13:26:29.480Z
---
# 提案书（Proposal）— 2026-10-14-tick-burst-sidecar-gate

## 动机

任务原话转写：动机与背景：
会话首轮议题（用户：「最近的变更单怎么又经常出现任务多个勾选的问题了」）诊断清偿。现状两级盲区：①CLI 逐格快连点对节奏门不可见——2026-10-07 thin-tasks-v3 起 CLI 精确事件是单格跳、采样合并跳被去重（官方路径成检测盲区；近期主流形态实证：scale-large-evidence 6 格 2 秒内、turbo-guide-tier-copy 4 格 1 秒内）；②直接 Edit 一把翻格可检出但 2026-10-13 起证据完备只降 advisory。2026-10-14-timeline-ticktime-anchor-scope 已落地 task-ticks.jsonl 侧车（毫秒时戳、随归档进 git、跨机可读），但只用于 timeline 显示。本变更把节奏判定接上侧车——CLI 与直接 Edit 两条路径同判。用户已确认档位：检出后维持 10-13 语义（证据完备=advisory+留痕；零证据=硬拒不变）。

成功标准：
- 新增纯函数 detectTickBurst（src/sentinel-assertions.js）：tickLog（{ts,task} 集）同任务取最早、坏行跳过、按时戳排序后按相邻间隔窗口（缺省 60s，参数可覆写）分簇，最大簇 size>=2 即产出与事件流同形的 batchTick 记录（from/to=CLI 勾序计数，detail 标注「侧车突发」）；不足两格/空输入返回 null（fail-open）
- flow done 节奏门接线：事件流检测为空时回退读侧车（changeDir/task-ticks.jsonl 经 parseTickLog）做突发检测；事件流结果优先、不双重报告；检出走既有 resolveBatchTickAction 裁决（证据完备 advisory+flow-state batch_ticked 留痕；零证据维持硬拒）；侧车缺失/不可读按无证据静默
- 渐进勾选（相邻间隔超窗）零误报；用归档 watcher 事件流的 CLI task-done 时戳回测：近期 CLI 快连点形态变更可被检出
- 新增/更新测试跑绿；全量测试 + lint 绿

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. 新增纯函数 detectTickBurst（src/sentinel-assertions.js）：tickLog（{ts,task} 集）同任务取最早、坏行跳过、按时戳排序后按相邻间隔窗口（缺省 60s，参数可覆写）分簇，最大簇 size>=2 即产出与事件流同形的 batchTick 记录（from/to=CLI 勾序计数，detail 标注「侧车突发」）；不足两格/空输入返回 null（fail-open）
2. flow done 节奏门接线：事件流检测为空时回退读侧车（changeDir/task-ticks.jsonl 经 parseTickLog）做突发检测；事件流结果优先、不双重报告；检出走既有 resolveBatchTickAction 裁决（证据完备 advisory+flow-state batch_ticked 留痕；零证据维持硬拒）；侧车缺失/不可读按无证据静默
3. 渐进勾选（相邻间隔超窗）零误报；用归档 watcher 事件流的 CLI task-done 时戳回测：近期 CLI 快连点形态变更可被检出
4. 新增/更新测试跑绿；全量测试 + lint 绿

## 成功标准（可验证）

1. 新增纯函数 detectTickBurst（src/sentinel-assertions.js）：tickLog（{ts,task} 集）同任务取最早、坏行跳过、按时戳排序后按相邻间隔窗口（缺省 60s，参数可覆写）分簇，最大簇 size>=2 即产出与事件流同形的 batchTick 记录（from/to=CLI 勾序计数，detail 标注「侧车突发」）；不足两格/空输入返回 null（fail-open）
2. flow done 节奏门接线：事件流检测为空时回退读侧车（changeDir/task-ticks.jsonl 经 parseTickLog）做突发检测；事件流结果优先、不双重报告；检出走既有 resolveBatchTickAction 裁决（证据完备 advisory+flow-state batch_ticked 留痕；零证据维持硬拒）；侧车缺失/不可读按无证据静默
3. 渐进勾选（相邻间隔超窗）零误报；用归档 watcher 事件流的 CLI task-done 时戳回测：近期 CLI 快连点形态变更可被检出
4. 新增/更新测试跑绿；全量测试 + lint 绿
