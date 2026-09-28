---
author: flow-machine-draft
created_at: 2026-09-28T14:11:49.664Z
---
# 决策记录（Decisions）— 2026-09-28-knowledge-score-denoise

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：风险：① 剥数字后「含版本号/年份的语义查询」（如 查 FR-016 相关决策）丢失数字区分力——决策标题本无数字语义，可接受；② \p{P} 剥除连中英标点（含全角），标题实词不受影响。死路=正则 Unicode 类别写错会静默破坏主场景（首版 \W 误剥 CJK 被测试②当场拦截）——测试钉主场景/近义/ASCII 三面。退役判据=出现依赖数字 bigram 才能区分的相关性场景投诉。
