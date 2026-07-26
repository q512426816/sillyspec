/**
 * completeStep characterization — workflow post_check 分支（run.js:3895-3963）
 *
 * 锁住 scan「深度扫描」步完成时（非完成路径，单步完成 nextPendingIdx!==-1）的 workflow
 * post-check 行为。注意：此分支在完成路径 gate（runStageCompletionGates）之外，构造比
 * execute cleanup 简单（不需过 Task Review Gate）。
 *
 * 触发：stageName==='scan' && steps[currentIdx].name.includes('深度扫描')（3896）
 * 行为：loadWorkflow(cwd,'scan-docs') → 无文件 wf=null 静默跳过；有文件则 runPostCheck：
 *   - role output file_exists 失败 → result.status=fail → anyFailed → 阻断推进
 *     （return {stageCompleted:false, nextPendingIdx:currentIdx}，与 scan 平台 postcheck 失败对齐）
 *   - saveWorkflowRun 归档 → stdout「📁 结果已归档」
 *
 * currentProjectName 优先级链：progress.project > change.project > steps[idx].project
 *   > name 正则提取 [xxx] > null。用「深度扫描 [myapp]」步名提取 project=myapp。
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { _completeStepForTest } from '../src/run.js'
import { runCapturing, makeRepo, initChange, seedStage, cleanup, report } from './_complete-step-harness.mjs'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }

// scan 步：currentIdx=1「深度扫描 [myapp]」pending → 完成后 nextPendingIdx=2（非完成路径）
function scanStepsDeepPending() {
  return [
    { name: '探测项目结构并建议子项目', status: 'completed' },
    { name: '深度扫描 [myapp]', status: 'pending' },
    { name: '自检和提交', status: 'pending' },
  ]
}
// workflow 定义：role output 指向确定不存在的文件 → file_exists fail
const SCAN_DOCS_YAML = `name: scan-docs
spec_version: 1
roles:
  - id: scanner
    name: 扫描器
    outputs:
      - path: docs/<project>/scan/NONEXISTENT.md
        checks:
          - type: file_exists
`

console.log('=== completeStep characterization: workflow post_check（scan 深度扫描）===\n')

// ── Case 1: 无 workflow 文件 → loadWorkflow null → 静默跳过（不阻断）──
console.log('--- 无 workflow 文件 → 静默跳过 ---')
{
  const { cwd, specBase } = makeRepo('cs-wf-none-')
  const cn = 'wf-none'
  const pm = await initChange(cwd, specBase, cn)
  const progress = await seedStage(pm, cwd, cn, 'scan', scanStepsDeepPending())
  // 故意不建 workflows/scan-docs.yaml

  const r = await runCapturing(() =>
    _completeStepForTest(pm, progress, 'scan', cwd, '扫描完成', null,
      { changeName: cn, printNext: false }))

  assert(!r.error, '无 workflow 不应抛异常')
  assert(r.stdout.includes('✅ Step 2/3 完成'), '正常单步完成（Step 2/3）')
  assert(!r.stdout.includes('存在检查失败项'), '无 workflow → 不触发失败阻断')
  assert(!r.stdout.includes('📁 结果已归档'), '无 workflow → 不归档 workflow run')
}

// ── Case 2: workflow 存在 + role output 不存在 → fail → 阻断推进 ──
console.log('\n--- workflow 存在 + role output file_exists fail → 阻断推进 ---')
{
  const { cwd, specBase } = makeRepo('cs-wf-fail-')
  const cn = 'wf-fail'
  const pm = await initChange(cwd, specBase, cn)
  mkdirSync(join(specBase, 'workflows'), { recursive: true })
  writeFileSync(join(specBase, 'workflows', 'scan-docs.yaml'), SCAN_DOCS_YAML)
  const progress = await seedStage(pm, cwd, cn, 'scan', scanStepsDeepPending())

  const r = await runCapturing(() =>
    _completeStepForTest(pm, progress, 'scan', cwd, '扫描完成', null,
      { changeName: cn, printNext: false }))

  assert(!r.error, 'workflow fail 阻断不应抛异常（优雅 return）')
  assert(r.result && r.result.stageCompleted === false, 'stageCompleted:false（阻断推进）')
  assert(r.result && r.result.nextPendingIdx === 1, 'nextPendingIdx=1（回退当前步，--done 被拒）')
  assert(r.stdout.includes('存在检查失败项'), 'stdout 含「存在检查失败项」')
  assert(r.stdout.includes('📁 结果已归档'), 'stdout 含 workflow run 归档')
  assert(r.stdout.includes('NONEXISTENT.md'), 'stdout 点名缺失文件（file_exists fail detail）')
}

cleanup()
report(count.passed, count.failed, count.failures)
