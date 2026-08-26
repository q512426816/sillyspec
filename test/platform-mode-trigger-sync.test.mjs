// platform-mode-trigger-sync 验收：平台模式（isPlatformMode=true）下 triggerSync 上行回传放行。
//
// 背景（2026-08-26 决策）：平台模式此前在 triggerSync/triggerPull/triggerPullActiveChange/
// checkApproval 四处门禁 early-return（注释称"平台走自己的回传链路"）。实际平台自有链路是
// 拉模式（daemon 直读 specRoot 产物 + 轮询 progress dump 等只读命令），本仓并无另一条推送
// 实现——CLI 上行回传被整体关掉，平台变更中心收不到每步进度。现放行上行 triggerSync，
// 凭据经 env SILLYHUB_PLATFORM_URL + SILLYHUB_PLATFORM_TOKEN（daemon 注入通道，平台模式
// local.yaml 常无 platform 段，与链路 D readPlatformPushConfig 同款先例）；下行 pull 与
// 审批检查门禁保留（daemon 是权威数据面；checkApproval 放开会造成 pending 噪音 +
// rejected 硬断平台派发 execute 的语义反转）。
//
// 验收点：
// 1. 平台模式（指针 specRoot 指向外部目录 + platformOpts 带specRoot/runtimeRoot）+ env 凭据
//    → progress POST 到达，Authorization 用 env token，数据从 specRoot 的 DB 读（平台锚定）
// 2. 平台模式 + 无 env 且 local.yaml 无 platform 段 → 静默跳过（无请求、不抛）
// 3. 平台模式 + env 凭据 → triggerPull / triggerPullActiveChange / checkApproval 仍跳过
//    （无请求；checkApproval 返回 null）
// 4. SyncManager._getPlatform env 优先级：两键齐全 > local.yaml platform 段；只一键回退
//    local.yaml；均无返回 null；status() 在 env 通道下 connected=true
//
// 隔离：os.tmpdir() 临时目录 + Node http mock server，绝不碰真实 .sillyspec/.runtime。
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import http from 'http';
import { triggerSync, triggerPull, triggerPullActiveChange, checkApproval } from '../src/run/shared.js';
import { SyncManager } from '../src/sync.js';

let failures = 0;
const assert = (cond, msg) => {
  if (cond) console.log('  ✅ ' + msg);
  else { console.error('  ❌ ' + msg); failures++; }
};

delete process.env.SILLYSPEC_DEBUG_SYNC; // debug 通道不参与断言，保持默认关闭

const tmpRoot = mkdtempSync(join(tmpdir(), `sillyspec-platmode-sync-${process.pid}-`));

console.log('\n[platform-mode-trigger-sync] 平台模式上行回传放行（env 凭据通道）');

