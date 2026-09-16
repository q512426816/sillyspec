/**
 * review status 子命令测试（C1 轻量硬机制，坑 review-liveness-opaque——EHS 复盘：审查 94 分钟
 * 无收敛期间宿主无只读探针可查状态）。
 *
 * 覆盖：
 *   1. 无 review → 三阶段「无 review 记录」
 *   2. 有 review：verdict/通道/刷新序数（×2 触发反复改版提示）/代落盘标记/docHash 现势
 *   3. --json 机器口径（stages 数组同构）
 *   4. 缺 --change → exit 2 用法提示
 */
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { runCLI } from './_cli-step-harness.mjs'

const repoRoot = join(dirname(dirname(fileURLToPath(import.meta.url))))
const tempDirs = []
after(() => { for (const d of tempDirs) { try { rmSync(d, { recursive: true, force: true }) } catch { /* Windows EPERM best-effort */ } } })

function mkRepo(prefix) {
  const d = mkdtempSync(join(tmpdir(), prefix))
  tempDirs.push(d)
  execSync('git init -q -b main', { cwd: d, stdio: 'pipe' })
  execSync('git config user.email t@t.t && git config user.name t', { cwd: d, stdio: 'pipe' })
  writeFileSync(join(d, 'README.md'), 'init\n')
  execSync('git add . && git commit -q -m init', { cwd: d, stdio: 'pipe' })
  return d
}

const sha256 = (p) => createHash('sha256').update(readFileSync(p)).digest('hex')

test('① 无 review → 三阶段无记录', () => {
  const cwd = mkRepo('rstatus-none-')
  const r = runCLI(['review', 'status', '--change', '2026-09-16-x'], { cwd })
  assert.equal(r.status, 0, `exit 0（只读查询不因无记录报错；输出：${r.combined.slice(-200)}）`)
  assert.ok(r.combined.includes('无 review 记录'), '三阶段均报无记录')
})

test('②③ 有 review → verdict/通道/刷新序数/代落盘/docHash 现势（文本 + --json）', () => {
  const cwd = mkRepo('rstatus-full-')
  const change = '2026-09-16-rstatus-x'
  const specBase = join(cwd, '.sillyspec')
  const runtimeRoot = join(specBase, '.runtime')
  // 变更目录 + 主文档（design.md）
  const changeDir = join(specBase, 'changes', change)
  mkdirSync(changeDir, { recursive: true })
  const designPath = join(changeDir, 'design.md')
  writeFileSync(designPath, '# design v1\n')
  // plan review：双 pass、channel=agent-tool、被自动刷新 2 次（notes 含两条审计行）→ 反复改版提示
  const planRunDir = join(runtimeRoot, 'stage-reviews', 'plan-review-2026-09-16-010000')
  mkdirSync(planRunDir, { recursive: true })
  writeFileSync(join(planRunDir, 'review.json'), JSON.stringify({
    schemaVersion: 1, reviewType: 'plan', specVerdict: 'pass', qualityVerdict: 'pass',
    reviewedFiles: [`changes/${change}/plan.md`], docHash: 'will-be-stale',
    checklist: [], reviewer: { channel: 'agent-tool', missionId: null, model: null },
    reviewerNotes: 'docHash auto-refreshed at 2026-09-16 01:00:00（第 1 次）\ndocHash auto-refreshed at 2026-09-16 02:00:00（第 2 次）',
  }))
  mkdirSync(join(specBase, 'changes', change, '.'), { recursive: true })
  writeFileSync(join(changeDir, 'plan.md'), '# plan\n')
  // execute review：代落盘披露（首行）→ ⚠️代落盘
  const execRunDir = join(runtimeRoot, 'stage-reviews', 'execute-review-2026-09-16-030000')
  mkdirSync(execRunDir, { recursive: true })
  writeFileSync(join(execRunDir, 'review.json'), JSON.stringify({
    schemaVersion: 1, reviewType: 'acceptance', specVerdict: 'pass', qualityVerdict: 'pass',
    reviewedFiles: [`changes/${change}/design.md`], docHash: sha256(designPath),
    checklist: [], reviewer: { channel: 'agent-tool', missionId: null, model: null },
    reviewerNotes: '代落盘：子代理写通道故障，结论文本回传',
  }))
  // marker（getLatestStageReviewRunId 优先读 marker）
  mkdirSync(runtimeRoot, { recursive: true })
  writeFileSync(join(runtimeRoot, 'current-stage-review-run-id-plan-' + change), 'review-2026-09-16-010000')
  writeFileSync(join(runtimeRoot, 'current-stage-review-run-id-execute-' + change), 'review-2026-09-16-030000')

  const r = runCLI(['review', 'status', '--change', change], { cwd })
  console.log('DBG-OUTPUT>>>', r.combined)
  assert.equal(r.status, 0)
  const planLine = r.combined.split('\n').find(l => l.includes('plan:'))
  assert.ok(planLine && planLine.includes('spec=pass') && planLine.includes('quality=pass'), `plan 行含双 verdict（实际行：${planLine}；全输出尾：${r.combined.slice(-400)}）`)
  assert.ok(planLine.includes('已刷新×2'), 'plan 行含刷新序数 ×2')
  assert.ok(planLine.includes('反复改版'), '×2 触发反复改版提示')
  assert.ok(planLine.includes('docHash=stale'), 'plan 主文档改版未刷新 → stale 现势提示')
  const execLine = r.combined.split('\n').find(l => l.includes('execute:'))
  assert.ok(execLine.includes('⚠️代落盘'), 'execute 行含代落盘标记')
  assert.ok(!execLine.includes('docHash=stale'), 'execute docHash 现势 match 不提示')

  // --json 机器口径
  const rj = runCLI(['review', 'status', '--change', change, '--json'], { cwd })
  const parsed = JSON.parse(rj.stdout.trim().split('\n').pop())
  assert.equal(parsed.ok, true)
  const planRow = parsed.stages.find(s => s.stage === 'plan')
  assert.equal(planRow.refreshCount, 2)
  assert.equal(planRow.status, 'present')
  const execRow = parsed.stages.find(s => s.stage === 'execute')
  assert.equal(execRow.delegatedWrite, true)
})

test('④ 缺 --change → exit 2', () => {
  const cwd = mkRepo('rstatus-usage-')
  const r = runCLI(['review', 'status'], { cwd })
  assert.equal(r.status, 2)
  assert.ok(r.combined.includes('用法'), '用法提示')
})
