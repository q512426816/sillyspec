---
author: flow-machine-draft
created_at: 2026-09-30T08:22:34.672Z
---
# 任务注册表（Tasks）— 2026-09-30-snapshot-symlink-store-subdir

> 机器预填草稿（成功标准逐条镜像）——任务面归 agent：按实际实现路径覆写本文件（保持 checkbox 行形态），验收锚在 requirements；
> 默认 thin：无任务卡文件，收口=flow done 唯一裁决。
> ✅ 边干边勾（2026-09-26-tick-loop-nudge + 2026-09-29 心跳指针）：完成一条 = 实现到位 + 相关测试跑绿 → 立即勾 `[x]`，勿攒到收口一把勾（勾选是进度锚与哨兵证据面）。📌 任务面在 ①spec 阶段定稿：覆写为真实实现步骤（全 `- [ ]`）后再动代码；执行循环：Working on task N/M → 做一件 → 勾一格 → 下一个——收口硬门拒单拍多格勾选（--allow-batch-tick 可显式旁路留痕）。`flow status --change <名>` 为自愿查看/恢复面（恢复时给下一任务指针与进度，非协议必需——D-007）。本文件收口前随交付显式 pathspec 提交。

- [x] task-01: 子目录（一层）存在 pnpm/bun/lerna lockfile 而根目录无任何 lockfile 判据时…
- [x] task-02: 根目录判据行为零变化（根命中优先，标签不带 subdir）
- [x] task-03: createVerifyGateSnapshot 对子目录布局命中时打印跳快照警告并返回 null（回退主仓实测）…
- [x] task-04: 非仓目录/无子目录/子目录全空的行为零变化（null）
- [x] task-05: 全量测试回归绿 + lint 绿
