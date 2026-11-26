/**
 * StageContract 状态转换 + validator 测试
 */
import { checkTransition, runValidators, getContract } from '../src/stage-contract.js'
import { extractExplicitRiskLevel, resolveChangeRisk } from '../src/change-risk-profile.js'

let failed = 0

// === 状态转换测试 ===
const transitionTests = [
  // [from, to, expectedAllowed]
  // 主流程正常顺序
  ['', 'brainstorm', true],
  ['brainstorm', 'plan', true],
  ['plan', 'execute', true],
  ['execute', 'archive', true],

  // 跳步应被拦截
  ['', 'plan', false],
  ['', 'execute', false],
  // 真在 brainstorm 中（in-progress）跳步仍拦（eb3b4bce 起「出生未入门态」走下方放行行）
  ['brainstorm', 'execute', false, { fromStageData: { status: 'in-progress' } }],
  // 出生未入门（brainstorm 仍 pending/无 stages 行）等价旧 scan 出生态：主流程直入放行
  ['brainstorm', 'execute', true],
  ['plan', 'archive', false],
  ['verify', 'archive', false],

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

  // archive 特殊：execute 后允许（verify 已退役，2026-11-26-verify-stage-retire），其他主流程不允许直接跳
  ['execute', 'archive', true],
  ['verify', 'archive', false],
  ['plan', 'archive', false],
]

