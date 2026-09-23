/**
 * spec-sync 后台异步执行（detached 子进程）。
 *
 * 背景（2026-09-20 用户反馈：末步 --done 因 spec-sync 网络同步约 4 分钟不返回）：
 * triggerSync 的 17 个调用点全部 fire-and-forget，但 Node 进程退出要等事件循环排空——
 * 在飞 fetch 拖住进程，CLI 输出打完后仍要等网络收尾才返回 shell（平台慢时分钟级体感
 * hang；本机制落地当天的会话启动命令尾部 3 行 [spec-sync] 已同步 逐条等网络，现场即
 * 实证）。8s 总熔断（raceWithAbort）只保证「最多等 8s」，治标；本模块治本：同步整体
 * 挪进 detached 后台子进程，父进程 spawn + unref 后立即返回，命令零网络尾巴。
 *
 * 架构（父侧/子侧同一模块，职责分开）：
 * - 父侧 spawnBackgroundSync（shared.js triggerSync 唯一接入点调用）：
 *   ① 未连接平台预判（sync.js peekPlatformConnected 同源判据）——未连接不 spawn，
 *     本地独立用户零开销零行为变化；② 单飞锁判定：活锁 → rerunQueued 置位合并
 *     （跑完当前轮再补一轮，防进程堆积），无锁/死锁 → spawn detached 子进程。
 * - 子侧 runBgSyncFromEnv（node -e bootstrap 动态 import 本模块）：写锁 → 循环
 *   〔清 rerunQueued → triggerSync inline 执行一轮 → 期间有新请求则再来一轮〕，
 *   上限 5 轮 / 总预算 ~2.5min → 清锁退出。轮前清位 + 轮后查位：清位后本轮树 hash
 *   晚于清位时刻，天然覆盖此后到达的状态；hash 之后到达的靠置位标记触发下一轮。
 * - 子进程 stdout/stderr 接 <runtimeRoot>/spec-sync-bg.log（append，超 1MB 截尾保
 *   后 512KB）：[spec-sync]/[sync] 的 warn/冲突横幅全量留痕，不进主命令输出也不再丢。
 *
 * 与既有机制的交互：
 * - raceWithAbort / SILLYSPEC_SYNC_TIMEOUT_MS 不动——inline 路径原样。后台轮预算 =
 *   max(resolveSyncTotalTimeoutMs(), 45s)：后台无人等待，放宽到 45s 提高「慢平台真的
 *   同步成功」概率（2026-09-07 平台 >8s 响应间歇熔断的 pain 点在后台模式下自然消解）。
 * - sync-noise.js 噪音闸 / spec-sync-conflict-*.json / 基线快照在子进程内照常工作
 *   （同一 .runtime 目录，跨进程 marker 语义不变）。
 * - 冲突可见性不降级：横幅进日志文件 + 冲突文件照落，下一条命令 progress show 照常
 *   红标提示（resolve 三态处置入口不变）。
 * - SILLYSPEC_SYNC_BG=0 逃生阀：triggerSync 回落 inline（测试断言进程内行为/用户自救）。
 *
 * 循环 import 说明：本模块与 shared.js 双向引用（shared 调本模块 spawnBackgroundSync、
 * 本模块两侧调 shared 的 triggerSync/resolveRuntimeRoot/resolveSyncTotalTimeoutMs）。
 * 对 shared 的引用一律走函数内动态 import，避免静态环（ESM 环可运行但初始化序脆弱，
 * 刻意不赌）；父进程内 shared.js 已加载，动态 import 走缓存无额外成本。
 */
import { spawn } from 'child_process';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from 'fs';
import { join } from 'path';

export const BG_LOCK_FILENAME = 'spec-sync-bg.lock';
export const BG_LOG_FILENAME = 'spec-sync-bg.log';

// 后台轮参数：单轮预算下限（与 env SILLYSPEC_SYNC_TIMEOUT_MS 取 max）、轮数与总预算帽
// （防慢平台下无限续轮）；锁时效（pid 活性之外的第二道判死——pid 复用假活兜底，
// 子进程自身总预算 ~2.5min + 收尾余量远小于该值，超时必是异常残留）。
const BG_ROUND_FLOOR_MS = 45_000;
const BG_MAX_ROUNDS = 5;
const BG_TOTAL_BUDGET_MS = 150_000;
const LOCK_STALE_MS = 15 * 60 * 1000;
const LOG_TRUNCATE_THRESHOLD = 1_000_000;
const LOG_TRUNCATE_KEEP = 512 * 1024;

