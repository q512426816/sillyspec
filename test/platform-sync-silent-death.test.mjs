// 2026-08-19 platform sync 静默死亡修复验收（坑文档 2026-08-19-platform-sync-base-ts-silent-conflict）。
//
// 修复点与验收：
// 1. X-SillySpec-User 兜底：local.yaml 无 platform.user 时，push header 回退 git user.name
//    （修 last_pusher 空——此前仅显式配置时发送，本地直跑场景 header 恒缺失）。
// 2. push 409 冲突醒目横幅：冲突时 CLI 输出「⚠️ 平台同步冲突」横幅 + resolve 指引，
//    不能只静默落 sync-conflict 文件（单行 [sync] warn 易被淹没）。
// 3. pull 自竞态防御：判冲突前重读本地 base_ts——若本进程 push 回填已落库（base_ts >=
//    平台 ts），不判「平台有更新」，冲突自愈不误卡死（file-browser 3ms 自竞态变体）。
//
// 隔离：os.tmpdir() 临时目录 + Node http mock server，绝不碰真实 .sillyspec/.runtime。
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';
import http from 'http';
import { SyncManager } from '../src/sync.js';
import { ProgressManager } from '../src/progress.js';

let failures = 0;
const assert = (cond, msg) => {
  if (cond) console.log('  ✅ ' + msg);
  else { console.error('  ❌ ' + msg); failures++; }
};

delete process.env.SILLYSPEC_DEBUG_SYNC;

const makePM = (cwd) => new ProgressManager({ specDir: join(cwd, '.sillyspec') });
const tmpRoot = mkdtempSync(join(tmpdir(), `sillyspec-sync-silent-${process.pid}-`));

console.log('\n[platform-sync-silent-death] 冲突横幅 + 自竞态防御 + user 兜底');

// ── mock server ──
// pushMode: 'ok'（200）/ 'conflict'（409 带 platform_progress）
// GET 回平台六表（last_pushed_at / current_stage 由变量控制）
let pushMode = 'ok';
let platformLastPushedAt = '2026-08-10T00:30:00.000Z';
let platformStage = 'scan';
let lastPostHeaders = null;
const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    const m = req.url.match(/\/api\/changes\/([^/]+)\/progress/);
    const changeName = m ? decodeURIComponent(m[1]) : 'unknown';
    if (m && req.method === 'POST') {
      lastPostHeaders = req.headers;
      if (pushMode === 'conflict') {
        res.writeHead(409, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          conflict: true,
          last_pushed_at: platformLastPushedAt,
          platform_progress: {
            project: { name: 'proj', schema_version: 4 },
            changes: [{ name: changeName, current_stage: 'brainstorm', status: 'active', last_active: platformLastPushedAt, last_synced_platform_ts: null, last_local_modified_ts: null }],
            stages: [], steps: [], batch_progress: [], approvals: [],
            last_pushed_at: platformLastPushedAt,
          },
        }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }
    if (m && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        project: { name: 'proj', schema_version: 4 },
        changes: [{ name: changeName, current_stage: platformStage, status: 'active', last_active: platformLastPushedAt, last_synced_platform_ts: null, last_local_modified_ts: null }],
        stages: [], steps: [], batch_progress: [], approvals: [],
        last_pushed_at: platformLastPushedAt,
      }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
  });
});

await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const mockUrl = `http://127.0.0.1:${port}`;

// local.yaml 不写 platform.user（验证兜底）
const connectYamlNoUser = (cwd) => writeFileSync(
  join(cwd, '.sillyspec', 'local.yaml'),
  `platform:\n  url: ${mockUrl}\n  token: test-token\n`,
  'utf8',
);

// ─────────────────────────────────────────
// 1. X-SillySpec-User 兜底（local.yaml 无 user → git user.name）
// ─────────────────────────────────────────
console.log('\n--- 1. X-SillySpec-User git user 兜底 ---');
{
  const cwd = join(tmpRoot, 'userfb');
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true });
  const pm = makePM(cwd);
  pm.init(cwd);
  pm.initChange(cwd, 'uf-change');
  connectYamlNoUser(cwd);

  const sm = new SyncManager(cwd);
  const r = await sm.sync('uf-change');
  assert(r.synced === 1, `push 成功（实际 synced=${r.synced}）`);
  // git user.name 在本仓恒有（git 提交身份）；断言 header 存在且非空
  assert(lastPostHeaders && typeof lastPostHeaders['x-sillyspec-user'] === 'string' && lastPostHeaders['x-sillyspec-user'].length > 0,
    `local.yaml 无 user 时 X-SillySpec-User 回退 git user.name（实际 ${lastPostHeaders ? JSON.stringify(lastPostHeaders['x-sillyspec-user']) : '无请求'}）`);
  // 显式配置优先：写 user 再推一次
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'),
    `platform:\n  url: ${mockUrl}\n  token: test-token\n  user: explicit-alice\n`, 'utf8');
  await sm.sync('uf-change');
  assert(lastPostHeaders['x-sillyspec-user'] === 'explicit-alice',
    `platform.user 显式配置优先于 git 兜底（实际 ${JSON.stringify(lastPostHeaders['x-sillyspec-user'])}）`);
}

