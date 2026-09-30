---
author: flow-machine-draft
created_at: 2026-09-30T07:45:32.189Z
---
# 需求规格（Requirements）— 2026-09-30-quality-scan-passed-idempotent

## 功能需求（GWT 骨架已机器预填——可编辑覆盖；FR 进知识索引）

<!--AGENT:FR区 agent 填写功能需求（GWT 骨架已预填——覆盖/修改/保留均可） -->
### FR-01: shouldReuseLastPassedScan 纯函数：passed+dedupKey 全等+快
Given 系统就绪
When shouldReuseLastPassedScan 纯函数：passed+dedupKey 全等+快照口径一致
Then reuse:true

### FR-02: lint failed 记录 / dedupKey 失配 / 快照口径变化 / 无记录 / forc
Given 系统就绪
When lint failed 记录 / dedupKey 失配 / 快照口径变化 / 无记录 / forceRerun
Then 各自 reason 不复用

### FR-03: executeVerifyQualityScan 幂等命中时：不建快照、不跑 test/lint/s
Given 幂等 相关模块就绪
When executeVerifyQualityScan 幂等命中时：不建快照、不跑 test/lint/smoke/coverage、不重写扫描记录，打印 ♻️ 披露
Then 行为符合本条标准描述

### FR-04: 码态/known_failures/commands/test_strategy 任一变化 → de
Given 系统就绪
When 码态/known_failures/commands/test_strategy 任一变化
Then dedupKey 失配自动重测（既有指纹语义零变化）

### FR-05: SILLYSPEC_VERIFY_QUALITY_SCAN_RERUN=1/force 时 pass
Given 系统就绪
When SILLYSPEC_VERIFY_QUALITY_SCAN_RERUN=1/force 时 passed 闸旁路（与失败闸同阀）
Then 行为符合本条标准描述

### FR-06: 全量测试回归绿 + lint 绿
Given 测试 相关模块就绪
When 全量测试回归绿 + lint 绿
Then 行为符合本条标准描述

## 测试绑定（每条 FR 至少一行——空槽将在 flow done 时自动从测试结果补全）

<!--AGENT:测试绑定FR-01 test/verify-quality-scan.test.mjs（passed 幂等闸块纯函数七态断言：全等复用/无记录/failed 不入闸/lint-failed/passed-key-mismatch/snapshot-scope-changed/no-passed-key/force-rerun） -->

<!--AGENT:测试绑定FR-02 test/verify-quality-scan.test.mjs（同上七态断言中 lint-failed 与 no-passed-key 两态；快照口径变化态断言 snapshot-scope-changed） -->

<!--AGENT:测试绑定FR-03 test/verify-quality-scan.test.mjs（passed 幂等闸块第二轮：码态不动只改文档 → ranAt 不刷新（不重写记录=未真跑的强证据）+ 披露行「幂等命中」在场） -->

<!--AGENT:测试绑定FR-04 test/verify-quality-scan.test.mjs（第三轮新增 src 文件 → ranAt 刷新；第五轮同文件未提交内容修改 → computeQualityScanDirtyContentKey 变化 + ranAt 刷新——dedupKey 盲区的内容键防线） -->

<!--AGENT:测试绑定FR-05 test/verify-quality-scan.test.mjs（第四轮 RERUN=1 码态未变仍强制重跑 → ranAt 刷新） -->

<!--AGENT:测试绑定FR-06 不适用：全量回归是门禁实测（flow done 亲测 deps 子集 + npm run lint，见 verify-runs/20260930080529/test-result.json）；变更前手动全量 npm test exit 0、lint 绿 -->
