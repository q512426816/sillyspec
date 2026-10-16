/**
 * 变更标题硬区间门测试 —— 2026-10-16-title-range-gate（用户硬性要求：10-30 字必须、建议 ~20，
 * 可强制 agent 命名）。变更①（short-change-title）落了 ≤30 提炼上限后，下限与强制命名缺位：
 * fresh 无 --input 仍可退变更名兜底、短首行原样过。本文件锁定判定面：
 * isValidChangeTitle（10..30 区间）+ resolveStartTitle（flag>提炼>兜底策略 × enforce 门户）+
 * 拒绝报错/超界提示/hardCut 软提示三块文案的单源契约（cli-copy-selfsufficient：状态/原因/修复一次给全）。
 *
 * flow.js 的接线（exit 2 / ⚠️ 打印时机）以 e2e 夹具 + 既有标题族回归覆盖：硬门拦截信息
 * 「❌ 变更标题必须为 10-30 字」在全量回归中作为夹具是否合契的失败信号。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '..')
const { isValidChangeTitle, resolveStartTitle, shortTitleRejectMessage, shortTitleRangeWarnLine, SHORT_TITLE_HARDCUT_HINT } =
  await import(pathToFileURL(join(ROOT, 'src', 'quicklog.js')).href)
const { ProgressManager } = await import(pathToFileURL(join(ROOT, 'src', 'progress.js')).href)

// ── FR-01/FR-02：isValidChangeTitle 区间判定 ──

test('isValidChangeTitle：9 拒 / 10 过 / 30 过 / 31 拒（去首尾空白后计数）', () => {
  assert.equal(isValidChangeTitle('一二三四五六七八九'), false, '9 字拒')
  assert.equal(isValidChangeTitle('一二三四五六七八九十'), true, '10 字过（下限含）')
  assert.equal(isValidChangeTitle('一二三四五六七八九十一二三四五六七八九十一二三四五六七八九十'), true, '30 字过（上限含）')
  assert.equal(isValidChangeTitle('一二三四五六七八九十一二三四五六七八九十一二三四五六七八九十又'), false, '31 字拒')
  assert.equal(isValidChangeTitle('  一二三四五六七八九十  '), true, '去首尾空白后计数')
  assert.equal(isValidChangeTitle(''), false)
  assert.equal(isValidChangeTitle(null), false)
  assert.equal(isValidChangeTitle('2026-10-16-abc'), true, 'ASCII 变更名按字符数计（语义不可机械判定，长度合规即过）')
})

// ── FR-01：resolveStartTitle 策略（flag > 提炼 > 兜底）× enforce 门户 ──

test('resolveStartTitle：--title 显式优先，区间内 ok（enforce）', () => {
  const got = resolveStartTitle({ titleFlag: '登录会话随机失效全面修复', input: '随便什么', change: '2026-10-16-x', enforce: true })
  assert.deepEqual([got.ok, got.kind, got.title], [true, 'flag', '登录会话随机失效全面修复'])
})

test('resolveStartTitle：--title 超区间 → ok=false（enforce），平台豁免 ok=true', () => {
  const bad = resolveStartTitle({ titleFlag: '一二三四五六七八九', input: '', change: 'c', enforce: true })
  assert.equal(bad.ok, false, '9 字显式标题被拒')
  const exempt = resolveStartTitle({ titleFlag: '一二三四五六七八九', input: '', change: 'c', enforce: false })
  assert.equal(exempt.ok, true, '平台 writer 豁免')
})

test('resolveStartTitle：提炼首行合区间 → derived；过短首行 enforce 拒 / 豁免放行', () => {
  const good = resolveStartTitle({ titleFlag: null, input: '修复登录会话随机失效并补齐回归\n\n成功标准：\n- x', change: 'c', enforce: true })
  assert.equal(good.ok, true)
  assert.equal(good.kind, 'derived')
  const short = resolveStartTitle({ titleFlag: null, input: '任务\n\n成功标准：\n- x', change: 'c', enforce: true })
  assert.equal(short.ok, false, '2 字首行 enforce 拒绝')
  assert.equal(short.kind, 'fallback', '拒绝面归兜底形态（无合规标题）')
  const shortExempt = resolveStartTitle({ titleFlag: null, input: '任务\n\n成功标准：\n- x', change: 'c', enforce: false })
  assert.deepEqual([shortExempt.ok, shortExempt.title], [true, '任务'], '平台豁免放行短标题（调用方 ⚠️ 留痕）')
})

test('resolveStartTitle：无 --input → 兜底，enforce 拒（强制命名）、豁免放行', () => {
  const gated = resolveStartTitle({ titleFlag: null, input: null, change: '2026-10-16-x', enforce: true })
  assert.deepEqual([gated.ok, gated.kind], [false, 'fallback'])
  const exempt = resolveStartTitle({ titleFlag: null, input: null, change: '2026-10-16-x', enforce: false })
  assert.deepEqual([exempt.ok, exempt.kind], [true, 'fallback'])
})

test('resolveStartTitle：硬切 30+… 残句 enforce 拒（残句=认不出变更做什么）、豁免放行+警告面', () => {
  const long = '多标签页并发操作同一会话存储键时后写者覆盖先写者的活动状态导致随机登出需要重新设计'
  const gated = resolveStartTitle({ titleFlag: null, input: long, change: 'c', enforce: true })
  assert.equal(gated.ok, false, 'hardCut 残句拒绝——CLI 提炼救不了就让 agent 命名')
  assert.equal(gated.kind, 'fallback')
  assert.equal(gated.rejectedTitle, long.slice(0, 30) + '…', '被拒候选透传（报错展示面）')
  assert.equal(gated.hardCut, true)
  const exempt = resolveStartTitle({ titleFlag: null, input: long, change: 'c', enforce: false })
  assert.deepEqual([exempt.ok, exempt.title, exempt.kind], [true, long.slice(0, 30) + '…', 'derived'], '平台豁免照用提炼值（isValidChangeTitle=false → 调用方 ⚠️）')
})

// ── FR-02/FR-04：拒绝报错与提示文案单源契约 ──

test('shortTitleRejectMessage：状态/原因/修复一次给全（有值/兜底两形态）', () => {
  const withVal = shortTitleRejectMessage('任务')
  assert.ok(withVal.includes('10-30 字'), '硬区间要求')
  assert.ok(withVal.includes('2 字'), '当前字数')
  assert.ok(withVal.includes('"任务"'), '当前值')
  assert.ok(withVal.includes('--input 首行') && withVal.includes('--title'), '两条修复路径')
  const fallback = shortTitleRejectMessage(null)
  assert.ok(fallback.includes('未命名'), '兜底形态报「未命名」')
  assert.ok(fallback.includes('--title'), '修复路径仍在')
})

test('shortTitleRangeWarnLine：不阻断强提示含当前值/字数/修复命令', () => {
  const line = shortTitleRangeWarnLine('滑块验证码')
  assert.ok(line.includes('滑块验证码') && line.includes('5 字'))
  assert.ok(line.includes('--title') && line.includes('不阻断'))
})

test('SHORT_TITLE_HARDCUT_HINT：文案口径=6..30 内无可用截点（评审 P3 清偿）', () => {
  assert.ok(SHORT_TITLE_HARDCUT_HINT.includes('6..30'), '体现区间过滤口径，禁用「无自然断点」旧措辞')
  assert.ok(!SHORT_TITLE_HARDCUT_HINT.includes('无自然断点'))
  assert.ok(SHORT_TITLE_HARDCUT_HINT.includes('--title') && SHORT_TITLE_HARDCUT_HINT.includes('不阻断'))
})

// ── FR-01/FR-02 e2e：flow start 真实子进程（makeRepo 对齐 change-title-flow 的 local.yaml 形态）──

import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'

const e2eRoots = []
function makeRepo() {
  const cwd = mkdtempSync(join(tmpdir(), 'titlegate-'))
  const run = (args) => execFileSync('git', args, { cwd, stdio: 'pipe' }).toString().trim()
  run(['init', '-q'])
  run(['config', 'user.email', 't@t'])
  run(['config', 'user.name', 't'])
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), 'project:\n  type: generic\ncommands:\n  test: "node exit0.js"\nflow:\n  mode: thin\n')
  writeFileSync(join(cwd, 'base.txt'), 'base\n')
  run(['add', '.'])
  run(['commit', '-q', '-m', 'base'])
  e2eRoots.push(cwd)
  return cwd
}
function cli(cwd, args) {
  return spawnSync(process.execPath, [join(ROOT, 'src', 'index.js'), ...args], { cwd, encoding: 'utf8', timeout: 180_000, env: { ...process.env, SILLYSPEC_WATCHER: '0' } })
}
test.onFinish?.(() => { for (const t of e2eRoots) rmSync(t, { recursive: true, force: true }) })

test('e2e fresh：首行过短 → exit 2 报错一次给全，changes 零半态', () => {
  const cwd = makeRepo()
  const r = cli(cwd, ['flow', 'start', '--change', '2026-10-16-gate-a', '--input', '任务\n\n成功标准：\n- x', '--no-review'])
  assert.equal(r.status, 2, `应被硬门拒绝: ${r.stdout}`)
  assert.ok(r.stderr.includes('10-30 字') && r.stderr.includes('2 字') && r.stderr.includes('--title'), '状态/原因/修复一次给全')
  const pm = new ProgressManager({ specDir: join(cwd, '.sillyspec') })
  const row = pm._ensureDB(cwd).getDb().prepare("SELECT name FROM changes WHERE name = '2026-10-16-gate-a'").get()
  assert.equal(row, undefined, '被拒启动不得落 changes 行（写入前拒绝）')
})

test('e2e fresh：合区间标题正常启动落库', () => {
  const cwd = makeRepo()
  const r = cli(cwd, ['flow', 'start', '--change', '2026-10-16-gate-b', '--input', '登录会话随机失效问题修复\n\n成功标准：\n- x', '--no-review'])
  assert.equal(r.status, 0, `合规启动失败: ${r.stderr}`)
  const pm = new ProgressManager({ specDir: join(cwd, '.sillyspec') })
  assert.equal(pm._ensureDB(cwd).getDb().prepare("SELECT title FROM changes WHERE name = '2026-10-16-gate-b'").get()?.title, '登录会话随机失效问题修复')
})

test('e2e fresh：--title 31 字 → exit 2', () => {
  const cwd = makeRepo()
  const r = cli(cwd, ['flow', 'start', '--change', '2026-10-16-gate-c', '--input', '登录会话随机失效问题修复\n\n成功标准：\n- x', '--title', '一二三四五六七八九十'.repeat(3) + '一', '--no-review'])
  assert.equal(r.status, 2)
  assert.ok(r.stderr.includes('31 字'))
})

test('e2e 平台 writer 预建空目录：过短 input 豁免硬门，exit 0 + ⚠️ + 提炼值照用', () => {
  // 平台派发契约必带 --input（无 --input 在更早的「需求不够清晰」门被拦，轮不到标题门）；
  // 豁免面=预建空目录 + 提炼值超区间 → 照常启动 + ⚠️ 留痕
  const cwd = makeRepo()
  mkdirSync(join(cwd, '.sillyspec', 'changes', '2026-10-16-gate-d'), { recursive: true })
  const r = cli(cwd, ['flow', 'start', '--change', '2026-10-16-gate-d', '--input', '任务\n\n成功标准：\n- x', '--no-review'])
  assert.equal(r.status, 0, `平台 writer 形态应豁免放行: ${r.stderr}`)
  assert.match(r.stdout, /⚠️/, '豁免面打超界警告')
  const pm = new ProgressManager({ specDir: join(cwd, '.sillyspec') })
  assert.equal(pm._ensureDB(cwd).getDb().prepare("SELECT title FROM changes WHERE name = '2026-10-16-gate-d'").get()?.title, '任务')
})
