---
author: qinyi
created_at: 2026-09-24 02:41:20
---
# 任务卡（Tasks）— 2026-09-24-change-events-r11

> 任务粒度：按「可独立验收的能力边界」拆卡（实现+单测同卡，D-006@v1 纪律）；后端两卡（模型基座 / 端点+测试），前端两卡（类型与数据层 / 组件与挂载），E2E 验收一卡。page.tsx 仅 task-04 触碰。

- [x] task-01: 后端模型+迁移+conftest——PlatformChangeEventORM 与 platform_change_events 建表
  - target_files: backend/app/modules/platform_sync/model.py, NEW:backend/migrations/versions/20260924030000_add_platform_change_events.py, backend/app/modules/platform_sync/tests/conftest.py
  - model.py 追加 ORM（D-005 单列+detail JSON；D-002 唯一约束+ts 索引）；迁移 create_table 对称（down_revision=20260922194500 单头）；conftest 建表清单追加
  - 验收：`uv run pytest app/modules/platform_sync/tests/test_router.py -q` 零回归
- [x] task-02: 后端 schema/service/router 两端点 + pytest 五组
  - target_files: backend/app/modules/platform_sync/schema.py, backend/app/modules/platform_sync/service.py, backend/app/modules/platform_sync/router.py, NEW:backend/app/modules/platform_sync/tests/test_change_events.py
  - POST（require_platform_sync_write，单事件/数组，dedup_key 幂等+IntegrityError 兜底，5000 截最旧子查询删除）；GET（require_platform_sync+_read_args，since 严格大于，ts 正序）
  - pytest 五组：收/取/去重/鉴权/上限
  - 验收：`uv run pytest app/modules/platform_sync -q` 全绿
- [x] task-03: 前端类型与数据层——gen:types + lib/change-events.ts
  - target_files: backend/openapi.json, frontend/src/lib/api-types.ts, NEW:frontend/src/lib/change-events.ts
  - `pnpm gen:types`（node_modules 健康自检先行）；listChangeEvents(changeName, since?) 封装
  - 验收：`pnpm typecheck` 绿
- [x] task-04: 前端折叠卡+挂载+组件测试
  - target_files: NEW:frontend/src/components/changes/detail/change-events-card.tsx, frontend/src/app/(dashboard)/workspaces/[id]/changes/[cid]/page.tsx, NEW:frontend/src/components/changes/detail/__tests__/change-events-card.test.tsx
  - 折叠（缺省收起/warning 默认展开+角标）、时间线 warning 琥珀高亮、provisional 徽标悬停、30s 轮询 since 增量、空态；page.tsx 以 change.change_key 挂卡
  - 验收：`pnpm vitest run src/components/changes` 四组全绿
- [x] task-05: E2E 验收实录——dev 后端 + curl 五条 + 面板核验
  - target_files: NEW:.sillyspec/changes/2026-09-24-change-events-r11/e2e-record.md
  - dev 起服（真实 DB），shpsync_ token curl 推 5 条（含 2 warning）→ GET 正序去重；重推验证幂等；面板高亮/徽标/角标核验
  - 验收：任务书验收清单逐条过并实录
