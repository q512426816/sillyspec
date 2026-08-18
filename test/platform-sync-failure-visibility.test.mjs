// ql-20260818-008 验收：同步失败可见性（spec-sync 树同步 warn + syncDocuments 四件套缺失措辞分级）。
//
// 验收点：
// 1. spec 树增量同步：清单 GET 非 2xx / 同步 POST 非 2xx → console.warn（修复前 debugLog
//    静默——SILLYSPEC_DEBUG_SYNC 才可见，文件迟到平台无任何线索；multi-agent-platform
//    2026-08-18-workspace-file-browser 实证：design/decisions 迟到 27 分钟、plan.md 迟到 8 分钟）
// 2. syncDocuments 自动路径（sync() 顺带推）：四件套缺失 → 不打 warn（流程早期正常状态），
//    返回 errors 仍含「无可用文档」
// 3. syncDocuments 手动路径（platform sync-docs 便捷导出）：四件套缺失 → warn 且说清只找四件套
//
// 隔离：cwd 用 os.tmpdir() 临时目录 + Node http mock server，绝不碰真实 .sillyspec/.runtime。
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import http from 'http';
import { SyncManager, syncDocuments as syncDocumentsWrapper } from '../src/sync.js';
import { syncSpecTree } from '../src/spec-sync.js';
import { ProgressManager } from '../src/progress.js';

let failures = 0;
const assert = (cond, msg) => {
  if (cond) console.log('  ✅ ' + msg);
  else { console.error('  ❌ ' + msg); failures++; }
};

delete process.env.SILLYSPEC_DEBUG_SYNC; // debug 通道默认关闭，断言只看 console.warn

const makePM = (cwd) => new ProgressManager({ specDir: join(cwd, '.sillyspec') });
const tmpRoot = mkdtempSync(join(tmpdir(), `sillyspec-sync-visibility-${process.pid}-`));

console.log('\n[platform-sync-failure-visibility] ql-20260818-008：同步失败可见性');

// ── warn 捕获（finally 恢复，防污染后续测试输出）──
const warns = [];
const origWarn = console.warn;
console.warn = (...a) => { warns.push(a.map(String).join(' ')); };
const syncWarns = () => warns.filter((w) => w.includes('[spec-sync]') || w.includes('[sync]'));

// ── mock server：spec-manifest / spec-sync 状态码可控 ──
let manifestStatus = 200;
let syncPostStatus = 200;
const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    if (req.url.includes('/spec-manifest')) {
      if (manifestStatus !== 200) {
        res.writeHead(manifestStatus, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ code: 'internal_error' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ files: {} }));
    } else if (req.url.includes('/spec-sync')) {
      res.writeHead(syncPostStatus, { 'Content-Type': 'application/json' });
      res.end(syncPostStatus === 200 ? JSON.stringify({ synced: 1 }) : JSON.stringify({ code: 'internal_error' }));
    } else {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
    }
  });
});

await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const mockUrl = `http://127.0.0.1:${port}`;
const platform = { url: mockUrl, token: 'test-token' };

// 本地 spec 树：一个 change 目录一个文件（保证 POST 有 add op）
const cwd = join(tmpRoot, 'fixture');
mkdirSync(join(cwd, '.sillyspec', 'changes', 'vis-change'), { recursive: true });
writeFileSync(join(cwd, '.sillyspec', 'changes', 'vis-change', 'decisions.md'), '# D\n', 'utf8');
const pm = makePM(cwd);
pm.init(cwd);
pm.initChange(cwd, 'vis-change');
writeFileSync(
  join(cwd, '.sillyspec', 'local.yaml'),
  `platform:\n  url: ${mockUrl}\n  token: test-token\n`,
  'utf8',
);

try {
  // ─────────────────────────────────────────
  // 1. spec-sync 失败可见：GET 500 → warn；POST 500 → warn
  // ─────────────────────────────────────────
  console.log('\n--- 1. spec-sync 树同步失败 warn ---');
  manifestStatus = 500;
  let r = await syncSpecTree(join(cwd, '.sillyspec'), platform, 'vis-change');
  assert(r.synced === 0, `清单 GET 500 → synced=0（实际 ${r.synced}）`);
  assert(syncWarns().some((w) => w.includes('拉取清单失败') && w.includes('500')),
    `清单 GET 500 打 warn（实际 ${JSON.stringify(syncWarns())}）`);

  manifestStatus = 200;
  syncPostStatus = 500;
  warns.length = 0;
  r = await syncSpecTree(join(cwd, '.sillyspec'), platform, 'vis-change');
  assert(r.synced === 0, `同步 POST 500 → synced=0（实际 ${r.synced}）`);
  assert(syncWarns().some((w) => w.includes('同步请求失败') && w.includes('500')),
    `同步 POST 500 打 warn（实际 ${JSON.stringify(syncWarns())}）`);
  syncPostStatus = 200;

  // ─────────────────────────────────────────
  // 2. syncDocuments 自动路径：四件套缺失不打 warn（早期正常状态）
  // ─────────────────────────────────────────
  console.log('\n--- 2. 四件套缺失：自动路径静默 ---');
  warns.length = 0;
  const sm = new SyncManager(cwd);
  const autoResult = await sm.syncDocuments('vis-change');
  assert(autoResult.synced === 0, `自动路径 synced=0（实际 ${autoResult.synced}）`);
  assert(autoResult.errors.includes('无可用文档'), `errors 仍含「无可用文档」（实际 ${JSON.stringify(autoResult.errors)}）`);
  assert(syncWarns().length === 0, `自动路径不打 warn（实际 ${JSON.stringify(syncWarns())}）`);

  // ─────────────────────────────────────────
  // 3. syncDocuments 手动路径（platform sync-docs 便捷导出）：warn 且说清只找四件套
  // ─────────────────────────────────────────
  console.log('\n--- 3. 四件套缺失：手动路径 warn ---');
  warns.length = 0;
  const manualResult = await syncDocumentsWrapper('vis-change', cwd);
  assert(manualResult.synced === 0, `手动路径 synced=0（实际 ${manualResult.synced}）`);
  assert(syncWarns().some((w) => w.includes('未找到可同步的四件套文档') && w.includes('vis-change')),
    `手动路径 warn 且说明只找四件套（实际 ${JSON.stringify(syncWarns())}）`);
} finally {
  console.warn = origWarn;
}

// 清理（Windows rmSync 对在用句柄会 EPERM，重试 + 吞错）
await new Promise((r) => server.close(r));
try {
  rmSync(tmpRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
} catch {
  // 个别文件仍被锁则留待系统清理，不影响测试结论
}

if (failures > 0) {
  console.error(`\n[platform-sync-failure-visibility] ❌ ${failures} 项失败`);
  process.exitCode = 1;
} else {
  console.log('\n[platform-sync-failure-visibility] ✅ 全部通过');
}