// 终态补推扫描窗口与上限（2026-09-23 quick ql-20260923-007）：候选取 last_active 倒序
// 前 50 行（老终态缺位也收敛，但不全表扫描）；一轮最多补 3 条（防多缺位风暴挤爆预算）。
const TERMINAL_SWEEP_CANDIDATES = 50;
export const TERMINAL_SWEEP_MAX = 3;

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

/** 读后台单飞锁（缺失/损坏 → null）。 */
export function readBgSyncLock(runtimeRoot) {
  try {
    const raw = readFileSync(join(runtimeRoot, BG_LOCK_FILENAME), 'utf8');
    const obj = JSON.parse(raw);
    return obj && typeof obj === 'object' ? obj : null;
  } catch {
    return null;
  }
}

function writeBgSyncLock(runtimeRoot, lock) {
  mkdirSync(runtimeRoot, { recursive: true });
  const tmp = join(runtimeRoot, `${BG_LOCK_FILENAME}.${process.pid}.tmp`);
  writeFileSync(tmp, JSON.stringify(lock) + '\n', 'utf8');
  renameSync(tmp, join(runtimeRoot, BG_LOCK_FILENAME));
}

function removeBgSyncLock(runtimeRoot) {
  try {
    const p = join(runtimeRoot, BG_LOCK_FILENAME);
    if (existsSync(p)) unlinkSync(p);
  } catch { /* 清锁失败：残留锁按时效/pid 判死后自动接管，不影响正确性 */ }
}

/**
 * 锁活性判定（pid 活 + 未超时）。纯函数（pid 探测单列 isPidAlive 便于注入测试）。
 * @param {object|null} lock readBgSyncLock 产物
 * @param {number} [now] 注入时钟（测试用）
 */
export function isBgSyncLockLive(lock, now = Date.now()) {
  if (!lock || !Number.isInteger(lock.pid) || lock.pid <= 0) return false;
  if (typeof lock.startedAt !== 'number') return false;
  if (now - lock.startedAt > LOCK_STALE_MS) return false;
  return isPidAlive(lock.pid);
}

/** 子进程起步截尾日志（>1MB 保后 512KB，从整行边界起）。失败只影响日志体积。 */
function truncateLogIfNeeded(runtimeRoot) {
  try {
    const p = join(runtimeRoot, BG_LOG_FILENAME);
    if (statSync(p).size <= LOG_TRUNCATE_THRESHOLD) return;
    const buf = readFileSync(p);
    const keep = buf.subarray(Math.max(0, buf.length - LOG_TRUNCATE_KEEP));
    const nl = keep.indexOf(10);
    writeFileSync(p, nl >= 0 ? keep.subarray(nl + 1) : keep);
  } catch { /* 截断失败：继续 append */ }
}

/** 子进程 bootstrap：node -e 动态 import 本模块（file URL 精确定位，不依赖 CLI 安装形态）。 */
function buildChildBootstrap() {
  const selfUrl = new URL('./bg-sync.js', import.meta.url).href;
  return `import(${JSON.stringify(selfUrl)}).then(m=>m.runBgSyncFromEnv()).catch(e=>{console.error('[spec-sync-bg] 后台同步进程异常退出:',(e&&e.message)||e)});`;
}

/**
 * 父侧后台同步入口（triggerSync 调用，不直接被业务代码使用）。
 *
 * @returns {Promise<{status:'spawned'|'coalesced'|'not-connected', logPath?:string}>}
 *   spawned=已起后台子进程；coalesced=活锁在跑、本轮状态已并入其下一轮（rerunQueued）；
 *   not-connected=未连接平台（调用方回落 inline 路径=与旧行为一致的静默 no-op）。
 *   spawn 失败抛异常（调用方 catch 降级 inline，绝不因后台化阻断主流程）。
 */
