/**
 * ql-20260915-003 —— 三个工具摩擦点修复的测试（多会话并行仓，2026-09-15 用户实证）。
 *
 * ① 坑 junction-foreign-ownership：主仓 frontend/node_modules 内 junction 指向
 *    session-export worktree 的 .pnpm（跨会话 node_modules 污染，apply 后被迫 --force 重装）。
 *    锁定语义（真目录构造，Windows junction / POSIX symlink 双平台）：
 *      - sweepForeignNodeModulesJunctions：只清 target 落在 worktreesRoot 之下的外来链接；
 *        正常包目录与指向 main node_modules 内部的 pnpm 自建链接保留；目标内容零穿透
 *      - dryRun 只报清单零写盘
 *      - onlyUnder 收窄（install 兜底前只清指向本 worktree 的）
 *      - specBase 自动读 local.yaml modules 块补子模块清单
 *      - provisionDeps install 兜底前防再犯：指向本 worktree 的外来 junction 先清再装
 *      - WorktreeManager._sweepMainForeignJunctionLinks（create/cleanup 挂点同体）
 *
 * ② 坑 cleanup-meta-fallback：cleanup 报「mode: null 跳过清理」但 worktree 实际创建过
 *    （meta 在 apply 后丢失 + 路径解析漂移 → 三缺早退误判「什么都不存在」）。锁定语义：
 *      - git worktree list 分支 sillyspec/<name> 注册路径命中 → 不早退，按命中路径清
 *        （force=false 仍被 no-meta fail-closed 拦 = blocked；force=true 真清）
 *      - resolveRuntimeRoot 口径目录命中（worktreeBase 被漂移传参带偏时）→ 按命中目录清
 *      - 全不命中 → skipped + probePaths 三路探针清单（诊断式输出数据源）
 *
 * ③ 坑 interrupted-residue-detect：中断的 execute 子代理留下半成品 import（语法坏文件），
 *    无自动检测靠人工 diff 发现。锁定语义：
 *      - writeTaskReview 代算 changedFiles 后 .js 语法检查：坏文件 → warnings 含
 *        「疑似中断残留」+ 文件名；ok 仍 true（advisory，不改 verdict）
 *      - 正常语法文件 → 零残留 warning（存量路径零变化）
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, lstatSync, readFileSync } from 'node:fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { spawnSync, execFileSync } from 'node:child_process'
import { sweepForeignNodeModulesJunctions, provisionDeps } from '../src/worktree-deps.js'
import { WorktreeManager } from '../src/worktree.js'
import { writeTaskReview } from '../src/task-review.js'

const tmpRoots = []
function mk(p) { const d = mkdtempSync(join(tmpdir(), p)); tmpRoots.push(d); return d }
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

function git(dir, args) {
  const r = spawnSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`)
  return r.stdout.trim()
}

/** 目录链接工厂：win32 junction（mklink /J，无需管理员）/ POSIX symlink（ln -s） */
function makeDirLink(linkPath, targetDir) {
  if (process.platform === 'win32') {
    execFileSync('cmd.exe', ['/c', 'mklink', '/J', linkPath, targetDir], { stdio: ['pipe', 'pipe', 'pipe'] })
  } else {
    execFileSync('ln', ['-s', targetDir, linkPath], { stdio: ['pipe', 'pipe', 'pipe'] })
  }
}
function isLink(p) { try { return lstatSync(p).isSymbolicLink() } catch { return false } }

// ══════════════════════════ 修复① junction-foreign-ownership ══════════════════════════

