/**
 * PASS 封顶事实面测试（2026-09-17-pass-cap-semantics task-07 / FR-01~FR-06 / D-001@v2 /
 * D-002@v1 / D-004 / D-005@v2 / D-006 / D-011 / D-012）。
 *
 * 锁定语义（断言逐条自 requirements GWT 派生，走导出接口 + facts 输入的纯函数面）：
 *   A. 封顶四态（FR-01 GWT1）：结论=PASS 且四事实条件各构造一态独立触发——
 *      ①facts.integrationRan=not-ran ②blocking 级移交行 >0 ③db/*.sql 未声明执行
 *      ④matrixPartialRows>0 且 handover 零行——triggered[].fact 四枚举各命中一次，
 *      文案含修复指引（改写 PASS WITH NOTES + 「## 移交项（结构化）」）。
 *   B. 全清态（FR-01 GWT2）：四条件全不成立 + PASS → 放行；结论非 PASS 时四条件
 *      在场也不封顶（未触发场景行为零变化）。
 *   C. facts 双源（FR-01 GWT3/GWT4）：factsExpected=true 而 facts 缺失 → 全条件
 *      fail-closed 触发 + 「重跑 verify-probes」出路；factsExpected=false（存量未跑
 *      管线）→ 兼容 ok 不误伤。
 *   D. 豁免洞分层（FR-02 GWT1/GWT2，D-002）：explicit unit-sufficient + NOTES 免证据；
 *      explicit integration-critical + NOTES 无 handover → error（二选一缺位）；
 *      有结构化 handover → 放行。
 *   E. integrationRan 判定表（FR-02 GWT3 / D-006）：skip=未跑；module/evidence-auto=已跑；
 *      compile·纯单测回执不计入；跨层回执计入；未标类默认 build（fail-closed 侧）。
 *   F. severity 面（FR-06 GWT1~GWT3，D-005@v2）：类型缺省映射；降级理由文法缺失回退
 *      blocking；三列存量行零迁移。
 *   G. Runtime Evidence 收口（FR-03 GWT1/GWT2，D-004）：判级 critical + 服务端点行
 *      「不涉及」+ 无 handover → 计入事实面封顶；有 handover / 非判级 → 不计入。
 *   H. fix.sql 双门（FR-05 GWT2 / D-012）：apply 文件集 ∩ db/*.sql ⊄ 声明集 → 阻断；
 *      verify 之后新增 sql（verify-result 无对应声明）→ archive --confirm 前置兜底阻断；
 *      声明齐备（声明行 / 回执 command 双形态）→ 双门放行；db-script 行与声明门互斥。
 *
 * 确定性纪律：mkdtempSync 临时目录 + test.after 清理；console.warn 捕获替换后 finally
 * 还原；路径一律 path.join；不依赖真实 git/DB/网络。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import {
  evaluatePassEligibility, validatePassEligibility, runValidators,
} from '../src/stage-contract.js'
import {
  parseHandoverRows, parseDbScriptDeclarations, backfillFactsFromMdAndTests,
} from '../src/verify-probes.js'
import { checkDbScriptDeclarationGate } from '../src/worktree-apply.js'
import { handleArchiveConfirmStep } from '../src/run/complete-handlers.js'

const tmpRoots = []
function mk(prefix) { const d = mkdtempSync(join(tmpdir(), prefix)); tmpRoots.push(d); return d }
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

/** 捕获 console.warn（finally 还原），返回收集数组 */
function captureWarn() {
  const caught = []
  const orig = console.warn
  console.warn = (...a) => caught.push(a.join(' '))
  return { caught, restore: () => { console.warn = orig } }
}

/** 全清 facts 底稿（各用例按需覆写字段） */
const CLEAN_FACTS = () => ({
  integrationRan: 'ran',
  handover: { count: 0, items: [] },
  dbScriptDeclarations: [],
  runtimeEndpointExcluded: false,
  matrixPartialRows: 0,
})

