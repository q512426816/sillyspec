---
author: flow-machine-draft
created_at: 2026-10-15T08:23:22.119Z
---
# 设计记录（Design Record）— 2026-10-15-decision-redomain

## 做法概述

用户指令「迁真域」的决策面：模块路径 glob 匹配失效（2026-10-15-module-path-glob-match 修复止增量）导致平台仓 decisions/unmapped.md 积 442 条历史决策；redomain.js（2026-09-27-redomain）只管 fr/ 面，决策面缺机器通道。本变更新增 src/decision-redomain.js 孪生实现，复用 decision-distill 参数化底座（splitKnowledgeSections 默认段正则即决策格式 / joinKnowledgeFile / syncIndexRoutingLines 默认 decisions 面）：plan/apply 双态 + CLI `tests --redomain --decisions` 切换。段 lines 整体搬运（段头/字段行/「原编号」/「最近确认」机器行零改写）；id=number@version 迁域不换号；**冲突双键 id+变更**（跨变更同号合法共存形态不误判；同 id 同变更目标域已有或批内已选 → 跳过报告留源不覆盖不丢失）；全迁后源空壳删除（防空壳污染域列表）+ INDEX 失效行自动清理（syncIndexRoutingLines 既有语义）。

消费侧实证（平台仓真实库，另一变更）：442 段全量迁移——先数据修复三类脏段（1 粘连段补标题分拆、3 重复段去重、4 行无主残迹剥离——归档真相源核验后判定），270 批 by-change + 3 批 anchor 迁出 436 条（残留 0：原 6 条无变更条目按主题人工判域 daemon 迁出），unmapped.md 空壳删除、validate ok、digest 伪域 0。

## 接口契约

- src/decision-redomain.js 新增导出：planDecisionRedomain({knowledgeRoot, from, to, anchors, byChange}) → {entries, targetExists, sourceWillDelete}；redomainDecisionEntries(同参) → {moved, skippedConflicts, sourceDeleted, targetCreated, indexLineAdded}。
- src/index.js `tests --redomain` 增 `--decisions` flag（同 --from/--to/--anchor/--by-change/--write 族；usage 文案同步）。
- 行为面：仅新增能力，fr 面既有路径零变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：不适用——文件手术串行执行，批间无时序依赖（每批独立读写）。
2. 并发写：writeAtomicSync 原子写；同仓他会话并行改知识库的竞态属既有面（收口对账以落盘为准）。
3. 切换/生命周期：幂等（重跑源空壳已删即拒）；中断重跑安全（已迁段不在源，批次自然收敛）。
4. 作用域：decisions 域文件本仓自治；图节点 id（decision:<file>#<id>@change）随 file 变化是预期（引用形态「变更名#D-xxx@vN」不含 file，跨变更引用不断链；平台 spec_path 深链随重建刷新）。

## 风险与死路

最大风险：决策段的「变更」行多源歧义（段内多变更行/无变更行）——parse 侧 last-wins 与 sectionMeta first-wins 曾对坏段判定分歧（gov-action 粘连段实证：批次表认 last、迁移过滤认 first → 无命中拒）——处置：迁移前数据修复坏段（补标题分拆），过滤器与批次生产同源化（first-wins 单一口径）。次风险：无变更行条目（6 条深链旧条目）判定靠主题人工——留痕裁决。放弃方案：①复用 redomain.js 加参数（段格式/冲突键/路由形态三处语义差异，硬塞参数化比孪生实现更易漂移）；②不删空壳保留 unmapped.md（空壳域污染域列表——fr 面既有防线语义，同款处置）；③批量重蒸馏迁移（源 decisions.md 已归档改不动，重放会覆盖 ID 体系）。
