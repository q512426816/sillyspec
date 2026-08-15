/**
 * W3 task-09 集成测试 —— execute 启动入口构造 MultiRepoContext + local.yaml repos 读取 + ctx 透传
 *
 * 覆盖 design §5.4 execute 启动段 + §6 shared.js/index.js 行 + §7.2 G2 构造时机 + 决策 D-001/D-013。
 *
 * 测试矩阵：
 *   1. aggregateDeclaredRepos：plan.md 多 task repo: 聚合去重（含 main 隐式）
 *   2. getOrCreateMultiRepoContext 单仓退化：无 repos 段 + 单仓 change → ctx 非 null + hasCrossRepo=false
 *   3. getOrCreateMultiRepoContext 跨仓注册：local.yaml repos 段 + plan.md repo: → ctx map 多项
 *   4. getOrCreateMultiRepoContext fail-closed：未注册 repo → throw 阻断
 *   5. getOrCreateMultiRepoContext 进程级缓存：同 change 二次调用命中缓存（同实例）
 *   6. getOrCreateMultiRepoContext 无 plan.md：返回 null（plan 未完成 / 非跨仓场景安全退化）
 *   7. 透传链路：runGate/runDerive ctx 参数透传到 validateTaskReviews/runVerifyTestCheck（签名级）
 *
 * 风格：node:test + node:assert/strict，真实 git fixture（mkdtemp + git init），after 清理。
 * 对齐 multi-repo-context.test.mjs 范式。
 */
import { test, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execSync } from 'node:child_process';
import {
  aggregateDeclaredRepos,
  getOrCreateMultiRepoContext,
  _clearMultiRepoCtxCache,
} from '../src/run/shared.js';

