/**
 * 跨仓 verify 集成测试 — W2 task-06 / D-004 / design §5.4 + §6 A6 + §9
 *
 * 覆盖 design §6 测试清单「跨仓仓 npm test per-repo cwd / 无 package.json 跳过 warn /
 * 跨仓不参与 module 子集」+ acceptance：
 *   1. 跨仓仓有 package.json → 在该仓 projectRoot cwd 跑 npm test（per-repo cwd）
 *   2. 跨仓仓无 package.json → 跳过 + warn，不阻断 verify（design §9 兼容策略）
 *   3. 跨仓仓不参与 module 子集策略（跨仓仓只跑 full npm test，无 module 映射）
 *   4. 单仓 ctx（无跨仓 entry）→ 零回归（主仓行为不变）
 *   5. 任一跨仓仓 fail → 整体 fail（结果合并语义）
 *   6. resolveVerifyChangedFiles：ctx per-repo 取 diff 合并（design §6 行 136 字面契约）
 *   7. resolveVerifyChangedFiles：ctx 缺省 → 单仓原逻辑零回归
 *
 * 真实 MultiRepoContext 实例（task-01）+ 真实 git 临时仓 + 跨仓仓 package.json +
 * local.yaml commands.test 用 echo 模拟（避免依赖真实 npm install）。
 *
 * 依据：design.md §5.4 / §6 (verify-postcheck) / §9 兼容策略 / decisions.md D-004 /
 *       tasks/task-06.md acceptance。
 */
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execSync } from 'node:child_process'
import { MultiRepoContext } from '../src/run/multi-repo-context.js'
import { runVerifyTestCheck, resolveVerifyChangedFiles } from '../src/verify-postcheck.js'

const tempDirs = []

/**
 * 建临时 git 仓（含初始 commit），返回仓根绝对路径。
 * @param {boolean} withPackageJson - 是否在仓根写 package.json
 */
function makeRepo(withPackageJson = false, testCmd = null) {
  const d = mkdtempSync(join(tmpdir(), 'cross-verify-'))
  tempDirs.push(d)
  execSync('git init -q', { cwd: d, stdio: 'pipe' })
  execSync('git config user.email t@t.com', { cwd: d, stdio: 'pipe' })
  execSync('git config user.name t', { cwd: d, stdio: 'pipe' })
  execSync('git config commit.gpgsign false', { cwd: d, stdio: 'pipe' })
  writeFileSync(join(d, 'README.md'), 'init\n')
  if (withPackageJson) {
    writeFileSync(join(d, 'package.json'), JSON.stringify({
      name: 'cross-repo-fixture',
      version: '1.0.0',
      scripts: { test: testCmd || 'node -e "console.log(\'cross ok\')"' },
    }) + '\n')
  }
  execSync('git add .', { cwd: d, stdio: 'pipe' })
  execSync('git commit -q -m init', { cwd: d, stdio: 'pipe' })
  return d
}

/** 在仓根写 .sillyspec/local.yaml（配 commands.test）。命令需避免含单引号（extractTestCommand bare 正则会截断）。 */
function writeLocalYaml(repoRoot, testCmd) {
  mkdirSync(join(repoRoot, '.sillyspec'), { recursive: true })
  writeFileSync(join(repoRoot, '.sillyspec', 'local.yaml'),
    `commands:\n  test: ${testCmd}\n`)
}

/** 在仓根写 worktree meta.json（resolveVerifyChangedFiles 读文件系统，不走 wm）。 */
function writeMeta(repoRoot, change, meta) {
  const metaDir = join(repoRoot, '.sillyspec', '.runtime', 'worktrees', change)
  mkdirSync(metaDir, { recursive: true })
  writeFileSync(join(metaDir, 'meta.json'), JSON.stringify(meta))
}

/** stub WorktreeManager：只暴露 getMeta，按 metaMap 返回预设 meta。 */
function makeWm(metaMap) {
  return { getMeta: (name) => metaMap.get(name) || null }
}

