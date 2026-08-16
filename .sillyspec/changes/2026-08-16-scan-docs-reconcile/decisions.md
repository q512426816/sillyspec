---
author: qinyi
created_at: 2026-08-16T17:48:00+08:00
updated_at: 2026-08-16T17:48:00+08:00
---

# Decisions：2026-08-16-scan-docs-reconcile

## D-001@v1: docs gate 6 处失效的处置口径
- type: compatibility
- priority: P1
- status: accepted
- source: design-grill（B1）
- question: 并行会话 3fd0e7d 改 command.js 行号漂移产生 6 处引用失效 > 基线 0，本 change 目标 3"不超基线 0"无法按原文达成，如何处置？
- answer: 组合 a+b：目标 3 改相对口径（本 change 不新增失效）；P3 顺手修清单内的 ARCHITECTURE.md:L99；另 5 处（prompt-control-debt.md×3 / self-audit-2026-08-16.md×2）不在本 change 14 文件清单内，留给制造漂移的 fail-open 并行会话清偿（谁污染谁治理）。
- normalized_requirement: P4 验证时 `docs check` 失效数 ≤ 存量 5（并行遗留）且清单内 0 新增；push 若被 pre-push 拦截，属预期（等 fail-open 会话清偿后归零）。
- impacts: [design.md 设计目标 3 / P3 / P4, review.json B1]
- evidence: Grill X7（docs gate 实测 6>0）；git log 3fd0e7d（2026-08-16 17:02 改 src/run/command.js）
