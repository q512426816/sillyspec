/**
 * 审计他者残留软判定（坑 foreign-spec-churn-fail-closed + eol-rewrite-fake-mtime-noise，
 * 2026-09-12 驾驭第十六批，用户实证：并行会话 docs/sillyspec 归档移动 + 未跟踪脚本被
 * fail-closed 拦下只能 --allow-delete/--allow-new 解锁；gen:types 行尾重写制造假 M）。
 *
 * 锁定语义：
 *   - .sillyspec/ docs/ 非声明删除（归档移动形态）→ foreignSpecChurn 软警告，不进删除门
 *   - src/test 删除仍 fail-closed（本会话可支配域）
 *   - EOL-only tracked 修改 → 剔出 changedFiles 归 eolOnlyFiles（git --ignore-cr-at-eol 对照）
 *   - 新增文件 mtime 早于会话启动 → reason 带「预存残留」归因注记
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, utimesSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { spawnSync } from 'node:child_process'
import { auditQuickCompletion } from '../src/run/shared.js'

const tmpRoots = []
function mk(p) { const d = mkdtempSync(join(tmpdir(), p)); tmpRoots.push(d); return d }
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

function git(dir, args) {
  const r = spawnSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`)
  return r.stdout.trim()
}

function setupBase() {
  const cwd = mk('fsx-')
  git(cwd, ['init', '-q']); git(cwd, ['config', 'user.email', 't@t.local']); git(cwd, ['config', 'user.name', 't'])
  // 提交：spec 共享面文件 + src 交付文件（LF 行尾供 EOL 用例改写）
  mkdirSync(join(cwd, '.sillyspec', 'changes', 'other-change'), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', 'changes', 'other-change', 'design.md'), '# D\n')
  mkdirSync(join(cwd, 'src'), { recursive: true })
  writeFileSync(join(cwd, 'src', 'app.js'), 'a\nb\nc\n')
  mkdirSync(join(cwd, 'src', 'del-me'), { recursive: true })
  writeFileSync(join(cwd, 'src', 'del-me', 'x.js'), 'x\n')
  mkdirSync(join(cwd, '.sillyspec', 'quicklog'), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', 'quicklog', 'QUICKLOG-test.md'), '# ql' + String.fromCharCode(10))
  git(cwd, ['add', '.']); git(cwd, ['commit', '-q', '-m', 'init'])
  return cwd
}

function guardFor(cwd, startedAtIso) {
  return {
    sessionId: 'quick-test', startedAt: startedAtIso || new Date().toISOString(),
    baselineFiles: [], allowedFiles: [], linkedChanges: [], otherSessionsDeclared: [],
  }
}

test('spec 共享面归档移动删除 → foreignSpecChurn 软警告不阻断；src 删除仍阻断', async () => {
  const cwd = setupBase()
  // 并行会话归档移动：changes/other-change/design.md 删 + archive 侧加（删除面是本测焦点）
  rmSync(join(cwd, '.sillyspec', 'changes', 'other-change', 'design.md'))
  mkdirSync(join(cwd, '.sillyspec', 'changes', 'archive', 'other-change'), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', 'changes', 'archive', 'other-change', 'design.md'), '# D\n')
  // 本会话可支配域删除（应仍拦）
  rmSync(join(cwd, 'src', 'del-me', 'x.js'))

  const r = await auditQuickCompletion(cwd, guardFor(cwd))
  assert.ok(r.foreignSpecChurn && r.foreignSpecChurn.some(f => f.includes('other-change/design.md')),
    '归档移动删除进 foreignSpecChurn（软警告面）')
  assert.ok(!r.reasons.some(x => x.includes('other-change/design.md')), 'spec 面删除不再进删除门 reason')
  assert.ok(r.reasons.some(x => x.startsWith('删除文件: src/del-me/x.js')), 'src 删除仍 fail-closed')
  assert.equal(r.status, 'blocked', 'src 删除在 → 整体仍 blocked（正确）')

  // 无 src 删除的纯 spec 移动场景 → 不 blocked
  const cwd2 = setupBase()
  rmSync(join(cwd2, '.sillyspec', 'changes', 'other-change', 'design.md'))
  const r2 = await auditQuickCompletion(cwd2, guardFor(cwd2))
  assert.notEqual(r2.status, 'blocked', `纯 spec 面移动不阻断（实际 ${r2.status}）`)
  assert.ok(r2.foreignSpecChurn && r2.foreignSpecChurn.length === 1, '归因清单在场')
})

test('声明过的 spec 删除不降级（ownDeclaredNorm 命中走原门）', async () => {
  const cwd = setupBase()
  rmSync(join(cwd, '.sillyspec', 'changes', 'other-change', 'design.md'))
  const g = guardFor(cwd)
  g.allowedFiles = ['.sillyspec/changes/other-change/design.md']
  const r = await auditQuickCompletion(cwd, g)
  assert.ok(!r.foreignSpecChurn || r.foreignSpecChurn.length === 0, '本会话声明的删除不归他者')
  assert.ok(r.reasons.some(x => x.startsWith('删除文件')), '声明删除走原 fail-closed 门')
})

test('EOL-only 假 M 剔出审计；真实修改保留', async () => {
  const cwd = setupBase()
  // EOL-only：src/app.js LF → CRLF（内容零变化）
  writeFileSync(join(cwd, 'src', 'app.js'), 'a\r\nb\r\nc\r\n')
  // 真实修改
  writeFileSync(join(cwd, 'src', 'new.js'), 'real change\n')
  const r = await auditQuickCompletion(cwd, guardFor(cwd))
  assert.ok(r.eolOnlyFiles && r.eolOnlyFiles.includes('src/app.js'), 'EOL-only 文件归 eolOnlyFiles')
  assert.ok(!r.changedFiles.includes('src/app.js'), '假 M 不进 changedFiles（文件行/门不触发）')
  assert.ok(r.changedFiles.includes('src/new.js'), '真实修改保留')
})

test('新增文件 mtime 早于会话启动 → reason 带预存残留归因注记', async () => {
  const cwd = setupBase()
  writeFileSync(join(cwd, 'residue.mjs'), 'x\n')
  // mtime 拨回 1 小时前；会话 startedAt = 现在
  const past = new Date(Date.now() - 3600_000)
  utimesSync(join(cwd, 'residue.mjs'), past, past)
  const r = await auditQuickCompletion(cwd, guardFor(cwd))
  const hit = r.reasons.find(x => x.includes('residue.mjs'))
  assert.ok(hit && hit.includes('预存残留'), `归因注记在场（实际：${hit}）`)
})
