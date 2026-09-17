/**
 * 探针 7 验收×测试覆盖矩阵门禁（2026-09-14-acceptance-test-matrix FR-02）单测。
 *
 * 覆盖：
 * 1. extractAcceptanceMatrixSlots（纯字符串解析）：
 *    - 四枚举 covered/partial/uncovered/non-testable 正确解析（判定列原样进 rows）
 *    - <待填：四选一> / 白名单外判定 → unfilled 计数
 *    - 证据锚点三形态通过：`.test.` 文件名 / file:line（x.js:123）/ 反引号包裹标识符
 *    - covered/partial 缺锚点 → missingEvidence；non-testable 空/<TODO> 理由 → missingEvidence；
 *      uncovered 无证据要求（<TODO> 不计）
 *    - 管道转义切列：acceptance 单元格内 \| 不偏移判定/证据列
 *    - 段边界：全/半角冒号标题皆认；段止于下个同级/更高级标题（##### 属段内）
 *    - 表头/分隔行、**task-NN** 锚行、列表防御行与「不适用」行不计槽；无段 present=false 0/0
 * 2. validateAcceptanceMatrix（经 runValidators('verify') 注册链生效）：
 *    - 有 tasks/ + 段在场 + 未填槽 → errors 阻断（task+acceptance 进错误文案）
 *    - 证据缺失 → errors 阻断
 *    - 全填放行（四枚举 + 证据齐 → runValidators verify ok=true，不误伤既有正常流）
 *    - 无 tasks/ 目录 → no-op（严格档 + 无段也不产矩阵 error/warning——brownfield 零行为变化）
 *    - 有 tasks/ + 无段 + 严格档（真实 IR_STRICT_SINCE 常量构造 created_at）→ ERROR
 *    - 有 tasks/ + 无段 + 非严格档 → warning 不阻断
 *    - partial/uncovered × facts.handover 联动（D-003/FR-04，task-03）：矩阵含 partial/uncovered
 *      行且 facts.handover 零有效行 → error（部分实现必须有移交去向）；有 advisory 有效行放行；
 *      严格档无 verify-facts.json → fail-closed（含重跑 verify-probes 出路）；非严格档存量零行为；
 *      放行路径逐行关联 advisory（R-05 第一版：行标识未命中条目文本 → console.warn 不阻断）
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import { runValidators, extractAcceptanceMatrixSlots } from '../src/stage-contract.js'
import { IR_STRICT_SINCE } from '../src/constants.js'

let passed = 0
let failed = 0
const tmpRoots = []

function assert(cond, msg) {
  if (cond) { console.log(`  ✅ PASS: ${msg}`); passed++ }
  else { console.log(`  ❌ FAIL: ${msg}`); failed++ }
}

function clip40(s) { return String(s).length > 40 ? String(s).slice(0, 40) + '…' : String(s) }

console.log('=== 1. extractAcceptanceMatrixSlots 纯解析 ===')

// 1.1 四枚举 + 锚行 + 表头/分隔行/防御行跳过 + 段边界（全角冒号 + 末尾更高级标题截断）
{
  const md = [
    '#### 探针 1：未实现标记扫描',
    '- ✅ 无命中',
    '',
    '#### 探针 7：验收×测试覆盖矩阵',
    '<!-- 口径注记 -->',
    '',
    '**task-01**',
    '- （卡无 acceptance——防御，plan-postcheck 已拦）',
    '',
    '**task-02**',
    '| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |',
    '|---|---|---|---|---|',
    '| 判定枚举解析 | `test/a.test.mjs` | — | covered | `test/a.test.mjs` 全绿 |',
    '| 部分承接 | `test/b.test.mjs` | — | partial | 见 src/b.js:42 断言 |',
    '| 未承接声明 | 无归属测试 | — | uncovered | <TODO> |',
    '| 文档类条目 | 无归属测试 | — | non-testable | 纯文档变更无测试面 |',
    '',
    '##### 段内低级标题（属段内，不截断）',
    '',
    '**task-03**',
    '| 锚行归位 | `test/c.test.mjs` | — | covered | `runFullGate` 通过 |',
    '',
    '### 更高级标题（段终止）',
    '| 段外行 | `test/x.test.mjs` | — | covered | `test/x.test.mjs` |',
    '',
  ].join('\n')

  const r = extractAcceptanceMatrixSlots(md)
  assert(r.present === true, '段在场 present=true（全角冒号标题识别）')
  assert(r.rows.length === 5, `只计数据行（表头/分隔/防御行跳过），rows=5（实际 ${r.rows.length}）`)
  assert(r.rows.filter(x => x.task === 'task-02').length === 4 && r.rows.filter(x => x.task === 'task-03').length === 1,
    '**task-NN** 锚行正确归位行归属')
  const verdicts = r.rows.map(x => x.verdict)
  assert(JSON.stringify(verdicts.slice(0, 4)) === JSON.stringify(['covered', 'partial', 'uncovered', 'non-testable']),
    `四枚举判定列原样解析（实际 ${JSON.stringify(verdicts.slice(0, 4))}）`)
  const last = r.rows[r.rows.length - 1]
  assert(last.task === 'task-03' && last.verdict === 'covered',
    '##### 段内低级标题不截断；### 更高级标题后段外行不计（末行=task-03 段内行）')
  assert(r.unfilled === 0, `四枚举全白名单 unfilled=0（实际 ${r.unfilled}）`)
  assert(r.missingEvidence === 0, `uncovered 行 <TODO> 证据不计 missingEvidence；covered/partial 锚点齐、non-testable 有理由 → 0（实际 ${r.missingEvidence}）`)
}

// 1.2 证据锚点三形态逐项通过
{
  const rows = [
    ['锚点A：.test. 文件名', 'covered', '跑 node test/gate.test.mjs 全绿'],
    ['锚点B：file:line', 'covered', '断言见 src/feature.js:123'],
    ['锚点C：反引号标识符', 'covered', '`extractAcceptanceMatrixSlots` 三用例通过'],
    ['锚点C2：反引号路径', 'partial', '主路径 `test/gate.test.mjs` 通过，边界待补'],
  ]
  const md = [
    '#### 探针 7：验收×测试覆盖矩阵',
    '',
    '**task-01**',
    '| acceptance 条目 | 归属测试文件 | 关键词命中 | 判定 | 证据 |',
    '|---|---|---|---|---|',
    ...rows.map(r_ => `| ${r_[0]} | x | — | ${r_[1]} | ${r_[2]} |`),
    '',
  ].join('\n')
  const r = extractAcceptanceMatrixSlots(md)
  assert(r.unfilled === 0 && r.missingEvidence === 0,
    `证据锚点三形态（.test. 文件名 / file:line / 反引号）全部通过（实际 ${r.unfilled}/${r.missingEvidence}）`)
}

// 1.3 待填计数（<待填：四选一> 与白名单外）
{
  const md = [
    '#### 探针 7：验收×测试覆盖矩阵',
    '',
    '**task-01**',
    '| acceptance 条目 | 归属测试文件 | 关键词命中 | 判定 | 证据 |',
    '|---|---|---|---|---|',
    '| 条目一 | `test/a.test.mjs` | — | <待填：四选一> | <TODO> |',
    '| 条目二 | `test/a.test.mjs` | — | maybe | <TODO> |',
    '| 条目三 | `test/a.test.mjs` | — | covered | `test/a.test.mjs` |',
    '',
  ].join('\n')
  const r = extractAcceptanceMatrixSlots(md)
  assert(r.unfilled === 2, `<待填：四选一> 与白名单外（maybe）各计一行 → unfilled=2（实际 ${r.unfilled}）`)
  assert(r.missingEvidence === 0, '判定未填的行不重复计证据（只计 unfilled）')
  assert(r.rows[0].unfilled === true && r.rows[1].unfilled === true && r.rows[2].unfilled !== true,
    '行级 unfilled 标记与计数一致')
}

// 1.4 证据缺失三口径：covered 缺锚点 / partial <TODO> / non-testable 空理由
{
  const md = [
    '#### 探针 7:验收×测试覆盖矩阵', // 半角冒号标题
    '',
    '**task-01**',
    '| acceptance 条目 | 归属测试文件 | 关键词命中 | 判定 | 证据 |',
    '|---|---|---|---|---|',
    '| 缺锚点 | `test/a.test.mjs` | — | covered | 看过了没问题 |',
    '| TODO 证据 | `test/a.test.mjs` | — | partial | <TODO> |',
    '| 空理由 | 无归属测试 | — | non-testable |   |',
    '| 有理由 | 无归属测试 | — | non-testable | 纯部署配置变更 |',
    '',
  ].join('\n')
  const r = extractAcceptanceMatrixSlots(md)
  assert(r.present === true, '半角冒号标题同样识别')
  assert(r.missingEvidence === 3, `covered 缺锚点 + partial <TODO> + non-testable 空白理由 → 3（实际 ${r.missingEvidence}）`)
  assert(r.missingEvidence > 0 && r.rows[3].evidenceMissing !== true, 'non-testable 带一句理由合规')
}

// 1.5 管道转义切列：acceptance 单元格 \| 不偏移判定/证据列
{
  const md = [
    '#### 探针 7：验收×测试覆盖矩阵',
    '',
    '**task-01**',
    '| acceptance 条目 | 归属测试文件 | 关键词命中 | 判定 | 证据 |',
    '|---|---|---|---|---|',
    '| 条件 a \\| b 二选一 | `test/a.test.mjs` | — | covered | `test/a.test.mjs` |',
    '',
  ].join('\n')
  const r = extractAcceptanceMatrixSlots(md)
  assert(r.rows.length === 1 && r.rows[0].verdict === 'covered' && r.rows[0].evidence.trim() === '`test/a.test.mjs`',
    `\\| 转义不切列：判定/证据仍读自第 4/5 列（实际 ${JSON.stringify(r.rows[0] && r.rows[0].verdict)}）`)
  assert(r.rows[0].acceptance === '条件 a | b 二选一', '\\| 解码为字面管道进 acceptance')
  assert(r.unfilled === 0 && r.missingEvidence === 0, '转义行不误报未填/缺证据')
}

// 1.6 无段 present=false
{
  const r = extractAcceptanceMatrixSlots('# 验证报告\n\n## 结论\n\nPASS\n')
  assert(r.present === false && Array.isArray(r.rows) && r.rows.length === 0 && r.unfilled === 0 && r.missingEvidence === 0,
    '无探针 7 段 → present=false、rows=[]、0/0')
}

console.log('\n=== 2. validateAcceptanceMatrix（runValidators verify 链） ===')

const tmpRoot = mkdtempSync(join(tmpdir(), 'amx-gate-'))
tmpRoots.push(tmpRoot)

/** 造一个能过 validateVerifyOutputs 基线的变更目录（结论槽 PASS + 低风险 design/plan）。
 *  facts 传对象时落 verify-facts.json（task-03 联动分支与 task-02 封顶校验的消费输入）。 */
