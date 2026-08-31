---
author: qinyi
created_at: 2026-08-16T22:40:59+08:00
updated_at: 2026-08-16T22:40:59+08:00
scale: large
risk_level: unit-sufficient
status: draft
---

# Design：并发状态分裂三坑修复（2026-08-16-state-split-fixes）

## 背景与动机

本 session 两次完整流程（scan-docs-reconcile / scan-diff-command）在多 agent 并发下暴露三个重复摩擦源，均有实证：

1. **execute run 目录静默缺失**：两次 execute 启动，marker 写入（`exec-*-211357`）但 `execute-runs/<runId>/tasks/` 目录未建——archive 完成度判定 fallback 扫描到**上个变更的 run**（`exec-182944`）错配，需手动补 review.json 才能过。根因：marker 写入点（`src/run/gates.js:444`、`src/run/prompt.js:518`、`src/task-review.js:795`）只写 marker 文件不建目录，目录靠事后 review 写入的 `mkdirSync`（task-review.js:919）——执行方式未触发 review 写入时目录缺失，且 marker 写入自身 `catch {}` 静默。
2. **worktree apply --merge 冲突**：worktree 分支的 baseline checkpoint（overlay 15 个主仓未提交文件，含并行会话的）被整分支 `git merge` 到已推进的 main，baseline 并行文件冲突（`applyByMerge`，worktree-apply.js:717），merge --abort 回滚后只能手动 cp + 单文件三方适配。
3. **docs 活文档引用持续漂移**：并行会话每次改 `command.js`/`index.js`，`platform-interface-map.md` 等活文档的 file:line 引用即失效（本 session 两次共 12+6 处），无机制提示"改时顺手修"，docs gate（基线 0）事后拦到当前流程上背锅。

## 设计目标

1. marker 写入与 run 目录创建原子化，失败 fail-loud 不静默
2. applyByMerge 不再被 baseline 并行文件冲突阻塞
3. 改动活文档映射的源码文件时，审计即时提示漂移风险

## 非目标（Non-Goals）

- 不改 baseline overlay 语义（overlay 拉主仓未提交文件是既有设计，只在 merge 侧过滤）
- 不做 docs gate 基线按变更归属分离（已裁决不做）
- 不改 execute 的 per-task review 写入机制（review 引导独立课题）

## 方案决策

| 决策 | 裁决 | 依据 |
|---|---|---|
| 变更组织 | 单变更合并三修复（方案 1，用户裁决） | 同根因（并发状态分裂）、一次流程、共享上下文 |
| #2 修复方式 | merge 前滤 baseline 并行文件（A，用户裁决） | 最小改动解决冲突主因；B（task commit 分支）改动大、C（改进提示）不解决 |
| #3 修复方式 | 活文档漂移提示机制（A，用户裁决） | 把事后清偿变改时顺手；B（纪律）已被证不可靠；C（gate 归属分离）大改 |
| #2 不用 merge -X ours | 分支上预对齐而非 merge 策略 | `-X ours` 会把**本变更交付文件**的 main 侧推进也吞掉（误伤），预对齐只影响 baseline 并行文件 |

## 总体方案

### #1 marker 写入原子化 + fail-loud（task-01）
**四处** marker 写入点（`src/run/stage.js:96-112` execute 启动**主写入点**、`gates.js:444`、`prompt.js:518`、`task-review.js:795` 三处 fallback 补写）改为：
1. `mkdirSync(join(runtimeRoot, 'execute-runs', runId, 'tasks'), { recursive: true })` **先建目录再写 marker**（不变量：marker 在则目录在）
2. 失败语义**按调用方区分**（Grill P1-2 修正——统一上抛与 fail-open 契约冲突）：
   - `stage.js` 主写入点：直接 throw——execute 启动即失败优于事后错配
   - `gates.js`：gate 内 throw（外层 :494 catch 会 fail-closed 阻断，语义正确）
   - `prompt.js`：console.error + 保留降级（渲染路径抛错会炸整个 prompt 输出）
   - `task-review.js`：`generateTaskReviewDrafts` 是 fail-open 契约（:763 注释，调用方 complete.js:260 / index.js:511 catch 降级）——保留 fail-open 但**去静默**（至少 console.error 留痕）

### #2 applyByMerge 前滤 baseline 并行文件（task-02）
`applyByMerge`（worktree-apply.js:717）在 `git merge` 前增加预对齐步骤：
1. **过滤候选集口径显式钉死**（Grill 2d 修正——不用 result.changedFiles 的工作区口径）：`git diff <meta.baseHash>..<baselineCommit> 的文件集 ∩ main 已推进集`，再减去 `git diff <baselineCommit>..HEAD -- <file>` 非空的（分支上已变更=本变更交付，不动）
2. 对过滤集每文件先查 **worktree 工作区是否 dirty**（子代理未提交改动会被 checkout 覆盖）——dirty 则不预对齐该文件（走降级），干净才执行 `git checkout main -- <file>`
3. 预对齐后 commit（信息 `sillyspec: align baseline files to main (pre-merge, N files)`），再 `git merge --no-ff` ——baseline 并行文件与 main 一致不冲突，交付文件正常三方合并
4. 预对齐任一步失败 → 跳过预对齐走原 merge 路径 + warning（降级不阻断）

