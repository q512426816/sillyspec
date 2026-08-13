/**
 * outputStep {SPEC_ROOT} specDriftAnchor 锚定测试（2026-08-13-quick-hunk-separation 后续修复）
 *
 * BUG 根因：execute 阶段 CLI 自动锚定主仓 spec（detectWorktreeSpecDrift → platformOpts.specDriftAnchor）
 * 只修正了 resolveRuntimeRoot 的 runtime 落点，outputStep 拼 {SPEC_ROOT}/.runtime/execute-runs/… 仍用
 * cwd（worktree）→ 提示的 review.json 路径落到 worktree 副本 .sillyspec，而 gate/checkbox 从主仓
 * resolveRuntimeRoot 读 → agent 落盘错位，marker 漂移改用他 run / task 未勾。
 *
 * 修复：prompt.js 加 resolvePromptSpecBase（specRoot > specDriftAnchor > cwd/.sillyspec），
 * outputStep 内 12 处路径根解析统一改用它。
 *
 * 覆盖：
 *   1. specDriftAnchor 设置（cwd=worktree）→ 提示 review.json 路径用锚定主仓 specBase，不含 worktree 副本
 *   2. 无锚定（主仓正常跑）→ {SPEC_ROOT} = cwd/.sillyspec（零回归）
 *   3. resolvePromptSpecBase 优先级：specRoot(平台) > specDriftAnchor > cwd/.sillyspec
 */
import { outputStep, resolvePromptSpecBase } from '../src/run/prompt.js'
import { join } from 'node:path'
import { runCapturing, makeRepo, cleanup, report } from './_complete-step-harness.mjs'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }

console.log('=== outputStep {SPEC_ROOT} specDriftAnchor 锚定（execute review.json 路径）===\n')

// Case 1: specDriftAnchor 设置（cwd=worktree）→ {SPEC_ROOT} 替换为锚定主仓 specBase
{
  const { cwd } = makeRepo('pdrift-1-')
  const mainSpecBase = join(cwd, '.sillyspec')
  // 模拟 worktree cwd：主仓 .sillyspec/.runtime/worktrees/<change> 下
  const worktreeCwd = join(cwd, '.sillyspec', '.runtime', 'worktrees', 'quick-hunk')
  const steps = [{ name: 'Wave 1 执行', prompt: 'task-XX 对应：{SPEC_ROOT}/.runtime/execute-runs/{EXECUTE_RUN_ID}/tasks/task-XX/review.json', requiresWait: false }]
  const r = await runCapturing(() =>
    outputStep('execute', 0, steps, worktreeCwd, 'quick-hunk', 'sillyspec', { specDriftAnchor: mainSpecBase }, null))
  assert(!r.error, 'Case1 渲染不应抛错')
  assert(r.stdout.includes(`${mainSpecBase}/.runtime/execute-runs/`),
    `Case1 review.json 提示路径用锚定主仓 specBase（${mainSpecBase}/.runtime/execute-runs/…）`)
  assert(!r.stdout.includes(`${worktreeCwd}/.sillyspec/.runtime/execute-runs/`),
    'Case1 提示路径不含 worktree 副本路径（修复前 BUG 分裂）')
}

// Case 2: 无 specDriftAnchor（主仓正常跑）→ {SPEC_ROOT} = cwd/.sillyspec（零回归）
{
  const { cwd } = makeRepo('pdrift-2-')
  const specBase = join(cwd, '.sillyspec')
  const steps = [{ name: 'Wave 1 执行', prompt: 'task-XX 对应：{SPEC_ROOT}/.runtime/execute-runs/{EXECUTE_RUN_ID}/tasks/task-XX/review.json', requiresWait: false }]
  const r = await runCapturing(() =>
    outputStep('execute', 0, steps, cwd, 'quick-hunk', 'sillyspec', {}, null))
  assert(!r.error, 'Case2 渲染不应抛错')
  assert(r.stdout.includes(`${specBase}/.runtime/execute-runs/`),
    `Case2 无锚定时 {SPEC_ROOT} = cwd/.sillyspec（${specBase}/.runtime/execute-runs/…），零回归`)
}

// Case 3: resolvePromptSpecBase 优先级：specRoot(平台) > specDriftAnchor > cwd/.sillyspec
{
  const fakeCwd = join('C:', 'fake', 'repo')
  const platformRoot = join('P:', 'platform', 'spec')
  const anchorRoot = join('M:', 'main', '.sillyspec')
  assert(resolvePromptSpecBase({ specRoot: platformRoot, specDriftAnchor: anchorRoot }, fakeCwd) === platformRoot,
    'Case3 平台 specRoot 优先于 specDriftAnchor')
  assert(resolvePromptSpecBase({ specDriftAnchor: anchorRoot }, fakeCwd) === anchorRoot,
    'Case3 specDriftAnchor 优先于 cwd/.sillyspec')
  assert(resolvePromptSpecBase({}, fakeCwd) === join(fakeCwd, '.sillyspec'),
    'Case3 无锚定回退 cwd/.sillyspec')
}

cleanup()
report(count.passed, count.failed, count.failures)
