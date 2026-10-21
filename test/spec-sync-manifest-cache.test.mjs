// 2026-10-21-cli-manifest-since-cache 验收：CLI spec-manifest 增量游标缓存。
//
// 验收点（design.md / requirements FR-01~05）：
// 1. 首拉无缓存 → 不带 since 全量 + 缓存落盘（inc_count=0）
// 2. 有缓存 → GET 带 ?since=<spec_version>，增量行（含墓碑）合并进缓存与锚
// 3. 对账轮（RECONCILE_EVERY）/ SILLYSPEC_SPEC_SYNC_FULL=1 → 全量并重置缓存
// 4. 旧平台（响应无 spec_version）→ 作废缓存回退全量（未部署窗口兼容）
// 5. 服务端 spec_version 倒退 → 一次性全量对账；对账失败 fail-closed（ok:false 零 POST）
// 6. 稳态（无差异轮）端到端 <1s 且零 POST
//
// 隔离：cwd 用 os.tmpdir() 临时目录 + Node http mock server（127.0.0.1 随机端口），
// 服务端按 landing_version 语义过滤 since 增量（模拟平台 20261021130000 行为）。
import { mkdirSync, mkdtempSync, writeFileSync, rmSync, readFileSync, existsSync } from 'fs';
import { createHash } from 'crypto';
import { join } from 'path';
import { tmpdir } from 'os';
import http from 'http';
import { syncSpecTree } from '../src/spec-sync.js';

let failures = 0;
const assert = (cond, msg) => {
  if (cond) console.log('  ✅ ' + msg);
  else { console.error('  ❌ ' + msg); failures++; }
};

const tmpRoot = mkdtempSync(join(tmpdir(), `sillyspec-manifest-cache-${process.pid}-`));

const sha = (s) => createHash('sha256').update(s).digest('hex');

// ── mock 平台：state/ 布局对齐服务端（files 携带 _lv 印章仅供 since 过滤）──
const srv = {
  specVersion: 0,
  files: {}, // path -> {hash, version, exists, _lv}
  legacy: false, // 旧平台：响应无 spec_version
  fullFails: false, // 倒退对账的全量请求模拟 500
};
let manifestRequests = []; // {url, since}
let syncPosts = 0;
const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    if (req.url.includes('/api/changes/-/spec-manifest')) {
      const m = req.url.match(/[?&]since=(\d+)/);
      const since = m ? Number(m[1]) : null;
      manifestRequests.push({ url: req.url, since });
      if (srv.legacy) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ files: stripLv(srv.files) }));
        return;
      }
      if (since === null && srv.fullFails) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'boom' }));
        return;
      }
      const files = since === null
        ? stripLv(srv.files)
        : stripLv(Object.fromEntries(Object.entries(srv.files).filter(([, v]) => (v._lv || 0) > since)));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ files, spec_version: srv.specVersion }));
    } else if (req.url.includes('/api/changes/-/spec-sync')) {
      syncPosts++;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, new_versions: {}, conflict: false, server_versions: null }));
    } else {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
    }
  });
});
function stripLv(files) {
  const out = {};
  for (const [p, v] of Object.entries(files)) out[p] = { hash: v.hash, version: v.version, exists: v.exists };
  return out;
}
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const platform = { url: `http://127.0.0.1:${server.address().port}`, token: 'test-token' };

const cachePath = (root) => join(root, '.runtime', 'state', 'spec-manifest-cache.json');
const readCache = (root) => JSON.parse(readFileSync(cachePath(root), 'utf8'));
const makeWs = (name) => {
  const root = join(tmpRoot, name, '.sillyspec');
  mkdirSync(join(root, 'changes', 'demo'), { recursive: true });
  return root;
};
const writeLocal = (root, rel, content) => {
  const p = join(root, rel);
  mkdirSync(join(p, '..'), { recursive: true });
  writeFileSync(p, content, 'utf8');
};

console.log('\n[spec-sync-manifest-cache] 2026-10-21：CLI 清单增量游标消费');

// ── 1. 首拉全量落缓存（FR-02 场景：首次同步）──
console.log('\n--- 1. 首拉全量落缓存 ---');
{
  const root = makeWs('ws1');
  writeLocal(root, 'changes/demo/design.md', '# v1\n');
  srv.files = { 'changes/demo/design.md': { hash: sha('# v1\n'), version: 1, exists: true, _lv: 1 } };
  srv.specVersion = 1;
  manifestRequests = [];
  const r = await syncSpecTree(root, platform, 'demo');
  assert(manifestRequests.length === 1 && manifestRequests[0].since === null, '首拉不带 since（全量）');
  assert(existsSync(cachePath(root)), '缓存文件已落盘');
  const c = readCache(root);
  assert(c.spec_version === 1 && c.inc_count === 0, `缓存 {spec_version:1, inc_count:0}（实际 ${c.spec_version}/${c.inc_count}）`);
  assert(Object.keys(c.files).length === 1, '缓存 files 为全量单行');
  assert(r.ok === true && syncPosts === 0, '本地与服务端一致 → 零 POST ok:true');
}

