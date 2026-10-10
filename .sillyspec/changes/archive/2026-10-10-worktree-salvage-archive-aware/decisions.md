---
author: flow-machine-draft
created_at: 2026-10-10T03:41:11.250Z
---
# 决策记录（Decisions）— 2026-10-10-worktree-salvage-archive-aware

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：归档副本存在但 worktree 副本更新（归档后子代理又向 worktree 写入的极端时序）——本设计以 archive 副本为权威静默跳过（warn 有计数与路径清单，人工可对账），不自动覆盖，避免把「更旧快照复活」换成「更新内容覆盖归档件」的对称事故。试过放弃的方案：① 调用方传 archived flag——五入口逐一接线，漏一处即复活，且 doctor 入口判定口径（worktree.js:1795）与打捞内判定会形成两套真相；② 归档态整树跳过——「两处均缺」的真独有产物会随清理蒸发，违背打捞初衷（坑 worktree-spec-artifact-misplace）；③ 内容比对 archive 副本差异列入冲突清单——事故场景 13 文件全部内容有差（旧快照 vs 终版），全列纯噪音。
