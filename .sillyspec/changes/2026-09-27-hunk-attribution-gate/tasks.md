---
author: flow-machine-draft
created_at: 2026-09-27T05:40:53.733Z
---
# 任务注册表（Tasks）— 2026-09-27-hunk-attribution-gate

> 机器预填草稿（成功标准逐条镜像）——任务面归 agent：按实际实现路径覆写本文件（保持 checkbox 行形态），验收锚在 requirements；
> 默认 thin：无任务卡文件，收口=flow done 唯一裁决。
> ✅ 边干边勾（2026-09-26-tick-loop-nudge，OS Guardrails 同款纪律）：完成一条 = 实现到位 + 相关测试跑绿 → 立即勾 `[x]`，勿攒到收口一把勾（勾选是进度锚与哨兵证据面）。本文件收口前随交付显式 pathspec 提交。

- [x] task-01: src/hunk-attribution.js 模块——声明面归集（复用 parseFileChangeList/extractRequirementBindings/testAnchorFile 同源）/hunk 计数/porcelain 双列在途检测/跨变更竞争扫描/三档分级/fail-soft (FR-01 FR-02 FR-03 FR-04 FR-05)
- [x] task-02: flow.js probes 子步单点接线（warn 三类信号输出、error reportMidFail+exit 1 阻断、off 跳过）+ config-schema.js hunk_gate 键 (FR-05)
- [x] task-03: 单测 6 用例（真实临时 git 仓走全信号路径：未归因含 hunk 数、竞争含对方变更名、残留含 porcelain 工作树列、归集含 NEW: 与反斜杠归一、off/空面降级、fail-soft）+ check-syntax 未用导出清理（3 内部函数去导出） (FR-06)
- [x] task-04: 自食其力核对——提交前对 flow.js 逐 hunk 人工核对（2 hunk 31 行全属本变更，零外源；本变更防的正是 flow.js 夹带）+ 既有「提交面夹带嫌疑 advisory」块零改动核对 (FR-07)
