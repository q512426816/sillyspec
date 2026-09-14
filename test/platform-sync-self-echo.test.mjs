// ql-20260914-001 验收：平台进度同步自回声假冲突根治（坑 sync-self-echo-false-conflict /
// sync-base-ts-out-of-order-backfill，2026-09-14 multi-agent-platform 实证 6 个假冲突全为本机
// 自推回声被误判为他端更新）。
//
// 验收点：
// 1. pull 自回声：平台血统（changes[0].last_local_modified_ts）∈ [base, local_modified] →
//    不 import、不落冲突文件、base_ts 推进到平台 ts（本地 ≥ 回声状态，下次 push 无损收敛）
// 2. pull 外来血统（> local_modified）→ 维持真冲突：落文件 + conflict:true（无误放行）
// 3. pull 血统 < base（平台持更旧血统 + 更新 ts 的怪态）→ fail-closed 维持冲突
// 4. push 409 自回声：血统在窗口内 → base 推进 + 自动重试推送成功，无冲突文件
// 5. push 409 外来血统 → 维持真冲突：落文件 + conflict:true
// 6. base_ts 单调推进（MAX）：旧回执不覆盖已推进 base；新回执正常推进；null 保旧
// 7. 冲突文件过期自清：文件在但 base ≥ 文件记录的平台 ts → 自动清除并恢复推送；
//    base < 平台 ts → 维持抑制（fail-closed）
// 8. 身份优先归属（ql-20260914 第二批）：平台回传 last_pusher==本人 → 血统上界内自愈，
//    且下界放开（老于 base 的自家旧快照也判自回声）；push 409 同族
// 9. 身份否决（盲区关闭回归）：last_pusher≠本人（他机慢钟血统落窗口内）→ 一律真冲突
//
// 隔离：cwd 用 os.tmpdir() + mock http server（响应形态可控：平台血统 / 409 序列）。
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

const tmpRoot = mkdtempSync(join(tmpdir(), `sillyspec-selfecho-${process.pid}-`));

// mock server 可控状态：GET 返回平台快照（血统/平台 ts/推送者可控）；POST 按 seq 依次回响应
let platformLin = null;      // 平台快照 changes[0].last_local_modified_ts（血统标记）
let platformPushedAt = null; // 平台 last_pushed_at
let platformPusher;          // 平台 last_pusher（ql-20260914 第二批：undefined=老服务端不回传）
let postResponses = [];      // POST 响应序列：{ status: 200 } | { status: 409 }（409 携带平台态）
const server = http.createServer((req, res) => {
  const payload = (name, pushedAt, lin) => ({
    project: { name: 'proj', schema_version: 4 },
    changes: [{ name, current_stage: 'plan', status: 'active', last_active: '2026-08-10T04:00:00.000Z', last_synced_platform_ts: null, last_local_modified_ts: lin ?? null }],
    stages: [], steps: [], batch_progress: [], approvals: [],
    last_pushed_at: pushedAt,
  });
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    const m = req.url.match(/\/api\/changes\/([^/]+)\/progress/);
    const name = m ? decodeURIComponent(m[1]) : 'unknown';
    if (m && req.method === 'GET') {
      const resp = { ...payload(name, platformPushedAt, platformLin) };
      if (platformPusher !== undefined) resp.last_pusher = platformPusher; // 未设=老服务端不回传
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(resp));
    } else if (m && req.method === 'POST') {
      const next = postResponses.shift() || { status: 200 };
      if (next.status === 409) {
        const resp = {
          conflict: true,
          platform_progress: payload(name, platformPushedAt, platformLin),
          last_pushed_at: platformPushedAt,
        };
        if (platformPusher !== undefined) resp.last_pusher = platformPusher;
        res.writeHead(409, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(resp));
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      }
    } else {
      res.writeHead(404); res.end();
    }
  });
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const mockUrl = `http://127.0.0.1:${server.address().port}`;

const makePM = (cwd) => new ProgressManager({ specDir: join(cwd, '.sillyspec') });
const setLocalTs = (cwd, name, modified, synced) => {
  makePM(cwd)._ensureDB(cwd).getDb().prepare(
    'UPDATE changes SET last_local_modified_ts = ?, last_synced_platform_ts = ? WHERE name = ?'
  ).run(modified, synced, name);
};
const getBase = (cwd, name) =>
  makePM(cwd)._ensureDB(cwd).getDb().prepare(
    'SELECT last_synced_platform_ts FROM changes WHERE name = ?'
  ).get(name).last_synced_platform_ts;
const conflictPathOf = (cwd, name) => join(cwd, '.sillyspec', '.runtime', `sync-conflict-${name}.json`);

