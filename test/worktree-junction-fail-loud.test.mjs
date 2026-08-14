/**
 * worktree-junction-fail-loud.test.mjs — review-2026-08-09 #4 / task-03
 *
 * 锁住 cleanup / _doctorReprovision 的 junction 解链 fail-loud（D-001@v1 / D-002@v1）：
 *   - src/worktree.js cleanup(:738-763)：lstatSync EPERM + 解链失败均 throw（该段无外层 try/catch，
 *     throw 传播出 cleanup → 跳过后续 :767 git worktree remove，保护主仓 node_modules 不被跟随误删）。
 *   - src/worktree.js _doctorReprovision(:867-909)：lstatSync EPERM + 解链失败均 throw，但整段在
 *     :868 外层 try 内 → 被 :906 catch 兜底成 { ok:false, msg:'re-provision failed...' }，
 *     且 :896 provisionDeps 不被调（D-002@v1 核心：避免经 junction 误改主仓 node_modules）。
 *
 * 用例（7 个，覆盖 task-03.md acceptance）：
 *   1. cleanup lstatSync EPERM → throw「junction 检测失败」+ git worktree remove 未被调（execSync 计数 0）。
 *   2. cleanup 解链失败（真 junction + execSync 抛）→ throw「解链失败」+ throw 在 git remove 前传播。
 *   3. cleanup 正常 junction（lstat 真 link + execSync 成功）→ 不 throw，details 含「junction/symlink removed」。
 *   4. cleanup 非 junction（lstat 非 link）→ 不解链、不 throw，正常流转。
 *   5. _doctorReprovision lstatSync EPERM → { ok:false } + provisionDeps 未调（计数 0）。
 *   6. _doctorReprovision 解链失败 → { ok:false } + provisionDeps 未调（计数 0）。
 *   7.（bonus）_doctorReprovision 正常 junction → provisionDeps 被调一次 + { ok:true }。
 *
 * mock 策略（ESM 同模块函数不可直接赋值 mock，参考 test/stage-completion-atomicity.test.mjs）：
 *   - node:test 的 mock.module（Node v24 签名 mock.module(specifier, { exports })；旧 namedExports 已废弃），
 *     传 { exports: { ...realNamespace, <target>: wrapper } }（spread 真实命名导出 + 仅覆盖目标）。
 *   - mock 三个 worktree.js 直接依赖的 specifier：
 *       * 'fs'           → 仅覆盖 lstatSync（existsSync / mkdirSync / rmSync / writeFileSync 等保留真实，
 *                          fs-atomic.js 的 writeAtomicSync 经 bare 'fs' 也拿真实 writeFileSync/renameSync）。
 *       * 'child_process' → 仅覆盖 execSync（junction 解链用 execSync rmdir；计数 wrapper）。
 *                          注意 git-helper.js 用的是 'node:child_process' 的 execFileSync（不同 specifier，
 *                          不被本 mock 影响），故 git()/gitQuiet() 仍跑真实 git —— cleanup 成功用例里
 *                          git worktree remove 在 tmp 目录（非 git 仓）失败被 catch，不影响断言。
 *       * '../src/worktree-deps.js' → 仅覆盖 provisionDeps（计数；默认返回 {} 模拟 install 成功，
 *                          避免真跑 npm install 有副作用）。
 *   - wrapper 闭包到模块级「可变 impl」（let），每用例切换 impl（抛 / 返回 link / 返回非 link）。
 *   - 时序：先 await import 捕获 real 命名空间（缓存），再 mock.module 注册，最后 await import worktree.js
 *     （此后解析到的 fs/child_process/worktree-deps 走 mock cache，WorktreeManager 绑定 wrapper）。
 *
 * 隔离：每用例独立 tmpBase（mkdtempSync）+ 其下 demo/node_modules 空目录；构造 WorktreeManager 时
 *   传 worktreeDir=tmpBase 绕开 _resolveMainRepoRoot 的 git 调用，getWorktreePath('demo')=tmpBase/demo。
 *   mock execSync 默认 no-op（不真跑 cmd.exe rmdir），绝不碰真实 junction。
 *
 * 运行：node test/worktree-junction-fail-loud.test.mjs（裸跑）。mock.module 需
 *   --experimental-test-module-mocks 旗标；本文件若发现 mock.module 不可用，则用该旗标自举 respawn
 *   自己一次（env sentinel 防循环），使裸跑命令与 npm test（run-tests.mjs 不带旗标 spawn）均能正常工作。
 */
