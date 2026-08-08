---
created_at: 2026-08-08T08:17:32+08:00
author: qinyi
scale: large
source: docs/sillyspec/multi-agent-review-2026-08-08.md §2.1 S1
risk_level: unit-sufficient
---

# 设计文档（Design）— noAI 步骤收尾补全阶段完成 gate（completeStageGates 收敛）

## 1. 背景

多代理审查（`docs/sillyspec/multi-agent-review-2026-08-08.md` §2.1 S1）发现：**noAI 步骤作为阶段最后一步时，`runStage` 的自动收尾分支直接把 `stageData.status='completed'` 落盘，绕过了 `runStageCompletionGates` 及一系列阶段完成 handler**。已读码确认（`src/run/stage.js:337-343`）。

`runStageCompletionGates` 全局只在 `src/run/complete.js:464`（completeStep 阶段完成分支）调用一次。阶段完成收尾逻辑分散在三个函数，只有 completeStep 真正跑 gate：

| 路径 | 位置 | 现状 |
|---|---|---|
| `completeStep` 阶段完成分支 | `complete.js:333-475` | 完整收尾（gate + handler + 校验）✅ |
| `runStage` noAI 末步 | `stage.js:317-345` | 只标 completed + 落盘，绕过全部 gate/handler ❌（S1） |
| `continueStep` 完成分支 | `complete.js:859-919` | 只标 completed + 落盘，绕过全部 gate/handler ❌（S2） |
| `completeStep` validator 守卫 | `complete.js:389, 463` | `actualCompleted === actualTotal` 守卫使 skip 任一 optional 步骤 → validator 整体跳过 ❌（S3） |

**确认的受害者**：
- **plan 阶段**：`buildPlanSteps` 末步 `postcheck` 是 noAI（`plan.js:486`）。agent 完成 coordinator 后 `--done` → CLI 自动跑 `executePlanPostcheck` → 直接标 plan completed。被绕过：`runStageCompletionGates` 中的 **Stage Review Gate（tier=independent 时 plan 审查 review.json verdict=fail 不再阻断完成）** 与 **Plan→Execute Contract（`validatePlanForExecute`）**。即 plan 的独立审查门控形同虚设。
- **平台 quick scan**：`scan-profile.js:164` 把 step3 设为 noAI `scanPostcheck` 末步。平台模式 quick scan 完成 → 跳过 `handleScanStageCompleted` → manifest.json / postcheck-result.json / SCAN_COMPLETED 指针全部不落盘，SillyHub 看不到 scan 完成。

**精确触发条件**：noAI 步骤是阶段最后一步（非末步的 noAI 如 scan step1 preflight 只标自身 completed + 前进，gate 在后续 completeStep 跑，无 bug）。

## 2. 设计目标

1. 让 noAI 末步收尾、continueStep 完成分支、completeStep 三处走**同一套阶段完成 gate + handler + 校验**，消除 S1/S2 的绕过。
2. 修复 S3：阶段完成校验不再因 skip 任一 optional 步骤而整体跳过（计数改为 `completed || skipped`）。
3. 保证 plan 的 independent-tier Stage Review Gate fail verdict 与 Plan→Execute Contract 在 noAI 末步路径上重新生效。
4. 保证平台 quick scan 的 manifest.json / SCAN_COMPLETED 在 noAI scanPostcheck 末步路径上重新落盘。
5. 行为收敛但不改语义：completeStep 的现有收尾行为不变，只是把 gate/校验/handler 段抽出共享；noAI/continueStep 接入后获得等价保护。

## 3. 非目标（Non-Goals）

- **不改 `executePlanPostcheck`**：它做 Wave 拓扑排序 + 蓝图一致性 + plan 产物校验，与 gate 中的 `validatePlanForExecute`（plan→execute 契约）目的不同、重叠有限，不在本次去重范围。
- **不修 ARCHITECTURE.md 过时**（仍是 W6 前 `run.js:1454` 描述）——单独文档债。
- **不修 `_module-map.yaml` schema_version=1**（旧格式）——单独文档债。
- **不修 S4+**（审查报告里 plan.md / tasks.md 共享写竞态 lost-update、`requiresWait` 加硬门等需独立 design 决策项）。
- **不引入对 `requiresWait` answer 伪造的硬门**（self-audit #7 已知 open follow-up，属定位决策）。
- 不改 completeStep 的"标 completed + 落盘 + triggerSync + user-inputs + 下一步提示 + handleQuickStageCompletion + reopen 回填"等周边逻辑（它们本就因调用路径而异，各处自管）。

