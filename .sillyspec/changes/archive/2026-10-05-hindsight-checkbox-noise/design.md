---
author: flow-machine-draft
created_at: 2026-10-05T04:22:10.210Z
---
# 设计记录（Design Record）— 2026-10-05-hindsight-checkbox-noise

> 四节每节必答——答案直接写在问题下方；小改动可写「不适用：<理由>」；flow done 空节拒收。
> 需要列改动文件时加独立「## 文件变更清单」章节+表格（| 操作 | 路径 | 说明 |）——章节标题是 parseFileChangeList 的识别面，勿写在「接口契约」节内（收口声明面解析不到会误报夹带嫌疑）。

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

在 src/route-hindsight.js 加模块内函数 normalizeTaskCheckbox（`^(\s*[-*]\s+)\[[ xX]\]` → `$1[ ]` 的 gm 正则归一），computeHindsightMetrics 的 tasks 比对路在 contentSurface 之前对首版快照与终稿两侧先归一——勾选翻格是进度簿记不是内容改写，归一后翻格行逐字相等不计改写，任务文本真实改写仍计。design 比对面不归一（design 无任务勾选形态，保持原口径）。

选 token 归一而非改 computeEditRatio 或改阈值：归一是纯结构形态过滤（固定 token 替换零语义判定，符合模块头 D-003 封闭面承诺），computeEditRatio 是 flow-draft 共享内核（动它波及起草面），阈值 0.6 本身没错——错的是分子把簿记当改写。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- computeHindsightMetrics 内部新增 tasks 面预处理（normalizeTaskCheckbox，模块内私有不导出）——导出签名与返回结构零变化
- 行为变化：纯勾选翻格的变更 tasksRewriteRatio 从 ~N/(N+1)（恒超阈）变为 0；标记落库与 flow start 点名提示随之不再因翻格触发
- 归一仅作用于 tasks 比对双侧；design 比对、盲维计数、实测失败计数口径不变

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/route-hindsight.js | normalizeTaskCheckbox + tasks 比对路归一 + 头注释口径 |
| 修改 | test/route-hindsight.test.mjs | ⑤ 组：纯翻格零信号 / 翻格+真实改写只计文本行 / design 面不归一 |

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

不适用：无事件流输入——比对的是收口时点静止文件（首版快照 vs 终稿），无乱序面。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

不适用：computeHindsightMetrics 纯只读（读快照/终稿/记录面），不写任何共享文件；归一是无状态字符串变换。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

不适用：无新增状态；归一发生在计算瞬间，中断即无输出，与原先语义一致。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

不适用：比对输入按 changeDir/specBase 局部派生（既有逻辑不变），归一不引入任何跨仓面。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：正则把非任务行误归一——行首 `- [x]`/`- [ ]` 形态在 tasks.md 语义域内就是任务勾选框，误归一面只可能是 agent 在 tasks.md 写 checkbox 形态的非任务内容（极反形态）；且归一只影响改写比分子，不碰文件本体。
试过放弃：① 改 computeEditRatio 忽略 checkbox 前缀——共享内核，动它波及 flow-draft 起草面口径，放弃；② 阈值从 0.6 提到 >0.8——治标：4 任务全勾 0.8、5 任务 0.833 恒穿过任何 <1 阈值，翻格噪声是分子问题不是阈值问题，放弃。
