// task-07 验收：SyncManager.pull() 两级 pull 第二级（design §7 / D-001 / D-006 / D-014 / FR-01 / FR-03 / FR-09）。
//
// 验收点（task-07.md acceptance + 契约 PullResult [ok, imported, conflict, reason]）：
// 1. pull 返回 PullResult 含 ok imported conflict reason
// 2. 本地脏度命中冲突（本地脏 AND 平台更新）时不 import 返回 conflict:true
// 3. 无冲突时调 import 并返回 imported:true
// 4. 未连接平台 / sillyhub 未就绪或 404 → Best Effort 降级不阻断
// 5. force 跳过冲突检测直接 import（task-12 resolve --take-platform 用）
//
// 隔离：cwd 用 os.tmpdir() 临时目录 + Node http mock server。
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import http from 'http';
import { SyncManager } from '../src/sync.js';
import { ProgressManager } from '../src/progress.js';

let failures = 0;
const assert = (cond, msg) => {
  if (cond) console.log('  ✅ ' + msg);
  else { console.error('  ❌ ' + msg); failures++; }
};

const makePM = (cwd) => new ProgressManager({ specDir: join(cwd, '.sillyspec') });
const tmpRoot = mkdtempSync(join(tmpdir(), `sillyspec-pull-${process.pid}-`));

console.log('\n[platform-sync-pull] task-07：pull 两级 pull 第二级');

// ─────────────────────────────────────────
// mock server：GET /api/changes/<name>/progress 按 name/mode 返回
// ─────────────────────────────────────────
let progressPayload = null;
let progressStatus = 200;
const PLATFORM_JSON = {
  project: { name: 'proj', schema_version: 4 },
  changes: [{ name: 'rt-change', current_stage: 'plan', status: 'active', last_active: '2026-08-10T02:00:00.000Z', last_synced_platform_ts: null, last_local_modified_ts: null }],
  stages: [{ change_name: 'rt-change', stage: 'brainstorm', status: 'completed', started_at: null, completed_at: '2026-08-10T01:30:00.000Z', revision: 0, reopened_from_step: null, reopened_at: null, stale_reason: null }],
  steps: [],
  batch_progress: [],
  approvals: [],
  last_pushed_at: '2026-08-10T02:00:00.000Z',
};
const server = http.createServer((req, res) => {
  if (req.url.includes('/progress') && req.method === 'GET') {
    if (progressStatus !== 200) {
      res.writeHead(progressStatus, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'not found' }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(progressPayload || PLATFORM_JSON));
  } else {
    res.writeHead(404);
    res.end();
  }
});

await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const mockUrl = `http://127.0.0.1:${port}`;

const setupCwd = (sub, { dirty = false, clean = false } = {}) => {
  const cwd = join(tmpRoot, sub, 'proj');
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true });
  const pm = makePM(cwd);
  pm.init(cwd);
  pm.initChange(cwd, 'rt-change');
  const sql = pm._ensureDB(cwd).getDb();
  // dirty: 本地脏（last_local > last_synced）；clean: 干净（两列相等）
  if (dirty) sql.prepare('UPDATE changes SET last_local_modified_ts = ?, last_synced_platform_ts = ? WHERE name = ?').run('2026-08-10T01:30:00.000Z', '2026-08-10T01:00:00.000Z', 'rt-change');
  if (clean) sql.prepare('UPDATE changes SET last_local_modified_ts = ?, last_synced_platform_ts = ? WHERE name = ?').run('2026-08-10T01:00:00.000Z', '2026-08-10T01:00:00.000Z', 'rt-change');
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), `platform:\n  url: ${mockUrl}\n  token: tok\n`, 'utf8');
  return { cwd, sql };
};

// ─────────────────────────────────────────
// 1. 未连接平台
// ─────────────────────────────────────────
console.log('\n--- 1. 未连接平台 ---');
{
  const cwd = join(tmpRoot, 'noplatform', 'proj');
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true });
  const r = await new SyncManager(cwd).pull('rt-change');
  assert(r.ok === false && r.imported === false && r.conflict === false, '未连接 → ok/imported/conflict 均 false');
  assert(r.reason === '未连接平台', `reason='未连接平台'（实际 ${r.reason}）`);
}