// ═══════════════════════════════════════════════════════════════════
// A. 封顶四态（FR-01 GWT1）——纯函数 evaluatePassEligibility 四条件独立触发
// ═══════════════════════════════════════════════════════════════════
test('A. 封顶四态：结论=PASS 时四事实条件各一态独立触发，triggered[].fact 四枚举各命中一次', () => {
  const base = { conclusion: 'PASS', factsExpected: true, facts: CLEAN_FACTS() }
  // ① 集成实测未跑
  const r1 = evaluatePassEligibility({ ...base, facts: { ...CLEAN_FACTS(), integrationRan: 'not-ran' } })
  assert.ok(r1.ok === false && r1.triggered.some(t => t.fact === 'integration-not-run'),
    `①integrationRan=not-ran → error 且 triggered 含 integration-not-run（实际 ${JSON.stringify(r1.triggered)}）`)
  // ② blocking 级移交项在场
  const r2 = evaluatePassEligibility({ ...base, facts: { ...CLEAN_FACTS(), handover: { count: 1, items: [{ type: 'env-blocked', item: '环境阻断的集成用例', condition: '恢复后复跑', severity: 'blocking' }] } } })
  assert.ok(r2.ok === false && r2.triggered.some(t => t.fact === 'blocking-handover-present'),
    `②blocking 移交行 >0 → error 且 triggered 含 blocking-handover-present（实际 ${JSON.stringify(r2.triggered)}）`)
  // ③ db 脚本未声明执行（D-012：verify 时点文件集 ∩ db/*.sql 对账 facts.dbScriptDeclarations）
  const r3 = evaluatePassEligibility({ ...base, dbScriptCandidates: ['db/mig.sql'], facts: CLEAN_FACTS() })
  assert.ok(r3.ok === false && r3.triggered.some(t => t.fact === 'db-script-undeclared'),
    `③db/mig.sql 未声明 → error 且 triggered 含 db-script-undeclared（实际 ${JSON.stringify(r3.triggered)}）`)
  // ④ 矩阵 partial 且移交零行
  const r4 = evaluatePassEligibility({ ...base, facts: { ...CLEAN_FACTS(), matrixPartialRows: 2 } })
  assert.ok(r4.ok === false && r4.triggered.some(t => t.fact === 'matrix-partial-no-handover'),
    `④matrixPartialRows=2 且 handover 零行 → error 且 triggered 含 matrix-partial-no-handover（实际 ${JSON.stringify(r4.triggered)}）`)

  // 合并触发：①③④同场（②与④在单次调用内互斥——②须 blocking 行在场、④须 handover 零行，
  // 即「②管去向是否 blocking、④管有无去向」的分工；四枚举各命中一次由上方 r1~r4 单态各证）
  const all = evaluatePassEligibility({
    conclusion: 'PASS', factsExpected: true,
    dbScriptCandidates: ['db/mig.sql'],
    facts: {
      integrationRan: 'not-ran',
      handover: { count: 0, items: [] },
      dbScriptDeclarations: [],
      matrixPartialRows: 1,
    },
  })
  assert.deepEqual(all.triggered.map(t => t.fact).sort(),
    ['db-script-undeclared', 'integration-not-run', 'matrix-partial-no-handover'],
    '①③④合并触发：triggered[].fact 各命中一次（②与④互斥分工，②单态由 r2 证）')
  assert.ok(all.errors.some(e => e.includes('改写结论为 PASS WITH NOTES') && e.includes('## 移交项（结构化）')),
    `封顶 error 文案含修复指引（改写 PASS WITH NOTES + 补「## 移交项（结构化）」）（实际 ${JSON.stringify(all.errors.map(e => e.slice(0, 60)))}）`)
})

// ═══════════════════════════════════════════════════════════════════
// B. 全清态（FR-01 GWT2）——四条件全不成立放行；结论非 PASS 不封顶（零变化）
// ═══════════════════════════════════════════════════════════════════
test('B. 全清态：四条件全不成立 + PASS → 放行；NOTES/FAIL/未填时四条件在场也不封顶；②④分工', () => {
  const clean = evaluatePassEligibility({ conclusion: 'PASS', factsExpected: true, facts: CLEAN_FACTS() })
  assert.deepEqual(clean, { ok: true, errors: [], triggered: [] }, '全清 + PASS → ok 放行零 errors 零 triggered')

  const dirtyFacts = {
    integrationRan: 'not-ran',
    handover: { count: 1, items: [{ type: 'env-blocked', item: 'x', condition: 'y', severity: 'blocking' }] },
    dbScriptDeclarations: [],
    matrixPartialRows: 3,
  }
  for (const conclusion of ['PASS WITH NOTES', 'FAIL', '']) {
    const r = evaluatePassEligibility({ conclusion, factsExpected: true, facts: dirtyFacts, dbScriptCandidates: ['db/x.sql'] })
    assert.ok(r.ok === true && r.triggered.length === 0,
      `结论=${conclusion || '(未填)'}：四条件在场也不封顶（未触发场景行为零变化）`)
  }
  // ②④分工：partial 行由 advisory 移交行承载去向 → ②不触发（非 blocking）④不触发（有去向）
  const carried = evaluatePassEligibility({
    conclusion: 'PASS', factsExpected: true,
    facts: { ...CLEAN_FACTS(), matrixPartialRows: 2, handover: { count: 1, items: [{ type: 'manual-acceptance', item: '人工验收', condition: '按 8.1 逐条', severity: 'advisory' }] } },
  })
  assert.ok(carried.ok === true, 'advisory 移交行承载 partial 去向 + 无 blocking 行 + 已跑 → PASS 放行（②管去向级、④管有无去向）')
})

