/**
 * 跨仓 worktree 落位测试（坑 cross-wt-toolchain-split，2026-10-10 用户实证 D-007）。
 *
 * 覆盖 cross-placement.js + worktree-cross.js 落位接线：
 *   1. crossWorktreePath：默认公式零回归 / placementRoot 落位（FR-01）
 *   2. readCrossPlacementConfig：块式 + inline 双形态解析（FR-01）
 *   3. ensureCrossWorktrees placement 落位 + 注册表写入 + resolveCrossWorktreePath 寻回（FR-01/02）
 *   4. 注册表悬挂键 sweep（目录亡仅键存）+ 无 meta 条目不入列 + 损坏注册表降级（FR-02）
 *   5. WSL 分裂判定 isWslSplit：linux /mnt 命中、win32 不误报（FR-03，platform mock）
 *   6. cleanup 挪位 worktree 可清理 + 注册表键回收（FR-02）
 *
 * 风格：node:test + 真实 git fixture（对齐 cross-repo-worktree-isolation.test.mjs 范式）。
 */
import { test, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname, resolve as resolvePath } from 'node:path';
import { tmpdir } from 'node:os';
import { execSync, execFileSync } from 'node:child_process';
import {
  crossWorktreePath,
  resolveCrossWorktreePath,
  readCrossPlacementConfig,
  readPlacementRegistry,
  updatePlacementRegistry,
  sweepPlacementRegistry,
  placementRegistryPath,
  isWslSplit,
  resolvePlacementRoot,
} from '../src/cross-placement.js';
import { ensureCrossWorktrees, getCrossWorktreeMeta, listCrossWorktreeMetas, cleanupCrossWorktrees } from '../src/worktree-cross.js';

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

const CHANGE = '2026-10-10-cross-place-test';

/** 主仓 + 跨仓仓 + local.yaml（可选 crossPlacement）+ plan.md 声明跨仓 task */
function makeFixture({ placementDir } = {}) {
  const main = makeRepo('cwpl-main-');
  writeFileSync(join(main, '.gitignore'), '.sillyspec/\n');
  git(main, ['add', '.gitignore']);
  git(main, ['commit', '-q', '-m', 'ignore spec runtime']);
  const cross = makeRepo('cwpl-cross-');
  const specBase = join(main, '.sillyspec');
  mkdirSync(specBase, { recursive: true });
  const placementLine = placementDir
    ? `worktree:\n  crossPlacement:\n    front: ${placementDir.replace(/\\/g, '/')}\n`
    : '';
  writeFileSync(join(specBase, 'local.yaml'), `# local.yaml\nrepos:\n  front: ${cross.replace(/\\/g, '/')}\n${placementLine}`);
  const changeDir = join(specBase, 'changes', CHANGE);
  mkdirSync(changeDir, { recursive: true });
  writeFileSync(join(changeDir, 'plan.md'),
    '# Plan\n\n## Wave 1\n\n### task-01\n\n---\nrepo: front\ngoal: cross task\n---\n\n');
  return { main, cross, specBase, changeDir };
}

after(() => {
  for (const d of tempDirs) {
    try { rmSync(d, { recursive: true, force: true }); } catch { /* Windows 句柄延迟 */ }
  }
});

// ── 1. 路径公式 ──

test('crossWorktreePath 默认公式零回归 + placementRoot 落位（FR-01）', () => {
  const specBase = join('S', '.sillyspec');
  // 三参调用与旧公式逐字节一致（旧实现 join(specBase, '.runtime', 'worktrees', `${change}--${key}`)）
  assert.equal(
    crossWorktreePath(specBase, '2026-10-10-x', 'urgent'),
    join(specBase, '.runtime', 'worktrees', '2026-10-10-x--urgent'),
  );
  assert.equal(
    crossWorktreePath(specBase, '2026-10-10-x', 'urgent', 'D:/wt-root'),
    join('D:/wt-root', '2026-10-10-x--urgent'),
  );
});

