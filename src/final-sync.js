/**
 * final-sync.js — 终态同步三态 marker 与两段消费(2026-11-09-terminal-sync-background)。
 *
 * 背景:终态强校验(triggerSyncTerminalStrict)原为内联有界等待(预算 max(env,45s)),
 * 多会话并行仓冻结面常含并行提交,change.patch 达 MB 级(2026-11-09 实证 5.66MB×1Mbps
 * 链路),45s 必熔断 → exit 1 + 收口体感 hang。本模块把「结果可判」从前台挪到异步:
 * 终态推送转后台通道,前台落 pending marker;bg 子进程按 sync treeOk 收敛 ok/failed;
 * 下一条命令消费(ok 静默清理 / failed 🚨+自救命令 / pending 超 TTL 验证后清理或补报)。
 *
 * marker 落 runtime temp 分层(可随时整体删除,非契约存储):
 *   <runtimeRoot>/temp/final-sync/<change>.json = { change, status, ts, detail? }
 *
 * 状态机单向 pending → ok|failed;并发写最坏互覆,任一方结果均可收敛(失败互覆窗口由
 * TTL 验证路径兜住,验证性 sync 幂等)。消费动作全部容错——marker 故障绝不阻断主命令。
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';

/** pending 无更新视为悬挂的时限(bg 总预算 150s + 收尾余量之后)。 */
export const FINAL_SYNC_PENDING_TTL_MS = 10 * 60 * 1000;

/** 🚨 补报横幅标签(与强校验内联路径的「平台文件树推送未确认」同族,带自救命令)。 */
export const FINAL_SYNC_WARN_TAG = '[终态同步补报]';

/** marker 目录:<runtimeRoot>/temp/final-sync(temp 分层=可随时整体删除)。 */
function finalSyncDir(runtimeRoot) {
  return join(runtimeRoot, 'temp', 'final-sync');
}

/**
 * 解析 runtimeRoot(动态 import 防循环:shared 仅函数内动态引用本模块,本模块反向同款)。
 * @param {string} cwd @param {object} platformOpts @returns {Promise<string>}
 */
async function resolveRoot(cwd, platformOpts) {
  const { resolveRuntimeRoot } = await import('./run/shared.js');
  return resolveRuntimeRoot(platformOpts, platformOpts?.specRoot || join(cwd, '.sillyspec'));
}

function markerFileName(change) {
  // 变更名受控(日期-名),防御性 sanitize 防 path 拼接意外
  return `${String(change).replace(/[^A-Za-z0-9._-]/g, '_')}.json`;
}

function readMarkersSync(runtimeRoot) {
  const dir = finalSyncDir(runtimeRoot);
  if (!existsSync(dir)) return [];
  let names = [];
  try { names = readdirSync(dir); } catch { return []; }
  const out = [];
  for (const n of names) {
    if (!n.endsWith('.json')) continue;
    try {
      const raw = JSON.parse(readFileSync(join(dir, n), 'utf8'));
      if (raw && typeof raw.change === 'string' && typeof raw.status === 'string') {
        out.push({ ...raw, __file: n });
      }
    } catch { /* 脏件跳过(宁可漏报不阻断) */ }
  }
  return out;
}

/**
 * 写终态 marker(整文件原子替换语义;失败抛给调用方——写失败不阻断主链,调用方 catch)。
 * @param {string} cwd @param {object} platformOpts
 * @param {string} change @param {'pending'|'ok'|'failed'} status @param {string|null} [detail]
 */
export async function writeFinalSyncMarker(cwd, platformOpts, change, status, detail = null) {
  const runtimeRoot = await resolveRoot(cwd, platformOpts);
  const dir = finalSyncDir(runtimeRoot);
  mkdirSync(dir, { recursive: true });
  const body = { change, status, ts: Date.now() };
  if (detail) body.detail = String(detail).slice(0, 200);
  writeFileSync(join(dir, markerFileName(change)), JSON.stringify(body));
}

/**
 * 读全部终态 marker(附带 __file 供消费方定位删除);目录缺失返回 [],脏件跳过不抛。
 * @param {string} cwd @param {object} platformOpts @returns {Promise<Array<object>>}
 */
export async function readFinalSyncMarkers(cwd, platformOpts) {
  const runtimeRoot = await resolveRoot(cwd, platformOpts);
  return readMarkersSync(runtimeRoot);
}

