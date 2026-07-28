/**
 * archive {TASK_COMPLETION_REPORT} 注入 —— outputStep 端到端验证
 *
 * 锁定：
 *   - archive 阶段 step prompt 含 {TASK_COMPLETION_REPORT} → 渲染时被 summarizeTaskCompletion
 *     产出的客观完成度报告替换（不残留裸占位符）
 *   - 无 plan/marker → 降级报告仍注入（fail-safe，绝不残留占位符让 LLM 困惑）
 * 复用 _outputStepForTest + harness（照 output-step-render.test.mjs 范式）。
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { _outputStepForTest } from '../src/run.js'
import { runCapturing, makeRepo, cleanup, report } from './_complete-step-harness.mjs'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log('  ✅ ' + msg)) : (count.failed++, count.failures.push(msg), console.log('  ❌ ' + msg)) }

const STEP = { name: '任务完成度检查', prompt: '完成度:\n{TASK_COMPLETION_REPORT}\n判定。', requiresWait: false }

console.log('=== archive {TASK_COMPLETION_REPORT} 注入（outputStep 端到端）===\n')

console.log('--- ① review.json 全 pass → 占位符替换为客观报告（含 runId）---')
{
  const { cwd } = makeRepo('os-arch-tcr1-')
  const cn = '2026-07-28-arch-tcr'
  const changeDir = join(cwd, '.sillyspec', 'changes', cn)
  const runtimeRoot = join(cwd, '.sillyspec', '.runtime')
  mkdirSync(changeDir, { recursive: true })
  mkdirSync(runtimeRoot, { recursive: true })
  writeFileSync(join(changeDir, 'plan.md'), '- [x] task-01 a\n- [x] task-02 b\n')
  writeFileSync(join(runtimeRoot, 'current-execute-run-id-' + cn), 'run-x\n')
  for (const t of ['01', '02']) {
    const d = join(runtimeRoot, 'execute-runs', 'run-x', 'tasks', 'task-' + t)
    mkdirSync(d, { recursive: true })
    writeFileSync(join(d, 'review.json'), JSON.stringify({
      schemaVersion: 1, task: 'task-' + t, specVerdict: 'pass', qualityVerdict: 'pass', base: 'a', head: 'b'
    }))
  }
  const r = await runCapturing(() => _outputStepForTest('archive', 0, [STEP], cwd, cn, null, {}, null))
  assert(!r.error, 'archive step 渲染不 process.exit')
  assert(!r.stdout.includes('{TASK_COMPLETION_REPORT}'), '{TASK_COMPLETION_REPORT} 被替换（不残留裸占位符）')
  assert(r.stdout.includes('客观完成度') || r.stdout.includes('已通过'), '注入客观完成度报告')
  assert(r.stdout.includes('run-x'), '报告含 runId（review.json 源生效）')
}

console.log('\n--- ② 无 plan/marker → 降级报告仍注入（占位符不残留）---')
{
  const { cwd } = makeRepo('os-arch-tcr2-')
  const cn = '2026-07-28-arch-empty'
  const r = await runCapturing(() => _outputStepForTest('archive', 0, [STEP], cwd, cn, null, {}, null))
  assert(!r.error, 'archive step 渲染不 process.exit')
  assert(!r.stdout.includes('{TASK_COMPLETION_REPORT}'), '降级场景占位符仍被替换（不残留）')
  assert(r.stdout.includes('无法计算') || r.stdout.includes('降级') || r.stdout.includes('plan-checkbox-fallback'), '降级报告内容注入')
}

cleanup()
report(count.passed, count.failed, count.failures)
