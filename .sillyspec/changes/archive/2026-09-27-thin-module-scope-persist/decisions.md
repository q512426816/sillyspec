---
author: flow-machine-draft
created_at: 2026-09-27T14:06:57.524Z
---
# 决策记录（Decisions）— 2026-09-27-thin-module-scope-persist

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：平台把 advisory 数据当强承诺——`modules: []` 不等于「无影响」（可能是模块图未登记，未登记面要看 `uncoveredDirs`），展示侧应按「已知影响面」标注而非断言。缓解：键语义已在接口契约固定，`uncoveredDirs` 与 `modules` 并列落盘正是为了让「未登记」显式可见。 试过放弃：① 另立 module-scope.json 单独工件——放弃：change-patch.json 已是平台在读的冻结事实件（files/sha 都在那），多一个文件多一份生命周期与一致性成本；② 把结构化结果渲染进 verify-result.md——放弃：那是人读回执，机器消费面不应与人读面耦合；③ 只加落盘不修旧对账缺陷——放弃：实测旧实现命中恒 0（modules: 包层不进 + 多项目读错图），不修则落盘恒空数组，FR-01 形同虚设——四缺陷修复随本变更交付并各有限定测试锁定。
