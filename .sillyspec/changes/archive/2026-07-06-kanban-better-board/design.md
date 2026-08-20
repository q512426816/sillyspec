---
author: qinyi
created_at: 2026-07-06T23:30:00+08:00
---

# Design: Dashboard Kanban 看板视图

> 变更：`2026-07-06-kanban-better-board`
> 项目：sillyspec（packages/dashboard）
> 阶段：brainstorm → design

## 1. 背景

SillySpec Dashboard（`packages/dashboard/`）当前提供 PipelineView 流水线视图，按顺序展示各阶段（scan → brainstorm → plan → execute → verify → archive）的进度状态。但缺少一个**全局多变更的俯瞰视图**——当有多个变更同时进行时，无法直观看到每个变更当前处于哪个阶段，也无法在单一视图中快速对比所有变更的进度。

当前 dashboard 的 PipelineView 聚焦单个项目的单条流水线，而实际工作中会同时存在 6+ 个活跃变更（如 worktree 隔离、等待状态机、模块文档重构等）分布在不同的阶段。用户需要一个类似 Trello/Jira 的看板视图来管理这些变更。

## 2. 设计目标

1. **全局俯瞰**：在一个视图中展示所有活跃变更及其当前阶段
2. **阶段即列**：按阶段（scan/brainstorm/plan/execute/verify/archive/quick/explore）分列，每列展示该阶段下的变更卡片
3. **详情交互**：点击卡片可查看变更的详细信息（步骤、任务列表等）
4. **实时同步**：变更状态变更时，看板自动刷新（复用现有 WebSocket 通道）
5. **自然集成**：在现有 Tab 系统中新增"看板"Tab，与"流水线"和"文档"并列
6. **只读模式**：仅展示信息，不做拖拽排序（一期简化）

## 3. 非目标

- **不做** 拖拽移动变更到其他阶段（一期只读，后续可扩展）
- **不做** 独立路由/页面（保持在现有 Tab 切换体系内）
- **不做** 独立的 WebSocket 消息类型（复用现有 `progress:update`）
- **不做** 跨项目看板聚合（只展示当前选中项目的变更）
- **不做** 看板配置/过滤器 UI

## 4. 拆分判断

单一内聚变更，不拆分。看板视图涉及 4 个新增 Vue 组件 + 1 个后端 API 端点 + 1 处 Tab 集成，各部分强耦合——没有数据端点的看板无意义，没有组件的端点无用户价值。内部交付顺序（后端端点 → 组件 → 集成）留给 plan 阶段的 Wave 排序处理。

## 5. 总体方案

选定**方案 A：新增 KanbanView Tab**。分三个 Phase：

### Phase 1 — 后端 API 端点（`server/index.js`）

新增 `GET /api/changes/kanban` 端点，返回所有变更按阶段分组的 JSON：

```json
{
  "columns": [
    {
      "stage": "brainstorm",
      "label": "需求探索",
      "status": "in-progress",
      "changes": [
        {
          "name": "看板优化",
          "change": "2026-07-06-kanban-better-board",
          "currentStage": "brainstorm",
          "step": "3/13 原型设计",
          "lastActive": "2026-07-06T15:20:00Z",
          "progress": 75
        }
      ]
    }
  ]
}
```

实现方式：扫描 `.sillyspec/changes/` 目录（排除 `archive/`），对每个变更运行 `sillyspec progress show --change <name>` 解析当前阶段和进度，按阶段分组返回。未在 DB 注册的变更归入"未知"阶段。

### Phase 1b — 变更详情端点

新增 `GET /api/changes/kanban/detail?path=<projectPath>&change=<changeName>`，返回单个变更的详细信息（含任务列表）：

```json
{
  "name": "看板优化",
  "change": "2026-07-06-kanban-better-board",
  "currentStage": "brainstorm",
  "step": "3/13 原型设计",
  "lastActive": "2026-07-06T15:20:00Z",
  "progress": 75,
  "steps": [
    { "name": "状态检查", "status": "completed" },
    { "name": "加载上下文", "status": "completed" },
    { "name": "方案设计", "status": "in-progress" }
  ]
}
```

### Phase 2 — 前端看板组件（`src/components/`）

新增 3 个 Vue 组件：

1. **`KanbanBoard.vue`** — 看板容器（顶层）
   - 水平和垂直可滚动的 8 列布局
   - 列间距 12px，每列 min-width 220px
   - 从 `fetch('/api/changes/kanban')` 加载数据
   - 监听 WebSocket `project:update` 刷新

2. **`KanbanColumn.vue`** — 阶段列
   - 列标题（阶段名 + 卡片数量 + 状态圆点）
   - 卡片列表容器（可内部滚动）
   - 空状态显示"暂无变更"

3. **`KanbanCard.vue`** — 变更卡片
   - 变更名称（2 行截断）
   - 当前步骤 + 最后活跃时间
   - 进度条（灰色=未开始/黄色=进行中/绿色=已完成）
   - 左侧颜色指示条（按阶段着色）
   - 点击触发 `showDetail` 事件

### Phase 3 — Tab 集成