test('resolvePlacementRoot 相对路径相对主仓根解析（FR-01）', () => {
  assert.equal(resolvePlacementRoot('/abs/wt', 'C:/main'), resolvePath('/abs/wt'));
  assert.equal(resolvePlacementRoot('wt-root', 'C:/main'), resolvePath('C:/main', 'wt-root'));
  assert.equal(resolvePlacementRoot('"D:/quoted"', 'C:/main'), resolvePath('D:/quoted'));
});

// ── 2. 配置读取 ──

test('readCrossPlacementConfig 块式 + inline 双形态（FR-01）', () => {
  const d = mkdtempSync(join(tmpdir(), 'cwpl-cfg-'));
  tempDirs.push(d);
  mkdirSync(join(d, '.sillyspec'), { recursive: true });
  writeFileSync(join(d, '.sillyspec', 'local.yaml'), [
    'commands:',
    '  lint: "npm run lint"',
    'worktree:',
    '  supplyFiles:',
    '    - src/gen.ts',
    '  crossPlacement: {front: /mnt/e/wt-root, urgent: D:/wt2}   # inline',
    'repos:',
    '  front: ../front',
  ].join('\n'));
  const cfg = readCrossPlacementConfig(d);
  assert.equal(cfg.get('front'), '/mnt/e/wt-root');
  assert.equal(cfg.get('urgent'), 'D:/wt2');
  assert.equal(cfg.size, 2);

  // 块式
  writeFileSync(join(d, '.sillyspec', 'local.yaml'), [
    'worktree:',
    '  crossPlacement:',
    '    front: /mnt/e/wt-block   # 尾注释剥离',
    '    urgent: "D:/wt2q"',
    '  adopt_branch: true',
  ].join('\n'));
  const cfg2 = readCrossPlacementConfig(d);
  assert.equal(cfg2.get('front'), '/mnt/e/wt-block');
  assert.equal(cfg2.get('urgent'), 'D:/wt2q');

  // 无配置 → 空
  writeFileSync(join(d, '.sillyspec', 'local.yaml'), 'repos:\n  front: ../front\n');
  assert.equal(readCrossPlacementConfig(d).size, 0);
  // 文件缺失 → 空
  assert.equal(readCrossPlacementConfig(join(d, 'nope')).size, 0);
});

// ── 3. ensure placement 落位 + 注册表寻回 ──

test('ensureCrossWorktrees placement 落位 + 注册表 + 寻回 + cleanup（FR-01/02）', () => {
  const placementDir = mkdtempSync(join(tmpdir(), 'cwpl-place-'));
  tempDirs.push(placementDir);
  const fx = makeFixture({ placementDir });

  const r = ensureCrossWorktrees({ cwd: fx.main, changeName: CHANGE, specBase: fx.specBase });
  assert.equal(r.created.length, 1);
  const wtPath = r.created[0].worktreePath;
  const expectedPath = join(placementDir, `${CHANGE}--front`);
  assert.equal(wtPath, expectedPath, 'worktree 必须落在配置的 placement 目录');
  assert.ok(existsSync(join(wtPath, 'meta.json')), 'meta.json 在落位目录');
  assert.equal(git(fx.cross, ['worktree', 'list', '--porcelain']).includes(expectedPath.replace(/\\/g, '/')), true, 'git worktree 注册在跨仓 .git');

  // 注册表写入 + resolve 寻回
  const registry = readPlacementRegistry(fx.specBase);
  assert.ok(registry[`${CHANGE}--front`], '注册表有条目');
  assert.equal(registry[`${CHANGE}--front`].worktreePath, wtPath);
  assert.equal(resolveCrossWorktreePath(fx.specBase, CHANGE, 'front'), wtPath);

  // getCrossWorktreeMeta / listCrossWorktreeMetas 经注册表可达
  const meta = getCrossWorktreeMeta(fx.specBase, CHANGE, 'front');
  assert.ok(meta && meta.isCross && meta.worktreePath === wtPath);
  const listed = listCrossWorktreeMetas(fx.specBase, CHANGE);
  assert.equal(listed.length, 1);
  assert.equal(listed[0].repoKey, 'front');

  // cleanup 挪位 worktree 可清理 + 注册表键回收
  const cr = cleanupCrossWorktrees({ cwd: fx.cross, changeName: CHANGE, specBase: fx.specBase, force: true });
  assert.equal(cr.results[0].result, 'cleaned');
  assert.ok(!existsSync(wtPath), '落位目录被删');
  assert.ok(!readPlacementRegistry(fx.specBase)[`${CHANGE}--front`], '注册表键被回收');
});

