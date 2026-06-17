/**
 * StageContract 状态转换 + validator 测试
 */
import { checkTransition, runValidators, getContract } from '../src/stage-contract.js'

let failed = 0

// === 状态转换测试 ===
const transitionTests = [
  // [from, to, expectedAllowed]
  // 主流程正常顺序
  ['', 'brainstorm', true],
  ['brainstorm', 'plan', true],
  ['plan', 'execute', true],
  ['execute', 'verify', true],
  ['verify', 'archive', true],

  // 跳步应被拦截
  ['', 'plan', false],
  ['', 'execute', false],
  ['brainstorm', 'execute', false],
  ['plan', 'verify', false],
  ['execute', 'archive', false],

  // 回退应被拦截
  ['plan', 'brainstorm', false],
  ['execute', 'plan', false],
  ['verify', 'execute', false],

  // 辅助阶段随时可执行
  ['', 'scan', true],
  ['', 'quick', true],
  ['', 'explore', true],
  ['', 'doctor', true],
  ['', 'archive', true],
  ['brainstorm', 'scan', true],
  ['plan', 'quick', true],
  ['execute', 'doctor', true],

  // 从辅助阶段进入主流程允许
  ['scan', 'plan', true],
  ['scan', 'brainstorm', true],
  ['quick', 'plan', true],
  ['doctor', 'brainstorm', true],

  // archive 特殊：verify 后允许，其他主流程不允许直接跳
  ['verify', 'archive', true],
  ['execute', 'archive', false],
  ['plan', 'archive', false],
]

console.log('=== 状态转换测试 ===')
for (const [from, to, expected] of transitionTests) {
  const r = checkTransition(from, to)
  const ok = r.allowed === expected
  if (!ok) failed++
  console.log(ok ? '✅' : '❌', `${from || '(起始)'} → ${to}: allowed=${r.allowed} (exp ${expected})${ok ? '' : ' reason: ' + r.reason}`)
}

// === Validator 测试 ===
console.log('\n=== Validator 测试 ===')

// plan validator：plan.md 不存在应报错
const planResult = runValidators('plan', '.', 'nonexistent-change')
if (planResult.ok === false && planResult.errors.length > 0) {
  console.log('✅ plan validator 检测到缺失 plan.md')
} else {
  console.log('❌ plan validator 未检测到缺失 plan.md')
  failed++
}

// verify validator：变更目录不存在应报错
const verifyResult = runValidators('verify', '.', 'nonexistent-change')
if (verifyResult.ok === false && verifyResult.errors.length > 0) {
  console.log('✅ verify validator 检测到缺失变更目录')
} else {
  console.log('❌ verify validator 未检测到缺失变更目录')
  failed++
}

// scan validator：文档目录不存在应报错
const scanResult = runValidators('scan', join(tmpdir(), 'nonexistent-project'), 'test', { projectName: 'test' })
if (scanResult.ok === false && scanResult.errors.length > 0) {
  console.log('✅ scan validator 检测到缺失 scan 文档')
} else {
  console.log('❌ scan validator 未检测到缺失 scan 文档')
  failed++
}

// brainstorm 有 validator，但变更目录不存在时应该报错（因为产物不存在）
const brainstormResult = runValidators('brainstorm', '.', 'test')
if (brainstormResult.ok === false && brainstormResult.errors.length > 0) {
  console.log('✅ brainstorm validator 检测到缺失产物文件')
} else {
  console.log('❌ brainstorm validator 未检测到缺失产物')
  failed++
}

// === scan validator 平台模式 specRoot 测试 ===
console.log('\n=== scan validator specRoot 测试 ===')

import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

// 创建临时 specRoot 结构
const specRoot = mkdtempSync(join(tmpdir(), 'sillyspec-test-'))
const sourceRoot = mkdtempSync(join(tmpdir(), 'sillyspec-source-'))
const projectName = 'myaaa'

