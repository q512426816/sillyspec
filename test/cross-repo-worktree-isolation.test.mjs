/**
 * 跨仓仓 worktree 隔离测试（坑 cross-repo-no-worktree-isolation，2026-08-27）。
 *
 * 覆盖 worktree-cross.js + MultiRepoContext worktree 模式 + applyWorktree 跨仓回落：
 *   1. ensureCrossWorktrees：声明跨仓仓建 worktree（meta.isCross/baseHash=跨仓 HEAD）+ 幂等复用
 *   2. MultiRepoContext worktree 模式：entry.gitDir=worktree、baseCommitHint=meta.baseHash、
 *      resolveHead 反映 worktree 分支推进（跨仓根 HEAD 不动）
 *   3. applyWorktree 跨仓回落：worktree 内 commit → patch 回跨仓主工作副本 + worktree 清理 +
 *      分支保留（review 锚点）；legacy 无 meta 的跨仓仓不受影响
 *   4. cleanupCrossWorktrees：未回落交付 → 非法 force 拒绝（partial）；force → cleaned
 *   5. 未注册 repo → fail-closed throw（约束② 同语义）
 *
 * 风格：node:test + 真实 git fixture（主仓 + 跨仓仓各一），after 清理。对齐
 * multi-repo-context-entry.test.mjs 范式。
 */
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execSync, execFileSync } from 'node:child_process';
import { ensureCrossWorktrees, getCrossWorktreeMeta, cleanupCrossWorktrees, crossWorktreePath } from '../src/worktree-cross.js';
import { getOrCreateMultiRepoContext, _clearMultiRepoCtxCache } from '../src/run/shared.js';
import { WorktreeManager } from '../src/worktree.js';
import { applyWorktree } from '../src/worktree-apply.js';

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

