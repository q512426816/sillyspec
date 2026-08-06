---
author: qinyi
created_at: 2026-08-06 13:52:01
---

# 提案书（Proposal）

## 动机
worktree cleanup（`src/worktree.js:698-820` `cleanup()` 内 `rmSync(worktreePath, { recursive: true, force: true })`）整目录删 worktree 物理目录时，连带删除落在 worktree 内 `.sillyspec/.runtime/execute-runs/<runId>/tasks/<task>/review.json` 与 `stage-reviews/<stage>-<runId>/` 的文件态。这些文件是 execute Task Review Gate 与 Stage Review Gate 的**真相源**（磁盘文件）。事故链：agent 在 worktree 内跑 execute → runtimeRoot 解析落 worktree → review.json 写进副本 → cleanup 整目录删 → archive step1 完成度 gate（真相源=磁盘 review.json）阻断 → 用户被迫事后批量补 review.json。根源在于 execute-runs / stage-reviews 的存活与 worktree 物理目录绑定，本提案将其彻底解耦。

## 关键问题
1. **drift 守卫半截不治本**：`command.js:536-546` 已识别 worktree 副本漂移并重写 `specBase/specRoot/specDir/pm`（progress 正确落主仓），但**漏设 `platformOpts` 字段**——下游 13 处 runtimeRoot 解析站点（`gates.js` / `stage.js` / `complete.js` / `prompt.js` / `command.js` / `task-review.js` / `contract-matrix.js`）各自从 `cwd`（仍 worktree）重算 specBase，`.runtime` 仍落 worktree。
2. **cleanup 整目录删无差别**：9 处 cleanup 调用点（`index.js:847` / `complete-handlers.js:160,724` / `complete.js:822` / `command.js:887` / `worktree.js:1017` / `worktree-apply.js:206,407,517`）+ 外部 `git worktree remove` / 手动 rm / doctor --fix stale，任一触发即整目录删，execute-runs / stage-reviews 文件态无幸存可能。
3. **"平台 sentinel" 误判陷阱**：直觉修法是 drift 命中时设 `platformOpts.specRoot = wt.mainSpecBase`，但这会触发 `shared.js:288`（triggerSync 跳过）/ `shared.js:315`（checkApproval 跳过）/ `prompt.js:217,306,556,597`（误进平台渲染分支）/ scan-postcheck，引入新 bug。需要语义独立的新字段。

## 变更范围
- `src/run/command.js` drift 守卫命中分支追加 `platformOpts.specDriftAnchor = wt.mainSpecBase`（1 行）。
- `src/run/shared.js` 新增 `resolveRuntimeRoot(platformOpts, localSpecBase)` 工具函数。
- 13 处 runtimeRoot 解析站点（11 处 A 类公式 + 3 处 B 类 contract-matrix 调用方）统一改用 `resolveRuntimeRoot`。
- 新增 `test/execute-runs-isolation.test.mjs`（T-01..T-08）。
- 同步 `docs/sillyspec/file-lifecycle.md`。

## 不在范围内（Non-Goals）
- **NG-1** 不改 worktree 创建 / cleanup 逻辑（9 调用点 + `worktree.js` rmSync 全不动）——方案 A 使其再也碰不到 execute-runs。
- **NG-2** 不改平台模式（specRoot/runtimeRoot sentinel 链路保持原样）。
- **NG-3** 不做 cleanup salvage（方案 B 否决：不治本，9 调用 + git worktree remove + 手动 rm + worktree 损坏 + doctor --fix stale 都绕过；原子性复杂；root cause 仍在）。
- **NG-4** 不处理 native-worktree 外部目录 drift（detect 不触发，另案）。
- **NG-5** 不处理 worktree 损坏导致 detect 不触发（doctor 另案）。
- **NG-6** 不重命名既有 runtimeRoot / specRoot 字段（向后兼容）。

## 成功标准（可验证）
- **AC-1** drift 场景（agent cd worktree 跑 execute）下，所有 task review.json 与 stage review.json 落主仓 `.sillyspec/.runtime/`，worktree 内无这些文件。
- **AC-2** worktree cleanup（9 调用点任一）后，主仓 execute-runs / stage-reviews 文件态完整存活。
- **AC-3** archive step1 完成度 gate 不再因 cleanup 丢失 review.json 阻断。
- **AC-4** 平台模式（specRoot/runtimeRoot 已设）行为零回归。
- **AC-5** 常规本地模式（无 drift）行为零回归。
- **AC-6** 多 change 并行 drift 无 marker / 产物路径冲突。
- **AC-7** `npm test` 全绿（含新增 T-01..T-08）。
- **AC-8** `npm run lint` 通过。

## 实现路径
scale=large → 下一步 `node bin/sillyspec.js run plan --change 2026-08-06-execute-runs-isolation`。