// ═══════════════════════════════════════════════════════════════════
// C. facts 双源口径（FR-01 GWT3/GWT4，D-011）——fail-closed 与存量兼容
// ═══════════════════════════════════════════════════════════════════
test('C. facts 双源：factsExpected=true 而 facts 缺失 → 全条件 fail-closed + 重跑 verify-probes 出路', () => {
  const r = evaluatePassEligibility({ conclusion: 'PASS', factsExpected: true, facts: null })
  assert.ok(r.ok === false && r.errors[0].includes('fail-closed') && r.errors[0].includes('重跑 verify-probes'),
    `facts 缺失 → 双源 fail-closed 报错文案含「重跑 verify-probes」出路（实际 ${JSON.stringify(r.errors[0].slice(0, 80))}）`)
  assert.deepEqual(r.triggered.map(t => t.fact).sort(),
    ['blocking-handover-present', 'integration-not-run', 'matrix-partial-no-handover'],
    'facts 缺失 → ①②④全条件按触发处理（③依赖外部 candidates 不受影响）')
})

test('C. facts 双源：factsExpected=false（存量未跑管线）→ 兼容口径 ok 不误伤', () => {
  const r = evaluatePassEligibility({
    conclusion: 'PASS', factsExpected: false, facts: null,
    dbScriptCandidates: ['db/x.sql'],
  })
  assert.deepEqual(r, { ok: true, errors: [], triggered: [] }, '存量未跑管线 → ok 放行（③文件集在场也不越界误伤）')
})

// ═══════════════════════════════════════════════════════════════════
// D. 豁免洞分层三态（FR-02 GWT1/GWT2，D-002@v1）——经 runValidators verify 链
// ═══════════════════════════════════════════════════════════════════
function makeExemptionChange(cn, { riskLevel, facts } = {}) {
  const root = mk('pe-exempt-')
  const changeDir = join(root, '.sillyspec', 'changes', cn)
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(changeDir, 'design.md'), [
    '---', 'author: t', `risk_level: ${riskLevel}`, 'created_at: 2026-01-01 08:00:00', '---',
    '# 设计', '', '## 文件变更清单', '',
    '| 操作 | 文件路径 | 说明 |', '|---|---|---|', '| 修改 | src/feature.js | 特性 |', '',
  ].join('\n'))
  writeFileSync(join(changeDir, 'plan.md'), '# Plan\n\n## Wave 1\n\n- [x] task-01: 实现\n')
  if (facts) writeFileSync(join(changeDir, 'verify-facts.json'), JSON.stringify(facts, null, 2) + '\n')
  writeFileSync(join(changeDir, 'verify-result.md'), [
    '# 验证报告', '', '结论枚举：`PASS WITH NOTES`——残留环境依赖见移交项', '',
    '单测全过。', '',
  ].join('\n'))
  return { root, cn }
}

