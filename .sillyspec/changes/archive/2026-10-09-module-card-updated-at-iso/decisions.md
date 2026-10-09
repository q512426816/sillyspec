---
author: flow-machine-draft
created_at: 2026-10-09T04:27:35.946Z
---
# 决策记录（Decisions）— 2026-10-09-module-card-updated-at-iso

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：存量卡旧式戳（+08:00 标称、瞬间失真 8h）不迁移，基于 updated_at 做瞬间比较的下游（如 worktree-guard 对 scan 文档的手工编辑检测——它读的是 scan 文档不是模块卡）对旧卡仍是失真值——接受：worktree-guard 不消费模块卡 updated_at；模块卡 updated_at 当前无瞬间比较消费方，纯展示/溯源。试过放弃：①nowWallClock 本地墙钟裸形状——与人读 created_at 口径混同，且丢机器可比性（Date.parse 按本地解释，跨机歧义）；②本地时刻 + 真实机器偏移（如 +08:00 动态计算）——格式正确但需偏移计算逻辑，收益仅显示本地化，全量 Z + 展示端本地化是更简约定。
