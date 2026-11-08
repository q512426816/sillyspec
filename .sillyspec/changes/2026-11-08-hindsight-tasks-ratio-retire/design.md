---
author: flow-machine-draft
created_at: 2026-11-08T03:50:26.627Z
---
# 设计记录（Design Record）— 2026-11-08-hindsight-tasks-ratio-retire

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

单点退役判定通路：`src/route-hindsight.js` 的 `HINDSIGHT_THRESHOLDS` 删除 `tasksRewriteRatio` 键、`markHindsight` 删除该路超阈判定与 reasons 拼装；`computeHindsightMetrics` 的 tasks 改写比**计算保留**（观测面，D-003 自校准回路未来重定阈的依据）。flow.js 侧零改动——收口接线（flow.js:2671-2675）与同意门渲染读的都是 markHindsight 产物与标记文件，判定退役后正常变更不再落标记，门自然不再被误拦。

选判定退役而非调阈值/删种子/降 advisory 的理由：现行种子形态（2026-10-07-thin-tasks-v3：成功标准逐条转写，验收句≠实现步骤）下正常改写与需求不清的改写不可区分——阈值无论调到多少都无法分离信号与噪音（0.875/0.8 的两次误报即实证）；种子回退破坏 v3「任务面归你」契约；降 advisory 留误报噪音仍污染提示面。design 改写比（种子=四问钉死模板，真需求不清会大改）/盲维/实测失败三路信号不受影响，保留。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- `HINDSIGHT_THRESHOLDS`：导出对象删除 `tasksRewriteRatio` 键（designRewriteRatio/blindDims/testFailures 三键不变）——消费方仅 markHindsight 与测试。
- `markHindsight`：不再因 tasksRewriteRatio 产生 reasons；标记文件 metrics 字段照写全部四路数值（含 tasksRewriteRatio，向后兼容读取面）。
- `computeHindsightMetrics`：返回对象与计算口径零变化（含 tasksRewriteRatio 数值与 raw）。
- `readHindsightHint`/`readHindsightMark`：零改动（旧标记文件含该字段本来就透传）；提示文案四路指标展示保持现状。
- CLI 命令签名：无变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

不适用——判定退役是纯减法（少一路 reasons 拼装），无新增时序假设；快照首写者胜机制不变。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

不适用——标记文件仍为 per-repo 单条整文件原子写（writeAtomicSync），写频不因本变更增加。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

不适用——存量标记文件（旧格式含 tasksRewriteRatio）由 readHindsightMark 原样读取，门行为对存量标记不变（仍拦，直到被 --no-prestage/adopt 消费）；本变更退役后新收口不再产生该路新标记。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

不适用——标记与快照均在各自 specBase/.runtime 下，作用域机制不变。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

风险：退役后「需求不清却硬走轻量」的路径少一路事后信号——但该路信号已被实证为噪音（正常改写与不清改写同分布，flow start 横幅明文要求改写），真实信号仍由 design 改写比（种子=钉死模板，重写才超阈）/盲维/实测失败三路承担。次要风险：消费 HINDSIGHT_THRESHOLDS.tasksRewriteRatio 的外部脚本（若有）会 undefined——仓内 grep 仅测试消费，随本变更同步改。

放弃方案：① 阈值上调至 0.95/1.0——正常全改写即可达 1.0，治标且留死代码；② 种子回退镜像锚形态——破坏 thin-tasks-v3「任务面归你、按实现路径自由增删改」契约（2026-10-07 已定方向）；③ 降为 advisory 不进同意门——仍产出误报提示污染每次 start；④ 连计算一并删除——丢失观测面，未来想重定阈（如按「种子行删除率」新口径）无数据可用。

## 文件变更清单

| 操作 | 路径 | 说明 |
|------|------|------|
| 修改 | src/route-hindsight.js | HINDSIGHT_THRESHOLDS 删 tasksRewriteRatio 键；markHindsight 删该路判定与 reasons；计算面不动 |
| 修改 | test/route-hindsight.test.mjs | 阈值断言与标记判定用例改新口径；计算断言保留；补旧标记兼容断言 |
| 修改 | test/prestage-consent-gate.test.mjs | 门构造从 tasksRewriteRatio:0.9 改 designRewriteRatio 通路；文案断言同步 |
| 修改 | test/flow-clarity-probe.test.mjs | 实测断言从「tasks 改写率超阈被标」改为「不再因 tasks 改写率标记」 |
