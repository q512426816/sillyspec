# 设计文档（Design）— SillySpec 跨仓 task 支持（MultiRepoContext）

---
scale: large
risk_level: unit-sufficient
author: qinyi
created_at: 2026-08-11T22:30:00+08:00
related_change: []
---

## 1. 背景

SillySpec 当前完全假设**单 git 仓**——一个 change 的所有 task 都改当前仓（主仓）代码。但实际 dogfood 场景（sillyhub 项目，multi-agent-platform 仓）出现**跨仓 task**：一个 change 里 task-09/10 改的是另一个 git 仓（sillyspec 仓）的 `src/`。

现状下，跨仓 task 在 5 个环节全部受阻（已逐点源码实证，见 `docs/sillyspec/prompt-control-debt.md` 2026-08-11 cc-① 条目 + 架构评审子代理报告）：

1. **task review 伪造校验**：`verifyReviewGitEvidence`（`task-review.js:495-567`）强制 base/head 必须是当前仓（主仓）真实 commit、changedFiles 必须与主仓 git diff 相交。跨仓 task 的 commit 在 sillyspec 仓，主仓 `git` 查不到 → 判伪造阻断。
2. **apply 一刀切排除**：`filterDeliverableFiles`（`worktree-apply.js:39-46`）排除 `.sillyspec/changes` 等，但跨仓 task 的代码改动本就在跨仓仓，apply 主流程只认主仓 worktree → 跨仓改动无法 apply。
3. **apply 清单 union**：`resolveApplyAllowSet`（`worktree-apply.js:198-207`）无 repo 维度，跨仓 task 的 allowed_paths（指向跨仓仓路径）与主仓清单混在一起。
4. **verify 测试对账**：`runVerifyTestCheck`（`verify-postcheck.js:481-531`）在主仓 cwd 跑 `npm test`，跨仓 task 改的跨仓仓测试跑不到。
5. **pathOwners 冲突误判**：`plan-postcheck.js:284-321` 按 path 聚合，跨仓 task 的 `src/foo.js` 与主仓同名路径会被误判为同 Wave 冲突。

workaround 是 `base=head 主仓空 commit + changedFiles=[] 空数组走 WARNING`——但这是逃避校验，不是真正支持。

**7 个单仓假设点（A1-A7）**（架构评审子代理定位，每处独立用 `wm.getMeta(changeName)` 推 gitDir/diffBase，互不感知）：

| 点 | 位置 | 当前单仓逻辑 |
|---|---|---|
| A1 | `task-review.js:495-567` | `verifyReviewGitEvidence(review, gitDir)` 单 gitDir |
| A2 | `task-review.js:687-785` | `generateTaskReviewDrafts` 单仓取 diff/base/head |
| A3 | `worktree-apply.js:259-281` | `git(worktreePath, ['diff', diffBase])` 单 worktree |
| A4 | `worktree-apply.js:198-207` | `resolveApplyAllowSet` 无 repo 维度 |
| A5 | `worktree-apply.js:428-515` | 单 patch → `git apply --3way` 到 projectRoot |
| A6 | `verify-postcheck.js:481-531` | `resolveVerifyChangedFiles` 单仓 + 单 cwd 跑测试 |
| A7 | `task-review.js:192-198` | review.json base/head 隐含主仓 gitDir |

## 2. 设计目标

- **GOAL-1**：跨仓 task（task 卡片声明 `repo: <key>`）的 review/apply/verify 全链路多仓化，不再依赖 base=head 空 commit workaround。
- **GOAL-2**：单仓 change（所有 task 无 `repo:`）**零行为变化**——7 点全走原路径，回归风险隔离到跨仓分支。
- **GOAL-3**：数据所有权正确——跨仓 task 的代码改动由子代理直接 commit 到跨仓仓主干（不进主仓，跨仓 apply=no-op 见 D-009），review.json 主仓统一存（不侵入跨仓仓建进度库）。
- **GOAL-4**：确定性 fail-closed——未注册 repo、跨仓仓 git 不可用等异常显式阻断，不静默降级（符合 SillySpec 确定性校验定位）。
- **GOAL-5**：dogfood 自洽——本变更用 SillySpec 改 SillySpec 自身时能跑通流程。**注意（Blocker 3 修订）**：dogfood 验证不使用「主仓=sillyspec，跨仓 task 改 sillyspec」自指场景（主仓与跨仓仓物理同一会致 MultiRepoContext/pathOwners/apply 语义崩溃，见 R-08）。dogfood 改本仓代码的部分全走**单仓 task**（无 repo:）；跨仓链路的端到端验证改用 **multi-agent-platform（主仓）↔ sillyspec（跨仓）真实跨仓场景**（与 background §1 sillyhub 痛点对齐），在 multi-agent-platform 仓建 change 验证。

## 3. 非目标（Non-Goals）

- **NG-1**：不做跨仓仓进度库侵入（review.json / execute-runs 全主仓存，跨仓仓不建 `.sillyspec/`）。
- **NG-2**：不做 MCP 派发层复用（`sillyhub-path-a-contract.md` 路径A 是 worker 派发，与本地多仓 task 正交，两子系统互不影响）。
- **NG-3**：不做跨仓仓的 worktree 嵌套（跨仓 task 在跨仓仓主干工作，不再为主仓 worktree 下的跨仓 task 建二级 worktree）。
- **NG-4**：不做跨仓仓的进度同步（跨仓仓的 git commit 由 task 本身负责，SillySpec 不 sync 跨仓仓的 sillyspec.db）。
- **NG-5**：不做 gen:types worktree 友好性（`gen-api-types.mjs` 在 multi-agent-platform consumer 侧，非本仓，见债单 cc-③）。
- **NG-6**：不做混合存储（摘要主仓 + 详文跨仓，过度设计）。

