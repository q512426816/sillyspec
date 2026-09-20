// spec-sync 后台异步执行（detached 子进程）验收：--done 的网络尾巴不再拖住命令返回。
//
// 背景（2026-09-20 用户反馈）：triggerSync 17 个调用点全部 fire-and-forget，但在飞 fetch
// 拖住 Node 事件循环——CLI 输出完毕后进程要等网络收尾才退出，平台慢时分钟级体感 hang
// （本会话启动命令尾部 3 行 [spec-sync] 已同步 逐条等网络，现场即实证）。8s 总熔断只是
// 「最多等 8s」治标；本批改 detached 后台子进程治本：spawn 后 unref，主进程零网络尾巴。
//
// 验收点：
// 1. 锁活性判定 isBgSyncLockLive 纯函数：null/缺 pid/过期（>15min）/死 pid → false；
//    活 pid（process.pid）→ true
// 2. spawnBackgroundSync 决策矩阵（spawnImpl 注入，不起真进程）：
//    a. 未连接平台（无 env 无 local.yaml）→ not-connected，不 spawn（本地用户零开销）
//    b. env 连接 + 无锁 → spawned：detached/windowsHide/env 四键注入/bootstrap 含
//       runBgSyncFromEnv、stdio 接日志 fd、unref 被调
//    c. env 连接 + 活锁 → coalesced：rerunQueued 置位、不 spawn（单飞防堆积）
//    d. env 连接 + 死锁（崩溃残留）→ spawned（自动接管）
// 3. triggerSync 集成（真实子进程 + mock server）：
//    a. 默认后台化：triggerSync 快速返回 → manifest GET + spec-sync POST 经后台子进程
//       到达服务器 → 锁文件自清 → 日志落 .runtime/spec-sync-bg.log
//    b. SILLYSPEC_SYNC_BG=0 逃生阀 → 回落 inline：await 返回时请求已在进程内发出
//    c. quick 会话形态（quick-<hex8> 无实体目录）→ 子进程内走 syncSpecTreeOnly 降级
//       分支（manifest+spec-sync 到达、无 progress POST 孤儿行）
//
// 隔离：os.tmpdir() 临时目录 + Node http mock server，绝不碰真实 .sillyspec/.runtime。
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import http from 'http';
import { spawn } from 'child_process';
import {
  spawnBackgroundSync,
  readBgSyncLock,
  isBgSyncLockLive,
  BG_LOCK_FILENAME,
  BG_LOG_FILENAME,
} from '../src/run/bg-sync.js';
import { triggerSync } from '../src/run/shared.js';

let failures = 0;
const assert = (cond, msg) => {
  if (cond) console.log('  ✅ ' + msg);
  else { console.error('  ❌ ' + msg); failures++; }
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitUntil(fn, timeoutMs, everyMs = 150) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (fn()) return true;
    await sleep(everyMs);
  }
  return fn();
}

const tmpRoot = mkdtempSync(join(tmpdir(), `sillyspec-bg-sync-${process.pid}-`));

console.log('\n[spec-sync-bg] 后台异步执行（detached 子进程 + 单飞锁 + 重跑合并）');

// ── mock server：manifest 空清单 + spec-sync 200 ──
const hits = [];
const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    hits.push(`${req.method} ${req.url}`);
    if (req.url.includes('/api/changes/-/spec-manifest')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ files: {} }));
    } else if (req.url.includes('/api/changes/-/spec-sync')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, new_versions: {}, conflict: false }));
    } else {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    }
  });
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const mockUrl = `http://127.0.0.1:${server.address().port}`;

const ENV_KEYS = ['SILLYHUB_PLATFORM_URL', 'SILLYHUB_PLATFORM_TOKEN', 'SILLYSPEC_SYNC_BG'];
const savedEnv = {};
for (const k of ENV_KEYS) { savedEnv[k] = process.env[k]; }
const setEnvCreds = (url, token) => {
  process.env.SILLYHUB_PLATFORM_URL = url;
  process.env.SILLYHUB_PLATFORM_TOKEN = token;
};
const restoreEnv = () => {
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
};

/** 建本地模式现场：.sillyspec 树带一个文件（保证 manifest diff 出 add op → POST 可断言）。 */
function seedLocalProject(sub) {
  const cwd = join(tmpRoot, sub);
  mkdirSync(join(cwd, '.sillyspec', 'quicklog'), { recursive: true });
  writeFileSync(join(cwd, '.sillyspec', 'quicklog', 'QUICKLOG-test.md'), '# test\n', 'utf8');
  return cwd;
}

