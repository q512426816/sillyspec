---
author: qinyi
created_at: 2026-07-06T23:30:00+08:00
---

# 任务清单：Dashboard Kanban 看板视图

> 变更：`2026-07-06-kanban-better-board`

## Wave 分组

### Wave 1 — 后端数据端点

| 任务 ID | 任务名 | 文件 | 描述 |
|---|---|---|---|
| T-001 | 新增 `/api/changes/kanban` 路由 | `server/index.js` | 在现有 API 路由末尾新增 `/api/changes/kanban` 处理函数，支持 `?path=` 参数 |
| T-002 | 实现变更扫描逻辑 | `server/index.js` | 扫描 `.sillyspec/changes/`（排除 archive/），对每个变更调用 `sillyspec progress show --change <name>` 解析阶段和进度 |
| T-003 | 实现变更详情端点 | `server/index.js` | 新增 `/api/changes/kanban/detail` 端点，返回单个变更的完整信息（含任务列表） |
| T-004 | 异常处理与空值降级 | `server/index.js` | CLI 调用失败时不中断其他变更的解析；未注册变更归入"unknown"阶段 |

依赖：无

### Wave 2 — 前端看板组件

| 任务 ID | 任务名 | 文件 | 描述 |
|---|---|---|---|
| T-005 | 实现 KanbanBoard.vue | `src/components/KanbanBoard.vue` | 8 列水平布局容器，从 `/api/changes/kanban?path=...` 加载数据，监听 WebSocket 刷新 |
| T-006 | 实现 KanbanColumn.vue | `src/components/KanbanColumn.vue` | 单列：列标题（阶段名+计数+状态圆点）+ 可滚动卡片列表 + 空状态 |
| T-007 | 实现 KanbanCard.vue | `src/components/KanbanCard.vue` | 卡片：变更名（2 行截断）+ 步骤+时间 + 进度条 + 左色条 + click emit |
| T-008 | 详情侧栏渲染 | `KanbanBoard.vue` | 点击卡片后展示右侧详情面板，从 `/api/changes/kanban/detail` 加载任务列表 |

依赖：T-001（需要端点数据）

### Wave 3 — Tab 集成

| 任务 ID | 任务名 | 文件 | 描述 |
|---|---|---|---|
| T-009 | PipelineView Tab 扩展 | `src/components/PipelineView.vue` | Tab 从 2 个扩展到 3 个，新增"看板"Tab 内容区渲染 KanbanBoard |
| T-010 | WebSocket 刷新绑定 | `KanbanBoard.vue` | 监听 WebSocket `project:update` 消息，500ms 去抖后重新加载看板数据 |
| T-011 | useDashboard state 扩展 | `src/composables/useDashboard.js` | 在 reactive state 中新增 `activeTab: 'kanban'` 支持 |
| T-012 | App.vue 中新增看板 Tab 切换处理 | `src/App.vue` | 选中看板时调用对应数据加载 |

依赖：T-004（需要 KanbanBoard 组件就绪）

## 总依赖图

```
Wave 1: T-001 → T-002 → T-003 → T-004
                                      ↘
Wave 2:            T-005 → T-006 → T-007 → T-008
                                                ↘
Wave 3: T-012 → T-009 → T-010 → T-011 → [verify]
```

## 估计

- Wave 1：~2 小时
- Wave 2：~3 小时
- Wave 3：~1 小时
- 总计：~6 小时
