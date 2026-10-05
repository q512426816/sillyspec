/**
 * 2026-10-05-hunk-gate-commit-attribution 回归：未归因判定的提交事实归属切分
 *
 * 背景（F-4，2026-10-05 本会话实证）：collectForeignDeclarations 只扫活跃变更（排 archive/）
 * ——已归档他侧交付落本变更 baseline..HEAD 窗口时报「未归因」，指引「pathspec 隔离/补 design
 * 自声明」双误导；patch 冻结面（filterCommittedFace）同窗口已按提交事实正确剔除——两消费点
 * 口径不一。
 *
 * 锁定三形态：
 *   ① 他侧归因改判：窗口内全部提交属他侧变更名 → foreignByCommit（ℹ️ 信息行、不计 ok 面）
 *   ② 裸提交维持：无后缀裸提交触碰的文件保持未归因（fail-closed 原口径）
 *   ③ 切分不可得退化：归属切分失败（基线非法 → null）保持全量未归因，不放宽
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { runHunkAttributionGate, renderHunkAttributionLines } from '../src/hunk-attribution.js'

function git(cwd, args) {
  return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8' })
}

function mkRepo() {
  const cwd = mkdtempSync(join(tmpdir(), 'hunk-attr-commit-'))
  git(cwd, ['init', '-q', '-b', 'main'])
  git(cwd, ['config', 'user.email', 't@t'])
  git(cwd, ['config', 'user.name', 't'])
  writeFileSync(join(cwd, 'base.txt'), 'base\n')
  git(cwd, ['add', '.'])
  git(cwd, ['commit', '-qm', 'base'])
  const specBase = join(cwd, '.sillyspec')
  const changeName = '2026-10-05-mine'
  const changeDir = join(specBase, 'changes', changeName)
  mkdirSync(changeDir, { recursive: true })
  return { cwd, specBase, changeName, changeDir, cleanup: () => rmSync(cwd, { recursive: true, force: true }) }
}

const OWN = '2026-10-05-mine'
const OTHER = '2026-10-05-archived-other'

test('① 他侧归因改判：他侧后缀交付不报未归因（信息行 + 不计 ok 面）；② 裸提交维持', async () => {
  const f = mkRepo()
  try {
    // 窗口三提交：own 后缀 / 他侧后缀（已归档变更——声明面不在场）/ 裸提交
    writeFileSync(join(f.cwd, 'a.js'), 'a\n')
    git(f.cwd, ['add', 'a.js']); git(f.cwd, ['commit', '-qm', `fix: 自交付 (${OWN})`])
    writeFileSync(join(f.cwd, 'f.js'), 'f\n')
    git(f.cwd, ['add', 'f.js']); git(f.cwd, ['commit', '-qm', `fix: 他侧已归档交付 (${OTHER})`])
    writeFileSync(join(f.cwd, 'bare.js'), 'b\n')
    git(f.cwd, ['add', 'bare.js']); git(f.cwd, ['commit', '-qm', 'chore: 无后缀裸提交'])
    const baseline = git(f.cwd, ['rev-parse', 'HEAD~3']).trim()
    writeFileSync(join(f.changeDir, 'design.md'), `# 设计\n## 文件变更清单\n| 操作 | 路径 |\n|---|---|\n| 修改 | a.js |\n`)

    const r = await runHunkAttributionGate({
      cwd: f.cwd, specBase: f.specBase, changeName: f.changeName, baselineCommit: baseline,
      committedFiles: ['a.js', 'f.js', 'bare.js'], gitFn: (c, a) => git(c, a), gate: 'warn',
    })
    assert.deepEqual(r.unattributed.map((u) => u.file), ['bare.js'], `裸提交保持未归因（实际 ${JSON.stringify(r.unattributed)}）`)
    assert.ok(r.unattributed[0].hunks >= 1, `hunk 计数真实可得（评审 P3 处置：包装修复后不再恒 -1，实得 ${r.unattributed[0].hunks}）`)
    assert.equal(r.foreignByCommit.length, 1, '他侧后缀交付改判他侧归因')
    assert.equal(r.foreignByCommit[0].file, 'f.js')
    assert.equal(r.foreignByCommit[0].owners[0], OTHER, '归属他侧变更名（提交事实）')
    assert.equal(r.ok, false, 'ok 仍被裸提交阻断（未归因面非零）')
    const lines = renderHunkAttributionLines(r).join('\n')
    assert.ok(lines.includes('他侧归因（提交事实）：`f.js` 窗口提交全部属 ' + OTHER), '渲染含他侧归因信息行（ℹ️ 非警告）')
    assert.ok(lines.includes('声明面归因 1、他侧归因（提交事实）1、未归因 1'), `汇总行三计数（${lines.split('\n')[1]}）`)
    assert.ok(!lines.includes('未归因：`f.js`'), 'f.js 不再出现在未归因警告行')
  } finally { f.cleanup() }
})

test('③ 他侧归因不阻 ok（清零行与他侧归因并存）', async () => {
  const f = mkRepo()
  try {
    writeFileSync(join(f.cwd, 'f.js'), 'f\n')
    git(f.cwd, ['add', 'f.js']); git(f.cwd, ['commit', '-qm', `fix: 他侧交付 (${OTHER})`])
    const baseline = git(f.cwd, ['rev-parse', 'HEAD~1']).trim()
    // 声明面非空（declared.size>0 才走未归因判定）——声明一个不在提交面的占位文件
    writeFileSync(join(f.changeDir, 'design.md'), `# 设计\n## 文件变更清单\n| 操作 | 路径 |\n|---|---|\n| 修改 | placeholder.js |\n`)
    const r = await runHunkAttributionGate({
      cwd: f.cwd, specBase: f.specBase, changeName: f.changeName, baselineCommit: baseline,
      committedFiles: ['f.js'], gitFn: (c, a) => git(c, a), gate: 'error',
    })
    assert.equal(r.unattributed.length, 0, '无未归因')
    assert.equal(r.foreignByCommit.length, 1)
    assert.equal(r.ok, true, 'gate=error 档他侧归因不阻断（不计 ok 面）')
    const lines = renderHunkAttributionLines(r).join('\n')
    assert.ok(lines.includes('✅ 提交面全部文件归属清晰'), '清零行与他侧归因并存')
  } finally { f.cleanup() }
})

test('④ 切分不可得退化：归属失败（非法基线 → null）保持全量未归因不放宽', async () => {
  const f = mkRepo()
  try {
    writeFileSync(join(f.cwd, 'f.js'), 'f\n')
    git(f.cwd, ['add', 'f.js']); git(f.cwd, ['commit', '-qm', `fix: 他侧交付 (${OTHER})`])
    writeFileSync(join(f.changeDir, 'design.md'), `# 设计\n## 文件变更清单\n| 操作 | 路径 |\n|---|---|\n| 修改 | placeholder.js |\n`)
    const r = await runHunkAttributionGate({
      cwd: f.cwd, specBase: f.specBase, changeName: f.changeName,
      baselineCommit: '0000000000000000000000000000000000000000', // 非法 → git log 失败 → 切分 null
      committedFiles: ['f.js'], gitFn: () => { throw new Error('不应触达') }, gate: 'warn',
    })
    assert.deepEqual(r.unattributed.map((u) => u.file), ['f.js'], '切分不可得时他侧文件保持未归因（fail-closed 原口径）')
    assert.equal(r.foreignByCommit.length, 0, '不改判')
  } finally { f.cleanup() }
})
