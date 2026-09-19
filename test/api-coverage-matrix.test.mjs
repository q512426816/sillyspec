/**
 * 接口验证覆盖矩阵测试（2026-09-17-api-coverage-smoke task-07 / FR-04~FR-06 / D-005~D-007 / D-009）。
 *
 * 覆盖面（解析层 extractApiCoverageMatrixSlots / 判定层 judgeApiCoverageMatrix 纯函数 + 
 * producer parseDesignApiTable / classifyConsumerHints / ensureApiCoverageMatrixSection）：
 *   1. design 接口段 tolerant 解析五形态：规范表 / 缺方法列·缺路径列（双条件缺一不可）/
 *      {id} 模板路径 / 段头过滤（非接口段示例行不计）/ 声明行提取（夹具为真实 design.md 形态）
 *   2. 矩阵 MD 槽行分类：消费端子行（↳ 两空格缩进）只计数不进行账 / unfilled 占位 /
 *      探索行（uncovered+[探索]）标记
 *   3. covered 记账：分子只认判定=covered（partial/uncovered 不计）；non-testable 理由
 *      非空从分母扣除、理由空违规；子行/探索行不计分母分子
 *   4. 移交联动：partial/uncovered 端点行 × facts.handover 零有效行 → error，有移交放行
 *   5. 锚点：design接口表# 解析级（空指打回）；其余四形态（权限矩阵[]/契约表@/DDL@/载荷@）存在即认
 *   6. 声明降级（D-005）：解析零行按声明数对账；并存以解析为准注记；critical×零接口面 error；
 *      critical×声明 0 端点 warning；段缺失分层（严格档/critical error、apiFace 缺席 warning）；
 *      factsExpected=false 存量零行为
 *   7. advisory 两 warning（不阻断）：消费端归类在场而矩阵零子行；写端点未在权限矩阵声明
 *      （「无权限约束」豁免 / 权限段命中放行）
 *   8. covered-service 第五枚举（2026-09-19-api-matrix-service-coverage FR-01/FR-02）：
 *      计分子放行（等式满足 ok=true）/ 缺测试锚点 error（matrixEvidenceHasAnchor 三形态口径）/
 *      advisory 承接计数（N 与 fixture 行数对照）/ probe7 验收矩阵联动不误报 + backfill 后
 *      facts.matrixPartialRows=0（封顶条件④不触发的结构性证据）
 *
 * 确定性纪律：mkdtempSync 临时目录 + test.after 清理；纯函数直测（零 IO 面全部经参数传入），
 * 矩阵面一律经 extractApiCoverageMatrixSlots 真实解析构造（钉 X-05 防篡改锚点口径）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import {
  parseDesignApiTable, classifyConsumerHints, ensureApiCoverageMatrixSection,
  backfillFactsFromMdAndTests,
} from '../src/verify-probes.js'
import { extractApiCoverageMatrixSlots, extractAcceptanceMatrixSlots, judgeApiCoverageMatrix } from '../src/stage-contract.js'

const tmpRoots = []
function mk(prefix) { const d = mkdtempSync(join(tmpdir(), prefix)); tmpRoots.push(d); return d }
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

// ═══════════════════════════════════════════════════════════════════
// 夹具构造（真实 design.md / verify-result.md 形态片段）
// ═══════════════════════════════════════════════════════════════════

/** design.md 接口段夹具：规范表 + 缺列双条件行 + 非接口段示例行 + 声明行 */
const DESIGN_MD = [
  '---', 'author: t', 'created_at: 2026-09-17 10:00:00', '---',
  '# 订单导出设计', '',
  '## 接口设计', '',
  '| 方法 | 路径 | 说明 |',
  '|---|---|---|',
  '| GET | /api/orders | 订单列表（?status 过滤） |',
  '| POST | /api/orders | 创建订单 |',
  '| DELETE | /api/orders/{id} | 删除订单（模板路径） |',
  '| /api/orders | 缺方法列行（双条件缺一不认） |',
  '| GET | 查询订单说明行（无路径样式 token） |',
  '',
  '## 非目标', '',
  '| 方法 | 路径 | 说明 |',
  '|---|---|---|',
  '| GET | /internal/diag | 非目标段示例行（不属本变更接口面） |',
  '',
  '## 先例引用', '',
  '旧版示例：`GET /legacy/orders` 仅作对照，不在本变更接口面。',
  '',
  '本变更接口面：3 端点',
].join('\n')

