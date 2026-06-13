/**
 * 平台 scan 产物协议测试
 *
 * 验证：
 * 1. saveWorkflowRun 传入 runtimeRoot + scanRunId 时写到正确路径
 * 2. manifest.json 结构包含产物指针（postcheck_result_path, workflow_runs_dir）
 * 3. 非平台模式下 workflow-runs 写入 cwd/.sillyspec/.runtime/
 *
 * 跑法: node test/platform-artifacts.test.mjs
 */

import { join, dirname } from 'path'
import { existsSync, mkdirSync, rmSync, readFileSync, readdirSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const passed = []
const failed = []

function assert(label, condition, detail) {
  if (condition) {
    passed.push(label)
    console.log(`  ✅ PASS: ${label}`)
  } else {
    failed.push({ label, detail })
    console.log(`  ❌ FAIL: ${label}`)
    if (detail) console.log(`     ${detail}`)
  }
}

function cleanup(dir) {
  try { rmSync(dir, { recursive: true, force: true }) } catch {}
}

// ── 测试 1：saveWorkflowRun 平台模式路径正确 ──
console.log('\n=== Test 1: saveWorkflowRun 平台模式写入路径 ===')
{
  const { saveWorkflowRun } = await import('../src/workflow.js')
  const tmpRoot = `/tmp/test-artifacts-${randomUUID().slice(0, 8)}`
  const runtimeRoot = join(tmpRoot, 'runtime')
  const scanRunId = 'scan-20260614-test-001'

  const result = {
    workflow: 'scan-docs',
    project: 'test-project',
    status: 'pass',
    spec_version: 1,
    roles: [],
    workflow_checks: [],
    failures: [],
  }

  const saved = saveWorkflowRun(result, {
    cwd: '/fake/cwd',
    source: 'test',
    stage: 'scan',
    runtimeRoot,
    scanRunId,
  })

  const expectedDir = join(runtimeRoot, 'scan-runs', scanRunId, 'workflow-runs')
  assert('workflow-runs 目录存在', existsSync(expectedDir))
  assert('workflow-runs 文件存在', existsSync(saved), `路径: ${saved}`)
  assert('路径在 runtime-root 下', saved.startsWith(runtimeRoot), `路径: ${saved}`)
  assert('路径包含 scan-runs', saved.includes('scan-runs'), `路径: ${saved}`)
  assert('路径包含 scanRunId', saved.includes(scanRunId), `路径: ${saved}`)

  // 验证 JSON 内容
  const content = JSON.parse(readFileSync(saved, 'utf8'))
  assert('JSON 有 run_id', !!content.run_id)
  assert('JSON 有 created_at', !!content.created_at)
  assert('JSON source = test', content.source === 'test')
  assert('JSON stage = scan', content.stage === 'scan')
  assert('JSON workflow = scan-docs', content.workflow === 'scan-docs')

  cleanup(tmpRoot)
}

// ── 测试 2：saveWorkflowRun 本地模式路径正确 ──
console.log('\n=== Test 2: saveWorkflowRun 本地模式写入路径 ===')
{
  const { saveWorkflowRun } = await import('../src/workflow.js')
  const tmpCwd = `/tmp/test-artifacts-local-${randomUUID().slice(0, 8)}`
  const sillyspecDir = join(tmpCwd, '.sillyspec', '.runtime', 'workflow-runs')

  const result = {
    workflow: 'test-wf',
    project: 'default',
    status: 'fail',
    spec_version: 1,
    roles: [],
    workflow_checks: [],
    failures: ['check-1 failed'],
  }

  const saved = saveWorkflowRun(result, {
    cwd: tmpCwd,
    source: 'test',
    stage: 'scan',
    // 不传 runtimeRoot 和 scanRunId
  })

  assert('本地模式文件存在', existsSync(saved))
  assert('本地路径在 .sillyspec/.runtime 下', saved.includes('.sillyspec/.runtime/workflow-runs'), `路径: ${saved}`)

  const content = JSON.parse(readFileSync(saved, 'utf8'))
  assert('本地 JSON status = fail', content.status === 'fail')
  assert('本地 JSON 有 failures', Array.isArray(content.failures))

  cleanup(tmpCwd)
}

// ── 测试 3：manifest 结构验证（从 run.js 源码静态检查） ──
console.log('\n=== Test 3: manifest.json 结构字段 ===')
{
  const { readFile } = await import('fs/promises')
  const runSrc = await readFile(join(__dirname, '..', 'src', 'run.js'), 'utf8')

  // 平台模式 manifest 初始化
  assert('manifest 包含 workspace_id', runSrc.includes('workspace_id:'))
  assert('manifest 包含 scan_run_id', runSrc.includes('scan_run_id:'))
  assert('manifest 包含 source_commit', runSrc.includes('source_commit:'))
  assert('manifest 包含 source_commit_error', runSrc.includes('source_commit_error:'))
  assert('manifest 包含 generated_at', runSrc.includes('generated_at:'))
  assert('manifest 包含 schema_version', runSrc.includes('schema_version:'))
  assert('manifest 包含 postcheck_result_path', runSrc.includes('postcheck_result_path:'))
  assert('manifest 包含 workflow_runs_dir', runSrc.includes('workflow_runs_dir:'))

  // postcheck_result_path 在 postcheck 写入后填充
  assert('manifest.postcheck_result_path 下游填充', runSrc.includes('manifest.postcheck_result_path = postcheckJsonPath'))

  // workflow_runs_dir 使用 runtimeRoot + scanRunId
  assert('workflow_runs_dir 基于 runtimeRoot', runSrc.includes("join(platformOpts.runtimeRoot, 'scan-runs'"))
}

// ── 测试 4：平台指针状态更新（源码检查） ──
console.log('\n=== Test 4: 平台指针 scan 完成后状态更新 ===')
{
  const { readFile } = await import('fs/promises')
  const runSrc = await readFile(join(__dirname, '..', 'src', 'run.js'), 'utf8')

  assert('scan 完成后读取 pointer 文件', runSrc.includes('pointerPath'))
  assert('pointer status 使用 POINTER_STATUS 枚举', runSrc.includes('POINTER_STATUS'))
  assert('pointer 记录 completedAt', runSrc.includes('pointer.completedAt'))
  assert('pointer 记录 scanStatus', runSrc.includes('pointer.scanStatus'))
}

// ── 测试 5：saveWorkflowRun 调用点传入 runtimeRoot（源码检查） ──
console.log('\n=== Test 5: run.js 调用 saveWorkflowRun 传入平台参数 ===')
{
  const { readFile } = await import('fs/promises')
  const runSrc = await readFile(join(__dirname, '..', 'src', 'run.js'), 'utf8')

  // 找到 saveWorkflowRun 调用
  const calls = runSrc.match(/saveWorkflowRun\([^)]+\{[^}]+\}/gs)
  assert('至少有 2 处 saveWorkflowRun 调用', calls && calls.length >= 2, `实际: ${calls?.length}`)

  // 检查调用是否包含 runtimeRoot 传递
  const hasRuntimeRoot = runSrc.includes('platformOpts.runtimeRoot ? { runtimeRoot: platformOpts.runtimeRoot }')
  assert('saveWorkflowRun 调用传入 runtimeRoot', hasRuntimeRoot, '未发现 runtimeRoot 传递')

  const hasScanRunId = runSrc.includes('platformOpts.scanRunId ? { scanRunId: platformOpts.scanRunId }')
  assert('saveWorkflowRun 调用传入 scanRunId', hasScanRunId, '未发现 scanRunId 传递')
}

// ── 结果 ──
console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed.length}  ❌ 失败: ${failed.length}`)
console.log(`${'='.repeat(50)}`)

if (failed.length > 0) {
  console.log('\n失败详情:')
  for (const f of failed) {
    console.log(`  ❌ ${f.label}`)
    if (f.detail) console.log(`     ${f.detail}`)
  }
  throw new Error('platform-artifacts test failed')
} else {
  console.log('\n🎉 平台产物协议测试全部通过!')
}
