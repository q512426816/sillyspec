---
author: flow-machine-draft
created_at: 2026-11-09T07:32:20.895Z
---
# 提案书（Proposal）— 2026-11-09-legacy-red-fixes

## 动机

任务原话转写：修复八个预存测试失败归因清偿
全量套件 8 失败归因三类:①2026-11-08-project-map(2b1fd2fb)把 knowledge SKILL.md 整体回退旧版,撤掉 11-07 三知识变更写入的 accept/refresh 退役/propose --body-file/K 形态四段模板,3 个 knowledge 测试 5 断言挂;②test/.sillyspec 运行残渣(auto-pull-throttle/gate-bogus-stage)污染向上查找,spec-dir-home-guard Test5 与 runtime-relayout(单跑绿全量红)挂;③文案锚演进未同步:doc-ref-check 行号漂移(shared.js:1217/spec-sync.js:56)、prompt-golden 金档未再生、thin-user-decision-record 断点②文案改「等用户选择再跑收口」测试仍锚旧句。

成功标准:
- knowledge SKILL 恢复 2b1fd2fb^ 版本,3 测试 5 断言绿
- test/.sillyspec 残渣清除+产生源头修复,spec-dir-home-guard 与 runtime-relayout 全量态绿
- platform-interface-map.md 行号锚对齐当前源码,doc-ref-check 绿
- prompt-golden 金档按现行提示词再生,diff 审查随提交
- thin-user-decision-record 断言对齐现行断点②文案,绿
- sillyspec 全量测试绿(0 失败)

## 变更范围

按成功标准机械推导，共 6 条验收面：
1. knowledge SKILL 恢复 2b1fd2fb^ 版本,3 测试 5 断言绿
2. test/.sillyspec 残渣清除+产生源头修复,spec-dir-home-guard 与 runtime-relayout 全量态绿
3. platform-interface-map.md 行号锚对齐当前源码,doc-ref-check 绿
4. prompt-golden 金档按现行提示词再生,diff 审查随提交
5. thin-user-decision-record 断言对齐现行断点②文案,绿
6. sillyspec 全量测试绿(0 失败)

## 成功标准（可验证）

1. knowledge SKILL 恢复 2b1fd2fb^ 版本,3 测试 5 断言绿
2. test/.sillyspec 残渣清除+产生源头修复,spec-dir-home-guard 与 runtime-relayout 全量态绿
3. platform-interface-map.md 行号锚对齐当前源码,doc-ref-check 绿
4. prompt-golden 金档按现行提示词再生,diff 审查随提交
5. thin-user-decision-record 断言对齐现行断点②文案,绿
6. sillyspec 全量测试绿(0 失败)
