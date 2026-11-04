---
author: flow-machine-draft
created_at: 2026-11-04T07:07:30.059Z
---
# 设计记录（Design Record）— 2026-11-04-fence-aware-task-rows

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
新增 src/md-fence.js 共享 util：`fenceScan(md)` 逐行扫描 ```/~~~ 围栏开合，返回每行 in-fence 标记数组与未闭合标志/起始行号。task-tick.js 的 collectRows 按标记过滤行；翻格替换由「全文正则 m 标记一把替换」改为「围栏感知定位目标行 → 仅该行替换 checkbox 态字符」——字节级保留靠按 \n split 重 join（\r 留在行内不丢，CRLF 透明）。围栏语法取 CommonMark 实用子集：开栏=行首 ≤3 空格缩进的 ``` 或 ~~~（可带信息串），闭栏=同字符、长度不小于开栏、行内仅空白的栏线。依据：superpowers #2436（task-brief 未闭合围栏把 177 行任务吞成 1159 行五任务简报）；本仓 grep 证实 task 行正则消费方 12+ 处，本变更只接 task-tick（tick/进度回显真源），其余消费方按需收编。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
新增导出 src/md-fence.js：`fenceScan(md) → { inFence: boolean[], unclosed: boolean, fenceStartLine: number|null }`。task-tick.js 的 tickTasksMd 返回值新增字段 `unclosedFence: boolean`（纯函数面加字段，向后兼容——既有调用方多拿一个字段零破坏）；CLI `task tick` 输出新增一行围栏 advisory 告警。无破坏性签名变化；tasks.md 文件格式不变。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
   不适用——纯函数解析静态文本，输入即文件当前内容，无事件时序。
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
   翻格仍走既有 writeAtomicSync 原子写；fenceScan 纯函数无共享态，两执行体各持各的解析结果。
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
   安全——解析幂等无状态，任意时刻重入重解析结果一致；翻格中断由原子写保证半态不落盘。
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
   不会——util 无全局态，各仓各变更独立解析各自的 tasks.md。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？
最大风险＝围栏判定子集与真实渲染差异（4 空格缩进代码块、行内三反引号）导致漏判——漏判方向退化为现状（多计示例行）而非误删真实行，且 tasks.md 实际写作形态（含 ≤3 空格缩进的 ```/~~~）已被子集覆盖。放弃方案①：一次改齐 12+ 个 task 行正则消费方（ceremony-tier/blast-surface/commit-suggest 等）——否决，回归面过大且多数消费方只需计数不做翻格，幻影行影响面窄，按需收编（本变更 design 留收编指针）。放弃方案②：引入 Markdown AST 库（marked/unified）做精确解析——否决，违反零依赖纪律且引入 ms 级启动税，tasks.md 是强约定格式不值得全量 AST。
