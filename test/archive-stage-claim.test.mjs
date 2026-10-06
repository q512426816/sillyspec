/**
 * 坑 archive-stage-claim 回归（2026-10-06-module-map-list-leak 收口实测发现）：
 * runArchiveChain「补暂存源侧移动」批处理调用 safeGit(add) 后无条件打印成功提示——
 * safeGit 契约是返回 {value, error} 不抛错（git-helper.js），add 失败（index.lock 竞态等）
 * 时成功提示照印，暂存面实际缺项（实测声称补暂存 1 项但暂存面无该删除，靠人工核对
 * 暂存面纪律兜住后手工补提交）。
 *
 * 锁定语义：失败 → ⚠️ 告警（失败路径 + error 首行 + 手工兜底指引）且不打成功提示；
 * 成功 → 既有成功提示逐字不变（含 N 项计数），暂存实态与提示一致。失败注入用
 * .git/index.lock（确定性：git add 遇锁文件必败，非 sleep/时序依赖）。
 */
import { writeFileSync, mkdirSync, mkdtempSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { stageArchiveSourceSideMoves, renderStageSourceSideMovesMessage } from '../src/run/complete-handlers.js'

let passed = 0, failed = 0
function assert(cond, msg) {
  if (cond) { passed++; console.log(`  ✅ PASS: ${msg}`) }
  else { failed++; console.log(`  ❌ FAIL: ${msg}`) }
}

function git(dir, args) {
  return execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
}

console.log('=== stageArchiveSourceSideMoves 结果校验（坑 archive-stage-claim）===\n')

// ── 1: 成功路径——提示逐字不变 + 暂存实态 ──
console.log('--- Test 1: add 成功——ok:true + 既有文案 + 暂存区真实含删除 ---')
{
  const cwd = mkdtempSync(join(tmpdir(), 'stgclaim-1-'))
  try {
    git(cwd, ['init', '-q']); git(cwd, ['config', 'user.email', 't@t']); git(cwd, ['config', 'user.name', 't'])
    writeFileSync(join(cwd, 'base.txt'), 'b\n')
    git(cwd, ['add', '.']); git(cwd, ['commit', '-q', '-m', 'b'])
    // 制造源侧移动形态：tracked 文件在 worktree 删除（未暂存 D）
    const p = '.sillyspec/changes/2026-10-06-x/tasks.md'
    mkdirSync(join(cwd, '.sillyspec/changes/2026-10-06-x'), { recursive: true })
    writeFileSync(join(cwd, p), '- [x] task-01: a\n')
    git(cwd, ['add', '--', p]); git(cwd, ['commit', '-q', '-m', 'tasks'])
    rmSync(join(cwd, p))

    const r = stageArchiveSourceSideMoves({ cwd, paths: [p] })
    assert(r.ok === true && r.count === 1 && (r.failures || []).length === 0,
      `返回 {ok:true, count:1, failures:[]}（实际 ${JSON.stringify(r)}）`)
    const msg = renderStageSourceSideMovesMessage(r)
    assert(msg.includes('已补暂存本变更归档的源侧移动（1 项，归档成单次原子提交）'),
      `成功文案与既有提示逐字一致（实际 ${JSON.stringify(msg)}）`)
    assert(!msg.includes('⚠️'), '成功文案不含告警')
    const staged = git(cwd, ['diff', '--cached', '--name-status'])
    assert(staged.includes('D') && staged.includes('tasks.md'), `暂存区真实含删除（实际 ${staged}）`)
  } finally { rmSync(cwd, { recursive: true, force: true }) }
}

// ── 2: 失败路径——index.lock 逼 add 失败：告警不打成功提示 ──
console.log('--- Test 2: add 失败——ok:false + 告警文案（路径/指引）+ 不打成功提示 ---')
{
  const cwd = mkdtempSync(join(tmpdir(), 'stgclaim-2-'))
  try {
    git(cwd, ['init', '-q']); git(cwd, ['config', 'user.email', 't@t']); git(cwd, ['config', 'user.name', 't'])
    writeFileSync(join(cwd, 'base.txt'), 'b\n')
    git(cwd, ['add', '.']); git(cwd, ['commit', '-q', '-m', 'b'])
    const p = '.sillyspec/changes/2026-10-06-x/tasks.md'
    mkdirSync(join(cwd, '.sillyspec/changes/2026-10-06-x'), { recursive: true })
    writeFileSync(join(cwd, p), '- [x] task-01: a\n')
    git(cwd, ['add', '--', p]); git(cwd, ['commit', '-q', '-m', 'tasks'])
    rmSync(join(cwd, p))
    // 确定性失败注入：持有 index.lock，git add 必败
    writeFileSync(join(cwd, '.git', 'index.lock'), '')

    const r = stageArchiveSourceSideMoves({ cwd, paths: [p] })
    assert(r.ok === false, `返回 ok:false（实际 ${JSON.stringify(r)}）`)
    assert((r.failures || []).length === 1 && r.failures[0].path === p,
      `failures 含失败路径（实际 ${JSON.stringify(r.failures)}）`)
    assert(typeof r.failures[0].error === 'string' && r.failures[0].error.length > 0, 'failures 含 error 首行')
    const msg = renderStageSourceSideMovesMessage(r)
    assert(msg.startsWith('⚠️'), `告警文案以 ⚠️ 开头（实际 ${JSON.stringify(msg.slice(0, 30))}）`)
    assert(msg.includes(p), '告警文案含失败路径')
    assert(msg.includes('git add -- '), '告警文案含手工兜底指引（git add -- <路径>）')
    assert(!msg.includes('已补暂存本变更归档的源侧移动'), '失败时不打成功提示')
    // 释放锁后重跑 → 成功（fail-soft 幂等：告警不阻断，人工/重试自愈）
    rmSync(join(cwd, '.git', 'index.lock'))
    const r2 = stageArchiveSourceSideMoves({ cwd, paths: [p] })
    assert(r2.ok === true, '锁释放后重跑成功（fail-soft 幂等）')
  } finally { rmSync(cwd, { recursive: true, force: true }) }
}

// ── 3: 空清单——零行为（不打印任何提示） ──
console.log('--- Test 3: 空清单零输出 ---')
{
  const r = stageArchiveSourceSideMoves({ cwd: tmpdir(), paths: [] })
  assert(r.ok === true && r.count === 0, '空清单 {ok:true, count:0}')
  assert(renderStageSourceSideMovesMessage(r) === '', '空清单渲染零文案')
}

console.log(`\n结果: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
