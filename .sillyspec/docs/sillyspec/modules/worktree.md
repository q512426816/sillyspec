---
author: qinyi
created_at: 2026-06-01T09:05:00
---

# worktree
> 最后更新：2026-08-07
> 最近变更：2026-08-06-execute-runs-isolation（drift 守卫补设 `platformOpts.specDriftAnchor` + 抽 `resolveRuntimeRoot` 统一 `.runtime` 根解析 15 站点；drift 场景 execute-runs/stage-reviews 落主仓 `.runtime`，cleanup 整目录删 worktree 碰不到，archive step1 完成度 gate 不再因丢 review.json 阻断）/ 2026-08-05-tooling-feedback-fixes（doctor 加 `deps-main-drift` issue 探主仓 lockfile 漂移 + `--change` 过滤 + `--fix` force 重装；provisionDeps 加 `force` 选项；抽 H1 `checkDepsFreshness` 统一 doctor 与 execute 的 deps 判定）
> 模块路径：src/worktree.js, src/worktree-apply.js, src/worktree-deps.js

## 职责
Git worktree 的创建、管理、变更应用与依赖供给 — 为 SillySpec 提供隔离且立即可构建的开发环境。

## 当前设计

worktree 模块提供基于 git worktree 的分支隔离机制，让每个变更在独立的工作树中开发，避免主工作区被污染。由三个文件组成：

**worktree.js** 核心是 `WorktreeManager` 类，管理 worktree 的完整生命周期。worktree 存放在 `.sillyspec/.runtime/worktrees/<change-name>/` 目录下，每个 worktree 对应一个 `sillyspec/<name>` 格式的分支。WorktreeManager 提供创建（create）、列出（list）、清理（cleanup）、查询元数据（getMeta）、健康检查（doctor）等操作。每个 worktree 附带一个 meta.json 文件记录分支名、基础提交、创建时间、依赖供给状态等元信息。

**worktree-apply.js** 提供 `applyWorktree()` 函数，负责将 worktree 中的变更安全地应用回主工作区。它执行冲突检测（检查主工作区和 worktree 是否修改了相同文件），支持仅检查模式（checkOnly）和实际应用模式。应用时使用 `git diff` 生成补丁并通过 `git apply` 应用。