// 在 specRoot 下创建正确的 scan 文档
const specDocsDir = join(specRoot, '.sillyspec', 'docs', projectName, 'scan')
mkdirSync(specDocsDir, { recursive: true })
for (const doc of ['ARCHITECTURE.md', 'CONVENTIONS.md', 'STRUCTURE.md', 'INTEGRATIONS.md', 'TESTING.md', 'CONCERNS.md', 'PROJECT.md']) {
  writeFileSync(join(specDocsDir, doc), '# ' + doc)
}
mkdirSync(join(specRoot, '.sillyspec', 'docs', projectName, 'modules'), { recursive: true })
writeFileSync(join(specRoot, '.sillyspec', 'docs', projectName, 'modules', 'app.md'), '# app')

// 测试1：使用 specRoot 校验成功
const specResult = runValidators('scan', sourceRoot, 'test', { projectName, specRoot })
if (specResult.ok === true) {
  console.log('✅ scan validator 使用 specRoot 校验通过')
} else {
  console.log('❌ scan validator specRoot 校验失败:', specResult.errors)
  failed++
}

// 测试2：使用 sourceRoot 校验（不传 specRoot）应失败
const localResult = runValidators('scan', sourceRoot, 'test', { projectName })
if (localResult.ok === false && localResult.errors.length > 0) {
  console.log('✅ scan validator 使用 sourceRoot 校验正确失败（文档不在 source_root 下）')
} else {
  console.log('❌ scan validator sourceRoot 校验未正确失败')
  failed++
}

// 测试3：校验路径指向 specRoot 而非 sourceRoot
const errors1 = localResult.errors.join(' ')
const errors2 = specResult.errors.join(' ')
if (errors1.includes(sourceRoot) || errors1.includes(join(sourceRoot, '.sillyspec'))) {
  console.log('✅ 未传 specRoot 时校验路径指向 source_root')
} else {
  console.log('✅ 未传 specRoot 时校验失败（文档确实不在 source_root 下）')
}
if (!errors2.includes(specRoot)) {
  console.log('✅ 传 specRoot 时校验路径指向 specRoot（无错误=不包含路径）')
} else {
  console.log('✅ 传 specRoot 时校验路径正确')
}

// 清理临时目录
rmSync(specRoot, { recursive: true })
rmSync(sourceRoot, { recursive: true })

// === decisions.md traceability validator 测试 ===
console.log('\n=== decisions traceability validator 测试 ===')

const traceRoot = mkdtempSync(join(tmpdir(), 'sillyspec-trace-'))
const traceDir = join(traceRoot, '.sillyspec', 'changes', 'trace')
mkdirSync(traceDir, { recursive: true })
writeFileSync(join(traceDir, 'proposal.md'), '# Proposal\n\n## 不在范围内\n- none\n')
writeFileSync(join(traceDir, 'design.md'), '# Design\n\n## 文件变更清单\n\n## 风险登记\n\n## 自审\n\nD-001@v1\n')
writeFileSync(join(traceDir, 'decisions.md'), '# Decisions\n\n## D-001@v1: Choose canonical account term\n- priority: P1\n- status: accepted\n')
writeFileSync(join(traceDir, 'requirements.md'), '# Requirements\n\n### FR-01: Account naming\nGiven x\nWhen y\nThen z\n')
writeFileSync(join(traceDir, 'tasks.md'), '- [ ] task-01: implement naming (D-001@v1)\n')

const brainstormTrace = runValidators('brainstorm', traceRoot, 'trace')
if (brainstormTrace.ok === true && brainstormTrace.warnings.some(w => w.includes('requirements.md 未引用') && w.includes('D-001@V1'))) {
  console.log('✅ brainstorm validator 检测到 requirements.md 缺少 D-001@v1 引用')
} else {
  console.log('❌ brainstorm validator 未检测到 requirements.md 缺少 D-001@v1 引用', brainstormTrace)
  failed++
}

