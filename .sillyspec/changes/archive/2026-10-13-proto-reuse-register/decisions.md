---
author: flow-machine-draft
created_at: 2026-10-13T07:19:56.113Z
---
# 决策记录（Decisions）— 2026-10-13-proto-reuse-register

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：- 风险1：agent 登记复用时复制了但改名不规范（保留中文原名）→ execute 不注入。对策：分级文本把命名写成硬要求 + design-facts 清单复核命名 + gates 软提醒兜底（目录无 prototype-*.html 即响）。 - 风险2：既有原型只覆盖部分 UI 面（如只覆盖 PC 无小程序）。裁决：覆盖面声明必须如实写，未覆盖部分仍按「必须生成」产出增量原型；变更目录本就允许多个 prototype-*.html 共存，execute 注入支持多文件。 - 死路：考虑过让 gates 硬校验 design.md 中「复用声明」的格式——放弃：复用声明是自由文本，硬校验只会催生占位应付，软提醒+自审清单已与「跳过原因」同等强度，够了。