after(() => {
  for (const d of tempDirs) {
    try { rmSync(d, { recursive: true, force: true }) } catch { /* Windows EPERM best-effort */ }
  }
})

// ──────────────────────────────────────────────────────────────────────────
// 1. 跨仓仓有 package.json → per-repo cwd 跑 npm test（design §6 A6 / D-004）
// ──────────────────────────────────────────────────────────────────────────
test('跨仓仓有 package.json：在该仓 projectRoot cwd 跑 npm test，结果合并 PASS', () => {
  const mainRepo = makeRepo(false)
  // 跨仓仓 package.json scripts.test 用简单 echo（避免单引号干扰 extractTestCommand）
  const crossRepo = makeRepo(true, 'echo cross-pass')
  // 主仓 local.yaml：echo 通过
  writeLocalYaml(mainRepo, 'echo main-ok')

  const baseHash = execSync('git rev-parse HEAD', { cwd: mainRepo, encoding: 'utf8' }).trim()
  const wm = makeWm(new Map([['c1', { mode: 'worktree', worktreePath: mainRepo, baseHash }]]))
  const ctx = new MultiRepoContext({
    cwd: mainRepo, changeName: 'c1', declaredRepos: ['main', 'crossA'],
    repoRegistry: new Map([['crossA', crossRepo]]),
    worktreeManager: wm,
  })

  const result = runVerifyTestCheck({
    cwd: mainRepo,
    specBase: join(mainRepo, '.sillyspec'),
    changeName: 'c1',
    ctx,
  })

  assert.equal(result.status, 'passed', `主仓 + 跨仓仓均通过 → 整体 passed（actual: ${result.status} / ${result.reason}）`)
  // 跨仓仓测试被执行（mode 标记合并）
  assert.ok(result.mode && result.mode.includes('cross-repo'),
    `mode 应含 cross-repo 标记（actual: ${result.mode}）`)
  // 跨仓仓输出附入 outputTail
  assert.ok((result.outputTail || '').includes('crossA'),
    `outputTail 应含跨仓仓 crossA 标识（actual tail 末段：${(result.outputTail || '').slice(-200)}）`)
})

// ──────────────────────────────────────────────────────────────────────────
// 2. 跨仓仓无 package.json → 跳过 + warn，不阻断 verify（design §9 兼容策略）
// ──────────────────────────────────────────────────────────────────────────
test('跨仓仓无 package.json：跳过 + warn，主仓通过则整体通过', () => {
  const mainRepo = makeRepo(false)
  const crossRepo = makeRepo(false) // 跨仓仓无 package.json
  writeLocalYaml(mainRepo, 'echo main-ok')

  const baseHash = execSync('git rev-parse HEAD', { cwd: mainRepo, encoding: 'utf8' }).trim()
  const wm = makeWm(new Map([['c1', { mode: 'worktree', worktreePath: mainRepo, baseHash }]]))
  const ctx = new MultiRepoContext({
    cwd: mainRepo, changeName: 'c1', declaredRepos: ['main', 'crossB'],
    repoRegistry: new Map([['crossB', crossRepo]]),
    worktreeManager: wm,
  })

  const result = runVerifyTestCheck({
    cwd: mainRepo,
    specBase: join(mainRepo, '.sillyspec'),
    changeName: 'c1',
    ctx,
  })

  // 主仓通过、跨仓仓跳过 → 整体不应 fail（warn 不阻断 design §9）
  assert.notEqual(result.status, 'failed',
    `跨仓仓无 package.json 跳过不应致整体 fail（actual: ${result.status} / ${result.reason}）`)
  // outputTail 含跨仓仓 SKIP 标记
  assert.ok((result.outputTail || '').includes('crossB') && (result.outputTail || '').includes('SKIP'),
    `outputTail 应含 crossB + SKIP 标记（actual: ${(result.outputTail || '').slice(-200)}）`)
})