/** 矩阵段 md 构造（行 = [端点, 判定, 用例ID, 结果, 证据]；opts.declaredRow 声明占位行；opts.note 无表注记行） */
function matrixMd(rows, opts = {}) {
  const lines = ['## 接口验证覆盖矩阵 [层：人工判断——CLI 预填复核]', '']
  if (opts.note) { lines.push(opts.note, '') }
  if (rows.length > 0 || opts.declaredRow) {
    lines.push('| 端点 | 判定 | 用例依据 ID | 结果 | 证据 |', '|---|---|---|---|---|')
    for (const r of rows) lines.push(`| ${r[0]} | ${r[1]} | ${r[2] || ''} | ${r[3] || ''} | ${r[4] || ''} |`)
    if (opts.declaredRow) {
      lines.push(`| 本变更接口面：${opts.declaredRow.n} 端点（agent 声明） | ${opts.declaredRow.verdict} | ${opts.declaredRow.caseId || ''} | ${opts.declaredRow.result || ''} | ${opts.declaredRow.evidence || ''} |`)
    }
  }
  lines.push('', '## 后续章节', '')
  return lines.join('\n')
}

const EP = (method, path, rowIdx = 1) => ({ method, path, rowIdx })
const FACE = (endpoints, declared = null, writeEndpoints = []) => ({ endpoints, declared, writeEndpoints })
const HANDOVER_FACTS = () => ({
  handover: { count: 1, items: [{ type: 'env-blocked', item: '冒烟环境阻断', condition: '恢复后复跑', severity: 'advisory' }] },
})
const NO_HANDOVER_FACTS = () => ({ handover: { count: 0, items: [] } })

/** 判定层组装（矩阵面一律经真实解析构造，钉 X-05 锚点口径） */
function judgeWith({ rows, opts, face, facts, riskLevel = 'unit-sufficient', strict = false, factsExpected = true, matrix, ...extra }) {
  return judgeApiCoverageMatrix({
    matrix: matrix || extractApiCoverageMatrixSlots(matrixMd(rows || [], opts)),
    apiFace: face, facts: facts === undefined ? NO_HANDOVER_FACTS() : facts,
    factsExpected, riskLevel, strict, changeName: 'acm-x', ...extra,
  })
}

// ═══════════════════════════════════════════════════════════════════
// 1. design 接口段 tolerant 解析（producer 层）
// ═══════════════════════════════════════════════════════════════════
test('1. parseDesignApiTable 五形态：规范表/{id} 模板认；缺方法列·缺路径列双条件缺一不认；非接口段示例行不计；声明行提取', () => {
  const face = parseDesignApiTable(DESIGN_MD)
  assert.deepEqual(face.endpoints, [
    { method: 'GET', path: '/api/orders', rowIdx: 1 },
    { method: 'POST', path: '/api/orders', rowIdx: 2 },
    { method: 'DELETE', path: '/api/orders/{id}', rowIdx: 3 },
  ], '端点 = 方法×路径双条件命中：缺方法列/缺路径行不计；{id} 模板路径整段认；?query 尾自然截断；非目标/先例引用段（段头不含接口关键词）示例行不计')
  assert.equal(face.declared, 3, '「本变更接口面：3 端点」声明行提取 declared=3（全文首个命中；对照无接口段无声明 → 空面，判定层走零接口面分层）')
})

