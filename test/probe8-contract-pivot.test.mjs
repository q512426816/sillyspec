/**
 * 探针 8 契约维度支点测试（2026-09-16 task-03，配套 task-01 的 parseDesignContracts /
 * runProbe8PayloadParity 契约扩展键）：design.md 契约面（接口定义章节字段表）× 前端载荷键
 * 第四面对账的五用例锁定——
 *   1. 契约外键命中：fe 键 ∉ 契约字段 ∪ 后端面 → contractOrphans（sourceShdId↔safelyHiddenId
 *      错位族，EHS 实证形态）；既有 mispairs/feOnly 面照常产出（契约维度零影响）
 *   2. 必填漏发命中：契约行「必填」+ 接口定义含 POST 行 → missingRequired；去 POST 行（纯查询
 *      契约不苛求）重跑不报
 *   3. 对齐零新告警：载荷键全 ∈ 契约字段 → 两契约数组空、contractCount≥1、既有维度照常输出
 *   4. 无契约面 skipped：design 无契约章节 → contractCount=0 + notes 注记（不误报不空段）
 *   5. 非契约表不入面：文件变更清单表（首列「操作」）/ 风险表（首列「#」）不被误当契约面
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import {
  runProbe8PayloadParity, parseDesignContracts, renderVerifyProbesReport,
} from '../src/verify-probes.js'
import {
  parseProbePrefillAnchors,
  PROBE8_CONTRACT_ORPHANS_LINE_RE, PROBE8_MISSING_REQUIRED_LINE_RE,
} from '../src/verify-postcheck.js'

const tmpRoots = []
function mk(prefix) { const d = mkdtempSync(join(tmpdir(), prefix)); tmpRoots.push(d); return d }
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

/** 标准三层 fixture：spec（design 清单）+ 主仓后端 .java + 主仓前端 .js（NEW: 待建前缀） */
function mkFixture({ prefix, javaFields = [], feKeys = [], designExtra = [] }) {
  const mainRoot = mk(prefix)
  mkdirSync(join(mainRoot, 'src', 'main', 'java', 'com', 'foo'), { recursive: true })
  writeFileSync(join(mainRoot, 'src', 'main', 'java', 'com', 'foo', 'RpOrder.java'), [
    'public class RpOrder {',
    ...javaFields.map(f => `  private String ${f};`),
    '}',
  ].join('\n'))
  mkdirSync(join(mainRoot, 'src', 'services'), { recursive: true })
  if (feKeys.length > 0) {
    // JSON.stringify 直传形态：请求调用 8 行窗口内只出现声明的载荷键——`{ method, body: … }`
    // 调用骨架键（method/body ∉ 契约面）不进 feKeys，契约对账断言口径干净（advisory 语义里
    // 骨架键自然落 orphan，属既有噪声，非本套件锁定对象）
    writeFileSync(join(mainRoot, 'src', 'services', 'rp.js'), [
      'export function submitOrder(form) {',
      '  return apiFetch(',
      '    "/v1/rp/order",',
      '    JSON.stringify({',
      `      ${feKeys.map(k => `${k}: form.${k}`).join(',\n      ')}`,
      '    })',
      '  )',
      '}',
    ].join('\n'))
  }
  const specBase = join(mainRoot, '.sillyspec')
  const changeDir = join(specBase, 'changes', 'p8c')
  mkdirSync(changeDir, { recursive: true })
  const rows = [
    '| 新增 | NEW:src/main/java/com/foo/RpOrder.java | 实体 |',
    ...(feKeys.length > 0 ? ['| 新增 | NEW:src/services/rp.js | service |'] : []),
  ]
  writeFileSync(join(changeDir, 'design.md'), [
    '# design', '',
    '## 文件变更清单', '',
    '| 操作 | 文件路径 | 说明 |',
    '|---|---|---|',
    ...rows, '',
    ...designExtra, '',
  ].join('\n'))
  return { mainRoot, specBase, changeName: 'p8c', designPath: join(changeDir, 'design.md') }
}