/** 场景工厂：临时 main（node_modules 根 + frontend 子模块）+ 伪造 worktree 目标区 + 三类链接 */
function setupJunctionScene() {
  const root = mk('jf-')
  const main = join(root, 'main-repo')
  const worktreesRoot = join(main, '.sillyspec', '.runtime', 'worktrees')
  // 伪造两个 worktree 目标（session-export 是实证里的污染目标方；wt2 是另一活跃 worktree）
  const wtA = join(worktreesRoot, 'session-export')
  const wtB = join(worktreesRoot, 'another-wt')
  mkdirSync(join(wtA, '.pnpm', 'node_modules', 'x'), { recursive: true })
  writeFileSync(join(wtA, '.pnpm', 'node_modules', 'x', 'keep.js'), 'export const keep = 1\n')
  mkdirSync(join(wtB, 'pkg'), { recursive: true })
  // main 根 node_modules：正常真实包 + pnpm 自建链接（指向 main node_modules 内部）+ 外来 junction
  mkdirSync(join(main, 'node_modules', 'real-pkg'), { recursive: true })
  writeFileSync(join(main, 'node_modules', 'real-pkg', 'index.js'), 'x')
  makeDirLink(join(main, 'node_modules', 'pnpm-style-link'), join(main, 'node_modules', 'real-pkg'))
  makeDirLink(join(main, 'node_modules', 'polluted-pkg'), join(wtA, '.pnpm'))
  // main/frontend/node_modules（子模块层）：同款外来 junction（实证里的实际位置）
  mkdirSync(join(main, 'frontend', 'node_modules', 'fe-real'), { recursive: true })
  writeFileSync(join(main, 'frontend', 'node_modules', 'fe-real', 'index.js'), 'x')
  makeDirLink(join(main, 'frontend', 'node_modules', 'fe-foreign'), join(wtA, '.pnpm'))
  makeDirLink(join(main, 'frontend', 'node_modules', 'other-wt-link'), join(wtB, 'pkg'))
  return { root, main, worktreesRoot, wtA, wtB }
}

test('修复① sweep：只清指向 worktrees 区的外来链接，正常包/内部链接/目标内容零穿透', () => {
  const { main, worktreesRoot, wtA } = setupJunctionScene()
  const r = sweepForeignNodeModulesJunctions(main, {
    worktreesRoot,
    submodules: ['frontend'],
  })
  assert.deepEqual(r.removed.map(x => x.link).sort(), [
    join(main, 'frontend', 'node_modules', 'fe-foreign'),
    join(main, 'frontend', 'node_modules', 'other-wt-link'),
    join(main, 'node_modules', 'polluted-pkg'),
  ].sort(), '根 + 子模块层的外来 junction 全清（指向任一 worktree 都算外来）')
  assert.equal(r.failed.length, 0, '无清理失败')
  // 正常面保留
  assert.ok(existsSync(join(main, 'node_modules', 'real-pkg', 'index.js')), '正常包目录保留')
  assert.ok(isLink(join(main, 'node_modules', 'pnpm-style-link')), '指向 main node_modules 内部的 pnpm 自建链接保留（非外来）')
  assert.ok(existsSync(join(main, 'frontend', 'node_modules', 'fe-real', 'index.js')), '子模块正常包保留')
  // 删除不穿透：worktree 目标内容原封不动（rmdir 删 junction 不跟随 reparse）
  assert.ok(existsSync(join(wtA, '.pnpm', 'node_modules', 'x', 'keep.js')), '外来 junction 已删但目标内容零穿透')
  assert.ok(!isLink(join(main, 'node_modules', 'polluted-pkg')), '外来 junction 目录项已移除')
})

test('修复① sweep dryRun：只报清单零写盘；onlyUnder 收窄只清指定 worktree 的', () => {
  const { main, worktreesRoot, wtA } = setupJunctionScene()

  // dryRun：报出全部外来（根 1 + 子模块 2），零改动
  const dry = sweepForeignNodeModulesJunctions(main, { worktreesRoot, submodules: ['frontend'], dryRun: true })
  assert.equal(dry.foreign.length, 3, `dryRun 报出 3 个外来（实际 ${JSON.stringify(dry.foreign)}）`)
  assert.equal(dry.removed.length, 0, 'dryRun 零删除')
  assert.ok(isLink(join(main, 'node_modules', 'polluted-pkg')), 'dryRun 后外来 junction 仍在（未写盘）')

  // onlyUnder=wtA：只清指向 session-export 的（fe-foreign + polluted-pkg），another-wt 的保留
  const r = sweepForeignNodeModulesJunctions(main, { worktreesRoot, submodules: ['frontend'], onlyUnder: wtA })
  assert.equal(r.removed.length, 2, `onlyUnder 只清指向本 worktree 的（实际 ${r.removed.length}）`)
  assert.ok(isLink(join(main, 'frontend', 'node_modules', 'other-wt-link')), '指向另一 worktree 的链接在 onlyUnder 口径下保留')
})

