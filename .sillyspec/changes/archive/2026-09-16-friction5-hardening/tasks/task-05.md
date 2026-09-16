---
id: task-05
title: 'probe7 锚点对齐——probe7-anchor-check.js .test. 口径 + run/gates.js advisory 文案 + test/probe7-anchor-testfile.test.mjs'
title_zh: 'probe7 锚点对齐——probe7-anchor-check.js .test. 口径 + run/gates.js advisory 文案 + test/probe7-anchor-testfile.test.mjs'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-16 11:39:03
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-05]
decision_ids: [D-005@v1]
allowed_paths:
  - src/probe7-anchor-check.js
  - src/run/gates.js
  - test/probe7-anchor-testfile.test.mjs
target_files:
  - src/probe7-anchor-check.js
  - src/run/gates.js
  - NEW:test/probe7-anchor-testfile.test.mjs
goal: >
  probe7 advisory 锚点口径从只认 file:line 扩为 file:line 或 .test. 文件名（对齐 stage-contract 硬门三形态中的两形态），消灭行号漂移场景的无效回补提示。
implementation:
  - 'probe7-anchor-check.js：covered 行判定改 ANCHOR_RE.test(evidence) || /\.test\./.test(evidence)（ANCHOR_RE 本体不动），模块头注释口径句同步 + 补「file:line 侧本判定宽于硬门是设计容差」注'
  - 'run/gates.js advisory 文案（约 922-924 行）『缺 file:line 锚点』改为『缺 file:line 或 .test. 文件名锚点』，修复指引同步'
acceptance:
  - 'covered 行证据 test/foo.test.mjs（无行号）不计入 missingAnchors'
  - 'src/x.js:42 维持原判定'
  - '无任何锚点仍计入且文案正确'
verify:
  - 'npm test -- test/probe7-anchor-testfile.test.mjs'
  - 'npm test（全量回归，test/acceptance-matrix-gate.test.mjs 等既有面零回归）'
constraints:
  - '零依赖单文件定位不破（不 import stage-contract）'
  - 'advisory 不阻断语义不变'
  - '裸反引号不收（保持 advisory 增量价值）'
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
