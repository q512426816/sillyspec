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
// 3. 非 quick 名且变更目录不存在（真实变更名拼错）→ 原静默 return 行为不变
//    （不推 spec 树——防拼写错误噪音；差异点仅在 quick-<hex8> 形态）
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

// ── mock server：记录到达的请求路径；spec-sync 200 ──
const hits = [];
const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    hits.push(`${req.method} ${req.url}`);
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

  await triggerSync(cwd, 'quick-ab12cd34');

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
  try { await triggerSync(cwd, 'quick-ab12cd34'); } catch { threw = true; }
  assert(!threw, '未连接不抛异常');
  assert(hits.length === 0, '无任何请求发出');
}

// ─────────────────────────────────────────
// 3. 非 quick 名且目录不存在 → 原静默行为（不推 spec 树）
// ─────────────────────────────────────────
console.log('\n--- 3. 拼错变更名 → 保持静默（不推 spec 树） ---');
{
  const cwd = join(tmpRoot, 'typo-name');
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true });
  connectYaml(cwd);
  seedQuicklog(cwd);
  hits.length = 0;

  await triggerSync(cwd, '2026-08-18-not-exist-typo');
  assert(hits.length === 0, '无任何请求（防拼写错误噪音混入 spec 树通道）');
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

  await triggerSync(cwd, 'real-change');
  const progressHit = hits.some((h) => h.includes('POST /api/changes/real-change/progress'));
  assert(progressHit, 'progress POST 到达（原 sync() 主路径未被 quick 分支影响）');
}

server.close();
try { rmSync(tmpRoot, { recursive: true, force: true }); } catch {}

if (failures > 0) {
  console.error(`\n❌ platform-sync-quick-session-spectree: ${failures} 处断言失败`);
  process.exitCode = 1;
} else {
  console.log('\n✅ platform-sync-quick-session-spectree: 全部通过');
}