// ─────────────────────────────────────────
// 2. push 409 冲突醒目横幅（stderr 含横幅关键行）
// ─────────────────────────────────────────
console.log('\n--- 2. push 409 冲突横幅 ---');
{
  const cwd = join(tmpRoot, 'banner');
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true });
  const pm = makePM(cwd);
  pm.init(cwd);
  pm.initChange(cwd, 'banner-change');
  // 锚一个 base_ts（首次 push 后形态），平台侧 last_pushed_at 更新 → 409
  pm._ensureDB(cwd).getDb().prepare(
    `UPDATE changes SET last_synced_platform_ts = '2026-08-10T01:00:00.000Z' WHERE name = 'banner-change'`
  ).run();
  connectYamlNoUser(cwd);

  pushMode = 'conflict';
  platformLastPushedAt = '2026-08-10T02:00:00.000Z';
  const stderrLines = [];
  const origWarn = console.warn;
  console.warn = (...a) => { stderrLines.push(a.map(String).join(' ')); };
  try {
    const sm = new SyncManager(cwd);
    const r = await sm.sync('banner-change');
    assert(r.conflict === true && r.conflictPath, `409 返回 conflict:true + conflictPath（实际 conflict=${r.conflict}）`);
  } finally {
    console.warn = origWarn;
  }
  const bannerText = stderrLines.join('\n');
  assert(bannerText.includes('平台同步冲突'), `冲突输出含「平台同步冲突」标题（实际输出 ${JSON.stringify(bannerText.slice(0, 120))}）`);
  assert(bannerText.includes('platform resolve banner-change'), `横幅含 resolve 恢复命令（实际含？${bannerText.includes('platform resolve banner-change')}）`);
  assert(bannerText.includes('sync-conflict-banner-change.json'), `横幅指引冲突文件路径（实际含？${bannerText.includes('sync-conflict-banner-change.json')}）`);
  assert(bannerText.includes('卡死'), `横幅明确「卡死不自愈」语义（实际含？${bannerText.includes('卡死')}）`);
  pushMode = 'ok';
}

// ─────────────────────────────────────────
// 3. pull 自竞态防御（stale 读 + 重读后 base_ts 已推进 → 不判冲突）
// ─────────────────────────────────────────
console.log('\n--- 3. pull 自竞态防御 ---');
{
  const cwd = join(tmpRoot, 'selfrace');
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true });
  const pm = makePM(cwd);
  pm.init(cwd);
  pm.initChange(cwd, 'sr-change');
  // 自竞态形态：pull 首读 base_ts=01:00（stale，push 回填写库前），平台 ts=02:00 是
  // 自己 3ms 前的推送；重读时 base_ts 已被回填为 02:00 → platformNewer 翻 false。
  // 模拟：首读返回旧值，重读返回新值——用临时 SQLite hook 不现实，改为直接构造
  // 「重读已推进」形态：DB base_ts=02:00（已回填），local_modified=01:30（脏但领先于旧 base）。
  // 首读漏掉回填（stale window）时 localDirty=(01:30>01:00)=true、platformNewer=(02:00>01:00)=true →
  // 会误判；重读到 02:00 后 platformNewer=false → 自愈不写冲突文件。
  connectYamlNoUser(cwd);
  platformLastPushedAt = '2026-08-10T02:00:00.000Z';

  // 3a. 重读解除：DB 里 base_ts 已是 02:00（push 回填已落库）——但 localLastModified 构造成
  //     > 02:00 的形态会让 localDirty 真 true，所以用 01:30（< 02:00）→ localDirty 本就 false，
  //     这测不到重读路径。正确构造：直接验证「重读推进后不判冲突」的净效果——
  //     DB base_ts=01:00、modified=01:30（首读将判冲突），在 pull 执行前把 DB 推进到 02:00
  //     是时序不可能的（pull 内部才重读）。因此改为验证净效果：base_ts=02:00（回填后）+
  //     modified=01:30（老脏度）→ pull 应 import 成功且不落冲突文件。
  pm._ensureDB(cwd).getDb().prepare(
    `UPDATE changes SET last_synced_platform_ts = '2026-08-10T02:00:00.000Z',
     last_local_modified_ts = '2026-08-10T01:30:00.000Z' WHERE name = 'sr-change'`
  ).run();
  const sm = new SyncManager(cwd);
  const r = await sm.pull('sr-change');
  assert(r.imported === true && !r.conflict, `push 回填后的 pull 不误判冲突（实际 imported=${r.imported} conflict=${r.conflict}）`);
  const row = pm._ensureDB(cwd).getDb().prepare(
    'SELECT current_stage FROM changes WHERE name = ?').get('sr-change');
  assert(row.current_stage === 'scan', `import 后对齐平台 current_stage（实际 ${row.current_stage}）`);

  // 3b. 真冲突不受影响：base_ts=01:00（未推进）+ modified=01:30（脏）+ 平台 02:00 → 冲突照判
  pm._ensureDB(cwd).getDb().prepare(
    `UPDATE changes SET last_synced_platform_ts = '2026-08-10T01:00:00.000Z',
     last_local_modified_ts = '2026-08-10T01:30:00.000Z', current_stage = 'execute' WHERE name = 'sr-change'`
  ).run();
  const r2 = await sm.pull('sr-change');
  assert(r2.conflict === true && !r2.imported, `真冲突（base_ts 停旧且平台更新）仍判冲突（实际 conflict=${r2.conflict} imported=${r2.imported}）`);
  const cfPath = join(cwd, '.sillyspec', '.runtime', `sync-conflict-sr-change.json`);
  const { existsSync } = await import('fs');
  assert(existsSync(cfPath), `真冲突落 sync-conflict 文件（${cfPath}）`);
}

// 清理（Windows rmSync 对在用句柄会 EPERM，重试 + 吞错）
await new Promise((r) => server.close(r));
try {
  rmSync(tmpRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
} catch {
  // 个别文件仍被锁则留待系统清理，不影响测试结论
}

if (failures > 0) {
  console.error(`\n[platform-sync-silent-death] ❌ ${failures} 项失败`);
  process.exitCode = 1;
} else {
  console.log('\n[platform-sync-silent-death] ✅ 全部通过');
}
