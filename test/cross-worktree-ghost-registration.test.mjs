/**
 * 跨仓 worktree 幽灵注册三缺口测试（坑 cross-wt-ghost-metadata，fire-equipment 2026-10-10
 * 实证：目录被清、跨仓仓 .git/worktrees/ 注册残留 → 分支被幽灵占用无法 checkout）。
 *
 * 覆盖：
 *   1. probeCrossWorktreeEntry 三态（未注册 / 注册 / locked）
 *   2. cleanupCrossWorktrees 双清契约：locked 幽灵 → remove 被拒 → 兜底删目录 → prune 跳过
 *      locked → list 复核仍注册 → partial + unlock 指引（不再静默）
 *   3. cleanupCrossWorktrees 正常路径：remove 后 list 复核 → cleaned + 注册表键回收
 *   4. archiveWorktreeCleanup 归档兜底：无交付 → 跨仓清理（注册消失/分支保留）；
 *      有未 apply 交付 → 保留 + 警告不阻断
 *   5. doctor 跨仓注册扫描（scanCrossWorktreeGhosts / detectCrossWorktreeHealth finding）
 *   6. pruneCrossWorktreeGhosts：dry-run 默认只列、--confirm prune + 复扫断言、
 *      locked 幽灵跳过并列 unlock 指引
 *
 * 风格：node:test + 真实 git fixture（主仓 + 跨仓仓各一），对齐
 * cross-repo-worktree-isolation.test.mjs 范式。
 */
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execSync, execFileSync } from 'node:child_process';
import {
  ensureCrossWorktrees,
  cleanupCrossWorktrees,
  crossWorktreePath,
  probeCrossWorktreeEntry,
  scanCrossWorktreeGhosts,
  pruneCrossWorktreeGhosts,
} from '../src/worktree-cross.js';
import { readPlacementRegistry } from '../src/cross-placement.js';
import { detectCrossWorktreeHealth } from '../src/doctor-diagnostics.js';
import { archiveWorktreeCleanup } from '../src/run/complete-handlers.js';

const repoLocalWorktrees = (cross) => join(cross, '.sillyspec', '.runtime', 'worktrees');

