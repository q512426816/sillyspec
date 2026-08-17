// task-09 验收：sync.js POST 元字段走 HTTP header（design §7 / D-015 / FR-08 / FR-09）。
//
// 验收点（task-09.md acceptance）：
// 1. POST body 为 serializeForSync 裸六表 JSON 不含元字段（user/base_ts/pushed_at）
// 2. header 含 X-SillySpec-User（local.yaml platform.user）与 X-SillySpec-Base-Ts（last_synced_platform_ts）与 X-SillySpec-Pushed-At（客户端时钟 ISO）
// 3. 200 成功（sillyhub 老版忽略 header）push 仍成功零回归
// 4. 409 冲突响应被识别（conflict:true）+ 读回平台最新 JSON
//
// 隔离：cwd 用 os.tmpdir() 临时目录 + Node http mock server（127.0.0.1 随机端口），绝不碰真实 .sillyspec/.runtime。
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

const tmpRoot = mkdtempSync(join(tmpdir(), `sillyspec-sync-push-${process.pid}-`));

console.log('\n[platform-sync-push-header] task-09：sync POST 元字段走 HTTP header');

// ─────────────────────────────────────────
// mock HTTP server：记录最后 progress 请求，progress 端点按模式返回 200 / 409。
// lastReq 只记 /progress——sync() 成功路径还会顺带发 spec-manifest/spec-sync
// （2026-08-17-spec-file-incremental-sync 文件树增量同步），不过滤会被覆盖。
// ─────────────────────────────────────────
let lastReq = null;
let conflictMode = false;
const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    if (req.url.includes('/progress')) {
      lastReq = { method: req.method, url: req.url, headers: req.headers, body };
      if (conflictMode) {
        res.writeHead(409, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          conflict: true,
          last_pushed_at: '2026-08-10T03:00:00.000Z',
          platform_progress: { project: { id: 1 }, changes: [{ name: 'test-change' }] },
        }));
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, last_pushed_at: '2026-08-10T02:00:00.000Z' }));
      }
    } else {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
    }
  });
});

// ─────────────────────────────────────────
// fixture：change + local.yaml platform（user=alice）+ base_ts
// ─────────────────────────────────────────
const cwd = join(tmpRoot, 'fixture');
mkdirSync(join(cwd, '.sillyspec'), { recursive: true });
const pm = makePM(cwd);
pm.init(cwd);
pm.initChange(cwd, 'test-change');
// 设 base_ts（task-04 前手动 UPDATE 模拟已同步）
pm._ensureDB(cwd).getDb().prepare(
  'UPDATE changes SET last_synced_platform_ts = ? WHERE name = ?'
).run('2026-08-10T01:00:00.000Z', 'test-change');

await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const mockUrl = `http://127.0.0.1:${port}`;
writeFileSync(
  join(cwd, '.sillyspec', 'local.yaml'),
  `platform:\n  url: ${mockUrl}\n  token: test-token\n  user: alice\n`,
  'utf8',
);

// ─────────────────────────────────────────
// 1+2+3. 200 成功路径：header 三件套 + body 裸六表 + 零回归
// ─────────────────────────────────────────
console.log('\n--- 1. 200 成功：header + 裸 body + 零回归 ---');
const sm = new SyncManager(cwd);
const result = await sm.sync('test-change');

assert(result.synced === 1, `200 push 成功（synced=1，老版忽略 header 零回归）（实际 ${result.synced}）`);
assert(result.errors.length === 0, '无错误');

assert(lastReq !== null, '捕获到 POST 请求');
assert(lastReq && lastReq.method === 'POST', `method=POST（实际 ${lastReq && lastReq.method}）`);
assert(lastReq && lastReq.url === `/api/changes/test-change/progress`, `url=${mockUrl}/api/changes/test-change/progress（实际 ${lastReq && lastReq.url}）`);

// header 三件套
const h = lastReq && lastReq.headers;
assert(h && h['x-sillyspec-user'] === 'alice', `header X-SillySpec-User=alice（实际 ${h && h['x-sillyspec-user']}）`);
assert(h && h['x-sillyspec-base-ts'] === '2026-08-10T01:00:00.000Z',
  `header X-SillySpec-Base-Ts=last_synced_platform_ts（实际 ${h && h['x-sillyspec-base-ts']}）`);
