/**
 * completeStep characterization — scan 阶段「构建扫描项目列表」per-project 展开
 *
 * 锁住 completeStep 内 scan 分支（run.js:3061-3229）的现有行为：
 * step「构建扫描项目列表」完成时，若 --output 含结构化 scan_projects YAML，按项目展开
 * perProject 步骤（×N 项目），自动注册 projects/<id>.yaml，写 scan-projects.json。
 *
 * 场景：scan steps=[探测项目结构✓, 构建扫描项目列表 pending, ...]，--output 含 1 个项目
 *   myapp → 展开 8 个 perProject 步骤 × 1 项目 = 8 步。
 *
 * 断言：stdout「已按项目展开 8 个步骤 × 1 个项目」+「扫描项目：myapp」+
 *   产物（projects/myapp.yaml）+ DB（steps 含 [myapp] 后缀）+ scanMeta.projectListParsed=true。
 *
 * 注：run-scan-project-parse.test.mjs 只单测 sanitizeProjectName/validateParsedProjects（单元），
 *   不驱动 completeStep 的展开行为；本测试补行为级回归网。
 */
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { _completeStepForTest } from '../src/run.js'
import { runCapturing, makeRepo, initChange, seedStage, cleanup, report } from './_complete-step-harness.mjs'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }

console.log('=== completeStep characterization: scan per-project 展开 ===\n')

console.log('--- 构建扫描项目列表 + YAML scan_projects → 展开 8×1 ---')
{
  const { cwd, specBase } = makeRepo('cs-scan-')
  // scan 是辅助阶段，无变更语义；用一个占位 changeName 让 ProgressManager 落盘
  const cn = '2026-07-25-scan-demo'
  const pm = await initChange(cwd, specBase, cn)
  const steps = [
    { name: '探测项目结构并建议子项目', status: 'completed' },
    { name: '构建扫描项目列表', status: 'pending' },
    { name: '自检和提交', status: 'pending' },
  ]
  const progress = await seedStage(pm, cwd, cn, 'scan', steps)

  const yamlOutput = '扫描完成。\n\nscan_projects:\n  - id: myapp\n'
  const r = await runCapturing(() =>
    _completeStepForTest(pm, progress, 'scan', cwd, yamlOutput, null,
      { changeName: cn, printNext: false }))

  assert(!r.error, 'scan step2 完成不应 process.exit')
  assert(r.stdout.includes('已按项目展开 8 个步骤 × 1 个项目'),
    'stdout 含「已按项目展开 8 个步骤 × 1 个项目」')
  assert(r.stdout.includes('扫描项目：myapp'), 'stdout 含「扫描项目：myapp」')
  assert(existsSync(join(specBase, 'projects', 'myapp.yaml')), '产物：projects/myapp.yaml 已自动注册')
  assert(r.result && r.result.stageCompleted === false, '非末步 → stageCompleted:false')
  assert(r.result && r.result.currentIdx === 1, 'currentIdx=1（构建扫描项目列表）')
  assert(r.result && r.result.nextPendingIdx === 2, 'nextPendingIdx=2（首个展开步）')

  const after = await pm.read(cwd, cn)
  const expanded = after.stages.scan.steps.filter(s => (s.name || '').includes('[myapp]'))
  assert(expanded.length === 8, `DB: 展开 8 个 [myapp] 步骤（实际 ${expanded.length}）`)
  // scanMeta 是运行期内存标记（completeStep 写在 stageData 上），pm.read 不回读它——
  // 锁住这个现状：内存对象被置 true（供同进程下游 scan postcheck 消费）。
  assert(progress.stages.scan.scanMeta?.projectListParsed === true,
    '内存：stageData.scanMeta.projectListParsed=true（运行期标记，不入 DB）')
}

cleanup()
report(count.passed, count.failed, count.failures)
