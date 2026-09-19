---
author: qinyi
created_at: 2026-09-19 16:35:00
plan_level: light
---
# 任务清单（Tasks）

> plan_level=light；锚点见 design.md 三 Wave。

- [x] task-01: 装配函数——src/review-material-pack.js 新增导出 assembleStageReviewMaterials({stage,cwd,changeName,specBase})：grill-first=designDigest（章节行号索引+背景/设计目标节，复用 extractDesignHotZone）+fileList（design.md「文件变更清单」表路径列解析）；plan-review=hardConstraints（「## 全局硬约束」节行 cap10，缺节 fallback decisions.md P0/P1 条目）；execute-qa=diffSummary（extractDiffSummary 委托 resolveVerifyChangedFiles——禁独立解 base）+designContent+checklist（REVIEW_CHECKLISTS.execute）；crossPoints/planDelta 恒不预填；未知 stage/素材全缺→''。target_files: src/review-material-pack.js
- [x] task-02: 注入链接线＋模板槽——src/run/prompt.js tier 注入块（:1378 分支）按 stageName 调装配函数填充 {REVIEW_MATERIALS}（specBase 显式传 :1382 tierSpecBase；组装 best-effort catch；降级分支 join('') 不动；:1473 stale 注释同步改写）；brainstorm.js Grill 输入材料节/plan.js 审查步 independent 段/execute.js acceptance 操作节三处加 {REVIEW_MATERIALS} 槽＋主代理补位指引。target_files: src/run/prompt.js, src/stages/brainstorm.js, src/stages/plan.js, src/stages/execute.js (depends_on: task-01)
- [x] task-03: 验收钉＋镜像——test/review-material-pack.test.mjs 新增组四（fixture 装配三形态非空＋接线源码钉＋留位钉，既有组一二三零改动）；docs/prompt 三步流水线 _extract→_sync→_verify；npm test 定向+全量＋lint。target_files: test/review-material-pack.test.mjs, docs/prompt/_extracted.json, docs/prompt/brainstorm.md, docs/prompt/verify.md (depends_on: task-01,02)