const setupCwd = (sub, opts = {}) => {
  const cwd = join(tmpRoot, sub, 'proj');
  mkdirSync(join(cwd, '.sillyspec', 'changes', 'se-change'), { recursive: true });
  makePM(cwd).init(cwd);
  makePM(cwd).initChange(cwd, 'se-change');
  // opts.user：local.yaml platform.user（身份用例注入确定性推送者，与发送侧 X-SillySpec-User 同源）
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), `platform:\n  url: ${mockUrl}\n  token: tok\n` + (opts.user ? `  user: ${opts.user}\n` : ''), 'utf8');
  return cwd;
};

console.log('\n[platform-sync-self-echo] ql-20260914-001：自回声血统归属 + base 单调 + 冲突文件自清');

// ─────────────────────────────────────────
// 1. pull 自回声：血统 ∈ [base, local_modified] → 不冲突不 import，base 推进
// ─────────────────────────────────────────
console.log('\n--- 1. pull 自回声血统判定 ---');
{
  const cwd = setupCwd('pull-selfecho');
  // 本地：modified=03:00 > base=02:00（脏）；平台：pushed=04:00、血统=02:30（窗口内 = 本机自推回声）
  setLocalTs(cwd, 'se-change', '2026-08-10T03:00:00.000Z', '2026-08-10T02:00:00.000Z');
  platformLin = '2026-08-10T02:30:00.000Z';
  platformPushedAt = '2026-08-10T04:00:00.000Z';

  const r = await new SyncManager(cwd).pull('se-change');
  assert(r.ok === true && r.conflict === false && r.imported === false, '自回声：ok=true / conflict=false / 不 import');
  assert(!existsSync(conflictPathOf(cwd, 'se-change')), '自回声：不落冲突文件');
  assert(getBase(cwd, 'se-change') === '2026-08-10T04:00:00.000Z', `自回声：base_ts 推进到平台 ts（实际 ${getBase(cwd, 'se-change')}）`);
}

// ─────────────────────────────────────────
// 2. pull 外来血统（新于本地）→ 维持真冲突
// ─────────────────────────────────────────
console.log('\n--- 2. pull 外来血统维持冲突 ---');
{
  const cwd = setupCwd('pull-foreign');
  setLocalTs(cwd, 'se-change', '2026-08-10T03:00:00.000Z', '2026-08-10T02:00:00.000Z');
  platformLin = '2026-08-10T03:30:00.000Z'; // > local_modified：本库从未有过的血统
  platformPushedAt = '2026-08-10T04:00:00.000Z';

  const r = await new SyncManager(cwd).pull('se-change');
  assert(r.ok === false && r.conflict === true && r.imported === false, '外来血统：conflict=true 不 import');
  assert(existsSync(conflictPathOf(cwd, 'se-change')), '外来血统：冲突文件落盘');
}

// ─────────────────────────────────────────
// 3. pull 血统 < base（平台持更旧血统 + 更新 ts 怪态）→ fail-closed 维持冲突
// ─────────────────────────────────────────
console.log('\n--- 3. pull 血统低于 base 维持冲突 ---');
{
  const cwd = setupCwd('pull-oldlin');
  setLocalTs(cwd, 'se-change', '2026-08-10T03:00:00.000Z', '2026-08-10T02:00:00.000Z');
  platformLin = '2026-08-10T01:00:00.000Z'; // < base：窗口外
  platformPushedAt = '2026-08-10T04:00:00.000Z';

  const r = await new SyncManager(cwd).pull('se-change');
  assert(r.ok === false && r.conflict === true, '血统 < base：fail-closed 维持冲突');
  assert(existsSync(conflictPathOf(cwd, 'se-change')), '血统 < base：冲突文件落盘');
}

// ─────────────────────────────────────────
// 4. push 409 自回声：血统窗口内 → base 推进 + 自动重试成功
// ─────────────────────────────────────────
console.log('\n--- 4. push 409 自回声重推 ---');
{
  const cwd = setupCwd('push-selfecho');
  setLocalTs(cwd, 'se-change', '2026-08-10T03:00:00.000Z', '2026-08-10T02:00:00.000Z');
  platformLin = '2026-08-10T02:30:00.000Z'; // 窗口内（回声 = 本机 02:30 状态的自推）
  platformPushedAt = '2026-08-10T04:00:00.000Z';
  postResponses = [{ status: 409 }, { status: 200 }]; // 首推 409，重试（base 已推进）200

  const r = await new SyncManager(cwd).sync('se-change');
  assert(r.synced === 1 && !r.conflict, `自回声 409：重推成功 synced=1（实际 synced=${r.synced}）`);
  assert(!existsSync(conflictPathOf(cwd, 'se-change')), '自回声 409：不落冲突文件');
  assert(getBase(cwd, 'se-change') >= '2026-08-10T04:00:00.000Z', `自回声 409：base ≥ 平台 ts（实际 ${getBase(cwd, 'se-change')}）`);
}

