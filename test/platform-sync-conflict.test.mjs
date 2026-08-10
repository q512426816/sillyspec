// task-12 验收：双向冲突检测 + 写 .runtime/sync-conflict-<change>.json（design §7 / D-002 / D-008 / D-010 / FR-05）。
//
// 验收点（task-12.md acceptance）：
// 1. pull 本地脏 + 平台新 → 写冲突文件（含 change/base_ts/local_modified_ts/platform_last_pushed_at/platform_progress/created_at），不 import，返回 conflict:true + conflictPath
// 2. pull 无冲突（本地干净）→ import 生效，不写冲突文件
// 3. pull force=true → 跳过冲突检测直接 import，不写冲突文件
// 4. push 409（base_ts 过期）→ 写冲突文件，返回 conflict:true + conflictPath + platform_progress
// 5. readConflictFile / clearConflictFile helper 契约
// 6. 冲突文件路径在 .runtime 下（不入版本控制）
//
// 隔离：cwd 用 os.tmpdir() + mock http server。
import { mkdirSync, mkdtempSync, writeFileSync, rmSync, existsSync, readFileSync } from 'fs';
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

const tmpRoot = mkdtempSync(join(tmpdir(), `sillyspec-conflict-${process.pid}-`));

// 平台 progress JSON 模板（serializeForSync 六表 + 顶层 last_pushed_at）
const platformPayload = (name, pushedAt) => ({
  project: { name: 'proj', schema_version: 4 },
  changes: [{ name, current_stage: 'plan', status: 'active', last_active: '2026-08-10T04:00:00.000Z', last_synced_platform_ts: null, last_local_modified_ts: null }],
  stages: [], steps: [], batch_progress: [], approvals: [],
  last_pushed_at: pushedAt,
});

// mock server：GET progress 返回平台权威 JSON；POST progress 返回 409 冲突（base_ts 过期）
const server = http.createServer((req, res) => {
  const url = req.url;
  if (url.includes('/progress') && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(platformPayload('rt-change', '2026-08-10T04:00:00.000Z')));
  } else if (url.includes('/progress') && req.method === 'POST') {
    // push 409：base_ts 过期，回平台最新 progress + last_pushed_at 供冲突文件落盘
    res.writeHead(409, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      conflict: true,
      platform_progress: platformPayload('rt-change', '2026-08-10T04:00:00.000Z'),
      last_pushed_at: '2026-08-10T04:00:00.000Z',
    }));
  } else {
    res.writeHead(404); res.end();
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const mockUrl = `http://127.0.0.1:${port}`;

const makePM = (cwd) => new ProgressManager({ specDir: join(cwd, '.sillyspec') });

// 直接写本地脏度（绕过 task-04 写入路径，精确控制冲突时序）
const setLocalTs = (cwd, name, modified, synced) => {
  const pm = makePM(cwd);
  pm._ensureDB(cwd).getDb().prepare(
    'UPDATE changes SET last_local_modified_ts = ?, last_synced_platform_ts = ? WHERE name = ?'
  ).run(modified, synced, name);
};

const conflictPathOf = (cwd, name) => join(cwd, '.sillyspec', '.runtime', `sync-conflict-${name}.json`);

const setupCwd = (sub) => {
  const cwd = join(tmpRoot, sub, 'proj');
  mkdirSync(join(cwd, '.sillyspec', 'changes', 'rt-change'), { recursive: true });
  const pm = makePM(cwd);
  pm.init(cwd);
  pm.initChange(cwd, 'rt-change');
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), `platform:\n  url: ${mockUrl}\n  token: tok\n`, 'utf8');
  return { cwd, pm };
};

console.log('\n[platform-sync-conflict] task-12：双向冲突检测 + sync-conflict 文件');

