/**
 * Stage Contract: decisions.md supersede 关系测试
 *
 * 验证被 supersede 的旧版本不再被要求引用
 */
import { readFileSync } from 'fs'
import { join } from 'path'

// 直接测试 extractCurrentDecisionIds 的行为
// 由于它不是 exported，我们通过 validateBrainstormOutputs 间接测试

let failed = 0
const failures = []

function assert(condition, msg) {
  if (!condition) {
    failed++
    failures.push(msg)
    console.log(`  ❌ FAIL: ${msg}`)
  } else {
    console.log(`  ✅ PASS: ${msg}`)
  }
}

console.log('=== decisions.md supersede 关系测试 ===\n')

// 动态导入 stage-contract.js 的内部函数
// 由于 extractCurrentDecisionIds 不是 exported，我们用 validateBrainstormOutputs 来间接验证
const contractPath = join(import.meta.dirname, '..', 'src', 'stage-contract.js')
const contractSource = readFileSync(contractPath, 'utf8')

// 提取并 eval 需要的函数
// 通过创建临时模块来测试
const { existsSync, mkdirSync, writeFileSync, mkdtempSync, rmSync } = await import('fs')
const { join: pJoin } = await import('path')
const { tmpdir } = await import('os')

// 我们通过 validateBrainstormOutputs 来端到端测试
const mod = await import(pJoin(import.meta.dirname, '..', 'src', 'stage-contract.js'))

// ─────────────────────────────────────────
// Test 1: 被 supersede 的旧版本不警告
// ─────────────────────────────────────────
console.log('--- Test 1: 被 supersede 的旧版本不警告 ---')
{
  const tmpDir = mkdtempSync(join(tmpdir(), 'sillyspec-supersede-'))
  // 模拟 .sillyspec/changes 结构
  const changeDir = pJoin(tmpDir, '.sillyspec', 'changes', '2026-06-25-test')
  mkdirSync(changeDir, { recursive: true })

  // decisions.md: D-004@v2 supersedes D-004@v1
  writeFileSync(pJoin(changeDir, 'decisions.md'), `# Decisions

## D-004@v1
- status: accepted
- priority: P1

## D-004@v2
- status: accepted
- priority: P1
- supersedes: D-004@v1
`)

  // design.md 只引用 D-004@v2（不引用 v1）
  writeFileSync(pJoin(changeDir, 'design.md'), `# Design

## 目标
修复 bug。

## 方案
用方案 B。

## 决策
D-004@v2: 选择方案 B
`)

  writeFileSync(pJoin(changeDir, 'requirements.md'), `# Requirements

## FR-01
需求 A。

## 决策覆盖
- D-004@v2 → FR-01
`)

  writeFileSync(pJoin(changeDir, 'tasks.md'), `# Tasks
- task-01: 实现
`)

  // 用 validateBrainstormOutputs 验证
  const result = mod.runValidators("brainstorm", tmpDir, '2026-06-25-test')

  // 不应有关于 D-004@v1 的未引用警告
  const v1Warnings = result.warnings.filter(w => w.includes('D-004@V1'))
  assert(v1Warnings.length === 0, `不应有 D-004@V1 未引用警告，实际 warnings: ${JSON.stringify(v1Warnings)}`)

  rmSync(tmpDir, { recursive: true, force: true })
}

// ─────────────────────────────────────────
// Test 2: 没有 supersede 关系时，旧版本仍被校验
// ─────────────────────────────────────────
console.log('\n--- Test 2: 无 supersede 关系时旧版本仍校验 ---')
{
  const tmpDir = mkdtempSync(join(tmpdir(), 'sillyspec-nosupersede-'))
  const changeDir = pJoin(tmpDir, '.sillyspec', 'changes', '2026-06-25-test')
  mkdirSync(changeDir, { recursive: true })

  // decisions.md: 两个独立决策，无 supersede 关系
  writeFileSync(pJoin(changeDir, 'decisions.md'), `# Decisions

## D-004@v1
- status: accepted
- priority: P1

## D-005@v1
- status: accepted
- priority: P1
`)

  // design.md 只引用 D-004@v1，不引用 D-005@v1
  writeFileSync(pJoin(changeDir, 'design.md'), `# Design

## 目标
修复 bug。

## 方案
用方案 B。

## 决策
D-004@v1: 选择方案 B
## 文件变更清单
| 操作 | 文件 | 说明 |
## 风险登记
- 风险 A
## 自审
- 已检查
`)

  writeFileSync(pJoin(changeDir, 'requirements.md'), `# Requirements
## FR-01
需求 A。
`)

  writeFileSync(pJoin(changeDir, 'proposal.md'), `# Proposal
## 不在范围内
- 无
`)
  writeFileSync(pJoin(changeDir, 'tasks.md'), `# Tasks
- task-01: 实现
`)

  const result = mod.runValidators("brainstorm", tmpDir, '2026-06-25-test')

  // D-005@v1 应该有未引用警告
  const v5Warnings = result.warnings.filter(w => w.includes('D-005@V1'))
  assert(v5Warnings.length > 0, `应有 D-005@V1 未引用警告`)

  rmSync(tmpDir, { recursive: true, force: true })
}

