/**
 * MultiRepoContext 单元测试 —— W1 task-01
 *
 * 覆盖 design §7.1 接口契约 + 决策 D-005/D-006/D-007/D-013：
 *   - 单仓退化（declaredRepos=['main']）：{main:{...}} 单值 map，hasCrossRepo()=false，零行为变化
 *   - in-place-fallback 主仓：meta.mode==='in-place-fallback' → worktreePath 兜底为 cwd
 *   - 跨仓 Map 多项：main + 跨仓 entry，hasCrossRepo()=true，resolve 返回正确 gitDir/projectRoot
 *   - 约束② fail-closed（未注册）：declaredRepos 有 key 不在 repoRegistry → throw 列已注册 repo
 *   - 约束② fail-closed（跨仓 git 不可用）：跨仓路径不存在/非 git 仓 → throw 阻断，不降级
 *   - 约束① 跨仓 head 实时取：resolveHead 推进后反映新 HEAD（不缓存）
 *   - 约束① 跨仓 base 必传 taskBaseCommit：resolveBase() 无参 throw；有参返原值
 *   - 主仓 resolveBase：锚 meta.baseHash，忽略 taskBaseCommit 参数（单仓不变式）
 *
 * 风格：node:test + node:assert/strict（对齐 db-engine.test.mjs / W1 新增模块）。
 * 真实 git fixture（mkdtemp + git init），after 清理临时目录（Windows EPERM 文件锁）。
 */
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execSync } from 'node:child_process';
import { MultiRepoContext } from '../src/run/multi-repo-context.js';

