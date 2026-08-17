---
author: qinyi
created_at: 2026-08-17 08:45:00
updated_at: 2026-08-17 08:45:00
scale: large
risk_level: unit-sufficient
---

# 设计文档（Design）— quick 完成时自动关闭关联真实变更

## 1. 背景

SillySpec quick 阶段定位为“轻量逃生通道”：当变更被评估为 small 规模时，可直接执行，跳过完整的 `brainstorm → plan → execute → verify → archive` 流程。当前 quick --done 完成后，CLI 会：

1. 将 QUICKLOG 条目从「进行中」翻为「已完成」；
2. 勾选关联变更 `changes/<name>/tasks.md` 中对应 qlId 的 task；
3. 清理 `.runtime/quick-sessions/<sessionId>/` 目录；
4. 调用 `unregisterChange` 注销 `quick-<hex>` sessionId 自身的 changes 表记录。

但第 4 步只对 sessionId 自身生效，对 `guard.linkedChanges` 中关联的真实变更（例如 `2026-08-16-auto-sync-from-repo`）没有任何处理。结果：这些变更仍停留在 `sillyspec.db` 的 `status='active'`、`current_stage='brainstorm'`，目录也仍留在 `changes/` 下，造成“已完成但未归档”的僵尸变更。平台变更中心通过同步 `sillyspec.db` 读取状态，也会长期显示该变更为活跃。

本设计为 quick --done 增加“轻量归档”能力：当关联变更的任务已全部完成时，自动将其 `status` 改为 `archived`，并将目录移动到 `changes/archive/`。

## 2. 设计目标

- **DG-01**：quick --done 完成后，对 `guard.linkedChanges` 中的真实变更执行生命周期闭环。
- **DG-02**：只有在关联变更的任务全部完成时才自动归档，避免误关多任务变更。
- **DG-03**：归档动作轻量，不依赖完整 archive 阶段的 `plan.md` / `module-impact.md` 硬校验。
- **DG-04**：归档失败不阻断 quick 完成，以 warn 形式透出。
- **DG-05**：Windows / Linux / macOS 路径行为一致。

## 3. 非目标

- 不改变无 `linkedChanges` 的 quick 行为。
- 不改造完整 archive 阶段本身。
- 不新增 DB schema、配置项、CLI flag。
- 不对没有 `tasks.md` 的关联变更自动归档（保守策略，避免误关）。

## 4. 拆分判断

本变更逻辑上是一个单一功能（quick 收尾时自动归档已完成关联变更），但涉及：

- 流程控制核心（`src/run/complete-handlers.js`）；
- 阶段定义（`src/stages/quick.js` prompt）；
- 文档同步（`file-lifecycle.md`、prompt 镜像、skill）；
- 新增测试。

文件数超过 3 个且触及文件生命周期，因此走 `brainstorm → plan → execute → verify → archive` 完整流程，不按 quick 处理。

## 5. 总体方案

### 5.1 整体流程

```text
quick start
  ├─ allocateQuicklogEntry
  │     └─ 对每个 linkedChange appendTaskCheckbox: - [ ] <qlId> <desc>
  ├─ quick run step1/step2
  └─ quick --done
        ├─ completeQuicklogEntry
        │     └─ checkTaskCheckbox: - [ ] → - [x]
        ├─ closeQuickLinkedChanges (新增) ← 本变更核心
        │     ├─ 读 tasks.md
        │     ├─ 仍有 - [ ] → skip + warn
        │     └─ 全 - [x] → 轻量归档
        │           ├─ unregisterChange (status active → archived)
        │           ├─ rename changes/<c>/ → changes/archive/<date>-<c>/
        │           ├─ archiveWorktreeCleanup
        │           └─ git add archive/<date>-<c>/
        └─ unregister quick-<hex> sessionId
```

### 5.2 核心函数

在 `src/run/complete-handlers.js` 新增并导出：

