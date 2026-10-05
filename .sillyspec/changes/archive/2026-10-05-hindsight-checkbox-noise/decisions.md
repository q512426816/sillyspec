---
author: flow-machine-draft
created_at: 2026-10-05T04:26:40.860Z
---
# 决策记录（Decisions）— 2026-10-05-hindsight-checkbox-noise

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：正则把非任务行误归一——行首 `- [x]`/`- [ ]` 形态在 tasks.md 语义域内就是任务勾选框，误归一面只可能是 agent 在 tasks.md 写 checkbox 形态的非任务内容（极反形态）；且归一只影响改写比分子，不碰文件本体。 试过放弃：① 改 computeEditRatio 忽略 checkbox 前缀——共享内核，动它波及 flow-draft 起草面口径，放弃；② 阈值从 0.6 提到 >0.8——治标：4 任务全勾 0.8、5 任务 0.833 恒穿过任何 <1 阈值，翻格噪声是分子问题不是阈值问题，放弃。
