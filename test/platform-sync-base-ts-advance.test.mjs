// ql-20260818-008 验收：push 成功推进 base_ts（last_synced_platform_ts）+ 自动 pull 本地领先守卫 + run 命令下行接线。
//
// 验收点：
// 1. sync() 200 成功后本地 changes.last_synced_platform_ts = 本次 X-SillySpec-Pushed-At
//    （后端 _apply 存的就是该 header 原值，回写与服务器精确一致。修复前该列只在 pull
//    import / resolve keep-local 写入，CLI 直跑恒 NULL——_updatePlatformLastSync 写
//    platform_last_sync 而 sync()/pull 读 last_synced_platform_ts，写 A 读 B 断链）
// 2. 服务器回执含 last_pushed_at 时优先用回执值（未来后端返回权威时钟不漂移）
// 3. 第二次 sync() 携带 X-SillySpec-Base-Ts = 已推进的 base_ts（乐观锁恢复工作）
// 4. pull skipIfLocalDirty：本地脏（last_local_modified > last_synced）且平台更旧 →
//    自动注入语义跳过 import（防平台旧快照覆盖本地领先进度）；手动 pull（不传 flag）仍 import
// 5. triggerPullActiveChange 自动路径同守卫（本地脏 → 不 import）
// 6. `sillyspec run <stage> --status`（case 'run'）启动触发下行 pull（修复前只有顶层
//    stage 别名块接线，case 'run' 漏接与注释宣称的 run/--done 语义不符）
//
// 隔离：cwd 用 os.tmpdir() 临时目录 + Node http mock server，绝不碰真实 .sillyspec/.runtime。
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';
import http from 'http';
import { execFile } from 'child_process';
import { SyncManager } from '../src/sync.js';
import { ProgressManager } from '../src/progress.js';
import { triggerPullActiveChange } from '../src/run/shared.js';

let failures = 0;
const assert = (cond, msg) => {
  if (cond) console.log('  ✅ ' + msg);
  else { console.error('  ❌ ' + msg); failures++; }
};

delete process.env.SILLYSPEC_DEBUG_SYNC; // debug 通道不参与断言，保持默认关闭

const makePM = (cwd) => new ProgressManager({ specDir: join(cwd, '.sillyspec') });
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

const tmpRoot = mkdtempSync(join(tmpdir(), `sillyspec-base-ts-${process.pid}-`));

console.log('\n[platform-sync-base-ts-advance] ql-20260818-008：base_ts 推进 + pull 守卫 + run 接线');

// ── mock server：/progress POST 200（ackLastPushedAt 可控）；GET 回平台六表（name 回显 URL）──
let lastPostHeaders = null;
let ackLastPushedAt = null; // null = 真实后端形态 {ok:true}（无 last_pushed_at）
let platformLastPushedAt = '2026-08-10T00:30:00.000Z';
let platformStage = 'scan';
const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    const m = req.url.match(/\/api\/changes\/([^/]+)\/progress/);
    const changeName = m ? decodeURIComponent(m[1]) : 'unknown';
    if (m && req.method === 'POST') {
      lastPostHeaders = req.headers;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(ackLastPushedAt ? { ok: true, last_pushed_at: ackLastPushedAt } : { ok: true }));
    } else if (m && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        project: { name: 'proj', schema_version: 4 },
        changes: [{ name: changeName, current_stage: platformStage, status: 'active', last_active: '2026-08-10T00:30:00.000Z', last_synced_platform_ts: null, last_local_modified_ts: null }],
        stages: [], steps: [], batch_progress: [], approvals: [],
        last_pushed_at: platformLastPushedAt,
      }));
    } else {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
    }
  });
});

await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const mockUrl = `http://127.0.0.1:${port}`;

const connectYaml = (cwd) => writeFileSync(
  join(cwd, '.sillyspec', 'local.yaml'),
  `platform:\n  url: ${mockUrl}\n  token: test-token\n`,
  'utf8',
);

