---
id: task-03
title: 'cannot_verify 硬门与执行次序接线'
title_zh: 'cannot_verify 硬门与执行次序接线'
author: 'qinyi'
created_at: 2026-09-08 23:16:18
priority: P0
depends_on: ['task-02', 'task-04']
blocks: []
requirement_ids: [FR-03]
decision_ids: [D-002@v1]
allowed_paths:
  - src/run/gates.js
target_files:
  - src/run/gates.js
expects_from:
  needs: task-02: runVerifyRequiredEvidenceCheck v2 blocked 语义与 items[].verification；task-01: backfillFactsFromMdAndTests；task-04: checkIntegrationEvidence v2 opts
goal: >
  verify --done 收尾链接线：backfill 先行 → runValidators → test 实测二次回填 → cannot_verify 硬门（FR-03 + 执行次序）。
implementation:
  - gates.js verify 收尾重排：完成 gate 前先调 backfillFactsFromMdAndTests（仅 md 槽段：conclusion/requiredEvidence/runtimeEvidence 固化）→ 既有 runValidators（结论门/集成证据门此时读得到固化值）→ verify 专属块：test 实测后二次回填 tests 段 → cannot_verify 硬门（runVerifyRequiredEvidenceCheck status=blocked 且非豁免 → rollback 阻断，输出明细与修复指引）
  - 失败输出：逐 item 列 verification 明细（filesExist/mtimeOk/diffHit/pathClass）+ 豁免写法指引
  - W3 接线后补 gates 级 e2e 断言（在 task-02 函数级 blocked 测试之上）：blocked → rollback 不推进完成
acceptance:
  - cannot_verify 无豁免 missing → verify --done 被阻断回 pending（rollback 语义同 test 门失败）
  - 豁免后缀或核验通过 → 正常完成
  - 执行次序：backfill 在 runValidators 前、tests 段在实测后（有断言或注释锚定）
  - 无 evidence 需求变更 → 全部 skipped 行为不变
verify:
  - node --test test/run-gates.test.mjs
  - npm test（模块子集门禁见 --done 实测）
constraints:
  - 只动 gates.js（e2e 断言若需新测试文件，进本卡 allowed_paths 前先按追加规则扩边界）
  - 不触碰 lint/parity 既有接线语义
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
