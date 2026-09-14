---
author: qinyi
created_at: 2026-09-14 11:33:28
generated_by: sillyspec-fourpiece-init
change: 2026-09-14-knowledge-loop-close
---

# 决策记录（Decisions）

<!-- 增量落盘：每解决一个有实现影响的问题当场追加一条（格式见 brainstorm Step 3 模板）；幂等按 D-xxx@vN 判重 -->

## D-001@v1: 归类闭环选型——agent 归类 + 人抽审（非全自动、非拆分）
- type: architecture
- priority: P0
- status: accepted
- source: user
- question: 知识归类吞吐瓶颈（uncategorized 积压 13 条、人闸逐条确认卡死）怎么解——全自动归类无确认 / agent 归类+人后置抽审 / 仅做消费端延后归类门禁？
- answer: 选 agent 归类+人抽审：quick --done 收尾时 CLI 拿刚落盘条目根因字段跑 matchKnowledge 渲染归类提议；新子命令 knowledge classify 一次确认后落位（追加目标知识文件 + 更新 INDEX + 从 uncategorized 删除，均可逆）；人闸从逐条确认后置为 archive/doctor 抽审位；配 knowledge-baseline 棘轮（仿 docs-check-baseline 范式：uncategorized 条数 ≤ 基线放行、降则自动收紧）软警告起步。方案 B（全自动）被否——归类错误无审计面、违背"不信口头"主轴；方案 C（拆分延后）被否——归类与注入共享 matchKnowledge 基础设施，拆开则学习闭环两端各自不完整。
- normalized_requirement: uncategorized 条目的归类动作发生在 --done/archive 时刻且无需逐条人确认；每次归类留审计痕迹且可 revert；uncategorized 条数受棘轮基线约束
- impacts: [FR-01, FR-02, FR-03]
- evidence: 本会话 2026-09-14「怎么解决呢」方案 1 + 用户批准（「干」）；b89180f 归档蒸馏 63 行实证（归档侧已机械化，瓶颈在 quick 侧人闸）
- 模块域：change-management, core-engine

## D-002@v1: 消费端从「建议读」升级为「机械注入 + 遥测」，不做消费硬门禁
- type: architecture
- priority: P0
- status: accepted
- source: user
- question: 知识消费不可知（quick.js:28/execute.js:314 仅 prompt 建议自行 cat INDEX，读没读无从验证）怎么落成确定性消费？
- answer: CLI 在 prompt 组装时用任务描述跑 matchKnowledge，命中文件内容直接注入 prompt（top-3 限额，仿「📦 模块上下文」注入先例）+ 每次命中落 .runtime/knowledge-hits.jsonl（仿既有 decision-hits.json 遥测先例）+ 新子命令 knowledge stats 输出命中矩阵（从未命中的文件列死重清单）。明确不做「必须消费」硬门禁——先遥测后优化，数据说话再决定是否升级门禁。
- normalized_requirement: execute Wave prompt 与 quick step1 prompt 含 CLI 机械注入的命中知识段（≤3 文件）；每次注入在 .runtime 留命中记录；命中矩阵可查
- impacts: [FR-04, FR-05]
- evidence: 本会话 2026-09-14 方案 2 + 用户批准（「干」）；.runtime/decision-hits.json 既有遥测先例；knowledge-match.js parseKnowledgeIndex/matchKnowledge 现成
- 模块域：change-management, core-engine