test('缺省落位=仓内 .sillyspec/.runtime/worktrees（repo-local，FR-01/02）', () => {
  const fx = makeFixture();
  const r = ensureCrossWorktrees({ cwd: fx.main, changeName: CHANGE, specBase: fx.specBase });
  assert.equal(r.created.length, 1);
  const expected = join(fx.cross, '.sillyspec', '.runtime', 'worktrees', `${CHANGE}--front`);
  assert.equal(
    r.created[0].worktreePath,
    expected,
    '新默认落位=跨仓仓内（同盘，工具链天然可达）',
  );
  assert.ok(existsSync(expected), 'worktree 目录已建');
  assert.equal(r.created[0].meta?.placementMode ?? 'repo-local', 'repo-local', 'placementMode=repo-local');

  // untracked 保障：.git/info/exclude 含 .sillyspec/ 且跨仓 status 干净（不动用户 .gitignore）
  const excludePath = join(fx.cross, '.git', 'info', 'exclude');
  assert.ok(existsSync(excludePath), '.git/info/exclude 已写');
  assert.match(readFileSync(excludePath, 'utf8'), /^\.sillyspec\/$/m, 'exclude 含 .sillyspec/ 条目');
  const status = git(fx.cross, ['status', '--porcelain']);
  assert.equal(status.trim(), '', 'worktree 不成跨仓 untracked 噪音（status 干净）');

  // 寻回：注册表写入 + getCrossWorktreeMeta/listCrossWorktreeMetas 可达（无需显式 repoRoot）
  assert.ok(readPlacementRegistry(fx.specBase)[`${CHANGE}--front`], '仓内默认写注册表');
  const meta = getCrossWorktreeMeta(fx.specBase, CHANGE, 'front');
  assert.ok(meta && meta.isCross && meta.worktreePath === expected, 'meta 经注册表寻回');
  assert.equal(listCrossWorktreeMetas(fx.specBase, CHANGE).length, 1, 'list 仓内扫描源可达');

  // cleanup 回收
  const cr = cleanupCrossWorktrees({ cwd: fx.cross, changeName: CHANGE, specBase: fx.specBase, force: true });
  assert.equal(cr.results[0].result, 'cleaned');
  assert.ok(!existsSync(expected), '落位目录被删');
});

test('旧默认位置（主仓 specBase）存量 worktree 仍可寻址可清理（legacy 兜底）', () => {
  const fx = makeFixture();
  // 手工造一个 legacy 位置 worktree（模拟上一版本创建的存量）
  const legacyDir = join(fx.specBase, '.runtime', 'worktrees', `${CHANGE}--front`);
  mkdirSync(legacyDir, { recursive: true });
  writeFileSync(join(legacyDir, 'meta.json'), JSON.stringify({
    changeName: CHANGE, repoKey: 'front', isCross: true, worktreePath: legacyDir,
    baseHash: 'a'.repeat(40), branch: `sillyspec/${CHANGE}`, mode: 'worktree',
  }));
  // 无注册表条目（模拟旧版本）——resolve 走旧公式、list 走旧目录扫描
  const meta = getCrossWorktreeMeta(fx.specBase, CHANGE, 'front');
  assert.ok(meta && meta.isCross, 'legacy 位置 meta 可读');
  assert.equal(listCrossWorktreeMetas(fx.specBase, CHANGE).length, 1, 'legacy 目录扫描源可达');
  const cr = cleanupCrossWorktrees({ cwd: fx.cross, changeName: CHANGE, specBase: fx.specBase, force: true });
  assert.equal(cr.results[0].result, 'cleaned', 'legacy worktree 可清理');
  assert.ok(!existsSync(legacyDir), 'legacy 目录被删');
});

