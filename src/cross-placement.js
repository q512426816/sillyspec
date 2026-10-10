/**
 * cross-placement.js — 跨仓 worktree 落位配置 / 注册表 / 路径解析（零依赖叶子模块）
 *
 * 坑 cross-wt-toolchain-split（2026-10-10 用户实证，fire-equipment D-007）：跨仓 worktree 固定
 * 落位主仓 specBase 下——主仓在 WSL /root、跨仓在 Windows 盘时，worktree 与该仓唯一构建工具链
 * 分居互不可访文件系统，隔离形同虚设（agent 被迫绕开 worktree 回主副本直写主干）。
 *
 * 本模块承载三件事：
 *   1. worktree.crossPlacement 配置读取（local.yaml，块式/inline 双形态）；
 *   2. 落位注册表 cross-placements.json（create 写 / cleanup 删，read-modify-merge 原子写）——
 *      挪位后 listCrossWorktreeMetas/cleanup/verify 对账仍可寻址；
 *   3. crossWorktreePath(placementRoot?) 路径公式 + resolveCrossWorktreePath（注册表优先、公式兜底）。
 *
 * 依赖纪律（评审吸收①）：本模块只 import fs/path/fs-atomic——worktree-cross.js 与
 * run/multi-repo-context.js 都 import 本模块。multi-repo-context 此前刻意不 import worktree-cross
 * （经 run/shared 的既有环），落位逻辑下沉叶子模块后两侧共用不引新环。
 */

import { existsSync, readFileSync } from 'fs';
import { join, resolve as resolvePath, isAbsolute, dirname } from 'path';
import { writeAtomicSync } from './fs-atomic.js';

export const PLACEMENT_REGISTRY_FILE = 'cross-placements.json';

/** 跨仓 worktree 目录名（默认落位与自定义落位同形态——isCrossWorktreeDir 的双连字符判定依赖它） */
export function crossWorktreeDirName(changeName, repoKey) {
  return `${changeName}--${repoKey}`;
}

/**
 * 路径公式：默认落位 <specBase>/.runtime/worktrees/<change>--<repoKey>；
 * placementRoot 给定时 <placementRoot>/<change>--<repoKey>（与默认同目录名形态）。
 * @param {string} specBase 主仓 spec 根（<主仓>/.sillyspec）
 * @param {string} changeName
 * @param {string} repoKey
 * @param {string|null} [placementRoot] 已解析的落位根目录（null/缺省走默认公式——三参调用零回归）
 */
export function crossWorktreePath(specBase, changeName, repoKey, placementRoot = null) {
  const dirName = crossWorktreeDirName(changeName, repoKey);
  if (placementRoot) return join(placementRoot, dirName);
  return join(specBase, '.runtime', 'worktrees', dirName);
}

/**
 * 解析 crossPlacement 配置值为落位根目录：相对路径相对主仓根解析；拒绝 .. 逃逸出主仓根
 * 之外的形态不在此处判（主仓根外合法——/mnt/e/wt-root 本就在主仓外），只归一绝对路径。
 * @param {string} raw local.yaml 配置原文
 * @param {string} mainRoot 主仓根（相对路径解析基准）
 * @returns {string} 绝对落位根
 */
