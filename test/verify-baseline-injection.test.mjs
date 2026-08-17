/**
 * verify {WORKTREE_BASELINE_INFO} 注入 —— outputStep 端到端验证
 *
 * 锁定（2026-08-18 quick ql-20260818-001）：
 *   - verify 阶段 step prompt 含 {WORKTREE_BASELINE_INFO} → 渲染时被 worktree 基线锚点替换
 *     （分支名 + merge-base + 「勿用主仓 HEAD 当基点」警示），不残留裸占位符
 *   - 分支存在 + meta 存在 → 注入 baseHash/actualBaseHash/merge-base
 *   - 无 worktree（无 meta 无分支）→ 降级指引仍注入（fail-soft，占位符不残留）
 *   - 其他阶段 / 无占位符 step → 不触发注入（零干扰）
 * 复用 outputStep + harness（照 archive-task-completion-injection.test.mjs 范式）。
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { outputStep } from '../src/run/prompt.js'
import { runCapturing, makeRepo, cleanup, report } from './_complete-step-harness.mjs'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log('  ✅ ' + msg)) : (count.failed++, count.failures.push(msg), console.log('  ❌ ' + msg)) }

const STEP = { name: '加载规范并锚定', prompt: '锚定:\n{WORKTREE_BASELINE_INFO}\n确认。', requiresWait: false }
const sh = (cwd, cmd) => execFileSync('git', cmd.split(' '), { cwd, encoding: 'utf8' })

console.log('=== verify {WORKTREE_BASELINE_INFO} 注入（outputStep 端到端）===\n')

console.log('--- ① worktree meta + 分支存在 → 注入基线锚点（含 merge-base 与警示）---')
{
  const { cwd } = makeRepo('os-verify-bl1-')
  const mainBr = sh(cwd, 'rev-parse --abbrev-ref HEAD').trim() || 'master'
  const cn = '2026-08-18-bl-test'
  // 从 main 分出变更分支 + 1 个 commit（模拟 worktree 分支）
  sh(cwd, 'checkout -b sillyspec/' + cn)
  writeFileSync(join(cwd, 'feat.txt'), 'x\n')
  sh(cwd, 'add -A')
  execFileSync('git', ['commit', '-m', 'task-01'], { cwd, stdio: 'pipe' })
  sh(cwd, 'checkout ' + mainBr)
  // 主仓并行推进 1 个 commit（模拟并行 session——merge-base 应停在分叉点而非 main HEAD）
  writeFileSync(join(cwd, 'parallel.txt'), 'y\n')
  sh(cwd, 'add -A')
  execFileSync('git', ['commit', '-m', 'parallel-advance'], { cwd, stdio: 'pipe' })
  // worktree meta
  const metaDir = join(cwd, '.sillyspec', '.runtime', 'worktrees', cn)
  mkdirSync(metaDir, { recursive: true })
  writeFileSync(join(metaDir, 'meta.json'), JSON.stringify({
    name_zh: 'meta', changeName: cn, branch: 'sillyspec/' + cn, baseBranch: mainBr,
    baseHash: 'sha-base', actualBaseHash: 'sha-actual', baselineHash: null, baselineCommit: null,
    worktreePath: metaDir, mode: 'worktree', baselineFiles: [],
  }))
  const r = await runCapturing(() => outputStep('verify', 0, [STEP], cwd, cn, null, {}, null))
  assert(!r.error, 'verify step 渲染不报错')
  assert(!r.stdout.includes('{WORKTREE_BASELINE_INFO}'), '占位符被替换（不残留）')
  assert(r.stdout.includes('sillyspec/' + cn), '注入分支名')
  assert(r.stdout.includes('sha-base') && r.stdout.includes('sha-actual'), '注入 meta baseHash/actualBaseHash')
  assert(r.stdout.includes('merge-base ' + mainBr + ' sillyspec/' + cn), '注入 merge-base 自查命令')
  // merge-base 值应为分叉点（不等于 main HEAD——并行推进后）
  const mb = sh(cwd, 'merge-base ' + mainBr + ' sillyspec/' + cn).trim()
  assert(r.stdout.includes(mb), '注入真实 merge-base hash（' + mb.slice(0, 8) + '，分叉点非 main HEAD）')
  assert(r.stdout.includes('不要用主仓当前 HEAD'), '含「勿用主仓 HEAD 当基点」警示')
}

console.log('\n--- ② 无 worktree（无 meta 无分支）→ 降级指引注入（占位符不残留）---')
{
  const { cwd } = makeRepo('os-verify-bl2-')
  const cn = '2026-08-18-bl-none'
  const r = await runCapturing(() => outputStep('verify', 0, [STEP], cwd, cn, null, {}, null))
  assert(!r.error, '渲染不报错')
  assert(!r.stdout.includes('{WORKTREE_BASELINE_INFO}'), '占位符被替换')
  assert(r.stdout.includes('无 worktree'), '注入「无 worktree」降级指引')
}

console.log('\n--- ③ meta 存在但分支不可达（cleanup 已删）→ 审计链风险提示 ---')
{
  const { cwd } = makeRepo('os-verify-bl3-')
  const mainBr = sh(cwd, 'rev-parse --abbrev-ref HEAD').trim() || 'master'
  const cn = '2026-08-18-bl-gone'
  const metaDir = join(cwd, '.sillyspec', '.runtime', 'worktrees', cn)
  mkdirSync(metaDir, { recursive: true })
  writeFileSync(join(metaDir, 'meta.json'), JSON.stringify({
    name_zh: 'meta', changeName: cn, branch: 'sillyspec/' + cn, baseBranch: mainBr,
    baseHash: 'sha', actualBaseHash: 'sha', baselineHash: null, baselineCommit: null,
    worktreePath: metaDir, mode: 'worktree', baselineFiles: [],
  }))
  const r = await runCapturing(() => outputStep('verify', 0, [STEP], cwd, cn, null, {}, null))
  assert(!r.stdout.includes('{WORKTREE_BASELINE_INFO}'), '占位符被替换')
  assert(r.stdout.includes('分支不可达'), '注入分支不可达提示（按主仓 git log 对照 + 悬空标注指引）')
}

console.log('\n--- ④ 非 verify 阶段同占位符 → 不触发（零干扰）---')
{
  const { cwd } = makeRepo('os-verify-bl4-')
  const r = await runCapturing(() => outputStep('archive', 0, [STEP], cwd, 'x', null, {}, null))
  assert(r.stdout.includes('{WORKTREE_BASELINE_INFO}'), '非 verify 阶段占位符原样保留（注入仅限 verify）')
}

cleanup()
report(count.passed, count.failed, count.failures)
if (count.failed > 0) process.exit(1)
