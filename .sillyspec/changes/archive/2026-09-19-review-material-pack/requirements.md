---
author: qinyi
created_at: 2026-09-19 14:55:00
generated_by: sillyspec-fourpiece-init
---
# 需求规格（Requirements）

## 角色
| 角色 | 说明 |
|---|---|
| 主代理 | 组装材料包（点名五交叉点）、派发评审 |
| CLI | 抽取包素材（热区/diff/差量）、注入占位符 |
| 评审子代理 | 只对包作答（基准面语义）；包外定向查证须列明 |

## 功能需求

### FR-01: 四阶段评审材料包契约
Given 各阶段评审派发（Grill 首轮/plan 审/execute QA/再审）
When prompt 组装
Then 必读清单段替换为材料包注入（grill-first={designDigest,fileList,crossPoints[≤5],snippets[]}；plan-review={hardConstraintDelta[]}；execute-qa={diffSummary,designHotZone,checklist}；re-review={priorFindings,fixDiff}）；两槽互斥（三阶段走 {REVIEW_MATERIALS}，再审走 {PRIOR_REVIEW_FACTS} 且不含 MATERIALS 槽）；包组装的 base 解序复用 resolveVerifyChangedFiles 锚点优先级（actualBaseHash/baselineCommit＞baseHash）。

### FR-02: 再审唯一材料化＋基准面语义
Given 再审派发（同阶段上一轮 findings 在场）
When {PRIOR_REVIEW_FACTS} 渲染
Then 复审基线段为排他语（本轮唯一基准面）＋上一轮 findings＋对应修复 diff；四阶段评审者首项自检「材料包是否足以逐条作答；不足→cannot_verify＋列缺件」；包外定向查证合法但须列明、禁全量扫读。

### FR-03: 机械验收钉
Given 阶段 prompt 模板
When 回归测试执行
Then grep 断言无「必须读取完整」「素材宁可多读」两原语（全仓命中均在改写面内）；包组装 helper 四阶段形态单测；排他语在场断言。

## 非功能需求
- 兼容：占位符缺失→空串容错；{PRIOR_REVIEW_FACTS} 无前轮→回退首轮全量包；存量 review.json 产物契约零改动。
- 合规：改 src/stages/*.js 后跑 docs/prompt 三步流水线（_extract→_sync→_verify）。

## 决策覆盖矩阵（如存在 decisions.md）
| 决策 ID | 覆盖的 FR | 说明 |
|---|---|---|
| D-001@v1 | FR-01 | 契约矛盾定位＋打包判定 |
| D-002@v1 | FR-01 | 四阶段包形态 |
| D-003@v1 | FR-03 | 可证伪验收（两原语机械钉） |
| D-004@v1 | FR-02 | 基准面非禁读＋自检兜底 |
| D-005@v1 | FR-03 | 镜像同步合规＋非目标 |
