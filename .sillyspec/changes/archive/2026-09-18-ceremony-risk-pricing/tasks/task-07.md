---
id: task-07
title: '测试与验收（NEW:test/ceremony-tier.test.mjs + 既有 review-tier/gates/prompt 测试兼容增量）——三轴封顶/映射表/只升不降/双跑错配注入（声明S1事实S2 被flag）/影子隔离/并发锁断言；全量 npm test + lint 绿'
title_zh: '测试与验收（NEW:test/ceremony-tier.test.mjs + 既有 review-tier/gates/prompt 测试兼容增量）——三轴封顶/映射表/只升不降/双跑错配注入（声明S1事实S2 被flag）/影子隔离/并发锁断言；全量 npm test + lint 绿'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-18 14:24:22
priority: P0
depends_on: ['task-01', 'task-02', 'task-03', 'task-04', 'task-05', 'task-06']
blocks: []
requirement_ids: [FR-01, FR-02, FR-03, FR-04]
decision_ids: [D-001@v1, D-002@v1, D-003@v1, D-007@v1, D-008@v1]
allowed_paths:
  - test/ceremony-tier.test.mjs
  - test/stage-review.test.mjs
target_files:
  - NEW:test/ceremony-tier.test.mjs
  - test/stage-review.test.mjs
goal: >
  测试与全量验收收口（plan Wave 5）：新建 test/ceremony-tier.test.mjs 七组断言钉死定价引擎行为契约（FR-01/03/04），test/stage-review.test.mjs 增量钉 classifyReviewTier 委托兼容（FR-02），全量 npm test + lint 双绿。
implementation:
  - 'NEW:test/ceremony-tier.test.mjs 断言组一（三轴取封顶矩阵，FR-01/D-001）：blast/span/friction 分量组合取 max——单分量高档+其余低档 → tier=高档；多分量同档 → 档不变；全低 → S0；reasons 含各命中分量明细留痕。'
  - 断言组二（映射表逐档，FR-01）：RISK_TO_TIER 五档逐一断言（doc-only→S0 / unit-sufficient→S1 / contract-required→S2 / integration-critical→S3 / deployment-critical→S3）；旧变更无 riskDetection 输入 → blast 缺省 S2 保守中档，不静默降级（兼容策略钉死）。
  - 断言组三（escalateByFriction 只升不降+封顶，FR-04/D-008）：未超阈 → tier 不变；超阈 → min(S3, tier+1)；S3 封顶不再升；frictionCounts 含 ledger 超集第三键（verify_run_failed）容忍透传不拒收（plan Wave 1 补遗）。
  - 断言组四（reconcileDualRun 错配注入，FR-03/D-003）：声明 S1 事实 S2 → mismatch=true 且 severity=error；声明档 ≥ 事实档 → 无错配。
  - 断言组五（显式升降规则，FR-01/D-004）：显式升档声明永远尊重（tier 随升且留痕）；显式降档带 reason → explicitDowngradeAccepted=true；无 reason 降档声明不生效；任何自报不产生隐式降档。
  - 断言组六（影子命名空间隔离，FR-04/D-007/R-06）：tmp 目录构造 stage-reviews-shadow/<change>-<stage>-<ts>/review.json（verdict=fail）与主线 stage-reviews/<stage>-review-*/ 并存，断言 getLatestStageReviewRunId 不命中影子产物；再构造「仅影子存在、主线无 marker 无目录」场景断言返回 null（fail-closed 不串台）。
  - 断言组七（并发锁，FR-04/D-008）：tmp 目录模拟两写者交错写 .runtime/ceremony-tier-<change>.json（高档写先落、低档写后到），断言终态档位不回退——「只升不降」不变量在并发写下成立。
  - test/stage-review.test.mjs 增量（FR-02/D-002）：classifyReviewTier 委托后兼容钉——无 risk_detection 输入 → 缺省 S2（行为近似现状不静默降级）；返回 {tier, ceremonyTier} 双字段过渡结构（保留既有 reason/fileCount 字段断言）；旧「文件数≤3」断路器在 S0/S1 内仍生效。
  - 全量验收：npm test —— 即 node test/run-tests.mjs+ npm run lint —— 即 node test/check-syntax.mjs双绿收口；红项若落在本 task 两文件之外（如 task-03 预告的六组受动测试、task-05 预告的 {REVIEW_TIER}/plan_level 文案测试），不就地改他人测试文件——回注所属 task 修复后重跑。
acceptance:
  - node --test test/ceremony-tier.test.mjs 全绿，七组断言（三轴封顶矩阵 / 映射表逐档 / escalateByFriction 只升不降+封顶 / reconcileDualRun 错配注入 / 显式升降规则 / 影子命名空间隔离 / 并发锁不回退）全部有对应用例且通过。
  - test/stage-review.test.mjs 增量断言（无 risk 输入 → 缺省 S2、双字段过渡结构、断路器兼容）通过，且该文件既有断言零回归。
  - npm test 全量零失败（覆盖 task-01~06 全部落地面）。
  - npm run lint —— 即 node test/check-syntax.mjs零错误。
verify:
  - npm test
  - npm run lint
constraints:
  - 测试不 mock 掉档位引擎真实逻辑——computeCeremonyTier / escalateByFriction / reconcileDualRun 直调真函数，仅对 IO 边界（文件系统）用 mkdtempSync tmp 目录隔离。
  - 失败不改测试迁就实现——断言红时修实现侧（回注所属 task），禁止放松断言凑绿（AGENTS 核心规则 11）。
  - 测试风格对齐仓内自研 assert：assert(condition, msg) 计数报告 + mkdtempSync 临时目录，不引入测试框架（参照 test/machine-interface.test.mjs 风格；原指引的 machine-interface-parity.test.mjs 仓内不存在，就近对齐同款自研 assert）。
  - 只动 allowed_paths 两文件；新建文件以 NEW: 前缀登记于 target_files；不改 src/ 任何实现（本 task 是验收方，实现缺陷回注所属 task）。
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