function makeChange(cn, { strict = true, withTasks = true, verifyMd, facts } = {}) {
  const root = mkdtempSync(join(tmpRoot, cn + '-'))
  tmpRoots.push(root)
  const changeDir = join(root, '.sillyspec', 'changes', cn)
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(changeDir, 'design.md'), [
    '---',
    `created_at: ${strict ? IR_STRICT_SINCE : '2026-01-01'} 08:00:00`,
    '---',
    '# 设计', '',
    '## 文件变更清单', '',
    '| 操作 | 文件路径 | 说明 |', '|---|---|---|', '| 修改 | src/feature.js | 特性 |', '',
  ].join('\n'))
  writeFileSync(join(changeDir, 'plan.md'), '# Plan\n\n## Wave 1\n\n- [x] task-01: 实现\n')
  if (withTasks) {
    mkdirSync(join(changeDir, 'tasks'))
    writeFileSync(join(changeDir, 'tasks', 'task-01.md'), [
      '---', 'id: task-01', 'title: 门禁', 'allowed_paths:', '  - src/stage-contract.js',
      'acceptance:', '  - 判定枚举解析', '  - 证据锚点核验', '---', '',
    ].join('\n'))
  }
  if (facts) writeFileSync(join(changeDir, 'verify-facts.json'), JSON.stringify(facts, null, 2) + '\n')
  if (verifyMd !== null) writeFileSync(join(changeDir, 'verify-result.md'), verifyMd)
  return { root, cn }
}

