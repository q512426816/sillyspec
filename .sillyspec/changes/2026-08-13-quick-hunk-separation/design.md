---
author: qinyi
created_at: 2026-08-13 11:40:00
scale: large
title: quick --done 同文件并发检测 + hunk 分离提示
risk_level: low
---

# 设计文档（Design）— quick --done 同文件并发检测 + hunk 分离提示

## 背景与目标

**背景**：SillySpec 是多 agent 同仓的 CLI 流程控制器。quick 是最高频并发场景（多 agent 同时跑 quick）。实证：本轮 `src/run/prompt.js` 我改 `loadModuleContextIndex`（warn 降级）+ 他者改 `_outputStepForTest` 注释（test 迁移），`commit -- prompt.js` 整文件 pathspec 夹带了他者注释 hunk（commit f1709ec）。

**根因**：quick --done 边界审计 `auditQuickCompletion`（`src/run/shared.js:496`）baseline 按文件路径整文件跳过——step1 启动录 `baselineFiles`（工作区脏文件路径），--done 时 `isBaselineFile` 按路径跳过整个文件。若我的 allowedFiles 文件含他者改动（同文件并发），step1 baseline 录该文件（他者 M），我 step2 改它，--done 时该文件在 baselineFiles → `isBaselineFile` 跳过整文件，审计既看不到我的改动也看不到同文件并发，commit 整文件 pathspec 夹带他者 hunk。

**目标**：让同文件并发**可见**（quick --done 检测）+ 让用户能**只提交自己的 hunk**（分离指引）。

## 现状

- `auditQuickCompletion`（shared.js:496）：baselineFiles 按路径 isBaselineFile 跳过，changedFiles 只含非 baseline 文件。同文件并发（我的 allowedFile + 他者）→ 该文件在 baseline → 跳过 → 不可见。
- `detectConcurrentChanges`（complete-handlers.js:692）：检测他者改动（不同文件 / 不同 change），advisory。但不检测"同文件 hunk 混"。
- 实证：prompt.js（commit f1709ec）夹带他者 `_outputStepForTest` 注释。

## 方案（A: hash 对比）

baseline 跳过逻辑**不变**（不破坏现有审计），在 `auditQuickCompletion` 末尾加同文件并发检测层。

### Phase 1: step1 baseline 录 allowedFiles hash

- `guard.json` 加字段 `allowedFilesHash: { "<file>": "<sha256(content)>" }`
- `src/run/stage.js` quick 启动录 baseline 后（~line 270，`baselineCommit = safeGit HEAD` 附近），算每个 allowedFile 的 sha256（`readFileSync` + `crypto.createHash('sha256')`），存 `guard.allowedFilesHash`
- 文件不存在（新增文件）→ 不存该 file 的 hash（检测时该 file 不在 allowedFilesHash；新增文件不在 baselineFiles，本就不算同文件并发）
- 向后兼容：旧 guard 无 `allowedFilesHash` → `guard.allowedFilesHash?.[f] === undefined`，检测跳过（不报）

### Phase 2: auditQuickCompletion 加同文件并发检测（warn 不阻断）

`src/run/shared.js` auditQuickCompletion 末尾（return result 前）：

```js
// 同文件并发检测：allowedFile 在 baseline（他者改过）+ 当前 hash ≠ step1 hash（我也改了）
// → commit 整文件 pathspec 会夹带他者 hunk，warn 提示分离（advisory，不阻断，与 detectConcurrentChanges 一致）
const sameFileHits = []
if (allowedFiles.length > 0 && guard.allowedFilesHash) {
  for (const f of allowedFiles) {
    if (baselineFiles.includes(f) && guard.allowedFilesHash[f] !== undefined) {
      try {
        const cur = crypto.createHash('sha256').update(readFileSync(join(cwd, f))).digest('hex')
        if (cur !== guard.allowedFilesHash[f]) sameFileHits.push(f)
      } catch {} // 文件读失败（删除等）跳过
    }
  }
}
if (sameFileHits.length > 0) {
  result.reasons.push(`同文件并发: ${sameFileHits.length} 个 allowedFile 含他者+你的改动（${sameFileHits.join(', ')}）`)
  console.warn(`\n⚠️ 同文件并发（${sameFileHits.length} 个 allowedFile 含他者改动+你的改动，commit 整文件会夹带他者 hunk）：`)
  for (const f of sameFileHits) {
    console.warn(`   - ${f}`)
    console.warn(`     分离：git add -p ${f}（交互选你的 hunk）或 git diff ${f} > mine.patch（编辑留你的）+ git apply --cached mine.patch + git commit`)
  }
}
```