// ═══════════════════════════════════════════════════════════════════
// 2. 矩阵 MD 槽行分类（extractApiCoverageMatrixSlots）
// ═══════════════════════════════════════════════════════════════════
test('2. 行分类：消费端子行只计数不进行账；unfilled 占位标记；探索行（uncovered+[探索]）标记', () => {
  const ex = extractApiCoverageMatrixSlots([
    '## 接口验证覆盖矩阵 [层：人工判断——CLI 预填复核]', '',
    '| 端点 | 判定 | 用例依据 ID | 结果 | 证据 |',
    '|---|---|---|---|---|',
    '| GET /api/a | <待填：五选一> | <待填：用例 ID> | <待填> | <待填：锚点> |',
    '| POST /api/b | uncovered | E1 | 探索走查 | 步骤 [探索] 手工核对 |',
    '  ↳ web: 列表页承接（消费端子行）', '',
    '## 后续章节', '',
  ].join('\n'))
  assert.deepEqual(
    {
      present: ex.present, subRowCount: ex.subRowCount, rowsCount: ex.rows.length,
      unfilled: ex.rows.filter((r) => r.unfilled).length,
      exploration: ex.rows.filter((r) => r.exploration).length,
    },
    { present: true, subRowCount: 1, rowsCount: 2, unfilled: 1, exploration: 1 },
    '子行（两空格缩进 ↳）只计数不进行账；判定占位行 unfilled；uncovered+证据/结果含 [探索] 标记探索行')
})

// ═══════════════════════════════════════════════════════════════════
// 3. covered 记账与移交联动（判定层核心）
// ═══════════════════════════════════════════════════════════════════
const TWO_FACE = () => FACE([EP('GET', '/api/a', 1), EP('POST', '/api/b', 2)])
const BOTH_COVERED_ROWS = () => ([
  ['GET /api/a', 'covered', 'C1', 'ok', 'design接口表#GET /api/a'],
  ['POST /api/b', 'covered', 'C2', 'ok', 'design接口表#POST /api/b'],
])

test('3. 两端点全 covered + 锚点命中解析面 → ok 零 errors 零 warnings', () => {
  const r = judgeWith({ rows: BOTH_COVERED_ROWS(), face: TWO_FACE(), facts: NO_HANDOVER_FACTS() })
  assert.deepEqual({ ok: r.ok, errors: r.errors, warnings: r.warnings }, { ok: true, errors: [], warnings: [] },
    '全 covered + design接口表# 锚点命中解析集 → 分子=分母放行')
})

test('3b. partial 不计分子：分子只认 covered（1<2 覆盖不足 error 列缺覆盖端点）；有移交不另报', () => {
  const rows = [
    ['GET /api/a', 'covered', 'C1', 'ok', 'design接口表#GET /api/a'],
    ['POST /api/b', 'partial', 'C2', '部分', 'design接口表#POST /api/b'],
  ]
  const r = judgeWith({ rows, face: TWO_FACE(), facts: HANDOVER_FACTS() })
  assert.ok(r.ok === false && r.errors.length === 1
    && r.errors[0].includes('有效分母 2') && r.errors[0].includes('covered+covered-service 分子 1') && r.errors[0].includes('POST /api/b'),
    `partial 行不计分子 → 覆盖不足 error 报分母/分子与缺覆盖端点（实际 ${JSON.stringify(r.errors.map((e) => e.slice(0, 80)))}）`)
})

test('3c. 移交联动：partial/uncovered 端点行 × facts.handover 零有效行 → error；有移交放行（该面不另报）', () => {
  const rows = [
    ['GET /api/a', 'covered', 'C1', 'ok', 'design接口表#GET /api/a'],
    ['POST /api/b', 'partial', 'C2', '部分', 'design接口表#POST /api/b'],
  ]
  const r = judgeWith({ rows, face: TWO_FACE(), facts: NO_HANDOVER_FACTS() })
  assert.ok(r.errors.some((e) => e.includes('移交去向') && e.includes('零有效行') && e.includes('POST /api/b')),
    `partial 端点行无移交去向 → error「接口未验证端点必须有移交去向」（实际 ${JSON.stringify(r.errors.map((e) => e.slice(0, 60)))}）`)
})

