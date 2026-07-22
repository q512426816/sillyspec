---
author: qinyi
created_at: 2026-07-06T23:30:00+08:00
---

# 决策台账：Dashboard Kanban 看板视图

> 变更：`2026-07-06-kanban-better-board`

## D-001@v1: 看板视图实现方案选择

| 字段 | 内容 |
|---|---|
| **type** | architecture |
| **status** | accepted |
| **source** | user |
| **question** | 用什么方式在 dashboard 中加入看板功能？ |
| **answer** | 方案 A：在 PipelineView 的 Tab 栏新增"看板"Tab，与现有"流水线""文档"并列 |
| **normalized_requirement** | 看板作为 Tab 集成到现有 PipelineView 中，不走独立路由 |
| **impacts** | design.md §5，KanbanBoard.vue，PipelineView.vue |
| **evidence** | brainstorm step 8 用户选择"方案A" |
| **priority** | P0 |

## D-002@v1: 交互模式

| 字段 | 内容 |
|---|---|
| **type** | boundary |
| **status** | accepted |
| **source** | user |
| **question** | 看板卡片是否支持拖拽？ |
| **answer** | 只读模式，不支持拖拽；点击卡片弹出详情面板 |
| **normalized_requirement** | Kanban 视图只读，卡片点击触发详情，不提供列间拖拽 |
| **impacts** | design.md §6 文件变更清单剔除拖拽依赖，KanbanCard.vue 只需 click handler |
| **evidence** | brainstorm step 6 用户选择"只读模式" |
| **priority** | P1 |

## D-003@v1: 数据来源

| 字段 | 内容 |
|---|---|
| **type** | data |
| **status** | accepted |
| **source** | design |
| **question** | 看板数据从哪里获取？ |
| **answer** | 新增 `GET /api/changes/kanban` 端点，扫描文件系统 + CLI 实时聚合 |
| **normalized_requirement** | 后端新增 REST 端点，不在前端做文件系统扫描；不新增 DB 表 |
| **impacts** | design.md §7.1，server/index.js 新增路由 |
| **evidence** | design.md §5 Phase 1 |
| **priority** | P0 |

## D-005@v1: 端点设计

| 字段 | 内容 |
|---|---|
| **type** | architecture |
| **status** | accepted |
| **source** | design-grill |
| **question** | 看板列表端点需要项目路径来定位文件系统，详情面板的任务列表数据从哪里来？ |
| **answer** | 列表端点 `GET /api/changes/kanban?path=<projectPath>` 接受 path 参数；详情端点 `GET /api/changes/kanban/detail?path=...&change=...` 返回含任务列表的完整信息 |
| **normalized_requirement** | 两个端点：列表(基本信息+path param) 和 详情(含steps+status) |
| **impacts** | design.md §7.1，server/index.js 新增路由 |
| **evidence** | design-grill X-001/X-002 |
| **priority** | P0 |

## D-006@v1: 未注册变更处理

| 字段 | 内容 |
|---|---|
| **type** | boundary |
| **status** | accepted |
| **source** | design-grill |
| **question** | 目录中存在但 DB 中未注册的变更怎么处理？ |
| **answer** | 归入"unknown"阶段列，progress=0，展示变更名但不展示阶段和步骤 |
| **normalized_requirement** | 后端不因单个变更解析失败而阻断其他变更；前端展示"unknown"列，标注变更未注册 |
| **impacts** | server/index.js 错误处理，KanbanColumn.vue 空/错误状态 |
| **evidence** | design-grill X-003 |
| **priority** | P1 |
