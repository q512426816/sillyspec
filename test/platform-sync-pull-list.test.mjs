// task-06 验收：SyncManager.pullList() 两级 pull 第一级（design §7 / D-001 / D-006 / FR-01 / FR-03）。
//
// 验收点（task-06.md acceptance + 契约 PullListResult [ok, changes, reason]）：
// 1. pullList 返回 PullListResult 含 ok changes reason
// 2. 未连接平台时 ok:false + reason 未连接平台
// 3. 网络失败 console.warn 不抛错（ok:false + reason）
// 4. 兼容裸数组 / {changes:[...]} 包裹两种响应形态
//
// 隔离：cwd 用 os.tmpdir() 临时目录 + Node http mock server（127.0.0.1 随机端口）。
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import http from 'http';
import { SyncManager } from '../src/sync.js';

let failures = 0;
const assert = (cond, msg) => {
  if (cond) console.log('  ✅ ' + msg);
  else { console.error('  ❌ ' + msg); failures++; }
};

const tmpRoot = mkdtempSync(join(tmpdir(), `sillyspec-pull-list-${process.pid}-`));

console.log('\n[platform-sync-pull-list] task-06：pullList 两级 pull 第一级');

// ─────────────────────────────────────────
// mock HTTP server：GET /api/changes 按模式返回数组 / 包裹 / 500
// ─────────────────────────────────────────
let responseMode = 'array';
const server = http.createServer((req, res) => {
  if (req.url === '/api/changes' && req.method === 'GET') {
    if (responseMode === 'array') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify([
        { name: 'change-a', current_stage: 'brainstorm', last_pushed_at: '2026-08-10T01:00:00.000Z', last_pusher: 'alice' },
        { name: 'change-b', current_stage: 'plan', last_pushed_at: '2026-08-10T02:00:00.000Z', last_pusher: 'bob' },
      ]));
    } else if (responseMode === 'wrapped') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        changes: [{ name: 'change-c', current_stage: 'execute', last_pushed_at: '2026-08-10T03:00:00.000Z', last_pusher: 'carol' }],
      }));
    } else if (responseMode === 'empty') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify([]));
    } else if (responseMode === 'error') {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'internal' }));
    } else {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({}));
    }
  } else {
    res.writeHead(404);
    res.end();
  }
});

await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const mockUrl = `http://127.0.0.1:${port}`;

// ─────────────────────────────────────────
// 1. 数组响应 → changes 列表
// ─────────────────────────────────────────
console.log('\n--- 1. 数组响应 ---');
{
  const cwd = join(tmpRoot, 'array');
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true });
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'),
    `platform:\n  url: ${mockUrl}\n  token: tok\n`, 'utf8');
  responseMode = 'array';
  const r = await new SyncManager(cwd).pullList();
  assert(r.ok === true, `ok=true（实际 ${r.ok}）`);
  assert(Array.isArray(r.changes) && r.changes.length === 2, `changes 2 项（实际 ${r.changes.length}）`);
  assert(r.changes[0].name === 'change-a' && r.changes[0].last_pusher === 'alice',
    `changes[0] 字段正确（${r.changes[0].name}/${r.changes[0].last_pusher}）`);
  assert(r.changes[1].current_stage === 'plan', 'changes[1].current_stage=plan');
  assert(r.reason === undefined, '成功无 reason');
}

// ─────────────────────────────────────────
// 2. 包裹响应 { changes: [...] }
// ─────────────────────────────────────────
console.log('\n--- 2. 包裹响应 ---');
{
  const cwd = join(tmpRoot, 'wrapped');
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true });
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'),
    `platform:\n  url: ${mockUrl}\n  token: tok\n`, 'utf8');
  responseMode = 'wrapped';
  const r = await new SyncManager(cwd).pullList();
  assert(r.ok === true, `ok=true（实际 ${r.ok}）`);
  assert(r.changes.length === 1 && r.changes[0].name === 'change-c',
    `包裹形态解包出 changes[0]=change-c（实际 ${r.changes.length}/${r.changes[0] && r.changes[0].name}）`);
}

// ─────────────────────────────────────────
// 3. 空列表
// ─────────────────────────────────────────
console.log('\n--- 3. 空列表 ---');
{
  const cwd = join(tmpRoot, 'empty');
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true });
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'),
    `platform:\n  url: ${mockUrl}\n  token: tok\n`, 'utf8');
  responseMode = 'empty';
  const r = await new SyncManager(cwd).pullList();
  assert(r.ok === true && Array.isArray(r.changes) && r.changes.length === 0, '空数组 ok=true changes=[]');
}

// ─────────────────────────────────────────
// 4. 未连接平台 → ok:false + reason 未连接平台
// ─────────────────────────────────────────
console.log('\n--- 4. 未连接平台 ---');
{
  const cwd = join(tmpRoot, 'noplatform');
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true });
  const r = await new SyncManager(cwd).pullList();
  assert(r.ok === false, '未连接 ok=false');
  assert(Array.isArray(r.changes) && r.changes.length === 0, '未连接 changes=[]');
  assert(r.reason === '未连接平台', `reason='未连接平台'（实际 ${r.reason}）`);
}

// ─────────────────────────────────────────
// 5. 网络失败（500 / 错误地址）→ ok:false 不抛
// ─────────────────────────────────────────
console.log('\n--- 5. 网络失败（不抛错）---');
{
  const cwd = join(tmpRoot, 'servererr');
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true });
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'),
    `platform:\n  url: ${mockUrl}\n  token: tok\n`, 'utf8');
  responseMode = 'error';
  let threw = false;
  let r;
  try { r = await new SyncManager(cwd).pullList(); }
  catch (e) { threw = true; r = { ok: null }; }
  assert(!threw, '500 不抛错');
  assert(r.ok === false && r.changes.length === 0, `500 → ok=false changes=[]（ok=${r.ok}）`);
  assert(r.reason === '拉取变更列表失败', `reason='拉取变更列表失败'（实际 ${r.reason}）`);
}
{
  // 不可达地址（无 server 监听）
  const cwd = join(tmpRoot, 'unreachable');
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true });
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'),
    `platform:\n  url: http://127.0.0.1:1\n  token: tok\n`, 'utf8');
  let threw = false;
  let r;
  try { r = await new SyncManager(cwd).pullList(); }
  catch (e) { threw = true; r = { ok: null }; }
  assert(!threw, '不可达地址不抛错');
  assert(r.ok === false && r.reason === '拉取变更列表失败', `不可达 → ok=false reason=失败（ok=${r.ok}, reason=${r.reason}）`);
}

// 清理
await new Promise((r) => server.close(r));
try { rmSync(tmpRoot, { recursive: true, force: true }); }
catch { /* temp dir 由 OS 清理 */ }

if (failures > 0) {
  console.error(`\n[platform-sync-pull-list] ❌ ${failures} 项失败`);
  process.exit(1);
}
console.log('\n[platform-sync-pull-list] ✅ 全部通过');
