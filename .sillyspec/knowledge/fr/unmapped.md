---
author: sillyspec-fr-index
---
# FR 索引 — unmapped（检索面-only 停车场）

> 【2026-10-03-fr-governance-telemetry 治理评估】本池残余 2 条（2026-11-02-knowledge-redomain-map 裁剪 208 条平台重复后；原 625 条为治理评估时点数）：88 个来源变更批的覆盖文件缺失或
> 推导不出真域（多为 2026-05~07 存量薄道产物，归档件无交付面记录）——显式降级「检索面-only」：
> 不进注入/查重/测试门比对面（既有行为不变），条目仅供 knowledge search 检索与人工翻阅。
> 机械可判域的 98 条已迁 daemon（ID 不换号）；后续归档流程与 redomain 通道持续收编新增存量。

## FR-unmapped-001 普通项目可创建 Workspace
变更：2026-05-27-platform-native-sillyspec
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 用户输入一个存在的普通代码目录 目标目录已存在 `.sillyspec`；When 用户执行 workspace scan 并创建 workspace 用户创建 workspace；Then 平台创建 workspace，`status=active`，不因缺少 `.sillyspec` 阻断 平台展示导入、镜像、忽略仓库规范三种选择
全文：.sillyspec/changes/archive/2026-05-27-platform-native-sillyspec/requirements.md#FR-01
最近确认：c0af692c7

## FR-unmapped-714 现有测试不回归
变更：workspace-spec-root-managed-p0
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/workspace-spec-root-managed-p0/requirements.md#FR-05
最近确认：98d3e56dd
