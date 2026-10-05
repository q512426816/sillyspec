---
author: flow-machine-draft
created_at: 2026-10-05T00:39:14.310Z
---
# 设计记录（Design Record）— 2026-10-05-knowledge-stats-freshness

> 四节每节必答——答案直接写在问题下方；小改动可写「不适用：<理由>」；flow done 空节拒收。
> 需要列改动文件时在「接口契约」节加「文件变更清单」表（| 新增/修改 | 路径 | 说明 |）。

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

在 src/knowledge-stats.js 新增导出函数 `resolveLastEventAt(runtimeDir)`：经 readKnowledgeHits 不传窗口参数读全量流（与既有 hasTelemetry 判定同一读取口径），对所有可解析 `at` 取 Date.parse 数值最大，返回该记录 `at` 原样 ISO 字符串，无有效记录返回 null。cmdKnowledgeStats 两个输出面消费它：`--json` 顶层新增 `lastEventAt` 字段；人类可读模式遥测计数行追加「数据截至 <YYYY-MM-DD>」。

选独立全量口径而不是挂进 buildHitMatrix，是因为矩阵/计数是「窗口内统计」口径（--since-days 截断），而数据新鲜度问的是「这条流最后一次写入是什么时候」——窗口缩小不该让「数据截至」跟着回退，两口径必须分离。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- 新增导出：`resolveLastEventAt(runtimeDir)` → `string | null`（src/knowledge-stats.js）
- `cmdKnowledgeStats --json` 顶层输出新增 `lastEventAt` 字段（string | null），既有字段不变
- 人类可读输出遥测计数行在有遥测时追加「数据截至 <YYYY-MM-DD>」段；无遥测不追加
- 文件变更清单：

| 新增/修改 | 路径 | 说明 |
|---|---|---|
| 修改 | src/knowledge-stats.js | 新增 resolveLastEventAt 聚合 + 两输出面接线 |
| 修改 | test/knowledge-stats.test.mjs | Test 8：lastEventAt 三情形 + 人类可读两分支 |

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
   成立——取最大值是数值比较，与落盘顺序无关；at 缺失/不可解析记录被跳过（与 readKnowledgeHits 窗口过滤跳过同类），全部不可解析时返回 null 而非抛错。
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
   读侧逐行 JSON.parse、坏行/残行跳过不抛（knowledge-hits.js R-04 契约），读取瞬间并发 append 至多让 lastEventAt 瞬时落后一条，下一读自然收敛；无写面，不引入新并发风险。
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
   安全——本变更纯只读，不落任何状态；中断无残留半成品。
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
   不会——runtimeDir 由调用方从 specDir 推导（与 matrix/frIndex 同源），各仓 .runtime 天然隔离；测试用 tmpdir fixture 同样隔离。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：口径混淆——若 lastEventAt 误用窗口内记录（buildHitMatrix 的 records），`--since-days 7` 时「数据截至」会显示 7 天内最新而非全量最新，读数失真。对策：函数只收 runtimeDir 不收窗口参数，类型签名层面杜绝窗口口径混入。
试过放弃：复用 matrix[0].lastHitAt（最高命中文件的最近命中）——它是窗口内且按文件聚合的口径，最高命中文件未必是最近写入的文件，且窗口截断失真，放弃。