// ─────────────────────────────────────────
// 1. 锁活性判定纯函数
// ─────────────────────────────────────────
console.log('\n--- 1. isBgSyncLockLive：null / 缺 pid / 过期 / 死 pid / 活 pid ---');
{
  const now = Date.now();
  assert(isBgSyncLockLive(null, now) === false, 'null 锁 → false');
  assert(isBgSyncLockLive({ startedAt: now }, now) === false, '缺 pid → false');
  assert(
    isBgSyncLockLive({ pid: process.pid, startedAt: now - 16 * 60 * 1000 }, now) === false,
    'startedAt 超 15min 时效 → false（pid 复用假活兜底）'
  );
  assert(
    isBgSyncLockLive({ pid: process.pid, startedAt: now }, now) === true,
    '活 pid（本进程）+ 未过期 → true'
  );

  // 死 pid：spawn 一个立即退出的进程，用它的 pid 判死
  const dead = spawn(process.execPath, ['-e', 'process.exit(0)'], { stdio: 'ignore' });
  const deadPid = dead.pid;
  await new Promise((r) => dead.on('exit', r));
  assert(isBgSyncLockLive({ pid: deadPid, startedAt: Date.now() }, Date.now()) === false, '已退出进程 pid → false（崩溃残留锁可接管）');
}

// ─────────────────────────────────────────
// 2. spawnBackgroundSync 决策矩阵（spawnImpl 注入）
// ─────────────────────────────────────────
console.log('\n--- 2. spawnBackgroundSync：未连接 / spawned / coalesced / 死锁接管 ---');
{
  const cwd = seedLocalProject('decision');
  const mkSpy = () => {
    const calls = [];
    return {
      calls,
      impl: (cmd, args, opts) => {
        calls.push({ cmd, args, opts, child: { unrefCalled: false, unref() { this.unrefCalled = true; } } });
        return calls[calls.length - 1].child;
      },
    };
  };

  // 2a. 未连接 → not-connected，不 spawn
  {
    restoreEnv();
    const spy = mkSpy();
    const r = await spawnBackgroundSync(cwd, 'quick-aa11bb22', {}, { spawnImpl: spy.impl });
    assert(r.status === 'not-connected', '未连接平台 → not-connected（本地用户零开销，不 spawn）');
    assert(spy.calls.length === 0, '未连接时 spawn 未被调用');
  }

  // 2b. env 连接 + 无锁 → spawned + 参数面
  setEnvCreds(mockUrl, 'bg-token');
  {
    const spy = mkSpy();
    const r = await spawnBackgroundSync(cwd, 'quick-aa11bb22', {}, { spawnImpl: spy.impl });
    assert(r.status === 'spawned', 'env 连接 + 无锁 → spawned');
    assert(spy.calls.length === 1, '恰好 spawn 一次');
    const c = spy.calls[0];
    assert(c.cmd === process.execPath, 'spawn 的是 process.execPath（node）');
    assert(c.opts.detached === true && c.opts.windowsHide === true, 'detached + windowsHide（跨平台后台存活）');
    assert(typeof c.opts.stdio[1] === 'number' && typeof c.opts.stdio[2] === 'number', 'stdout/stderr 接日志 fd（同步输出留痕）');
    assert(c.opts.env.SILLYSPEC_BG_SYNC_CHANGE === 'quick-aa11bb22', 'env 注入 SILLYSPEC_BG_SYNC_CHANGE');
    assert(c.opts.env.SILLYSPEC_BG_SYNC_CWD === cwd, 'env 注入 SILLYSPEC_BG_SYNC_CWD');
    const boot = c.args[c.args.length - 1];
    assert(boot.includes('runBgSyncFromEnv') && boot.includes('import('), '-e bootstrap 动态 import 本模块 runBgSyncFromEnv');
    assert(c.child.unrefCalled === true, 'child.unref() 被调（父进程不被子进程拖住）');
    assert(r.logPath === join(cwd, '.sillyspec', '.runtime', BG_LOG_FILENAME), 'logPath 指向 .runtime/spec-sync-bg.log');
    // 锁未预写（子进程自写）；清残留以防影响后续用例
    assert(!existsSync(join(cwd, '.sillyspec', '.runtime', BG_LOCK_FILENAME)), '父侧不预写锁（子进程起步自写）');
  }

  // 2c. 活锁 → coalesced + rerunQueued 置位
  {
    const runtimeRoot = join(cwd, '.sillyspec', '.runtime');
    mkdirSync(runtimeRoot, { recursive: true });
    writeFileSync(join(runtimeRoot, BG_LOCK_FILENAME), JSON.stringify({
      pid: process.pid, startedAt: Date.now(), change: 'quick-other', rerunQueued: false,
    }) + '\n', 'utf8');
    const spy = mkSpy();
    const r = await spawnBackgroundSync(cwd, 'quick-aa11bb22', {}, { spawnImpl: spy.impl });
    assert(r.status === 'coalesced', '活锁存在 → coalesced（单飞防进程堆积）');
    assert(spy.calls.length === 0, 'coalesced 不再 spawn');
    const lock = readBgSyncLock(runtimeRoot);
    assert(lock?.rerunQueued === true, 'rerunQueued 已置位（本轮状态并入后台下一轮）');
  }

  // 2d. 死锁（崩溃残留）→ spawned 接管
  {
    const runtimeRoot = join(cwd, '.sillyspec', '.runtime');
    const dead2 = spawn(process.execPath, ['-e', 'process.exit(0)'], { stdio: 'ignore' });
    const deadPid2 = dead2.pid;
    await new Promise((r) => dead2.on('exit', r));
    writeFileSync(join(runtimeRoot, BG_LOCK_FILENAME), JSON.stringify({
      pid: deadPid2, startedAt: Date.now(), change: 'quick-crashed', rerunQueued: false,
    }) + '\n', 'utf8');
    const spy = mkSpy();
    const r = await spawnBackgroundSync(cwd, 'quick-aa11bb22', {}, { spawnImpl: spy.impl });
    assert(r.status === 'spawned', '死锁（pid 已退出）→ 视为无锁接管 spawn');
    rmSync(join(runtimeRoot, BG_LOCK_FILENAME), { force: true });
  }
  restoreEnv();
}

