---
author: flow-machine-draft
created_at: 2026-09-30T07:45:32.190Z
---
# 任务注册表（Tasks）— 2026-09-30-quality-scan-passed-idempotent

> 机器预填草稿（成功标准逐条镜像）——任务面归 agent：按实际实现路径覆写本文件（保持 checkbox 行形态），验收锚在 requirements；
> 默认 thin：无任务卡文件，收口=flow done 唯一裁决。
> ✅ 边干边勾（2026-09-26-tick-loop-nudge + 2026-09-29 心跳指针）：完成一条 = 实现到位 + 相关测试跑绿 → 立即勾 `[x]`，勿攒到收口一把勾（勾选是进度锚与哨兵证据面）。📌 任务面在 ①spec 阶段定稿：覆写为真实实现步骤（全 `- [ ]`）后再动代码；执行循环：Working on task N/M → 做一件 → 勾一格 → 下一个——收口硬门拒单拍多格勾选（--allow-batch-tick 可显式旁路留痕）。`flow status --change <名>` 为自愿查看/恢复面（恢复时给下一任务指针与进度，非协议必需——D-007）。本文件收口前随交付显式 pathspec 提交。

- [x] task-01: shouldReuseLastPassedScan 纯函数：passed+dedupKey 全等+快照口径一致 → reuse:true
- [x] task-02: lint failed 记录 / dedupKey 失配 / 快照口径变化 / 无记录 / forceRerun → 各自 reason 不复用
- [x] task-03: executeVerifyQualityScan 幂等命中时：不建快照、不跑 test/lint/smoke/coverage、不重写扫描记录…
- [x] task-04: 码态/known_failures/commands/test_strategy 任一变化 → dedupKey 失配自动重测（既有指纹语义零变化）
- [x] task-05: SILLYSPEC_VERIFY_QUALITY_SCAN_RERUN=1/force 时 passed 闸旁路（与失败闸同阀）
- [x] task-06: 全量测试回归绿 + lint 绿
