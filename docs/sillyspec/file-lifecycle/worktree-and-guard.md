---
author: qinyi
created_at: 2026-06-04 16:25:42
updated_at: 2026-08-24
---

# Worktree 与 Hook 门禁

## 命令入口

`src/index.js` 暴露：

```text
sillyspec worktree create <change-name> [--base <branch>]
sillyspec worktree apply <change-name> [--check-only] [--merge]
sillyspec worktree list
sillyspec worktree cleanup <change-name>
```

实现分别调用：

- `WorktreeManager.create()`
- `applyWorktree()`
- `WorktreeManager.list()`
- `WorktreeManager.cleanup()`

## `create`

默认路径：

```text
.sillyspec/.runtime/worktrees/<change-name>/
```

默认分支：

```text
sillyspec/<change-name>
```

关键校验与分支：

1. `changeName` 不能为空，不能包含 `..`、`/`、`\`。
2. 如果当前目录是 git submodule，直接报错。
3. 如果当前目录已经是 linked worktree，创建 `native-worktree` meta，复用当前目录。
4. 普通主工作区必须先确认 `.sillyspec/.runtime/worktrees` 被 `.gitignore` 忽略，否则报错。
5. 如果 worktree 目录存在但没有 `meta.json`，视为幽灵目录并自动删除。
6. 如果目标 branch 已存在，报错。
7. 默认 base 是当前 `HEAD`；传 `--base` 时使用指定 ref。
8. `git worktree add` 失败时：
   - 如果 git 版本低于 2.15 或不可用，报错。
   - 其他失败降级为 `in-place-fallback`，在主工作区记录 meta。
9. 创建普通 worktree 后，**只读检测** base（主仓库 HEAD）与 `origin/<默认分支>` 的落后/分叉状态，报告风险 + 对齐命令，写 `syncDiagnostic` 到 meta。**不自动 fetch+ff、不阻断 create**（对齐 origin 的动作留给用户/agent）。
9.5. **同名分支冲突决策菜单**（2026-08-24 坑 worktree-user-branch-conflict）：`sillyspec/<change>` 分支已存在时不再只报 Run cleanup first——三选一菜单（遗留分支确认作废后删 / `--adopt-branch` 收编 / 换变更名）；`--adopt-branch`（`worktree create` flag 或 `run execute --change X --adopt-branch`）检出既有分支为工作分支，`baseHash = baselineCommit = 分支 HEAD`（分支存量归 baseline 不计交付 diff），`meta.adoptedBranch` 留审计。幽灵目录自动清理不再盲删同名分支（只 prune）。
10. 主工作区已有 staged/unstaged/untracked 变更时，会 overlay 到 worktree，并创建 baseline checkpoint commit。checkpoint 提交信息正文自 2026-08-24（坑 baseline-checkpoint-opaque-carriage）列出夹带的主仓并行在途文件清单（封顶 30 行，与 `meta.baselineFiles` 同源，标注「逐任务归因时排除」）——`git log` 一眼可辨，无需人肉 diff 区分。
11. **依赖供给**（change `2026-06-28-worktree-deps-provision`）：baseline overlay 后调用 `provisionDeps(worktreePath, mainCwd)`（`src/worktree-deps.js`）——lockfile 一致时 junction/symlink 主 checkout 的 `node_modules`（瞬时零网络），否则按 `local.yaml` 的 `project.type` + lockfile 推断并执行 install。结果写入 meta（`depsStatus` 等字段）。**供给失败不阻断 create**，只记 `depsStatus=failed`，交由 execute 验证硬门阻断。

## `meta.json`

普通 worktree 的 `meta.json` 位于 worktree 目录内：

```text
.sillyspec/.runtime/worktrees/<change>/meta.json
```

`native-worktree` 和 `in-place-fallback` 下，meta 仍写到 `.sillyspec/.runtime/worktrees/<change>/meta.json`，其中 `worktreePath` 可能指向当前工作目录。

主要字段：

| 字段 | 说明 |
|---|---|
| `changeName` | 变更名 |
| `branch` | worktree 分支 |
| `baseBranch` | 基准分支或 ref |
| `baseHash` | 创建时基准 commit |
| `actualBaseHash` | worktree 当前 HEAD（去掉自动 ff 后 == `baseHash`） |
| `createdAt` | 创建时间 |
| `worktreePath` | 实际执行目录 |
| `mode` | `worktree` / `native-worktree` / `in-place-fallback` |
| `baselineFiles` | 从主工作区 overlay 的未提交文件 |
| `baselineCommit` | baseline checkpoint commit |
| `baselineHash` | execute 前主工作区 dirty baseline hash |
| `syncDiagnostic` | base 与 `origin/<默认分支>` 的同步检测：`{ status, defaultBranch, behind, ahead }`。status 为 `up-to-date` / `behind` / `diverged` / `ahead` / `unknown`。落后/分叉时 create 会报告风险 + 对齐命令，不阻断 |
| `depsStatus` | 依赖供给状态：`linked` / `installed` / `n/a` / `failed` / `missing` / `stale`（provisionDeps 写入） |
| `depsMethod` | 供给机制：`junction` / `symlink` / `install` / `null` |
| `depsSource` | 依赖来源：`main-checkout` / `install` / `null` |
| `depsLockHash` | 供给时 lockfile/package.json 的 sha256 前 16 位 |
| `depsCheckedAt` | 上次供给时间（ISO8601） |
| `depsError` | 仅 `depsStatus=failed` 时填，install/junction 失败信息 |

## `apply`

`applyWorktree(changeName, { checkOnly, merge })` 的真实流程（2026-07 放宽：主干已提交推进交 `--3way` 自动合并）：

1. 读取 `meta.json`。
2. diff base 使用 `baselineCommit || baseHash`。
3. 收集 tracked diff 和 untracked 新文件。
4. allow list **三源并集**：design §6“文件变更清单” ∪ 任务卡 `allowed_paths` ∪ **task review.json `changedFiles` 声明**（2026-08-24 坑 apply-undeclared-deviation-block：执行期有据越界文件——facade 转发/名单测试——不再逼回改 design.md；review 声明已过 Task Review Gate 的 git 证据交叉校验，仅靠 review 放行的文件记 `result.reviewAdmittedFiles` + 审计 warning；跨仓 review 按 `repo:` 切片不进 main 集；`.sillyspec/` 运行时产物/meta.json 过滤；完全越界文件仍拦）。
5. 如果 allow list 非空，要求 changed files 都在清单内（violation 报错给「review.json changedFiles 声明 / design §6 补行」两条出路）。
5.5 **`--stash-dirty`**（2026-08-24 坑 apply-main-dirty-no-first-class，用户反馈四期①）：主仓有并行在途改动时默认/`--skip-overlap`/`--merge` 三路死锁，本 flag 把手工 stash→3way→pop 内置——Gate1 之后（清单违规先拦不动用户树）按 4.5 同口径探针，脏则 `git stash push -u -- <pathspec 同款排除>`（stash SHA 显著打印），apply 正常走，finally 两级恢复：`apply --index`（保暂存区）优先、与 apply 落地的未提交变更互斥时退普通 apply（内容保真 + staged 扁平化明示）、都失败保留条目大字打印 SHA 兜底（绝不自动 drop）；drop 后核验栈顶防「静默不落地」（用户实证 stash pop 有静默失败形态）；checkOnly 只读绝不 stash；全程持主仓互斥锁。
6. **显式 `--merge`**（用户 flag）→ 直接走 `applyByMerge`（`git merge sillyspec/<change>`，三方合并兜底，引合并提交），跳过后续 patch 流程。merge 前两步预处理：preAlignBaselineToMain 预对齐 baseline 并行文件（2026-08-16）+ **autoCommitWorktreeWip 自动 commit 未提交交付物**（2026-08-28 坑 apply-merge-uncommitted-noop：子代理默认不 commit，分支 tip 只含 baseline checkpoint → merge 空转零落地；现把未提交交付 pathspec commit 到分支再 merge，warning 可审计，commit 失败降级交落地校验兜底）。
7. **未提交 dirty 拦截**（step 4.5）：如果 meta 有 `baselineHash`，重新计算主工作区 dirty hash（排除 `.sillyspec/.claude/docs/CLAUDE.md`）；不同 → 拒绝 apply 并列出脏文件 + 引导先 `commit`/`stash` 或 `--stash-dirty` 由工具代劳（实测 git `--3way`/`merge` 对未提交 dirty 工作区均不稳，必须拦）。step 5a 再做一次脏∩changedFiles 精确点名。
8. **已提交推进**（step 5b）：比较主工作区 `HEAD` 与 worktree `baseHash` 的目标文件 blob。**放宽**：blob 不一致（主干已提交推进改了同文件）不再 BLOCKED，仅记入 `hashMismatchFiles` 作风险提示（assess WARNING），放行交 `--3way` 自动三路合并。
9. `--check-only` 到这里返回。
10. 生成临时 patch。
11. ~~`git apply --check`~~（已移除——只测 clean apply，--3way 能处理 clean apply 失败的三路合并，预检恒拦会误伤）。
12. 执行 `git apply --3way`：主干已提交推进时自动三路合并（不同文件/不同区域干净合，同区域重叠留冲突标记）。**冲突时回滚工作区到 apply 前状态**（`checkout HEAD -- <f>` 还原 tracked + 删新建文件），不留半成品冲突标记，报错列冲突文件 + 提示 `--merge` 兜底。
13. 成功后自动调用 `WorktreeManager.cleanup()`。

无变更时，如果不是 check-only，也会 cleanup。

**设计正交**：step 4.5/5a 挡「未提交」dirty（git 危险区），step 5b 管「已提交」HEAD 分叉（交 `--3way`）。`--merge` 从「baseline 漂移自动降级」改为「用户显式 flag 兜底」。

## `cleanup`

`cleanup(changeName, { force })`：

| mode | 非 force 行为 |
|---|---|
| `worktree` | 尝试 `git worktree remove --force`，删除目录，删除分支，删除 meta 目录 |
| `native-worktree` | 抛错，避免删除用户自己的 worktree |
| `in-place-fallback` | 返回 `skipped` |
| 无 meta 且目录不存在 | 返回 `skipped` |

如果 `git worktree remove` 失败但目录可删，结果是 `force-cleaned`。

**清理前的 spec 产物打捞**（2026-08-24 坑 worktree-spec-artifact-misplace）：子代理 cwd=worktree 时可能把流程产物（verify-result.md / module-impact.md / 任务卡 / 模块文档）写进 worktree 的 `.sillyspec/`——而 apply 的 `filterDeliverableFiles` 把 `.sillyspec/changes/` 排除在交付外（spec 文档不进代码 patch），cleanup 删除 worktree 即蒸发。删除动作前 `_salvageSpecArtifacts` 扫两棵子树做最后打捞：`changes/<name>/**` 主仓缺失则 copy 回主仓（同名不同内容仅列清单 warn 不覆盖）、`docs/**` 主仓缺失则 copy 回；只扫本变更子树不越权，in-place / native-worktree 跳过，打捞异常只 warn 不阻断清理。配套防患于源：execute/verify 提示词中的蓝图/任务卡/verify-result.md/模块文档路径一律用 `{SPEC_ROOT}` 占位符（CLI 渲染为主仓绝对路径，worktree 漂移自动锚定），`verify-probes --init` 入口同款锚定（`resolveVerifyProbesSpecBase`）。

**分支删除的审计保护**（2026-08-18）：删除分支前校验 `.runtime/execute-runs/*/tasks/*/review.json` 的 `base`/`head` 是否引用该分支上的 commit——有引用则**保留分支 ref**（`branch kept` 入 details，提示手动 `git branch -D`），`force` 也不绕过（force 语义=丢弃内容，不含丢弃审计链）。apply 只复制文件内容不携带 commit（主仓重 commit 后 hash 不同），ref 一删 task review 引用即悬空（gc 后真丢）。校验自身异常按"有引用"处理（宁保留勿误删）。

### 归档/完成时的自动清理判定（`hasUnappliedChanges`）

归档（`run archive`）和 execute 阶段完成时，会调 `hasUnappliedChanges(changeName)` 判断是否还有"未 apply 变更"，决定**自动 cleanup 还是保留 worktree**。

**短路（不判未应用，直接返回 hasChanges:false）**：

- `in-place-fallback` / `native-worktree`（外部隔离环境，不纳入判定）
- 无 meta / worktree 目录不存在 / 无 `baselineCommit||baseHash` diff base / worktree 无任何交付变更

**"已应用"语义**（修复 2026-07-28：原逻辑只看"worktree 相对 baseline 有无 diff"，导致 cherry-pick/rebase 直接落 main 后归档误报"未 apply 变更"）：

- worktree 相对 baseline 的**交付变更**（tracked + untracked，排除 `.sillyspec/`/`meta.json`）里，哪些还没 byte-identical 落到**主工作区 HEAD**。
- **tracked**：`git -C worktree diff --no-renames --name-only <mainHead> -- <候选文件>`，比较 worktree 工作区（含未提交）vs main HEAD；空 = 已在 main HEAD。
- **untracked**：worktree `hash-object` blob vs main `ls-tree HEAD` blob；不等 = 该新文件未在 main HEAD。**HEAD-only，不查 main 工作区未提交副本**（否则依据一份未提交文件，用户 `git clean`/`git reset` 后代码全仓消失 → 误删）。
- 全部已在 main HEAD → `hasChanges:false` → 自动 cleanup。cherry-pick / rebase / merge / `worktree apply` 四种落地方式都能识别为"已应用"。

**fail-safe**：检测失败 / 拿不准 → 保守 `hasChanges:true`（保留 worktree，防误删未落代码）。

**保守倾向**（非 bug）：main 在落地后又对该文件有**额外已提交改动**（main 跑过头）→ worktree 工作区与 main HEAD 不再 byte-identical → 仍判 pending、保留 worktree，需手动 `sillyspec worktree cleanup <change> --force`。

## execute 阶段

`execute.js` 的固定前缀第 3 步是“创建 worktree”，prompt 要求运行：

```text
sillyspec worktree create <change-name>
```

后续 Wave prompt 要求把子代理 cwd 设置为 worktree 路径。完成确认 step 根据 mode 分别处理：

- `worktree`：check-only，用户确认后 apply，再 cleanup。
- `native-worktree`：可以 apply，但不要 cleanup。
- `in-place-fallback`：跳过 apply/cleanup。
- 无 worktree：只展示 diff 摘要。

注意：`buildExecuteSteps()` 有 `noWorktree` 参数，但当前 `runCommand()` 没有解析 `--no-worktree` flag，CLI help 也没有列出该 flag。文档不要把 `--no-worktree` 写成已接通的公开流程。

### execute 依赖验证硬门（change `2026-06-28-worktree-deps-provision`）

`run.js completeStep` 在 execute 分支标记 step done **之前**调用 `enforceDepsGate()`：

1. 读 `meta.depsStatus`：∈ `{linked, installed, n/a}` 放行。
2. 否则判断 wave 级 opt-out（`isCurrentWaveAllNoDepsVerify`）：仅当前 wave（如 `Wave 2 执行`）内**全部** task 的 `tasks/task-NN.md` frontmatter `no_deps_verify: true` 才跳门。非 wave 步骤（确认执行范围/acceptance/suffix）恒过门。
3. 不达标 → step 置 `blocked` + `process.exit(1)` 拒绝 `--done`，提示 `sillyspec worktree doctor --fix` 或手动 install。

execute **入口自检**：已存在 worktree（`create()` short-circuit 不供给）时，入口校验 `depsStatus` 缺失 / `node_modules` 丢失（missing）/ `lockfileHash` 变化（stale）→ 触发 `provisionDeps` 重供给并更新 meta，再交门判定。

### doctor editable-install 越界检查（2026-08-25 坑 worktree-editable-install-escape）

worktree venv 的 editable install 指向 worktree **外**（典型：主仓 checkout）时，`gen:types` / 后端命令 / pytest 会静默加载 worktree 外旧代码——改动不生效且零报错。`worktree doctor` 对存活 worktree 扫描 `.venv`/`venv` 的 site-packages，覆盖三种 editable 痕迹：路径型 `.pth`、PEP 660 `__editable___*_finder.py` 的 MAPPING 表、`*.dist-info/direct_url.json` 的 `dir_info.editable + file:// url`；目标路径 resolve 后不在 worktree 内即报 `editable-install-escape`（fixable:false，重装方式因项目而异留给用户：`uv sync` / `uv pip install -e .` 后重跑生成命令）。探测纯 FS 读取（`src/worktree-deps.js` `detectEditableInstallEscape`），失败不阻断 doctor。

## worktree 内跑 CLI 的 spec 漂移守卫

worktree 是主仓完整 checkout，若 `.sillyspec/changes/` 被跟踪，worktree 内会 checkout 出一份 `.sillyspec` **副本**（`<mainRepo>/.sillyspec/.runtime/worktrees/<change>/.sillyspec`）。在 worktree 内 cwd 跑 `sillyspec run execute/verify/plan/archive` 时，`specBase = cwd/.sillyspec` 会命中**副本**而非主仓 spec → 进度/产出写进副本，与主仓 `.sillyspec` 分裂（副本随 `worktree cleanup` 丢失）。两层守卫（`src/run/shared.js` + `src/run/command.js`）：

1. **漂移 warn**（`countAncestorSpecDirs`，runCommand 入口）：cwd 祖先链 `.sillyspec` ≥2 个时提醒。祖先链上界用 `git rev-parse --git-common-dir` 的 dirname（主仓根），而非 `--show-toplevel`——后者在 linked worktree 内返回 **worktree 根**，会截断祖先链使其数不到主仓 `.sillyspec`（恒 ≤1，warn 永不响）。复刻自 `WorktreeManager._resolveMainRepoRoot`。平台模式 / 显式 `--spec-dir` 跳过。
2. **worktree 副本硬守卫**（`detectWorktreeSpecDrift`）：`specBase` 路径形如 `<mainRepo>/.sillyspec/.runtime/worktrees/<change>/.sillyspec`（尾段须为 `.sillyspec`）→ 命中即 `exit 2`，提示 `cd` 回主仓根或 `--spec-dir <mainRepo>/.sillyspec`。覆盖 `plan/execute/verify/archive`（= `validateChangeExists` 的需要变更阶段），在 change 存在性校验**之前**触发——副本里 change 目录真实存在，存在性校验会被骗放行。平台模式 / 显式 `--spec-dir` 跳过。

不变准则：**CLI 状态推进只在主仓根 cwd 跑**；worktree 仅作代码隔离区，文件读写用绝对路径或 `git -C <worktree>`。

## quick 阶段

quick 当前不创建 worktree。

`quick.js` 第 2 步明确写的是“直接在主工作区实现任务”。`worktree-guard.js` 在 stage 为 `quick` 时，对 Write/Edit/MultiEdit 直接放行；Bash 仅拦截危险命令。quick 作为辅助阶段完成后，`run.js` 会重置 quick 步骤并清空 `currentStage`（DB 中），hook 下次直读 DB 时不再看到 `quick` 阶段，从而不再对源码写放行。

因此旧文档中“quick 创建 worktree/meta.json”的描述不符合当前代码。

## Hook 门禁

入口：`src/hooks/claude-pre-tool-use.cjs`

输入：Claude Code PreToolUse hook 的 JSON。它只映射这些工具：

- `Write`
- `Edit`
- `MultiEdit`
- `Bash`

实际判断：`src/hooks/worktree-guard.js`

### 文件白名单

以下写入直接放行：

- 路径中包含 `.sillyspec`，但 `.sillyspec/.runtime/worktrees/` 例外
- 路径中包含 `.git`
- 扩展名为 `.md`
- 文件名为 `package.json`、`tsconfig.json`、`local.yaml`、`local.yml`

`.sillyspec/.runtime/worktrees/` 下的写入不会仅因路径包含 `.sillyspec` 而放行；它必须命中当前 gate 中 active change 对应的 `meta.json.worktreePath`。

### 阶段门禁

阶段读取顺序：hook 直读 `.sillyspec/.runtime/sillyspec.db`（`worktree-guard.js` 的 `queryDbFirstCell` 起真实 node 子进程，用 `node:sqlite` 的 **readonly + fileMustExist** 连接查 `changes.current_stage`；WAL 并发安全，**不依赖外部 `sqlite3` CLI**——Windows 默认没有）。db 缺失/损坏/`node:sqlite` 解析失败时 hook **fail-closed**（warn + null，源码写一律拦截，不 fail-open）。进度库是唯一权威状态源，hook 不再依赖任何缓存侧文件。

只有 `execute` 和 `quick` 被视为允许源码写入的阶段。

### execute 写入

execute 阶段的源码写入必须位于已登记 worktree 内：

1. hook 直读 `.sillyspec/.runtime/sillyspec.db`（`queryDbFirstCell` readonly 连接），得到当前 active changes。
2. 对每个 active change 读取 `.sillyspec/.runtime/worktrees/<change>/meta.json`。
3. 只有目标路径位于 `meta.json.worktreePath` 内时才允许写入。

这意味着随便构造一个包含 `.sillyspec/.runtime/worktrees/` 字符串的路径不会被放行。主工作区写源码仍会被拦截。

### quick 写入

quick 阶段写文件直接放行，不要求 worktree。

### Bash 命令

- 已登记 worktree 内 cwd：全部 Bash 放行。
- 非 execute/quick：只读白名单放行。
- quick：危险黑名单拦截，其余放行。
- execute 主工作区：危险黑名单拦截；只读白名单放行；其他不确定命令当前放行。

`worktree-guard.js` 的本地扩展白名单优先读取 `.sillyspec/local.yaml` / `.sillyspec/local.yml`，并兼容项目根 `local.yaml` / `local.yml`。

## doctor 分支删除收紧（2026-08-24 坑 worktree-user-branch-conflict）

- **无进度库（git-only）**：孤儿分支从「照删」改**保守保留**（fixable:false 人工确认）——无库时无法区分孤儿与用户自建分支，git-only 便利让位于不误删。
- **review 锚点复核**：`orphan-branch` 删除前跑 `_branchReviewReferences`——分支上有 task review base/head 引用的 commit → fixable:false 保留（与 cleanup 分支删除审计保护同口径）。
- **cleanup `--force` × native-worktree**：该模式 `meta.branch` 是用户自己的检出分支，force 也不删（只清 sillyspec 侧注册）。
