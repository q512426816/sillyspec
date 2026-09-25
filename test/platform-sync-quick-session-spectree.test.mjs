// ql-20260818-011 验收：quick 会话（quick-<hex8>）收尾补平台 spec 树同步。
//
// 背景（multi-agent-platform docs/sillyspec/2026-08-18-quick-no-platform-sync.md）：
// quick 会话按设计无 .sillyspec/changes/<quick-id>/ 实体目录，而 triggerSync 的
// existsSync 门（src/run/shared.js）与 sync() 的第二道门都锚定「变更目录存在」→
// quick 的 QUICKLOG/模块文档上行通道（syncSpecTree）整条 unreachable。
//
// 验收点：
// 1. quick 会话 + 平台已连接 → triggerSync 触发 spec 树增量同步
//    （manifest GET + spec-sync POST 到达服务器），不调 progress/四件套（无孤儿行）
// 2. quick 会话 + 未连接平台 → 静默跳过（无请求、无异常）
// 3. 非 quick 名且变更目录不存在（真实变更名拼错）→ 仍零 HTTP 请求
//    （archive-final-state-sync 后不再静默 return，但 sync() 无 DB 行时在发出任何
//    请求前即返回，仅多一行 warn——拼写错误噪音不进网络通道）
// 4. 真实变更目录存在 → 原路径不变（progress POST 照常，spec 树随 sync() 尾部推送）
//
// 隔离：cwd 用 os.tmpdir() 临时目录 + Node http mock server，绝不碰真实 .sillyspec/.runtime。
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';
import http from 'http';
import { triggerSync } from '../src/run/shared.js';

let failures = 0;
const assert = (cond, msg) => {
  if (cond) console.log('  ✅ ' + msg);
  else { console.error('  ❌ ' + msg); failures++; }
};

delete process.env.SILLYSPEC_DEBUG_SYNC; // debug 通道不参与断言，保持默认关闭

const tmpRoot = mkdtempSync(join(tmpdir(), `sillyspec-quick-sync-${process.pid}-`));

console.log('\n[platform-sync-quick-session-spectree] ql-20260818-011：quick 会话补 spec 树同步');

// ── mock server：记录到达的请求路径 + spec-sync POST body（场景 5 断言占位条目内容用）；spec-sync 200 ──
const hits = [];
const syncBodies = [];
const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    hits.push(`${req.method} ${req.url}`);
    if (req.url.includes('/api/changes/-/spec-sync') && req.method === 'POST') {
      syncBodies.push(body);
    }
    if (req.url.includes('/api/changes/-/spec-manifest')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ files: {} })); // 空清单 → 本地文件全 add
    } else if (req.url.includes('/api/changes/-/spec-sync')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, new_versions: {}, conflict: false }));
    } else if (/\/api\/changes\/[^/]+\/progress/.test(req.url) && req.method === 'POST') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
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
// quick 会话的典型 spec 树：QUICKLOG 在根下（无 changes/<quick-id>/ 目录）
const seedQuicklog = (cwd) => {
  mkdirSync(join(cwd, '.sillyspec', 'quicklog'), { recursive: true });
  writeFileSync(
    join(cwd, '.sillyspec', 'quicklog', 'QUICKLOG-test.md'),
    '## ql-test | quick 会话产物\n',
    'utf8',
  );
};

// ─────────────────────────────────────────
// 1. quick 会话 + 已连接 → spec 树到达，progress 不发
// ─────────────────────────────────────────
console.log('\n--- 1. quick 会话触发 spec 树同步（不推 progress） ---');
{
  const cwd = join(tmpRoot, 'quick-connected');
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true });
  connectYaml(cwd);
  seedQuicklog(cwd);
  hits.length = 0;

  await triggerSync(cwd, 'quick-ab12cd34', {}, { inline: true }); // inline：断言进程内同步（默认已转后台子进程，2026-09-20）

  const manifestHit = hits.some((h) => h.includes('GET /api/changes/-/spec-manifest'));
  const syncHit = hits.some((h) => h.includes('POST /api/changes/-/spec-sync'));
  const progressHit = hits.some((h) => h.includes('/progress'));
  assert(manifestHit, 'manifest GET 到达服务器');
  assert(syncHit, 'spec-sync POST 到达服务器（QUICKLOG add op）');
  assert(!progressHit, '不发 progress（quick 无变更目录，推上去是平台孤儿行）');
}

// ─────────────────────────────────────────
// 2. quick 会话 + 未连接 → 静默跳过
// ─────────────────────────────────────────
console.log('\n--- 2. quick 会话未连接平台 → 静默 ---');
{
  const cwd = join(tmpRoot, 'quick-offline');
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true });
  seedQuicklog(cwd); // 无 local.yaml = 未连接
  hits.length = 0;

  let threw = false;
  try { await triggerSync(cwd, 'quick-ab12cd34', {}, { inline: true }); } catch { threw = true; }
  assert(!threw, '未连接不抛异常');
  assert(hits.length === 0, '无任何请求发出');
}

// ─────────────────────────────────────────
// 3. 非 quick 名且目录不存在 → 无请求（sync() 无 DB 行在发 HTTP 前返回）
// ─────────────────────────────────────────
console.log('\n--- 3. 拼错变更名 → 无任何请求（仅本地 warn） ---');
{
  const cwd = join(tmpRoot, 'typo-name');
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true });
  connectYaml(cwd);
  seedQuicklog(cwd);
  hits.length = 0;

  await triggerSync(cwd, '2026-08-18-not-exist-typo', {}, { inline: true });
  assert(hits.length === 0, '无任何请求（防拼写错误噪音混入网络通道）');
}

// ─────────────────────────────────────────
// 4. 真实变更目录存在 → 原路径不变（progress 照常）
// ─────────────────────────────────────────
console.log('\n--- 4. 真实变更目录 → progress POST 照常 ---');
{
  const cwd = join(tmpRoot, 'real-change');
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true });
  const { ProgressManager } = await import('../src/progress.js');
  const pm = new ProgressManager({ specDir: join(cwd, '.sillyspec') });
  pm.init(cwd);
  pm.initChange(cwd, 'real-change');
  connectYaml(cwd);
  seedQuicklog(cwd);
  hits.length = 0;

  await triggerSync(cwd, 'real-change', {}, { inline: true });
  const progressHit = hits.some((h) => h.includes('POST /api/changes/real-change/progress'));
  assert(progressHit, 'progress POST 到达（原 sync() 主路径未被 quick 分支影响）');
}

// ─────────────────────────────────────────
// 5.（已删除）quick 起步即推「进行中」占位条目（ql-20260819-009）
//    quick 通道直接退役（2026-09-25-quick-channel-retire）：新会话被双层门拒绝，
//    起步期 triggerSync 随 stage.js 新会话块一并删除——「起步盲窗」语义不复存在。
//    场景 1-4（quick 名 triggerSync 直测：spec 树同步降级/未连接静默/孤儿行防护）保留，
//    服务升级前在途会话的 --done 收尾同步仍走该路径。
// ─────────────────────────────────────────

server.close();
try { rmSync(tmpRoot, { recursive: true, force: true }); } catch {}

if (failures > 0) {
  console.error(`\n❌ platform-sync-quick-session-spectree: ${failures} 处断言失败`);
  process.exitCode = 1;
} else {
  console.log('\n✅ platform-sync-quick-session-spectree: 全部通过');
}
