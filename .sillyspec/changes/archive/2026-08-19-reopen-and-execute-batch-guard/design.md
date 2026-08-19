---
author: qinyi
created_at: 2026-08-19T10:55:23+08:00
scale: large
risk_level: low
status: confirmed
---

# 设计文档（Design）— reopen stale 回填 confirm 门控 + execute 批量完成零 diff 守卫 + worktree apply 锚点 merge-base

## 背景

multi-agent-platform 仓两份 debt 文档记录了三个流程安全缺陷（2026-08-18 / 2026-08-19），经代码核证在当前 SillySpec 主仓全部未修复：

1. **reopen stale 回填**（`docs/sillyspec/2026-08-18-scan-reopen-done-backfill.md`）：`--reopen --from-step N` 重做后，任一次 `--done` 触发 `src/run/complete.js:282-296` 的「同步回填 stale 步骤为 completed」——N 之后**从未执行过**的步骤被直接标完成，阶段宣告完成，进度库与实际产物脱节。根因：`--done` 后 `nextPendingIdx` 只找 pending/in-progress（stale 不在内），立即进入阶段完成分支，用回填"解决"矛盾。
2. **execute 批量完成误标未实现 task**（debt 文档二·缺陷一）：`detectExecuteBatchFinish`（`src/run/complete.js:536`）的代码核验是**整变更级**（`checkExecuteCodeEvidence` 非零即可）——task-08 未实现但其它 task 有真实改动时照样批量放行；`shouldAutoCheckTask` 对普通 task 接受 cannot_verify 草稿 → plan checkbox 被自动勾掉，「进度绿但代码没落地」。草稿生成器 `generateTaskReviewDrafts` 本身已有空 changedFiles 跳过（`src/task-review.js:905-909`），漏点是**误归属**（allowed_paths 与他人改动重叠）与**陈旧 review.json**。
3. **worktree apply 3way 被 baseline 占位文件挡死**（debt 文档二·缺陷二）：diffBase = `baselineCommit || baseHash`（`src/worktree-apply.js:371`）。baseline checkpoint 含 CLI 为满足 allowed_paths 校验创建的 0 字节占位文件（main 从未有过）→ 以 checkpoint 为 preimage 的 patch 在 main 侧呈 add/delete 冲突；真实 merge-base 下纯代码 diff 可干净直落。且 `--3way` 失败时 `rollbackApply` 冲突列表可能为空（报"(未能获取冲突文件列表)"），冲突根因被静默吞掉。

用户选定方案 B（状态机增强、保留便利）：回填保留但显式门控；草稿保留但零 diff 过滤；apply 锚点默认换 merge-base、baseline 留显式回退。

## 设计目标

- FR-01：`--reopen --from-step N` 后的 `--done` 不再静默回填 stale 步骤；未回填的 stale 步骤由真实执行逐个推进，或由 `--confirm` 显式声明"方案未变"后回填。
- FR-02：execute 批量完成触发前逐 task 校验"有效代码 diff 非空"；cannot_verify 自动草稿不再单独构成自动勾选/批量放行依据。
- FR-03：worktree apply patch 生成锚点默认改为 `git merge-base <baseBranch> <branchTip>`，消除 baseline 占位文件导致的 add/delete 假冲突；`--base baseline` 显式回退旧锚点。
- FR-04：apply `--3way` 冲突时不再静默吞掉冲突文件列表——解析 git 原始错误，双源（stderr + status）合并探测。
- FR-05：三个修复均有回归测试锁定（含 reopen stale 不回填、草稿零 diff 不放行、merge-base 锚点干净落盘）。

## 非目标（Non-Goals / 不在范围内）

