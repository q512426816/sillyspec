---
author: qinyi
created_at: 2026-09-15 20:56:29
generated_by: sillyspec-design-init
scale: medium
risk_level: unit-sufficient
---

# 设计文档（Design）— 2026-09-15-worktree-dual-truth-gates

## 背景

2026-09-15 用户在 multi-agent-platform 仓（`2026-09-15-background-task-permission-lockout` 变更）走完 execute→verify→apply 全流程，实证五个工具侧坑（坑文档 `docs/sillyspec/execute-baseline-overlay-carries-broken-parallel-wip.md`，存于该仓）。共同根因是 **execute 期主仓与 worktree 的「双真相」状态**：改动在 apply 前只存在于 worktree，而多个门禁/校验的判定基准仍锚在主仓或 worktree 的单一形态上，导致判定基准漂移、误报与绕行：

1. **overlay 带入并行半成品**：`_overlayBaseline`（src/worktree.js:1906）把主仓未提交文件同步进 worktree 基线 checkpoint，现仅排除 `.sillyspec/` 前缀——并行会话语法坏的在途半成品（如 `codex-app-server-driver.ts`）被固化进基线，worktree 内 import 该文件链的测试全部无法收集，只能人工「同步主仓修复版进 worktree」自救，又连锁触发坑②。
2. **assess 把 no-op 文件判超范围**：`applyWorktree` step 2 的 changedFiles 锚 `deliverableBase`（baseline checkpoint）→ worktree 工作区；主仓 HEAD 在 execute 期间前进后，worktree 中「内容=主仓 HEAD」的自救/重同步文件 diff 非空（对 baseline），apply 回主仓实为 no-op，却被 assess 判「变更文件超出 allowed_paths」BLOCKED。
3. **gitignore 生成物不随 worktree 供给**：供给链只有 node_modules junction（worktree-deps.js）与 untracked overlay（`ls-files --others --exclude-standard` 尊重 .gitignore）——gitignored 生成物（`src/build-id.ts`）在 worktree 缺失，构建炸 `Failed to load url ./build-id.js`。
4. **task 自动勾选漏计**：勾选守卫 `prefetchDiffFileSet`（src/run/complete.js:969）的 diffFileSet 只算 `git diff base..head`（worktree **已提交**），而草稿归属 `generateTaskReviewDrafts`（src/task-review.js:1340-1370）并入了 **porcelain 未提交 + merge-base committed 补齐**——子代理默认不 commit（文档记载的常态）时 diffFileSet 恒空/缺文件，`shouldAutoCheckTask` 草稿零 diff 守卫跳过勾选；同文件多 task 场景归属被 `attributeSuspectTasks`（src/verify-postcheck.js:2462 `!map.has(n)` 首中即止）单归属吞掉。与知识库 D-004@v1（worktree 归因唯一事实源=worktree 分支 diff+porcelain）不一致。
5. **required-evidence 消费侧误报**：`runRequiredEvidenceCheckV2`（src/verify-postcheck.js:2146-2151）逐文件存在性/mtime 核验只查主仓 `join(cwd, vf)`——apply 前新文件只在 worktree，逐文件误报「文件不存在/不在本变更 git diff 内」，verify 完成被错误阻断。

## 设计目标

- FR-01：overlay 隔离并行会话**显式声明**的在途文件（quick guard.json allowedFiles / 其他变更 design §6，own 优先），worktree 基线取主仓 HEAD 版本；隔离清单显式打印。
- FR-02：apply/assess 的 changedFiles 剔除「worktree 工作区内容=主仓 HEAD blob」的 no-op 文件（单点 choke point，两道自动同口径），逐文件可见性告警。
- FR-03：新增 local.yaml `worktree.supplyFiles` 配置键，worktree create 时把 gitignore 生成物从主仓复制供给（glob 支持），meta 记录供给清单。
- FR-04：勾选守卫 diffFileSet 对齐 D-004@v1 口径（porcelain ∪ committed merge-base 补齐，抽公共 helper 消除三处口径漂移面）；`attributeSuspectTasks` 多归属。
- FR-05：required-evidence 消费侧逐文件核验双根（主仓 ∪ worktree），apply 前新文件不再误报。

## 非目标

- 不做语法校验/esbuild 探测（语言特定，CLI 不带语言工具链依赖；未声明文件维持现行为+既有 advisory，记 troubleshooting 已知边界）。
- 不改 apply 时序（verify 仍是 apply 前验收）、不改 evidence 生成时机（execute Task Review Gate 契约）。
- 不做 gitignore 生成物自动探测（无法判定构建必需性）。
- 不做证据语义判定（satisfied/missing 仍由 agent 诚实自报告，CLI 只做机械核验）。
- 不改 DB schema、不加状态机状态。

