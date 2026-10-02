---
author: flow-machine-draft
created_at: 2026-10-02T16:34:26.304Z
---
# 任务注册表（Tasks）— 2026-10-03-fr-skeleton-gate

> 机器预填草稿（成功标准逐条镜像）——任务面归 agent：按实际实现路径覆写本文件（保持 checkbox 行形态），验收锚在 requirements；
> 默认 thin：无任务卡文件，收口=flow done 唯一裁决。
> ✅ 边干边勾（2026-09-26-tick-loop-nudge + 2026-09-29 心跳指针）：完成一条 = 实现到位 + 相关测试跑绿 → 立即勾 `[x]`，勿攒到收口一把勾（勾选是进度锚与哨兵证据面）。📌 任务面在 ①spec 阶段定稿：覆写为真实实现步骤（全 `- [ ]`）后再动代码；执行循环：Working on task N/M → 做一件 → 勾一格 → 下一个——收口硬门拒单拍多格勾选（--allow-batch-tick 可显式旁路留痕）。`flow status --change <名>` 为自愿查看/恢复面（恢复时给下一任务指针与进度，非协议必需——D-007）。本文件收口前随交付显式 pathspec 提交。

- [x] task-01: fr-index 判据与标记——isThinSkeletonBodies（全占位 Then）+ renderFrLines 落「骨架：thin」（状态行后）+ readActiveFrDigest 解析 skeleton flag + markSkeletonThin 存量回填（幂等）
- [x] task-02: 注入面排除——buildFrIndexDigestSection 与 flowKnowledgeDigest 滤骨架（TierA 命中例外带 🎯）+ 指针行披露「纯骨架 N 条不注入」+ 遥测 skeletonHidden 增量字段
- [x] task-03: 测试 test/fr-skeleton-gate.test.mjs——判据单元/索引标记/回填幂等/注入排除+TierA 例外双面/digest flag
- [ ] task-04: 全量回归绿（fr-inject-cap ①~⑦ 零回归）+ flow done 收口 + 显式 pathspec 提交
- [x] task-05: 平台仓 markSkeletonThin 回填执行 + 数量披露留档