test('修复① sweep specBase 自动读 local.yaml modules 块（等价 submodules 直传）', () => {
  const { main, worktreesRoot } = setupJunctionScene()
  const specBase = join(main, '.sillyspec')
  writeFileSync(join(specBase, 'local.yaml'), 'modules:\n  frontend: { path: "frontend/" }\n')
  const r = sweepForeignNodeModulesJunctions(main, { worktreesRoot, specBase })
  assert.deepEqual(r.removed.map(x => x.link).sort(), [
    join(main, 'frontend', 'node_modules', 'fe-foreign'),
    join(main, 'frontend', 'node_modules', 'other-wt-link'),
    join(main, 'node_modules', 'polluted-pkg'),
  ].sort(), 'specBase 口径清全部 3 个外来（无 onlyUnder 收窄）')
})

test('修复① provisionDeps install 兜底前防再犯：指向本 worktree 的外来 junction 先清再装', () => {
  const root = mk('jf-install-')
  const main = join(root, 'main-repo')
  const wtRoot = join(main, '.sillyspec', '.runtime', 'worktrees')
  const wt = join(wtRoot, 'c1')           // 本次供给的 worktree（须在约定 worktrees 区下）
  const wtOther = join(wtRoot, 'c2')      // 另一 worktree（onlyUnder 口径外，保留）
  mkdirSync(join(wt, 'src'), { recursive: true })
  mkdirSync(join(wtOther, 'pkg'), { recursive: true })
  mkdirSync(join(main, 'node_modules', 'legit-pkg'), { recursive: true })
  writeFileSync(join(main, 'node_modules', 'legit-pkg', 'index.js'), 'x')
  makeDirLink(join(main, 'node_modules', 'evil-to-c1'), join(wt, 'src'))
  makeDirLink(join(main, 'node_modules', 'other-to-c2'), join(wtOther, 'pkg'))
  // lockfile 不一致 → 跳过 link 快路径落 install 兜底；commands.install 用白名单内速退命令
  const specBase = join(main, '.sillyspec')
  mkdirSync(specBase, { recursive: true })
  writeFileSync(join(specBase, 'local.yaml'), 'commands:\n  install: "npm --version"\n')
  writeFileSync(join(main, 'pnpm-lock.yaml'), 'lockversion: 1\n')
  writeFileSync(join(main, 'package.json'), '{"name":"main"}')
  writeFileSync(join(wt, 'pnpm-lock.yaml'), 'lockversion: 2\n')
  writeFileSync(join(wt, 'package.json'), '{"name":"wt"}')

  const r = provisionDeps(wt, main, { specBase })
  assert.ok(!isLink(join(main, 'node_modules', 'evil-to-c1')), '指向本 worktree 的外来 junction 在 install 前被清')
  assert.ok(isLink(join(main, 'node_modules', 'other-to-c2')), '指向其他 worktree 的链接不在 install 前清理面（onlyUnder 收窄）')
  assert.ok(existsSync(join(main, 'node_modules', 'legit-pkg', 'index.js')), 'main 正常包不受影响')
  assert.equal(r.depsStatus, 'installed', `install 兜底正常完成（实际 ${r.depsStatus}: ${r.depsError || ''}）`)
})

test('修复① WorktreeManager._sweepMainForeignJunctionLinks（create/cleanup 挂点同体）：清外来 + warn', () => {
  const { main } = setupJunctionScene()
  const wm = new WorktreeManager({ cwd: main }) // 无 git 环境 → worktreeBase=main/.sillyspec/.runtime/worktrees（约定区）
  const warns = []
  const origWarn = console.warn
  console.warn = (...a) => warns.push(a.join(' '))
  let sweep
  try {
    sweep = wm._sweepMainForeignJunctionLinks('test-hook')
  } finally {
    console.warn = origWarn
  }
  assert.ok(sweep.removed.length >= 1, `挂点清扫清掉外来 junction（实际 ${sweep.removed.length}）`)
  assert.ok(warns.some(w => w.includes('已移除') && w.includes('外来 junction')), `warn 文案含移除数与坑名（实际 ${JSON.stringify(warns)}）`)
})

