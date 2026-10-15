---
author: flow-machine-draft
created_at: 2026-10-15T16:21:49.378Z
---
# 任务注册表（Tasks）— 2026-10-16-step-guide-dyn-completeness

- [x] task-01: src/run/prompt.js 新增 substituteRaw 助手（push + split/join），9 站点（评审成功分支 6 / 降级分支 6 / WORKTREE_META / TASK_COMPLETION_REPORT ×2 / WORKTREE_BASELINE_INFO / EVIDENCE_AUTO_RECOMMENDATION / ARCHIVE_IMPACT_AUDIT / SCOPE_AUDIT_TABLE / HANDOVER_SUMMARY）全部改走该助手；助手注释钉纪律（新增注入点必须走本组助手，否则复入附录漏收）
- [x] task-02: VOLATILE_PLACEHOLDER_RES 补 {REVIEW_TIER}/{REVIEW_TIER_REASON}/{REVIEW_JSON_CONTRACT} 三漏登 token
- [x] task-03: stage-review.js 路径警告措辞覆盖双向错法（漏前缀/多前缀），改「直接复制完整路径勿手拼」
- [x] task-04: 新增测试：含评审六值的步骤首见渲染出真值、复入短输出的动态附录包含 tier 行/材料包/契约——修复前必红
- [x] task-05: 既有 step-guide 五支测试 + 相关面零回归；lint 通过