/**
 * bg 子进程侧收敛:对 pending marker 逐个补推一次并按 sync treeOk 写 ok/failed。
 * 主轮 triggerSync 通常已把树推完,此处补推多为增量 no-op、仅取结果收敛 marker。
 * 单 marker 失败不影响其余;整体异常由调用方 catch(bg 轮循环 best-effort 契约)。
 * @param {string} cwd @param {object} platformOpts
 * @param {object} [opts] { syncImpl(注入缝,默认 sync.js sync) }
 */
export async function finalizePendingFinalSyncMarkers(cwd, platformOpts = {}, opts = {}) {
  const runtimeRoot = await resolveRoot(cwd, platformOpts);
  const pending = readMarkersSync(runtimeRoot).filter((m) => m.status === 'pending');
  if (pending.length === 0) return;
  const syncImpl = opts.syncImpl ?? (async (name) => (await import('./sync.js')).sync(name, cwd, {}));
  const dir = finalSyncDir(runtimeRoot);
  for (const m of pending) {
    let ok = false;
    let detail = null;
    try {
      const r = await syncImpl(m.change);
      ok = !!(r && r.treeOk === true);
      if (!ok) detail = (r && r.errors && r.errors[0]) || '文件树通道未确认收敛(treeOk!=true)';
    } catch (e) {
      detail = (e && e.message) || String(e);
    }
    try {
      const body = { change: m.change, status: ok ? 'ok' : 'failed', ts: Date.now() };
      if (!ok && detail) body.detail = String(detail).slice(0, 200);
      writeFileSync(join(dir, markerFileName(m.change)), JSON.stringify(body));
    } catch { /* 收敛写失败留 pending,由 TTL 验证路径兜底 */ }
  }
}

/**
 * 命令侧消费:ok 静默清理;failed 🚨 横幅+自救命令后清理;pending 未超 TTL 跳过
 * (等 bg 收敛),超 TTL 做一次验证性 sync——成功静默清理,失败 🚨 补报后清理
 * (宁可重复不静默;误报成本低且 platform sync 手动即真相)。全程容错不阻断主命令。
 * @param {string} cwd @param {object} platformOpts
 * @param {object} [opts] { syncImpl, now, ttl(默认 FINAL_SYNC_PENDING_TTL_MS) }
 */
export async function consumeFinalSyncMarkers(cwd, platformOpts = {}, opts = {}) {
  const runtimeRoot = await resolveRoot(cwd, platformOpts);
  const markers = readMarkersSync(runtimeRoot);
  if (markers.length === 0) return;
  const now = opts.now ?? Date.now();
  const ttl = opts.ttl ?? FINAL_SYNC_PENDING_TTL_MS;
  const syncImpl = opts.syncImpl ?? (async (name) => (await import('./sync.js')).sync(name, cwd, {}));
  const dir = finalSyncDir(runtimeRoot);
  for (const m of markers) {
    try {
      if (m.status === 'ok') {
        rmSync(join(dir, m.__file), { force: true });
        continue;
      }
      if (m.status === 'failed') {
        console.error(`🚨 ${FINAL_SYNC_WARN_TAG} 变更「${m.change}」归档/删除终态未确认同步到平台：${m.detail || '文件树通道未确认收敛'}`);
        console.error(`   平台变更中心可能滞留「进行中」半态。自救（幂等）：sillyspec platform sync --change ${m.change}`);
        rmSync(join(dir, m.__file), { force: true });
        continue;
      }
      // pending:未超 TTL 等 bg 收敛;超 TTL 验证性同步定生死
      if (now - (m.ts || 0) < ttl) continue;
      let ok = false;
      try {
        const r = await syncImpl(m.change);
        ok = !!(r && r.treeOk === true);
      } catch { ok = false; }
      if (ok) {
        rmSync(join(dir, m.__file), { force: true });
        continue;
      }
      console.error(`🚨 ${FINAL_SYNC_WARN_TAG} 变更「${m.change}」终态推送超时未收敛（验证性同步失败）。`);
      console.error(`   平台变更中心可能滞留「进行中」半态。自救（幂等）：sillyspec platform sync --change ${m.change}`);
      rmSync(join(dir, m.__file), { force: true });
    } catch { /* 单 marker 消费失败跳过,不影响其余与主命令 */ }
  }
}