// ─────────────────────────────────────────
// 5. push 409 外来血统 → 维持真冲突
// ─────────────────────────────────────────
console.log('\n--- 5. push 409 外来血统维持冲突 ---');
{
  const cwd = setupCwd('push-foreign');
  setLocalTs(cwd, 'se-change', '2026-08-10T03:00:00.000Z', '2026-08-10T02:00:00.000Z');
  platformLin = '2026-08-10T03:30:00.000Z'; // 窗口外
  platformPushedAt = '2026-08-10T04:00:00.000Z';
  postResponses = [{ status: 409 }, { status: 409 }];

  const r = await new SyncManager(cwd).sync('se-change');
  assert(r.synced === 0 && r.conflict === true, '外来血统 409：conflict=true');
  assert(existsSync(conflictPathOf(cwd, 'se-change')), '外来血统 409：冲突文件落盘');
}

// ─────────────────────────────────────────
// 6. base_ts 单调推进（MAX）：旧回执不降、新回执推进、null 保旧
// ─────────────────────────────────────────
console.log('\n--- 6. base_ts MAX 单调 ---');
{
  const cwd = setupCwd('max-monotonic');
  const pm = makePM(cwd);
  setLocalTs(cwd, 'se-change', '2026-08-10T03:00:00.000Z', '2026-08-10T05:00:00.000Z');
  pm._updatePlatformLastSync(cwd, 'se-change', '2026-08-10T03:00:00.000Z'); // 乱序旧回执
  assert(getBase(cwd, 'se-change') === '2026-08-10T05:00:00.000Z', `旧回执不覆盖已推进 base（实际 ${getBase(cwd, 'se-change')}）`);
  pm._updatePlatformLastSync(cwd, 'se-change', '2026-08-10T06:00:00.000Z');
  assert(getBase(cwd, 'se-change') === '2026-08-10T06:00:00.000Z', `新回执正常推进（实际 ${getBase(cwd, 'se-change')}）`);
  pm._updatePlatformLastSync(cwd, 'se-change', null);
  assert(getBase(cwd, 'se-change') === '2026-08-10T06:00:00.000Z', `null 回执保旧值（实际 ${getBase(cwd, 'se-change')}）`);
}

// ─────────────────────────────────────────
// 7. 冲突文件过期自清：base ≥ 文件平台 ts → 清除恢复推送；未追平 → 维持抑制
// ─────────────────────────────────────────
console.log('\n--- 7. 冲突文件过期自清 ---');
{
  const cwd = setupCwd('stale-clear');
  // 落一份冲突文件（platform_last_pushed_at=02:00），本地 base 已追平 02:00
  setLocalTs(cwd, 'se-change', '2026-08-10T03:00:00.000Z', '2026-08-10T02:00:00.000Z');
  new SyncManager(cwd)._writeConflictFile('se-change', {
    base_ts: '2026-08-10T01:30:00.000Z',
    local_modified_ts: '2026-08-10T03:00:00.000Z',
    platform_last_pushed_at: '2026-08-10T02:00:00.000Z',
    platform_progress: null,
  });
  assert(existsSync(conflictPathOf(cwd, 'se-change')), '前置：冲突文件已落盘');
  postResponses = [{ status: 200 }];

  const r = await new SyncManager(cwd).sync('se-change');
  assert(r.synced === 1, `过期冲突自清后推送成功（实际 synced=${r.synced}）`);
  assert(!existsSync(conflictPathOf(cwd, 'se-change')), '过期冲突文件被自动清除');

  // 对照：base 未追平平台 ts → 维持抑制
  const cwd2 = setupCwd('stale-keep');
  setLocalTs(cwd2, 'se-change', '2026-08-10T03:00:00.000Z', '2026-08-10T01:30:00.000Z');
  new SyncManager(cwd2)._writeConflictFile('se-change', {
    base_ts: '2026-08-10T01:30:00.000Z',
    local_modified_ts: '2026-08-10T03:00:00.000Z',
    platform_last_pushed_at: '2026-08-10T02:00:00.000Z',
    platform_progress: null,
  });
  const r2 = await new SyncManager(cwd2).sync('se-change');
  assert(r2.synced === 0 && r2.conflict === true && r2.suppressed === true, '未追平：维持抑制（suppressed）');
  assert(existsSync(conflictPathOf(cwd2, 'se-change')), '未追平：冲突文件保留');
}

