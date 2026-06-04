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
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, readdirSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { createHash } from 'crypto';

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
  const staged = gitQuiet(cwd, 'diff --cached') || '';
  const unstaged = gitQuiet(cwd, 'diff') || '';
  const untracked = gitQuiet(cwd, 'ls-files --others --exclude-standard') || '';
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
    this.worktreeBase = worktreeDir || resolve(this.cwd, WORKTREES_REL);
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
      // 已在 linked worktree 中，提示信息而非报错
      console.log(`ℹ️  已在 linked worktree 中（git-dir: ${isolation.gitDir}），复用当前隔离环境。`);
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

    // 5. 创建 worktree（含版本检测）
    try {
      git(this.cwd, `worktree add ${worktreePath} -b ${branch} ${baseHash}`);
    } catch (e) {
      const check = isGitWorktreeSupported(this.cwd);
      if (!check.supported) {
        throw new Error(`git worktree add 失败: ${e.stderr || e.message}\n\n${check.reason ? `原因: ${check.reason}` : ''}\n建议: 使用 --no-worktree 标志跳过隔离，或升级 git 到 >= 2.15`);
      }
      throw new Error(`git worktree add 失败: ${e.stderr || e.message}`);
    }

    // 5.5 自动同步远程最新代码（防止 worktree 基于过时的 commit）
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
    } catch {
 // fetch/merge 失败不影响 worktree 创建，只记录警告
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

    // 6. 写入 meta.json
    const meta = {
      changeName: name,
      branch,
      baseBranch,
      baseHash,
      actualBaseHash: gitQuiet(worktreePath, 'rev-parse HEAD') || baseHash,
      createdAt: new Date().toISOString(),
      worktreePath,
      baselineFiles,
      baselineCommit,
      baselineHash,  // 有 dirty baseline 时指向 checkpoint commit
    };

    const metaPath = join(worktreePath, META_FILE);
    writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n');

    return { branch, worktreePath, baseHash };
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
      });
    }

    return results;
  }

  /**
   * 清理 worktree（强制删除，不 apply）
   * @param {string} changeName
   * @throws {Error} worktree 不存在
   */
  cleanup(changeName) {
    const name = validateChangeName(changeName);
    const meta = this.getMeta(name);
    const worktreePath = this.getWorktreePath(name);

    if (!meta && !existsSync(worktreePath)) {
      throw new Error(`worktree not found: ${name}。meta.json 不存在，目录也不存在，可能已被清理或从未创建。`);
    }

    // 1. 尝试 git worktree remove
    try {
      git(this.cwd, `worktree remove ${worktreePath} --force`);
    } catch {
      // git worktree remove 失败，尝试直接删除目录
    }
    const branch = (meta && meta.branch) || BRANCH_PREFIX + name;

    // 2. 确保目录已删除
    try {
      if (existsSync(worktreePath)) {
        rmSync(worktreePath, { recursive: true, force: true });
      }
    } catch (e) {
      throw new Error(`清理 worktree 目录失败: ${e.message}`);
    }

    // 3. 删除分支（忽略分支不存在的错误）
    gitQuiet(this.cwd, `branch -D ${branch}`);

    // 4. 确保目录已删除
    if (existsSync(worktreePath)) {
      rmSync(worktreePath, { recursive: true, force: true });
    }
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