- advisory（不阻断 --done，不改 result.status，只 push reasons + warn）
- baseline 跳过逻辑不动（changedFiles/blocked 判定不变）

### Phase 3: 文档同步

- `docs/sillyspec/file-lifecycle.md`：guard.json schema 加 `allowedFilesHash` 字段说明
- `.claude/skills/sillyspec-quick/SKILL.md`：审计段落补"同文件并发 → CLI warn + 给 git add -p/patch 分离指引"

## 决策

- **D-001@v1: 检测范围 quick --done only**。quick 是多 agent 同仓最高频并发热点（本 dogfood 仓连续多 quick 撞他者）。其他 stage 改 src/run/ 热点频率低，先覆盖 quick。后续可复用 auditQuickCompletion 模式扩展。
- **D-002@v1: 检测后 warn advisory 不阻断**。与现有 `detectConcurrentChanges` 并发预检语义一致（advisory）。强制阻断会打断流程（用户可能有意整文件提交）。用户看 warn 决定是否分离。
- **D-003@v1: 方案 A hash 对比**（非 B 强制审计 / C patch 减法）。B 副作用大（他者 hunk 进 changedFiles 触发 DANGEROUS/blocked 误判，破坏审计）；C 最准但 patch 三方减法复杂 + CRLF/行号漂移风险，收益（hunk 级）超 warn 提示所需。A 准确（hash 判定我改了 baseline 文件）+ 不破坏审计 + 复杂度可控（guard 加一个字段）。

## 文件变更清单（File Changes）

| 操作 | 文件路径 | 说明 |
|------|---------|------|
| 修改 | src/run/stage.js | step1 录 allowedFilesHash（算 sha256 存 guard，~line 270） |
| 修改 | src/run/shared.js | auditQuickCompletion 末尾加同文件并发检测 + warn |
| 修改 | docs/sillyspec/file-lifecycle.md | guard.json schema 加 allowedFilesHash |
| 修改 | .claude/skills/sillyspec-quick/SKILL.md | 审计段补同文件并发提示 |
| 新增 | test/quick-same-file-concurrent.test.mjs | 同文件并发检测测试 |

## 风险登记（Risk）

- **R1: guard 向后兼容**：旧 guard（无 allowedFilesHash）→ 检测跳过（`?.[f] === undefined`）。无破坏。**缓解**：可选链 + undefined 检查。
- **R2: CRLF 影响 hash**：step1/--done 同机同文件，CRLF 不变，hash 一致。quick 同 session 同机，不跨平台。**缓解**：无（同机保证）。
- **R3: sha256 开销**：allowedFiles 通常 <10 文件，sha256 开销可忽略。
- **R4: hash 漂移误报**：step1 录 hash 后文件被外部改（非我非他者，如工具）→ hash 变 → 误报。**缓解**：advisory（误报不阻断），用户核对 warn 内容。
- **R5: 平台同步**：guard 是本地 session 元数据，不纳入平台同步脏度（与 title/quicklog_id 同类，不调 _touchLocalModified）。**缓解**：verify 时确认。

## 生命周期契约:无/N/A

本变更只扩展 guard.json schema（加 allowedFilesHash 字段），不改 quick session 生命周期（创建/清理/状态流转不变）。不适用 lifecycle contract。

## 自审（Self-Review）

- ✅ 痛点清楚（baseline 按路径跳过致同文件并发不可见，实证 prompt.js f1709ec）
- ✅ 方案 A 不破坏现有审计（baseline 跳过不变，纯加检测层）
- ✅ 向后兼容（旧 guard 无字段跳过，`?.[f] === undefined`）
- ✅ warn advisory（与 detectConcurrentChanges 一致，不阻断）
- ✅ 文件变更清单齐（5 文件）
- ✅ 风险登记（5 项 + 缓解）
- ✅ 决策可追溯（D-001 范围 / D-002 行为 / D-003 方案）
- ⚠️ 自审存疑：guard.allowedFilesHash 是否影响平台同步？—— guard 是本地 session 元数据（不纳入平台同步脏度，与 title/quicklog_id 同类）。execute/verify 时确认（R5）。
- ⚠️ 自审存疑：stage.js 录 hash 的位置（~line 270 baselineCommit 附近）需 execute 时确认精确行 + allowedFiles 可用性（guard.allowedFiles 在 stage.js 可读？）。
