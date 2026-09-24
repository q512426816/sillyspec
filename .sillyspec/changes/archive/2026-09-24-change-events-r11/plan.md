---
author: qinyi
created_at: 2026-09-24 02:47:10
plan_level: full
---

# 实现计划（Plan）— 2026-09-24-change-events-r11

## Wave 1（模型基座）
- task-01

## Wave 2（端点+测试，依赖 W1）
- task-02

## Wave 3（前端类型与数据层，依赖 W2 的 openapi 变更）
- task-03

## Wave 4（组件与挂载，依赖 W3 的 lib）
- task-04

## Wave 5（E2E 验收，依赖全部）
- task-05

## 任务总表
| 编号 | 任务 | Wave | 优先级 | 依赖 | 覆盖 FR/D | 说明 |
|---|---|---|---|---|---|---|
| task-01 | 后端模型+迁移+conftest 建表 | W1 | P0 | — | FR-01(存储基座), D-002, D-005 | PlatformChangeEventORM + 20260924030000 迁移 + 建表清单 |
| task-02 | 后端两端点+pytest 五组 | W2 | P0 | task-01 | FR-01~05, D-001~005 | schema/service/router + test_change_events.py（实现+单测同卡） |
| task-03 | 前端 gen:types+数据层 | W3 | P0 | task-02 | FR-02(前端侧), D-004 | pnpm gen:types + lib/change-events.ts + typecheck |
| task-04 | 前端折叠卡+挂载+组件测试 | W4 | P0 | task-03 | FR-06, D-006, D-007 | change-events-card + page.tsx 挂卡（change_key）+ 四组测试 |
| task-05 | E2E 验收实录 | W5 | P1 | task-01~04 | 全 FR | dev 起服 curl 推 5 条（含 2 warning）+ GET 正序去重 + 面板核验 |

## 关键路径
task-01 → task-02 → task-03 → task-04 → task-05（全线性，模型→端点→类型→组件→验收）

## 全局硬约束（从 design.md 逐字抄录，绑定所有 task）
- **provisional 只展示不消费（FR-07 红线）**：任何代码路径不得依据事件触发流程状态变化、审批门控或 execute/verify 判定
- 鉴权：POST 用 `require_platform_sync_write`（仅 shpsync_；无凭据 401，JWT/shk_live_ 403）；GET 用 `require_platform_sync`（`_read_args` 读 scope 翻译复用）；workspace_id 恒由 token 派生，不从 body 取
- 上限 MAX_EVENTS_PER_CHANGE=5000，截最旧保最新（DELETE 用子查询选 id 形态，SQLite/PostgreSQL 双方言）
- ts 存 CLI ISO 8601 UTC 原文 String(64)，字典序=时间序，since 过滤为严格字符串大于
- dedup_key = 事件 id 或 `ts|rule`（rule None 补空串），(workspace_id, change_name, dedup_key) 唯一约束，冲突跳过计 deduplicated 不 500
- 后端四文件分层 / ORM 继承 app.models.base.BaseModel / 业务错误继承 AppError；service 请求内实例化
- 前端：api-types.ts 必须从 OpenAPI 生成（pnpm gen:types），禁止手写；UI 中文；样式遵主题 token 语义阶
- 禁止跑全量测试，仅跑自己修改相关的测试（CLAUDE.md 规则 0）

## 全局验收标准
1. 模块级测试全绿：`cd backend && uv run pytest app/modules/platform_sync -q`；`cd frontend && pnpm vitest run "src/app/(dashboard)/workspaces" src/components/changes`
2. 集成冒烟（task-05）：dev 后端起服 + curl 推 5 条（含 2 warning）→ GET 正序、去重生效、上限行为正确；面板高亮/徽标/角标核验
3. brownfield：未涉及端点/表行为不变（platform_change_progress 等零触碰；既有 platform_sync 测试零回归）

## 覆盖矩阵（如存在 decisions.md）
| ID | 覆盖任务 | 验收证据 |
|---|---|---|
| D-001@v1 | task-02 | pytest 鉴权矩阵组（401/403/200） |
| D-002@v1 | task-01, task-02 | 唯一约束迁移 + pytest 去重组（id 轨/ts|rule 轨） |
| D-003@v1 | task-02 | pytest 上限组（5002 条推入截断保最新） |
| D-004@v1 | task-02, task-03 | GET 读 scope 测试 + 前端 apiFetch 调用形态 |
| D-005@v1 | task-01, task-02 | 表结构单列+detail JSON + 收组落库断言 |
| D-006@v1 | task-04 | 组件测试轮询/渲染组 |
| D-007@v1 | task-04 | 组件测试高亮/空态/角标组 |
