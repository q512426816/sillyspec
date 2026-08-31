/**
 * change-delete.js — 变更删除命令（2026-08-30 用户反馈①）
 *
 * 背景：此前删除一个变更要靠「git rm 目录 + 借道 doctor --cleanup-ghosts 清 DB 行」两步，
 * 且幽灵清理把删除行的 status 写成 archived——DB 无法区分「流程正常收尾的归档」与
 * 「中途废弃的删除」，事后审计只能回溯 git。
 *
 * 本命令提供一等删除路径：
 *   - DB：status='deleted'（与 archived 语义分离，DB 可直接审计区分，行保留不物理删）
 *   - 目录：changes/<name>/ 物理移除（git tracked 文件删除后照常 commit，历史仍可回溯）
 *   - worktree：复用 archiveWorktreeCleanup（有未 apply 变更时保留 worktree 只警告——
 *     不因删变更丢用户唯一副本的代码；顺带清 execute/stage-review runId marker）
 *   - git：safeGit add -A 暂存目录删除（best-effort，对齐 archive CLI 下沉 git add）
 *   - 平台：triggerSync 推终态（sync.js 对 status='deleted' 上行墓碑，平台收敛软删）
 *
 * 两段式安全（对齐 --cleanup-remnant / --cleanup-ghosts / --align-execute-progress 家族）：
 * 默认 dry-run 只报告将发生什么，--confirm 才执行。
 *
 * 执行序（DB-first + 失败补偿，对齐 renameChange 的回滚模式）：DB 翻 deleted → 删目录，
 * 目录删除失败则把 DB 行翻回原 status，避免「目录还在但行已 deleted」的分裂态。
 */
import { existsSync, readdirSync, rmSync, statSync } from 'fs';
import { join, relative } from 'path';
import { safeGit } from './git-helper.js';
import { assertSafeChangeName, triggerSync } from './run/shared.js';
import { archiveWorktreeCleanup } from './run/complete-handlers.js';

function countFiles(dir) {
  let n = 0;
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return 0; }
  for (const e of entries) {
    if (e.isDirectory()) n += countFiles(join(dir, e.name));
    else n++;
  }
  return n;
}

/**
 * 探测变更的 worktree 状态（dry-run 也报——「删了会不会丢代码」是关键决策信息）。
 * meta 缺失 / 探测失败 → null（无 worktree），不阻断。
 */
async function probeWorktree(cwd, changeName) {
  try {
    const { WorktreeManager } = await import('./worktree.js');
    const wm = new WorktreeManager({ cwd });
    const meta = wm.getMeta(changeName);
    if (!meta) return null;
    const info = { mode: meta.mode || null, worktreePath: meta.worktreePath || null, unappliedChanges: 0 };
    if (meta.mode !== 'in-place-fallback') {
      const check = wm.hasUnappliedChanges(changeName);
      if (check && check.hasChanges) info.unappliedChanges = (check.changedFiles || []).length;
    }
    return info;
  } catch { return null; }
}

/**
 * 删除变更（两段式）。
 * @param {{cwd: string, specDir?: string|null, changeName: string, confirm?: boolean}} opts
 * @returns {Promise<{ok: boolean, reason?: string, action?: 'dry_run'|'deleted', change?: string,
 *   db_row?: {status: string, current_stage: string|null, last_active: string|null}|null,
 *   dir?: {path: string, files: number}|null, worktree?: object|null,
 *   db_updated?: boolean, dir_removed?: boolean, files_removed?: number, warnings?: string[]}>}
 */
