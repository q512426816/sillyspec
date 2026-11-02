---
author: flow-machine-draft
created_at: 2026-11-02T20:55:56.225Z
---
# 提案书（Proposal）— 2026-11-02-slot4-harvest-retire

## 动机

任务原话转写：槽4 底稿收割源头下线

harvestSlot4Decision 从 design 风险与死路段合成 decisions.md 底稿条目（D-001@v1 设计期风险与放弃方案），随蒸馏链进 knowledge/unmapped——4A 实证本仓 47 条、平台 173 条全是此产物，标题模板化、无真否决语义、锚点未记录/无意义。底稿资格门（series-final-cleanup）已解决行为面（不占防复潮席位），但数据面 distill 持续产出使停车场回涨。根治：收割函数不再写盘，风险分析保留在 design.md（归档冻结已保全），不再合成伪决策条目。

成功标准：
- harvestSlot4Decision 改为恒返回 {harvested:false, reason}，不再写 decisions.md；函数保留签名（flow.js 调用点兼容）但 flow.js 摘除收割调用与日志
- 测试：slot4-distill-fix.test.mjs 和 decision-anchor-backfill.test.mjs 适配（收割相关断言改为验证不写盘/幂等跳过；anchorBackfillCandidate 纯函数保留——蒸馏端还消费）
- 存量底稿不动（已无行为影响，后续数据治理清理）
- 验收：全量 npm test 零红 + eval 六探针 GREEN + lint 绿 + 显式 pathspec 提交

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. harvestSlot4Decision 改为恒返回 {harvested:false, reason}，不再写 decisions.md；函数保留签名（flow.js 调用点兼容）但 flow.js 摘除收割调用与日志
2. 测试：slot4-distill-fix.test.mjs 和 decision-anchor-backfill.test.mjs 适配（收割相关断言改为验证不写盘/幂等跳过；anchorBackfillCandidate 纯函数保留——蒸馏端还消费）
3. 存量底稿不动（已无行为影响，后续数据治理清理）
4. 验收：全量 npm test 零红 + eval 六探针 GREEN + lint 绿 + 显式 pathspec 提交

## 成功标准（可验证）

1. harvestSlot4Decision 改为恒返回 {harvested:false, reason}，不再写 decisions.md；函数保留签名（flow.js 调用点兼容）但 flow.js 摘除收割调用与日志
2. 测试：slot4-distill-fix.test.mjs 和 decision-anchor-backfill.test.mjs 适配（收割相关断言改为验证不写盘/幂等跳过；anchorBackfillCandidate 纯函数保留——蒸馏端还消费）
3. 存量底稿不动（已无行为影响，后续数据治理清理）
4. 验收：全量 npm test 零红 + eval 六探针 GREEN + lint 绿 + 显式 pathspec 提交
