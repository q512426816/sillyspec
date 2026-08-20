---
author: qinyi
created_at: 2026-07-06T23:30:00+08:00
---

# Proposal: Dashboard Kanban 看板视图

> 变更：`2026-07-06-kanban-better-board`

## 概述

为 SillySpec Dashboard 新增 Kanban 看板视图，以类似 Trello 的多列布局展示所有活跃变更及其阶段状态。

## 动机

当前 dashboard 仅有 PipelineView 流水线视图，无法在单一视图中俯瞰多个变更的进度。当同时有 6+ 个变更分布在 8 个不同阶段时，缺少全局视角。

## 方案

在 dashboard 的 Tab 栏新增"看板"Tab，渲染 8 列看板布局，每列代表一个阶段，卡片代表一个变更。

## 影响范围

- **新增**：3 个 Vue 组件（KanbanBoard / KanbanColumn / KanbanCard）
- **修改**：2 个现有文件（PipelineView.vue + server/index.js）
- **数据**：新增 `GET /api/changes/kanban` REST 端点

## 工作量估计

约 6 小时（3 个 Wave）

## 所需资源

- Node.js / Vue 3 开发环境（已在 dashboard 包中就绪）
- 无新增依赖
