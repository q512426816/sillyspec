---
author: flow-machine-draft
created_at: 2026-10-12T14:06:41.953Z
---
# 设计记录（Design Record）— 2026-10-12-fire-dogfood-retrospective

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

纯文档变更：把 fire-equipment dogfood 会话的四子代理量化取证（调用量/重试密度/评审独立性/approve 治理）与已归档的处置对照（本批四变更）落盘为带日期复盘快照——对齐仓内 R16 系列（docs/analysis/R16-*.md）体例与 docs-check skip 先例（带日期快照的行号冻结不动，源码演进不追锚）。选落盘而非仅留在会话：校准基线（flow done 成功率 35% 等起点数据）需要可引用的稳定锚供后续优化排期对照；且子代理回执随会话失效，报告是唯一持久载体。顺带修复本次源码插入引发的 platform-interface-map.md 行号锚漂移（13 处，doc-ref-check 复绿的必要条件）。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- 新增 docs/analysis/fire-equipment-dogfood-复盘-2026-10-12.md（纯文档，无代码接口）。
- docs/sillyspec/platform-interface-map.md 行号锚重锚 13 处（本批四变更在 index.js/run/shared.js 插行所致漂移；关键词锚全部指向符号现位，语义零变化）。
- local.yaml（gitignored 机器级）docs-check.skip 追加该报告路径；另追加 review_probes 段（另一独立事项的自配 dogfood，随本 local.yaml 编辑一并生效，非本变更交付面——冻结面不含 gitignored 文件）。
- 代码接口：无（零 src/test 触及）。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| A | docs/analysis/fire-equipment-dogfood-复盘-2026-10-12.md | 复盘快照五节 |
| M | docs/sillyspec/platform-interface-map.md | 13 处行号锚重锚（doc-ref-check 复绿） |

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
   纯静态文档——快照冻结于取证时点（2026-10-12），后续源码演进不追锚（skip 登记），无时序面。n/a。
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
   文档单写者；local.yaml 编辑在 withFileLock 语义之外但为单人机器配置（gitignored 无并发共享面）。n/a。
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
   文件落盘即完整；无状态机。重锚的 13 处锚经 doc-ref-check 全绿实证。
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
   报告只读本仓 commit 锚与 full.json 取证；无跨仓写入面。报告内提及 multi-agent-platform 的三课题仅作归属指引，不在该仓落任何文件。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：快照数据的时效性——仓内后续修复会让对照表中的「待立项」项过时。缓解：文末标注冻结时点；遗留项有明确归属（本仓待立项 vs 平台仓），过时是快照本性（R16 同款，已接受）。

试过但放弃：①把报告做成活文档（不 skip、持续追锚）——行号锚维护成本高且复盘数据本身是时点快照，与活文档语义矛盾；②数据全部内联进 knowledge 蒸馏——distill 面适合结论不适合校准数据表，报告 + 文末回溯指引更合适。
