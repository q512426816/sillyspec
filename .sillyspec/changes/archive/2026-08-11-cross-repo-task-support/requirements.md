# 需求（Requirements）— SillySpec 跨仓 task 支持

## 功能需求（FR）

### FR-01 跨仓 task 声明协议
task 卡片 frontmatter 支持可选 `repo: <key>` 字段（缺省='main'）。`parseRepo` 解析器与 `parseAllowedPaths` 同源（frontmatter 正则），被 MultiRepoContext 构造 + pathOwners 冲突检测复用。

### FR-02 workspace 仓注册表
`local.yaml` 新增 `repos:` 段（`Map<key, absolutePath>`）。MultiRepoContext 构造时查表解析跨仓仓路径。`main` 隐式 = cwd，不用注册。

### FR-03 MultiRepoContext 运行时上下文
新增 `src/run/multi-repo-context.js`。execute 启动构造，建 `Map<repoKey, RepoEntry>`。主仓 entry（isMain=true）读 `wm.getMeta` 的 baseHash + worktreePath；跨仓 entry（isMain=false）实时 `git -C <path> rev-parse HEAD` 取 base/head（不缓存）。`ctx.resolve(repo)` / `ctx.repos` / `ctx.hasCrossRepo()` 接口。

### FR-04 未注册 repo fail-closed（约束②）
task 卡片声明 `repo: foo` 但 `local.yaml repos:` 无 `foo:` → MultiRepoContext 构造抛错 + 列已注册 repo，阻断 execute 启动。不降级 warning。

### FR-05 跨仓 base/head 实时取 git（约束①）
跨仓 repo 的 base/head 不读 meta.json（跨仓仓无 .sillyspec/），实时 `git rev-parse HEAD`。主仓 repo 保持 meta.json 为权威不变式。

### FR-06 task review 多仓化（A1/A2/A7）
`verifyReviewGitEvidence` 签名加 repo，gitDir 按 `ctx.resolve(review.repo).gitDir` 切。`generateTaskReviewDrafts` per-task repo 取 diff/base/head。`validateReviewSchema` 加 `review.repo` 可选字段（schemaVersion 1→2，旧版无 repo 视 'main' 向后兼容）。review.json 仍存主仓 execute-runs。

### FR-07 worktree-apply 跨仓 no-op（A3/A4/A5，D-009）
apply 主流程按 ctx 区分主仓/跨仓：**主仓 task 走原 apply 路径**（worktree patch → git apply --3way → 主仓主干 + wm.cleanup）；**跨仓 task = no-op**（跨仓 commit 已由子代理直接落跨仓仓主干，apply 只校验 review.head 是跨仓真实 commit + 跳过 wm.cleanup，无 patch 可打——跨仓仓无 worktree/meta/分支，A5 patch 路径不可复用）。`resolveApplyAllowSet` 返回 `Map<repo, Set<path>>`（按 repo 切片，allowed_paths 基准=各 repo 自身根）。

### FR-08 verify 跨仓对账（A6）
`runVerifyTestCheck` per-repo cwd：跨仓仓有 package.json 则在该仓 cwd 跑 `npm test`，无则跳过 + warn。`resolveVerifyChangedFiles` 走 context per-repo 取 diff 合并。

### FR-09 plan 协议前置（约束③）
`pathOwners` 冲突检测按 `(repo, path)` 二元组聚合。`validateDesignFileCoverage` 支持 design §6 按仓分段 / 跨仓 task allowed_paths 豁免主仓对账。

### FR-10 execute prompt workdir 按 repo 切
`buildWavePrompt` 子代理 workdir 按 task.repo 切：主仓 task → 主仓 worktreePath；跨仓 task → 跨仓仓根。prompt 注入跨仓仓路径 + 「commit 到该仓主干」。

### FR-11 单仓零回归（GOAL-2）
单仓 change（所有 task 无 `repo:`）→ MultiRepoContext 退化为 `{main:{}}` 单值 map，7 点全走原路径，行为零变化。回归测覆盖。

## 非功能需求（NFR）

### NFR-01 确定性 fail-closed
跨仓仓 git 不可用、未注册 repo、跨仓 head 非真实 commit 等异常显式阻断，不静默降级（符合 SillySpec 确定性校验定位，区别于 sillyhub 语义软判定）。

### NFR-02 跨平台兼容
MultiRepoContext 路径处理兼容 Windows/Linux/macOS（绝对路径正反斜杠、`git -C` 跨平台）。复用 `git-helper.js` 的 `execFileSync` 数组形式（不经 shell）。

### NFR-03 多 agent 并行安全
MultiRepoContext 进程级缓存（仿 `worktree.js _mainRepoRootByCwd`），base/head 实时 resolve 反映跨仓仓最新 HEAD。与 `concurrent-detect.js` 多 agent 预检正交。

### NFR-04 文档同步
改动触及 `src/stages/*`（execute）+ 文件生命周期 → 同步 `docs/sillyspec/file-lifecycle.md` + `docs/prompt/execute.md`（重跑 `_extract.mjs`）+ `.claude/skills/sillyspec-execute/` + `sillyspec-plan/` SKILL.md。

## 验收标准（AC）

- AC-01：跨仓 task（repo:sillyspec）的 review.json 能通过 Task Review Gate（base/head 是 sillyspec 仓真实 commit，verifyReviewGitEvidence 在 sillyspec 仓 gitDir 校验）。
- AC-02：跨仓 task 的代码改动 apply 到 sillyspec 仓主干（不进主仓 multi-agent-platform）。
- AC-03：verify 阶段在 sillyspec 仓 cwd 跑 `npm test` 通过。
- AC-04：单仓 change（无 repo:）全流程行为零变化（npm test 全绿，既有测试不回归）。
- AC-05：未注册 repo（local.yaml repos: 无该键）execute 启动 fail-closed 抛错。
- AC-06：plan 阶段跨仓 task 与主仓 task 同名路径不误判同 Wave 冲突。
