/**
 * watcher.js — change 产物签名 watcher（R7 切片一，detached 观测旁路）。
 *
 * 背景（2026-09-22-r7-protocol-surgery 切片一 / D-001）：协议对话与平台心跳共线（信道
 * 混乱）——进度信号只能靠 CLI 调用推进。本模块把观测从协议解耦：change 启动即拉起
 * detached 监听进程，从**产物签名**（文件/git/工件三类源）推断阶段并落事件流。事件恒带
 * provisional:true，平台 ingest 只展示不判定——`--done`（或 flow done）是唯一真相，
 * watcher 是 best-effort 缓存，崩溃/不 spawn 零影响主流程。
 *
 * 结构循 src/run/bg-sync.js（spawn detached + windowsHide + 单飞锁 + 日志截尾），两处
 * 语义差异：①长驻——锁加 heartbeatAt 心跳字段（30s 刷新，5min 无心跳或 pid 死判死；
 * bg-sync 只有 startedAt 时效）；②**未连接平台也 spawn**（本地 jsonl 是事件唯一真相源，
 * 平台推送是展示面增强；bg-sync 的 not-connected 短路不适用）。
 *
 * 观测机制=轮询快照 diff（3s，弃 fs.watch：Windows/网络盘跨平台不可靠+递归噪声；事件数
 * 与 CLI 调用数解耦是验收钉，轮询天然满足）。轮询面收窄：change 子树已知产物 +
 * git HEAD 头指针 + verify-quality-scan 记录——不扫全仓。
 *
 * 平台推送：POST {platform.url}/api/changes/{name}/events 专用端点，实现模式循
 * src/agent-session-log.js 的 pushAgentLogToPlatform（凭据读取同 readPlatformPushConfig
 * 的 local.yaml platform 段/env 双通道——该函数未导出且 agent-session-log 属他任务
 * allowed_paths，此处同模式自建；5s 超时+best-effort+env SILLYSPEC_WATCHER_PUSH=0 开关；
 * 未配置/非 2xx/网络失败静默降级本地-only——平台未升级该端点是有声明的跨系统依赖）。
 *
 * 副产品：阶段墙钟拆账（产物事件时间序列聚合）落 .runtime/watcher-stage-timing-<change>.
 * json，替代 transcript 抽取。
 *
 * 生命周期：change 目录移入 archive（archived 终态事件）→ 自退；空闲 6h 无事件 → 自退；
 * SILLYSPEC_WATCHER=0 逃生阀（父侧不 spawn）。
 */
import { spawn } from 'child_process';
import {
  appendFileSync, closeSync, existsSync, mkdirSync, openSync, readdirSync,
  readFileSync, renameSync, statSync, unlinkSync, writeFileSync,
} from 'fs';
import { createHash } from 'crypto';
import { join } from 'path';
import { gitQuiet } from './git-helper.js';

export const WATCHER_LOCK_FILENAME = 'watcher.lock';
const WATCHER_LOG_FILENAME = 'watcher.log';

const HEARTBEAT_INTERVAL_MS = 30_000;
const LEASE_STALE_MS = 5 * 60_000;
const POLL_INTERVAL_MS = 3_000;
const IDLE_EXIT_MS = 6 * 60 * 60_1000;
// 硬寿命帽：孤儿绝对上限（2026-09-22 泄漏实证兜底）——无论活跃与否 12h 必退
const MAX_LIFETIME_MS = 12 * 60 * 60_000;
const PUSH_TIMEOUT_MS = 5_000;
const LOG_TRUNCATE_THRESHOLD = 1_000_000;
const LOG_TRUNCATE_KEEP = 512 * 1024;

/** 已知产物 → 阶段映射（阶段推断=产物签名；未列出的文件不发事件，防噪声）。 */
const STAGE_FILES = {
  'proposal.md': 'proposal',
  'requirements.md': 'requirements',
  'design.md': 'design',
  'plan.md': 'plan',
  'tasks.md': 'tasks',
  'decisions.md': 'proposal',
  'verify-result.md': 'verify',
  'module-impact.md': 'verify',
  'symbol-impact.md': 'verify',
};

