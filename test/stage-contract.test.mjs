/**
 * StageContract 状态转换 + validator 测试
 */
import { checkTransition, runValidators, getContract } from '../src/stage-contract.js'
import { detectChangeRisk, extractExplicitRiskLevel } from '../src/change-risk-profile.js'

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

// specRoot 在实际代码中等价于 .sillyspec 目录本身（run.js: join(specRoot, 'docs', ...)）
// 所以 scan 文档路径为 specRoot/docs/<project>/scan/，不需要额外的 .sillyspec/ 前缀
const specDocsDir = join(specRoot, 'docs', projectName, 'scan')
mkdirSync(specDocsDir, { recursive: true })
for (const doc of ['ARCHITECTURE.md', 'CONVENTIONS.md', 'STRUCTURE.md', 'INTEGRATIONS.md', 'TESTING.md', 'CONCERNS.md', 'PROJECT.md']) {
  writeFileSync(join(specDocsDir, doc), '# ' + doc)
}
mkdirSync(join(specRoot, 'docs', projectName, 'modules'), { recursive: true })
writeFileSync(join(specRoot, 'docs', projectName, 'modules', 'app.md'), '# app')

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
// 修 B：requirements.md / tasks.md 不再强制引用每个 decision（decision 天然落点 design.md）。
// 此处 requirements.md 没有 D-001，但 design.md 有，故不应报 requirements 未引用。
if (brainstormTrace.ok === true && !brainstormTrace.warnings.some(w => w.includes('requirements.md 未引用'))) {
  console.log('✅ brainstorm validator 不再强制 requirements.md 引用 decision（修B：落点 design）')
} else {
  console.log('❌ brainstorm validator 仍强制 requirements.md 引用 decision', brainstormTrace.warnings)
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

writeFileSync(join(traceDir, 'decisions.md'), '# Decisions\n\n- id: D-003@v1\n  priority: P1\n  status: blocking\n  type: boundary\n')
const yamlBlockerTrace = runValidators('plan', traceRoot, 'trace')
if (yamlBlockerTrace.ok === false && yamlBlockerTrace.errors.some(e => e.includes('P0/P1 未决阻塞') && e.includes('D-003@V1'))) {
  console.log('✅ plan validator 支持 list/YAML 风格 decision record')
} else {
  console.log('❌ plan validator 未识别 list/YAML 风格 decision record', yamlBlockerTrace)
  failed++
}

writeFileSync(join(traceDir, 'decisions.md'), '# Decisions\n\n- id: D-004@v1\n  status: blocking\n  type: boundary\n')
const missingPriorityTrace = runValidators('plan', traceRoot, 'trace')
if (missingPriorityTrace.ok === false
  && missingPriorityTrace.errors.some(e => e.includes('P0/P1 未决阻塞') && e.includes('D-004@V1') && e.includes('priority=missing->P1'))) {
  console.log('✅ plan validator 将缺 priority 的 blocking decision 按 P1 阻断')
} else {
  console.log('❌ plan validator 未阻断缺 priority 的 blocking decision', missingPriorityTrace)
  failed++
}

writeFileSync(join(traceDir, 'decisions.md'), '# Decisions\n\n- id: D-005@v1\n  status: accepted\n  type: term\n')
writeFileSync(join(traceDir, 'plan.md'), '# Plan\n\n- [ ] task-01: implement naming（覆盖：FR-01）\n')
const yamlAcceptedTrace = runValidators('plan', traceRoot, 'trace')
if (yamlAcceptedTrace.ok === true && yamlAcceptedTrace.warnings.some(w => w.includes('plan.md 未引用') && w.includes('D-005@V1'))) {
  console.log('✅ plan validator 将 YAML accepted decision 纳入追踪')
} else {
  console.log('❌ plan validator 未追踪 YAML accepted decision', yamlAcceptedTrace)
  failed++
}

writeFileSync(join(traceDir, 'decisions.md'), '# Decisions\n')
writeFileSync(join(traceDir, 'requirements.md'), '# Requirements\n\n普通说明提到 https://example.test/spec/FR-404 和注释里的 FR-405，但它们不是结构化需求 ID。\n')
writeFileSync(join(traceDir, 'plan.md'), '# Plan\n\nNo structured requirement IDs here.\n')
const looseIdTrace = runValidators('plan', traceRoot, 'trace')
if (!looseIdTrace.warnings.some(w => w.includes('FR-404') || w.includes('FR-405'))) {
  console.log('✅ plan validator 忽略普通正文/URL 中的 FR ID')
} else {
  console.log('❌ plan validator 误提取普通正文/URL 中的 FR ID', looseIdTrace)
  failed++
}

writeFileSync(join(traceDir, 'decisions.md'), '# Decisions\n\n普通说明提到 https://example.test/spec/D-404@v1 和注释里的 D-405@v1，但它们不是结构化决策 ID。\n')
const looseBrainstormTrace = runValidators('brainstorm', traceRoot, 'trace')
if (!looseBrainstormTrace.warnings.some(w => w.includes('D-404@V1') || w.includes('D-405@V1'))) {
  console.log('✅ brainstorm validator 忽略普通正文/URL 中的 D ID')
} else {
  console.log('❌ brainstorm validator 误提取普通正文/URL 中的 D ID', looseBrainstormTrace)
  failed++
}

// === 生命周期契约表「已豁免」误判回归（2026-07-13 issue）===
// 旧 declaresNotApplicable 正则用裸单字「无」/「na」+ 40 字符宽窗口，
// 把「lifecycle 状态无变化」「无需 lifecycle 事件」等正常 design 误判成「显式声明不涉及」→ 假豁免。
console.log('\n=== 生命周期契约表假豁免回归 ===')

// Case A：design 有完整契约表 + 关键词 + 一句旧正则会误判的假阳性短语
//   期望：不报「已豁免」警告（表确实在），也不报缺表 error。
writeFileSync(join(traceDir, 'design.md'), [
  '# Design', '## 文件变更清单', '',
  '| 操作 | 文件路径 | 说明 |', '|---|---|---|', '| 修改 | src/lease.js | 续约逻辑 |',
  '', '## 风险登记', '## 自审', '',
  '## 7.5 生命周期契约表', '',
  '| 事件 | 发起方 | 接收方 | 必需字段 | 状态变化 |',
  '|---|---|---|---|---|',
  '| renew | lease | daemon | lease_id | active→active |',
  '',
  '注：worker 空闲时 lifecycle 状态无变化，不触发重算。',
  'D-001@v1', ''
].join('\n'))
const lcCaseA = runValidators('brainstorm', traceRoot, 'trace')
if (!lcCaseA.warnings.some(w => w.includes('已豁免')) && lcCaseA.errors.length === 0) {
  console.log('✅ lifecycle：有契约表 + 假阳性短语「lifecycle 状态无变化」不再被误判「已豁免」')
} else {
  console.log('❌ lifecycle Case A 误判', lcCaseA.warnings, lcCaseA.errors)
  failed++
}

// Case B：design 有 lifecycle 关键词但无契约表，明确声明「不涉及生命周期契约」
//   期望：报「已豁免」警告，但不阻断（errors 空）——合法豁免仍生效。
writeFileSync(join(traceDir, 'design.md'), [
  '# Design', '## 文件变更清单', '## 风险登记', '## 自审', '',
  '本变更仅把 daemon 字段重命名为 worker，不涉及生命周期契约（理由：纯 rename，状态机未改）。',
  'D-001@v1', ''
].join('\n'))
const lcCaseB = runValidators('brainstorm', traceRoot, 'trace')
if (lcCaseB.warnings.some(w => w.includes('已豁免') && w.includes('生命周期')) && lcCaseB.errors.length === 0) {
  console.log('✅ lifecycle：明确声明「不涉及生命周期契约」→ 正确豁免，不阻断')
} else {
  console.log('❌ lifecycle Case B 真实豁免失效', lcCaseB.warnings, lcCaseB.errors)
  failed++
}

// Case C：design 有 lifecycle 关键词、无契约表、也未声明豁免（含旧正则会误判的假阳性短语）
//   期望：阻断（errors 含「生命周期契约表」）——收紧后假阳性短语不能再溜过去。
writeFileSync(join(traceDir, 'design.md'), [
  '# Design', '## 文件变更清单', '## 风险登记', '## 自审', '',
  '本变更引入新的 lease 续约逻辑；worker 空闲时 lifecycle 状态无变化。',
  'D-001@v1', ''
].join('\n'))
const lcCaseC = runValidators('brainstorm', traceRoot, 'trace')
if (lcCaseC.errors.some(e => e.includes('生命周期契约表'))) {
  console.log('✅ lifecycle：有关键词无表未豁免 → 阻断（假阳性短语「状态无变化」不再开溜）')
} else {
  console.log('❌ lifecycle Case C 未阻断', lcCaseC.warnings, lcCaseC.errors)
  failed++
}

rmSync(traceRoot, { recursive: true })

// === A: verify 风险门控报错可执行化（2026-07-27）===
// 历史教训：integration/deployment-critical 门控只报「缺少真实集成证据 / 需要真实启动验证证据」，
// agent 看不出缺哪一项、要写/做什么才算过，只能改结论文案撞墙。此处锁：
//   - 报错逐条列出缺失项 + 每项要提供什么（含字面期望）
//   - 报出风险判级原因（design/plan 措辞命中，非改动文件）
//   - 指明「真实启动」须是本变更实际改动的部署/启动入口，非无关进程
console.log('\n=== verify 风险门控报错可执行化 ===')

const gateRoot = mkdtempSync(join(tmpdir(), 'sillyspec-gate-'))
const gateDir = join(gateRoot, '.sillyspec', 'changes', 'gate')
mkdirSync(gateDir, { recursive: true })
// design 命中 server.js（deployment 触发词）+ daemon → deployment-critical
writeFileSync(join(gateDir, 'design.md'), [
  '# Design', '## 文件变更清单', '## 风险登记', '## 自审', '',
  '改 daemon 下发链路，server.js 入口，claude 读取 settings.json。',
  'D-001@v1', ''
].join('\n'))
writeFileSync(join(gateDir, 'plan.md'), '# Plan\n\n- [ ] task-01: 实现下发\n')
// verify 只有单测 + 无关子进程证据（有 端到端 / Runtime Evidence 字面，但无真实启动入口）
writeFileSync(join(gateDir, 'verify-result.md'), [
  '# 验证报告', '', '## 结论', '', 'PASS', '',
  '单测全过。spike-02 端到端实测：真跑 claude --debug。', '',
  '## Runtime Evidence', 'claude 实测读取 settings.json。', ''
].join('\n'))

const gateTrace = runValidators('verify', gateRoot, 'gate')
const gateErr = gateTrace.errors.find(e => e.includes('缺少真实集成证据'))
if (gateTrace.ok === false
  && gateErr
  && gateErr.includes('real_startup_once')
  && gateErr.includes('部署/启动入口')
  && gateErr.includes('无关进程')
  && gateErr.includes('字面命中其一')
  && gateErr.includes('风险判级原因')
  && gateErr.includes('design.md / plan.md 命中启动入口关键词')) {
  console.log('✅ deployment-critical 门控报错可执行：列出缺失项 real_startup_once + 字面期望 + 指明部署/启动入口（非无关进程）+ 判级原因')
} else {
  console.log('❌ deployment-critical 门控报错不可执行', gateTrace.errors)
  failed++
}

// 补齐真实启动 daemon 证据后应放行
writeFileSync(join(gateDir, 'verify-result.md'), [
  '# 验证报告', '', '## 结论', '', 'PASS', '',
  '真实集成：端到端跑通 daemon↔backend。', '',
  '## Runtime Evidence', '实际启动 daemon/backend 一次（node server.js 起 backend），docker up 全栈，日志片段见附。', ''
].join('\n'))
const gateOk = runValidators('verify', gateRoot, 'gate')
if (!gateOk.errors.some(e => e.includes('缺少真实集成证据'))) {
  console.log('✅ 补齐真实启动 daemon/backend 证据后，门控放行')
} else {
  console.log('❌ 补齐证据后门控仍阻断', gateOk.errors)
  failed++
}

rmSync(gateRoot, { recursive: true })

// === risk_level 显式豁免（2026-07-28，反馈②）===
// detectChangeRisk 是机械字面匹配，不认否定语境——design 写「不改动 daemon/session」仍误判高危级。
// design.md frontmatter 加 risk_level 显式声明 → 以声明为准覆盖关键词判级；显式等级下 PASS WITH NOTES
// 不被强制拦（豁免本就来自 design 的明确判断），PASS 仍要求对应证据。
console.log('\n=== risk_level 显式豁免 ===')

// 单测 1：extractExplicitRiskLevel 只认 frontmatter，不扫正文
{
  const withFm = '---\nauthor: qinyi\nrisk_level: unit-sufficient\n---\n# Design\n改 daemon。\n'
  const inBody = '# Design\n\nrisk_level: unit-sufficient\n\n改 daemon。\n'
  const illegal = '---\nrisk_level: not-a-level\n---\n# Design\n'
  if (extractExplicitRiskLevel(withFm) === 'unit-sufficient'
    && extractExplicitRiskLevel(inBody) === null
    && extractExplicitRiskLevel(illegal) === null
    && extractExplicitRiskLevel('') === null) {
    console.log('✅ extractExplicitRiskLevel：认 frontmatter 合法值，拒正文/非法值/空')
  } else {
    console.log('❌ extractExplicitRiskLevel 解析异常', { withFm: extractExplicitRiskLevel(withFm), inBody: extractExplicitRiskLevel(inBody), illegal: extractExplicitRiskLevel(illegal) })
    failed++
  }
}

// 单测 2：detectChangeRisk 显式声明覆盖关键词误判（design 命中 daemon/session 但声明 unit-sufficient）
{
  const design = '---\nrisk_level: unit-sufficient\n---\n# Design\n本次不改动 daemon / session / lifecycle，仅调 service 文案。\n'
  const r = detectChangeRisk({ designContent: design })
  if (r.level === 'unit-sufficient' && r.explicit === true && !r.requiredVerification.includes('real_daemon_backend_integration')) {
    console.log('✅ detectChangeRisk：risk_level 显式声明覆盖关键词误判 → unit-sufficient，免集成证据')
  } else {
    console.log('❌ detectChangeRisk 显式豁免未生效', r)
    failed++
  }
  // 对照：无声明时同样措辞应被误判 integration-critical（证明关键词确实命中）
  const rAuto = detectChangeRisk({ designContent: '# Design\n本次不改动 daemon / session / lifecycle。\n' })
  if (rAuto.level === 'integration-critical' && !rAuto.explicit) {
    console.log('✅ 对照：无显式声明时同措辞仍按关键词判 integration-critical（证明豁免生效于声明而非措辞）')
  } else {
    console.log('❌ 对照判级异常', rAuto)
    failed++
  }
}

// 集成 3：门控端到端 —— design 声明 unit-sufficient（虽命中 daemon）+ 结论 PASS + 仅单测 → 放行
{
  const exRoot = mkdtempSync(join(tmpdir(), 'sillyspec-risktag-'))
  const exDir = join(exRoot, '.sillyspec', 'changes', 'risktag')
  mkdirSync(exDir, { recursive: true })
  writeFileSync(join(exDir, 'design.md'), [
    '---', 'author: qinyi', 'risk_level: unit-sufficient', '---',
    '# Design', '## 文件变更清单', '## 风险登记', '## 自审', '',
    '本次不改动 daemon / session，仅改 service 文案。', 'D-001@v1', ''
  ].join('\n'))
  writeFileSync(join(exDir, 'plan.md'), '# Plan\n\n- [ ] task-01: 改文案\n')
  writeFileSync(join(exDir, 'verify-result.md'), [
    '# 验证报告', '', '## 结论', '', 'PASS', '',
    '## 变更风险等级', 'risk_level 由 design frontmatter 显式声明 = unit-sufficient（覆盖关键词判级）：本次仅改 service 文案，未触 daemon/session。', '',
    '单测全过。', ''
  ].join('\n'))
  const exPass = runValidators('verify', exRoot, 'risktag')
  if (!exPass.errors.some(e => e.includes('缺少真实集成证据'))) {
    console.log('✅ 门控：design 声明 unit-sufficient + PASS + 仅单测 → 不强制集成证据，放行')
  } else {
    console.log('❌ 显式豁免后门控仍强制集成证据', exPass.errors)
    failed++
  }

  // 集成 4：显式声明 integration-critical + 结论 PASS WITH NOTES（无集成证据）→ 放行（显式等级放宽 PWN）
  writeFileSync(join(exDir, 'design.md'), [
    '---', 'author: qinyi', 'risk_level: integration-critical', '---',
    '# Design', '## 文件变更清单', '## 风险登记', '## 自审', '',
    '改 daemon 下发链路。', 'D-001@v1', ''
  ].join('\n'))
  writeFileSync(join(exDir, 'verify-result.md'), [
    '# 验证报告', '', '## 结论', '', 'PASS WITH NOTES', '',
    '## 变更风险等级', 'risk_level 由 design frontmatter 显式声明 = integration-critical。残留：端到端集成证据留待部署后补。', '',
    '单测全过。', ''
  ].join('\n'))
  const exPwn = runValidators('verify', exRoot, 'risktag')
  if (!exPwn.errors.some(e => e.includes('缺少真实集成证据'))) {
    console.log('✅ 门控：显式 integration-critical + PASS WITH NOTES → 放宽，不强制集成证据')
  } else {
    console.log('❌ 显式等级下 PASS WITH NOTES 仍被拦', exPwn.errors)
    failed++
  }

  // 集成 5：对照 —— 无显式声明、关键词判 integration-critical + PASS WITH NOTES（无证据）→ 仍拦
  writeFileSync(join(exDir, 'design.md'), [
    '# Design', '## 文件变更清单', '## 风险登记', '## 自审', '',
    '改 daemon 下发链路。', 'D-001@v1', ''
  ].join('\n'))
  const exAutoPwn = runValidators('verify', exRoot, 'risktag')
  if (exAutoPwn.errors.some(e => e.includes('缺少真实集成证据'))) {
    console.log('✅ 对照：无显式声明 + 关键词判级 + PASS WITH NOTES → 仍强制集成证据（严格模式不变）')
  } else {
    console.log('❌ 无声明时 PASS WITH NOTES 竟被放行', exAutoPwn.errors)
    failed++
  }
  rmSync(exRoot, { recursive: true })
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

// === plan.entry-point-wiring（生产接线路径矛盾）迁移守护（2026-07-27）===
// 锁定 manifest 同源后:报错逐字可执行 + task allowed_paths 覆盖放行 + 紧邻豁免放行。
// 夹具 requirements/decisions 不放结构化 ID,避免 FR/D trace 干扰 entry-point 判定。
console.log('\n=== plan entry-point-wiring ===')

const epRoot = mkdtempSync(join(tmpdir(), 'sillyspec-ep-'))
const epDir = join(epRoot, '.sillyspec', 'changes', 'ep')
mkdirSync(epDir, { recursive: true })
writeFileSync(join(epDir, 'requirements.md'), '# R\n')
writeFileSync(join(epDir, 'decisions.md'), '# Decisions\n')
writeFileSync(join(epDir, 'plan.md'), '# Plan\n')

// Case 1:design 提到 cli.ts + instantiate,无 task 覆盖 → 阻断,报错逐字可执行(含出路/触发原因)
writeFileSync(join(epDir, 'design.md'), '# Design\n入口文件 cli.ts,instantiate 并注入构造。\n')
const epBlock = runValidators('plan', epRoot, 'ep')
const epErr = epBlock.errors.find(e => e.includes('生产接线路径矛盾'))
if (!epBlock.ok
  && epErr
  && epErr.includes('"cli.ts"')
  && epErr.includes('出路（二选一）')
  && epErr.includes('allowed_paths')
  && epErr.includes('触发原因')) {
  console.log('✅ entry-point-wiring:design 提到 cli.ts 无覆盖 → 报错逐字可执行(含出路/触发原因)')
} else {
  console.log('❌ entry-point-wiring 报错异常', epBlock.errors)
  failed++
}

// Case 2:task allowed_paths 覆盖 cli.ts → 放行
mkdirSync(join(epDir, 'tasks'), { recursive: true })
writeFileSync(join(epDir, 'tasks', 'task-01.md'), 'allowed_paths:\n  - src/cli.ts\n')
const epCovered = runValidators('plan', epRoot, 'ep')
if (epCovered.ok && !epCovered.errors.some(e => e.includes('生产接线路径矛盾'))) {
  console.log('✅ entry-point-wiring:task allowed_paths 覆盖 cli.ts → 放行')
} else {
  console.log('❌ entry-point-wiring 覆盖后仍报错', epCovered.errors)
  failed++
}

// Case 3:task 不覆盖,但 design 紧邻写明「cli.ts ... 不需要」豁免 → 放行
writeFileSync(join(epDir, 'tasks', 'task-01.md'), 'allowed_paths:\n  - src/other.ts\n')
writeFileSync(join(epDir, 'design.md'), '# Design\n入口文件 cli.ts,instantiate 并注入构造;但 cli.ts 本次不需要改。\n')
const epExempt = runValidators('plan', epRoot, 'ep')
if (epExempt.ok && !epExempt.errors.some(e => e.includes('生产接线路径矛盾'))) {
  console.log('✅ entry-point-wiring:design 紧邻写明「cli.ts ... 不需要」豁免 → 放行')
} else {
  console.log('❌ entry-point-wiring 豁免未生效', epExempt.errors)
  failed++
}

rmSync(epRoot, { recursive: true })

// === Change Risk Gate 早期 warning 引导（坑2，FR-02）===
// detectChangeRisk 机械匹配：design 命中 daemon 关键词且无 frontmatter risk_level → 判
// integration-critical。validateVerifyResults 此时应在 warnings 早期透出 frontmatter 覆盖指引
// （不依赖 conclusion / evidence），让 agent 不必撞到 evidence gate 末尾出路③才知道可覆盖。
console.log('\n=== Change Risk Gate 早期 frontmatter 覆盖 warning ===')

const warnRoot = mkdtempSync(join(tmpdir(), 'sillyspec-riskwarn-'))
const warnDir = join(warnRoot, '.sillyspec', 'changes', 'riskwarn')
mkdirSync(warnDir, { recursive: true })
// design 命中 daemon（无 frontmatter risk_level）→ 自动判 integration-critical
writeFileSync(join(warnDir, 'design.md'), [
  '# Design', '## 文件变更清单', '## 风险登记', '## 自审', '',
  '改 daemon 下发链路。', 'D-001@v1', ''
].join('\n'))
writeFileSync(join(warnDir, 'plan.md'), '# Plan\n\n- [ ] task-01: 改 daemon\n')
writeFileSync(join(warnDir, 'verify-result.md'), '# 验证报告\n\n## 结论\n\nPASS\n\n单测全过。\n')
const warnAuto = runValidators('verify', warnRoot, 'riskwarn')
const warnHit = warnAuto.warnings.find(w =>
  w.includes('integration-critical') && w.includes('关键词判级') && w.includes('命中：daemon')
  && w.includes('frontmatter 加 risk_level') && w.includes('显式覆盖'))
if (warnHit) {
  console.log('✅ 命中 daemon 无 frontmatter → 早期 warning 透出 frontmatter 覆盖指引（含等级/触发词）')
} else {
  console.log('❌ 命中关键词无 frontmatter 未透出早期覆盖 warning', warnAuto.warnings)
  failed++
}

// 加 frontmatter risk_level: unit-sufficient（explicit）后 → 不发该 warning（已显式声明无需引导）
writeFileSync(join(warnDir, 'design.md'), [
  '---', 'author: qinyi', 'risk_level: unit-sufficient', '---',
  '# Design', '## 文件变更清单', '## 风险登记', '## 自审', '',
  '改 daemon 下发链路（实际仅文案）。', 'D-001@v1', ''
].join('\n'))
const warnExplicit = runValidators('verify', warnRoot, 'riskwarn')
if (!warnExplicit.warnings.some(w => w.includes('关键词判级') && w.includes('显式覆盖'))) {
  console.log('✅ 加 frontmatter risk_level（explicit）后不再发关键词误伤 warning')
} else {
  console.log('❌ explicit 后仍发关键词误伤 warning', warnExplicit.warnings)
  failed++
}
rmSync(warnRoot, { recursive: true })

// === brainstorm scale=small 四件套豁免（矛盾1，2026-08-07）===
// 历史矛盾：brainstorm 末步指引 scale=small 只产 design.md 后转 quick，但 validator 四件套全 error
// → agent 照 Step8 small 指引只写 design.md 后 --done 必撞墙（3 error → rollbackCompletionAndReturn）。
// 修法：contract 引擎加 condition（ctxField=scale, ne=small），BRAINSTORM_RULES 的 proposal/requirements/tasks
// 三规则挂 condition，validator 读 design.md frontmatter scale 传入 evaluateRules ctx。
// fail-safe：scale=large/读不到 → condition(ne small)成立 → 四件套全要求（保守走重流程）。
console.log('\n=== brainstorm scale=small 四件套豁免 ===')

const scaleRoot = mkdtempSync(join(tmpdir(), 'sillyspec-scale-'))
const scaleDir = join(scaleRoot, '.sillyspec', 'changes', 'scale')
mkdirSync(scaleDir, { recursive: true })

// Case 1：scale=small + 只产 design.md → 通过（proposal/requirements/tasks 三规则被 condition 跳过）
writeFileSync(join(scaleDir, 'design.md'), [
  '---', 'scale: small', '---',
  '# Design', '## 文件变更清单', '## 风险登记', '## 自审', '',
  '小变更：只改一处文案。', ''
].join('\n'))
const smallOnly = runValidators('brainstorm', scaleRoot, 'scale')
if (smallOnly.ok === true && smallOnly.errors.length === 0) {
  console.log('✅ scale=small 只产 design.md → 通过（proposal/requirements/tasks 被 condition 豁免）')
} else {
  console.log('❌ scale=small 只产 design.md 仍被拦', smallOnly.errors)
  failed++
}

// Case 2：scale=large + 只产 design.md（缺 proposal/requirements/tasks）→ 仍阻断（fail-safe）
writeFileSync(join(scaleDir, 'design.md'), [
  '---', 'scale: large', '---',
  '# Design', '## 文件变更清单', '## 风险登记', '## 自审', '',
  '大变更。', ''
].join('\n'))
const largeOnly = runValidators('brainstorm', scaleRoot, 'scale')
if (largeOnly.ok === false
  && largeOnly.errors.some(e => e.includes('proposal.md'))
  && largeOnly.errors.some(e => e.includes('requirements.md'))
  && largeOnly.errors.some(e => e.includes('tasks.md'))) {
  console.log('✅ scale=large 缺四件套 → 仍阻断 proposal/requirements/tasks（fail-safe）')
} else {
  console.log('❌ scale=large 未正确阻断四件套', largeOnly.errors)
  failed++
}

// Case 3：无 scale frontmatter + 只产 design.md → 仍阻断（fail-safe：读不到 scale 走重流程）
writeFileSync(join(scaleDir, 'design.md'), [
  '# Design', '## 文件变更清单', '## 风险登记', '## 自审', '',
  '无 scale 声明。', ''
].join('\n'))
const noScale = runValidators('brainstorm', scaleRoot, 'scale')
if (noScale.ok === false && noScale.errors.some(e => e.includes('proposal.md'))) {
  console.log('✅ 无 scale frontmatter → 仍要求四件套（fail-safe，保守走重流程）')
} else {
  console.log('❌ 无 scale frontmatter 竟豁免四件套', noScale.errors)
  failed++
}

// Case 4：scale=small 但四件套齐全 → 仍通过（豁免=不强制，齐全不报错）
writeFileSync(join(scaleDir, 'design.md'), [
  '---', 'scale: small', '---',
  '# Design', '## 文件变更清单', '## 风险登记', '## 自审', '', '小变更。', ''
].join('\n'))
writeFileSync(join(scaleDir, 'proposal.md'), '# Proposal\n\n## 不在范围内\n- none\n')
writeFileSync(join(scaleDir, 'requirements.md'), '# Requirements\n\n### FR-01: x\n')
writeFileSync(join(scaleDir, 'tasks.md'), '- [ ] task-01: do\n')
const smallFull = runValidators('brainstorm', scaleRoot, 'scale')
if (smallFull.ok === true) {
  console.log('✅ scale=small 四件套齐全 → 通过（豁免是不强制，齐全不报错）')
} else {
  console.log('❌ scale=small 四件套齐全仍被拦', smallFull.errors)
  failed++
}

rmSync(scaleRoot, { recursive: true })

// === 结果 ===
console.log(`\n${failed === 0 ? '✅ 全部通过' : `❌ ${failed} 项失败`}`)
if (failed > 0) throw new Error(`${failed} test(s) failed`)
