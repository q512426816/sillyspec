---
author: flow-machine-draft
created_at: 2026-10-05T16:43:34.502Z
---
# 提案书（Proposal）— 2026-10-06-cli-flows-and-module-duty

## 动机

任务原话转写：动机：项目地图方向经用户多轮评审后定论砍掉——module-map.yaml＋模块卡已覆盖该职责，无需新地图/索引/刷新机制（探索变更 2026-10-05-project-map 已删除留墓碑）。探索过程中产出两样与地图无关的资产补全，倒推收口：其一，CLI 侧（sillyspec 命名空间）此前没有 flows 目录（平台侧 SillyHub/flows 已有 9 篇），本仓业务流程只能散读 README/AGENTS；其二，12 张 CLI 模块卡缺「职责」节，是机制化探索暴露的文档债。

成功标准：
- .sillyspec/docs/sillyspec/flows/ 新增 4 篇 CLI 业务流程文档（lightweight-change 轻量变更 / full-pipeline 完整五阶段 / platform-sync 平台同步与远端派发 / recovery-concurrency 中断恢复与多 agent 并发），结构含「目标 / 参与模块 / 流程摘要 / 关键规则」与平台侧 flows 同构
- 12 张 CLI 模块卡（stages / runtime / cli-entry / progress / docs-consistency / machine-interface / redlines / dispatch / sillyhub-mcp / migration / workflow / dashboard）各补「职责」节一行实文
- 不引入任何新地图 / 索引 / 刷新机制：docs/PROJECT-MAP.md 不存在，README.md 与 HEAD 一致

## 变更范围

按成功标准机械推导，共 3 条验收面：
1. .sillyspec/docs/sillyspec/flows/ 新增 4 篇 CLI 业务流程文档（lightweight-change 轻量变更 / full-pipeline 完整五阶段 / platform-sync 平台同步与远端派发 / recovery-concurrency 中断恢复与多 agent 并发），结构含「目标 / 参与模块 / 流程摘要 / 关键规则」与平台侧 flows 同构
2. 12 张 CLI 模块卡（stages / runtime / cli-entry / progress / docs-consistency / machine-interface / redlines / dispatch / sillyhub-mcp / migration / workflow / dashboard）各补「职责」节一行实文
3. 不引入任何新地图 / 索引 / 刷新机制：docs/PROJECT-MAP.md 不存在，README.md 与 HEAD 一致

## 成功标准（可验证）

1. .sillyspec/docs/sillyspec/flows/ 新增 4 篇 CLI 业务流程文档（lightweight-change 轻量变更 / full-pipeline 完整五阶段 / platform-sync 平台同步与远端派发 / recovery-concurrency 中断恢复与多 agent 并发），结构含「目标 / 参与模块 / 流程摘要 / 关键规则」与平台侧 flows 同构
2. 12 张 CLI 模块卡（stages / runtime / cli-entry / progress / docs-consistency / machine-interface / redlines / dispatch / sillyhub-mcp / migration / workflow / dashboard）各补「职责」节一行实文
3. 不引入任何新地图 / 索引 / 刷新机制：docs/PROJECT-MAP.md 不存在，README.md 与 HEAD 一致