// ─────────────────────────────────────────
// 3. triggerSync 集成（真实子进程 + mock server）
// ─────────────────────────────────────────
console.log('\n--- 3a. 默认后台化：triggerSync 快速返回，同步经子进程到达，锁自清，日志落盘 ---');
{
  const cwd = seedLocalProject('e2e-bg');
  const SID = 'quick-1a2b3c4d';
  setEnvCreds(mockUrl, 'bg-token');
  delete process.env.SILLYSPEC_SYNC_BG;
  hits.length = 0;

  const t0 = Date.now();
  await triggerSync(cwd, SID, {});
  const elapsed = Date.now() - t0;
  assert(elapsed < 5000, `triggerSync 快速返回（${elapsed}ms < 5000ms，不等网络收尾）`);
  assert(!hits.some((h) => h.includes('spec-manifest')), '父进程内未发任何同步请求（全部在子进程）');

  const runtimeRoot = join(cwd, '.sillyspec', '.runtime');
  const manifestArrived = await waitUntil(() => hits.some((h) => h.startsWith('GET') && h.includes('spec-manifest')), 20_000);
  assert(manifestArrived, '后台子进程的 manifest GET 到达服务器（≤20s）');
  const postArrived = await waitUntil(() => hits.some((h) => h.startsWith('POST') && h.includes('spec-sync')), 20_000);
  assert(postArrived, '后台子进程的 spec-sync POST 到达（本地树 diff 出 add op）');
  assert(!hits.some((h) => h.includes('/progress')), 'quick 会话形态无 progress POST（子进程内降级 syncSpecTreeOnly 分支正确）');

  const lockGone = await waitUntil(() => !existsSync(join(runtimeRoot, BG_LOCK_FILENAME)), 20_000);
  assert(lockGone, '锁文件在同步完成后自清');
  await sleep(300); // 子进程末条日志落盘余量
  const logPath = join(runtimeRoot, BG_LOG_FILENAME);
  const logText = existsSync(logPath) ? readFileSync(logPath, 'utf8') : '';
  assert(logText.includes('后台同步完成'), `日志含「后台同步完成」（${logPath}）`);
  restoreEnv();
}

console.log('\n--- 3b. SILLYSPEC_SYNC_BG=0 逃生阀 → 回落 inline（进程内同步，不 spawn） ---');
{
  const cwd = seedLocalProject('e2e-inline');
  const SID = 'quick-2b3c4d5e';
  setEnvCreds(mockUrl, 'inline-token');
  process.env.SILLYSPEC_SYNC_BG = '0';
  hits.length = 0;

  await triggerSync(cwd, SID, {});
  assert(hits.some((h) => h.startsWith('GET') && h.includes('spec-manifest')), 'await 返回时 manifest 请求已在进程内发出（旧行为不变）');
  assert(!existsSync(join(cwd, '.sillyspec', '.runtime', BG_LOCK_FILENAME)), 'inline 路径不产生锁文件');
  restoreEnv();
}

server.close();
// e2e 子进程退出后清理（Windows 下打开中的 fd 会锁目录，容忍残留）
try { rmSync(tmpRoot, { recursive: true, force: true }); } catch {}
restoreEnv();

if (failures > 0) {
  console.error(`\n❌ spec-sync-bg: ${failures} 处断言失败`);
  process.exitCode = 1;
} else {
  console.log('\n✅ spec-sync-bg: 全部通过');
}