test('placement 落位根在跨仓仓根内 → 配置错拒绝创建（FR-01 fail-closed）', () => {
  const fx = makeFixture();
  const yamlPath = join(fx.specBase, 'local.yaml');
  const baseYaml = readFileSync(yamlPath, 'utf8');

  // 形态一：placement = 跨仓仓根本身
  writeFileSync(yamlPath, baseYaml + `worktree:\n  crossPlacement:\n    front: ${fx.cross.replace(/\\/g, '/')}\n`);
  assert.throws(
    () => ensureCrossWorktrees({ cwd: fx.main, changeName: CHANGE, specBase: fx.specBase }),
    /仓根（.*）之内|落在该仓仓根/,
    '仓根本身 → 抛配置错',
  );

  // 形态二：placement = 跨仓仓根的子路径
  writeFileSync(yamlPath, baseYaml + `worktree:\n  crossPlacement:\n    front: ${(join(fx.cross, 'sub')).replace(/\\/g, '/')}/\n`);
  assert.throws(
    () => ensureCrossWorktrees({ cwd: fx.main, changeName: CHANGE, specBase: fx.specBase }),
    /仓根（.*）之内|落在该仓仓根/,
    '仓根子路径 → 抛配置错',
  );

  // 零副作用：没建 worktree 目录、没建分支、没写注册表
  assert.ok(!existsSync(join(fx.cross, `${CHANGE}--front`)), 'worktree 目录未创建');
  assert.throws(() => git(fx.cross, ['rev-parse', '--verify', `refs/heads/sillyspec/${CHANGE}`]), '分支未创建');
  assert.equal(readPlacementRegistry(fx.specBase)[`${CHANGE}--front`], undefined, '注册表无条目');
});

// ── 4. 注册表健壮性 ──

test('悬挂键 sweep + 无 meta 不入列 + 损坏注册表降级（FR-02）', () => {
  const fx = makeFixture();
  const wtDir = mkdtempSync(join(tmpdir(), 'cwpl-hang-'));
  tempDirs.push(wtDir);

  // 悬挂键：worktreePath 指向无 meta.json 的目录（模拟 remove 连目录带 meta 同亡）
  updatePlacementRegistry(fx.specBase, CHANGE, 'front', { worktreePath: wtDir, placementRoot: dirname(wtDir) });
  let swept = sweepPlacementRegistry(fx.specBase, CHANGE);
  assert.deepEqual(swept, [`${CHANGE}--front`], '悬挂键被 sweep');
  assert.equal(readPlacementRegistry(fx.specBase)[`${CHANGE}--front`], undefined);

  // 有 meta.json 的条目 sweep 不删
  writeFileSync(join(wtDir, 'meta.json'), JSON.stringify({ isCross: true, repoKey: 'front', changeName: CHANGE }));
  updatePlacementRegistry(fx.specBase, CHANGE, 'front', { worktreePath: wtDir, placementRoot: dirname(wtDir) });
  swept = sweepPlacementRegistry(fx.specBase, CHANGE);
  assert.deepEqual(swept, [], '活键不删');
  // 指向有 meta 的位置 → list 入列（注册表只供位置、meta 裁决入列）
  const listed = listCrossWorktreeMetas(fx.specBase, CHANGE);
  assert.equal(listed.length, 1, '有 meta 条目入列（合成形状由 meta 本体提供）');
  sweepPlacementRegistry(fx.specBase, CHANGE); // 清场

  // 无 meta 条目不入列（gates.js 解引用 cm.depsStatus 零 TypeError 面）
  updatePlacementRegistry(fx.specBase, CHANGE, 'front', { worktreePath: wtDir, placementRoot: dirname(wtDir) });
  rmSync(join(wtDir, 'meta.json'));
  assert.equal(listCrossWorktreeMetas(fx.specBase, CHANGE).length, 0, '无 meta 不入列');
  // resolve 回退公式（注册表键在但指向处无 meta——位置仍按注册表返回，调用方裁决）
  assert.equal(resolveCrossWorktreePath(fx.specBase, CHANGE, 'front'), wtDir);
  sweepPlacementRegistry(fx.specBase, CHANGE);

  // 损坏注册表 → 读降级 {} + resolve 回退公式
  mkdirSync(join(fx.specBase, '.runtime', 'worktrees'), { recursive: true });
  writeFileSync(placementRegistryPath(fx.specBase), '{"broken');
  assert.deepEqual(readPlacementRegistry(fx.specBase), {});
  assert.equal(
    resolveCrossWorktreePath(fx.specBase, CHANGE, 'front'),
    join(fx.specBase, '.runtime', 'worktrees', `${CHANGE}--front`),
    '损坏降级默认公式',
  );
});