import { mock } from 'node:test'
import { spawnSync } from 'node:child_process'

// 自举：mock.module 需 --experimental-test-module-mocks，裸跑时 respawn 自己一次
if (typeof mock.module !== 'function') {
  if (process.env.SILLYSPEC_MOCK_RESPAWNED === '1') {
    console.error('mock.module 在加旗标 respawn 后仍不可用，放弃')
    process.exit(1)
  }
  const r = spawnSync(process.execPath,
    ['--experimental-test-module-mocks', '--disable-warning=ExperimentalWarning', ...process.argv.slice(1)],
    { stdio: 'inherit', env: { ...process.env, SILLYSPEC_MOCK_RESPAWNED: '1' } })
  process.exit(r.status ?? 0)
}

import { mkdtempSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// ── 1. 捕获真实命名空间（先缓存 real，供 mock spread + 默认委托）──
//   用与 worktree.js 完全相同的 specifier（bare 'fs' / 'child_process' / './worktree-deps.js'）。
const realFs = await import('fs')
const realCp = await import('child_process')
const realDeps = await import('../src/worktree-deps.js')

// ── 2. 模块级可变 impl + 计数器（默认安全值：lstat 委托真实；execSync no-op 成功；provision 计数+空成功）──
let lstatImpl = (...a) => realFs.lstatSync(...a)
let execSyncImpl = () => undefined // 默认 no-op 成功（不真跑 cmd.exe rmdir，避免副作用；代码只区分抛/不抛）
let provisionImpl = () => { provisionCalls++; return {} } // 计数 + 返回空（模拟 install 成功，避免真跑 npm）
let execSyncCalls = 0
let provisionCalls = 0

// ── 3. 注册 mock（exports：spread real 命名导出 + 覆盖目标为 wrapper）──
await mock.module('fs', {
  exports: { ...realFs, lstatSync: (...a) => lstatImpl(...a) },
})
await mock.module('child_process', {
  // wrapper 先计数再委托 impl（即便 impl 抛错，计数也已 +1，证明 junction rmdir 被尝试过）。
  // 安全收敛后 worktree.js 的 junction 解链走 execFileSync('cmd.exe', ['/c','rmdir',...])，
  // 但 mock 'child_process' 同时命中 git-helper 的 'node:child_process'（同 builtin），
  // 故计数仅统计 cmd.exe rmdir 调用，git 调用原样委托真实实现（不计数、不 no-op）。
  exports: {
    ...realCp,
    execSync: (...a) => { execSyncCalls++; return execSyncImpl(...a) },
    execFileSync: (cmd, args, ...rest) => {
      if (cmd === 'cmd.exe') { execSyncCalls++; return execSyncImpl(cmd, args, ...rest) }
      return realCp.execFileSync(cmd, args, ...rest)
    },
  },
})
await mock.module('../src/worktree-deps.js', {
  exports: { ...realDeps, provisionDeps: (...a) => provisionImpl(...a) },
})

// ── 4. mock 注册后再 import worktree.js（解析到 mock，WorktreeManager 内 lstatSync/execSync/provisionDeps 绑定 wrapper）──
const { WorktreeManager } = await import('../src/worktree.js')

// ── 断言工具（与既有 worktree 套件同款 manual counting；run-tests.mjs 按退出码判胜负）──
const count = { passed: 0, failed: 0, failures: [] }
function assert (cond, msg) {
  if (cond) { count.passed++; console.log(`  ✅ PASS: ${msg}`) }
  else { count.failed++; count.failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
}
function assertThrows (fn, re, msg) {
  try {
    fn()
    assert(false, `${msg}（未抛错）`)
  } catch (e) {
    const m = (e && e.message) ? e.message : String(e)
    assert(re.test(m), `${msg}（抛错但信息不匹配: ${m.slice(0, 120)}）`)
  }
}

const CHANGE = 'demo'
const _tmpDirs = []

/** 建临时 fixture：tmpBase/demo/node_modules 空目录 + WorktreeManager（worktreeDir=tmpBase 绕开 git） */
function makeFixture () {
  const tmpBase = mkdtempSync(join(tmpdir(), 'wt-junc-fail-'))
  _tmpDirs.push(tmpBase)
  const wtPath = join(tmpBase, CHANGE) // == getWorktreePath('demo')（worktreeDir=tmpBase）
  mkdirSync(join(wtPath, 'node_modules'), { recursive: true })
  const wm = new WorktreeManager({ cwd: tmpBase, worktreeDir: tmpBase })
  return { tmpBase, wtPath, wm }
}

function resetCounters () {
  execSyncCalls = 0
  provisionCalls = 0
}

console.log('\n#4 worktree junction 解链 fail-loud（cleanup + _doctorReprovision）')

// ────────────────────────────────────────────────────────────────────────────
// #1 cleanup lstatSync EPERM → throw「junction 检测失败」+ git worktree remove 未被调
// ────────────────────────────────────────────────────────────────────────────
{
  const { wm, tmpBase } = makeFixture()
  resetCounters()
  lstatImpl = () => { const e = new Error("EPERM: operation not permitted, lstat 'node_modules'"); e.code = 'EPERM'; throw e }
  execSyncImpl = () => undefined

  assertThrows(
    () => wm.cleanup(CHANGE, { maxRetries: 1 }),
    /junction 检测失败/,
    '#1 cleanup lstatSync EPERM → throw「junction 检测失败」',
  )
  // lstat 在 :745 抛 → 直接传出 cleanup（该段无外层 try）→ :767 git worktree remove 不可达；
  // execSync（junction rmdir）也未被调（计数 0）。
  assert(execSyncCalls === 0, `#1 cleanup EPERM → execSync 计数=${execSyncCalls}（期望 0，证 junction rmdir + git remove 均未触达）`)

  lstatImpl = (...a) => realFs.lstatSync(...a)
  rmSync(tmpBase, { recursive: true, force: true })
}

// ────────────────────────────────────────────────────────────────────────────
// #2 cleanup 解链失败（真 junction + execSync rmdir 抛）→ throw「解链失败」
// ────────────────────────────────────────────────────────────────────────────
{
  const { wm, tmpBase } = makeFixture()
  resetCounters()
  lstatImpl = () => ({ isSymbolicLink: () => true }) // 真junction
  execSyncImpl = () => { throw new Error("rmdir: 目录不是空的 / EPERM") }

  assertThrows(
    () => wm.cleanup(CHANGE, { maxRetries: 1 }),
    /junction 解链失败/,
    '#2 cleanup junction 解链失败 → throw「解链失败」',
  )
  // execSync 被调一次（junction rmdir 尝试 + 抛错），随后 throw 传播出 cleanup →
  // :767 git worktree remove（execFileSync via git-helper，不计入 execSync 计数）不可达。
  assert(execSyncCalls === 1, `#2 cleanup 解链失败 → execSync 计数=${execSyncCalls}（期望 1=仅 junction rmdir 被尝试；throw 传播阻断后续 git remove）`)

  lstatImpl = (...a) => realFs.lstatSync(...a)
  rmSync(tmpBase, { recursive: true, force: true })
}

// ────────────────────────────────────────────────────────────────────────────
// #3 cleanup 正常 junction（lstat 真 link + execSync 成功）→ 不 throw + details 含 junction/symlink removed
// ────────────────────────────────────────────────────────────────────────────
{
  const { wm, tmpBase } = makeFixture()
  resetCounters()
  lstatImpl = () => ({ isSymbolicLink: () => true })
  execSyncImpl = () => undefined // 解链成功（no-op）

  let result
  try {
    result = wm.cleanup(CHANGE, { maxRetries: 1 })
    assert(true, '#3 cleanup 正常 junction → 不 throw（正常返回）')
  } catch (e) {
    assert(false, `#3 cleanup 正常 junction 不应抛错（${(e && e.message) || e}）`)
    result = null
  }
  assert(!!result && Array.isArray(result.details) && result.details.some(d => /junction\/symlink removed|junction.*removed/.test(d)),
    `#3 cleanup 正常 junction → details 含「junction/symlink removed」（result=${result ? result.result : 'n/a'}）`)
  assert(execSyncCalls === 1, `#3 cleanup 正常 junction → execSync 计数=${execSyncCalls}（期望 1=junction rmdir 成功执行）`)

  lstatImpl = (...a) => realFs.lstatSync(...a)
  rmSync(tmpBase, { recursive: true, force: true })
}

// ────────────────────────────────────────────────────────────────────────────
// #4 cleanup 非 junction（lstat 非 link）→ 不解链、不 throw，正常流转
// ────────────────────────────────────────────────────────────────────────────
{
  const { wm, tmpBase } = makeFixture()
  resetCounters()
  lstatImpl = () => ({ isSymbolicLink: () => false }) // 普通目录，非 link
  execSyncImpl = () => undefined

  let result
  try {
    result = wm.cleanup(CHANGE, { maxRetries: 1 })
    assert(true, '#4 cleanup 非 junction → 不 throw（正常返回）')
  } catch (e) {
    assert(false, `#4 cleanup 非 junction 不应抛错（${(e && e.message) || e}）`)
    result = null
  }
  assert(!!result && Array.isArray(result.details) && !result.details.some(d => /junction\/symlink removed/.test(d)),
    '#4 cleanup 非 junction → details 不含 junction removed（未走解链分支）')
  assert(execSyncCalls === 0, `#4 cleanup 非 junction → execSync 计数=${execSyncCalls}（期望 0=未尝试 rmdir）`)

  lstatImpl = (...a) => realFs.lstatSync(...a)
  rmSync(tmpBase, { recursive: true, force: true })
}

// ────────────────────────────────────────────────────────────────────────────
// #5 _doctorReprovision lstatSync EPERM → { ok:false } + provisionDeps 未调
// ────────────────────────────────────────────────────────────────────────────
{
  const { wm, wtPath, tmpBase } = makeFixture()
  resetCounters()
  lstatImpl = () => { const e = new Error("EPERM: operation not permitted, lstat 'node_modules'"); e.code = 'EPERM'; throw e }
  execSyncImpl = () => undefined

  const r = wm._doctorReprovision(CHANGE, wtPath)
  assert(r.ok === false, `#5 doctor EPERM → ok:false（实际 ${r.ok}）`)
  assert(/junction 检测失败/.test(r.msg), `#5 doctor EPERM → msg 含「junction 检测失败」（${(r.msg || '').slice(0, 80)}）`)
  assert(provisionCalls === 0, `#5 doctor EPERM → provisionDeps 未调（计数=${provisionCalls}，期望 0，D-002@v1 核心）`)

  lstatImpl = (...a) => realFs.lstatSync(...a)
  rmSync(tmpBase, { recursive: true, force: true })
}

// ────────────────────────────────────────────────────────────────────────────
// #6 _doctorReprovision 解链失败 → { ok:false } + provisionDeps 未调
// ────────────────────────────────────────────────────────────────────────────
{
  const { wm, wtPath, tmpBase } = makeFixture()
  resetCounters()
  lstatImpl = () => ({ isSymbolicLink: () => true })
  execSyncImpl = () => { throw new Error("rmdir 失败") }

  const r = wm._doctorReprovision(CHANGE, wtPath)
  assert(r.ok === false, `#6 doctor 解链失败 → ok:false（实际 ${r.ok}）`)
  assert(/解链失败/.test(r.msg), `#6 doctor 解链失败 → msg 含「解链失败」（${(r.msg || '').slice(0, 80)}）`)
  assert(provisionCalls === 0, `#6 doctor 解链失败 → provisionDeps 未调（计数=${provisionCalls}，期望 0，避免经 junction 误改主仓 node_modules）`)

  lstatImpl = (...a) => realFs.lstatSync(...a)
  rmSync(tmpBase, { recursive: true, force: true })
}

// ────────────────────────────────────────────────────────────────────────────
// #7（bonus）_doctorReprovision 正常 junction → provisionDeps 被调一次 + { ok:true }
// ────────────────────────────────────────────────────────────────────────────
{
  const { wm, wtPath, tmpBase } = makeFixture()
  resetCounters()
  lstatImpl = () => ({ isSymbolicLink: () => true })
  execSyncImpl = () => undefined // 解链成功

  const r = wm._doctorReprovision(CHANGE, wtPath)
  assert(r.ok === true, `#7 doctor 正常 junction → ok:true（实际 ${r.ok}）`)
  assert(provisionCalls === 1, `#7 doctor 正常 junction → provisionDeps 被调一次（计数=${provisionCalls}，期望 1）`)

  lstatImpl = (...a) => realFs.lstatSync(...a)
  rmSync(tmpBase, { recursive: true, force: true })
}

// ── 汇总 ──
console.log(`\n${'='.repeat(60)}`)
console.log(`✅ 通过: ${count.passed}  ❌ 失败: ${count.failed}`)
if (count.failures.length > 0) {
  console.log('失败项:')
  for (const f of count.failures) console.log(`  - ${f}`)
}
console.log('='.repeat(60))

// 兜底清 tmp（即便上面某用例提前抛错也尝试清）
for (const d of _tmpDirs) { try { rmSync(d, { recursive: true, force: true }) } catch {} }

process.exit(count.failed > 0 ? 1 : 0)