// ── 2. 增量合并 + 缓存推进 + 墓碑行（FR-01 主路径）──
console.log('\n--- 2. 增量合并与缓存推进 ---');
{
  const root = makeWs('ws2');
  writeLocal(root, 'changes/demo/design.md', '# v1\n');
  writeLocal(root, 'changes/demo/tasks.md', '# tasks\n');
  writeLocal(root, 'changes/demo/gone.md', '# gone\n');
  // 首拉：服务端 v2 有 design/gone（无 tasks）
  srv.files = {
    'changes/demo/design.md': { hash: sha('# v1\n'), version: 1, exists: true, _lv: 1 },
    'changes/demo/gone.md': { hash: sha('# gone\n'), version: 1, exists: true, _lv: 2 },
  };
  srv.specVersion = 2;
  manifestRequests = [];
  await syncSpecTree(root, platform, 'demo'); // 首拉 + 推 tasks.md add + gone delete? gone 本地在
  const firstCache = readCache(root);
  assert(firstCache.spec_version === 2, '首拉缓存 v2');

  // 服务端落地新行 + 软删 gone（v3）；本地补 gone 删除、加 tasks 已在上轮
  writeLocal(root, 'changes/demo/plan.md', '# plan\n');
  srv.files['changes/demo/gone.md'] = { hash: sha('# gone\n'), version: 2, exists: false, _lv: 3 };
  srv.files['changes/demo/plan.md'] = { hash: sha('# plan\n'), version: 1, exists: true, _lv: 3 };
  srv.files['changes/demo/tasks.md'] = { hash: sha('# tasks\n'), version: 1, exists: true, _lv: 3 };
  srv.specVersion = 3;
  rmSync(join(root, 'changes', 'demo', 'gone.md'));
  manifestRequests = [];
  syncPosts = 0;
  const r = await syncSpecTree(root, platform, 'demo');
  assert(manifestRequests.length === 1 && manifestRequests[0].since === 2, `增量请求带 ?since=2（实际 ${manifestRequests[0]?.url}）`);
  const c = readCache(root);
  assert(c.spec_version === 3 && c.inc_count === 1, `缓存推进 v3/inc=1（实际 ${c.spec_version}/${c.inc_count}）`);
  assert(c.files['changes/demo/gone.md'].exists === false, '墓碑行合并进缓存（exists=false）');
  assert(c.files['changes/demo/design.md'].version === 1, '未触碰行保留（合并不丢行）');
  assert(r.ok === true, `增量锚驱动收敛（synced=${r.synced}）`);
}

// ── 3. 对账轮与强制全量（FR-02 场景：对账轮 / 环境变量）──
console.log('\n--- 3. 对账轮与强制全量 ---');
{
  const root = makeWs('ws3');
  writeLocal(root, 'changes/demo/design.md', '# v1\n');
  srv.files = { 'changes/demo/design.md': { hash: sha('# v1\n'), version: 1, exists: true, _lv: 1 } };
  srv.specVersion = 1;
  await syncSpecTree(root, platform, 'demo');
  process.env.SILLYSPEC_SPEC_SYNC_RECONCILE_EVERY = '1';
  manifestRequests = [];
  await syncSpecTree(root, platform, 'demo'); // inc_count 已 0？首拉后=0 → 增量 1 次 → inc=1
  assert(manifestRequests[0]?.since === 1, 'RECONCILE_EVERY=1 时第 2 轮仍增量（inc=0<1）');
  manifestRequests = [];
  await syncSpecTree(root, platform, 'demo'); // inc=1 ≥ 1 → 对账全量
  assert(manifestRequests[0]?.since === null, '对账轮走全量（不带 since）');
  assert(readCache(root).inc_count === 0, '对账后计数归零');
  delete process.env.SILLYSPEC_SPEC_SYNC_RECONCILE_EVERY;

  process.env.SILLYSPEC_SPEC_SYNC_FULL = '1';
  manifestRequests = [];
  await syncSpecTree(root, platform, 'demo');
  assert(manifestRequests[0]?.since === null, 'SILLYSPEC_SPEC_SYNC_FULL=1 强制全量');
  assert(readCache(root).inc_count === 0, '强制全量重置缓存');
  delete process.env.SILLYSPEC_SPEC_SYNC_FULL;
}