export function resolvePlacementRoot(raw, mainRoot) {
  const trimmed = String(raw || '').trim().replace(/^['"]|['"]$/g, '');
  if (isAbsolute(trimmed)) return resolvePath(trimmed);
  return resolvePath(mainRoot, trimmed);
}

/**
 * 读主仓 local.yaml 的 worktree.crossPlacement 段 → Map<repoKey, 原始配置值>。
 * 兼容两种写法（沿 worktree.js readSupplyFilesConfig / hooks/worktree-guard.js parseSimpleYaml
 * 的轻量手写风格，不引 yaml 依赖）：
 *   worktree:
 *     crossPlacement:
 *       urgent: /mnt/e/wt-root        # 块式（indent 4）
 *   worktree:
 *     crossPlacement: {urgent: /mnt/e/wt-root, front: D:/wt}   # inline flow
 * 文件缺失/段缺失/解析异常 → 空 Map（fail-open，落位步空转走默认公式）。
 * @param {string} mainCwd 主仓根
 * @returns {Map<string, string>}
 */
export function readCrossPlacementConfig(mainCwd) {
  const out = new Map();
  let content;
  try {
    content = readFileSync(join(mainCwd, '.sillyspec', 'local.yaml'), 'utf8');
  } catch {
    return out;
  }
  const stripQuotes = (v) => (
    v.length >= 2 && ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) ? v.slice(1, -1) : v
  );
  let inWorktree = false;
  let inCrossPlacement = false;
  for (const rawLine of content.split('\n')) {
    const noComment = rawLine.replace(/\s+#.*$/, ''); // 尾注释剥离（与 worktree-guard 同口径）
    const trimmed = noComment.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const indent = noComment.length - noComment.trimStart().length;
    if (indent === 0) {
      inWorktree = /^worktree:\s*$/.test(trimmed);
      inCrossPlacement = false;
      continue;
    }
    if (!inWorktree) continue;
    if (indent === 2) {
      const m = trimmed.match(/^crossPlacement:\s*(.*)$/);
      if (!m) { inCrossPlacement = false; continue; }
      inCrossPlacement = true;
      const rest = m[1].trim();
      // inline flow 形态：{urgent: /a, front: D:/b}——逗号拆（值内逗号不支持，落位路径含逗号用块式）
      if (rest.startsWith('{') && rest.endsWith('}')) {
        for (const part of rest.slice(1, -1).split(',')) {
          const kv = part.split(':');
          if (kv.length >= 2) {
            const k = kv[0].trim();
            const v = stripQuotes(kv.slice(1).join(':').trim());
            if (k && v) out.set(k, v);
          }
        }
        inCrossPlacement = false; // inline 一行吃尽
      }
      continue;
    }
    if (inCrossPlacement && trimmed.includes(':')) {
      const idx = trimmed.indexOf(':');
      const k = trimmed.slice(0, idx).trim();
      const v = stripQuotes(trimmed.slice(idx + 1).trim());
      if (k && v) out.set(k, v);
    }
  }
  return out;
}

/** 注册表路径 <specBase>/.runtime/worktrees/cross-placements.json */
export function placementRegistryPath(specBase) {
  return join(specBase, '.runtime', 'worktrees', PLACEMENT_REGISTRY_FILE);
}

/**
 * 读注册表（整对象）。文件缺失/损坏半截 JSON → {}（fail-open：读取方降级默认公式）。
 * @returns {Record<string, {repoKey: string, changeName: string, worktreePath: string, placementRoot: string}>}
 */
export function readPlacementRegistry(specBase) {
  const p = placementRegistryPath(specBase);
  if (!existsSync(p)) return {};
  try {
    const parsed = JSON.parse(readFileSync(p, 'utf8'));
    return (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * 写/更新一条注册表（read-modify-merge + 原子写——多变更并发各改各键，merge 防整文件覆盖丢他键；
 * 极小窗口仍可能丢并发写，后果=该变更降级公式寻址，见 design R-02）。
 * @param {string} specBase
 * @param {string} changeName
 * @param {string} repoKey
 * @param {{worktreePath: string, placementRoot: string}} entry
 */
export function updatePlacementRegistry(specBase, changeName, repoKey, entry) {
  const registry = readPlacementRegistry(specBase);
  registry[crossWorktreeDirName(changeName, repoKey)] = {
    repoKey,
    changeName,
    worktreePath: entry.worktreePath,
    placementRoot: entry.placementRoot,
  };
  writeAtomicSync(placementRegistryPath(specBase), JSON.stringify(registry, null, 2) + '\n');
}

/**
 * 删除一条注册表键（无键幂等 no-op；目录被并发清理后再删同键安全）。
 */
export function removePlacementRegistryEntry(specBase, changeName, repoKey) {
  const registry = readPlacementRegistry(specBase);
  const key = crossWorktreeDirName(changeName, repoKey);
  if (!(key in registry)) return;
  delete registry[key];
  writeAtomicSync(placementRegistryPath(specBase), JSON.stringify(registry, null, 2) + '\n');
}

/**
 * 差集 sweep（评审 P2 吸收）：本变更名下的全部注册表键（<change>--*），凡 worktreePath 处
 * 无 meta.json 的悬挂键一律删除——覆盖「cleanup 迭代源=listCrossWorktreeMetas 只列有 meta
 * 条目」够不着的残留形态（worktree remove 连目录带 meta 同亡、仅键存）。
 * @returns {string[]} 实际删除的键
 */
export function sweepPlacementRegistry(specBase, changeName) {
  const registry = readPlacementRegistry(specBase);
  const prefix = `${changeName}--`;
  const removed = [];
  for (const [key, entry] of Object.entries(registry)) {
    if (!key.startsWith(prefix)) continue;
    const wtPath = entry && typeof entry.worktreePath === 'string' ? entry.worktreePath : '';
    if (!wtPath || !existsSync(join(wtPath, 'meta.json'))) {
      delete registry[key];
      removed.push(key);
    }
  }
  if (removed.length > 0) {
    writeAtomicSync(placementRegistryPath(specBase), JSON.stringify(registry, null, 2) + '\n');
  }
  return removed;
}

/**
 * 寻址：注册表优先（键 <change>--<repoKey>），无条目回退默认公式。
 * 注册表只提供位置——条目指向处是否真有 worktree 由调用方（meta 读取/目录判定）裁决，
 * 本函数不做存在性校验（create 前调用时目录尚不存在是合法态）。
 * @param {string} specBase
 * @param {string} changeName
 * @param {string} repoKey
 * @returns {string} worktree 应在/所在路径
 */
export function resolveCrossWorktreePath(specBase, changeName, repoKey) {
  const registry = readPlacementRegistry(specBase);
  const entry = registry[crossWorktreeDirName(changeName, repoKey)];
  if (entry && typeof entry.worktreePath === 'string' && entry.worktreePath) {
    return entry.worktreePath;
  }
  return crossWorktreePath(specBase, changeName, repoKey);
}

/**
 * WSL 跨文件系统分裂判定（坑 cross-wt-toolchain-split，advisory 依据）：
 * linux 平台且 repoRoot 匹配 /mnt/<盘>/（WSL automount Windows 盘）而 worktreePath 不匹配
 * → 该仓构建工具链（Windows 侧）与 worktree（WSL 原生 fs）分居。win32/darwin 恒 false 不误报。
 * @param {string} repoRoot 跨仓仓根
 * @param {string} worktreePath worktree 落位路径
 * @returns {boolean}
 */
const WSL_AUTOMOUNT_RE = /^\/mnt\/[A-Za-z](?:\/|$)/;
export function isWslSplit(repoRoot, worktreePath) {
  return process.platform === 'linux'
    && WSL_AUTOMOUNT_RE.test(String(repoRoot || ''))
    && !WSL_AUTOMOUNT_RE.test(String(worktreePath || ''));
}
