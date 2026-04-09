# auto mode — 提案

author: qinyi
created_at: 2026-04-08 07:29:00

## 动机
用户希望一次启动就自动完成 brainstorm → plan → execute → verify 全流程，不需要手动输入 `sillyspec run <stage>` 和 `--done`。

## 变更范围
新增 `.claude/skills/sillyspec-auto/SKILL.md`

## 不在范围内
- 不修改 JS 源码
- 不改变阶段流程

## 成功标准
1. `/sillyspec:auto "需求"` 能自动推进全流程
2. 步骤内部确认点正常暂停
3. 异常时暂停等用户介入