assert(h && typeof h['x-sillyspec-pushed-at'] === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(h['x-sillyspec-pushed-at']),
  `header X-SillySpec-Pushed-At=客户端时钟 ISO（实际 ${h && h['x-sillyspec-pushed-at']}）`);

// body 裸六表，不含元字段
const parsed = JSON.parse(lastReq.body);
for (const k of ['project', 'changes', 'stages', 'steps', 'batch_progress', 'approvals']) {
  assert(k in parsed, `body 含 ${k} 键（serializeForSync 六表）`);
}
assert(!('user' in parsed) && !('base_ts' in parsed) && !('pushed_at' in parsed),
  'body 不含 user/base_ts/pushed_at 元字段（裸六表 JSON，D-015）');
assert(parsed.changes[0].name === 'test-change', `body.changes[0].name（实际 ${parsed.changes[0].name}）`);
assert(parsed.changes[0].last_synced_platform_ts === '2026-08-10T01:00:00.000Z', 'body 正常含 base_ts 列值（六表数据，非元字段）');
// task-04 initChange 标脏：新 change 的 last_local_modified_ts 是 ISO 非 null（本地有未同步推进）
assert(typeof parsed.changes[0].last_local_modified_ts === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(parsed.changes[0].last_local_modified_ts),
  `body.changes[0].last_local_modified_ts 为 ISO（task-04 标脏，实际 ${parsed.changes[0].last_local_modified_ts}）`);

// ─────────────────────────────────────────
// 4. 409 冲突：识别 + 读回平台最新 JSON
// ─────────────────────────────────────────
console.log('\n--- 2. 409 冲突识别 + 读回平台 JSON ---');
conflictMode = true;
const conflictResult = await sm.sync('test-change');
conflictMode = false;

assert(conflictResult.conflict === true, '409 被识别（conflict:true）');
assert(conflictResult.errors.length === 1 && conflictResult.errors[0].includes('冲突'), `errors 含冲突（实际 ${conflictResult.errors[0]}）`);
assert(conflictResult.platform_progress !== null && conflictResult.platform_progress.changes && conflictResult.platform_progress.changes[0].name === 'test-change',
  '读回平台最新 JSON（platform_progress.changes[0].name）');

// ─────────────────────────────────────────
// 5. header 元字段缺失降级：旧 local.yaml 无 user + base_ts NULL（首次同步）→ 不设对应 header 仍成功
// ─────────────────────────────────────────
console.log('\n--- 3. 缺失元字段降级（老配置 / 首次同步）---');
const cwd2 = join(tmpRoot, 'legacy');
mkdirSync(join(cwd2, '.sillyspec'), { recursive: true });
const pm2 = makePM(cwd2);
pm2.init(cwd2);
pm2.initChange(cwd2, 'legacy-change');
writeFileSync(
  join(cwd2, '.sillyspec', 'local.yaml'),
  `platform:\n  url: ${mockUrl}\n  token: legacy-tok\n`, // 无 user（task-08 前旧配置）
  'utf8',
);
const sm2 = new SyncManager(cwd2);
const r2 = await sm2.sync('legacy-change');
assert(r2.synced === 1, `旧配置无 user + base_ts NULL 仍 push 成功（实际 synced=${r2.synced}）`);
const h2 = lastReq && lastReq.headers;
assert(h2 && h2['x-sillyspec-user'] === undefined, '无 user 配置 → 不设 X-SillySpec-User（未知推送者，平台兜底）');
assert(h2 && h2['x-sillyspec-base-ts'] === undefined, 'base_ts NULL（首次同步）→ 不设 X-SillySpec-Base-Ts');
assert(h2 && typeof h2['x-sillyspec-pushed-at'] === 'string', 'X-SillySpec-Pushed-At 始终设');
const parsed2 = JSON.parse(lastReq.body);
assert(parsed2.changes[0].name === 'legacy-change' && parsed2.changes[0].last_synced_platform_ts === null,
  'legacy change body 正确（base_ts null）');

// 清理
await new Promise((r) => server.close(r));
try { rmSync(tmpRoot, { recursive: true, force: true }); }
catch { /* temp dir 由 OS 清理 */ }

if (failures > 0) {
  console.error(`\n[platform-sync-push-header] ❌ ${failures} 项失败`);
  process.exit(1);
}
console.log('\n[platform-sync-push-header] ✅ 全部通过');