// ══════════════════════════ 修复② cleanup-meta-fallback ══════════════════════════

function setupRepo(prefix) {
  const proj = mk(prefix)
  git(proj, ['init', '-q'])
  git(proj, ['config', 'user.email', 't@t.local']); git(proj, ['config', 'user.name', 't'])
  writeFileSync(join(proj, '.gitignore'), '.sillyspec/\n')
  writeFileSync(join(proj, 'a.txt'), 'base\n')
  git(proj, ['add', '.']); git(proj, ['commit', '-q', '-m', 'base'])
  return proj
}

test('修复② 探针(a) git 注册命中：meta 缺失 + 标准路径缺失，cleanup 仍按注册路径清理（force）', () => {
  const proj = setupRepo('cmf-git-')
  // 真实注册的 worktree（分支 sillyspec/c1）挂在标准 worktrees 区之外——模拟 meta 丢失 +
  // 目录在别处：旧实现三缺早退「mode: null 跳过清理」，注册与分支永久残留
  const ext = join(mk('cmf-git-ext-'), 'ext-wt')
  git(proj, ['worktree', 'add', '-q', ext, '-b', 'sillyspec/c1'])
  writeFileSync(join(ext, 'deliver.ts'), 'export const wt = 1\n') // worktree 内产物（未 commit）

  const wm = new WorktreeManager({ cwd: proj })
  // force=false：no-meta fail-closed 保守拦截（语义不变，只是从「跳过」变「blocked」可见）
  const blocked = wm.cleanup('c1')
  assert.equal(blocked.result, 'blocked', `meta 缺失 force=false 保守拦截（实际 ${blocked.result}）`)

  // force=true：探针命中 → 按注册路径真清
  const r = wm.cleanup('c1', { force: true })
  assert.equal(r.result, 'cleaned', `按 git 注册路径清理成功（实际 ${r.result}: ${(r.details || []).join('; ')}）`)
  assert.ok((r.details || []).some(d => d.includes('探测兜底') && d.includes('git worktree list')), 'details 记录兜底命中依据')
  assert.ok(!existsSync(ext), '外部 worktree 目录已删')
  const regLeft = git(proj, ['worktree', 'list', '--porcelain'])
  assert.ok(!regLeft.includes('sillyspec/c1'), 'git 注册已随 remove+prune 清除')
  assert.equal(git(proj, ['branch', '--list', 'sillyspec/c1']), '', '分支已删')
})

test('修复② 探针(b) runtimeRoot 口径命中：worktreeBase 漂移时按命中目录清理', () => {
  const proj = setupRepo('cmf-drift-')
  // 漂移形态：WorktreeManager 被显式 worktreeDir 带偏（altBase），真实目录在 cwd/.sillyspec
  // 的 resolveRuntimeRoot 口径下——旧实现 getWorktreePath 解析到 altBase 下三缺早退
  const realDir = join(proj, '.sillyspec', '.runtime', 'worktrees', 'c2')
  mkdirSync(realDir, { recursive: true })
  writeFileSync(join(realDir, 'leftover.js'), 'export const orphan = 1\n')
  const altBase = join(mk('cmf-drift-alt-'), 'worktrees')
  const wm = new WorktreeManager({ cwd: proj, worktreeDir: altBase })

  const r = wm.cleanup('c2', { force: true })
  assert.ok(['cleaned', 'force-cleaned'].includes(r.result), `按 runtimeRoot 口径目录清理（实际 ${r.result}: ${(r.details || []).join('; ')}）`)
  assert.ok((r.details || []).some(d => d.includes('探测兜底') && d.includes('resolveRuntimeRoot')), 'details 记录兜底命中依据')
  assert.ok(!existsSync(realDir), '漂移目录已删')
})