/** pid 活性探测（跨平台）：signal 0 探测；EPERM = 进程存在但属他户，保守按活。 */
function isPidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e && e.code === 'EPERM';
  }
}

/** 读 watcher 单飞锁（缺失/损坏 → null）。 */
export function readWatcherLock(runtimeRoot) {
  try {
    const raw = readFileSync(join(runtimeRoot, WATCHER_LOCK_FILENAME), 'utf8');
    const obj = JSON.parse(raw);
    return obj && typeof obj === 'object' ? obj : null;
  } catch {
    return null;
  }
}

function writeWatcherLock(runtimeRoot, lock) {
  mkdirSync(runtimeRoot, { recursive: true });
  const tmp = join(runtimeRoot, `${WATCHER_LOCK_FILENAME}.${process.pid}.tmp`);
  writeFileSync(tmp, JSON.stringify(lock) + '\n', 'utf8');
  renameSync(tmp, join(runtimeRoot, WATCHER_LOCK_FILENAME));
}

function removeWatcherLock(runtimeRoot) {
  try {
    const p = join(runtimeRoot, WATCHER_LOCK_FILENAME);
    if (existsSync(p)) unlinkSync(p);
  } catch { /* 清锁失败：残留锁按心跳/pid 判死后自动接管，不影响正确性 */ }
}

/**
 * 租约活性判定（心跳新鲜 + pid 活）。纯函数（pid 探测单列 isPidAlive 便于注入测试）。
 * 与 bg-sync 锁的差异：心跳字段 heartbeatAt 是长驻租约的判死主锚（30s 刷新/5min 过期），
 * startedAt 仅作审计信息——pid 复用假活由心跳过期兜底。
 */
export function isWatcherLeaseLive(lock, now = Date.now()) {
  if (!lock || !Number.isInteger(lock.pid) || lock.pid <= 0) return false;
  if (typeof lock.heartbeatAt !== 'number') return false;
  if (now - lock.heartbeatAt > LEASE_STALE_MS) return false;
  return isPidAlive(lock.pid);
}

function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

function countCheckboxes(text) {
  const checked = (text.match(/- \[x\]/g) || []).length;
  const unchecked = (text.match(/- \[ \]/g) || []).length;
  return { checked, total: checked + unchecked };
}

/**
 * 构建一次快照（纯读盘+git 头指针；不入事件——推断在 inferEvents 纯函数，测试主入口）。
 * @returns {{ts:number, archived:boolean, head:string|null, files:Object, scan:Object|null}}
 *   files: { <相对 changeDir 路径>: { hash, checked, total } }
 */
export function buildSnapshot({ changeDir, cwd, runtimeRoot, changeName, readFileSyncImpl = readFileSync, statSyncImpl = statSync, gitHeadImpl }) {
  const snap = { ts: Date.now(), archived: false, head: null, files: {}, scan: null };
  if (!existsSync(changeDir)) {
    snap.archived = true;
  } else {
    for (const [name, stage] of Object.entries(STAGE_FILES)) {
      const p = join(changeDir, name);
      if (!existsSync(p)) continue;
      try {
        const text = readFileSyncImpl(p, 'utf8');
        snap.files[name] = { hash: sha256(text), stage, ...countCheckboxes(text) };
      } catch { /* 读失败按未变更处理，下轮重试 */ }
    }
    const tasksDir = join(changeDir, 'tasks');
    if (existsSync(tasksDir)) {
      for (const ent of readdirSync(tasksDir)) {
        if (!ent.endsWith('.md')) continue;
        const rel = `tasks/${ent}`;
        try {
          const text = readFileSyncImpl(join(tasksDir, ent), 'utf8');
          snap.files[rel] = { hash: sha256(text), stage: 'tasks', ...countCheckboxes(text) };
        } catch { /* 同上 */ }
      }
    }
  }
  if (typeof gitHeadImpl === 'function') {
    snap.head = gitHeadImpl();
  } else {
    const out = gitQuiet(cwd, ['rev-parse', '--short', 'HEAD']);
    snap.head = typeof out === 'string' && out.trim() ? out.trim() : null;
  }
  const scanPath = join(runtimeRoot, `verify-quality-scan-${changeName}.json`);
  try {
    const st = statSyncImpl(scanPath);
    snap.scan = { mtimeMs: Math.round(st.mtimeMs), size: st.size };
  } catch {
    snap.scan = null;
  }
  return snap;
}