/** design「接口定义」章节（契约面载体）：可选 POST 行 + 契约字段表（表头首列「字段」） */
function contractSection({ post = false, fields = [] }) {
  return [
    '## 接口定义', '',
    ...(post ? ['POST /v1/rp/order 提报（前端 → 后端）', ''] : []),
    '| 字段 | 类型 | 说明 |',
    '|---|---|---|',
    ...fields.map(([name, desc]) => `| ${name} | String | ${desc} |`),
    '',
  ]
}

test('契约外键命中：sourceShdId ∉ 契约面 → contractOrphans；既有 mispairs/feOnly 面照常产出', () => {
  const fx = mkFixture({
    prefix: 'p8c-orph-',
    javaFields: ['safelyHiddenId', 'rpLeaderUserId', 'rpCategory'],
    feKeys: ['sourceShdId', 'leaderUserId', 'rpCategory'],
    designExtra: contractSection({
      fields: [['safelyHiddenId', '安全隐藏对象'], ['rpLeaderUserId', '责任人'], ['rpCategory', '类别']],
    }),
  })
  const r = runProbe8PayloadParity({ specBase: fx.specBase, cwd: fx.mainRoot, wtRoot: null, changeName: fx.changeName })

  assert.equal(r.applicable, true, '后端 Java 面在场 → applicable')
  assert.equal(r.contractCount, 1, `契约面=1（接口定义章节字段表，实际 ${r.contractCount}）`)
  // 契约外键：sourceShdId 契约/后端双面未见（safelyHiddenId 错位族）→ contractOrphans
  assert.ok(r.contractOrphans.some(o => o.fe === 'sourceShdId'),
    `contractOrphans 含 sourceShdId（实际 ${JSON.stringify(r.contractOrphans)}）`)
  // 零影响断言：既有三面照常产出——leaderUserId↔rpLeaderUserId 错位配对 + sourceShdId 落 feOnly
  assert.ok(r.mispairs.some(p => p.fe === 'leaderUserId' && p.be === 'rpLeaderUserId'),
    `既有错位配对面照常（实际 ${JSON.stringify(r.mispairs)}）`)
  assert.ok(r.feOnly.includes('sourceShdId'), `既有前端独有键面照常（实际 ${JSON.stringify(r.feOnly)}）`)
  assert.equal(r.missingRequired.length, 0, '契约行未标必填 → missingRequired 空（不混报）')

  // 锚点 round-trip + 形态锁定（task-02 接线件，同 verify-probes-facts 套件 D1/D2 口径）：
  // 渲染产物（真渲染行，防手写行与渲染形态漂移）→ parseProbePrefillAnchors → 锚点值=机械计数
  const rendered = renderVerifyProbesReport({
    probe1: { matches: [], globEntries: [], worktreeHits: 0, skippedFiles: [] },
    probe3: { tasks: [], note: '语义判断留 agent' },
    probe5: { summary: 'No scan root for parity check' },
    probe6: { unavailable: false, deletions: [], note: 'git diff 对账' },
    probe8: r,
  })
  const anchors = parseProbePrefillAnchors(rendered)
  assert.equal(anchors.subsections.probe8, true, '探针 8 子节在场性纳入 subsections')
  assert.equal(anchors.probe8ContractOrphans, r.contractOrphans.length,
    `渲染→解析 round-trip：契约外载荷键锚=机械计数（实际 ${anchors.probe8ContractOrphans} vs ${r.contractOrphans.length}）`)
  assert.equal(anchors.probe8MissingRequired, r.missingRequired.length, '契约必填漏发锚=机械计数（本例 0）')
  // 形态区分 + 行首锚定（负例手写行）：不认段内其它 ⚠️ 行 / 缩进行
  assert.ok(!PROBE8_CONTRACT_ORPHANS_LINE_RE.test('- ⚠️ 疑似字段错位配对（前后端名近形，人工核实一对一映射）：a ↔ b'), '不认错位配对行（形态区分）')
  assert.ok(!PROBE8_CONTRACT_ORPHANS_LINE_RE.test('  - ⚠️ 契约外载荷键 2 条（缩进行）'), '行首锚定（缩进不命中）')
  assert.ok(!PROBE8_MISSING_REQUIRED_LINE_RE.test('- ⚠️ NOT NULL 列前端未见（候选必填缺送/服务端填充）：c'), '不认 NOT NULL 行（形态区分）')

  // task-05 接线随行（2026-09-18-probe8-direct-compare）：探针 8 段尾追加 direct-compare 子段
  // （本 fixture 内部采集产全零面，此处注入非零 directCompare 钉渲染集成）——子段在场时两锚值
  // 仍=契约面机械计数（direct-compare 明细行行首字面与锚点前缀不同，防撞契约的 round-trip 侧）。
  const withDc = renderVerifyProbesReport({
    probe1: { matches: [], globEntries: [], worktreeHits: 0, skippedFiles: [] },
    probe3: { tasks: [], note: '语义判断留 agent' },
    probe5: { summary: 'No scan root for parity check' },
    probe6: { unavailable: false, deletions: [], note: 'git diff 对账' },
    probe8: {
      ...r,
      directCompare: {
        driftWarnings: [{ file: 'src/services/rp.js', line: 4, field: 'leaderUserId' }],
        missingRequiredWarnings: [{ endpoint: '/v1/rp/order', method: 'POST', field: 'reportOrgId', frontendFiles: ['src/services/rp.js'] }],
        escapeHatchCount: 1, nonJavaSkipCount: 0,
      },
    },
  })
  assert.ok(withDc.includes('- direct-compare: 漂移嫌疑 1 条 / 必填漏发嫌疑 1 条'), 'direct-compare 子段落进探针 8 段尾')
  const anchorsDc = parseProbePrefillAnchors(withDc)
  assert.equal(anchorsDc.probe8ContractOrphans, r.contractOrphans.length,
    `direct-compare 子段在场不扰契约外载荷键锚（实际 ${anchorsDc.probe8ContractOrphans} vs ${r.contractOrphans.length}）`)
  assert.equal(anchorsDc.probe8MissingRequired, r.missingRequired.length,
    `direct-compare 漏发明细行不计入契约必填漏发锚（实际 ${anchorsDc.probe8MissingRequired} vs ${r.missingRequired.length}）`)
})

