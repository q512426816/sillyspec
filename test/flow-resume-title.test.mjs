/**
 * 2026-10-06-resume-title 回归：flow start 重入恢复简报显示变更标题
 *
 * 覆盖：
 *   ① 登记 title 的活跃变更重入 → 恢复简报头两行后渲染「- 标题：<title>」（先于「做到哪」）
 *   ② 无 DB/无 title → 不渲染标题行（现状钉；读取器只读不建库由 flow-status-title ③ 钉）
 *   ③ 读取单源：flow.js 复用 getChangeTitle，无第二读取路径（静态断言）
 *   ④ test:core 清单驻留断言（防移出日常拦截面）
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = dirname(fileURLToPath(import.meta.url))
const { cmdFlow } = await import(pathToFileURL(join(ROOT, '..', 'src', 'flow.js')).href)
const { ProgressManager } = await import(pathToFileURL(join(ROOT, '..', 'src', 'progress.js')).href)

const CHANGE = '2026-10-06-frt'
const TITLE = '中文标题：恢复简报验证'

/** 活跃变更 fixture（flow-state 在场 → flow start 走 resume 分支）。 */
function fixture() {
  const cwd = mkdtempSync(join(tmpdir(), 'frt-'))
  const dir = join(cwd, '.sillyspec', 'changes', CHANGE)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'flow-state.yaml'), 'tier: thin\nsubsteps: {}\n')
  return { cwd, dir }
}

function seedProgressDb(cwd, title) {
  new ProgressManager().initChange(cwd, CHANGE, title ? { title } : {})
}

// 收尾：先关静态池连接（Windows 句柄锁 rmSync EPERM——change-delete.test.mjs 同款）
async function cleanup(cwd) {
  const key = join(cwd, '.sillyspec', '.runtime', 'sillyspec.db')
  try {
    const db = ProgressManager._dbPool.get(key)
    if (db) { try { db.close() } catch {} ProgressManager._dbPool.delete(key) }
  } catch { /* 池里无实例则无需处理 */ }
  try { rmSync(cwd, { recursive: true, force: true }) } catch { /* Windows 句柄竞态容忍 */ }
}

/** 重入 flow start（resume 路径）——SILLYSPEC_WATCHER=0 防 watcher 副作用，捕获 console 输出。 */
async function runResumeStart(cwd) {
  const origLog = console.log
  const origWarn = console.warn
  const origWatcher = process.env.SILLYSPEC_WATCHER
  let out = ''
  console.log = (...a) => { out += a.join('\n') + '\n' }
  console.warn = () => {}
  process.env.SILLYSPEC_WATCHER = '0'
  try {
    await cmdFlow(['start', '--change', CHANGE], cwd, null)
  } finally {
    console.log = origLog
    console.warn = origWarn
    if (origWatcher === undefined) delete process.env.SILLYSPEC_WATCHER
    else process.env.SILLYSPEC_WATCHER = origWatcher
  }
  return out
}

test('① 登记 title → 恢复简报渲染「- 标题：<title>」且先于「做到哪」', async () => {
  const { cwd } = fixture()
  try {
    seedProgressDb(cwd, TITLE)
    const out = await runResumeStart(cwd)
    assert.ok(out.includes('🔁 flow start 恢复简报（重入）'), `恢复简报在场，实际：${out.slice(0, 200)}`)
    const lines = out.split('\n')
    const titleIdx = lines.findIndex((l) => l === `- 标题：${TITLE}`)
    const doingIdx = lines.findIndex((l) => l.startsWith('- 做到哪'))
    assert.ok(titleIdx !== -1, `标题行逐字在场，实际含标题的行：${lines.filter((l) => l.includes('标题：'))}`)
    assert.ok(doingIdx !== -1 && titleIdx < doingIdx, `标题行先于「做到哪」（titleIdx=${titleIdx} doingIdx=${doingIdx}）`)
    // 头两行（标题行+分隔线）之后
    const headerIdx = lines.findIndex((l) => l.includes('🔁 flow start 恢复简报'))
    assert.ok(titleIdx > headerIdx + 1, '标题行在头两行之后')
  } finally { await cleanup(cwd) }
})

test('② 无 DB / 无 title → 不渲染标题行（现状钉）', async () => {
  const noDb = fixture()
  try {
    const out = await runResumeStart(noDb.cwd)
    assert.ok(out.includes('🔁 flow start 恢复简报（重入）'), '恢复简报在场')
    assert.ok(!out.includes('标题：'), `无 DB 不得渲染标题行，实际：${out.split('\n').filter((l) => l.includes('标题'))}`)
  } finally { await cleanup(noDb.cwd) }

  const noTitle = fixture()
  try {
    seedProgressDb(noTitle.cwd, null)
    const out = await runResumeStart(noTitle.cwd)
    assert.ok(!out.includes('- 标题：'), '无 title 不得渲染标题行')
  } finally { await cleanup(noTitle.cwd) }
})

test('③ 读取单源：flow.js 复用 getChangeTitle，无第二读取路径（静态断言）', async () => {
  const src = readFileSync(join(ROOT, '..', 'src', 'flow.js'), 'utf8')
  // FR-03 承诺面：简报的标题读取走 getChangeTitle（status 路径一次 + resume 路径一次 ≥2 处调用）。
  // 注：resume 分支存量的 title 补写块（--input/--title 重入回填）自有 inline SQL，先于本变更
  // 存在、读且可写——非本变更读取面，不在单源断言射程内。
  const calls = (src.match(/getChangeTitle\(cwd,\s*change\)/g) || []).length
  assert.ok(calls >= 2, `flow.js 应有 ≥2 处 getChangeTitle(cwd, change) 调用（status+resume），实际 ${calls}`)
  assert.ok(/resumeTitle = new ProgressManager\(\{ specDir: specBase \}\)\.getChangeTitle\(cwd, change\)/.test(src), 'resume 分支标题读取必须经 ProgressManager.getChangeTitle 单源')
})

test('④ test:core 清单驻留：本测试文件在 package.json test:core 内（防移出日常拦截面）', () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, '..', 'package.json'), 'utf8'))
  assert.ok(
    (pkg.scripts?.['test:core'] || '').includes('test/flow-resume-title.test.mjs'),
    'test:core 必须包含 test/flow-resume-title.test.mjs',
  )
})
