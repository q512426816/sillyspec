// 2026-08-16-auto-sync-from-repo 验收：sync() 进度上行成功后自动推四件套文档（best-effort）。
//
// 验收点（design.md §5/§10）：
// 1. sync() 成功后 /documents 端点被调用（文档随进度自动上行，本地直跑无需手点）
// 2. 四件套全缺失（quick 极早期）→ 不调 /documents 端点（后端空 map 422 约束，前端跳过）
// 3. /documents 失败 → sync() 仍返回 synced=1（best-effort，文档失败不影响进度上行）
//
// 隔离：cwd 用 os.tmpdir() 临时目录 + Node http mock server（127.0.0.1 随机端口）。
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

const tmpRoot = mkdtempSync(join(tmpdir(), `sillyspec-auto-sync-docs-${process.pid}-`));

console.log('\n[platform-sync-auto-docs] 2026-08-16-auto-sync-from-repo：sync 后自动推文档');

// ── mock HTTP server：记录请求 URL；/progress 恒 200；/documents 按 failDocsMode 返回 ──
let docRequests = 0;
let lastDocReq = null;
let failDocsMode = false;
const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    if (req.url.includes('/progress')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    } else if (req.url.includes('/documents')) {
      docRequests++;
      lastDocReq = { method: req.method, url: req.url, headers: req.headers, body };
      if (failDocsMode) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ code: 'internal_error' }));
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ synced: 2, change_name: 'test-change' }));
      }
    } else {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
    }
  });
});

await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const mockUrl = `http://127.0.0.1:${port}`;

// ── fixture：有文档的 change + local.yaml ──
const cwd = join(tmpRoot, 'fixture');
mkdirSync(join(cwd, '.sillyspec', 'changes', 'test-change'), { recursive: true });
writeFileSync(join(cwd, '.sillyspec', 'changes', 'test-change', 'proposal.md'), '# Proposal\n', 'utf8');
writeFileSync(join(cwd, '.sillyspec', 'changes', 'test-change', 'design.md'), '# Design\n', 'utf8');
const pm = makePM(cwd);
pm.init(cwd);
pm.initChange(cwd, 'test-change');
writeFileSync(
  join(cwd, '.sillyspec', 'local.yaml'),
  `platform:\n  url: ${mockUrl}\n  token: test-token\n`,
  'utf8',
);

// ─────────────────────────────────────────
// 1. sync 成功 → /documents 被调（body 为存在文档的裸 map）
// ─────────────────────────────────────────
console.log('\n--- 1. sync 成功后自动推文档 ---');
const sm = new SyncManager(cwd);
const result = await sm.sync('test-change');
assert(result.synced === 1, `进度上行成功（synced=1）（实际 ${result.synced}）`);
assert(docRequests === 1, `/documents 被调用 1 次（实际 ${docRequests}）`);
assert(lastDocReq && lastDocReq.method === 'POST', 'documents 请求 method=POST');
assert(lastDocReq && lastDocReq.url === `/api/changes/test-change/documents`,
  `documents url 正确（实际 ${lastDocReq && lastDocReq.url}）`);
const docBody = JSON.parse(lastDocReq.body || '{}');
assert('proposal.md' in docBody && 'design.md' in docBody, 'body 含存在的文档（proposal+design）');
assert(!('requirements.md' in docBody) && !('tasks.md' in docBody), '不存在的文档不在 body');

// ─────────────────────────────────────────
// 2. 四件套全缺失 → 不调 /documents 端点
// ─────────────────────────────────────────
console.log('\n--- 2. 四件套全缺失跳过 ---');
const cwdEmpty = join(tmpRoot, 'fixture-empty');
mkdirSync(join(cwdEmpty, '.sillyspec', 'changes', 'empty-change'), { recursive: true });
const pm2 = makePM(cwdEmpty);
pm2.init(cwdEmpty);
pm2.initChange(cwdEmpty, 'empty-change');
writeFileSync(
  join(cwdEmpty, '.sillyspec', 'local.yaml'),
  `platform:\n  url: ${mockUrl}\n  token: test-token\n`,
  'utf8',
);
const before = docRequests;
const sm2 = new SyncManager(cwdEmpty);
const r2 = await sm2.sync('empty-change');
assert(r2.synced === 1, `进度上行仍成功（synced=1）（实际 ${r2.synced}）`);
assert(docRequests === before, `/documents 未被调用（全缺失跳过）（实际 +${docRequests - before}）`);

// ─────────────────────────────────────────
// 3. /documents 失败 → sync 仍 synced=1（best-effort 不阻断）
// ─────────────────────────────────────────
console.log('\n--- 3. documents 失败不影响进度上行 ---');
failDocsMode = true;
const r3 = await sm.sync('test-change');
assert(r3.synced === 1, `进度上行仍成功（synced=1）（实际 ${r3.synced}）`);
assert(r3.errors.length === 0, `无错误透出（文档失败被吞）（实际 ${JSON.stringify(r3.errors)}）`);

// ── 收尾：等 server 关闭再删临时目录（Windows rmSync 对在用句柄会 EPERM）──
await new Promise((r) => server.close(r));
try {
  rmSync(tmpRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
} catch {
  // 个别文件仍被锁则留待系统清理，不影响测试结论
}
console.log(failures === 0 ? '\n✅ 全部通过\n' : `\n❌ ${failures} 个失败\n`);
// 用 exitCode 让 Node 自然清空 handle 后退出（Windows 下 process.exit 撞 pending
// sqlite/uv handle 会崩 "Assertion failed: handle->flags & UV_HANDLE_CLOSING"）。
process.exitCode = failures === 0 ? 0 : 1;
