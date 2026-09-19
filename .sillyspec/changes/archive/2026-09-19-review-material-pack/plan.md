---
author: qinyi
created_at: 2026-09-19 15:00:00
plan_level: full
---

# 实现计划（Plan）

## Wave 1（无依赖）
- task-01

## Wave 2（依赖 Wave 1）
- task-02

## Wave 3（依赖 Wave 1+2）
- task-03

## 任务总表
| 编号 | 任务 | Wave | 优先级 | 依赖 | 覆盖 FR/D | 说明 |
|---|---|---|---|---|---|---|
| task-01 | 注入基建 | W1 | P0 | — | FR-01, D-001@v1, D-002@v1 | NEW:src/review-material-pack.js（buildReviewMaterialPack 四形态/extractDesignHotZone 泛化自 execute.js:979-1023/extractDiffSummary 复用 resolveVerifyChangedFiles:1091-1093 锚点解序＋--stat 叠加）；prompt.js {REVIEW_MATERIALS} 注入位（:1467-1472 同款 split/join、缺省空串、与 PRIOR_REVIEW_FACTS 槽位互斥——再审模板不含本槽；**降级分支 :1475-1480 同步 join 防占位符残留**——plan 审查提示） |
| task-02 | 四阶段契约改写 | W2 | P0 | task-01 | FR-01, FR-02, D-002@v1, D-004@v1 | brainstorm.js Grill 输入段 :415-424（删两原语、包注入＋基准面语义）；plan.js 审查步 :332 stepReviewPlan（差量包；填卡 :500 不动）；execute.js QA 输入段（diff＋热区＋清单包）；stage-review.js renderPriorRoundFindingsMd :513-516 排他语＋fixDiff 经复审基线段渲染并入（占位符机制零改动）；四处自检首项（包不足→cannot_verify＋列缺件） |
| task-03 | 验收钉与镜像 | W3 | P0 | task-01,02 | FR-03, D-003@v1, D-005@v1 | NEW:test/review-material-pack.test.mjs（两原语全仓 grep 绝迹断言——现命中仅 brainstorm.js:417/:424 且均在改写面；包形态四单测；排他语在场断言）；docs/prompt 三步流水线（_extract→_sync→_verify，plan/execute 动态阶段 fence 豁免保持）；npm test 全量＋lint |

## 关键路径
task-01 → task-02 → task-03（注入位是契约改写前置；验收钉最后收口）

## 全局硬约束（从 design.md 抄录，绑定所有 task）
- 两槽互斥：三阶段走 {REVIEW_MATERIALS}，再审走 {PRIOR_REVIEW_FACTS} 且模板不含 MATERIALS 槽；排他语只覆盖复审基线段（prompt.js:1460-1465），前序 pass 段（:1449-1451）保持建议语。
- fixDiff 经 renderPriorRoundFindingsMd 渲染并入——占位符机制零改动，只扩渲染体。
- extractDiffSummary 的 base 解序复用 resolveVerifyChangedFiles（actualBaseHash/baselineCommit＞baseHash），禁独立解 base。
- 机械钉正则只匹配「必须读取完整」「素材宁可多读」两原语（收窄防误伤）。
- 包是必答基准面非禁读清单：包外定向查证合法须列明、禁全量扫读；评审者自检 cannot_verify 兜底。
- 存量 review.json 产物契约零改动（schemaVersion/reviewType/verdict 不动）。
- 不改评审轮次/S2/S3 菜单/ceremony 定价；不动填卡步 plan.js:500；不动事实面计量。
- 占位符缺失→空串容错（prompt.js 既有机制）。

## 全局验收标准
1. grep -rn "必须读取完整\|素材宁可多读" src/ → 零命中（现两命中均在 task-02 改写面内）。
2. 四阶段包形态单测绿（buildReviewMaterialPack 四 schema）；两槽互斥断言（再审模板无 MATERIALS）。
3. 排他语在场（复审基线段「唯一基准面」）；自检首项在四阶段 prompt 在场。
4. extractDiffSummary base 解序与 resolveVerifyChangedFiles 一致（锚点优先级单测）。
5. docs/prompt 三步流水线跑通且镜像一致（_verify 绿）。
6. npm test 全量＋lint 通过。

## 覆盖矩阵（如存在 decisions.md）
| ID | 覆盖任务 | 验收证据 |
|---|---|---|
| D-001@v1 | task-01..03 | 全局验收 1-6 |
| D-002@v1 | task-01, task-02 | 验收 2（四形态包） |
| D-003@v1 | task-03 | 验收 1（机械钉） |
| D-004@v1 | task-02 | 验收 3（排他语+自检） |
| D-005@v1 | task-03 | 验收 5（三步流水线） |