test('3d. non-testable：理由非空从分母扣除（1/1 放行）；理由空 → 缺理由违规', () => {
  const okR = judgeWith({
    rows: [
      ['GET /api/a', 'covered', 'C1', 'ok', 'design接口表#GET /api/a'],
      ['POST /api/b', 'non-testable', '-', '不适用', '只读代理转发不落本库（人工核对）'],
    ],
    face: TWO_FACE(), facts: NO_HANDOVER_FACTS(),
  })
  assert.ok(okR.ok === true && okR.errors.length === 0,
    `non-testable 理由非空 → 从有效分母扣除（N=2−1=1，分子 1）放行（实际 ${JSON.stringify(okR.errors)}）`)
  const badR = judgeWith({
    rows: [
      ['GET /api/a', 'covered', 'C1', 'ok', 'design接口表#GET /api/a'],
      ['POST /api/b', 'non-testable', '-', '不适用', ''],
    ],
    face: TWO_FACE(), facts: NO_HANDOVER_FACTS(),
  })
  assert.ok(badR.errors.some((e) => e.includes('non-testable 缺理由')),
    `non-testable 理由空 → 违规（non-testable 证据须写一句理由）（实际 ${JSON.stringify(badR.errors.map((e) => e.slice(0, 60)))}）`)
})

test('3e. 探索行不算覆盖：uncovered+[探索] 端点仍进缺覆盖清单（探索性验证不计分子）', () => {
  const r = judgeWith({
    rows: [['GET /api/a', 'uncovered', 'E1', '探索走查', '步骤 [探索] 手工核对']],
    face: FACE([EP('GET', '/api/a', 1)]), facts: HANDOVER_FACTS(),
  })
  assert.ok(r.ok === false && r.errors.some((e) => e.includes('覆盖不足') && e.includes('GET /api/a')),
    `探索行不进分子不进 non-testable 扣减 → 缺覆盖端点照列（实际 ${JSON.stringify(r.errors.map((e) => e.slice(0, 60)))}）`)
})

test('3f. 判定未填占位 → 行级违规（五选一）', () => {
  const r = judgeWith({
    rows: [['GET /api/a', '<待填：五选一>', '<待填：用例 ID>', '<待填>', '<待填：锚点>']],
    face: FACE([EP('GET', '/api/a', 1)]), facts: NO_HANDOVER_FACTS(),
  })
  assert.ok(r.errors.some((e) => e.includes('判定未填') && e.includes('五选一')),
    `判定槽占位未替换 → 行级违规（实际 ${JSON.stringify(r.errors.map((e) => e.slice(0, 60)))}）`)
})

// ═══════════════════════════════════════════════════════════════════
// 4. 证据锚点五形态（design §4 Grill #10）
// ═══════════════════════════════════════════════════════════════════
test('4. design接口表# 锚点解析级：端点不在解析面 → 空指打回', () => {
  const r = judgeWith({
    rows: [['GET /api/a', 'covered', 'C1', 'ok', 'design接口表#GET /ghost']],
    face: FACE([EP('GET', '/api/a', 1)]), facts: NO_HANDOVER_FACTS(),
  })
  assert.ok(r.ok === false && r.errors.some((e) => e.includes('空指') && e.includes('GET /ghost')),
    `design接口表# 锚点指向解析面外端点 → 空指打回（防编造端点）（实际 ${JSON.stringify(r.errors.map((e) => e.slice(0, 70)))}）`)
})

test('4b. 其余四形态存在即认：权限矩阵[]/契约表@/DDL@/载荷@', () => {
  const forms = ['权限矩阵[admin×delete]', '契约表@订单创建行', 'DDL@created_at', '载荷@/order/create']
  const results = forms.map((evidence) => judgeWith({
    rows: [['GET /api/a', 'covered', 'C1', 'ok', evidence]],
    face: FACE([EP('GET', '/api/a', 1)]), facts: NO_HANDOVER_FACTS(),
  }))
  assert.ok(results.every((r) => r.ok === true && r.errors.length === 0),
    `四形态级锚点存在即认（形态级不空指——存在性口径）（实际 ${results.map((r, i) => `${forms[i]}→${r.ok}`).join(' / ')}）`)
})

