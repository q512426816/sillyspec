/**
 * worktree-doctor 测试 — change 2026-08-05-tooling-feedback-fixes（task-03）
 *
 * 覆盖：
 *   1. deps-main-drift 探测：主仓 lockfile 漂移 + wt 自身未变 → 报 deps-main-drift（非 stale）
 *   2. provisionDeps force：force=true 绕过 lockfile 一致快路径（hash 一致也走 install）
 *   3. doctor --fix：_doctorReprovision 先解 junction 再 provisionDeps(force) → meta.depsStatus
 *      从 failed 重置为 installed（force 区别于非 force 的 linked），junction 已解
 *   4. doctor --change 过滤：多 wt 只扫指定 change
 *   5. in-place 守卫放宽：in-place-fallback 也跑 deps 检查（deps-failed 不再被整体跳过）
 *
 * 隔离：每个用例独立 tmp git 仓 + 独立 wt 目录；不依赖真实 sillyspec.db / 真实 worktree 注册。
 * Windows junction 清理前先解链，防 rmSync 跟随误删主仓 node_modules（与 cleanup 722-743 同源坑）。
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, lstatSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';
import { createHash } from 'crypto';
import { WorktreeManager } from '../src/worktree.js';
import { provisionDeps } from '../src/worktree-deps.js';

let passed = 0, failed = 0;
const failures = [];
function assert(cond, msg) {
  if (cond) { passed++; console.log(`  ✅ PASS: ${msg}`); }
  else { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`); }
}
function assertEqual(actual, expected, msg) {
  const ok = actual === expected;
  if (ok) { passed++; console.log(`  ✅ PASS: ${msg}`); }
  else { failed++; failures.push(`${msg} (expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`); console.log(`  ❌ FAIL: ${msg} (expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`); }
}

const hashOf = (text) => createHash('sha256').update(text).digest('hex').slice(0, 16);

const tmpDirs = [];
function mkTmp(prefix) {
  const d = mkdtempSync(join(tmpdir(), `wtdoc-${prefix}-`));
  tmpDirs.push(d);
  return d;
}

/** 建 tmp git 仓（doctor 的 git worktree list / branch 扫描需要 this.cwd 是 git 仓）*/
function mkRepo() {
  const root = mkdtempSync(join(tmpdir(), 'wtdoc-repo-'));
  tmpDirs.push(root);
  execSync('git init -b main', { cwd: root, stdio: 'ignore' });
  execSync('git config user.email t@t && git config user.name t', { cwd: root, stdio: 'ignore' });
  writeFileSync(join(root, 'README.md'), 'x');
  execSync('git add . && git commit -m init', { cwd: root, stdio: 'ignore' });
  mkdirSync(join(root, '.sillyspec'), { recursive: true });
  return root;
}

/** Windows 保护：删 wt 目录前先解其 node_modules junction（指向主仓），防 rmSync 跟随误删 */
function safeRm(p) {
  if (!p || !existsSync(p)) return;
  const nm = join(p, 'node_modules');
  if (existsSync(nm)) {
    try {
      if (lstatSync(nm).isSymbolicLink()) {
        if (process.platform === 'win32') execSync(`rmdir "${nm}"`, { shell: 'cmd.exe', stdio: 'ignore' });
        else execSync(`rm -f "${nm}"`, { stdio: 'ignore' });
      }
    } catch {}
  }
  try { rmSync(p, { recursive: true, force: true }); } catch {}
}

function cleanup() {
  for (const d of tmpDirs) safeRm(d);
}

/** 在 worktreeBase 下手写一份 meta.json（模拟 create 产物，供 doctor 扫描）*/
function writeMeta(wm, name, meta) {
  const dir = join(wm.worktreeBase, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'meta.json'), JSON.stringify(meta, null, 2));
}

console.log('=== worktree-doctor 测试（task-03: deps-main-drift + force + --change + in-place）===\n');

// ── 1. deps-main-drift 探测：主仓 lockfile 漂移，wt 自身未变 → main-drift（非 stale）──
console.log('--- 1. deps-main-drift：主仓 lockfile 漂移 → 报 main-drift（非 stale）---');
{
  const root = mkRepo();
  const wm = new WorktreeManager({ cwd: root });
  const wt = mkTmp('drift-wt');
  // wt 自身 lockfile + node_modules
  writeFileSync(join(wt, 'package.json'), '{"name":"wt"}');
  writeFileSync(join(wt, 'pnpm-lock.yaml'), 'lock-v1');
  mkdirSync(join(wt, 'node_modules'), { recursive: true });
  // 主仓 lockfile（漂移到 v2）
  writeFileSync(join(root, 'package.json'), '{"name":"main"}');
  writeFileSync(join(root, 'pnpm-lock.yaml'), 'lock-v2');
  mkdirSync(join(root, 'node_modules'), { recursive: true });

  writeMeta(wm, 'driftA', {
    changeName: 'driftA',
    worktreePath: wt,
    mode: 'worktree',
    branch: 'sillyspec/driftA',
    baseHash: 'deadbeef',
    createdAt: new Date(Date.now() - 3600 * 1000).toISOString(),
    depsStatus: 'linked',
    depsLockHash: hashOf('lock-v1'), // 与 wt 一致 → 非 stale
  });

  const diag = await wm.doctor();
  const drift = diag.issues.find(i => i.type === 'deps-main-drift' && i.name === 'driftA');
  assert(!!drift, `报 deps-main-drift（实际 issues: ${diag.issues.map(i => i.type).join(',')})`);
  assert(!!drift && drift.fixable, 'deps-main-drift fixable=true');
  const stale = diag.issues.find(i => i.type === 'deps-stale' && i.name === 'driftA');
  assert(!stale, 'wt 自身 lockfile 未变 → 不报 deps-stale（靠 main-drift 兜底）');
}

