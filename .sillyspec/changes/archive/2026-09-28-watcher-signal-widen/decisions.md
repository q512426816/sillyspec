---
author: flow-machine-draft
created_at: 2026-09-28T10:12:07.716Z
---
# 决策记录（Decisions）— 2026-09-28-watcher-signal-widen

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：verify-runs 全目录逐文件 JSON 解析在运行目录多时变慢——3s 轮询周期内条目有限（实测当日 ~60 目录），必要时后续加目录名倒序早退。放弃方案：假勾选改「区间终态判定不预警」（丢失即时信号，拍位消解两全）；watcher 直读 local.yaml 内容上事件（隐私面拒绝）。
