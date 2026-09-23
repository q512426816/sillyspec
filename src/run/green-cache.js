/**
 * green-cache.js — verify 门禁绿结果指纹缓存（R8 对撞修复，2026-09-23）。
 *
 * 问题：verify 收敛循环里同一套 commands.test/lint 被重复真跑——gate verify ×3 +
 * verify --done 收口再跑（2026-09-23 change-events-channel 基线实测 ≈13min 纯重复执行）。
 * 「亲自实测」的防作弊语义只要求结果真实，不要求重复产生：同指纹（HEAD + 代码脏面 +
 * local.yaml）下近期真跑出的绿结果可复用；命中必须明示 cached——结论仍是真的，但
 * 「本次没跑」必须披露，不冒充本次执行（真实性口径：known_failures 失败签名去重
 * （v3.29.3）的成功面对偶）。
 *
 * 指纹口径：代码脏面剔除 .sillyspec/、docs/、*.md（对齐 watcher buildSnapshot
 * dirtyCode / quality-scan 口径）——verify 收敛循环里 verify-result.md 等文档修订
 * 不应击穿缓存，只有代码面变化才 invalid；local.yaml 整文件哈希入指纹（commands
 * 改动即 miss，防换命令吃旧结果）。
 *
 * 逃生阀：env SILLYSPEC_GREEN_CACHE_OFF=1 全关（回退每次真跑，排障口径）；
 * SILLYSPEC_GREEN_CACHE_TTL_MIN 覆盖 TTL（默认 30min——覆盖一轮 verify 收敛窗口，
 * 同时防环境漂移（DB/网络态）吃太久前的旧绿）。
 * fail-open：指纹计算/缓存读写任何异常 → miss（回退真跑，零回归）。
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const DEFAULT_TTL_MIN = 30;

function sha1(text) {
  return createHash('sha1').update(text).digest('hex');
}

function safeGit(cwd, args) {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 60000, windowsHide: true });
  } catch {
    return null;
  }
}

/**
 * porcelain 行过滤为「代码面」：剔 .sillyspec/、docs/ 与 *.md（含 rename 两侧任一命中）。
 * 纯函数（口径单点，watcher dirtyCode / quality-scan 同源判据）；排序保序（同输入同输出）。
 */
export function filterCodePorcelain(porcelain) {
  return String(porcelain || '')
    .split(/\r?\n/)
    .filter((line) => {
      if (!line.trim()) return false;
      const raw = line.slice(3).trim();
      if (!raw) return false;
      // rename 行「old -> new」两侧任一是文档面即整行剔除（防 rename 伪装穿透）
      const parts = raw.split(' -> ').map((p) => p.replace(/^"|"$/g, ''));
      return !parts.every((p) => p.startsWith('.sillyspec/') || p.startsWith('docs/') || /\.md$/i.test(p));
    })
    .sort();
}

/**
 * 计算门禁绿缓存指纹：HEAD + 代码脏面 + local.yaml 内容。
 * git 不可用（非仓目录）返回 null → 调用方按 miss 处理。
 */
export function computeGateFingerprint({ cwd, specBase }) {
  const head = safeGit(cwd, ['rev-parse', 'HEAD']);
  if (head === null) return null;
  const porcelain = safeGit(cwd, ['status', '--porcelain']) ?? '';
  let localYaml = '';
  try {
    const yamlPath = join(specBase, 'local.yaml');
    if (existsSync(yamlPath)) localYaml = readFileSync(yamlPath, 'utf8');
  } catch { /* 读不到按空——指纹仍含 HEAD+脏面，miss 风险方向安全 */ }
  return sha1([head.trim(), filterCodePorcelain(porcelain).join('\n'), localYaml].join('\u0000'));
}

function greenCacheFile({ runtimeRoot, scope, kind }) {
  // scope 为变更名（assertSafeChangeName 已在上游消毒）或 facet 固定串，不含路径分隔符
  return join(runtimeRoot, 'green-cache', `${scope}.${kind}.json`);
}

function resolveTtlMin(env) {
  const v = Number(env.SILLYSPEC_GREEN_CACHE_TTL_MIN);
  return Number.isFinite(v) && v > 0 ? v : DEFAULT_TTL_MIN;
}

/**
 * 查绿缓存：指纹不符/TTL 过期/阀关/文件坏 → null（一律回退真跑）。
 * 命中返回 { ...rec, ageMs, cached:true }（rec = storeGreenCache 写入的记录）。
 */
export function lookupGreenCache({ runtimeRoot, scope, kind, fingerprint, now = Date.now(), env = process.env }) {
  if (env.SILLYSPEC_GREEN_CACHE_OFF === '1') return null;
  if (!runtimeRoot || !fingerprint) return null;
  try {
    const file = greenCacheFile({ runtimeRoot, scope, kind });
    if (!existsSync(file)) return null;
    const rec = JSON.parse(readFileSync(file, 'utf8'));
    if (!rec || rec.fingerprint !== fingerprint) return null;
    if (now - rec.storedAt > resolveTtlMin(env) * 60_000) return null;
    return { ...rec, ageMs: now - rec.storedAt, cached: true };
  } catch {
    return null;
  }
}

/**
 * 写绿缓存（best-effort：IO 异常返回 false 不抛——缓存失败不影响门禁本体）。
 */
export function storeGreenCache({ runtimeRoot, scope, kind, fingerprint, result, now = Date.now(), env = process.env }) {
  if (env.SILLYSPEC_GREEN_CACHE_OFF === '1') return false;
  if (!runtimeRoot || !fingerprint) return false;
  try {
    const file = greenCacheFile({ runtimeRoot, scope, kind });
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify({ fingerprint, storedAt: now, result }, null, 1));
    return true;
  } catch {
    return false;
  }
}

/** 命中时给调用方的人话披露行（进 gate 结果 warnings，真实性口径）。 */
export function greenCacheNotice(hit, label = 'verify-test') {
  const ageMin = Math.max(1, Math.round((hit.ageMs || 0) / 60_000));
  return `ℹ️ ${label} 本次未重跑——复用 ${ageMin} 分钟内同指纹真跑绿结果（SILLYSPEC_GREEN_CACHE_OFF=1 可关闭缓存）`;
}
