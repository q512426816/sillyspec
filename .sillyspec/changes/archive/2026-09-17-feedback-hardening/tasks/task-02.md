---
id: task-02
title: '探针7 锚点三形态口径对齐——预填说明改写 + advisory 补反引号形态 + gates 文案 + 断言反转'
title_zh: '探针7 锚点三形态口径对齐——预填说明改写 + advisory 补反引号形态 + gates 文案 + 断言反转'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-17 08:59:25
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-02]
decision_ids: [D-005@v2]
allowed_paths:
  - src/verify-probes.js
  - src/probe7-anchor-check.js
  - src/run/gates.js
  - test/probe7-anchor-testfile.test.mjs
target_files:
  - src/verify-probes.js
  - src/probe7-anchor-check.js
  - src/run/gates.js
  - test/probe7-anchor-testfile.test.mjs
goal: >
  探针7 矩阵证据锚点口径三处对齐硬门三形态（.test. / file:line / 反引号）：预填说明明示三形态+行号可省
  （删误导性的「或人工核验提示」），advisory 本地判定补反引号第三形态与硬门同权，gates 提示文案同步——
  消灭 agent 在行号上三轮往返才过门的摩擦（用户 2026-09-17 负面②）。
implementation:
  - 'verify-probes.js renderProbe7Lines 预填说明行（:963）改写：covered/partial 证据须含测试锚点三形态之一（file:line / `.test.` 测试文件名 / 反引号包裹的路径或测试名），行号可省；uncovered/non-testable 证据自由形态；保留「预填≠结论必须复核改写」与枚举纯值要求'
  - 'probe7-anchor-check.js：新增 BACKTICK_RE = /`[^`]+`/，covered 判定改三形态之一即过（ANCHOR_RE 与 .test. 原判定不动）；头注释口径更新为 D-005@v2（supersedes friction5 D-005@v1 的「裸反引号不收」，注明复潮依据=硬门已保证锚点存在、advisory 增量实证为纯摩擦）'
  - 'run/gates.js probe7 advisory 提示文案（:922-925）同步三形态：「缺 file:line / `.test.` 文件名 / 反引号路径锚点」，应给示例同步'
  - 'test/probe7-anchor-testfile.test.mjs：反转既有裸反引号断言（现 :42-49 断言 missingAnchors.length===2 → 反引号证据不再 missing，改断言 length 收窄）；file:line/.test. 原用例期望不变'
acceptance:
  - 'covered 行证据为反引号包裹的测试路径（无行号无 .test.）→ advisory 不再提示回补'
  - 'covered 行证据无任何三形态（如「人工核验通过」裸文本）→ advisory 仍提示（增量保护面不丢）'
  - 'file:line 与 `.test.` 锚判定与提示行为不变（存量两形态用例期望逐一不变）'
  - '预填说明含三形态明示与「行号可省」字样；硬门 stage-contract.js 零改动'
verify:
  - 'npm test -- test/probe7-anchor-testfile.test.mjs'
  - 'npm test（全量回归）'
constraints:
  - '不动 stage-contract.js 硬门三形态本体与 MATRIX_VERDICT_WHITELIST'
  - 'probe7-anchor-check 维持零依赖单文件（不 import stage-contract）'
  - 'advisory 仍不阻断（gates.js fail-soft 语义不变）'
  - '预填说明是 HTML 注释行，不改表格结构（ensureAcceptanceMatrixSection 幂等不受影响）'
---
