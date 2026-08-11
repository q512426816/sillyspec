# 任务（Tasks）— SillySpec 跨仓 task 支持

> 任务清单为 brainstorm 阶段粗粒度草案，plan 阶段会拆解为 Wave + TaskCard（含 allowed_paths / acceptance / verify）。
> 建议分批落地（架构评审子代理建议 5 PR 顺序），plan 阶段细化。

## 核心任务

- [ ] task-01 MultiRepoContext 核心模块（`src/run/multi-repo-context.js`）：Map<repoKey,RepoEntry> + 主仓读 meta / 跨仓实时 git rev-parse + 约束② fail-closed 未注册校验 + resolve/repos/hasCrossRepo 接口 + 单测
- [ ] task-02 local.yaml `repos:` 段 schema 读取 + parseRepo task 卡片解析（plan-postcheck.js 同源 frontmatter）+ 单测
- [ ] task-03 plan-postcheck 约束③：pathOwners 按 (repo,path) 聚合 + validateDesignFileCoverage 按仓分段/豁免 + 回归测
- [ ] task-04 task-review A1/A2/A7：verifyReviewGitEvidence 加 repo 切 gitDir + generateTaskReviewDrafts per-repo + validateReviewSchema 加 repo 字段（schemaVersion 1→2 兼容）+ 集成测
- [ ] task-05 worktree-apply A3/A4/A5（D-009 跨仓 no-op）：主仓 task 原 apply 路径不动 + 跨仓 task apply=no-op（校验 review.head 真实 commit + 跳过 wm.cleanup，无 patch）+ resolveApplyAllowSet 返回 Map<repo,Set>（allowed_paths 基准=各 repo 根）+ 集成测
- [ ] task-06 verify-postcheck A6：resolveVerifyChangedFiles 走 context + runVerifyTestCheck per-repo cwd 跑跨仓 npm test（无 package.json 跳过 warn）+ 集成测
- [ ] task-07 gates reviewGitDir 按 ctx.resolve('main') 兜底 + Task Review Gate 每 task 按 repo 切 gitDir + runVerifyTestCheck 调用点透传 context
- [ ] task-08 execute buildWavePrompt workdir 按 task.repo 切 + prompt 注入跨仓仓路径/commit 到该仓主干
- [ ] task-09 execute 启动入口构造 MultiRepoContext 并透传调用链（shared.js / index.js）
- [ ] task-10 文档同步：file-lifecycle.md（task repo: 字段 / local.yaml repos: / MultiRepoContext 运行时 / 跨仓 review 路径）+ docs/prompt/execute.md 重跑 _extract.mjs + .claude/skills/sillyspec-execute + sillyspec-plan SKILL.md
- [ ] task-11 跨仓端到端验证（D-011，非自指 dogfood）：在 multi-agent-platform 仓建测试 change（主仓=multi-agent-platform，跨仓=sillyspec），跑通跨仓 task 全链路（review/apply=no-op/verify 跨仓 npm test）；本仓 sillyspec 自身改动全走单仓 task（无 repo:），验证单仓零回归
- [ ] task-12 npm test 全量 + lint 全量验收（单仓零回归 + 跨仓新测全绿）

## 依赖关系（plan 细化）

- task-01（MultiRepoContext）是所有后续 task 的基础
- task-02（parseRepo + local.yaml）是 task-01 的前置（注册表 + 卡片解析）
- task-03（plan-postcheck）独立可早做（约束③前置，否则 plan 阶段跨仓 task 过不去）
- task-04/05/06/07 可并行（不同模块，共享 ctx 接口）
- task-08/09 依赖 task-01
- task-10/11/12 是收尾