## 4. 拆分判断

单变更、不拆分、不走批量。三处接入点（completeStep / runStage-noAI / continueStep）共用一个新抽出的 `completeStageGates` 函数，属"收敛重构"而非"多模块并行开发"。范围明确（3 个源文件 + 测试 + 文档同步），一个 change 内完成。

## 5. 总体方案

### 5.1 抽出 `completeStageGates`（src/run/gates.js）

把 completeStep 阶段完成分支中"validateMetadata → validateFileLocations → auxiliary 重置 → runStageCompletionGates → handleExecuteWorktreeCleanup"这段收尾校验序列，连同 `handleScanStageCompleted`，抽成共享函数 `completeStageGates`。`runStageCompletionGates` 本身已是从 completeStep 抽出的共享 gate 级联（`gates.js:168` 注释），`completeStageGates` 在其上再包 handler + 元数据校验层。

```
completeStageGates({ stageName, cwd, changeName, platformOpts, specBase, progress, pm, stageData, steps, currentIdx })
  ├─ handleScanStageCompleted(...)    # scan 平台 manifest（S1 平台受害者）；返回 truthy 则透传 early-return
  ├─ validateMetadata(cwd, stageName, specBase)
  ├─ validateFileLocations(...)        # 仅当 (completed||skipped) 计数 === steps.length 时跑（修 S3）
  ├─ auxiliary 阶段重置                # stageDef.auxiliary 时重置 steps + stageData.status='pending'
  ├─ const r = runStageCompletionGates(...)  # 已存在的 gate 级联
  │    if (r) return r                 # gate 失败已 rollback，透传 early-return
  ├─ handleExecuteWorktreeCleanup(...)
  └─ return null                       # 全部通过
```

### 5.2 三处接入（行号经源码复核，Design Grill G2 修正）

1. **completeStep（`complete.js:378-472`）**：现有 `handleScanStageCompleted` + `validateMetadata` + `validateFileLocations` + auxiliary 重置 + `runStageCompletionGates` + `handleExecuteWorktreeCleanup` 段 → 替换为单个 `completeStageGates(...)` 调用。S3 的 `actualCompleted === actualTotal` 两处守卫（389/463）随之移入 `completeStageGates` 内部并改为 `completed || skipped` 计数；`complete.js:466-469` 的 `else if (actualCompleted < actualTotal)` warning 分支（G3）同步移入共享函数，条件改 `(completed‖skipped) < total`，语义不变（未全部结案时记 warning 不阻断）。completeStep 仍自管：handleQuickStageCompletion、reopen 回填、标 completed、triggerSync、user-inputs、下一步提示。
2. **runStage noAI 末步（`stage.js:331-358`）**：noAI 分支结构 = cliAction 分发(335-341) + 标 STEP completed(342-344) + 推进/完成判定(346-356) + return(357)。当 nextIdx===-1（末步）已执行 `stageData.status='completed'`(352) + 落盘(354) 后、`return`(357) 前，插入 `const _r = await completeStageGates(...); if (_r) return _r`。（Design Grill G2 修正：标 stage completed 在 352-354，非 cliAction 分发段 337-343；executePlanPostcheck 在 339-341 已先行跑过 plan-postcheck 校验，与 gate 不冲突。）
3. **continueStep 完成分支（`complete.js:859-919`）**：标 completed(859-862) + 落盘后，插入 `completeStageGates(...)` 调用；**同时删除 864-892 的内联 execute worktree 清理块**（Design Grill B1：与 `handleExecuteWorktreeCleanup` 逐行等价，completeStageGates 内部已含，保留会双重清理——第二次 `getMeta` 返回 null 打印误导性 "Worktree: n/a"）。下一步提示段（893-918，含 nextStageHint / brainstorm scale 分叉 / execute autoCheckPlanFromReviews）保留——completeStageGates 不含提示逻辑。

### 5.3 顺序安全性（已读码验证）

`rollbackStageCompletion`（`gates.js:140-150`）只在 `stageData.status === 'completed'` 时回滚为 in-progress，注释明示"辅助阶段在 validator 前已被重置为 pending（steps 也换成了新数组），不要覆盖"。因此 auxiliary 重置（status→pending）放在 gate 之前是安全的：gate 失败 rollback 不会破坏 auxiliary 的 pending 状态。该顺序与 completeStep 现有顺序一致，不引入新语义。