## 4. 拆分判断

不拆分、不走批量。理由：跨仓支持是一个 **cohesive 功能**（MultiRepoContext 一个抽象贯穿 review/apply/verify），7 个假设点（A1-A7）共享同一个 context，拆开做会导致 context 接口反复变。规模 = large（跨 4+ 模块：stages/runtime/worktree/task-review/verify-postcheck/gates/plan-postcheck，task 协议 + CLI git 探测 + 多仓对账 + apply 分级，架构级）。

## 5. 总体方案（方案 B：MultiRepoContext 运行时多仓执行上下文）

### 5.1 核心抽象：MultiRepoContext

execute 启动时构造一个 `MultiRepoContext`，扫所有 task 卡片的 `repo:` 字段，查 `local.yaml` 的 `repos:` 注册表，建立映射：

```
Map<repoKey, {
  gitDir,          // 该 repo 的 git 工作目录（主仓=worktreePath/cwd；跨仓仓=跨仓仓根）
  worktreePath,    // 子代理工作目录（主仓=主仓 worktree；跨仓仓=跨仓仓根）
  base,            // diff 锚点（主仓=meta.baseHash；跨仓仓=实时 git rev-parse）
  head,            // 当前 HEAD（主仓=meta 或 worktree HEAD；跨仓仓=实时 git rev-parse HEAD）
  projectRoot,     // apply 目标根（主仓=主仓根；跨仓仓=跨仓仓根）
  isMain           // 是否主仓（决定 base/head 来源 + apply 路径）
}>
```

7 个假设点（A1-A7）每处把硬编码的 `wm.getMeta(changeName)` / `cwd` / `meta.worktreePath` 换成 `ctx.resolve(task.repo ?? 'main').xxx`。**单仓 change 时 context 退化为 `{main: {...}}` 单值 map，7 点全走原路径，零行为变化**。

### 5.2 复用既有抽象

- `worktree.js:260-283` `_resolveMainRepoRoot()`：已用 `--git-common-dir` 探测主仓根（跨 worktree 单跳）。MultiRepoContext 是其多仓泛化。
- `run/shared.js:124-151` `ancestorSpecDirs`：祖先链枚举 .sillyspec（monorepo），与跨仓无关（跨仓是平行独立 git 仓，无祖先关系）。
- `stages/plan-postcheck.js:68-81` `parseAllowedPaths`：task 卡片解析唯一入口，被 3 处复用。`repo:` 字段解析加在同源（frontmatter），避免三处漂移。

### 5.3 三个落地约束（决定可靠性，必须同批做）

**约束① 跨仓 repo 的 head 实时取 git + base/head 双锡点**
现有「meta.json 为权威」不变式（`task-review.js:433`、`verify-postcheck.js:449` 注释）只对主仓 worktree 成立。跨仓仓无 `.sillyspec/`，meta.json 不存在。`ctx.resolve(repo).resolveHead()` 用于 CLI 在**派发 task 前 / 回收 review 前**实时 `git -C <crossRepoPath> rev-parse HEAD` 取，落盘为 task 卡片锡点（base_commit / head_commit）；task review 的 base/head 读锡点（非每次 resolve 的瞬时 HEAD）。

**base+head 双锡点（解决 Blocker 2 + 复审 head 精度）**：跨仓仓同 Wave 多 task 改同一仓时，HEAD 会推进，必须为每 task 记录 task-local base 与 head。机制：
- task 卡片 frontmatter 加可选 `base_commit: <hash>` + `head_commit: <hash>` 字段
- CLI 在**派发该 task 的子代理启动前**，实时 `git -C <crossRepo> rev-parse HEAD` 落盘到 `base_commit`（子代理在此 HEAD 之上改+commit）
- 子代理完成 commit 后，**CLI 在回收 review 前**，实时 `git -C <crossRepo> rev-parse HEAD` 落盘到 `head_commit`（锁定该 task 的结束 commit，不用 review 写入时的瞬时 HEAD——避免并行同 Wave 同跨仓不同文件 task 的 head 含他 task 改动）
- task review 的 `base` = task 卡 `base_commit`，`head` = task 卡 `head_commit`（两者都是 CLI 锡点快照，子代理不改）
- 每 task diff 范围 base..head 由锡点锚定（非瞬时 HEAD），**显著缩小**并行同 Wave 同跨仓不同文件 task 之间的 head 竞态窗。注：极端情况下（同 Wave 两跨仓 task 都 commit 后才回收 review），后回收 task 的 head 仍可能含先 commit task 的改动——此竞态由 gate 的 changedFiles 相交校验宽松兜底（review.changedFiles 与 diff 相交即过），功能不崩但 diff 范围非严格「仅本 task」，属可接受精度（复审 head 精度已诚实标注）
- 主仓 task 不需要锡点（主仓 worktree 有 meta.baseHash 作为统一 base，head 取 worktree HEAD，单仓不变式不变）

否则跨仓 task 的 `verifyReviewGitEvidence` 会拿漂移的 base/head 去跑 diff → 跨 task 误判 diff 范围（base 漂移）或混入他 task 改动（head 漂移）。

