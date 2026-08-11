---
plan_level: full
author: qinyi
created_at: 2026-08-12T01:10:00+08:00
---

# 实现计划（Plan）— SillySpec 跨仓 task 支持（MultiRepoContext）

## Spike 前置验证

**无 Spike**。核心技术不确定性（跨仓 apply no-op 可行性 / base+head 双锡点与 verifyReviewGitEvidence 兼容性 / buildWavePrompt per-task workdir 改造范围）已由 Design Grill 三轮独立审查源码实证消除（applyWorktree:223-535 耦合度 / verifyReviewGitEvidence:495-567 兼容 / execute.js:466/571 per-task 是 prompt 内容改造非调度重写）。

## Wave 1（基础设施，无依赖，并行）

- [x] task-01: MultiRepoContext 核心模块（覆盖：FR-03, D-005, D-006, D-007, D-013）
- [x] task-02: local.yaml repos: 段 schema + parseRepo + parseBaseCommit/parseHeadCommit task 卡片解析（覆盖：FR-01, FR-02, D-001, D-010）
- [x] task-03: plan-postcheck 约束③ pathOwners (repo,path) 聚合 + design §6 分段（覆盖：FR-09, D-008, D-014）

## Wave 2（依赖 Wave 1 的 ctx + parseRepo，4 模块并行）

- [x] task-04: task-review 多仓化 A1/A2/A7 + base/head 双锡点接入（覆盖：FR-06, D-006, D-010）
- [x] task-05: worktree-apply 跨仓 no-op A3/A4/A5（覆盖：FR-07, D-002, D-009）
- [x] task-06: verify-postcheck A6 per-repo cwd 跑跨仓 npm test（覆盖：FR-08, D-004）
- [x] task-07: gates reviewGitDir 按 ctx.resolve('main') 兜底 + Task Review Gate per-task 按 repo 切 + runVerifyTestCheck 透传 ctx（覆盖：FR-06, FR-08, D-007, D-013）

## Wave 3（依赖 Wave 2，execute 调度改造）

- [x] task-08: buildWavePrompt per-task workdir 切换 + base/head 锡点落盘时机（覆盖：FR-10, D-010, D-012）
- [x] task-09: execute 启动入口构造 MultiRepoContext + 透传调用链（shared.js/index.js）（覆盖：FR-03, D-013）

## Wave 4（收尾，依赖 Wave 3）

- [x] task-10: 文档同步 file-lifecycle.md + docs/prompt/execute.md 重跑 _extract.mjs + .claude/skills/sillyspec-execute + sillyspec-plan SKILL.md（覆盖：NFR-04）
- [x] task-11: 跨仓端到端验证（multi-agent-platform↔sillyspec 真实场景，非自指 dogfood D-011）+ 单仓零回归验证（覆盖：AC-01~06, D-011, GOAL-2, GOAL-5）
- [x] task-12: npm test 全量 + lint 全量验收（覆盖：AC-04, NFR-02）

## 任务总表

| 编号 | 任务 | Wave | 优先级 | 依赖 | 覆盖 FR/D | 说明 |
|---|---|---|---|---|---|---|
| task-01 | MultiRepoContext 核心模块 | W1 | P0 | — | FR-03, D-005, D-006, D-007, D-013 | src/run/multi-repo-context.js，Map<repoKey,RepoEntry>，主仓读 meta/跨仓实时 git + in-place-fallback 兜底 + 未注册/git不可用 fail-closed |
| task-02 | parseRepo + local.yaml repos: + parseBaseCommit/parseHeadCommit | W1 | P0 | — | FR-01, FR-02, D-001, D-010 | plan-postcheck.js 加 frontmatter 解析（repo:/base_commit:/head_commit:）+ local.yaml repos: 段读取 |
| task-03 | plan-postcheck pathOwners (repo,path) + design §6 分段 | W1 | P0 | — | FR-09, D-008, D-014 | pathOwners Map<repo+\|+path> + validateDesignFileCoverage 识别 `## <repo> 仓变更` 段头 |
| task-04 | task-review 多仓化 A1/A2/A7 + 双锡点 | W2 | P0 | task-01,02 | FR-06, D-006, D-010 | verifyReviewGitEvidence 加 repo 切 gitDir + draft base/head 读锡点 + validateReviewSchema 加 repo 字段（schemaVersion 1→2 兼容） |
| task-05 | worktree-apply 跨仓 no-op A3/A4/A5 | W2 | P0 | task-01,02 | FR-07, D-002, D-009 | applyWorktree 按 ctx 区分主仓/跨仓；主仓原 A5，跨仓 no-op（校验 head + 跳过 cleanup）+ resolveApplyAllowSet Map<repo,Set> |
| task-06 | verify-postcheck A6 per-repo cwd | W2 | P0 | task-01,02 | FR-08, D-004 | runVerifyTestCheck per-repo cwd（跨仓仓 full npm test，不参与 module 子集）+ resolveVerifyChangedFiles 走 ctx |
| task-07 | gates reviewGitDir + Task Review Gate per-repo + 透传 ctx | W2 | P0 | task-01,02 | FR-06, FR-08, D-007, D-013 | reviewGitDir=ctx.resolve('main').gitDir 兜底；Task Review Gate 循环按 review.repo 切 gitDir；runVerifyTestCheck 调用点透传 ctx |
| task-08 | buildWavePrompt per-task workdir + 锡点落盘 | W3 | P0 | task-04,05,07 | FR-10, D-010, D-012 | execute.js worktreeSection 单值改多值表；per-task Task 调用各传 workdir；跨仓 task 派发前落 base_commit/回收前落 head_commit |
| task-09 | execute 入口构造 ctx + 透传调用链 | W3 | P0 | task-01,08 | FR-03, D-013 | shared.js/index.js execute 启动构造 MultiRepoContext 贯穿 apply/verify |
| task-10 | 文档同步 | W4 | P1 | task-09 | NFR-04 | file-lifecycle.md + docs/prompt/execute.md（_extract.mjs）+ execute/plan SKILL.md |
| task-11 | 跨仓端到端验证 + 单仓零回归 | W4 | P0 | task-09,10 | AC-01~06, D-011, GOAL-2/5 | multi-agent-platform 建测试 change 验证跨仓全链路；本仓改动单仓 task 零回归 |
| task-12 | npm test + lint 全量 | W4 | P0 | task-11 | AC-04, NFR-02 | 全量测试 + lint 验收 |

