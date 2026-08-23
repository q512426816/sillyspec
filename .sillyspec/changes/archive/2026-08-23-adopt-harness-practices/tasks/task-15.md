---
id: task-15
title: 'dogfood 验证（本变更归档走 decision-distill，按入选规则预期落库 5 条）+ 历史决策种子回填'
title_zh: 'dogfood 验证（本变更归档走 decision-distill，按入选规则预期落库 5 条）+ 历史决策种子回填'
author: 'qinyi'
created_at: 2026-08-23 13:46:07
priority: P1
depends_on: ['task-03', 'task-06']
blocks: []
requirement_ids: [FR-02, FR-03]
decision_ids: [D-007@v1]
allowed_paths:
  - .sillyspec/knowledge/decisions/
  - .sillyspec/knowledge/INDEX.md
goal: >
  本变更是 decision-distill 机制的第一个用户——回填 3-5 条历史高频决策种子破 R-02 冷启动空库，
  并备好归档核验断言——本变更归档时按 FR-02 入选规则预期恰好落库 5 条
  （D-002@v1/D-003@v1/D-005@v2/D-006@v1/D-007@v1，对应 plan AC-6）。
implementation:
  - 从 knowledge/known-issues.md、patterns.md、uncategorized.md 挑 3-5 条高频坑转写为决策条目（候选——worktree junction 依赖供给、CRLF 行尾致 _verify 提取 0 块、hook 不得引未声明外部包、WASM SQLite 无 FTS5、worktree _resolveMainRepoRoot 相对路径坑）
  - 按 W1.1 条目契约写入 .sillyspec/knowledge/decisions/ 下对应模块域文件（新目录，文件头部补 author/created_at）——状态 implemented + 锚点（当前真实 src 路径）+ 最近确认（HEAD hash）+ 理由
  - 在 knowledge/INDEX.md 补种子路由行，格式与 decision-distill（task-02）的幂等写入一致——后续归档重跑不产生重复行
  - 归档核验断言备于本卡 verify 字段——archive 阶段落库后跑一遍核对，不新增文件
acceptance:
  - 种子 3-5 条落库且锚点路径真实存在（docs check 决策规则 advisory 对种子零误报）
  - INDEX.md 路由行命中种子条目，knowledge-match 可路由到 decisions/
  - 核验断言就绪——预期恰好 5 条目标 ID 落库，D-001/D-004/D-008（type=scope）与 D-005@v1（superseded）不入选被显式记录为预期行为
verify:
  - node 一行断言（描述性）——收集 .sillyspec/knowledge/decisions/ 全部条目 ID，归档后应恰好含 5 个目标 ID，且不含 D-001/D-004/D-008 与 D-005@v1
  - sillyspec docs check（决策规则对种子锚点 advisory 不报错）
constraints:
  - 不伪造归档过程——落库 5 条在本变更 archive 阶段由 decision-distill 步骤真实发生（dogfood），本 task 只回填种子 + 备核验断言
  - 「恰好 5 条」是验收点——scope 类与 superseded 不入选是入选规则正确工作的证据，不是失败
  - 种子转写自既有 knowledge 记录，不虚构历史决策；不改 src 与测试，产出仅限 knowledge/
---
