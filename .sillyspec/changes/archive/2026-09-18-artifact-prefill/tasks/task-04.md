---
id: task-04
title: 'NEW:test/prefill.test.mjs——三槽直测+refresh 幂等+已确认跳过+注清零+定向生成器回归；全量绿'
title_zh: 'NEW:test/prefill.test.mjs——三槽直测+refresh 幂等+已确认跳过+注清零+定向生成器回归；全量绿'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-18 23:50:25
priority: P0
depends_on: ['task-01', 'task-02', 'task-03']
blocks: []
requirement_ids: [FR-01, FR-02, FR-03]
decision_ids: [D-001@v1, D-002@v1, D-003@v1, D-004@v1, D-005@v1]
allowed_paths:
  - test/prefill.test.mjs
  - test/design-facts.test.mjs
  - docs/sillyspec/cost-baseline-2026-09-18.md
target_files:
  - NEW:test/prefill.test.mjs
goal: >
  新建 test/prefill.test.mjs 以七组断言收口预填全语义——三槽直测/幂等/跳过/注清零双态/定向生成器回归，保全量绿。
implementation:
  - 新建 test/prefill.test.mjs（node --test）：fixture 为临时 change 目录（tasks/*.md target_files+decisions.md+requirements.md 样本）
  - 第 1-3 组·三槽直测：prefillFileChangeList（target_files 并集/NEW 前缀保形/design 清单形态行）+prefillDecisionTable（D-xxx@vN → 表行，状态「待确认」）+prefillCardIds（FR-NN+决策清单 → { requirementIds, decisionIds }），输出均带来源注「（预填冒号 核对后删本注——字面量分散写防探针自咬）」
  - 第 4 组·幂等：runPrefillRefresh 同输入二次重放，产物与 { filled, skipped, confirmed } 结果一致
  - 第 5 组·已确认跳过：预填注已删槽不覆盖人工内容（confirmed 计数）
  - 第 6 组·注清零双态：--done 门（注在场 → advisory；删净 → 过）+归档前校验（注在场 → error；删净 → 过）
  - 第 7 组·定向生成器回归+全量：design-init/taskcard 生成骨架白名单槽含预填注值；npm test+npm run lint 全绿
acceptance:
  - 三槽直测组绿：清单=并集且 NEW 前缀保形/表行状态「待确认」/ids 抽取正确，输出均带来源注
  - refresh 幂等组+已确认跳过组绿（人工内容保护实证）
  - 注清零双态组绿（--done advisory 与归档 error 各双态）+定向生成器回归组绿
  - 全量 npm test 与 npm run lint 全绿
verify:
  - node --test test/prefill.test.mjs
  - npm test
  - npm run lint
constraints:
  - 只新建 test/prefill.test.mjs 不改产品代码；断言失败修逻辑不修测试（AGENTS.md 第 11 条）
  - fixture 用临时目录，断言兼容 Windows/Linux/macOS（路径分隔/行尾）
---

<!-- 骨架由 sillyspec taskcard 生成（LF 行尾 + frontmatter 已闭合 + 硬校验 9 字段齐全）。
     用 Edit tool 填充上方占位符（allowed_paths/goal/implementation/acceptance/verify/constraints 等），
     勿用 Write 整文件重写——会引入 CRLF 行尾/漏闭合 ---/漏字段回归。
     ⚠️ plan --done 硬校验会拦截未替换的占位符（FR-XX / D-XXX / src/example/file.ts /
     全组直测+定向回归+全量绿 / 具体步骤 1 / 可验证的验收条件 1 / 边界约束 1）——占位符视同缺字段。
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
