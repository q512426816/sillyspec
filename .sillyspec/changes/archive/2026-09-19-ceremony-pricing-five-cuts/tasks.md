---
author: qinyi
created_at: 2026-09-19 07:45:00
---
# 任务清单（Tasks）

> revision 1：随 D-001@v2 重定范围改写。粗粒度拆解（plan 阶段细化）；Wave 与锚点见 design.md。

- [x] task-01: 声明面机制——NEW:src/blast-surface.js（resolveBlastSurfaces/loadBlastDeclarations）+ _module-map.yaml 自举 blast 段 + local.yaml blast_surfaces 只升 + modules.js --force 顶层段文本回插 + NEW:test/blast-surface.test.mjs + NEW:test/modules-rebuild-preserve.test.mjs
- [x] task-02: 判级重构（新增面）——change-risk-profile.js 增 resolveChangeRisk（explicit 只压 tier 不豁免 evidence；纯新增不删导出）+ stage-contract.test/quick-gate-profile.test 判级组重写（删除收口归 task-03）
- [x] task-03: 消费点接线、保留三刀与删除收口——八消费点接线 + tier 直入 + applyDeclarationCatchUp 三分支 + reconcileDualRun warn + gates 追赶重定价 + readDesignOwnFiles 双形态 + 词表/detectChangeRisk 删除收口 + grep 清零 + ceremony-tier.test 引擎组 + concurrent-preflight-hooks 门接线组 + verify-conclusion-slot 翻新（depends_on: task-01,02）
- [x] task-04: 契约同步与全量——stages/verify.js :194-196 教学段重写 + 模块文档认领 + 自指走位验收（本变更档位 S2 对账）+ npm test 全量 + lint（depends_on: task-01,02,03；config-schema 已归 task-01）
