---
id: task-01
title: MultiRepoContext 核心模块（覆盖：FR-03, D-005, D-006, D-007, D-013）
title_zh: MultiRepoContext 运行时多仓执行上下文核心模块
author: qinyi
created_at: 2026-08-12 01:14:51
priority: P0
depends_on: []
blocks: [task-04, task-05, task-06, task-07, task-09]
requirement_ids: [FR-03]
decision_ids: [D-005, D-006, D-007, D-013]
allowed_paths:
  - src/run/multi-repo-context.js
provides:
  - contract: RepoEntry
    fields: [repoKey, gitDir, worktreePath, projectRoot, isMain, resolveHead, resolveBase]
  - contract: MultiRepoContext
    fields: [resolve, repos, hasCrossRepo]
expects_from:
  task-02:
    - contract: DeclaredRepos
      needs: [repoKey]
goal: >
  新增 MultiRepoContext 模块，execute 启动时建 Map<repoKey,RepoEntry> 收口 7 个单仓假设点，主仓读 meta/跨仓实时 git，未注册或 git 不可用 fail-closed。
implementation:
  - 新建 src/run/multi-repo-context.js，实现 MultiRepoContext 类与 RepoEntry
  - 主仓 entry isMain=true 读 wm.getMeta 的 baseHash+worktreePath，in-place-fallback 时 worktreePath 兜底 cwd
  - 跨仓 entry isMain=false 实时 git -C <path> rev-parse HEAD 验证可达，resolveHead 实时取不缓存，resolveBase(taskBaseCommit) 返 taskBaseCommit
  - 约束② fail-closed：declaredRepos 有不在 repoRegistry 的 key 或跨仓 git rev-parse 失败 → 抛错列已注册 repo 阻断
  - 进程级缓存（仿 worktree.js _mainRepoRootByCwd），resolve/repos/hasCrossRepo 接口
acceptance:
  - 单仓 change（无 repo:）MultiRepoContext 退化为 {main:{}} 单值 map，hasCrossRepo 返 false
  - 跨仓仓注册表查表命中，resolve(repo) 返正确 gitDir/projectRoot
  - 未注册 repo（local.yaml repos: 无该键）构造抛错并列出已注册 repo
  - 跨仓仓 git rev-parse 失败（路径不存在/非 git 仓）抛错阻断，不降级
  - in-place-fallback 模式主仓 worktreePath 兜底为 cwd
verify:
  - node --test test/multi-repo-context.test.mjs
  - npm test
constraints:
  - 跨仓 base/head 不读 meta.json（跨仓仓无 .sillyspec/，约束①）
  - 跨仓 git 不可用是配置错误 fail-closed，不沿用主仓 verifyReviewGitEvidence unavailable 降级（约束②）
  - 不缓存跨仓仓 HEAD（task 推进后过期，resolveHead 每次实时取）
  - 单仓场景零行为变化（GOAL-2 铁律）
---