// ═══════════════════════════════════════════════════════════════════
// 5. 声明降级 / 零接口面分层 / 段缺失分层（D-005）
// ═══════════════════════════════════════════════════════════════════
test('5. 声明降级：解析零行按声明数对账（N=2 分子 2 放行）；并存以解析为准注记 warning', () => {
  const declaredOnly = judgeWith({
    rows: [
      ['GET /api/a', 'covered', 'C1', 'ok', '权限矩阵[admin×read]'],
      ['POST /api/b', 'covered', 'C2', 'ok', '契约表@订单创建行'],
    ],
    face: FACE([], 2), facts: NO_HANDOVER_FACTS(),
  })
  assert.ok(declaredOnly.ok === true && declaredOnly.errors.length === 0,
    `解析零行 × 声明 2 → 按声明行拆出的每端点行 covered（N=2 分子 2）放行（实际 ${JSON.stringify(declaredOnly.errors)}）`)
  const both = judgeWith({
    rows: [['GET /api/a', 'covered', 'C1', 'ok', 'design接口表#GET /api/a']],
    face: FACE([EP('GET', '/api/a', 1)], 2), facts: NO_HANDOVER_FACTS(),
  })
  assert.ok(both.ok === true && both.warnings.some((w) => w.includes('声明与解析并存（声明 2 端点 / 解析 1 端点）') && w.includes('以解析为准')),
    `声明与解析并存 → 以解析为准 + 漂移信号注记 warning（实际 ${JSON.stringify(both.warnings)}）`)
})

test('5b. critical×零接口面 → error（接口面不可静默为零）；critical×声明 0 端点 → warning 复核', () => {
  const zeroFace = judgeWith({
    matrix: extractApiCoverageMatrixSlots(matrixMd([], { note: '- 无接口面（design 接口段解析零端点且无「本变更接口面：N 端点」声明行）——注记行' })),
    face: null, facts: NO_HANDOVER_FACTS(), riskLevel: 'integration-critical',
  })
  const declaredZero = judgeWith({
    rows: [['GET /api/a', 'covered', 'C1', 'ok', '权限矩阵[admin×read]']],
    face: FACE([], 0), facts: NO_HANDOVER_FACTS(), riskLevel: 'integration-critical',
  })
  assert.ok(zeroFace.errors.some((e) => e.includes('接口面不可静默为零'))
    && declaredZero.warnings.some((w) => w.includes('声明接口面为 0 端点')) && declaredZero.ok === true,
    `判级 critical：零面 error（D-005/FR-04）/ 显式零声明 warning 复核（故障面条款）（实际 zero=${JSON.stringify(zeroFace.errors.map((e) => e.slice(0, 50)))} zero-warn=${JSON.stringify(declaredZero.warnings.map((w) => w.slice(0, 50)))}）`)
})

test('5c. 段缺失分层：apiFace 在场×严格档 error / ×critical error / apiFace 缺席 warning；factsExpected=false 零行为', () => {
  const absent = { present: false, rows: [], subRowCount: 0, declaredRow: null }
  const strictR = judgeWith({ matrix: absent, face: FACE([]), facts: NO_HANDOVER_FACTS(), strict: true })
  const criticalR = judgeWith({ matrix: absent, face: FACE([]), facts: NO_HANDOVER_FACTS(), riskLevel: 'integration-critical' })
  const legacyR = judgeWith({ matrix: absent, face: null, facts: NO_HANDOVER_FACTS() })
  assert.ok(strictR.errors.some((e) => e.includes('段缺失') && e.includes('严格档'))
    && criticalR.errors.some((e) => e.includes('段缺失') && e.includes('判级'))
    && legacyR.warnings.some((w) => w.includes('facts.apiFace 缺席')),
    `段缺失分层：新管线（apiFace 在场）删段 → 严格档/critical error；apiFace 缺席（特性前存量底稿）→ warning 引导 --init（实际 strict=${JSON.stringify(strictR.errors.length)} critical=${JSON.stringify(criticalR.errors.length)} legacy=${JSON.stringify(legacyR.warnings.length)}）`)
  assert.deepEqual(judgeApiCoverageMatrix({ factsExpected: false }),
    { ok: true, errors: [], warnings: [] },
    'factsExpected=false（存量未跑管线）→ 兼容零行为不误伤')
})

