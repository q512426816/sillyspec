---
author: flow-machine-draft
created_at: 2026-09-26T07:13:30.153Z
---
# 任务注册表（Tasks）— 2026-09-26-watcher-timeline

> 机器预填草稿（成功标准逐条镜像）——任务面归 agent：按实际实现路径覆写本文件（保持 checkbox 行形态），验收锚在 requirements；
> 默认 thin：无任务卡文件，收口=flow done 唯一裁决。
> ✅ 边干边勾（2026-09-26-tick-loop-nudge，OS Guardrails 同款纪律）：完成一条 = 实现到位 + 相关测试跑绿 → 立即勾 `[x]`，勿攒到收口一把勾（勾选是进度锚与哨兵证据面）。本文件收口前随交付显式 pathspec 提交。

- [x] task-01: src/timeline.js 纯函数组合成器（parseTaskLines / inferFlipTimes / resolveCommitAnchors / renderTimeline，git 注入面）+ test/watcher-timeline.test.mjs 全量用例
- [x] task-02: index.js 接线 watcher timeline 子命令（白名单+help+双路径 changeDir 探测+降级退出码）+ test:core 清单纳入新测试文件
- [x] task-03: 真实归档变更（2026-09-25-cli-protocol-trust）实测渲染验收 + npm run test:core 与 lint 全绿