test('D. 豁免洞分层：unit-sufficient 免证据 / critical 无 handover → error（二选一缺位）/ 有 handover → 放行', () => {
  // 态一：explicit unit-sufficient + NOTES → 不要求集成证据（关键词误伤逃生保留）
  const u = makeExemptionChange('exempt-unit', { riskLevel: 'unit-sufficient' })
  const ru = runValidators('verify', u.root, u.cn)
  assert.ok(!ru.errors.some(e => e.includes('缺少真实集成证据')),
    `explicit unit-sufficient + NOTES → 不强制集成证据（实际 errors=${JSON.stringify(ru.errors)}）`)

  // 态二：explicit integration-critical + NOTES + 无 handover + 无证据 → error（D-002 豁免洞封死）
  const c = makeExemptionChange('exempt-crit', { riskLevel: 'integration-critical' })
  const rc = runValidators('verify', c.root, c.cn)
  assert.ok(rc.errors.some(e => e.includes('缺少真实集成证据')),
    'explicit integration-critical + NOTES 无 handover 无证据 → error（结构化 handover 与齐全证据二选一缺位）')
  assert.ok(rc.warnings.some(w => w.includes('零有效行') && w.includes('二选一')),
    `warning 透出二选一出路（补结构化移交项 或 提供齐全集成证据）（实际 ${JSON.stringify(rc.warnings)}）`)

  // 态三：同判级 + NOTES + 携带结构化 handover（facts.handover 有效行）→ 放行
  const h = makeExemptionChange('exempt-handover', {
    riskLevel: 'integration-critical',
    facts: {
      schemaVersion: 2, integrationRan: 'ran',
      handover: { count: 1, items: [{ type: 'env-blocked', item: '联调环境阻断', condition: '恢复后复跑', severity: 'advisory' }] },
      dbScriptDeclarations: [], runtimeEndpointExcluded: false, matrixPartialRows: 0,
    },
  })
  const rh = runValidators('verify', h.root, h.cn)
  assert.ok(!rh.errors.some(e => e.includes('缺少真实集成证据'))
    && rh.warnings.some(w => w.includes('缺口由结构化移交项承载') && w.includes('facts.handover 1 行')),
    `explicit critical + NOTES + facts.handover 有效行 → 免证据放行且 warning 声明承载口径（实际 ${JSON.stringify(rh.errors)} / ${JSON.stringify(rh.warnings)}）`)
})

// ═══════════════════════════════════════════════════════════════════
// E. integrationRan 判定表（FR-02 GWT3 / D-006）——producer backfillFactsFromMdAndTests
// ═══════════════════════════════════════════════════════════════════
/** 造 specBase 夹具：changes/<change>/verify-facts.json + 按需 local.yaml / quality-scan 记录 / 回执槽 */
function mkScanFixture({ change, strategy = null, record = null, receiptCmd = null }) {
  const specBase = mk('pe-scan-')
  const changeDir = join(specBase, 'changes', change)
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(changeDir, 'verify-facts.json'), JSON.stringify({ schemaVersion: 2, probes: {} }, null, 2))
  if (strategy) {
    writeFileSync(join(specBase, 'local.yaml'), `test_strategy: ${strategy}\n`)
  }
  if (record) {
    mkdirSync(join(specBase, '.runtime'), { recursive: true })
    writeFileSync(join(specBase, '.runtime', `verify-quality-scan-${change}.json`), JSON.stringify(record, null, 2))
  }
  const receipt = receiptCmd ? [
    '# 验证报告', '',
    '## 集成验证回执 [层：自述声明——CLI 一致性校验]', '',
    '- claim: 实测回执',
    `  command: ${receiptCmd}`,
    '  exit: 0',
    '  log: logs/smoke.log', '',
  ].join('\n') : '# 验证报告\n\n结论枚举：`PASS WITH NOTES`\n'
  return { specBase, factsPath: join(changeDir, 'verify-facts.json'), verifyMd: receipt, change }
}

const PASSED_RECORD = () => ({ schemaVersion: 1, source: 'cli-noai', testResult: { status: 'passed', command: 'npm test', exitCode: 0 } })

test('E. integrationRan 判定表：quality-scan 记录 × test_strategy 档位', () => {
  const cases = [
    { change: 'scan-skip', strategy: 'skip', record: PASSED_RECORD(), expect: 'not-ran' },
    { change: 'scan-module', strategy: 'module', record: PASSED_RECORD(), expect: 'ran' },
    { change: 'scan-ea', strategy: 'evidence-auto', record: PASSED_RECORD(), expect: 'ran' },
    { change: 'scan-skipstatus', strategy: 'full', record: { schemaVersion: 1, source: 'cli-noai', testResult: { status: 'skipped' } }, expect: 'not-ran' },
  ]
  for (const c of cases) {
    const fx = mkScanFixture(c)
    const cap = captureWarn()
    try {
      backfillFactsFromMdAndTests(fx.factsPath, { verifyMd: fx.verifyMd, conclusion: 'PASS WITH NOTES' })
      const onDisk = JSON.parse(readFileSync(fx.factsPath, 'utf8'))
      assert.equal(onDisk.integrationRan, c.expect,
        `test_strategy=${c.strategy} + 记录 status=${c.record.testResult.status} → integrationRan=${c.expect}（D-006：skip=未跑、module/evidence-auto=已跑、skipped 非实跑）`)
    } finally { cap.restore() }
  }
})

