---
author: qinyi
created_at: 2026-11-26T09:41:41+08:00
---
# 任务清单（Tasks）— 2026-11-26-verify-stage-retire

> 任务名唯一真相在本注册表；plan.md Wave 段为纯 ID 引用。

- [x] task-01: 阶段机删除——verify.js 删+index 注销+checkTransition 改边（execute→archive 合法）+progress/shared 四枚举与 REVIEW_STAGES 清 verify+枚举/边单测
- [x] task-02: archive 前置门——archive.js 插 noAI「收口实测门」（3→4 步）、verify-quality-scan 更名 archive-quality-scan 并改挂载（前缀同更名、阻断只认 commands.test、本仓 unavailable 关闭态）+门两态测试（依赖 task-07）
- [x] task-03: skip/PID/verify-mode 退役——gates.js 删 reapVerifyServices 与 pids 读逻辑、stage.js 删 skip 短路、next.js 删待验证/skip 分支、verify-mode.js 删+config-schema 键清理+存量键读取忽略回归锚（依赖 task-01；与 task-04 共写 gates.js 由 Wave 屏障消化）
- [x] task-04: gates.js verify 收尾块族删除——slot-backfill/verifyStartAt/cannot_verify 硬门/探针10 预填注/风险门 PASS 封顶/删除对账/探针一致性抽查+progress.js 与 progress/change-registry.js 的 verifyStartAt 读取退役（依赖 task-01）
- [x] task-05: 契约层退役——stage-contract/stage-contract-spec verify 规则族（validateVerifyOutputs/evaluatePassEligibility/checkProbeConsistency/resolveFactsExpected/isIrStrictVerifyChange）+complete.js 批量快进资格；grep test/ 消费被删导出的测试同步退役（plan 规则不动）（依赖 task-01）
- [x] task-06: 命令与 prompt 面——run verify 路由/verify-probes 命令族删除、prompt.js verify 组装+HANDOVER_SUMMARY 删、archive.js:78-80 移交项块删、progress-confirm verify 档提示删（指路语带 doctor legacy 通道）（依赖 task-01）
- [x] task-07: verify-postcheck 拆分（保留十签名：resolveVerifyChangedFiles/reconcileTargetFiles/runVerifyTestCheck/runVerifyLintCheck/triageLintOwnership/resolveTestTimeoutMs/applyTimeoutGuard/readTimeoutPolicyConfig/runCeremonyDualRunCheck/extractKnownFailures）+verify-probes/verify-facts-schema/probe7-anchor-check 删除；grep test/ 消费被删导出的测试同步退役（依赖 task-01）
- [x] task-08: 消费面降级清理 27 面（archive-delta 容空/change-risk-profile 消费点删/preview-progress/**flow.js 与 flow-parity.js 升厚文案**/machine-draft/machine-interface/prefill/redlines/scope-audit/ui-visual/green-cache/run-shared/runtime-paths/task-review/taskcard-frontmatter/validate-artifacts/verify-draft/watcher/worktree/worktree-apply/foreign-declared/stages-plan/stages-plan-postcheck/stages-quick/mcp-server/hooks-worktree-guard）+plan/quick 消费回归（mcp-server：stage enum 删 'verify'、facet verify-test 保留、zod description 中文指路）（依赖 task-02, task-03, task-07, task-09）
- [x] task-09: doctor legacy——在途 verify 检测+legacyCompleteRetiredStage 底层通路（绕三处 VALID_STAGES 拦截、一次写两态、不加幽灵边）+显式确认+用例（依赖 task-01）
- [x] task-10: 文档镜像——file-lifecycle 阶段表+archive 3→4、_extract.mjs staticStages 删 'verify' 后重跑、AGENTS/CLAUDE/.claude-CLAUDE 五阶段→四阶段、skills 更新、module-map paths、conventions.md:47-53 段修订（依赖 task-08）
