---
id: task-04
title: 'gates.js verify 收尾块族删除——slot-backfill/verifyStartAt/cannot_verify 硬门/探针10 预填注/风险门 PASS 封顶/删除对账/探针一致性抽查+progress.js 与 progress/change-registry.js 的 verifyStartAt 读取退役（依赖 task-01）'
title_zh: 'gates.js verify 收尾块族删除——slot-backfill/verifyStartAt/cannot_verify 硬门/探针10 预填注/风险门 PASS 封顶/删除对账/探针一致性抽查+progress.js 与 progress/change-registry.js 的 verifyStartAt 读取退役（依赖 task-01）'
author: 't'
generated_by: sillyspec-taskcard
created_at: 2026-11-26 10:36:06
priority: P0
depends_on: [task-01]
blocks: [task-08]
requirement_ids: [FR-01]
decision_ids: [D-007@v1]
allowed_paths:
  - src/run/gates.js
  - src/progress.js
  - src/progress/change-registry.js
target_files:
  - src/run/gates.js
  - src/progress.js
  - src/progress/change-registry.js
goal: >
  删除 gates.js 的 verify 专属收尾块族与 progress 侧 verifyStartAt 读取——语义验收门（PASS 封顶/风险门/探针一致性）按 D-007 随阶段退役。
implementation:
  - src/run/gates.js:747-766 facts slot-backfill 块删除；verifyStartAt 锚点逻辑删除；:902 cannot_verify 硬门删除；:817-824 探针 10 预填注 error 门删除；风险门控 PASS 封顶（evaluatePassEligibility 调用点）删除；runVerifyDeletionCheck 删除对账删除；:2438 探针一致性抽查删除
  - src/progress.js:1129 verifyStartAt 基准读取退役（getStageCompletedAt 消费点）
  - src/progress/change-registry.js:90 同款读取退役
  - 删除块对应的动态 import（verify-probes 等）一并清理——被引函数若在保留十签名内则仅删调用不删函数
acceptance:
  - grep -n "verifyStartAt" src/run/gates.js src/progress.js src/progress/change-registry.js 零命中（保留签名函数本体除外）
  - node test/check-syntax.mjs 绿
verify:
  - node test/check-syntax.mjs
  - node --test test/stage-machine-verify-retired.test.mjs（回归）
constraints:
  - 保留十签名函数本体不得删（runCeremonyDualRunCheck 等——本卡只删 verify 收尾调用点，archive confirm 出口的消费保留）
  - 与 task-03 共写 gates.js 由 Wave 屏障消化（本卡在 W2 先行）
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
