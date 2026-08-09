---
author: qinyi
created_at: 2026-08-09T13:30:00+08:00
scale: large
risk_level: unit-sufficient
---

# design.md — stage 完成原子性：persist completed 移到 gate 成功之后 + gate 异常兜底

## 背景与目标

依据 `docs/sillyspec/review-2026-08-09.md` #2 [P1][共识 F+C]。

**问题**：stage 完成分支先把 `stageData.status='completed'` 落盘（complete.js:265 `pm._write`），之后才跑 `completeStageGates`（:278）。硬中断（Ctrl+C / OOM / CI 超时）落在中间 → DB 永久留 completed 而 review gate 从未跑。**verify 阶段窗口最宽**（`runVerifyTestCheck` gates.js:209 同步跑全量测试 2~10 分钟），agent 自报「测试通过」无校验落地。

**叠加**：`runStageCompletionGates`（gates.js:179）内 `runValidators`（:181）/`runVerifyTestCheck`（:209-212）**无 try/catch**——抛非结构化异常直冒顶层 exit 1，`rollbackCompletionAndReturn` 触达不到 → 同样卡死 completed。

**三处调用点同病**：complete.js:262-278（completeStep 完成分支）/ stage.js:352-357（continueStep 完成分支）/ complete.js:720-725（第三处完成分支），均 persist completed（`stageData.status='completed'` + `pm._write`）后才跑 gate。

**目标**：①落盘 completed 移到 gate 成功之后（消除硬中断窗口）；②`runStageCompletionGates` 整体包 try/catch（异常兜底 rollback）。**行为不变**（gate 全过才 completed，gate 失败/异常 rollback in-progress）。

## 决策 / 方案选择

| 方案 | 描述 | 取舍 |
|------|------|------|
| **A 最小原子性（选定）** | 三处 persist（`_write`+`triggerSync`）移到 `completeStageGates` 成功之后 + `runStageCompletionGates` 整体 try/catch | **选定**：最小改动，rollback 依赖 `stageData.status='completed'` 内存不变，风险最低，对应 review #2 建议①② |
| B persist 单点 | persist 移入 `completeStageGates` 内部（gate 成功后 `_write`）+ 三处调用点删 persist | 单点优势，但 `completeStageGates` 签名重构大 + auxiliary 重置 `_write`（gates.js:612）冲突需处理 |
| C CAS/transaction | persist+gate 包 DB transaction 原子 | gate 跑测试 2-10min 长持 DB 锁不现实（better-sqlite3 同步阻塞），排除 |

**③ complete-stage 后门（stage-machine.js:36）defer**（D-001@v1，用户 AskUserQuestion 确认）：本变更不做，单独立项。理由：①② 核心 P1 直接影响 stage 完成原子性；③ complete-stage 是显式恢复路径 + `_validateStageArtifacts` 已堵产物校验 + doctor align 信任声明，风险可控；③ 涉及 progress→run 分层重构（complete-stage CLI 入口 index.js:309 调 gates.js），独立做更稳。③ 记债单 review #2b。

## 方案（实现要点）

### Phase 1：persist completed 移到 gate 成功之后（三处调用点）

三处 stage 完成分支统一改（**标签经 Design Grill 子代理实读源码修正**：complete.js:262-278 completeStep 完成分支 / stage.js:352-357 runStage noAI 末步完成分支〔非 continueStep〕/ complete.js:720-725 continueStep 完成分支）：