test('E. integrationRan 判定表：回执来源分类（build/unit 不计入、cross-layer 计入、未定类默认 build）', () => {
  const cases = [
    { change: 'rcpt-compile', receiptCmd: 'mvn compile -q -DskipTests', expect: 'not-ran' },
    { change: 'rcpt-unit', receiptCmd: 'java -cp . org.junit.runner.JUnitCore FooTest', expect: 'not-ran' },
    { change: 'rcpt-cross', receiptCmd: 'curl -s http://127.0.0.1:18080/api/health', expect: 'ran' },
    { change: 'rcpt-unclassified', receiptCmd: './gradlew assemble', expect: 'not-ran' },
  ]
  for (const c of cases) {
    const fx = mkScanFixture(c)
    const cap = captureWarn()
    try {
      backfillFactsFromMdAndTests(fx.factsPath, { verifyMd: fx.verifyMd, conclusion: 'PASS WITH NOTES' })
      const onDisk = JSON.parse(readFileSync(fx.factsPath, 'utf8'))
      assert.equal(onDisk.integrationRan, c.expect,
        `回执 command「${c.receiptCmd}」→ integrationRan=${c.expect}（build=compile 构建类不计入 / unit=纯单测不计入 / cross-layer 计入 / 未定类默认 build）`)
    } finally { cap.restore() }
  }
  // X-01 fail-open 注记：quality-scan 记录缺失时 not-ran 附出路（不阻断）
  const fx = mkScanFixture({ change: 'rcpt-norecord' })
  const cap = captureWarn()
  try {
    backfillFactsFromMdAndTests(fx.factsPath, { verifyMd: fx.verifyMd, conclusion: 'PASS WITH NOTES' })
    assert.ok(cap.caught.some(w => w.includes('quality-scan 实测记录缺失') && w.includes('重跑质量扫描')),
      `记录缺失 → not-ran + fail-open 注记含「重跑质量扫描」出路（实际 ${JSON.stringify(cap.caught)}）`)
  } finally { cap.restore() }
})

// ═══════════════════════════════════════════════════════════════════
// F. severity 面（FR-06 GWT1~GWT3，D-005@v2）——parseHandoverRows 四列/三列/降级文法
// ═══════════════════════════════════════════════════════════════════
function handoverMd(rows) {
  return ['## 移交项（结构化） [层：人工判断——CLI 清单核验]', '', ...rows, ''].join('\n')
}

test('F. severity：类型缺省映射（db-script/env-blocked→blocking，manual-acceptance/other→advisory）', () => {
  const items = parseHandoverRows(handoverMd([
    '| 类型 | 条目 | 复跑/验收条件 | severity |',
    '|---|---|---|---|',
    '| db-script | fix.sql | dev 库手工执行 | |',
    '| env-blocked | 集成用例 | 恢复后复跑 | |',
    '| manual-acceptance | 三端联调 | 按 8.1 逐条 | |',
    '| other | 杂项 | 说明 | |',
  ]))
  assert.deepEqual(items.map(i => i.severity), ['blocking', 'blocking', 'advisory', 'advisory'],
    '四列表 severity 列空 → 按类型缺省映射（集成复跑与 fix.sql 恒 blocking，X-07）')
})

test('F. severity：三列存量行零迁移（无 severity 列按类型缺省映射）', () => {
  const items = parseHandoverRows(handoverMd([
    '| 类型 | 条目 | 复跑/验收条件 |',
    '|---|---|---|',
    '| env-blocked | 集成用例 | 恢复后复跑 |',
    '| manual-acceptance | 三端联调 | 按 8.1 逐条 |',
  ]))
  assert.deepEqual(items.map(i => i.severity), ['blocking', 'advisory'],
    '存量三列表格行零迁移：env-blocked→blocking、manual-acceptance→advisory')
})

test('F. severity：降级 blocking→advisory 缺理由文法 → 回退按 blocking；文法在第 4 列或条件列任一命中即认', () => {
  const items = parseHandoverRows(handoverMd([
    '| 类型 | 条目 | 复跑/验收条件 | severity |',
    '|---|---|---|---|',
    '| env-blocked | 无理由降级 | 恢复后复跑 | advisory |',
    '| env-blocked | 第4列降级 | 恢复后复跑 | advisory（降级：环境依赖已随本批配置消除，依据 D-005） |',
    '| env-blocked | 条件列降级 | （降级：仅影响灰度环境，依据 src/config.js:42） | advisory |',
  ]))
  assert.equal(items[0].severity, 'blocking', '显式 advisory 但 blocking 缺省类型缺降级理由文法 → 回退 blocking（fail-closed，防全标 advisory 钻空）')
  assert.equal(items[1].severity, 'advisory', '降级理由文法在第 4 列（（降级：<理由>，依据 D-xxx）全角文法）→ advisory')
  assert.equal(items[2].severity, 'advisory', '降级理由文法在条件列（依据 file:line 锚）→ advisory（producer 宽收两侧）')
})

