---
id: task-03
title: '测试套件 test/archive-delta.test.mjs（四源/降级/兜底/归属/幂等/归档集成）'
title_zh: '测试套件 test/archive-delta.test.mjs（四源/降级/兜底/归属/幂等/归档集成）'
author: 'qinyi'
created_at: 2026-09-07 06:36:52
priority: P0
depends_on: ['task-01', 'task-02']
blocks: []
requirement_ids: [FR-01, FR-02]
decision_ids: [D-001@v1, D-003@v1]
allowed_paths:
  - test/archive-delta.test.mjs
target_files:
  - NEW:test/archive-delta.test.mjs
goal: >
  测试套件——四源/降级/兜底/归属/幂等/归档集成。
implementation:
  - 新建 test/archive-delta.test.mjs：collectDeltaSources 四源各自命中与缺失（null）；reconcile 按 change 过滤（多 ts 多 change fixture 取对的那份）；apply-pathspec 兜底路径；buildDeltaReport 三段字面断言（Before/Delta/After 标题+关键内容）+ 逐源降级注记 + 未匹配文件列出；deriveActualModules 归属（含反斜杠归一）；CLI 幂等/--json/退出码；归档集成（临时 fixture 走 confirm 路径或直调 handler 断言 delta.md 落盘且目录移动后随行）+ fail-soft（build 抛错归档不阻断）
acceptance:
  - 全绿 + module 子集回归 + lint 归零
verify:
  - node --test test/archive-delta.test.mjs && npm test
constraints:
  - node:test 风格；不弱化断言

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
     可选字段按需插进上方 frontmatter（规则见 taskcard-rules）：
     repo:          仅跨仓 task 填（local.yaml repos: 注册的仓 key；缺省=main。allowed_paths 相对该仓根写，
                    禁止带仓库名前缀/绝对路径——review 对账按仓根相对路径匹配，带前缀永不命中）
     provides:      仅当本 task 给其他 task 提供接口/DTO/响应时填
     expects_from:  仅当本 task 消费其他 task 的契约时填
     related_tests: 仅当本 task 改动导致既有测试断言失效时填（测试路径须同时进 allowed_paths） -->