/**
 * 快照 diff → 事件（纯函数）。每事件恒带 provisional:true（护栏#5：平台 ingest 只展示
 * 不判定）。事件面：文件首现/内容变更/checkbox 翻格/新提交/质量扫描记录/archived 终态。
 */
export function inferEvents(prev, next) {
  if (!prev || !next) return [];
  const events = [];
  const mk = (kind, stage, detail) => ({ ts: next.ts, kind, stage: stage ?? null, detail: detail ?? null, provisional: true });
  if (!prev.archived && next.archived) {
    events.push(mk('archived', 'archive', 'change 目录已移入 archive'));
    return events;
  }
  const keys = new Set([...Object.keys(prev.files || {}), ...Object.keys(next.files || {})]);
  for (const key of keys) {
    const p = prev.files[key];
    const n = next.files[key];
    if (!p && n) {
      events.push(mk('file', n.stage, `${key} 出现`));
      if (n.checked > 0) events.push(mk('task-done', n.stage, `checked 0→${n.checked}`));
    } else if (p && n && p.hash !== n.hash) {
      events.push(mk('file-update', n.stage, `${key} 内容变更`));
    }
    if (p && n && n.checked > p.checked) {
      events.push(mk('task-done', n.stage ?? 'tasks', `checked ${p.checked}→${n.checked}`));
    }
  }
  if (prev.head && next.head && prev.head !== next.head) {
    events.push(mk('commit', null, next.head));
  }
  if (next.scan && (!prev.scan || prev.scan.mtimeMs !== next.scan.mtimeMs || prev.scan.size !== next.scan.size)) {
    events.push(mk('verify', 'verify', prev.scan ? '质量扫描记录更新' : '质量扫描记录出现'));
  }
  return events;
}

/**
 * 事件序列 → 阶段墙钟拆账（纯函数）：每 stage 首末事件时间差，按首事件时序输出。
 */
export function aggregateStageTiming(events) {
  const byStage = new Map();
  for (const e of events) {
    if (!e || typeof e.ts !== 'number' || !e.stage) continue;
    let rec = byStage.get(e.stage);
    if (!rec) {
      rec = { stage: e.stage, firstTs: e.ts, lastTs: e.ts, events: 0 };
      byStage.set(e.stage, rec);
    }
    rec.lastTs = Math.max(rec.lastTs, e.ts);
    rec.firstTs = Math.min(rec.firstTs, e.ts);
    rec.events += 1;
  }
  return [...byStage.values()]
    .sort((a, b) => a.firstTs - b.firstTs)
    .map((r) => ({ stage: r.stage, firstTs: r.firstTs, lastTs: r.lastTs, durationMs: r.lastTs - r.firstTs, events: r.events }));
}

