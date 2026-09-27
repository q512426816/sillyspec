---
author: flow-machine-draft
created_at: 2026-09-26T07:28:26.622Z
---
# 任务注册表（Tasks）— 2026-09-26-watcher-timeline-p2

> 机器预填草稿（成功标准逐条镜像）——任务面归 agent：按实际实现路径覆写本文件（保持 checkbox 行形态），验收锚在 requirements；
> 默认 thin：无任务卡文件，收口=flow done 唯一裁决。
> ✅ 边干边勾（2026-09-26-tick-loop-nudge，OS Guardrails 同款纪律）：完成一条 = 实现到位 + 相关测试跑绿 → 立即勾 `[x]`，勿攒到收口一把勾（勾选是进度锚与哨兵证据面）。本文件收口前随交付显式 pathspec 提交。

- [x] task-01: inferFlipTimes 仅在中段计数不衔接时标 broken，尾部未覆盖不再误标，配套用例更新
- [x] task-02: renderTimeline 输出逐阶段墙钟（复用 watcher 的 aggregateStageTiming），已勾任务缺推断时刻时单独标注而非笼统断裂注
- [x] task-03: loadChangeTasks 获 tmpdir 用例：活跃优先于归档、归档回退、双缺失返回 null
- [x] task-04: npm run test:core 与 npm run lint 实测全绿
