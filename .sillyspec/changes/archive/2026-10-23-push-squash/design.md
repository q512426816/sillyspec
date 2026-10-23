---
author: flow-machine-draft
created_at: 2026-10-23T08:40:39.989Z
---
# 设计记录（Design Record）— 2026-10-23-push-squash

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

新增显式 `sillyspec push`：以目标远端分支为 base，只处理 `base..HEAD` 的本地未推送段；默认按“连续且归属同一变更”的提交段分组，用 `git commit-tree` 以每段末树生成新提交、CAS `git update-ref` 改写当前分支，再普通快进 `git push`。全过程不碰 index/工作区，不 force，不自动改写已推送历史。

base 计算会把 SillySpec 的活锚点（scan 文档 `source_commit`、活跃变更 `baseline_commit`、活跃 `change-patch.json`、worktree meta）纳为下界，保证压扁后它们仍是新 HEAD 祖先；压扁前建 pre/post 备份 ref，`--undo` 仅允许在推送前恢复。配套 `sillyspec:push` skill、`push` 命令卡与 `flow done` 指引替换。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- 新命令：`sillyspec push [--mode by-change|one|none] [--change <名>] [--dry-run] [--no-push] [--undo] [--base <ref>] [--remote <名>] [--branch <名>] [--json]`。
- 默认 `mode=by-change`；`--mode one` 必须带 `--change`，且区间内不得有活跃变更/混合归属；`--mode none` 只推送。
- 新模块 `src/push.js` 对外导出（index.js / 测试消费，过 lint 未引用导出门）：`parsePushArgs`、`PUSH_USAGE`、`planPush`、`runPush`、`classifyCommits`、`buildSquashMessage`、`detectChangeOwner`、`renderPushPlan`；仓库/目标/锚点/提交读取与 undo 为模块内私有。
- `src/git-helper.js` 的 `git()`/`safeGit()` 增加 `input` 与 `stdio` 选项；stdin 必须 `pipe`，供 `commit-tree -F -` 传多行消息。
- 备份 ref 形态：`refs/sillyspec/pre-squash/<branch>/<UTC 时间戳>`、`refs/sillyspec/post-squash/<branch>/<UTC 时间戳>`；不自动推送、不自动清理。
- JSON 输出：`{ schema_version, command:'push', ok, branch, remote, remote_branch, base, old_head, new_head, mode, dry_run, pushed, groups[], backup_refs[], errors[], warnings[] }`。
- 退出码：0 成功/no-op/dry-run；1 执行失败（git/fetch/push/CAS/锁）；2 用法或前置条件错误（未知 flag、detached HEAD、非法 mode、新分支缺 `--base`、参数互斥）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
   - 提交顺序取自 `git rev-list --reverse base..HEAD` 的拓扑序，不依赖消息时间；by-change 只合并连续段，不跨段重排。远端在 plan 与 push 之间推进时，CAS/push 自然拒绝（non-fast-forward），本地压扁保留但远端不被改写，用户可 `--undo` 后重跑。活锚点按当前 refs 现算，不依赖缓存。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
   - 用 `<git-common-dir>/sillyspec-push.lock` 文件锁串行化整个“读基线→建备份→改写→push”临界区；分支更新用 `git update-ref <ref> <new> <old>` CAS，旧值不匹配即失败并保留备份。只操作当前 checkout 分支，`--branch` v1 仅作断言；不触碰其他会话的 index/工作区，禁止目录级 add，也不在 SillySpec worktree 内运行。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
   - 进程在备份 ref 创建前中断：原 ref 不变。备份后、CAS 前中断：原 ref 不变，备份 ref 可审计。CAS 后、push 前中断：本地已压扁，pre/post ref 可在 `--undo` 中恢复。push 失败不自动回滚，保留本地压扁并打印重试/undo 指引。staged index、进行中的 merge/rebase/cherry-pick、detached HEAD 一律拒绝。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
   - 只处理当前 git checkout 的当前分支与目标远端分支；worktree cwd 默认拒绝，避免误改主仓；跨仓仓库不处理。锚点只读当前仓的 scan/flow/change-patch/worktree meta；平台同步、其他分支、其他远端不在本次范围。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

- 最大风险：历史重写破坏 SillySpec 的审计锚。缓解=有效 base 抬升 + 备份 ref 保活旧对象 + by-change subject 保留 `(<变更名>)`；`--mode one` 在活跃变更存在时默认拒绝。
- 死路 1：pre-push hook 自动改写。git 在调用 hook 前已捕获要推送的 OID，hook 内改 HEAD 不影响本次推送（临时仓实测：远端收到旧提交）。只做显式命令。
- 死路 2：`git reset --soft` 压扁。会把共享暂存区内容卷进压扁提交；`commit-tree` + `update-ref` 才能保证 index/工作区逐字节不变。
- 死路 3：在活跃 worktree 内压扁。`scanOrphanFace` 只扫 reflog、不认备份 ref，会把旧提交误判为冻结面外；v1 直接拒绝，后续再讨论忽略 pre-squash ref。
- 其他风险：merge commit 展平、签名提交丢签名、tag 指向旧提交、commit-msg hook 被绕过；v1 默认拒绝 merge/已推送区间，签名与 tag 给 warning，pre-push hook 仍正常执行。
- 不做：改写已推送历史、force-push、跨分支批量清理、自动 hook 静默改写、跨仓 push。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 新增 | `src/push.js` | 计划层 + 执行层：repo/base/锚点/守卫/分组/消息/备份/CAS/undo/push |
| 修改 | `src/git-helper.js` | `git()`/`safeGit()` 支持 `input` 与 `stdio`（stdin pipe） |
| 修改 | `src/index.js` | usage、`case 'push'`、`topCommands`、worktree 自动锚定豁免 `push` |
| 修改 | `src/run/shared.js` | `UNINIT_CWD_GATE_EXEMPT` 加入 `push` |
| 修改 | `src/flow.js` | 三处 `reset --soft` 指引替换为 `sillyspec push` |
| 新增 | `test/push-plan.test.mjs` | 纯计划层：分组/锚点/守卫/消息/JSON |
| 新增 | `test/push-cli.test.mjs` | 临时 git 仓 + bare remote：dry-run/改写/快进/undo/并发 |
| 新增 | `test/push-skill.test.mjs` | skill frontmatter、命令卡注册、flow 指引 |
| 新增 | `test/git-helper-input.test.mjs` | task-01 stdin 扩展回归（commit-tree -F - 双入口） |
| 新增 | `test/flow-guidance.test.mjs` | flow 指引退役 reset --soft + AGENTS 模板注入 |
| 新增 | `.claude/skills/sillyspec-push/SKILL.md` | push skill（工具治理注入面——patch 冻结面按 `.claude/` 目录排除，交付以提交 1f666f6d 为准） |
| 新增 | `assets/command-cards/push.md` | `/sillyspec:push` 命令卡 |
| 修改 | `src/command-cards.js` | `COMMAND_CARD_NAMES` 注册 `push` |
| 修改 | `test/command-cards.test.mjs` | 卡数量/顶层命令形态更新 |
| 修改 | `package.json` | `test:core` 加入 push 专项测试 |
| 修改 | `templates/agents-instruction.md`、`AGENTS.md` | 推送纪律：先 `sillyspec push`，禁直接 `git push`/force |
| 修改 | `SKILL.md`、`README.md` | 命令与 skill 列表补 `push` |
| 修改 | `.sillyspec/docs/sillyspec/modules/_module-map.yaml` | `src/push.js` 补录 cli-entry 模块 paths（过 module-map 覆盖门） |