console.log('=== 状态转换测试 ===')
for (const [from, to, expected, opts] of transitionTests) {
  const r = checkTransition(from, to, opts)
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

// verify 阶段已退役（2026-11-26-verify-stage-retire）：无 verify validator，runValidators 零门
const verifyRetired = runValidators('verify', '.', 'nonexistent-change')
if (verifyRetired.errors.length === 0) {
  console.log('✅ verify 阶段退役：runValidators(verify) 零 validator 门')
} else {
  console.log('❌ verify 退役后仍有 validator 报错', verifyRetired.errors)
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
writeFileSync(join(traceDir, 'module-impact.md'), '# 模块影响分析（Module Impact）— trace\n\n测试占位（plan.module-impact.exists 要求）\n')
writeFileSync(join(traceDir, 'decisions.md'), '# Decisions\n\n## D-001@v1: Choose canonical account term\n- priority: P1\n- status: accepted\n')
writeFileSync(join(traceDir, 'requirements.md'), '# Requirements\n\n### FR-01: Account naming\nGiven x\nWhen y\nThen z\n')
writeFileSync(join(traceDir, 'tasks.md'), '- [ ] task-01: implement naming (D-001@v1)\n')

const brainstormTrace = runValidators('brainstorm', traceRoot, 'trace')
// 2026-09-29-brainstorm-closure-gates 取代修 B 的 requirements 侧放宽：brainstorm prompt（生成规范
// 文件步）一直要求「requirements.md 必须引用全部当前版本 D-xxx@vN；没有覆盖的必须标注为剩余风险」，
// 修 B 只放开了机器面——事前契约与事后门分叉。现按 prompt 契约收口为 warning（出路：决策覆盖矩阵
// 补行或标剩余风险）；design.md 落点校验照旧。tasks.md 仍不强求（骨架，plan 阶段展开）。
if (brainstormTrace.ok === true
  && brainstormTrace.warnings.some(w => w.includes('requirements.md 未引用') && w.includes('D-001@V1'))) {
  console.log('✅ brainstorm validator 点名 requirements.md 未引用 D-001（闭环收口：覆盖或标剩余风险二选一）')
} else {
  console.log('❌ brainstorm validator 未点名 requirements 的 D 覆盖缺口', brainstormTrace.warnings)
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
// verify-result.md 决策追踪 validator 随 verify 阶段退役（2026-11-26-verify-stage-retire）

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

// === A: verify 风险门控报错可执行化（2026-07-27；2026-09-19-ceremony-pricing-five-cuts task-03 声明面口径）===
// 历史教训：integration/deployment-critical 门控只报「缺少真实集成证据 / 需要真实启动验证证据」，
// agent 看不出缺哪一项、要写/做什么才算过，只能改结论文案撞墙。此处锁（声明面版）：
//   - 报错逐条列出缺失项 + 每项要提供什么（含字面期望）
//   - 报出风险判级原因（文件清单 × 项目 blast 声明命中，非措辞）
//   - 指明出路含「改 map」（evidence 不被 risk_level 豁免，D-009）
// 判级 fixture：词表判级已退役——建带 blast 段（evidence:true）的 map + design 文件清单命中行。
console.log('\n=== verify 风险门控报错可执行化（声明面） ===')

function writeBlastMap(root, project = 'demo') {
  const dir = join(root, '.sillyspec', 'docs', project, 'modules')
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, '_module-map.yaml'), [
    'modules:',
    '  demo:',
    '    status: active',
    'blast:',
    '  - prefixes: [src/daemon/]',
    '    tier: S3',
    '    evidence: true',
  ].join('\n'), 'utf8')
}

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

// 单测 2：resolveChangeRisk 声明面判级（2026-09-19-ceremony-pricing-five-cuts task-02 / D-008）
// 词表散文判级退役（detectChangeRisk 删除收口在 task-03），新口径：files × 项目声明危险面。
{
  const decls = [
    { prefixes: ['src/worktree.js', 'src/progress/'], tier: 'S3', evidence: true },
    { prefixes: ['src/stage-contract.js'], tier: 'S2' },
  ]
  // 命中 evidence:true 声明 → S3 + 证据全集
  const hit = resolveChangeRisk({ files: ['src/worktree.js', 'src/datetime.js'], blastDeclarations: decls })
  if (hit.tier === 'S3' && hit.evidenceRequired === true && hit.explicit === false
    && hit.requiredVerification.includes('real_daemon_backend_integration')
    && hit.hitPrefixes.join(',') === 'src/worktree.js') {
    console.log('✅ resolveChangeRisk：命中 S3+evidence 声明 → tier S3 + 证据全集（hitPrefixes 记录命中面）')
  } else {
    console.log('❌ resolveChangeRisk 命中声明面判级异常', hit)
    failed++
  }
  // 命中无 evidence 的 S2 → 无证据要求
  const gate = resolveChangeRisk({ files: ['src/stage-contract.js'], blastDeclarations: decls })
  if (gate.tier === 'S2' && gate.evidenceRequired === false && gate.requiredVerification.join(',') === 'unit_tests') {
    console.log('✅ resolveChangeRisk：门禁判定文件 S2 声明 → 无证据要求')
  } else {
    console.log('❌ S2 无 evidence 判级异常', gate)
    failed++
  }
  // 未命中 → S1（禁词表兜底，D-008）
  const noHit = resolveChangeRisk({ files: ['docs/x.md'], blastDeclarations: decls })
  if (noHit.tier === 'S1' && noHit.evidenceRequired === false) {
    console.log('✅ resolveChangeRisk：未命中声明面 → S1 起步（无词表兜底）')
  } else {
    console.log('❌ 未命中判级异常', noHit)
    failed++
  }
}

// 单测 2b：explicitRiskLevel 只压 tier、不豁免 evidenceRequired（D-009 钉——收掉旧显式短路的懒 agent 洞）
{
  const decls = [{ prefixes: ['src/worktree.js'], tier: 'S3', evidence: true }]
  // 钉：声明 S3+evidence × explicit=unit-sufficient → tier 压低、证据要求保留
  const pin = resolveChangeRisk({ files: ['src/worktree.js'], blastDeclarations: decls, explicitRiskLevel: 'unit-sufficient' })
  if (pin.tier === 'S1' && pin.explicit === true && pin.evidenceRequired === true
    && pin.requiredVerification.includes('real_daemon_backend_integration')) {
    console.log('✅ D-009 钉：explicit 压 tier（S3→S1）但 evidenceRequired 保留（证据全集仍在）')
  } else {
    console.log('❌ explicit 豁免了证据要求（懒 agent 洞回归）', pin)
    failed++
  }
  // explicit 升档也尊重（声明高于机械面）
  const up = resolveChangeRisk({ files: ['docs/x.md'], blastDeclarations: decls, explicitRiskLevel: 'integration-critical' })
  if (up.tier === 'S3' && up.explicit === true && up.evidenceRequired === false) {
    console.log('✅ explicit 升档尊重（S1 面 × integration-critical → S3；evidence 不受 explicit 影响）')
  } else {
    console.log('❌ explicit 升档异常', up)
    failed++
  }
  // 非法 explicit 值忽略（存量五级词兼容集合外 → explicit false）
  const bad = resolveChangeRisk({ files: ['src/worktree.js'], blastDeclarations: decls, explicitRiskLevel: 'not-a-level' })
  if (bad.tier === 'S3' && bad.explicit === false && bad.evidenceRequired === true) {
    console.log('✅ 非法 explicit 值忽略（tier 回声明面、证据不变）')
  } else {
    console.log('❌ 非法 explicit 处理异常', bad)
    failed++
  }
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

if (getContract('verify') === null) {
  console.log('✅ verify contract 已注销（getContract 返回 null——阶段退役）')
} else {
  console.log('❌ verify contract 仍在注册表')
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
writeFileSync(join(epDir, 'module-impact.md'), '# 模块影响分析（Module Impact）— ep\n\n测试占位\n')

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

// === design gate 风险判级提前提示（坑 risk-first-use-opaque，2026-08-24；task-03 声明面口径）===
// 首次使用者在 design --done 就应看到声明面命中 + 出路，不必等 verify 撞墙；explicit 在场 →
// 透出「压档不豁免证据」（D-009）。
console.log('\n=== design gate 风险判级提前提示（声明面） ===')

const ehRoot = mkdtempSync(join(tmpdir(), 'sillyspec-riskhint-'))
const ehDir = join(ehRoot, '.sillyspec', 'changes', 'riskhint')
mkdirSync(ehDir, { recursive: true })
writeBlastMap(ehRoot)
writeFileSync(join(ehDir, 'design.md'), [
  '# Design', '## 文件变更清单', '', '| 操作 | 文件路径 | 说明 |', '|---|---|---|',
  '| 修改 | `src/daemon/x.js` | 下发链路 |', '', '## 风险登记', '## 自审', '',
  'D-001@v1', ''
].join('\n'))
const ehAuto = runValidators('brainstorm', ehRoot, 'riskhint')
const ehHit = ehAuto.warnings.find(w =>
  w.includes('[risk]') && w.includes('evidence:true') && w.includes('_module-map.yaml'))
if (ehHit) {
  console.log('✅ design 文件面命中 evidence:true → design gate 提前透出命中面 + 改 map 出路')
} else {
  console.log('❌ design gate 未透出风险判级提前提示', ehAuto.warnings)
  failed++
}

// explicit 在场场景：透出「压档不豁免证据」（D-009 教学面）
writeFileSync(join(ehDir, 'design.md'), [
  '---', 'author: qinyi', 'risk_level: unit-sufficient', '---',
  '# Design', '## 文件变更清单', '', '| 操作 | 文件路径 | 说明 |', '|---|---|---|',
  '| 修改 | `src/daemon/x.js` | 下发链路 |', '', '## 风险登记', '## 自审', '',
  'D-001@v1', ''
].join('\n'))
const ehSup = runValidators('brainstorm', ehRoot, 'riskhint')
if (ehSup.warnings.some(w => w.includes('[risk]') && w.includes('压仪式档'))) {
  console.log('✅ evidence 命中 + explicit → design gate 透出「显式声明压仪式档」提示（证据门已随 verify 退役）')
} else {
  console.log('❌ design gate 未透出 explicit 不豁免提示', ehSup.warnings)
  failed++
}
rmSync(ehRoot, { recursive: true })

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
