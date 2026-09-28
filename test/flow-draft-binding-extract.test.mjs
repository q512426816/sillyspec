import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'

/**
 * 2026-09-26-binding-anchor-fidelity：测试绑定提取保真（坑 test-trace-extract-truncates-case-suffix）
 * ＋裸文件名/路径段解析全路径＋文件面消费点剥锚回归。
 */
const { extractRequirementBindings } = await import('../src/flow-draft.js')
const { testAnchorFile, resolveTestFileOwners, writeChangeTrace, readChangeTrace } = await import('../src/test-bindings.js')
const { resolveTraceResidual } = await import('../src/verify-postcheck.js')

function makeRepo(files = {}) {
  const root = mkdtempSync(join(tmpdir(), 'bafix-'))
  const changeDir = join(root, '.sillyspec', 'changes', 'c1')
  mkdirSync(changeDir, { recursive: true })
  for (const [rel, content] of Object.entries(files)) {
    const p = join(root, rel)
    mkdirSync(dirname(p), { recursive: true })
    writeFileSync(p, content ?? '')
  }
  return { root, changeDir, specBase: join(root, '.sillyspec') }
}

function writeReq(changeDir, slots) {
  const lines = []
  for (const [id, body] of Object.entries(slots)) {
    lines.push(`<!--AGENT:测试绑定${id} 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名，如 test/foo.test.mjs「用例组」或 test/foo.test.mjs#用例；无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->`)
    lines.push(body, '')
  }
  writeFileSync(join(changeDir, 'requirements.md'), lines.join('\n'))
}

const byAnchor = (rows) => Object.fromEntries(rows.map((r) => [r.anchor, r]))

test('① 四形态用例锚捕获：「」组/#…/::…/> …；「：」后描述与非邻接形态不误捕', () => {
  const { root, changeDir } = makeRepo({ 'test/foo.test.mjs': '' })
  writeReq(changeDir, {
    'FR-01': 'test/foo.test.mjs「inferFlipTimes」组：中段断裂标 broken、尾部未覆盖不标',
    'FR-02': 'test/foo.test.mjs#lockstep 翻格顺序推断',
    'FR-03': 'test/foo.test.mjs::test_bar[param] 的行为',
    'FR-04': 'test/foo.test.mjs > renders timeline with anchors',
    'FR-05': 'test/foo.test.mjs：渲染输出含「阶段墙钟」行与阶段名',
    'FR-06': '覆盖见 test/foo.test.mjs 的「X」组（非邻接不捕）',
  })
  const rows = byAnchor(extractRequirementBindings({ changeDir, change: 'c1' }))
  assert.equal(rows['FR-01'].tests[0], 'test/foo.test.mjs「inferFlipTimes」组')
  assert.equal(rows['FR-02'].tests[0], 'test/foo.test.mjs#lockstep')
  assert.equal(rows['FR-03'].tests[0], 'test/foo.test.mjs::test_bar[param]')
  assert.equal(rows['FR-04'].tests[0], 'test/foo.test.mjs > renders timeline with anchors')
  // 路径后直接「：」=描述引导 → 文件级；用例名写在路径前（非邻接）→ 文件级
  assert.equal(rows['FR-05'].tests[0], 'test/foo.test.mjs')
  assert.equal(rows['FR-06'].tests[0], 'test/foo.test.mjs')
  rmSync(root, { recursive: true, force: true })
})

test('② 裸文件名/路径段解析项目相对全路径；歧义与未命中原样保留', () => {
  const { root, changeDir } = makeRepo({
    'test/foo.test.mjs': '',
    'src/lib/test/bar.mjs': '',
    'a/util.test.mjs': '',
    'b/util.test.mjs': '',
  })
  writeReq(changeDir, {
    'FR-01': 'foo.test.mjs「X」组：裸文件名解析',
    'FR-02': 'lib/test/bar.mjs 路径段解析',
    'FR-03': 'util.test.mjs 同名两处——歧义不解析',
    'FR-04': 'test/nope.test.mjs 未命中——原样保留',
  })
  const rows = byAnchor(extractRequirementBindings({ changeDir, change: 'c1' }))
  assert.equal(rows['FR-01'].tests[0], 'test/foo.test.mjs「X」组')
  assert.equal(rows['FR-02'].tests[0], 'src/lib/test/bar.mjs')
  assert.equal(rows['FR-03'].tests[0], 'util.test.mjs')
  assert.equal(rows['FR-04'].tests[0], 'test/nope.test.mjs')
  rmSync(root, { recursive: true, force: true })
})

test('③ 多路径一行各自配对；不适用与非测试路径行为不变', () => {
  const { root, changeDir } = makeRepo({ 'test/a.test.mjs': '', 'test/b.test.mjs': '' })
  writeReq(changeDir, {
    'FR-01': 'test/a.test.mjs#x；test/b.test.mjs「Y」组',
    'FR-02': '不适用：套件本身即验证',
    'FR-03': 'src/foo.js 非测试路径不产行',
  })
  const rows = byAnchor(extractRequirementBindings({ changeDir, change: 'c1' }))
  assert.deepEqual(rows['FR-01'].tests, ['test/a.test.mjs#x', 'test/b.test.mjs「Y」组'])
  assert.equal(rows['FR-02'], undefined)
  assert.equal(rows['FR-03'], undefined)
  rmSync(root, { recursive: true, force: true })
})