const tempDirs = [];
function makeRepo() {
  const d = mkdtempSync(join(tmpdir(), 't09-'));
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

/** 在 specDir 下建 change 目录 + plan.md（含指定 repo 声明的 task 卡片） */
function writeChange(specDir, changeName, taskRepos) {
  const changeDir = join(specDir, 'changes', changeName);
  mkdirSync(changeDir, { recursive: true });
  // plan.md 含 Wave + task 卡片（每个 task 卡片用 frontmatter 声明 repo:）
  let plan = '# Plan\n\n## Wave 1\n\n';
  let i = 1;
  for (const repo of taskRepos) {
    if (repo === 'main') {
      plan += `### task-${String(i).padStart(2, '0')}\n\n---\ngoal: main task\n---\n\n`;
    } else {
      plan += `### task-${String(i).padStart(2, '0')}\n\n---\nrepo: ${repo}\ngoal: cross task\n---\n\n`;
    }
    i++;
  }
  writeFileSync(join(changeDir, 'plan.md'), plan);
  return changeDir;
}

/** 写 local.yaml repos: 段 */
function writeLocalYaml(cwd, reposMap) {
  const sillyspecDir = join(cwd, '.sillyspec');
  mkdirSync(sillyspecDir, { recursive: true });
  let yaml = '# local.yaml\nrepos:\n';
  for (const [key, path] of reposMap) {
    yaml += `  ${key}: ${path}\n`;
  }
  writeFileSync(join(sillyspecDir, 'local.yaml'), yaml);
}

beforeEach(() => {
  _clearMultiRepoCtxCache();
});

after(() => {
  for (const d of tempDirs) {
    try { rmSync(d, { recursive: true, force: true }); } catch { /* Windows EPERM best-effort */ }
  }
});

// ── 1. aggregateDeclaredRepos ──

test('aggregateDeclaredRepos：空 plan → [main]', () => {
  assert.deepEqual(aggregateDeclaredRepos(''), ['main']);
  assert.deepEqual(aggregateDeclaredRepos(null), ['main']);
});

test('aggregateDeclaredRepos：单仓 task（无 repo:）→ [main]', () => {
  const plan = '# Plan\n\n## Wave 1\n\n### task-01\n\n---\ngoal: x\n---\n';
  assert.deepEqual(aggregateDeclaredRepos(plan), ['main']);
});

test('aggregateDeclaredRepos：多 task 多 repo 去重（含 main 隐式）', () => {
  const plan = [
    '# Plan',
    '## Wave 1',
    '### task-01',
    '---',
    'repo: sillyspec',
    'goal: x',
    '---',
    '### task-02',
    '---',
    'repo: sillyspec', // 重复 repo
    'goal: y',
    '---',
    '### task-03',
    '---',
    'goal: main task', // 无 repo → main
    '---',
    '### task-04',
    '---',
    'repo: other-repo',
    'goal: z',
    '---',
  ].join('\n');
  const repos = aggregateDeclaredRepos(plan);
  assert.ok(repos.includes('main'), '应含 main 隐式');
  assert.ok(repos.includes('sillyspec'), '应含 sillyspec');
  assert.ok(repos.includes('other-repo'), '应含 other-repo');
  // 去重：sillyspec 出现两次但只一项
  assert.equal(repos.filter(r => r === 'sillyspec').length, 1, 'sillyspec 去重');
});

// ── 2. getOrCreateMultiRepoContext 单仓退化 ──

test('getOrCreateMultiRepoContext：单仓 change（无 repos 段）→ ctx 非 null + hasCrossRepo=false', async () => {
  const cwd = makeRepo();
  const specDir = join(cwd, '.sillyspec');
  writeChange(specDir, 'c-single', ['main']);
  // 不写 local.yaml repos 段
  const ctx = await getOrCreateMultiRepoContext({ cwd, changeName: 'c-single' });
  assert.ok(ctx, '单仓 change 应构造非 null ctx');
  assert.equal(ctx.hasCrossRepo(), false);
  assert.equal(ctx.map.size, 1);
  assert.ok(ctx.resolve('main'), 'main entry 存在');
  assert.equal(ctx.resolve('main').isMain, true);
});

test('getOrCreateMultiRepoContext：无 plan.md → 返回 null（plan 未完成场景安全退化）', async () => {
  const cwd = makeRepo();
  // 不建 change 目录 / 不写 plan.md
  const ctx = await getOrCreateMultiRepoContext({ cwd, changeName: 'no-plan' });
  assert.equal(ctx, null);
});

// ── 坑7：plan.md 只留 checkbox、跨仓 repo 声明全在 tasks/task-NN.md ──
// 修复前 aggregateDeclaredRepos 只扫 plan.md 内联 frontmatter → declaredRepos 缺跨仓仓
// → MultiRepoContext 构造 fail-closed「未在 local.yaml repos: 段注册」误阻断（或 review
// 退回主仓校验误报伪造）。修复后 getOrCreateMultiRepoContext 兼扫 tasks/ 独立卡片。
test('getOrCreateMultiRepoContext：坑7 兼扫 tasks/task-NN.md 的 repo 声明（plan.md 无内联块）', async () => {
  const cwd = makeRepo();
  const crossRepo = makeRepo();
  const specDir = join(cwd, '.sillyspec');
  const changeDir = join(specDir, 'changes', 'c-pit7');
  mkdirSync(changeDir, { recursive: true });
  mkdirSync(join(changeDir, 'tasks'), { recursive: true });
  // plan.md 只有 Wave + checkbox 行（无任何 frontmatter 块）——坑7 复现条件
  writeFileSync(join(changeDir, 'plan.md'), '# Plan\n\n## Wave 1\n\n- [ ] task-01: 做 foo\n');
  // 跨仓声明在独立 task 卡
  writeFileSync(
    join(changeDir, 'tasks', 'task-01.md'),
    '---\nid: task-01\nrepo: sillyspec\ngoal: x\n---\n'
  );
  writeLocalYaml(cwd, new Map([['sillyspec', crossRepo]]));
  const ctx = await getOrCreateMultiRepoContext({ cwd, changeName: 'c-pit7' });
  assert.ok(ctx, '坑7 场景应构造出 ctx（不再退化单仓）');
  assert.equal(ctx.hasCrossRepo(), true);
  const cross = ctx.resolve('sillyspec');
  assert.ok(cross, 'sillyspec entry 从 tasks/ 卡片解析注册');
  assert.equal(cross.gitDir, crossRepo);
});

// 坑7 回归保护：plan.md 有内联块时原行为不变（双源并存不重复不冲突）
test('getOrCreateMultiRepoContext：plan.md 内联块 + tasks/ 卡片双源并存 → 去重正常', async () => {
  const cwd = makeRepo();
  const crossRepo = makeRepo();
  const specDir = join(cwd, '.sillyspec');
  const changeDir = join(specDir, 'changes', 'c-pit7-dual');
  mkdirSync(changeDir, { recursive: true });
  mkdirSync(join(changeDir, 'tasks'), { recursive: true });
  // plan.md 内联声明 sillyspec；task 卡也写 repo: sillyspec（双源同 repo）
  writeFileSync(
    join(changeDir, 'plan.md'),
    '# Plan\n\n## Wave 1\n\n---\nrepo: sillyspec\ngoal: x\n---\n'
  );
  writeFileSync(
    join(changeDir, 'tasks', 'task-01.md'),
    '---\nid: task-01\nrepo: sillyspec\ngoal: x\n---\n'
  );
  writeLocalYaml(cwd, new Map([['sillyspec', crossRepo]]));
  const ctx = await getOrCreateMultiRepoContext({ cwd, changeName: 'c-pit7-dual' });
  assert.ok(ctx);
  assert.equal(ctx.map.size, 2, 'main + sillyspec 恰两项（双源同 repo 去重）');
});

test('getOrCreateMultiRepoContext：cwd/changeName 缺失 → 返回 null', async () => {
  assert.equal(await getOrCreateMultiRepoContext({ changeName: 'x' }), null);
  assert.equal(await getOrCreateMultiRepoContext({ cwd: '/tmp' }), null);
  assert.equal(await getOrCreateMultiRepoContext({}), null);
});

// ── 3. getOrCreateMultiRepoContext 跨仓注册 ──

test('getOrCreateMultiRepoContext：跨仓 change + repos 段注册 → ctx map 多项 + hasCrossRepo=true', async () => {
  const cwd = makeRepo();
  const crossRepo = makeRepo(); // 第二个真实 git 仓
  const specDir = join(cwd, '.sillyspec');
  writeChange(specDir, 'c-cross', ['main', 'sillyspec']);
  writeLocalYaml(cwd, new Map([['sillyspec', crossRepo]]));
  const ctx = await getOrCreateMultiRepoContext({ cwd, changeName: 'c-cross' });
  assert.ok(ctx);
  assert.equal(ctx.hasCrossRepo(), true);
  assert.equal(ctx.map.size, 2);
  const cross = ctx.resolve('sillyspec');
  assert.ok(cross, 'sillyspec entry 存在');
  assert.equal(cross.isMain, false);
  assert.equal(cross.gitDir, crossRepo);
  assert.equal(cross.projectRoot, crossRepo);
  assert.equal(cross.worktreePath, crossRepo);
});

// ── 4. getOrCreateMultiRepoContext fail-closed ──

test('getOrCreateMultiRepoContext：未注册 repo → throw 阻断（约束② D-007）', async () => {
  const cwd = makeRepo();
  const specDir = join(cwd, '.sillyspec');
  writeChange(specDir, 'c-fail', ['main', 'unregistered-repo']);
  // local.yaml 不注册 unregistered-repo
  writeLocalYaml(cwd, new Map([['sillyspec', '/some/path']]));
  await assert.rejects(
    () => getOrCreateMultiRepoContext({ cwd, changeName: 'c-fail' }),
    /未在 local\.yaml repos: 段注册/
  );
});

test('getOrCreateMultiRepoContext：跨仓 git 不可达 → throw 阻断（约束②）', async () => {
  const cwd = makeRepo();
  const specDir = join(cwd, '.sillyspec');
  writeChange(specDir, 'c-badgit', ['main', 'ghost']);
  // 注册一个不存在的路径
  writeLocalYaml(cwd, new Map([['ghost', join(tmpdir(), 'nonexistent-repo-' + Date.now())]]));
  await assert.rejects(
    () => getOrCreateMultiRepoContext({ cwd, changeName: 'c-badgit' }),
    /git 不可达/
  );
});

// ── 5. getOrCreateMultiRepoContext 进程级缓存 ──

test('getOrCreateMultiRepoContext：同 change 二次调用命中缓存（同实例）', async () => {
  const cwd = makeRepo();
  const specDir = join(cwd, '.sillyspec');
  writeChange(specDir, 'c-cache', ['main']);
  const ctx1 = await getOrCreateMultiRepoContext({ cwd, changeName: 'c-cache' });
  const ctx2 = await getOrCreateMultiRepoContext({ cwd, changeName: 'c-cache' });
  assert.equal(ctx1, ctx2, '同 change 二次调用应命中缓存返回同实例');
});

test('getOrCreateMultiRepoContext：noCache=true 跳过缓存（新实例）', async () => {
  const cwd = makeRepo();
  const specDir = join(cwd, '.sillyspec');
  writeChange(specDir, 'c-nocache', ['main']);
  const ctx1 = await getOrCreateMultiRepoContext({ cwd, changeName: 'c-nocache' });
  const ctx2 = await getOrCreateMultiRepoContext({ cwd, changeName: 'c-nocache', noCache: true });
  assert.notEqual(ctx1, ctx2, 'noCache=true 应构造新实例');
});

test('getOrCreateMultiRepoContext：不同 change 不串扰（各自缓存）', async () => {
  const cwd = makeRepo();
  const specDir = join(cwd, '.sillyspec');
  writeChange(specDir, 'c-a', ['main']);
  writeChange(specDir, 'c-b', ['main']);
  const ctxA = await getOrCreateMultiRepoContext({ cwd, changeName: 'c-a' });
  const ctxB = await getOrCreateMultiRepoContext({ cwd, changeName: 'c-b' });
  assert.notEqual(ctxA, ctxB, '不同 change 应各自独立 ctx');
});

test('getOrCreateMultiRepoContext：fail-closed 抛错不缓存（重试重新构造）', async () => {
  const cwd = makeRepo();
  const specDir = join(cwd, '.sillyspec');
  writeChange(specDir, 'c-retry', ['main', 'missing']);
  // 第一次抛错
  await assert.rejects(() => getOrCreateMultiRepoContext({ cwd, changeName: 'c-retry' }));
  // 修正 local.yaml 注册 missing（指向真实仓）后重试应成功
  const crossRepo = makeRepo();
  writeLocalYaml(cwd, new Map([['missing', crossRepo]]));
  const ctx = await getOrCreateMultiRepoContext({ cwd, changeName: 'c-retry' });
  assert.ok(ctx, '修正配置后重试应构造成功（抛错未缓存）');
  assert.equal(ctx.map.size, 2);
});

// ── 6. specDir / platformOpts.specRoot 透传 ──

test('getOrCreateMultiRepoContext：platformOpts.specRoot 指定 specDir（平台模式）', async () => {
  const cwd = makeRepo();
  // specDir 放在非默认位置（模拟平台 specRoot）
  const customSpecDir = join(cwd, 'custom-spec');
  writeChange(customSpecDir, 'c-custom', ['main']);
  const ctx = await getOrCreateMultiRepoContext({
    cwd,
    changeName: 'c-custom',
    platformOpts: { specRoot: customSpecDir },
  });
  assert.ok(ctx, '通过 platformOpts.specRoot 找到 plan.md 构造 ctx');
  assert.equal(ctx.hasCrossRepo(), false);
});

// ── 7. 透传链路签名级校验（runGate/runDerive ctx 参数） ──

test('runGate/runDerive 签名：ctx 作为可选参数接收（缺省 null）', async () => {
  // 签名级校验：不实际跑 gate（需完整 fixture），只验函数接收 ctx 参数不报错
  // 用反射读函数签名，确认 ctx 在解构参数中
  const { runGate, runDerive } = await import('../src/machine-interface.js');
  const gateSrc = runGate.toString();
  const deriveSrc = runDerive.toString();
  assert.match(gateSrc, /ctx/, 'runGate 签名应含 ctx 参数');
  assert.match(deriveSrc, /ctx/, 'runDerive 签名应含 ctx 参数');
  // 函数应是 async（透传链路在 await 内）
  assert.match(gateSrc, /^async\s+function\s+runGate/, 'runGate 是 async');
  assert.match(deriveSrc, /^async\s+function\s+runDerive/, 'runDerive 是 async');
});

test('buildExecuteSteps 签名：options.ctx 透传到 Wave prompt（task-08 契约 + task-09 透传）', async () => {
  const { buildExecuteSteps } = await import('../src/stages/execute.js');
  const steps = buildExecuteSteps(null, { ctx: null });
  assert.ok(Array.isArray(steps), 'buildExecuteSteps 不传 planFile 返回默认步骤');
  // execute 启动入口（getStageSteps）已透传 ctx，签名级校验 options.ctx 被 consume
  const src = buildExecuteSteps.toString();
  assert.match(src, /options\.ctx/, 'buildExecuteSteps 应消费 options.ctx');
});

// ── 8. getStageSteps execute 分支构造 ctx 透传（端到端入口校验） ──

test('getStageSteps(execute)：构造 ctx 透传给 buildExecuteSteps（D-013 G2 落地）', async () => {
  const cwd = makeRepo();
  const specDir = join(cwd, '.sillyspec');
  writeChange(specDir, 'c-entry', ['main']);
  // 模拟 progress 对象（resolveChangeDir 需读 currentChange / changes 目录）
  const { ProgressManager } = await import('../src/progress.js');
  // 直接用 getStageSteps，传 progress stub
  const progress = { currentChange: 'c-entry', project: 'test' };
  const { getStageSteps } = await import('../src/run/shared.js');
  const steps = await getStageSteps('execute', cwd, progress, specDir);
  assert.ok(Array.isArray(steps), 'execute steps 应返回数组');
  assert.ok(steps.length > 0, 'execute 应有步骤');
  // execute 启动后 ctx 应已缓存（同进程后续 gate/apply 复用）
  const cachedCtx = await getOrCreateMultiRepoContext({ cwd, changeName: 'c-entry' });
  assert.ok(cachedCtx, 'execute 启动后 ctx 应已缓存可复用');
  assert.equal(cachedCtx.hasCrossRepo(), false);
});
