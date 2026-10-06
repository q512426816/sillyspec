/**
 * 2026-10-06-flow-status-title 回归：flow status 显示变更标题（进度库 changes.title）
 *
 * 覆盖：
 *   ① 人类输出：登记 title 的活跃变更渲染「   标题：<title>」行（紧随变更名行）；
 *      行缺失/无 title 时不渲染（与现状逐字一致）
 *   ② --json：新增 title 字段（登记值逐字 / null 两态），既有九字段原样保留
 *   ③ 无 DB：status 只读查询不得新建 sillyspec.db；title=null 且无标题行
 *   ④ test:core 清单驻留断言（防移出日常拦截面）
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = dirname(fileURLToPath(import.meta.url))
const { cmdFlow } = await import(pathToFileURL(join(ROOT, '..', 'src', 'flow.js')).href)
const { ProgressManager } = await import(pathToFileURL(join(ROOT, '..', 'src', 'progress.js')).href)

const CHANGE = '2026-10-06-fst'
const TITLE = '中文标题：显示验证'

/** 变更目录 fixture（flow-state + 槽位已填 → ②执行相，与 flow-status-json fixture 同构）。 */
function fixtureChangeDir(cwd) {
  const dir = join(cwd, '.sillyspec', 'changes', CHANGE)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'flow-state.yaml'), 'tier: thin\nsubsteps: {}\n')
  writeFileSync(join(dir, 'design.md'), [
    '# D', '',
    '<!--AGENT:槽1 -->', '答一', '',
    '<!--AGENT:槽2 -->', '答二', '',
    '<!--AGENT:槽3 -->', '答三', '',
    '<!--AGENT:槽4 -->', '答四', '',
  ].join('\n'))
  writeFileSync(join(dir, 'requirements.md'), [
    '# R', '',
    '<!--AGENT:FR区 -->', '### FR-01: 某需求', '- 场景：x', '',
    '<!--AGENT:测试绑定FR-01 -->', 'test/a.test.mjs「用例」', '',
  ].join('\n'))
  return dir
}

/** 登记进度库行（title 可空）——initChange 与 flow start 写入侧同 API。 */
function seedProgressDb(cwd, title) {
  const pm = new ProgressManager()
  pm.initChange(cwd, CHANGE, title ? { title } : {})
}

// 收尾：先关 ProgressManager 静态池里该路径的连接（Windows 下打开的 SQLite 句柄锁文件，
// 直接 rmSync 必 EPERM——change-delete.test.mjs 同款），删除失败仍兜底吞错（断言已过不因清理红）
async function cleanup(cwd) {
  try {
    const db = ProgressManager._dbPool.get(join(cwd, '.sillyspec', '.runtime', 'sillyspec.db'))
    if (db) { try { db.close() } catch {} ProgressManager._dbPool.delete(join(cwd, '.sillyspec', '.runtime', 'sillyspec.db')) }
  } catch { /* 池里无实例则无需处理 */ }
  try { rmSync(cwd, { recursive: true, force: true }) } catch { /* Windows 句柄竞态容忍 */ }
}

async function runStatus(cwd, args = []) {
  const orig = console.log
  let out = ''
  console.log = (...a) => { out += a.join('\n') + '\n' }
  try {
    await cmdFlow(['status', '--change', CHANGE, ...args], cwd, null)
  } finally {
    console.log = orig
  }
  return out
}

test('① 人类输出：登记 title → 变更名行后渲染标题行；无 title → 不渲染（现状钉）', async () => {
  const withTitle = mkdtempSync(join(tmpdir(), 'fst-y-'))
  try {
    fixtureChangeDir(withTitle)
    seedProgressDb(withTitle, TITLE)
    const out = await runStatus(withTitle)
    const lines = out.split('\n')
    const nameIdx = lines.findIndex((l) => l.includes(`📋 ${CHANGE}`))
    assert.ok(nameIdx !== -1, `变更名行在场，实际：${out}`)
    assert.equal(lines[nameIdx + 1], `   标题：${TITLE}`, `标题行应紧随变更名行，实际：${JSON.stringify(lines.slice(nameIdx, nameIdx + 3))}`)
  } finally { await cleanup(withTitle) }

  const noTitle = mkdtempSync(join(tmpdir(), 'fst-n-'))
  try {
    fixtureChangeDir(noTitle)
    seedProgressDb(noTitle, null)
    const out = await runStatus(noTitle)
    assert.ok(!out.includes('标题：'), `无 title 不得渲染标题行，实际：${out}`)
  } finally { await cleanup(noTitle) }
})

test('② --json：title 字段登记值逐字 / null 两态，既有九字段原样保留', async () => {
  const withTitle = mkdtempSync(join(tmpdir(), 'fst-jy-'))
  try {
    fixtureChangeDir(withTitle)
    seedProgressDb(withTitle, TITLE)
    const out = await runStatus(withTitle, ['--json'])
    const lines = out.split('\n').filter((l) => l.trim() !== '')
    assert.equal(lines.length, 1, `stdout 应恰一行 JSON，实际：${out}`)
    const j = JSON.parse(lines[0])
    assert.equal(j.title, TITLE)
    for (const f of ['change', 'phase', 'designFilled', 'frFilled', 'bindingsFilled', 'bindingsTotal', 'tasksChecked', 'tasksTotal', 'substeps']) {
      assert.ok(f in j, `既有字段 ${f} 缺失：${JSON.stringify(j)}`)
    }
  } finally { await cleanup(withTitle) }

  const noTitle = mkdtempSync(join(tmpdir(), 'fst-jn-'))
  try {
    fixtureChangeDir(noTitle)
    seedProgressDb(noTitle, null)
    const j = JSON.parse((await runStatus(noTitle, ['--json'])).trim())
    assert.equal(j.title, null)
  } finally { await cleanup(noTitle) }
})

test('③ 无 DB：不新建 sillyspec.db，无标题行，json title=null', async () => {
  const cwd = mkdtempSync(join(tmpdir(), 'fst-nodb-'))
  try {
    fixtureChangeDir(cwd)
    const human = await runStatus(cwd)
    assert.ok(!human.includes('标题：'), `无 DB 不得渲染标题行，实际：${human}`)
    const j = JSON.parse((await runStatus(cwd, ['--json'])).trim())
    assert.equal(j.title, null)
    assert.ok(!existsSync(join(cwd, '.sillyspec', '.runtime', 'sillyspec.db')), '只读 status 不得新建进度库文件')
  } finally { await cleanup(cwd) }
})

test('④ test:core 清单驻留：本测试文件在 package.json test:core 内（防移出日常拦截面）', () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, '..', 'package.json'), 'utf8'))
  assert.ok(
    (pkg.scripts?.['test:core'] || '').includes('test/flow-status-title.test.mjs'),
    'test:core 必须包含 test/flow-status-title.test.mjs',
  )
})