test('repos 条目内联 worktree 落位 + 优先级高于 crossPlacement（repo-inline-worktree-placement）', () => {
  const placementDir = mkdtempSync(join(tmpdir(), 'cwpl-inline-'));
  const legacyDir = mkdtempSync(join(tmpdir(), 'cwpl-legacy-'));
  tempDirs.push(placementDir, legacyDir);
  const fx = makeFixture();
  // local.yaml 追加：repos.front 升级为对象条目（内联 worktree）+ legacy crossPlacement 段
  const yamlPath = join(fx.specBase, 'local.yaml');
  const baseYaml = readFileSync(yamlPath, 'utf8');
  writeFileSync(yamlPath, baseYaml
    + `worktree:\n  crossPlacement:\n    front: ${legacyDir.replace(/\\/g, '/')}\n`);
  // repos.front 字符串形态 → 对象形态（块式）
  writeFileSync(yamlPath, baseYaml.replace(
    `repos:\n  front: ${fx.cross.replace(/\\/g, '/')}\n`,
    `repos:\n  front:\n    path: ${fx.cross.replace(/\\/g, '/')}\n    worktree: ${placementDir.replace(/\\/g, '/')}\n`,
  ) + `worktree:\n  crossPlacement:\n    front: ${legacyDir.replace(/\\/g, '/')}\n`);

  const r = ensureCrossWorktrees({ cwd: fx.main, changeName: CHANGE, specBase: fx.specBase });
  assert.equal(r.created.length, 1);
  const expected = join(placementDir, `${CHANGE}--front`);
  assert.equal(r.created[0].worktreePath, expected, '内联 worktree 落位生效');
  assert.ok(!existsSync(join(legacyDir, `${CHANGE}--front`)), '内联优先——legacy crossPlacement 未生效');
  assert.ok(existsSync(join(expected, 'meta.json')), 'meta 在落位目录');
  cleanupCrossWorktrees({ cwd: fx.cross, changeName: CHANGE, specBase: fx.specBase, force: true });
});

// ── 5. WSL 分裂判定 ──

test('isWslSplit：linux /mnt 命中、非 /mnt 不命中、win32 恒 false（FR-03）', () => {
  const platform = process.platform;
  if (platform === 'linux') {
    assert.equal(isWslSplit('/mnt/e/repo', '/root/wt'), true, 'linux /mnt 仓根 + 非 /mnt worktree 命中');
    assert.equal(isWslSplit('/mnt/e/repo', '/mnt/f/wt'), false, '两侧同域不命中');
    assert.equal(isWslSplit('/home/u/repo', '/root/wt'), false, '非 /mnt 仓根不命中');
    assert.equal(isWslSplit('/mnt/repo', '/root/wt'), false, '/mnt 后非盘符不命中');
  } else {
    // win32/darwin 恒 false（不误报）
    assert.equal(isWslSplit('/mnt/e/repo', '/root/wt'), false);
    assert.equal(isWslSplit('C:/repo', 'C:/wt'), false);
  }
});