```js
/**
 * quick --done 完成后，自动关闭任务已全部完成的关联真实变更。
 * @param {Object} opts
 * @param {ProgressManager} opts.pm
 * @param {string} opts.cwd
 * @param {string} opts.specBase
 * @param {string[]} opts.linkedChanges
 * @param {Object} [opts.platformOpts]
 * @returns {Promise<{ closed: string[], skipped: {name:string, reason:string}[] }>}
 */
export async function closeQuickLinkedChanges({ pm, cwd, specBase, linkedChanges = [], platformOpts = {} })
```

辅助函数（同文件，不导出）：

```js
// 读 changes/<name>/tasks.md，无未勾选 task 返回 true
function isChangeTasksComplete(specBase, changeName)

// 对单个变更执行轻量归档（无 plan.md 校验）
async function closeSingleQuickLinkedChange({ pm, cwd, specBase, changeName, platformOpts })
```

### 5.3 判定规则

`isChangeTasksComplete` 的实现：

1. 取 `changes/<name>/tasks.md` 路径。
2. 文件不存在 → 返回 `false`（保守不关闭）。
3. 将 CRLF 归一化为 LF。
4. 用正则 `/^-\s*\[\s*\]\s+/m` 匹配是否还有未勾选 task。
5. 无未勾选 → `true`。

### 5.4 轻量归档规则

`closeSingleQuickLinkedChange` 的实现：

1. 源目录 `srcDir = join(specBase, 'changes', changeName)`。不存在 → skip。
2. 目标目录名 `destName = archiveDestDirName(date, changeName)`。
3. 目标目录 `destDir = join(specBase, 'changes', 'archive', destName)`。已存在 → skip（调用 `findAlreadyArchivedDir` 辅助判定是否已归档）。
4. `mkdirSync(archiveDir, { recursive: true })`。
5. `renameSyncRetry(srcDir, destDir)`。
6. `pm.unregisterChange(cwd, changeName)`。
7. `await archiveWorktreeCleanup(cwd, changeName, specBase, platformOpts)`。
8. `safeGit(cwd, ['add', '--', `.sillyspec/changes/archive/${destName}/`])`。
9. 打印 `📦 关联变更已自动归档：${changeName} → archive/${destName}/`。

### 5.5 失败策略

- 单个变更归档失败：catch warn，继续处理下一个 linkedChange，不阻断 quick 完成。
- 全部处理完成后返回报告，供日志打印。

## 6. 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | src/run/complete-handlers.js | 新增并导出 `closeQuickLinkedChanges`；`handleQuickStageCompletion` 末尾调用；复用 `archiveDestDirName`、`archiveWorktreeCleanup`、`renameSyncRetry`、`safeGit` |
| 修改 | src/stages/quick.js | step3 prompt 增加“关联变更全完成时 CLI 自动归档”说明 |
| 新增 | test/quick-close-linked-changes.test.mjs | 覆盖自动归档、未完成任务不误关、目录已存在幂等 |
| 修改 | test/quick-cli-managed-e2e.test.mjs | 既有 e2e 断言适配新契约：--done 后关联变更目录移至 archive/，断言改为归档目录两级匹配 + 自动归档提示 + 原目录已移走 |
| 修改 | docs/sillyspec/file-lifecycle.md | 同步 quick 阶段生命周期描述 |
| 修改 | docs/prompt/quick.md | 镜像同步（改 `src/stages/quick.js` 后重跑 `node docs/prompt/_extract.mjs` 刷新） |
| 修改 | docs/prompt/_extracted.json | 由 `_extract.mjs` 自动生成 |
| 修改 | .claude/skills/sillyspec-quick/SKILL.md | 若使用指引涉及阶段生命周期，同步说明 |

## 7. 接口定义

### 7.1 closeQuickLinkedChanges

```js
export async function closeQuickLinkedChanges({
  pm,        // ProgressManager 实例
  cwd,       // 项目根目录
  specBase,  // .sillyspec 根目录
  linkedChanges = [], // 关联变更名列表
  platformOpts = {},  // 平台模式相关选项
}) {
  // returns { closed: string[], skipped: { name: string, reason: string }[] }
}
```

