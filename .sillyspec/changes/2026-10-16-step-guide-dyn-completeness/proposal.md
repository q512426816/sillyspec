---
author: flow-machine-draft
created_at: 2026-10-15T16:21:49.378Z
---
# 提案书（Proposal）— 2026-10-16-step-guide-dyn-completeness

## 动机

任务原话转写：复入附录漏收面根治——凡裸 split/join 注入点收编进 dynSegments，评审六值缺失致消费仓会话逆推档位的弯路村绝

动机：2026-10-15-change-detail-redesign 会话复盘（消费仓真实案例）根因定位：复入短输出的「动态注入段」附录只收集走 substitute()/substituteSplitJoin() 助手的值；评审块六值（{REVIEW_TIER}+档位菜单/{REVIEW_TIER_REASON}/{STAGE_REVIEW_RUN_ID}/{REVIEW_JSON_CONTRACT}/{PRIOR_REVIEW_FACTS}/{REVIEW_MATERIALS}）与另外五 token 共 9 站点用裸 .split().join() 注入——值既不进附录也不落盘，guide 掩码后无回读通道。实证后果：主代理首次渲染被 tail 截断后，被迫读引擎源码 review-tier.js/ceremony-tier.js 逆推档位、手建等价材料包、手拼 review.json 路径写错一层前缀再纠正。收集器注释自称「漏收才是坑」——本变更把坑填平并把类缺陷钉进测试。

成功标准：
- src/run/prompt.js 新增 substituteRaw 助手（push + split/join），9 站点（评审成功分支 6 / 降级分支 6 / WORKTREE_META / TASK_COMPLETION_REPORT ×2 / WORKTREE_BASELINE_INFO / EVIDENCE_AUTO_RECOMMENDATION / ARCHIVE_IMPACT_AUDIT / SCOPE_AUDIT_TABLE / HANDOVER_SUMMARY）全部改走该助手；助手注释钉纪律（新增注入点必须走本组助手，否则复入附录漏收）
- VOLATILE_PLACEHOLDER_RES 补 {REVIEW_TIER}/{REVIEW_TIER_REASON}/{REVIEW_JSON_CONTRACT} 三漏登 token
- stage-review.js 路径警告措辞覆盖双向错法（漏前缀/多前缀），改「直接复制完整路径勿手拼」
- 新增测试：含评审六值的步骤首见渲染出真值、复入短输出的动态附录包含 tier 行/材料包/契约——修复前必红
- 既有 step-guide 五支测试 + 相关面零回归；lint 通过

## 变更范围

按成功标准机械推导，共 5 条验收面：
1. src/run/prompt.js 新增 substituteRaw 助手（push + split/join），9 站点（评审成功分支 6 / 降级分支 6 / WORKTREE_META / TASK_COMPLETION_REPORT ×2 / WORKTREE_BASELINE_INFO / EVIDENCE_AUTO_RECOMMENDATION / ARCHIVE_IMPACT_AUDIT / SCOPE_AUDIT_TABLE / HANDOVER_SUMMARY）全部改走该助手；助手注释钉纪律（新增注入点必须走本组助手，否则复入附录漏收）
2. VOLATILE_PLACEHOLDER_RES 补 {REVIEW_TIER}/{REVIEW_TIER_REASON}/{REVIEW_JSON_CONTRACT} 三漏登 token
3. stage-review.js 路径警告措辞覆盖双向错法（漏前缀/多前缀），改「直接复制完整路径勿手拼」
4. 新增测试：含评审六值的步骤首见渲染出真值、复入短输出的动态附录包含 tier 行/材料包/契约——修复前必红
5. 既有 step-guide 五支测试 + 相关面零回归；lint 通过

## 成功标准（可验证）

1. src/run/prompt.js 新增 substituteRaw 助手（push + split/join），9 站点（评审成功分支 6 / 降级分支 6 / WORKTREE_META / TASK_COMPLETION_REPORT ×2 / WORKTREE_BASELINE_INFO / EVIDENCE_AUTO_RECOMMENDATION / ARCHIVE_IMPACT_AUDIT / SCOPE_AUDIT_TABLE / HANDOVER_SUMMARY）全部改走该助手；助手注释钉纪律（新增注入点必须走本组助手，否则复入附录漏收）
2. VOLATILE_PLACEHOLDER_RES 补 {REVIEW_TIER}/{REVIEW_TIER_REASON}/{REVIEW_JSON_CONTRACT} 三漏登 token
3. stage-review.js 路径警告措辞覆盖双向错法（漏前缀/多前缀），改「直接复制完整路径勿手拼」
4. 新增测试：含评审六值的步骤首见渲染出真值、复入短输出的动态附录包含 tier 行/材料包/契约——修复前必红
5. 既有 step-guide 五支测试 + 相关面零回归；lint 通过