### 5.4 实现陷阱（Design Grill feasibility 项补充）

`completeStageGates` 内 auxiliary 重置会把 `stageData.steps` 替换为 freshSteps（全 pending 新数组）。此后 `runStageCompletionGates` 内的守卫计数（`completed‖skipped === total`）**必须用入参 `steps`（pre-reset 原数组）**，不能重读 `stageData.steps`——reset 后 `stageData.steps` 已是 freshSteps（全 pending），重读计数恒为 0 → 守卫恒不满足 → gate 永久跳过，引入新 bug。`runStageCompletionGates` 签名已接收 `steps` 入参（与 `rollbackCompletionAndReturn` 同源，`gates.js:176`），实现时确保守卫与 `rollbackStageCompletion` 均用入参 `steps` 而非重读 `stageData.steps`。

## 决策记录（方案选择 / Decisions）

本变更的关键技术决策（用户在 brainstorm step3/step4/step5 经 AskUserQuestion 亲手选定，或 Design Grill 审查确定）：

- **D-001@v1** — 修复范围 = S1 + S2 + S3 三处"阶段完成收尾"不对称（不止 S1）。`source=user`，`status=decided`。依据：三者同源（阶段完成收尾分散在 completeStep/runStage-noAI/continueStep），一次性收敛避免遗留 S2/S3 另立项。
- **D-002@v1** — 共享函数粒度 = `completeStageGates`（gate 管线收敛），非全量 `completeStage` 单一入口。`source=user`，`status=decided`。依据：bug 根因在 gate/校验/handler 分散而非"标 completed"本身；全量入口要处理 outputText/quick/reopen 等 conditional 逻辑，回归风险最高（Design Grill 方案对比 A/B/C，选定 B）。
- **D-003@v1** — `completeStageGates` 落 `gates.js`，`validateMetadata`/`validateFileLocations` 迁移至 gates.js 并 export（B2）。`source=design`，`status=decided`。依据：gates.js 已是 gate/校验模块的家，且已由 stage.js/complete.js import，引入 completeStageGates 无新循环依赖。
- **D-004@v1** — continueStep 接入时删除 864-892 内联 worktree cleanup（B1），由 completeStageGates 内 handleExecuteWorktreeCleanup 统一，避免双重清理。`source=design-grill`，`status=decided`。

覆盖矩阵（不单独建 decisions.md，决策记录在本节）：

| ID | 覆盖任务 |
|---|---|
| D-001@v1 | task-01~task-04（共享函数 + 三处接入） |
| D-002@v1 | task-01（completeStageGates 定义，gate 管线粒度） |
| D-003@v1 | task-01（符号迁移至 gates.js） |
| D-004@v1 | task-03（删除 continueStep 内联 cleanup） |

## 6. 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | `src/run/gates.js` | (a) 新增 `export async function completeStageGates(...)`；(b) **迁移** `validateMetadata`（原 complete.js:29）+ `validateFileLocations`（原 complete.js:80，均私有未 export）至 gates.js 并 export——completeStageGates 内部要调它们（Design Grill B2）；(c) gates.js 新增 import `handleScanStageCompleted` + `handleExecuteWorktreeCleanup`（from complete-handlers.js）+ `stageRegistry`（from stages/index.js，auxiliary 重置判定用） |
| 修改 | `src/run/complete.js` | (a) completeStep 阶段完成分支：校验/gate/handler 段替换为 `completeStageGates` 调用，移除两处 `actualCompleted===actualTotal` 守卫 + 466-469 warning 分支（移入共享函数）；(b) `validateMetadata`/`validateFileLocations` 改从 gates.js import（迁移后）；(c) continueStep 完成分支：标 completed+落盘后补 `completeStageGates` 调用 + **删除 864-892 内联 worktree cleanup**（B1） |
| 修改 | `src/run/stage.js` | noAI 末步分支：标 stage completed(352-354)+落盘后、return(357) 前补 `const _r = await completeStageGates(...); if (_r) return _r`；新增 import completeStageGates from gates.js |
| 新增 | `test/noai-completion-gate.test.mjs` | 5 项复现测试（见 §11 测试策略） |
| 修改 | `docs/sillyspec/file-lifecycle.md` | 同步：noAI 末步现在走 completeStageGates（不再直接标阶段完成） |
| 修改 | `docs/prompt/`（brainstorm.md / 相关镜像） | 若 prompt 文案提及"noAI 自动完成阶段"行为，按新行为同步（重跑 `node docs/prompt/_extract.mjs`） |
| 修改 | `.claude/skills/` | 若 SKILL 描述 noAI 末步收尾，同步 |

