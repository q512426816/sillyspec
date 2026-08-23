/**
 * 坑 2026-08-19-platform-sync-base-ts-silent-conflict 根治侧回归：push 409 自竞态自愈 + keep-local 自动重推
 *
 * 背景（冲突再现根因）：同机多进程（CLI + daemon）并发 push，B 进程持旧 base_ts 撞 A 进程刚推完的
 * 409——A 的成功回填就写在本机共享 DB。旧逻辑一律落冲突文件卡死人工 resolve（「冲突再现」）；
 * keep-local 后又停在「请手动 push」，忘了推 → 他人再推 → 再 409 的循环。
 *
 * 锁定语义：
 * 1. push 409 且本机 DB base_ts 已 ≥ 平台回执 ts（并发自竞态）→ 刷新重试一次自愈，不落冲突文件
 * 2. push 409 且本机 base_ts 未覆盖（外来推送）→ 仍走真冲突路径（落文件 + 单次尝试不空转）
 * 3. resolve --keep-local → 自动重推闭环（成功 → reason 含「闭环」；再撞 → 落新冲突文件并提示再 resolve）
 */
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

const tmpRoot = mkdtempSync(join(tmpdir(), `sillyspec-selfheal-${process.pid}-`));

const platformPayload = (name, pushedAt) => ({
  project: { name: 'proj', schema_version: 4 },
  changes: [{ name, current_stage: 'plan', status: 'active', last_active: '2026-08-19T04:00:00.000Z', last_synced_platform_ts: null, last_local_modified_ts: null }],
  stages: [], steps: [], batch_progress: [], approvals: [],
  last_pushed_at: pushedAt,
});

// mock server：按变更名路由 POST 行为（failOnce409 / always409 / ok；payload 可覆盖 409 回执的
// platform_progress——push 内容一致自愈用例需要回执内容与本地六表一致）
const postPolicy = new Map(); // changeName -> { mode, calls, payload? }
const server = http.createServer((req, res) => {
  const m = /\/api\/changes\/([^/]+)\/progress/.exec(req.url);
  if (m && req.method === 'POST') {
    const name = decodeURIComponent(m[1]);
    const policy = postPolicy.get(name) || { mode: 'ok', calls: 0 };
    policy.calls = (policy.calls || 0) + 1;
    postPolicy.set(name, policy);
    if (policy.mode === 'always409' || (policy.mode === 'failOnce409' && policy.calls === 1)) {
      res.writeHead(409, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        conflict: true,
        platform_progress: policy.payload || platformPayload(name, '2026-08-19T04:00:00.000Z'),
        last_pushed_at: '2026-08-19T04:00:00.000Z',
      }));
    } else {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, last_pushed_at: '2026-08-19T05:00:00.000Z' }));
    }
    return;
  }
  res.writeHead(404); res.end();
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const mockUrl = `http://127.0.0.1:${server.address().port}`;

const makePM = (cwd) => new ProgressManager({ specDir: join(cwd, '.sillyspec') });
const setLocalTs = (cwd, name, modified, synced) => {
  const pm = makePM(cwd);
  pm._ensureDB(cwd).getDb().prepare(
    'UPDATE changes SET last_local_modified_ts = ?, last_synced_platform_ts = ? WHERE name = ?'
  ).run(modified, synced, name);
};
const getBaseTs = (cwd, name) => {
  const pm = makePM(cwd);
  const row = pm._ensureDB(cwd).getDb().prepare('SELECT last_synced_platform_ts FROM changes WHERE name = ?').get(name);
  return row && row.last_synced_platform_ts;
};
const conflictPathOf = (cwd, name) => join(cwd, '.sillyspec', '.runtime', `sync-conflict-${name}.json`);

const setupCwd = (sub, changeName) => {
  const cwd = join(tmpRoot, sub, 'proj');
  mkdirSync(join(cwd, '.sillyspec', 'changes', changeName), { recursive: true });
  const pm = makePM(cwd);
  pm.init(cwd);
  pm.initChange(cwd, changeName);
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), `platform:\n  url: ${mockUrl}\n  token: tok\n`, 'utf8');
  return { cwd, pm };
};

console.log('\n[platform-sync-self-heal] 409 自竞态自愈 + keep-local 自动重推');

