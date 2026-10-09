---
author: flow-machine-draft
created_at: 2026-10-09T00:07:21.418Z
---
# 设计记录（Design Record）— 2026-10-09-archive-integrity-thin-aware

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | src/doctor-diagnostics.js | detectArchiveIntegrity：thin 协议归档判别（flow-state.yaml → plan.md 豁免）+ THIN_TASKS_EPOCH=2026-10-07 勾选契约时代规则 |
| 修改 | test/doctor-archive-integrity.test.mjs | makeArchive 增 flowState 选项；用例 14（thin plan 豁免/未勾不洗白）+ 用例 15（epoch 三断言） |
| 修改 | .sillyspec/archive-integrity-exempt.yaml | 批量补录 42 条历史形态条目（五类理由，走本变更裁决） |

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

推送 pre-push 的 advisory 点名 200+ 份归档欠账，普查实证为检查模型漂移而非真欠账：①172 份 flow-state.yaml 在场的 thin 归档无 plan.md 属契约正常（plan.md 是厚道 plan 阶段产物；2026-09-29 thin-default 后轻量道成默认路径，误报持续增长）——修检查：thin 判别豁免 plan.md 在场性；②36 份 2026-10-07-thin-tasks-v3 之前的 thin 归档 tasks 0 勾属当时占位稿形态（完成证据=flow done 六子步，勾选契约 v3 才建立）——修检查：THIN_TASKS_EPOCH 时代规则；③42 份真历史形态（pre-plan-约定双无/quick 通道/纯提案 spike/远古未勾/09-10 手写分解/thin-FR 蒸馏接线落地前窗口）——按账本纪律走本变更裁决批量入账（不伪造 plan.md/不补勾篡改历史）。修检查与入账的分工沿既有先例：系统性协议变迁用代码规则（task-truth-unify 回退同款），个案形态用账本。终态：627 份归档全过、offenders=0、58 份豁免在案——advisory 从此只对未来新账响。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- detectArchiveIntegrity 行为变化：thin 归档（flow-state.yaml）不再报 plan.md 缺失；pre-epoch（<2026-10-07）thin 归档不再报任务未勾与注册表不可读；厚道归档两项检查零变化；FR 索引检查零变化。
- doctor 输出：archive_integrity 维度 findings 从「200+ 份欠账 advisory」变为「N 份归档完整 + 豁免注记」。
- 无端点/命令/文件格式变更；豁免账本为数据文件增条（格式沿既有 entries 段）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

   不适用：检查为归档目录纯读快照，无事件面；epoch 比较为目录名字典序（日期前缀归档名恒定，无乱序可能）。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

   只读检查无共享写面；账本追加为一次性变更内编辑（git 管理）。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

   检查即起即落无状态；中断不产生半态（账本为静态文件）。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

   扫描锚 authoritySpecDir 的 changes/archive，各仓各自扫各自豁免；无串台面。flow-state.yaml 判别为目录内事实，无跨目录推断。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：epoch 豁免面过宽——若有人在 2026-10-07 前的 thin 归档里真留了未完成工作，本检查不再点名（归档完成门在 flow done 六子步当时已判，事后无法区分占位稿与漏勾）。接受理由：v3 前勾选不是完成契约（无机械区分依据），误报 36 份 vs 漏检理论值的代价权衡明确；新账（epoch 后）照常严查。次风险：批量入账 42 条若混入真欠账——逐条按五类理由归类（每类有形态证据：quick 通道产物有 decisions+delta 无 flow-state、spike 仅 proposal.md 等），且账本条目带 exempted_at 可追溯，stale 条目 doctor 会提示清理。放弃的方案：簿记补勾 36 份 pre-epoch thin（伪造完成态，违 2026-09-17 裁决）；全部走账本不修检查（172 份系统性误报逐条入账是拿账本抹平检查缺陷，且未来 thin 归档持续新增误报）；只修检查不入账（42 份真历史形态继续亮红，advisory 狼来了）。
