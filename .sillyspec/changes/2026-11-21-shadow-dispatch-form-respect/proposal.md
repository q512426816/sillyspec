---
author: flow-machine-draft
created_at: 2026-11-21T15:51:52.927Z
---
# 提案书（Proposal）— 2026-11-21-shadow-dispatch-form-respect

## 动机

任务原话转写：免评审形态收口不再自动派影子审查

动机：主会话按 --no-review 形态如实报告「不派平台评审」，CLI 影子旁路却在 brainstorm 收口时自动向平台派发独立审查会话且主会话不可见（2026-11-21 实证：2026-11-21-verify-gate-scope-speed 收口时 pi 影子会话 23:29:21 被派、12 秒 failed、主会话输出无披露行）——形态选择被旁路穿透+派发披露缺口。用户裁决：形态压过旁路、影子机制保留但派发必须可见。

成功标准：
- 声明 --no-review 或 --turbo 形态的变更，其 brainstorm/plan/execute 收口不再派发影子审查，对照账 skips 留痕理由含形态表述
- 未声明免评审形态的轻档变更影子照派，且「影子审查已后台派发」披露行在收口命令退出前同步打出（不再 fire-and-forget 丢输出）
- 档位判定、ceremony.shadow 开关、幂等闸、probe 前置等既有影子链路逻辑零改动，缺省行为对非免评审形态变更不变

## 变更范围

按成功标准机械推导，共 3 条验收面：
1. 声明 --no-review 或 --turbo 形态的变更，其 brainstorm/plan/execute 收口不再派发影子审查，对照账 skips 留痕理由含形态表述
2. 未声明免评审形态的轻档变更影子照派，且「影子审查已后台派发」披露行在收口命令退出前同步打出（不再 fire-and-forget 丢输出）
3. 档位判定、ceremony.shadow 开关、幂等闸、probe 前置等既有影子链路逻辑零改动，缺省行为对非免评审形态变更不变

## 成功标准（可验证）

1. 声明 --no-review 或 --turbo 形态的变更，其 brainstorm/plan/execute 收口不再派发影子审查，对照账 skips 留痕理由含形态表述
2. 未声明免评审形态的轻档变更影子照派，且「影子审查已后台派发」披露行在收口命令退出前同步打出（不再 fire-and-forget 丢输出）
3. 档位判定、ceremony.shadow 开关、幂等闸、probe 前置等既有影子链路逻辑零改动，缺省行为对非免评审形态变更不变
