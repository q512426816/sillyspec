// 2026-08-17-spec-file-incremental-sync 验收：CLI 直跑 spec 文件增量同步。
//
// 验收点（design.md §5.4/§10）：
// 1. 有差异时生成正确 ops（add/update/delete/rename）
// 2. 无差异时短路不发 POST
// 3. conflict 时函数仍返回且不抛错（不阻塞主流程）
// 4. Windows 路径（\）walk 后生成 POSIX op path
//
// 隔离：cwd 用 os.tmpdir() 临时目录 + Node http mock server（127.0.0.1 随机端口）。
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { tmpdir } from 'os';
import http from 'http';
import {
  walkSpecTree,
  hashFiles,
  computeSpecOps,
  extractChangeDirs,
  syncSpecTree,
} from '../src/spec-sync.js';

let failures = 0;
const assert = (cond, msg) => {
  if (cond) console.log('  ✅ ' + msg);
  else { console.error('  ❌ ' + msg); failures++; }
};

const tmpRoot = mkdtempSync(join(tmpdir(), `sillyspec-spec-sync-inc-${process.pid}-`));

console.log('\n[platform-spec-sync-incremental] 2026-08-17：CLI 直跑 spec 增量同步');

// ── mock HTTP server：/spec-manifest 返回清单；/spec-sync 按模式返回 ──
let syncRequests = 0;
let lastSyncBody = null;
let conflictMode = false;
let manifestBody = { files: {} };
const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    if (req.url.includes('/api/changes/-/spec-manifest')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(manifestBody));
    } else if (req.url.includes('/api/changes/-/spec-sync')) {
      syncRequests++;
      lastSyncBody = body ? JSON.parse(body) : null;
      if (conflictMode) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          ok: true, new_versions: {}, conflict: true,
          server_versions: { 'docs/A.md': 5 },
        }));
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          ok: true, new_versions: { 'docs/A.md': 1 }, conflict: false, server_versions: null,
        }));
      }
    } else {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
    }
  });
});

await new Promise((r) => server.listen(0, '127.0.0.1', r));
const mockUrl = `http://127.0.0.1:${server.address().port}`;
const platform = { url: mockUrl, token: 'test-token' };

// ─────────────────────────────────────────
// 1. 有差异时生成正确 ops
// ─────────────────────────────────────────
console.log('\n--- 1. 有差异时生成正确 ops ---');
const specRoot1 = join(tmpRoot, 'ws1', '.sillyspec');
mkdirSync(join(specRoot1, 'changes', '2026-08-17-demo'), { recursive: true });
writeFileSync(join(specRoot1, 'changes', '2026-08-17-demo', 'design.md'), '# Design v2\n', 'utf8');
writeFileSync(join(specRoot1, 'changes', '2026-08-17-demo', 'plan.md'), '# Plan\n', 'utf8');
// ql-20260818-002：local.yaml（本机 token 配置）不上传——walk 必须排除
writeFileSync(join(specRoot1, 'local.yaml'), 'platform:\n  token: shpsync_secret\n', 'utf8');

manifestBody = {
  files: {
    'changes/2026-08-17-demo/design.md': { hash: 'old-hash', version: 2, exists: true },
    'changes/2026-08-17-demo/old.md': { hash: 'x', version: 1, exists: true },
    'changes/2026-08-17-demo/deleted.md': { hash: 'y', version: 1, exists: false },
  },
};
const result1 = await syncSpecTree(specRoot1, platform, '2026-08-17-demo');
assert(result1.synced > 0, `有差异时 sync 成功（synced=${result1.synced}）`);
assert(syncRequests === 1, `/spec-sync 被调用 1 次（实际 ${syncRequests}）`);
const ops1 = lastSyncBody?.ops || [];
const opMap = new Map(ops1.map((o) => [o.path, o]));
assert(opMap.has('changes/2026-08-17-demo/plan.md') && opMap.get('changes/2026-08-17-demo/plan.md').op === 'add',
  'plan.md 生成 add op');
assert(opMap.has('changes/2026-08-17-demo/design.md') && opMap.get('changes/2026-08-17-demo/design.md').op === 'update',
  'design.md（hash 变）生成 update op');
assert(opMap.has('changes/2026-08-17-demo/old.md') && opMap.get('changes/2026-08-17-demo/old.md').op === 'delete',
  'old.md（服务器有本地无）生成 delete op');
assert(!opMap.has('changes/2026-08-17-demo/deleted.md'),
  'deleted.md（exists=false）不重复生成 delete op');