**约束② `local.yaml repos:` 未注册的 `repo:` 必须 fail-closed 阻断 execute**
跨仓仓 git 不可用、未注册 repo 均为**配置错误**，必须 fail-closed 阻断（**不沿用主仓 `verifyReviewGitEvidence` 的 unavailable 降级**——`task-review.js:500-510` git 不可用返回 ok:true+unavailable 让调用方降级，那是主仓环境缺失的容错；跨仓仓不可用是用户 local.yaml 配置错，性质不同）。MultiRepoContext 构造时校验：task 卡片声明 `repo: foo` 但 `local.yaml repos:` 无 `foo:` 键 → 抛错 + 列出已注册 repo，阻断 execute 启动。与现有 fail-closed 范式对齐（`task-review.js:517` base 非真实 commit 判伪造、`gates.js:89-100` deps gate 阻断）。

**约束③ `plan-postcheck.pathOwners` 冲突检测按 (repo, path) 二元组聚合 + design §6 按仓分段**
当前按 path 聚合（`plan-postcheck.js:284-321`），跨仓后 `src/task-review.js` 在主仓和 sillyspec 仓都是合法路径 → 误判同 Wave 冲突。改为 `Map<repo + '|' + path, owners>`。同时 `validateDesignFileCoverage`（`:536-583`）让 design.md §6 支持按仓分段（如 `## sillyspec 仓变更` 子段）或允许跨仓 task 的 allowed_paths 豁免主仓 design 对账——否则跨仓文件永远报「未覆盖」阻断 plan。

### 5.4 数据流

```
plan 阶段: task 卡片 frontmatter 写 repo: sillyspec + allowed_paths 指向跨仓仓路径（相对跨仓仓根）
    ↓ (约束③: pathOwners 按 repo 聚合 + design §6 分段)
execute 启动: MultiRepoContext 构造 (扫 task repo: + 查 local.yaml repos)
    ↓ (约束②: 未注册/跨仓git不可用 fail-closed 阻断，不降级)
Wave 执行（关键：buildWavePrompt 按 task 逐个派发，各传 workdir）:
    主仓 task → 子代理 workdir=主仓 worktreePath（改主仓 worktree）
    跨仓 task → CLI 先 git -C <跨仓> rev-parse HEAD 落 task 卡片 base_commit（base 锡点，约束①）
             → 子代理 workdir=跨仓仓根（直接改跨仓仓主干工作区 + commit 到跨仓仓主干）
    ↓ (跨仓 task 不经主仓 worktree，NG-3)
task review: review.json 带 repo:sillyspec + base=task卡base_commit + head=task卡head_commit（CLI 回收 review 前落盘锡点，非瞬时 HEAD） (存主仓 execute-runs)
    ↓ (verifyReviewGitEvidence 按 repo 切 gitDir 到跨仓仓根校验)
execute --done: Task Review Gate 校验 (review 主仓统一存，base..head diff 在跨仓仓根跑)
    ↓
apply（G1 定机制：跨仓 apply = no-op）:
    主仓 task → 原有 A5 apply（worktree patch → git apply --3way → 主仓主干 + wm.cleanup 主仓 worktree）
    跨仓 task → no-op（跨仓 commit 已由子代理直接落跨仓主干，apply 只校验 review.head 是跨仓仓真实 commit + 跳过 wm.cleanup）
    ↓ (GOAL-3: 跨仓改动已在跨仓主干，不进主仓)
verify: 主仓 npm test + 跨仓仓 npm test (per-repo cwd, 无 package.json 跳过 warn; 跨仓仓不参与 module 子集策略)
```

**G1 跨仓 apply = no-op 的依据（Blocker 1 解）**：`applyWorktree`（`worktree-apply.js:223-535`）整套深度耦合主仓 worktree 模型（:226 wm.getMeta 取 worktreePath/baseHash → :261 worktreePath 跑 diff → :443 worktreePath 取 blob → :501 projectRoot 跑 git apply --3way → :521 wm.cleanup）。跨仓仓**无 worktree**（NG-3）、**无 meta.json**（NG-1）、**无 sillyspec/<change> 分支**（worktree.js:313 create 才建）——跨仓仓工作区 = 跨仓仓主干工作区，子代理直接在其上改+commit，commit 已落主干，apply 无 patch 可打。强行复用 A5 patch apply 会因无 worktreePath/meta 而崩。故跨仓 apply 只做：校验 review.head 是跨仓仓真实 commit（约束①+②保险）+ 跳过 wm.cleanup（无主仓 worktree 可清）。主仓 task 仍走完整 A5。