- 不改 `reopenStage` 本身的状态置位逻辑（`stage-machine.js:421-431`）——debt 文档所说"进度显示清零"与现行代码不符（fromIdx 之前步骤保持 completed），不复现不修。
- 不改 waiting 态消费记录——`continueStep` 已有 `waitAnswers`（轮次/问题/回答）审计，debt 文档第一轮现象属旧版/并行会话问题，不在本变更范围。
- 不移除 execute 批量完成机制与 cannot_verify 草稿兜底（方案 A 被否）——它们服务主 agent 直接实现模式体验，本变更只加守卫。
- 不处理 verify-required-evidence.json 的历史幽灵数据清理（操作性收尾，verify 阶段自然消化）。
- 不改 worktree apply 的 dirty 拦截（step 4.5）、允许清单校验（Gate2）等既有 gate。

## 拆分判断

三个缺陷相互独立、可独立交付，但同属「流程状态机 fail-closed 收口」主题、改动面合计 ≤8 个源文件，不拆分为多个 change；按 W1（reopen）/ W2（execute 批量）/ W3（apply 锚点）三个 Wave 组织，无批量模式特征（非模板×数据）。

## 总体方案

### W1：reopen stale 回填改 --confirm 门控

**现状（已核证，改动对象）**：`src/run/complete.js:282-296` 回填块无条件执行（无 confirm 判断），回填后 299 行直接置 `stageData.status='completed'`；`src/progress/stage-machine.js:95` 的 completeStage SQL `status IN ('pending','stale')` 一并回填，函数内无 stale 检查。以下均为**改动要求**（目标态）：

- **改动点 1**（complete.js:288-297）：`staleSteps.length > 0` 时分支——
  - 无 `--confirm`：**不进入完成分支**，stale 保持原状，打印醒目指引（stale 步骤数 + 两条出路：`sillyspec run <stage>` 逐个真实执行【runStage 现有 stage.js:162-169 逻辑会把遇到的 stale 转 pending】；或确认方案未变后 `--done --confirm` 回填收尾），返回 `{ stageCompleted: false, staleBlocked: true }`，与 waiting 分支（267-278 行）同型；
  - 带 `--confirm`：按现行逻辑回填 + `pm._appendAuditLog` 记一条 `reopen-stale-backfill`（change/stage/步骤名列表/时间），保留追溯。
- **改动点 2**（stage-machine.js completeStage）：执行 SQL 前检查该阶段 steps 是否含 stale——有则拒绝（报错列出 stale 步骤，提示用 `--force`），已带 `--force` 的既有审计路径（67-76 行）不变。

### W2：execute 批量完成三层零 diff 守卫

**现状（已核证，改动对象）**：`shouldAutoCheckTask`（complete.js:465-472）对普通 task 接受 cannot_verify 草稿；`detectExecuteBatchFinish`（complete.js:536-564）代码核验是整变更级、返回值无 blockedTasks 字段；`generateTaskReviewDrafts`（task-review.js:905-909）已有空 changedFiles 跳过。以下为**改动要求**（目标态），全部针对「CLI 自动生成的 cannot_verify 草稿」（识别标记：review.json `reviewerNotes` 含 `auto-generated draft` 前缀，`src/task-review.js:924` 现有约定）；真实（子代理/手写）pass/fail review 豁免，不影响正常流程：

1. **改动点 3·勾选层**（`shouldAutoCheckTask` complete.js:465 + `autoCheckPlanFromReviews` complete.js:473-524）：签名加可选 `ctx` 参数（类型与构造见接口定义节）；review 为自动草稿且 ctx 给定时，额外要求 `changedFiles` 非空 **且** `git diff --name-only <base>..<head> -- <changedFiles>` 实测非空。不满足 → 不自动勾选该 task checkbox。ctx 缺省（既有调用点）保持现行判定，行为不变。
2. **改动点 4·批量层**（`detectExecuteBatchFinish` complete.js:536-564）：plan 全勾后、批量放行前，逐 task 复核——review.json 缺失，或为自动草稿且有效 diff 为空 → 阻断批量：返回值新增 `blockedTasks: string[]`（task id 列表，见接口定义节），`reason` 文案引用该列表，仍按单步推进。
3. **生成层**（`generateTaskReviewDrafts` task-review.js:905-909）：现有"空 changedFiles 不生成"逻辑**不动**，补回归测试锁定（防未来回退）。