/** watcher 平台推送凭据（模式同 agent-session-log readPlatformPushConfig：env > local.yaml platform 段）。 */
function readWatcherPushConfig(specBase, env = process.env) {
  if (env.SILLYHUB_PLATFORM_URL && env.SILLYHUB_PLATFORM_TOKEN) {
    return { url: env.SILLYHUB_PLATFORM_URL, token: env.SILLYHUB_PLATFORM_TOKEN };
  }
  try {
    const yamlPath = join(specBase, 'local.yaml');
    if (!existsSync(yamlPath)) return null;
    const lines = readFileSync(yamlPath, 'utf8').split(/\r?\n/);
    let inPlatform = false;
    const cfg = {};
    for (const line of lines) {
      if (!line.trim() || line.trim().startsWith('#')) continue;
      if (!/^\s/.test(line)) inPlatform = line.startsWith('platform:');
      else if (inPlatform) {
        const m = line.match(/^\s+(url|token)\s*:\s*(.*)$/);
        if (m) {
          let v = m[2].trim();
          if (v.length >= 2 && ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))) v = v.slice(1, -1);
          if (v) cfg[m[1]] = v;
        }
      }
    }
    return cfg.url && cfg.token ? cfg : null;
  } catch {
    return null;
  }
}

/**
 * 事件批量推平台（best-effort，唯一非本地副作用）：专用 events 端点，5s 熔断，
 * 任何失败只 warn——本地 jsonl 已是事件唯一真相源，平台是展示面。
 */
async function pushEventsToPlatform({ specBase, changeName, events, env = process.env, fetchImpl = fetch }) {
  if (env.SILLYSPEC_WATCHER_PUSH === '0' || events.length === 0) return { pushed: null };
  const cfg = readWatcherPushConfig(specBase, env);
  if (!cfg) return { pushed: null, reason: 'no-config' };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PUSH_TIMEOUT_MS);
  try {
    const res = await fetchImpl(`${cfg.url.replace(/\/+$/, '')}/api/changes/${encodeURIComponent(changeName)}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.token}` },
      body: JSON.stringify({ events }),
      signal: controller.signal,
    });
    if (!res.ok) {
      console.warn(`[watcher] 事件推送 → HTTP ${res.status}（本地 jsonl 已兜底）`);
      return { pushed: false, reason: `http-${res.status}` };
    }
    return { pushed: true };
  } catch (err) {
    const msg = err && err.name === 'AbortError' ? '超时' : (err && err.message ? err.message : err);
    console.warn(`[watcher] 事件推送失败: ${msg}（本地 jsonl 已兜底）`);
    return { pushed: false, reason: 'network' };
  } finally {
    clearTimeout(timer);
  }
}

/** 子进程起步截尾日志（>1MB 保后 512KB，整行边界起）。失败只影响日志体积。 */
function truncateLogIfNeeded(runtimeRoot) {
  try {
    const p = join(runtimeRoot, WATCHER_LOG_FILENAME);
    if (statSync(p).size <= LOG_TRUNCATE_THRESHOLD) return;
    const buf = readFileSync(p);
    const keep = buf.subarray(Math.max(0, buf.length - LOG_TRUNCATE_KEEP));
    const nl = keep.indexOf(10);
    writeFileSync(p, nl >= 0 ? keep.subarray(nl + 1) : keep);
  } catch { /* 截断失败：继续 append */ }
}

/** 子进程 bootstrap：node -e 动态 import 本模块（file URL 精确定位，不依赖 CLI 安装形态）。 */
function buildChildBootstrap() {
  const selfUrl = new URL('./watcher.js', import.meta.url).href;
  return `import(${JSON.stringify(selfUrl)}).then(m=>m.runWatcherFromEnv()).catch(e=>{console.error('[watcher] 监听进程异常退出:',(e&&e.message)||e)});`;
}

/**
 * 父侧入口（run/command.js 在 effectiveChange 解析后无条件调用，锁合并）。
 * 未连接平台也 spawn（本地 jsonl 是主目标）；SILLYSPEC_WATCHER=0 逃生阀。
 * spawn 失败抛异常由调用方 catch 降级（绝不因观测旁路阻断主流程）。
 * @returns {Promise<{status:'spawned'|'coalesced'|'disabled', logPath?:string}>}
 */