// ──────────────────────────────────────────────────────────────────────────
// 3. 跨仓仓不参与 module 子集策略（design §6 + §5.4）
// ──────────────────────────────────────────────────────────────────────────
test('跨仓仓不参与 module 子集：主仓 test_strategy:module 命中走子集，跨仓仓仍跑 full npm test', () => {
  const mainRepo = makeRepo(false)
  const crossRepo = makeRepo(true, 'echo cross-module-subset-pass')

  // 主仓 local.yaml：test_strategy:module + 一个 backend 模块 + commands.test 兜底
  mkdirSync(join(mainRepo, '.sillyspec'), { recursive: true })
  writeFileSync(join(mainRepo, '.sillyspec', 'local.yaml'),
    `test_strategy: module\n` +
    `modules:\n` +
    `  backend: { path: "backend/", test: "echo main-backend-subset" }\n` +
    `commands:\n  test: echo main-full-fallback\n`)

  // 主仓造一个 backend/ 改动（命中 module），跨仓仓改动与主仓 module 无关
  const baseHash = execSync('git rev-parse HEAD', { cwd: mainRepo, encoding: 'utf8' }).trim()
  mkdirSync(join(mainRepo, 'backend'), { recursive: true })
  writeFileSync(join(mainRepo, 'backend', 'foo.js'), 'x')
  execSync('git add . && git commit -q -m backend-change', { cwd: mainRepo, stdio: 'pipe' })

  // resolveVerifyChangedFiles 读 meta.json 文件（不走 wm），需落盘
  writeMeta(mainRepo, 'c1', { mode: 'worktree', worktreePath: mainRepo, baseHash })

  const wm = makeWm(new Map([['c1', { mode: 'worktree', worktreePath: mainRepo, baseHash }]]))
  const ctx = new MultiRepoContext({
    cwd: mainRepo, changeName: 'c1', declaredRepos: ['main', 'crossC'],
    repoRegistry: new Map([['crossC', crossRepo]]),
    worktreeManager: wm,
  })

  const result = runVerifyTestCheck({
    cwd: mainRepo,
    specBase: join(mainRepo, '.sillyspec'),
    changeName: 'c1',
    ctx,
  })

  // 主仓 module-subset 通过 + 跨仓仓 full npm test 通过 → 整体 passed
  assert.equal(result.status, 'passed',
    `主仓 module-subset + 跨仓仓 full 均通过 → 整体 passed（actual: ${result.status} / ${result.reason}）`)
  // 主仓走 module-subset（不被跨仓路径污染成全量）
  assert.ok(result.mode && result.mode.includes('module-subset'),
    `主仓应走 module-subset（跨仓不污染 module 子集判定）（actual mode: ${result.mode}）`)
  // 跨仓仓执行了 full npm test（mode 含 cross-repo 标记 + outputTail 含 crossC）
  assert.ok((result.outputTail || '').includes('crossC'),
    `跨仓仓 crossC 应执行 full npm test 并附入 outputTail（actual: ${(result.outputTail || '').slice(-200)}）`)
})

