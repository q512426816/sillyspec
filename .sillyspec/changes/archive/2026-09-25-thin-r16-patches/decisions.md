---
author: flow-machine-draft
created_at: 2026-09-25T04:21:02.826Z
---
# 决策记录（Decisions）— 2026-09-25-thin-r16-patches

## D-001@v1: 风险与死路（design 槽4 收割）
- 决策：风险=exclusive 判定按路径正则（.sillyspec/.runtime/worktrees/ 前缀）——非 worktree 的独占目录（如 r16 对撞的兄弟目录 worktree）不在判定内，走共享主仓路径只警告不阻断，缺口可见。死路=让 agent 声明「代码已全部提交」自证——自证不算证据，机械收集才算（CLI 只认盘面）。