**字段数据流标注**：本次无新增对外字段/接口/DTO/事件 payload。`completeStageGates` 入参 `{ stageName, cwd, changeName, platformOpts, specBase, progress, pm, stageData, steps, currentIdx }` 与 `runStageCompletionGates` 现有入参同构（producer=三处调用方 → completeStageGates 归一化 → consumer=内部 handleScanStageCompleted/validateMetadata/validateFileLocations/runStageCompletionGates/handleExecuteWorktreeCleanup）。无字段透传缺口。

## 7. 接口定义

```js
/**
 * 阶段完成收尾共享管线（从 completeStep 抽出，消除 S1/S2/S3 三处不对称）。
 *
 * 调用契约：调用方已自行标记 stageData.status='completed' 并 pm._write 落盘后调用本函数。
 * gate 失败时内部 runStageCompletionGates→rollbackCompletionAndReturn 会把 stageData.status
 * 回滚为 in-progress（auxiliary 已重置为 pending 的不被覆盖）；调用方收到非 null 返回值应直接 return。
 *
 * @returns {Promise<{stageCompleted:false,currentIdx,nextPendingIdx:number}|null>}
 *          null = 全部通过，调用方继续自管收尾（如下一步提示）；
 *          非 null = gate/handler 失败已回滚，调用方直接 return 该对象。
 */
export async function completeStageGates({
  stageName, cwd, changeName, platformOpts, specBase, progress, pm, stageData, steps, currentIdx
})
```

## 7.5 生命周期契约表

本变更涉及 SillySpec 阶段状态机的「阶段完成 state_transition」（complete 关键词命中），契约如下：

| 事件 | 发起方 | 接收方 | 必需字段 | 状态变化 |
|---|---|---|---|---|
| 阶段完成收尾 | completeStep / runStage-noAI末步 / continueStep | completeStageGates | stageName, stageData, steps, currentIdx, pm, progress | 进入时 stage=completed；gate 通过保持 completed，gate 失败 rollback |
| scan 平台 manifest 落盘 | completeStageGates | handleScanStageCompleted | stageName, cwd, progress, pm, stageData, changeName, outputText, platformOpts | 写 manifest.json / SCAN_COMPLETED 指针 |
| gate 失败回滚 | runStageCompletionGates | rollbackStageCompletion | stageData, steps, currentIdx | completed→in-progress；auxiliary 已重置的 pending 不覆盖 |
| auxiliary 阶段重置 | completeStageGates | stageData | stageDef.auxiliary | steps 重置为 pending 数组，stageData.status→pending |

表内每个事件均有对应代码任务（§5.2 三处接入 + completeStageGates 实现）与测试任务（§11）。无遗漏事件。

## 8. 数据模型

不涉及。无 SQLite schema 变更，无 progress.db / sillyspec.db 表结构改动。仅改内存中 stageData/steps 对象的状态流转逻辑（已有字段）。

## 9. 兼容策略（brownfield）

- **completeStep 路径行为基本保持**（Design Grill G1 修正措辞）：`completeStageGates` 内部序列 = completeStep 现有 handleScanStageCompleted/validateMetadata/validateFileLocations/auxiliary重置/runStageCompletionGates/handleExecuteWorktreeCleanup 序列抽出，**唯一语义变化**是 validator 守卫从 `actualCompleted===actualTotal` 改为 `completed‖skipped` 计数（S3 修复，预期改进：skip optional 步骤不再使 validator 整体跳过）。现有测试应继续通过，除针对旧守卫计数的测试需相应更新。
- **noAI 末步 / continueStep 路径行为收紧**：之前绕过 gate，现在走 gate。这是**修复 bug**，不是 breaking change——gate 本就该跑（completeStep 一直在跑）。若此前有 agent 依赖"noAI 末步绕过 gate"通过本该阻断的阶段，修复后会正确阻断（预期行为）。
- **回退路径**：若 `completeStageGates` 内某 handler/gate 异常，runStageCompletionGates 已 fail-closed（`gates.js:303-307` 异常阻断），不会静默放行。
- **不改变的 API/表结构**：CLI 命令、progress.db schema、stage 定义结构均不变。

