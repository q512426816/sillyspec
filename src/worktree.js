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
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, readdirSync, statSync, lstatSync, readlinkSync, unlinkSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { createHash } from 'crypto';
import { provisionDeps, checkDepsFreshness } from './worktree-deps.js';
import { writeAtomicSync } from './fs-atomic.js';

// meta.json 会被 hook 进程与其它 CLI 进程并发读取（worktree-guard / getMeta / create 幽灵判定），
// 必须原子写：半截 JSON 会让 getMeta 返回 null → 触发幽灵 worktree 强删（可能丢 gitignored 改动）。
const writeMetaAtomic = (metaPath, meta) => writeAtomicSync(metaPath, JSON.stringify(meta, null, 2) + '\n');

const WORKTREES_REL = '.sillyspec/.runtime/worktrees';
const BRANCH_PREFIX = 'sillyspec/';
const META_FILE = 'meta.json';

// 进程级缓存：cwd → 主仓库根目录。避免每次 new WorktreeManager 都 spawn 一次
// `git rev-parse --git-common-dir`（Windows 上每次 spawn 约 30-100ms，execute 一次命令
// 会 new 多个 WorktreeManager）。git-common-dir 在进程内对同一 cwd 稳定，缓存安全。
const _mainRepoRootByCwd = new Map();

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

/**
 * 检测 worktree base（主仓库 HEAD）与 origin 默认分支的同步状态（只读：不 ff、不改 HEAD）。
 * 替代旧的 fetch + merge --ff-only：旧逻辑分叉时 ff 失败被静默吞（syncStatus=failed），
 * 成功时 baseHash 锚点又不更新（ff 引入的 main 内容污染 apply patch）。现改为只检测+报告，
 * 不阻断 create，对齐 origin 的动作留给用户/agent。
 *
 * @param {string} cwd 主仓库目录
 * @param {string} baseHash worktree base commit（= 主仓库 HEAD）
 * @returns {{ status: 'up-to-date'|'behind'|'diverged'|'ahead'|'unknown', defaultBranch: string|null, behind: number, ahead: number }}
 */
export function computeBaseSync(cwd, baseHash) {
  const diag = { status: 'unknown', defaultBranch: null, behind: 0, ahead: 0 };
  // 推断默认分支：优先 origin/HEAD 指向的真实分支名（修复旧 339-342 的运算符优先级 bug
  // ——旧代码在 origin/HEAD 存在时恒返回 'main'，丢弃 symbolic-ref 的真实结果）。
  const headRef = gitQuiet(cwd, 'symbolic-ref refs/remotes/origin/HEAD --short');
  let defaultBranch = headRef ? headRef.replace('origin/', '') : null;
  if (!defaultBranch) {
    // fallback：origin/HEAD 未设置时，探测常见默认分支是否存在
    for (const cand of ['main', 'master']) {
      if (gitQuiet(cwd, `rev-parse --verify --quiet refs/remotes/origin/${cand}`)) {
        defaultBranch = cand;
        break;
      }
    }
  }
  if (!defaultBranch) return diag; // 无 origin 或推不出默认分支 → unknown
  diag.defaultBranch = defaultBranch;

  // best-effort fetch（只更新 remote-tracking，不改工作区/HEAD/分支；失败静默降级用缓存）
  gitQuiet(cwd, 'fetch origin --quiet');
  const remoteHead = gitQuiet(cwd, `rev-parse --verify --quiet refs/remotes/origin/${defaultBranch}`);
  if (!baseHash || !remoteHead) return diag;
  if (baseHash === remoteHead) {
    diag.status = 'up-to-date';
    return diag;
  }
  const behind = Number(gitQuiet(cwd, `rev-list --count ${baseHash}..${remoteHead}`) || 0);
  const ahead = Number(gitQuiet(cwd, `rev-list --count ${remoteHead}..${baseHash}`) || 0);
  diag.behind = behind;
  diag.ahead = ahead;
  diag.status = (behind > 0 && ahead > 0) ? 'diverged' : (behind > 0 ? 'behind' : 'ahead');
  return diag;
}

/**
 * 把 base 同步检测结果打印到 stdout（醒目但不阻断 create）。
 * up-to-date 静默不刷屏；其余给风险等级 + 对齐命令，由用户/agent 决定是否处理。
 */
