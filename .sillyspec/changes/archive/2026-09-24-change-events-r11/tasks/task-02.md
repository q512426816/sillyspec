---
id: task-02
title: '后端 schema/service/router 两端点 + pytest 五组'
title_zh: '后端 schema/service/router 两端点 + pytest 五组'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-24 02:48:25
priority: P0
depends_on: [task-01]
blocks: []
requirement_ids: [FR-01, FR-02, FR-03, FR-04, FR-05, FR-07]
provides:
  - "POST /api/changes/{name}/events → EventPushOk {change_name, accepted, deduplicated, truncated}（shpsync_ 写通道）"
  - "GET /api/changes/{name}/events?since=<iso> → EventListResponse {items: EventListItem[], total}（读 scope；items ts 正序；EventListItem 含 id/change_name/kind/rule/severity/provisional/detail/ts/created_at）"
allowed_paths:
  - backend/app/modules/platform_sync/schema.py
  - backend/app/modules/platform_sync/service.py
  - backend/app/modules/platform_sync/router.py
  - backend/app/modules/platform_sync/tests/test_change_events.py
target_files:
  - backend/app/modules/platform_sync/schema.py
  - backend/app/modules/platform_sync/service.py
  - backend/app/modules/platform_sync/router.py
  - NEW:backend/app/modules/platform_sync/tests/test_change_events.py
goal: >
  建 CLI watcher 事件的消费端点：POST 接收（幂等+上限截断）+ GET 拉取（scope 过滤+
  since 增量正序），零业务判定（provisional 红线），配 pytest 五组。
implementation:
  - schema.py 追加：EventPushItem（model_config extra=allow；id/kind/rule/severity/provisional=True/detail/ts 字段，长度上限对齐列宽）+ EventPushRequest（RootModel 单对象或数组双形态）+ EventPushOk{change_name,accepted,deduplicated,truncated} + EventListItem（from_attributes）+ EventListResponse{items,total}
  - service.py PlatformSyncService 追加两方法：append_events(workspace_id, change_name, events)——逐条算 dedup_key（id 或 ts|rule，rule None 补空串）、先 SELECT 已存 dedup_key 跳过（deduplicated 计数）、新行写入撞 IntegrityError 兜底（R-03，不 500）、写后超 MAX_EVENTS_PER_CHANGE=5000 子查询选最旧 id 集中 DELETE（truncated 计数，SQLite/PG 双方言）；list_events(scope kwargs, change_name, since)——scope WHERE + ts>since 严格字符串比较 + ORDER BY ts ASC + total
  - router.py 尾部追加两端点：POST /changes/{name}/events 用 _write_auth（workspace None 403 fail-closed 对齐 quicklog-entries 范式 router.py:443-453）；GET /changes/{name}/events 用 _read_auth + _read_args(scope)（router.py:93-101）
  - 新建 backend/app/modules/platform_sync/tests/test_change_events.py 五组（fixture 复用 conftest 的 shpsync_headers/auth_headers/apikey_headers/db_session）：收组（单对象+数组双形态 200+落库原文断言）/ 取组（正序+since 严格大于+total）/ 去重组（同 id 二推 deduplicated=1；无 id 同 ts|rule 二推不增行）/ 鉴权组（无凭据 401、shk_live_·JWT POST 403、shpsync_ POST 200、GET 三形态凭据 200）/ 上限组（批量推 5002 条→表内 5000 且保留 ts 最大侧、truncated=2）
acceptance:
  - cd backend && uv run pytest app/modules/platform_sync -q 全绿（新五组+既有零回归）
  - FR-07 红线：service/router 无任何依据事件改流程状态的代码路径（人工审读确认）
verify:
  - cd backend && uv run pytest app/modules/platform_sync/tests/test_change_events.py -q
constraints:
  - provisional 只存储透传，禁止任何业务消费分支（FR-07 红线）
  - workspace_id 只从 token scope 派生；body 不含 workspace 字段
  - 恒 200 语义：去重/截断不改变 HTTP 状态（best-effort 通道）
  - 禁跑全量 pytest，仅 app/modules/platform_sync
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
