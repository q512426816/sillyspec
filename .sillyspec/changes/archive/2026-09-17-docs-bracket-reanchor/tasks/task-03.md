---
id: task-03
title: 'docs-fix-capability.test.mjs 方括号用例组（全量/圆方混合/段首/markdown 回归/嵌套与旧一致/ReDoS evil/[...slug] fuzzy/真实校验 fixture）'
title_zh: 'docs-fix-capability.test.mjs 方括号用例组（全量/圆方混合/段首/markdown 回归/嵌套与旧一致/ReDoS evil/[...slug] fuzzy/真实校验 fixture）'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-17 09:19:45
priority: P0
depends_on: [task-01]
blocks: []
requirement_ids: [FR-01, FR-03]
decision_ids: [D-001@v1, D-006@v1]
allowed_paths:
  - test/docs-fix-capability.test.mjs
target_files:
  - test/docs-fix-capability.test.mjs
expects_from:
  task-01:
    - contract: docs-check-bracket-segment
      needs: [file]
goal: >
  为 task-01 落地的方括号段并列正则补齐 docs-fix-capability.test.mjs 方括号用例组
  （八类直测用例 + 真实校验 fixture），锁死方括号新提取行为与存量行为（markdown 链接/嵌套/ReDoS）零回归。
implementation:
  - 全量提取：app/post/[id]/page.tsx:12 → 1 条引用，file 全量含方括号字面量（对照既有 FR-1.1 圆括号样板 :40-45 形态）
  - 圆方混合段：app/(g)/[id]/z.tsx:3 → 全量提取（并列形态直接验证点，file 同含 (g) 与 [id]）
  - 段首方括号段：[id]/page.tsx:1 → file === '[id]/page.tsx'（对照 :47-51 圆括号开头样板）
  - markdown 链接回归：[t](foo.js:12) → 仅提取 foo.js:12（[t] 方括号段后遇 ( 截止、扩展名组失败回落，对照 :53-58 圆括号同族用例）
  - 嵌套与旧一致：[[x]]/foo.js:9（及 [[...slug]] 文本变体）→ 与旧正则一致的部分提取残段（如 /foo.js），断言锁「行为与旧一致」不锁「零提取」（Grill CC-4 拍板）
  - checkbox 与脚注不成立段：- [ ] f.js:1（空格不在类内）与 [^1] 文本（^ 不在类内）→ 方括号段不成立、按既有提取面断言（f.js:1 照常提取 / [^1] 零提取）
  - ReDoS evil 方括号形：长 token 方括号形（GitHub URL 形 + 'a'.repeat(30) 段填充）无 :N 后缀，耗时 <100ms（锁死 D-006 展开循环形，对照 :73-80）
  - 方括号捕获段模糊跳过（[...slug] 含 ...）：文档含 app/[...slug]/page.tsx:1 跑 runDocsCheck → 该引用计 skippedFuzzy、不计 total/invalid（走既有 FR-1.2 模糊通道，消误报验证点——Grill CC-11）
  - 真实校验 fixture：mkdtemp 落盘 app/post/[id]/page.tsx 方括号目录（参照既有 FR-1.1 圆括号 fixture :60-69 形态），runDocsCheck 层1（存在性+行界）+ 层2（关键词窗口）通过
  - 文件头注释（:1-13）补方括号用例组覆盖说明一行
acceptance:
  - 全量：collectDocRefs 提取 app/post/[id]/page.tsx:12 → 1 条，file === 'app/post/[id]/page.tsx'、start === 12
  - 圆方混合：app/(g)/[id]/z.tsx:3 → 1 条，file === 'app/(g)/[id]/z.tsx'
  - 段首：[id]/page.tsx:1 → file === '[id]/page.tsx'
  - markdown 回归：[t](foo.js:12) → 1 条，file === 'foo.js'、start === 12（[t] 不进提取产物）
  - 嵌套：[[x]]/foo.js:9 → 部分提取 file === '/foo.js'，与旧正则行为一致（断言不锁零提取）
  - checkbox/脚注：- [ ] f.js:1 仅照常提取 f.js:1（[ ] 段不成立）、[^1] 文本零提取
  - ReDoS：方括号 evil 形 n=30 长 token 耗时 <100ms
  - fuzzy：文档含 app/[...slug]/page.tsx:1 → runDocsCheck skippedFuzzy === 1、total 不含该引用
  - fixture：方括号目录真实校验 invalid.length === 0（层1+层2 全过）
verify:
  - node --test test/docs-fix-capability.test.mjs 全绿
  - npm test 全量 EXIT=0
constraints:
  - 测试全 tmp fixture（mkdtempSync + try/finally cleanup），Windows 兼容（路径 join 拼接、CRLF 显式写）
  - 「与旧一致」类用例锁行为不锁「零提取」（Grill CC-4）；断言与 task-01 实现不符时对照行为修测试预期，禁反向改 src 绕过
  - 只改 test/docs-fix-capability.test.mjs（src/docs-check.js 属 task-01、test/docs-gate.test.mjs 属 task-04）；零新增依赖（node:test/assert/fs/path/os 既有 import 面内）
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