// ─────────────────────────────────────────
// 1. pull 冲突（本地脏 + 平台新）→ 写冲突文件，不 import
// ─────────────────────────────────────────
console.log('\n--- 1. pull 冲突写文件 ---');
{
  const { cwd } = setupCwd('pull-conflict');
  // 本地脏：modified=03:00 > synced=02:00；平台 pushed=04:00 > synced=02:00
  setLocalTs(cwd, 'rt-change', '2026-08-10T03:00:00.000Z', '2026-08-10T02:00:00.000Z');

  const sm = new SyncManager(cwd);
  const r = await sm.pull('rt-change');
  assert(r.ok === false, 'pull 冲突返回 ok=false');
  assert(r.conflict === true, 'pull 冲突返回 conflict=true');
  assert(r.imported === false, 'pull 冲突不 import');
  assert(typeof r.conflictPath === 'string' && r.conflictPath.length > 0, 'pull 冲突返回 conflictPath');
  assert(existsSync(conflictPathOf(cwd, 'rt-change')), '冲突文件落盘 .runtime/sync-conflict-<change>.json');

  const cf = JSON.parse(readFileSync(conflictPathOf(cwd, 'rt-change'), 'utf8'));
  assert(cf.change === 'rt-change', '冲突文件含 change 字段');
  assert(cf.base_ts === '2026-08-10T02:00:00.000Z', 'base_ts = 本地 last_synced_platform_ts');
  assert(cf.local_modified_ts === '2026-08-10T03:00:00.000Z', 'local_modified_ts = 本地脏度');
  assert(cf.platform_last_pushed_at === '2026-08-10T04:00:00.000Z', 'platform_last_pushed_at = 平台 pushed_at');
  assert(cf.platform_progress && Array.isArray(cf.platform_progress.changes), '含 platform_progress 供 resolve --take-platform 用');
  assert(typeof cf.created_at === 'string' && cf.created_at.length > 0, '含 created_at 时间戳');
}

// ─────────────────────────────────────────
// 2. pull 无冲突（本地干净，平台更新）→ import，不写冲突文件
// ─────────────────────────────────────────
console.log('\n--- 2. pull 无冲突 import ---');
{
  const { cwd } = setupCwd('pull-clean');
  // 本地干净：modified=02:00 == synced=02:00 → localDirty false；平台 pushed=04:00 更新
  setLocalTs(cwd, 'rt-change', '2026-08-10T02:00:00.000Z', '2026-08-10T02:00:00.000Z');

  const sm = new SyncManager(cwd);
  const r = await sm.pull('rt-change');
  assert(r.ok === true && r.imported === true, 'pull 无冲突 import 成功');
  assert(r.conflict === false, 'pull 无冲突 conflict=false');
  assert(!existsSync(conflictPathOf(cwd, 'rt-change')), '无冲突不写冲突文件');
}

// ─────────────────────────────────────────
// 3. pull force 跳过冲突检测 → import，不写冲突文件
// ─────────────────────────────────────────
console.log('\n--- 3. pull force 跳过冲突检测 ---');
{
  const { cwd } = setupCwd('pull-force');
  // 本地脏（正常会冲突），但 force=true 跳过检测
  setLocalTs(cwd, 'rt-change', '2026-08-10T03:00:00.000Z', '2026-08-10T02:00:00.000Z');

  const sm = new SyncManager(cwd);
  const r = await sm.pull('rt-change', { force: true });
  assert(r.ok === true && r.imported === true, 'pull force 跳过冲突检测 import 成功');
  assert(r.conflict === false, 'pull force conflict=false');
  assert(!existsSync(conflictPathOf(cwd, 'rt-change')), 'force 不写冲突文件');
}

