---
id: task-02
title: completeStep execute 验证硬门 + isCurrentWaveAllNoDepsVerify
author: qinyi
created_at: 2026-06-28 17:09:17
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-04, FR-06]
decision_ids: [D-001@v1, D-003@v1, D-006@v2]
allowed_paths:
  - src/run.js
goal: >
  在 completeStep execute 分支标记 done 前加代码级硬门：depsStatus 不达标且非 wave 级 opt-out 时置 blocked + process.exit(1)，杜绝无依赖声称 verified。
implementation:
  - 在 src/run.js completeStep（~2149）execute 分支、标记 steps[currentIdx].status=completed（~2209）之前插入门检查
  - 新增辅助 isCurrentWaveAllNoDepsVerify(step, changeDir)：从 step 名解析 wave 序号 → 读 plan.md 该 wave 的 task 列表 → 读各 tasks/task-NN.md frontmatter，全部 no_deps_verify===true 才返回 true（复用 execute 已有的 frontmatter 解析范式，如 allowed_paths）
  - 门逻辑：const meta = new WorktreeManager({cwd}).getMeta(changeName)；okStatus=['linked','installed','n/a']；非 wave 步骤 waveAllOptOut=false
  - 不达标：steps[currentIdx].status='blocked'；console.error 拒绝原因 + 修复指引（sillyspec worktree doctor --fix 或手动 install）；process.exit(1)
  - 仅 stageName==='execute' 触发（D-003，verify 不引入）
acceptance:
  - depsStatus=failed/missing/stale/undefined 时 execute --done 被 process.exit(1) 拒绝，step 置 blocked
  - depsStatus ∈ {linked,installed,n/a} 时放行
  - wave 内全部 task no_deps_verify:true 时该 wave 跳门
  - 非 wave 步骤（确认执行范围/acceptance/suffix）恒过门判定（不 opt-out）
  - verify 阶段不受影响
verify:
  - node --check src/run.js
  - npm test（既有 28 测试不回归）
constraints:
  - 复用 progress.js:41 已有 blocked status，不新增状态机（避撞 waiting-state-machine）
  - 门用 process.exit(1) 硬拒，与 requiresWait 同范式，不可降级为 warn
  - 读 meta 用 getMeta 新鲜读取，不缓存
