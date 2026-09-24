---
id: task-01
title: '后端模型+迁移+conftest——PlatformChangeEventORM 与 platform_change_events 建表'
title_zh: '后端模型+迁移+conftest——PlatformChangeEventORM 与 platform_change_events 建表'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-24 02:48:25
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-01, FR-03, FR-05]
decision_ids: [D-002@v1, D-005@v1]
allowed_paths:
  - backend/app/modules/platform_sync/model.py
  - backend/migrations/versions/20260924030000_add_platform_change_events.py
  - backend/app/modules/platform_sync/tests/conftest.py
target_files:
  - backend/app/modules/platform_sync/model.py
  - NEW:backend/migrations/versions/20260924030000_add_platform_change_events.py
  - backend/app/modules/platform_sync/tests/conftest.py
goal: >
  建事件存储基座：PlatformChangeEventORM（append-only 单列+detail JSON，D-005）+
  platform_change_events 建表迁移（dedup_key 唯一约束+ts 索引，D-002）+
  conftest 建表清单追加，为 task-02 端点提供落库表。
implementation:
  - backend/app/modules/platform_sync/model.py 末尾追加 PlatformChangeEventORM(BaseModel, table=True)：id UUID PK / workspace_id FK workspaces ON DELETE CASCADE NOT NULL / change_name String(255) NOT NULL / dedup_key String(255) NOT NULL / kind String(64) NOT NULL / rule String(255) NULL / severity String(32) NULL / provisional Boolean NOT NULL default True / detail JSON NULL / ts String(64) NOT NULL / created_at timestamptz server_default now()；__table_args__ 含 UniqueConstraint(workspace_id, change_name, dedup_key, name=uq_platform_change_events_dedup) 与 Index(workspace_id, change_name, ts, name=ix_platform_change_events_ws_change_ts)；对齐 AgentSessionLogORM 写法（backend/app/modules/platform_sync/model.py:130 起）
  - 新建 backend/migrations/versions/20260924030000_add_platform_change_events.py：revision=20260924030000，down_revision=20260922194500（alembic heads 实测单头）；upgrade=op.create_table 十一列与 ORM 完全对称（sa.Uuid/sa.String/sa.Boolean/sa.JSON 均跨 SQLite/PostgreSQL）；downgrade=op.drop_table；docstring 注明 change/决策依据
  - backend/app/modules/platform_sync/tests/conftest.py 的 ensure_platform_sync_table autouse fixture tables 列表追加 _ps_model.PlatformChangeEventORM.__table__（conftest.py:37-44 现有清单后）
acceptance:
  - uv run alembic heads 仍单头（新迁移为唯一 head）
  - uv run pytest app/modules/platform_sync/tests/test_router.py -q 既有测试零回归
  - 迁移文件在 SQLite 测试库可执行（conftest 建表即等价形态）
verify:
  - cd backend && uv run pytest app/modules/platform_sync/tests/test_router.py -q
  - cd backend && uv run alembic heads
constraints:
  - 不动 platform_change_progress/QuicklogEntryORM/AgentSessionLogORM 既有列与表
  - workspace_id NOT NULL（无 shk_live_ 过渡期场景，对齐 platform_agent_logs 先例）
  - ts 存 CLI ISO 原文 String，不做时区转换
---

<!-- 骨架由 sillyspec taskcard 生成（LF 行尾 + frontmatter 已闭合 + 硬校验 9 字段齐全）。
     用 Edit tool 填充上方占位符（allowed_paths/goal/implementation/acceptance/verify/constraints 等），
     勿用 Write 整文件重写——会引入 CRLF 行尾/漏闭合 ---/漏字段回归。
     ⚠️ plan --done 硬校验会拦截未替换的占位符（FR-XX / D-XXX / src/example/file.ts /
     一句话说明这个 task / 具体步骤 1 / 可验证的验收条件 1 / 边界约束 1）——占位符视同缺字段。
     target_files 格式（可选，对账用精确文件级意图声明，与 allowed_paths 语义不同）：
                    精确文件路径（仓根相对、正斜杠），当前不存在、将由本 task 新建的文件加
                    NEW: 前缀（如 NEW:src/foo.js）；禁 glob（src/**）、禁目录前缀（src/dir/）、
                    禁绝对路径；无明确文件级意图时保留 [] 占位行不动。
     implementation/acceptance 里的源码位置同样写仓根相对全路径+行号（src/foo.js:123）——
                    裸文件名在 docs-check 层1 靠 basename 全仓扫描找候选，找不到候选或关键词
                    窗口不匹配即失效，到 pre-push 才拦（2026-09-19 实证 64 处返工）。
     可选字段按需插进上方 frontmatter（规则见 taskcard-rules）：
     repo:          仅跨仓 task 填（local.yaml repos: 注册的仓 key；缺省=main。allowed_paths 相对该仓根写，
                    禁止带仓库名前缀/绝对路径——review 对账按仓根相对路径匹配，带前缀永不命中）
     provides:      仅当本 task 给其他 task 提供接口/DTO/响应时填
     expects_from:  仅当本 task 消费其他 task 的契约时填
     related_tests: 仅当本 task 改动导致既有测试断言失效时填（测试路径须同时进 allowed_paths） -->
