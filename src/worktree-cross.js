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
import { join, dirname, resolve as resolvePath, isAbsolute, relative as relativePath } from 'path';
import { git, gitQuiet } from './git-helper.js';
import { writeAtomicSync } from './fs-atomic.js';
import { WorktreeManager, unlinkNodeModulesLinks, safeRemoveWorktreeDir } from './worktree.js';
import { provisionDeps } from './worktree-deps.js';
import { aggregateDeclaredRepos } from './run/shared.js';
import { parseRepoRegistry, parseRepoWorktreePlacements } from './stages/plan-postcheck.js';
import {
  crossWorktreePath as _placementCrossPath,
  crossWorktreeDirName,
  resolveCrossWorktreePath,
  resolveCrossWorktreePathCandidates,
  readCrossPlacementConfig,
  resolvePlacementRoot,
  readPlacementRegistry,
  updatePlacementRegistry,
  removePlacementRegistryEntry,
  sweepPlacementRegistry,
  isWslSplit,
} from './cross-placement.js';

const META_FILE = 'meta.json';
const BRANCH_PREFIX = 'sillyspec/';

/**
 * 跨仓 worktree 路径（唯一路径公式；实现已下沉 cross-placement 叶子模块——multi-repo-context.js
 * 经该叶子模块共用，不再与 worktree-cross 经 run/shared 成环）。
 * placementRoot 可选（坑 cross-wt-toolchain-split 落位配置）：给定时时 <placementRoot>/<change>--<repoKey>。
 * @param {string} specBase 主仓 spec 根（<主仓>/.sillyspec）
 * @param {string} changeName 变更名
 * @param {string} repoKey 跨仓 repo 键（local.yaml repos: 段的 key）
 * @param {string|null} [placementRoot] 自定义落位根（null/缺省走默认公式——三参调用零回归）
 */
export function crossWorktreePath(specBase, changeName, repoKey, placementRoot = null) {
  return _placementCrossPath(specBase, changeName, repoKey, placementRoot);
}

/**
 * 读跨仓 worktree meta（不存在/损坏返 null = legacy 直写模式）。
 * 寻址经 resolveCrossWorktreePath（注册表优先、公式兜底）——worktree 挪到 crossPlacement
 * 自定义落位后 meta 仍可达（坑 cross-wt-toolchain-split）。
 * @returns {object|null}
 */
