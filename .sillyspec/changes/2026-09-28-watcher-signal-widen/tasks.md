---
author: flow-machine-draft
created_at: 2026-09-28T09:57:02.602Z
---
# 任务注册表（Tasks）— 2026-09-28-watcher-signal-widen

> 机器预填草稿（成功标准逐条镜像）——任务面归 agent：按实际实现路径覆写本文件（保持 checkbox 行形态），验收锚在 requirements；
> 默认 thin：无任务卡文件，收口=flow done 唯一裁决。
> ✅ 边干边勾（2026-09-26-tick-loop-nudge，OS Guardrails 同款纪律）：完成一条 = 实现到位 + 相关测试跑绿 → 立即勾 `[x]`，勿攒到收口一把勾（勾选是进度锚与哨兵证据面）。本文件收口前随交付显式 pathspec 提交。

- [x] task-01: buildSnapshot 两源（gateRun/localConfig）+ inferEvents 两条事件（gate-run/config-change） (FR-01 FR-02)
- [x] task-02: ruleFakeCheck 状态化消解（pending → fake-check-cleared info 含提交号）+ createSentinelState/dispatch 接线 (FR-03)
- [x] task-03: stripNestedTestEnv 共用单点导出 + runCrossRepoFullTest 与 runFullCommand 两处 execSync 补剥离 (FR-04)
- [x] task-04: watcher 测试 +2（新源新事件、消解三拍路径）20/20 全绿 + tap-judge/known-failures 回归 (FR-05)
