---
author: flow-machine-draft
created_at: 2026-09-30T07:45:32.188Z
---
# 提案书（Proposal）— 2026-09-30-quality-scan-passed-idempotent

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:882ee23ba54aac690f7dd98127051ea5e06c57fdb1612c9b75b6ef17ec0ca842:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-30-quality-scan-passed-idempotent 留痕重锚 -->
任务原话转写：质量扫描执行侧补 passed 态幂等闸（与既有失败签名闸对称）。实证：multi-agent-platform 2026-09-30 tool-report-activation verify 收敛循环，agent 修 verify-result.md 文档锚点反复重入 verify step6，码态恒定（12:59-14:15 零 commit）下质量扫描 11 轮 ×~290s 全量真跑（隔离快照构建 + dynamic-subset 测试 85s + lint 43s）——executeVerifyQualityScan 的去重闸 shouldReuseLastFailedScan 只消费 failed 态记录（verify-quality-scan.js 注释明示「复用只消费 failed 态记录」），passed 态无幂等闸：失败有签名闸防假红重试循环，成功反而每次重入全量重跑，55 分钟纯等待浪费。改法：新增 shouldReuseLastPassedScan 纯函数（testResult passed 且 lint 非 failed、dedupKey 全等、快照口径一致 → reuse），executeVerifyQualityScan 开头（失败闸之后）消费——命中打印披露免重跑直接完成本步骤，不重写记录（ranAt 不动，--done 读侧 loadReusableQualityScan 口径不变），RERUN=1/force 旁路。

成功标准：
- shouldReuseLastPassedScan 纯函数：passed+dedupKey 全等+快照口径一致 → reuse:true；lint failed 记录 / dedupKey 失配 / 快照口径变化 / 无记录 / forceRerun → 各自 reason 不复用
- executeVerifyQualityScan 幂等命中时：不建快照、不跑 test/lint/smoke/coverage、不重写扫描记录，打印 ♻️ 披露行（含实测时间与 RERUN 逃生阀指引）并以完成态返回
- 码态/known_failures/commands/test_strategy 任一变化 → dedupKey 失配自动重测（既有指纹语义零变化）
- SILLYSPEC_VERIFY_QUALITY_SCAN_RERUN=1/force 时 passed 闸旁路（与失败闸同阀）
- 全量测试回归绿 + lint 绿
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:85d5bcd51031d88fe918b618bf38cb210353a3b964cf4353197fb6892d1512f4:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-30-quality-scan-passed-idempotent 留痕重锚 -->
按成功标准机械推导，共 6 条验收面：
1. shouldReuseLastPassedScan 纯函数：passed+dedupKey 全等+快照口径一致 → reuse:true
2. lint failed 记录 / dedupKey 失配 / 快照口径变化 / 无记录 / forceRerun → 各自 reason 不复用
3. executeVerifyQualityScan 幂等命中时：不建快照、不跑 test/lint/smoke/coverage、不重写扫描记录，打印 ♻️ 披露行（含实测时间与 RERUN 逃生阀指引）并以完成态返回
4. 码态/known_failures/commands/test_strategy 任一变化 → dedupKey 失配自动重测（既有指纹语义零变化）
5. SILLYSPEC_VERIFY_QUALITY_SCAN_RERUN=1/force 时 passed 闸旁路（与失败闸同阀）
6. 全量测试回归绿 + lint 绿
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:017e7c531c1e86cddcd2f497b52665db64fdf90599c64ca4ad4af910c8f8baad:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-30-quality-scan-passed-idempotent 留痕重锚 -->
1. shouldReuseLastPassedScan 纯函数：passed+dedupKey 全等+快照口径一致 → reuse:true
2. lint failed 记录 / dedupKey 失配 / 快照口径变化 / 无记录 / forceRerun → 各自 reason 不复用
3. executeVerifyQualityScan 幂等命中时：不建快照、不跑 test/lint/smoke/coverage、不重写扫描记录，打印 ♻️ 披露行（含实测时间与 RERUN 逃生阀指引）并以完成态返回
4. 码态/known_failures/commands/test_strategy 任一变化 → dedupKey 失配自动重测（既有指纹语义零变化）
5. SILLYSPEC_VERIFY_QUALITY_SCAN_RERUN=1/force 时 passed 闸旁路（与失败闸同阀）
6. 全量测试回归绿 + lint 绿
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