export function getCrossWorktreeMeta(specBase, changeName, repoKey) {
  // repoRoot 从 repos 注册表解析（无 repoKey 注册/解析失败 → null，候选列表少一级）
  const mainRoot = dirname(specBase);
  const repoRoot = parseRepoRegistry(readLocalYamlText(mainRoot)).get(repoKey) || null;
  const resolvedRoot = repoRoot && !isAbsolute(repoRoot) ? resolvePath(mainRoot, repoRoot) : repoRoot;
  // 寻址候选逐级探测：注册表 → 仓内新公式 → 主仓 specBase 旧公式（legacy 存量兜底）
  for (const dir of resolveCrossWorktreePathCandidates(specBase, changeName, repoKey, resolvedRoot)) {
    const metaPath = join(dir, META_FILE);
    if (!existsSync(metaPath)) continue; // 未命中 → 下一候选
    try {
      const m = JSON.parse(readFileSync(metaPath, 'utf8'));
      return m && m.isCross ? m : null; // 非跨仓/损坏 = 命中但无效
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * 列出某变更已建的全部跨仓 worktree meta（双源：worktrees 目录 `<change>--*` 扫描 ∪ 落位
 * 注册表条目——坑 cross-wt-toolchain-split：worktree 挪到 crossPlacement 自定义目录后不在
 * 默认存储目录下，纯目录扫描盲区）。注册表只提供位置：条目指向处须读到可解析且 isCross 的
 * meta.json 才入列（与目录扫描同判据——不合成无 meta 条目，消费方 gates.js 解引用
 * cm.depsStatus 零 TypeError 面）。按 repoKey 去重（注册表与目录扫描可能同指一处）。
 * @returns {Array<{repoKey: string, meta: object}>}
 */
export function listCrossWorktreeMetas(specBase, changeName) {
  const base = join(specBase, '.runtime', 'worktrees');
  const candidates = []; // {dir}
  const scanDir = (dir) => {
    if (!existsSync(dir)) return;
    try {
      for (const name of readdirSync(dir)) {
        if (!name.startsWith(`${changeName}--`)) continue;
        candidates.push(join(dir, name));
      }
    } catch { /* 目录不可读跳过 */ }
  };
  // 源① 主仓 specBase 旧默认（legacy-main-specbase 存量）
  scanDir(base);
  // 源② 仓内新默认（<repoRoot>/.sillyspec/.runtime/worktrees——按 local.yaml repos 注册表枚举各仓）
  const mainRoot = dirname(specBase);
  const registryYaml = readLocalYamlText(mainRoot);
  for (const repoRoot of parseRepoRegistry(registryYaml).values()) {
    const root = isAbsolute(repoRoot) ? repoRoot : resolvePath(mainRoot, repoRoot);
    scanDir(join(root, '.sillyspec', '.runtime', 'worktrees'));
  }
  // 源③ 注册表（注册表读取 fail-open 返回 {}——损坏降级纯目录扫描）
  const registry = readPlacementRegistry(specBase);
  const prefix = `${changeName}--`;
  for (const [key, entry] of Object.entries(registry)) {
    if (!key.startsWith(prefix)) continue;
    if (entry && typeof entry.worktreePath === 'string' && entry.worktreePath) {
      candidates.push(entry.worktreePath);
    }
  }
  const out = [];
  const seen = new Set();
  for (const dir of candidates) {
    const metaPath = join(dir, META_FILE);
    if (!existsSync(metaPath)) continue; // 无 meta 不入列（含注册表悬挂键——sweep 前的过渡态）
    try {
      const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
      if (meta && meta.isCross && meta.repoKey && !seen.has(meta.repoKey)) {
        seen.add(meta.repoKey);
        out.push({ repoKey: meta.repoKey, meta });
      }
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
 * 读主仓 local.yaml 文本（路径口径与 run/shared.js readLocalYamlRaw 一致：cwd/.sillyspec/local.yaml）。
 * @returns {string}
 */
function readLocalYamlText(cwd) {
  const p = join(cwd, '.sillyspec', 'local.yaml');
  if (!existsSync(p)) return '';
  try { return readFileSync(p, 'utf8') } catch { return '' }
}

/** worktreePath 是否落在主仓 specBase 旧默认（legacy-main-specbase 形态——该形态不写注册表，公式可寻址） */
function isLegacyMainSpecbasePlacement(worktreePath, specBase) {
  try {
    return resolvePath(dirname(worktreePath)) === resolvePath(join(specBase, '.runtime', 'worktrees'));
  } catch { return false }
}

/**
 * 仓内落位的 untracked 保障（坑 cross-wt-repo-local-placement）：.git/info/exclude 幂等追加
 * 条目——本仓生效、不进版本库（不碰用户 .gitignore 工作区文件、无 pull 冲突面）。创建 worktree
 * 前调用，worktree 目录一出现即被 git 忽略。追加失败（只读仓等）仅 warn 不阻断——最坏回落
 * 「worktree 成 untracked 噪音」，apply 侧清单校验本就过滤。
 * @param {string} repoRoot 跨仓仓根
 * @param {string} entry exclude 条目（如 '.sillyspec/'）
 */
function ensureRepoLocalExclude(repoRoot, entry) {
  try {
    const excludePath = join(repoRoot, '.git', 'info', 'exclude');
    let content = '';
    if (existsSync(excludePath)) {
      try { content = readFileSync(excludePath, 'utf8') } catch { content = '' }
    }
    const entryRe = new RegExp(`^${entry.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'm');
    if (entryRe.test(content)) return; // 幂等：已有条目不动
    const sep = content && !content.endsWith('\n') ? '\n' : '';
    const stamp = `${sep}# sillyspec cross-repo worktree placement (auto)\n${entry}\n`;
    mkdirSync(join(repoRoot, '.git', 'info'), { recursive: true });
    writeAtomicSync(excludePath, content + stamp);
  } catch (e) {
    console.warn(`⚠️ 跨仓仓 .git/info/exclude 追加失败（${e.message}）——worktree 目录可能成 untracked 噪音，apply 清单校验仍会过滤，建议手工补 ignore。`);
  }
}

/**
 * 读主仓 local.yaml 的 repos: 段（路径口径与 run/shared.js readLocalYamlRaw 一致：cwd/.sillyspec/local.yaml）。
 * @returns {Map<string,string>}
 */
function readRepoRegistry(cwd) {
  return parseRepoRegistry(readLocalYamlText(cwd));
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
  // 落位配置双源（坑 cross-wt-toolchain-split 配置简化，2026-10-10 用户反馈）：推荐 repos 条目
  // 内联（repos.<key>: {path, worktree}——注册与落位一处声明）；worktree.crossPlacement 段兼容
  // 保留作 legacy 读面。优先级：repos.<key>.worktree > worktree.crossPlacement.<key> > 默认公式。
  const inlinePlacements = parseRepoWorktreePlacements(readLocalYamlText(cwd));
  const placementCfg = readCrossPlacementConfig(cwd);
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

    // 落位解析（FR-01/FR-02）：显式（repos.<key>.worktree 内联 > crossPlacement.<key> legacy）>
    // 新默认=仓内 <repoRoot>/.sillyspec/.runtime/worktrees（坑 cross-wt-repo-local-placement：
    // 天然同盘同文件系统，WSL 主仓+Windows 盘跨仓的工具链分裂自动消解——用户 2026-10-10 提议，
    // 对齐主仓 worktree 的同构形态）。旧默认（主仓 specBase 下）降 legacy 兜底（resolve/扫描
    // 仍认，存量 worktree 全链可达）。
    // 显式配置指向仓根内维持拒绝（手配仓内=误配——untracked 噪音面）；新默认仓内合法，untracked
    // 面由 ensureRepoLocalExclude 的 .git/info/exclude 保障（不动用户 .gitignore、不进版本库）。
    const rawPlacement = inlinePlacements.get(key) || placementCfg.get(key) || null;
    let placementRoot = null;
    let placementMode = 'repo-local';
    if (rawPlacement) {
      placementRoot = resolvePlacementRoot(rawPlacement, cwd);
      placementMode = inlinePlacements.has(key) ? 'explicit-inline' : 'explicit-legacy';
      const rel = relativePath(resolvePath(repoRoot), placementRoot);
      if (rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))) {
        throw new Error(
          `跨仓 repo "${key}" 的落位配置（${placementRoot}）落在该仓仓根（${repoRoot}）之内——` +
          `显式落位应选该仓之外的目录（仓内落位请删掉该配置走默认）。重跑 execute 前修正配置。`
        );
      }
    }
    const worktreePath = crossWorktreePath(base, changeName, key, placementRoot || join(repoRoot, '.sillyspec', '.runtime', 'worktrees'));
    const branch = BRANCH_PREFIX + changeName;

    // 仓内落位的 untracked 保障：.git/info/exclude 幂等追加 .sillyspec/（本仓生效、不进版本库、
    // 不碰用户 .gitignore）。创建 worktree 前落盘——worktree 目录一出现即被忽略。
    if (!rawPlacement) {
      ensureRepoLocalExclude(repoRoot, '.sillyspec/');
    }

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
    if (rawPlacement) {
      mkdirSync(placementRoot, { recursive: true });
    } else {
      mkdirSync(join(repoRoot, '.sillyspec', '.runtime', 'worktrees'), { recursive: true });
    }
    try {
      git(repoRoot, ['worktree', 'add', worktreePath, '-b', branch, baseHash], { timeout: 120000 });
    } catch (e) {
      throw new Error(`跨仓仓 ${key} worktree 创建失败（${worktreePath}）：${e.stderr || e.message}`);
    }

    // WSL 跨文件系统分裂警告（FR-03，advisory 不阻断——坑 cross-wt-toolchain-split：主仓在
    // WSL /root、跨仓在 /mnt/<盘>/ Windows 盘时，worktree 默认落 WSL 原生 fs，该仓 Windows
    // 侧工具链（mvn/JDK）够不着，隔离形同虚设——fire-equipment 2026-10-10 实证被迫绕开
    // worktree 直写主干。配置同侧落位后本警告自然消音）。
    if (isWslSplit(repoRoot, worktreePath)) {
      console.warn(`⚠️ 跨仓 ${key}: 工具链分裂风险——仓根在 WSL automount Windows 盘（${repoRoot}）而 worktree 落在 WSL 原生文件系统（${worktreePath}）。`);
      console.warn(`   该仓若依赖 Windows 侧构建工具链（mvn/JDK/IDE），将无法访问 worktree——2026-10-10 实证此形态下 agent 被迫绕开 worktree 直写主副本。`);
      console.warn(`   建议：local.yaml 配 worktree.crossPlacement.${key} 到该仓可达的目录（如同盘符路径），重跑 execute 前先 sillyspec worktree cleanup ${changeName} --force。`);
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
      placementMode,
    };
    writeAtomicSync(join(worktreePath, META_FILE), JSON.stringify(meta, null, 2) + '\n');

    // 跨仓仓跳过 dirty baseline overlay + checkpoint（坑 cross-baseline-checkpoint-foreign-files，
    // 2026-09-12 驾驭第十三批②，用户实证：跨仓主副本在途的外来文件——并行会话的 2 个 pptx +
    // meta.json——被 checkpoint 带进跨仓分支，污染 apply 锚点对账被迫 cherry-pick 重建）：
    // 跨仓模型 = 子代理直接 commit 跨仓分支（NG-3），跨仓主副本的 WIP 不属于本变更隔离面，
    // 不该被固化进分支。meta.baselineFiles=[] 显式记录「无 checkpoint」，apply 侧以 baseHash
    // （跨仓仓 HEAD）为锚。
    meta.baselineFiles = [];
    meta.baselineHash = baseHash;
    console.log(`ℹ️ 跨仓 ${key}: 跳过 dirty baseline checkpoint（跨仓主副本在途改动不进本变更分支——含并行会话外来文件时防污染；锚点 = 跨仓仓 HEAD ${String(baseHash).slice(0, 8)}）`);
    writeAtomicSync(join(worktreePath, META_FILE), JSON.stringify(meta, null, 2) + '\n');

    // 落位注册表（FR-02）：仓内新默认与显式落位都记录位置（新默认位置依赖 repoRoot，读取方
    // 无 repoRoot 上下文时公式兜底不可用——注册表是主寻址）；落主仓 specBase 的旧默认不写。
    if (placementRoot || !isLegacyMainSpecbasePlacement(worktreePath, base)) {
      updatePlacementRegistry(base, changeName, key, { worktreePath, placementRoot: placementRoot || join(repoRoot, '.sillyspec', '.runtime', 'worktrees') });
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

    created.push({ repoKey: key, worktreePath, meta });
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
      removePlacementRegistryEntry(base, changeName, repoKey); // 挪位清理后注册表键回收（FR-02）
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
      // allowCross:true——本函数就是跨仓清理的显式路径（主仓守卫放行；见 safeRemoveWorktreeDir 注释）
      try { safeRemoveWorktreeDir(wtPath, meta, { allowCross: true }) } catch (e) { residual.push(`目录残留 ${wtPath}: ${e.message}`) }
      try { gitQuiet(repoRoot, ['worktree', 'prune'], { timeout: 30000 }) } catch { residual.push(`git worktree prune 失败（${repoRoot}）`) }
    }
    details.push(`分支 ${meta.branch} 保留作 review 锚点（确认无需回溯后可 git -C ${repoRoot} branch -D ${meta.branch}）`);
    if (residual.length === 0) {
      removePlacementRegistryEntry(base, changeName, repoKey); // cleaned 后注册表键回收（FR-02）
    }
    results.push({ repoKey, result: residual.length > 0 ? 'partial' : 'cleaned', details, residual });
  }
  // 差集 sweep（评审 P2 吸收）：cleanup 迭代源=listCrossWorktreeMetas 只列有 meta 条目，
  // 「worktree remove 连目录带 meta 同亡、仅注册表键存」的悬挂键够不着——末尾对本变更名下
  // 全部键按「worktreePath 处无 meta.json」差集清（活键不删）。
  const swept = sweepPlacementRegistry(base, changeName);
  if (swept.length > 0) results.push({ repoKey: '(registry-sweep)', result: 'cleaned', details: [`悬挂注册表键已清: ${swept.join('、')}`], residual: [] });
  return { results };
}
