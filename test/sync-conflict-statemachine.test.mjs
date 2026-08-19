// task-15 验收：冲突状态机 round-trip（design 生命周期契约表 / D-002 / D-010 / FR-05）。
//
// 覆盖 design 生命周期契约表各状态迁移路径：
//   clean → conflict（push 409 路径 / pull 本地脏度路径）
//   conflict → resolved（--keep-local / --take-platform / --abort 三路）
// 断言：
//   - conflict 态写冲突文件且不 import
//   - 三种 resolve 后冲突文件被清理
//   - --keep-local 只更新 base_ts；--take-platform 调 import；--abort 不改动
//   - round-trip：resolve 后再操作状态正确（keep-local/take-platform 回 clean，abort 未真正解决会重新进 conflict）
//
// 隔离：cwd 用 os.tmpdir() + mock http server（不碰真实服务与真实 .runtime，constraints）。
import { mkdirSync, mkdtempSync, writeFileSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import http from 'http';
import { SyncManager } from '../src/sync.js';
import { ProgressManager } from '../src/progress.js';

let failures = 0;
const assert = (c, m) => {
  if (c) console.log('  ✅ ' + m);
  else { console.error('  ❌ ' + m); failures++; }
};

const tmpRoot = mkdtempSync(join(tmpdir(), `ss-statemachine-${process.pid}-`));

// configurable mock：postMode 控制 POST 响应（conflict=409 / ok=200）；GET 总返回平台权威 JSON
let postMode = 'conflict';
const platformPushedAt = '2026-08-10T05:00:00.000Z';
const platformPayload = (name) => ({
  project: { name: 'proj', schema_version: 4 },
  changes: [{ name, current_stage: 'verify', status: 'active', last_active: platformPushedAt, last_synced_platform_ts: null, last_local_modified_ts: null }],
  stages: [], steps: [], batch_progress: [], approvals: [],
  last_pushed_at: platformPushedAt,
});
const server = http.createServer((req, res) => {
  if (req.url.includes('/progress') && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(platformPayload('rt-change')));
  } else if (req.url.includes('/progress') && req.method === 'POST') {
    if (postMode === 'conflict') {
      res.writeHead(409, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ conflict: true, platform_progress: platformPayload('rt-change'), last_pushed_at: platformPushedAt }));
    } else {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('{}');
    }
  } else {
    res.writeHead(404); res.end();
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const mockUrl = `http://127.0.0.1:${server.address().port}`;

const conflictPath = (cwd, name) => join(cwd, '.sillyspec', '.runtime', `sync-conflict-${name}.json`);

const mkCwd = (sub) => {
  const cwd = join(tmpRoot, sub, 'proj');
  mkdirSync(join(cwd, '.sillyspec', 'changes', 'rt-change'), { recursive: true });
  const pm = new ProgressManager({ specDir: join(cwd, '.sillyspec') });
  pm.init(cwd);
  pm.initChange(cwd, 'rt-change');
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), `platform:\n  url: ${mockUrl}\n  token: tok\n`, 'utf8');
  return { cwd, pm };
};
const setTs = (cwd, name, modified, synced) => {
  new ProgressManager({ specDir: join(cwd, '.sillyspec') })._ensureDB(cwd).getDb()
    .prepare('UPDATE changes SET last_local_modified_ts = ?, last_synced_platform_ts = ? WHERE name = ?').run(modified, synced, name);
};
const getRow = (cwd, name) => new ProgressManager({ specDir: join(cwd, '.sillyspec') })._ensureDB(cwd).getDb()
  .prepare('SELECT last_local_modified_ts, last_synced_platform_ts, current_stage FROM changes WHERE name = ?').get(name);

console.log('\n[sync-conflict-statemachine] task-15：clean ↔ conflict → resolved 状态机 round-trip');

// ─────────────────────────────────────────
// A. push 409 路径：clean → conflict
// ─────────────────────────────────────────
console.log('\n--- A. push 409 → conflict ---');
{
  const { cwd } = mkCwd('A-push409');
  setTs(cwd, 'rt-change', '2026-08-10T04:00:00.000Z', '2026-08-10T03:00:00.000Z');
  postMode = 'conflict';
  const r = await new SyncManager(cwd).sync('rt-change');
  assert(r.synced === 0 && r.conflict === true, 'push 409 进入 conflict 态（synced=0/conflict=true）');
  assert(r.conflictPath && existsSync(r.conflictPath), 'conflict 态写冲突文件');
  const cf = JSON.parse(readFileSync(conflictPath(cwd, 'rt-change'), 'utf8'));
  assert(cf.base_ts === '2026-08-10T03:00:00.000Z', '冲突文件 base_ts = push 的 base');
  assert(cf.platform_last_pushed_at === platformPushedAt, '冲突文件 platform_last_pushed_at');
}

