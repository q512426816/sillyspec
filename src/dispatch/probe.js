/**
 * SillyHub 能力探测（D-005 双后端 fallback 的关键判定）
 *
 * 定位（design.md §Phase4 / §接口定义）：probeSillyHub 是"能力探测"，决定 dispatch 用 SillyHub
 * 还是 Local 后端。无 MCP 配置 / daemon 不可达 / worktree 越界 → 返回 unavailable → 调用方全程
 * Local（零回归）。纯 JS 可测（task-08 mock client 验三分支）；不直接碰 lease，只感知 daemon 连通性。
 *
 * 铁律（design.md R-06 / task-01 constraints）：
 * - 探测失败保守 fallback（返回 unavailable），**绝不抛异常阻断 execute**（client 契约异常时再兜 try/catch）。
 * - TTL 可配（local.yaml dispatch.probe_ttl_ms），不硬编码。
 * - 无 MCP 配置时同步快速路径返回，**不发网络**（零回归的关键）。
 * - 负面结果 TTL 缓存（daemon 抖动期免反复探测，R-06）；正面结果不缓存（让 daemon 恢复/退化及时反映）。
 */

import { existsSync, readFileSync } from 'node:fs';
import { join, relative, isAbsolute, sep } from 'node:path';
import jsYaml from 'js-yaml';
import { SillyHubMcpClient } from '../sillyhub-mcp/client.js';

/** 默认负面缓存 TTL（毫秒）。可被 local.yaml dispatch.probe_ttl_ms 或 ttlMs 参数覆盖。 */
export const DEFAULT_PROBE_TTL_MS = 60_000;

// 负面缓存：configFingerprint → { result: {available,reason}, expiresAt }
// 仅缓存网络派生的 unavailable 结果（daemon-unreachable），避免 daemon 抖动期反复探测（R-06）。
// no-config 由 env 同步派生（不入缓存）；worktree-outside-root 依赖路径入参（每次重算，不入缓存）。
const negativeCache = new Map();

/**
 * 读 local.yaml 的 dispatch.probe_ttl_ms（best-effort，绝不抛）。
 * 文件不存在 / 解析失败 / 无 dispatch 段 / 非正数 → 返回 undefined（调用方降级默认值）。
 * 读法参考 src/sync.js readLocalYaml 的 best-effort 风格，但用 js-yaml 解析嵌套段（更稳健）。
 */
function readProbeTtlFromLocalYaml(cwd) {
  try {
    const p = join(cwd, '.sillyspec', 'local.yaml');
    if (!existsSync(p)) return undefined;
    const doc = jsYaml.load(readFileSync(p, 'utf8'));
    if (!doc || typeof doc !== 'object') return undefined;
    const dispatch = doc.dispatch;
    if (!dispatch || typeof dispatch !== 'object') return undefined;
    const v = dispatch.probe_ttl_ms;
    return typeof v === 'number' && v > 0 ? v : undefined;
  } catch {
    return undefined;
  }
}

/**
 * 解析生效 TTL。优先级：显式 ttlMs 参数 > local.yaml dispatch.probe_ttl_ms > 默认常量。
 */
function resolveTtl(ttlMs, cwd) {
  if (typeof ttlMs === 'number' && ttlMs > 0) return ttlMs;
  const fromYaml = readProbeTtlFromLocalYaml(cwd);
  if (typeof fromYaml === 'number') return fromYaml;
  return DEFAULT_PROBE_TTL_MS;
}

/**
 * 配置指纹（负面缓存 key）。用 env URL 标识 daemon 身份；token 不入 key（避免敏感信息驻留缓存）。
 * token 轮换后最迟 TTL 内自动失效重探。
 */
function configFingerprint() {
  return process.env.SILLYHUB_MCP_URL || '';
}