## 6. 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 新增 | `src/run/multi-repo-context.js` | MultiRepoContext 核心模块。**数据流**：producer=`local.yaml repos:` 段（仓路径注册表）+ task 卡片 `repo:` 字段（经 parseRepo 解析）→ MultiRepoContext 构造（查表 + 实时 git rev-parse 跨仓 HEAD）→ consumer=task-review/worktree-apply/verify-postcheck/gates 经 `ctx.resolve(repo)` 取 gitDir/base/head/projectRoot。含约束② fail-closed 校验（未注册 repo 抛错）。 |
| 修改 | `src/stages/plan-postcheck.js` | 新增 `parseRepo(content)` 解析 task 卡片 frontmatter `repo:` 字段 + `parseBaseCommit(content)` 解析 `base_commit`（CLI 锡点写入字段，与 parseAllowedPaths 同源 frontmatter 正则）。**数据流**：producer=task-NN.md frontmatter `repo:`/`base_commit` → parseRepo/parseBaseCommit → consumer=MultiRepoContext 构造 + pathOwners 冲突检测 + task review base 锡点。`pathOwners`（:284-321）改按 `(repo, path)` 二元组聚合（约束③，dogfood 自指场景下 repo 不同但物理同路径仍判冲突 → 故 dogfood 不自指，见 GOAL-5 修订）。`validateDesignFileCoverage`（:536-583）支持 design §6 按仓分段（选定 markdown 段头格式 `## <repo> 仓变更`，约束③ G3 定）。 |
| 修改 | `src/task-review.js` | A1: `verifyReviewGitEvidence`（:495-567）签名加 `repo`，gitDir 查 `ctx.resolve(review.repo ?? 'main').gitDir`（约束①跨仓 gitDir=跨仓仓根）。A2: `generateTaskReviewDrafts`（:687-785）跨仓 task 的 base 取 task 卡片 `base_commit`、head 取 task 卡片 `head_commit`（双锡点，CLI 派发/回收时落盘）。A7: `validateReviewSchema`（:192-198）加 `review.repo` 可选字段校验（缺省='main'）。`validateTaskReviews`（:385-400）循环内按 review.repo 选 gitDir。**数据流**：producer=review.json `repo`+`base`(=task卡base_commit)+`head`(=task卡head_commit)+task卡片双锡点 → validateReviewSchema → verifyReviewGitEvidence 按 repo 切 gitDir → consumer=git rev-parse/diff 在正确仓跑。 |
| 修改 | `src/worktree-apply.js` | A3/A4: 主流程（:223-535）按 ctx 区分主仓/跨仓（非 per-repo for 循环——G1 定机制后跨仓 apply=no-op，不存在「跨仓 patch」）。A4: `resolveApplyAllowSet`（:198-207）返回 `Map<repo, Set<path>>`（按 repo 切片，allowed_paths 基准=各 repo 自身根）。A5: 主仓 task 走原 apply（worktree→main）；**跨仓 task = no-op**（G1：校验 review.head 是跨仓真实 commit + 跳过 wm.cleanup，无 patch 可打——跨仓 commit 已落主干）。`filterDeliverableFiles`（:39-46）逻辑不变（跨仓交付物是跨仓仓源码不经主仓 apply）。**数据流**：producer=ctx（main entry 有 worktreePath/meta；跨仓 entry 无）→ 主仓 A5 patch apply / 跨仓 no-op → consumer=主仓主干（跨仓主干已由子代理 commit）。 |
| 修改 | `src/verify-postcheck.js` | A6: `resolveVerifyChangedFiles`（:443-462）走 context，per-repo 取 diff 合并。`runVerifyTestCheck`（:481-531）per-repo cwd：跨仓仓有 package.json 则在该仓 cwd 跑 `npm test`（决策④），无则跳过 + warn；**跨仓仓只跑 full npm test，不参与 module 子集策略**（module 配置主仓强相关，跨仓仓无 module 映射）。**数据流**：producer=ctx.repos（每 repo projectRoot + package.json 探测）→ per-repo cwd → consumer=`npm test` 在跨仓仓根跑。 |
| 修改 | `src/run/gates.js` | `reviewGitDir`（:358-366）改 `ctx.resolve('main').gitDir` 兜底（对齐 in-place-fallback：meta.mode='in-place-fallback' 时 worktreePath 空 → 用 cwd，与 task-review.js:724 同源）；Task Review Gate 每 task 按 review.repo 切 gitDir。`runVerifyTestCheck` 调用点（:223）透传 context。 |
| 修改 | `src/stages/execute.js` | **buildWavePrompt 架构改造（Blocker：单 worktreePath → per-task workdir）**：当前 `buildWavePrompt(wave, waveIndex, changeDir, worktreePath, options)`（:466）单 Wave 接收一个 worktreePath，:571 注入 Wave 内所有子代理。改为**按 task 逐个构造 Task 调用**：主仓 task 传 workdir=主仓 worktreePath，跨仓 task 传 workdir=跨仓仓根。**约束：同 Wave 内允许主仓+跨仓 task 混合**（各 task 独立 Task 调用各传 workdir，不强制同 Wave 同 repo）。跨仓 task 派发前 CLI 先落 base_commit 锡点（约束①）。prompt 注入「该 task 改的是 `<repo>` 仓，workdir=`<crossRepoPath>`，直接改+commit 到该仓主干（不经 worktree）」。 |
| 修改 | `src/run/shared.js` / `src/index.js` | execute 启动入口构造 MultiRepoContext（进程级，贯穿 execute/apply/verify，不重建——G2 定）并透传调用链。local.yaml 加 `repos:` 段 schema 读取。 |
| 新增 | `test/multi-repo-context.test.mjs` | MultiRepoContext 单测：单仓退化零行为 / 跨仓注册表查表 / 未注册+跨仓git不可用 fail-closed / 跨仓 head 实时取 git / 进程级缓存 / in-place-fallback 主仓 worktreePath 兜底 cwd。 |
| 新增 | `test/cross-repo-task-review.test.mjs` | A1/A2/A7 集成测：跨仓 task review.json schema + verifyReviewGitEvidence 跨仓 gitDir + draft 落盘 + base_commit 锡点（同 Wave 多 task 改同跨仓仓 diff 不漂移）。 |
| 新增 | `test/cross-repo-apply.test.mjs` | A3/A4/A5 集成测：主仓 task 原 apply路径 / 跨仓 task apply=no-op（校验 head 真实 commit + 不 cleanup）/ resolveApplyAllowSet Map<repo,Set> / 单仓零回归。 |
| 新增 | `test/cross-repo-verify.test.mjs` | A6 集成测：跨仓仓 npm test per-repo cwd / 无 package.json 跳过 warn / 跨仓不参与 module 子集。 |
| 新增 | `test/parse-repo.test.mjs` | task-02 衍生单测：parseRepo/parseBaseCommit/parseHeadCommit/parseRepoRegistry（frontmatter 标量 + local.yaml repos 段解析，向后兼容）。 |
| 新增 | `test/plan-postcheck-cross-repo.test.mjs` | task-03 衍生测：pathOwners (repo,path) 二元组跨仓同名路径不误判冲突 + 单仓零回归 + 三仓混合。 |
| 新增 | `test/multi-repo-context-entry.test.mjs` | task-09 衍生测：execute 入口 aggregateDeclaredRepos + getOrCreateMultiRepoContext 进程级工厂 + fail-closed + ctx 透传签名 + 端到端构造。 |
| 修改 | `test/design-coverage.test.mjs` | task-03 衍生测：validateDesignFileCoverage 识别 design §6 按仓分段段头 `## <repo> 仓变更` + 跨仓文件未覆盖报错 + 二元组隔离同名文件 + 无段头退化零回归。 |
| 修改 | `docs/sillyspec/file-lifecycle.md` | 同步：task 卡片 `repo:` 字段 / local.yaml `repos:` 段 / MultiRepoContext 运行时 / 跨仓 task review.json 路径。 |
| 修改 | `docs/prompt/execute.md` + 重跑 `_extract.mjs` | execute prompt workdir 按 repo 切的镜像同步。 |
| 修改 | `.claude/skills/sillyspec-execute/SKILL.md` | 跨仓 task 指引：task 卡片写 `repo:` + local.yaml 注册仓 + workdir 切换。 |
| 修改 | `.claude/skills/sillyspec-plan/SKILL.md` | plan 指引：跨仓 task 卡片协议（repo: + allowed_paths 指向跨仓仓）。 |