// ─────────────────────────────────────────
// B. pull 脏度路径：clean → conflict
// ─────────────────────────────────────────
console.log('\n--- B. pull 脏度 → conflict ---');
{
  const { cwd } = mkCwd('B-pullDirty');
  // 本地脏：modified=04:00 > synced=03:00；平台 05:00 > synced → 冲突
  setTs(cwd, 'rt-change', '2026-08-10T04:00:00.000Z', '2026-08-10T03:00:00.000Z');
  const r = await new SyncManager(cwd).pull('rt-change');
  assert(r.ok === false && r.conflict === true && r.imported === false, 'pull 脏度进入 conflict 态（不 import）');
  assert(r.conflictPath && existsSync(r.conflictPath), 'pull conflict 写冲突文件');
  // 本地 DB 未被 import 覆盖（current_stage 非 verify）
  const row = getRow(cwd, 'rt-change');
  assert(row.current_stage !== 'verify', 'conflict 态不 import（current_stage 未变 verify）');
}

// ─────────────────────────────────────────
// C. conflict → resolved (keep-local) → 回 clean
// ─────────────────────────────────────────
console.log('\n--- C. keep-local → clean round-trip ---');
{
  const { cwd } = mkCwd('C-keeplocal');
  setTs(cwd, 'rt-change', '2026-08-10T04:00:00.000Z', '2026-08-10T03:00:00.000Z');
  postMode = 'conflict';
  const sm = new SyncManager(cwd);
  const r1 = await sm.sync('rt-change');
  assert(r1.conflict === true, 'C1: push 进 conflict');
  const before = getRow(cwd, 'rt-change');
  const r2 = await sm.resolve('rt-change', 'keep-local');
  assert(r2.ok && r2.resolved && r2.mode === 'keep-local', 'C2: keep-local resolved');
  const after = getRow(cwd, 'rt-change');
  assert(after.last_synced_platform_ts === platformPushedAt, 'C3: keep-local 只更新 base_ts 到平台最新');
  assert(after.last_local_modified_ts === before.last_local_modified_ts, 'C4: keep-local 本地脏度不变');
  assert(after.current_stage === before.current_stage, 'C5: keep-local 不 import（stage 不变）');
  assert(!existsSync(conflictPath(cwd, 'rt-change')), 'C6: keep-local 清冲突文件');
  // round-trip：base_ts 已推进，平台接受 → 回 clean
  postMode = 'ok';
  const r3 = await sm.sync('rt-change');
  assert(r3.synced === 1 && !r3.conflict, 'C7: keep-local 后再 push 回 clean（synced=1）');
  assert(!existsSync(conflictPath(cwd, 'rt-change')), 'C8: clean 态无冲突文件');
}

// ─────────────────────────────────────────
// D. conflict → resolved (take-platform) → 回 clean
// ─────────────────────────────────────────
console.log('\n--- D. take-platform → clean round-trip ---');
{
  const { cwd } = mkCwd('D-takeplatform');
  setTs(cwd, 'rt-change', '2026-08-10T04:00:00.000Z', '2026-08-10T03:00:00.000Z');
  const sm = new SyncManager(cwd);
  const r1 = await sm.pull('rt-change');
  assert(r1.conflict === true, 'D1: pull 进 conflict');
  const before = getRow(cwd, 'rt-change');
  assert(before.current_stage !== 'verify', 'D2: import 前 stage 非 verify');
  const r2 = await sm.resolve('rt-change', 'take-platform');
  assert(r2.ok && r2.resolved && r2.mode === 'take-platform', 'D3: take-platform resolved');
  const after = getRow(cwd, 'rt-change');
  assert(after.current_stage === 'verify', 'D4: take-platform 调 import 覆盖（stage=verify）');
  assert(after.last_synced_platform_ts === platformPushedAt, 'D5: import 后 base_ts=pushed_at（D-013）');
  assert(after.last_local_modified_ts === platformPushedAt, 'D6: import 重置脏度=pushed_at（D-013）');
  assert(!existsSync(conflictPath(cwd, 'rt-change')), 'D7: take-platform 清冲突文件');
  // round-trip：本地已对齐，再 pull 不冲突
  const r3 = await sm.pull('rt-change');
  assert(r3.ok === true && r3.imported === true && r3.conflict === false, 'D8: take-platform 后再 pull 回 clean（无冲突）');
}