/** 主仓 + 跨仓仓 + local.yaml repos 注册 + plan.md 声明跨仓 task */
function makeFixture() {
  const main = makeRepo('cxw-main-');
  // 主仓 .gitignore 覆盖 .sillyspec（worktree create 的前置检查）
  writeFileSync(join(main, '.gitignore'), '.sillyspec/\n');
  git(main, ['add', '.gitignore']);
  git(main, ['commit', '-q', '-m', 'ignore spec runtime']);
  const cross = makeRepo('cxw-cross-');
  const specBase = join(main, '.sillyspec');
  mkdirSync(join(specBase), { recursive: true });
  writeFileSync(join(specBase, 'local.yaml'), `# local.yaml\nrepos:\n  front: ${cross.replace(/\\/g, '/')}\n`);
  const changeName = '2026-08-27-cross-wt-test';
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

test('ensureCrossWorktrees：建 worktree + meta 锚 baseHash + 幂等复用', () => {
  const { main, cross, specBase, changeName } = makeFixture();
  const baseBefore = revHead(cross);
  const r1 = ensureCrossWorktrees({ cwd: main, changeName, specBase });
  assert.equal(r1.created.length, 1, '声明 1 个跨仓仓 → 建 1 个 worktree');
  assert.equal(r1.created[0].repoKey, 'front');
  const wtPath = crossWorktreePath(specBase, changeName, 'front');
  assert.ok(existsSync(wtPath), '跨仓 worktree 目录已建');
  assert.ok(existsSync(join(wtPath, '.git')), '是 git worktree（含 .git 指针）');
  const meta = getCrossWorktreeMeta(specBase, changeName, 'front');
  assert.ok(meta && meta.isCross, 'meta.isCross 标识');
  assert.equal(meta.repoKey, 'front');
  assert.equal(meta.crossRepoRoot.replace(/\\/g, '/'), cross.replace(/\\/g, '/'), 'meta 记录跨仓根');
  assert.equal(meta.baseHash, baseBefore, 'baseHash = 创建时跨仓仓 HEAD');
  // 跨仓仓的 worktree 注册（git 侧）
  const wtList = git(cross, ['worktree', 'list', '--porcelain']);
  assert.ok(wtList.includes(wtPath.replace(/\\/g, '/')) || wtList.includes(wtPath), '跨仓仓 git 已注册 worktree');
  // 幂等：重跑 → reused 不再建
  const r2 = ensureCrossWorktrees({ cwd: main, changeName, specBase });
  assert.equal(r2.created.length, 0, '二次 ensure 不再创建');
  assert.equal(r2.reused.length, 1, '二次 ensure 命中复用');
});

test('ensureCrossWorktrees：未注册 repo → fail-closed throw', () => {
  const { main, specBase, changeName } = makeFixture();
  // plan 声明 repo: back，但 local.yaml 只注册 front
  const planPath = join(specBase, 'changes', changeName, 'plan.md');
  writeFileSync(planPath, '# Plan\n\n## Wave 1\n\n### task-01\n\n---\nrepo: back\ngoal: x\n---\n\n');
  assert.throws(() => ensureCrossWorktrees({ cwd: main, changeName, specBase }), /未在 local\.yaml repos: 段注册/);
});

test('MultiRepoContext worktree 模式：gitDir=worktree、baseCommitHint、HEAD 跟随分支推进', async () => {
  const { main, cross, specBase, changeName } = makeFixture();
  ensureCrossWorktrees({ cwd: main, changeName, specBase });
  const base = revHead(cross);
  // 子代理在跨仓 worktree 内 commit（跨仓根 HEAD 不动）
  const wtPath = crossWorktreePath(specBase, changeName, 'front');
  writeFileSync(join(wtPath, 'src-feature.txt'), 'feat\n');
  git(wtPath, ['add', '.']);
  git(wtPath, ['commit', '-q', '-m', 'feat']);
  _clearMultiRepoCtxCache();
  const ctx = await getOrCreateMultiRepoContext({ cwd: main, changeName, noCache: true });
  const entry = ctx.resolve('front');
  assert.ok(entry, 'front entry 存在');
  assert.equal(entry.isWorktree, true, 'worktree 模式标识');
  assert.equal(entry.gitDir.replace(/\\/g, '/'), wtPath.replace(/\\/g, '/'), 'gitDir 指向跨仓 worktree');
  assert.notEqual(entry.gitDir.replace(/\\/g, '/'), cross.replace(/\\/g, '/'), 'gitDir 不再是跨仓主工作副本');
  assert.equal(entry.baseCommitHint, base, 'baseCommitHint = meta.baseHash（创建时快照，非推进后 HEAD）');
  assert.notEqual(entry.resolveHead(), base, 'resolveHead 反映 worktree 分支新 commit');
  assert.equal(revHead(cross), base, '跨仓主工作副本 HEAD 未被触碰（隔离成立）');
  assert.equal(entry.resolveBase(null), base, 'worktree 模式 resolveBase 无需 taskBaseCommit');
});

test('applyWorktree：跨仓交付 patch 回跨仓主工作副本 + 清理 worktree + 分支保留', async () => {
  const { main, cross, specBase, changeName } = makeFixture();
  // 主仓 worktree（applyWorktree 主流程要求 meta）
  const wm = new WorktreeManager({ cwd: main });
  wm.create(changeName);
  ensureCrossWorktrees({ cwd: main, changeName, specBase });
  const wtPath = crossWorktreePath(specBase, changeName, 'front');
  // 跨仓 worktree 内交付：改 1 个已有文件 + 新增 1 个文件，commit 到 worktree 分支
  writeFileSync(join(wtPath, 'README.md'), 'init\nfeat-edit\n');
  writeFileSync(join(wtPath, 'src-feature.txt'), 'feat\n');
  git(wtPath, ['add', '.']);
  git(wtPath, ['commit', '-q', '-m', 'cross deliverable']);
  _clearMultiRepoCtxCache();
  const ctx1 = await getOrCreateMultiRepoContext({ cwd: main, changeName, noCache: true });
  const result = applyWorktree(changeName, { cwd: main, checkOnly: true, ctx: ctx1 });
  // checkOnly：跨仓应列出变更但不应用
  assert.equal(result.errors.length, 0, `checkOnly 无错误（实际：${result.errors.join(' | ')}）`);
  const checked = (result.crossRepoApplied || []).find(c => c.repoKey === 'front');
  assert.ok(checked, 'checkOnly 报告跨仓变更');
  assert.ok(checked.changedFiles.includes('README.md') && checked.changedFiles.includes('src-feature.txt'), '跨仓变更清单正确');
  assert.ok(!existsSync(join(cross, 'src-feature.txt')), 'checkOnly 未动跨仓主工作副本');
  assert.ok(existsSync(wtPath), 'checkOnly 未清理跨仓 worktree');

  // 真实 apply（ctx 显式传入：applyWorktree 不自建 ctx，与 index.js 调用方契约一致）
  const ctx2 = await getOrCreateMultiRepoContext({ cwd: main, changeName, noCache: true });
  const r2 = applyWorktree(changeName, { cwd: main, checkOnly: false, ctx: ctx2 });
  assert.equal(r2.errors.length, 0, `apply 无错误（实际：${r2.errors.join(' | ')}）`);
  const normCRLF = (s) => s.replace(/\r\n/g, '\n');
  assert.equal(normCRLF(readFileSync(join(cross, 'README.md'), 'utf8')), 'init\nfeat-edit\n', '跨仓主工作副本已收到修改');
  assert.equal(normCRLF(readFileSync(join(cross, 'src-feature.txt'), 'utf8')), 'feat\n', '跨仓主工作副本已收到新文件');
  assert.ok(!existsSync(wtPath), '跨仓 worktree apply 后已清理');
  assert.ok(!!git(cross, ['rev-parse', '--verify', `refs/heads/sillyspec/${changeName}`]), '跨仓分支保留作 review 锚点');
});

test('cleanupCrossWorktrees：未回落交付拒绝清理，force 放行', () => {
  const { main, specBase, changeName } = makeFixture();
  ensureCrossWorktrees({ cwd: main, changeName, specBase });
  const wtPath = crossWorktreePath(specBase, changeName, 'front');
  writeFileSync(join(wtPath, 'wip.txt'), 'wip\n');
  const blocked = cleanupCrossWorktrees({ cwd: main, changeName, specBase, force: false });
  assert.equal(blocked.results[0].result, 'partial', '有未回落交付 → 拒绝清理');
  assert.ok(existsSync(wtPath), 'worktree 保留');
  const cleaned = cleanupCrossWorktrees({ cwd: main, changeName, specBase, force: true });
  assert.equal(cleaned.results[0].result, 'cleaned', 'force → 清理成功');
  assert.ok(!existsSync(wtPath), 'worktree 已删');
  assert.equal(getCrossWorktreeMeta(specBase, changeName, 'front'), null, 'meta 随目录清理');
});