## 7. 接口定义

### 7.1 MultiRepoContext（新增 `src/run/multi-repo-context.js`）

```js
/**
 * @typedef {Object} RepoEntry
 * @property {string} repoKey        - repo 标识（'main' 或 local.yaml repos: 的键名）
 * @property {string} gitDir         - git 工作目录（rev-parse/diff/apply 的 cwd）
 * @property {string} worktreePath   - 子代理工作目录（主仓=worktreePath 或 in-place-fallback 时=cwd；跨仓=跨仓仓根）
 * @property {string} projectRoot    - apply 目标根（主仓=主仓根；跨仓=跨仓仓根，但跨仓 apply=no-op 不用）
 * @property {boolean} isMain        - 是否主仓
 * @property {function} resolveHead  - () => string，实时 git rev-parse HEAD（主仓=worktree/cwd HEAD；跨仓=跨仓仓 HEAD，不缓存；task review 的 head 用 task 卡 head_commit 锡点而非此函数）
 * @property {function} resolveBase  - (taskBaseCommit?) => string，base 锚点：主仓→meta.baseHash（单仓不变式）；跨仓→taskBaseCommit（task 卡片 base_commit 锡点，必传）
 */

export class MultiRepoContext {
  /**
   * @param {Object} opts
   * @param {string} opts.cwd              - 主仓 cwd
   * @param {string} opts.changeName
   * @param {Object} opts.platformOpts     - specRoot 等
   * @param {string[]} opts.declaredRepos  - 所有 task 卡片声明的 repo: 值（含 'main'）
   * @param {Object} opts.repoRegistry     - local.yaml repos: 段解析结果 Map<key, path>
   * @param {Object} opts.worktreeManager  - WorktreeManager 实例（主仓 meta 读取；in-place-fallback 兜底 cwd）
   * @throws {Error} 约束②: declaredRepos 中有 repoKey 不在 repoRegistry → 抛错列已注册 repo，阻断 execute
   *                 约束②: 跨仓仓 git rev-parse 失败（路径不存在/非 git 仓）→ 抛错阻断 execute（配置错误不降级）
   */
  constructor(opts) { /* 建 Map<repoKey, RepoEntry>，主仓 isMain=true 读 meta，跨仓 isMain=false 实时 git 验证可达 */ }

  /** @returns {RepoEntry|null} */
  resolve(repoKey) { return this.map.get(repoKey) || null }

  /** @returns {Map<string, RepoEntry>} 所有 repo（apply/verify per-repo 遍历用；跨仓 apply=no-op 仅遍历校验） */
  get repos() { return this.map }

  /** @returns {boolean} 是否含跨仓 task（execute prompt 分叉用） */
  hasCrossRepo() { return this.map.size > 1 }
}
```

### 7.2 task 卡片 frontmatter 协议扩展

```yaml
# task-NN.md frontmatter
repo: sillyspec           # 新增可选字段，缺省='main'（不写=主仓 task）
base_commit: <sha>        # 新增可选字段，CLI 锡点写入（跨仓 task 派发前 CLI 落盘 base，子代理不改）
head_commit: <sha>        # 新增可选字段，CLI 锡点写入（跨仓 task 回收 review 前 CLI 落盘 head，子代理不改）
allowed_paths:            # 跨仓 task 时指向跨仓仓路径（相对【跨仓仓根】，非主仓根）
  - src/task-review.js
  - src/worktree-apply.js
```

