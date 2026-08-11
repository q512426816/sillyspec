/**
 * cross-repo-apply.test.mjs — task-05 / FR-07 / D-002 / D-009
 *
 * A3/A4/A5 集成测（design §6 文件变更清单要求）：
 *   1. 单仓 change 零回归：applyWorktree 不传 ctx → 走原 A5 完整 apply 路径（行为不变，GOAL-2）
 *   2. 跨仓 task apply = no-op：传 ctx 且 ctx.hasCrossRepo() → 跨仓 review.head 校验为真实 commit
 *      + 不调 wm.cleanup（跨仓 commit 已落主干，无 patch 可打——D-009，R-02/R-05）
 *   3. 跨仓 head 伪造 → apply 阻断（约束①+② 保险，跨仓改动未真落地=数据所有权事故）
 *   4. resolveApplyAllowSet 返回 Map<repo,Set>（allowed_paths 基准=各 repo 自身根）
 *
 * 风格：node:test + node:assert/strict（对齐 multi-repo-context.test.mjs）。
 * 真实 git fixture（主仓 + 跨仓仓，各 git init + commit）。
 *
 * 关键设计点（D-009 G1）：
 *   - 跨仓 task 的 commit 已由子代理直接落跨仓仓主干（NG-3 不经主仓 worktree）
 *   - applyWorktree A5 patch 路径深度耦合主仓 worktree 模型（:226 wm.getMeta / :261 worktreePath diff /
 *     :443 blob / :501 git apply --3way / :521 wm.cleanup），跨仓仓无 worktree/meta/分支 → 不可复用
 *   - 故跨仓 apply = no-op：只校验 review.head 是跨仓真实 commit + 跳过 wm.cleanup
 */
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execSync } from 'node:child_process';
import { applyWorktree, resolveApplyAllowSet } from '../src/worktree-apply.js';
import { MultiRepoContext } from '../src/run/multi-repo-context.js';

const tempDirs = [];

/**
 * 构造一个 git 仓（init + 首提交）。返回仓根绝对路径。
 */