// ─────────────────────────────────────────
// 8. 身份优先归属：last_pusher==本人 → 自愈（下界放开）
// ─────────────────────────────────────────
console.log('\n--- 8. 身份匹配自愈（下界放开） ---');
{
  // 8a. pull：血统低于 base（窗口下界外，第一批必冲突）+ pusher==本人 → 自愈
  const cwd = setupCwd('ident-me-pull', { user: 'me' });
  setLocalTs(cwd, 'se-change', '2026-08-10T03:00:00.000Z', '2026-08-10T02:00:00.000Z');
  platformLin = '2026-08-10T01:00:00.000Z'; // < base：窗口回退会判外来
  platformPushedAt = '2026-08-10T04:00:00.000Z';
  platformPusher = 'me';

  const r = await new SyncManager(cwd).pull('se-change');
  assert(r.ok === true && r.conflict === false && r.imported === false, '身份匹配：pull 自愈（血统低于 base 也放行）');
  assert(!existsSync(conflictPathOf(cwd, 'se-change')), '身份匹配：不落冲突文件');
  assert(getBase(cwd, 'se-change') === '2026-08-10T04:00:00.000Z', `身份匹配：base 推进（实际 ${getBase(cwd, 'se-change')}）`);

  // 8b. push 409：pusher==本人 + 血统在窗口内 → 推进 base 自动重推成功
  const cwd2 = setupCwd('ident-me-push', { user: 'me' });
  setLocalTs(cwd2, 'se-change', '2026-08-10T03:00:00.000Z', '2026-08-10T02:00:00.000Z');
  platformLin = '2026-08-10T02:30:00.000Z';
  platformPushedAt = '2026-08-10T04:00:00.000Z';
  platformPusher = 'me';
  postResponses = [{ status: 409 }, { status: 200 }];

  const r2 = await new SyncManager(cwd2).sync('se-change');
  assert(r2.synced === 1 && !r2.conflict, `身份匹配 409：重推成功（实际 synced=${r2.synced}）`);
  assert(!existsSync(conflictPathOf(cwd2, 'se-change')), '身份匹配 409：不落冲突文件');

  platformPusher = undefined; // 复位（后续用例回老服务端形态）
}

// ─────────────────────────────────────────
// 9. 身份否决（盲区关闭回归）：last_pusher≠本人 + 血统在窗口内 → 真冲突
// ─────────────────────────────────────────
console.log('\n--- 9. 身份否决真冲突 ---');
{
  // 9a. pull：他机慢钟把血统落进窗口（第一批会误判自回声）+ pusher≠本人 → 真冲突
  const cwd = setupCwd('ident-other-pull', { user: 'me' });
  setLocalTs(cwd, 'se-change', '2026-08-10T03:00:00.000Z', '2026-08-10T02:00:00.000Z');
  platformLin = '2026-08-10T02:30:00.000Z'; // 窗口内（血统回退会判自回声）
  platformPushedAt = '2026-08-10T04:00:00.000Z';
  platformPusher = 'someone-else';

  const r = await new SyncManager(cwd).pull('se-change');
  assert(r.ok === false && r.conflict === true && r.imported === false, '身份否决：pull 真冲突（血统窗口内也不放行）');
  assert(existsSync(conflictPathOf(cwd, 'se-change')), '身份否决：冲突文件落盘');

  // 9b. push 409：pusher≠本人 → 维持冲突文件
  const cwd2 = setupCwd('ident-other-push', { user: 'me' });
  setLocalTs(cwd2, 'se-change', '2026-08-10T03:00:00.000Z', '2026-08-10T02:00:00.000Z');
  platformLin = '2026-08-10T02:30:00.000Z';
  platformPushedAt = '2026-08-10T04:00:00.000Z';
  platformPusher = 'someone-else';
  postResponses = [{ status: 409 }, { status: 409 }];

  const r2 = await new SyncManager(cwd2).sync('se-change');
  assert(r2.synced === 0 && r2.conflict === true, '身份否决：push 409 真冲突');
  assert(existsSync(conflictPathOf(cwd2, 'se-change')), '身份否决：push 409 冲突文件落盘');

  platformPusher = undefined;
}

// 清理
await new Promise((r) => server.close(r));
try { rmSync(tmpRoot, { recursive: true, force: true }); }
catch { /* temp dir 由 OS 清理 */ }

if (failures > 0) {
  console.error(`\n[platform-sync-self-echo] ❌ ${failures} 项失败`);
  process.exit(1);
}
console.log('\n[platform-sync-self-echo] ✅ 全部通过');
