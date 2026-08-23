---
id: task-07
title: 'quicklog.js 根因块嵌套四子字段解析（顶层边界不动）'
title_zh: 'quicklog.js 根因块嵌套四子字段解析（顶层边界不动）'
author: 'qinyi'
created_at: 2026-08-23 13:48:23
priority: P1
depends_on: []
blocks: []
requirement_ids: [FR-07]
decision_ids: [D-004@v1]
allowed_paths:
  - src/quicklog.js
goal: >
  让 QUICKLOG 条目的根因块支持嵌套四子字段（现象/根因/护栏/证据）列表行形态，
  作为 D-004@v1 轻量 postmortem 的结构化载体（设计 W2 第 1 点）；顶层四字段
  （需求/根因/方案/结果）的严格标签边界解析保持不变，旧条目纯文本根因完全兼容。
implementation:
  - 审计两条解析路径对嵌套列表行的透传——条目解析的 labelRe 白名单与 lastLabel 续行挂载、--done 单行压缩归一的 splitSingleLineFields 按序扫描切段
  - 确认嵌套子字段行（短横线空格前缀 + 现象/根因/护栏/证据标签）不匹配顶层 labelRe、不被边界扫描误切，完整落入根因块正文续行；把 Grill C-15 的「恰好成立」转为代码内显式注释声明
  - 在 quicklog.js 相关注释固化支持形态——子字段是根因块正文内的列表行，不是新顶层标签；若审计发现任一路径截断或误切嵌套行（如单行压缩归一误当字段边界），做最小修复
  - 修复不得触碰 isFieldBoundary/findBoundaryLabel/scanFields 的边界判定规则本身
  - 旧条目（根因块无嵌套列表行的纯文本）解析与渲染路径零改动
acceptance:
  - 根因块含四子字段嵌套列表行的条目解析后各子字段行完整保留（含换行），无截断无错位
  - 顶层四字段严格边界扫描、宽松回退与单行压缩归一行为与改动前一致（R-03 锁定）
  - 旧条目纯文本根因解析行为不变（brownfield 兼容）
verify:
  - node --check src/quicklog.js
  - 行为回归由 task-10 的 test/quicklog-postmortem-fields.test.mjs 锁定（本 task 不写测试）
constraints:
  - 子字段仅限列表行形态（短横线加空格前缀），不得引入新顶层标签
  - 顶层四字段边界与单行压缩兼容逻辑不变（三个边界函数的判定规则不改）
  - 不在本 task 写测试（统一交 task-10）；不改 quick.js 文案（task-08 范围）
---