## 拆分判断

五坑同根（双真相判定基准漂移）不同面，修复互不依赖、文件面各自局部（worktree-apply.js / complete.js+task-review.js / verify-postcheck.js / worktree.js+config-schema.js），单变更五 task 并行推进；不拆多变更（拆分反而制造五个 baseline overlay 互相同步的并行面——正是坑①的场景）。

## 总体方案

主题：**判定基准 worktree 感知收敛**——凡「apply 前改动只在 worktree」的核验一律双根/双真相读数（复用 verify-probes.js `buildAcceptanceHints` 双根先例），不改 apply 时序、不新增状态字段。

### Wave 1（worktree 面：FR-01/02/03）

**§1 overlay 隔离（FR-01，D-001@v1）**：`_overlayBaseline(mainCwd, worktreePath)` 增第三参 `changeName`（调用点 create step 5.6 在场）。staged/unstaged 两道：先 `git diff --name-only` 拿全量文件集 → `splitOwnVsForeignDiffFiles(mainCwd, changeName, files)` 切分 → foreign 文件生成 `:(exclude)<path>` pathspec 追加进既有 EXCLUDE_PATHSPEC 数组（`execFileSync` 数组传参字面安全，与 `:(exclude).sillyspec` 同机制），patch 生成与文件清单同步收窄；untracked 道：逐文件在 `copyUntrackedEntry` 前查 foreign 集跳过。隔离结果统一打印一行（文件←归属者，去重截断）。baselineFiles/meta/checkpoint message 只含 own 文件（同源既有链路自动跟随）。

**§2 no-op 剔除（FR-02，D-002@v1）**：`applyWorktree` step 2，`changedFiles = filterDeliverableFiles(allChangedRaw)` 之后：候选 = statusFiles∪untracked 中「worktree 工作区文件存在 && 主仓 HEAD 树存在该路径」者；主仓 blob map **复用既有 `getBlobHashMap`（worktree-apply.js:430）**；worktree 工作区 blob 用 `git hash-object --stdin-paths`（**复用既有 `chunkPaths`（worktree-apply.js:454）分批**，批次行序拼接保对齐——ql-20260912-010 先例）；路径对齐处理 `core.quotepath` 非 ASCII 引号（unquoteGitPath 口径）；相等 → 从 changedFiles/deletedFiles/absentAfterMerge 三集剔除 + `result.warnings` 追加 no-op 清单。删除类（worktree 无文件）不参与。每调用现算不缓存。

**§3 生成物供给（FR-03，D-003@v1）**：`config-schema.js` 注册 `worktree.supplyFiles`（string[]，默认 []）；`worktree.js` create step 5.8 deps 供给后新增 5.9 供给步：glob 展开（自实现 `*`/`**`→RegExp，零新依赖，相对主仓根）→ 主仓存在则复制（`mkdirSync(recursive)` 父目录 + `copyFileSync`），目标已存在且内容不同则警告后覆盖、缺失则 console.warn；实供清单写 `meta.supplyFiles`。gitignore 物不进 assess/apply 面（`ls-files --others --exclude-standard` 遵循 .gitignore）。

### Wave 2（review/verify 链：FR-04/05）

**§4 勾选口径对齐（FR-04，D-004@v1）**：抽公共 helper `collectWorktreeChangedFiles(cwd, changeName, meta, opts)`（落 task-review.js 导出，complete.js import）：porcelain（`status --porcelain --untracked-files=all`，gitDir=worktreePath 或 in-place 退化 cwd——**保住现状 in-place 主仓 porcelain 并入，不丢**（Grill P1-②））∪ committed（`merge-base(主仓HEAD, wtHEAD)..wtHEAD` diff，仅 wtGitDir≠cwd 时）→ 文件集。`prefetchDiffFileSet`（complete.js）在 base..head diff 基础上并入该集，**再剔除 `meta.baselineFiles`**（Grill P1-①：merge-base..wtHead 含 baseline checkpoint 提交，夹带文件不剔除则「声明了没真做、恰被 baseline 夹带」的 task 会被误勾，削弱 W2 task-04 FR-03 防伪底线）；`generateTaskReviewDrafts` 的 :1340-1370 并入段改为消费同一 helper，与 verify-postcheck.js `resolveVerifyChangedFiles` 补齐段的既有「两处口径须同步改」注记更新为指向 helper 口径；`resolveVerifyChangedFiles` 自身本次**不动**（其补齐段含 form A 专属语义，2026-09-07 P1 修复，强行统一风险大于收益——已知残留记入风险表）。`attributeSuspectTasks` map 值 `string → string[]`（全命中收集，最新 run 优先序保持）；**在 reconcileTargetFiles 组装 `suspectTask` 的边界处（verify-postcheck.js:2582 附近）join('、') 成字符串**，gates.js:1606 / archive-delta.js:213/325 等下游渲染零改动。

