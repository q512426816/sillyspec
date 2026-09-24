---
id: task-03
title: '前端类型与数据层——gen:types + lib/change-events.ts'
title_zh: '前端类型与数据层——gen:types + lib/change-events.ts'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-24 02:48:25
priority: P0
depends_on: [task-02]
blocks: []
requirement_ids: [FR-02]
decision_ids: [D-004@v1]
expects_from:
  - "task-02: GET /api/changes/{name}/events?since= 响应 EventListResponse{items,total}（api-types 生成 components 侧 schema 名）"
allowed_paths:
  - backend/openapi.json
  - frontend/src/lib/api-types.ts
  - frontend/src/lib/change-events.ts
target_files:
  - backend/openapi.json
  - frontend/src/lib/api-types.ts
  - NEW:frontend/src/lib/change-events.ts
goal: >
  前端类型与数据层：pnpm gen:types 从后端 OpenAPI 再生成 api-types.ts，
  新建 lib/change-events.ts 提供 listChangeEvents 封装。
implementation:
  - node_modules 健康自检：cd frontend && pnpm exec tsc --version（CLAUDE.md 规则 21）
  - 刷新 backend/openapi.json（gen:types 内置 dump_openapi 流程）确保新端点进 schema
  - cd frontend && pnpm gen:types（生成 src/lib/api-types.ts）
  - 新建 frontend/src/lib/change-events.ts：从 api-types 取事件响应类型；export listChangeEvents(changeName, since?) 走 apiFetch（GET /api/changes/{name}/events，since 增量 query 参数）；错误经 apiFetch 抛 ApiError（调用方静默降级空态）
acceptance:
  - cd frontend && pnpm typecheck 绿
  - api-types.ts 含 /api/changes/{name}/events 路径条目
verify:
  - cd frontend && pnpm typecheck
constraints:
  - api-types.ts 禁止手写（只经 gen:types 生成，CLAUDE.md 规则 21）
  - gen:types 暴露的无关旧测试债按惯例顺手修，不回手写
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