三层叠加语义：未实现 task 若 allowed_paths 误归属他人 diff，勾选层实测 diff 仍非空时可能放行——此残留风险由草稿 `requiredEvidence` 流转 verify 阶段对账兜底（verify-required-evidence 机制既有），风险登记 R-02 记录。

### W3：worktree apply 锚点 merge-base + 冲突列表不静默

**现状（已核证，改动对象）**：`src/worktree-apply.js:371` `diffBase = baselineCommit || baseHash`（旧行为，交付集合与 patch 锚点共用一个变量）；`--3way` 失败时（629-643 行）依赖 `rollbackApply` 的 status 探测列冲突，可能为空报"(未能获取冲突文件列表)"。以下为**改动要求**（目标态）：

- **改动点 5·交付集合锚点不变**：changedFiles 仍按 `git diff --name-status <baselineCommit||baseHash>`（worktree 内）判定（现 385 行命令不动）——保「只合子代理改动」语义，baseline overlay 纯快照文件（checkpoint 后无进一步变更）天然不在集合内。
- **改动点 6·patch 生成锚点改默认 merge-base**（worktree-apply.js:371 拆双变量 + 583/595 行 diff 命令换锚点）：`git merge-base <baseBranch> <branchTip>` 在 projectRoot 实时计算（branchTip 取 worktree 分支；分支已删/计算失败 → 回退现行 `baselineCommit || baseHash` 并 warn）。生成 patch 用 `git diff --binary <mergeBase> -- <交付文件>`：占位文件从 merge-base 视角是"新建真实内容"（非"修改 0 字节占位"）→ main 侧干净创建，无 add/delete 假冲突。
- **改动点 7·新增 `--base <strategy>` flag**：`merge-base`（默认）/ `baseline`（显式回退旧锚点，保边角场景逃生门）。CLI 参数解析在 `src/index.js` worktree apply 分支 + usage 文案同步。
- **改动点 8·冲突列表修复**（`rollbackApply` 调用点 629-643 行）：捕获 `git apply --3way` 的 stderr（`git()` 抛错时透传 e.stderr / 完整 message），解析 `error: patch failed: <file>` / `does not exist in index` / `CONFLICT (...)` 行得冲突文件集，与现有 status 探测结果合并；双源皆空时打印原始 stderr 尾部（截 800 字符），不再只报"(未能获取冲突文件列表)"。

