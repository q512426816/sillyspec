/**
 * coverage 存在性事实（P2，noai-ir-roadmap §5）：commands.coverage 显式配置才采集；
 * lcov 产物 SF: 记录 × 变更 diff 交集；语义边界内建——渲染只说「有覆盖记录」不说「已覆盖」。
 * fail-soft：未配置 / 产物缺失 / 非 lcov 形态 → skipped + reason（质量扫描不阻断）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { execSync } from 'node:child_process'
import { runCoverageExistenceCheck, renderCoverageExistenceReport, intersectCoverageExistence } from '../src/run/verify-quality-scan.js'

function makeFixture() {
  const cwd = mkdtempSync(join(tmpdir(), 'covex-'))
  execSync('git init -q', { cwd })
  execSync('git config user.email t@t.local', { cwd })
  execSync('git config user.name t', { cwd })
  writeFileSync(join(cwd, 'README.md'), 'init\n')
  execSync('git add -A && git commit -qm init', { cwd })
  const specBase = join(cwd, '.sillyspec')
  mkdirSync(specBase, { recursive: true })
  return { cwd, specBase }
}

test('未配置 commands.coverage → skipped（不采集是缺省语义）', async () => {
  const { cwd, specBase } = makeFixture()
  try {
    writeFileSync(join(specBase, 'local.yaml'), 'commands:\n  test: node t.js\n')
    const r = await runCoverageExistenceCheck({ cwd, specBase, changeName: 'c1' })
    assert.equal(r.status, 'skipped')
    assert.ok(r.reason.includes('未配置'))
    assert.ok(renderCoverageExistenceReport(r).includes('存在性事实'))
  } finally { try { rmSync(cwd, { recursive: true, force: true }) } catch {} }
})

test('交集纯函数 + 渲染语义边界：有覆盖记录≠已覆盖；缺口点名；前缀差容忍', async () => {
  // 纯函数：lcov SF 绝对路径 × diff 仓相对路径（前缀差靠双向后缀匹配）
  const { coveredChanged, uncoveredChanged } = intersectCoverageExistence(
    ['C:/proj/src-a.js', 'src/c.js'],
    ['src-a.js', 'src-b.js', 'c.js', 'src/c.js'],
  )
  assert.deepEqual(coveredChanged.sort(), ['c.js', 'src-a.js', 'src/c.js'].sort(), '命中集（含前缀差）')
  assert.deepEqual(uncoveredChanged, ['src-b.js'], '存在性缺口')
  // 渲染：语义边界标注
  const text = renderCoverageExistenceReport({ status: 'computed', artifact: 'cov/lcov.info', runNote: '命令退出码 0', coveredChanged: ['src-a.js'], uncoveredChanged: ['src-b.js'] })
  assert.ok(text.includes('存在性'), '存在性标注在场')
  assert.ok(text.includes('不证明'), '语义边界标注（非行为覆盖断言）在场')
  assert.ok(text.includes('src-b.js'), '缺口文件点名')
  assert.ok(text.includes('1/2'), '命中计数')
})

test('产物缺失 / 非 lcov 形态 → skipped + reason', async () => {
  const { cwd, specBase } = makeFixture()
  try {
    writeFileSync(join(specBase, 'local.yaml'), 'commands:\n  test: node t.js\n  coverage: node nope.js\n')
    const r = await runCoverageExistenceCheck({ cwd, specBase, changeName: null })
    assert.equal(r.status, 'skipped')
    assert.ok(r.reason.includes('产物缺失'))
    // 非 lcov 形态：命令成功但产物无 SF:
    writeFileSync(join(cwd, 'ok.js'), "require('fs').mkdirSync('coverage', {recursive:true}); require('fs').writeFileSync('coverage/lcov.info', 'hello')\n")
    writeFileSync(join(specBase, 'local.yaml'), 'commands:\n  test: node t.js\n  coverage: node ok.js\n')
    const r2 = await runCoverageExistenceCheck({ cwd, specBase, changeName: null })
    assert.equal(r2.status, 'skipped')
    assert.ok(r2.reason.includes('SF'), '非 lcov 形态被识别')
  } finally { try { rmSync(cwd, { recursive: true, force: true }) } catch {} }
})
