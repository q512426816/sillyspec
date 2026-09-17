---
author: qinyi
created_at: 2026-09-17 21:55:00
---
# 模块影响分析（Module Impact）— 2026-09-17-api-coverage-smoke

> 文件×模块归属按 _module-map.yaml paths 前缀匹配预填；影响类型与 review 标记为语义判断（真实 > 记录）。

## 模块影响矩阵

| 模块 | 变更文件 | 影响类型 | 需 review | 状态 |
|---|---|---|---|---|
| setup | src/config-schema.js | 配置变更（commands.smoke 键登记） | ✅ | pending |
| runtime | src/run/verify-quality-scan.js | 逻辑变更（smoke 亲跑执行段+超时帽+快照回退+指纹自动含+实测记录 additive smoke 段+回执落盘） | ✅ | pending |
| core-engine | src/verify-facts-schema.js | 逻辑变更（parseEvidenceSlots 逐条 source 提取 + additive 登记 smokeRan 枚举） | ✅ | pending |
| core-engine | src/change-risk-profile.js | 逻辑变更（classifyReceiptSourceTag 认机器段标记直判 cross-layer，B-1） | ✅ | pending |
| core-engine | src/verify-probes.js | 逻辑变更（分类器认标记 + parseDesignApiTable 新函数 + 骨架矩阵段 + smokeRan producer + 消费面/表间 advisory + 回执槽 ensure 注入） | ✅ | pending |
| core-engine | src/verify-postcheck.js | 逻辑变更（checkProbeConsistency 增回执槽一致性对比，R-06） | ✅ | pending |
| core-engine | src/stage-contract.js | 逻辑变更（evaluatePassEligibility 第五条件 smoke-not-run + validateApiCoverageMatrix 新 validator 注册） | ✅ | pending |
| stages | src/stages/verify.js | 逻辑变更（smoke 纪律段命中条件注入 + 两处「CLI 不代跑」矛盾文案改写） | — | pending |
| core-engine | src/stage-review-checklist.js | 数据登记（REVIEW_CHECKLISTS 新增 verify 键 + smoke 纪律条目） | — | pending |
| core-engine | test/stage-review-checklist.test.mjs | 逻辑变更（清单快照键 3→4 随行） | — | pending |
| core-engine | docs/prompt/verify.md | 文档镜像（三步流水线再生） | — | pending |
| core-engine | docs/prompt/_extracted.json | 镜像数据再生 | — | pending |
| core-engine | NEW:test/smoke-gate.test.mjs | 新增（FR-01~03 直测） | — | pending |
| core-engine | NEW:test/api-coverage-matrix.test.mjs | 新增（FR-04~06 直测） | — | pending |
| core-engine | test/pass-eligibility.test.mjs | 逻辑变更（第五条件态断言） | — | pending |
| core-engine | test/verify-conclusion-slot.test.mjs | 逻辑变更（smoke-not-run 触发文案断言） | — | pending |

## 未匹配文件

无——上表交付文件按 _module-map.yaml paths 显式归位（src/config-schema.js→setup；src/run/→runtime；src/stages/→stages；其余 src 根级与 test/docs → core-engine）。

## 更新结果

| 目标 | 状态 |
|---|---|
| _module-map.yaml | pending（archive Step3 判定——无 paths/entrypoints/依赖边变更预期 skipped） |
| modules/core-engine.md | pending（矩阵记账语义与第五条件属契约摘要级，changelog 流转） |
| modules/runtime.md | pending（quality-scan 执行段契约面，changelog 流转） |
| modules/setup.md | pending（config 纯数据登记，预期 skipped） |
| modules/stages.md | pending（verify prompt 变化，archive 时判定） |
