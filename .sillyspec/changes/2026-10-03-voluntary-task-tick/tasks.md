---
author: flow-machine-draft
created_at: 2026-10-03T06:48:48.936Z
---
# 任务注册表（Tasks）— 2026-10-03-voluntary-task-tick

> 机器预填草稿（成功标准逐条镜像）——任务面归 agent：按实际实现路径覆写本文件（保持 checkbox 行形态），验收锚在 requirements；
> 默认 thin：无任务卡文件，收口=flow done 唯一裁决。
> ✅ 边干边勾（2026-09-26-tick-loop-nudge + 2026-09-29 心跳指针）：完成一条 = 实现到位 + 相关测试跑绿 → 立即勾 `[x]`，勿攒到收口一把勾（勾选是进度锚与哨兵证据面）。📌 任务面在 ①spec 阶段定稿：覆写为真实实现步骤（全 `- [ ]`）后再动代码；执行循环：Working on task N/M → 做一件 → 勾一格 → 下一个——收口硬门拒单拍多格勾选（--allow-batch-tick 可显式旁路留痕）。`flow status --change <名>` 为自愿查看/恢复面（恢复时给下一任务指针与进度，非协议必需——D-007）。本文件收口前随交付显式 pathspec 提交。

- [x] task-01: 镜像未认领判定纯函数 isMirrorUntouchedFace（sentinel-assertions.js）+ 直测（未认领真/已覆写假/部分勾假/无基线假）
- [x] task-02: task tick 轻动词：src/task-tick.js 纯函数（翻格保字节/幂等/未知 id 列可选/进度与下一任务指针）+ index.js 分派 + CLI 端到端直测
- [x] task-03: flow done 收口自愈：勾选缺失 advisory 去零提交前提（0/12 事故静默修复）；镜像未认领且有交付（提交∨脏文件）→ 机器代勾全部镜像行（autopilot_ticked+mirror_autotick 留痕、重入跳过假勾判定、勾选节奏门代勾降级）+ 行为测
- [x] task-04: 三处文案钉死自愿勾选：flow start 执行循环段（第一人称时序+tick 动词+TodoWrite 不替代声明）/ tasks.md 机器稿头注（flow-draft.js）/ AGENTS.md 模板与仓实例各加边干边勾常驻条目
- [x] task-05: 聚焦测试全绿（新增 task-tick/isMirrorUntouchedFace/done 自愈行为）+ 既有勾选面回归（flow-tick-prototype/batch-tick-gate/governance-autopilot/sentinel-mirror-waiver/tick-loop-nudge）