// ─────────────────────────────────────────
// 1. 自竞态：本机 DB base_ts 已 ≥ 平台 409 回执 ts → 自愈重试成功，不落冲突文件
// ─────────────────────────────────────────
console.log('\n--- 1. push 409 自竞态自愈 ---');
{
  const CN = 'heal-race';
  const { cwd } = setupCwd('heal', CN);
  // 模拟并发进程 A 已推完并回填 base_ts=04:00（≥ 平台 409 回执 04:00）；本地脏度晚于 base
  setLocalTs(cwd, CN, '2026-08-19T04:30:00.000Z', '2026-08-19T04:00:00.000Z');
  postPolicy.set(CN, { mode: 'failOnce409', calls: 0 });

  const sm = new SyncManager(cwd);
  const r = await sm.sync(CN);
  assert(r.synced === 1 && !r.conflict, '自竞态 409 → 重试成功 synced=1');
  assert(!existsSync(conflictPathOf(cwd, CN)), '自愈路径不落冲突文件');
  assert(postPolicy.get(CN).calls === 2, '恰好 2 次 POST（409 + 自愈重试）');
  assert(getBaseTs(cwd, CN) === '2026-08-19T05:00:00.000Z', '成功回填推进 base_ts 到平台回执 05:00');
}

// ─────────────────────────────────────────
// 2. 外来冲突：本机 base_ts 未覆盖平台 ts → 真冲突路径（落文件 + 不空转重试）
// ─────────────────────────────────────────
console.log('\n--- 2. push 409 外来冲突不自愈（fail-closed）---');
{
  const CN = 'heal-foreign';
  const { cwd } = setupCwd('foreign', CN);
  // 本机 base=02:00 < 平台 04:00：赢者是外来推送（不可能推进本机 DB）→ 真冲突
  setLocalTs(cwd, CN, '2026-08-19T03:00:00.000Z', '2026-08-19T02:00:00.000Z');
  postPolicy.set(CN, { mode: 'always409', calls: 0 });

  const sm = new SyncManager(cwd);
  const r = await sm.sync(CN);
  assert(r.synced === 0 && r.conflict === true, '外来 409 → 真冲突（conflict=true）');
  assert(existsSync(conflictPathOf(cwd, CN)), '冲突文件落盘');
  assert(postPolicy.get(CN).calls === 1, '非自竞态不空转重试（单次 POST 即落冲突）');
}

// ─────────────────────────────────────────
// 3. keep-local 自动重推：成功闭环
// ─────────────────────────────────────────
console.log('\n--- 3. resolve keep-local 自动重推闭环 ---');
{
  const CN = 'heal-keeep';
  const { cwd } = setupCwd('keep', CN);
  // 造一起冲突文件（platform_last_pushed_at=04:00），本地 base=02:00
  setLocalTs(cwd, CN, '2026-08-19T03:00:00.000Z', '2026-08-19T02:00:00.000Z');
  const sm = new SyncManager(cwd);
  sm._writeConflictFile(CN, {
    base_ts: '2026-08-19T02:00:00.000Z',
    local_modified_ts: '2026-08-19T03:00:00.000Z',
    platform_last_pushed_at: '2026-08-19T04:00:00.000Z',
    platform_progress: platformPayload(CN, '2026-08-19T04:00:00.000Z'),
  });
  postPolicy.set(CN, { mode: 'ok', calls: 0 });

  const r = await sm.resolve(CN, 'keep-local');
  assert(r.ok === true && r.resolved === true, 'keep-local resolve 成功');
  assert(r.reason.includes('闭环'), 'reason 含「闭环」（自动重推成功，无需再手动 sync）');
  assert(!existsSync(conflictPathOf(cwd, CN)), '冲突文件已清');
  assert(postPolicy.get(CN).calls >= 1, 'keep-local 后自动 push 至少一次');
  assert(getBaseTs(cwd, CN) === '2026-08-19T05:00:00.000Z', '重推成功回填 base_ts=05:00');
}

// ─────────────────────────────────────────
// 4. keep-local 自动重推再撞外来更新 → 软提示，不落新冲突文件（下次常规同步重新判定）
// ─────────────────────────────────────────
console.log('\n--- 4. keep-local 重推再撞 → 软提示不落新冲突文件 ---');
{
  const CN = 'heal-keep2';
  const { cwd } = setupCwd('keep2', CN);
  setLocalTs(cwd, CN, '2026-08-19T03:00:00.000Z', '2026-08-19T02:00:00.000Z');
  const sm = new SyncManager(cwd);
  sm._writeConflictFile(CN, {
    base_ts: '2026-08-19T02:00:00.000Z',
    local_modified_ts: '2026-08-19T03:00:00.000Z',
    platform_last_pushed_at: '2026-08-19T04:00:00.000Z',
    platform_progress: platformPayload(CN, '2026-08-19T04:00:00.000Z'),
  });
  postPolicy.set(CN, { mode: 'always409', calls: 0 });

  const r = await sm.resolve(CN, 'keep-local');
  assert(r.ok === true && r.resolved === true, 'resolve 本身成功（原冲突已按 keep-local 处理）');
  assert(r.reason.includes('重新判定'), 'reason 说明自动重推被拒、下次同步重新判定');
  // fromResolve 抑制：不落新冲突文件（冲突文件代表待人工三选一的未决状态，用户刚做完选择；
  // 下次常规 sync 按新 base 判定，真有新分歧自然再进 conflict）
  assert(!existsSync(conflictPathOf(cwd, CN)), '不落新冲突文件（保持 keep-local 清文件回 clean 契约）');
  assert(postPolicy.get(CN).calls >= 1, '自动重推确实发起过（有界重试后软失败）');
  assert(getBaseTs(cwd, CN) === '2026-08-19T04:00:00.000Z', 'base_ts 已推进到平台最新（keep-local 主效果）');
}

