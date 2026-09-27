---
author: flow-machine-draft
created_at: 2026-09-27T16:20:57.122Z
---
# 任务注册表（Tasks）— 2026-09-28-archive-timeline-bake

> 机器预填草稿（成功标准逐条镜像）——任务面归 agent：按实际实现路径覆写本文件（保持 checkbox 行形态），验收锚在 requirements；
> 默认 thin：无任务卡文件，收口=flow done 唯一裁决。
> ✅ 边干边勾（2026-09-26-tick-loop-nudge，OS Guardrails 同款纪律）：完成一条 = 实现到位 + 相关测试跑绿 → 立即勾 `[x]`，勿攒到收口一把勾（勾选是进度锚与哨兵证据面）。本文件收口前随交付显式 pathspec 提交。

- [x] task-01: 烤制编排落地——complete-handlers.js 新增 bakeArchiveTimeline（resolvePlatformOpts>resolveRuntimeRoot 同链解析 runtimeRoot，与 watcher timeline CLI 同一合成面）+ runArchiveChain 接线（rename 成功后、unregisterChange/窄化 git add 前）；timeline.js 新增 renderBakedTimeline（快照头注记：机本位声明/终拍未入快照诚实面/副本两态）
- [x] task-02: fail-open 三态留痕——无事件流 skip（零文件产出带原因）/ 失败 {ok:false}（调用方一行警告）/ 异常兜底 catch，均不阻断归档主流程
- [x] task-03: watcher timeline CLI 回退——readWatcherEvents 增 path 直读形态（同一坏行容忍语义，path 优先）；.runtime 无事件流时读归档包 watcher-events.jsonl 副本输出完整时间线 + 事件来源注记行（副本也缺失保持既有 exit 2）
- [x] task-04: 事件副本尺寸帽 BAKE_EVENTS_COPY_MAX_BYTES=2MiB——超帽只烤 timeline.md 且文件头注记「尺寸超帽」（缺省值测试钉）
- [x] task-05: 新增 test/archive-timeline-bake.test.mjs 八用例（渲染两态/fixture 端到端双落盘字节一致/无事件跳过/写失败 fail-open/path 直读坏行容忍优先级/超帽/尺寸帽钉值）+ package.json test:core 纳入
- [x] task-06: lint 全绿（841 文件、未引用导出 0、module-map 覆盖全）+ doc-ref-check 93/93（platform-interface-map complete-handlers.js 行号锚 2553→2615 随实现位移修准）+ 全量 npm test 绿（见收口实测）+ sync.md 接口表 3 行/changelog 登记

> 完成证据注记（收口补）：实现单提交 + 本证据提交构成区间证据面；全量 npm test 659/660（余 1 红 flow-protocol 满载竞态假红，单跑 22/22 绿非本变更面）+ lint 全绿 + doc-ref 93/93 + CLI 回退/烤制双冒烟（真实归档目录 × 真实事件流端到端）。
