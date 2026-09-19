---
author: qinyi
created_at: 2026-09-19 16:45:00
plan_level: light
---

# 轻量计划（Light Plan）：评审材料包 CLI 注入接线（review-material-cli-wiring）

## 来源
brainstorm 已确认（design.md，Design Grill independent 单轮 pass：15 checklist 项全 pass 零 gap；两条执行期意见已吸收——:1473 stale 注释改写、specBase 显式传 tierSpecBase）。核心：归档 2026-09-19-review-material-pack 交付的 buildReviewMaterialPack 生产调用点为零（Gap 1 移交）——把包组装接进 CLI 侧，prompt.js tier 注入链按 stageName 机械组装素材半边并填充 {REVIEW_MATERIALS}；主代理点名半边（五交叉点/plan 差量）留位不预填。

## 范围
- src/review-material-pack.js——新增导出 assembleStageReviewMaterials（CLI 半边素材机械收集，三形态分流）
- src/run/prompt.js——tier 注入块内组装并 join {REVIEW_MATERIALS}（主链；降级分支 join('') 保持）
- src/stages/brainstorm.js / src/stages/plan.js / src/stages/execute.js——三模板加 {REVIEW_MATERIALS} 槽＋主代理补位指引
- test/review-material-pack.test.mjs——新增组四（装配函数三形态非空＋接线源码钉＋留位钉）
- docs/prompt/_extracted.json、docs/prompt/*.md——三步流水线镜像再生

## 全局硬约束（绑定所有 task，冲突以本段为准并上报主代理）
1. **base 解序单点**：extractDiffSummary 的 base 解序复用 resolveVerifyChangedFiles（src/verify-postcheck.js:1113，锚点优先级 actualBaseHash/baselineCommit＞baseHash），禁独立解 base。
2. **镜像流水线**：改 src/stages/*.js 后必须跑 docs/prompt 三步流水线：node docs/prompt/_extract.mjs → _sync.mjs → _verify.mjs（exit 0）。
3. **机械钉不动**：test/review-material-pack.test.mjs 的两原语绝迹断言保持绿；组一/二/三断言零改动；新增「非空注入」断言（组四）。
4. 两槽互斥铁律：再审模板（stage-review.js 派发面）不得引入 {REVIEW_MATERIALS} 槽。

## 验收
- AC-01: assembleStageReviewMaterials({stage:'grill-first',...}) 对含常规素材的 fixture（design.md 含背景/设计目标/文件变更清单表）返回非空包体，含文件清单行与章节行号索引；crossPoints 节为留位缺件提示（非预填）
- AC-02: assembleStageReviewMaterials({stage:'plan-review',...}) 对含「## 全局硬约束」节的 fixture 返回非空包体且含硬约束行；缺节时 decisions.md P0/P1 条目兜底命中；planDelta 节为留位缺件提示
- AC-03: assembleStageReviewMaterials({stage:'execute-qa',...}) 在本仓（真实 git）返回非空包体，含 diff 摘要节与 design 热区节与验收清单节（REVIEW_CHECKLISTS.execute 项）；未知 stage 返回 ''；素材全缺返回 ''
- AC-04: prompt.js 主链 {REVIEW_MATERIALS} join 目标为 assembleStageReviewMaterials 调用结果（源码钉断言）；降级 catch 分支 join('') 保持；组二 joins≥2 断言仍绿
- AC-05: 既有组一（两原语绝迹）/组二（包形态+两槽互斥）/组三（排他语）断言零改动保持绿；npm test 定向（review-material-pack）+ 全量 + lint 通过
- AC-06: docs/prompt 三步流水线 exit 0（镜像一致）；三模板镜像含 {REVIEW_MATERIALS} 槽

## 覆盖矩阵
| ID | 覆盖任务 | 覆盖 FR | 验收证据 |
|---|---|---|---|
| D-001@v1 | task-02 | FR-01 | AC-04 |
| D-002@v1 | task-01, task-02 | FR-02 | AC-01/02/03 |
| D-003@v1 | task-03 | FR-03 | AC-04/05/06 |

FR 总览：FR-01（CLI 机械注入接线）→ task-02；FR-02（混合组包边界）→ task-01/02；FR-03（验收钉）→ task-03。
