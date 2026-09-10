---
author: qinyi
created_at: 2026-06-01T09:05:00
---

# worktree
> 最后更新：2026-09-08
> 最近变更：ql-20260908-008（meta.json BOM 容错 + apply allowlist 平台模式读 specRoot——resolveApplyAllowSet/collectReviewDeclaredFiles 加 specBase/runtimeRoot 参 + 指针静默回退） / 2026-08-19-reopen-and-execute-batch-guard（W3 apply 锚点默认 merge-base + --base 回退 + 冲突列表 stderr 解析）/ 2026-08-16-state-split-fixes（#2 applyByMerge merge 前预对齐 baseline 并行文件：preAlignBase
> 模块路径：src/worktree.js, src/worktree-apply.js, src/worktree-deps.js, src/git-helper.js

## 职责
Git worktree 的创建、管理、变更应用与依赖供给 — 为 SillySpec 提供隔离且立即可构建的开发环境。

## 当前设计

worktree 模块提供基于 git worktree 的分支隔离机制，让每个变更在独立的工作树中开发，避免主工作区被污染。由三个文件组成：

**worktree.js** 核心是 `WorktreeManager` 类，管理 worktree 的完整生命周期。worktree 存放在 `.sillyspec/.runtime/worktrees/<change-name>/` 目录下，每个 worktree 对应一个 `sillyspec/<name>` 格式的分支。WorktreeManager 提供创建（create）、列出（list）、清理（cleanup）、查询元数据（getMeta）、健康检查（doctor）等操作。每个 worktree 附带一个 meta.json 文件记录分支名、基础提交、创建时间、依赖供给状态等元信息。

**worktree-apply.js** 提供 `applyWorktree()` 函数，负责将 worktree 中的变更安全地应用回主工作区。它执行冲突检测（检查主工作区和 worktree 是否修改了相同文件），支持仅检查模式（checkOnly）和实际应用模式。应用时使用 `git diff` 生成补丁并通过 `git apply` 应用。

**worktree-deps.js** 提供 `provisionDeps()` 依赖供给引擎。在 `create()` 的 baseline overlay 之后调用，让 worktree 立即可构建/测试：lockfile 一致时 junction/symlink 主 checkout 的 node_modules（瞬时零网络），否则按 `local.yaml` 的 `project.type` + lockfile 推断并执行 install。供给结果（depsStatus 等）写入 meta.json，供 execute 阶段的验证硬门读取。供给可失败，但失败状态可观测、可由 doctor 重试（doctor --fix 走 `_doctorReprovision`：先解 node_modules junction（**解链失败 fail-loud 阻断，不调 provisionDeps，D-002@v1**）再 `provisionDeps(force=true)` 强制重供，绕过 tryLink 幂等短路，修 deps-main-drift 等主仓 lockfile 漂移场景）。另导出 H1 `checkDepsFreshness(meta, wtPath, mainCwd)`，统一 doctor 与 execute 入口的 deps 新鲜度判定（status 含新增 `main-drift`）。

**git-helper.js** 是统一公共 git 调用入口（safeGit + git + gitQuiet：execFileSync 数组形式不经 shell，统一带 `-c safe.directory=<cwd>` 与 `-C cwd` 前缀、默认 timeout 5s 可覆盖、默认 trim），worktree 链（worktree.js/worktree-apply.js 全部 git 调用）与 run 层（run/shared.js re-export）共用，消除两套实现口径分裂。2026-08-16 补录进 _module-map v2 paths，卡上原「待升 v2 补录 git-helper.js」needs_review 项闭环。

## 对外接口（表格）

