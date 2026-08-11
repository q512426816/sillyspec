---
id: task-03
title: plan-postcheck 约束③ pathOwners (repo,path) 聚合 + design §6 分段（覆盖：FR-09, D-008, D-014）
title_zh: pathOwners 按 repo+path 聚合与 design §6 按仓分段
author: qinyi
created_at: 2026-08-12 01:14:51
priority: P0
depends_on: [task-02]
blocks: []
requirement_ids: [FR-09]
decision_ids: [D-008, D-014]
allowed_paths:
  - src/stages/plan-postcheck.js
goal: >
  pathOwners 冲突检测键改为 repo+path 二元组避免跨仓同名路径误判，validateDesignFileCoverage 支持 design §6 按仓分段对账。
implementation:
  - pathOwners（plan-postcheck.js:284-321）冲突检测键从单 path 改为 repo+竖线+path 二元组
  - validateDesignFileCoverage（:536-583）识别 design §6 段头 ## <repo> 仓变更，按仓分段对账
  - 跨仓 task 的 allowed_paths 豁免主仓 design 清单对账（由其 repo 段覆盖）
acceptance:
  - 跨仓 task 与主仓 task 同名路径不误判同 Wave 冲突
  - design §6 含 ## sillyspec 仓变更 段时跨仓文件被覆盖不报未覆盖
  - 单仓场景（全 repo=main）pathOwners 退化为原 path 聚合零回归
verify:
  - npm test
constraints:
  - 与 task-02 同改 plan-postcheck.js，depends_on task-02 串行避免并行冲突
  - 单仓场景零回归（pathOwners 单仓退化、design §6 无段头退化原对账）
---
