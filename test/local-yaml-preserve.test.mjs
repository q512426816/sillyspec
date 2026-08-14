// local.yaml 注释/结构保留验收：platform connect/disconnect 文本级定向替换
// 修复 sync.js writeLocalYaml 扁平全量覆写丢注释/其他段/数组/深嵌套的 BUG
// （ql-20260811-003-b023）。
//
// 根因：connect/disconnect 旧走 readLocalYaml(parse)→modify→writeLocalYaml(flatten) 往返，
// parseSimpleYaml 第85行跳注释 + 只认一层 key:value，round-trip 清空用户手填内容。
// 修法：connect/disconnect 改 readLocalYamlRaw + replaceTopLevelSection 文本级定向操作 platform 段。
//
// 隔离：cwd 用 os.tmpdir() 临时目录，绝不碰真实 .sillyspec（记忆 sillyspec-test-specdir-isolation）。
// fetch mock：connect() 先打 /api/health 验活，mock 返回 200 JSON 才走到写 local.yaml。
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
const writeYaml = (cwd, content) => {
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true });
  writeFileSync(join(cwd, LOCAL_YAML_REL), content, 'utf8');
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

const tmpRoot = mkdtempSync(join(tmpdir(), `sillyspec-yaml-preserve-${process.pid}-`));

console.log('\n[local-yaml-preserve] connect/disconnect 文本级保留注释/其他段/数组/CRLF');

// ─────────────────────────────────────────
// 1. connect 保留注释 + 其他段 + 数组 + 深嵌套，platform 段原位替换为新值
// ─────────────────────────────────────────
console.log('\n--- 1. connect 保留注释/其他段/数组/深嵌套，platform 段替换 ---');
{
  const cwd = join(tmpRoot, 'preserve');
  mkdirSync(cwd, { recursive: true });
  const original = [
    '# 顶层注释：几个月踩坑经验',
    '# daemon flaky 规避',
    'platform:',
    '  url: http://old.example.com',
    '  token: old-tok',
    '  last_connected: 2026-01-01T00:00:00.000Z',
    '',
    '# mcp 段（用户手填，不应被同源覆盖）',
    'mcp:',
    '  url: http://mcp.example.com',
    '  token: mcp-tok',
    '',
    '# 其他段 + 数组 + 深嵌套（旧扁平 writer 会丢）',
    'modules:',
    '  - alpha',
    '  - beta',
    'nested:',
    '  deep:',
    '    key: value',
    '',
  ].join('\n');
  writeYaml(cwd, original);

  const restore = mockFetchOk();
  try {
    const sm = new SyncManager(cwd);
    await sm.connect('http://new.example.com/', 'new-tok', 'alice');
  } finally {
    restore();
  }

  const yaml = readYaml(cwd);
  assert(yaml !== null, 'connect 后 local.yaml 存在');
  // 注释保留
  assert(yaml.includes('# 顶层注释：几个月踩坑经验'), '顶层注释保留');
  assert(yaml.includes('# daemon flaky 规避'), 'daemon 注释保留');
  assert(yaml.includes('# mcp 段（用户手填，不应被同源覆盖）'), 'mcp 段注释保留');
  assert(yaml.includes('# 其他段 + 数组 + 深嵌套（旧扁平 writer 会丢）'), '其他段注释保留');
  // 数组保留
  assert(/^\s+- alpha$/m.test(yaml) && /^\s+- beta$/m.test(yaml), '数组 modules: [alpha, beta] 保留');
  // 深嵌套保留
  assert(/^\s{4}key: value$/m.test(yaml), '深嵌套 nested.deep.key 保留');
  // platform 段被替换为新值（connect 写侧 yamlStr 双引号包裹，防 # : 注入；读侧 parseSimpleYaml 剥引号）
  assert(!/old\.example\.com/.test(yaml), '旧 platform url 已被替换');
  assert(/^\s{2}url:\s*"http:\/\/new\.example\.com"\s*$/m.test(yaml), '新 platform url 写入（尾斜杠规范化+引号包裹）');
  assert(/^\s{2}token:\s*"new-tok"\s*$/m.test(yaml), '新 platform token 写入（引号包裹）');
  assert(/^\s{2}user:\s*"alice"\s*$/m.test(yaml), 'platform user 写入（引号包裹）');
  // mcp 段保留不覆盖（R-09 守卫，文本级检测）
  assert(/^\s{2}url:\s*http:\/\/mcp\.example\.com\s*$/m.test(yaml), 'mcp.url 保留不被同源覆盖');
  assert(/^\s{2}token:\s*mcp-tok\s*$/m.test(yaml), 'mcp.token 保留');
  // _getPlatform 读回新值
  const sm2 = new SyncManager(cwd);
  const platform = sm2._getPlatform();
  assert(platform && platform.url === 'http://new.example.com', '_getPlatform().url 新值');
  assert(platform && platform.token === 'new-tok', '_getPlatform().token 新值');
  assert(platform && platform.user === 'alice', '_getPlatform().user 新值');
}

