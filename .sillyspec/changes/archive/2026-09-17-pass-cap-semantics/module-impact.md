---
author: qinyi
created_at: 2026-09-17 12:10:00
---
# 模块影响分析（Module Impact）— 2026-09-17-pass-cap-semantics

> 文件×模块归属按 _module-map.yaml paths 前缀匹配预填；影响类型与 review 标记为语义判断（真实 > 记录）。

## 模块影响矩阵

| 模块 | 变更文件 | 影响类型 | 需 review | 状态 |
|---|---|---|---|---|
| core-engine | src/stage-contract.js | 逻辑变更（validatePassEligibility 新 validator + validateAcceptanceMatrix 联动分支 + requiresEvidence 分层） | ✅ | pending |
| core-engine | src/verify-probes.js | 逻辑变更（backfill 扩写 facts producer + parseHandoverRows 四列 + parseDbScriptDeclarations + Runtime Evidence 收口提示 + probe7 多根） | ✅ | pending |
| core-engine | src/verify-facts-schema.js | 数据登记（additive 可选字段 integrationRan/dbScriptDeclarations/matrixPartialRows/runtimeEndpointExcluded/handover[].severity） | ✅ | pending |
| core-engine | src/change-risk-profile.js | 逻辑变更（auditRuntimeReceipt sourceTag 可选参 + 命令来源分类） | ✅ | pending |
| core-engine | src/verify-postcheck.js | 逻辑变更（mergeCrossRepoResults 前置 skip 短路） | ✅ | pending |
| core-engine | src/task-review.js | 逻辑变更（isExplicitReviewWrite 白名单加 adoptTaskReviewMechanics） | ✅ | pending |
| docs-consistency | src/design-facts.js | 逻辑变更（无段头跨仓行降 warning） | ✅ | pending |
| runtime | src/run/complete.js | 逻辑变更（prefetchDiffFileSet 并跨仓 diff 源 + Wave 完成度门前置接线） | ✅ | pending |
| runtime | src/run/complete-handlers.js | 逻辑变更（assertWaveTasksComplete 新增，D-013） | ✅ | pending |
| runtime | NEW:test/wave-task-complete-gate.test.mjs | 新增（FR-12 直测） | — | pending |
| runtime | test/run-complete-step-execute-batch.test.mjs | 逻辑变更（Case 2 双 Wave 夹具适配，D-013） | — | pending |
| worktree | src/worktree-apply.js | 逻辑变更（apply 尾声 db/*.sql 兜底声明门） | ✅ | pending |
| stages | src/stages/archive.js | 逻辑变更（Step3 门控 definition 文案——纯 prompt 模板，无逻辑挂点） | — | pending |
| runtime | src/run/complete-handlers.js | 逻辑变更（archive --confirm 前置 db 声明兜底校验） | ✅ | pending |
| runtime | src/run/prompt.js | 逻辑变更（archive 确认 prompt 注入 facts.handover 清单——{HANDOVER_SUMMARY} 占位符） | ✅ | pending |
| runtime | src/run/gates.js | 逻辑变更（matrixSlots 动态 import 传参兜底，一行级透传） | — | pending |
| stages | src/stages/verify.js | 逻辑变更（阶段 prompt 封顶语义自查提示） | — | pending |
| stages | src/stages/brainstorm.js | 逻辑变更（审查清单新增两条目的 prompt 源） | — | pending |
| core-engine | src/stage-review-checklist.js | 数据登记（D-009 两条新增条目） | — | pending |
| core-engine | docs/prompt/verify.md | 文档镜像同步（_extract.mjs 再生） | — | pending |
| core-engine | docs/prompt/brainstorm.md | 文档镜像同步（_extract.mjs 再生——brainstorm prompt 源变更连带） | — | pending |
| core-engine | docs/prompt/_extracted.json | 文档镜像数据（_extract.mjs 再生产物） | — | pending |
| core-engine | test/stage-review-checklist.test.mjs | 逻辑变更（清单新增条目断言随行） | — | pending |
| core-engine | NEW:test/pass-eligibility.test.mjs | 新增（FR-01~07 直测） | — | pending |
| core-engine | test/cross-repo-verify.test.mjs | 逻辑变更（skip 跨仓档位断言） | — | pending |
| core-engine | test/verify-handover-structured.test.mjs | 逻辑变更（severity 四列/互锁断言） | — | pending |
| core-engine | test/verify-conclusion-slot.test.mjs | 逻辑变更（封顶触发文案断言） | — | pending |
| core-engine | test/acceptance-matrix-probe.test.mjs | 逻辑变更（probe7 联动分支断言） | — | pending |
| core-engine | test/acceptance-matrix-gate.test.mjs | 逻辑变更（联动分支夹具适配） | — | pending |
| core-engine | test/stage-contract.test.mjs | 逻辑变更（豁免洞分层语义翻转断言随行） | — | pending |
| docs-consistency | docs/sillyspec/platform-interface-map.md | 行号锚同步（doc-ref-check 对齐） | — | pending |
| core-engine | test/probe7-anchor-testfile.test.mjs | 逻辑变更（多根内容读取断言） | — | pending |
| core-engine | test/task-review-adopt.test.mjs | 逻辑变更（adopt 白名单生效断言） | — | pending |
| core-engine | test/design-facts.test.mjs | 逻辑变更（无段头降 warning 断言） | — | pending |

## 未匹配文件

无——上表交付文件全部按 _module-map.yaml paths 显式归位（src/stages/ → stages；src/run/ → runtime；src/worktree-apply.js → worktree；src/design-facts.js → docs-consistency（map :122 显式收编）；其余 src 根级与 docs/prompt 镜像 → core-engine）。

## 更新结果

| 目标 | 状态 |
|---|---|
| _module-map.yaml | skipped（无 paths/entrypoints/依赖边变更——交付文件全落在既有模块 paths 内，模块边界零变化） |
| modules/core-engine.md | done（封顶语义/severity/probe 联动契约摘要级变化——经 module-changelog 流转，锚 D-001@v2/D-005@v2/D-003；不手扩正文避免与 changelog 双写） |
| modules/runtime.md | done（complete.js/complete-handlers.js：Wave 完成度门 assertWaveTasksComplete 契约面新增——锚 D-013，changelog 流转） |
| modules/worktree.md | done（worktree-apply.js：db/*.sql 兜底声明门 checkDbScriptDeclarationGate——锚 D-007/D-012，changelog 流转） |
| modules/stages.md | skipped（stages/archive.js definition 文案行级变化无接口变化；brainstorm/verify prompt 新增由镜像与 checklist 承载） |
| modules/docs-consistency.md | skipped（design-facts.js 无段头降 warning 属校验分支级行为，无卡片注意事项级契约变更） |