**§5 evidence 双根（FR-05，D-005@v1）**：`runRequiredEvidenceCheckV2` 开头解析 worktree 根：`join(specBase, '.runtime', 'worktrees', changeName, 'meta.json')` 存在且 `mode !== 'in-place-fallback'` 且 `worktreePath` 目录在 → 候选根列表 `[cwd, worktreePath]`，否则 `[cwd]`（零回归）。逐文件：`filesExist` = 任一根存在；`mtimeOk` = 命中根的 `statSync`（双根都在取 worktree 根——新改动所在）；`diffHit` 不动（`resolveVerifyChangedFiles` 已 worktree-aware）。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | src/worktree.js | `_overlayBaseline` 增 changeName 参数 + 三道 foreign 剔除 + 隔离打印；create 流程加 step 5.9 supplyFiles 供给步（复制 + meta.supplyFiles） |
| 修改 | src/worktree-apply.js | `applyWorktree` step 2 增 no-op 剔除段（hash-object 批量 vs 主仓 ls-tree map，warnings 可见性）；无对外字段 |
| 修改 | src/config-schema.js | 注册 `worktree.supplyFiles`（string[]，默认 []）。数据流：producer=用户 local.yaml → config-schema 校验注册 → consumer=worktree.js create 供给步（glob 展开复制）+ meta.supplyFiles（doctor/审计可读） |
| 修改 | src/task-review.js | 抽公共 helper `collectWorktreeChangedFiles`；`generateTaskReviewDrafts` 并入段改消费 helper（口径单一化） |
| 修改 | src/run/complete.js | `prefetchDiffFileSet` 并入 `collectWorktreeChangedFiles` 结果（diffFileSet = base..head ∪ porcelain ∪ committed 补齐） |
| 修改 | src/verify-postcheck.js | `attributeSuspectTasks` 值改 string[] + 消费端渲染多归属；`runRequiredEvidenceCheckV2` 双根解析与逐文件双根核验 |
| 新增 | NEW:test/worktree-dual-truth-gates.test.mjs | 五坑各一组回归测试（overlay 隔离/no-op 剔除/supplyFiles 供给/勾选并入/evidence 双根）+ 既有行为零回归断言 |
| 修改 | docs/sillyspec/troubleshooting.md | 新增 §：execute 双真相门禁口径（含「未声明在途文件仍可能带坏基线」已知边界与绕过） |

## 接口定义

```js
// src/task-review.js（新增导出）
/**
 * worktree/in-place 改动文件集（porcelain ∪ committed merge-base 补齐，D-004@v1 口径单一化）。
 * in-place（meta 缺失或 mode=in-place-fallback）时 porcelain 取 cwd（保住现状并入，不丢）。
 * @param {string} cwd 主仓根
 * @param {string} changeName
 * @param {object|null} [meta] 预取 meta（缺省内部 getMeta）
 * @param {{ specBase?: string }} [opts]
 * @returns {string[]} 正斜杠归一文件集（git 失败 → []，fail-open 不阻断调用方）
 */
export function collectWorktreeChangedFiles(cwd, changeName, meta = null, opts = {})

// src/worktree.js（私有，签名变更）
_overlayBaseline(mainCwd, worktreePath, changeName = null)
// changeName 缺省（null/''）→ 不做 foreign 切分（零回归面：测试直调路径）

// src/verify-postcheck.js（内部，返回类型变更）
attributeSuspectTasks(runtimeRoot, changeName, paths)
// Map<string /*norm path*/, string[] /*taskId 全命中*/>（原 string 首中即止）

// src/config-schema.js（新增键）
worktree:
  supplyFiles: string[]   # 默认 []；精确路径或 glob（* / **），相对仓根
```

生命周期契约：不适用 lifecycle contract（无 session/lease/agent_run/daemon/lifecycle/state transition/claim/heartbeat 事件契约——worktree meta 的 supplyFiles 是静态记录字段，无状态流转）。

## 数据模型

无 DB schema 变更。worktree meta.json 新增可选字段 `supplyFiles: string[]`（实供清单，create 时写入；存量 meta 无此字段按缺省处理）。

