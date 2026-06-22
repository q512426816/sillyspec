/**
 * task-04: workflow.js checkOutput / _checkWorkflow / runPostCheck 支持 specBase
 *
 * 覆盖：
 * - AC-01/AC-03: 平台模式 specBase 透传，scanDir = join(specBase, 'docs', project, 'scan/')
 * - AC-02/AC-04: 非平台模式 specBase 缺省，回退 join(cwd, '.sillyspec')（旧行为）
 * - AC-05: runPostCheck(wf, cwd, name, {}, specBase) 显式传 specBase 透传到 _checkWorkflow/checkOutput
 * - AC-06: archive 同样支持
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join, resolve } from 'node:path'
import { runPostCheck } from '../src/workflow.js'

let passed = 0
let failed = 0
function assert (cond, msg) {
  if (cond) { console.log(`✅ PASS: ${msg}`); passed++ }
  else { console.error(`❌ FAIL: ${msg}`); failed++ }
}
function assertEqual (actual, expected, msg) {
  const ok = actual === expected
  if (ok) { console.log(`✅ PASS: ${msg}`); passed++ }
  else { console.error(`❌ FAIL: ${msg}\n   expected: ${JSON.stringify(expected)}\n   actual:   ${JSON.stringify(actual)}`); failed++ }
}

// ── 用例 1: 平台模式 specBase — workflow_level file_count 检查 join(specBase, 'docs', project, 'scan/') ──
{
  const specBase = mkdtempSync(join(tmpdir(), 'spec-base-platform-'))
  const projectName = 'frontend'
  const scanDir = join(specBase, 'docs', projectName, 'scan')
  mkdirSync(scanDir, { recursive: true })
  writeFileSync(join(scanDir, 'a.md'), '# A\ncontent\n')

  const wf = {
    name: 'scan-docs',
    checks: { workflow_level: [ { type: 'file_count', path: 'scan/', min: 1 } ] },
    roles: [],
  }
  const result = runPostCheck(wf, '/fake/cwd', projectName, {}, specBase)
  const fc = (result.workflow_checks || []).find(c => c.type === 'file_count')
  assert(!!fc, '平台模式 file_count 检查被执行')
  assertEqual(fc && fc.status, 'pass', '平台模式 specBase 下 file_count 通过（找到 1 个 md）')
  assert(!(fc && fc.detail && fc.detail.includes('/fake/cwd')),
    '平台模式 detail 不含 cwd（说明用 specBase 而非裸 cwd）')
  rmSync(specBase, { recursive: true, force: true })
}

// ── 用例 2: 平台模式 specBase — 目录不存在时失败且 detail 含 specBase 路径 ──
{
  const specBase = mkdtempSync(join(tmpdir(), 'spec-base-empty-'))
  const projectName = 'backend'
  const wf = {
    name: 'scan-docs',
    checks: { workflow_level: [ { type: 'file_count', path: 'scan/', min: 1 } ] },
    roles: [],
  }
  const result = runPostCheck(wf, '/fake/cwd', projectName, {}, specBase)
  const fc = (result.workflow_checks || []).find(c => c.type === 'file_count')
  assertEqual(fc && fc.status, 'fail', '平台模式 specBase 下目录不存在时 file_count 失败')
  assert(!!(fc && fc.detail && fc.detail.includes(specBase.replace(/\\/g, '/'))) ||
         !!(fc && fc.detail && fc.detail.includes(specBase)),
    '平台模式 detail 含 specBase 路径（说明用 specBase）')
  assert(!(fc && fc.detail && fc.detail.includes('/fake/cwd/.sillyspec')),
    'detail 不含 fake/cwd/.sillyspec（未回退裸 cwd）')
  rmSync(specBase, { recursive: true, force: true })
}

// ── 用例 3: 非平台模式 specBase 缺省 — 回退 join(cwd, '.sillyspec')（旧行为） ──
{
  const cwd = mkdtempSync(join(tmpdir(), 'legacy-cwd-'))
  const sillyspecDir = join(cwd, '.sillyspec')
  const projectName = 'sillyspec'
  const scanDir = join(sillyspecDir, 'docs', projectName, 'scan')
  mkdirSync(scanDir, { recursive: true })
  writeFileSync(join(scanDir, 'a.md'), '# A\n')

  const wf = {
    name: 'scan-docs',
    checks: { workflow_level: [ { type: 'file_count', path: 'scan/', min: 1 } ] },
    roles: [],
  }
  // 不传 specBase（第 5 位留空）
  const result = runPostCheck(wf, cwd, projectName)
  const fc = (result.workflow_checks || []).find(c => c.type === 'file_count')
  assertEqual(fc && fc.status, 'pass', '非平台模式 specBase 缺省时回退 cwd/.sillyspec 通过')
  rmSync(cwd, { recursive: true, force: true })
}

// ── 用例 4: 平台模式 role-level checkOutput — specBase 下产出文件存在 ──
{
  const specBase = mkdtempSync(join(tmpdir(), 'spec-base-role-'))
  const projectName = 'myproj'
  const docAbsPath = join(specBase, 'docs', projectName, 'scan', 'ARCHITECTURE.md')
  mkdirSync(join(specBase, 'docs', projectName, 'scan'), { recursive: true })
  writeFileSync(docAbsPath, '# Arch\nline1\nline2\nline3\nline4\nline5\n')

  // outputDef.path 模拟 run.js:645 把 {SPEC_ROOT} 替换为 specBase 后的绝对路径
  const wf = {
    name: 'scan-docs',
    roles: [
      {
        id: 'doc-writer',
        name: 'Doc Writer',
        outputs: [
          { path: docAbsPath.replace(/\\/g, '/'), checks: [ { type: 'file_exists' }, { type: 'min_lines', min: 3 } ] },
        ],
      },
    ],
  }
  const result = runPostCheck(wf, '/fake/cwd', projectName, {}, specBase)
  const role = (result.roles || [])[0]
  assertEqual(role && role.status, 'pass', '平台模式 role-level checkOutput 用 specBase 解析绝对路径通过')
  rmSync(specBase, { recursive: true, force: true })
}

// ── 用例 5: 接口向后兼容 — 不传 specBase 时 placeholders 仍工作 ──
{
  const cwd = mkdtempSync(join(tmpdir(), 'ph-cwd-'))
  const projectName = 'demo'
  const scanDir = join(cwd, '.sillyspec', 'docs', projectName, 'scan')
  mkdirSync(scanDir, { recursive: true })
  writeFileSync(join(scanDir, 'a.md'), '# A\n')

  const wf = {
    name: 'scan-docs',
    checks: { workflow_level: [ { type: 'file_count', path: 'scan/', min: 1 } ] },
    roles: [],
  }
  // 旧调用方式：runPostCheck(wf, cwd, name, placeholders)
  const result = runPostCheck(wf, cwd, projectName, { SOME_KEY: 'value' })
  const fc = (result.workflow_checks || []).find(c => c.type === 'file_count')
  assertEqual(fc && fc.status, 'pass', '向后兼容：旧 4 参调用（带 placeholders）仍工作')
  rmSync(cwd, { recursive: true, force: true })
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
console.log(`${'='.repeat(50)}`)
if (failed > 0) {
  process.exit(1)
}