// ═══════════════════════════════════════════════════════════════════
// 6. advisory 两 warning（D-006/D-007，不阻断不进 errors）
// ═══════════════════════════════════════════════════════════════════
test('6. 消费端归类在场而矩阵零子行 → advisory warning 列端点（D-006）', () => {
  const r = judgeWith({
    rows: BOTH_COVERED_ROWS(), face: TWO_FACE(), facts: NO_HANDOVER_FACTS(),
    consumerHints: { web: ['src/routes/list.js'] },
  })
  assert.ok(r.ok === true && r.warnings.some((w) => w.includes('[advisory] 消费端归类在场') && w.includes('web') && w.includes('零消费端子行')),
    `consumerHints 有归类而矩阵零子行 → warning 建议补「↳ <消费端>:」子行（不阻断）（实际 ${JSON.stringify(r.warnings)}）`)
})

test('6b. 写端点未在权限矩阵声明 → advisory warning；权限段命中 /「无权限约束」豁免 → 不告', () => {
  const rows = [['POST /api/things', 'covered', 'C1', 'ok', 'design接口表#POST /api/things']]
  const face = FACE([EP('POST', '/api/things', 1)], null, [EP('POST', '/api/things', 1)])
  const missing = judgeWith({
    rows, face, facts: NO_HANDOVER_FACTS(),
    permSectionText: '| 角色 | 动作 |\n|---|---|\n| admin | 全部操作 |',
  })
  assert.ok(missing.warnings.some((w) => w.includes('写端点 POST /api/things 未在权限矩阵声明')),
    `写端点（POST/PUT/DELETE/PATCH）不在权限矩阵段 → advisory warning（表缺行会让派生框架继承你的洞）（实际 ${JSON.stringify(missing.warnings)}）`)
  const permHit = judgeWith({
    rows, face, facts: NO_HANDOVER_FACTS(),
    permSectionText: '| 角色 | 动作 | 端点 |\n|---|---|---|\n| admin | 写 | /api/things |',
  })
  const exempt = judgeWith({
    rows, face, facts: NO_HANDOVER_FACTS(),
    permSectionText: '| 角色 | 动作 |\n|---|---|\n| admin | 全部操作 |',
    designText: 'POST /api/things 无权限约束（公开健康检查端点）',
  })
  assert.ok(!permHit.warnings.some((w) => w.includes('写端点')) && !exempt.warnings.some((w) => w.includes('写端点')),
    `权限矩阵段命中路径 / 行级「无权限约束」显式豁免 → 均不告（实际 hit=${JSON.stringify(permHit.warnings.length)} exempt=${JSON.stringify(exempt.warnings.length)}）`)
})

// ═══════════════════════════════════════════════════════════════════
// 7. 消费端归类启发式与补段（producer 层）
// ═══════════════════════════════════════════════════════════════════
test('7. classifyConsumerHints：路径段归类 web/mp/script；NEW: 前缀剥除；文件名子串不误命中', () => {
  assert.deepEqual(
    classifyConsumerHints(['src/routes/a.js', 'NEW: src/pages/b.js', 'mp/pages/index.js', 'scripts/gen.js', 'docs/x.md', 'homepages.js']),
    { web: ['src/routes/a.js', 'src/pages/b.js'], mp: ['mp/pages/index.js'], script: ['scripts/gen.js'] },
    '段级归类（routes/pages/model→web、mp/miniapp→mp 先于 web、scripts/test→script）；NEW: 前缀剥除；homepages.js 文件名不含 pages 段；docs 不归类')
})