test('④ testAnchorFile 四形态剥离＋无锚幂等（文件面消费统一入口）', () => {
  assert.equal(testAnchorFile('test/foo.test.mjs「X」组'), 'test/foo.test.mjs')
  assert.equal(testAnchorFile('test/foo.test.mjs#x'), 'test/foo.test.mjs')
  assert.equal(testAnchorFile('test/foo.test.mjs::x'), 'test/foo.test.mjs')
  assert.equal(testAnchorFile('test/foo.test.mjs > x y'), 'test/foo.test.mjs')
  assert.equal(testAnchorFile('test/foo.test.mjs'), 'test/foo.test.mjs')
  assert.equal(testAnchorFile('test\\foo.test.mjs'), 'test/foo.test.mjs')
  // 竖线排除（评审 P2）：锚文本含 | 时在竖线处截断——FR 机器子块 tests 行以 | 分隔，锚内竖线会裂格式
  const { root, changeDir } = makeRepo({ 'test/foo.test.mjs': '' })
  writeReq(changeDir, { 'FR-01': 'test/foo.test.mjs#a|b 竖线用例' })
  const rows = byAnchor(extractRequirementBindings({ changeDir, change: 'c1' }))
  assert.equal(rows['FR-01'].tests[0], 'test/foo.test.mjs#a')
  rmSync(root, { recursive: true, force: true })
})

test('⑤ test-trace 写读 roundtrip：带锚条目完整落盘（展示面保锚）', () => {
  const { root, changeDir } = makeRepo()
  writeChangeTrace(changeDir, 'c1', [{ anchor: 'FR-01', row_id: 'c1:flow:FR-01', tests: ['test/foo.test.mjs「X」组', 'test/foo.test.mjs#y'], reason: 'spec', state: 'candidate', discovery: 'machine', confirmed_by: null, source_change: 'c1' }])
  const rows = readChangeTrace(changeDir)
  assert.equal(rows.length, 1)
  assert.deepEqual(rows[0].tests, ['test/foo.test.mjs#y', 'test/foo.test.mjs「X」组'])
  rmSync(root, { recursive: true, force: true })
})

test('⑥ 残差实测文件面剥锚：带锚行 → files 干净路径、不 dangling', () => {
  const { root, changeDir, specBase } = makeRepo({ 'test/foo.test.mjs': '' })
  mkdirSync(join(changeDir, 'tasks'), { recursive: true })
  writeFileSync(join(changeDir, 'tasks', 'task-01.md'), "---\nrequirement_ids: ['FR-01']\n---\n")
  writeChangeTrace(changeDir, 'c1', [{ anchor: 'FR-01', row_id: 'c1:task-01:acc-0-abcdef12', tests: ['test/foo.test.mjs「X」组'], reason: 'spec', state: 'active', discovery: 'machine', confirmed_by: 'agent', source_change: 'c1' }])
  const res = resolveTraceResidual({ specBase, changeName: 'c1', cwd: root })
  assert.deepEqual(res.files, ['test/foo.test.mjs'])
  assert.deepEqual(res.dangling, [])
  rmSync(root, { recursive: true, force: true })
})

test('⑦ watcher 归属匹配剥锚：带锚绑定行按文件面命中', () => {
  const { root, specBase } = makeRepo({ 'test/foo.test.mjs': '' })
  const frDir = join(specBase, 'knowledge', 'fr')
  mkdirSync(frDir, { recursive: true })
  writeFileSync(join(frDir, 'cli-entry.md'), [
    '# FR 索引 — cli-entry',
    '',
    '## FR-cli-entry-01 某行为',
    '变更：c1',
    '状态：active',
    '',
    '测试绑定：',
    '<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->',
    '- row: c1:flow:FR-01',
    '  tests: test/foo.test.mjs「X」组',
    '  reason: spec',
    '  state: active',
    '  discovery: machine',
    '  confirmed_by: agent',
    '  confirmed_at: null',
    '  source_change: c1',
    '  status: active',
    '',
  ].join('\n'))
  const map = resolveTestFileOwners({ specBase, files: ['test/foo.test.mjs'] })
  assert.equal(map.size, 1)
  const owners = map.get('test/foo.test.mjs')
  assert.equal(owners.length, 1)
  assert.equal(owners[0].anchor, 'FR-cli-entry-01')
  rmSync(root, { recursive: true, force: true })
})

test('⑤ 多段锚全收（坑 test-trace-tests-glue-bracket-note 边角，2026-09-27）：路径后连续锚段各产一条，不静默丢弃', () => {
  const { root, changeDir } = makeRepo({ 'test/foo.test.mjs': '' })
  writeReq(changeDir, {
    'FR-01': 'test/foo.test.mjs「detectUiTouch 正例」「detectUiTouch 反例」组',
    'FR-02': 'test/foo.test.mjs#a::b 混合形态连写',
    'FR-03': 'test/foo.test.mjs「a」 注解文字不成锚',
  })
  const rows = byAnchor(extractRequirementBindings({ changeDir, change: 'c1' }))
  assert.deepEqual(rows['FR-01'].tests, [
    'test/foo.test.mjs「detectUiTouch 正例」',
    'test/foo.test.mjs「detectUiTouch 反例」组',
  ], '连续「」锚段各产一条（后段不再被丢弃）')
  assert.deepEqual(rows['FR-02'].tests, [
    'test/foo.test.mjs#a::b',
  ], '跨形态连写按贪心单锚收（书写歧义不拆译；剥锚后同归一路径）')
  assert.deepEqual(rows['FR-03'].tests, ['test/foo.test.mjs「a」'], '锚后普通注解文字不成锚（不误捕）')
  // 文件面消费：剥锚后同为纯路径（testAnchorFile 文件头已导入）
  assert.ok(rows['FR-01'].tests.every((t) => testAnchorFile(t) === 'test/foo.test.mjs'), '消费面剥锚后归一为纯路径')
  rmSync(root, { recursive: true, force: true })
})
