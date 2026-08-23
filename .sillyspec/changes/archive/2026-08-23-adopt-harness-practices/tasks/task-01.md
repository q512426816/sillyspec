---
id: task-01
title: extend-brainstorm-step6-decisions-template
title_zh: decisions.md 契约扩展（Step6 模板四可选字段）
author: qinyi
created_at: 2026-08-23 21:42:35
priority: P0
depends_on: []
blocks: [task-02, task-06]
requirement_ids: [FR-01]
decision_ids: [D-007@v1]
allowed_paths:
  - src/stages/brainstorm.js
goal: >
  在 brainstorm Step6「写决策」模板（brainstorm.js 约 336-341 行记录约定）新增四个可选字段
  （锚点/模块域/否决理由/复潮条件），让决策产生时即写入提炼所需上下文，保住纯函数提炼定位（D-007@v1）。
implementation:
  - 定位 src/stages/brainstorm.js Step6 操作第 3 点「写入 decisions.md」的记录约定清单（约 336-341 行）
  - 在既有九字段约定后追加四字段说明——锚点为决策落点主文件（src 路径+行号或符号，status=confirmed 时必填）
  - 模块域取 _module-map.yaml 模块 ID（可多个逗号分隔）；否决理由为一句话、复潮条件为可重新考虑的前提（均 status=rejected 时必填）
  - 措辞明确按需填写不强制全填、四字段全可选；不改 Step6 其余文案与流程逻辑
acceptance:
  - Step6 模板含 锚点/模块域/否决理由/复潮条件 四字段说明及各自必填条件（FR-01）
  - 既有九字段记录约定原文不变；四字段为可选表述，旧格式 decisions.md 不受影响
verify:
  - node --check src/stages/brainstorm.js
  - grep -n "复潮条件" src/stages/brainstorm.js
constraints:
  - 只改 src/stages/brainstorm.js 的 Step6 模板文案，不动解析与流程逻辑
  - brownfield——四字段全可选，旧格式 decisions.md（本次之前已产生）不要求回填
  - prompt 镜像同步归 task-14，回归测试归 task-06，本卡均不做
---
