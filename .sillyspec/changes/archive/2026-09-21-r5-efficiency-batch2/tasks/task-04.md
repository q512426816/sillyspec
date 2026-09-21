---
id: task-04
title: 'M4 execution_mode 通道——plan frontmatter 键+execute main 直写渲染分支（含 test/execution-mode-render.test.mjs）'
title_zh: 'M4 execution_mode 直写通道（缺省 dispatch 零回归+main 渲染分支）'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-21 17:25:00
priority: P0
depends_on: ['task-03']
blocks: []
requirement_ids: [FR-04]
decision_ids: [D-004@v1]
allowed_paths:
  - src/stages/plan.js
  - src/stages/execute.js
  - test/execution-mode-render.test.mjs
target_files:
  - src/stages/plan.js
  - src/stages/execute.js
  - NEW:test/execution-mode-render.test.mjs
goal: >
  清晰输入任务的主代理直写通道（对撞 A 组 7 分钟 vs 70 分钟实证；GSD 无此模式系本仓结论）
implementation:
  - plan.js frontmatter 模板加 execution_mode 注释键（main 或 dispatch，缺省 dispatch）
  - execute.js 读 plan.md frontmatter execution_mode：main 时 Wave 步渲染直写指引（逐任务：读卡→worktree 内实现→每任务 commit→锚点→review write→下一任务），派发段/子代理工作目录强制段/并发帽段不渲染，M3 推荐分组段同步抑制
  - dispatch（含键缺失/值非法回退）：现行为逐字节不变
acceptance:
  - 缺省（无键/非法回退）dispatch 渲染与现行为逐字节一致（零回归钉）
  - main 渲染含直写指引段且不含派发段/工作目录段/并发帽段/分组段
  - 两模式下锚点写入与 review write 指引一致存在
verify:
  - node --test test/execution-mode-render.test.mjs
  - npm test
constraints:
  - worktree 隔离/写入守卫/review.json/verify 门禁全保留（只换宿主不换防线）
  - 状态机步数不动
---
