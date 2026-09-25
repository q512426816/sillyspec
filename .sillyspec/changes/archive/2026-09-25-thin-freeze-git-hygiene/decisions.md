---
author: flow-machine-draft
created_at: 2026-09-25T05:14:44.282Z
---
# 决策记录（Decisions）— 2026-09-25-thin-freeze-git-hygiene

## D-001@v1: 风险与死路（design 槽4 收割）
- 决策：风险=--freeze-dirty 在真多会话共享仓被滥用（把他侧未声明 WIP 冻进自己审计件）——出路口径同 --upgrade-thick 类留痕 flag（使用即声明，审计面可见）；滥用后果是审计件污染而非代码风险。死路=让 CLI 自动判定 dirty 归属——共享主仓无归属信号，判定即猜测（49 文件泄漏实证），显式声明是唯一诚实解。