// ─────────────────────────────────────────
// Test 3: status=superseded 的旧版本不警告（原有行为，回归测试）
// ─────────────────────────────────────────
console.log('\n--- Test 3: status=superseded 的旧版本不警告（回归） ---')
{
  const tmpDir = mkdtempSync(join(tmpdir(), 'sillyspec-status-'))
  const changeDir = pJoin(tmpDir, '.sillyspec', 'changes', '2026-06-25-test')
  mkdirSync(changeDir, { recursive: true })

  writeFileSync(pJoin(changeDir, 'decisions.md'), `# Decisions

## D-004@v1
- status: superseded
- priority: P1

## D-004@v2
- status: accepted
- priority: P1
`)

  writeFileSync(pJoin(changeDir, 'design.md'), `# Design

## 目标
修复 bug。

## 方案
用方案 B。

## 决策
D-004@v2: 选择方案 B
`)

  writeFileSync(pJoin(changeDir, 'requirements.md'), `# Requirements
## FR-01
需求 A。
`)

  writeFileSync(pJoin(changeDir, 'tasks.md'), `# Tasks
- task-01: 实现
`)

  const result = mod.runValidators("brainstorm", tmpDir, '2026-06-25-test')

  const v1Warnings = result.warnings.filter(w => w.includes('D-004@V1'))
  assert(v1Warnings.length === 0, `status=superseded 的 D-004@V1 不应警告`)

  rmSync(tmpDir, { recursive: true, force: true })
}

// ─────────────────────────────────────────
// Test 4: 多级 supersede 链（v1 ← v2 ← v3）
// ─────────────────────────────────────────
console.log('\n--- Test 4: 多级 supersede 链 ---')
{
  const tmpDir = mkdtempSync(join(tmpdir(), 'sillyspec-chain-'))
  const changeDir = pJoin(tmpDir, '.sillyspec', 'changes', '2026-06-25-test')
  mkdirSync(changeDir, { recursive: true })

  writeFileSync(pJoin(changeDir, 'decisions.md'), `# Decisions

## D-004@v1
- status: accepted
- priority: P1

## D-004@v2
- status: accepted
- priority: P1
- supersedes: D-004@v1

## D-004@v3
- status: accepted
- priority: P1
- supersedes: D-004@v2
`)

  // design.md 只引用 D-004@v3
  writeFileSync(pJoin(changeDir, 'design.md'), `# Design

## 目标
修复 bug。

## 方案
用方案 C。

## 决策
D-004@v3: 选择方案 C
`)

  writeFileSync(pJoin(changeDir, 'requirements.md'), `# Requirements
## FR-01
需求 A。
- D-004@v3 → FR-01
`)

  writeFileSync(pJoin(changeDir, 'tasks.md'), `# Tasks
- task-01: 实现
`)

  const result = mod.runValidators("brainstorm", tmpDir, '2026-06-25-test')

  const oldWarnings = result.warnings.filter(w => w.includes('D-004@V1') || w.includes('D-004@V2'))
  assert(oldWarnings.length === 0, `多级 supersede 链中 v1/v2 不应警告，实际: ${JSON.stringify(oldWarnings)}`)

  rmSync(tmpDir, { recursive: true, force: true })
}

// ── 结果 ──
console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${4 - failed}  ❌ 失败: ${failed}`)
if (failures.length > 0) {
  console.log(`失败项:`)
  failures.forEach(f => console.log(`  - ${f}`))
}
console.log(`${'='.repeat(50)}`)

if (failed > 0) process.exit(1)
