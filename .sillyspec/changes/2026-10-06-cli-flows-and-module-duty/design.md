---
author: flow-machine-draft
created_at: 2026-10-05T16:43:34.502Z
---
# 设计记录（Design Record）— 2026-10-06-cli-flows-and-module-duty

> 四节每节必答——问题行原样保留（勿删勿改勿用答案替换），答案另起一行写在问题行下方；小改动可写「不适用：<理由>」；flow done 空节拒收。
> 需要列改动文件时加独立「## 文件变更清单」章节+表格（| 操作 | 路径 | 说明 |）——章节标题是 parseFileChangeList 的识别面，勿写在「接口契约」节内（收口声明面解析不到会误报夹带嫌疑）。
> 四问原文/FR 标题/镜像任务行是收口锚——问题行/标题从本模板原样保留或复制，勿删勿改、勿用答案整块替换问题原文、勿手打重写（标点也要逐字：2026-10-05 三度实证——句号手写成问号、答案整块替换问题原文均被锚对比拒收）。

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

倒推收口：「项目地图」方向经用户多轮评审后定论砍掉（module-map.yaml＋模块卡已覆盖该职责），探索变更 2026-10-05-project-map 已删除（DB 墓碑＋目录移除）。探索过程中产出两样与地图无关的资产补全，本变更只收这两样：①CLI 侧（sillyspec 命名空间）此前没有 flows 目录（平台侧 SillyHub/flows 已有 9 篇），新增 4 篇业务流程文档补齐——内容压缩自 AGENTS.md 选道、flow start 命令输出、README 工作流、capability-highlights、module-map 既有事实，不新造口径；②12 张 CLI 模块卡补「职责」节一行实文——缺节是探索时按 module-map 机器枚举暴露的文档债，补的是模块卡本就该有的内容。地图文件、map-refresh 刷新机制、README 链接行、.runtime 原型脚本全部随方向砍掉清理，不留残留。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

无代码接口变化。新增 4 篇 docs 命名空间 markdown（`.sillyspec/docs/sillyspec/flows/`）；12 张模块卡各插入一个「## 职责」节（卡片其余内容未动）。对外可见行为变化：无。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

不适用：纯静态文档，无输入与事件序；内容取自仓内稳定事实源（AGENTS/README/module-map）。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

卡片编辑为本会话独占（多 agent 纪律下 Edit 前已重读最新盘面）；flows/ 为全新目录无碰撞面；不触碰 SillyHub/ 平台侧同步副本。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

安全：全部产物已落盘；未提交态即中断态，按「不 commit 半成品」纪律可恢复续跑，无运行时状态。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

不会：全部改动位于本仓 `.sillyspec/docs/sillyspec/` 命名空间内，不写绝对路径，不触碰平台仓。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：flows 文档口径与实际行为随时间漂移（后续变更改流程未同步文档）——沿用平台侧 flows 的既有维护纪律（module-docs-sync-on-archive 归档对账），文档属人维护面、无 generator 声明。试过但放弃的方案：项目地图 docs/PROJECT-MAP.md＋map-refresh 自动刷新机制＋业务域/问答投影——用户多轮评审（六章叙事「乱」→索引卡「迷路」→手挑问答「要机制」→flows 投影「要真实内容」→最终「本身就存在了」）定论砍掉：module-map＋模块卡已覆盖该职责，机制冗余；探索变更已删除，原型产物全部清理。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 新增 | .sillyspec/docs/sillyspec/flows/lightweight-change.md | 轻量变更流程（flow 协议） |
| 新增 | .sillyspec/docs/sillyspec/flows/full-pipeline.md | 完整流程五阶段 |
| 新增 | .sillyspec/docs/sillyspec/flows/platform-sync.md | 平台同步与远端派发 |
| 新增 | .sillyspec/docs/sillyspec/flows/recovery-concurrency.md | 中断恢复与多 agent 并发安全 |
| 修改 | .sillyspec/docs/sillyspec/modules/stages.md | 补「职责」节一行实文 |
| 修改 | .sillyspec/docs/sillyspec/modules/runtime.md | 同上 |
| 修改 | .sillyspec/docs/sillyspec/modules/cli-entry.md | 同上 |
| 修改 | .sillyspec/docs/sillyspec/modules/progress.md | 同上 |
| 修改 | .sillyspec/docs/sillyspec/modules/docs-consistency.md | 同上 |
| 修改 | .sillyspec/docs/sillyspec/modules/machine-interface.md | 同上 |
| 修改 | .sillyspec/docs/sillyspec/modules/redlines.md | 同上 |
| 修改 | .sillyspec/docs/sillyspec/modules/dispatch.md | 同上 |
| 修改 | .sillyspec/docs/sillyspec/modules/sillyhub-mcp.md | 同上 |
| 修改 | .sillyspec/docs/sillyspec/modules/migration.md | 同上 |
| 修改 | .sillyspec/docs/sillyspec/modules/workflow.md | 同上 |
| 修改 | .sillyspec/docs/sillyspec/modules/dashboard.md | 同上 |