// ═══════════════════════════════════════════════════════════════════
// G. Runtime Evidence 收口（FR-03 GWT1/GWT2，D-004）
// ═══════════════════════════════════════════════════════════════════
test('G. runtimeEndpointExcluded：判级 critical + 无 handover → 计入①事实面；有 handover / 非判级 → 不计入', () => {
  const excludedFacts = () => ({ ...CLEAN_FACTS(), runtimeEndpointExcluded: true })
  const r1 = evaluatePassEligibility({
    conclusion: 'PASS', factsExpected: true, facts: excludedFacts(),
    changeRiskProfile: { level: 'integration-critical' },
  })
  assert.ok(r1.ok === false && r1.triggered.some(t => t.fact === 'integration-not-run' && t.detail.includes('runtimeEndpointExcluded')),
    `判级 integration-critical + 端点行「不涉及」+ handover 零行 → 计入①事实面封顶（实际 ${JSON.stringify(r1.triggered)}）`)
  assert.ok(r1.errors.some(e => e.includes('不涉及') && e.includes('免检')), 'error 文案点名「端点不得以『不涉及』免检」')

  const r2 = evaluatePassEligibility({
    conclusion: 'PASS', factsExpected: true,
    facts: { ...excludedFacts(), handover: { count: 1, items: [{ type: 'other', item: '端点人工核验', condition: '部署后核', severity: 'advisory' }] } },
    changeRiskProfile: { level: 'integration-critical' },
  })
  assert.ok(r2.ok === true, '有对应 handover（任意级）承载 → 不计入（端点免检须移交兜底）')

  const r3 = evaluatePassEligibility({
    conclusion: 'PASS', factsExpected: true, facts: excludedFacts(),
    changeRiskProfile: { level: 'unit-sufficient' },
  })
  assert.ok(r3.ok === true, '非 integration/deployment-critical 判级 → 不计入（仅判级时收口）')
})

test('G. producer：parseRuntimeEndpointExcluded 表格行「不涉及」识别（prose/非端点行不计）', () => {
  const dir = mk('pe-ep-')
  const factsPath = join(dir, 'verify-facts.json')
  writeFileSync(factsPath, JSON.stringify({ schemaVersion: 2, probes: {} }, null, 2))
  const cap = captureWarn()
  try {
    backfillFactsFromMdAndTests(factsPath, {
      verifyMd: [
        '## Runtime Evidence [层：人工判断]', '',
        '| 证据项 | 说明 | 结论 |', '|---|---|---|',
        '| 服务端点 | GET /api/health | 不涉及 |',
        '| 登录接口 | POST /login | 不涉及 |',
        '服务端点不涉及（prose 行）', '',
        '## 结论', '', '结论枚举：`PASS WITH NOTES`', '',
      ].join('\n'),
      conclusion: 'PASS WITH NOTES',
    })
    const onDisk = JSON.parse(readFileSync(factsPath, 'utf8'))
    assert.equal(onDisk.runtimeEndpointExcluded, true, 'Runtime Evidence 表格行含「服务端点」且末格「不涉及」→ facts.runtimeEndpointExcluded=true')
    // 对照：无端点关键词表格行 + prose 行不触发
    writeFileSync(factsPath, JSON.stringify({ schemaVersion: 2, probes: {} }, null, 2))
    backfillFactsFromMdAndTests(factsPath, {
      verifyMd: [
        '## Runtime Evidence [层：人工判断]', '',
        '| 登录接口 | POST /login | 不涉及 |',
        '服务端点不涉及（prose 行）', '',
      ].join('\n'),
      conclusion: 'PASS WITH NOTES',
    })
    const onDisk2 = JSON.parse(readFileSync(factsPath, 'utf8'))
    assert.equal(onDisk2.runtimeEndpointExcluded, false, '仅非端点关键词表格行 / prose 行「不涉及」→ false（X-18 只认端点类表格行）')
  } finally { cap.restore() }
})

