---
author: qinyi
created_at: 2026-08-17 08:45:00
---

# 需求文档（Requirements）

## 功能需求

FR-01：quick --done 完成后，CLI 读取当前会话 `guard.json` 中的 `linkedChanges` 列表。

FR-02：对每个 `linkedChanges` 中的真实变更名（非 `quick-<hex>` 形态），检查其 `changes/<name>/tasks.md` 是否存在且全部 task 已勾选（无 `- [ ]` 未勾选行）。

FR-03：若某关联变更 `tasks.md` 全勾选，则执行轻量归档：
- 调用 `ProgressManager.unregisterChange(cwd, name)` 将 `sillyspec.db` 中 `status` 从 `active` 改为 `archived`；
- 将 `changes/<name>/` 移动到 `changes/archive/<archiveDestDirName(date, name)>/`；
- 调用 `archiveWorktreeCleanup` 清理可能的 worktree / runId marker；
- 用 `safeGit add --` 暂存归档目录。

FR-04：若关联变更仍有未完成任务，或 `tasks.md` 不存在，则不自动归档，仅打印提示信息；quick 完成不被阻断。

FR-05：若归档过程中出现 FS 错误、目标目录已存在等异常，应 warn 并继续；quick 完成不被阻断。

FR-06：若关联变更目录已在 `changes/archive/` 下（通过 `findAlreadyArchivedDir` 判定），则幂等跳过，不再重复移动。

FR-07：`src/stages/quick.js` step3 prompt 需明确告知 agent“关联变更任务全完成时，CLI 会自动归档该变更”。

FR-08：文档同步：修改 `docs/sillyspec/file-lifecycle.md` 中 quick 阶段生命周期描述；重跑 `node docs/prompt/_extract.mjs` 刷新 prompt 镜像；按需同步 `.claude/skills/sillyspec-quick/SKILL.md`。

## 非功能需求

NFR-01：Windows / Linux / macOS 路径兼容（使用 `node:path` join，原子写、`renameSyncRetry` 重试）。

NFR-02：并发安全：`tasks.md` 全勾选是硬闸门；移动目录前检查目标目录不存在；失败不阻断 quick 完成。

NFR-03：可测试性：核心判定与归档逻辑独立成函数，可被 unit test 直接 import。