1. `stageData.status='completed'` + `completedAt` + `progress.lastActive` **内存保留**（gate rollback `rollbackStageCompletion` gates.js:145 依赖 `stageData.status==='completed'` 判断回滚；gate 跑时内存是 completed，rollback 正常）
2. **删 persist 的 `pm._write`**（移到 gate 后）；**triggerSync 仅 complete.js:262-278 有**（实读源码 Design Grill 修正：complete.js:266 有 triggerSync，stage.js:354 / complete.js:722 原 `_write` 均无 triggerSync）——故只对 complete.js:262-278 移 triggerSync，另两处只移 `_write`、不加 triggerSync（行为不变，不引入新 sync）
3. `user-inputs.md` appendFileSync 保留 gate 前（属 #7 范围，本变更不动）
4. `completeStageGates` 跑
5. `if (_stageGatesResult) return`（gate 失败 `rollbackCompletionAndReturn` 已 `_write` in-progress）
6. **gate 成功后**：`pm._write`（落盘 completed）+ `triggerSync`

**auxiliary 阶段（scan）正确性**：`completeStageGates` 内部 auxiliary 重置（gates.js:601-613）把 `stageData.status='pending'`（内存）+ `_write`。gate 成功后 complete.js `_write` 时 `stageData.status` 内存值决定落盘：
- auxiliary → pending（正确，auxiliary 完成后重置可重跑）
- non-auxiliary → completed（正确）

统一 `_write`，内存值决定落盘状态，无需特判 auxiliary。

### Phase 2：completeStageGates 收尾段整体 try/catch（Design Grill P2#1 修订：扩范围）

**范围扩展**：不只包 `runStageCompletionGates`（gates.js:179，review #2 ②原范围 runValidators/runVerifyTestCheck），而是 `completeStageGates`（:549）的收尾段整体（execute 并发预检 + `handleScanStageCompleted` + `validateMetadata` + `validateFileLocations` + auxiliary 重置 + `runStageCompletionGates` 全部）——任一段抛非结构化异常都 rollback，统一 UX（原子性 Phase 1 已保：persist 移到 completeStageGates 成功返回后，故 completeStageGates 内任何段异常 DB 都留 in-progress 无假 completed；Phase 2 补 rollback 提示）。**不含** :624 `handleExecuteWorktreeCleanup`（execute worktree cleanup 副作用独立，失败不 rollback stage 状态）。

gates.js:549 `completeStageGates` 把 :554-621 段包 try/catch（:616 runStageCompletionGates 失败的 early-return 是正常 return 不被 catch 拦；:624 cleanup 在 try 外）：

```js
export async function completeStageGates({ stageName, cwd, changeName, platformOpts, specBase, progress, pm, stageData, steps, currentIdx, outputText }) {
  try {
    // :554-621（execute 并发预检 + handleScanStageCompleted + validateMetadata + validateFileLocations + auxiliary 重置 + runStageCompletionGates）
    // runStageCompletionGates 失败 → 它内部 rollbackCompletionAndReturn 返回 early-return 对象（正常 return，try 不拦）
    // ... 各段 early-return 保持原语义
  } catch (e) {
    console.error(`\n❌ 阶段 ${stageName} 完成收尾异常（已 rollback）：${e?.message ?? e}`)
    return await rollbackCompletionAndReturn(pm, progress, stageData, steps, currentIdx, cwd, changeName, platformOpts)
  }
  // :624 handleExecuteWorktreeCleanup（try 外，cleanup 失败不 rollback stage）
  await handleExecuteWorktreeCleanup({ stageName, changeName, cwd })
  return null
}
```

任一收尾段抛非结构化异常 → catch → `rollbackCompletionAndReturn`（回滚 in-progress + `_write` + 返回未完成对象），不再冒顶 exit 1。

### Phase 3：测试

新增 `test/stage-completion-atomicity.test.mjs`：
1. `runStageCompletionGates` try/catch 兜底：mock `runValidators` 抛异常 → 返回 rollback 对象（`{stageCompleted:false,...}`），不 throw
2. mock `runVerifyTestCheck` 抛异常 → 同上 rollback
3. 现有 stage 完成 E2E 回归（confirm persist 移后行为不变：gate 全过→completed，gate 失败→in-progress）

## 文件变更清单 / File Changes