// ─────────────────────────────────────────
// 2. 本地脏 + 平台更新 → 冲突（不 import）
// ─────────────────────────────────────────
console.log('\n--- 2. 本地脏 + 平台更新 → 冲突 ---');
{
  const { cwd, sql } = setupCwd('conflict', { dirty: true });
  // 平台 last_pushed_at=T2=02:00 > local last_synced=01:00 → platformNewer
  const r = await new SyncManager(cwd).pull('rt-change');
  assert(r.ok === false && r.conflict === true, `冲突 → ok=false conflict=true（ok=${r.ok} conflict=${r.conflict}）`);
  assert(r.imported === false, '冲突不 import');
  assert(r.reason && r.reason.includes('冲突'), `reason 含冲突（实际 ${r.reason}）`);
  // 本地数据未被覆盖（current_stage 仍 scan，非平台的 plan）
  const cur = sql.prepare('SELECT current_stage FROM changes WHERE name = ?').get('rt-change');
  assert(cur.current_stage === 'scan', `冲突保留本地现状（current_stage 仍 scan，实际 ${cur.current_stage}）`);
}

// ─────────────────────────────────────────
// 3. 无冲突（本地干净）→ import，imported:true
// ─────────────────────────────────────────
console.log('\n--- 3. 无冲突（本地干净）→ import ---');
{
  const { cwd, sql } = setupCwd('clean', { clean: true });
  const r = await new SyncManager(cwd).pull('rt-change');
  assert(r.ok === true && r.imported === true && r.conflict === false, `无冲突 → ok=true imported=true conflict=false（ok=${r.ok} imported=${r.imported}）`);
  // import 生效：current_stage=plan（平台值），last_synced_platform_ts=pushed_at
  const cur = sql.prepare('SELECT current_stage, last_synced_platform_ts, last_local_modified_ts FROM changes WHERE name = ?').get('rt-change');
  assert(cur.current_stage === 'plan', `import 后 current_stage=plan（实际 ${cur.current_stage}）`);
  assert(cur.last_synced_platform_ts === '2026-08-10T02:00:00.000Z' && cur.last_local_modified_ts === '2026-08-10T02:00:00.000Z',
    `import 后两列=pushed_at（实际 ${cur.last_synced_platform_ts}/${cur.last_local_modified_ts}）`);
}

// ─────────────────────────────────────────
// 4. force 跳过冲突检测 → 即使本地脏也 import（resolve --take-platform 语义）
// ─────────────────────────────────────────
console.log('\n--- 4. force 跳过冲突检测 ---');
{
  const { cwd, sql } = setupCwd('force', { dirty: true });
  const r = await new SyncManager(cwd).pull('rt-change', { force: true });
  assert(r.ok === true && r.imported === true, `force → imported=true（ok=${r.ok} imported=${r.imported}）`);
  const cur = sql.prepare('SELECT current_stage FROM changes WHERE name = ?').get('rt-change');
  assert(cur.current_stage === 'plan', `force import 覆盖为平台值 plan（实际 ${cur.current_stage}）`);
}

// ─────────────────────────────────────────
// 5. sillyhub 未就绪 / 404 → Best Effort ok:false 不抛
// ─────────────────────────────────────────
console.log('\n--- 5. 平台 404 / 未就绪 ---');
{
  const { cwd } = setupCwd('notfound', { clean: true });
  progressStatus = 404;
  let threw = false;
  let r;
  try { r = await new SyncManager(cwd).pull('rt-change'); }
  catch (e) { threw = true; r = { ok: null }; }
  progressStatus = 200;
  assert(!threw, '404 不抛错');
  assert(r.ok === false && r.imported === false && r.conflict === false, `404 → ok=false 不阻断（ok=${r.ok}）`);
  assert(r.reason === '拉取变更进度失败', `reason='拉取变更进度失败'（实际 ${r.reason}）`);
}

// ─────────────────────────────────────────
// 6. 包裹响应 { progress: {...}, last_pushed_at } 兼容
// ─────────────────────────────────────────
console.log('\n--- 6. 包裹响应兼容 ---');
{
  const { cwd } = setupCwd('wrapped', { clean: true });
  const prev = progressPayload;
  progressPayload = { progress: { ...PLATFORM_JSON }, last_pushed_at: PLATFORM_JSON.last_pushed_at };
  delete progressPayload.progress.last_pushed_at;
  const r = await new SyncManager(cwd).pull('rt-change');
  progressPayload = prev;
  assert(r.ok === true && r.imported === true, `包裹响应解包 import 成功（ok=${r.ok} imported=${r.imported}）`);
}

// 清理
await new Promise((r) => server.close(r));
try { rmSync(tmpRoot, { recursive: true, force: true }); }
catch { /* temp dir 由 OS 清理 */ }

if (failures > 0) {
  console.error(`\n[platform-sync-pull] ❌ ${failures} 项失败`);
  process.exit(1);
}
console.log('\n[platform-sync-pull] ✅ 全部通过');
