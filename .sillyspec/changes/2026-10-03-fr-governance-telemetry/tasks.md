---
author: flow-machine-draft
created_at: 2026-10-02T17:01:53.472Z
---
# 任务注册表（Tasks）— 2026-10-03-fr-governance-telemetry

> 机器预填草稿（成功标准逐条镜像）——任务面归 agent：按实际实现路径覆写本文件（保持 checkbox 行形态），验收锚在 requirements；
> 默认 thin：无任务卡文件，收口=flow done 唯一裁决。
> ✅ 边干边勾（2026-09-26-tick-loop-nudge + 2026-09-29 心跳指针）：完成一条 = 实现到位 + 相关测试跑绿 → 立即勾 `[x]`，勿攒到收口一把勾（勾选是进度锚与哨兵证据面）。📌 任务面在 ①spec 阶段定稿：覆写为真实实现步骤（全 `- [ ]`）后再动代码；执行循环：Working on task N/M → 做一件 → 勾一格 → 下一个——收口硬门拒单拍多格勾选（--allow-batch-tick 可显式旁路留痕）。`flow status --change <名>` 为自愿查看/恢复面（恢复时给下一任务指针与进度，非协议必需——D-007）。本文件收口前随交付显式 pathspec 提交。

- [x] task-01: fr-index unreferenced 探针带 ids（帽 20）+ flow.js rotSuspectFlow 事件带 frIds（帽 20）——既有字段零改动
- [x] task-02: archive-distill fr-unreferenced 事件透传 ids
- [x] task-03: knowledge-stats 裁决候选聚合（按 id 聚合 suspect/unreferenced 次数）+ cmdKnowledgeStats Top-N 渲染（附来源变更与处置指引；无 id 数据零渲染）
- [x] task-04: 测试 test/fr-governance-telemetry.test.mjs（四用例）全绿 + 既有断言零回归
- [x] task-05: 本仓 unmapped 治理执行（planRedomain 干跑→可迁 --write→残余头注「检索面-only」）+ 数量留档 design
- [ ] task-06: 全量回归 + flow done 收口 + 显式 pathspec 提交
