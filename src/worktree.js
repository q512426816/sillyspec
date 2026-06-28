/**
 * SillySpec WorktreeManager — git worktree 生命周期管理
 *
 * 封装 git worktree 的 create/list/cleanup/getMeta 操作，
 * 为 execute 阶段提供代码隔离环境。
 *
 * worktree 存储目录：.sillyspec/.runtime/worktrees/<change-name>/
 * 分支命名：sillyspec/<change-name>
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, readdirSync, statSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { createHash } from 'crypto';
import { provisionDeps, lockfileHash } from './worktree-deps.js';

const WORKTREES_REL = '.sillyspec/.runtime/worktrees';
const BRANCH_PREFIX = 'sillyspec/';
const META_FILE = 'meta.json';

/**
 * 检测当前目录的隔离状态
 * 返回 { inWorktree: boolean, inSubmodule: boolean }
 *
 * 用 git rev-parse --git-dir 和 --git-common-dir 判断：
 * - GIT_DIR != GIT_COMMON 通常是 linked worktree
 * - 但在 git submodule 里也会出现这种情况
 * - 所以必须额外检查 --show-superproject-working-tree 排除 submodule
 */
export function detectIsolation(cwd = process.cwd()) {
  try {
    const gitDir = execSync('git rev-parse --git-dir', { cwd, encoding: 'utf8', stdio: ['pipe','pipe','pipe'] }).trim();
    const gitCommonDir = execSync('git rev-parse --git-common-dir', { cwd, encoding: 'utf8', stdio: ['pipe','pipe','pipe'] }).trim();
    const superProject = gitQuiet(cwd, 'rev-parse --show-superproject-working-tree');

    const inWorktree = gitDir !== gitCommonDir && !superProject;
    const inSubmodule = !!superProject;

    return { inWorktree, inSubmodule, gitDir, gitCommonDir };
  } catch {
    return { inWorktree: false, inSubmodule: false, gitDir: null, gitCommonDir: null };
  }
}

/**
 * 检查 worktree 存储目录是否被 .gitignore 忽略
 * @param {string} cwd - 项目根目录
 * @returns {{ ignored: boolean, path: string }}
 */
export function checkWorktreeDirIgnored(cwd = process.cwd()) {
  const relPath = WORKTREES_REL;
  try {
    execSync(`git check-ignore -q ${relPath}`, { cwd, encoding: 'utf8', stdio: ['pipe','pipe','pipe'] });
    return { ignored: true, path: relPath };
  } catch {
    return { ignored: false, path: relPath };
  }
}

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

function parseJSON(raw) {
  try { return JSON.parse(raw); } catch { return null; }
}

function computeBaselineHash(cwd) {
  // 排除 .sillyspec/ 元数据目录，避免 brainstorm/plan 阶段修改的蓝图文件污染 baseline
  const exclude = '-- . ":(exclude).sillyspec/"';
  const staged = gitQuiet(cwd, `diff --cached ${exclude}`) || '';
  const unstaged = gitQuiet(cwd, `diff ${exclude}`) || '';
  const untracked = gitQuiet(cwd, `ls-files --others --exclude-standard ${exclude}`) || '';
  const raw = `staged:${staged}
unstaged:${unstaged}
untracked:${untracked}`;
  return createHash('sha256').update(raw).digest('hex').slice(0, 16);
}

function validateChangeName(changeName) {
  if (!changeName || typeof changeName !== 'string' || changeName.trim() === '') {
    throw new Error('changeName 不能为空');
  }
  const trimmed = changeName.trim();
  // 禁止路径穿越
  if (trimmed.includes('..') || trimmed.includes('/') || trimmed.includes('\\')) {
    throw new Error(`changeName 不合法: "${changeName}"，不能包含 ..、/ 或 \\`);
  }
  return trimmed;
}

/**
 * 检测 git worktree 是否可用
 * @param {string} cwd
 * @returns {{ supported: boolean, version: string|null, reason?: string }}
 */
