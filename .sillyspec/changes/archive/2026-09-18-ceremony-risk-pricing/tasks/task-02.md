---
id: task-02
title: 'classifyReviewTier 委托引擎（review-tier.js）——旧文件数≤3 规则降为 S0/S1 内部断路器；返回 {tier, ceremonyTier} 双字段过渡；三消费方（gates.js:242/:1015、prompt.js:1075、stage-review.js:570 注释约定）逐一核对兼容'
title_zh: 'classifyReviewTier 委托引擎（review-tier.js）——旧文件数≤3 规则降为 S0/S1 内部断路器；返回 {tier, ceremonyTier} 双字段过渡；三消费方（gates.js:242/:1015、prompt.js:1075、stage-review.js:570 注释约定）逐一核对兼容'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-18 14:24:22
priority: P0
depends_on: ['task-01']
blocks: []
requirement_ids: [FR-02]
decision_ids: [D-002@v1, D-005@v1]
allowed_paths:
  - src/review-tier.js
  - test/stage-review.test.mjs
target_files:
  - src/review-tier.js
  - test/stage-review.test.mjs
expects_from:
  task-01: 'computeCeremonyTier 签名与返回结构 { tier, components, reasons, explicitDowngradeAccepted }（含无 riskDetection 输入时 blast 缺省 S2 的 brownfield 兼容分支；frictionCounts 三键超集透传容忍）'
goal: >
  classifyReviewTier 从「planLevel 三分支＋文件数≤3 启发式」切换为委托 computeCeremonyTier
  客观定价（评审档接管，FR-02/D-002），旧文件数规则降级为 S0/S1 内部断路器保兼容，
  返回 {tier, ceremonyTier} 双字段过渡且保留 reason/fileCount 现字段不破三消费方。
implementation:
  - review-tier.js import computeCeremonyTier（task-01 契约），classifyReviewTier 主路径改为组装输入（riskDetection 取 change-risk-profile 判级输出、declaredFiles 取 design 文件变更清单解析、frictionCounts 由调用侧 ledger 口径透传或缺省空账）后委托引擎取档
  - 旧「plan_level 三分支＋文件数≤SELF_REVIEW_FILE_THRESHOLD 判 self」规则降级为 S0/S1 档内部并列断路器——引擎档 S0/S1 且断路器命中 → tier=self 保现状兼容；引擎档 S2/S3 → tier=independent 强制独立审查
  - 返回结构双字段过渡——{ tier, ceremonyTier, reason, fileCount }，reason/fileCount 现字段原样保留（gates.js:1031 与 prompt.js:1158 消费 tier.reason，字段缺失即破）
  - 三消费方锚点逐一核对零适配——run/gates.js:242（align 侧 Stage Review tier 分级）与 ：1015（Stage Review Gate 主门 ：1011-1094 完成链）、run/prompt.js:1075/:1088（{REVIEW_TIER} 注入段）、stage-review.js:570 注释约定（调用方先 classifyReviewTier 分级再 validateStageReview）
  - test/stage-review.test.mjs 增量钉委托行为——旧规则兼容断言（plan_level=none/light/full 现路径、无 plan_level 文件数≤3/＞3 启发式）＋新增双字段断言（ceremonyTier 随引擎档、S2/S3 强制 independent、brownfield 无 risk 输入缺省 S2）
acceptance:
  - classifyReviewTier 返回双字段 { tier, ceremonyTier } 且保留现 reason/fileCount 字段——三消费方（gates.js:242/:1015、prompt.js:1075、stage-review.js:570 注释约定）逐一核对零改动可继续消费（tier.reason 消费锚点 gates.js:1031）
  - 评审档由 computeCeremonyTier 决定——引擎档 S2/S3 → tier=independent；S0/S1 且旧断路器命中 → tier=self（旧文件数规则降为内部断路器，兼容语义不破）
  - 旧变更 brownfield（无 risk 输入）→ blast 缺省 S2 → independent，行为近似现状不静默降级
  - test/stage-review.test.mjs 既有断言全绿＋委托行为增量断言（双字段/档位接管/断路器兼容/brownfield 缺省档）通过
verify:
  - node --test test/stage-review.test.mjs（委托行为＋旧规则兼容定向）
  - node --test test/worktree-execute-spec-drift.test.mjs（{REVIEW_TIER} 消费连带定向——如受动）
  - npm run lint —— 即 node test/check-syntax.mjs
constraints:
  - 只动 allowed_paths 内文件（src/review-tier.js、test/stage-review.test.mjs）——gates.js/prompt.js/stage-review.js 仅核对不改（升档接线属 task-03、prompt 档位化属 task-05）
  - 返回结构只增不改——reason/fileCount 现字段语义与文案不变（消费方零适配）；双字段为 R-05 过渡期形态
  - Windows/Linux 双平台——路径处理用 node:path join、文件 LF 行尾
  - 不动 L1 机械门（探针/api-matrix/docs-check/代码证据）
  - 回退路径保持——委托收敛在 classifyReviewTier 单点（摘除即回旧文件数规则，design 兼容策略）
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
