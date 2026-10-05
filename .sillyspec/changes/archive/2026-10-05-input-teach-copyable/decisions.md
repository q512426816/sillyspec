---
author: flow-machine-draft
created_at: 2026-10-05T15:05:08.002Z
---
# 决策记录（Decisions）— 2026-10-05-input-teach-copyable

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：风险：多行教学使部分命令输出变长（worktree-guard 拦截提示从 ~9 行变 ~11 行）；terminal 折行下实例可能视觉粘连——接受，实例行保持短行、缩进区分。另一风险：教学实例字面与本变更测试断言耦合，未来改教学须同步测试——这正是断言的目的（锁可照抄性），可接受。试过但放弃：改 extractSuccessCriteria 使分号内联形态也过门——放弃理由：内联形态无法区分「动机句」与「标准条目」，放宽会把动机文本误收为标准，门语义受损；教学侧给实例是更小且语义正确的修复面。