// ──────────────────────────────────────────────────────────────────────────
// 4. 单仓 ctx（无跨仓 entry）→ 零回归（GOAL-2 / design §9）
// ──────────────────────────────────────────────────────────────────────────
test('单仓 ctx：无跨仓 entry → 行为与不传 ctx 等价（零回归）', () => {
  const mainRepo = makeRepo(false)
  writeLocalYaml(mainRepo, 'echo solo-ok')

  const baseHash = execSync('git rev-parse HEAD', { cwd: mainRepo, encoding: 'utf8' }).trim()
  const wm = makeWm(new Map([['c1', { mode: 'worktree', worktreePath: mainRepo, baseHash }]]))
  const ctx = new MultiRepoContext({
    cwd: mainRepo, changeName: 'c1', declaredRepos: ['main'],
    repoRegistry: new Map(),
    worktreeManager: wm,
  })

  const withCtx = runVerifyTestCheck({
    cwd: mainRepo,
    specBase: join(mainRepo, '.sillyspec'),
    changeName: 'c1',
    ctx,
  })
  const withoutCtx = runVerifyTestCheck({
    cwd: mainRepo,
    specBase: join(mainRepo, '.sillyspec'),
    changeName: 'c1',
    // ctx 缺省
  })

  assert.equal(withCtx.status, withoutCtx.status,
    `单仓 ctx 与无 ctx status 应一致（actual: ${withCtx.status} vs ${withoutCtx.status}）`)
  assert.equal(withCtx.command, withoutCtx.command,
    `单仓 ctx 与无 ctx command 应一致（零回归）`)
  // 单仓 ctx 不引入 cross-repo 标记
  assert.ok(!withCtx.mode || !withCtx.mode.includes('cross-repo'),
    `单仓 ctx mode 不应含 cross-repo 标记（actual: ${withCtx.mode}）`)
})

// ──────────────────────────────────────────────────────────────────────────
// 5. 任一跨仓仓 fail → 整体 fail（结果合并语义，design §6 A6）
// ──────────────────────────────────────────────────────────────────────────
test('跨仓仓 npm test fail → 整体 fail（主仓 PASS 不能掩盖跨仓真实失败）', () => {
  const mainRepo = makeRepo(false)
  // 跨仓仓 package.json 配退出码 1 的 test 脚本
  const crossRepo = makeRepo(true, 'echo cross-fail && exit 1')
  writeLocalYaml(mainRepo, 'echo main-ok')

  const baseHash = execSync('git rev-parse HEAD', { cwd: mainRepo, encoding: 'utf8' }).trim()
  const wm = makeWm(new Map([['c1', { mode: 'worktree', worktreePath: mainRepo, baseHash }]]))
  const ctx = new MultiRepoContext({
    cwd: mainRepo, changeName: 'c1', declaredRepos: ['main', 'crossF'],
    repoRegistry: new Map([['crossF', crossRepo]]),
    worktreeManager: wm,
  })

  const result = runVerifyTestCheck({
    cwd: mainRepo,
    specBase: join(mainRepo, '.sillyspec'),
    changeName: 'c1',
    ctx,
  })

  assert.equal(result.status, 'failed',
    `跨仓仓 fail → 整体 fail（actual: ${result.status}）`)
  assert.ok((result.reason || '').includes('crossF'),
    `fail reason 应点出失败跨仓仓 crossF（actual: ${result.reason}）`)
})

// ──────────────────────────────────────────────────────────────────────────
// 6. resolveVerifyChangedFiles：ctx per-repo 取 diff 合并（design §6 行 136）
// ──────────────────────────────────────────────────────────────────────────
test('resolveVerifyChangedFiles(ctx)：主仓 + 跨仓仓 diff 合并去重', () => {
  const mainRepo = makeRepo(false)
  const crossRepo = makeRepo(false)

  // 主仓改动
  const baseHash = execSync('git rev-parse HEAD', { cwd: mainRepo, encoding: 'utf8' }).trim()
  writeFileSync(join(mainRepo, 'main-file.js'), 'x')
  // 跨仓仓改动（相对跨仓仓根）
  writeFileSync(join(crossRepo, 'cross-file.js'), 'y')
  execSync('git add . && git commit -q -m changes', { cwd: mainRepo, stdio: 'pipe' })
  execSync('git add . && git commit -q -m changes', { cwd: crossRepo, stdio: 'pipe' })

  // resolveVerifyChangedFiles 读 meta.json 文件（不走 wm），需落盘
  writeMeta(mainRepo, 'c1', { mode: 'worktree', worktreePath: mainRepo, baseHash })

  const wm = makeWm(new Map([['c1', { mode: 'worktree', worktreePath: mainRepo, baseHash }]]))
  const ctx = new MultiRepoContext({
    cwd: mainRepo, changeName: 'c1', declaredRepos: ['main', 'crossG'],
    repoRegistry: new Map([['crossG', crossRepo]]),
    worktreeManager: wm,
  })

  const merged = resolveVerifyChangedFiles(mainRepo, 'c1', ctx)
  assert.ok(Array.isArray(merged), `合并 diff 应返回数组（actual: ${JSON.stringify(merged)}）`)
  assert.ok(merged.includes('main-file.js'),
    `合并 diff 应含主仓改动 main-file.js（actual: ${JSON.stringify(merged)}）`)
  assert.ok(merged.includes('cross-file.js'),
    `合并 diff 应含跨仓仓改动 cross-file.js（actual: ${JSON.stringify(merged)}）`)
})

