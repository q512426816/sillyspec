---
id: task-09
title: regression-test-merge-base-anchor
title_zh: 回归测试 merge-base 锚点与冲突列表修复
author: qinyi
created_at: 2026-08-19 11:50:00
priority: P0
depends_on: [task-07, task-08]
blocks: []
requirement_ids: [FR-07]
decision_ids: []
allowed_paths:
  - test/worktree-apply-merge-base.test.mjs
provides: {}
expects_from: {}
goal: >
  验证 merge-base 锚点在占位文件场景下干净落盘，冲突列表不再静默
implementation:
  - 新增 test/worktree-apply-merge-base.test.mjs
  - 构造 baseline checkpoint 含占位文件场景
  - 验证默认 merge-base 锚点下 patch 干净应用
  - 验证 --base baseline 回退旧行为
  - 构造 apply 冲突场景，验证错误信息含文件列表
  - 验证双源皆空时打印原始 stderr 尾部
acceptance:
  - merge-base 锚点占位文件场景测试通过
  - --base baseline 回退行为测试通过
  - 冲突列表含文件或 stderr 测试通过
  - 既有测试零回归
verify:
  - cd C:/Users/qinyi/IdeaProjects/sillyspec && npm test
constraints:
  - 测试需模拟真实 worktree 分支与 meta 结构
  - 冲突场景构造需重现 stderr 原始错误格式
  - 测试隔离，不影响全局 git 状态
related_tests: []

---
