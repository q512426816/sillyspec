/**
 * scan 阶段「构建扫描项目列表」per-project 展开 CLI 行为测试。
 *
 * 从 _completeStepForTest 内部函数迁移为 CLI 子进程测试。锁住：完成「构建扫描项目列表」步且
 * --output 含结构化 scan_projects YAML 时，按项目展开 perProject 步骤（×N 项目），自动注册
 * projects/<id>.yaml。
 *
 * scan 步骤随 profile 变化：--deep 强制 full profile（11 步含「构建扫描项目列表」）。
 * seed-real-steps：init 后读真实步骤，探测 completed + 构建扫描项目列表 pending，再 --done 带 YAML。
 */
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { makeRepo, initChange, seedStage, runStage, runCLI, cleanup, report } from './_cli-step-harness.mjs'
import { ProgressManager } from '../src/progress.js'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }

console.log('=== scan per-project 展开 CLI 行为 ===\n')

console.log('--- 构建扫描项目列表 + YAML scan_projects → 展开 8×1 ---')
{
  const { cwd, specBase } = makeRepo('cli-scan-')
  // scan 是辅助阶段，无变更语义；用占位 changeName 让 ProgressManager 落盘
  const cn = '2026-07-25-scan-demo'
  const pm = await initChange(cwd, specBase, cn)
  runCLI(['--dir', cwd, 'run', 'scan', '--deep', '--change', cn], { cwd })
  const names = (await pm.read(cwd, cn)).stages.scan.steps.map(s => s.name)
  const listIdx = names.findIndex(n => n.includes('构建扫描项目列表'))
  // seed：探测 completed，构建扫描项目列表 pending（--done 完成它触发展开）
  await seedStage(pm, cwd, cn, 'scan', names.map((name, i) => ({ name, status: i < listIdx ? 'completed' : 'pending' })))

  const yamlOutput = '扫描完成。\n\nscan_projects:\n  - id: myapp\n'
  const r = runStage('scan', cn, cwd, { done: true, output: yamlOutput })

  assert(r.status === 0, `exit 0（实际 ${r.status}）`)
  assert(r.combined.includes('已按项目展开') || r.combined.includes('扫描项目：myapp'), 'stdout 含展开/扫描项目提示')
  assert(existsSync(join(specBase, 'projects', 'myapp.yaml')), '产物：projects/myapp.yaml 已自动注册')

  const after = await new ProgressManager({ specDir: specBase }).read(cwd, cn)
  const expanded = after.stages.scan.steps.filter(s => (s.name || '').includes('[myapp]'))
  assert(expanded.length === 8, `DB: 展开 8 个 [myapp] 步骤（实际 ${expanded.length}）`)
}

cleanup()
report(count.passed, count.failed, count.failures)