**G2 构造时机（定）**：MultiRepoContext 在 execute 启动时构造一次，进程级缓存贯穿 execute/apply/verify（不重建）。apply/verify 复用 execute 实例，或从 review.json.repo + local.yaml repos 反推。head 经 resolveHead 实时取（反映跨仓仓最新 HEAD）。4 个调用点（applyWorktree / validateTaskReviews / runVerifyTestCheck / generateTaskReviewDrafts）签名都加 `ctx` 参数。

### 7.3 local.yaml schema 扩展

```yaml
# local.yaml 新增 repos: 段（workspace 多仓注册表）
repos:
  sillyspec: C:/Users/qinyi/IdeaProjects/sillyspec
  # main 不用注册（隐式 = cwd / specRoot 父目录）
```

### 7.4 review.json schema 扩展（A7）

```json
{
  "schemaVersion": 2,          // 1→2（新增 repo 字段；旧版 review.json 无 repo 视为 'main'，向后兼容）
  "task": "task-09",
  "repo": "sillyspec",         // 新增可选，缺省='main'
  "base": "<sillyspec仓 commit>",
  "head": "<sillyspec仓 commit>",
  "changedFiles": ["src/task-review.js"],
  "specVerdict": "pass",
  "qualityVerdict": "pass",
  "reviewerNotes": "...",
  "requiredEvidence": []
}
```

## 7.5 生命周期契约表

**不涉及生命周期契约**。本变更不引入 session/lease/agent_run/daemon/lifecycle/state_transition/claim/heartbeat 任何事件。MultiRepoContext 是 execute 运行期内存对象（进程级缓存，随 CLI 进程生死），不跨进程、不持久化、无状态机。跨仓仓的 git commit 由 task 本身负责（子代理 commit 到跨仓仓主干），SillySpec 不管理跨仓仓生命周期。

## 8. 数据模型

**不涉及数据库 schema 变更**。进度库（sillyspec.db）仍是主仓单库（GOAL-3 / NG-1）。MultiRepoContext 是运行期内存对象，不入库。review.json 多一个可选 `repo` 字段（JSON 文件，非 DB 列）。schemaVersion 1→2 是 review.json 文件格式版本，非 DB schema 版本（`db.js DB_SCHEMA_VERSION` 不变）。

## 9. 兼容策略（brownfield）

| 场景 | 行为 |
|---|---|
| **单仓 change**（所有 task 无 `repo:`） | MultiRepoContext 退化为 `{main: {...}}` 单值 map，7 点全走原路径，**零行为变化**（GOAL-2）。`hasCrossRepo()=false`，execute prompt 不分叉。 |
| **旧 review.json**（schemaVersion=1，无 repo 字段） | `validateReviewSchema` 把缺省 repo 视为 'main'，向后兼容（不阻断既有 change archive）。 |
| **旧 local.yaml**（无 `repos:` 段） | 单仓 change 不读 repos: 段；跨仓 change 缺 repos: → 约束② fail-closed 抛错指引补注册。 |
| **跨仓仓无 `.sillyspec/`** | 设计如此（NG-1）。跨仓仓只被当 git 仓用（rev-parse/diff/apply/npm test），不建进度库。 |
| **跨仓仓无 package.json** | `runVerifyTestCheck` 跳过该仓 npm test + warn（决策④），不阻断 verify。 |
| **跨仓仓 git 不可用**（路径不存在/非 git 仓/rev-parse 失败） | MultiRepoContext 构造时 `git -C <crossRepo> rev-parse` 失败 → **fail-closed 阻断 execute**（约束②，配置错误不降级）。**不沿用** `verifyReviewGitEvidence` 主仓 git unavailable 降级（`task-review.js:500-510` 那是主仓环境缺失容错；跨仓仓不可用是用户 local.yaml 配置错，性质不同，必须阻断让用户修配置）。 |

