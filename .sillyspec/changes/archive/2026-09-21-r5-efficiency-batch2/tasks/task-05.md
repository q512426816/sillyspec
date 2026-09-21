---
id: task-05
title: '文档收口——镜像机械重生成+模块卡增补+docs-check 重锚'
title_zh: '文档收口（镜像重生成+模块卡增补+重锚）'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-21 17:25:00
priority: P1
depends_on: ['task-01', 'task-02', 'task-03', 'task-04']
blocks: []
requirement_ids: [FR-01, FR-02, FR-03, FR-04]
decision_ids: [D-001@v1, D-002@v2, D-003@v1, D-004@v1]
allowed_paths:
  - docs/prompt/plan.md
  - docs/prompt/execute.md
  - docs/prompt/_extracted.json
  - docs/sillyspec/platform-interface-map.md
  - docs/sillyspec/prompt-control-debt.md
  - test/verify-gate-snapshot.test.mjs
  - .sillyspec/docs/sillyspec/modules/stages.md
  - .sillyspec/docs/sillyspec/modules/stages.changelog.md
  - .sillyspec/docs/sillyspec/modules/runtime.md
  - .sillyspec/docs/sillyspec/modules/runtime.changelog.md
target_files:
  - docs/prompt/plan.md
  - docs/prompt/execute.md
  - docs/prompt/_extracted.json
  - docs/sillyspec/platform-interface-map.md
  - docs/sillyspec/prompt-control-debt.md
  - test/verify-gate-snapshot.test.mjs
  - .sillyspec/docs/sillyspec/modules/stages.md
  - .sillyspec/docs/sillyspec/modules/stages.changelog.md
  - .sillyspec/docs/sillyspec/modules/runtime.md
  - .sillyspec/docs/sillyspec/modules/runtime.changelog.md
goal: >
  W1+W2 源码落地后收口文档面
implementation:
  - node docs/prompt/_extract.mjs 重生成镜像（与 src 逐字一致）
  - stages.md 增补行为行（M1 指纹增量/M3 分组默认化/M4 execution_mode 渲染分支）+ changelog 边车；core-engine 卡视 recommendWaveGroups 落位增补（落 plan-postcheck.js=stages 域，core-engine 视模块映照定）——**落位核实结论：无需增补**（_module-map 映照 src/stages/→stages 卡），target_files 已按 verify 声明修正通道移除该两路径（与 review 结论一致）
  - docs-check 按提示重锚收口
  - D-005@v1 扩边两项：①test/verify-gate-snapshot.test.mjs:146 ③态期望按 D-002@v2 翻转（分叉取 worktree，gate-snapshot-ancestor-trim 同款先例）②docs/sillyspec/platform-interface-map.md:L109 execute.js:1272 锚重定位（task-04 增行推移）
acceptance:
  - 镜像与源逐字一致（_verify.mjs 不低于主仓基线）
  - 模块卡行为行锚点有效
  - docs-check 无新增漂移告警
verify:
  - node docs/prompt/_verify.mjs
  - sillyspec docs check
  - npm test
constraints:
  - 镜像只由 _extract.mjs 机械生成禁手编
  - 模块卡只写主仓
---