// ── mock server：记录请求 + Authorization + progress body ──
const hits = [];
const authHeaders = [];
const progressBodies = [];
const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    hits.push(`${req.method} ${req.url}`);
    authHeaders.push(req.headers.authorization || '');
    if (req.url.includes('/api/changes/-/spec-manifest')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ files: {} })); // 空清单 → 本地文件全 add
    } else if (req.url.includes('/api/changes/-/spec-sync')) {
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

// 平台模式典型形态：源码根只有指针，无 local.yaml platform 段（daemon init 只保 mcp 段）
const ENV_KEYS = ['SILLYHUB_PLATFORM_URL', 'SILLYHUB_PLATFORM_TOKEN'];
const setEnvCreds = (url, token) => {
  process.env.SILLYHUB_PLATFORM_URL = url;
  process.env.SILLYHUB_PLATFORM_TOKEN = token;
};
const clearEnvCreds = () => { for (const k of ENV_KEYS) delete process.env[k]; };

/**
 * 建平台模式现场：外部 specRoot（DB + changes 目录）+ 源码根指针。
 * 返回 { cwd, specRoot, platformOpts }。
 */
async function seedPlatformModeProject(sub) {
  const cwd = join(tmpRoot, sub, 'src-root');
  const specRoot = join(tmpRoot, sub, 'spec-root');
  mkdirSync(join(specRoot, '.runtime'), { recursive: true });
  mkdirSync(join(cwd), { recursive: true });
  // 指针：resolvePlatformSpecDir 只要求 specRoot 字段存在且路径可达
  writeFileSync(join(cwd, '.sillyspec-platform.json'), JSON.stringify({
    specRoot, runtimeRoot: join(specRoot, '.runtime'), workspaceId: 'ws-test', scanRunId: null,
  }, null, 2) + '\n', 'utf8');

  const { ProgressManager } = await import('../src/progress.js');
  const pm = new ProgressManager({ specDir: specRoot });
  pm.init(cwd);
  pm.initChange(cwd, 'plat-mode-change');
  writeFileSync(join(specRoot, 'changes', 'plat-mode-change', 'proposal.md'), '# 提案\n', 'utf8');
  pm._write(cwd, {
    currentStage: 'plan',
    stages: {
      plan: {
        status: 'in-progress',
        steps: [
          { name: '生成提案', status: 'completed', completedAt: '2026/08/26 10:00:00' },
          { name: '生成计划', status: 'pending' },
        ],
      },
    },
  }, 'plat-mode-change');
  return { cwd, specRoot, platformOpts: { specRoot, runtimeRoot: join(specRoot, '.runtime') } };
}

// ─────────────────────────────────────────
// 1. 平台模式 + env 凭据 → triggerSync 上行回传放行
// ─────────────────────────────────────────
console.log('\n--- 1. 平台模式 + env 凭据 → progress POST 到达（env token + specRoot 锚定） ---');
{
  const { cwd, specRoot, platformOpts } = await seedPlatformModeProject('t1');
  setEnvCreds(mockUrl, 'env-token-1');
  hits.length = 0; authHeaders.length = 0; progressBodies.length = 0;
  let threw = false;
  try {
    await triggerSync(cwd, 'plat-mode-change', platformOpts);
  } catch (e) { threw = true; console.error('   异常:', e.message); }
  clearEnvCreds();

  assert(!threw, '不抛异常');
  const progressHitIdx = hits.findIndex((h) => h === 'POST /api/changes/plat-mode-change/progress');
  assert(progressHitIdx >= 0, 'progress POST 到达服务器（平台模式不再被 isPlatformMode 门禁吞掉）');
  assert(progressHitIdx >= 0 && authHeaders[progressHitIdx] === 'Bearer env-token-1', 'Authorization 使用 env 注入的 token');
  const body = progressBodies.length > 0 ? JSON.parse(progressBodies[0]) : null;
  assert(body?.changes?.[0]?.name === 'plat-mode-change', 'progress body 来自 specRoot 的 DB（平台锚定，changes[0].name 正确）');
  const proposalStep = body?.steps?.find((s) => s.stage === 'plan' && s.name === '生成提案');
  assert(proposalStep?.status === 'completed', 'progress body 含步骤终态（生成提案=completed）');
}

// ─────────────────────────────────────────
// 2. 平台模式 + 无凭据 → 静默跳过
// ─────────────────────────────────────────
console.log('\n--- 2. 平台模式无 env 无 local.yaml platform 段 → 静默 ---');
{
  const { cwd, platformOpts } = await seedPlatformModeProject('t2');
  clearEnvCreds(); // 且不写 local.yaml → _getPlatform() 为 null
  hits.length = 0;
  let threw = false;
  try { await triggerSync(cwd, 'plat-mode-change', platformOpts); } catch { threw = true; }
  assert(!threw, '未连接不抛异常');
  assert(hits.length === 0, '无任何请求发出（daemon 未注入 env 时与放行前行为一致）');
}

// ─────────────────────────────────────────
// 3. 平台模式 + env 凭据 → 下行 pull / 审批检查门禁保留
// ─────────────────────────────────────────
console.log('\n--- 3. 平台模式下 triggerPull / triggerPullActiveChange / checkApproval 仍跳过 ---');
{
  const { cwd, platformOpts } = await seedPlatformModeProject('t3');
  setEnvCreds(mockUrl, 'env-token-3');
  hits.length = 0;
  let threw = false;
  try {
    await triggerPull(cwd, 'plat-mode-change', platformOpts, { timeoutMs: 500 });
    await triggerPullActiveChange(cwd, platformOpts);
  } catch { threw = true; }

  assert(!threw, 'triggerPull/triggerPullActiveChange 不抛异常');
  assert(hits.length === 0, '无任何 pull 请求发出（下行门禁保留）');

  const approval = await checkApproval(cwd, 'plat-mode-change', platformOpts);
  assert(approval === null, 'checkApproval 返回 null（门禁保留，无审批噪音/硬断反转）');
  assert(hits.length === 0, '无任何 approval 请求发出');
  clearEnvCreds();
}

// ─────────────────────────────────────────
// 4. _getPlatform env 优先级 / status()
// ─────────────────────────────────────────
console.log('\n--- 4. _getPlatform：env 两键齐全 > local.yaml；缺一回退；均无 null ---');
{
  const cwd = join(tmpRoot, 't4');
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true });
  const sm = new SyncManager(cwd);

  clearEnvCreds();
  assert(sm._getPlatform() === null, '无 env 无 local.yaml → null');

  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), 'platform:\n  url: http://yaml-example\n  token: yaml-token\n', 'utf8');
  assert(sm._getPlatform()?.url === 'http://yaml-example', '无 env → local.yaml platform 段生效');

  setEnvCreds(mockUrl, 'env-token-4');
  assert(sm._getPlatform()?.token === 'env-token-4', 'env 两键齐全 → 覆盖 local.yaml（daemon 注入通道优先）');

  delete process.env.SILLYHUB_PLATFORM_TOKEN;
  assert(sm._getPlatform()?.url === 'http://yaml-example', 'env 只有一键 → 回退 local.yaml');

  setEnvCreds(mockUrl, 'env-token-4');
  assert(sm.status().connected === true && sm.status().url === mockUrl, 'status() 在 env 通道下 connected=true（不再误报未连接）');
  clearEnvCreds();
}

server.close();
try { rmSync(tmpRoot, { recursive: true, force: true }); } catch {}

if (failures > 0) {
  console.error(`\n❌ platform-mode-trigger-sync: ${failures} 处断言失败`);
  process.exitCode = 1;
} else {
  console.log('\n✅ platform-mode-trigger-sync: 全部通过');
}
