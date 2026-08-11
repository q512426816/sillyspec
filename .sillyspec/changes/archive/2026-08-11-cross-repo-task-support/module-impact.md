---
author: qinyi
created_at: 2026-08-12T03:55:00+08:00
---

# 模块影响分析（Module Impact）— SillySpec 跨仓 task 支持（MultiRepoContext）

## 真实变更文件（git diff baseline 09fa1687..worktree-branch，26 文件）

### 模块影响矩阵

| 模块 | 影响类型 | 相关文件 | 更新内容摘要 | needs_review |
|------|----------|----------|-------------|-------------|
| runtime | 新增 + 接口变更 + 调用关系变更 | src/run/multi-repo-context.js（新增）、src/run/shared.js、src/run/gates.js、src/run/complete.js | 新增 MultiRepoContext 核心模块（Map<repoKey,RepoEntry> + fail-closed）；shared.js 加 getOrCreateMultiRepoContext 进程级工厂 + aggregateDeclaredRepos；gates.js ctx 透传通道（reviewGitDir 兜底 + Task Review Gate per-repo + runVerifyTestCheck 透传）；complete.js 透传 ctx 到 completeStageGates + generateTaskReviewDrafts | false |
| task-review | 接口变更 + 数据结构变更 | src/task-review.js | A1 verifyReviewGitEvidence 按 repo 切 gitDir；A2 generateTaskReviewDrafts 跨仓读 base/head 双锡点；A7 validateReviewSchema 接受 v1+v2 + repo 字段（REVIEW_SCHEMA_VERSIONS_ACCEPTED=[1,2]，常量=1 因与 stage-review 共享）；validateTaskReviews/generateTaskReviewDrafts 加 ctx 参数 | false |
| worktree | 逻辑变更 + 接口变更 | src/worktree-apply.js | A3/A4 applyWorktree 加 ctx 区分主仓/跨仓；跨仓 apply=no-op（validateCrossRepoNoOp 校验 head + 跳过 wm.cleanup）；resolveApplyAllowSet 返回 Map<repo,Set>；主仓 A5 patch apply 路径不动 | true（resolveApplyAllowSet 返回值类型变更 Set→Map，模块文档 worktree.md 仍记 Set，待同步） |
| verify-postcheck | 逻辑变更 + 接口变更 | src/verify-postcheck.js | A6 resolveVerifyChangedFiles/runVerifyTestCheck 加 ctx；per-repo cwd 跑跨仓 npm test；无 package.json 跳过 warn；跨仓不参与 module 子集 | false |
| stages | 逻辑变更 + 接口变更 | src/stages/execute.js、src/stages/plan-postcheck.js | execute.js buildWavePrompt per-task workdir（单值→多值表）+ base 锡点程序化落盘（writeBaseCommitToTaskCard）+ 跨仓 commit 指引注入；plan-postcheck.js 加 parseRepo/parseBaseCommit/parseHeadCommit/parseRepoRegistry + pathOwners (repo,path) 二元组聚合 + validateDesignFileCoverage 识别 §6 按仓分段段头 | false |
| cli-entry | 调用关系变更 | src/index.js | 6 个 ctx 透传点（gate/derive best-effort 降级，apply/assess fail-closed 阻断，backfill-reviews best-effort） | false |
| machine-interface | 调用关系变更 | src/machine-interface.js | runGate/runDerive 加 ctx 透传到 validateTaskReviews + runVerifyTestCheck | false |
| dispatch | 测试覆盖 | test/dispatch/execute-dispatch-integration.test.mjs | +4 测试段（per-task workdir 多值表/base 锡点落盘幂等/ctx 单仓退化/无 ctx 零回归） | false |
| 文档同步 | 配置变更 | docs/sillyspec/file-lifecycle.md、docs/prompt/execute.md、.claude/skills/sillyspec-execute/SKILL.md、.claude/skills/sillyspec-plan/SKILL.md | file-lifecycle 加 repos 段/MultiRepoContext/task 卡 frontmatter/跨仓 apply no-op/per-repo verify；execute prompt 说明段；2 SKILL 加跨仓 task 操作指引 | false |

### 未匹配文件（新增测试文件，归对应功能模块测试覆盖）
| 文件 | 归属 | 说明 |
|------|------|------|
| test/multi-repo-context.test.mjs | runtime | MultiRepoContext 单测（14 测试） |
| test/multi-repo-context-entry.test.mjs | runtime | execute 入口 ctx 构造端到端测（17 测试） |
| test/cross-repo-task-review.test.mjs | task-review | A1/A2/A7 集成测（24 用例） |
| test/cross-repo-apply.test.mjs | worktree | A3/A4/A5 集成测（8 用例） |
| test/cross-repo-verify.test.mjs | verify-postcheck | A6 集成测（8 用例） |
| test/parse-repo.test.mjs | stages | parseRepo/Registry 单测（26 断言） |
| test/plan-postcheck-cross-repo.test.mjs | stages | pathOwners 二元组测（12 断言） |
| test/design-coverage.test.mjs | stages | §6 分段测（+7 场景，总 41） |
| test/stage-completion-atomicity.test.mjs | runtime | gates ctx 透传测（+3 用例 f/g/h） |
| test/worktree-allow-list-violations.test.mjs | worktree | resolveApplyAllowSet Map 适配（+用例 ⑧） |

## 三重交叉验证
- 声明范围（design §6 文件清单 18 项）：全覆盖
- 任务范围（plan.md 12 task allowed_paths）：全覆盖
- 真实变更（git diff 26 文件）：与声明/任务一致，无未声明文件

## 总结
跨仓 task 支持影响 8 模块（runtime/task-review/worktree/verify-postcheck/stages/cli-entry/machine-interface/dispatch + 文档）。核心新增 MultiRepoContext 运行时（runtime 模块），7 单仓假设点收口（task-review/worktree-apply/verify-postcheck/gates/execute/index/machine-interface/complete）。单仓 change 零回归（所有 ctx 参数缺省 null 退化）。needs_review=true 仅 worktree 模块（resolveApplyAllowSet 返回值类型变更待文档同步）。
