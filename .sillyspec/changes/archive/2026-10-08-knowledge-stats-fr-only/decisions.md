---
author: flow-machine-draft
created_at: 2026-10-08T01:37:38.578Z
---
# 决策记录（Decisions）— 2026-10-08-knowledge-stats-fr-only

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：输出层过滤遗漏某个段导致「跳过」不完全。对策：测试覆盖三态断言段级完整性与字节一致性。放弃的方案：在计算层直接跳过 matrix/conventions 计算——弃，因为计算层是共用函数（被其他消费方引用），跳过会改共用函数签名引入回归面。