export function isGitWorktreeSupported(cwd = process.cwd()) {
  try {
    const raw = execSync('git --version', { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    const match = raw.match(/git version (\d+)\.(\d+)/);
    if (!match) return { supported: false, version: raw, reason: 'cannot parse version' };
    const major = parseInt(match[1], 10);
    const minor = parseInt(match[2], 10);
    if (major > 2 || (major === 2 && minor >= 15)) {
      return { supported: true, version: raw };
    }
    return { supported: false, version: raw, reason: 'git version < 2.15' };
  } catch {
    return { supported: false, version: null, reason: 'git not found' };
  }
}

export class WorktreeManager {
  constructor({ cwd, worktreeDir } = {}) {
    this.cwd = cwd || process.cwd();

    // worktreeBase 必须固定到主仓库路径，不能跟着 cwd 变化。
    // native-worktree 模式下 cwd 是 worktree 子目录，用 cwd 推导 worktreeBase
    // 会导致 meta 写入 worktree 内部路径，worktree 内再次执行时找不到。
    // 解决：用 git rev-parse --git-common-dir 反推主仓库路径。
    if (worktreeDir) {
      this.worktreeBase = worktreeDir;
    } else {
      this.worktreeBase = resolve(this._resolveMainRepoRoot(), WORKTREES_REL);
    }
  }

  /**
   * 解析当前 git 环境对应的主仓库根目录
   * 在主仓库内执行：返回 cwd 自身
   * 在 linked worktree 内执行：返回 git-common-dir 的父目录（即主仓库 .git 所在地）
   * @private
   */
  _resolveMainRepoRoot() {
    try {
      // git-common-dir 在主仓库内 = <main>/.git
      // 在 linked worktree 内 = <main>/.git（git 共享 .git 目录）
      const commonDir = gitQuiet(this.cwd, 'rev-parse --git-common-dir');
      if (!commonDir) return this.cwd;

      // commonDir 应该是 <main-repo>/.git
      // dirname(commonDir) = <main-repo>
      if (existsSync(commonDir)) {
        const st = statSync(commonDir);
        if (st.isDirectory()) {
          return dirname(commonDir);
        }
      }
    } catch (e) {
      // 静默 fallback：主仓库内执行或 git 异常
    }
    return this.cwd;
  }

  /**
   * 获取 worktree 目录绝对路径
   * @param {string} changeName
   * @returns {string}
   */
  getWorktreePath(changeName) {
    return resolve(this.worktreeBase, changeName);
  }

  /**
   * 读取 worktree 元数据
   * @param {string} changeName
   * @returns {object|null} meta.json 内容，不存在或损坏返回 null
   */
  getMeta(changeName) {
    const name = validateChangeName(changeName);
    const metaPath = join(this.getWorktreePath(name), META_FILE);
    if (!existsSync(metaPath)) return null;
    return parseJSON(readFileSync(metaPath, 'utf8'));
  }

  /**
   * 创建 worktree
   * @param {string} changeName - 变更名
   * @param {{ base?: string }} opts - base: 基础分支，默认当前 HEAD
   * @returns {{ branch: string, worktreePath: string, baseHash: string }}
   * @throws {Error} worktree 已存在、git 不可用、changeName 为空
   */
  create(changeName, { base } = {}) {
    const name = validateChangeName(changeName);
    const worktreePath = this.getWorktreePath(name);
    const branch = BRANCH_PREFIX + name;

    // 0. 检测当前环境隔离状态（submodule guard）
    const isolation = detectIsolation(this.cwd);
    if (isolation.inSubmodule) {
      throw new Error(
        '当前目录在 git submodule 内，SillySpec worktree 不支持在 submodule 中创建。' +
        '\n请在主仓库中执行，或使用 --no-worktree 跳过隔离。'
      );
    }
    if (isolation.inWorktree) {
      // 已在 linked worktree 中，复用当前目录作为 worktree 路径
      console.log(`ℹ️  已在 linked worktree 中（git-dir: ${isolation.gitDir}），复用当前隔离环境。`);

      // 幂等守卫：meta 已存在时不重新 overlay baseline
      const existingMeta = this.getMeta(name)
      if (existingMeta) {
        return { branch: existingMeta.branch, worktreePath: existingMeta.worktreePath, baseHash: existingMeta.baseHash, mode: existingMeta.mode }
      }

      // meta 不存在但已在 worktree 内：可能是 meta 被损坏/误删。
      // 绝对禁止 overlay baseline（source === target 会冲突），
      // 只恢复 meta 引用，不触碰文件系统。
      return this._recoverNativeWorktreeMeta(name, {
        worktreePath: this.cwd,
        branch: gitQuiet(this.cwd, 'symbolic-ref --short HEAD') || 'detached',
      });
    }

    // 1. 检查 worktree 目录是否被 gitignore
    const ignoreStatus = checkWorktreeDirIgnored(this.cwd);
    if (!ignoreStatus.ignored) {
      throw new Error(
        `worktree 存储目录 ${ignoreStatus.path} 未被 .gitignore 忽略，` +
        `创建 worktree 可能导致内容被误提交。\n` +
        `请先在 .gitignore 中添加: ${ignoreStatus.path}/\n` +
        `或运行 sillyspec doctor 检查修复。`
      );
    }

    // 2. 检查 worktree 是否已存在
    if (existsSync(worktreePath)) {
      // 目录在但 meta.json 不存在（幽灵状态），自动清理
      if (!this.getMeta(name)) {
        console.log(`⚠️  检测到幽灵 worktree 目录（无 meta.json），自动清理...`);
        try { rmSync(worktreePath, { recursive: true, force: true }); } catch {}
      } else {
        throw new Error(`worktree already exists: ${name}. Run cleanup first.`);
      }
    }

    // 2. 检查分支是否已存在
    if (gitQuiet(this.cwd, `rev-parse --verify refs/heads/${branch}`)) {
      throw new Error(`branch already exists: ${branch}. Run cleanup first.`);
    }

    // 3. 解析 base 分支
    let baseBranch = base;
    let baseHash;
    if (baseBranch) {
      baseHash = git(this.cwd, `rev-parse ${baseBranch}`);
    } else {
      // 默认用当前 HEAD
      baseBranch = gitQuiet(this.cwd, `symbolic-ref --short HEAD`) || git(this.cwd, `rev-parse HEAD`);
      baseHash = git(this.cwd, `rev-parse HEAD`);
    }

    // 4. 创建 worktree 根目录
    if (!existsSync(this.worktreeBase)) {
      mkdirSync(this.worktreeBase, { recursive: true });
    }

    // 5. 创建 worktree（含版本检测 + sandbox fallback）
    try {
      git(this.cwd, `worktree add ${worktreePath} -b ${branch} ${baseHash}`);
    } catch (e) {
      const check = isGitWorktreeSupported(this.cwd);
      if (!check.supported) {
        throw new Error(`git worktree add 失败: ${e.stderr || e.message}\n\n${check.reason ? `原因: ${check.reason}` : ''}\n建议: 使用 --no-worktree 标志跳过隔离，或升级 git 到 >= 2.15`);
      }
      // sandbox/permission fallback: 降级为 in-place + baseline protection
      console.log(`⚠️  git worktree add 失败（可能是沙箱权限限制），降级为 in-place 模式 + baseline protection`);
      console.log(`   原因: ${e.stderr || e.message}`);
      return this._createInPlaceMeta(name, {
        worktreePath: this.cwd,
        branch,
        baseBranch,
        baseHash,
        mode: 'in-place-fallback',
      });
    }

    // 5.5 自动同步远程最新代码（防止 worktree 基于过时的 commit）
    let syncStatus = 'ok';
    let syncError = null;
    try {
      // 先 fetch origin
      gitQuiet(worktreePath, 'fetch origin');

      // 尝试 merge origin/main（或 origin/master）到 worktree 分支
      const defaultBranch = gitQuiet(this.cwd, 'symbolic-ref refs/remotes/origin/HEAD --short')?.replace('origin/', '')
        || gitQuiet(this.cwd, 'rev-parse --abbrev-ref origin/main') ? 'main'
        : gitQuiet(this.cwd, 'rev-parse --abbrev-ref origin/master') ? 'master'
        : null;

      if (defaultBranch) {
        // 检查 worktree 是否落后于远程
        const localHead = gitQuiet(worktreePath, 'rev-parse HEAD');
        const remoteHead = gitQuiet(worktreePath, `rev-parse origin/${defaultBranch}`);

        if (localHead && remoteHead && localHead !== remoteHead) {
 // 检查是否有共同祖先（避免完全不相关的分支强行 merge）
          const mergeBase = gitQuiet(worktreePath, `merge-base ${localHead} origin/${defaultBranch}`);
          if (mergeBase) {
            git(worktreePath, `merge origin/${defaultBranch} --ff-only`);
          }
        }
      }
    } catch (e) {
      syncStatus = 'failed';
      syncError = e.message || String(e);
      console.warn(`⚠️  worktree 远程同步失败：${syncError}`);
    }

    // 5.6 Dirty baseline overlay：将主工作区未提交变更同步到 worktree
    const baselineResult = this._overlayBaseline(this.cwd, worktreePath);
    const baselineFiles = baselineResult.files;
    const baselineHash = baselineResult.baselineHash;

    // 5.7 创建 baseline checkpoint（有 dirty baseline 时才创建）
    let baselineCommit = null;
    if (baselineFiles.length > 0) {
      baselineCommit = this._createBaselineCheckpoint(worktreePath, name);
    }

    // 5.8 依赖供给（change 2026-06-28-worktree-deps-provision）
    // baseline overlay 后让 worktree 立即可构建/测试；失败不阻断 create，只记 meta。
    let deps = {};
    try {
      deps = provisionDeps(worktreePath, this.cwd, { specBase: join(this.cwd, '.sillyspec') }) || {};
    } catch (e) {
      deps = { depsStatus: 'failed', depsError: `provisionDeps crashed: ${e.message}` };
    }

    // 6. 写入 meta.json
    const meta = {
      changeName: name,
      branch,
      baseBranch,
      baseHash,
      actualBaseHash: gitQuiet(worktreePath, 'rev-parse HEAD') || baseHash,
      createdAt: new Date().toISOString(),
      worktreePath,
      mode: 'worktree',
      baselineFiles,
      baselineCommit,
      baselineHash,
      syncStatus,
      ...(syncError ? { syncError } : {}),
      depsStatus: deps.depsStatus,
      depsMethod: deps.depsMethod || null,
      depsSource: deps.depsSource || null,
      depsLockHash: deps.depsLockHash || null,
      depsCheckedAt: deps.depsCheckedAt || null,
      ...(deps.depsError ? { depsError: deps.depsError } : {}),
    };

    const metaPath = join(worktreePath, META_FILE);
    writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n');

    return { branch, worktreePath, baseHash, mode: meta.mode };
  }

  /**
   * native-worktree 模式下恢复 meta 引用
   * 当 meta.json 被损坏/误删时，只重建 meta 文件，不触碰文件系统（不 overlay）
   * @private
   */
  _recoverNativeWorktreeMeta(name, { worktreePath, branch }) {
    const baseHash = gitQuiet(worktreePath, 'rev-parse HEAD') || null
    const meta = {
      changeName: name,
      branch: branch || BRANCH_PREFIX + name,
      baseBranch: branch,
      baseHash,
      actualBaseHash: baseHash,
      createdAt: new Date().toISOString(),
      worktreePath,
      mode: 'native-worktree',
      baselineFiles: [],
      baselineCommit: null,
      baselineHash: null,
      recoveredAt: new Date().toISOString(),
      recoveryNote: 'meta was missing in native-worktree; recovered without baseline overlay',
    }
    if (!existsSync(this.worktreeBase)) mkdirSync(this.worktreeBase, { recursive: true })
    const metaDir = join(this.worktreeBase, name)
    if (!existsSync(metaDir)) mkdirSync(metaDir, { recursive: true })
    writeFileSync(join(metaDir, META_FILE), JSON.stringify(meta, null, 2) + '\n')
    console.log(`🔗 native-worktree meta 已恢复: ${metaDir}/meta.json`)
    return { branch: meta.branch, worktreePath, baseHash, mode: meta.mode }
  }

  /**
   * 创建 in-place 模式的 meta.json（降级路径）
   * 不创建 git worktree，直接在当前目录记录 baseline 并写入 meta
   * @private
   */
  _createInPlaceMeta(name, { worktreePath, branch, baseBranch, baseHash, mode } = {}) {
    // 幂等守卫：meta 已存在时不重新创建（避免 overlay baseline 和已有改动冲突）
    const existingMeta = this.getMeta(name)
    if (existingMeta) {
      return { branch: existingMeta.branch, worktreePath: existingMeta.worktreePath, baseHash: existingMeta.baseHash, mode: existingMeta.mode }
    }

    // 硬规则：禁止 self-overlay（source 和 target 相同时 overlay 必然冲突）
    const resolvedSource = resolve(this.cwd)
    const resolvedTarget = resolve(worktreePath)
    if (resolvedSource === resolvedTarget) {
      console.warn('⚠️  跳过 baseline overlay：当前目录与目标目录相同（native-worktree 或 in-place 模式）')
      // 写 meta 但不 overlay
      baseBranch = baseBranch || gitQuiet(this.cwd, 'symbolic-ref --short HEAD') || gitQuiet(this.cwd, 'rev-parse HEAD')
      baseHash = baseHash || git(this.cwd, 'rev-parse HEAD')
      const meta = {
        changeName: name,
        branch: branch || BRANCH_PREFIX + name,
        baseBranch,
        baseHash,
        actualBaseHash: gitQuiet(worktreePath, 'rev-parse HEAD') || baseHash,
        createdAt: new Date().toISOString(),
        worktreePath,
        mode: mode || 'in-place-fallback',
        baselineFiles: [],
        baselineCommit: null,
        baselineHash: null,
      }
      if (!existsSync(this.worktreeBase)) mkdirSync(this.worktreeBase, { recursive: true })
      const metaDir = join(this.worktreeBase, name)
      if (!existsSync(metaDir)) mkdirSync(metaDir, { recursive: true })
      writeFileSync(join(metaDir, META_FILE), JSON.stringify(meta, null, 2) + '\n')
      return { branch: meta.branch, worktreePath, baseHash, mode: meta.mode }
    }

    // 解析 base
    if (!baseHash) {
      baseBranch = baseBranch || gitQuiet(this.cwd, 'symbolic-ref --short HEAD') || gitQuiet(this.cwd, 'rev-parse HEAD');
      baseHash = git(this.cwd, 'rev-parse HEAD');
    }

    const baselineResult = this._overlayBaseline(this.cwd, this.cwd);
    const baselineFiles = baselineResult.files;
    const baselineHash = baselineResult.baselineHash;

    let baselineCommit = null;
    if (baselineFiles.length > 0) {
      baselineCommit = this._createBaselineCheckpoint(this.cwd, name);
    }

    const meta = {
      changeName: name,
      branch: branch || BRANCH_PREFIX + name,
      baseBranch,
      baseHash,
      actualBaseHash: gitQuiet(worktreePath, 'rev-parse HEAD') || baseHash,
      createdAt: new Date().toISOString(),
      worktreePath,
      mode: mode || 'in-place-fallback',
      baselineFiles,
      baselineCommit,
      baselineHash,
    };

    // in-place 模式下 meta 写入 worktreeBase（避免污染主工作区）
    if (!existsSync(this.worktreeBase)) {
      mkdirSync(this.worktreeBase, { recursive: true });
    }
    const metaPath = join(this.worktreeBase, name, META_FILE);
    const metaDir = join(this.worktreeBase, name);
    if (!existsSync(metaDir)) {
      mkdirSync(metaDir, { recursive: true });
    }
    writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n');

    return { branch: meta.branch, worktreePath, baseHash, mode: meta.mode };
  }

  /**
   * 构建 isolation 信息对象，用于写入 gate-status.json
   * @param {string} changeName
   * @returns {{ status: string, mode: string, path: string } | null}
   */
  getIsolationInfo(changeName) {
    const meta = this.getMeta(changeName);
    if (!meta) return null;

    const mode = meta.mode || 'worktree';
    const statusMap = {
      'worktree': 'verified',
      'native-worktree': 'verified',
      'in-place-fallback': 'degraded',
    };

    return {
      status: statusMap[mode] || 'verified',
      mode,
      path: meta.worktreePath,
      branch: meta.branch,
    };
  }

  /**
   * 获取 worktree 的运行模式
   * @param {string} changeName
   * @returns {'worktree'|'native-worktree'|'in-place-fallback'|null}
   */
  getMode(changeName) {
    const meta = this.getMeta(changeName);
    return meta?.mode || null;
  }

  /**
   * 列出所有活跃 worktree
   * @returns {Array<{ changeName: string, branch: string, baseHash: string, createdAt: string, worktreePath: string }>}
   */
  list() {
    const results = [];
    if (!existsSync(this.worktreeBase)) return results;

    const entries = readdirSync(this.worktreeBase, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const metaPath = join(this.worktreeBase, entry.name, META_FILE);
      if (!existsSync(metaPath)) continue;
      const meta = parseJSON(readFileSync(metaPath, 'utf8'));
      if (!meta) continue;
      results.push({
        changeName: meta.changeName,
        branch: meta.branch,
        baseHash: meta.baseHash,
        baseBranch: meta.baseBranch,
        createdAt: meta.createdAt,
        worktreePath: meta.worktreePath,
        mode: meta.mode || 'worktree',
      });
    }

    return results;
  }

  /**
   * 清理 worktree（仅限 SillySpec 创建的临时 worktree）
   * 幂等：重复调用不报错。
   * 三重清理：git worktree 注册 + worktree 目录 + meta 目录。
   * @param {string} changeName
   * @param {{ force?: boolean, maxRetries?: number }} opts
   * @returns {{ result: 'cleaned'|'force-cleaned'|'skipped'|'kept', mode: string|null, details: string[] }}
   */
  cleanup(changeName, { force = false, maxRetries = 3 } = {}) {
    const name = validateChangeName(changeName);
    const meta = this.getMeta(name);
    const worktreePath = this.getWorktreePath(name);
    const metaDir = join(this.worktreeBase, name);
    const details = [];

    // 幂等：什么都不存在 → 直接跳过
    if (!meta && !existsSync(worktreePath) && !existsSync(metaDir)) {
      return { result: 'skipped', mode: null, details };
    }

    const mode = meta?.mode || 'worktree';

    // 安全检查：只有 SillySpec 创建的 worktree 才允许删除
    if (!force) {
      if (mode === 'native-worktree') {
        return { result: 'kept', mode, details: ['native-worktree: 外部隔离环境，跳过清理'] };
      }
      if (mode === 'in-place-fallback') {
        return { result: 'skipped', mode, details: ['in-place-fallback: 无隔离目录，跳过清理'] };
      }
    }

    const branch = (meta && meta.branch) || BRANCH_PREFIX + name;

    // 1. git worktree remove（带 retry）
    let gitRemoveOk = false;
    if (existsSync(worktreePath)) {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          git(this.cwd, `worktree remove ${worktreePath} --force`);
          gitRemoveOk = true;
          details.push(`git worktree remove succeeded (attempt ${attempt})`);
          break;
        } catch (e) {
          details.push(`git worktree remove attempt ${attempt}/${maxRetries} failed: ${e.message}`);
          if (attempt < maxRetries) {
            // 短暂等待后重试
            execSync('sleep 0.5', { stdio: 'pipe' });
          }
        }
      }
    }

    // 2. fallback: 确保 worktree 目录已删除
    if (existsSync(worktreePath)) {
      try {
        rmSync(worktreePath, { recursive: true, force: true });
        details.push('worktree directory force-removed (fallback)');
      } catch (e) {
        details.push(`worktree directory force-remove failed: ${e.message}`);
      }
    }

    // 3. git worktree prune（清理 git 内部注册信息）
    try {
      gitQuiet(this.cwd, 'worktree prune');
    } catch {
      // prune 失败不阻断
    }

    // 4. 删除分支（忽略分支不存在的错误）
    try {
      gitQuiet(this.cwd, `branch -D ${branch}`);
      details.push('branch deleted');
    } catch {
      // 分支可能已被删除，幂等跳过
    }

    // 5. 清除 meta 目录
    if (existsSync(metaDir)) {
      try {
        rmSync(metaDir, { recursive: true, force: true });
        details.push('meta directory cleaned');
      } catch (e) {
        details.push(`meta directory cleanup failed: ${e.message}`);
      }
    }

    // 6. 最终验证：确认三重清理完成
    const residual = [];
    if (existsSync(worktreePath)) residual.push(`worktree dir: ${worktreePath}`);
    if (existsSync(metaDir)) residual.push(`meta dir: ${metaDir}`);
    if (gitQuiet(this.cwd, `worktree list`)?.includes(worktreePath)) {
      residual.push('git worktree list still references this worktree');
    }
    if (residual.length > 0) {
      details.push(`⚠️ 残留: ${residual.join('; ')}`);
    }

    return { result: gitRemoveOk ? 'cleaned' : 'force-cleaned', mode, details };
  }

  /**
   * worktree 健康检查 + 可选修复
   * 检查项：
   * - git worktree list 中的孤儿条目（目录不存在）
   * - worktree 目录存在但 git 不认识
   * - meta 存在但 worktree 目录不存在
   * - worktree 目录存在但 meta 不存在（幽灵目录）
   * - SillySpec 分支残留（sillyspec/* 但无对应 meta）
   * - 超过指定小时的过期 worktree
   *
   * @param {{ fix?: boolean, staleHours?: number }} opts
   * @returns {{ issues: Array<{ type: string, name: string, detail: string, fixable: boolean }>, fixed: string[], unfixable: string[] }}
   */
  _doctorReprovision(name, wtPath) {
    try {
      const deps = provisionDeps(wtPath, this.cwd, { specBase: join(this.cwd, '.sillyspec') }) || {};
      const metaPath = join(this.getWorktreePath(name), META_FILE);
      const meta = this.getMeta(name) || {};
      writeFileSync(metaPath, JSON.stringify({ ...meta, ...deps }, null, 2) + '\n');
      return { ok: true, msg: `re-provisioned ${name}: depsStatus=${deps.depsStatus}` };
    } catch (e) {
      return { ok: false, msg: `re-provision failed for ${name}: ${e.message}` };
    }
  }

  doctor({ fix = false, staleHours = 24 } = {}) {
    const issues = [];
    const fixed = [];
    const unfixable = [];

    // 1. 列出 git worktree list 中的条目
    let gitWorktreeList = [];
    try {
      const raw = execSync(`git worktree list --porcelain`, { cwd: this.cwd, encoding: 'utf8', stdio: ['pipe','pipe','pipe'] });
      const entries = raw.split(/\n\n/).filter(Boolean);
      for (const entry of entries) {
        const lines = entry.split('\n');
        const wtPath = lines.find(l => l.startsWith('worktree '))?.replace('worktree ', '');
        if (wtPath && wtPath !== this.cwd) { // 排除主工作区
          gitWorktreeList.push({ path: wtPath, raw: entry });
        }
      }
    } catch {
      // git worktree 不可用，跳过
    }

    // 2. 列出 SillySpec meta 条目
    const metaEntries = this.list();
    const metaNames = new Set(metaEntries.map(m => m.changeName));

    // 3. 检查 git worktree list 中的孤儿条目
    for (const wt of gitWorktreeList) {
      if (!existsSync(wt.path)) {
        const name = this._pathToChangeName(wt.path);
        issues.push({ type: 'orphan-git-entry', name: name || wt.path, detail: `git worktree 引用存在但目录不存在: ${wt.path}`, fixable: true });
        if (fix) {
          try { gitQuiet(this.cwd, 'worktree prune'); fixed.push(`pruned orphan: ${wt.path}`); } catch { unfixable.push(`prune failed for: ${wt.path}`); }
        }
      }
    }

    // 4. 扫描 worktreeBase 目录，检查幽灵目录和孤儿 meta
    if (existsSync(this.worktreeBase)) {
      const entries = readdirSync(this.worktreeBase, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const name = entry.name;
        const dirPath = join(this.worktreeBase, name);
        const hasMeta = existsSync(join(dirPath, META_FILE));
        const meta = hasMeta ? this.getMeta(name) : null;

        // deps 依赖状态检查（change 2026-06-28-worktree-deps-provision）
        if (meta && meta.worktreePath && existsSync(meta.worktreePath) && meta.mode !== 'in-place-fallback') {
          const wtPath = meta.worktreePath;
          const nmExists = existsSync(join(wtPath, 'node_modules'));
          const curHash = lockfileHash(wtPath);
          let depsIssue = null;
          if (['linked', 'installed'].includes(meta.depsStatus) && !nmExists) {
            depsIssue = { type: 'deps-missing', detail: 'meta.depsStatus=' + meta.depsStatus + ' 但 node_modules 缺失' };
          } else if (meta.depsLockHash && curHash && curHash !== meta.depsLockHash) {
            depsIssue = { type: 'deps-stale', detail: 'lockfile 变化 (' + meta.depsLockHash + ' -> ' + curHash + ')' };
          } else if (meta.depsStatus === 'failed') {
            depsIssue = { type: 'deps-failed', detail: '上次依赖供给失败' + (meta.depsError ? ': ' + meta.depsError : '') };
          }
          if (depsIssue) {
            issues.push({ type: depsIssue.type, name, detail: depsIssue.detail, fixable: true });
            if (fix) {
              const r = this._doctorReprovision(name, wtPath);
              (r.ok ? fixed : unfixable).push(r.msg);
            }
          }
        }

        // meta 存在但 worktree 目录不存在
        if (meta && meta.worktreePath && !existsSync(meta.worktreePath)) {
          issues.push({ type: 'meta-no-dir', name, detail: `meta 存在但 worktree 目录不存在: ${meta.worktreePath}`, fixable: true });
          if (fix) {
            try { rmSync(dirPath, { recursive: true, force: true }); fixed.push(`cleaned orphan meta: ${name}`); } catch { unfixable.push(`cleanup failed for: ${name}`); }
          }
        }

        // worktree 目录存在但 meta 不存在（幽灵目录）
        if (!hasMeta && existsSync(dirPath)) {
          // 可能是 in-place 模式的 meta-only 目录，或者真正的幽灵
          const files = readdirSync(dirPath);
          if (files.length === 0 || (files.length === 1 && files[0] === META_FILE)) {
            issues.push({ type: 'ghost-dir', name, detail: `空目录/幽灵目录: ${dirPath}`, fixable: true });
            if (fix) {
              try { rmSync(dirPath, { recursive: true, force: true }); fixed.push(`removed ghost dir: ${name}`); } catch { unfixable.push(`remove failed for: ${name}`); }
            }
          } else {
            issues.push({ type: 'ghost-dir-with-files', name, detail: `目录存在但无 meta.json: ${dirPath} (含 ${files.length} 文件)`, fixable: false });
          }
        }

        // 检查过期 worktree
        if (meta && meta.createdAt) {
          const ageMs = Date.now() - new Date(meta.createdAt).getTime();
          const ageHours = ageMs / (1000 * 60 * 60);
          if (ageHours > staleHours) {
            issues.push({ type: 'stale', name, detail: `worktree 已存在 ${Math.round(ageHours)} 小时（超过 ${staleHours}h 阈值）`, fixable: true });
            if (fix && meta.mode !== 'native-worktree') {
              try {
                const result = this.cleanup(name);
                if (result.result === 'cleaned' || result.result === 'force-cleaned') {
                  fixed.push(`cleaned stale: ${name}`);
                } else {
                  unfixable.push(`cleanup skipped: ${name}`);
                }
              } catch { unfixable.push(`cleanup failed: ${name}`); }
            }
          }
        }
      }
    }

    // 5. 检查 SillySpec 分支残留
    try {
      const branches = execSync(`git branch --list '${BRANCH_PREFIX}*'`, { cwd: this.cwd, encoding: 'utf8', stdio: ['pipe','pipe','pipe'] }).trim();
      if (branches) {
        for (const line of branches.split('\n').filter(Boolean)) {
          const branch = line.replace(/^\*?\s+/, '').trim();
          const name = branch.replace(BRANCH_PREFIX, '');
          if (!metaNames.has(name)) {
            issues.push({ type: 'orphan-branch', name, detail: `分支残留（无对应 meta）: ${branch}`, fixable: true });
            if (fix) {
              try { gitQuiet(this.cwd, `branch -D ${branch}`); fixed.push(`deleted orphan branch: ${branch}`); } catch { unfixable.push(`branch delete failed: ${branch}`); }
            }
          }
        }
      }
    } catch {}

    return { issues, fixed, unfixable };
  }

  /**
   * 检查 worktree 是否有未 apply 到主工作区的变更
   * @param {string} changeName
   * @returns {{ hasChanges: boolean, changedFiles: string[], reason?: string }}
   */
  hasUnappliedChanges(changeName) {
    const name = validateChangeName(changeName);
    const meta = this.getMeta(name);
    if (!meta) return { hasChanges: false, changedFiles: [], reason: 'no meta' };

    const worktreePath = meta.worktreePath;
    if (!worktreePath || !existsSync(worktreePath)) {
      return { hasChanges: false, changedFiles: [], reason: 'worktree dir not found' };
    }

    // in-place 模式没有隔离目录，不算有未 apply 的变更
    if (meta.mode === 'in-place-fallback') {
      return { hasChanges: false, changedFiles: [], reason: 'in-place mode' };
    }

    const diffBase = meta.baselineCommit || meta.baseHash;
    if (!diffBase) {
      return { hasChanges: false, changedFiles: [], reason: 'no diff base' };
    }

    try {
      // tracked 文件变更
      const statusRaw = gitQuiet(worktreePath, `diff --name-status ${diffBase}`) || '';
      const statusFiles = new Set();
      if (statusRaw) {
        for (const line of statusRaw.split('\n').filter(Boolean)) {
          const parts = line.split('\t');
          if (parts.length >= 2) statusFiles.add(parts[parts.length - 1]);
          if (parts.length >= 3) statusFiles.add(parts[parts.length - 2]);
        }
      }

      // untracked 文件
      const untrackedRaw = gitQuiet(worktreePath, `ls-files --others --exclude-standard`) || '';
      const untrackedFiles = untrackedRaw
        ? untrackedRaw.split('\n').filter(Boolean).filter(f => !f.startsWith('.sillyspec/') && f !== 'meta.json')
        : [];

      const changedFiles = [...new Set([...statusFiles, ...untrackedFiles])];
      return { hasChanges: changedFiles.length > 0, changedFiles };
    } catch (e) {
      // 检测失败时保守处理：视为有变更
      return { hasChanges: true, changedFiles: [], reason: `diff failed: ${e.message}` };
    }
  }

  /**
   * 从 worktree 路径反推 changeName
   * @private
   */
  _pathToChangeName(wtPath) {
    try {
      const resolved = resolve(wtPath);
      const baseResolved = resolve(this.worktreeBase);
      if (resolved.startsWith(baseResolved + '/')) {
        return resolved.slice(baseResolved.length + 1);
      }
    } catch {}
    return null;
  }

  /**
   * 将主工作区未提交变更同步到 worktree（dirty baseline overlay）
   * 覆盖 staged + unstaged 的文件变更，以及 untracked 文件。
   * 使用 git diff + git apply 确保正确处理删除/rename/binary。
   * @param {string} mainCwd - 主工作区路径
   * @param {string} worktreePath - worktree 路径
   * @returns {Array<string>} overlay 的文件列表
   */
  _overlayBaseline(mainCwd, worktreePath) {
    const files = [];
    const errors = [];

    try {
      // staged 变更
      const staged = gitQuiet(mainCwd, 'diff --cached --name-only') || '';
      if (staged) {
        try {
          // 用 Buffer 模式读取，避免二进制 patch 被 UTF-8 解码损坏
          const patchBuf = execSync(`git diff --cached --binary`, { cwd: mainCwd, stdio: ['pipe','pipe','pipe'] });
          if (patchBuf && patchBuf.length > 0) {
            const patchFile = join(worktreePath, '.sillyspec-baseline-staged.patch');
            writeFileSync(patchFile, patchBuf);
            git(worktreePath, `apply --binary ${patchFile}`);
            rmSync(patchFile, { force: true });
          }
        } catch (e) {
          errors.push(`staged: ${e.message}`);
        }
        files.push(...staged.split('\n').filter(Boolean));
      }

      // unstaged 变更
      const unstaged = gitQuiet(mainCwd, 'diff --name-only') || '';
      if (unstaged) {
        try {
          // 用 Buffer 模式读取，避免二进制 patch 被 UTF-8 解码损坏
          const patchBuf = execSync(`git diff --binary`, { cwd: mainCwd, stdio: ['pipe','pipe','pipe'] });
          if (patchBuf && patchBuf.length > 0) {
            const patchFile = join(worktreePath, '.sillyspec-baseline-unstaged.patch');
            writeFileSync(patchFile, patchBuf);
            git(worktreePath, `apply --binary ${patchFile}`);
            rmSync(patchFile, { force: true });
          }
        } catch (e) {
          errors.push(`unstaged: ${e.message}`);
        }
        files.push(...unstaged.split('\n').filter(Boolean));
      }

      // untracked 文件（排除 .sillyspec/.runtime 等）
      const untracked = gitQuiet(mainCwd, 'ls-files --others --exclude-standard') || '';
      if (untracked) {
        for (const f of untracked.split('\n').filter(Boolean)) {
          const src = join(mainCwd, f);
          const dst = join(worktreePath, f);
          if (existsSync(src)) {
            mkdirSync(dirname(dst), { recursive: true });
            try { writeFileSync(dst, readFileSync(src)); files.push(f); } catch {}
          }
        }
      }

      if (files.length > 0) {
        console.log(`📁 baseline overlay: ${files.length} 个未提交文件已同步到 worktree`);
      }
    } catch (e) {
      errors.push(`unexpected: ${e.message}`);
    }

    // 有 pending 文件但 overlay 部分失败 → fail-fast
    if (errors.length > 0) {
      throw new Error(`baseline overlay 失败 (${errors.length} 个错误): ${errors.join('; ')}`);
    }

    const uniqueFiles = [...new Set(files)];

    // 计算 baseline hash（用于 merge 前校验主工作区是否变化）
    const baselineHash = uniqueFiles.length > 0 ? computeBaselineHash(mainCwd) : null;

    return { files: uniqueFiles, baselineHash };
  }

  /**
   * 在 worktree 内创建 baseline checkpoint commit
   * 用于区分 "前置 dirty baseline" 和 "子代理新增改动"
   * @param {string} worktreePath
   * @param {string} changeName
   * @returns {string} commit hash
   */
  _createBaselineCheckpoint(worktreePath, changeName) {
    // 使用临时 git identity，避免用户未配置 user.name/user.email 导致失败
    const env = {
      GIT_AUTHOR_NAME: 'sillyspec',
      GIT_AUTHOR_EMAIL: 'sillyspec@baseline',
      GIT_COMMITTER_NAME: 'sillyspec',
      GIT_COMMITTER_EMAIL: 'sillyspec@baseline',
    };
    try {
      execSync('git add -A', { cwd: worktreePath, encoding: 'utf8', stdio: ['pipe','pipe','pipe'], env });
      // 检查是否有实际变更（可能 overlay 后和 HEAD 完全一致）
      const status = gitQuiet(worktreePath, 'status --porcelain');
      if (!status) {
        return gitQuiet(worktreePath, 'rev-parse HEAD');
      }
      execSync(
        `git commit -m "sillyspec: baseline checkpoint for ${changeName}"`,
        { cwd: worktreePath, encoding: 'utf8', stdio: ['pipe','pipe','pipe'], env }
      );
      const hash = git(worktreePath, 'rev-parse HEAD');
      console.log(`📌 baseline checkpoint: ${hash}`);
      return hash;
    } catch (e) {
      throw new Error(`baseline checkpoint 创建失败: ${e.message}`);
    }
  }
}