// ─────────────────────────────────────────
// 4. push 409（base_ts 过期）→ 写冲突文件
// ─────────────────────────────────────────
console.log('\n--- 4. push 409 写文件 ---');
{
  const { cwd } = setupCwd('push-conflict');
  // 设 base_ts（last_synced_platform_ts）+ 本地脏度
  setLocalTs(cwd, 'rt-change', '2026-08-10T03:00:00.000Z', '2026-08-10T02:00:00.000Z');

  const sm = new SyncManager(cwd);
  const r = await sm.sync('rt-change');
  assert(r.synced === 0, 'push 409 synced=0');
  assert(r.conflict === true, 'push 409 conflict=true');
  assert(typeof r.conflictPath === 'string' && r.conflictPath.length > 0, 'push 409 返回 conflictPath');
  assert(existsSync(conflictPathOf(cwd, 'rt-change')), 'push 409 冲突文件落盘');

  const cf = JSON.parse(readFileSync(conflictPathOf(cwd, 'rt-change'), 'utf8'));
  assert(cf.change === 'rt-change', 'push 冲突文件 change 字段');
  assert(cf.base_ts === '2026-08-10T02:00:00.000Z', 'push 冲突文件 base_ts = push 的 base');
  assert(cf.local_modified_ts === '2026-08-10T03:00:00.000Z', 'push 冲突文件 local_modified_ts = 本地脏度');
  assert(cf.platform_last_pushed_at === '2026-08-10T04:00:00.000Z', 'push 冲突文件 platform_last_pushed_at');
  assert(cf.platform_progress && Array.isArray(cf.platform_progress.changes), 'push 冲突文件含 platform_progress');
  assert(r.platform_progress && Array.isArray(r.platform_progress.changes), 'sync 返回 platform_progress 供调用方');
}

// ─────────────────────────────────────────
// 5. readConflictFile / clearConflictFile helper 契约
// ─────────────────────────────────────────
console.log('\n--- 5. read/clear helper ---');
{
  const { cwd } = setupCwd('helper');
  setLocalTs(cwd, 'rt-change', '2026-08-10T03:00:00.000Z', '2026-08-10T02:00:00.000Z');

  const sm = new SyncManager(cwd);
  // 未落盘前 read 返回 null
  assert(sm.readConflictFile('rt-change') === null, '无冲突文件时 readConflictFile 返回 null');
  // 触发一次 pull 冲突落盘
  await sm.pull('rt-change');
  const read1 = sm.readConflictFile('rt-change');
  assert(read1 !== null && read1.change === 'rt-change', 'readConflictFile 读回冲突内容');

  const cleared = sm.clearConflictFile('rt-change');
  assert(cleared === true, 'clearConflictFile 删除冲突文件返回 true');
  assert(!existsSync(conflictPathOf(cwd, 'rt-change')), '清理后冲突文件不存在');
  assert(sm.readConflictFile('rt-change') === null, '清理后 readConflictFile 返回 null');
  assert(sm.clearConflictFile('rt-change') === false, '清理不存在的文件返回 false');
}

// ─────────────────────────────────────────
// 6. 未连接平台 → 不写冲突文件、不抛错（Best Effort）
// ─────────────────────────────────────────
console.log('\n--- 6. 未连接静默跳过 ---');
{
  const { cwd } = setupCwd('noconnect');
  // 删 local.yaml 模拟未连接
  rmSync(join(cwd, '.sillyspec', 'local.yaml'));
  setLocalTs(cwd, 'rt-change', '2026-08-10T03:00:00.000Z', '2026-08-10T02:00:00.000Z');

  const sm = new SyncManager(cwd);
  let threw = false;
  let r;
  try { r = await sm.pull('rt-change'); }
  catch (e) { threw = true; }
  assert(!threw, 'pull 未连接不抛错');
  assert(r.ok === false && r.conflict === false, 'pull 未连接返回 ok=false/conflict=false');
  assert(!existsSync(conflictPathOf(cwd, 'rt-change')), '未连接不写冲突文件');
}

// 清理
await new Promise((r) => server.close(r));
try { rmSync(tmpRoot, { recursive: true, force: true }); }
catch { /* temp dir 由 OS 清理 */ }

if (failures > 0) {
  console.error(`\n[platform-sync-conflict] ❌ ${failures} 项失败`);
  process.exit(1);
}
console.log('\n[platform-sync-conflict] ✅ 全部通过');
