---
id: task-02
title: add-decision-distill-pure-functions
title_zh: 新增 src/decision-distill.js 决策提炼纯函数
author: qinyi
created_at: 2026-08-23 21:42:35
priority: P0
depends_on: ['task-01']
blocks: [task-03, task-04, task-05, task-06]
requirement_ids: [FR-02, FR-03, FR-04]
decision_ids: [D-007@v1]
allowed_paths:
  - src/decision-distill.js
  - .sillyspec/knowledge/INDEX.md
provides:
  - contract: decisions_entry
    fields: [id, status, anchor, domains, last_confirmed, rationale, reject_reason, revisit_when]
goal: >
  新建决策提炼纯函数模块 parseDecisions/distillIntoKnowledge，把 decisions.md 中有实现影响的决策
  幂等提炼进 knowledge/decisions/<模块域>.md 并维护 INDEX.md 路由行，为 task-03/04/05 提供地基。
implementation:
  - parseDecisions(changeDir)——解析 D-xxx@vN 条目（字段全可选容旧格式）；入选规则按 FR-02——五类 type（architecture/compatibility/boundary/definition/process）且 confirmed/accepted 入选 implemented，任意 type 的 rejected 入选 rejected，type=scope 不入选
  - distillIntoKnowledge(changeDir, knowledgeRoot, headHash)——按域写入 FR-04 契约条目（implemented 含 状态/锚点/最近确认 headHash/理由；rejected 含 否决理由/复潮条件）
  - 幂等——同 ID 同版本重跑不重复追加；@vN+1 整段替换旧版并注 supersedes；rejected 缺否决理由或复潮条件 → needsWait 返回缺失描述
  - 域三级兜底——模块域字段优先，缺失按 impacts 与 _module-map.yaml paths 前缀匹配，仍未中归 unmapped；无 decisions.md 或无入选条目 → skipped 零输出
  - 幂等维护 .sillyspec/knowledge/INDEX.md 的 decisions 路由行（提炼时增删，不动其他类别行）
acceptance:
  - 入选规则行为符合 FR-02——scope 不入选、任意 type 的 rejected 留痕、confirmed/accepted 仅限五类 type
  - 同 ID 同版本重跑输出幂等；@vN+1 整段替换旧段并含 supersedes 标注
  - 域三级兜底落 <模块域>.md（兜底失败归 unmapped）；rejected 缺字段时 needsWait 非空；无 decisions.md 时 skipped 零输出
  - 条目含 provides decisions_entry 八字段契约（FR-04）；INDEX.md decisions 路由行随提炼幂等增删
verify:
  - node --check src/decision-distill.js
  - node -e "import('./src/decision-distill.js').then(m => console.log(Object.keys(m).join(',')))"
constraints:
  - 纯函数模块——不接 CLI、不改 archive 步骤（task-03 负责）、不改 knowledge-match 与 run/prompt（task-04 负责）
  - brownfield——四字段全可选容旧格式 decisions.md；缺锚点 implemented 条目提炼为「锚点：未记录」不阻断
  - brownfield——无 decisions.md 或无入选条目零输出跳过；knowledge/decisions/ 不存在时自动创建
  - 回归测试归 task-06，本卡不新增测试文件
---