// ─────────────────────────────────────────
// 1-3. base_ts 推进：push 成功 → 列回写 = Pushed-At；ack 优先；下次携带 Base-Ts
// ─────────────────────────────────────────
console.log('\n--- 1. push 成功推进 last_synced_platform_ts ---');
{
  const cwd = join(tmpRoot, 'basets');
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true });
  const pm = makePM(cwd);
  pm.init(cwd);
  pm.initChange(cwd, 'bt-change');
  connectYaml(cwd);

  const sm = new SyncManager(cwd);
  const r1 = await sm.sync('bt-change');
  assert(r1.synced === 1, `首次 push 成功（实际 synced=${r1.synced}）`);
  const row1 = pm._ensureDB(cwd).getDb().prepare(
    'SELECT last_synced_platform_ts FROM changes WHERE name = ?'
  ).get('bt-change');
  assert(row1.last_synced_platform_ts === lastPostHeaders['x-sillyspec-pushed-at'],
    `push 后 last_synced_platform_ts = 本次 X-SillySpec-Pushed-At（实际 ${row1.last_synced_platform_ts}，header ${lastPostHeaders['x-sillyspec-pushed-at']}）`);

  console.log('\n--- 2. 服务器回执 last_pushed_at 优先 ---');
  ackLastPushedAt = '2026-08-10T02:00:00.000Z';
  const r2 = await sm.sync('bt-change');
  assert(r2.synced === 1, `回执模式 push 成功（实际 synced=${r2.synced}）`);
  const row2 = pm._ensureDB(cwd).getDb().prepare(
    'SELECT last_synced_platform_ts FROM changes WHERE name = ?'
  ).get('bt-change');
  assert(row2.last_synced_platform_ts === '2026-08-10T02:00:00.000Z',
    `回执含 last_pushed_at 时优先回写回执值（实际 ${row2.last_synced_platform_ts}）`);

  console.log('\n--- 3. 下次 push 携带 X-SillySpec-Base-Ts ---');
  await sm.sync('bt-change');
  assert(lastPostHeaders['x-sillyspec-base-ts'] === '2026-08-10T02:00:00.000Z',
    `第二次 sync 携带 Base-Ts=已推进 base_ts（实际 ${lastPostHeaders['x-sillyspec-base-ts']}）`);
  ackLastPushedAt = null;
}

// ─────────────────────────────────────────
// 4. pull skipIfLocalDirty：本地领先（脏 + 平台更旧）→ 自动语义跳过；手动仍 import
// ─────────────────────────────────────────
console.log('\n--- 4. pull 本地领先守卫 ---');
{
  const cwd = join(tmpRoot, 'dirty');
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true });
  const pm = makePM(cwd);
  pm.init(cwd);
  pm.initChange(cwd, 'dirty-change');
  // 构造本地领先：last_synced=T1，last_local_modified=T2>T1（脏）；平台 last_pushed_at=T0<T1（更旧）
  pm._ensureDB(cwd).getDb().prepare(
    `UPDATE changes SET current_stage = 'plan', last_synced_platform_ts = '2026-08-10T01:00:00.000Z',
     last_local_modified_ts = '2026-08-10T03:00:00.000Z' WHERE name = 'dirty-change'`
  ).run();
  connectYaml(cwd);

  const sm = new SyncManager(cwd);
  const auto = await sm.pull('dirty-change', { skipIfLocalDirty: true });
  assert(auto.ok === false && auto.imported === false, `skipIfLocalDirty 本地脏 → 跳过（实际 ok=${auto.ok} imported=${auto.imported}）`);
  let row = pm._ensureDB(cwd).getDb().prepare(
    'SELECT current_stage, last_synced_platform_ts FROM changes WHERE name = ?'
  ).get('dirty-change');
  assert(row.current_stage === 'plan' && row.last_synced_platform_ts === '2026-08-10T01:00:00.000Z',
    `自动跳过后本地进度与 base_ts 不被平台旧快照覆盖（实际 stage=${row.current_stage} base=${row.last_synced_platform_ts}）`);

  const manual = await sm.pull('dirty-change');
  assert(manual.imported === true, `手动 pull（不传 flag）语义不变仍 import（实际 imported=${manual.imported}）`);
  row = pm._ensureDB(cwd).getDb().prepare(
    'SELECT current_stage FROM changes WHERE name = ?'
  ).get('dirty-change');
  assert(row.current_stage === 'scan', `手动 import 后本地对齐平台 current_stage（实际 ${row.current_stage}）`);
}

