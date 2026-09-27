/**
 * hunk 归属门单测（2026-09-27-hunk-attribution-gate FR-06）。
 *
 * 用真实临时 git 仓走全信号路径：
 * 1. 声明面归集（design 清单 ∪ requirements 测试绑定——含 NEW: 前缀与反斜杠归一）
 * 2. 未归因文件检测（提交面文件不在声明面，含 hunk 计数）
 * 3. 跨变更竞争检测（他活跃变更声明面相交；archive 与本变更排除）
 * 4. 在途残留（提交面文件当前工作树仍有未提交修改）
 * 5. 三档分级（warn 结果同构 / off 关闭 / 空面降级）+ fail-soft（非 git 目录）
 * 6. 渲染行形态（✅ 清零行 / ⚠️ 三类信号行）
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'

import {
  readHunkGate, collectDeclaredFace, runHunkAttributionGate, renderHunkAttributionLines,
} from '../src/hunk-attribution.js'

function git(cwd, args) {
  return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8' })
}

/** 建临时仓：base 提交 → feature 提交（声明 a.js、未声明 b.js、竞争 c.js）→ 工作树改 a.js。 */
function makeScenario({ withForeignChange = true, designList, requirements } = {}) {
  const cwd = mkdtempSync(join(tmpdir(), 'hunk-gate-'))
  git(cwd, ['init', '-q'])
  git(cwd, ['config', 'user.email', 't@t'])
  git(cwd, ['config', 'user.name', 't'])
  writeFileSync(join(cwd, 'a.js'), 'a1\na2\n')
  writeFileSync(join(cwd, 'b.js'), 'b1\n')
  writeFileSync(join(cwd, 'c.js'), 'c1\nc2\nc3\n')
  git(cwd, ['add', '.'])
  git(cwd, ['commit', '-qm', 'base'])

  writeFileSync(join(cwd, 'a.js'), 'a1\na2-改\na3\n')
  writeFileSync(join(cwd, 'b.js'), 'b1\nb2\n')
  writeFileSync(join(cwd, 'c.js'), 'c1\nc2-改\n')
  git(cwd, ['add', '.'])
  git(cwd, ['commit', '-qm', 'feature'])
  const baseline = git(cwd, ['rev-parse', 'HEAD~1']).trim()

  const specBase = join(cwd, '.sillyspec')
  const changeName = '2026-09-27-x'
  const changeDir = join(specBase, 'changes', changeName)
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(changeDir, 'design.md'), designList ?? `# 设计\n## 文件变更清单\n| 操作 | 文件路径 |\n|---|---|\n| 修改 | a.js |\n| 修改 | c.js |\n`)
  writeFileSync(join(changeDir, 'requirements.md'), requirements ?? '# 需求\n## 测试绑定\n<!--AGENT:测试绑定FR-01 t -->\ntest/x.test.mjs「用例」\n')
  if (withForeignChange) {
    const other = join(specBase, 'changes', '2026-09-27-other')
    mkdirSync(other, { recursive: true })
    writeFileSync(join(other, 'design.md'), `# 他变更\n## 文件变更清单\n| 操作 | 文件路径 |\n|---|---|\n| 修改 | c.js |\n`)
  }

  const committed = ['a.js', 'b.js', 'c.js']
  return { cwd, specBase, changeName, changeDir, baseline, committed, cleanup: () => rmSync(cwd, { recursive: true, force: true }) }
}

function gitFn(cwd, args) { return git(cwd, args) }

test('未归因 + 竞争 + 残留三信号全路径', async () => {
  const sc = makeScenario()
  try {
    // 残留：提交后再改 a.js（不提交）
    writeFileSync(join(sc.cwd, 'a.js'), 'a1\na2-改\na3\na4-在途\n')
    const r = await runHunkAttributionGate({
      cwd: sc.cwd, specBase: sc.specBase, changeName: sc.changeName,
      baselineCommit: sc.baseline, committedFiles: sc.committed,
      gitFn: (c, a) => gitFn(c, a), gate: 'warn',
    })
    assert.deepEqual(r.unattributed.map((u) => u.file), ['b.js'])
    assert.ok(r.unattributed[0].hunks >= 1, 'b.js 至少 1 hunk')
    assert.deepEqual(r.contended.map((c) => c.file), ['c.js'])
    assert.deepEqual(r.contended[0].by, ['2026-09-27-other'])
    assert.deepEqual(r.residue.map((s) => s.file), ['a.js'])
    assert.equal(r.ok, false)
    assert.equal(r.faceCount, 3)
  } finally { sc.cleanup() }
})