// ── 2. provisionDeps force：hash 一致也走 install（绕过 lockfile 一致快路径 #2）──
console.log('\n--- 2. provisionDeps force：hash 一致 → 非 force=linked，force=installed ---');
{
  const main = mkTmp('force-main');
  const wt = mkTmp('force-wt');
  mkdirSync(join(main, 'node_modules'));
  writeFileSync(join(main, 'node_modules', '.placeholder'), 'x');
  const lock = 'lock-same';
  writeFileSync(join(main, 'package-lock.json'), lock);
  writeFileSync(join(main, 'package.json'), '{"name":"main"}');
  writeFileSync(join(wt, 'package-lock.json'), lock); // 完全一致
  writeFileSync(join(wt, 'package.json'), '{"name":"wt"}');

  // 非 force：lockfile 一致 → 快路径 linked
  const r1 = provisionDeps(wt, main, {});
  assertEqual(r1.depsStatus, 'linked', `非 force + hash 一致 → linked（快路径，实际 ${r1.depsStatus}）`);

  // 清掉 wt/node_modules 以隔离下一次（避免 tryLink 幂等短路干扰）
  safeRm(join(wt, 'node_modules'));

  // force：绕过快路径 → 走 install 分支（local.yaml 提供 trivial install 命令避免真跑 pnpm；SEC-01 白名单后须用包管理器前缀——node -e 属任意代码执行面会被拒）
  const specBase = mkTmp('force-spec');
  writeFileSync(join(specBase, 'local.yaml'),
    'project:\n  type: nodejs\ncommands:\n  install: "npm --version"\n');
  const r2 = provisionDeps(wt, main, { specBase, force: true });
  assertEqual(r2.depsStatus, 'installed',
    `force + hash 一致 → installed（绕过快路径走 install，实际 ${r2.depsStatus}）`);
}

// ── 3. doctor --fix：_doctorReprovision 先解 junction 再 provisionDeps(force) ──
console.log('\n--- 3. doctor --fix：解 junction + force 重装 → meta.depsStatus 重置 ---');
{
  const root = mkRepo();
  const wm = new WorktreeManager({ cwd: root });
  const wt = mkTmp('fix-wt');
  // 主仓 lockfile 与 wt 一致（让非 force 会走 linked 快路径，从而 force 的 install 区分明显）
  const lock = 'lock-fix';
  writeFileSync(join(root, 'package.json'), '{"name":"main"}');
  writeFileSync(join(root, 'pnpm-lock.yaml'), lock);
  mkdirSync(join(root, 'node_modules'), { recursive: true });
  writeFileSync(join(wt, 'package.json'), '{"name":"wt"}');
  writeFileSync(join(wt, 'pnpm-lock.yaml'), lock);
  // local.yaml：trivial install，避免真跑 pnpm（CI 慢/不可用）
  writeFileSync(join(root, '.sillyspec', 'local.yaml'),
    'project:\n  type: nodejs\ncommands:\n  install: "npm --version"\n');

  // 先用 provisionDeps 建立 junction（wt/node_modules → 主仓 node_modules）
  const init = provisionDeps(wt, root, { specBase: join(root, '.sillyspec') });
  assertEqual(init.depsStatus, 'linked', '初始 provision 建立 junction → linked');
  const nmLink = join(wt, 'node_modules');
  assert(existsSync(nmLink), 'junction 已建立（wt/node_modules 存在）');

  // 写 meta 为 failed（触发 doctor fix；depsLockHash 与 wt 一致 → 非 stale）
  writeMeta(wm, 'fixA', {
    changeName: 'fixA',
    worktreePath: wt,
    mode: 'worktree',
    branch: 'sillyspec/fixA',
    baseHash: 'deadbeef',
    createdAt: new Date(Date.now() - 3600 * 1000).toISOString(),
    depsStatus: 'failed',
    depsError: 'prev pnpm boom',
    depsLockHash: hashOf(lock),
  });

  const diag = await wm.doctor({ fix: true });
  const issue = diag.issues.find(i => i.type === 'deps-failed' && i.name === 'fixA');
  assert(!!issue, `doctor 报 deps-failed（实际 ${diag.issues.map(i => i.type).join(',')}）`);
  assert(diag.fixed.some(m => /re-provisioned fixA/.test(m)),
    `diag.fixed 含 re-provisioned fixA（实际 [${diag.fixed.join(' | ')}]）`);

  // force 生效证明：meta.depsStatus=installed（非 force 会是 linked，因 hash 一致 + junction 已解后重链）
  const metaAfter = wm.getMeta('fixA');
  assertEqual(metaAfter.depsStatus, 'installed',
    `force 重装后 depsStatus=installed（非 force 会是 linked，实际 ${metaAfter.depsStatus}）`);
  assertEqual(metaAfter.depsLockHash, hashOf(lock), 'meta.depsLockHash 更新为 wt lockfile hash');
  assert(!metaAfter.depsError, 'force 重装后 depsError 清空');

  // junction 已解（_doctorReprovision 先解链；install=npm --version 不重建 node_modules）
  assert(!existsSync(nmLink) || !lstatSync(nmLink).isSymbolicLink(),
    'wt/node_modules junction 已解（不再是指向主仓的 link）');
}

