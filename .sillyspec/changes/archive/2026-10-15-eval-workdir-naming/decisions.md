---
author: flow-machine-draft
created_at: 2026-10-15T12:55:33.477Z
---
# 决策记录（Decisions）— 2026-10-15-eval-workdir-naming

## D-001@v1: 设计期风险与放弃方案（底稿）
- 类型：process
- 状态：confirmed
- 答案：- 风险：`\0NN` 转义根因理论来自臂 A agent 的自证分析 + 两臂写入全拦实证，非 claude 源码级确认——若修复后重跑仍被拦则另有根因（届时按新证据再修；本修复至少排除已实证的歧义形态）。重跑验证在收口后进行（真 token 消耗），不计入本变更门。 - 放弃的方案：改 claude 侧（不可控、非本仓面）；workdir 换盘符路径（taskId 数字语义仍在，命名前缀是唯一干净修复点）；重命名 taskId 本体（破坏任务 id 稳定性与指纹语义）。
