/**
 * SillySpec applyWorktree — 将 worktree 中的变更应用到主工作区
 *
 * 流程：
 * 1. 读取 meta.json 获取 baseHash
 * 2. git diff --name-only baseHash 获取 worktree 中所有变更文件
 * 3. 从 design.md 解析文件变更清单（无清单 = 允许所有）
 * 4. 校验：变更文件 ⊆ 清单
 * 5. 校验：主工作区文件 base hash 一致
 * 6. --check-only 模式只输出检查结果
 * 7. 非 checkOnly：生成 patch → apply --check → apply --3way
 * 8. 成功后自动 cleanup
 */

import { execSync } from 'child_process';
import { existsSync, unlinkSync, writeFileSync, mkdtempSync, rmSync } from 'fs';
import { join, resolve } from 'path';
import { tmpdir } from 'os';
import { WorktreeManager } from './worktree.js';
import { parseFileChangeList } from './change-list.js';

const CHANGES_REL = '.sillyspec/changes';

function git(cwd, args) {
  return execSync(`git ${args}`, { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

function gitQuiet(cwd, args) {
  try {
    return execSync(`git ${args}`, { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    return null;
  }
}

/**
 * 获取文件在 git 中的 blob hash（基于某个 commit/tree）
 * @param {string} cwd - git 工作区路径
 * @param {string} treeish - commit hash、分支等
 * @param {string} filePath - 相对路径
 * @returns {string|null} blob hash，文件不存在返回 null
 */
function getFileBlobHash(cwd, treeish, filePath) {
  return gitQuiet(cwd, `rev-parse ${treeish}:${filePath}`);
}

/**
 * apply worktree 变更到主工作区
 *
 * @param {string} changeName - 变更名
 * @param {{ cwd?: string, checkOnly?: boolean }} opts
 * @returns {{
 *   ok: boolean,
 *   changedFiles: string[],
 *   extraFiles: string[],
 *   hashMismatchFiles: string[],
 *   patchPath: string|null,
 *   errors: string[]
 * }}
 */
export function applyWorktree(changeName, { cwd, checkOnly = false } = {}) {
  const projectRoot = cwd || process.cwd();
  const wm = new WorktreeManager({ cwd: projectRoot });
  const meta = wm.getMeta(changeName);
  const result = {
    ok: false,
    changedFiles: [],
    extraFiles: [],
    hashMismatchFiles: [],
    patchPath: null,
    errors: [],
  };

  // --- 1. 校验 worktree 存在 + meta.json 有效 ---
  if (!meta) {
    result.errors.push(`worktree not found: ${changeName}。meta.json 不存在或已损坏。`);
    return result;
  }

  const { worktreePath, baseHash } = meta;

  if (!existsSync(worktreePath)) {
    result.errors.push(`worktree 目录不存在: ${worktreePath}`);
    return result;
  }

  // --- 2. 获取变更文件列表 ---
  // worktree 内修改可能没有 commit，用 git diff <baseHash>（比较 baseHash 到工作区内容）
  // 同时检测 untracked 新文件（git diff 不包含 untracked）
  let changedFiles;
  try {
    // tracked 文件的变更（modified/deleted）
    const trackedRaw = git(worktreePath, `diff --name-only ${baseHash}`);
    const trackedFiles = trackedRaw ? trackedRaw.split('\n').filter(Boolean) : [];

    // untracked 新文件（baseHash 中不存在的文件）
    const untrackedRaw = gitQuiet(worktreePath, `ls-files --others --exclude-standard`);
    const untrackedFiles = untrackedRaw
      ? untrackedRaw.split('\n').filter(Boolean).filter(f => !f.startsWith('.sillyspec/') && f !== 'meta.json')
      : [];

    changedFiles = [...new Set([...trackedFiles, ...untrackedFiles])];
  } catch (e) {
    result.errors.push(`获取变更文件列表失败: ${e.message}`);
    return result;
  }

  result.changedFiles = changedFiles;

  if (changedFiles.length === 0) {
    // 没有变更
    if (!checkOnly) {
      wm.cleanup(changeName);
    }
    result.ok = true;
    return result;
  }

  // --- 3. 解析 design.md 文件变更清单 ---
  const designPath = join(projectRoot, CHANGES_REL, changeName, 'design.md');
  const allowSet = parseFileChangeList(designPath);
  const hasAllowList = allowSet.size > 0;

  // --- 4. 校验：变更文件 ⊆ 清单（无清单则跳过）---
  if (hasAllowList) {
    for (const f of changedFiles) {
      if (!allowSet.has(f)) {
        result.extraFiles.push(f);
      }
    }
    if (result.extraFiles.length > 0) {
      result.errors.push(
        `文件清单校验失败：以下变更文件不在 design.md 清单中：\n  ${result.extraFiles.join('\n  ')}`
      );
      return result;
    }
  }

  // --- 5. 校验：主工作区文件 base hash 一致 ---
  // 5a. 检查主工作区是否有未 commit 的脏文件（会影响 apply）
  const mainDirtyRaw = gitQuiet(projectRoot, 'diff --name-only HEAD');
  const mainDirtyFiles = mainDirtyRaw ? mainDirtyRaw.split('\n').filter(Boolean) : [];
  if (mainDirtyFiles.length > 0) {
    // 如果脏文件和本次 apply 的文件有交集 → 报错
    const conflictDirty = mainDirtyFiles.filter(f => changedFiles.includes(f));
    if (conflictDirty.length > 0) {
      result.errors.push(
        `主工作区有以下未 commit 的变更，会影响 apply：\n  ${conflictDirty.join('\n  ')}\n请先 commit 或 stash 这些变更。`
      );
      return result;
    }
  }

  // 5b. 对比 worktree 的 baseHash 和主工作区 HEAD 中每个清单文件的 blob hash
  const targetFiles = hasAllowList ? [...allowSet] : changedFiles;
  for (const f of targetFiles) {
    const wtBlob = getFileBlobHash(worktreePath, baseHash, f);
    const mainBlob = getFileBlobHash(projectRoot, 'HEAD', f);

    // 两者都为 null（文件在 base 时不存在）→ OK
    if (wtBlob === null && mainBlob === null) continue;
    // 两者一致 → OK
    if (wtBlob === mainBlob) continue;
    // 不一致 → 主工作区已被修改
    result.hashMismatchFiles.push(f);
  }

  if (result.hashMismatchFiles.length > 0) {
    result.errors.push(
      `base hash 不一致：以下文件在主工作区已被修改：\n  ${result.hashMismatchFiles.join('\n  ')}`
    );
    return result;
  }

  // --- 6. checkOnly 模式：到此返回 ---
  if (checkOnly) {
    result.ok = true;
    return result;
  }

  // --- 7. 生成 patch 并 apply ---
  // 确定要包含在 patch 中的文件：有清单用清单交集，无清单用全部变更
  const patchFiles = hasAllowList
    ? [...allowSet].filter(f => changedFiles.includes(f))
    : changedFiles;
  const fileArgs = patchFiles.map(f => `-- ${f}`).join(' ');

  // 创建临时文件
  const tmpDir = mkdtempSync(join(tmpdir(), 'sillyspec-patch-'));
  const patchPath = join(tmpDir, 'apply.patch');
  result.patchPath = patchPath;

  try {
    let patchContent = '';

    // 分 tracked 变更和 untracked 新文件生成 patch
    const trackedFiles = patchFiles.filter(f => {
      // untracked 文件在 baseHash 的 tree 中不存在
      return gitQuiet(worktreePath, `cat-file -e ${baseHash}:${f}`) !== null;
    });
    const untrackedPatchFiles = patchFiles.filter(f => !trackedFiles.includes(f));

    // tracked 文件：git diff baseHash
    if (trackedFiles.length > 0) {
      const trackedArgs = trackedFiles.map(f => `-- ${f}`).join(' ');
      patchContent += execSync(
        `git diff --binary ${baseHash} ${trackedArgs}`,
        { cwd: worktreePath, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
      );
    }

    // untracked 新文件：git add 到 index，git diff --cached，然后 reset
    if (untrackedPatchFiles.length > 0) {
      const addArgs = untrackedPatchFiles.map(f => `-- ${f}`).join(' ');
      git(worktreePath, `add ${addArgs}`);
      try {
        patchContent += execSync(
          `git diff --binary --cached ${untrackedPatchFiles.map(f => `-- ${f}`).join(' ')}`,
          { cwd: worktreePath, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
        );
      } finally {
        // 重置 index（不保留 staged 状态）
        gitQuiet(worktreePath, `reset HEAD -- ${addArgs}`);
      }
    }

    if (!patchContent.trim()) {
      // patch 为空（清单中部分文件可能没实际变更）
      result.ok = true;
      rmSync(tmpDir, { recursive: true, force: true });
      return result;
    }

    writeFileSync(patchPath, patchContent);

    // apply --check 预检
    try {
      git(projectRoot, `apply --check ${patchPath}`);
    } catch (e) {
      result.errors.push(`patch 预检失败: ${e.message}`);
      return result;
    }

    // apply --3way 正式应用
    try {
      git(projectRoot, `apply --3way ${patchPath}`);
    } catch (e) {
      result.errors.push(`patch apply 失败: ${e.message}`);
      return result;
    }

    result.ok = true;

    // --- 8. 成功后自动 cleanup（失败不影响整体结果） ---
    try {
      wm.cleanup(changeName);
    } catch (cleanupErr) {
      result.warnings = result.warnings || [];
      result.warnings.push(`cleanup 失败（不影响应用结果）: ${cleanupErr.message}`);
    }

  } catch (e) {
    result.errors.push(`patch 生成/应用异常: ${e.message}`);
    return result;
  } finally {
    // 清理临时目录
    try { rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }

  return result;
}