// ── 4. 旧平台兼容（FR-03）──
console.log('\n--- 4. 旧平台无 spec_version ---');
{
  const root = makeWs('ws4');
  writeLocal(root, 'changes/demo/design.md', '# v1\n');
  srv.files = { 'changes/demo/design.md': { hash: sha('# v1\n'), version: 1, exists: true, _lv: 1 } };
  srv.specVersion = 1;
  await syncSpecTree(root, platform, 'demo'); // 建缓存
  assert(existsSync(cachePath(root)), '前置：缓存存在');
  srv.legacy = true;
  manifestRequests = [];
  const r = await syncSpecTree(root, platform, 'demo');
  assert(manifestRequests[0]?.since === 1, '带 since 请求（旧平台忽略该参数）');
  assert(!existsSync(cachePath(root)), '旧平台响应作废缓存（文件删除）');
  assert(r.ok === true, '旧平台回退全量行为正常（ok:true）');
  srv.legacy = false;
}

// ── 5. 服务端倒退对账（FR-04）──
console.log('\n--- 5. spec_version 倒退对账 ---');
{
  const root = makeWs('ws5');
  writeLocal(root, 'changes/demo/design.md', '# v1\n');
  srv.files = { 'changes/demo/design.md': { hash: sha('# v1\n'), version: 1, exists: true, _lv: 5 } };
  srv.specVersion = 5;
  await syncSpecTree(root, platform, 'demo');
  srv.files = { 'changes/demo/design.md': { hash: sha('# v1\n'), version: 1, exists: true, _lv: 1 } };
  srv.specVersion = 1; // 服务端重建
  manifestRequests = [];
  const r = await syncSpecTree(root, platform, 'demo');
  assert(manifestRequests.length === 2 && manifestRequests[0].since === 5 && manifestRequests[1].since === null,
    `倒退触发两次请求：since=5 → 全量（实际 ${manifestRequests.map((x) => x.since)}）`);
  assert(readCache(root).spec_version === 1 && readCache(root).inc_count === 0, '对账后缓存以服务端新纪元重置');
  assert(r.ok === true, '倒退对账收敛 ok:true');

  // 对账请求失败 → fail-closed（ok:false，零 POST）
  srv.fullFails = true;
  srv.specVersion = 0; // 再次倒退（1 → 0）
  manifestRequests = [];
  syncPosts = 0;
  const r2 = await syncSpecTree(root, platform, 'demo');
  assert(r2.ok === false && syncPosts === 0, '对账失败 fail-closed：ok:false 且零 POST（防空锚 add 风暴）');
  srv.fullFails = false;
}

// ── 6. 稳态 <1s e2e（FR-05）──
console.log('\n--- 6. 稳态端到端 <1s ---');
{
  const root = makeWs('ws6');
  // 模拟真实规模锚：缓存 5000 行（内存合并量级远超生产稳态增量），本地与
  // 服务端一致——hist 行全为墓碑（exists=false，CLI diff 过滤不产生 op，
  // 对齐生产清单 95% 为 changes/ 历史/墓碑行的真实形态）
  const bigFiles = {};
  writeLocal(root, 'changes/demo/design.md', '# v1\n');
  bigFiles['changes/demo/design.md'] = { hash: sha('# v1\n'), version: 1, exists: true, _lv: 1 };
  for (let i = 0; i < 5000; i++) {
    const p = `changes/hist/h${i}/plan.md`;
    bigFiles[p] = { hash: sha(`hist-${i}`), version: 1, exists: false, _lv: 1 };
  }
  srv.files = bigFiles;
  srv.specVersion = 1;
  syncPosts = 0;
  await syncSpecTree(root, platform, 'demo'); // 首拉建缓存（本地与服务端一致，零 op）
  assert(syncPosts === 0, '前置：首拉即稳态（零 POST）');
  manifestRequests = [];
  syncPosts = 0;
  const t0 = Date.now();
  const r = await syncSpecTree(root, platform, 'demo');
  const dt = Date.now() - t0;
  assert(manifestRequests[0]?.since === 1, '稳态走增量（since=1，响应体只含 0 行变化）');
  assert(dt < 1000, `端到端耗时 <1s（实际 ${dt}ms）`);
  assert(syncPosts === 0 && r.ok === true, '稳态零 POST ok:true');
}

server.close();
try { rmSync(tmpRoot, { recursive: true, force: true }); } catch { /* Windows 句柄残留容忍 */ }
console.log(`\n[spec-sync-manifest-cache] 结果：${failures === 0 ? 'ALL PASS' : `${failures} FAILED`}`);
process.exitCode = failures === 0 ? 0 : 1;