test('7b. ensureApiCoverageMatrixSection 补段：预填端点行 + 幂等二跑零改动', () => {
  const dir = mk('acm-ens-')
  const mdPath = join(dir, 'verify-result.md')
  writeFileSync(mdPath, '# 验证报告\n\n## 探针结果\n\n无\n')
  const face = FACE([EP('GET', '/api/a', 1)])
  const r1 = ensureApiCoverageMatrixSection(mdPath, face)
  const r2 = ensureApiCoverageMatrixSection(mdPath, face)
  const md = readFileSync(mdPath, 'utf8')
  assert.ok(r1.added === true && r2.added === false && String(r2.reason || '').includes('已在场')
    && md.includes('## 接口验证覆盖矩阵') && md.includes('| GET /api/a | <待填：五选一> |'),
    `缺段 → 补骨架段（端点行 CLI 机械预填 <待填：五选一> 供 agent 逐格复核）；段已在场幂等不触碰（实际 ${JSON.stringify(r1)}/${JSON.stringify(r2)}）`)
})

// ═══════════════════════════════════════════════════════════════════
// 8. covered-service 第五枚举（2026-09-19-api-matrix-service-coverage FR-01/FR-02/D-001/D-002）
//    ⑤ 向后兼容回归 = 纯四枚举文档行为不变由既有用例 1-7 锁定 + npm test 全量收口（不另造用例）
// ═══════════════════════════════════════════════════════════════════
test('8. covered-service 计分子放行（①）：两端点全 covered-service（.test. 与 file:line 两锚点形态）→ 等式满足 ok=true 零 errors', () => {
  const r = judgeWith({
    rows: [
      ['GET /api/a', 'covered-service', 'S1', 'ok', 'test/order-service.test.mjs 承接 GET 行为'],
      ['POST /api/b', 'covered-service', 'S2', 'ok', 'test/order-service.test.mjs:42'],
    ],
    face: TWO_FACE(), facts: NO_HANDOVER_FACTS(),
  })
  assert.ok(r.ok === true && r.errors.length === 0,
    `covered-service 行计入分子（covered+covered-service 分子 2 == 有效分母 2 等式满足）→ 放行零 errors（实际 ${JSON.stringify(r.errors)}）`)
  const mixed = judgeWith({
    rows: [
      ['GET /api/a', 'covered', 'C1', 'ok', 'design接口表#GET /api/a'],
      ['POST /api/b', 'covered-service', 'S2', 'ok', 'test/order-service.test.mjs:42'],
    ],
    face: TWO_FACE(), facts: NO_HANDOVER_FACTS(),
  })
  assert.ok(mixed.ok === true && mixed.errors.length === 0,
    `混排变体：covered+covered-service 各一行 → 分子 2 == 分母 2 同样放行（实际 ${JSON.stringify(mixed.errors)}）`)
})

test('8b. covered-service 缺测试锚点 → error（②）：纯文字证据进 anchorViolations；covered 行缺锚行为不变对照', () => {
  const r = judgeWith({
    rows: [
      ['GET /api/a', 'covered', 'C1', 'ok', 'design接口表#GET /api/a'],
      ['POST /api/b', 'covered-service', 'S1', 'ok', '由 service 层测试锁定'],
    ],
    face: TWO_FACE(), facts: NO_HANDOVER_FACTS(),
  })
  assert.ok(r.ok === false && r.errors.length === 1
    && r.errors[0].includes('POST /api/b') && r.errors[0].includes('covered-service 证据缺测试锚点'),
    `covered-service 证据无 .test. / file:line / 反引号锚点 → error 含端点标识与 covered-service 违规文案（记账等式已满足不叠报覆盖不足）（实际 ${JSON.stringify(r.errors.map((e) => e.slice(0, 90)))}）`)
  const coveredCtl = judgeWith({
    rows: [['GET /api/a', 'covered', 'C1', 'ok', '由冒烟步骤手工核对']],
    face: TWO_FACE(), facts: NO_HANDOVER_FACTS(),
  })
  assert.ok(coveredCtl.ok === false
    && coveredCtl.errors.some((e) => e.includes('GET /api/a') && e.includes('证据缺用例依据锚点（五形态之一）'))
    && !coveredCtl.errors.some((e) => e.includes('covered-service 证据缺测试锚点')),
    `对照：covered 行缺锚仍走五形态违规文案（行为不变），不误走 covered-service 测试锚点分支（实际 ${JSON.stringify(coveredCtl.errors.map((e) => e.slice(0, 70)))}）`)
})

