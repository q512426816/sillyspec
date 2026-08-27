/**
 * worktree-cross.js — 跨仓仓 worktree 隔离（坑 cross-repo-no-worktree-isolation，2026-08-27 用户实证）。
 *
 * 背景：跨仓 task 的原设计（multi-repo W1 D-005/D-006/D-009）是子代理直写跨仓仓主工作副本、
 * commit 直落该仓主干，apply 对跨仓 no-op。实战暴露三类事故面：
 *   1. 并行混流：跨仓主工作副本常有用户/其他变更的在途改动，子代理产物与之混在同一工作区，
 *      无法区分归属、无法整体回滚（实证：sub-grid-security 主工作副本 task-05 产物与
 *      .gitignore/.webpackrc.js/yarn.lock 并行改动混流，无法核对）；
 *   2. 无 base 锚：跨仓仓无 meta/baseHash，base 只能靠 task 卡 base_commit 锡点；
 *   3. 误伤面大：子代理在主工作副本可误改/误删用户未提交文件，无护栏。
 *
 * 本模块把跨仓仓纳入与主仓同构的 worktree 隔离（D-009 就地翻新，向后兼容）：
 *   - worktree 落位 <主仓 specBase>/.runtime/worktrees/<change>--<repoKey>：主仓侧该目录已被
 *     .gitignore 覆盖（主仓 create 已强制检查），不要求跨仓仓自配 .gitignore；git worktree
 *     的注册信息在跨仓 .git/worktrees/，目录本身可在仓外任意路径；
 *   - meta.json 与主仓同 schema + repoKey/crossRepoRoot/isCross 标识（唯一写入方 = 本模块，
 *     multi-repo-context.js 只读且路径公式与此处 crossWorktreePath 保持同步）；
 *   - base 锚 meta.baseHash（跨仓仓 HEAD 快照）；dirty baseline overlay 沿用主仓同款
 *     （跨仓主工作副本的在途改动进 baseline，不算交付 diff，apply 不覆盖它们）；
 *   - deps 供给 provisionDeps(worktree, 跨仓根, {specBase:null})——sniff worktree 自身项目
 *     类型（package.json→nodejs 链主工作副本 node_modules；不沿用主仓 local.yaml 的
 *     project.type，主仓与跨仓类型常不同，如实测 maven 主仓 + nodejs 前端仓）；
 *   - cleanup：解链 node_modules junction → git worktree remove --force → 保留分支
 *     sillyspec/<change> 作 review 锚点（对齐主仓 cleanup 的分支保护哲学）。
 *
 * 兼容：无跨仓 worktree meta 的旧变更（legacy 直写主干模式）各链路继续走原路径，零回归。
 */

import { existsSync, readFileSync, readdirSync, mkdirSync } from 'fs';
import { join } from 'path';
import { git, gitQuiet } from './git-helper.js';
import { writeAtomicSync } from './fs-atomic.js';
import { WorktreeManager, unlinkNodeModulesLinks, safeRemoveWorktreeDir } from './worktree.js';
import { provisionDeps } from './worktree-deps.js';
import { aggregateDeclaredRepos } from './run/shared.js';
import { parseRepoRegistry } from './stages/plan-postcheck.js';

const META_FILE = 'meta.json';
const BRANCH_PREFIX = 'sillyspec/';

/**
 * 跨仓 worktree 路径（唯一路径公式；multi-repo-context.js 的 meta 只读逻辑与此同步）。
 * @param {string} specBase 主仓 spec 根（<主仓>/.sillyspec）
 * @param {string} changeName 变更名
 * @param {string} repoKey 跨仓 repo 键（local.yaml repos: 段的 key）
 */
export function crossWorktreePath(specBase, changeName, repoKey) {
  return join(specBase, '.runtime', 'worktrees', `${changeName}--${repoKey}`);
}

/**
 * 读跨仓 worktree meta（不存在/损坏返 null = legacy 直写模式）。
 * @returns {object|null}
 */
