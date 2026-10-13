---
author: flow-machine-draft
created_at: 2026-10-13T05:19:33.104Z
---
# 决策记录（Decisions）— 2026-10-13-cli-pit-fix-batch

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：deps --set 成为常态绕过通道（该验的不验直接 set linked）——缓解为 --reason 强制必填 + 覆写留痕三字段（前值/理由/时间戳），verify/archive 对账以 depsOverrideNote 为审计锚，理由不实属未定义行为（文案明示）。放弃的方案：①让 worktree deps 自动探测 node_modules 可用性免 --reason——离线环境探测本身不可靠（npm ci 超时≠不可用），且弱化留痕动机，弃；②knowledge 帮助做成独立子命令（knowledge help）——探索型调用习惯是 `--help`，拦 --help/-h 才堵得住 refresh 误触发，help 子命令留作未来增强。