const MATRIX_HEAD = [
  '#### 探针 7：验收×测试覆盖矩阵', '', '**task-01**',
  '| acceptance 条目 | 归属测试文件 | 关键词命中 | 判定 | 证据 |', '|---|---|---|---|---|',
].join('\n')

function verifyDoc(bodyLines, conclusion = 'PASS') {
  return ['# 验证报告', '', `结论枚举：${conclusion}`, '', bodyLines.join('\n'), ''].join('\n')
}

// 2.1 未填槽 → errors 阻断
{
  const { root, cn } = makeChange('gate-unfilled', {
    verifyMd: verifyDoc([
      MATRIX_HEAD,
      '| 判定枚举解析 | `test/x.test.mjs` | — | <待填：四选一> | <TODO> |',
      '| 证据锚点核验 | `test/x.test.mjs` | — | covered | `test/x.test.mjs` |',
    ]),
  })
  const r = runValidators('verify', root, cn)
  const err = r.errors.find(e => e.includes('判定未填'))
  assert(r.ok === false && !!err, '未填槽 → runValidators verify 阻断（判定未填 error）')
  assert(err && err.includes('task-01') && err.includes(clip40('判定枚举解析')),
    '错误文案点名 task + acceptance（40 字截断口径）')
}

// 2.2 证据缺失 → errors 阻断（covered 缺锚点 + non-testable <TODO>）
{
  const { root, cn } = makeChange('gate-evidence', {
    verifyMd: verifyDoc([
      MATRIX_HEAD,
      '| 判定枚举解析 | `test/x.test.mjs` | — | covered | 应该没问题 |',
      '| 证据锚点核验 | `test/x.test.mjs` | — | covered | <TODO> |',
    ]),
  })
  const r = runValidators('verify', root, cn)
  const err = r.errors.find(e => e.includes('证据缺失'))
  assert(r.ok === false && !!err, '证据缺失（covered 缺锚点 + <TODO>）→ 阻断')
  assert(err && err.includes('.test.') && err.includes('file:line') && err.includes('non-testable'),
    '错误文案给三口径修复指引（.test. / file:line / non-testable 理由）')
}