test('8c. covered-service advisory 承接计数（③）：N=2 → warnings 含 [advisory] 与计数文案；零 covered-service 文档不出', () => {
  const r = judgeWith({
    rows: [
      ['GET /api/a', 'covered-service', 'S1', 'ok', 'test/order-service.test.mjs 承接 GET 行为'],
      ['POST /api/b', 'covered-service', 'S2', 'ok', 'test/order-service.test.mjs:42'],
    ],
    face: TWO_FACE(), facts: NO_HANDOVER_FACTS(),
  })
  assert.ok(r.ok === true && r.warnings.some((w) => w.includes('[advisory]') && w.includes('2 端点由 service 层测试承接') && w.includes('不阻断')),
    `N=2 行 covered-service → advisory warning 计数与 fixture 行数一致（不阻断不进 errors）（实际 ${JSON.stringify(r.warnings)}）`)
  const ctl = judgeWith({ rows: BOTH_COVERED_ROWS(), face: TWO_FACE(), facts: NO_HANDOVER_FACTS() })
  assert.ok(ctl.ok === true && !ctl.warnings.some((w) => w.includes('service 层测试承接')),
    `对照：零 covered-service 行（BOTH_COVERED_ROWS）不出承接 advisory（实际 ${JSON.stringify(ctl.warnings)}）`)
})

test('8d. probe7 验收矩阵联动不误报（④/FR-02/D-002）：covered-service 行 unfilled=0/missingEvidence=0；backfill 后 facts.matrixPartialRows=0', () => {
  const md = [
    '# 验证报告', '',
    '#### 探针 7：验收×测试覆盖矩阵', '',
    '**task-01**',
    '| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |',
    '|---|---|---|---|---|',
    '| 端点行为由 service 层测试锁定 | `test/order-service.test.mjs` | — | covered-service | `test/order-service.test.mjs:42` |',
    '',
    '## 结论', '', '结论枚举：`PASS WITH NOTES`', '',
  ].join('\n')
  const slots = extractAcceptanceMatrixSlots(md)
  assert.ok(slots.present && slots.unfilled === 0 && slots.missingEvidence === 0,
    `covered-service 认合法枚举（白名单）且证据含测试锚点 → unfilled/missingEvidence 两计数零不误报（实际 ${JSON.stringify({ present: slots.present, unfilled: slots.unfilled, missingEvidence: slots.missingEvidence })}）`)
  assert.ok(slots.rows.length === 1 && slots.rows[0].verdict === 'covered-service',
    `covered-service 行提取在账（实际 ${JSON.stringify(slots.rows.map((x) => x.verdict))}）`)
  // backfill 半边（封顶结构性证据）：facts.matrixPartialRows 只数 partial/uncovered 行——
  // covered-service 行不计 → 0（PASS 封顶条件④不触发）；tmp 目录无 design.md 走空面 fail-soft 不炸
  const dir = mk('acm-csv-')
  const factsPath = join(dir, 'verify-facts.json')
  writeFileSync(factsPath, JSON.stringify({ schemaVersion: 2, probes: {} }, null, 2))
  const capWarn = console.warn
  const warns = []
  console.warn = (...a) => { warns.push(a.join(' ')) }
  try {
    backfillFactsFromMdAndTests(factsPath, { verifyMd: md, conclusion: 'PASS WITH NOTES' })
    const onDisk = JSON.parse(readFileSync(factsPath, 'utf8'))
    assert.ok(onDisk.matrixPartialRows === 0,
      `backfill 后 facts.matrixPartialRows=0（covered-service 不落 partial/uncovered 计数——封顶条件④不触发的结构性证据）（实际 ${onDisk.matrixPartialRows}）`)
  } finally { console.warn = capWarn }
})
