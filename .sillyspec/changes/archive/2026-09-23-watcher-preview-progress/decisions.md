---
author: qinyi
created_at: 2026-09-23 16:07:47
---

# 决策：watcher 预览进度账本

> change: 2026-09-23-watcher-preview-progress
> 会话内与用户共同裁定（2026-09-23），此处正式落章

## D-001@v1 单表 + authority 列（否决双账本先行）
- **裁定**：预览行写入六表本表，带 `authority` 来源章；不建独立预览文件。
- **否决理由**：双账本要付两次设计成本（先隔离后融合）；读侧保险丝（D-003）出现后单表方案拿到双账本的低爆炸半径，集成度更好。
- source=user（对话裁定）；evidence=2026-09-23 会话「并发/覆盖可实现性」讨论，用户以乐观锁+主键 upsert 论证可行性，引擎事实核实后成立。

## D-002@v1 并发前提 = node:sqlite 原生 WAL
- **裁定**：watcher 作为第二写者接入同一 progress db，依赖 db-engine 现配（WAL + busy_timeout=5000）+ 短连接写纪律；不建额外锁协议。
- **依据**：引擎实为 node:sqlite（非 sql.js WASM——known-issues 陈条已勘误、conventions 已落常驻条目）；乐观锁（版本列）留作 B 计划，当前写冲突面（毫秒级短窗）用 busy 重试足够。
- source=user（两次纠偏引擎事实）；evidence=src/db-engine.js + conventions「进度库引擎 = node:sqlite」条目。

## D-003@v1 读侧保险丝：DB 查询层缺省过滤预览
- **裁定**：读方法统一追加 `authority='cli' OR IS NULL` 条件（单点），既有十几个消费者零改动；预览只经显式出口（--preview / readPreviewProgress / handoff 段）可见。
- **理由**：把「authority 维度摊给所有读者」的爆炸半径收敛为 db 层一个 WHERE；这是单表方案（D-001）成立的关键一步。
- source=会话收敛（协调者提出、用户认可方向）。

## D-004@v1 预览粒度 = 阶段级（steps 级留 v2）
- **裁定**：watcher 只投影 stages 表预览行；具名步骤↔工件映射不可靠（推断无依据），不做 steps 预览。
- source=design 判据（watcher inferEvents 的粒度实证：阶段标签可靠、步骤归因无信号）。

## D-005@v1 watcher 写纪律：短连接 + fail-open + 永不触 cli 行
- **裁定**：每轮一次 open→写→close；任何失败 warn 跳过（事件流不受影响）；存在性条件进 SQL（`WHERE authority='watcher'`），cli 行在 SQL 层就不可中招。
- source=会话收敛。

## D-006@v1 门禁证据隔离（红线）
- **裁定**：预览行永不进入 gate/fake-check/审批判定输入面（「预览管发生了什么，实测管过不过」——用户原话边界）；FR-08 常驻测试钉。
- source=user。

## D-007@v1 平台同步排除预览（v1 不推平台）
- **裁定**：serializeForSync 读法被保险丝天然过滤，平台载荷零变化；平台侧预览展示等 events 端点部署后另件立项。
- source=user（「v1 非目标」裁定）。

## D-008@v1 green-cache 预热 rider 不入本件
- **裁定**：watcher 闲窗预热 green-cache 是正交增强，另件（R12 候选）；本件范围钉死在预览账本。
- source=会话收敛（范围纪律）。
