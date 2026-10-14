---
author: flow-machine-draft
created_at: 2026-10-14T13:59:04.189Z
---
# 任务注册表（Tasks）— 2026-10-14-decision-id-p2-hardening

- [x] task-01: 来源兜底 + 折叠修复——knowledge-match（DECISION_ORIGIN_RE 读入/路由单解析/legacy 不折叠）、decision-distill（splitKnowledgeSections 来源回退）、docs-check（parseDecisionEntries 来源兜底）；验证：test/decision-id-p2-hardening.test.mjs「①」「②」用例绿 + 真实库复算（20 条来源条目 change 非空、backend.md:158 与 unmapped.md:584 两条隐身复现、总数 698→对账）
- [x] task-02: 豁免键域限定 + 已回应收紧——docs-check isDecisionExempt 域限定键（裸键兼容、导出、emit 传域）；complete.js 已回应行级共现；验证：「③」用例 + test/knowledge-gate-denoise.test.mjs「④」两态绿
- [ ] task-03: 引用契约 + 回归收尾——prompt.js/flow.js 两处段头补「变更名#D-xxx@vN」指引 + 「⑤」接线钉；全量 npm test 零失败 + npm run lint 零 hard fail；模块卡 changelog 增量