// 2.3 全填放行（四枚举各一 + 证据齐 → 整链 ok=true，不误伤既有正常流）
// task-03 夹具同步：矩阵含 partial/uncovered 行 → 补 verify-facts.json（四条件全清形态，
// handover 有 advisory 行承载 partial/uncovered 去向）——新契约下「正常流不误伤」语义不变。
{
  const { root, cn } = makeChange('gate-allfilled', {
    verifyMd: verifyDoc([
      MATRIX_HEAD,
      '| 枚举一 covered | `test/x.test.mjs` | — | covered | `test/x.test.mjs` 全绿 |',
      '| 枚举二 partial | `test/x.test.mjs` | — | partial | 断言见 src/feature.js:42 |',
      '| 枚举三 uncovered | 无归属测试 | — | uncovered | — |',
      '| 枚举四 non-testable | 无归属测试 | — | non-testable | 文档类条目无测试面 |',
    ]),
    facts: {
      schemaVersion: 2,
      integrationRan: 'ran',
      handover: { count: 1, items: [{ type: 'env-blocked', item: '边界用例环境阻断', condition: '环境恢复后复跑 test/x.test.mjs', severity: 'advisory' }] },
      dbScriptDeclarations: [],
      runtimeEndpointExcluded: false,
      matrixPartialRows: 2,
    },
  })
  const r = runValidators('verify', root, cn)
  assert(r.ok === true, `四枚举 + 证据齐 → verify 整链放行（实际 errors=${JSON.stringify(r.errors)}）`)
}

// 2.4 无 tasks/ → no-op（严格档 + 无段零新增 error/warning——brownfield 零行为变化）
// task-03 夹具同步：严格档 + 结论 PASS 会触发 task-02 封顶 fail-closed——补全清 facts 使本用例
// 回归「矩阵门禁 no-op」原测语义。
{
  const { root, cn } = makeChange('gate-notasks', {
    strict: true, withTasks: false,
    verifyMd: verifyDoc(['正文无矩阵段']),
    facts: { schemaVersion: 2, integrationRan: 'ran', dbScriptDeclarations: [], runtimeEndpointExcluded: false, matrixPartialRows: 0 },
  })
  const r = runValidators('verify', root, cn)
  assert(r.ok === true
    && !r.errors.some(e => e.includes('探针 7'))
    && !r.warnings.some(w => w.includes('探针 7')),
    '无 tasks/ 目录 → 矩阵门禁 no-op（严格档无段也不报）')
}

