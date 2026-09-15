---
id: task-06
title: 'Consolidate five-pit regression tests, add troubleshooting section, run full gates'
title_zh: '测试收口 + troubleshooting 双真相门禁章节 + 全量 npm test / lint'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-15 21:34:09
priority: P0
depends_on: [task-01, task-02, task-03, task-04, task-05]
blocks: []
requirement_ids: [FR-01, FR-02, FR-03, FR-04, FR-05]
decision_ids: [D-001@v1, D-002@v1, D-003@v1, D-004@v1, D-005@v1]
allowed_paths:
  - NEW:test/worktree-dual-truth-gates.test.mjs
  - docs/sillyspec/troubleshooting.md
  - test/verify-evidence-triple.test.mjs
  - test/verify-evidence-committed-diff.test.mjs
target_files:
  - NEW:test/worktree-dual-truth-gates.test.mjs
  - docs/sillyspec/troubleshooting.md
goal: >
  把五坑回归测试（overlay 隔离 / no-op 剔除 / supplyFiles 供给 / 勾选并入 / evidence 双根）
  在 test/worktree-dual-truth-gates.test.mjs 收口为五组完整用例 + 零回归断言，
  docs/sillyspec/troubleshooting.md 新增 execute 双真相门禁口径章节（含已知边界），
  全量 npm test 与 npm run lint 收绿——本变更的验收闭环卡（Wave 3）。
implementation:
  - '盘点 task-01~05 在 test/worktree-dual-truth-gates.test.mjs 各自留下的分组用例，补齐缺口至五组各含「正向修复行为 + 零回归断言」，与 requirements.md FR-01~FR-05 的 GWT 逐条映射'
  - '五组断言锚真实行为面：_overlayBaseline 隔离并行声明文件（FR-01）、changedFiles no-op 剔除 + warnings 清单（FR-02）、create 供给步 + meta.supplyFiles（FR-03）、prefetchDiffFileSet 并入口径 + attributeSuspectTasks 多归属（FR-04）、runVerifyRequiredEvidenceCheckV2 双根（FR-05）'
  - '测试形态沿仓内惯例：node:test + node:assert/strict，tmpdir + git init fixture（参考 test/verify-evidence-triple.test.mjs 的 makeFx 风格），Windows 路径正斜杠归一'
  - 'docs/sillyspec/troubleshooting.md 追加新章节（编号接续现状 §65 → §66）：execute 双真相门禁口径——五坑现象/根因/修复口径一览，加两条已知边界（①未声明在途文件仍可能带坏基线：隔离面=显式声明面，绕过=先声明 guard.json/design §6 或先修复主仓；②resolveVerifyChangedFiles 补齐段口径残留 R-09，待该函数下次触碰时统一到 helper 口径）'
  - '全量跑 npm test （node test/run-tests.mjs）与 npm run lint （node test/check-syntax.mjs），红项逐一归因：本变更缺陷回对应 task 修，既有 flake 单跑复核吸收'
acceptance:
  - 'npm test 全绿（node test/run-tests.mjs 退出 0，含 test/worktree-dual-truth-gates.test.mjs 五组用例全部通过）'
  - 'npm run lint 0 告警 （node test/check-syntax.mjs）'
  - '五组用例各含至少一条正向断言（修复后行为）+ 一条零回归断言（存量场景不变），逐条对应 requirements.md FR-01~FR-05 GWT'
  - 'troubleshooting.md 新章节含双真相门禁口径与两条已知边界（未声明在途文件 / resolveVerifyChangedFiles 残留），章节编号接续无冲突'
  - '既有 test/scan-staleness.test.mjs、test/scan-refresh.test.mjs 若并发假红：单跑复核通过并留注记（不改其断言与阈值）；串行重跑仍红才定位修复'
verify:
  - 'npm test'
  - 'npm run lint'
constraints:
  - '既有 flake（scan-staleness/scan-refresh 并发假红）单跑复核吸收——单独重跑通过即视为环境并发噪声不计入本卡缺陷，以串行重跑判定为准；禁止改测试阈值/断言来「转绿」'
  - '发现 task-01~05 实现缺陷时回报告对应 task 修复，本卡不顺手改 src 实现（src 文件不在本卡 allowed_paths）'
  - '不改 .sillyspec/changes/2026-09-15-worktree-dual-truth-gates/ 下已定稿文档（design/plan/decisions/requirements）与 plan/tasks.md'
  - '不为凑覆盖率加与五坑无关的用例；测试只断言行为契约，不断言内部实现细节'
  - 'Windows 兼容：fixture 路径 join + 正斜杠归一，无 shell 字符串拼接注入'
related_tests:
  - test/verify-evidence-triple.test.mjs
  - test/verify-evidence-committed-diff.test.mjs
expects_from:
  - 'task-01：worktree.js _overlayBaseline 三道 foreign 剔除已落地（FR-01 测试面）'
  - 'task-02：worktree-apply.js changedFiles no-op 剔除已落地（FR-02 测试面）'
  - 'task-03：worktree.js create 供给步 + meta.supplyFiles 已落地（FR-03 测试面）'
  - 'task-04：task-review.js helper + complete.js 并入口径 + attributeSuspectTasks 多归属已落地（FR-04 测试面）'
  - 'task-05：verify-postcheck.js runRequiredEvidenceCheckV2 双根已落地（FR-05 测试面）'
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
