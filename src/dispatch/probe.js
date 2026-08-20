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
import { readMcpConfig } from '../sillyhub-mcp/config.js';
import { setPathAProbeResult } from './backends/sillyhub-mcp.js';

/** 默认负面缓存 TTL（毫秒）。可被 local.yaml dispatch.probe_ttl_ms 或 ttlMs 参数覆盖。 */
export const DEFAULT_PROBE_TTL_MS = 60_000;

/**
 * HUB-12a：probe 总超时。链路最坏 initialize(10s) + tools/call(10s) + tools/list(10s) 串行，
 * 慢/挂 daemon 下此前要 ~30-50s 才降级，阻塞 execute。默认 25s 截断（可达 daemon 毫秒级
 * 响应，不受影响）；opts.totalTimeoutMs 可覆盖。超时按 daemon-unreachable 语义进负面缓存。
 */
const DEFAULT_PROBE_TOTAL_TIMEOUT_MS = 25_000;

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
 * 配置指纹（负面缓存 key）。用 local.yaml mcp 段或 env 的 URL 标识 daemon 身份；
 * token 不入 key（避免敏感信息驻留缓存，保密语义不变）。token 轮换后最迟 TTL 内自动失效重探。
 */
function configFingerprint(cwd) {
  return readMcpConfig(cwd)?.url || '';
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
 * 从 tools/list 返回的 tools 数组探测路径A 是否支持（task-11，D-005）。
 *
 * 命中条件（全中才 true，任一缺失 → false，保守 R-04）：
 * - 找到 `name === 'dispatch_worker'` 的 tool
 * - 其 `inputSchema.properties` 同时声明 `worktree_path` 与 `worker_prompt`（caller-worktree +
 *   prompt 覆写两处 daemon 侧落地标志，design §7.3）
 *
 * 纯函数（不调网络），独立可测（task-11 三分支：含字段→true / 缺字段→false / 异常输入→false）。
 * @param {Array<{name:string, inputSchema?:object}>|null} tools - client.listTools() 返回的 tools 数组
 * @returns {boolean} 路径A schema 全命中 → true；否则 false
 */
export function detectPathAFromTools(tools) {
  if (!Array.isArray(tools)) return false;
  const dw = tools.find((t) => t && t.name === 'dispatch_worker');
  if (!dw) return false;
  const props = dw.inputSchema && dw.inputSchema.properties;
  if (!props || typeof props !== 'object') return false;
  return Boolean(props.worktree_path) && Boolean(props.worker_prompt);
}

/**
 * 能力探测：决定 dispatch 是否可用 SillyHub 后端。
 *
 * 决策顺序（design.md §Phase4 / task-01 implementation）：
 *   1. env 快速路径（无网络）：缺 URL/TOKEN → no-config
 *   2. 负面缓存命中且未过 TTL → 直接返回缓存（无网络，R-06）
 *   3. 连通性探测 client.probeDaemon()：false → 缓存 daemon-unreachable 并返回
 *   3.5 路径A schema 预热 + root_path 获取（HUB-12a 合并）：daemon 可达后**一次**
 *       tools/list 同时喂 detectPathAFromTools 预热与 root_path 越界校验（此前
 *       listTools + getRootPath 各发一次同 method 请求）
 *   4. worktreePath 越界校验（R-08 best-effort）
 *   5. 全通过 → available=true（不缓存正面结果）
 *
 * 整链路受 totalTimeoutMs 总超时保护（HUB-12a）：超时按 daemon-unreachable 进负面缓存。
 *
 * @param {object} [opts]
 * @param {object} [opts.client]       - SillyHubMcpClient 实例；缺省 new SillyHubMcpClient()（经 readMcpConfig 读 local.yaml mcp 段 + env）
 * @param {string} [opts.worktreePath] - SillySpec worktree 绝对路径（root_path 校验用）
 * @param {string} [opts.rootPath]     - daemon ws.root_path；未传（undefined）时 best-effort 从 daemon
 *                                       拿（task-12 #5），拿不到则跳过越界校验（不判 unavailable）
 * @param {number} [opts.ttlMs]        - 负面缓存 TTL 覆盖（优先于 local.yaml）
 * @param {number} [opts.totalTimeoutMs] - 总超时覆盖（默认 25s，HUB-12a）
 * @returns {Promise<{ available: boolean, reason?: string }>}
 */
export async function probeSillyHub({ client, worktreePath, rootPath, ttlMs, totalTimeoutMs } = {}) {
  // 1. 同步快速路径：无 local.yaml mcp 段且 env 缺凭据即 unavailable（不发网络，零回归关键）。
  //    readMcpConfig 纯 fs + env 读（best-effort 不抛不发网络），返回 null = 两源都缺 → no-config。
  if (!readMcpConfig(process.cwd())) {
    return { available: false, reason: 'no-config' };
  }

  // 2. 负面缓存命中（未过 TTL）→ 直接返回，不发网络（R-06 抖动期免反复探测）
  const fp = configFingerprint(process.cwd());
  const cached = negativeCache.get(fp);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.result;
  }

  const cli = client || new SillyHubMcpClient({ cwd: process.cwd() });
  const cacheNegative = (reason) => {
    const result = { available: false, reason };
    const ttl = resolveTtl(ttlMs, process.cwd());
    negativeCache.set(fp, { result, expiresAt: Date.now() + ttl });
    return result;
  };

  // HUB-12a：总超时兜底——慢/挂 daemon 不拖 execute。超时后后台请求由 client 自身
  // 10s 请求超时自然终结（有界），probe 侧按不可达降级
  const budgetMs = typeof totalTimeoutMs === 'number' && totalTimeoutMs > 0
    ? totalTimeoutMs
    : DEFAULT_PROBE_TOTAL_TIMEOUT_MS;

  const probeBody = (async () => {
    // 3. 连通性探测：client.probeDaemon 自身 best-effort 不抛；再兜一层 try/catch，
    //    即便 client 契约异常抛出也保守判 unavailable（铁律：绝不抛穿 execute）
    let reachable;
    try {
      reachable = await cli.probeDaemon();
    } catch (err) {
      const msg = err && err.message ? err.message : String(err);
      console.warn(`[dispatch/probe] probeDaemon 抛异常（保守判 unavailable）: ${msg}`);
      reachable = false;
    }
    if (!reachable) return cacheNegative('daemon-unreachable');

    // 3.5+4 合并（HUB-12a）：一次 tools/list 同时拿 tools 数组（路径A schema 预热）与
    //     root_path（越界校验）。旧 client 无 listToolsWithMeta 时回退 listTools +
    //     getRootPath 各一次（兼容旧 mock）
    let tools = null;
    let toolsListRoot = undefined;
    try {
      if (typeof cli.listToolsWithMeta === 'function') {
        const raw = await cli.listToolsWithMeta();
        if (raw) {
          if (Array.isArray(raw)) tools = raw;
          else if (Array.isArray(raw.tools)) tools = raw.tools;
          if (raw && typeof raw === 'object' && typeof raw.root_path === 'string' && raw.root_path) {
            toolsListRoot = raw.root_path;
          }
        }
      } else if (typeof cli.listTools === 'function') {
        tools = await cli.listTools();
      }
    } catch (err) {
      const msg = err && err.message ? err.message : String(err);
      console.warn(`[dispatch/probe] tools/list 异常（路径A 保守判 false）: ${msg}`);
      tools = null;
    }
    try {
      setPathAProbeResult(detectPathAFromTools(tools));
    } catch (err) {
      const msg = err && err.message ? err.message : String(err);
      console.warn(`[dispatch/probe] 路径A schema 探测异常（保守判 false）: ${msg}`);
      setPathAProbeResult(false);
    }

    if (worktreePath) {
      let effectiveRoot = rootPath;
      if (effectiveRoot === undefined) {
        effectiveRoot = toolsListRoot !== undefined ? toolsListRoot : null;
        if (effectiveRoot === null && typeof cli.getRootPath === 'function') {
          try {
            effectiveRoot = await cli.getRootPath();
          } catch (err) {
            const msg = err && err.message ? err.message : String(err);
            console.warn(`[dispatch/probe] rootPath best-effort 拿取异常（跳过越界校验）: ${msg}`);
            effectiveRoot = null;
          }
        }
      }
      if (effectiveRoot && !isWithinRoot(effectiveRoot, worktreePath)) {
        return { available: false, reason: 'worktree-outside-root' };
      }
    }

    // 5. 全通过：不缓存正面结果，下次重新探测（让 daemon 恢复/退化及时反映）
    return { available: true };
  })();

  let timeoutId = null;
  let raced;
  try {
    raced = await Promise.race([
      probeBody,
      new Promise((resolve) => { timeoutId = setTimeout(() => resolve(null), budgetMs) }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
  return raced || cacheNegative('probe-timeout');
}

/**
 * 清空负面缓存（测试用；生产中 TTL 自然过期即可）。
 */
export function clearProbeCache() {
  negativeCache.clear();
}