// 2.5 有 tasks/ + 无段 + 严格档 → ERROR（真实 IR_STRICT_SINCE 常量构造 created_at）
{
  const { root, cn } = makeChange('gate-strict-missing', {
    strict: true, withTasks: true,
    verifyMd: verifyDoc(['正文无矩阵段']),
  })
  const r = runValidators('verify', root, cn)
  const err = r.errors.find(e => e.includes('探针 7 矩阵段缺失'))
  assert(r.ok === false && !!err, '有 TaskCard 且严格档无段 → ERROR 阻断')
  assert(err && err.includes(String(IR_STRICT_SINCE)) && err.includes('--init'),
    `错误文案含 IR_STRICT_SINCE（${IR_STRICT_SINCE}）与 --init 修复指引`)
}

// 2.6 有 tasks/ + 无段 + 非严格档 → warning 不阻断
{
  const { root, cn } = makeChange('gate-legacy-missing', {
    strict: false, withTasks: true,
    verifyMd: verifyDoc(['正文无矩阵段']),
  })
  const r = runValidators('verify', root, cn)
  assert(r.ok === true && r.warnings.some(w => w.includes('探针 7')),
    '非严格档（存量变更）无段 → warning 不阻断')
  assert(!r.errors.some(e => e.includes('探针 7')), '非严格档无段不产 error')
}

// 2.7 verify-result.md 未落盘（verify 中间步骤）→ no-op
{
  const { root, cn } = makeChange('gate-nomd', { strict: true, withTasks: true, verifyMd: null })
  const r = runValidators('verify', root, cn)
  assert(!r.errors.some(e => e.includes('探针 7')) && !r.warnings.some(w => w.includes('探针 7')),
    'verify-result.md 未落盘 → 矩阵门禁 no-op（存在性归引擎 manifest，不提前拦中间步骤）')
}

// 2.8 注册面：contracts.verify.validators 含四个 validator（getContract 消费方可见；task-02 注册
// validatePassEligibility；2026-09-17-api-coverage-smoke task-05 注册 validateApiCoverageMatrix）
{
  const { getContract } = await import('../src/stage-contract.js')
  const c = getContract('verify')
  assert(c && Array.isArray(c.validators) && c.validators.length === 4,
    `verify validator 链注册为 4（validateVerifyOutputs + validateAcceptanceMatrix + validatePassEligibility + validateApiCoverageMatrix，实际 ${c && c.validators.length}）`)
}

// 2.9 partial/uncovered 联动（task-03 / D-003 / FR-04）：partial 行 + facts.handover 零有效行 → error。
// 结论取 PASS WITH NOTES 隔离 task-02 封顶校验（其只管 PASS），本分支不依赖结论独立生效。
{
  const { root, cn } = makeChange('gate-partial-nohandover', {
    verifyMd: verifyDoc([
      MATRIX_HEAD,
      '| 部分承接 | `test/x.test.mjs` | — | partial | 断言见 src/feature.js:42 |',
    ], 'PASS WITH NOTES'),
    facts: { schemaVersion: 2, integrationRan: 'ran', dbScriptDeclarations: [], runtimeEndpointExcluded: false, matrixPartialRows: 1 },
  })
  const r = runValidators('verify', root, cn)
  const err = r.errors.find(e => e.includes('部分实现必须有移交去向'))
  assert(r.ok === false && !!err, '矩阵含 partial 行且 facts.handover 零有效行 → 阻断（部分实现必须有移交去向）')
  assert(err && err.includes('task-01') && err.includes(clip40('部分承接')) && err.includes('## 移交项（结构化）'),
    '联动 error 文案点名触发行（task+acceptance 40 字截断）与「## 移交项（结构化）」修复指引')
}