## 10. 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | 跨仓仓同 Wave 多 task 改同一仓时 HEAD 推进，base/head 锚点漂移致 diff 跨 task 误判或混入他 task 改动 | P1 | **base+head 双锡点机制（Blocker 2 解 + 复审 head 精度）**：task 卡片加 base_commit + head_commit，CLI 派发 task 前落 base、回收 review 前落 head（锁定结束 commit，不用瞬时 HEAD，避免并行同 Wave 同跨仓不同文件 task 的 head 含他 task 改动）；review.base=task卡base_commit，review.head=task卡head_commit。每 task diff 由锡点锚定，显著缩小竞态窗（极端并行回收时序仍可能含他 task 改动，gate changedFiles 相交兜底）。 |
| R-02 | apply 改造回归风险（A5 主流程耦合主仓 worktree 模型） | P1 | **G1 定机制：跨仓 apply=no-op**（Blocker 1 解）——跨仓 commit 已由子代理落主干，apply 只校验 review.head 真实 + 跳过 wm.cleanup，不试图复用 A5 patch 路径（跨仓仓无 worktree/meta/分支）。主仓 task 走原 A5 不动。单仓 change 零回归。集成测覆盖「主仓 patch→主仓 + 跨仓 no-op」。 |
| R-03 | `pathOwners` 按 repo 聚合改造可能漏判跨仓同名路径仍冲突 | P1 | 约束③：`(repo, path)` 二元组聚合；plan-postcheck 回归测覆盖跨仓 task 与主仓 task 同名路径不误判。**注意**：dogfood 自指场景下 repo 不同但物理同路径仍会判冲突 → 故 dogfood 不自指（见 R-08）。 |
| R-04 | local.yaml `repos:` 路径不可移植（绝对路径跨机器不同） | P2 | 接受（workspace 注册表决策①已权衡：task 卡片干净 vs 路径不可移植，选前者）；未来可加 `repos:` 支持 `~/` / 环境变量 / 相对 specRoot 路径，本期不做。 |
| R-05 | 跨仓仓 commit 由子代理负责，主 agent 不 commit 则 head 缺失 | P1 | execute prompt 明确「跨仓 task 必须在跨仓仓主干 commit」；`verifyReviewGitEvidence` 跨仓 head 非真实 commit 判伪造阻断（约束①+约束②双重保险）；apply no-op 阶段再校验 head 真实。 |
| R-06 | 多 agent 并行改同一跨仓仓 → 跨仓仓 HEAD 推进冲突 | P2 | 跨仓仓 git 层面并发由 git 自己管（commit/merge）；MultiRepoContext resolveHead 实时取反映最新态；base 锡点（R-01）保证每 task 锚定自己的 base，不受他 task 推进影响。与现有 `concurrent-detect.js` 多 agent 预检正交（那是主仓脏文件检测）。 |
| R-07 | REVIEW_SCHEMA_VERSION 1→2 可能影响既有 gate 校验 | P2 | `validateReviewSchema` 兼容两版（v1 无 repo 视 'main'）；gate 校验对 repo 字段容错；回归测覆盖 v1/v2 review.json。 |
| R-08 | dogfood 自指悖论：本仓=sillyspec，跨仓 task 改 sillyspec → 主仓=跨仓仓物理同一，MultiRepoContext.hasCrossRepo/pathOwners/apply 语义崩溃 | P1 | **GOAL-5 修订（Blocker 3 解）**：dogfood 改本仓代码全走单仓 task（无 repo:）；跨仓链路端到端验证改用 multi-agent-platform（主）↔ sillyspec（跨仓）真实场景，在 multi-agent-platform 仓建 change 验证（与 background §1 对齐）。禁止 dogfood 自指跨仓。 |
| R-09 | buildWavePrompt 单 worktreePath 注入与 per-task workdir 切换架构矛盾（execute.js:466/571） | P1 | **架构改造（Blocker 解）**：buildWavePrompt 从「单 Wave 一段 prompt」改「按 task 逐个 Task 调用」，各 task 传 workdir（主仓=worktreePath，跨仓=跨仓仓根）。同 Wave 允许主仓+跨仓 task 混合（各独立 Task 调用）。集成测覆盖混合 Wave。 |

## 11. 决策追踪

| 决策 ID | 内容 | 覆盖章节 | 来源 |
|---|---|---|---|
| D-001@v1 | 仓库识别 = workspace 注册表（local.yaml `repos:` 段） | §5.1, §7.3 | 用户 brainstorm step3 拍板 |
| D-002@v1 | apply 去向 = 跨仓改动落跨仓仓主干（**机制由 D-009 修正为 no-op**：跨仓 commit 由子代理直接落主干，apply 只校验不复用 patch） | §5.4, §6, R-02 | 用户 brainstorm step3 拍板 + Grill Blocker1 修正 |
| D-003@v1 | 进度库归属 = 主仓统一存（review.json 全主仓 execute-runs） | §5.4, §8, NG-1 | 用户 brainstorm step3 拍板 |
| D-004@v1 | verify 跨仓测试 = 跨仓仓跑跨仓 npm test（per-repo cwd） | §5.4, §6 (verify-postcheck) | 用户 brainstorm step3 拍板 |
| D-005@v1 | 实现方案 = 方案B MultiRepoContext（否决 A/C） | §5 全文 | 用户 brainstorm step4 拍板（基于架构评审子代理报告） |
| D-006@v1 | 约束①跨仓 head 实时取 git + base 锡点机制 | §5.3, R-01 | 子代理报告约束1 + 用户 Blocker2 拍板 base 锡点 |
| D-007@v1 | 约束②未注册 repo / 跨仓 git 不可用 fail-closed 阻断（不降级） | §5.3, R-05, §9 | 子代理报告约束2 |
| D-008@v1 | 约束③pathOwners 按 (repo,path) 聚合 + design §6 按仓分段（段头 `## <repo> 仓变更`） | §5.3, R-03 | 子代理报告约束3 |
| D-009@v1 | G1 跨仓 apply = no-op（跨仓 commit 已落主干，apply 只校验 head + 跳过 cleanup，不复用 A5 patch） | §5.4, §6, R-02 | Design Grill Blocker 1 解 |
| D-010@v1 | base+head 双锡点机制：task 卡片 base_commit + head_commit，CLI 派发前落 base、回收 review 前落 head（避免并行同 Wave 同跨仓 head 含他 task 改动） | §5.3, §7.2, R-01 | Design Grill Blocker 2 解（用户拍板）+ 复审 head 精度修正 |
| D-011@v1 | dogfood 不自指：本仓改动走单仓 task，跨仓端到端验证用 multi-agent-platform↔sillyspec 真实场景 | §2 GOAL-5, R-08 | Design Grill Blocker 3 解 |
| D-012@v1 | buildWavePrompt 改 per-task Task 调用（各传 workdir），同 Wave 允许主仓+跨仓混合 | §6, R-09 | Design Grill Blocker 解 |
| D-013@v1 | G2 构造时机：execute 启动建一次，进程级贯穿 apply/verify，4 调用点加 ctx 参数 | §7.2, R-06 | Design Grill G2 gap 解 |
| D-014@v1 | G3 design §6 分段格式：markdown 段头 `## <repo> 仓变更`（选定，非豁免） | §5.3 约束③ | Design Grill G3 gap 解 |

