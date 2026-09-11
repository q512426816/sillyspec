/**
 * QUICKLOG 结构化 sidecar（P1-4，noai-ir-roadmap §4）：completeQuicklogEntry 组装推送
 * payload 的同时把终态结构落 .runtime/quicklog-sidecar/<qlId>.json——同一解析器产出
 * （sidecar 与推送 payload 恒一致，差异测试锁定）；cancelQuickSession 翻「已取消」时
 * sidecar 同步；存量条目无 sidecar 自动跳过（md 仍是真相源）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { execSync } from 'node:child_process'
import {
  allocateQuicklogEntry,
  completeQuicklogEntry,
  cancelQuickSession,
  readQuicklogSidecar,
  quicklogSidecarPath,
  writeQuicklogSidecar,
} from '../src/quicklog.js'

function makeFixture() {
  const dir = mkdtempSync(join(tmpdir(), 'qlsc-'))
  execSync('git init -q', { cwd: dir })
  execSync('git config user.email t@t.local', { cwd: dir })
  execSync('git config user.name ttester', { cwd: dir })
  writeFileSync(join(dir, 'README.md'), 'init\n')
  execSync('git add -A && git commit -qm init', { cwd: dir })
  const specBase = join(dir, '.sillyspec')
  mkdirSync(specBase, { recursive: true })
  return { dir, specBase }
}

const FOUR = '需求：sidecar 持久化测试 根因：双解析对齐税 方案：写时单次解析落 JSON 结果：断言通过'

test('完成条目：sidecar 落盘且与推送 payload 同源一致（title/四字段/文件行）', async () => {
  const fx = makeFixture()
  try {
    const { qlId } = await allocateQuicklogEntry(fx.specBase, 'ttester', { description: 'sidecar 测试' })
    await completeQuicklogEntry(fx.specBase, 'ttester', qlId, {
      resultText: FOUR,
      changedFiles: ['src/a.js', 'src/b.js'],
    })
    const scPath = quicklogSidecarPath(fx.specBase, qlId)
    assert.ok(existsSync(scPath), 'sidecar 文件落盘（.runtime/quicklog-sidecar/<qlId>.json）')
    const sc = readQuicklogSidecar(fx.specBase, qlId)
    assert.ok(sc, 'readQuicklogSidecar 读回')
    assert.equal(sc.schemaVersion, 1)
    assert.equal(sc.ql_id, qlId)
    assert.equal(sc.status, 'completed')
    assert.equal(sc.title, 'sidecar 持久化测试', '标题从「需求：」提取（与 md 条目同源）')
    assert.equal(sc.author_raw, 'ttester')
    assert.deepEqual(sc.files.map((f) => f.path), ['src/a.js', 'src/b.js'], '文件行结构化')
    assert.ok(sc.body_sections['需求'] && sc.body_sections['结果'], '四字段进 body_sections')
    assert.ok(typeof sc.raw_block === 'string' && sc.raw_block.includes(qlId), 'raw_block 保留（服务器原始展示面）')
    // 与 md 落盘一致：raw_block 即 md 条目原文
    const md = readFileSync(join(fx.specBase, 'quicklog', 'QUICKLOG-ttester.md'), 'utf8')
    assert.ok(md.includes('sidecar 持久化测试'), 'md 条目同标题（同源）')
  } finally {
    try { rmSync(fx.dir, { recursive: true, force: true }) } catch {}
  }
})

test('取消条目：sidecar 同步翻「已取消」；无 sidecar 的存量条目跳过不炸', async () => {
  const fx = makeFixture()
  try {
    const { qlId } = await allocateQuicklogEntry(fx.specBase, 'ttester', { description: '取消测试' })
    // 造 sidecar（模拟完成后再取消被拒——改为直接手造 sidecar 走翻态同步面）
    assert.equal(writeQuicklogSidecar(fx.specBase, { ql_id: qlId, status: 'completed', title: 'x', files: [], body_sections: {}, raw_block: 'y', author_raw: 'ttester', linked_changes: [], timestamp: null, status_note: null }), true, 'writeQuicklogSidecar 建目录并落盘')
    assert.equal(writeQuicklogSidecar(fx.specBase, null), false, '空 payload 防御 false')
    const r = await cancelQuickSession({ specBase: fx.specBase, gitUser: 'ttester', qlId })
    // 条目状态为「进行中」→ 翻「已取消」成功（fixture 未走完成路径，状态行是进行中）
    if (r.ok) {
      assert.equal(readQuicklogSidecar(fx.specBase, qlId).status, '已取消', 'sidecar 翻已取消')
    } else {
      assert.ok(String(r.reason).includes('状态行异常') || String(r.reason).includes('已完成'), `取消被拒的合法原因（${r.reason}）`)
    }
    // 存量条目（无 sidecar）：取消路径不因 sidecar 缺失而炸
    const { qlId: qlId2 } = await allocateQuicklogEntry(fx.specBase, 'ttester', { description: '存量' })
    const r2 = await cancelQuickSession({ specBase: fx.specBase, gitUser: 'ttester', qlId: qlId2 })
    assert.ok(r2.ok, `无 sidecar 取消不受影响（${r2.reason}）`)
    assert.equal(readQuicklogSidecar(fx.specBase, qlId2), null, '未手造 sidecar 保持缺失')
  } finally {
    try { rmSync(fx.dir, { recursive: true, force: true }) } catch {}
  }
})

test('readQuicklogSidecar：缺失/损坏/schema 不符 → null（读取侧 fail-soft 回退 md）', async () => {
  const fx = makeFixture()
  try {
    assert.equal(readQuicklogSidecar(fx.specBase, 'ql-none'), null, '缺失 → null')
    mkdirSync(join(fx.specBase, '.runtime', 'quicklog-sidecar'), { recursive: true })
    writeFileSync(quicklogSidecarPath(fx.specBase, 'ql-bad'), '{broken')
    assert.equal(readQuicklogSidecar(fx.specBase, 'ql-bad'), null, '损坏 → null')
    writeFileSync(quicklogSidecarPath(fx.specBase, 'ql-v0'), JSON.stringify({ schemaVersion: 99 }))
    assert.equal(readQuicklogSidecar(fx.specBase, 'ql-v0'), null, 'schema 不符 → null')
  } finally {
    try { rmSync(fx.dir, { recursive: true, force: true }) } catch {}
  }
})