// ═══════════════════════════════════════════════════════════════════
// H. fix.sql 双门（FR-05 GWT2 / D-007 / D-012）——checkDbScriptDeclarationGate + archive --confirm 兜底
// ═══════════════════════════════════════════════════════════════════
function mkGateChange(cn, verifyMd) {
  const root = mk('pe-db-')
  const specBase = join(root, '.sillyspec')
  const changeDir = join(specBase, 'changes', cn)
  mkdirSync(changeDir, { recursive: true })
  if (verifyMd !== null) writeFileSync(join(changeDir, 'verify-result.md'), verifyMd)
  return { root, specBase, cn, changeDir }
}

test('H. db 声明门：apply 文件集 ∩ db/*.sql ⊄ 声明集 → 阻断；声明齐备双形态 → 放行', () => {
  // 声明文法单点：声明行 + 回执 command 双形态（X-03）
  assert.deepEqual(
    parseDbScriptDeclarations('已对目标库执行：db/fix.sql\n已对目标库执行: db/other.sql'),
    ['db/fix.sql', 'db/other.sql'], '「已对目标库执行：db/<file>.sql」声明行（全/半角冒号）解析且排序')

  // 门一（apply 尾声同款函数）：缺声明 → 阻断 + 修复指引
  const g1 = mkGateChange('dbgate-missing', '# 验证报告\n\n结论枚举：`PASS WITH NOTES`\n\n单测全过。\n')
  const r1 = checkDbScriptDeclarationGate({ projectRoot: g1.root, specBase: g1.specBase, changeName: g1.cn, files: ['src/a.js', 'db/fix.sql'] })
  assert.ok(r1.ok === false && r1.error.includes('db/fix.sql') && r1.error.includes('已对目标库执行'),
    `apply 集 ∩ db/*.sql ⊄ 声明集 → 阻断 + 声明行修复指引（实际 ${JSON.stringify(r1.error && r1.error.slice(0, 100))}）`)

  // 声明行齐备 → 放行
  const g2 = mkGateChange('dbgate-declared', '# 验证报告\n\n结论枚举：`PASS`\n\n已对目标库执行：db/fix.sql\n')
  const r2 = checkDbScriptDeclarationGate({ projectRoot: g2.root, specBase: g2.specBase, changeName: g2.cn, files: ['db/fix.sql'] })
  assert.ok(r2.ok === true, '声明行齐备 → 门放行')

  // 回执 command 含 db/<file>.sql → 等价声明 → 放行
  const g3 = mkGateChange('dbgate-receipt', [
    '# 验证报告', '', '结论枚举：`PASS`', '',
    '## 集成验证回执 [层：自述声明——CLI 一致性校验]', '',
    '- claim: 执行迁移',
    '  command: psql -f db/fix.sql',
    '  exit: 0',
    '  log: logs/migrate.log', '',
  ].join('\n'))
  const r3 = checkDbScriptDeclarationGate({ projectRoot: g3.root, specBase: g3.specBase, changeName: g3.cn, files: ['db/fix.sql'] })
  assert.ok(r3.ok === true, '回执槽 command 含 db/fix.sql（X-03 双形态之二）→ 等价声明放行')

  // verify-result.md 缺失（verify 之后新增 sql 的时序窗口）→ 空声明集 fail-closed
  const g4 = mkGateChange('dbgate-nomd', null)
  const r4 = checkDbScriptDeclarationGate({ projectRoot: g4.root, specBase: g4.specBase, changeName: g4.cn, files: ['db/late.sql'] })
  assert.ok(r4.ok === false && r4.error.includes('db/late.sql'),
    'verify-result.md 无对应声明（含缺失）→ 兜底拦截（覆盖 verify 后新增 sql 时序窗口）')

  // 无 db/*.sql 交集 → 零行为变化（存量兼容）
  const g5 = mkGateChange('dbgate-nodb', '# 验证报告\n')
  const r5 = checkDbScriptDeclarationGate({ projectRoot: g5.root, specBase: g5.specBase, changeName: g5.cn, files: ['src/a.js'] })
  assert.ok(r5.ok === true && !r5.warning, '文件集无 db/*.sql → 门空转放行（存量兼容零行为变化）')
})

