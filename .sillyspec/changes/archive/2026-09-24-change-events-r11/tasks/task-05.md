---
id: task-05
title: 'E2E 验收实录——dev 后端 + curl 五条 + 面板核验'
title_zh: 'E2E 验收实录——dev 后端 + curl 五条 + 面板核验'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-24 02:48:25
priority: P0
depends_on: [task-01, task-02, task-03, task-04]
blocks: []
requirement_ids: [FR-01, FR-02, FR-03, FR-04, FR-05, FR-06]
decision_ids: [D-001@v1, D-003@v1, D-004@v1, D-007@v1]
allowed_paths:
  - .sillyspec/changes/2026-09-24-change-events-r11/e2e-record.md
target_files: []
goal: >
  E2E 验收实录：dev 后端起服（真实 DB），shpsync_ token curl 推 5 条事件
  （含 2 warning）→ GET 正序去重；面板高亮/徽标/角标核验；结果落盘 e2e-record.md。
implementation:
  - dev 起服：cd backend && uv run alembic upgrade head && uv run uvicorn app.main:app（dev 配置）
  - 造 shpsync_ token（平台 token 体系正规签发路径或既有测试脚本），curl POST /api/changes/2026-09-24-change-events-r11/events 推 5 条（kind/rule/severity/detail/ts，其中 2 条 severity=warning）
  - curl GET 同端点：断言正序（ts 升序）与 5 条齐全；重推第 1 条（同 id）→ 行数不变（去重）；带 since=<第 3 条 ts> → 只回其后事件
  - 前端面板核验：变更详情页观测事件区默认展开（有 warning）+角标=2、warning 行琥珀高亮、provisional 徽标悬停文案
  - 全程命令与响应实录落盘 e2e-record.md（含时间戳）
acceptance:
  - 任务书验收清单逐条过：curl 五条→GET 正序去重；面板高亮与徽标
  - e2e-record.md 落盘（命令+响应摘要+结论）
verify:
  - 人工核对 e2e-record.md 与任务书验收口径一致
constraints:
  - 只读验收不修业务代码；发现问题回 task-02/04 修后重验
  - 事件区零业务逻辑（不产生任何流程状态变化）
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