// ─────────────────────────────────────────
// 2. connect 时无 mcp 段 → 追加同源 mcp；注释/其他段保留
// ─────────────────────────────────────────
console.log('\n--- 2. connect 无 mcp 段 → 追加同源 mcp，注释保留 ---');
{
  const cwd = join(tmpRoot, 'append-mcp');
  mkdirSync(cwd, { recursive: true });
  const original = [
    '# 项目注释',
    'project: sillyspec',
    '',
  ].join('\n');
  writeYaml(cwd, original);

  const restore = mockFetchOk();
  try {
    const sm = new SyncManager(cwd);
    await sm.connect('http://hub.example.com', 'tok-1', 'bob');
  } finally {
    restore();
  }

  const yaml = readYaml(cwd);
  assert(yaml.includes('# 项目注释'), '项目注释保留');
  assert(/project:\s*sillyspec/.test(yaml), 'project 段保留');
  assert(/^platform:$/m.test(yaml), 'platform 段写入');
  assert(/^mcp:$/m.test(yaml), '无 mcp 段时追加 mcp（同源）');
  const mcpMatch = yaml.match(/^mcp:\n  url: (\S+)\n  token: (\S+)/m);
  assert(mcpMatch && mcpMatch[1] === '"http://hub.example.com"', 'mcp.url 同源 platform（引号包裹）');
  assert(mcpMatch && mcpMatch[2] === '"tok-1"', 'mcp.token 同源 platform（引号包裹）');
}

// ─────────────────────────────────────────
// 3. disconnect 删 platform 段，注释/其他段保留
// ─────────────────────────────────────────
console.log('\n--- 3. disconnect 删 platform 段，注释/mcp 段保留 ---');
{
  const cwd = join(tmpRoot, 'disconnect-preserve');
  mkdirSync(cwd, { recursive: true });
  const original = [
    '# 重要注释别删',
    'platform:',
    '  url: http://hub.example.com',
    '  token: tok',
    '  last_connected: 2026-01-01T00:00:00.000Z',
    '',
    'mcp:',
    '  url: http://mcp.example.com',
    '  token: mcp-tok',
  ].join('\n');
  writeYaml(cwd, original);

  const sm = new SyncManager(cwd);
  sm.disconnect();

  const yaml = readYaml(cwd);
  assert(yaml !== null, 'disconnect 后文件保留（还有 mcp 段）');
  assert(!/^platform:/m.test(yaml), 'platform 段已删除');
  assert(yaml.includes('# 重要注释别删'), '注释保留');
  assert(/^mcp:/m.test(yaml), 'mcp 段保留');
  assert(/^\s{2}url:\s*http:\/\/mcp\.example\.com\s*$/m.test(yaml), 'mcp 内容完整保留');
}

// ─────────────────────────────────────────
// 4. disconnect 后只剩注释 → 文件保留（注释算内容，不 unlink）
// ─────────────────────────────────────────
console.log('\n--- 4. disconnect 后只剩注释 → 保留文件不 unlink ---');
{
  const cwd = join(tmpRoot, 'disconnect-comments-only');
  mkdirSync(cwd, { recursive: true });
  const original = [
    '# 只有注释和 platform，无其他段',
    'platform:',
    '  url: http://hub.example.com',
    '  token: tok',
  ].join('\n');
  writeYaml(cwd, original);

  const sm = new SyncManager(cwd);
  sm.disconnect();

  const yaml = readYaml(cwd);
  assert(yaml !== null, '只剩注释时文件保留（注释算内容，不 unlink）');
  assert(yaml.includes('# 只有注释和 platform，无其他段'), '注释保留');
  assert(!/^platform:/m.test(yaml), 'platform 段已删除');
}