function makeRepo(prefix = 'cra-main-') {
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

function commitMore(d, msg, file = 'extra.md') {
  writeFileSync(join(d, file), `change-${Date.now()}\n`);
  execSync('git add .', { cwd: d, stdio: 'pipe' });
  execSync(`git commit -q -m "${msg}"`, { cwd: d, stdio: 'pipe' });
}

function headOf(d) {
  return execSync('git rev-parse HEAD', { cwd: d, encoding: 'utf8' }).trim();
}

// stub WorktreeManager：getMeta 返回预设 meta；cleanup 记录调用（验证跨仓场景不 cleanup）
function makeWm(metaMap) {
  const calls = [];
  return {
    calls,
    getMeta: (name) => metaMap.get(name) || null,
    cleanup: (name) => { calls.push(name); },
  };
}

after(() => {
  for (const d of tempDirs) {
    try { rmSync(d, { recursive: true, force: true }); } catch { /* Windows EPERM best-effort */ }
  }
});

// ════════════════════════════════════════════════════════════════════════
// resolveApplyAllowSet Map<repo, Set> 契约（A4，纯函数级，无需 git fixture）
// ════════════════════════════════════════════════════════════════════════

test('resolveApplyAllowSet 单仓 change 退化为 {main: Set}（零回归，GOAL-2）', () => {
  const tmpDir = mkdtempSync(join(tmpdir(), 'cra-allow-single-'));
  tempDirs.push(tmpDir);
  const cn = 'single';
  const changesDir = join(tmpDir, '.sillyspec', 'changes', cn);
  mkdirSync(join(changesDir, 'tasks'), { recursive: true });
  writeFileSync(join(changesDir, 'design.md'), '# Design\n\n## 6. 文件变更清单\n- src/a.js\n');
  writeFileSync(join(changesDir, 'tasks', 'task-01.md'), `---
id: task-01
allowed_paths:
  - src/a.js
  - test/a.test.mjs
---
`);
  const m = resolveApplyAllowSet(tmpDir, cn);
  assert.ok(m instanceof Map, '返回 Map');
  assert.deepEqual([...m.keys()], ['main'], '单仓 → 仅 main 键');
  assert.deepEqual([...m.get('main')].sort(), ['src/a.js', 'test/a.test.mjs'], 'main Set = design ∪ task allowed_paths');
});

test('resolveApplyAllowSet 跨仓 change 按 task 卡 repo: 切片到多键（A4）', () => {
  const tmpDir = mkdtempSync(join(tmpdir(), 'cra-allow-cross-'));
  tempDirs.push(tmpDir);
  const cn = 'cross';
  const changesDir = join(tmpDir, '.sillyspec', 'changes', cn);
  mkdirSync(join(changesDir, 'tasks'), { recursive: true });
  writeFileSync(join(changesDir, 'design.md'), '# Design\n\n## 6. 文件变更清单\n- src/main.js\n');
  // 主仓 task
  writeFileSync(join(changesDir, 'tasks', 'task-01.md'), `---
id: task-01
allowed_paths:
  - src/main.js
---
`);
  // 跨仓 task
  writeFileSync(join(changesDir, 'tasks', 'task-02.md'), `---
id: task-02
repo: sillyspec
allowed_paths:
  - src/cross.js
  - test/cross.test.mjs
---
`);
  const m = resolveApplyAllowSet(tmpDir, cn);
  assert.deepEqual([...m.keys()].sort(), ['main', 'sillyspec'], 'Map 含 main + sillyspec');
  assert.deepEqual([...m.get('main')].sort(), ['src/main.js'], 'main = design §6 ∪ 主仓 task allowed_paths');
  assert.deepEqual([...m.get('sillyspec')].sort(), ['src/cross.js', 'test/cross.test.mjs'], 'sillyspec = 跨仓 task allowed_paths（相对跨仓仓根）');
});

test('resolveApplyAllowSet 多跨仓 task 同 repo 合并到同键', () => {
  const tmpDir = mkdtempSync(join(tmpdir(), 'cra-allow-merge-'));
  tempDirs.push(tmpDir);
  const cn = 'multi';
  const changesDir = join(tmpDir, '.sillyspec', 'changes', cn);
  mkdirSync(join(changesDir, 'tasks'), { recursive: true });
  writeFileSync(join(changesDir, 'design.md'), '# Design\n\n## 6. 文件变更清单\n- src/m.js\n');
  writeFileSync(join(changesDir, 'tasks', 'task-01.md'), `---
id: task-01
repo: sillyspec
allowed_paths:
  - src/a.js
---
`);
  writeFileSync(join(changesDir, 'tasks', 'task-02.md'), `---
id: task-02
repo: sillyspec
allowed_paths:
  - src/b.js
---
`);
  const m = resolveApplyAllowSet(tmpDir, cn);
  assert.deepEqual([...m.get('sillyspec')].sort(), ['src/a.js', 'src/b.js'], '同 repo 多 task allowed_paths 合并到同 Set');
});

// ════════════════════════════════════════════════════════════════════════
// applyWorktree 单仓零回归（不传 ctx = 原 A5 路径，GOAL-2）
// ════════════════════════════════════════════════════════════════════════

test('applyWorktree 单仓 change 不传 ctx → 走原 A5 路径（checkOnly 识别 worktree 改动，零回归）', () => {
  const mainRepo = makeRepo();
  const baseHash = headOf(mainRepo);
  // 建主仓 worktree（模拟真实 execute 启动建 worktree）
  const wtDir = join(mainRepo, '.sillyspec', '.runtime', 'worktrees', 'tc1');
  mkdirSync(wtDir, { recursive: true });
  writeFileSync(join(mainRepo, '.gitignore'), '.sillyspec/\n');
  execSync('git add . && git commit -q -m gitignore', { cwd: mainRepo, stdio: 'pipe' });
  execSync(`git worktree add "${wtDir}" -b sillyspec/tc1`, { cwd: mainRepo, stdio: 'pipe' });
  // worktree 内子代理改动
  writeFileSync(join(wtDir, 'src-deliverable.js'), 'from-worktree\n');
  writeFileSync(join(wtDir, 'meta.json'), JSON.stringify({
    changeName: 'tc1', branch: 'sillyspec/tc1', baseHash, baselineCommit: baseHash,
    baselineHash: null, worktreePath: wtDir, mode: 'worktree', baselineFiles: [],
  }));
  // 不传 ctx → 单仓退化，走原 A5 路径
  const r = applyWorktree('tc1', { cwd: mainRepo, checkOnly: true });
  assert.equal(r.errors.length, 0, `单仓 checkOnly 无错误（实际：${r.errors.join('; ')}）`);
  assert.ok(r.changedFiles.includes('src-deliverable.js'), '识别 worktree 改动（原 A5 行为）');
  assert.deepEqual(r.crossRepoValidated, [], '不传 ctx → crossRepoValidated 空（单仓退化）');
});

// ════════════════════════════════════════════════════════════════════════
// applyWorktree 跨仓 no-op（D-009 G1：校验 review.head 真实 + 不 cleanup）
// ════════════════════════════════════════════════════════════════════════

/**
 * 构造跨仓 apply 场景 fixture：
 *   - 主仓 git 仓 + worktree（meta）+ execute-runs/<runId>/tasks/task-02/review.json（跨仓 review）
 *   - 跨仓 git 仓 + 已 commit（head 锡点）
 *   - MultiRepoContext 含 main + cross entry
 *
 * @param {object} [opts]
 * @param {string} [opts.reviewHeadOverride] - 强制 review.head 用此值（测 head 伪造场景），缺省=跨仓真实 HEAD
 * @returns {{ mainRepo, crossRepo, ctx, wm, runId, crossHead, wtDir }}
 */
function setupCrossRepoApply({ reviewHeadOverride } = {}) {
  const mainRepo = makeRepo('cra-main-x-');
  const crossRepo = makeRepo('cra-cross-x-');
  const baseHash = headOf(mainRepo);

  // 跨仓仓子代理改动 + commit（模拟跨仓 task 已落主干，D-009）。mkdirSync 建 src/ 子目录。
  mkdirSync(join(crossRepo, 'src'), { recursive: true });
  writeFileSync(join(crossRepo, 'src', 'cross.js'), 'cross-deliverable\n');
  execSync('git add . && git commit -q -m cross-deliverable', { cwd: crossRepo, stdio: 'pipe' });
  const realCrossHead = headOf(crossRepo);
  const reviewHead = reviewHeadOverride !== undefined ? reviewHeadOverride : realCrossHead;

  // 主仓 worktree + meta（模拟 execute 启动建 worktree）
  const wtDir = join(mainRepo, '.sillyspec', '.runtime', 'worktrees', 'tcx');
  mkdirSync(wtDir, { recursive: true });
  writeFileSync(join(mainRepo, '.gitignore'), '.sillyspec/\n');
  execSync('git add . && git commit -q -m gitignore', { cwd: mainRepo, stdio: 'pipe' });
  execSync(`git worktree add "${wtDir}" -b sillyspec/tcx`, { cwd: mainRepo, stdio: 'pipe' });
  writeFileSync(join(wtDir, 'meta.json'), JSON.stringify({
    changeName: 'tcx', branch: 'sillyspec/tcx', baseHash, baselineCommit: baseHash,
    baselineHash: null, worktreePath: wtDir, mode: 'worktree', baselineFiles: [],
  }));

  // review.json（跨仓 task，repo: sillyspec, head 锡点）。物理在主仓 execute-runs（D-003）。
  const runId = 'exec-test-run';
  const taskReviewDir = join(mainRepo, '.sillyspec', '.runtime', 'execute-runs', runId, 'tasks', 'task-02');
  mkdirSync(taskReviewDir, { recursive: true });
  writeFileSync(join(taskReviewDir, 'review.json'), JSON.stringify({
    schemaVersion: 1,
    task: 'task-02',
    repo: 'sillyspec',
    base: reviewHead,
    head: reviewHead,
    changedFiles: ['src/cross.js'],
    specVerdict: 'pass',
    qualityVerdict: 'pass',
    reviewerNotes: 'cross-repo deliverable committed to cross repo trunk',
    requiredEvidence: [],
  }));

  // MultiRepoContext（主仓 entry 读 wm.getMeta，跨仓 entry 实时 git rev-parse 校验可达）
  const wm = makeWm(new Map([['tcx', {
    mode: 'worktree', worktreePath: wtDir, baseHash, baselineCommit: baseHash,
    baselineHash: null, baselineFiles: [],
  }]]));
  const ctx = new MultiRepoContext({
    cwd: mainRepo, changeName: 'tcx', declaredRepos: ['main', 'sillyspec'],
    repoRegistry: new Map([['sillyspec', crossRepo]]),
    worktreeManager: wm,
  });
  return { mainRepo, crossRepo, ctx, wm, runId, crossHead: realCrossHead, wtDir };
}

test('applyWorktree 跨仓 task apply = no-op：校验 review.head 真实 + 不调 wm.cleanup', () => {
  const { mainRepo, ctx, wm } = setupCrossRepoApply();
  // checkOnly：跨仓 head 真实 → 校验通过，crossRepoValidated 记录
  const r = applyWorktree('tcx', { cwd: mainRepo, checkOnly: true, ctx });
  assert.equal(r.errors.length, 0, `跨仓 head 真实 → 无错误（实际：${r.errors.join('; ')}）`);
  assert.ok(r.crossRepoValidated.length === 1, 'crossRepoValidated 含 1 项（task-02 跨仓 head 校验通过）');
  assert.equal(r.crossRepoValidated[0].repo, 'sillyspec');
  assert.equal(r.crossRepoValidated[0].task, 'task-02');
  // wm.cleanup 不应被调用（跨仓 apply=no-op；checkOnly 模式不 cleanup 主仓 worktree 也成立）
  assert.equal(wm.calls.length, 0, '跨仓 apply=no-op → 不调 wm.cleanup（D-009：跨仓无主仓 worktree 可清）');
});

test('applyWorktree 跨仓 task apply = no-op：跨仓改动不进主仓 worktree（GOAL-3 数据所有权）', () => {
  const { mainRepo, crossRepo, ctx } = setupCrossRepoApply();
  const r = applyWorktree('tcx', { cwd: mainRepo, checkOnly: true, ctx });
  assert.equal(r.errors.length, 0, `跨仓场景 apply 不阻断（实际：${r.errors.join('; ')}）`);
  // 主仓 worktree diff 不含跨仓文件（跨仓 commit 已落跨仓主干，主仓 worktree 无跨仓改动）
  assert.ok(!r.changedFiles.some(f => f.includes('cross.js')),
    '跨仓文件 src/cross.js 不进主仓 worktree changedFiles（GOAL-3：跨仓改动不进主仓）');
  // 跨仓仓的 cross.js 真实存在（子代理已 commit）
  assert.ok(existsSync(join(crossRepo, 'src', 'cross.js')), '跨仓仓 src/cross.js 真实存在（commit 已落主干）');
});

test('applyWorktree 跨仓 review.head 伪造 → 阻断 apply（约束①+② 保险，R-05）', () => {
  // override 一个不存在的 commit hash 作为 review.head
  const fakeHead = '0123456789abcdef0123456789abcdef01234567';
  const { mainRepo, ctx } = setupCrossRepoApply({ reviewHeadOverride: fakeHead });
  const r = applyWorktree('tcx', { cwd: mainRepo, checkOnly: true, ctx });
  assert.ok(r.errors.length > 0, '跨仓 head 伪造 → apply 阻断（R-05：跨仓改动未真落地）');
  assert.match(r.errors.join(' '), /review\.head.*不是跨仓仓.*的真实 commit/);
  assert.match(r.errors.join(' '), /D-009/);
  assert.equal(r.crossRepoValidated.length, 0, 'head 伪造 → crossRepoValidated 不记录该项');
});

test('applyWorktree 传 ctx 但无跨仓 entry（单仓 declaredRepos=[main]）→ no-op 无事可做零回归', () => {
  const mainRepo = makeRepo('cra-main-s-');
  const baseHash = headOf(mainRepo);
  const wtDir = join(mainRepo, '.sillyspec', '.runtime', 'worktrees', 'tcs');
  mkdirSync(wtDir, { recursive: true });
  writeFileSync(join(mainRepo, '.gitignore'), '.sillyspec/\n');
  execSync('git add . && git commit -q -m gitignore', { cwd: mainRepo, stdio: 'pipe' });
  execSync(`git worktree add "${wtDir}" -b sillyspec/tcs`, { cwd: mainRepo, stdio: 'pipe' });
  writeFileSync(join(wtDir, 'src-main.js'), 'main-deliverable\n');
  writeFileSync(join(wtDir, 'meta.json'), JSON.stringify({
    changeName: 'tcs', branch: 'sillyspec/tcs', baseHash, baselineCommit: baseHash,
    baselineHash: null, worktreePath: wtDir, mode: 'worktree', baselineFiles: [],
  }));
  const wm = makeWm(new Map([['tcs', {
    mode: 'worktree', worktreePath: wtDir, baseHash, baselineCommit: baseHash,
    baselineHash: null, baselineFiles: [],
  }]]));
  // 单仓 ctx（declaredRepos=[main]，hasCrossRepo=false）
  const ctx = new MultiRepoContext({
    cwd: mainRepo, changeName: 'tcs', declaredRepos: ['main'],
    repoRegistry: new Map(), worktreeManager: wm,
  });
  const r = applyWorktree('tcs', { cwd: mainRepo, checkOnly: true, ctx });
  assert.equal(r.errors.length, 0, `单仓 ctx 不触发跨仓校验（实际：${r.errors.join('; ')}）`);
  assert.deepEqual(r.crossRepoValidated, [], '无跨仓 entry → crossRepoValidated 空');
  assert.ok(r.changedFiles.includes('src-main.js'), '主仓 worktree 改动识别正常（原 A5 路径）');
});
