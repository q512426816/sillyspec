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
const scanResult = runValidators('scan', '/tmp/nonexistent-project', 'test', { projectName: 'test' })
if (scanResult.ok === false && scanResult.errors.length > 0) {
  console.log('✅ scan validator 检测到缺失 scan 文档')
} else {
  console.log('❌ scan validator 未检测到缺失 scan 文档')
  failed++
}

// 无 validator 的阶段应该 pass
const brainstormResult = runValidators('brainstorm', '.', 'test')
if (brainstormResult.ok === true) {
  console.log('✅ brainstorm 无 validator 直接通过')
} else {
  console.log('❌ brainstorm 无 validator 但失败了')
  failed++
}

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
process.exit(failed > 0 ? 1 : 0)