// ──────────────────────────────────────────────────────────────────────────
// 7. resolveVerifyChangedFiles：ctx 缺省 → 单仓原逻辑零回归
// ──────────────────────────────────────────────────────────────────────────
test('resolveVerifyChangedFiles 无 ctx：单仓原逻辑零回归（不读跨仓）', () => {
  const mainRepo = makeRepo(false)
  const crossRepo = makeRepo(false)

  writeFileSync(join(mainRepo, 'main-only.js'), 'x')
  writeFileSync(join(crossRepo, 'cross-only.js'), 'y')
  execSync('git add . && git commit -q -m m', { cwd: mainRepo, stdio: 'pipe' })
  execSync('git add . && git commit -q -m c', { cwd: crossRepo, stdio: 'pipe' })

  const baseHash = execSync('git rev-parse HEAD~1', { cwd: mainRepo, encoding: 'utf8' }).trim()
  // 主仓 meta（worktree 模式 + baseHash）
  mkdirSync(join(mainRepo, '.sillyspec', '.runtime', 'worktrees', 'c1'), { recursive: true })
  writeFileSync(join(mainRepo, '.sillyspec', '.runtime', 'worktrees', 'c1', 'meta.json'),
    JSON.stringify({ mode: 'worktree', worktreePath: mainRepo, baseHash }))

  // 不传 ctx → 仅主仓 diff，绝不含跨仓仓文件
  const files = resolveVerifyChangedFiles(mainRepo, 'c1')
  assert.ok(Array.isArray(files) && files.includes('main-only.js'),
    `应返回主仓 diff（actual: ${JSON.stringify(files)}）`)
  assert.ok(!files.includes('cross-only.js'),
    `无 ctx 不应合并跨仓仓文件（actual: ${JSON.stringify(files)}）`)
})

// ──────────────────────────────────────────────────────────────────────────
// 8. ctx 为 null（显式传 null）→ 与缺省等价零回归（防御契约）
// ──────────────────────────────────────────────────────────────────────────
test('runVerifyTestCheck ctx=null：与不传 ctx 等价（显式 null 防御）', () => {
  const mainRepo = makeRepo(false)
  writeLocalYaml(mainRepo, 'echo null-ctx-ok')

  const baseHash = execSync('git rev-parse HEAD', { cwd: mainRepo, encoding: 'utf8' }).trim()
  const wm = makeWm(new Map([['c1', { mode: 'worktree', worktreePath: mainRepo, baseHash }]]))

  const r1 = runVerifyTestCheck({
    cwd: mainRepo, specBase: join(mainRepo, '.sillyspec'), changeName: 'c1', ctx: null,
  })
  const r2 = runVerifyTestCheck({
    cwd: mainRepo, specBase: join(mainRepo, '.sillyspec'), changeName: 'c1',
  })
  assert.equal(r1.status, r2.status, `ctx=null 与缺省等价（actual: ${r1.status} vs ${r2.status}）`)
  assert.equal(r1.command, r2.command, `ctx=null 与缺省 command 等价（零回归）`)
  // 验证 wm 不会被误用（这里只是确认 r1 可用）
  assert.ok(wm.getMeta('c1'), 'wm fixture 正常')
})
