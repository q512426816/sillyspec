---
plan_level: light
---

# 轻量计划（Light Plan）：scope-audit 分仓对账 + --json 契约仓库维度

## 来源
brainstorm 四件套（design.md 契约 v2 定稿含 S2 评审 4 gap 修复；D-001@v1 共享内核+锚点分级方案 A；D-002@v1 快照产物语义）。任务书要点：跨仓文件从「⊘ 本表不含」升级为按仓真实对账；--json 契约扩仓库维度为第一交付物（平台消费方）；单仓变更逐字节等价回归。

## 范围
- src/cross-repo-reconcile.js：共享采集内核 collectRepoActual（锚点四级：reviews-range > head~1-window > head-uncommitted-window > degraded）；reconcileCrossRepoDeclarations 重构消费内核（签名增量 {runtimeRoot, changeName}，anchor 字段增量）
- src/scope-audit.js：computeFullFlowAudit 跨仓组真实对账（行级三态+行数+crossRepo）；信封 repos[]（main 首位，仅多仓非预执行输出）；settled 快照回放透传+补采跳 crossRepo 行；renderScopeAuditTable per-repo 汇总；getFileDiff 跨仓路由
- src/verify-postcheck.js：调用点传参贯通 + notes 锚点档动态化
- src/run/gates.js：printCrossRepoReconcile 锚点档标签
- src/index.js：scope-audit 帮助文案（:119/:1422）
- NEW:test/scope-audit-cross-repo.test.mjs + test/scope-audit.test.mjs（改进点 2 断言更新）
- .sillyspec/docs/sillyspec/modules/core-engine.md 模块文档同步

## 验收
- AC-01：多仓变更（真 git 双仓夹具）`--json` 一条命令出三仓合并表——主仓行 + 两跨仓仓各自真实三态/行数/锚点档，无恒 untouched 跨仓补行
- AC-02：单仓变更 `--json` 与 v3.29.3 现状逐字节等价（JSON.stringify 全等断言）
- AC-03：锚点分级四态各就位——reviews-range（reviews base..head 区间并集，diffPaths 收窄）/head~1-window/head-uncommitted-window 降级注记/degraded 三类判据（未注册/路径不可达/git 双源失败）不炸整体
- AC-04：settled 快照——新快照冻结跨仓行+repos 回放透传；needsStats 补采跳 crossRepo 行；旧快照 ⊘+「冻结于跨仓对账上线前」注记
- AC-05：verify 侧既有 cross-repo-reconcile 测试回归绿（reconcile anchor 升级不破既有字段形状）；npm test 全量 + lint 绿

## 覆盖矩阵（如存在 decisions.md）
| ID | 覆盖任务 | 验收证据 |
|---|---|---|
| D-001@v1 | task-01（共享内核+锚点分级）、task-02（scope-audit 集成+repos 信封） | AC-01/02/03 |
| D-002@v1 | task-02（settled 快照语义）、task-03（--file 跨仓锡点区间 diff） | AC-04 |