## 文件变更清单（File Changes）

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | src/run/complete.js | W1：stale 回填块改 `--confirm` 门控 + audit log；W2：`shouldAutoCheckTask`/`autoCheckPlanFromReviews` 加草稿零 diff 校验、`detectExecuteBatchFinish` 加逐 task 复核 |
| 修改 | src/progress/stage-machine.js | W1：`completeStage` 存在 stale 步骤时拒绝（--force 例外，复用既有审计） |
| 修改 | src/worktree-apply.js | W3：merge-base 锚点计算 + `--base` 策略分支 + apply stderr 捕获解析进 `rollbackApply` 冲突列表 |
| 修改 | src/index.js | W3：`worktree apply` 子命令解析 `--base <merge-base\|baseline>` + usage 文案 |
| 新增 | test/reopen-stale-confirm.test.mjs | W1 回归：reopen 后 --done 不回填 / --confirm 回填 + 审计 / complete-stage 拒 stale |
| 新增 | test/execute-batch-zero-diff.test.mjs | W2 回归：草稿零 diff 不勾选 / 批量阻断列 task id / 生成器空 diff 跳过 |
| 新增 | test/worktree-apply-merge-base.test.mjs | W3 回归：merge-base 锚点占位文件干净落盘 / --base baseline 回退 / 冲突列表含原始错误 |
| 修改 | test/progress-complete-stage.test.mjs | W1 连带：completeStage stale 拒绝 + --force 放行新用例（task-02 related_tests） |
| 修改 | test/execute-batch-endtoend-checkbox.test.mjs | W2 连带：shouldAutoCheckTask ctx 缺省回归 + ctx 分支用例（task-04 related_tests） |
| 修改 | test/worktree-apply-classification.test.mjs | W3 连带：applyWorktree base 参数回归（task-07 related_tests） |
| 修改 | test/run-complete-step-brainstorm.test.mjs | W1 连带：旧「静默回填」断言更新为 FR-01 新语义（阻断 + --confirm 收尾，集成补丁 ba66940） |
| 修改 | test/execute-run-dir-fail-loud.test.mjs | W2 连带：场景⑤ gate 触发路径更新（FR-04 批量复核提前阻断后改末步完成路径，D-001 不变量等价，c87ca60） |
| 修改 | docs/sillyspec/platform-interface-map.md | 连带：complete.js 行号锚点随插入偏移刷新（doc-ref-check 回归） |
| 修改 | docs/sillyspec/file-lifecycle.md | W1 步骤流转语义（stale 回填条件）变化，同步描述 + updated_at |
| 修改 | .sillyspec/docs/sillyspec/modules/progress.md | W1/W2 行为变化的模块文档同步（execute 阶段收尾批量守卫） |
| 修改 | .sillyspec/docs/sillyspec/modules/worktree.md | W3 锚点策略与冲突报错的模块文档同步 |

字段数据流标注（W2 新增判定用字段，均为读侧派生、无新持久化字段）：草稿识别标记 producer=`generateTaskReviewDrafts`（reviewerNotes 前缀 `auto-generated draft`，既有）→ 消费方 `shouldAutoCheckTask`/`detectExecuteBatchFinish` 读 review.json 同字段判定；`--base` flag producer=`src/index.js` argv 解析 → consumer=`applyWorktree` 参数（纯 CLI 内存透传，不落盘）。

## 接口定义

```js
// W1：completeStep 阶段完成分支（内部，签名不变，行为变化）
// 返回 { stageCompleted: false, currentIdx, staleBlocked: true } —— 新增 staleBlocked 标记供测试断言

// W2：shouldAutoCheckTask 扩展（src/run/complete.js，导出供测试）
/**
 * @param {{ok?:boolean, review?:{specVerdict?:string, qualityVerdict?:string, reviewerNotes?:string, changedFiles?:string[]}}} r readReview 结果
 * @param {boolean} endToEnd 端到端/deployment-critical task 判定（现行）
 * @param {{gitDir: string, base: string, head: string}|null} [ctx] 实测 diff 上下文；缺省保持现行判定
 * @returns {boolean}
 */
shouldAutoCheckTask(r, endToEnd, ctx = null)
// ctx 构造示例（autoCheckPlanFromReviews 内，与 generateTaskReviewDrafts task-review.js:814-842 同源）：
//   const meta = new WorktreeManager({ cwd }).getMeta(changeName)
//   const base = meta?.baselineCommit || meta?.baseHash            // string（40 位 commit hash）
//   const gitDir = (meta?.worktreePath && meta.mode !== 'in-place-fallback' && existsSync(meta.worktreePath))
//     ? meta.worktreePath : cwd                                   // string（绝对路径）
//   const head = gitQuiet(gitDir, ['rev-parse', 'HEAD'])           // string（40 位 commit hash）
// 实测：gitQuiet(gitDir, ['diff', '--name-only', `${base}..${head}`, '--', ...changedFiles]) 非空

// W2：detectExecuteBatchFinish 返回值扩展
{ batched, aligned, reason, blockedTasks?: string[] } // blockedTasks：阻断批量的 task id 列表（如 ['task-03','task-08']）

// W3：applyWorktree 参数扩展（src/worktree-apply.js）
applyWorktree(changeName, { checkOnly, merge, base = 'merge-base' })
// base: 'merge-base'（默认，实时 git merge-base <baseBranch> <branchTip>）| 'baseline'（旧行为）
// merge-base 计算失败 → warn + 回退 baselineCommit||baseHash（fail-open 到现行行为，不阻断）
```

