---
author: flow-machine-draft
created_at: 2026-10-05T04:22:10.210Z
---
# 提案书（Proposal）— 2026-10-05-hindsight-checkbox-noise

## 动机

任务原话转写：动机：route-hindsight 的 tasksRewriteRatio 把勾选翻格（- [ ] → - [x]）计为整行改写：机器稿 tasks 正文=标题行+N 任务镜像行，任务全勾后 N/(N+1) 恒超 0.6 阈——2026-10-05 四个轻量变更实测全部中标（wordpos/status-empty-guide/dogfood-audit-fixes 各 3 任务=0.75，review-promise-negation 4 任务=0.8），且其中 dogfood-audit-fixes 的 tasks.md 内容零改写（仅翻勾选格），纯勾选翻格复算改写比 0.75 铁证。效果是「诚实勾任务的变更必然被点名疑似该走预段，不勾的反而不标」——信号完全失真。根因：2026-10-04 thin-docs-v2 引入镜像任务行+勾选机制后，hindsight 口径未跟上（既有测试反例只覆盖 v1 槽位纯增行形态）。修复面：src/route-hindsight.js——tasks 比对前做勾选框状态归一（[x]/[X]→[ ]，纯结构 token 归一符合 D-003 封闭面零语义判定），design 面不归一；真实任务文本改写仍正常计入。test/route-hindsight.test.mjs 补形态用例。
成功标准：
- 纯勾选翻格（任务行文本零改动）的 tasksRewriteRatio 必须为 0 且不触发标记
- 勾选翻格叠加真实任务文本改写时，改写比只按文本改写行计（翻格不稀释不虚增）
- design 比对面不做勾选归一（design 文本含 checkbox 形态差异仍计改写）；单测覆盖上述三情形

## 变更范围

按成功标准机械推导，共 3 条验收面：
1. 纯勾选翻格（任务行文本零改动）的 tasksRewriteRatio 必须为 0 且不触发标记
2. 勾选翻格叠加真实任务文本改写时，改写比只按文本改写行计（翻格不稀释不虚增）
3. design 比对面不做勾选归一（design 文本含 checkbox 形态差异仍计改写）；单测覆盖上述三情形

## 成功标准（可验证）

1. 纯勾选翻格（任务行文本零改动）的 tasksRewriteRatio 必须为 0 且不触发标记
2. 勾选翻格叠加真实任务文本改写时，改写比只按文本改写行计（翻格不稀释不虚增）
3. design 比对面不做勾选归一（design 文本含 checkbox 形态差异仍计改写）；单测覆盖上述三情形
