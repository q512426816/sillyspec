---
id: task-05
title: '契约层退役——stage-contract/stage-contract-spec verify 规则族（validateVerifyOutputs/evaluatePassEligibility/checkProbeConsistency/resolveFactsExpected/isIrStrictVerifyChange）+complete.js 批量快进资格；grep test/ 消费被删导出的测试同步退役（plan 规则不动）（依赖 task-01）'
title_zh: '契约层退役——stage-contract/stage-contract-spec verify 规则族（validateVerifyOutputs/evaluatePassEligibility/checkProbeConsistency/resolveFactsExpected/isIrStrictVerifyChange）+complete.js 批量快进资格；grep test/ 消费被删导出的测试同步退役（plan 规则不动）（依赖 task-01）'
author: 't'
generated_by: sillyspec-taskcard
created_at: 2026-11-26 10:36:06
priority: P0
depends_on: [task-01]
blocks: [task-08]
requirement_ids: [FR-01]
decision_ids: [D-007@v1]
allowed_paths:
  - src/stage-contract.js
  - src/stage-contract-spec.js
  - src/run/complete.js
target_files:
  - src/stage-contract.js
  - src/stage-contract-spec.js
  - src/run/complete.js
goal: >
  退役契约层 verify 规则族与批量快进资格：validateVerifyOutputs/evaluatePassEligibility/checkProbeConsistency/resolveFactsExpected/isIrStrictVerifyChange 及 verify spec 段、complete.js 的 verify-facts 批量资格；plan 阶段规则不动。
implementation:
  - src/stage-contract.js:662 isIrStrictVerifyChange、:673 validateVerifyOutputs、:1548 resolveFactsExpected、:1575 evaluatePassEligibility、validators 注册表的 verify 段删除；readVerifyMode import（:10）删除；仅被删除面消费的 helper 一并清理
  - src/stage-contract-spec.js verify spec 段删除
  - src/run/complete.js:1824 verify-facts.json 在场批量快进资格删除（verify 批量完成分支）
  - grep test/ 消费被删导出的测试同步退役（pass-eligibility/verify-facts-v2 等——逐个判别：消费删除面则删，消费保留面则改）
acceptance:
  - grep -n "evaluatePassEligibility\|validateVerifyOutputs\|resolveFactsExpected\|isIrStrictVerifyChange" src --include=*.js 零命中
  - plan 阶段规则与 target_files 对账既有测试回归绿
verify:
  - node --test test/stage-contract.test.mjs test/stage-contract-spec.test.mjs
  - node test/check-syntax.mjs
constraints:
  - plan 阶段规则/校验器零改动（validateDesignForPlan 等保留）
  - checkTransition（:2048）已被 task-01 改边，本卡不得回退
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
     implementation/acceptance 里的源码位置同样写仓根相对全路径+行号（形如 src/foo.js:<行号>——行号写实际数字）——
                    裸文件名在 docs-check 层1 靠 basename 全仓扫描找候选，找不到候选或关键词
                    窗口不匹配即失效，到 pre-push 才拦（2026-09-19 实证 64 处返工）。
     可选字段按需插进上方 frontmatter（规则见 taskcard-rules）：
     repo:          仅跨仓 task 填（local.yaml repos: 注册的仓 key；缺省=main。allowed_paths 相对该仓根写，
                    禁止带仓库名前缀/绝对路径——review 对账按仓根相对路径匹配，带前缀永不命中）
     provides:      仅当本 task 给其他 task 提供接口/DTO/响应时填
     expects_from:  仅当本 task 消费其他 task 的契约时填
     related_tests: 仅当本 task 改动导致既有测试断言失效时填（测试路径须同时进 allowed_paths） -->