const tempDirs = [];
function makeRepo(prefix) {
  const d = mkdtempSync(join(tmpdir(), prefix));
  tempDirs.push(d);
  execSync('git init -q', { cwd: d, stdio: 'pipe' });
  execSync('git config user.email t@t.com', { cwd: d, stdio: 'pipe' });
  execSync('git config user.name t', { cwd: d, stdio: 'pipe' });
  execSync('git config commit.gpgsign false', { cwd: d, stdio: 'pipe' });
  writeFileSync(join(d, 'README.md'), 'init\n');
  execSync('git add .', { cwd: d, stdio: 'pipe' });
  execSync('git commit -q -m init', { cwd: d, stdio: 'pipe' });
  return d;
}
function git(d, args) {
  return execFileSync('git', args, { cwd: d, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}
function revHead(d) { return git(d, ['rev-parse', 'HEAD']) }

/** 注册面是否仍含该 worktree（路径归一对齐实现：反斜杠归正斜杠 + win32 小写） */
function worktreeListHas(repo, wtPath) {
  const out = git(repo, ['worktree', 'list', '--porcelain']);
  const norm = (s) => {
    const v = String(s).replace(/\\/g, '/');
    return process.platform === 'win32' ? v.toLowerCase() : v;
  };
  const target = norm(wtPath);
  return out.split('\n').some((l) => l.startsWith('worktree ') && norm(l.slice('worktree '.length)) === target);
}

/** 主仓 + 跨仓仓 + local.yaml repos 注册 + plan.md 声明跨仓 task */
function makeFixture(changeName = '2026-10-12-ghost-test') {
  const main = makeRepo('cxw-ghost-main-');
  writeFileSync(join(main, '.gitignore'), '.sillyspec/\n');
  git(main, ['add', '.gitignore']);
  git(main, ['commit', '-q', '-m', 'ignore spec runtime']);
  const cross = makeRepo('cxw-ghost-cross-');
  const specBase = join(main, '.sillyspec');
  mkdirSync(join(specBase), { recursive: true });
  writeFileSync(join(specBase, 'local.yaml'), `# local.yaml\nrepos:\n  front: ${cross.replace(/\\/g, '/')}\n`);
  const changeDir = join(specBase, 'changes', changeName);
  mkdirSync(changeDir, { recursive: true });
  writeFileSync(join(changeDir, 'plan.md'),
    '# Plan\n\n## Wave 1\n\n### task-01\n\n---\nrepo: front\ngoal: cross task\n---\n\n');
  return { main, cross, specBase, changeName };
}

after(() => {
  for (const d of tempDirs) {
    try { rmSync(d, { recursive: true, force: true }) } catch { /* Windows EPERM best-effort */ }
  }
});

test('probeCrossWorktreeEntry：未注册 / 已注册 / locked 三态', () => {
  const { main, cross, specBase, changeName } = makeFixture();
  ensureCrossWorktrees({ cwd: main, changeName, specBase });
  const wtPath = crossWorktreePath(specBase, changeName, 'front', repoLocalWorktrees(cross));

  assert.deepEqual(
    { registered: probeCrossWorktreeEntry(cross, wtPath).registered, locked: probeCrossWorktreeEntry(cross, wtPath).locked },
    { registered: true, locked: false },
    '活 worktree → 已注册未 locked',
  );
  assert.equal(probeCrossWorktreeEntry(cross, join(cross, 'never-a-worktree')).registered, false, '从未注册的路径 → 未注册');

  git(cross, ['worktree', 'lock', wtPath]);
  const locked = probeCrossWorktreeEntry(cross, wtPath);
  assert.equal(locked.registered, true);
  assert.equal(locked.locked, true, 'locked 条目（无原因）→ locked=true');

  cleanupCrossWorktrees({ cwd: main, changeName, specBase, force: true });
});

test('cleanupCrossWorktrees：locked 幽灵——remove 被拒→兜底删目录→prune 跳过→复核仍注册→partial+unlock 提示', () => {
  const { main, cross, specBase, changeName } = makeFixture();
  ensureCrossWorktrees({ cwd: main, changeName, specBase });
  const wtPath = crossWorktreePath(specBase, changeName, 'front', repoLocalWorktrees(cross));
  git(cross, ['worktree', 'lock', wtPath]);

  const cr = cleanupCrossWorktrees({ cwd: main, changeName, specBase, force: true });
  const r = cr.results.find((x) => x.repoKey === 'front');
  assert.equal(r.result, 'partial', `locked 幽灵必须 partial（实际 ${r.result}）`);
  assert.ok(
    (r.details || []).some((d) => d.includes('worktree unlock')),
    `details 必须含 git worktree unlock 指引（实际 ${JSON.stringify(r.details)}）`,
  );
  assert.ok((r.residual || []).length > 0, 'residual 非空（清理链留痕）');
  assert.ok(!existsSync(wtPath), '目录本体已被兜底删除');
  assert.ok(worktreeListHas(cross, wtPath), 'locked 注册仍在（prune 静默跳过——复核断言捕捉）');

  // unlock 后 prune 收敛（用户裁决路径）
  git(cross, ['worktree', 'unlock', wtPath]);
  git(cross, ['worktree', 'prune']);
  assert.equal(worktreeListHas(cross, wtPath), false, 'unlock + prune 后注册消失');
});

test('cleanupCrossWorktrees：正常路径 remove 后 list 复核→cleaned+注册表键回收', () => {
  const { main, cross, specBase, changeName } = makeFixture();
  ensureCrossWorktrees({ cwd: main, changeName, specBase });
  const wtPath = crossWorktreePath(specBase, changeName, 'front', repoLocalWorktrees(cross));
  assert.ok(readPlacementRegistry(specBase)[`${changeName}--front`], '前置：注册表键在');

  const cr = cleanupCrossWorktrees({ cwd: main, changeName, specBase, force: true });
  const r = cr.results.find((x) => x.repoKey === 'front');
  assert.equal(r.result, 'cleaned');
  assert.ok(!existsSync(wtPath), '目录已删');
  assert.equal(worktreeListHas(cross, wtPath), false, '注册已消失（双清复核通过）');
  assert.ok(!readPlacementRegistry(specBase)[`${changeName}--front`], '注册表键已回收');
  assert.ok(git(cross, ['branch', '--list', `sillyspec/${changeName}`]), '分支保留作 review 锚点');
});

test('archiveWorktreeCleanup：归档兜底清理跨仓（无交付→清理+注册消失+分支保留）', async () => {
  const { main, cross, specBase, changeName } = makeFixture();
  ensureCrossWorktrees({ cwd: main, changeName, specBase });
  const wtPath = crossWorktreePath(specBase, changeName, 'front', repoLocalWorktrees(cross));

  await archiveWorktreeCleanup(main, changeName, specBase, {});
  assert.ok(!existsSync(wtPath), '归档兜底已清理跨仓 worktree 目录');
  assert.equal(worktreeListHas(cross, wtPath), false, '归档兜底后注册消失');
  assert.ok(git(cross, ['branch', '--list', `sillyspec/${changeName}`]), '分支保留（不误删 review 锚点）');
});

test('archiveWorktreeCleanup：跨仓有未 apply 交付→保留+不阻断归档', async () => {
  const { main, cross, specBase, changeName } = makeFixture();
  ensureCrossWorktrees({ cwd: main, changeName, specBase });
  const wtPath = crossWorktreePath(specBase, changeName, 'front', repoLocalWorktrees(cross));
  writeFileSync(join(wtPath, 'DELIV.md'), 'unapplied delivery\n');
  git(wtPath, ['add', 'DELIV.md']);
  git(wtPath, ['commit', '-q', '-m', 'deliver']);

  await archiveWorktreeCleanup(main, changeName, specBase, {});
  assert.ok(existsSync(wtPath), '有未 apply 交付的跨仓 worktree 必须保留');
  assert.ok(worktreeListHas(cross, wtPath), '注册保持（未清理）');
  // 收尾：force 清理掉，避免 fixture 残留影响 after
  cleanupCrossWorktrees({ cwd: main, changeName, specBase, force: true });
});

test('scanCrossWorktreeGhosts + detectCrossWorktreeHealth：目录已删+注册残留（事故形态）→ghost 列出/finding 判 WARNING', () => {
  const { main, cross, specBase, changeName } = makeFixture();
  ensureCrossWorktrees({ cwd: main, changeName, specBase });
  const wtPath = crossWorktreePath(specBase, changeName, 'front', repoLocalWorktrees(cross));
  // 事故形态：外部清目录（meta.json 随目录同亡——cleanup/归档链对该形态隐身，只有注册面反扫可见）
  rmSync(wtPath, { recursive: true, force: true });

  const scan = scanCrossWorktreeGhosts(main);
  assert.equal(scan.ghosts.length, 1, `恰一个幽灵注册（实际 ${scan.ghosts.length}）`);
  const g = scan.ghosts[0];
  assert.equal(g.repoKey, 'front');
  assert.equal(g.locked, false, '未 locked');
  const norm = (p) => p.replace(/\\/g, '/');
  assert.equal(norm(g.worktreePath), norm(wtPath), '幽灵路径=被删 worktree');
  assert.equal(scan.errors.length, 0);

  const dim = detectCrossWorktreeHealth(main);
  assert.equal(dim.name, 'cross_worktree_health');
  assert.equal(dim.pass, false, '发现幽灵 → 判 WARNING');
  assert.ok(dim.findings.some((f) => f.includes('幽灵 worktree 注册')), `finding 列出幽灵（实际 ${JSON.stringify(dim.findings)}）`);

  // 无 local.yaml 的仓 → skipped 不判红
  const bare = makeRepo('cxw-ghost-bare-');
  const dimBare = detectCrossWorktreeHealth(bare);
  assert.equal(dimBare.pass, true);
  assert.ok(dimBare.skipped, '无 local.yaml → skipped 注记');
});

test('pruneCrossWorktreeGhosts：dry-run 只列不动；confirm prune+复扫断言；locked 跳过列指引', () => {
  const { main, cross, specBase, changeName } = makeFixture();
  // 幽灵一：未 locked（可 prune）
  ensureCrossWorktrees({ cwd: main, changeName, specBase });
  const wtA = crossWorktreePath(specBase, changeName, 'front', repoLocalWorktrees(cross));
  rmSync(wtA, { recursive: true, force: true });
  // 幽灵二：locked（prune 静默跳过形态）
  const changeName2 = `${changeName}-b`;
  const changeDir2 = join(specBase, 'changes', changeName2);
  mkdirSync(changeDir2, { recursive: true });
  writeFileSync(join(changeDir2, 'plan.md'), '# Plan\n\n## Wave 1\n\n### task-01\n\n---\nrepo: front\ngoal: cross task\n---\n\n');
  ensureCrossWorktrees({ cwd: main, changeName: changeName2, specBase });
  const wtB = crossWorktreePath(specBase, changeName2, 'front', repoLocalWorktrees(cross));
  git(cross, ['worktree', 'lock', wtB]);
  rmSync(wtB, { recursive: true, force: true });

  // dry-run：只列，不动
  const dry = pruneCrossWorktreeGhosts({ cwd: main, confirm: false });
  assert.equal(dry.confirm, false);
  assert.equal(dry.count, 2, `dry-run 列出两个幽灵（实际 ${dry.count}）`);
  assert.ok(worktreeListHas(cross, wtA) && worktreeListHas(cross, wtB), 'dry-run 不执行 prune');

  // confirm：非 locked 被 prune；locked 跳过并列指引
  const conf = pruneCrossWorktreeGhosts({ cwd: main, confirm: true });
  assert.equal(conf.pruned.length, 1, `恰一个被 prune（实际 ${conf.pruned.length}）`);
  assert.equal(conf.pruned[0].worktreePath.replace(/\\/g, '/'), wtA.replace(/\\/g, '/'));
  assert.equal(conf.skipped_locked.length, 1, 'locked 幽灵跳过');
  assert.equal(conf.skipped_locked[0].locked, true);
  assert.equal(worktreeListHas(cross, wtA), false, 'wtA 注册已被 prune（复扫断言）');
  assert.ok(worktreeListHas(cross, wtB), 'locked 幽灵保留（不自动 unlock）');

  // 用户裁决后收敛
  git(cross, ['worktree', 'unlock', wtB]);
  const conf2 = pruneCrossWorktreeGhosts({ cwd: main, confirm: true });
  assert.equal(conf2.pruned.length, 1);
  assert.equal(worktreeListHas(cross, wtB), false);
});
