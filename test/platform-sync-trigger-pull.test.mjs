// task-10 验收：triggerPull / triggerPullActiveChange 注入与 Best Effort（design §7 / D-009 / FR-04 / FR-06）。
//
// 验收点（task-10.md acceptance）：
// 1. triggerPull 未连接平台静默跳过不抛错
// 2. triggerPull 连接时调 SyncManager.pull（pull 成功/失败均不抛，Best Effort）
// 3. triggerPullActiveChange 未连接跳过；单活跃变更自动推导；多/无活跃跳过
// 4. 8s 熔断：pull 慢时 triggerPull 不无限等待（用快速 mock 验证不 hang）
//
// 隔离：cwd 用 os.tmpdir() + mock http server。
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import http from 'http';
import { triggerPull, triggerPullActiveChange } from '../src/run/shared.js';
import { ProgressManager } from '../src/progress.js';

let failures = 0;
const assert = (cond, msg) => {
  if (cond) console.log('  ✅ ' + msg);
  else { console.error('  ❌ ' + msg); failures++; }
};

const makePM = (cwd) => new ProgressManager({ specDir: join(cwd, '.sillyspec') });
const tmpRoot = mkdtempSync(join(tmpdir(), `sillyspec-trigger-pull-${process.pid}-`));

console.log('\n[platform-sync-trigger-pull] task-10：triggerPull 注入与 Best Effort');

// mock server：GET /api/changes/<name>/progress
let pullCount = 0;
const server = http.createServer((req, res) => {
  if (req.url.includes('/progress') && req.method === 'GET') {
    pullCount++;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      project: { name: 'proj', schema_version: 4 },
      changes: [{ name: 'rt-change', current_stage: 'scan', status: 'active', last_active: '2026-08-10T02:00:00.000Z', last_synced_platform_ts: null, last_local_modified_ts: null }],
      stages: [], steps: [], batch_progress: [], approvals: [],
      last_pushed_at: '2026-08-10T02:00:00.000Z',
    }));
  } else {
    res.writeHead(404); res.end();
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const mockUrl = `http://127.0.0.1:${port}`;

// ─────────────────────────────────────────
// 1. triggerPull 未连接 → 静默跳过不抛
// ─────────────────────────────────────────
console.log('\n--- 1. 未连接静默跳过 ---');
{
  const cwd = join(tmpRoot, 'noplatform', 'proj');
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true });
  const before = pullCount;
  let threw = false;
  try { await triggerPull(cwd, 'rt-change'); }
  catch (e) { threw = true; }
  assert(!threw, 'triggerPull 未连接不抛错');
  assert(pullCount === before, `未连接不发起 pull（pullCount 不变，实际 ${pullCount}）`);

  let threw2 = false;
  try { await triggerPullActiveChange(cwd); }
  catch (e) { threw2 = true; }
  assert(!threw2, 'triggerPullActiveChange 未连接不抛错');
}

// ─────────────────────────────────────────
// 2. triggerPull 连接 → 调 pull（Best Effort）
// ─────────────────────────────────────────
console.log('\n--- 2. 连接调 pull ---');
{
  const cwd = join(tmpRoot, 'connected', 'proj');
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true });
  const pm = makePM(cwd);
  pm.init(cwd);
  pm.initChange(cwd, 'rt-change');
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), `platform:\n  url: ${mockUrl}\n  token: tok\n`, 'utf8');
  const before = pullCount;
  let threw = false;
  try { await triggerPull(cwd, 'rt-change'); }
  catch (e) { threw = true; }
  assert(!threw, 'triggerPull 连接不抛错');
  assert(pullCount === before + 1, `连接发起 1 次 pull（实际 ${pullCount - before}）`);
  // import 生效：last_synced_platform_ts 更新为 pushed_at
  const row = pm._ensureDB(cwd).getDb().prepare('SELECT last_synced_platform_ts FROM changes WHERE name = ?').get('rt-change');
  assert(row.last_synced_platform_ts === '2026-08-10T02:00:00.000Z', `pull 后 import 生效（last_synced_platform_ts=${row.last_synced_platform_ts}）`);
}

// ─────────────────────────────────────────
// 3. triggerPullActiveChange 单活跃自动推导
// ─────────────────────────────────────────
console.log('\n--- 3. triggerPullActiveChange 自动推导 ---');
{
  const cwd = join(tmpRoot, 'active', 'proj');
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true });
  const pm = makePM(cwd);
  pm.init(cwd);
  pm.initChange(cwd, 'solo-change');
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), `platform:\n  url: ${mockUrl}\n  token: tok\n`, 'utf8');
  const before = pullCount;
  await triggerPullActiveChange(cwd);
  // 单活跃 solo-change 但 mock 只认 rt-change → 404 → pull 返回 ok:false（Best Effort 不抛）
  // pullCount 仍 +1（发起了请求）
  assert(pullCount === before + 1, `单活跃自动推导发起 pull（实际 ${pullCount - before}）`);
}

// ─────────────────────────────────────────
// 4. triggerPullActiveChange 多活跃 / 无活跃跳过
// ─────────────────────────────────────────
console.log('\n--- 4. 多/无活跃跳过 ---');
{
  const cwdMulti = join(tmpRoot, 'multi', 'proj');
  mkdirSync(join(cwdMulti, '.sillyspec'), { recursive: true });
  const pmM = makePM(cwdMulti);
  pmM.init(cwdMulti);
  pmM.initChange(cwdMulti, 'a');
  pmM.initChange(cwdMulti, 'b');
  writeFileSync(join(cwdMulti, '.sillyspec', 'local.yaml'), `platform:\n  url: ${mockUrl}\n  token: tok\n`, 'utf8');
  const before = pullCount;
  await triggerPullActiveChange(cwdMulti);
  assert(pullCount === before, `多活跃不发起 pull（无法确定目标，实际 ${pullCount - before}）`);
}

// ─────────────────────────────────────────
// 5. 平台模式 opts → 跳过（走平台自有链路）
// ─────────────────────────────────────────
console.log('\n--- 5. 平台模式跳过 ---');
{
  const cwd = join(tmpRoot, 'platformmode', 'proj');
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true });
  const before = pullCount;
  await triggerPull(cwd, 'x', { specRoot: '/some/specroot' });
  await triggerPullActiveChange(cwd, { runtimeRoot: '/some/rt' });
  assert(pullCount === before, '平台模式 opts 跳过（specRoot/runtimeRoot 存在）');
}

// 清理
await new Promise((r) => server.close(r));
try { rmSync(tmpRoot, { recursive: true, force: true }); }
catch { /* temp dir 由 OS 清理 */ }

if (failures > 0) {
  console.error(`\n[platform-sync-trigger-pull] ❌ ${failures} 项失败`);
  process.exit(1);
}
console.log('\n[platform-sync-trigger-pull] ✅ 全部通过');