## 生命周期契约表

本变更涉及步骤状态机（state transition）语义，契约如下：

| 事件 | 发起方 | 接收方 | 必需字段 | 状态变化 |
|---|---|---|---|---|
| reopen --from-step N | agent CLI | steps 表 | stage, fromStep, changeName | step N → pending；N+1..end → stale；stage → revising（不变） |
| --done（无 confirm，有 stale） | agent CLI | steps 表 | stage, changeName | 当前步骤 → completed；stale 保持 stale；stage 不完成（新增门控） |
| --done --confirm（有 stale） | agent CLI | steps 表 + audit log | stage, changeName, confirm | stale 全部 → completed + audit `reopen-stale-backfill`；stage → completed |
| run <stage>（遇 stale） | agent CLI | steps 表 | stage, changeName | 首个 stale → pending（现行 stage.js:165 行为，不变） |
| progress complete-stage（有 stale，无 --force） | agent CLI | steps 表 | stage, changeName | 拒绝执行（新增门控），stale 不变 |
| execute 批量完成（逐 task 校验通过） | CLI 内部 | steps 表 + plan.md | plan 全勾 + 每 task 有效 diff 非空 | 剩余 pending/in-progress step → completed（新增前置条件） |
| worktree apply --3way 冲突 | CLI 内部 | 工作区 + result.errors | 冲突文件列表（stderr 解析 ∪ status 探测） | 工作区回滚 apply 前状态（不变）；错误信息必含文件列表或原始 stderr |

## 数据模型

无表结构/Schema 变更。steps 表 `status` 枚举值集不变（stale 仍在 `VALID_STATUSES`，`src/progress/step-store.js:8`）；仅改变 stale → completed 的转换条件。audit log 复用现有 `_appendAuditLog`（action 字符串新增 `reopen-stale-backfill` 取值）。

## 兼容策略

- 未传 `--confirm` 的 reopen 收尾会从"静默回填"变为"阻断 + 指引"——这是**有意的破坏性收口**（debt 文档期望方向），阻断态可用 `--done --confirm` 一键恢复旧行为，操作成本一句话。
- `shouldAutoCheckTask` 新 ctx 参数可选，既有调用点（无 ctx）行为不变；只有 execute 批量路径传入 ctx。
- `applyWorktree` `--base` 缺省 `merge-base`：merge-base 计算失败自动回退现行锚点（fail-open），旧调用方（未传 base）在正常 git 拓扑下行为等价或更优；`--base baseline` 完整保留旧行为。
- `progress complete-stage` 拒绝 stale 仅影响手工修复路径，`--force` 逃生门既有。
- 已发布 npm 包行为变化随下次发版生效，`.sillyspec/` 进度库无迁移需求（无 schema 变更）。

## 风险登记（Risk）

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | W1 收口后，既有"reopen 后机械 --done 收尾"的使用习惯被打破，agent 需多打一次 --confirm | P2 | 阻断信息给出一行命令示例； QUICKLOG/文档同步说明 |
| R-02 | W2 勾选层实测 diff 非空仍可能是误归属（task allowed_paths 覆盖他人文件） | P1 | 残留场景由草稿 requiredEvidence → verify 阶段逐条对账兜底（既有机制）；design 明示不为误归属做语义判定（SillySpec 只做确定性校验，语义判定归 sillyhub——定位分工） |
| R-03 | W3 merge-base 锚点在"主仓已提交推进 + overlay 文件重叠"场景引入新合并面 | P1 | 交付集合仍按 baselineCommit..tip 判定（overlay 纯快照文件排除在外）；真冲突由 --3way 实测回滚 + 冲突列表（FR-04 修复后）显式暴露；`--base baseline` 逃生门 |
| R-04 | W2 逐 task 实测 diff 增加 execute --done 的 git 调用次数（每 task 一次） | P2 | task 数通常 ≤12，git diff --name-only 带路径限定毫秒级；批量化为单次 diff + 内存过滤 |
| R-05 | Windows CRLF/路径分隔符影响 diff 实测与 merge-base 计算 | P2 | 沿用 `git-helper.js` 数组参数 + 路径 `/` 归一化既有约定；测试在 Windows 本机跑 |
| R-06 | 生命周期契约表事件"execute 批量完成"的前置条件变化影响依赖批量收尾的既有 change | P2 | 只对"草稿 + 零 diff"阻断；真实 pass review 不受影响；测试覆盖混合场景 |