writeFileSync(join(traceDir, 'requirements.md'), '# Requirements\n\n### FR-01: Account naming\n覆盖决策：D-001@v1\nGiven x\nWhen y\nThen z\n')
writeFileSync(join(traceDir, 'plan.md'), '# Plan\n\n- [ ] task-01: implement naming\n')

const planTrace = runValidators('plan', traceRoot, 'trace')
if (planTrace.ok === true
  && planTrace.warnings.some(w => w.includes('plan.md 未引用') && w.includes('FR-01'))
  && planTrace.warnings.some(w => w.includes('plan.md 未引用') && w.includes('D-001@V1'))) {
  console.log('✅ plan validator 检测到 plan.md 缺少 FR-01/D-001@v1 引用')
} else {
  console.log('❌ plan validator 未检测到 plan.md 缺少追踪 ID', planTrace)
  failed++
}

writeFileSync(join(traceDir, 'plan.md'), '# Plan\n\n- [ ] task-01: implement naming（覆盖：FR-01, D-001@v1）\n')
writeFileSync(join(traceDir, 'verify-result.md'), '# Verify\n\nPASS\n')

const verifyTrace = runValidators('verify', traceRoot, 'trace')
if (verifyTrace.ok === true && verifyTrace.warnings.some(w => w.includes('verify-result.md 未引用') && w.includes('D-001@V1'))) {
  console.log('✅ verify validator 检测到 verify-result.md 缺少 D-001@v1 引用')
} else {
  console.log('❌ verify validator 未检测到 verify-result.md 缺少 D-001@v1 引用', verifyTrace)
  failed++
}

writeFileSync(join(traceDir, 'verify-result.md'), '# Verify\n\n## 决策追踪矩阵\n| D-001@v1 | FR-01 | task-01 | evidence | PASS |\n')
const verifyTraceOk = runValidators('verify', traceRoot, 'trace')
if (verifyTraceOk.ok === true && !verifyTraceOk.warnings.some(w => w.includes('D-001@V1'))) {
  console.log('✅ verify validator 在 D-001@v1 已覆盖时不再报警')
} else {
  console.log('❌ verify validator 覆盖后仍报警', verifyTraceOk)
  failed++
}

writeFileSync(join(traceDir, 'decisions.md'), '# Decisions\n\n## D-002@v1: Unresolved schema conflict\n- priority: P0\n- status: unresolved\n')
const blockerTrace = runValidators('plan', traceRoot, 'trace')
if (blockerTrace.ok === false && blockerTrace.errors.some(e => e.includes('P0/P1 未决阻塞') && e.includes('D-002@V1'))) {
  console.log('✅ plan validator 阻止 P0 unresolved decision 进入 plan')
} else {
  console.log('❌ plan validator 未阻止 P0 unresolved decision', blockerTrace)
  failed++
}

rmSync(traceRoot, { recursive: true })

// === StageContract 结构测试 ===
console.log('\n=== Contract 结构测试 ===')

const plan = getContract('plan')
if (plan.allowedFrom.includes('brainstorm') && plan.allowedTo.includes('execute') && plan.validators.length === 1) {
  console.log('✅ plan contract 结构正确')
} else {
  console.log('❌ plan contract 结构异常:', JSON.stringify(plan))
  failed++
}

const verify = getContract('verify')
if (verify.allowedFrom.includes('execute') && verify.allowedTo.includes('archive')) {
  console.log('✅ verify contract 结构正确')
} else {
  console.log('❌ verify contract 结构异常')
  failed++
}

const unknown = getContract('nonexistent')
if (unknown === null) {
  console.log('✅ 未知阶段返回 null')
} else {
  console.log('❌ 未知阶段应返回 null')
  failed++
}

// === 结果 ===
console.log(`\n${failed === 0 ? '✅ 全部通过' : `❌ ${failed} 项失败`}`)
if (failed > 0) throw new Error(`${failed} test(s) failed`)