/**
 * 判断 worktreePath 是否在 rootPath 目录内（含相等，R-08）。
 * 段级 '..' 精确匹配：兼容跨盘符（Windows 不同盘 → rel 绝对路径 → 越界）与字面 '..' 前缀目录名
 * （如 '..foo' 目录不会被误判越界，区别于粗放的 startsWith('..') 写法）。
 */
function isWithinRoot(rootPath, worktreePath) {
  const rel = relative(rootPath, worktreePath);
  if (rel === '') return true; // worktree === root，边界视为在内
  if (isAbsolute(rel)) return false; // 跨盘符（Windows）→ rel 绝对路径 → 越界
  const segments = rel.split(sep);
  return !segments.some((s) => s === '..');
}

/**
 * 能力探测：决定 dispatch 是否可用 SillyHub 后端。
 *
 * 决策顺序（design.md §Phase4 / task-01 implementation）：
 *   1. env 快速路径（无网络）：缺 URL/TOKEN → no-config
 *   2. 负面缓存命中且未过 TTL → 直接返回缓存（无网络，R-06）
 *   3. 连通性探测 client.probeDaemon()：false → 缓存 daemon-unreachable 并返回
 *   4. root_path 校验（R-08 best-effort，仅 rootPath 传入时）：越界 → worktree-outside-root
 *   5. 全通过 → available=true（不缓存正面结果）
 *
 * @param {object} [opts]
 * @param {object} [opts.client]       - SillyHubMcpClient 实例；缺省 new SillyHubMcpClient()（读 env）
 * @param {string} [opts.worktreePath] - SillySpec worktree 绝对路径（root_path 校验用）
 * @param {string} [opts.rootPath]     - daemon ws.root_path（仅传时校验 worktree 在内，R-08）
 * @param {number} [opts.ttlMs]        - 负面缓存 TTL 覆盖（优先于 local.yaml）
 * @returns {Promise<{ available: boolean, reason?: string }>}
 */
export async function probeSillyHub({ client, worktreePath, rootPath, ttlMs } = {}) {
  // 1. 同步快速路径：env 缺任一即 unavailable（不发网络，零回归关键）
  if (!process.env.SILLYHUB_MCP_URL || !process.env.SILLYHUB_MCP_TOKEN) {
    return { available: false, reason: 'no-config' };
  }

  // 2. 负面缓存命中（未过 TTL）→ 直接返回，不发网络（R-06 抖动期免反复探测）
  const fp = configFingerprint();
  const cached = negativeCache.get(fp);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.result;
  }

  // 3. 连通性探测：client.probeDaemon 自身 best-effort 不抛；再兜一层 try/catch，
  //    即便 client 契约异常抛出也保守判 unavailable（铁律：绝不抛穿 execute）
  const cli = client || new SillyHubMcpClient();
  let reachable;
  try {
    reachable = await cli.probeDaemon();
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    console.warn(`[dispatch/probe] probeDaemon 抛异常（保守判 unavailable）: ${msg}`);
    reachable = false;
  }
  if (!reachable) {
    const result = { available: false, reason: 'daemon-unreachable' };
    const ttl = resolveTtl(ttlMs, process.cwd());
    negativeCache.set(fp, { result, expiresAt: Date.now() + ttl });
    return result;
  }

  // 4. root_path 校验（R-08，best-effort）：仅当调用方传 rootPath（路径A 落地后 daemon 暴露）。
  //    worktreePath 同传时校验是否在 rootPath 内；任一缺失则跳过（不因此判 unavailable）。
  if (rootPath && worktreePath) {
    if (!isWithinRoot(rootPath, worktreePath)) {
      return { available: false, reason: 'worktree-outside-root' };
    }
  }

  // 5. 全通过：不缓存正面结果，下次重新探测（让 daemon 恢复/退化及时反映）
  return { available: true };
}

/**
 * 清空负面缓存（测试用；生产中 TTL 自然过期即可）。
 */
export function clearProbeCache() {
  negativeCache.clear();
}