const tempDirs = [];
function makeRepo() {
  const d = mkdtempSync(join(tmpdir(), 'mrc-'));
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

function commitMore(d, msg) {
  writeFileSync(join(d, 'file-' + Date.now() + '.md'), 'change\n');
  execSync('git add .', { cwd: d, stdio: 'pipe' });
  execSync(`git commit -q -m "${msg}"`, { cwd: d, stdio: 'pipe' });
}

// stub WorktreeManager：只暴露 getMeta，按 metaMap 返回预设 meta
function makeWm(metaMap) {
  return { getMeta: (name) => metaMap.get(name) || null };
}

after(() => {
  for (const d of tempDirs) {
    try { rmSync(d, { recursive: true, force: true }); } catch { /* Windows EPERM best-effort */ }
  }
});

test('单仓退化：declaredRepos=["main"] → {main:{...}} 单值 map，hasCrossRepo=false', () => {
  const cwd = makeRepo();
  const baseHash = execSync('git rev-parse HEAD', { cwd, encoding: 'utf8' }).trim();
  const wm = makeWm(new Map([['c1', { mode: 'worktree', worktreePath: cwd, baseHash }]]));
  const ctx = new MultiRepoContext({
    cwd, changeName: 'c1', declaredRepos: ['main'],
    repoRegistry: new Map(), worktreeManager: wm,
  });
  assert.equal(ctx.map.size, 1);
  assert.equal(ctx.hasCrossRepo(), false);
  const main = ctx.resolve('main');
  assert.ok(main, 'main entry must exist');
  assert.equal(main.isMain, true);
  assert.equal(main.repoKey, 'main');
  assert.equal(main.gitDir, cwd);
  assert.equal(main.worktreePath, cwd);
  assert.equal(main.projectRoot, cwd);
  assert.equal(main.resolveHead(), baseHash);
  assert.equal(main.resolveBase(), baseHash);
  assert.equal(ctx.resolve('nonexistent'), null);
});

test('in-place-fallback 主仓：meta.mode=in-place-fallback → worktreePath 兜底为 cwd', () => {
  const cwd = makeRepo();
  const baseHash = execSync('git rev-parse HEAD', { cwd, encoding: 'utf8' }).trim();
  // in-place 模式 meta.worktreePath 可能指向别处，但本模块应兜底为 cwd
  const wm = makeWm(new Map([['c1', {
    mode: 'in-place-fallback', worktreePath: '/some/other/place', baseHash,
  }]]));
  const ctx = new MultiRepoContext({
    cwd, changeName: 'c1', declaredRepos: ['main'],
    repoRegistry: new Map(), worktreeManager: wm,
  });
  const main = ctx.resolve('main');
  assert.equal(main.worktreePath, cwd, 'in-place worktreePath 兜底 cwd');
  assert.equal(main.gitDir, cwd);
  assert.equal(main.resolveBase(), baseHash);
});

test('in-place-fallback 兜底也覆盖 meta 缺失场景（changeName 未建 worktree）', () => {
  const cwd = makeRepo();
  const wm = makeWm(new Map()); // getMeta 返回 null
  const ctx = new MultiRepoContext({
    cwd, changeName: 'c1', declaredRepos: ['main'],
    repoRegistry: new Map(), worktreeManager: wm,
  });
  const main = ctx.resolve('main');
  assert.equal(main.worktreePath, cwd);
  // meta 缺失 → baseHash 缺失 → resolveBase 应抛清晰错误（不静默返 null）
  assert.throws(() => main.resolveBase(), /meta\.baseHash 缺失/);
  // resolveHead 仍可工作（实时 git rev-parse，不依赖 meta）
  const head = execSync('git rev-parse HEAD', { cwd, encoding: 'utf8' }).trim();
  assert.equal(main.resolveHead(), head);
});

test('跨仓 Map 多项：main + 跨仓 entry，hasCrossRepo=true，resolve 返回正确路径', () => {
  const mainRepo = makeRepo();
  const crossRepo = makeRepo();
  const baseHash = execSync('git rev-parse HEAD', { cwd: mainRepo, encoding: 'utf8' }).trim();
  const crossHead = execSync('git rev-parse HEAD', { cwd: crossRepo, encoding: 'utf8' }).trim();
  const wm = makeWm(new Map([['c1', { mode: 'worktree', worktreePath: mainRepo, baseHash }]]));
  const ctx = new MultiRepoContext({
    cwd: mainRepo, changeName: 'c1', declaredRepos: ['main', 'sillyspec'],
    repoRegistry: new Map([['sillyspec', crossRepo]]),
    worktreeManager: wm,
  });
  assert.equal(ctx.map.size, 2);
  assert.equal(ctx.hasCrossRepo(), true);
  const cross = ctx.resolve('sillyspec');
  assert.ok(cross);
  assert.equal(cross.isMain, false);
  assert.equal(cross.repoKey, 'sillyspec');
  assert.equal(cross.gitDir, crossRepo);
  assert.equal(cross.worktreePath, crossRepo);
  assert.equal(cross.projectRoot, crossRepo);
  assert.equal(cross.resolveHead(), crossHead);
});

test('约束② fail-closed（未注册）：declaredRepos 含 repoRegistry 没有的 key → throw 列已注册 repo', () => {
  const cwd = makeRepo();
  const baseHash = execSync('git rev-parse HEAD', { cwd, encoding: 'utf8' }).trim();
  const wm = makeWm(new Map([['c1', { mode: 'worktree', worktreePath: cwd, baseHash }]]));
  assert.throws(
    () => new MultiRepoContext({
      cwd, changeName: 'c1', declaredRepos: ['main', 'unknown-repo'],
      repoRegistry: new Map([['sillyspec', '/some/path']]),
      worktreeManager: wm,
    }),
    (err) => {
      assert.match(err.message, /未在 local\.yaml repos: 段注册/);
      assert.match(err.message, /unknown-repo/);
      // 错误信息必须列出已注册 repo 供用户排错
      assert.match(err.message, /sillyspec/);
      assert.match(err.message, /main \(隐式\)/);
      return true;
    }
  );
});

test('约束② fail-closed（跨仓 git 不可达）：路径不存在 → throw 阻断，不降级', () => {
  const cwd = makeRepo();
  const baseHash = execSync('git rev-parse HEAD', { cwd, encoding: 'utf8' }).trim();
  const wm = makeWm(new Map([['c1', { mode: 'worktree', worktreePath: cwd, baseHash }]]));
  assert.throws(
    () => new MultiRepoContext({
      cwd, changeName: 'c1', declaredRepos: ['main', 'ghost'],
      repoRegistry: new Map([['ghost', 'C:/definitely/not/a/repo/xyz-12345']]),
      worktreeManager: wm,
    }),
    (err) => {
      assert.match(err.message, /跨仓 repo "ghost" git 不可达/);
      assert.match(err.message, /约束② fail-closed/);
      return true;
    }
  );
});

test('约束② fail-closed（跨仓非 git 仓）：目录存在但非 git → throw', () => {
  const cwd = makeRepo();
  const baseHash = execSync('git rev-parse HEAD', { cwd, encoding: 'utf8' }).trim();
  const notGit = mkdtempSync(join(tmpdir(), 'notgit-'));
  tempDirs.push(notGit);
  const wm = makeWm(new Map([['c1', { mode: 'worktree', worktreePath: cwd, baseHash }]]));
  assert.throws(
    () => new MultiRepoContext({
      cwd, changeName: 'c1', declaredRepos: ['main', 'notgit'],
      repoRegistry: new Map([['notgit', notGit]]),
      worktreeManager: wm,
    }),
    /跨仓 repo "notgit" git 不可达/
  );
});

test('约束② fail-closed（跨仓注册路径为空字符串）→ throw', () => {
  const cwd = makeRepo();
  const baseHash = execSync('git rev-parse HEAD', { cwd, encoding: 'utf8' }).trim();
  const wm = makeWm(new Map([['c1', { mode: 'worktree', worktreePath: cwd, baseHash }]]));
  assert.throws(
    () => new MultiRepoContext({
      cwd, changeName: 'c1', declaredRepos: ['main', 'empty'],
      repoRegistry: new Map([['empty', '']]),
      worktreeManager: wm,
    }),
    /注册但路径为空/
  );
});

test('约束① 跨仓 resolveHead 实时取：commit 推进后反映新 HEAD（不缓存）', () => {
  const mainRepo = makeRepo();
  const crossRepo = makeRepo();
  const baseHash = execSync('git rev-parse HEAD', { cwd: mainRepo, encoding: 'utf8' }).trim();
  const wm = makeWm(new Map([['c1', { mode: 'worktree', worktreePath: mainRepo, baseHash }]]));
  const ctx = new MultiRepoContext({
    cwd: mainRepo, changeName: 'c1', declaredRepos: ['main', 'sillyspec'],
    repoRegistry: new Map([['sillyspec', crossRepo]]),
    worktreeManager: wm,
  });
  const cross = ctx.resolve('sillyspec');
  const headBefore = cross.resolveHead();
  // 推进跨仓 HEAD
  commitMore(crossRepo, 'second commit');
  const headAfter = cross.resolveHead();
  assert.notEqual(headBefore, headAfter, 'resolveHead 必须实时反映 HEAD 推进，不能缓存');
  const expected = execSync('git rev-parse HEAD', { cwd: crossRepo, encoding: 'utf8' }).trim();
  assert.equal(headAfter, expected);
});

test('约束① 跨仓 resolveBase 必传 taskBaseCommit：无参 throw，有参返原值', () => {
  const mainRepo = makeRepo();
  const crossRepo = makeRepo();
  const baseHash = execSync('git rev-parse HEAD', { cwd: mainRepo, encoding: 'utf8' }).trim();
  const crossBase = execSync('git rev-parse HEAD', { cwd: crossRepo, encoding: 'utf8' }).trim();
  const wm = makeWm(new Map([['c1', { mode: 'worktree', worktreePath: mainRepo, baseHash }]]));
  const ctx = new MultiRepoContext({
    cwd: mainRepo, changeName: 'c1', declaredRepos: ['main', 'sillyspec'],
    repoRegistry: new Map([['sillyspec', crossRepo]]),
    worktreeManager: wm,
  });
  const cross = ctx.resolve('sillyspec');
  // 无参 → 抛错指明必须传 taskBaseCommit
  assert.throws(() => cross.resolveBase(), /必传 taskBaseCommit/);
  // 有参 → 原样返回（task 卡 base_commit 锡点）
  assert.equal(cross.resolveBase(crossBase), crossBase);
  // 推进跨仓 HEAD 不影响 base 锡点
  commitMore(crossRepo, 'third commit');
  assert.equal(cross.resolveBase(crossBase), crossBase, 'base 锡点不受 HEAD 推进影响');
});

test('主仓 resolveBase 忽略 taskBaseCommit 参数：锚 meta.baseHash（单仓不变式，零回归）', () => {
  const mainRepo = makeRepo();
  const baseHash = execSync('git rev-parse HEAD', { cwd: mainRepo, encoding: 'utf8' }).trim();
  const wm = makeWm(new Map([['c1', { mode: 'worktree', worktreePath: mainRepo, baseHash }]]));
  const ctx = new MultiRepoContext({
    cwd: mainRepo, changeName: 'c1', declaredRepos: ['main'],
    repoRegistry: new Map(), worktreeManager: wm,
  });
  const main = ctx.resolve('main');
  // 主仓 base 永远锚 meta.baseHash，传任何 taskBaseCommit 都被忽略
  assert.equal(main.resolveBase(), baseHash);
  assert.equal(main.resolveBase('some-other-commit'), baseHash);
});

test('declaredRepos 重复声明同一 repo：dedupe 保留顺序，map 不重复', () => {
  const mainRepo = makeRepo();
  const crossRepo = makeRepo();
  const baseHash = execSync('git rev-parse HEAD', { cwd: mainRepo, encoding: 'utf8' }).trim();
  const wm = makeWm(new Map([['c1', { mode: 'worktree', worktreePath: mainRepo, baseHash }]]));
  const ctx = new MultiRepoContext({
    cwd: mainRepo, changeName: 'c1',
    declaredRepos: ['main', 'sillyspec', 'sillyspec', 'main'],
    repoRegistry: new Map([['sillyspec', crossRepo]]),
    worktreeManager: wm,
  });
  assert.equal(ctx.map.size, 2);
  assert.deepEqual([...ctx.map.keys()], ['main', 'sillyspec']);
});

test('构造参数校验：cwd/declaredRepos/repoRegistry/worktreeManager 缺失或类型错 → throw', () => {
  const cwd = makeRepo();
  const wm = makeWm(new Map());
  assert.throws(() => new MultiRepoContext({ declaredRepos: ['main'], repoRegistry: new Map(), worktreeManager: wm }), /cwd 必传/);
  assert.throws(() => new MultiRepoContext({ cwd, repoRegistry: new Map(), worktreeManager: wm }), /declaredRepos 必传/);
  assert.throws(() => new MultiRepoContext({ cwd, declaredRepos: ['main'], worktreeManager: wm }), /repoRegistry 必传/);
  assert.throws(() => new MultiRepoContext({ cwd, declaredRepos: ['main'], repoRegistry: {}, worktreeManager: wm }), /repoRegistry 必传.*Map/);
  assert.throws(() => new MultiRepoContext({ cwd, declaredRepos: ['main'], repoRegistry: new Map() }), /worktreeManager 必传/);
});

test('单仓 declaredRepos 不含 main 时仍可工作（main 项不一定出现，hasCrossRepo 按实际 map 大小判）', () => {
  // 边界：若上游 task-02 DeclaredRepos 总含 'main'，此用例防御性验证"无 main 纯跨仓"也能构造
  const mainRepo = makeRepo();
  const crossRepo = makeRepo();
  const wm = makeWm(new Map());
  const ctx = new MultiRepoContext({
    cwd: mainRepo, changeName: 'c1', declaredRepos: ['sillyspec'],
    repoRegistry: new Map([['sillyspec', crossRepo]]),
    worktreeManager: wm,
  });
  assert.equal(ctx.map.size, 1);
  assert.equal(ctx.hasCrossRepo(), false, '仅 1 个跨仓项、无 main → size=1，hasCrossRepo=false');
  assert.equal(ctx.resolve('main'), null);
  assert.ok(ctx.resolve('sillyspec'));
});
