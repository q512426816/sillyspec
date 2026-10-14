---
author: flow-machine-draft
created_at: 2026-10-14T10:36:52.243Z
---
# 任务注册表（Tasks）— 2026-10-14-supersedes-mislink-and-change-display

- [x] task-01: supersedes 同变更限定——src/knowledge-graph.js 去掉跨变更回退（同变更含双 legacy 同源才建边）；test/knowledge-graph.test.mjs ① 断言反转（supersedes 3→2）+ 新增「同变更/双 legacy 建边、跨变更同号不建边」用例；验证：跑该测试文件绿 + 审计同口径脚本复核真实知识库跨变更 supersedes 边归零
- [x] task-02: 变更名限定四处——src/knowledge-match.js 新增 decisionChangeQualifier；src/run/prompt.js、src/flow.js、src/run/complete.js、src/docs-debt.js（touch 增 change）四处展示行渲染「变更 <名>」/「变更未记录」；验证：test/decision-touch.test.mjs + test/thin-fr-inject-parity.test.mjs + test/design-knowledge-check.test.mjs + 新增 test/decision-change-qualifier.test.mjs 全绿
- [ ] task-03: 全量回归 + lint + 模块卡索引——验证：npm test 零失败 + npm run lint 零 hard fail；core-engine/runtime/cli-entry/docs-consistency 四张 changelog 卡增量落盘