## 12. 自审（Self-Review）

**章节齐全检查**：背景✓ / 设计目标✓ / 非目标✓ / 拆分判断✓ / 总体方案✓ / 文件变更清单✓ / 接口定义✓ / 生命周期契约（不涉及，已声明）✓ / 数据模型✓ / 兼容策略✓ / 风险登记✓ / 决策追踪✓ / 自审✓。

**字段数据流检查**：文件变更清单每行含 producer→consumer 数据流标注（MultiRepoContext / review.repo / local.yaml repos / pathOwners 四条主数据流均标）✓。

**一致性检查**：
- GOAL-2 单仓零回归 ↔ §9 兼容策略单仓退化 ✓
- D-003 主仓统一存 ↔ §8 不涉及 DB 变更 + NG-1 ✓
- 约束①②③ ↔ R-01/R-05/R-03 风险应对 ✓
- review.json schemaVersion 1→2 ↔ R-07 兼容 ✓

**YAGNI 检查**：NG-1..NG-6 六项明确不做（跨仓进度库/MCP复用/worktree嵌套/进度同步/gen:types/混合存储）✓。

**Design Grill Blocker 修订记录（specVerdict fail → 已修订）**：
Design Grill 独立审查（2026-08-11）判 specVerdict=fail，3 个 Unresolved Blocker + buildWavePrompt 架构矛盾。本修订（v2）逐条解决：
- **Blocker 1（G1 跨仓 apply 机制矛盾）→ D-009 解**：§5.4/§6/§9 改为「跨仓 apply=no-op」（跨仓 commit 已落主干，apply 只校验 head + 跳过 cleanup，不复用 A5 patch 路径）。源码依据：applyWorktree:223-535 深度耦合主仓 worktree 模型，跨仓仓无 worktree/meta/分支不可复用。
- **Blocker 2（约束① vs R-01 实时取与锁定快照矛盾）→ D-010 解**：§5.3/§7.2 加 base 锡点机制（task 卡片 base_commit，CLI 派发前落盘），R-01 改写。用户拍板选 task-local base 锡点（非共享 base / 非 plan 约束串行）。
- **Blocker 3（GOAL-5 dogfood 自指悖论）→ D-011 解**：§2 GOAL-5 修订——dogfood 改本仓走单仓 task，跨仓端到端验证改用 multi-agent-platform↔sillyspec 真实场景。R-08 新增。
- **buildWavePrompt 架构矛盾 → D-012 解**：§6 改 per-task Task 调用，R-09 新增。
- **G2 构造时机 → D-013 解**：§7.2 写死 execute 启动建一次进程级贯穿。
- **G3 design §6 分段格式 → D-014 解**：§5.3 选定 markdown 段头 `## <repo> 仓变更`。
- **FR-04 vs §9 文案矛盾（gap）→ §9 改写**：跨仓 git 不可用明确 fail-closed 不降级，删「对齐主仓 unavailable 降级」歧义文案。
- **in-place-fallback 兜底（gap）→ §7.1 RepoEntry.worktreePath 注明** + gates.js reviewGitDir 对齐 task-review.js:724。

**遗留（plan 阶段细化，非 Blocker）**：各调用点 ctx 参数透传的具体签名 / resolveApplyAllowSet 路径基准（跨仓 allowed_paths 相对跨仓仓根）的 parser 细节 / module 子集策略跨仓不参与的边界测试用例。这些属实现细节，design 已声明方向，plan 拆 TaskCard 时钉死。

**复审（v3→v4）残留清除记录（specVerdict cannot_verify → pass）**：
二轮复审判 cannot_verify（4 Blocker 全 pass，3 类残留）。v3 清除残留①②（design 内 stale 措辞 + 跨文档 FR-07/task-05/proposal no-op 同步）。三轮三审判仍 cannot_verify，理由精确为 3 处 operation 段 head 漏同步 + 措辞 overstated。v4 逐条清：
- **残留③ operation 段 head 同步**：§5.4 数据流「head=跨仓仓当前HEAD」→ head=task卡head_commit；§6 task-review A2「head 实时取」→ head 取 task卡head_commit 锡点；§5.3 约束①开篇补「resolveHead 用于 CLI 派发/回收落锡点，review base/head 读锡点非瞬时 HEAD」；§6 数据流 producer 标注补 head_commit。
- **措辞软化**：§5.3 + R-01「不混入并行他 task 改动」overstated → 「显著缩小竞态窗（极端并行回收时序仍可能含他 task 改动，gate changedFiles 相交兜底）」诚实标注；约束①标题「task-local base 锡点」→ 「base/head 双锡点」。
- 全文核验：operation 段（§5.4 数据流 / §6 文件清单）无残留「head 实时取/当前HEAD」，与权威章节（§5.3/§7.1/§7.2/D-010/R-01）锡点语义一致。