// ─────────────────────────────────────────
// E. conflict → resolved (abort) → 状态不变（下次重新检测）
// ─────────────────────────────────────────
console.log('\n--- E. abort → 状态不变 round-trip ---');
{
  const { cwd } = mkCwd('E-abort');
  setTs(cwd, 'rt-change', '2026-08-10T04:00:00.000Z', '2026-08-10T03:00:00.000Z');
  postMode = 'conflict'; // C7 留下 'ok'，E 节要重新进 conflict 需重置
  const sm = new SyncManager(cwd);
  const r1 = await sm.sync('rt-change');
  assert(r1.conflict === true, 'E1: push 进 conflict');
  const before = getRow(cwd, 'rt-change');
  const r2 = await sm.resolve('rt-change', 'abort');
  assert(r2.ok && r2.resolved && r2.mode === 'abort', 'E2: abort resolved');
  const after = getRow(cwd, 'rt-change');
  assert(after.last_synced_platform_ts === before.last_synced_platform_ts, 'E3: abort base_ts 不变');
  assert(after.current_stage === before.current_stage, 'E4: abort stage 不变');
  assert(after.last_local_modified_ts === before.last_local_modified_ts, 'E5: abort 脏度不变');
  assert(!existsSync(conflictPath(cwd, 'rt-change')), 'E6: abort 清冲突文件');
  // round-trip：abort 未真正解决（base_ts 仍旧，平台仍新）→ 再 push 重新进 conflict
  postMode = 'conflict';
  const r3 = await sm.sync('rt-change');
  assert(r3.conflict === true, 'E7: abort 后再 push 重新进 conflict（未真正解决）');
  assert(existsSync(conflictPath(cwd, 'rt-change')), 'E8: 重新检测写新冲突文件');
}

// ─────────────────────────────────────────
// F. keep-local 防回退：DB base_ts 已新于冲突文件 ts 时 resolve 不拉回过去
//    （坑 2026-08-19-resolve-keep-local-base-ts-rollback：旧冲突文件是历史快照，
//     无条件覆盖会让下次 sync 立即撞 409 再落冲突文件）
// ─────────────────────────────────────────
console.log('\n--- F. keep-local base_ts 单调防回退 ---');
{
  const { cwd } = mkCwd('F-rollback');
  // 本地基线：base_ts=06:00（已由后续成功 push 回填，新于冲突文件将存的平台 05:00）
  setTs(cwd, 'rt-change', '2026-08-10T04:00:00.000Z', '2026-08-10T06:00:00.000Z');
  postMode = 'conflict';
  const sm = new SyncManager(cwd);
  const r1 = await sm.sync('rt-change');
  assert(r1.conflict === true, 'F1: push 进 conflict（平台 05:00 > base 06:00 不成立但 mock 409 强制）');
  const r2 = await sm.resolve('rt-change', 'keep-local');
  assert(r2.ok && r2.resolved && r2.mode === 'keep-local', 'F2: keep-local resolved');
  const after = getRow(cwd, 'rt-change');
  assert(after.last_synced_platform_ts === '2026-08-10T06:00:00.000Z',
    `F3: DB base_ts(06:00) 新于冲突文件 ts(05:00) 时不回退（实际 ${after.last_synced_platform_ts}）`);
  assert(!existsSync(conflictPath(cwd, 'rt-change')), 'F4: 冲突文件清理');
}

// ─────────────────────────────────────────
// G. keep-local NULL 边界：首同步前 base_ts NULL → resolve 直取平台 ts
//    （SQLite 标量 MAX(x, NULL) 恒 NULL，须 COALESCE 兜住）
// ─────────────────────────────────────────
console.log('\n--- G. keep-local base_ts NULL 直取平台 ts ---');
{
  const { cwd } = mkCwd('G-nullbase');
  setTs(cwd, 'rt-change', '2026-08-10T04:00:00.000Z', null);
  postMode = 'conflict';
  const sm = new SyncManager(cwd);
  const r1 = await sm.sync('rt-change');
  assert(r1.conflict === true, 'G1: push 进 conflict');
  const r2 = await sm.resolve('rt-change', 'keep-local');
  assert(r2.ok && r2.resolved, 'G2: keep-local resolved');
  const after = getRow(cwd, 'rt-change');
  assert(after.last_synced_platform_ts === platformPushedAt,
    `G3: base_ts NULL 时直取平台 ts（实际 ${after.last_synced_platform_ts}，期望 ${platformPushedAt}）`);
}

// 清理
await new Promise((r) => server.close(r));
try { rmSync(tmpRoot, { recursive: true, force: true }); }
catch { /* temp dir 由 OS 清理 */ }

if (failures > 0) {
  console.error(`\n[sync-conflict-statemachine] ❌ ${failures} 项失败`);
  process.exit(1);
}
console.log('\n[sync-conflict-statemachine] ✅ 全部通过');
