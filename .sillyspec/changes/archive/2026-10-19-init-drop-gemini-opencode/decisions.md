---
author: flow-machine-draft
created_at: 2026-10-19T03:01:37.857Z
---
# 决策记录（Decisions）— 2026-10-19-init-drop-gemini-opencode

## D-001@v1: 设计期风险与放弃方案（底稿）
- 类型：process
- 状态：confirmed
- 答案：最大风险：Gemini CLI 用户选中 gemini 后 AGENTS.md 不被其自动加载（该 CLI 现默认 GEMINI.md），规则「看得见但没生效」——缓解：file-lifecycle 明写边界与自行引用办法；相比继续生成 GEMINI.md，这是用户明确要求的取舍。放弃的方案：①连同 gemini/opencode 工具类型一起下线（初版方案）——用户澄清否决，类型要保留；②选中 gemini/opencode 时什么都不生成——工具类型变成空壳选项（gemini 无 skills 目录，选中即零产物），AGENTS.md 落点至少保留规则源与 opencode 的原生加载；③保留 injectInstructions 但改成写 AGENTS.md——绕一圈等价于方案②的扩用，徒留死代码。
