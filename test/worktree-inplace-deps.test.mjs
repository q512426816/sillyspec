/**
 * Bug1 回归（2026-07-08 execute-inplace-deps-gate）：
 * in-place-fallback 模式创建 meta 时必须调 provisionDeps 写 depsStatus，
 * 否则 enforceDepsGate 把 undefined 当 unknown 阻断 execute --done，死锁。
 *
 * 见 docs/sillyspec/execute-inplace-deps-gate.md（multi-agent-platform）。
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';
import { WorktreeManager } from '../src/worktree.js';

function mkRepo() {
  const root = mkdtempSync(join(tmpdir(), 'inplace-deps-'));
  execSync('git init -b main', { cwd: root, stdio: 'ignore' });
  execSync('git config user.email t@t && git config user.name t', { cwd: root, stdio: 'ignore' });
  writeFileSync(join(root, 'README.md'), 'x');
  execSync('git add . && git commit -m init', { cwd: root, stdio: 'ignore' });
  mkdirSync(join(root, '.sillyspec'), { recursive: true });
  return root;
}

let passed = 0, failed = 0;
function assert(c, m) { if (c) { passed++; console.log('  ✅ ' + m) } else { failed++; console.log('  ❌ ' + m) } }

console.log('=== Bug1 回归: in-place-fallback meta 必须含 depsStatus（避免 deps 门控死锁）===\n');

// Case 1: in-place-fallback 创建后 meta 应含 depsStatus（修复前为 undefined）
{
  const root = mkRepo();
  const wm = new WorktreeManager({ cwd: root });
  wm._createInPlaceMeta('test-change', { worktreePath: root, mode: 'in-place-fallback' });
  const meta = wm.getMeta('test-change');
  assert(!!meta, 'meta 已创建');
  assert(meta && meta.depsStatus !== undefined && meta.depsStatus !== null,
    `meta.depsStatus 存在且非空（=${meta?.depsStatus}），修复前为 undefined 致死锁`);
  assert(['linked', 'installed', 'n/a', 'failed'].includes(meta?.depsStatus),
    `depsStatus 是合法值（linked/installed/n/a/failed），enforceDepsGate 可判定`);
  assert(meta?.mode === 'in-place-fallback', `mode=in-place-fallback（=${meta?.mode}）`);
  rmSync(root, { recursive: true, force: true });
}

// Case 2: 幂等守卫——meta 已存在不重建（不影响现有 depsStatus）
{
  const root = mkRepo();
  const wm = new WorktreeManager({ cwd: root });
  wm._createInPlaceMeta('test-change', { worktreePath: root, mode: 'in-place-fallback' });
  const meta1 = wm.getMeta('test-change');
  // 第二次调用应走幂等守卫，返回 existing，不重建
  wm._createInPlaceMeta('test-change', { worktreePath: root, mode: 'in-place-fallback' });
  const meta2 = wm.getMeta('test-change');
  assert(meta1.depsStatus === meta2.depsStatus, '幂等守卫：二次创建不改变 depsStatus');
  rmSync(root, { recursive: true, force: true });
}

console.log('\n==================================================');
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`);
console.log('==================================================');
process.exit(failed ? 1 : 0);
