---
author: flow-machine-draft
created_at: 2026-11-12T16:08:02.096Z
---
# 设计记录（Design Record）— 2026-11-13-probe7-existing-tests-cap

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

三处小改，全部围绕探针 7（`src/verify-probes.js`）的既有用例候选链路：

① `renderProbe7Lines` 的既有用例候选行改为「前 5 + …共 N 个」展示帽（与同函数既有 `attribCell`/`hintCell` 的 `slice(0,5)` 先例同款）；② 同一渲染批次内按候选集内容签名去重——首卡全量（带帽）渲染，后续卡折叠为「同上（见 task-XX，共 N 个）」；③ `buildVerifyFacts` 在 `result.probe7` 在场时把 existingTests 全量去重后按候选集分组写入 verify-facts.json 顶层 `probe7ExistingTests` 段，兑现原注释「候选全量在 facts/trace」的承诺，md 只留展示帽与计数。

不改收集路径（`collectFrLinkedTests` 的注入条件与顺序全保持），不动矩阵其它列，不动 `verify-postcheck` 的解析口径（该行本就非门禁锚点）。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- `renderProbe7Lines(p7)` 签名不变；输出行内容变化：既有用例候选行从全量路径拼接 → 前 5 + 「…共 N 个（全量见 verify-facts.json probe7ExistingTests）」，第二张起共享同一集的卡输出「- ℹ️ 既有用例候选：同上（见 task-<首卡>，共 N 个）」。
- `probe7.tasks[]` 结构不变（`existingTests` 仍为全量，供 facts 写入消费）。
- `buildVerifyFacts(result, opts)` 输出新增可选顶层键 `probe7ExistingTests: [{ tasks: string[], count: number, files: string[] }]`；`result.probe7` 缺失时不落该键。
- `verify-facts.json` 的 `schemaVersion` 不升（新增键为可选读取，所有消费方按缺省处理）。
- CLI 命令对外的入参/退出码无变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
   成立。去重只依赖同一批次内 tasks 数组的顺序（渲染总是单趟正向遍历），候选集内容签名用排序后的路径集合计算，同一集不因收集顺序不同而漏判共享。facts 段按内容分组，与出现顺序无关。探针本身一次性生成，无迟到事件面。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
   无新增并发面。verify-result.md 与 verify-facts.json 的写入路径与现状完全一致（writeVerifyFacts 既有「CLI 全权写、幂等重算」语义未改）；两个会话跑不同变更时各写各的 changeDir，不共享文件。同一变更的重入重跑会把 facts 该段整段重算覆盖，无半合并态。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
   安全。去重映射是 `renderProbe7Lines` 调用内的局部变量，不跨调用、不落盘、不依赖会话状态；中断后重跑得到相同结果（纯函数给定相同 p7 输出相同行）。存量 verify-result.md 已存在的旧超长行不会被本变更自动改写（`--init` 幂等不覆盖已有正文）——修复只对修复后新生成/新补段的报告生效，属可接受边界。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
   不会。去重作用域=单次渲染调用（单个变更的探针 7 结果）；facts 段挂在单个 changeDir 下。跨仓 task 卡的路径本就按仓归属收集，签名按完整路径算，不同仓的路径不会误判为同集。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

- 最大风险：展示帽让 agent 失去「全量清单肉眼可见」的便利。缓解：全量改落 verify-facts.json 结构化段，且矩阵归属列本就已有 5 个硬帽 + 收集帽 20——信息并未丢失，只是从 md 散文移到机器底稿，与同函数既有先例一致。
- 放弃方案 A：把共享集的后续卡整行删除。放弃理由：卡片数量与顺序是 agent 复核时的锚点，删行会让矩阵结构「缺卡」，折叠比删除更保真。
- 放弃方案 B：只在收集侧把 `frLinkedExisting.files` 全局截断到 N。放弃理由：会改变预填语义（候选面板缩水），且无法解决同一行重复 N 份的根因；展示层折叠才是对的位置。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/verify-probes.js | renderProbe7Lines 既有用例候选行加展示帽 + 跨卡同集折叠；buildVerifyFacts 新增 probe7ExistingTests 段 |
| 修改 | test/pitfall-probe7-noise.test.mjs | 新增三用例覆盖 FR-01/02/03，既有 FR-10 用例不动 |
