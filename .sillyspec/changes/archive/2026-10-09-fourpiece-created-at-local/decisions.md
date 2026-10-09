---
author: flow-machine-draft
created_at: 2026-10-09T04:05:47.471Z
---
# 决策记录（Decisions）— 2026-10-09-fourpiece-created-at-local

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：存量已写 UTC 的 `created_at` 不自愈（如 2026-10-09-workspace-init-skill-gate 的 requirements/proposal 02:04:06），时间线对旧变更仍显示旧错值——接受：历史工件不改写，变更事实以 watcher 事件流为准，新变更起生效。试过放弃：①读取端按 UTC 解析无时区裸形状——无法区分「本地墙钟约定值」与「UTC 误写值」，猜错方向比不猜更糟；②created_at 显式带时区偏移（+08:00）——与 datetime.js 立的「YYYY-MM-DD HH:mm:ss 形状」约定冲突，牵动 CLI/平台全部读取面，超出本修范围。
