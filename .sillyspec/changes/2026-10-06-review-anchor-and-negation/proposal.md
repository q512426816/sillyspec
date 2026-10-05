---
author: flow-machine-draft
created_at: 2026-10-05T23:15:57.077Z
---
# 提案书（Proposal）— 2026-10-06-review-anchor-and-negation

## 动机

任务原话转写：上轮修复（2026-10-06-litest-p1-fixes）收口过程实测暴露两个缺口：
① 评审时点 vs 重冻结竞态：复审 PASS 的 review.json 落盘 26 秒后被漂移重冻结机制隔离——隔离逻辑只看「重冻结时刻 review.json 在场」即判「对着旧冻结面不作数」，不区分该评审是否对着当前 HEAD 做的（复审实际核对了 HEAD=最新提交+工作区实态，结论有效却被迫手工恢复文件才能收口）。
② 「串台」否定消解词表缺裸「不」形态：design 作答「前缀过滤不串台」字面命中承诺词一票升级（NEGATED_CROSSTALK_RE 词表有 不会/不存在/没有/无/零/防/杜绝/避免/不含/免，无「不串台」整词），上轮变更因此每次定档都触发信号。

成功标准：
- 评审任务书标注评审对象 HEAD（sha 印在任务书）且 review.json schema 含 reviewedAgainst 字段（评审员照抄）；validateReviewJson 对该字段可选校验（缺省兼容旧产物，存在须为 7-40 hex）
- 漂移隔离前比对：reviewedAgainst 命中当前 HEAD（前缀口径）→ 保留 review.json 不隔离不重置 review 子步标记，日志说明保留原因；未锚定/读失败 → 现行隔离行为不变
- 比对逻辑提炼为可单测纯函数（flow-review.js 导出），flow.js 仅接线
- NEGATED_CROSSTALK_RE 补「不串台」整词：design 作答「…过滤不串台」不再一票升级；「不排除串台」风险自认形态保留一票升级
- 新增回归测试覆盖上述两向；npm test 改动面无回归 + lint 绿

## 变更范围

按成功标准机械推导，共 5 条验收面：
1. 评审任务书标注评审对象 HEAD（sha 印在任务书）且 review.json schema 含 reviewedAgainst 字段（评审员照抄）；validateReviewJson 对该字段可选校验（缺省兼容旧产物，存在须为 7-40 hex）
2. 漂移隔离前比对：reviewedAgainst 命中当前 HEAD（前缀口径）→ 保留 review.json 不隔离不重置 review 子步标记，日志说明保留原因；未锚定/读失败 → 现行隔离行为不变
3. 比对逻辑提炼为可单测纯函数（flow-review.js 导出），flow.js 仅接线
4. NEGATED_CROSSTALK_RE 补「不串台」整词：design 作答「…过滤不串台」不再一票升级；「不排除串台」风险自认形态保留一票升级
5. 新增回归测试覆盖上述两向；npm test 改动面无回归 + lint 绿

## 成功标准（可验证）

1. 评审任务书标注评审对象 HEAD（sha 印在任务书）且 review.json schema 含 reviewedAgainst 字段（评审员照抄）；validateReviewJson 对该字段可选校验（缺省兼容旧产物，存在须为 7-40 hex）
2. 漂移隔离前比对：reviewedAgainst 命中当前 HEAD（前缀口径）→ 保留 review.json 不隔离不重置 review 子步标记，日志说明保留原因；未锚定/读失败 → 现行隔离行为不变
3. 比对逻辑提炼为可单测纯函数（flow-review.js 导出），flow.js 仅接线
4. NEGATED_CROSSTALK_RE 补「不串台」整词：design 作答「…过滤不串台」不再一票升级；「不排除串台」风险自认形态保留一票升级
5. 新增回归测试覆盖上述两向；npm test 改动面无回归 + lint 绿