test('修复② 全不命中：skipped 携带三路探针清单（诊断式输出数据源），零动作', () => {
  const proj = setupRepo('cmf-miss-')
  const wm = new WorktreeManager({ cwd: proj })
  const r = wm.cleanup('c9', { force: true })
  assert.equal(r.result, 'skipped', '真什么都不存在 → 仍跳过（幂等零回归）')
  assert.equal(r.mode, null, 'mode null 保留')
  assert.ok(Array.isArray(r.probePaths) && r.probePaths.length >= 3, `probePaths 三路探针（实际 ${JSON.stringify(r.probePaths)}）`)
  assert.ok(r.probePaths.some(p => p.includes('git worktree list') || p.includes('git 分支探针')), '含 git 注册探针描述')
  assert.ok(r.probePaths.some(p => p.includes('runtimeRoot') || p.includes('resolveRuntimeRoot')), '含 runtimeRoot 口径探针描述')
  assert.ok(r.probePaths.some(p => p.includes('getWorktreePath')), '含标准路径探针描述')
})

// ══════════════════════════ 修复③ interrupted-residue-detect ══════════════════════════

/** fixture：git 仓 + change/task 卡 + in-place 式 meta + 未提交 src/foo.js（可指定内容） */
function setupReviewRepo(prefix, cn, fooContent) {
  const proj = setupRepo(prefix)
  const specBase = join(proj, '.sillyspec')
  const changeDir = join(specBase, 'changes', cn)
  mkdirSync(join(changeDir, 'tasks'), { recursive: true })
  writeFileSync(join(changeDir, 'tasks', 'task-01.md'),
    '---\ntask: task-01\ngoal: 测试任务\nallowed_paths:\n  - src/foo.js\n---\n\n# task-01\n')
  const c1 = git(proj, ['rev-parse', 'HEAD'])
  mkdirSync(join(proj, 'src'), { recursive: true })
  writeFileSync(join(proj, 'src', 'foo.js'), fooContent)
  const metaDir = join(specBase, '.runtime', 'worktrees', cn)
  mkdirSync(metaDir, { recursive: true })
  writeFileSync(join(metaDir, 'meta.json'), JSON.stringify({
    branch: 'main', worktreePath: proj, baseHash: c1, baselineCommit: c1, mode: 'in-place',
  }))
  return { proj, specBase }
}

test('修复③ 坏 import 半成品 → review write warning 含「疑似中断残留」与文件名（ok 仍 true）', async () => {
  const { proj, specBase } = setupReviewRepo('ird-bad-', '2026-09-15-ird-bad',
    'import x from "y"\nexport const a = \n') // 中断的半成品 import（语法坏）
  const r = await writeTaskReview({
    changeName: '2026-09-15-ird-bad', cwd: proj, taskId: 'task-01',
    specVerdict: 'pass', qualityVerdict: 'pass',
  })
  assert.equal(r.ok, true, 'advisory 不改落盘语义（ok 仍 true）')
  const hit = r.warnings.find(w => w.includes('疑似中断残留'))
  assert.ok(hit, `warnings 含疑似中断残留（实际 ${JSON.stringify(r.warnings)}）`)
  assert.ok(hit.includes('src/foo.js'), 'warning 点名坏文件')
  assert.ok(hit.includes('SyntaxError'), 'warning 带语法错误首行')
  // 落盘的 review.json 不含检测注记（只进 CLI warnings，不污染评审数据）
  const review = JSON.parse(readFileSync(r.reviewPath, 'utf8'))
  assert.ok(review.changedFiles.includes('src/foo.js'), 'changedFiles 正常落盘')
})

test('修复③ 正常语法文件 → 零残留 warning（存量路径零变化）', async () => {
  const { proj } = setupReviewRepo('ird-ok-', '2026-09-15-ird-ok',
    'import x from "y"\nexport const a = 1\n')
  const r = await writeTaskReview({
    changeName: '2026-09-15-ird-ok', cwd: proj, taskId: 'task-01',
    specVerdict: 'pass', qualityVerdict: 'pass',
  })
  assert.equal(r.ok, true, '正常路径 ok')
  assert.ok(!r.warnings.some(w => w.includes('疑似中断残留')), `正常语法文件零残留 warning（实际 ${JSON.stringify(r.warnings)}）`)
})
