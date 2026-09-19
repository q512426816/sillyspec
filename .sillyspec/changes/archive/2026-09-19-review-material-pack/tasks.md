---
author: qinyi
created_at: 2026-09-19 14:55:00
---
# 任务清单（Tasks）

> 粗粒度拆解（plan 阶段细化）；Wave 与锚点见 design.md。

- [x] task-01: 注入基建——NEW:src/review-material-pack.js（buildReviewMaterialPack 四形态＋extractDesignHotZone 泛化＋extractDiffSummary 复用 resolveVerifyChangedFiles 锚点解序）+ prompt.js {REVIEW_MATERIALS} 注入位（缺省容错、两槽互斥、降级分支同步 join）
- [x] task-02: 四阶段契约改写——brainstorm.js Grill 输入段（:415-424）/plan.js 审查步（:332 stepReviewPlan，填卡 :500 不动）/execute.js QA 输入段/stage-review.js 再审排他语＋fixDiff 渲染并入；四处自检首项
- [x] task-03: 验收钉与镜像——NEW:test/review-material-pack.test.mjs（两原语绝迹 grep＋包形态单测＋排他语断言）+ docs/prompt 三步流水线 _extract→_sync→_verify + npm test 全量＋lint（depends_on: task-01,02）
