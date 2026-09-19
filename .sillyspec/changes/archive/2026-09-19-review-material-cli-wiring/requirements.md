---
author: qinyi
created_at: 2026-09-19 16:35:00
generated_by: sillyspec-fourpiece-init
---
# 需求规格（Requirements）

## 角色
| 角色 | 说明 |
|---|---|
| CLI（prompt.js 注入链） | 按 stageName 机械组装素材半边并填充 {REVIEW_MATERIALS} |
| 主代理 | 补点名半边（五交叉点/plan 差量判定）后派发评审子代理 |
| 评审子代理 | 只对包作答（基准面语义，归档契约不动）；包外定向查证须列明 |

## 功能需求

### FR-01: CLI 机械注入接线
Given 三阶段评审派发（Grill 首轮/plan 审/execute QA）且 step prompt 含 {REVIEW_TIER}/{REVIEW_MATERIALS}
When prompt.js tier 注入链渲染
Then {REVIEW_MATERIALS} 被装配结果填充（brainstorm→grill-first、plan→plan-review、execute→execute-qa）；装配失败→空串注入（与占位符缺失同态，不阻断渲染、无字面量残留）；降级 catch 分支 join('') 保持。

### FR-02: 混合组包边界
Given 装配函数 assembleStageReviewMaterials
When CLI 半边素材收集
Then grill-first={designDigest（章节行号索引+背景/设计目标节）, fileList（design.md 文件变更清单表路径列）}；plan-review={hardConstraints（design.md「## 全局硬约束」节行，缺节 fallback decisions.md P0/P1 条目）}；execute-qa={diffSummary（extractDiffSummary 委托 resolveVerifyChangedFiles，禁独立解 base）, designContent, checklist（REVIEW_CHECKLISTS.execute）}；crossPoints/planDelta 恒不预填（留位缺件提示形态）；re-review 不在本函数面（两槽互斥铁律）。

### FR-03: 验收钉
Given 回归测试执行
When test/review-material-pack.test.mjs 跑
Then 既有组一（两原语绝迹）/组二（包形态+joins≥2+两槽互斥）/组三（排他语）零改动保持绿；新增组四：装配函数三形态非空断言（fixture）＋接线源码钉（主链 join 目标为装配调用、降级分支 join('')）＋留位钉（产出不含预填交叉点/差量判定）。

## 非功能需求
- 装配整体 best-effort：任一素材源缺失/解析失败只降级对应节为「（无）」，不抛错不阻断 step 渲染。
- 改 src/stages/*.js 后 docs/prompt 三步流水线必须跑通（_verify exit 0）。
