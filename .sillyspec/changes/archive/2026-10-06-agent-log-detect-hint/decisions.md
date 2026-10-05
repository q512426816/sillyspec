---
author: flow-machine-draft
created_at: 2026-10-05T17:14:12.271Z
---
# 决策记录（Decisions）— 2026-10-06-agent-log-detect-hint

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：展示名映射 HARNESS_DISPLAY_NAMES 成为新的次要漂移点（新 harness 忘加映射→展示退化为 name 原样）。已用缺省回退消解——退化形态仍含全部家数，只是不美化，且测试遍历断言按「映射名或 name 原样」命中，两种形态都受覆盖。 试过放弃：① 仅更新硬编码文案为 8 家——不解决根因，注册表再扩仍漂移，放弃；② 提示全部用 name 原样拼接（claude-code / deepseek-dsh）——零映射零漂移但可读性差（品牌大小写混乱），放弃，取映射+回退折中。
