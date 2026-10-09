---
author: zcode-verify-friction
created_at: 2026-10-09T15:30:00+08:00
---
# 任务注册表（Tasks）— 2026-10-09-verify-reuse-friction

- [x] task-01: W1/FR-01 快照口径死循环修复——executeVerifyQualityScan 复用闸（passed 幂等 + failed 签名去重两处同型）移至快照创建后、plannedSnapshot 改 actualScope；回归锁 test/verify-quality-scan-reuse-actual-scope.test.mjs（连续失败命中复用 + 口径切换失配）
- [x] task-02: W1/FR-02 快照失败高可见 + 摩擦记账——gates.js 与 verify-quality-scan.js 静默 catch 改 ⚠️ 告警块；friction-tally TYPES 增 gate_snapshot_fallback；回归锁 test/gates-snapshot-fallback-visibility.test.mjs
- [x] task-03: W2/FR-03 code-face-key 单点模块 + 两指纹树键化（整树 oid 快路径）——回归锁 test/code-face-key-doc-commit-survival.test.mjs（纯文档提交两指纹均存活 / 代码提交均击穿）
- [x] task-04: W2/FR-04 复用观测落盘——test-result.json 增 fingerprint/reuseDecision；质量扫描记录增 scopeDecision/missReason；回归锁 test/verify-test-result-reuse-observability.test.mjs
- [x] task-05: W3/FR-05 required-evidence 与 target_files 对账门前移（调用链复核实证无实测依赖）；回归锁 test/gates-verify-cheap-gates-first.test.mjs（声明缺失零测试执行秒级失败）
- [x] task-06: W4/FR-06 trace 行 repo 归属——写侧透传 + 读侧按行 repo 解析（存量回退主仓）；先复现后修；回归锁 test/test-bindings-crossrepo-row-resolution.test.mjs
- [x] task-07: W4/FR-07 跨仓对账锚点窗口 baseline..HEAD（回退链不回退）；先复现后修；回归锁 test/cross-repo-reconcile-baseline-anchor.test.mjs
- [x] task-08: W4/FR-08 wt-commit 跨仓 worktree 识别（注册表校验剥后缀）；先复现后修；回归锁 test/wt-commit-crossrepo-infer.test.mjs
- [x] task-09: W4-收尾 模块卡+changelog 同步（runtime/core-engine/cli-entry/worktree）+ node test/run-tests.mjs 全量回归绿（含新增 8 测试文件与既有核心面）