// ── 4. doctor --change 过滤：多 wt 只扫指定 change ──
console.log('\n--- 4. doctor --change：多 wt 只扫指定 change ---');
{
  const root = mkRepo();
  const wm = new WorktreeManager({ cwd: root });
  writeFileSync(join(root, 'package.json'), '{"name":"main"}');
  writeFileSync(join(root, 'pnpm-lock.yaml'), 'lock-main-v2'); // 主仓漂移到 v2
  mkdirSync(join(root, 'node_modules'), { recursive: true });

  const setupWt = (name) => {
    const wt = mkTmp(`chg-${name}`);
    writeFileSync(join(wt, 'package.json'), '{"name":"wt"}');
    writeFileSync(join(wt, 'pnpm-lock.yaml'), 'lock-v1'); // wt 仍是 v1 → main-drift
    mkdirSync(join(wt, 'node_modules'), { recursive: true });
    writeMeta(wm, name, {
      changeName: name,
      worktreePath: wt,
      mode: 'worktree',
      branch: `sillyspec/${name}`,
      baseHash: 'deadbeef',
      createdAt: new Date(Date.now() - 3600 * 1000).toISOString(),
      depsStatus: 'linked',
      depsLockHash: hashOf('lock-v1'),
    });
    return wt;
  };
  setupWt('chgA');
  setupWt('chgB');

  // 不传 change → 全量扫，两个都报
  const all = await wm.doctor();
  assert(all.issues.some(i => i.name === 'chgA' && i.type === 'deps-main-drift'),
    `全量扫报 chgA main-drift（issues: ${all.issues.map(i => i.name).join(',')})`);
  assert(all.issues.some(i => i.name === 'chgB'),
    '全量扫报 chgB');

  // 传 --change chgA → 只扫 chgA，chgB 不出现
  const only = await wm.doctor({ changeName: 'chgA' });
  assert(only.issues.some(i => i.name === 'chgA'),
    `--change chgA 仍报 chgA（issues: ${only.issues.map(i => i.name).join(',')})`);
  assert(!only.issues.some(i => i.name === 'chgB'),
    '--change chgA 不报 chgB（其他 change 不出现在 issues）');

  // 传不存在的 change → 空issues，不崩
  const none = await wm.doctor({ changeName: 'nonexistent' });
  assertEqual(none.issues.length, 0, '--change 不存在 → issues 空');
}

// ── 5. in-place 守卫放宽：in-place-fallback 也跑 deps 检查（deps-failed 不再被跳过）──
console.log('\n--- 5. in-place：mode=in-place-fallback 也检查 deps（不再整体跳过）---');
{
  const root = mkRepo();
  const wm = new WorktreeManager({ cwd: root });
  writeFileSync(join(root, 'package.json'), '{"name":"main"}');
  writeFileSync(join(root, 'pnpm-lock.yaml'), 'lock-ip');
  mkdirSync(join(root, 'node_modules'), { recursive: true });

  // in-place 模式：worktreePath 即主仓 root
  writeMeta(wm, 'ipA', {
    changeName: 'ipA',
    worktreePath: root,
    mode: 'in-place-fallback',
    branch: 'sillyspec/ipA',
    baseHash: 'deadbeef',
    createdAt: new Date(Date.now() - 3600 * 1000).toISOString(),
    depsStatus: 'failed',
    depsError: 'in-place prev fail',
    depsLockHash: hashOf('lock-ip'),
  });

  const diag = await wm.doctor();
  const ip = diag.issues.find(i => i.name === 'ipA' && i.type === 'deps-failed');
  assert(!!ip,
    `in-place 也报 deps-failed（909 守卫放宽，issues: ${diag.issues.map(i => `${i.name}:${i.type}`).join(',')}）`);
}

cleanup();

console.log(`\n==================================================`);
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`);
console.log(failed === 0 ? '全部通过' : `❌ 失败项: ${failures.join('; ')}`);
console.log(`==================================================`);
process.exit(failed === 0 ? 0 : 1);
