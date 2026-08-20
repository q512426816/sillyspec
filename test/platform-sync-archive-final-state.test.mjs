// archive-final-state-sync 验收：归档后（目录已移到 changes/archive/ + DB 行 status='archived'）
// triggerSync 仍把终态推上平台。
//
// 背景：archive 第 4 步「确认归档」由 CLI 移动 changes/<name>/ → changes/archive/<name>/
// 并 unregisterChange；此后第 4/5 步收尾的 triggerSync 全部命中「目录不存在 → 静默 return」
// 守卫（本意防变更名拼错的噪音），导致平台进度永远停在移动前的最后一步（第 3 步），
// 且文件树移动（旧路径 delete / 新路径 add）也不随该变更推送。而 sync() 内部本就有
// 归档感知分支（warn-and-continue，serializeForSync 从 DB 读不依赖目录），只是被上游
// 守卫拦得不可达。
//
// 验收点：
// 1. 归档后（DB 行 archived + 目录已移）→ progress POST 到达且 body 含 status='archived'
//    与步骤终态；spec-sync POST 到达且含 changes/archive/<name>/ 路径 add op（树移动上平台）
// 2. 未连接平台 → 静默跳过（无请求、无异常）
// 3. 目录被手删但 DB 行仍 active（中间态）→ progress 照推（进度真相源 = DB，目录缺失只 warn）
//
// 隔离：cwd 用 os.tmpdir() 临时目录 + Node http mock server，绝不碰真实 .sillyspec/.runtime。
import { mkdirSync, mkdtempSync, writeFileSync, renameSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import http from 'http';
import { triggerSync } from '../src/run/shared.js';

let failures = 0;
const assert = (cond, msg) => {
  if (cond) console.log('  ✅ ' + msg);
  else { console.error('  ❌ ' + msg); failures++; }
};

delete process.env.SILLYSPEC_DEBUG_SYNC; // debug 通道不参与断言，保持默认关闭

const tmpRoot = mkdtempSync(join(tmpdir(), `sillyspec-archive-sync-${process.pid}-`));

console.log('\n[platform-sync-archive-final-state] 归档后终态（steps + archived + 文件树移动）仍推平台');

// ── mock server：记录请求 + progress/spec-sync POST body ──
const hits = [];
const progressBodies = [];
const syncBodies = [];
const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    hits.push(`${req.method} ${req.url}`);
    if (req.url.includes('/api/changes/-/spec-manifest')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ files: {} })); // 空清单 → 本地文件全 add
    } else if (req.url.includes('/api/changes/-/spec-sync')) {
      syncBodies.push(body);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, new_versions: {}, conflict: false }));
    } else if (/\/api\/changes\/[^/]+\/progress/.test(req.url) && req.method === 'POST') {
      progressBodies.push(body);
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

const { ProgressManager } = await import('../src/progress.js');

/**
 * 建一个走到 archive 第 4 步完成后的变更现场：
 * DB 行 active + archive 阶段前 4 步 completed + changes/<name>/ 目录（含 plan.md）。
 */
async function seedChangeAtArchiveConfirm(cwd, name) {
  const pm = new ProgressManager({ specDir: join(cwd, '.sillyspec') });
  pm.init(cwd);
  pm.initChange(cwd, name);
  writeFileSync(join(cwd, '.sillyspec', 'changes', name, 'plan.md'), '# 计划\n', 'utf8');
  pm._write(cwd, {
    currentStage: 'archive',
    stages: {
      archive: {
        status: 'in-progress',
        steps: [
          { name: '任务完成度检查', status: 'completed', completedAt: '2026/08/20 10:00:00' },
          { name: 'extract-module-impact', status: 'completed', completedAt: '2026/08/20 10:05:00' },
          { name: 'sync-module-docs', status: 'completed', completedAt: '2026/08/20 10:10:00' },
          { name: '确认归档', status: 'completed', completedAt: '2026/08/20 10:15:00' },
          { name: '更新路线图和提交', status: 'pending' },
        ],
      },
    },
  }, name);
  return pm;
}

/** 复刻 archiveChangeDirectory 的确定性副作用：目录移动 + DB 行注销（跳过 git/worktree）。 */
function simulateArchive(pm, cwd, name) {
  const changesDir = join(cwd, '.sillyspec', 'changes');
  mkdirSync(join(changesDir, 'archive'), { recursive: true });
  renameSync(join(changesDir, name), join(changesDir, 'archive', name));
  pm.unregisterChange(cwd, name);
}

// ─────────────────────────────────────────
// 1. 归档后 → progress 终态 + spec 树移动都上平台
// ─────────────────────────────────────────
console.log('\n--- 1. 归档后（目录已移 + status=archived）→ 终态照推 ---');
{
  const cwd = join(tmpRoot, 'archived-connected');
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true });
  connectYaml(cwd);
  const pm = await seedChangeAtArchiveConfirm(cwd, 'archived-change');
  simulateArchive(pm, cwd, 'archived-change');
  hits.length = 0; progressBodies.length = 0; syncBodies.length = 0;

  await triggerSync(cwd, 'archived-change');

  const progressHit = hits.some((h) => h.includes('POST /api/changes/archived-change/progress'));
  assert(progressHit, 'progress POST 到达服务器（终态不再被目录缺失守卫吞掉）');

  const body = progressBodies.length > 0 ? JSON.parse(progressBodies[0]) : null;
  assert(body?.changes?.[0]?.status === 'archived', 'progress body 含 changes[0].status=archived');
  const confirmStep = body?.steps?.find((s) => s.stage === 'archive' && s.name === '确认归档');
  assert(confirmStep?.status === 'completed', 'progress body 含「确认归档」completed 步骤终态');

  const ops = syncBodies.flatMap((b) => { try { return JSON.parse(b).ops || []; } catch { return []; } });
  assert(
    ops.some((o) => o.op === 'add' && o.path === 'changes/archive/archived-change/plan.md'),
    'spec-sync POST 含 changes/archive/archived-change/plan.md add op（文件树移动上平台）',
  );
  assert(
    !ops.some((o) => o.path.startsWith('changes/archived-change/')),
    'spec-sync 无旧路径 changes/archived-change/ 残留 op',
  );
}