export async function spawnBackgroundSync(cwd, changeName, platformOpts = {}, opts = {}) {
  const syncMod = await import('../sync.js');
  if (!syncMod.peekPlatformConnected(cwd)) return { status: 'not-connected' };

  const { resolveRuntimeRoot } = await import('./shared.js');
  const runtimeRoot = resolveRuntimeRoot(platformOpts, platformOpts?.specRoot || join(cwd, '.sillyspec'));

  const lock = readBgSyncLock(runtimeRoot);
  if (isBgSyncLockLive(lock)) {
    // 单飞合并：活后台轮在跑，把「还有新状态要同步」并入其下一轮。置位失败（并发写锁）
    // 只损失合并信号——后台轮收尾锁自清，下一条命令重新 spawn，收敛不丢。
    try { writeBgSyncLock(runtimeRoot, { ...lock, rerunQueued: true }); } catch { /* 见上 */ }
    return { status: 'coalesced', logPath: join(runtimeRoot, BG_LOG_FILENAME) };
  }

  // 日志 fd：子进程 stdout/stderr 直接 append 进日志文件（跨平台 fd 继承）；开不了退 ignore
  const logPath = join(runtimeRoot, BG_LOG_FILENAME);
  let stdio = ['ignore', 'ignore', 'ignore'];
  let logFd = null;
  try {
    mkdirSync(runtimeRoot, { recursive: true });
    logFd = openSync(logPath, 'a');
    stdio = ['ignore', logFd, logFd];
  } catch {
    logFd = null;
  }

  const env = {
    ...process.env,
    SILLYSPEC_BG_SYNC_CHANGE: String(changeName),
    SILLYSPEC_BG_SYNC_CWD: String(cwd),
  };
  if (platformOpts?.specRoot) env.SILLYSPEC_BG_SYNC_SPEC_ROOT = String(platformOpts.specRoot);
  if (platformOpts?.runtimeRoot) env.SILLYSPEC_BG_SYNC_RUNTIME_ROOT = String(platformOpts.runtimeRoot);

  try {
    const child = (opts.spawnImpl || spawn)(process.execPath, ['-e', buildChildBootstrap()], {
      cwd,
      detached: true,
      stdio,
      windowsHide: true,
      env,
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
 * 归档终态补推扫描：DB 里 status=archived/deleted 且本地终态脏于平台镜像
 * （last_local_modified_ts > last_synced_platform_ts，或从未同步）的变更名，last_active
 * 倒序取前 TERMINAL_SWEEP_MAX 条。
 *
 * 背景（2026-09-22 session-fork-continuation 实证）：终态推送依赖归档后还有一轮
 * triggerSync——bg 子进程 best-effort，spawn 失败/单飞锁竞态/会话在归档后戛然而止都会
 * 吞掉最后一轮，本地已归档而平台镜像停在旧阶段（verify），此后再无命令碰该变更即永久
 * 滞后。归档/删除收尾均 _touchLocalModified（change-registry 语义：本地状态推进），
 * 谓词即「终态戳晚于最后一次成功推送」。补推幂等（sync() 对 archived/deleted 推终态+
 * 墓碑，POST 幂等），任意后续命令触发的 bg 轮顺带收敛。
 * 时钟口径：last_synced_platform_ts 是服务端时间，本地钟超前服务端时至多多补一轮幂等
 * 推送（无副作用），且 synced 随每次成功推进，自愈。
 * 库路径与 sync() 内 ProgressManager 同源（resolvePlatformSpecDir(cwd)：平台指针→向上
 * 发现→cwd/.sillyspec 默认；platformOpts.specRoot 不进库路径——与 triggerSync 对齐），
 * 保证扫的库就是主轮推的库；解析抛错（指针失效等）→ 空集跳过本轮（best-effort）。
 */
export async function collectTerminalSyncPending(cwd) {
  const { resolvePlatformSpecDir, ProgressManager } = await import('../progress.js');
  let specDir = null;
  try { specDir = resolvePlatformSpecDir(cwd); } catch { return []; }
  if (!specDir) return [];
  if (!existsSync(join(specDir, '.runtime', 'sillyspec.db'))) return [];
  const pm = new ProgressManager({ specDir });
  const rows = pm._ensureDB(cwd).getDb().prepare(
    `SELECT name, last_active, last_synced_platform_ts, last_local_modified_ts
     FROM changes WHERE status IN ('archived','deleted')
     ORDER BY last_active DESC LIMIT ${TERMINAL_SWEEP_CANDIDATES}`
  ).all();
  const pending = [];
  for (const r of rows) {
    if (!r.name) continue;
    const synced = r.last_synced_platform_ts || '';
    const local = r.last_local_modified_ts || '';
    // 脏度戳必须在场（fail-closed）：D-013 之前的陈年行两戳皆空，无从判滞后——补推只会
    // 给平台凭空造新行；synced 空而 local 在场 = 从未成功推送过但终态有据 → 补。
    if (local && (!synced || local > synced)) pending.push(r.name);
    if (pending.length >= TERMINAL_SWEEP_MAX) break;
  }
  return pending;
}

/**
 * 子侧入口（bootstrap 经 env 传参调起；env 注入默认值供测试覆盖）。
 *
 * 单飞循环：写锁（本 pid）→ 每轮清 rerunQueued 后 inline 跑一轮 triggerSync →
 * 轮末查位，被置位且预算未尽则续轮（迟到状态收敛），否则清锁退出。
 * 锁 pid 非本进程（双 spawn 竞态窗口被后写者接管）→ 让位退出防双跑。
 */
export async function runBgSyncFromEnv(env = process.env) {
  const changeName = env.SILLYSPEC_BG_SYNC_CHANGE;
  const cwd = env.SILLYSPEC_BG_SYNC_CWD;
  if (!changeName || !cwd) return;

  const platformOpts = {};
  if (env.SILLYSPEC_BG_SYNC_SPEC_ROOT) platformOpts.specRoot = env.SILLYSPEC_BG_SYNC_SPEC_ROOT;
  if (env.SILLYSPEC_BG_SYNC_RUNTIME_ROOT) platformOpts.runtimeRoot = env.SILLYSPEC_BG_SYNC_RUNTIME_ROOT;

  const { triggerSync, resolveRuntimeRoot, resolveSyncTotalTimeoutMs } = await import('./shared.js');
  const runtimeRoot = resolveRuntimeRoot(platformOpts, platformOpts.specRoot || join(cwd, '.sillyspec'));
  truncateLogIfNeeded(runtimeRoot);
  const startedAt = Date.now();
  writeBgSyncLock(runtimeRoot, { pid: process.pid, startedAt, change: changeName, rerunQueued: false });

  const roundTimeoutMs = Math.max(resolveSyncTotalTimeoutMs(), BG_ROUND_FLOOR_MS);
  const deadline = startedAt + BG_TOTAL_BUDGET_MS;
  for (let round = 1; round <= BG_MAX_ROUNDS; round++) {
    // 轮前清位：本轮 triggerSync 的树 hash 晚于清位时刻，覆盖此后到达的全部状态；
    // 读→写间隙内的置位存在丢失窗口（毫秒级），由下一条命令的同步兜底收敛。
    const cur = readBgSyncLock(runtimeRoot);
    writeBgSyncLock(runtimeRoot, { pid: process.pid, startedAt: cur?.startedAt || startedAt, change: changeName, rerunQueued: false });
    console.log(`[spec-sync-bg] 第 ${round}/${BG_MAX_ROUNDS} 轮开始 ${new Date().toISOString()}: ${changeName}`);
    try {
      await triggerSync(cwd, changeName, platformOpts, { inline: true, timeoutMs: roundTimeoutMs });
    } catch (e) {
      console.warn(`[spec-sync-bg] 本轮同步异常（best-effort，下一条命令自动重试）: ${(e && e.message) || e}`);
    }
    const lock = readBgSyncLock(runtimeRoot);
    if (!lock || lock.pid !== process.pid) {
      console.warn('[spec-sync-bg] 锁已不属于本进程（被并行 spawn 接管），让位退出');
      return;
    }
    if (!lock.rerunQueued) break;
    if (Date.now() + roundTimeoutMs > deadline) {
      console.warn('[spec-sync-bg] 总预算用尽，残留待同步状态由下一条命令的同步接管');
      break;
    }
  }
  // 终态补推（2026-09-23 quick ql-20260923-007）：主轮收尾后扫 DB，补推「本地已达终态但
  // 平台镜像滞后」的变更（session-fork 实证缺口）。幂等；主变更刚推过跳过；预算耗尽留下一轮。
  try {
    const pending = await collectTerminalSyncPending(cwd);
    for (const name of pending) {
      if (name === changeName) continue;
      if (Date.now() + roundTimeoutMs > deadline) {
        console.warn('[spec-sync-bg] 总预算用尽，终态补推剩余条目由下一轮 bg 接管');
        break;
      }
      console.log(`[spec-sync-bg] 终态补推（本地终态未被平台镜像）: ${name}`);
      try {
        await triggerSync(cwd, name, platformOpts, { inline: true, timeoutMs: roundTimeoutMs });
      } catch (e) {
        console.warn(`[spec-sync-bg] 终态补推异常（best-effort，下轮重试）: ${(e && e.message) || e}`);
      }
    }
  } catch (e) {
    console.warn(`[spec-sync-bg] 终态补推扫描异常（best-effort）: ${(e && e.message) || e}`);
  }
  console.log(`[spec-sync-bg] 后台同步完成 ${new Date().toISOString()}: ${changeName}`);
  removeBgSyncLock(runtimeRoot);
}

export default { spawnBackgroundSync, runBgSyncFromEnv, readBgSyncLock, isBgSyncLockLive, isPidAlive };
