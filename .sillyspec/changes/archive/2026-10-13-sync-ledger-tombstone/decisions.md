---
author: flow-machine-draft
created_at: 2026-10-13T15:59:38.677Z
---
# 决策记录（Decisions）— 2026-10-13-sync-ledger-tombstone

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：合成载荷被平台 `_ensure_change_row` 在「从未同步过」的变更上先建占位行再立即被墓碑收敛——产生一行 location='deleted' 的墓碑行；这与平台既有 3 行历史墓碑（2026-08-26/09-10/09-11）形态一致，可接受。次风险：平台行有 last_pushed_at 而合成载荷不带 base_ts——平台契约「base_ts 缺失无条件接受」（platform_sync/service.py 分支 1），无 409 面；若平台后续收紧该契约，fallback 是 best-effort 失败日志（不阻断）。 放弃的方案：①daemon reconcile 对账「平台 active 行 vs 本地全无」主动软删——多机工作区下他机活跃变更会被误删，需要引入行级机器归属，改动面过大；②sync 对 progressData null 一律发墓碑——打错 --change 名（从未存在）会把平台同名真变更误软删，不可接受；台账正是为了区分「从未存在」与「存在过且已终态」。平台侧 7 天占位行保护窗 + 全量 reparse 兜底（已有）继续作为外部裸删（rm -rf + SQL 全清）的最后防线。