function printSyncReport(diag, baseHash, changeName) {
  const short = (baseHash || '').slice(0, 8);
  if (diag.status === 'up-to-date') return;
  if (diag.status === 'unknown') {
    console.log(`ℹ️  base 同步检测：无 origin 远端或未设置默认分支，跳过（base ${short}）`);
    return;
  }
  const b = diag.defaultBranch;
  const ch = changeName || '<change>';
  if (diag.status === 'behind') {
    console.log(`⚠️  base 同步检测：落后 origin/${b} ${diag.behind} 个 commit（base ${short}）`);
    console.log(`    apply 时 git --3way 会自动三路合并主干已提交推进；只有同文件同区域重叠才冲突。`);
    console.log(`    建议先对齐以减小冲突面：`);
    console.log(`      git merge --ff-only origin/${b}`);
    console.log(`      sillyspec worktree cleanup ${ch} && sillyspec run execute --change ${ch}`);
    console.log(`    或继续，重叠冲突时用 --merge 兜底（会引入合并提交）。`);
  } else if (diag.status === 'diverged') {
    console.log(`⚠️  base 同步检测：与 origin/${b} 分叉（领先 ${diag.ahead} / 落后 ${diag.behind}，base ${short}）`);
    console.log(`    apply 回 main 大概率冲突。建议先在主仓库对齐（rebase 或 merge origin/${b}），`);
    console.log(`    再 sillyspec worktree cleanup ${ch} + 重跑 execute。`);
  } else {
    // ahead：本地有未 push 的提交，无 apply 冲突风险
    console.log(`ℹ️  base 同步检测：领先 origin/${b} ${diag.ahead} 个 commit（本地有未 push 的提交，无冲突风险）`);
  }
}

function parseJSON(raw) {
  try { return JSON.parse(raw); } catch { return null; }
}

/**
 * 跨平台同步等待（cleanup 重试退避用）
 * 不依赖外部 sleep 命令——Windows cmd.exe 无 sleep；当 Git for Windows 未把 usr/bin 加入
 * PATH 时，execSync('sleep 0.5') 会抛错并从 catch 块冒泡，直接中断整个 cleanup()。
 * 改用 busy-wait 规避，保证 retry 之间真有间隔且不依赖环境。
 */
function sleepMs(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) { /* spin */ }
}