export function getCrossWorktreeMeta(specBase, changeName, repoKey) {
  const metaPath = join(crossWorktreePath(specBase, changeName, repoKey), META_FILE);
  if (!existsSync(metaPath)) return null;
  try {
    return JSON.parse(readFileSync(metaPath, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * 列出某变更已建的全部跨仓 worktree meta（扫描 worktrees 目录下 `<change>--*` 且 isCross 的 meta）。
 * @returns {Array<{repoKey: string, meta: object}>}
 */
export function listCrossWorktreeMetas(specBase, changeName) {
  const base = join(specBase, '.runtime', 'worktrees');
  if (!existsSync(base)) return [];
  const out = [];
  for (const name of readdirSync(base)) {
    if (!name.startsWith(`${changeName}--`)) continue;
    const metaPath = join(base, name, META_FILE);
    if (!existsSync(metaPath)) continue;
    try {
      const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
      if (meta && meta.isCross && meta.repoKey) out.push({ repoKey: meta.repoKey, meta });
    } catch { /* 损坏 meta 跳过（cleanup 阶段仍按目录处理） */ }
  }
  return out;
}

/**
 * 聚合声明跨仓 key（plan.md 内联卡片 + tasks/ 独立卡片双源，与 shared.js getOrCreateMultiRepoContext 同口径）。
 * @param {string} specBase
 * @param {string} changeName
 * @returns {string[]} 除 'main' 外的跨仓 key（未注册/配置错由 MultiRepoContext fail-closed，此处只聚合）
 */
function aggregateCrossRepoKeys(specBase, changeName) {
  const planFile = join(specBase, 'changes', changeName, 'plan.md');
  let planContent = '';
  if (existsSync(planFile)) {
    try { planContent = readFileSync(planFile, 'utf8') } catch { planContent = '' }
  }
  // tasks/ 独立卡片兜底（与 run/shared.js collectTaskCardReposFallback 同口径，该函数未导出）
  const tasksDir = join(specBase, 'changes', changeName, 'tasks');
  if (existsSync(tasksDir)) {
    for (const f of readdirSync(tasksDir)) {
      if (!/^task-\d+\.md$/i.test(f)) continue;
      try { planContent += '\n' + readFileSync(join(tasksDir, f), 'utf8') + '\n' } catch { /* 兜底源不阻断 */ }
    }
  }
  return aggregateDeclaredRepos(planContent).filter(k => k !== 'main');
}

/**
 * 读主仓 local.yaml 的 repos: 段（路径口径与 run/shared.js readLocalYamlRaw 一致：cwd/.sillyspec/local.yaml）。
 * @returns {Map<string,string>}
 */
function readRepoRegistry(cwd) {
  const p = join(cwd, '.sillyspec', 'local.yaml');
  let text = '';
  if (existsSync(p)) {
    try { text = readFileSync(p, 'utf8') } catch { text = '' }
  }
  return parseRepoRegistry(text);
}

/**
 * execute 启动时为每个声明的跨仓仓建 worktree（幂等：meta 在即复用）。
 *
 * 失败语义 fail-closed（对齐主仓 create：隔离建不起来就不该开工）：任何仓创建失败 → 抛错，
 * 由调用方（run/stage.js execute 启动）exit(1) 并给修复指引。已建成功的仓保留（重跑幂等复用）。
 *
 * @param {{ cwd: string, changeName: string, specBase?: string }} opts
 * @returns {{ created: Array<{repoKey,worktreePath}>, reused: Array<{repoKey,worktreePath}>, skippedLegacy: string[] }}
 * @throws {Error} 跨仓仓未注册 / git 不可达 / worktree add 失败 / 分支冲突
 */
export function ensureCrossWorktrees({ cwd, changeName, specBase }) {
  const base = specBase || join(cwd, '.sillyspec');
  const keys = aggregateCrossRepoKeys(base, changeName);
  const registry = readRepoRegistry(cwd);
  const created = [];
  const reused = [];
  const skippedLegacy = [];

  for (const key of keys) {
    const repoRoot = registry.get(key);
    if (!repoRoot) {
      // 与 MultiRepoContext 约束②同语义：声明的 repo 必须已注册，配置错不降级
      throw new Error(
        `跨仓 repo "${key}" 未在 local.yaml repos: 段注册。` +
        `一键注册：sillyspec local register-repo ${key} <${key} 仓根路径>（勿手编 YAML），补注册后重跑 execute。`
      );
    }
    const existing = getCrossWorktreeMeta(base, changeName, key);
    if (existing && existing.worktreePath && existsSync(existing.worktreePath)) {
      reused.push({ repoKey: key, worktreePath: existing.worktreePath });
      continue;
    }
    // meta 在但目录没了（外部误删）：走重建（下方 git worktree add 会因注册残留失败，
    // 先 prune 掉悬空注册再建——目录不在则 prune 无损）
    if (existing) {
      try { gitQuiet(repoRoot, ['worktree', 'prune'], { timeout: 30000 }) } catch {}
    }

    const worktreePath = crossWorktreePath(base, changeName, key);
    const branch = BRANCH_PREFIX + changeName;

    // base 快照：跨仓仓当前 HEAD（与主仓 create 的默认 base 语义一致）
    let baseHash;
    try {
      baseHash = git(repoRoot, ['rev-parse', 'HEAD']);
    } catch (e) {
      throw new Error(`跨仓 repo "${key}"（${repoRoot}）git 不可达（rev-parse HEAD 失败：${e.message}）。请检查 local.yaml repos: 段路径。`);
    }
    const branchExists = !!gitQuiet(repoRoot, ['rev-parse', '--verify', `refs/heads/${branch}`]);
    if (branchExists) {
      throw new Error(
        `跨仓仓 ${key} 已有分支 ${branch}（疑似上次 execute 残留）。三选一：\n` +
        `  ① 确认残留作废：git -C ${repoRoot} branch -D ${branch} 后重跑；\n` +
        `  ② 分支内容已 apply 落地或不再需要：sillyspec worktree cleanup ${changeName} --force（跨仓 worktree 一并清理后重跑）；\n` +
        `  ③ 换变更名重跑。`
      );
    }
    mkdirSync(join(base, '.runtime', 'worktrees'), { recursive: true });
    try {
      git(repoRoot, ['worktree', 'add', worktreePath, '-b', branch, baseHash], { timeout: 120000 });
    } catch (e) {
      throw new Error(`跨仓仓 ${key} worktree 创建失败（${worktreePath}）：${e.stderr || e.message}`);
    }

    const meta = {
      name_zh: 'worktree 元数据',
      changeName,
      repoKey: key,
      crossRepoRoot: repoRoot,
      isCross: true,
      branch,
      baseBranch: gitQuiet(repoRoot, ['symbolic-ref', '--short', 'HEAD']) || 'HEAD',
      baseHash,
      actualBaseHash: gitQuiet(worktreePath, ['rev-parse', 'HEAD']) || baseHash,
      createdAt: new Date().toISOString(),
      worktreePath,
      mode: 'worktree',
    };
    writeAtomicSync(join(worktreePath, META_FILE), JSON.stringify(meta, null, 2) + '\n');

    // dirty baseline overlay：跨仓主工作副本在途改动 → worktree baseline（借主仓同款实现，
    // 只用其参数化逻辑，不用实例路径状态）
    try {
      const wmHelper = new WorktreeManager({ cwd: repoRoot });
      const baselineResult = wmHelper._overlayBaseline(repoRoot, worktreePath);
      meta.baselineFiles = baselineResult.files;
      meta.baselineHash = baselineResult.baselineHash;
      if (baselineResult.files.length > 0) {
        meta.baselineCommit = wmHelper._createBaselineCheckpoint(worktreePath, `${changeName}--${key}`, baselineResult.files);
      }
      if (baselineResult.errors && baselineResult.errors.length > 0) {
        console.warn(`⚠️ 跨仓 ${key} baseline overlay 部分失败（${baselineResult.errors.join('; ')}）——在途改动未全量进 baseline，apply 前请人工核对跨仓主工作副本`);
      }
      writeAtomicSync(join(worktreePath, META_FILE), JSON.stringify(meta, null, 2) + '\n');
    } catch (e) {
      console.warn(`⚠️ 跨仓 ${key} baseline overlay 失败（${e.message}）——跨仓主工作副本如有在途改动，worktree 不含它们`);
    }

    // deps 供给：specBase 传 null —— sniff worktree 自身（主仓 local.yaml 的 project.type/install
    // 描述的是主仓，跨仓仓类型常不同，如实测 maven 主仓 + nodejs 前端仓，沿用会把 mvn 命令
    // 打到前端仓上）。失败不阻断（与主仓 create 同语义，doctor --fix 可修）
    try {
      const deps = provisionDeps(worktreePath, repoRoot, { specBase: null }) || {};
      Object.assign(meta, {
        depsStatus: deps.depsStatus,
        depsMethod: deps.depsMethod || null,
        depsSource: deps.depsSource || null,
        depsLockHash: deps.depsLockHash || null,
        depsCheckedAt: deps.depsCheckedAt || null,
        ...(deps.depsError ? { depsError: deps.depsError } : {}),
      });
      writeAtomicSync(join(worktreePath, META_FILE), JSON.stringify(meta, null, 2) + '\n');
    } catch (e) {
      meta.depsStatus = 'failed';
      meta.depsError = `provisionDeps crashed: ${e.message}`;
      writeAtomicSync(join(worktreePath, META_FILE), JSON.stringify(meta, null, 2) + '\n');
    }

    created.push({ repoKey: key, worktreePath });
  }
  return { created, reused, skippedLegacy };
}

/**
 * 清理某变更的全部跨仓 worktree（幂等）。
 *
 * 顺序对齐主仓 cleanup 的 Windows 防护：先解 node_modules junction（裸删会穿透删跨仓主工作
 * 副本的 node_modules），再 git worktree remove --force，最后**保留分支** sillyspec/<change>
 * 作 review 锚点（分支删除在主仓侧有 review 锚点 + 双保护，跨仓侧 v1 保守不删，残 branch
 * 可人工清理）。目录残留（remove 失败）走 safeRemoveWorktreeDir 兜底 + residual 上报。
 *
 * @param {{ cwd: string, changeName: string, specBase?: string, force?: boolean }} opts
 * @returns {{ results: Array<{repoKey, result: 'cleaned'|'skipped'|'partial', details: string[], residual: string[]}> }}
 */
export function cleanupCrossWorktrees({ cwd, changeName, specBase, force = false }) {
  const base = specBase || join(cwd, '.sillyspec');
  const results = [];
  for (const { repoKey, meta } of listCrossWorktreeMetas(base, changeName)) {
    const details = [];
    const residual = [];
    const repoRoot = meta.crossRepoRoot;
    const wtPath = meta.worktreePath || crossWorktreePath(base, changeName, repoKey);
    if (!existsSync(wtPath)) {
      try { if (repoRoot) gitQuiet(repoRoot, ['worktree', 'prune'], { timeout: 30000 }) } catch {}
      results.push({ repoKey, result: 'skipped', details: ['目录不存在（已清理）'], residual });
      continue;
    }
    if (!force) {
      // fail-closed：worktree 内还有未落地交付（相对 baseHash 有 diff）时拒绝清理（对齐主仓
      // hasUnappliedChanges 哲学；跨仓侧以「分支上有交付 diff 且未 apply」近似）
      try {
        const diff = gitQuiet(wtPath, ['diff', '--name-only', meta.baseHash]) || '';
        const untracked = gitQuiet(wtPath, ['ls-files', '--others', '--exclude-standard']) || '';
        if (diff.trim() || untracked.trim()) {
          results.push({ repoKey, result: 'partial', details: [`blocked: 跨仓 worktree 有未 apply 的交付改动（git diff ${String(meta.baseHash).slice(0, 8)} 非空）——先 apply 或显式 --force`], residual: [wtPath] });
          continue;
        }
      } catch (e) {
        details.push(`未落地检测失败（${e.message}），按 force 处理`);
      }
    }
    try { unlinkNodeModulesLinks(wtPath, meta, details) } catch (e) { details.push(`junction 解链失败: ${e.message}`) }
    try {
      git(repoRoot, ['worktree', 'remove', '--force', wtPath], { timeout: 60000 });
    } catch {
      // remove 失败（脏文件/锁）：解链后安全删目录 + prune 注册
      try { safeRemoveWorktreeDir(wtPath, meta) } catch (e) { residual.push(`目录残留 ${wtPath}: ${e.message}`) }
      try { gitQuiet(repoRoot, ['worktree', 'prune'], { timeout: 30000 }) } catch { residual.push(`git worktree prune 失败（${repoRoot}）`) }
    }
    details.push(`分支 ${meta.branch} 保留作 review 锚点（确认无需回溯后可 git -C ${repoRoot} branch -D ${meta.branch}）`);
    results.push({ repoKey, result: residual.length > 0 ? 'partial' : 'cleaned', details, residual });
  }
  return { results };
}