test('声明面归集：design 清单 + requirements 绑定（NEW: 前缀与反斜杠归一）', async () => {
  const sc = makeScenario({
    designList: `# 设计\n## 文件变更清单\n| 操作 | 文件路径 |\n|---|---|\n| 新增 | NEW:a.js |\n| 修改 | src\\ui\\x.tsx |\n`,
  })
  try {
    const { declared } = await collectDeclaredFace(sc.changeDir, sc.changeName)
    assert.ok(declared.has('a.js'), 'NEW: 前缀剥离')
    assert.ok(declared.has('src/ui/x.tsx'), '反斜杠归一')
    assert.ok(declared.has('test/x.test.mjs'), 'requirements 测试绑定路径入面')
  } finally { sc.cleanup() }
})

test('全声明零信号 → ok=true，渲染含 ✅ 清零行', async () => {
  const sc = makeScenario({ withForeignChange: false })
  try {
    const r = await runHunkAttributionGate({
      cwd: sc.cwd, specBase: sc.specBase, changeName: sc.changeName,
      baselineCommit: sc.baseline, committedFiles: ['a.js', 'c.js'],
      gitFn, gate: 'warn',
    })
    assert.equal(r.ok, true)
    assert.equal(r.unattributed.length, 0)
    const lines = renderHunkAttributionLines(r)
    assert.ok(lines.some((l) => l.startsWith('- ✅')))
    assert.ok(lines[0].includes('提交面 2 个交付文件对账'))
    assert.ok(lines.some((l) => l.includes('test/x.test.mjs') || l.includes('声明面归因 2')))
  } finally { sc.cleanup() }
})

test('off 关闭与空面降级', async () => {
  const sc = makeScenario()
  try {
    const off = await runHunkAttributionGate({ cwd: sc.cwd, specBase: sc.specBase, changeName: sc.changeName, baselineCommit: sc.baseline, committedFiles: sc.committed, gitFn, gate: 'off' })
    assert.equal(off.ok, true)
    assert.ok(off.notes.some((n) => n.includes('hunk_gate=off')))
    const empty = await runHunkAttributionGate({ cwd: sc.cwd, specBase: sc.specBase, changeName: sc.changeName, baselineCommit: null, committedFiles: [], gitFn, gate: 'warn' })
    assert.ok(empty.notes.some((n) => n.includes('跳过')))
  } finally { sc.cleanup() }
})

test('fail-soft：非 git 目录不炸（声明面空 → 提示不指认口径）', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'hunk-gate-nogit-'))
  try {
    const r = await runHunkAttributionGate({ cwd: dir, specBase: dir, changeName: 'x', baselineCommit: 'deadbeef', committedFiles: ['a.js'], gitFn, gate: 'warn' })
    assert.equal(r.unattributed.length, 0, '声明面全空不指认夹带（advisory 同口径）')
    assert.ok(r.notes.some((n) => n.includes('无文件声明面')))
    assert.equal(r.ok, true)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('readHunkGate：三档 + 缺席默认 warn + CRLF', () => {
  const base = mkdtempSync(join(tmpdir(), 'hunk-gate-cfg-'))
  try {
    assert.equal(readHunkGate(base), 'warn')
    writeFileSync(join(base, 'local.yaml'), 'hunk_gate: error\n')
    assert.equal(readHunkGate(base), 'error')
    writeFileSync(join(base, 'local.yaml'), "hunk_gate: 'off'\r\n")
    assert.equal(readHunkGate(base), 'off')
  } finally { rmSync(base, { recursive: true, force: true }) }
})