**worktree-deps.js** 提供 `provisionDeps()` 依赖供给引擎。在 `create()` 的 baseline overlay 之后调用，让 worktree 立即可构建/测试：lockfile 一致时 junction/symlink 主 checkout 的 node_modules（瞬时零网络），否则按 `local.yaml` 的 `project.type` + lockfile 推断并执行 install。供给结果（depsStatus 等）写入 meta.json，供 execute 阶段的验证硬门读取。供给可失败，但失败状态可观测、可由 doctor 重试（doctor --fix 走 `_doctorReprovision`：先解 node_modules junction 再 `provisionDeps(force=true)` 强制重供，绕过 tryLink 幂等短路，修 deps-main-drift 等主仓 lockfile 漂移场景）。另导出 H1 `checkDepsFreshness(meta, wtPath, mainCwd)`，统一 doctor 与 execute 入口的 deps 新鲜度判定（status 含新增 `main-drift`）。

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
| `WorktreeManager.cleanup(changeName)` | 清理 worktree — 删除分支和工作目录 | `changeName` |
| `WorktreeManager.doctor({ fix?, staleHours?, changeName? })` | 健康检查（含 deps-missing/stale/failed/**deps-main-drift**）+ 可选修复；`changeName` 非空时仅扫该变更（对齐 `enforceDepsGate` 的 `--change` 提示） | `{ fix?, staleHours?, changeName? }` |

### src/worktree-apply.js
| 函数/常量 | 说明 | 参数 |
|-----------|------|------|
| `applyWorktree(changeName, { cwd, checkOnly?, merge? })` | 将 worktree 变更应用到主工作区；允许集 = `resolveApplyAllowSet`（design §6 ∪ plan task allowed_paths）；主干**已提交**推进交 `--3way` 自动三路合并，未提交 dirty 拦截引导 commit/stash（判**排除规则下当前是否有未提交 dirty**，非比对启动时 baselineHash——主仓 dirty→clean 后不再死锁）；`merge=true` 显式走 git merge 兜底（D-001）；apply 文件经 `filterDeliverableFiles` 精细化过滤 | `changeName, { cwd, checkOnly?, merge? }` |
| `resolveApplyAllowSet(projectRoot, changeName)` | 解析 apply 允许文件集 = design.md §6 文件变更清单（`keepSillyspecDocs=true`，模块文档 `.sillyspec/docs/` 也进清单——默认 change-list 跳过全部 `.sillyspec/` 会导致模块文档 apply 永远缺清单）∪ 所有 task-*.md 的 allowed_paths（测试/产物文件设计常漏列但 task 已含，union 后不误拦；越界文件仍拦） | `projectRoot, changeName` |
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
4. **清理流**: WorktreeManager.cleanup → git worktree remove --force → git branch -D → rmSync 工作目录
5. **健康检查流**: WorktreeManager.doctor → 扫描 meta + 文件系统 → 检出 deps-missing/stale/failed/**deps-main-drift**（+ 孤儿/过期；deps-main-drift 探主仓 lockfile 与 worktree 不一致，靠 H1 `checkDepsFreshness` 统一判定；`--change <名>` 仅扫指定变更）→ --fix 时 `_doctorReprovision` 解链 + `provisionDeps(force=true)` 重供给

## 设计决策（表格）

| 决策 | 原因 | 替代方案 |
|------|------|----------|
| git worktree 而非 git stash/cherry-pick | 物理隔离，支持同时多变更并行 | git stash |
| meta.json 存储元数据（含 depsStatus） | 独立于 git，便于快速查询 | git config |
| sillyspec/ 前缀的分支命名 | 避免与功能分支冲突 | 无前缀 |
| 补丁方式应用（`git apply --3way`）而非 merge（默认） | 保持线性历史，避免合并提交。主干**已提交**推进由 `--3way` 自动三路合并；未提交 dirty 拦截引导 commit/stash（git 危险区）；`--3way` 同区域重叠冲突时回滚干净 + 提示 `apply --merge` 显式兜底（D-002，引合并提交，opt-in） | git merge |
| cleanup 支持 force 参数 | worktree 可能处于异常状态 | 仅允许正常清理 |
| 依赖供给：junction 快路径 + install 兜底 | lockfile 一致时瞬时复用主 checkout 依赖，否则安装 | 每次全量 install / 只 warn |
| 验证硬门（blocked + exit 1） | 依赖未就绪不得声称 verified，靠代码级门保证 | prompt 软约束（已证失效） |

## 依赖关系
- 内部依赖：src/worktree.js（worktree-apply.js 导入 WorktreeManager；create/doctor 导入 worktree-deps.js 的 provisionDeps）、src/change-list.js（worktree-apply.js 导入 parseFileChangeList）
- 外部依赖：child_process（execSync）、fs、path、os（tmpdir）、crypto（createHash）

## 注意事项
- isGitWorktreeSupported 通过 `git worktree list` 检测支持性，需要在 git 仓库中调用
- create 方法会自动 fetch origin 并尝试 ff-only merge 默认分支，然后 baseline overlay + 依赖供给
- applyWorktree 在冲突时会报告冲突文件列表但不自动解决
- worktree 目录位于 `.sillyspec/.runtime/worktrees/`，需在 .gitignore 中配置
- cleanup 会强制删除 worktree 和对应分支，操作不可逆
- **cleanup 不威胁 execute-runs / stage-reviews**（坑 execute-runs-isolation，方案 A）：drift 场景（agent cd worktree 跑 plan/execute/verify/archive）下，`.runtime` 根经 `resolveRuntimeRoot` + `platformOpts.specDriftAnchor` 锚定主仓，execute-runs / stage-reviews 从落盘起即在主仓 `.sillyspec/.runtime/`；cleanup（`rmSync(worktreePath, {recursive:true, force:true})` 整目录删 worktree 物理目录）物理上碰不到 → archive step1 完成度 gate 真相源（磁盘主仓 review.json）不再丢。`src/worktree.js` 的 9 处 cleanup 调用点 + `rmSync` 全无需改（方案 A 堵源头 runtimeRoot 解析，非下游 salvage）
- 依赖供给失败不阻断 create（只记 meta.depsStatus=failed），但 execute 验证硬门会阻断 --done

## 变更索引
| 日期 | 变更名 | 摘要 |
|------|--------|------|
| 2026-06-28 | 2026-06-28-worktree-deps-provision | 依赖供给 provisionDeps + execute 验证硬门 + doctor deps 检查；修路径/分支前缀脱节 |
| 2026-08-04 | ql-20260804-005-83d8 | execute 复盘 c：apply 允许集改为 resolveApplyAllowSet（design §6 ∪ plan task allowed_paths），测试/产物文件不再误拦，越界文件仍拦 |
| 2026-08-06 | ql-20260806-002-c4dd | exec-f：worktree-deps detectProjectType/inferInstallCommand 加 python 分支（pyproject.toml/uv.lock→uv sync，纯 requirements.txt→pip install -r），治 worktree 内 ruff/pre-commit 等二进制不供给（原无 python 分支→误判 generic→n/a）；两函数导出做纯单元测 7 断言（不真跑 uv） |
| 2026-08-05 | 2026-08-05-tooling-feedback-fixes | doctor 加 `deps-main-drift` issue（探主仓 lockfile 漂移，靠 H1 `checkDepsFreshness`）+ `--change` 过滤 flag + `--fix` force 重装（`_doctorReprovision` 解链 + `provisionDeps(force=true)`）；`provisionDeps` 加 `force` 选项；抽 H1 `checkDepsFreshness` 统一 doctor 与 execute 入口 deps 判定 |
| 2026-08-06 | 2026-08-06-execute-runs-isolation | execute-runs/stage-reviews 与 worktree 生命周期解耦：drift 守卫补设 `platformOpts.specDriftAnchor` + 抽 `resolveRuntimeRoot`（`run/shared.js`）统一 `.runtime` 根解析（15 站点三级优先级 runtimeRoot > specDriftAnchor > 本地）；drift 场景落主仓 `.runtime`，cleanup 整目录删 worktree 不再吃 review.json，archive step1 完成度 gate 不阻断。9 处 cleanup 调用点 + rmSync 全不改（方案 A 堵源头） |
| 2026-08-07 | ql-20260807-010-9897 | apply gate 两 bug 修复：① baseline gate 改判「排除规则下当前未提交 dirty」——原比对 meta.baselineHash，execute 启动时主仓 dirty、期间 commit 变 clean 后 hash 必变 → 永久死锁须手改 meta；② `resolveApplyAllowSet` 传 `keepSillyspecDocs=true`，模块文档 `.sillyspec/docs/` 经 design §6 清单即可覆盖——原 change-list 跳过全部 `.sillyspec/`（蓝图基础设施），与 `filterDeliverableFiles` 保留 `.sillyspec/docs/`（交付物）语义打架致模块文档永远缺清单 |