// 2.10 partial 行 + facts.handover 有 advisory 有效行 → 联动分支放行（封顶与否归 blocking 行判定，④与②分工）
{
  const { root, cn } = makeChange('gate-partial-handover', {
    verifyMd: verifyDoc([
      MATRIX_HEAD,
      '| 部分承接 | `test/x.test.mjs` | — | partial | 断言见 src/feature.js:42 |',
    ], 'PASS WITH NOTES'),
    facts: {
      schemaVersion: 2,
      integrationRan: 'ran',
      handover: { count: 1, items: [{ type: 'env-blocked', item: '边界用例环境阻断', condition: '环境恢复后复跑 test/x.test.mjs', severity: 'advisory' }] },
      dbScriptDeclarations: [],
      runtimeEndpointExcluded: false,
      matrixPartialRows: 1,
    },
  })
  const r = runValidators('verify', root, cn)
  assert(r.ok === true && !r.errors.some(e => e.includes('部分实现必须有移交去向')),
    '矩阵含 partial 行且 facts.handover 有 advisory 有效行 → 联动分支放行（有去向的部分实现不误伤）')
}

// 2.11 uncovered 行 + 严格档无 verify-facts.json（factsExpected=true 而 facts 缺失）→ fail-closed
// 按零有效行拦下，文案含「重跑 verify-probes」出路
{
  const { root, cn } = makeChange('gate-uncovered-nofacts', {
    verifyMd: verifyDoc([
      MATRIX_HEAD,
      '| 未承接声明 | 无归属测试 | — | uncovered | — |',
    ], 'PASS WITH NOTES'),
  })
  const r = runValidators('verify', root, cn)
  const err = r.errors.find(e => e.includes('部分实现必须有移交去向'))
  assert(r.ok === false && !!err && err.includes('重跑 verify-probes') && err.includes(clip40('未承接声明')),
    '矩阵含 uncovered 行且 factsExpected=true 而 verify-facts.json 缺失 → fail-closed 拦下（uncovered 同理 + 重跑 verify-probes 出路）')
}

// 2.12 存量口径：非严格档（factsExpected=false）partial 行 + 无 facts → 联动分支空转零行为变化
{
  const { root, cn } = makeChange('gate-legacy-partial', {
    strict: false,
    verifyMd: verifyDoc([
      MATRIX_HEAD,
      '| 部分承接 | `test/x.test.mjs` | — | partial | 断言见 src/feature.js:42 |',
    ], 'PASS WITH NOTES'),
  })
  const r = runValidators('verify', root, cn)
  assert(r.ok === true && !r.errors.some(e => e.includes('部分实现必须有移交去向')),
    '存量变更（非严格档、未跑管线）partial 行 → 联动分支零行为变化（fail-open 不打爆存量）')
}

// 2.13 逐行关联 advisory（R-05 第一版/D-003）：行标识命中 handover 条目文本 → 不告警；
// 未命中 → console.warn advisory（不阻断、不进 errors）。spy console.warn 验证。
{
  const warns = []
  const origWarn = console.warn
  console.warn = (...a) => { warns.push(a.join(' ')) }
  let r
  try {
    const { root, cn } = makeChange('gate-advisory-link', {
      verifyMd: verifyDoc([
        MATRIX_HEAD,
        '| 边界用例承接 | `test/x.test.mjs` | — | partial | 断言见 src/feature.js:42 |',
        '**task-02**',
        '| 日志脱敏复跑 | `test/y.test.mjs` | — | partial | 断言见 src/feature.js:43 |',
      ], 'PASS WITH NOTES'),
      facts: {
        schemaVersion: 2,
        integrationRan: 'ran',
        handover: { count: 1, items: [{ type: 'env-blocked', item: '边界用例承接 环境阻断', condition: '环境恢复后复跑 test/x.test.mjs', severity: 'advisory' }] },
        dbScriptDeclarations: [],
        runtimeEndpointExcluded: false,
        matrixPartialRows: 2,
      },
    })
    r = runValidators('verify', root, cn)
  } finally {
    console.warn = origWarn
  }
  assert(r.ok === true && r.errors.length === 0
    && warns.some(w => w.includes('日志脱敏复跑') && w.includes('advisory')),
    '未命中行 → console.warn advisory 且不阻断不进 errors（整链 ok=true）')
  assert(!warns.some(w => w.includes('边界用例承接'))
    && warns.filter(w => w.includes('移交去向未在 handover 条目中命中')).length === 1,
    '命中行（acceptance 文本进 handover 条目）不告警——仅未命中行一条 advisory')
}

for (const t of tmpRoots) { try { rmSync(t, { recursive: true, force: true }) } catch { /* 清理尽力 */ } }

console.log(`\n合计: ${passed} 通过, ${failed} 失败`)
process.exit(failed > 0 ? 1 : 0)
