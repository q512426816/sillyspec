// platform resolve 参数解析回归测试。
//
// 修复的 bug：旧实现 `const resolveName = platformArgs[0]` 盲取第一个参数，
// flag 放前面时（resolve --keep-local --change x）把 '--keep-local' 当变更名
// 去读 sync-conflict 文件 → 报「无可解决冲突: --keep-local」，真因不可见。
//
// 验收点：
// 1. 位置参数正常路径：resolve <name> --keep-local → 正确解析（keep-local 落 base_ts）
// 2. flag-first + --change：resolve --keep-local --change <name> → 用 --change 值（修复主场景）
// 3. flag-first 位置参数：resolve --keep-local <name> → 跳过 flag 取 <name>
// 4. 无变更名 + 恰一个未决冲突 → 自动选中
// 5. 无变更名 + 多个未决冲突 → 报用法并列出候选
// 6. 指定变更名无冲突文件 → 报错并列出 .runtime 现有冲突
//
// 不连真实平台：resolve 路径本身不发网络请求（只读冲突文件 + 改本地 DB）。
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import { SyncManager } from '../src/sync.js';
import { ProgressManager } from '../src/progress.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliBin = resolve(__dirname, '..', 'bin', 'sillyspec.js');

let failures = 0;
const assert = (c, m) => {
  if (c) console.log('  ✅ ' + m);
  else { console.error('  ❌ ' + m); failures++; }
};

const runCLI = (args, cwd) => {
  const res = spawnSync(process.execPath, [cliBin, 'platform', 'resolve', ...args], {
    cwd, encoding: 'utf8', timeout: 20000, stdio: ['pipe', 'pipe', 'pipe'],
  });
  return { stdout: res.stdout || '', stderr: res.stderr || '', status: res.status, combined: (res.stdout || '') + (res.stderr || '') };
};

const tmpRoot = mkdtempSync(join(tmpdir(), `ss-resolve-args-${process.pid}-`));

const mkCwd = (sub) => {
  const cwd = join(tmpRoot, sub, 'proj');
  mkdirSync(join(cwd, '.sillyspec', 'changes', 'rt-change'), { recursive: true });
  const pm = new ProgressManager({ specDir: join(cwd, '.sillyspec') });
  pm.init(cwd);
  pm.initChange(cwd, 'rt-change');
  return cwd;
};

const writeConflict = (cwd, name, pushedAt) => {
  const sm = new SyncManager(cwd);
  sm._writeConflictFile(name, {
    base_ts: '2026-08-10T02:00:00.000Z',
    local_modified_ts: '2026-08-10T03:00:00.000Z',
    platform_last_pushed_at: pushedAt,
    platform_progress: null,
  });
};

const getSyncedTs = (cwd, name) => new ProgressManager({ specDir: join(cwd, '.sillyspec') })
  ._ensureDB(cwd).getDb().prepare('SELECT last_synced_platform_ts AS ts FROM changes WHERE name = ?').get(name)?.ts;

console.log('\n[platform-resolve-args] resolve 参数解析：flag 剥离 / --change / 自动选中 / 报错列候选');

// ─────────────────────────────────────────
console.log('\n--- 1. 位置参数正常路径 ---');
{
  const cwd = mkCwd('positional');
  writeConflict(cwd, 'rt-change', '2026-08-10T04:00:00.000Z');
  const r = runCLI(['rt-change', '--keep-local'], cwd);
  assert(r.combined.includes('✅ rt-change [keep-local]'), 'resolve rt-change --keep-local 成功');
  assert(getSyncedTs(cwd, 'rt-change') === '2026-08-10T04:00:00.000Z', 'keep-local 推进 base_ts');
}

// ─────────────────────────────────────────
console.log('\n--- 2. flag-first + --change（修复主场景） ---');
{
  const cwd = mkCwd('change-flag');
  writeConflict(cwd, 'rt-change', '2026-08-10T04:00:00.000Z');
  const r = runCLI(['--keep-local', '--change', 'rt-change'], cwd);
  assert(r.combined.includes('✅ rt-change [keep-local]'), 'flag-first + --change 用 --change 值解析成功');
  assert(!r.combined.includes('--keep-local: 无可解决冲突'), '不再把 flag 名当变更名报错');
  assert(getSyncedTs(cwd, 'rt-change') === '2026-08-10T04:00:00.000Z', 'keep-local 推进 base_ts');
}

// ─────────────────────────────────────────
console.log('\n--- 3. flag-first 位置参数 ---');
{
  const cwd = mkCwd('flag-first-positional');
  writeConflict(cwd, 'rt-change', '2026-08-10T04:00:00.000Z');
  const r = runCLI(['--abort', 'rt-change'], cwd);
  assert(r.combined.includes('✅ rt-change [abort]'), 'flag 在前时跳过 flag 取位置参数');
}

// ─────────────────────────────────────────
console.log('\n--- 4. 无变更名 + 唯一冲突自动选中 ---');
{
  const cwd = mkCwd('auto-select');
  writeConflict(cwd, 'rt-change', '2026-08-10T04:00:00.000Z');
  const r = runCLI(['--keep-local'], cwd);
  assert(r.stdout.includes('自动选中唯一未决冲突: rt-change'), '自动选中提示');
  assert(r.combined.includes('✅ rt-change [keep-local]'), '自动选中后 resolve 成功');
}

// ─────────────────────────────────────────
console.log('\n--- 5. 无变更名 + 多个冲突列候选 ---');
{
  const cwd = mkCwd('multi-conflict');
  mkdirSync(join(cwd, '.sillyspec', 'changes', 'rt-other'), { recursive: true });
  const pm = new ProgressManager({ specDir: join(cwd, '.sillyspec') });
  pm.initChange(cwd, 'rt-other');
  writeConflict(cwd, 'rt-change', '2026-08-10T04:00:00.000Z');
  writeConflict(cwd, 'rt-other', '2026-08-10T04:00:00.000Z');
  const r = runCLI(['--keep-local'], cwd);
  assert(r.status !== 0, '多冲突无变更名退出非 0');
  assert(r.stderr.includes('用法'), '打印用法');
  assert(r.stderr.includes('rt-change') && r.stderr.includes('rt-other'), '列出候选冲突变更名');
}

// ─────────────────────────────────────────
console.log('\n--- 6. 指定变更名无冲突文件 → 报错列出现有冲突 ---');
{
  const cwd = mkCwd('mismatch-list');
  writeConflict(cwd, 'rt-change', '2026-08-10T04:00:00.000Z');
  const r = runCLI(['no-such-change', '--keep-local'], cwd);
  assert(r.status !== 0, '无冲突文件退出非 0');
  assert(r.stderr.includes('无可解决冲突'), '报无可解决冲突');
  assert(r.stderr.includes('rt-change'), '报错中列出现有冲突文件候选');
}

// 清理
try { rmSync(tmpRoot, { recursive: true, force: true }); }
catch { /* temp dir 由 OS 清理 */ }

if (failures > 0) {
  console.error(`\n[platform-resolve-args] ❌ ${failures} 项失败`);
  process.exit(1);
}
console.log('\n[platform-resolve-args] ✅ 全部通过');