test('H. db-script handover 行与执行声明互斥（D-005@v2：写 db-script = 承认未执行 ⇒ 两面矛盾拦截）', () => {
  const g = mkGateChange('dbgate-mutex', [
    '# 验证报告', '', '结论枚举：`PASS WITH NOTES`', '',
    '已对目标库执行：db/fix.sql', '',
    '## 移交项（结构化） [层：人工判断——CLI 清单核验]', '',
    '| 类型 | 条目 | 复跑/验收条件 | severity |',
    '|---|---|---|---|',
    '| db-script | db/fix.sql | dev 库手工执行 | blocking |', '',
  ].join('\n'))
  const r = checkDbScriptDeclarationGate({ projectRoot: g.root, specBase: g.specBase, changeName: g.cn, files: ['db/fix.sql'] })
  assert.ok(r.ok === false && r.error.includes('互斥'),
    `声明齐备 × handover 存在 db-script 行 → 两面矛盾拦截（实际 ${JSON.stringify(r.error && r.error.slice(0, 80))}）`)
})

test('H. archive --confirm 前置兜底：apply-manifest 含未声明 db/*.sql → 步骤回 pending + 归档阻断（目录不动）', async () => {
  const root = mk('pe-confirm-')
  const specBase = join(root, '.sillyspec')
  const changeDir = join(specBase, 'changes', 'confirm-gate')
  mkdirSync(changeDir, { recursive: true })
  // verify 之后新增 db/new.sql（verify-result 无对应声明）——apply-manifest 记录的 apply 集
  writeFileSync(join(changeDir, 'verify-result.md'), '# 验证报告\n\n结论枚举：`PASS`\n\n已对目标库执行：db/old.sql\n')
  writeFileSync(join(changeDir, 'apply-manifest.json'), JSON.stringify({ files: [{ path: 'db/old.sql' }, { path: 'db/new.sql' }] }, null, 2))
  const steps = [{ name: '确认归档', status: 'completed', completedAt: '2026-09-17T00:00:00Z', output: 'x' }]
  const pm = { _write: () => {} }
  const errs = []
  const origErr = console.error
  console.error = (...a) => errs.push(a.join(' '))
  try {
    const r = await handleArchiveConfirmStep({
      stageName: 'archive', steps, currentIdx: 0, confirm: true, outputText: '确认归档',
      pm, cwd: root, progress: { currentChange: 'confirm-gate' }, changeName: 'confirm-gate', specBase,
    })
    assert.ok(r && r.stageCompleted === false, '--confirm 已过但 db 声明对账未过 → early return 不推进（归档阻断）')
    assert.equal(steps[0].status, 'pending', '步骤状态回 pending（复用 !confirm 早退形态）')
    assert.ok(errs.some(e => e.includes('db 脚本执行声明对账未过') && e.includes('db/new.sql')),
      `阻断文案点名未声明文件 db/new.sql（实际 ${JSON.stringify(errs)}）`)
  } finally { console.error = origErr }
})

// ═══════════════════════════════════════════════════════════════════
// 附：壳层接线（validatePassEligibility）——结论槽 PASS 消费 + factsExpected 判定
// ═══════════════════════════════════════════════════════════════════
test('附. 壳层：validatePassEligibility 消费结论槽与 facts；resolveFactsExpected 双源判定', () => {
  const root = mk('pe-shell-')
  const changeDir = join(root, '.sillyspec', 'changes', 'shell-1')
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(changeDir, 'verify-result.md'), '# 验证报告\n\n结论枚举：`PASS`——全绿\n')
  // 无 facts 且非严格档（无 design created_at）→ factsExpected=false → 兼容 ok
  const r0 = validatePassEligibility(root, 'shell-1', {})
  assert.ok(r0.ok === true, 'factsExpected=false（无 facts 非严格档）→ 壳层兼容 ok 不误伤')
  // 落 facts（integrationRan=not-ran）→ factsExpected=true → ①封顶触发（结论槽 PASS 被消费）
  writeFileSync(join(changeDir, 'verify-facts.json'), JSON.stringify({ schemaVersion: 2, ...CLEAN_FACTS(), integrationRan: 'not-ran' }, null, 2))
  const r1 = validatePassEligibility(root, 'shell-1', {})
  assert.ok(r1.ok === false && r1.errors.some(e => e.includes('[fact integration-not-run]')),
    `facts 在场 → factsExpected=true + 结论槽 PASS → ①封顶触发（实际 ${JSON.stringify(r1.errors.map(e => e.slice(0, 60)))}）`)
  // 结论槽改 NOTES → 不封顶（NOTES 放行联动）
  writeFileSync(join(changeDir, 'verify-result.md'), '# 验证报告\n\n结论枚举：`PASS WITH NOTES`——移交承载\n')
  const r2 = validatePassEligibility(root, 'shell-1', {})
  assert.ok(r2.ok === true, '结论槽 PASS WITH NOTES → 封顶不生效（NOTES 由移交项承载路径接管）')
})