test('必填漏发命中：契约「必填」+ 接口定义 POST 行 → missingRequired；去 POST 行重跑不报', () => {
  const withPost = [
    ['reportOrgId', '提报单位（必填）'],
    ['rpCategory', '类别'],
  ]
  const fx = mkFixture({
    prefix: 'p8c-miss-',
    javaFields: ['rpCategory'],
    feKeys: ['rpCategory'],
    designExtra: contractSection({ post: true, fields: withPost }),
  })
  const r1 = runProbe8PayloadParity({ specBase: fx.specBase, cwd: fx.mainRoot, wtRoot: null, changeName: fx.changeName })
  assert.equal(r1.contractCount, 1, '契约面在场')
  assert.ok(r1.missingRequired.some(x => x.field === 'reportOrgId'),
    `missingRequired 含 reportOrgId（实际 ${JSON.stringify(r1.missingRequired)}）`)

  // 同 fixture 去掉 POST 行（纯查询契约不苛求前端送全必填）→ 重跑不报
  const lines = contractSection({ post: false, fields: withPost })
  const doc = lines.join('\n')
  writeFileSync(fx.designPath, [
    '# design', '',
    '## 文件变更清单', '',
    '| 操作 | 文件路径 | 说明 |',
    '|---|---|---|',
    '| 新增 | NEW:src/main/java/com/foo/RpOrder.java | 实体 |',
    '| 新增 | NEW:src/services/rp.js | service |', '',
    doc, '',
  ].join('\n'))
  const r2 = runProbe8PayloadParity({ specBase: fx.specBase, cwd: fx.mainRoot, wtRoot: null, changeName: fx.changeName })
  assert.equal(r2.contractCount, 1, '契约面解析不受 POST 行影响')
  assert.ok(!r2.missingRequired.some(x => x.field === 'reportOrgId'),
    `无 POST 行（查询契约）不报必填漏发（实际 ${JSON.stringify(r2.missingRequired)}）`)
})

