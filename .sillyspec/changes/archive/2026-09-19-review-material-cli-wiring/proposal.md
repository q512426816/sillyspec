---
author: qinyi
created_at: 2026-09-19 16:35:00
generated_by: sillyspec-fourpiece-init
---
# 提案书（Proposal）

## 动机
归档 2026-09-19-review-material-pack 交付了材料包组装单点（buildReviewMaterialPack 四形态）与 {REVIEW_MATERIALS} 注入位，但**生产调用点为零**（仅测试调用）——包组装靠主代理照模板散文手工做，机械保证断一半（移交项 Gap 1）。素材半边（design digest/热区/diff 摘要）本可机械抽取，却留给主代理自由发挥。

## 关键问题
1. 注入位恒空串：prompt.js:1473/:1482 的 {REVIEW_MATERIALS} join('')——槽在链在，值从没进来过。
2. 组装无单点：模板散文指引主代理「派发时组装」，偷懒/漂移无兜底（归档 R-04 防线只拦「点名凑数」，不拦「整个包不做」）。
3. CLI 与主代理的分工未落定：哪些素材 CLI 机械抽、哪些留主代理语义点名——需要明确边界（D-002）。

## 变更范围
CLI 注入接线（详见 design.md 三 Wave）：装配函数 assembleStageReviewMaterials（CLI 半边素材机械收集：designDigest/fileList/硬约束/diff 摘要/热区/checklist）；prompt.js tier 注入链内按 stageName 填充 {REVIEW_MATERIALS}（降级容错沿用）；三阶段模板加槽＋主代理补位指引；docs/prompt 三步流水线镜像同步；测试组四（装配函数三形态非空＋接线源码钉＋留位钉）。

## 不在范围内（显式清单）
- 不改 buildReviewMaterialPack 四形态 schema（已归档契约）。
- 不动 {PRIOR_REVIEW_FACTS} 再审面与 renderPriorRoundFindingsMd。
- 不改评审轮次与 ceremony 定价。
- 不把主代理点名半边机械化（五交叉点是语义判断）。
- token 节省比例不作验收（观测注记）。

## 成功标准（可验证）
- 验收①：装配函数三形态（grill-first/plan-review/execute-qa）对含常规素材的 fixture 返回非空包体（阶段特征节在场）。
- 验收②：prompt.js 主链 {REVIEW_MATERIALS} join 目标为装配调用结果（源码钉），降级分支 join('') 保持。
- 验收③：既有组一/二/三断言（两原语绝迹/包形态/排他语/joins≥2）零改动保持绿。
- 全量 npm test＋lint 通过；docs/prompt 三步流水线同步完成（_verify exit 0）。
