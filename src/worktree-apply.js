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
import { createHash } from 'crypto';
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

  const { worktreePath, baseHash, baselineCommit } = meta;
  // diff 起始点：有 baseline checkpoint 用它（只合子代理改动），否则 fallback 到 baseHash
  const diffBase = baselineCommit || baseHash;

  if (!existsSync(worktreePath)) {
    result.errors.push(`worktree 目录不存在: ${worktreePath}`);
    return result;
  }

  // --- 2. 获取变更文件列表 ---
  // worktree 内修改可能没有 commit，用 git diff <baseHash>（比较 baseHash 到工作区内容）
  // 同时检测 untracked 新文件（git diff 不包含 untracked）
  let changedFiles;
  try {
    // 用 --name-status 捕获 rename/delete（--name-only 会丢失 rename 源文件）
    const statusRaw = git(worktreePath, `diff --name-status ${diffBase}`);
    const statusFiles = new Set();
    if (statusRaw) {
      for (const line of statusRaw.split('\n').filter(Boolean)) {
        const parts = line.split('\t');
        // R100 old.txt new.txt → 提取两个文件
        if (parts.length >= 2) statusFiles.add(parts[parts.length - 1]);
        if (parts.length >= 3) statusFiles.add(parts[parts.length - 2]);
      }
    }

    // untracked 新文件（diffBase 中不存在的文件）
    const untrackedRaw = gitQuiet(worktreePath, `ls-files --others --exclude-standard`);
    const untrackedFiles = untrackedRaw
      ? untrackedRaw.split('\n').filter(Boolean).filter(f => !f.startsWith('.sillyspec/') && f !== 'meta.json')
      : [];

    changedFiles = [...new Set([...statusFiles, ...untrackedFiles])];
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

  // --- 4.5 校验：主工作区 baseline 是否变化（防 execute 期间主工作区被修改）---
  // 注意：必须和 computeBaselineHash (worktree.js) 使用相同的排除规则
  if (meta.baselineHash) {
    const exclude = '-- . ":(exclude).sillyspec/"';
    const staged = gitQuiet(projectRoot, `diff --cached ${exclude}`) || '';
    const unstaged = gitQuiet(projectRoot, `diff ${exclude}`) || '';
    const untracked = gitQuiet(projectRoot, `ls-files --others --exclude-standard ${exclude}`) || '';
    const raw = `staged:${staged}\nunstaged:${unstaged}\nuntracked:${untracked}`;
    const currentHash = createHash('sha256').update(raw).digest('hex').slice(0, 16);
    if (currentHash !== meta.baselineHash) {
      result.errors.push(
        `主工作区 baseline 已变化（execute 前后不一致），不能直接 apply task.patch。\n` +
        `建议：重新创建 worktree 或手动检查冲突。\n` +
        `execute 前 baseline: ${meta.baselineHash}\n` +
        `当前 baseline: ${currentHash}`
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
  const fileArgs = patchFiles.length > 0 ? `-- ${patchFiles.join(' ')}` : '';

  // 创建临时文件
  const tmpDir = mkdtempSync(join(tmpdir(), 'sillyspec-patch-'));
  const patchPath = join(tmpDir, 'apply.patch');
  result.patchPath = patchPath;

  try {
    let patchContent = '';

    // 分 tracked 变更和 untracked 新文件生成 patch
    const trackedFiles = patchFiles.filter(f => {
      // 文件在 diffBase 的 tree 中存在 → tracked（包括 rename 目标可能的情况）
      if (gitQuiet(worktreePath, `cat-file -e ${diffBase}:${f}`) !== null) return true;
      // 文件在工作区 index 中已存在（比如被 git mv 处理过）→ 也视为 tracked
      if (gitQuiet(worktreePath, `ls-files --error-unmatch ${f}`) !== null) return true;
      return false;
    });
    const untrackedPatchFiles = patchFiles.filter(f => !trackedFiles.includes(f));

    // tracked 文件：git diff baseHash
    if (trackedFiles.length > 0) {
      const trackedArgs = trackedFiles.length > 0 ? `-- ${trackedFiles.join(' ')}` : '';
      patchContent += execSync(
        `git diff --binary ${diffBase} ${trackedArgs}`,
        { cwd: worktreePath, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
      );
    }

    // untracked 新文件：git add 到 index，git diff --cached，然后 reset
    if (untrackedPatchFiles.length > 0) {
      const addArgs = untrackedPatchFiles.length > 0 ? `-- ${untrackedPatchFiles.join(' ')}` : '';
      git(worktreePath, `add ${addArgs}`);
      try {
        const diffCachedArgs = untrackedPatchFiles.length > 0 ? `-- ${untrackedPatchFiles.join(' ')}` : '';
        patchContent += execSync(
          `git diff --binary --cached ${diffCachedArgs}`,
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

/**
 * 风险审计：评估 worktree 变更是否可以安全自动 apply
 *
 * 检查项：
 * 1. patch --check 通过
 * 2. 所有变更在 allowed_paths 内
 * 3. 主工作区 baseline 未变化
 * 4. 没有删除/重命名关键文件
 * 5. 没有改高风险文件（lockfile/migration/配置/入口）除非任务显式允许
 * 6. diff 规模没有异常膨胀
 *
 * @param {string} changeName
 * @param {{ cwd?: string }} opts
 * @returns {{
 *   decision: 'SAFE' | 'WARNING' | 'BLOCKED',
 *   changedFiles: string[],
 *   reasons: string[],
 *   warnings: string[],
 *   stats: { additions: number, deletions: number }
 * }}
 */
export function assessApplyRisk(changeName, { cwd } = {}) {
  const projectRoot = cwd || process.cwd();
  const reasons = [];
  const warnings = [];

  // 先跑 --check-only 模式的 applyWorktree 获取变更文件列表
  const checkResult = applyWorktree(changeName, { cwd: projectRoot, checkOnly: true });

  if (checkResult.errors.length > 0) {
    return {
      decision: 'BLOCKED',
      changedFiles: checkResult.changedFiles,
      reasons: checkResult.errors,
      warnings: [],
      stats: { additions: 0, deletions: 0 }
    };
  }

  const changedFiles = checkResult.changedFiles;

  if (changedFiles.length === 0) {
    return {
      decision: 'SAFE',
      changedFiles: [],
      reasons: ['无变更需要应用'],
      warnings: [],
      stats: { additions: 0, deletions: 0 }
    };
  }

  // 解析 TaskCard allowed_paths
  const wm = new WorktreeManager({ cwd: projectRoot });
  const meta = wm.getMeta(changeName);
  const tasksDir = join(projectRoot, CHANGES_REL, changeName, 'tasks');
  const allowedPaths = new Set();
  if (existsSync(tasksDir)) {
    const { readdirSync, readFileSync } = require('fs');
    for (const tf of readdirSync(tasksDir).filter(f => /^task-\d+\.md$/.test(f))) {
      const content = readFileSync(join(tasksDir, tf), 'utf8');
      const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
      if (!fmMatch) continue;
      const fm = fmMatch[1];
      const inline = fm.match(/allowed_paths:\s*\[([^\]]*)\]/);
      if (inline) {
        inline[1].split(',').forEach(s => { const v = s.trim().replace(/['"]/g, ''); if (v) allowedPaths.add(v); });
      }
      const block = fm.match(/allowed_paths:\s*\n((?:\s+-\s+.+\n?)+)/);
      if (block) {
        block[1].match(/-\s+(.+)/g)?.forEach(s => { const v = s.replace(/^-\s+/, '').trim().replace(/['"]/g, ''); if (v) allowedPaths.add(v); });
      }
    }
  }

  // 检查 2: 变更在 allowed_paths 内（仅在 TaskCard 存在时）
  if (allowedPaths.size > 0) {
    const outsidePaths = changedFiles.filter(f => !
      [...allowedPaths].some(allowed => f === allowed || f.startsWith(allowed.replace(/\*$/, '')))
    );
    if (outsidePaths.length > 0) {
      reasons.push(`变更文件超出 allowed_paths：\n  ${outsidePaths.join('\n  ')}`);
    }
  }

  // 检查 4+5: 高风险文件模式
  const HIGH_RISK_PATTERNS = [
    /(^|\/)package-lock\.json$/,
    /(^|\/)pnpm-lock\.yaml$/,
    /(^|\/)yarn\.lock$/,
    /(^|\/)\.env($|\.)/,
    /(^|\/)docker-compose.*\.ya?ml$/,
    /(^|\/)Dockerfile$/,
    /migration[\w.-]*\.(sql|js|ts)$/i,
    /(^|\/).*entry.*\.(js|ts)$/i,
    /(^|\/)main\.(js|ts)$/i,
    /(^|\/)index\.(js|ts)$/i,
    /(^|\/)app\.(js|ts)$/i,
  ];
  const riskyFiles = changedFiles.filter(f => HIGH_RISK_PATTERNS.some(p => p.test(f)));
  if (riskyFiles.length > 0) {
    // 高风险文件只有在 allowedPaths 显式包含时才放行
    const trulyRisky = riskyFiles.filter(f => !
      [...allowedPaths].some(allowed => f === allowed)
    );
    if (trulyRisky.length > 0) {
      reasons.push(`高风险文件变更（未在 allowed_paths 中显式声明）：\n  ${trulyRisky.join('\n  ')}`);
    } else {
      warnings.push(`高风险文件变更（已在 allowed_paths 中声明）：${riskyFiles.join(', ')}`);
    }
  }

  // 检查 6: diff 规模异常（>2000 行变更视为异常）
  const wtPath = meta?.worktreePath;
  const diffBase = meta?.baselineCommit || meta?.baseHash;
  let additions = 0, deletions = 0;
  if (wtPath && diffBase) {
    try {
      const shortstat = gitQuiet(wtPath, `diff --shortstat ${diffBase}`);
      const insMatch = shortstat?.match(/(\d+) insertion/);
      const delMatch = shortstat?.match(/(\d+) deletion/);
      additions = insMatch ? parseInt(insMatch[1]) : 0;
      deletions = delMatch ? parseInt(delMatch[1]) : 0;
      if (additions + deletions > 2000) {
        reasons.push(`diff 规模异常（${additions} additions + ${deletions} deletions = ${additions + deletions} 行）`);
      }
    } {}
  }

  // 判定
  let decision;
  if (reasons.length > 0) {
    decision = 'BLOCKED';
  } else if (warnings.length > 0) {
    decision = 'WARNING';
  } else {
    decision = 'SAFE';
  }

  return { decision, changedFiles, reasons, warnings, stats: { additions, deletions } };
}

/**
 * 格式化 execute run summary（人类可读）
 *
 * 只展示 CLI 真实掌握的信息，不声称知道 per-task 状态。
 * @param {object} opts
 * @param {string} opts.changeName - 变更名
 * @param {number} opts.stepsCompleted - 已完成步骤数
 * @param {number} opts.stepsTotal - 总步骤数
 * @param {string} opts.agentSummary - Agent 最终输出摘要
 * @param {string} [opts.cwd] - 项目根目录（默认 process.cwd()）
 * @returns {string} 格式化的 summary 文本
 */
export function formatExecuteSummary({ changeName, stepsCompleted, stepsTotal, agentSummary, cwd }) {
  const wm = new WorktreeManager({ cwd });
  const meta = wm.getMeta(changeName);
  const lines = [];

  const SEPARATOR = '─'.repeat(32);

  // --- Header ---
  lines.push(`Execute Summary`);
  lines.push(SEPARATOR);

  // --- Status ---
  if (!meta) {
    // worktree 不存在（可能已 cleanup 或没有用过 worktree）
    lines.push(`Status:     COMPLETED`);
    lines.push(`Steps:      ${stepsCompleted} / ${stepsTotal}`);
    lines.push(`Apply:      N/A`);
  } else {
    const hasBaseline = meta.baselineCommit != null;
    const wtExists = existsSync(meta.worktreePath);

    const applyStatus = wtExists ? 'pending' : 'applied';
    const baselineCount = meta.baselineFiles?.length || 0;
    const baselineStatus = hasBaseline
      ? `dirty (${baselineCount} baseline file${baselineCount === 1 ? '' : 's'} protected)`
      : 'clean';

    // Worktree 最终状态
    const mode = meta.mode || 'worktree';
    let worktreeStatus;
    if (mode === 'native-worktree') {
      worktreeStatus = 'kept (external worktree)';
    } else if (mode === 'in-place-fallback') {
      worktreeStatus = 'none (in-place)';
    } else if (!wtExists) {
      worktreeStatus = 'cleaned';
    } else {
      worktreeStatus = 'exists';
    }

    lines.push(`Status:     COMPLETED`);
    lines.push(`Steps:      ${stepsCompleted} / ${stepsTotal}`);
    lines.push(`Baseline:   ${baselineStatus}`);
    lines.push(`Apply:      ${applyStatus}`);
    lines.push(`Worktree:   ${worktreeStatus}`);
  }

  // --- Changed files ---
  // 从主工作区 diff 获取（worktree 已 apply）或从 worktree diff 获取
  if (meta && existsSync(meta.worktreePath)) {
    // worktree 还在，用 baselineCommit 或 baseHash 做 diff
    try {
      const diffBase = meta.baselineCommit || meta.baseHash;
      const { execSync: es } = require('child_process');
      const filesRaw = es(`git -C ${meta.worktreePath} diff --name-only ${diffBase} 2>/dev/null`, { encoding: 'utf8' });
      const files = filesRaw ? filesRaw.trim().split('\n').filter(Boolean) : [];
      if (files.length > 0) {
        lines.push(``);
        const maxShow = 10;
        const showFiles = files.slice(0, maxShow);
        const remain = files.length - maxShow;
        lines.push(`Changed Files (${files.length})`);
        showFiles.forEach(f => lines.push(`  ${f}`));
        if (remain > 0) {
          lines.push(`  ... ${remain} more`);
        }
      }
    } catch {}
  }

  // --- Agent Summary ---
  if (agentSummary) {
    lines.push(``);
    lines.push(`Agent Summary`);
    // 缩进每行，截断过长内容
    const maxLen = 200;
    const summary = agentSummary.length > maxLen
      ? agentSummary.slice(0, maxLen) + '...'
      : agentSummary;
    summary.split('\n').forEach(l => lines.push(`  ${l}`));
  }

  // --- Next ---
  lines.push(``);
  lines.push(`Next`);
  lines.push(`  → sillyspec run verify`);

  return lines.join('\n');
}
