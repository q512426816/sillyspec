/**
 * 探针 7 预填噪音四缺陷修复契约锁定（2026-10-16-probe7-prefill-noise-fix）。
 *
 * 依据：multi-agent-platform docs/sillyspec/verify-probe7-matrix-prefill-four-defects.md
 * （backend-mem-polling verify 收口实测）：
 *   FR-01 部署/文档类条目直接 non-testable + 全条目命中卡不注入 FR 候选池（缺陷一）；
 *   FR-02 covered 仅测试名级命中（锚点=测试函数名行），正文命中封顶 partial（缺陷二）；
 *   FR-03 同波次新增/修改测试零字面命中 → covered + 待人工复核（缺陷三）；
 *   FR-04 候选 >5 → uncovered 交人工，单元格禁长清单（缺陷四）；
 *   FR-05 七级判定链固定且全证据形态过 stage-contract 门禁。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runVerifyProbes, renderVerifyProbesReport, generateVerifyResultSkeleton } from '../src/verify-probes.js'
import { extractAcceptanceMatrixSlots } from '../src/stage-contract.js'

const roots = []
function mk(p) { const d = mkdtempSync(join(tmpdir(), p)); roots.push(d); return d }
test.after(() => { for (const d of roots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

function card(id, allowed, acceptance) {
  return [
    '---', `id: ${id}`, 'allowed_paths:', ...allowed.map(p => `  - ${p}`),
    'acceptance:', ...acceptance.map(a => `  - ${a}`), '---', `# ${id}`, '',
  ].join('\n')
}

function buildFixture() {
  const root = mk('p7noise-')
  const specBase = join(root, '.sillyspec')
  const changeDir = join(specBase, 'changes', 'pn')
  const tasksDir = join(changeDir, 'tasks')
  mkdirSync(tasksDir, { recursive: true })
  mkdirSync(join(root, 'src'), { recursive: true })
  mkdirSync(join(root, 'test'), { recursive: true })
  mkdirSync(join(root, 'agent', 'tests'), { recursive: true })
  mkdirSync(join(root, 'docs'), { recursive: true })
  writeFileSync(join(root, 'src', 'lib.js'), 'export const a = 1\n')
  writeFileSync(join(root, 'src', 'only.js'), 'export const o = 1\n')
  writeFileSync(join(root, 'docs', 'x.md'), '# 文档\n')
  // 测试名级命中源：kwNameHit 在注释行与 test() 名行双现（锚点须取名行行号 3）
  writeFileSync(join(root, 'test', 'name-hit.test.mjs'), [
    'export const x = 1',
    '// kwNameHit 场景说明（正文级行——不应作为锚点）',
    "test('kwNameHit 场景名', () => {})", '',
  ].join('\n'))
  // Python def 名级命中
  writeFileSync(join(root, 'test', 'beta_def.py'), 'def test_beta_kw_check():\n    assert True\n')
  // 正文级命中源：仅注释含关键词（无测试名行）
  writeFileSync(join(root, 'test', 'body-hit.test.mjs'), '// kwBodyHit 仅注释命中\nexport {}\n')
  // FR 关联回归候选源（existing-regress 两卡对照：docs 卡跳过 / 代码卡注入）
  writeFileSync(join(root, 'test', 'existing-regress.test.mjs'), "import { test } from 'node:test'\nimport { a } from '../src/lib.js'\ntest('regress', () => { if (a !== 1) throw new Error('x') })\n")
  // 同波次新增测试（零字面命中——kwWave 不出现在内容里）
  writeFileSync(join(root, 'agent', 'tests', 'new_wave.test.mjs'), 'export const w = 1\n')
  // >5 候选源（6 个测试文件，内容零命中）
  for (let i = 1; i <= 6; i++) writeFileSync(join(root, 'test', `cand-${i}.test.mjs`), 'export {}\n')

  writeFileSync(join(changeDir, 'design.md'), [
    '---', 'change: pn', '---', '# 设计', '',
    '## 文件变更清单', '', '| 操作 | 文件路径 | 说明 |', '|---|---|---|', '| 修改 | src/lib.js | 改动 |', '',
  ].join('\n'))
  writeFileSync(join(changeDir, 'tasks.md'), '- [ ] task-01\n- [ ] task-06\n')
  writeFileSync(join(tasksDir, 'task-01.md'), card('task-01', ['test/name-hit.test.mjs', 'test/beta_def.py'], [
    'kwNameHit 场景由测试函数承接',
    'beta_kw 回归校验',
    '部署 kwNameHit 回滚校验',
  ]))
  writeFileSync(join(tasksDir, 'task-02.md'), card('task-02', ['test/body-hit.test.mjs'], [
    'kwBodyHit 生效',
  ]))
  writeFileSync(join(tasksDir, 'task-03.md'), card('task-03', ['docs/x.md'], [
    '部署文档更新 config 说明',
  ]))
  writeFileSync(join(tasksDir, 'task-04.md'), card('task-04', ['src/lib.js'], [
    '返回值 a 恒为 1',
  ]))
  writeFileSync(join(tasksDir, 'task-05.md'), card('task-05',
    Array.from({ length: 6 }, (_, i) => `test/cand-${i + 1}.test.mjs`), ['kwCand 场景生效']))
  writeFileSync(join(tasksDir, 'task-06.md'), card('task-06', ['src/only.js', 'agent/tests/new_wave.test.mjs'], [
    'kwWave 新链路生效',
  ]))

  // FR 知识面（复制 probe7-fr-prefill 夹具形态：FR-core-001 绑定 test/existing-regress.test.mjs）
  mkdirSync(join(specBase, 'knowledge', 'fr'), { recursive: true })
  mkdirSync(join(specBase, 'docs', 'proj', 'modules'), { recursive: true })
  mkdirSync(join(specBase, 'changes', 'archive', '2026-09-20-old-change'), { recursive: true })
  writeFileSync(join(specBase, 'docs', 'proj', 'modules', '_module-map.yaml'), 'modules:\n  core:\n    paths:\n      - src/\n')
  writeFileSync(join(specBase, 'changes', 'archive', '2026-09-20-old-change', 'change-patch.json'), '{"files": ["src/lib.js"]}\n')
  writeFileSync(join(specBase, 'knowledge', 'fr', 'core.md'), [
    '## FR-core-001 库行为', '变更：2026-09-20-old-change', '状态：active', '摘要：返回值恒定', '',
    '测试绑定：', '<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->',
    '- row: 2026-09-20-old-change:task-01:FR-01', '  tests: test/existing-regress.test.mjs',
    '  reason: spec', '  state: candidate', '  discovery: machine',
    '  confirmed_by: null', '  confirmed_at: null', '',
  ].join('\n'))

  // execute run：marker + task-06 review.json（同波次 changedFiles——嵌套 tests/ 形态）
  const runtimeRoot = join(specBase, '.runtime')
  const runId = 'exec-2026-10-16-120000'
  mkdirSync(join(runtimeRoot, 'execute-runs', runId, 'tasks', 'task-06'), { recursive: true })
  mkdirSync(join(runtimeRoot, 'state'), { recursive: true })
  writeFileSync(join(runtimeRoot, 'state', 'current-execute-run-id-pn'), runId + '\n')
  writeFileSync(join(runtimeRoot, 'execute-runs', runId, 'tasks', 'task-06', 'review.json'), JSON.stringify({
    schemaVersion: 1, task: 'task-06',
    changedFiles: ['src/only.js', 'agent/tests/new_wave.test.mjs'],
  }, null, 2))
  return { root, specBase }
}

const fx = buildFixture()
const r = runVerifyProbes({ cwd: fx.root, changeName: 'pn', specDir: fx.specBase })
const md = renderVerifyProbesReport(r)
const task = (id) => r.probe7.tasks.find(t => t.task === id)
const section = (id, nextId) => md.split(`**${id}**`)[1].split(`**${nextId}**`)[0]

test('FR-01 部署/文档类条目 non-testable 且全条目命中卡不注入 FR 池', () => {
  const t3 = task('task-03')
  assert.deepEqual(t3.existingTests || [], [], 'docs 卡不注入 FR 候选池（缺陷一收窄）')
  assert.deepEqual(t3.testFiles || [], [], 'docs 卡归属空')
  const sec = section('task-03', 'task-04')
  assert.ok(!sec.includes('既有用例候选'), 'docs 卡无既有用例注记行')
  assert.ok(sec.includes('| non-testable |'), `行判定 non-testable（sec=${sec.slice(0, 300)}）`)
  assert.ok(sec.includes('部署/文档类条目'), '证据注记=部署/文档类条目')
  const t4 = task('task-04')
  assert.ok((t4.existingTests || []).includes('test/existing-regress.test.mjs'),
    `代码卡 FR 注入不受影响（对照；实际 ${JSON.stringify(t4.existingTests)}）`)
})

test('FR-02 测试名级命中 covered 且锚点指向测试函数行', () => {
  const t1 = task('task-01')
  const sec = section('task-01', 'task-02')
  assert.equal((sec.match(/\| covered \|/g) || []).length, 3, `三条均 covered（实际 ${(sec.match(/\| covered \|/g) || []).length}）`)
  assert.equal((sec.match(/\| partial \|/g) || []).length, 0, '无 partial 误标')
  assert.ok(sec.includes('`test/name-hit.test.mjs:3`（kwNameHit 场景名）'),
    '锚点=测试函数名行（第 3 行 test() 名行，非第 2 行注释）且引用测试名')
  assert.ok(sec.includes('`test/beta_def.py:1`（test_beta_kw_check）'), 'Python def 名级命中锚点')
  const e3 = sec.split('\n').find(l => l.includes('部署 kwNameHit 回滚校验'))
  assert.ok(e3 && e3.includes('| covered |'), '①优先于②：含部署词但测试名级命中 → covered（非 non-testable）')
  const na = t1.hints[0] && t1.hints[0].nameAnchors
  assert.ok(Array.isArray(na) && na[0] && na[0].line === 3 && na[0].name === 'kwNameHit 场景名',
    `nameAnchors 数据面（实际 ${JSON.stringify(na)}）`)
})

test('FR-02 正文命中封顶 partial 且锚点禁关键词行', () => {
  const sec = section('task-02', 'task-03')
  assert.ok(sec.includes('| partial |'), '正文级命中 → partial（不再假 covered）')
  assert.ok(sec.includes('正文级命中——待人工核验 `test/body-hit.test.mjs`'), '证据=正文级命中注记')
  assert.ok(!/test\/body-hit\.test\.mjs:\d+/.test(sec), '证据不含关键词行号锚点（空心锚根除）')
})

test('FR-03 同波次新增测试零命中预填 covered+待人工复核', () => {
  const t6 = task('task-06')
  assert.ok((t6.waveFiles || []).includes('agent/tests/new_wave.test.mjs'),
    `waveFiles 采集（嵌套 tests/ 形态；实际 ${JSON.stringify(t6.waveFiles)}）`)
  const sec = section('task-06', '')
  assert.ok(sec.includes('| covered |'), '零字面命中 + 同波次 → covered（不再误标 partial）')
  assert.ok(sec.includes('同波次新增/修改——待人工复核'), '带待人工复核注记')
  assert.ok(sec.includes('`agent/tests/new_wave.test.mjs`'), '证据引用归属文件')
})

test('FR-04 候选>5 交人工且长清单不进单元格', () => {
  const t5 = task('task-05')
  assert.equal(t5.testFiles.length, 6, '候选 6 个')
  const sec = section('task-05', 'task-06')
  assert.ok(sec.includes('| uncovered |'), '>5 → uncovered 交人工')
  assert.ok(sec.includes('候选 6 个——归属不可判定，交人工核验'), '证据注明候选数与去向')
  assert.ok(sec.includes('…共 6 个（归属不可判定——候选全量在 facts/trace，交人工）'), '归属列折叠文案更新')
  assert.ok(!sec.includes('cand-6.test.mjs'), '第 6 个候选不进单元格')
})

test('FR-05 七级链走查 + 门禁 round-trip', () => {
  const sk = generateVerifyResultSkeleton(r)
  const slots = extractAcceptanceMatrixSlots(sk)
  assert.ok(slots.present && slots.unfilled === 0, `判定全为合法枚举（unfilled=${slots.unfilled}）`)
  assert.equal(slots.missingEvidence, 0, '全部新证据形态过锚点口径')
  assert.equal(slots.rows.length, 8, `八行数据行（实际 ${slots.rows.length}）`)
  const verdicts = slots.rows.map(x => `${x.acceptance.slice(0, 10)}=${x.verdict}`)
  assert.ok(verdicts.every(v => /=(covered|covered-service|partial|uncovered|non-testable)$/.test(v)),
    `枚举纯值（${JSON.stringify(verdicts)}）`)
})
