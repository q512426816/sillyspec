---
author: flow-machine-draft
created_at: 2026-10-23T15:33:57.087Z
---
# 决策记录（Decisions）— 2026-10-23-flow-done-shared-repo-multi-session-frictions

## D-001@v1: 设计期风险与放弃方案（底稿）
- 类型：process
- 状态：confirmed
- 答案：- 最大风险：误报——HEAD 树已含归档却判未落库，重复提示噪音。缓解：目录首段精确匹配 + `-<name>` 后缀兼容形态入测试锚。 - 死路 1：让 CLI 直接代执行归档提交——共享暂存区多会话下自动 git commit 是历史重灾区（AGENTS 提交纪律），打印 + 升级提示留给确认权在人。 - 死路 2：改用 exit 1 硬拦未落库——幂等重入路径上「已打印待执行」是合法中间态，硬拦会打断断点续；stderr 升级 + 后果说明是披露不是阻断。
