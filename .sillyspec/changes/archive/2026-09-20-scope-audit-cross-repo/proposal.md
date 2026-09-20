---
author: qinyi
created_at: 2026-09-20 08:25:18
generated_by: sillyspec-fourpiece-init
---
# 提案书（Proposal）

## 动机
scope-audit 的实际侧只采主仓 git——多仓变更的跨仓条目恒显「计划未动」。平台（SillyHub）变更中心页的对账卡因此失真：实证案例 f85a6650（EHS_BACK，主仓 20 / sub-grid-security 13 / spdemo 9）显示「✓ 计划内 20 / ⚠️ 计划外 2 / ⚠️ 计划未动 22」，其中 22 恰为两个跨仓段全部文件——用户无法判断跨仓文件到底做没做。本变更让跨仓条目按仓真实对账，并定型 `--json` 仓库维度契约供平台开发消费方。

## 关键问题
1. 跨仓行恒 untouched 是信息真空而非事实：跨仓仓的 git 状态可查（local.yaml repos 注册表已能解析仓根，cross-repo-reconcile 已有 per-repo 采集能力），scope-audit 只是没接。
2. 既有 per-repo 采集锚点弱（HEAD~1..HEAD 只反映最近一笔 commit），而 execute-runs 的 task review 自带 base/head 锡点（S0-S3 全档硬门禁，execute 走过即有）——封闭区间锚点可用而未用。
3. 采集逻辑若在 scope-audit 重写一份会与 cross-repo-reconcile 口径漂移（verify 与 scope-audit 两处对账互相矛盾）。

## 变更范围
- src/cross-repo-reconcile.js：抽共享采集内核 `collectRepoActual`（锚点四级分级：reviews-range > head~1-window > head-uncommitted-window > degraded），`reconcileCrossRepoDeclarations` 改为消费内核（verify 侧锚点顺带升级）
- src/scope-audit.js：跨仓行真实三态+行数；信封 `repos[]`（仅多仓输出）；`renderScopeAuditTable` per-repo 汇总段；`getFileDiff` 跨仓仓路由
- src/verify-postcheck.js / src/run/gates.js / src/index.js：注记文案/渲染标签/帮助文案小改
- test/scope-audit-cross-repo.test.mjs（新增）+ test/scope-audit.test.mjs（改进点 2 断言更新）+ 模块文档 core-engine.md

## 不在范围内（显式清单）
- 平台侧改造（daemon 投影、后端 schema、前端按仓分组 UI）——multi-agent-platform 仓独立变更，等本契约定型后开
- cross-repo-reconcile 声明侧口径变化（verify 仍消费 task 卡 target_files）
- 跨仓内容冻结进主仓 scope-audit.patch（D-002@v1：跨仓冻结载体 = reviews 锡点 + 该仓 commit 区间）
- 存量旧快照的跨仓段实时回算（「快照说什么是什么」契约不破，⊘+注记）
- scope-audit 快照落盘链代码改动（结构即返回值，自动继承）

## 成功标准（可验证）
- f85a6650 类多仓变更：`scope-audit --json` 一条命令输出三仓合并表——主仓 20/2 + 两跨仓仓各自真实三态与锚点档，不再有恒 untouched 的跨仓补行
- 单仓变更 `--json` 输出与 v3.29.3 现状逐字节等价（JSON.stringify 全等断言）
- degraded 边界四态（仓未注册/路径不可达/非 git 仓/git 双失败）各出对应 repos[].degradedReason 一行，整体不炸
- verify 侧既有 cross-repo-reconcile 测试全量回归绿；scope-audit 既有 40+ 测试除「改进点 2」两项行为升级断言外全绿