- 修改 `src/run/complete.js`（:262-278 completeStep 完成分支 + :720-725 continueStep 完成分支，persist 移后）
- 修改 `src/run/stage.js`（:352-357 runStage noAI 末步完成分支，persist 移后）
- 修改 `src/run/gates.js`（:549 completeStageGates 收尾段 :554-621 整体 try/catch，:624 handleExecuteWorktreeCleanup 在 try 外）
- 新增 `test/stage-completion-atomicity.test.mjs`（completeStageGates 异常兜底 rollback + 原子性）

## 风险登记 / Risk

- **R1 persist 移后破坏 auxiliary 阶段**：auxiliary（scan）完成后重置 pending。**缓解**：gate 成功后统一 `_write`，`stageData.status` 内存值决定（auxiliary=pending，non-auxiliary=completed）；现有 scan/stage 完成 E2E 回归验证。
- **R2 triggerSync 时机**：sync 移到 gate 后（completed 落盘后）。**缓解**：sync 语义是 DB→平台，应在 completed 落盘后；现有平台 sync 测试回归。
- **R3 try/catch 吞错掩盖 bug**：catch rollback 可能掩盖真实异常。**缓解**：catch 内 `console.error` 打印异常信息（不静默）；rollback 后 agent 修复重跑（gate 会重跑暴露问题）。
- **R4 gate 成功后 _write 失败**：gate 全过但 `_write` 失败（DB busy）→ DB 未 completed。**缓解**：`_write` 失败抛错（better-sqlite3 busy 重试 MAX_BUSY_RETRIES=3），agent 重跑；fail-safe（宁可不 completed 不可假 completed，比当前「gate 没跑就 completed」更安全）。
- **R5 第 4 处 persist 站点（pre-existing，本变更不处理）**：`handleScanStageCompleted`（complete-handlers.js:930）scan+平台+warnings 落盘 completed（在 auxiliary reset 前），Design Grill 编目为第 4 处 persist，残留微小窗口。**不处理理由**：scan 是 auxiliary 阶段（完成后 auxiliary reset :601-613 覆盖 pending），即使 persist completed 窗口硬中断，reset 会覆盖，风险小；属 pre-existing 非 review #2 范围。**记债单** review #2c。

## 自审 / Self-Review

- 方案 A 最小改动达成 stage 完成原子性，rollback 依赖不变；与 review #2 建议①② 一致。
- ③ defer（D-001@v1）用户确认，记债单 review #2b。
- 本变更不引入新 stage / 不改 stage 流转定义 / 不改 ProgressManager 存储 schema / 不改运行时文件类型 → 无需同步文件生命周期文档与 prompt 提取。
- 生命周期契约：不适用（本变更不涉及会话、租约、守护进程、claim、agent_run、心跳等运行时生命周期事件，属 stage 完成原子性机械重构无跨进程改动，故无跨进程集成证据要求）。
- **恢复路径覆盖**（Design Grill P2#5）：gate 成功↔post-gate persist 间窗口（gate 全过但 persist `_write` 前硬中断 → DB 未 completed）已被 stage.js:192-209 既有恢复路径（`pm.completeStage` 补盖完成戳，产物齐则补）覆盖，agent 重跑 `--done` 或 doctor align 即可恢复，非新引入风险。
- 非目标（Non-Goals）：不改 user-inputs.md 裸跑（#7 范围）、不改 complete-stage 后门（③ defer）、不统一 persist 到 completeStageGates 内部（方案 B 重构大）、不加 CAS/transaction（方案 C 不现实）。

## 测试方案

新增 `test/stage-completion-atomicity.test.mjs`：
1. `runStageCompletionGates` try/catch：mock `runValidators` 抛非结构化异常 → 返回 rollback 对象（不 throw）；mock `runVerifyTestCheck` 抛 → 同
2. rollback 正确性：gate 异常 → `stageData.status` 回 in-progress + `_write` 落盘
3. 全量 `npm test`（stage 完成 E2E 回归）+ `npm run lint`