修改 **`PipelineView.vue`** 的 Tab 区，从 2 个 Tab 扩展为 3 个：

```
[流水线] [看板] [文档]
```

看板 Tab 激活时渲染 `KanbanBoard` 组件，内容区域复用现有布局。

## 6. 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 新增 | packages/dashboard/src/components/KanbanBoard.vue | 看板容器组件 |
| 新增 | packages/dashboard/src/components/KanbanColumn.vue | 阶段列组件 |
| 新增 | packages/dashboard/src/components/KanbanCard.vue | 变更卡片组件 |
| 修改 | packages/dashboard/src/components/PipelineView.vue | Tab 扩展为 3 个，新增看板 Tab 内容区 |
| 修改 | packages/dashboard/server/index.js | 新增 `GET /api/changes/kanban` + `/api/changes/kanban/detail` 两个端点 |
| 新增 | packages/dashboard/src/composables/useKanban.js | （可选）看板状态管理 composable |

## 7. 接口定义

### 7.1 REST API

**`GET /api/changes/kanban?path=<projectPath>`**

请求参数：
- `path`（必填）：项目路径（URL encoded），指定要扫描的项目

响应：

```typescript
interface KanbanResponse {
  columns: KanbanColumn[]
}

interface KanbanColumn {
  stage: string        // 阶段名（kebab-case）
  label: string        // 中文标签
  status: 'pending' | 'in-progress' | 'completed'
  changes: KanbanChange[]
}

interface KanbanChange {
  name: string         // 变更描述名
  change: string       // 变更目录名
  currentStage: string // 当前阶段
  step: string         // 当前步骤描述
  lastActive: string   // ISO 时间戳
  progress: number     // 0-100
}
```

### 7.2 Vue 组件 Props

```typescript
// KanbanBoard.vue
interface KanbanBoardProps {
  project: object      // 当前项目对象（从 dashboard.state 传入）
}

// KanbanColumn.vue
interface KanbanColumnProps {
  stage: string
  label: string
  status: 'pending' | 'in-progress' | 'completed'
  changes: KanbanChange[]
}

// KanbanCard.vue
interface KanbanCardProps {
  change: KanbanChange
}

// KanbanCard.vue emits
interface KanbanCardEmits {
  (e: 'select', change: KanbanChange): void
}
```

## 8. 数据模型

无新增数据库表。看板数据通过扫描文件系统 + CLI 命令运行时聚合生成。

## 9. 兼容策略

- 新增 `/api/changes/kanban` 端点不影响现有 API 路由
- 新增 Tab 选项不影响现有 `activeTab` 默认值（默认仍为 `pipeline`）
- 未配置 SillySpec 的项目看板为空（空列）
- 后端端点异常时前端降级显示空看板 + 错误提示

## 10. 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | `sillyspec progress show --change <name>` 对每个变更串行执行，变更多时响应慢 | P1 | 前端渲染前加 loading 状态；后续可加缓存（TTL 30s） |
| R-02 | 变更目录包含非标准目录（如 `archive/` 子目录） | P1 | 后端过滤掉 archive/ 子目录，只扫描 `changes/` 下的一级目录 |
| R-03 | WebSocket `project:update` 触发的重刷与 HTTP 加载时序冲突 | P2 | 加去抖（debounce 500ms）；HTTP 请求未完成时忽略 WebSocket 更新 |
| R-04 | 变更名含特殊字符（空格、中文）在 URL/JSON 传输中出错 | P1 | `encodeURIComponent` 处理变更目录名 |
| R-05 | 部分变更目录在 DB 中无对应记录（CLI 返回"未找到变更"） | P1 | 归入"unknown"阶段列，progress=0，不阻断其他变更的解析 |

## 11. 决策追踪

| ID | 类型 | 说明 |
|---|---|---|
| D-001@v1 | architecture | 选型方案 A（新增 KanbanView Tab），不选独立页面或嵌入式 widget |
| D-002@v1 | boundary | 一期只读，不支持拖拽 |
| D-003@v1 | data | 数据来源为扫描文件系统 + CLI 实时聚合，不新增 DB 表 |

## 12. 自审

### ✅ 自审通过

- **需求覆盖** ✅：看板视图、按阶段分列、只读、全局俯瞰、Tab 集成，全部覆盖
- **非目标清晰** ✅：明确列出不做的事（拖拽、独立路由、新 WebSocket 消息）
- **约束一致性** ✅：与现有 dashboard 技术栈（Vue 3 + naive-ui + Tailwind）一致，与 server/index.js 的路由模式一致
- **真实性** ✅：文件路径来自真实代码结构，接口定义可落地
- **YAGNI** ✅：没加过滤/排序/搜索等不需要的功能
- **验收可测试** ✅：可直接在浏览器中验证 8 列布局 + 卡片渲染 + 点击详情
- **兼容策略** ✅：新增 API 和 Tab 对现有功能无影响
- **风险识别** ✅：串行 CLI 性能风险已有降级方案
- **生命周期契约表**：不涉及 session/lease/agent_run/lifecycle/claim 等关键词，跳过