// ─────────────────────────────────────────
// 5. triggerPullActiveChange 自动路径同守卫（本地脏 → 不 import）
// ─────────────────────────────────────────
console.log('\n--- 5. triggerPullActiveChange 自动守卫 ---');
{
  const cwd = join(tmpRoot, 'autopull');
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true });
  const pm = makePM(cwd);
  pm.init(cwd);
  pm.initChange(cwd, 'auto-change');
  pm._ensureDB(cwd).getDb().prepare(
    `UPDATE changes SET current_stage = 'execute', last_synced_platform_ts = '2026-08-10T01:00:00.000Z',
     last_local_modified_ts = '2026-08-10T03:00:00.000Z' WHERE name = 'auto-change'`
  ).run();
  connectYaml(cwd);

  await triggerPullActiveChange(cwd);
  const row = pm._ensureDB(cwd).getDb().prepare(
    'SELECT current_stage FROM changes WHERE name = ?'
  ).get('auto-change');
  assert(row.current_stage === 'execute', `自动 pull 本地脏时保留本地进度（实际 ${row.current_stage}，应保持 execute 非 scan）`);
}

// ─────────────────────────────────────────
// 6. case 'run' 下行接线：run status --status 启动触发 pull（CLI 子进程端到端）
// ─────────────────────────────────────────
console.log('\n--- 6. run 命令启动 pull 接线 ---');
{
  const cwd = join(tmpRoot, 'runwire');
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true });
  const pm = makePM(cwd);
  pm.init(cwd);
  pm.initChange(cwd, 'wire-change');
  // 初始锚一个非 scan 阶段（initChange 默认值可能是 scan，会让 import 断言空转）
  pm._ensureDB(cwd).getDb().prepare(
    `UPDATE changes SET current_stage = 'brainstorm' WHERE name = 'wire-change'`
  ).run();
  connectYaml(cwd);
  // 探针：triggerPullActiveChange import 成功会把 current_stage 对齐平台 scan
  //（last_synced NULL → 不脏 → platformNewer=true → import）
  const { promisify } = await import('util');
  const execFileP = promisify(execFile);
  await execFileP(process.execPath, [join(repoRoot, 'bin', 'sillyspec.js'), 'run', 'status', '--status'], {
    cwd,
    env: { ...process.env, SILLYSPEC_DEBUG_SYNC: '' },
    timeout: 60_000,
  });
  const row = pm._ensureDB(cwd).getDb().prepare(
    'SELECT current_stage FROM changes WHERE name = ?'
  ).get('wire-change');
  assert(row.current_stage === 'scan',
    `run status 启动触发 pull 并 import 平台进度（实际 ${row.current_stage}，应从初始值对齐为 scan）`);
}

// 清理（Windows rmSync 对在用句柄会 EPERM，重试 + 吞错）
await new Promise((r) => server.close(r));
try {
  rmSync(tmpRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
} catch {
  // 个别文件仍被锁则留待系统清理，不影响测试结论
}

if (failures > 0) {
  console.error(`\n[platform-sync-base-ts-advance] ❌ ${failures} 项失败`);
  process.exitCode = 1;
} else {
  console.log('\n[platform-sync-base-ts-advance] ✅ 全部通过');
}