// ─────────────────────────────────────────
// 5. push 409 + 外来内容一致（部署噪声）→ 内容一致自愈，不落冲突文件
//    （坑 push-409-foreign-noise：pull 侧有 _progressContentEquals 自愈，push 侧原没有——
//     他机重推内容相同的进度仍落真冲突 + 横幅 + 人工 resolve，而内容其实零分歧）
// ─────────────────────────────────────────
console.log('\n--- 5. push 409 外来内容一致 → 自愈 ---');
{
  const CN = 'heal-noise';
  const { cwd, pm } = setupCwd('noise', CN);
  // 本机 base=02:00 < 平台 04:00（非自竞态）；409 回执的 platform_progress = 本地当前六表内容
  setLocalTs(cwd, CN, '2026-08-19T03:00:00.000Z', '2026-08-19T02:00:00.000Z');
  const localSnapshot = pm.serializeForSync(cwd, CN);
  postPolicy.set(CN, { mode: 'always409', calls: 0, payload: localSnapshot });

  const sm = new SyncManager(cwd);
  const r = await sm.sync(CN);
  assert(r.synced === 1 && r.selfHealed === true, `外来 409 内容一致 → 自愈 synced=1（实际 ${JSON.stringify(r)}）`);
  assert(!existsSync(conflictPathOf(cwd, CN)), '内容一致不落冲突文件');
  assert(postPolicy.get(CN).calls === 1, '单次 POST 即自愈收敛（不重试不空转）');
  assert(getBaseTs(cwd, CN) === '2026-08-19T04:00:00.000Z', 'base_ts 推进到平台 ts（04:00，与 keep-local 同语义）');
}

// ─────────────────────────────────────────
// 6. 冲突文件已存在 → sync() 降噪跳过（不再每步 triggerSync 刷全幅横幅）
// ─────────────────────────────────────────
console.log('\n--- 6. 冲突文件存在 → 单行降噪不刷横幅 ---');
{
  const CN = 'heal-pending';
  const { cwd } = setupCwd('pending', CN);
  setLocalTs(cwd, CN, '2026-08-19T03:00:00.000Z', '2026-08-19T02:00:00.000Z');
  const sm = new SyncManager(cwd);
  sm._writeConflictFile(CN, {
    base_ts: '2026-08-19T02:00:00.000Z',
    local_modified_ts: '2026-08-19T03:00:00.000Z',
    platform_last_pushed_at: '2026-08-19T04:00:00.000Z',
    platform_progress: platformPayload(CN, '2026-08-19T04:00:00.000Z'),
  });
  postPolicy.set(CN, { mode: 'always409', calls: 0 });

  const warns = [];
  const origWarn = console.warn;
  console.warn = (...a) => { warns.push(a.join(' ')) };
  let r;
  try { r = await sm.sync(CN); } finally { console.warn = origWarn }
  assert(r.suppressed === true && r.synced === 0, `冲突未决 → 跳过推送返回 suppressed（实际 ${JSON.stringify(r)}）`);
  assert(postPolicy.get(CN).calls === 0, '不发 POST（不再撞 409）');
  const bannerCount = warns.filter(w => w.includes('⚠️⚠️⚠️')).length;
  assert(bannerCount === 0, '不打全幅双线横幅');
  assert(warns.some(w => w.includes('未决平台冲突') && w.includes('resolve')), '单行提示含 resolve 指引（可见但不吓人）');
}

// 清理
await new Promise((r) => server.close(r));
try { rmSync(tmpRoot, { recursive: true, force: true }); }
catch { /* temp dir 由 OS 清理 */ }

if (failures > 0) {
  console.error(`\n[platform-sync-self-heal] ❌ ${failures} 项失败`);
  process.exit(1);
}
console.log('\n[platform-sync-self-heal] ✅ 全部通过');
