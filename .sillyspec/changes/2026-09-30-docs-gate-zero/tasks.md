---
author: flow-machine-draft
created_at: 2026-09-30T02:10:52.595Z
---
# 任务注册表（Tasks）— 2026-09-30-docs-gate-zero

> 机器预填草稿（成功标准逐条镜像）——任务面归 agent：按实际实现路径覆写本文件（保持 checkbox 行形态），验收锚在 requirements；
> 默认 thin：无任务卡文件，收口=flow done 唯一裁决。
> ✅ 边干边勾（2026-09-26-tick-loop-nudge + 2026-09-29 心跳指针）：完成一条 = 实现到位 + 相关测试跑绿 → 立即勾 `[x]`，勿攒到收口一把勾（勾选是进度锚与哨兵证据面）。📌 任务面在 ①spec 阶段定稿：覆写为真实实现步骤（全 `- [ ]`）后再动代码；执行循环：Working on task N/M → 做一件 → 勾一格 → 下一个——收口硬门拒单拍多格勾选（--allow-batch-tick 可显式旁路留痕）。`flow status --change <名>` 为自愿查看/恢复面（恢复时给下一任务指针与进度，非协议必需——D-007）。本文件收口前随交付显式 pathspec 提交。

- [x] task-01: `docs check --fix` 自动重锚本仓漂移 53 处（prompt-control-debt/architecture-4a/docs 域知识库），复跑确认该 53 处清零
- [x] task-02: prompt-control-debt.md 两处 `complete.js:579` 退役调用点人工改写——草稿兜底已随 2026-09-26-task-review-retire 退役，改指现址 src/index.js:992（backfill-reviews）
- [x] task-03: applyFixes 批量转换 211 处跨仓引用为 `repo://sillyhub/` 前缀（197 处直转 + 14 处 token 已验证的行号重锚）
- [x] task-04: 人工消歧 12 处结构变迁现址改写（daemon 路由拆分四锚→router/{daemon_rpc,runtimes,machines}.py 现址、repo://sillyhub/backend/app/modules/daemon/model.py:126、repo://sillyhub/backend/app/modules/daemon/service.py:233、repo://sillyhub/backend/app/modules/daemon/runtime/service.py:523、repo://sillyhub/backend/app/modules/daemon/run_sync/service/submit_steps.py:350、[cid] 页 371、pi-rpc-driver 483、daemon.ts spawn 8706）+ sdk.d.ts 死锚（node_modules 依赖文件）去行号留提及
- [x] task-05: docs check 复跑迭代至全量 0 失效（扫描面不变：docs/ + .sillyspec/docs/ + .sillyspec/changes/ + .sillyspec/knowledge/）
- [ ] task-06: `docs gate --init-baseline` 372→0 锁定 + local.yaml cross_repo_roots 过时注释更正（「本仓当前无 repo:// 引用」已失真）
- [ ] task-07: 交付面显式 pathspec 提交（含 tasks.md 勾选证据）+ flow done 收口 + push 验证 pre-push 三道关全绿