export async function deleteChange({ cwd, specDir = null, changeName, confirm = false }) {
  if (!changeName) return { ok: false, reason: '缺少变更名（sillyspec change-delete <名> 或 --change <名>）' };
  try {
    assertSafeChangeName(changeName, '变更名');
  } catch (e) {
    return { ok: false, reason: e.message };
  }

  const { ProgressManager } = await import('./progress.js');
  const pm = new ProgressManager({ specDir: specDir || null });
  const specBase = specDir || join(cwd, '.sillyspec');
  const dirPath = join(specBase, 'changes', changeName);

  // 只读探测 DB 行（不存在 DB 时 _ensureDB 会建空库——先探目录避免为纯孤儿目录凭空建库）
  const dirExists = existsSync(dirPath);
  let row = null;
  if (dirExists || existsSync(join(specBase, '.runtime', 'sillyspec.db')) || existsSync(join(specBase, 'sillyspec.db'))) {
    try {
      const sqlDb = pm._ensureDB(cwd).getDb();
      const r = sqlDb.prepare('SELECT name, status, current_stage, last_active FROM changes WHERE name = ?').get(changeName);
      if (r !== undefined) row = { status: r.status, current_stage: r.current_stage, last_active: r.last_active };
    } catch (e) {
      return { ok: false, reason: `读取进度库失败：${e.message}` };
    }
  }

  if (!row && !dirExists) {
    return { ok: false, reason: `变更 ${changeName} 不存在（DB 无行且目录缺失）` };
  }
  if (row && row.status === 'archived') {
    return {
      ok: false,
      reason: `变更 ${changeName} 已是归档态（archived）——change-delete 面向活跃/残留变更；归档历史如需清理请直接处理 changes/archive/ 目录（git 层操作）`,
    };
  }
  const alreadyDeleted = row && row.status === 'deleted';
  if (alreadyDeleted && !dirExists) {
    return { ok: false, reason: `变更 ${changeName} 已是删除态（deleted）且无残留目录，无需重复删除` };
  }

  const dirFiles = dirExists ? countFiles(dirPath) : 0;
  const worktreeInfo = await probeWorktree(cwd, changeName);

  if (!confirm) {
    return {
      ok: true, action: 'dry_run', change: changeName,
      db_row: row, dir: dirExists ? { path: dirPath, files: dirFiles } : null,
      worktree: worktreeInfo,
      already_deleted: alreadyDeleted,
    };
  }

  const warnings = [];
  // 1. DB 翻 deleted（已是 deleted 的残留目录清理跳过——幂等）
  let dbUpdated = false;
  if (row && !alreadyDeleted) {
    try {
      pm.deleteChange(cwd, changeName);
      dbUpdated = true;
    } catch (e) {
      return { ok: false, reason: `更新进度库失败：${e.message}` };
    }
  }
  // 2. 删目录（失败回滚 DB，对齐 renameChange 的补偿模式）
  if (dirExists) {
    try {
      rmSync(dirPath, { recursive: true, force: true });
    } catch (e) {
      if (dbUpdated) {
        try {
          const sqlDb = pm._ensureDB(cwd).getDb();
          sqlDb.prepare('UPDATE changes SET status = ? WHERE name = ?').run(row.status, changeName);
        } catch (re) {
          warnings.push(`目录删除失败且 DB 回滚也失败（状态分裂，跑 sillyspec doctor --json 排查）：${re.message}`);
        }
      }
      return { ok: false, reason: `删除目录失败：${e.message}`, warnings };
    }
  }
  // 3. worktree 清理（archiveWorktreeCleanup 内建「未 apply 变更保留」护栏，不丢代码）
  try {
    await archiveWorktreeCleanup(cwd, changeName, specBase, {});
  } catch (e) {
    warnings.push(`worktree 清理失败（不阻断删除）：${e.message}`);
  }
  // 4. git 暂存目录删除（best-effort：非 git 仓 / specBase 在仓外时跳过，git status 照常可见）
  try {
    const relDir = relative(cwd, dirPath).split('\\').join('/');
    if (relDir && !relDir.startsWith('../')) {
      safeGit(cwd, ['add', '-A', '--', relDir]);
    }
  } catch { /* 非 git 仓等场景：删除在 git status 可见，暂存非必需 */ }
  // 5. 平台终态/墓碑上行（triggerSync 内建 8s 熔断 + 未连接静默；change-delete 是终态
  //    一次性命令，await 保证墓碑发出后再退出，输出顺序确定）
  try {
    await triggerSync(cwd, changeName, { specRoot: specBase });
  } catch (e) {
    warnings.push(`平台终态同步失败（不阻断删除，下次常规同步重试）：${e.message}`);
  }
  // 6. 审计留痕（破坏性操作，对齐 complete-stage --force 的审计口径）
  try {
    pm._appendAuditLog(cwd, {
      action: 'change-delete',
      change: changeName,
      db_status_before: row ? row.status : null,
      dir_removed: dirExists,
      files_removed: dirFiles,
    });
  } catch { /* 审计失败不阻断 */ }

  return {
    ok: true, action: 'deleted', change: changeName,
    db_updated: dbUpdated, dir_removed: dirExists, files_removed: dirFiles,
    worktree: worktreeInfo, warnings,
  };
}