test('对齐零新告警：载荷键全 ∈ 契约字段 → 契约两数组空；既有维度照常输出', () => {
  const fx = mkFixture({
    prefix: 'p8c-align-',
    javaFields: ['reportOrgId', 'rpCategory'],
    feKeys: ['reportOrgId', 'rpCategory'],
    designExtra: contractSection({
      post: true,
      fields: [['reportOrgId', '提报单位（必填）'], ['rpCategory', '类别']],
    }),
  })
  const r = runProbe8PayloadParity({ specBase: fx.specBase, cwd: fx.mainRoot, wtRoot: null, changeName: fx.changeName })

  assert.ok(r.contractCount >= 1, `契约面在场（实际 ${r.contractCount}）`)
  assert.equal(r.contractOrphans.length, 0, `契约外键零告警（实际 ${JSON.stringify(r.contractOrphans)}）`)
  assert.equal(r.missingRequired.length, 0, `必填漏发零告警（实际 ${JSON.stringify(r.missingRequired)}）`)
  // 既有维度照常输出（键在场 + 计数如实）：归一化全覆盖 → 三面差异全空
  assert.equal(r.applicable, true, 'applicable 照常')
  assert.ok(Array.isArray(r.mispairs) && Array.isArray(r.feOnly) && Array.isArray(r.missingNotNull), '既有三面键照常输出')
  assert.equal(r.mispairs.length, 0, '全对齐无双端差异')
  assert.equal(r.backendFieldCount, 2, `后端字段计数如实（实际 ${r.backendFieldCount}）`)
  assert.equal(r.feKeyCount, 2, `前端载荷键计数如实（实际 ${r.feKeyCount}）`)
  assert.equal(r.javaFileCount, 1, 'Java 文件计数如实')
  assert.equal(r.feFileCount, 1, '前端文件计数如实')
})

test('无契约面 skipped：design 无契约章节 → contractCount=0 + notes 注记（不误报不空段）', () => {
  const fx = mkFixture({
    prefix: 'p8c-skip-',
    javaFields: ['rpCategory'],
    feKeys: ['rpCategory'],
    designExtra: ['## 背景说明', '', '散文段落，无契约类章节。', ''],
  })
  const r = runProbe8PayloadParity({ specBase: fx.specBase, cwd: fx.mainRoot, wtRoot: null, changeName: fx.changeName })

  assert.equal(r.applicable, true, '后端面在场 → applicable（契约维度正常进入才谈 skipped）')
  assert.equal(r.contractCount, 0, '无契约面 contractCount=0')
  assert.equal(r.contractOrphans.length, 0, '不误报契约外键')
  assert.equal(r.missingRequired.length, 0, '不误报必填漏发')
  assert.ok((r.notes || []).some(n => n.includes('design 无契约面')), `notes 含 skipped 注记（实际 ${JSON.stringify(r.notes)}）`)
})

test('非契约表不入面：文件变更清单表（首列「操作」）+ 风险表（首列「#」）不被误当契约面', () => {
  const fx = mkFixture({
    prefix: 'p8c-nonc-',
    javaFields: ['rpCategory'],
    feKeys: ['rpCategory'],
    designExtra: [
      '## 风险与对策', '',
      '| # | 风险 | 对策 |',
      '|---|---|---|',
      '| 1 | reportOrgId 缺送 | 提交链路复核 |',
      '| 2 | 契约漂移 | 双端联调 |',
      '',
    ],
  })
  // 直调解析器：两表均不进契约面（文件变更清单表在 fixture 骨架内自带，首列「操作」）
  const parsed = parseDesignContracts(fx.designPath)
  assert.ok(parsed && parsed.contracts.length === 0,
    `parseDesignContracts 契约面为空（实际 ${JSON.stringify(parsed && [...parsed.contracts.map(c => c.name)])}）`)

  const r = runProbe8PayloadParity({ specBase: fx.specBase, cwd: fx.mainRoot, wtRoot: null, changeName: fx.changeName })
  assert.equal(r.contractCount, 0, `清单/风险表字段不入契约面（实际 ${r.contractCount}）`)
  assert.equal(r.contractOrphans.length, 0, '表字段（操作/风险词）不落契约外键')
  assert.equal(r.missingRequired.length, 0, '表行不被当 required')
  assert.ok((r.notes || []).some(n => n.includes('design 无契约面')), '无契约面注记照常（skipped 语义一致）')
})