## 10. 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R1 | completeStep 替换为 completeStageGates 后，行为细微差异导致现有测试回归 | 中 | completeStageGates 内部序列严格 = completeStep 现有序列；先跑全量 `npm test` 建立基线，接入后对比 |
| R2 | noAI 末步接入 gate 后，plan 的 independent-tier 审查若 marker/review.json 缺失会从"静默通过"变"阻断" | 中 | 这是预期修复；runStageCompletionGates 已有 marker 缺失自生机制（`gates.js:284-292`）。测试覆盖 verdict=fail 阻断 + verdict=pass 通过两路 |
| R3 | continueStep 完成分支接入 gate，窗口窄但可能影响 scan optional 步骤 skip 后的收尾 | 低 | 测试覆盖 scan skip optional 仍跑 validateScanOutputs（S3）+ continueStep gate 失败阻断（S2） |
| R4 | auxiliary 重置与 gate 回滚顺序在 noAI/continueStep 新路径上的交互 | 低 | 已读码验证 rollbackStageCompletion 不覆盖 pending（§5.3）；测试覆盖 scan（auxiliary）noAI 末步路径 |
| R5 | 平台模式（SillyHub）路径在 dogfood 仓难直接测 | 中 | manifest 落盘用单元测试模拟 platformOpts 注入；SCAN_COMPLETED 指针文件存在性断言 |

## 11. 测试策略（红→绿）

| # | 测试 | 复现 | 期望（修复后） |
|---|---|---|---|
| T1 | plan postcheck（noAI 末步）完成后，independent-tier review verdict=fail | S1 | plan 不标 completed，rollback，agent 可修复后重跑 |
| T2 | plan postcheck 后 Plan→Execute Contract（validatePlanForExecute）失败 | S1 | 阻断 plan completed |
| T3 | 平台 quick scan step3（noAI scanPostcheck）完成 | S1 平台 | manifest.json / SCAN_COMPLETED 指针落盘 |
| T4 | continueStep 完成分支，gate（runValidators）失败 | S2 | 阻断，rollback |
| T5 | scan 阶段 skip 任一 optional 步骤后 --done | S3 | validateScanOutputs 仍跑（计数 completed‖skipped） |
| T6 | scan（auxiliary）noAI 末步完成后 | S1+R4（Design Grill G4 补） | auxiliary 重置生效（stageData 回 pending 可重跑）+ manifest 落盘 |
| T7 | execute 经 continueStep 收尾 | B1 回归（Design Grill G4 补） | worktree cleanup 只跑一次（无 "Worktree: n/a" 误导输出） |
| T8 | noAI 末步路径上 skip optional 步骤 | S3 noAI 路径（Design Grill G4 补） | validateFileLocations 仍跑（completed‖skipped 计数在 noAI 路径也生效） |

先写 T1-T8 为失败（红），实现 completeStageGates + 三处接入后转通过（绿）。

## 自审（Self-Review）

- [x] 根因定位准确：读码确认 stage.js:331-358 / complete.js:859-919 / 389/463 三处，非臆测
- [x] 触发条件精确：noAI 步骤是阶段末步（非末步 noAI 无 bug）
- [x] 方案最小侵入：抽共享函数复用现有 runStageCompletionGates，不重写 gate 逻辑
- [x] 顺序安全验证：rollbackStageCompletion 不覆盖 pending（gates.js:141 注释）
- [x] **行号经源码复核**（Design Grill G2 修正）：stage.js 标 stage completed 在 352-354 非 337-343
- [x] **符号迁移声明**（Design Grill B2 修正）：validateMetadata/validateFileLocations 迁 gates.js，stageRegistry/handlers import 声明
- [x] **continueStep 双清理避免**（Design Grill B1 修正）：删除 864-892 内联 worktree cleanup
- [x] Non-Goals 明确：executePlanPostcheck / ARCHITECTURE.md / _module-map / S4+ / requiresWait 硬门 均排除
- [x] 兼容策略：completeStep 行为基本保持（G1 修正措辞），唯一变化是 S3 守卫计数
- [x] 生命周期契约表覆盖 4 个事件，无遗漏
- [x] 测试覆盖 2 个受害者（plan / 平台 scan）+ S2 + S3 + auxiliary 重置(T6) + 双清理回归(T7) + noAI 路径 S3(T8)
- [x] 文件变更清单含 3 源文件 + 测试 + 文档同步，符号迁移与 import 声明完整
- [x] 风险登记 5 项，均有应对
