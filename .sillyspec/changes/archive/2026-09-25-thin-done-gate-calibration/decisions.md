---
author: flow-machine-draft
created_at: 2026-09-25T09:42:14.714Z
---
# 决策记录（Decisions）— 2026-09-25-thin-done-gate-calibration

## D-001@v1: 风险与死路（design 槽4 收割）
- 决策：最大风险：存量在途变更若曾按旧口径「先勾选再 amend-draft」，台账里存的是 [x] 形态的哈希——升级后 verify 归一算的是 [ ] 形态哈希，会失配。触发面极窄（须勾选→amend→工具升级三连），撞上时按提示再跑一次 amend-draft 重锚即愈（amend 的 reanchorText 也走归一哈希，重锚后不再复发）。
  放弃的方案：①把 checkbox 行挪出机器段（机器段只留题面）——改动大、丢任务行指纹保护、所有在途台账失效；②只在 flow 侧归一不动共享 bodyHash——wrapSection/verifyMarkers 立刻分叉两套口径，恰好是要修的病。
