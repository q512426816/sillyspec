---
author: flow-machine-draft
created_at: 2026-10-20T03:13:57.621Z
---
# 提案书（Proposal）— 2026-10-20-stage-templates-retrofit

## 动机

任务原话转写：stage-templates 修复面倒推入册

动机与背景：变更 2026-10-20-decision-caliber-unify 收口后，独立评审 P2 清偿提交 8227bd0a（stage-templates 四件套 decisions 模板 type/status 清单改插值正典常量 DECISION_TYPES/DECISION_STATUSES，term/premise/risk/unresolved 漏网第四提示面清除）因提交消息只带 (task-04) 未带变更名尾缀，收口漂移检测（detectPatchDrift 按提交消息识别本变更提交）静默失明，该 diff 未进其归档冻结件。代码已在库、测试已绿，本变更按倒推收尾把该交付面正式入册，补全审计链。

成功标准：
- 本变更 design.md 必须引用交付提交 8227bd0a 完整 sha 与交付内容描述（stage-templates.js decisions 模板清单插值正典）
- test/decision-caliber-unify.test.mjs 用例④的 stage-templates 插值断言在场且全绿（已验证达标的行为：node --test 该套件 6/6 pass）
- 归档完成后审计链可从本变更档案追溯到交付提交 8227bd0a

## 变更范围

按成功标准机械推导，共 3 条验收面：
1. 本变更 design.md 必须引用交付提交 8227bd0a 完整 sha 与交付内容描述（stage-templates.js decisions 模板清单插值正典）
2. test/decision-caliber-unify.test.mjs 用例④的 stage-templates 插值断言在场且全绿（已验证达标的行为：node --test 该套件 6/6 pass）
3. 归档完成后审计链可从本变更档案追溯到交付提交 8227bd0a

## 成功标准（可验证）

1. 本变更 design.md 必须引用交付提交 8227bd0a 完整 sha 与交付内容描述（stage-templates.js decisions 模板清单插值正典）
2. test/decision-caliber-unify.test.mjs 用例④的 stage-templates 插值断言在场且全绿（已验证达标的行为：node --test 该套件 6/6 pass）
3. 归档完成后审计链可从本变更档案追溯到交付提交 8227bd0a
