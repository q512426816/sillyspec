---
id: task-04
title: 'knowledge-match 扩展 + decisionHits + run/prompt.js brainstorm Step2 注入（消费侧；INDEX 路由行由 task-02 写入）'
title_zh: 'knowledge-match 扩展 + decisionHits + run/prompt.js brainstorm Step2 注入（消费侧；INDEX 路由行由 task-02 写入）'
author: 'qinyi'
created_at: 2026-08-23 13:45:58
priority: P0
depends_on: ['task-02']
blocks: []
requirement_ids: [FR-05]
decision_ids: [D-006@v1]
allowed_paths:
  - src/knowledge-match.js
  - src/run/prompt.js
  - src/stages/brainstorm.js
expects_from:
  task-02:
    - contract: decisions_entry
      needs: [id, status, reject_reason, revisit_when]
goal: >
  打通决策防复潮消费侧——knowledge-match 扫描 knowledge/decisions/ 并新增 decisionHits，
  run/prompt.js 在 brainstorm Step2 注入 rejected 命中，brainstorm.js Step2 补路由说明段。
implementation:
  - src/knowledge-match.js parseKnowledgeIndex 扫描范围扩到 knowledge/decisions/——INDEX.md 路由行由 task-02 的 decision-distill 幂等写入，本卡只消费不写
  - matchKnowledge 在既有 shape（matched/entries/report/json）上新增 decisionHits 字段——条目含 file/id/title/status/reason/revisitWhen，rejected 优先排序；不引入新顶层 hits 字段
  - src/run/prompt.js 复用 SCAN_STALENESS 先例（src/run/prompt.js:414 brainstorm 分支占位符替换，全降级不抛）——decisionHits 命中 rejected 时注入否决理由与复潮条件，无命中替换为空串不留残留占位符
  - 注入结果同步落 runtime JSON——与既有 KNOWLEDGE_HIT_REPORT 的 json 落盘口径一致
  - src/stages/brainstorm.js Step2「查询知识库」段（src/stages/brainstorm.js:48）补 decisions 库路由说明——命中决策条目时读 knowledge/decisions/<域>.md，rejected 条目须对照复潮条件评估后才可提新方案
acceptance:
  - matchKnowledge 返回的 matched/entries/report/json 既有字段结构与语义不变，仅新增 decisionHits；knowledge/decisions/ 不存在或无命中时行为与现状一致
  - brainstorm Step2 prompt 含 decisions 路由说明段；注入链路异常降级为单行说明，不阻断 prompt 渲染
  - execute 阶段既有 KNOWLEDGE_HIT_REPORT 注入路径不受影响（同 shape 增字段）
verify:
  - node --check src/knowledge-match.js 与 node --check src/run/prompt.js 与 node --check src/stages/brainstorm.js
  - 行为级回归待 task-06 落地后跑 node --test test/decisions-lifecycle.test.mjs（decisionHits 用例）
constraints:
  - 既有 shape 只增不改——matched/entries/report/json 四字段不动，不重构 matchKnowledge 返回结构
  - INDEX.md 路由行写入责任在 task-02（decision-distill 幂等维护），本卡不写 INDEX
  - 注入为 advisory 展示——不改变 brainstorm 步骤流程与阶段通过判定
---