### src/worktree.js
| 函数/常量 | 说明 | 参数 |
|-----------|------|------|
| `isGitWorktreeSupported(cwd?)` | 检测当前环境是否支持 git worktree | `cwd?`（默认 process.cwd） |
| `WorktreeManager` (class) | worktree 生命周期管理器 | `constructor({ cwd, worktreeDir? })` |
| `WorktreeManager.getWorktreePath(changeName)` | 获取指定变更的 worktree 路径 | `changeName` |
| `WorktreeManager.getMeta(changeName)` | 读取 worktree 元数据（meta.json） | `changeName` |
| `WorktreeManager.create(changeName, { base? })` | 创建 worktree — 建分支、checkout、fetch+merge、baseline overlay、**依赖供给**、写 meta.json | `changeName, { base? }` |
| `WorktreeManager.list()` | 列出所有 worktree 及其状态 | — |
| `WorktreeManager.cleanup(changeName, { force? })` | 清理 worktree — 删除分支和工作目录；**fail-closed 保护（D-001@v1）：有未落主仓交付变更时返回 `result:'blocked'` 拒绝清理，需显式 `force:true` 绕过**（apply 后自动 cleanup 与 execute reset 内部自动传 force；用户显式清理遇 blocked 按提示先 apply 或 `--force`） | `changeName, { force? }` |
| `WorktreeManager.doctor({ fix?, staleHours?, changeName? })` | 健康检查（含 deps-missing/stale/failed/**deps-main-drift**）+ 可选修复；`changeName` 非空时仅扫该变更（对齐 `enforceDepsGate` 的 `--change` 提示） | `{ fix?, staleHours?, changeName? }` |
| `findMissingDeliverables({ worktreePath, branch, changedFiles })` | execute 阶段级核验（防空跑谎报，D-002@v1）：逐个核验交付文件存在于 worktree 分支 tree（`rev-parse --verify --quiet <branch>:<file>`）或 worktree 工作区，两处皆无 → `missing`；worktree 目录/分支不存在 → `checked:false`（调用方保守提示人工确认）；宽松非阻断，只返回结果由调用方决策 | `{ worktreePath, branch, changedFiles }` |

### src/worktree-apply.js
| 函数/常量 | 说明 | 参数 |
|-----------|------|------|
| `applyWorktree(changeName, { cwd, checkOnly?, merge?, base? })` | 将 worktree 变更应用到主工作区；允许集 = `resolveApplyAllowSet`（design §6 ∪ plan task allowed_paths）；主干**已提交**推进交 `--3way` 自动三路合并；`merge=true` 时先 `preAlignBaselineToMain`（2026-08-16-state-split-fixes #2，D-002@v1：baseline 含 main 已推进并行文件 → merge 前 checkout main 版 + 对齐 commit，消除 baseline vs main 冲突主因；四条件过滤保交付文件/dirty 不受伤，失败降级原 merge），未提交 dirty 拦截引导 commit/stash（判**排除规则下当前是否有未提交 dirty**，非比对启动时 baselineHash——主仓 dirty→clean 后不再死锁）；`merge=true` 显式走 git merge 兜底（D-001）；`base='baseline'` 回退旧锚点（默认 `merge-base`）；apply 文件经 `filterDeliverableFiles` 精细化过滤；dirty 拦截 fail-loud 保留，附加逐文件 cp rescue 指令（返回值新增 additive `rescueCommands`/`deletedFiles`；step3.5 前移 hashMismatch 计算，保 step4.5 拦截时 EXCLUDE-MISMATCH 可用）**+ --3way 冲突列表双源（stderr 解析 ∪ status 探测）** | `changeName, { cwd, checkOnly?, merge?, base? }` |
| `generateRescueCommands({ changedFiles, dirtyFiles, hashMismatchFiles, deletedFiles?, worktreePath, projectRoot })` | dirty 拦截 fail-loud 时逐文件四分类（SAFE-CP / EXCLUDE-DIRTY / EXCLUDE-MISMATCH / DELETE，优先级 DELETE>DIRTY>MISMATCH>CP）生成旁路 git apply 的 cp 指令，返回 {commands,warnings,cpFileCount,excludedCount}；纯函数无 git/fs 副作用 | `{ changedFiles, dirtyFiles:Set\|Array, hashMismatchFiles, deletedFiles?, worktreePath, projectRoot }` |
| `computeRescueDirtyFiles(projectRoot)` | 统一 rescue dirtyFiles 口径（git diff HEAD tracked-modified ∪ ls-files untracked 经 filterDeliverableFiles 过滤，保留 .sillyspec/docs/，DRY 复用）；与 step4.5 触发口径不混用（触发用内联排除 .claude/docs/CLAUDE.md，rescue 用 filterDeliverableFiles 保留 docs/） | `projectRoot` |
| `resolveApplyAllowSet(projectRoot, changeName)` | 解析 apply 允许文件集 = design.md §6 文件变更清单（`keepSillyspecDocs=true`，模块文档 `.sillyspec/docs/` 也进清单——默认 change-list 跳过全部 `.sillyspec/` 会导致模块文档 apply 永远缺清单）∪ 所有 task-*.md 的 allowed_paths（测试/产物文件设计常漏列但 task 已含，union 后不误拦；越界文件仍拦）。EXCLUDE-DIRTY 自动三方合并（坑 apply-dirty-block-no-merge，2026-09-10 驾驭小结第六批③）：mergeDirtyOverlapThreeWay——base=deliverableBase 锚点版 ours=主仓脏版 theirs=worktree 版，git merge-file clean 才写回（两侧并集，mergedDirtyFiles 审计），冲突维持原拦截+rescue（不留半合并现场），checkOnly 只读不试；4.5/5a 拦截口径同步引用合并残余集。变更目录读侧归档回退（坑 apply-archived-evidence-recycled，2026-09-10 驾驭小结第二批①）：活跃 `changes/<name>/` 缺 design.md 而 `changes/archive/<name>/` 在（归档后补 apply 场景——archive 有意保留未 apply worktree 却把变更目录 rename 走）→ design/tasks 从归档目录读（`resolveActiveOrArchiveChangeDir` 内部函数，assess 段 incidental/review 声明豁免集合同口径），allow 集不再恒空误拦整批 | `projectRoot, changeName` |
| `filterDeliverableFiles(files)` | apply 交付物过滤：排除 `.sillyspec/changes/` + `.sillyspec/.runtime/` + `.sillyspec/quicklog/` + `meta.json`，**保留 `.sillyspec/docs/`（dogfood 模块规范文档视为交付物，随变更 apply 回主仓）**。原一刀切排除整个 `.sillyspec/` 导致模块文档滞留 worktree（坑3，exec-g defer 项落地） | `files: string[]` |
| `resolvePatchFiles(changedFiles, allowSet, hasAllowList)` | 确定进 patch 的文件：有清单取「实际变更 ∩ 清单（pathMatches 容差）」，无清单取全部变更——与 classifyAllowListViolations 同口径（glob/多路径 cell 覆盖的具体文件也能进 patch）。原字面 includes 导致 glob 清单覆盖的文件过 manifest 校验却静默丢失（坑 apply-glob-manifest-passes-check-but-not-patch） | `changedFiles, allowSet, hasAllowList` |
| `copyUntrackedEntry(src, dst)` | baseline overlay 复制单个 untracked 条目：目录返回 `skipped-dir` 跳过（不 readFileSync 撞目录 EISDIR），文件复制到 dst（mkdirSync recursive），不存在返回 `missing`（坑 execute-worktree-overlay-untracked-dir-eisdir） | `src, dst` |
| `rollbackApply(projectRoot, trackedFiles, newFiles)` | `--3way` 冲突后回滚工作区到 apply 前状态（checkout HEAD 还原 tracked + 删新建），不留半成品冲突标记 | `projectRoot, trackedFiles, newFiles` |

### src/worktree-deps.js
| 函数/常量 | 说明 | 参数 |
|-----------|------|------|
| `provisionDeps(worktreePath, mainCwd, opts?)` | 依赖供给：junction/symlink 快路径 + install 兜底，返回 deps 状态对象；`force:true` 绕过 lockfile 一致快路径（及 tryLink 幂等短路）强制走 install 分支重装，供 doctor --fix 修主仓 lockfile 漂移 | `worktreePath, mainCwd, { specBase?, timeout?, force? }` |
| `checkDepsFreshness(meta, wtPath, mainCwd)` | H1 统一 deps 判定（doctor 与 execute 入口自检共用）。返回 `{ status, detail, wtHash?, mainHash?, metaLockHash? }`，status ∈ `fresh` / `missing` / `stale` / `main-drift` / `failed`；`main-drift` = worktree 与主仓 lockfile 不一致（主仓更新过、worktree 未跟） | `meta, wtPath, mainCwd` |
| `lockfileHash(dir)` | 取首个命中 lockfile 的 sha256 前 16 位（无则 hash package.json） | `dir` |

## meta.json 依赖字段（provisionDeps 写入）

| 字段 | 取值 | 说明 |
|---|---|---|
| `depsStatus` | linked \| installed \| n/a \| failed \| missing \| stale | 依赖就绪状态 |
| `depsMethod` | junction \| symlink \| install \| null | 供给机制 |
| `depsSource` | main-checkout \| install \| null | 依赖来源 |
| `depsLockHash` | sha16 \| null | 供给时的 lockfile/package.json hash |
| `depsCheckedAt` | ISO8601 | 上次供给时间 |
| `depsError` | string? | 仅 failed 时填 |

execute 验证硬门（`run.js completeStep` execute 分支）读 `depsStatus`：非 `{linked, installed, n/a}` 且非 wave 级 `no_deps_verify` opt-out 时拒绝 `--done`（step 置 `blocked` + exit 1）。

### enforceDepsGate 诊断分支（`run.js`）

门控拒绝（depsStatus 不达标）时区分两种成因，**门核心放行标准 `['linked','installed','n/a']` 不变**（fail-closed），只改提示文案 + fail-loud：

- **worktree 已 cleanup（终态）**：判定基于物理目录 `!existsSync(WorktreeManager.getWorktreePath(changeName))`（非 `!meta`——`getMeta` 对「目录不存在」和「meta 损坏」都返回 null，用 `!meta` 会把后者误判为终态，R3）。终态提示指向 `sillyspec doctor --align-execute-progress --change <name>`（按 plan.md 对齐 execute 派生戳）或 `sillyspec worktree create <change>`（重建 worktree 继续跑）。
- **worktree 存在但 depsStatus 不达标**（`meta` 非空、目录在）：维持原提示 `sillyspec worktree doctor --fix` 重供给。
- **fail-loud 块**：拒绝时 stderr 输出显眼阻断块 `❌ ── deps 门控阻断（本次 --done 未完成，进度未推进）──`，明确标注进度未推进，避免被上一次 `completeStep` 的 stdout 残留掩盖。仅改拒绝侧 stderr，不动成功侧 stdout（D-005@v1）。

## 关键数据流

1. **创建流**: WorktreeManager.create → 验证 changeName → 创建分支 → git worktree add → fetch origin → merge default branch → **baseline overlay** → **provisionDeps（依赖供给）** → 写 meta.json
2. **重入自检流**: execute 入口 → 读 meta → depsStatus 缺失/node_modules 丢失/lockfile 变化 → 触发 provisionDeps 重供给 → 更新 meta
3. **应用流**: applyWorktree → 检查 worktree 存在 → git diff 生成文件列表 → 冲突检测 → 生成补丁 → git apply → 处理未跟踪文件
4. **清理流**: WorktreeManager.cleanup → **fail-closed 保护检查（D-001@v1：有未落主仓交付变更 → 返回 `result:'blocked'` 拒绝清理，需显式 `force:true` 绕过；apply 后自动 cleanup 与 execute reset 内部自动传 force 跳过）** → git worktree remove --force → git branch -D → rmSync 工作目录
5. **健康检查流**: WorktreeManager.doctor → 扫描 meta + 文件系统 → 检出 deps-missing/stale/failed/**deps-main-drift**（+ 孤儿/过期；deps-main-drift 探主仓 lockfile 与 worktree 不一致，靠 H1 `checkDepsFreshness` 统一判定；`--change <名>` 仅扫指定变更）→ --fix 时 `_doctorReprovision` 解链（**失败 fail-loud 阻断，不调 provisionDeps，D-002@v1**）+ `provisionDeps(force=true)` 重供给

## 设计决策（表格）

| 决策 | 原因 | 替代方案 |
|------|------|----------|
| git worktree 而非 git stash/cherry-pick | 物理隔离，支持同时多变更并行 | git stash |
| meta.json 存储元数据（含 depsStatus） | 独立于 git，便于快速查询 | git config |
| sillyspec/ 前缀的分支命名 | 避免与功能分支冲突 | 无前缀 |
| 补丁方式应用（`git apply --3way`）而非 merge（默认） | 保持线性历史，避免合并提交。主干**已提交**推进由 `--3way` 自动三路合并；未提交 dirty 拦截引导 commit/stash（git 危险区）；`--3way` 同区域重叠冲突时回滚干净 + 提示 `apply --merge` 显式兜底（D-002，引合并提交，opt-in） | git merge |
| cleanup 支持 force 参数（`force:true` 绕过 fail-closed 未落主仓保护，D-001@v1） | worktree 可能处于异常状态；有未落主仓交付变更时默认拒绝清理（防清理静默蒸发实现代码），force 显式确认 | 仅允许正常清理 |
| 依赖供给：junction 快路径 + install 兜底 | lockfile 一致时瞬时复用主 checkout 依赖，否则安装 | 每次全量 install / 只 warn |
| 验证硬门（blocked + exit 1） | 依赖未就绪不得声称 verified，靠代码级门保证 | prompt 软约束（已证失效） |

## 依赖关系
- 内部依赖：src/worktree.js（worktree-apply.js 导入 WorktreeManager；create/doctor 导入 worktree-deps.js 的 provisionDeps）、src/change-list.js（worktree-apply.js 导入 parseFileChangeList）、src/git-helper.js（git/gitQuiet 公共入口，worktree.js/worktree-apply.js 全部 git 调用收口于此）
- 外部依赖：child_process（execFileSync，经 src/git-helper.js 公共入口数组形式不经 shell）、fs、path、os（tmpdir）、crypto（createHash）

## 注意事项
- isGitWorktreeSupported 通过 `git worktree list` 检测支持性，需要在 git 仓库中调用
- create 方法会自动 fetch origin 并尝试 ff-only merge 默认分支，然后 baseline overlay + 依赖供给
- applyWorktree 在冲突时会报告冲突文件列表但不自动解决
- worktree 目录位于 `.sillyspec/.runtime/worktrees/`，需在 .gitignore 中配置
- cleanup 会强制删除 worktree 和对应分支，操作不可逆
- **cleanup fail-closed 与 force 调用点契约（D-001/D-006@v1）**：清理（junction 解链 + `git worktree remove --force`）前经 `hasUnappliedChanges` 检查未落主仓交付变更（判定 main HEAD byte-identical；`git apply --3way` 不 commit → apply 后仍判 true），命中即返回 `result:'blocked'` 拒绝清理并打印未落地文件清单与指引。**force 调用点契约**：apply 后自动 cleanup（worktree-apply.js 三处）与 execute reset（run/command.js resetStage）显式传 `force:true` 绕过（apply 已把代码落主仓、reset 语义即放弃 worktree）；用户显式 `sillyspec worktree cleanup <name>` 与 doctor --fix 清理过期 worktree 遇 blocked 时打印指引（先 `sillyspec worktree apply <name>` 或 commit 到分支，或显式 `--force`）。in-place / native-worktree 由 hasUnappliedChanges 内部返回 hasChanges:false 自然跳过保护，零回归
- **cleanup 不威胁 execute-runs / stage-reviews**（坑 execute-runs-isolation，方案 A）：drift 场景（agent cd worktree 跑 plan/execute/verify/archive）下，`.runtime` 根经 `resolveRuntimeRoot` + `platformOpts.specDriftAnchor` 锚定主仓，execute-runs / stage-reviews 从落盘起即在主仓 `.sillyspec/.runtime/`；cleanup（`rmSync(worktreePath, {recursive:true, force:true})` 整目录删 worktree 物理目录）物理上碰不到 → archive step1 完成度 gate 真相源（磁盘主仓 review.json）不再丢。`src/worktree.js` 的 9 处 cleanup 调用点 + `rmSync` 全无需改（方案 A 堵源头 runtimeRoot 解析，非下游 salvage）
- 依赖供给失败不阻断 create（只记 meta.depsStatus=failed），但 execute 验证硬门会阻断 --done
- **git 调用收口 src/git-helper.js**（2026-08-09-worktree-git-injection）：worktree.js（原 51 处本地 git()/gitQuiet() helper，`execSync(\`git ${args}\`)` 字符串拼接经 shell）+ worktree-apply.js（原 26 处）的 git 调用全部删本地实现、import 公共入口 src/git-helper.js（safeGit+git+gitQuiet，execFileSync 数组形式不经 shell）；调用点字符串拼接改数组（文件列表 `files.join(' ')` → `...files` 展开为独立 argv 元素），消除命令注入（文件名含 `;`/`$()` 经 shell 在用户机 RCE）+ 空格拆词（文件名含空格被 shell 切词致 apply 漏文件，Windows 用户目录常见）；二进制 diff/commit 保留 Buffer/env 语义用裸 execFileSync 数组形式（合理例外，注入面已消除）

## 变更索引

见 `worktree.changelog.md`——历史条目已迁出；新条目直接追加 sidecar，勿写回本卡。