// ─────────────────────────────────────────
// 2. 归档后 + 未连接平台 → 静默跳过
// ─────────────────────────────────────────
console.log('\n--- 2. 归档后未连接平台 → 静默 ---');
{
  const cwd = join(tmpRoot, 'archived-offline');
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true }); // 无 local.yaml = 未连接
  const pm = await seedChangeAtArchiveConfirm(cwd, 'offline-change');
  simulateArchive(pm, cwd, 'offline-change');
  hits.length = 0;

  let threw = false;
  try { await triggerSync(cwd, 'offline-change'); } catch { threw = true; }
  assert(!threw, '未连接不抛异常');
  assert(hits.length === 0, '无任何请求发出');
}

// ─────────────────────────────────────────
// 3. 目录被手删但 DB 行仍 active → progress 照推（进度真相源 = DB）
// ─────────────────────────────────────────
console.log('\n--- 3. 目录手删（DB 行仍 active）→ progress 照推 ---');
{
  const cwd = join(tmpRoot, 'dir-deleted');
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true });
  connectYaml(cwd);
  await seedChangeAtArchiveConfirm(cwd, 'dir-gone-change');
  rmSync(join(cwd, '.sillyspec', 'changes', 'dir-gone-change'), { recursive: true, force: true });
  hits.length = 0; progressBodies.length = 0;

  await triggerSync(cwd, 'dir-gone-change');
  const progressHit = hits.some((h) => h.includes('POST /api/changes/dir-gone-change/progress'));
  assert(progressHit, 'progress POST 到达（DB 是进度真相源，目录缺失只 warn）');
  const body = progressBodies.length > 0 ? JSON.parse(progressBodies[0]) : null;
  assert(body?.changes?.[0]?.status === 'active', 'progress body 含 changes[0].status=active（未注销不变更状态）');
}

server.close();
try { rmSync(tmpRoot, { recursive: true, force: true }); } catch {}

if (failures > 0) {
  console.error(`\n❌ platform-sync-archive-final-state: ${failures} 处断言失败`);
  process.exitCode = 1;
} else {
  console.log('\n✅ platform-sync-archive-final-state: 全部通过');
}