export function computeBaselineHash(cwd) {
  // 排除非交付物的元数据/文档 churn，避免多操作者仓库里别人改这些 → 整树 hash 变 → apply 误阻断
  // （execute 自身也会改 .sillyspec/docs.sillyspec，否则每个 execute 收尾都因自身改动 BLOCKED）。
  // 安全：coarse hash 只挡「未提交」dirty（git apply --3way 危险区，实测必拦）；真冲突由
  // applyWorktree step5a(未提交∩changedFiles 精确点名)+step7(--3way 冲突回滚)兜底，
  // 「已提交」推进不再拦（step5b 已放宽交 --3way 自动三路合并），不读这里的 exclude。
  //   - .sillyspec/：brainstorm/plan 蓝图 + runtime 产物
  //   - .claude/：agent 配置/skills/CLAUDE.md（多操作者 agent 指引 churn）
  //   - docs/：文档（非代码交付物）
  //   - CLAUDE.md：根 agent 指引（多操作者常改）
  // 必须和 applyWorktree step 4.5 (worktree-apply.js) 使用相同的排除规则。
  const exclude = '-- . ":(exclude).sillyspec/" ":(exclude).claude/" ":(exclude)docs/" ":(exclude)CLAUDE.md"';
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

/**
 * 复制单个 untracked 条目到 worktree（baseline overlay 用）。
 *
 * 防御目录：untracked 项若是目录（如 Claude Code agent worktree 隔离目录 .worktrees/<hash>/），
 * readFileSync 会 EISDIR → 整个 overlay fail-fast。目录跳过（overlay 只同步文件层未提交改动，
 * 目录结构由后续文件写入的 mkdirSync 重建）。坑 execute-worktree-overlay-untracked-dir-eisdir。
 *
 * @param {string} src 主仓库源路径
 * @param {string} dst worktree 目标路径
 * @returns {{status:'copied'|'skipped-dir'|'missing'|'error', error?:string}}
 */
export function copyUntrackedEntry(src, dst) {
  if (!existsSync(src)) return { status: 'missing' };
  let st;
  try { st = statSync(src); } catch { return { status: 'missing' }; }
  if (st.isDirectory()) return { status: 'skipped-dir' };
  try {
    mkdirSync(dirname(dst), { recursive: true });
    writeFileSync(dst, readFileSync(src));
    return { status: 'copied' };
  } catch (e) {
    return { status: 'error', error: e.message };
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
    const cached = _mainRepoRootByCwd.get(this.cwd);
    if (cached !== undefined) return cached;

    let root = this.cwd;
    try {
      // git-common-dir 在主仓库内 = <main>/.git，在 linked worktree 内 = <main>/.git（git 共享 .git 目录）。
      // 但 git 可能返回**相对路径**（如 `.git`）。必须相对 this.cwd 绝对化，否则下面的
      // existsSync/statSync 会相对 process.cwd() 解析——当 process.cwd 是另一个 git 仓库
      // （未 chdir 的脚本、或 CLI 在别处跑）时，worktreeBase 会错解析到 process.cwd 仓库，
      // getMeta 读错位置返回 null。resolve() 对绝对参数原样返回、对相对参数相对 this.cwd 解析，两者皆稳。
      const commonDir = gitQuiet(this.cwd, 'rev-parse --git-common-dir');
      if (commonDir) {
        const absCommonDir = resolve(this.cwd, commonDir);
        if (existsSync(absCommonDir) && statSync(absCommonDir).isDirectory()) {
          root = dirname(absCommonDir);
        }
      }
    } catch (e) {
      // 静默 fallback：主仓库内执行或 git 异常
    }
    _mainRepoRootByCwd.set(this.cwd, root);
    return root;
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
        '\n请在主仓库根目录执行 execute。'
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
      // 目录在但 meta.json 不存在（幽灵状态）—— 删之前必须确认无未提交改动，
      // 否则会丢失 execute 期间未 commit 的代码（不可恢复，3.22.4 修复）。
      if (!this.getMeta(name)) {
        let uncommitted = '';
        try { uncommitted = git(worktreePath, 'status --porcelain') } catch {}
        if (uncommitted.trim()) {
          throw new Error(
            `检测到幽灵 worktree（无 meta.json）但含未提交改动，拒绝自动清理（防丢代码）。\n` +
            `  目录：${worktreePath}\n` +
            `  请先检查/commit/备份该目录，再手动清理：sillyspec worktree cleanup ${name} --force\n` +
            `  （未提交文件数：${uncommitted.trim().split('\n').length}）`
          );
        }
        console.log(`⚠️  检测到幽灵 worktree 目录（无 meta.json，无未提交改动），自动清理...`);
        try { rmSync(worktreePath, { recursive: true, force: true }); } catch {}
        // 同步清理 git worktree 注册 + 残留分支，否则目录虽删但 git 内部状态未清，
        // 后续 git worktree add 会因「worktree 已注册」或「分支已存在」失败
        try { gitQuiet(this.cwd, 'worktree prune'); } catch {}
        try { gitQuiet(this.cwd, `branch -D ${branch}`); } catch {}
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

    // 4.5 Windows 长路径支持：archive/ 下嵌套的 .runtime/artifacts 超长文件名（>260 字符）
    // 会让 worktree add 的 checkout 报 "Filename too long" 失败 → 降级 in-place 且主工作区
    // 未切分支，直接写代码污染 main（见缺陷 execute-in-place-windows-pitfalls 坑1）。
    // core.longpaths=true 让 git 用 \\?\ 前缀绕过 MAX_PATH，幂等、Windows 推荐、低风险，失败不阻断。
    if (process.platform === 'win32') {
      try { gitQuiet(this.cwd, 'config core.longpaths true'); } catch {}
    }

    // 5. 创建 worktree（含版本检测 + sandbox fallback）
    try {
      git(this.cwd, `worktree add ${worktreePath} -b ${branch} ${baseHash}`);
    } catch (e) {
      const check = isGitWorktreeSupported(this.cwd);
      if (!check.supported) {
        throw new Error(`git worktree add 失败: ${e.stderr || e.message}\n\n${check.reason ? `原因: ${check.reason}` : ''}\n建议: 升级 git 到 >= 2.15；或运行 \`sillyspec worktree doctor --fix\` 检查 worktree 状态。`);
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

    // 5.4b 立即写占位 meta（防 create 中断导致幽灵 worktree：目录在 + meta 没 →
    // 下次 create 误判幽灵强删）。后续 fetch/overlay/provision 步骤若抛错，占位
    // meta 让 getMeta 返回非 null，下次 create 走 "already exists" 分支（保护
    // worktree 内任何已写入的内容，不触发幽灵清理）。最终完整 meta 在 step 6 覆盖。
    try {
      const placeholderMeta = {
        name_zh: 'worktree 元数据',
      changeName: name,
        branch,
        baseBranch,
        baseHash,
        worktreePath,
        mode: 'worktree',
        createdAt: new Date().toISOString(),
        provisioning: true,
      };
      writeMetaAtomic(join(worktreePath, META_FILE), placeholderMeta);
    } catch (e) {
      // 占位 meta 是「防 create 中断 → 幽灵强删」的守卫。写失败不能静默：否则中断后
      // getMeta 仍返回 null，下次 create 会把含 gitignored 改动的 worktree 当幽灵删掉。
      console.warn(`⚠️  占位 meta 写入失败: ${e.message}（若 create 中断，下次可能误判幽灵 worktree）`);
    }

    // 5.5 base 同步检测（只读：不 ff、不改 HEAD；best-effort fetch 失败降级用缓存）。
    // 旧逻辑 fetch + merge --ff-only：分叉时 ff 失败被静默吞（syncStatus=failed），成功时
    // baseHash 锚点又不更新（ff 引入的 main 内容污染 apply patch）。现改为只检测 + 报告，
    // 不阻断 create，对齐 origin 的动作留给用户/agent。
    const syncDiagnostic = computeBaseSync(this.cwd, baseHash);
    printSyncReport(syncDiagnostic, baseHash, name);

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
      name_zh: 'worktree 元数据',
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
      syncDiagnostic,
      depsStatus: deps.depsStatus,
      depsMethod: deps.depsMethod || null,
      depsSource: deps.depsSource || null,
      depsLockHash: deps.depsLockHash || null,
      depsCheckedAt: deps.depsCheckedAt || null,
      ...(deps.depsError ? { depsError: deps.depsError } : {}),
    };

    const metaPath = join(worktreePath, META_FILE);
    writeMetaAtomic(metaPath, meta);

    return { branch, worktreePath, baseHash, mode: meta.mode, syncDiagnostic };
  }

  /**
   * native-worktree 模式下恢复 meta 引用
   * 当 meta.json 被损坏/误删时，只重建 meta 文件，不触碰文件系统（不 overlay）
   * @private
   */
  _recoverNativeWorktreeMeta(name, { worktreePath, branch }) {
    const baseHash = gitQuiet(worktreePath, 'rev-parse HEAD') || null
    const meta = {
      name_zh: 'worktree 元数据',
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
    writeMetaAtomic(join(metaDir, META_FILE), meta)
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

    // 供给 deps（与 native worktree 路径一致）。in-place-fallback 模式漏写 depsStatus 会致
    // enforceDepsGate（run.js）把 undefined 当 unknown 阻断 execute --done，死锁无法推进。
    // 见 docs/sillyspec/execute-inplace-deps-gate.md（2026-07-08 发现）。
    let deps = {}
    try {
      deps = provisionDeps(worktreePath, this.cwd, { specBase: join(this.cwd, '.sillyspec') }) || {}
    } catch (e) {
      deps = { depsStatus: 'failed', depsError: `provisionDeps crashed: ${e.message}` }
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
        name_zh: 'worktree 元数据',
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
        ...deps,
      }
      if (!existsSync(this.worktreeBase)) mkdirSync(this.worktreeBase, { recursive: true })
      const metaDir = join(this.worktreeBase, name)
      if (!existsSync(metaDir)) mkdirSync(metaDir, { recursive: true })
      writeMetaAtomic(join(metaDir, META_FILE), meta)
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
      name_zh: 'worktree 元数据',
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
      ...deps,
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
    writeMetaAtomic(metaPath, meta);

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
   * @returns {{ result: 'cleaned'|'force-cleaned'|'skipped'|'kept'|'partial', mode: string|null, details: string[], residual: string[] }}
   *   result 取值：cleaned=git remove 成功；force-cleaned=git remove 失败但 fallback 清理完成；
   *   partial=有残留（目录/meta/git 注册未清）；skipped=无需清理；kept=native-worktree 保留。
   *   residual：未清干净的路径/引用列表（空数组表示干净）。
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
    // in-place 模式：worktreePath === 主工作区，绝对禁止删除目录本身，但 meta 目录仍应清理
    // （否则永久残留）。native-worktree：外部隔离环境，整体跳过。
    const isInPlace = mode === 'in-place-fallback';

    // 安全检查：native-worktree 是外部隔离环境，非 force 不碰
    if (!force && mode === 'native-worktree') {
      return { result: 'kept', mode, details: ['native-worktree: 外部隔离环境，跳过清理'], residual: [] };
    }

    const branch = (meta && meta.branch) || BRANCH_PREFIX + name;

    // Windows 保护：先解链接 worktree/node_modules（junction 指向主 checkout），
    // 否则后续 git worktree remove / rmSync recursive 会跟随 junction 误删主 node_modules 内容。
    if (!isInPlace && existsSync(worktreePath)) {
      const wtNodeModules = join(worktreePath, 'node_modules');
      if (existsSync(wtNodeModules)) {
        let isLink = false;
        try { isLink = lstatSync(wtNodeModules).isSymbolicLink(); } catch {}
        if (isLink) {
          try {
            if (process.platform === 'win32') {
              // Windows rmdir 删 junction（reparse point）不跟随目标，保护主 checkout
              execSync(`rmdir "${wtNodeModules}"`, { shell: 'cmd.exe' });
            } else {
              unlinkSync(wtNodeModules);
            }
            details.push('worktree node_modules junction/symlink removed (protect main checkout)');
          } catch (e) {
            details.push(`node_modules link remove failed: ${e.message}`);
          }
        }
      }
    }

    // 1. git worktree remove（带 retry）—— in-place 跳过：无 git worktree 注册，且 worktreePath 即主工作区
    let gitRemoveOk = false;
    if (!isInPlace && existsSync(worktreePath)) {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          git(this.cwd, `worktree remove ${worktreePath} --force`);
          gitRemoveOk = true;
          details.push(`git worktree remove succeeded (attempt ${attempt})`);
          break;
        } catch (e) {
          details.push(`git worktree remove attempt ${attempt}/${maxRetries} failed: ${e.message}`);
          if (attempt < maxRetries) {
            // 短暂等待后重试（跨平台 busy-wait，见 sleepMs）
            sleepMs(500);
          }
        }
      }
    }

    // 2. fallback: 确保 worktree 目录已删除（in-place 跳过——worktreePath 是主工作区）
    if (!isInPlace && existsSync(worktreePath)) {
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

    // 5. 清除 meta 目录（in-place 模式也执行——这是 in-place meta 残留的修复点）
    if (existsSync(metaDir)) {
      try {
        rmSync(metaDir, { recursive: true, force: true });
        details.push('meta directory cleaned');
      } catch (e) {
        details.push(`meta directory cleanup failed: ${e.message}`);
      }
    }

    // 6. 最终验证：确认清理完成（in-place 模式 worktreePath=主工作区，不纳入残留检查）
    const residual = [];
    if (!isInPlace && existsSync(worktreePath)) residual.push(`worktree dir: ${worktreePath}`);
    if (existsSync(metaDir)) residual.push(`meta dir: ${metaDir}`);
    if (!isInPlace && gitQuiet(this.cwd, `worktree list`)?.includes(worktreePath)) {
      residual.push('git worktree list still references this worktree');
    }
    if (residual.length > 0) {
      details.push(`⚠️ 残留: ${residual.join('; ')}`);
    }

    // result：有残留→partial；in-place（无隔离目录可删，只清了 meta）→cleaned；否则按 git remove 成败
    let result;
    if (residual.length > 0) {
      result = 'partial';
    } else if (isInPlace) {
      result = 'cleaned';
    } else {
      result = gitRemoveOk ? 'cleaned' : 'force-cleaned';
    }
    return { result, mode, details, residual };
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
  /**
   * doctor --fix 的依赖重供给：先解 worktree/node_modules junction（保护主仓 node_modules），
   * 再 provisionDeps(force:true) 强制走 install 分支重装。
   *
   * Windows 保护（与 cleanup 722-743 同源坑）：不解链直接 install 会经 junction 误改主仓
   * node_modules 内容。in-place-fallback 无独立 node_modules（worktreePath 即主仓），跳过解链，
   * 仅 install。force=true 绕过 provisionDeps 的 lockfile 一致快路径，确保真重装而非幂等 linked。
   *
   * @param {string} name - changeName
   * @param {string} wtPath - worktree 根目录（meta.worktreePath）
   * @returns {{ ok: boolean, msg: string }}
   */
  _doctorReprovision(name, wtPath) {
    try {
      const meta = this.getMeta(name) || {};
      const isInPlace = meta.mode === 'in-place-fallback';
      // 先解 junction（非 in-place）：lstatSync 判 link → Windows rmdir junction / Unix unlinkSync
      if (!isInPlace && existsSync(wtPath)) {
        const wtNodeModules = join(wtPath, 'node_modules');
        if (existsSync(wtNodeModules)) {
          let isLink = false;
          try { isLink = lstatSync(wtNodeModules).isSymbolicLink(); } catch {}
          if (isLink) {
            try {
              if (process.platform === 'win32') {
                execSync(`rmdir "${wtNodeModules}"`, { shell: 'cmd.exe' });
              } else {
                unlinkSync(wtNodeModules);
              }
            } catch {} // 解链失败不阻断：交由 provisionDeps install 分支处理
          }
        }
      }
      const deps = provisionDeps(wtPath, this.cwd, {
        specBase: join(this.cwd, '.sillyspec'),
        force: true,
      }) || {};
      const metaPath = join(this.getWorktreePath(name), META_FILE);
      // 成功重供时清掉旧 depsError（provisionDeps 成功结果不含该键，{...meta,...deps} 会残留旧值）
      const merged = { ...meta, ...deps };
      if (deps.depsStatus !== 'failed') delete merged.depsError;
      writeMetaAtomic(metaPath, merged);
      return { ok: true, msg: `re-provisioned ${name}: depsStatus=${deps.depsStatus}` };
    } catch (e) {
      return { ok: false, msg: `re-provision failed for ${name}: ${e.message}` };
    }
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
   * - deps 依赖状态（failed/missing/stale/main-drift，复用 checkDepsFreshness 统一判定）
   *
   * @param {{ fix?: boolean, staleHours?: number, changeName?: string|null }} opts
   *   - changeName：非 null 时仅扫描该 change（deps/ghost/stale/orphan-git/orphan-branch 全部按 changeName 过滤）；
   *     不传则全量扫（兼容现有行为）。
   * @returns {{ issues: Array<{ type: string, name: string, detail: string, fixable: boolean }>, fixed: string[], unfixable: string[] }}
   */
  doctor({ fix = false, staleHours = 24, changeName = null } = {}) {
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
        // git 2.20+ porcelain 在目录缺失时输出 `missing` 行；作为 existsSync 的权威交叉验证
        const missing = lines.some(l => l === 'missing');
        if (wtPath && wtPath !== this.cwd) { // 排除主工作区
          gitWorktreeList.push({ path: wtPath, missing, raw: entry });
        }
      }
    } catch {
      // git worktree 不可用，跳过
    }

    // 2. 列出 SillySpec meta 条目
    const metaEntries = this.list();
    const metaNames = new Set(metaEntries.map(m => m.changeName));

    // 3. 检查 git worktree list 中的孤儿条目
    // ⚠️ 只在 git 自己标记 missing 时自动 prune。目录不可见但 git 未标记 missing 的
    // 情况（平台模式/容器路径不一致、符号链接、Windows 路径格式、旧 git 无 missing 标记）
    // 只告警不自动 prune —— existsSync 在这些场景会误判，自动 prune 会杀死实际在用的
    // worktree（sillyspec-worktree-platform-mode-bug）。git 内部状态是 worktree 生命周期的
    // 权威来源，用它做 prune 前提可杜绝误杀。
    for (const wt of gitWorktreeList) {
      if (!existsSync(wt.path)) {
        const name = this._pathToChangeName(wt.path);
        if (changeName && name !== changeName) continue; // --change 过滤：仅扫指定 change
        if (wt.missing === true) {
          // git 明确标记目录缺失（git 2.20+）→ 真 orphan，prune 安全
          issues.push({ type: 'orphan-git-entry', name: name || wt.path, detail: `git worktree 标记 missing: ${wt.path}`, fixable: true });
          if (fix) {
            try { gitQuiet(this.cwd, 'worktree prune'); fixed.push(`pruned orphan: ${wt.path}`); } catch { unfixable.push(`prune failed for: ${wt.path}`); }
          }
        } else {
          // 目录不可见但 git 未标记 missing → 可能 existsSync 误判，保守不自动 prune
          issues.push({ type: 'orphan-git-entry', name: name || wt.path,
            detail: `git worktree 引用 ${wt.path} 目录不可见但 git 未标记 missing——可能路径/权限导致误判，未自动 prune（避免误杀在用的 worktree）。确认废弃后手动: git worktree prune`,
            fixable: false });
        }
      }
    }

    // 4. 扫描 worktreeBase 目录，检查幽灵目录和孤儿 meta
    if (existsSync(this.worktreeBase)) {
      const entries = readdirSync(this.worktreeBase, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const name = entry.name;
        if (changeName && name !== changeName) continue; // --change 过滤：仅扫指定 change
        const dirPath = join(this.worktreeBase, name);
        const hasMeta = existsSync(join(dirPath, META_FILE));
        const meta = hasMeta ? this.getMeta(name) : null;

        // deps 依赖状态检查（change 2026-06-28-worktree-deps-provision / 2026-08-05-tooling-feedback-fixes）
        // 复用 checkDepsFreshness（H1，worktree-deps.js），优先级 failed→missing→stale→main-drift→fresh。
        // 放宽原 909 in-place-fallback 守卫：in-place 也跑（main-drift/stale/failed 对它同样有意义，
        // 真 in-place 的 wtPath===主仓→wtHash===mainHash→不会误报 main-drift，仅 failed/stale 有意义）。
        // fix 时 _doctorReprovision 自行判断是否解链（in-place 不解链，仅 install）。
        if (meta && meta.worktreePath && existsSync(meta.worktreePath)) {
          const wtPath = meta.worktreePath;
          const fresh = checkDepsFreshness(meta, wtPath, this.cwd);
          const issueTypeByStatus = {
            failed: 'deps-failed',
            missing: 'deps-missing',
            stale: 'deps-stale',
            'main-drift': 'deps-main-drift',
          };
          const issueType = issueTypeByStatus[fresh.status] || null;
          if (issueType) {
            issues.push({ type: issueType, name, detail: fresh.detail, fixable: true });
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
          const staleFixable = meta.mode !== 'native-worktree';
          if (ageHours > staleHours) {
            issues.push({ type: 'stale', name, detail: `worktree 已存在 ${Math.round(ageHours)} 小时（超过 ${staleHours}h 阈值）${staleFixable ? '' : '（native-worktree 外部环境，不可自动清理）'}`, fixable: staleFixable });
            if (fix && staleFixable) {
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
          if (changeName && name !== changeName) continue; // --change 过滤：仅扫指定 change
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
   * 检查 worktree 是否有尚未落到主工作区的交付变更。
   *
   * 语义：worktree 相对 baseline 的交付变更（tracked + untracked，排除 .sillyspec//meta.json）里，
   * 哪些还没 byte-identical 出现在主工作区 HEAD。全部已在 main HEAD（含 cherry-pick/rebase/merge/apply
   * 落地）→ hasChanges:false（调用方可安全 cleanup）；否则 hasChanges:true（保留 worktree）。
   * 检测失败/拿不准 → 保守 hasChanges:true（防误删未落代码）。
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
    // native-worktree 是用户外部隔离环境，不纳入"未应用"判定（与 execute 完成路径一致）
    if (meta.mode === 'native-worktree') {
      return { hasChanges: false, changedFiles: [], reason: 'native-worktree (external)' };
    }

    const diffBase = meta.baselineCommit || meta.baseHash;
    if (!diffBase) {
      return { hasChanges: false, changedFiles: [], reason: 'no diff base' };
    }

    const isDeliverable = f => f && !f.startsWith('.sillyspec/') && f !== 'meta.json';
    try {
      // 1) 候选交付变更（worktree 工作区相对 diffBase）。--no-renames：rename 退化成 D+A，两侧文件都进集
      const tracked = (gitQuiet(worktreePath, `diff --no-renames --name-only ${diffBase}`) || '')
        .split('\n').filter(Boolean).filter(isDeliverable);
      const untracked = (gitQuiet(worktreePath, `ls-files --others --exclude-standard`) || '')
        .split('\n').filter(Boolean).filter(isDeliverable);

      if (tracked.length === 0 && untracked.length === 0) {
        return { hasChanges: false, changedFiles: [], reason: 'no changes in worktree' };
      }

      // 2) 候选集中尚未落到主工作区 HEAD 的子集
      const pending = this._changesAlreadyOnMain(worktreePath, tracked, untracked);
      if (pending.length === 0) {
        return { hasChanges: false, changedFiles: [], reason: 'all changes already on main HEAD' };
      }
      return { hasChanges: true, changedFiles: pending };
    } catch (e) {
      // 检测失败时保守处理：视为有变更，保留 worktree
      return { hasChanges: true, changedFiles: [], reason: `check failed: ${e.message}` };
    }
  }

  /**
   * 判定候选变更里哪些还没到主工作区 HEAD。
   * - tracked：`git -C worktree diff --no-renames --name-only <mainHead> -- <files>`，
   *   比较 worktree 工作区（含未提交）vs main HEAD，限定到候选集；空 = 已在 main HEAD。
   * - untracked：worktree `hash-object`（默认带 filter，与 tree blob 同口径）vs main `ls-tree HEAD` blob；
   *   不等 = 该新文件未在 main HEAD。HEAD-only，不查 main 工作区未提交副本（防误删）。
   * 三种 mode 共享主 repo 对象库，mainHead 可在 worktree cwd 解析。
   * @private
   * @param {string} worktreePath
   * @param {string[]} trackedFiles
   * @param {string[]} untrackedFiles
   * @returns {string[]} 尚未落到 main HEAD 的文件
   */
  _changesAlreadyOnMain(worktreePath, trackedFiles, untrackedFiles) {
    const mainHead = git(this.cwd, 'rev-parse HEAD'); // 失败即抛 → 外层 catch fail-safe
    const pending = [];

    if (trackedFiles.length > 0) {
      const diverged = (gitQuiet(worktreePath,
        `diff --no-renames --name-only ${mainHead} -- ${trackedFiles.join(' ')}`) || '')
        .split('\n').filter(Boolean);
      pending.push(...diverged);
    }

    if (untrackedFiles.length > 0) {
      // hash-object 按 argv 顺序逐行输出 blob hash；某文件不存在则整命令失败 → gitQuiet 返回 null
      const wtHashes = (gitQuiet(worktreePath, `hash-object -- ${untrackedFiles.join(' ')}`) || '')
        .split('\n');
      const mainBlobs = this._lsTreeBlobs(this.cwd, 'HEAD', untrackedFiles);
      for (let i = 0; i < untrackedFiles.length; i++) {
        // wtHashes[i] 缺失（命令失败/行数不齐）→ 视为未应用，保守保留
        if (wtHashes[i] !== (mainBlobs.get(untrackedFiles[i]) ?? null)) {
          pending.push(untrackedFiles[i]);
        }
      }
    }

    return [...new Set(pending)];
  }

  /**
   * 一次 `git ls-tree <treeish> -- <files>` → Map<path, blobHash>（仅 tree 中存在者）。
   * 与 worktree-apply.js 的 getBlobHashMap 同逻辑；此处内联私有，避免反向 import 循环依赖。
   * @private
   * @param {string} cwd
   * @param {string} treeish
   * @param {string[]} files
   * @returns {Map<string, string>}
   */
  _lsTreeBlobs(cwd, treeish, files) {
    const map = new Map();
    if (!files || files.length === 0) return map; // 空 pathspec 会列整棵树，必须拦
    const raw = gitQuiet(cwd, `ls-tree ${treeish} -- ${files.join(' ')}`);
    if (!raw) return map;
    for (const line of raw.split('\n')) {
      if (!line) continue;
      const tab = line.indexOf('\t');
      if (tab === -1) continue;
      const hash = line.slice(0, tab).split(' ')[2]; // "<mode> <type> <hash>"
      if (hash) map.set(line.slice(tab + 1), hash);
    }
    return map;
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

      // untracked 文件（排除 .sillyspec/.runtime 等）；目录跳过避免 readFileSync EISDIR
      const untracked = gitQuiet(mainCwd, 'ls-files --others --exclude-standard') || '';
      const skippedDirs = [];
      if (untracked) {
        for (const f of untracked.split('\n').filter(Boolean)) {
          const r = copyUntrackedEntry(join(mainCwd, f), join(worktreePath, f));
          if (r.status === 'copied') files.push(f);
          else if (r.status === 'skipped-dir') skippedDirs.push(f);
          else if (r.status === 'error') errors.push(`untracked ${f}: ${r.error}`);
        }
      }
      if (skippedDirs.length > 0) {
        console.log(`ℹ️  baseline overlay 跳过 ${skippedDirs.length} 个 untracked 目录（不读目录避免 EISDIR，坑 execute-worktree-overlay-untracked-dir-eisdir）`);
      }

      if (files.length > 0) {
        console.log(`📁 baseline overlay: ${files.length} 个未提交文件已同步到 worktree`);
        // 非阻断 advisory（治「已做完没提交」被裹进 execute 交付）：这批未提交改动会单独 commit
        // 成 baseline checkpoint（git 历史与本阶段新改动分层，可分开验收），但 apply 回 main 时会
        // 随本阶段交付落地。若它们是独立变更、需要独立验收，先提交到独立分支另行处理——
        // 注意不能在 main 直接 commit（那等于无验收并入主干、污染 main，正是坑1 形态）。
        // sillyspec 只做确定性提示（改动是事实），该不该拆分属意图判定，留给 agent/用户。
        console.log(`    ℹ️  它们将作为独立 baseline checkpoint 提交到 worktree 分支（与本阶段新改动分层、可分开验收），`);
        console.log(`       但 apply 回 main 会随本阶段交付。若是独立变更、需独立验收：先提交到独立分支另行处理`);
        console.log(`       （不要在 main 直接 commit——那等于无验收并入主干、污染 main），再回到本变更跑 execute。`);
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
      // --no-verify：baseline 是锚点不是交付物，只是把主仓库 dirty 文件快照到 worktree
      // 分支上以便区分「前置 baseline」与「子代理新增改动」。它不该触发项目 pre-commit
      // hook（如 ruff format），否则主仓库 dirty 文件中任一不达标的会被 hook reformat
      // 致 commit 失败 → worktree 创建失败 → execute 无法启动。
      execSync(
        `git commit --no-verify -m "sillyspec: baseline checkpoint for ${changeName}"`,
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