## 兼容策略（brownfield 必填）

- `worktree.supplyFiles` 未配置（默认 []）→ 供给步空转，行为与现状完全一致。
- `_overlayBaseline` 无并行会话声明时 `splitOwnVsForeignDiffFiles` 返回 foreign=[] → 三道全通过，行为不变；quick 会话 guard.json 在会话启动即写（stage.js:350），execute 启动时刻可见。
- no-op 剔除只删「内容与主仓 HEAD 相等」的文件——改动内容 ≠ HEAD 的文件不受影响；主仓 HEAD 无该路径的新文件不参与（仍是 changed）。
- `collectWorktreeChangedFiles` 对 in-place-fallback/无 meta 返回 []，`prefetchDiffFileSet` 退回 base..head 现状。
- `attributeSuspectTasks` 返回结构变更仅本仓消费（reconcileTargetFiles ③类报告），无外部 API 面。
- evidence 双根在 worktree meta 缺失时退单根（现状）。

## 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | overlay 隔离漏放：并行会话**未声明**的在途文件（裸改未走 sillyspec）仍进基线 | P1 | 非目标声明 + troubleshooting 记已知边界（隔离面=显式声明面）；既有 advisory（baseline checkpoint message 列清单）保持可见 |
| R-02 | no-op 判定在 assess 与 apply 间主仓 HEAD 推进导致判定翻转 | P2 | 每调用现算不缓存；apply 侧如实回放（merge 自行处理），assess 侧以当下事实为准 |
| R-03 | hash-object/ls-tree 大文件集性能（数千文件仓） | P2 | 分批（沿 ql-20260912-010 先例，hash-object 批次行序拼接保对齐）；候选集先收窄（changed∩主仓 HEAD 树存在）再批量 |
| R-04 | supplyFiles glob 展开误配（如 `dist/**` 展开数千文件） | P2 | 展开上限帽（如 200 文件，超出警告截断）；单文件复制失败不阻断 create（warn 后继续） |
| R-05 | 双根 mtime 语义：主仓与 worktree 同文件都在时取错根 | P2 | 取 worktree 根（新改动所在）；主仓独有才取主仓 |
| R-06 | 并行会话在途改动与本修复同文件（worktree-apply.js / verify-postcheck.js 正被 ql-008 会话修改中） | P1 | Edit 前重读最新态；本变更在独立 worktree execute，基线隔离后不受主仓未提交态影响 |
| R-07 | 勾选守卫并入 porcelain 后，baseline 夹带文件（merge-base..wtHead 含 baseline checkpoint）致「声明未做」task 误勾（Grill P1-①） | P1 | 守卫消费侧剔除 `meta.baselineFiles`（夹带=非本变更改动，逐任务归因时排除——checkpoint message 既有语义） |
| R-08 | helper 统一后 in-place 主仓 porcelain 并入丢失（Grill P1-②） | P1 | helper 契约含 in-place 分支（porcelain 取 cwd），回归测试锁 in-place 行为 |
| R-09 | 口径漂移面收口不彻底：resolveVerifyChangedFiles 补齐段（第三处）本次不动（Grill P1-③） | P2 | 注记更新指向 helper 口径；记 troubleshooting 已知残留，待该函数下次触碰时统一 |

## 决策追踪

| 决策 | 覆盖点 | 状态 |
|---|---|---|
| D-001@v1 | FR-01 / §1 | 已覆盖 |
| D-002@v1 | FR-02 / §2 | 已覆盖 |
| D-003@v1 | FR-03 / §3 | 已覆盖 |
| D-004@v1 | FR-04 / §4 | 已覆盖 |
| D-005@v1 | FR-05 / §5 | 已覆盖 |

无未解决决策。库内 decisions/worktree.md D-004@v1（worktree 归因口径）由本变更 §4 兑现到勾选守卫，无复潮。

## 自审

- [x] 章节齐全（背景/设计目标/非目标/总体方案/文件变更清单/接口定义/风险登记）
- [x] frontmatter 字段齐全（author/created_at/scale）
- [x] 引用所有当前版本 D-xxx@vN（D-001~D-005@v1 全覆盖）
- [x] 涉及生命周期关键词时含「生命周期契约表」或紧邻豁免短语（已写紧邻豁免短语）
- [x] UI 原型分级核对（纯 CLI/测试改动，不涉前端文件，跳过原因：无 UI 面）
- [x] 不确定的问题标注「⚠️ 自审存疑」（无存疑项；R-06 并行会话同文件风险已登记应对）