## 关键路径

task-01 → task-04 → task-08 → task-09 → task-11 → task-12

（MultiRepoContext 核心必须先于 task-review 接入；task-review 多仓化先于 buildWavePrompt 锡点落盘；execute 入口构造先于端到端验证。W2 四模块虽并行但都依赖 W1 的 ctx 接口冻结。）

## 全局验收标准

- [ ] 所有单元测试通过（multi-repo-context / cross-repo-task-review / cross-repo-apply / cross-repo-verify 四个新测试文件全绿）
- [ ] 集成敏感 task（apply no-op / verify per-repo cwd / buildWavePrompt per-task workdir）加集成冒烟验收——组件单测全绿 ≠ 跨仓全链路正确（task-11 端到端覆盖）
- [ ] （brownfield）单仓 change 零行为变化：所有 task 无 repo: 时 MultiRepoContext 退化为单值 map，7 点走原路径（AC-04，task-12 全量 npm test 不回归佐证）
- [ ] 跨仓仓无 .sillyspec/ 侵入（D-003 / NG-1）：review.json 全主仓存
- [ ] 约束② fail-closed：未注册 repo / 跨仓 git 不可用阻断 execute（AC-05）
- [ ] 约束① base+head 双锡点：同 Wave 多 task 改同跨仓仓 diff 不跨 task 漂移（AC-01）

## 覆盖矩阵

| ID | 覆盖任务 | 验收证据 |
|---|---|---|
| D-001@v1 | task-02 | local.yaml repos: 段读取，AC-05 未注册 fail-closed |
| D-002@v1 | task-05 | 跨仓改动落跨仓主干（机制 D-009 no-op），AC-02 |
| D-003@v1 | task-04,05 | review.json 主仓统一存，跨仓仓无 .sillyspec/ |
| D-004@v1 | task-06 | verify 跨仓仓 per-repo cwd 跑 npm test，AC-03 |
| D-005@v1 | task-01 | MultiRepoContext 方案 B，7 点 ctx.resolve 替换 |
| D-006@v1 | task-01,04 | 跨仓 head 实时取 + 双锡点，AC-01 |
| D-007@v1 | task-01,07 | 未注册/git 不可用 fail-closed，AC-05 |
| D-008@v1 | task-03 | pathOwners (repo,path) 聚合，AC-06 |
| D-009@v1 | task-05 | 跨仓 apply no-op，AC-02 |
| D-010@v1 | task-02,04,08 | base+head 双锡点（task 卡字段 + CLI 两时机落盘），AC-01 |
| D-011@v1 | task-11 | dogfood 不自指，multi-agent-platform 真实场景，GOAL-5 |
| D-012@v1 | task-08 | buildWavePrompt per-task workdir，同 Wave 混合 |
| D-013@v1 | task-01,07,09 | ctx 构造一次进程级贯穿，4 调用点加 ctx 参数 |
| D-014@v1 | task-03 | design §6 段头 `## <repo> 仓变更` |

| FR | 覆盖任务 | 验收证据 |
|---|---|---|
| FR-01 | task-02 | parseRepo task 卡片 repo: 解析 |
| FR-02 | task-02 | local.yaml repos: 注册表 |
| FR-03 | task-01,09 | MultiRepoContext 构造 + 透传 |
| FR-04 | task-01,07 | fail-closed（约束②） |
| FR-05 | task-01,04 | 跨仓 head 实时取 + 锡点（约束①） |
| FR-06 | task-04,07 | task review 多仓化 A1/A2/A7 |
| FR-07 | task-05 | worktree-apply no-op A3/A4/A5 |
| FR-08 | task-06,07 | verify per-repo cwd A6 |
| FR-09 | task-03 | pathOwners (repo,path) + §6 分段（约束③） |
| FR-10 | task-08 | buildWavePrompt per-task workdir |
| FR-11 | task-11,12 | 单仓零回归 AC-04 |
