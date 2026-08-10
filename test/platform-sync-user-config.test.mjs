// task-08 验收：local.yaml platform 段加 user 字段（design 2026-08-10-platform-progress-sync
// §6 文件清单 / D-004@v1「user 身份 = local.yaml 加 user 字段」）。
//
// 验收点（task-08.md acceptance）：
// 1. connect 后 local.yaml platform 段含 user 字段（显式参数写入）
// 2. _getPlatform 返回含 user 的配置对象
// 3. 无 user 参数时回退 git 用户名 / env，不报错（user 为非空 string）
// 4. 兼容旧 local.yaml 无 user 字段：_getPlatform 返回 user === undefined 不崩
// 5. parseSimpleYaml 天然支持 platform.user（经 _getPlatform 往返间接验证）
// 6. 显式 user 两端空白被 trim
//
// 隔离：cwd 用 os.tmpdir() 临时目录，绝不碰真实 .sillyspec/.runtime（记忆 sillyspec-test-specdir-isolation）。
// fetch mock：connect() 先打 /api/health 验活，mock globalThis.fetch 返回 200 JSON 才会走到写 local.yaml。
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { SyncManager } from '../src/sync.js';

let failures = 0;
const assert = (cond, msg) => {
  if (cond) console.log('  ✅ ' + msg);
  else { console.error('  ❌ ' + msg); failures++; }
};

const LOCAL_YAML_REL = join('.sillyspec', 'local.yaml');
const readYaml = (cwd) => {
  const p = join(cwd, LOCAL_YAML_REL);
  return existsSync(p) ? readFileSync(p, 'utf8') : null;
};

// mock globalThis.fetch：对 /api/health 返回 200 application/json { status:'ok' }
function mockFetchOk() {
  const saved = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    headers: { get: (h) => (String(h).toLowerCase() === 'content-type' ? 'application/json' : null) },
    json: async () => ({ status: 'ok' }),
    text: async () => JSON.stringify({ status: 'ok' }),
  });
  return () => { globalThis.fetch = saved; };
}

const tmpRoot = mkdtempSync(join(tmpdir(), `sillyspec-platform-user-${process.pid}-`));

console.log('\n[platform-sync-user-config] task-08：local.yaml platform 段加 user 字段');

// ─────────────────────────────────────────
// 1. connect 显式 user → local.yaml 含 user + _getPlatform 返回 user
// ─────────────────────────────────────────
console.log('\n--- 1. connect 显式 user 写入 local.yaml + _getPlatform ---');
{
  const cwd = join(tmpRoot, 'explicit');
  mkdirSync(cwd, { recursive: true });
  const restore = mockFetchOk();
  try {
    const sm = new SyncManager(cwd);
    await sm.connect('http://hub.example.com/', 'tok-1', 'alice');
  } finally {
    restore();
  }

  const yaml = readYaml(cwd);
  assert(yaml !== null, 'connect 写出 .sillyspec/local.yaml');
  assert(/platform:/.test(yaml), 'local.yaml 含 platform 段');
  assert(/^\s{2}user:\s*alice\s*$/m.test(yaml), `local.yaml platform 段含 user: alice（实际片段：\n${yaml}）`);
  assert(/^\s{2}url:\s*http:\/\/hub\.example\.com\s*$/m.test(yaml), 'url 尾斜杠被规范化');
  assert(/^\s{2}token:\s*tok-1\s*$/m.test(yaml), 'platform 段含 token');
  assert(/^\s{2}last_connected:\s*.+$/m.test(yaml), 'platform 段含 last_connected');

  // _getPlatform 返回含 user 的对象（同时验证 parseSimpleYaml 往返解析 platform.user）
  const sm2 = new SyncManager(cwd);
  const platform = sm2._getPlatform();
  assert(platform !== null, '_getPlatform 返回非 null');
  assert(platform && platform.user === 'alice', `_getPlatform().user === 'alice'（实际 ${platform && platform.user}）`);
  assert(platform && platform.url === 'http://hub.example.com', '_getPlatform().url 规范化保留');
  assert(platform && platform.token === 'tok-1', '_getPlatform().token 保留');
}