export async function spawnWatcher(cwd, changeName, opts = {}) {
  const env = opts.env || process.env;
  // 逃生阀/测试护栏：SILLYSPEC_WATCHER=0 显式关；NODE_TEST_CONTEXT（node:test 运行器注入）
  // 下不拉起——防全量套件每条 run 用例孵化真 detached watcher 污染测试环境。
  if (env.SILLYSPEC_WATCHER === '0' || env.NODE_TEST_CONTEXT) return { status: 'disabled' };
  const { resolveRuntimeRoot } = await import('./run/shared.js');
  const specBase = opts.specBase || join(cwd, '.sillyspec');
  const runtimeRoot = resolveRuntimeRoot(opts, specBase);

  const lock = readWatcherLock(runtimeRoot);
  if (isWatcherLeaseLive(lock)) return { status: 'coalesced', logPath: join(runtimeRoot, WATCHER_LOG_FILENAME) };

  const logPath = join(runtimeRoot, WATCHER_LOG_FILENAME);
  let stdio = ['ignore', 'ignore', 'ignore'];
  let logFd = null;
  try {
    mkdirSync(runtimeRoot, { recursive: true });
    logFd = openSync(logPath, 'a');
    stdio = ['ignore', logFd, logFd];
  } catch {
    logFd = null;
  }

  const childEnv = {
    ...env,
    SILLYSPEC_WATCHER_CHANGE: String(changeName),
    SILLYSPEC_WATCHER_CWD: String(cwd),
  };
  if (opts.specBase) childEnv.SILLYSPEC_WATCHER_SPEC_BASE = String(opts.specBase);
  if (opts.runtimeRoot) childEnv.SILLYSPEC_WATCHER_RUNTIME_ROOT = String(opts.runtimeRoot);

  try {
    const child = (opts.spawnImpl || spawn)(process.execPath, ['-e', buildChildBootstrap()], {
      cwd,
      detached: true,
      stdio,
      windowsHide: true,
      env: childEnv,
    });
    child.unref?.();
  } finally {
    if (logFd !== null) {
      try { closeSync(logFd); } catch { /* 父侧 fd 副本关闭；子进程持有继承副本 */ }
    }
  }
  return { status: 'spawned', logPath };
}

/**
 * 子侧入口（bootstrap 经 env 传参调起）。循环：心跳租约（30s 刷新，锁被他人接管即让位）
 * → 每 3s 快照 diff → 事件落 jsonl + best-effort 推平台 + 墙钟拆账重写。
 * 终态自退：archived 事件 / 空闲 6h / 锁失守。退出前清本进程锁。
 */