const updateOp = opMap.get('changes/2026-08-17-demo/design.md');
assert(updateOp.base_version === 2, `update op base_version=2（实际 ${updateOp.base_version}）`);

// ─────────────────────────────────────────
// 2. 无差异时短路不发 POST
// ─────────────────────────────────────────
console.log('\n--- 2. 无差异时短路 ---');
const before = syncRequests;
// 清单与本地完全一致（用 hashFiles 的结果构造）
const entries2 = walkSpecTree(specRoot1);
const localFiles2 = hashFiles(entries2);
const files2 = {};
for (const f of localFiles2) files2[f.path] = { hash: f.hash, version: 1, exists: true };
manifestBody = { files: files2 };

const result2 = await syncSpecTree(specRoot1, platform, '2026-08-17-demo');
assert(result2.synced === 0, `无差异时 synced=0（实际 ${result2.synced}）`);
assert(syncRequests === before, `无差异时不发 POST（实际 +${syncRequests - before}）`);

// ─────────────────────────────────────────
// 3. conflict 时仍返回且不抛错
// ─────────────────────────────────────────
console.log('\n--- 3. conflict 不阻塞 ---');
conflictMode = true;
manifestBody = { files: {} }; // 强制全量 add → 必有 ops
let conflictResult = null;
let threw = false;
try {
  conflictResult = await syncSpecTree(specRoot1, platform, '2026-08-17-demo');
} catch (e) {
  threw = true;
}
assert(!threw, 'conflict 时函数不抛错');
assert(conflictResult && conflictResult.conflict === true, 'conflict 结果带 conflict=true');
conflictMode = false;

// ─────────────────────────────────────────
// 4. Windows 路径生成 POSIX op path
// ─────────────────────────────────────────
console.log('\n--- 4. Windows 路径转 POSIX ---');
const winPath = join(specRoot1, 'changes', '2026-08-17-demo', 'design.md');
// join 在 Windows 产生反斜杠路径；walkSpecTree 输出必须是 POSIX
const entries3 = walkSpecTree(specRoot1);
const designEntry = entries3.find((e) => e.path.endsWith('design.md'));
assert(designEntry && !designEntry.path.includes('\\'),
  `walk 输出 POSIX path（实际 ${designEntry && designEntry.path}）`);
assert(designEntry && designEntry.path === 'changes/2026-08-17-demo/design.md',
  'POSIX path 与预期完全一致');

// ─────────────────────────────────────────
// 5. ql-20260818-002：local.yaml 排除 + 存量行清理
// ─────────────────────────────────────────
console.log('\n--- 5. local.yaml 排除 ---');
const walkPaths5 = walkSpecTree(specRoot1).map((e) => e.path);
assert(!walkPaths5.includes('local.yaml'), 'walk 排除 local.yaml（token 不上传）');
// 服务器清单残留 local.yaml 行 → 本地无 → 生成 delete op（服务器放行清存量）
const ops5 = computeSpecOps(
  {
    'local.yaml': { hash: 'stale', version: 3, exists: true },
    'changes/2026-08-17-demo/plan.md': { hash: 'whatever', version: 1, exists: true },
  },
  hashFiles(walkSpecTree(specRoot1)),
);
const delOp5 = ops5.find((o) => o.path === 'local.yaml');
assert(delOp5 && delOp5.op === 'delete' && delOp5.base_version === 3,
  '服务器清单残留 local.yaml 行 → delete op（base_version=3，服务器清存量）');

// 纯函数 extractChangeDirs 顺手验证
const dirs = extractChangeDirs([
  { path: 'changes/2026-08-17-demo/design.md' },
  { path: 'changes/archive/2026-08-01-old/design.md', new_path: 'changes/archive/2026-08-01-old/tasks.md' },
  { path: 'docs/other.md' },
]);
assert(dirs.includes('2026-08-17-demo') && dirs.includes('2026-08-01-old') && dirs.length === 2,
  `extractChangeDirs 正确（实际 ${JSON.stringify(dirs)}）`);

// ── 收尾：等 server 关闭再删临时目录（Windows rmSync 对在用句柄会 EPERM）──
await new Promise((r) => server.close(r));
try {
  rmSync(tmpRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
} catch {
  // 个别文件仍被锁则留待系统清理，不影响测试结论
}
console.log(failures === 0 ? '\n✅ 全部通过\n' : `\n❌ ${failures} 个失败\n`);
// 用 exitCode 让 Node 自然清空 handle 后退出（Windows 下 process.exit 撞 pending
// handle 会崩，见 platform-sync-auto-docs.test.mjs 同款注释）。
process.exitCode = failures === 0 ? 0 : 1;
