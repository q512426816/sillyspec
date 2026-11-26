---
author: flow-machine-draft
created_at: 2026-11-14T16:09:30.194Z
---
# 设计记录（Design Record）— 2026-11-15-scan-audit-domain

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

上游变更 2026-11-14-scan-incremental 的 `_module-map` 对账存在多项目跨域污染：`computeIncrementalPlan` 的对账用「codegraph 索引全仓文件清单 × 本项目 scope」求未归属——多项目仓（如 multi-agent-platform 的 backend/frontend/daemon/SillyHub 子项目）里，其他项目的文件全部落在本项目 scope 之外，被误报为「未归属」（backend 项目实测误报 3296 个，真实盲区是根项目口径的 1 个）。

修复：对账按**注册项目 path 剥前缀对齐口径**——读 `projects/<projectName>.yaml` 的 `path`（子项目=其仓内目录如 `backend`；主项目 `path: .`/未注册=空前缀）：索引文件路径剥项目前缀后与 map paths（项目相对口径）比对，剥不动的文件（其他项目域内）不进对账分母与未归属（跨域污染修复）；空前缀项目（主项目/单项目仓）不剥不滤，根级散文件仍是该报的真实盲区（行为不变）。真机暴露的深层根因：子项目 map paths 是项目相对（`app/core/**`）而索引是全仓相对（`backend/app/...`）——上游「3296 未归属」本质是口径错配，本修复同时纠正覆盖判定。改动点集中在 `src/scan-incremental.js` 对账段（数行）+ 单测补正反例。

文件变更清单：`src/scan-incremental.js`（对账段剥前缀+双口径+readProjectPathPrefix 内联）、`test/scan-incremental.test.mjs`（新增域过滤 2 用例）、`docs/sillyspec/file-lifecycle.md`（scan 增量模式段补记对账口径对齐，收口补证提交 8f76681f）。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- `computeIncrementalPlan` 返回的 `audit.uncoveredFiles` / `audit.totalIndexed` / `audit.coverageRatio` 语义收窄：多项目仓 = 本项目责任域内口径；单项目仓不变。调用方（guard/stage 输出/审计报告）零改动——`_module-map-audit.md` 报告文案随数字自动正确。
- 无函数签名变化、无新文件、无 CLI 命令面变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
   答：成立——对账输入是索引快照 + module-map 快照，均为一次性读取，无乱序面。
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
   答：对账报告 `_module-map-audit.md` 由 `writeAtomicSync` 原子写（上游已就位），并发 scan 后写覆盖前写，不损坏文件。
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
   答：安全——域过滤判定只依赖 `specBase/projects/` 目录快照（注册数）与内存 scope，会话中断无状态残留。
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
   答：不会——域段来自本项目自己的 scope 首段，不读其他项目配置；`projects/` 目录缺失（未注册仓）按单项目处理，与上游 basename 兜底口径一致。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？
答：最大风险是单项目仓误开域过滤会把根级散文件（真实盲区）藏掉——已用「注册项目数 >1 才启用」门控，并用既有单项目用例锁行为。放弃的方案：按「全部项目 map 的 paths 并集全域」过滤——需要串读其他项目配置（跨项目串台面），放弃；首段集合方案零跨读。

真机复验发现的边界（如实留痕，超出本变更范围）：①子项目 map paths 历史口径漂移（backend=项目相对、sillyhub-daemon=全仓相对）——已用「rel/全仓双口径任一命中」兼容；②frontend map 用中缀 glob 形态（`**/*.tsx`）——inScope 前缀语义天然不命中（上游 scan-diff 同款局限，修复前后行为一致），对账如实暴露该仓 map 形态与匹配器不兼容，匹配器升级（复用归属引擎的 glob 处理）归后续变更。