export async function runWatcherFromEnv(env = process.env, opts = {}) {
  const changeName = env.SILLYSPEC_WATCHER_CHANGE;
  const cwd = env.SILLYSPEC_WATCHER_CWD;
  if (!changeName || !cwd) return;

  const specBase = env.SILLYSPEC_WATCHER_SPEC_BASE || join(cwd, '.sillyspec');
  const { resolveRuntimeRoot } = await import('./run/shared.js');
  const runtimeRoot = env.SILLYSPEC_WATCHER_RUNTIME_ROOT
    ? env.SILLYSPEC_WATCHER_RUNTIME_ROOT
    : resolveRuntimeRoot({}, specBase);
  const changeDir = join(specBase, 'changes', changeName);

  truncateLogIfNeeded(runtimeRoot);
  const startedAt = Date.now();
  writeWatcherLock(runtimeRoot, { pid: process.pid, change: changeName, startedAt, heartbeatAt: startedAt });
  console.log(`[watcher] 监听开始 ${new Date().toISOString()}: ${changeName}`);

  const eventsPath = join(runtimeRoot, `watcher-events-${changeName}.jsonl`);
  const timingPath = join(runtimeRoot, `watcher-stage-timing-${changeName}.json`);
  let allEvents = [];

  const refreshHeartbeat = () => {
    const cur = readWatcherLock(runtimeRoot);
    if (!cur || cur.pid !== process.pid) {
      console.warn('[watcher] 锁已不属于本进程（被并行 spawn 接管），让位退出');
      process.exitCode = 0;
      return false;
    }
    writeWatcherLock(runtimeRoot, { ...cur, heartbeatAt: Date.now() });
    return true;
  };
  const heartbeatTimer = setInterval(() => { refreshHeartbeat(); }, HEARTBEAT_INTERVAL_MS);
  heartbeatTimer.unref?.();

  let prev = buildSnapshot({ changeDir, cwd, runtimeRoot, changeName });
  // ── 孤儿自愈三闸（2026-09-22 全套件实证漏 41 个孤儿 watcher——每 3s 轮询 git 的孤儿进程）──
  // ①出生即死：首拍已 archived（change 目录不存在/已归档）没有可观测对象，立即退出；
  // ②仓库蒸发：head 曾非空后连续 20 拍为 null（cwd/git 仓被删——测试临时目录清理）→ 退出；
  // ③硬寿命帽：无论活跃与否，超过 MAX_LIFETIME_MS 绝对退出（孤儿绝对上限兜底）。
  if (prev.archived) {
    console.log('[watcher] 首拍即 archived（无可观测对象），不启动监听');
    clearInterval(heartbeatTimer);
    removeWatcherLock(runtimeRoot);
    return;
  }
  let headNullStreak = 0;
  let everHadHead = prev.head != null;
  const hardDeadline = startedAt + MAX_LIFETIME_MS;
  let lastActivityAt = Date.now();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    await new Promise((r) => setTimeout(r, opts.pollIntervalMs ?? POLL_INTERVAL_MS));
    if (!refreshHeartbeat()) break;
    if (Date.now() > hardDeadline) {
      console.log('[watcher] 硬寿命帽自退（绝对上限兜底，防永续孤儿）');
      break;
    }

    let snap;
    try {
      snap = buildSnapshot({ changeDir, cwd, runtimeRoot, changeName });
    } catch (e) {
      console.warn(`[watcher] 快照构建异常（本轮跳过）: ${(e && e.message) || e}`);
      continue;
    }
    // 仓库蒸发闸：git 头从有到无且持续（临时仓被删）——无对象可观测，退
    if (everHadHead) {
      headNullStreak = snap.head == null ? headNullStreak + 1 : 0;
      if (headNullStreak >= 20) {
        console.log('[watcher] git 仓蒸发（头指针连续空拍），判定无可观测对象，自退');
        break;
      }
    }
    const events = inferEvents(prev, snap);
    prev = snap;
    if (events.length === 0) {
      if (Date.now() - lastActivityAt > IDLE_EXIT_MS) {
        console.log('[watcher] 空闲超时自退（6h 无事件）');
        break;
      }
      continue;
    }
    lastActivityAt = Date.now();
    allEvents = allEvents.concat(events);
    try {
      for (const e of events) appendFileSync(eventsPath, JSON.stringify(e) + '\n', 'utf8');
      writeFileSync(timingPath, JSON.stringify({ change: changeName, updatedAt: new Date().toISOString(), stages: aggregateStageTiming(allEvents) }, null, 2) + '\n', 'utf8');
    } catch (e) {
      console.warn(`[watcher] 事件落盘异常（best-effort 继续）: ${(e && e.message) || e}`);
    }
    await pushEventsToPlatform({ specBase, changeName, events, env });
    if (events.some((e) => e.kind === 'archived')) {
      console.log(`[watcher] archived 终态，监听结束: ${changeName}`);
      break;
    }
  }
  clearInterval(heartbeatTimer);
  const cur = readWatcherLock(runtimeRoot);
  if (cur && cur.pid === process.pid) removeWatcherLock(runtimeRoot);
  console.log(`[watcher] 监听结束 ${new Date().toISOString()}: ${changeName}`);
}

export { isPidAlive };
export default { spawnWatcher, runWatcherFromEnv, readWatcherLock, isWatcherLeaseLive, isPidAlive, buildSnapshot, inferEvents, aggregateStageTiming };