### 7.2 isChangeTasksComplete

```js
function isChangeTasksComplete(specBase, changeName) {
  // returns boolean
}
```

### 7.3 closeSingleQuickLinkedChange

```js
async function closeSingleQuickLinkedChange({
  pm, cwd, specBase, changeName, platformOpts,
}) {
  // returns { closed: boolean, destDir?: string, reason?: string }
}
```

## 7.5 生命周期契约表

本次变更涉及 lifecycle / state transition / complete 关键词，生命周期契约如下：

| 事件 | 发起方 | 接收方 | 必需字段 | 状态变化 |
|---|---|---|---|---|
| quick start | CLI run/command.js | changes/<c>/tasks.md | qlId, desc | 追加 `- [ ]` 未勾选 task |
| quick done output | CLI run/complete-handlers.js | QUICKLOG + tasks.md | qlId, resultText | `- [ ]` → `- [x]`；QUICKLOG 翻已完成 |
| close linked change | CLI run/complete-handlers.js | sillyspec.db changes 表 + FS | changeName | `status: active → archived`；`changes/<c>/` → `changes/archive/<date>-<c>/` |

## 8. 数据模型

不涉及 schema 变更。复用现有 `changes` 表字段：

- `status`：由 `active` 改为 `archived`。
- `last_active`：随 `unregisterChange` 更新。
- `title`：保留。

## 9. 兼容策略

- **无 linkedChanges**：代码不进入 `closeQuickLinkedChanges` 或进入后遍历空数组，行为与当前完全一致。
- **linkedChanges 中变更未完成**：`isChangeTasksComplete` 返回 `false`，仅打印提示，不修改 DB 与 FS。
- **归档失败**：单个变更失败 catch warn，不影响 quick 自身完成。
- **brownfield 会话**：guard.json 可能无 `linkedChanges` 字段，按空数组处理。
- **平台同步**：`unregisterChange` 内部调用 `_touchLocalModified`，沿用现有同步路径，无需额外修改。

## 10. 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | 并发会话：quick 归档时另一 execute 会话刚启动、尚未在 tasks.md 写入 task | P1 | 以 tasks.md 全勾选作为硬闸门；归档失败不阻断；文档明确该判定基于 tasks.md 当前快照 |
| R-02 | 目标目录冲突：`changes/archive/<date>-<desc>/` 已存在 | P2 | 移动前检查 `existsSync(destDir)`，存在则 skip + warn |
| R-03 | 轻量归档后变更目录在 archive/，用户后续想走完整 archive 阶段可能找不到 | P2 | `archiveChangeDirectory` 已有 `findAlreadyArchivedDir` 自愈路径；文档说明 quick 轻量归档不可逆 |
| R-04 | rename 失败（文件占用、权限） | P2 | 复用 `renameSyncRetry`（已有退避重试）；失败 warn 不阻断 |
| R-05 | prompt 镜像/文档同步遗漏 | P2 | 变更清单明确列出 file-lifecycle.md、prompt 镜像、skill；执行阶段用 checklist 逐项确认 |

## 11. 决策追踪

- **D-001@v1**：关闭动作 = 移动目录到 archive/ + `unregisterChange`（用户决策）。
- **D-002@v1**：判定条件 = `tasks.md` 全勾选才归档（用户决策）。
- **D-003@v1**：不改造 `archiveChangeDirectory` 复用，采用轻量归档路径（设计决策；因 archive 阶段有 plan.md/module-impact 硬校验，quick 场景不适用）。

## 12. 自审

- 已覆盖 FR-01 ~ FR-08。
- 已包含生命周期契约表（命中 lifecycle / state transition / complete 关键词）。
- 文件变更清单已列出新增/修改/说明。
- 风险登记已覆盖并发、目录冲突、rename 失败、文档同步遗漏。
- 兼容策略已覆盖无 linkedChanges、任务未完成、归档失败、brownfield。
- 测试计划已在 `tasks.md` 中明确。
