---
author: flow-machine-draft
created_at: 2026-10-05T00:14:27.780Z
---
# 提案书（Proposal）— 2026-10-05-wordpos

## 动机

任务原话转写：动机：anchor-triggerpull 收口实证暴露 FR_STRENGTH_RE 词表位置不对称——中文必须禁用任意位置命中，英文 SHALL MUST SHOULD 被行首锚定（须「- 系统 MUST」形态），句中写英文强度词的合法行为句被误拒收（fail-closed 假拒，与模板指引的书写自由度不符）。
成功标准：
- FR 行为句强度词判定对英文 SHALL MUST SHALL NOT SHOULD 与中文必须禁用同构——句中任意位置命中即视为已撰写
- 待撰写占位行仍被拒收——占位句自带的词表字样不算已撰写
- 既有测试回归绿且 lint 零死导出

## 变更范围

按成功标准机械推导，共 3 条验收面：
1. FR 行为句强度词判定对英文 SHALL MUST SHALL NOT SHOULD 与中文必须禁用同构——句中任意位置命中即视为已撰写
2. 待撰写占位行仍被拒收——占位句自带的词表字样不算已撰写
3. 既有测试回归绿且 lint 零死导出

## 成功标准（可验证）

1. FR 行为句强度词判定对英文 SHALL MUST SHALL NOT SHOULD 与中文必须禁用同构——句中任意位置命中即视为已撰写
2. 待撰写占位行仍被拒收——占位句自带的词表字样不算已撰写
3. 既有测试回归绿且 lint 零死导出