## 决策追踪

- D-001@v1（type: architecture）：选方案 B 状态机增强而非方案 A 全 fail-closed 删除——回填/草稿/便利机制保留，加显式门控与守卫。覆盖 FR-01/FR-02/FR-03；evidence：用户 2026-08-19 AskUserQuestion 选择。
- D-002@v1（type: boundary）：草稿识别用 reviewerNotes `auto-generated draft` 前缀，不新增 review.json schema 字段——避免 schemaVersion 变更与读旧文件兼容负担。覆盖 W2 全部；evidence：`src/task-review.js:924` 既有约定。
- D-003@v1（type: architecture）：apply 交付集合锚 baselineCommit 不变、patch 锚点改 merge-base——双层锚点各司其职（集合=只合子代理改动，patch=干净 preimage）。覆盖 FR-03；evidence：debt 文档实测（merge-base ed45bf54 下 diff 干净）。
- D-004@v1（type: boundary）：waiting 消费记录、reopen 显示清零两条 debt 子项核证为不复现/已有机制，记非目标不修。evidence：`stage-machine.js:421-431`、`complete.js formatWaitHistory`。

## 自审（Self-Review）

1. 章节齐全：背景/目标/非目标/拆分判断/总体方案/文件清单/接口定义/生命周期契约表/数据模型/兼容策略/风险登记/决策追踪/自审——✅（对照 step 6 必含清单逐项核对）。
2. 生命周期契约表已含（涉及 state transition 关键词），7 个事件各有对应任务与测试（tasks.md 对齐）。✅
3. 文件清单 10 行，全部落在 W1/W2/W3 归属模块（runtime/progress/worktree/cli-entry + docs + test）；新增字段数据流已标注（reviewerNotes 读侧派生 + --base 内存透传，均无持久化新字段）。✅
4. 接口签名向后兼容性逐一核对：`shouldAutoCheckTask` ctx 可选、`applyWorktree` base 缺省、`detectExecuteBatchFinish` 返回值只增字段。✅
5. ⚠️ 自审存疑一处：R-02 误归属残留是否需要在勾选层加"文件唯一归属"启发式（某文件被多 task allowed_paths 命中时归属最先声明者）——判定为不做：启发式会引入新的误判面，与「SillySpec 只做确定性校验」定位冲突，verify 对账兜底已存在。若 Grill 有异议可复议。
6. design.md frontmatter（author/created_at/scale/risk_level/status）齐全，scale=large（3 workstream、4+ 源文件、状态机语义变化）。✅
7. 依据链：三缺陷的代码位置均经本会话 Read 核证（complete.js:282-296/536、stage-machine.js:95/421-431、worktree-apply.js:371、task-review.js:905-924），无凭记忆断言。✅
8. Grill 轮 1 修正（Design Grill 2026-08-19）：三处 P0 误读（总体方案目标态被当现状）已通过「现状（已核证）→ 改动点 N」显式结构消除，改动点带 file:line 锚点；D-C4（blockedTasks 文案与返回值）在改动点 4 显式引用接口定义；D-C7（ctx 类型模糊）在接口定义补 JSDoc 类型 + 构造示例（与 generateTaskReviewDrafts 同源）。见 decisions.md D-005@v1。✅
