---
author: qinyi
created_at: 2026-09-19 16:32:00
---
# 任务清单（Tasks）

> 粗粒度拆解（plan 阶段细化）；分层与锚点见 design.md。

- [x] task-01: 装载层——NEW:src/span-risk-surface.js（compileSpanRiskPatterns/matchSpanRiskPatterns/loadSpanRiskPatterns/loadSpanRiskPatternsAllProjects）+ NEW:test/span-risk-surface.test.mjs（编译等价性钉/装载容错/AllProjects 并集）
- [x] task-02: 纯函数层——ceremony-tier.js（opts.spanRiskPatterns + reconcileDualRun factSpanRiskPatterns + 共享 matcher）+ quick-gate-profile.js（riskTable 默认 []）+ test/ceremony-tier.test.mjs、test/quick-gate-profile.test.mjs 更新（此步不删 QUICK_RISK_PATH_PATTERNS——task-03 接线后收口删除，防中间态 import 断裂）（depends_on: task-01）
- [x] task-03: 接线与自举——run/gates.js、review-tier.js、verify-postcheck.js、run/shared.js、scope-audit.js 五处装载接线 + 本仓 map span_risk 段（9 token）+ config-schema note + known-issues/INDEX 登记 + test/modules-rebuild-preserve.test.mjs span_risk 回插钉 + QUICK_RISK_PATH_PATTERNS grep 清零 + D-005 连带翻新两夹具测试（test/scope-audit.test.mjs、test/audit-quick-completion.test.mjs）（depends_on: task-01,02）
- [x] task-04: 契约同步与全量——模块卡 4 张（core-engine/runtime/setup/docs-consistency）+ 自举走位验收（本变更 span 面对账）+ npm test 全量 + lint（depends_on: task-01,02,03）
