---
author: flow-machine-draft
created_at: 2026-10-06T06:03:38.804Z
---
# 决策记录（Decisions）— 2026-10-06-archive-cmd-race-and-brief

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：knowledge/docs 共享面仍有残余竞态（打印→执行窗口内新文件被并行移走）——HEAD 锚不适用于「本轮蒸馏新产、HEAD 尚不在册」的 A 条目，只能以在场判定收窄 + fallback 指引兜底；发生概率低（蒸馏产物刚由本链写盘）。试过放弃：① 打印时逐条目 `git ls-files` 校验——校验的是同一瞬态 index，幽灵当场在册照样通过，治标不治本；② 建议裸 `git commit`（无 pathspec）——违反 AGENTS.md 规则 11（共享暂存区会卷入他会话条目），且把「执行时暂存区又变」的窗口风险放大成全量面。