// ─────────────────────────────────────────
// 2. connect 无 user 参数 → 回退（git user.name / env），不报错，user 为非空 string
// ─────────────────────────────────────────
console.log('\n--- 2. connect 无 user 参数 → 回退不报错 ---');
{
  const cwd = join(tmpRoot, 'fallback');
  mkdirSync(cwd, { recursive: true });
  const restore = mockFetchOk();
  let threw = false;
  let platformUser;
  try {
    const sm = new SyncManager(cwd);
    await sm.connect('http://hub.example.com', 'tok-2');
    platformUser = sm._getPlatform()?.user;
  } catch (e) {
    threw = true;
    console.error('  ⚠️ connect 抛错:', e.message);
  } finally {
    restore();
  }

  assert(!threw, 'connect 无 user 参数不抛错');
  // 回退值来自 git user.name（全局或本地）或 env USER/USERNAME——任何真实开发环境至少命中其一
  assert(typeof platformUser === 'string' && platformUser.length > 0,
    `回退 user 为非空 string（实际 ${JSON.stringify(platformUser)}）`);
}

// ─────────────────────────────────────────
// 3. 旧 local.yaml 无 user 字段 → _getPlatform().user === undefined 不崩
// ─────────────────────────────────────────
console.log('\n--- 3. 旧 local.yaml 无 user 字段 → 兼容不崩 ---');
{
  const cwd = join(tmpRoot, 'legacy');
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true });
  // 手写一个不含 user 的旧 platform 段（url/token/last_connected 三键）
  writeFileSync(
    join(cwd, LOCAL_YAML_REL),
    'platform:\n  url: http://old.example.com\n  token: legacy-tok\n  last_connected: 2026-01-01T00:00:00.000Z\n',
    'utf8',
  );

  const sm = new SyncManager(cwd);
  let threw = false;
  let platform;
  try {
    platform = sm._getPlatform();
  } catch (e) {
    threw = true;
    console.error('  ⚠️ _getPlatform 抛错:', e.message);
  }

  assert(!threw, '_getPlatform 读旧 local.yaml 不抛错');
  assert(platform !== null, '旧 local.yaml 有 platform 段 → _getPlatform 非 null');
  assert(platform && platform.user === undefined,
    `旧 local.yaml 无 user → _getPlatform().user === undefined（实际 ${platform && platform.user}）`);
  assert(platform && platform.url === 'http://old.example.com', '旧 url 仍正确解析');
  assert(platform && platform.token === 'legacy-tok', '旧 token 仍正确解析');
}

// ─────────────────────────────────────────
// 4. 无 platform 段（本地独立用户）→ _getPlatform 返回 null，不受 user 字段影响
// ─────────────────────────────────────────
console.log('\n--- 4. 本地独立用户无 platform 段 → _getPlatform null 不受影响 ---');
{
  const cwd = join(tmpRoot, 'noplatform');
  mkdirSync(cwd, { recursive: true });
  const sm = new SyncManager(cwd);
  const platform = sm._getPlatform();
  assert(platform === null, '无 local.yaml → _getPlatform 返回 null（本地独立合法状态）');
}

// ─────────────────────────────────────────
// 5. 显式 user 两端空白被 trim（resolvePlatformUser 规范化）
// ─────────────────────────────────────────
console.log('\n--- 5. 显式 user 两端空白被 trim ---');
{
  const cwd = join(tmpRoot, 'trim');
  mkdirSync(cwd, { recursive: true });
  const restore = mockFetchOk();
  try {
    const sm = new SyncManager(cwd);
    await sm.connect('http://hub.example.com', 'tok-3', '   bob   ');
    const platform = sm._getPlatform();
    assert(platform && platform.user === 'bob',
      `空白被 trim → user === 'bob'（实际 ${platform && JSON.stringify(platform.user)}）`);
  } finally {
    restore();
  }
}

// ─────────────────────────────────────────
// 6. 空 string user 视同未传 → 走回退（不被当作合法显式值写入空串）
// ─────────────────────────────────────────
console.log('\n--- 6. 空串 user 视同未传 → 走回退 ---');
{
  const cwd = join(tmpRoot, 'emptystr');
  mkdirSync(cwd, { recursive: true });
  const restore = mockFetchOk();
  try {
    const sm = new SyncManager(cwd);
    await sm.connect('http://hub.example.com', 'tok-4', '');
    const platform = sm._getPlatform();
    // 回退后应是回退值（git/env），而非空串
    assert(typeof platform?.user === 'string' && platform.user.length > 0,
      `空串 user 走回退 → user 非空（实际 ${JSON.stringify(platform && platform.user)}）`);
  } finally {
    restore();
  }
}

// 清理（Windows 下偶发 EPERM，吞错不阻断退出码）
try { rmSync(tmpRoot, { recursive: true, force: true }); }
catch { /* temp dir 由 OS 清理 */ }

if (failures > 0) {
  console.error(`\n[platform-sync-user-config] ❌ ${failures} 项失败`);
  process.exit(1);
}
console.log('\n[platform-sync-user-config] ✅ 全部通过');
