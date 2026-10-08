---
author: flow-machine-draft
created_at: 2026-10-08T00:58:10.015Z
---
# 提案书（Proposal）— 2026-10-08-release-3-32-1

## 动机

任务原话转写：发版 3.32.1：把 main 上已归档的两个修复带出去——2026-10-07-scope-audit-thin-patch-replay（第 2 层读兼容：归档 thin 变更快照缺失时回读 change-patch.json 冻结记录回放真实三态，存量旧归档对账明细不再恒「计划未动 0/0」）与 2026-10-07-unify-close-trace（第 3 层写统一：thin/heavy 双通道收尾经共用 writeCloseTraceArtifacts 一次写齐四件留痕、sha256 双套同锚、closedBy 通道标注）。缺陷记录 multi-agent-platform docs/sillyspec/thin-flow-done-no-scope-audit-snapshot.md 已由使用方翻 finished/，本版是其工具侧根治的载体。

成功标准：
- package.json version=3.32.1；quick-retired 测试 R5 版本锚同步（assert + 注释）；历史事实锚（run-quick.md v3.31.0 起）不动
- quick-retired 测试绿 + lint 绿；全量套件在 pre-push 钩子复跑绿
- npm publish 成功且 npm view sillyspec version=3.32.1（latest 核验）
- 发版规格工件随归档留档，推送 origin/main

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. package.json version=3.32.1；quick-retired 测试 R5 版本锚同步（assert + 注释）；历史事实锚（run-quick.md v3.31.0 起）不动
2. quick-retired 测试绿 + lint 绿；全量套件在 pre-push 钩子复跑绿
3. npm publish 成功且 npm view sillyspec version=3.32.1（latest 核验）
4. 发版规格工件随归档留档，推送 origin/main

## 成功标准（可验证）

1. package.json version=3.32.1；quick-retired 测试 R5 版本锚同步（assert + 注释）；历史事实锚（run-quick.md v3.31.0 起）不动
2. quick-retired 测试绿 + lint 绿；全量套件在 pre-push 钩子复跑绿
3. npm publish 成功且 npm view sillyspec version=3.32.1（latest 核验）
4. 发版规格工件随归档留档，推送 origin/main