// ─────────────────────────────────────────
// 5. disconnect 后纯空白（platform only 无注释）→ unlink 文件
// ─────────────────────────────────────────
console.log('\n--- 5. disconnect 后纯空白 → unlink 文件 ---');
{
  const cwd = join(tmpRoot, 'disconnect-empty');
  mkdirSync(cwd, { recursive: true });
  const original = [
    'platform:',
    '  url: http://hub.example.com',
    '  token: tok',
  ].join('\n');
  writeYaml(cwd, original);

  const sm = new SyncManager(cwd);
  sm.disconnect();

  assert(readYaml(cwd) === null, '纯空白时文件被 unlink');
}

// ─────────────────────────────────────────
// 6. 空文件 connect → 正常追加 platform + mcp
// ─────────────────────────────────────────
console.log('\n--- 6. 空文件 connect → 追加 platform + mcp ---');
{
  const cwd = join(tmpRoot, 'empty-connect');
  mkdirSync(cwd, { recursive: true });

  const restore = mockFetchOk();
  try {
    const sm = new SyncManager(cwd);
    await sm.connect('http://hub.example.com', 'tok-1', 'alice');
  } finally {
    restore();
  }

  const yaml = readYaml(cwd);
  assert(yaml !== null, '空文件 connect 写出 local.yaml');
  assert(/^platform:$/m.test(yaml), 'platform 段存在');
  assert(/^mcp:$/m.test(yaml), 'mcp 段存在');
  assert(/^\s{2}user:\s*"alice"\s*$/m.test(yaml), 'user 写入（引号包裹）');
  const sm2 = new SyncManager(cwd);
  const platform = sm2._getPlatform();
  assert(platform && platform.url === 'http://hub.example.com', '_getPlatform 读回正确');
}

// ─────────────────────────────────────────
// 7. CRLF 换行：注释/其他段已存在的 \r 保留（Windows 兼容，CLAUDE.md #13）
// ─────────────────────────────────────────
console.log('\n--- 7. CRLF 文件 connect 保留注释/其他段已存在的 \\r ---');
{
  const cwd = join(tmpRoot, 'crlf');
  mkdirSync(cwd, { recursive: true });
  const original = [
    '# CRLF 注释',
    'platform:',
    '  url: http://old.example.com',
    '  token: old-tok',
    '  last_connected: 2026-01-01T00:00:00.000Z',
    '',
    '# 其他段',
    'mcp:',
    '  url: http://mcp.example.com',
    '  token: mcp-tok',
    '',
  ].join('\r\n');
  writeYaml(cwd, original);

  const restore = mockFetchOk();
  try {
    const sm = new SyncManager(cwd);
    await sm.connect('http://new.example.com', 'new-tok', 'alice');
  } finally {
    restore();
  }

  const yaml = readYaml(cwd);
  // 注释/其他段已存在行的 \r 保留（split/join 机制：\r 留行尾）
  assert(yaml.includes('# CRLF 注释\r'), 'CRLF 顶层注释行 \\r 保留');
  assert(yaml.includes('# 其他段\r'), 'CRLF 其他段注释 \\r 保留');
  assert(yaml.includes('  url: http://mcp.example.com\r'), 'mcp 段行 \\r 保留');
  // platform 段被替换为新值（段体本身换行不强制 CRLF，只测内容）
  assert(/^\s{2}url:\s*"http:\/\/new\.example\.com/m.test(yaml), '新 platform url 写入');
  assert(!/old\.example\.com/.test(yaml), '旧 url 已替换');
  const sm2 = new SyncManager(cwd);
  const platform = sm2._getPlatform();
  assert(platform && platform.url === 'http://new.example.com', 'CRLF 文件 _getPlatform 读回正确');
}

// 清理（Windows 下偶发 EPERM，吞错不阻断退出码）
try { rmSync(tmpRoot, { recursive: true, force: true }); }
catch { /* temp dir 由 OS 清理 */ }

if (failures > 0) {
  console.error(`\n[local-yaml-preserve] ❌ ${failures} 项失败`);
  process.exit(1);
}
console.log('\n[local-yaml-preserve] ✅ 全部通过');
