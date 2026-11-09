/**
 * 2026-11-09-archive-landing-visibility 回归：归档落库终态可见性与 doctor 残留检查。
 *
 * 动机（multi-agent-platform 仓 2026-11-09 三变更实证）：flow done 的「🚨 归档提交
 * 未落库」打在输出中段、末行是「✅ flow done 完成」——尾部消费假成功，归档件滞留
 * 共享暂存区可被并行 index 手术冲掉。
 *
 * 覆盖：
 *   ① renderArchiveLandingEpilogue：落库 → 单行确认；未落库 → 🚨 尾块含后果+命令+核对行
 *   ② computeArchiveLanding（临时 git 仓）：staged 未提交 → landed=false + commitCommand
 *      含 archive/ pathspec；提交后 → landed=true
 *   ③ detectArchiveCommitResidue（临时 git 仓）：半归档残留 → WARNING 点名变更 + safe_actions
 *      修复命令；提交后 → PASSED；非 git 仓 → skipped
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { execFileSync } from 'node:child_process'

const ROOT = dirname(fileURLToPath(import.meta.url))
const { renderArchiveLandingEpilogue, computeArchiveLanding } = await import(
  pathToFileURL(join(ROOT, '..', 'src', 'run', 'complete-handlers.js')).href
)
const { detectArchiveCommitResidue } = await import(
  pathToFileURL(join(ROOT, '..', 'src', 'doctor-diagnostics.js')).href
)

const CHANGE = '2026-11-09-landing-x'

function git(dir, args) {
  return execFileSync('git', ['-c', 'core.quotepath=false', ...args], {
    cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  }).trim()
}

function cleanup(dir) {
  try { rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }) } catch { /* 留待系统清理 */ }
}

function buildRepo() {
  const cwd = mkdtempSync(join(tmpdir(), 'alep-'))
  git(cwd, ['init', '-q'])
  git(cwd, ['config', 'user.email', 't@t'])
  git(cwd, ['config', 'user.name', 't'])
  const c = join(cwd, '.sillyspec', 'changes', CHANGE)
  mkdirSync(c, { recursive: true })
  writeFileSync(join(c, 'design.md'), 'design v1\n')
  git(cwd, ['add', '-A', '--', '.sillyspec'])
  git(cwd, ['commit', '-qm', 'base'])
  return cwd
}

test('① renderArchiveLandingEpilogue：落库单行确认 / 未落库 🚨 尾块', () => {
  const ok = renderArchiveLandingEpilogue({ landed: true })
  assert.ok(ok.includes('归档提交已落库'), '落库态含确认')
  assert.ok(!ok.includes('🚨'), '落库态无 🚨')

  const warn = renderArchiveLandingEpilogue({ landed: false, commitCommand: `git commit -m "chore(archive): ${CHANGE} 归档留档" -- x y` })
  assert.ok(warn.startsWith('🚨'), '未落库态以 🚨 开头')
  assert.ok(warn.includes('会丢归档'), '含后果提示')
  assert.ok(warn.includes(`git commit -m "chore(archive): ${CHANGE} 归档留档" -- x y`), '含可执行命令')
  assert.ok(warn.includes('执行后核对'), '含核对行')

  const noCmd = renderArchiveLandingEpilogue({ landed: false, commitCommand: null })
  assert.ok(noCmd.includes('🚨') && !noCmd.includes('git commit -m'), '无命令态不伪造命令')
})

test('② computeArchiveLanding：staged 未提交 false+命令 / 提交后 true', () => {
  const cwd = buildRepo()
  try {
    // 半归档：git mv 到 archive/ 后停在暂存区（未 commit）。
    const arch = join(cwd, '.sillyspec', 'changes', 'archive', CHANGE)
    mkdirSync(arch, { recursive: true })
    git(cwd, ['mv', `.sillyspec/changes/${CHANGE}/design.md`, `.sillyspec/changes/archive/${CHANGE}/design.md`])
    let r = computeArchiveLanding({ cwd, changeName: CHANGE })
    assert.equal(r.landed, false, '未提交 → landed=false')
    assert.ok(r.commitCommand && r.commitCommand.includes(`archive/${CHANGE}`), '命令含归档侧 pathspec')

    git(cwd, ['commit', '-qm', `chore(archive): ${CHANGE} 归档留档`])
    r = computeArchiveLanding({ cwd, changeName: CHANGE })
    assert.equal(r.landed, true, '提交后 → landed=true')
    assert.equal(r.commitCommand, null, '落库态不产命令')
  } finally {
    cleanup(cwd)
  }
})

test('③ detectArchiveCommitResidue：残留 WARNING / 提交后 PASSED / 非仓 skipped', () => {
  const cwd = buildRepo()
  try {
    const arch = join(cwd, '.sillyspec', 'changes', 'archive', CHANGE)
    mkdirSync(arch, { recursive: true })
    git(cwd, ['mv', `.sillyspec/changes/${CHANGE}/design.md`, `.sillyspec/changes/archive/${CHANGE}/design.md`])
    let r = detectArchiveCommitResidue(cwd)
    assert.equal(r.pass, false, '半归档 → 不通过')
    assert.equal(r.severity, 'warning', '严重度 WARNING（常量小写形态）')
    assert.ok(r.findings.some((f) => f.includes(CHANGE)), 'findings 点名变更')
    assert.ok(r.safe_actions.some((a) => a.action.includes(`chore(archive): ${CHANGE}`) && a.action.includes(`archive/${CHANGE}`)), 'safe_actions 含修复命令')

    git(cwd, ['commit', '-qm', `chore(archive): ${CHANGE} 归档留档`])
    r = detectArchiveCommitResidue(cwd)
    assert.equal(r.pass, true, '落库后 → PASSED')

    const notRepo = mkdtempSync(join(tmpdir(), 'alep-norepo-'))
    try {
      const skipped = detectArchiveCommitResidue(notRepo)
      assert.equal(skipped.skipped, true, '非 git 仓 → skipped')
      assert.notEqual(skipped.severity, 'ERROR', '非仓不判红')
    } finally {
      cleanup(notRepo)
    }
  } finally {
    cleanup(cwd)
  }
})