### #3 docsCheckHint 扩展活文档漂移提示（task-03）
`src/run/shared.js` 的 docsCheckHint（:789）扩展：
1. 从活文档集合（缺省 `docs/sillyspec/platform-interface-map.md`；local.yaml `docs-check.living-docs` 列表可扩展——**优先级：living-docs 未配用缺省，配了仅追加不覆盖 paths**，与既有 paths 覆盖语义正交）**动态提取** file:line 引用的源码文件集合（复用 `docs-check.js` 的 `collectDocRefs` 纯函数）
2. 与本次审计的 changedFiles（src/ 下的）求交集，非空 → `docsCheckHint.livingDocDrift = { files: [...], hint }`，quick-audit 输出提示："改动 X/Y/Z 被 platform-interface-map 引用——活文档引用可能失效，建议顺手跑 `docs check` 修引用行号"
3. 纯提示（advisory），不阻断不强制

## 文件变更清单

| 文件 | 动作 | 说明 |
|---|---|---|
| src/run/stage.js | 修改 | #1 marker **主写入点**（:96-112）原子化 + throw fail-loud |
| src/run/gates.js | 修改 | #1 fallback 写入点原子化 + gate 内 throw |
| src/run/prompt.js | 修改 | #1 fallback 写入点原子化 + console.error 降级留痕 |
| src/task-review.js | 修改 | #1 fallback 写入点原子化 + 去 catch 静默（保留 fail-open 契约） |
| src/worktree-apply.js | 修改 | #2 applyByMerge 预对齐 baseline 并行文件（dirty 保护） |
| src/run/shared.js | 修改 | #3 docsCheckHint 扩展 livingDocDrift |
| src/run/quick-audit.js | 修改 | #3 漂移提示输出 |
| src/config-schema.js | 修改 | #3 living-docs 配置键登记（task-04 补：config-schema 测试强制 live 键必入 renderExample 模板，防漂耦合） |
| docs/sillyspec/file-lifecycle.md | 修改 | task-04 marker 不变量机制描述同步 |
| docs/sillyspec/troubleshooting.md | 修改 | task-04 三坑闭环登记（#10） |
| docs/sillyspec/platform-interface-map.md | 修改 | task-04 行号同步（stage.js:113/127/149 → 122/136/158，随 #1 源码 +9） |
| docs/sillyspec/prompt-control-debt.md | 修改 | task-04 行号同步（prompt.js:563→571 / task-review.js:976→984 / gates.js:557→561，随源码编辑位移） |
| test/execute-run-dir-fail-loud.test.mjs | 新增 | #1 四写入点目录创建+分层 fail 语义测试 |
| test/worktree-merge-baseline-align.test.mjs | 新增 | #2 预对齐+merge+dirty 保护+降级测试 |
| test/docs-living-drift-hint.test.mjs | 新增 | #3 交集提示测试 |

## 兼容策略

- #1 不变量（marker 在则目录在）对读侧（task-review resolveLatestExecuteRunIdWithTasks / archive 完成度）透明——目录存在即使空也不影响扫描语义
- #2 预对齐只动"分支上无变更的 baseline 文件"，本变更交付文件零影响；降级路径保底
- #3 纯 advisory 提示，零阻断；活文档集合可配置（缺省 platform-interface-map.md）
- 全部改动带回归测试，既有 211 测试不动

## 风险登记

| 风险 | 等级 | 缓解 |
|---|---|---|
| #2 预对齐判定错误（把交付文件误对齐） | 中 | 候选集用 `git diff baseHash..baselineCommit` 已提交口径（非 changedFiles 工作区口径）；分支上已变更（diff baselineCommit..HEAD 非空）即排除；测试覆盖交付文件不受影响 |
| #2 checkout 覆盖 worktree 未提交改动 | 中 | 预对齐前查该文件工作区 dirty，dirty 则跳过走降级（Grill P2 补） |
| #1 fail-loud 在极端环境（只读 fs）阻断流程 | 低 | 按调用方分层（stage 主点 throw / gates gate 内 throw / prompt 降级留痕 / task-review 去静默保 fail-open）；execute 启动即失败优于事后错配 |
| #3 动态提取活文档引用的性能 | 低 | collectDocRefs 纯函数单文件解析，毫秒级 |
| marker 写入点遗漏（Grill 抓到第 4 处） | — | 已闭环：grep `current-execute-run-id-` 全仓实证四处全覆盖 |

## 自审（Self-Review）

- ✅ 三坑根因均有本 session 实证 + 源码定位（行号实测）
- ✅ 用户三轮裁决全落实（合并/#2A/#3A）
- ✅ #2 的 `-X ours` 误伤风险已在方案决策记录（预对齐替代）
- ⚠️ #2 的"baseline 携带且分支无变更"判定实现时用 git diff 实测验证（不臆断）
- ✅ 生命周期契约：不涉及生命周期契约（run 目录/marker 与 merge 均为工具内部状态，无跨进程契约变更；#1 恰是把静默失败变显性失败）
