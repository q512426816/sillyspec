---
id: task-03
title: 'facts.smokeRan producer（五边界态）+ evaluatePassEligibility 第五条件（smoke-not-run 枚举/判级限定/不设 handover 豁免）'
title_zh: 'facts.smokeRan producer（五边界态）+ evaluatePassEligibility 第五条件（smoke-not-run 枚举/判级限定/不设 handover 豁免）'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-17 22:06:55
priority: P0
depends_on: ['task-01', 'task-02']
blocks: []
requirement_ids: [FR-02]
decision_ids: [D-002@v1]
allowed_paths:
  - src/verify-probes.js
  - src/verify-facts-schema.js
  - src/stage-contract.js
target_files:
  - src/verify-probes.js
  - src/verify-facts-schema.js
  - src/stage-contract.js
provides:
  - contract: smoke-ran-fact
    fields:
      - 'facts.smokeRan——三态枚举 ran/not-ran/not-configured（producer=backfillFactsFromMdAndTests 主路径无条件产出，五边界态封闭）'
      - 'smoke-not-run-trigger——evaluatePassEligibility 第五条件 triggered 枚举（判级 integration/deployment-critical 限定，smokeRan≠ran 触发，不设 handover 豁免子句）'
goal: >
  把 smoke 执行事实接进 PASS 封顶链（D-002/FR-02）——producer 侧 backfillFactsFromMdAndTests
  从 quality-scan 实测记录推导 facts.smokeRan（五边界态封闭），consumer 侧
  evaluatePassEligibility 加第五条件 smoke-not-run（判级 critical 限定 + 不设 handover
  豁免 + 两出路文案），封死「判级 critical 变更不带接口冒烟静默 PASS」的洞。
implementation:
  - producer 落位（src/verify-probes.js）——在 backfillFactsFromMdAndTests 主路径无条件产出块（:1818-1828，X-08 时序口径——首次 backfill 先于 runValidators，无 testCheckResult 时点也可读）增 smokeRan 判定，学 judgeIntegrationRan 自读先例（:1719-1745——quality-scan 记录按 factsPath 目录上推 specBase/.runtime/verify-quality-scan-<changeName>.json，不依赖调用方传参；smoke 段字段形态以 deps task-01 落盘的实测记录 additive smoke 段为准）。五边界态封闭：记录在场且 smoke 段 exit 0 → ran；smoke 段 exit 非 0 或超时 → not-ran（失败也是未通过）；记录在场但无 smoke 段（升级过渡期存量记录）→ not-ran + fail-open 注记（X-01 口径）；commands.smoke 配置值为 unavailable → not-configured（对齐 verify-quality-scan.js:191-192 coverage 先例）；记录缺失 → not-ran + fail-open 注记；未配置键 → not-configured。写入 facts.smokeRan。
  - additive 登记面（src/verify-facts-schema.js）——validateFactsV2 在 PASS 封顶事实面 additive 登记区（:193-209）加 smokeRan 校验：在场才校验枚举 ∈ {ran, not-ran, not-configured}（非法值报「smokeRan 非法枚举值」），不在场零报错（存量 facts 零迁移通过）；schemaVersion 保持 2 不变。
  - consumer 第五条件（src/stage-contract.js）——evaluatePassEligibility（:1010-1090）在四条件与 runtimeEndpointExcluded 附加条件之后加第五条件：criticalLevel（:1023 既有变量，判级 ∈ {integration-critical, deployment-critical}）且 facts.smokeRan !== 'ran' → triggered 加枚举 smoke-not-run（fact='smoke-not-run'，detail 注明 smokeRan 实值与判级）+ error 文案两出路（①配 commands.smoke 并复跑质量扫描步；②降级 PASS WITH NOTES 移交承载，不算失败）；not-configured 态文案附配置键指引（local.yaml commands.smoke）；factsMissing 沿双源 fail-closed 同族口径按触发处理（smokeRan 不可证伪）；非判级零行为（:1075-1087 判级限定附加条件同款形态）。
  - 不设 handover 豁免子句——第五条件分支不读 handover：advisory handover 在场不构成 smoke 缺失的 PASS 豁免；blocking handover 在场由批次 A 条件②独立拦下（出口=NOTES），两条件各自触发不互斥。注册壳 validatePassEligibility（:1150-1175）零改动——壳已透传 facts/changeRiskProfile，纯函数内加分支即生效。
acceptance:
  - producer 五边界态+未配置键封闭——按 quality-scan 记录各形态（smoke 段 exit 0 / exit 非 0 / 超时 / 无 smoke 段 / 记录缺失 / unavailable / 未配置键）facts.smokeRan 依次产出 ran / not-ran / not-ran / not-ran+注记 / not-ran+fail-open 注记 / not-configured / not-configured，且在 backfill 主路径无条件产出（不依赖 testCheckResult）
  - validateFactsV2——smokeRan 缺席零报错（存量零迁移）、三合法枚举通过、非法值报「smokeRan 非法枚举值」；schemaVersion 仍为 2
  - 判级 integration-critical 或 deployment-critical × smokeRan ∈ {not-ran, not-configured} × 结论=PASS → triggered 含 fact='smoke-not-run' 且 ok=false，error 文案含「配 commands.smoke 复跑质量扫描步」与「降级 PASS WITH NOTES 承载」两出路；not-configured 态另附 commands.smoke 配置键指引
  - advisory handover 行在场 + 判级 critical + smokeRan≠ran + 结论=PASS → 第五条件仍触发（不设 handover 豁免子句）；blocking handover 在场时条件②与第五条件同时各自触发
  - 判级非 critical（unit-sufficient 等）任意 smokeRan → triggered/errors 零增量；factsExpected=false → 整体 ok 兼容口径不变
  - npm test 既有全量不回归（pass-eligibility 既有断言零红）
verify:
  - npm test
  - node --test test/pass-eligibility.test.mjs
  - npm run lint
constraints:
  - 测试划界——不改 test/pass-eligibility.test.mjs 与 test/verify-conclusion-slot.test.mjs（第五条件态与 smoke-not-run 文案断言增量归 task-07，plan.md 任务总表划界）；本任务以既有测试不红为准
  - 未配置 commands.smoke 且非判级 critical 零行为变化；facts schemaVersion 保持 2、结论枚举不变（全局硬约束 4）；初版封顶不 fail——error 出路文案按「降级 NOTES 承载（不算失败）」口径，升 fail 归后续变更（D-002）
  - evaluatePassEligibility 保持纯函数（零 MD 解析、零 IO，X-09 判定层）；分层单向——stage-contract 不 import verify-probes（readFactsForEligibility :966-977 就地实现先例，全局硬约束 3）
  - producer 判定输入自读自推导（X-08 主路径无条件产出口径），smokeRan 自 quality-scan 记录推导、不受 verify-result.md 篡改影响（R-06 双源兜底）
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
