/**
 * 2026-10-15-pitfall-batch-clearance FR-10 — probe7 矩阵「归属测试文件」列预填降噪
 *
 * 坑 probe-noise-and-commit-suggest-quality 坑A（消费仓实证）：task-03 的 allowed_paths 含宽
 * 目录 backend → 预填表格归属列塞进 82 个测试文件名（单行数千字符 ×3 行），信号全淹。
 * 锁死契约：归属列最多展示 5 个（mdEscapeCell 转义），超出折叠「共 N 个」；收集面同步设帽 20。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { renderProbe7Lines, buildVerifyFacts } from '../src/verify-probes.js'

const P7 = (testFiles) => ({
  applicable: true,
  tasks: [{
    task: 'task-03',
    acceptance: ['列表接口返回过滤后的数据'],
    testFiles,
    existingTests: [],
    hints: [null],
  }],
})

test('FR-10：82 文件截断为 5 + 「共 82 个」折叠，路径转义不破表', () => {
  const files = Array.from({ length: 82 }, (_, i) => `backend/test/case-${String(i).padStart(2, '0')}.test.js`)
  const lines = renderProbe7Lines(P7(files))
  const row = lines.find(l => l.startsWith('| 列表接口返回过滤后的数据'))
  assert.ok(row, '矩阵行在场')
  const attribCell = row.split(' | ')[1] // 第 2 列 = 归属测试文件
  const shown = (attribCell.match(/`backend\/test\/case-/g) || []).length
  assert.equal(shown, 5, `归属列展示 5 个（got ${shown}；cell=${attribCell.slice(0, 200)}）`)
  assert.ok(attribCell.includes('…共 82 个'), '折叠计数在场')
  assert.ok(!attribCell.includes('case-05.'), '第 6 个及以后不展示')
  assert.ok(attribCell.length < 500, `单元格长度收敛（got ${attribCell.length}）`)
  // 2026-10-16-probe7-prefill-noise-fix FR-04：>5 候选无测试名级收窄 → 判定交人工
  assert.ok(row.includes('| uncovered |'), '>5 候选 → uncovered（长清单不冒充承接结论）')
  assert.ok(row.includes('候选 82 个——归属不可判定，交人工核验'), '证据注明候选数与去向')
})

test('FR-10：≤5 个时不折叠、无计数尾巴', () => {
  const lines = renderProbe7Lines(P7(['a.test.js', 'b.test.js']))
  const row = lines.find(l => l.startsWith('| 列表接口返回过滤后的数据'))
  assert.ok(row.includes('`a.test.js`') && row.includes('`b.test.js`'), '全部展示')
  assert.ok(!row.includes('共 '), '无折叠计数')
})

test('FR-10：路径含竖线时转义不破表结构', () => {
  const lines = renderProbe7Lines(P7(['weird|path.test.js', 'b.test.js', 'c.test.js', 'd.test.js', 'e.test.js', 'f.test.js']))
  const row = lines.find(l => l.startsWith('| 列表接口返回过滤后的数据'))
  assert.ok(!row.includes('weird|path'), `竖线路径被转义（got ${row}）`)
})

// ── 2026-11-13-probe7-existing-tests-cap：既有用例候选行体积治理 ──────────────
// 坑：平台仓实证 4 张无归属卡各注入同一份 332 项 FR 关联候选，md 里 4 行 × 21,756 字节
// （占 verify-result.md 69%）。锁死契约：展示帽 5 + 「共 N 个」折叠、同集跨卡折叠为
// 「同上（见 task-XX）」、全量落 verify-facts.json probe7ExistingTests 段。

const EXISTING = (n, prefix = 'backend/test/existing') =>
  Array.from({ length: n }, (_, i) => `${prefix}-${String(i).padStart(3, '0')}.test.js`)

const P7EX = (existingTests, task = 'task-03') => ({
  applicable: true,
  tasks: [{
    task,
    acceptance: ['列表接口返回过滤后的数据'],
    testFiles: [],
    existingTests,
    hints: [null],
  }],
})

test('2026-11-13 FR-01：既有用例候选行展示帽——前 5 + 「共 332 个」，单行 ≤ 1KB', () => {
  const files = EXISTING(332)
  const lines = renderProbe7Lines(P7EX(files))
  const line = lines.find(l => l.includes('既有用例候选'))
  assert.ok(line, '候选行在场')
  const shown = (line.match(/`backend\/test\/existing-/g) || []).length
  assert.equal(shown, 5, `只展示前 5 个（got ${shown}；line=${line.slice(0, 300)}）`)
  assert.ok(line.includes('…共 332 个'), '折叠计数如实反映总数')
  assert.ok(line.includes('verify-facts.json'), '折叠尾巴指向全量存放位置')
  assert.ok(!line.includes('existing-005.test.js'), '第 6 个及以后不展示')
  assert.ok(Buffer.byteLength(line, 'utf8') <= 1024, `单行 ≤1KB（got ${Buffer.byteLength(line, 'utf8')} 字节）`)
})

test('2026-11-13 FR-01：≤5 项候选全量展示、无折叠尾巴', () => {
  const lines = renderProbe7Lines(P7EX(EXISTING(3)))
  const line = lines.find(l => l.includes('既有用例候选'))
  const shown = (line.match(/`backend\/test\/existing-/g) || []).length
  assert.equal(shown, 3, '3 项全部展示')
  assert.ok(!line.includes('…共 '), '无折叠计数')
})

test('2026-11-13 FR-02：相邻无归属卡共享同一候选集时第二张起折叠为同上', () => {
  const files = EXISTING(332)
  const p7 = {
    applicable: true,
    tasks: [
      { task: 'task-03', acceptance: ['A'], testFiles: [], existingTests: [...files], hints: [null] },
      { task: 'task-04', acceptance: ['B'], testFiles: [], existingTests: [...files].reverse(), hints: [null] },
    ],
  }
  const cand = renderProbe7Lines(p7).filter(l => l.includes('既有用例候选'))
  assert.equal(cand.length, 2, '两卡各一行')
  assert.ok(cand[0].includes('…共 332 个'), '首卡展示帽渲染')
  assert.ok(cand[1].includes('同上（见 task-03，共 332 个）'), `次卡折叠为同上（got ${cand[1].slice(0, 200)}）`)
  assert.equal((cand[1].match(/`backend\/test\/existing-/g) || []).length, 0, '次卡不再重复路径')
})

test('2026-11-13 FR-02：候选集不同的卡不互相折叠', () => {
  const p7 = {
    applicable: true,
    tasks: [
      { task: 'task-03', acceptance: ['A'], testFiles: [], existingTests: EXISTING(6), hints: [null] },
      { task: 'task-04', acceptance: ['B'], testFiles: [], existingTests: EXISTING(6, 'backend/test/other'), hints: [null] },
    ],
  }
  const cand = renderProbe7Lines(p7).filter(l => l.includes('既有用例候选'))
  assert.ok(!cand[1].includes('同上'), `不同集不折叠（got ${cand[1].slice(0, 200)}）`)
  assert.ok(cand[1].includes('…共 6 个'), '次卡按自身候选集展示帽')
})

test('2026-11-13 FR-03：buildVerifyFacts 落 probe7ExistingTests 全量、缺省零回归', () => {
  const files = EXISTING(332)
  const facts = buildVerifyFacts({
    probe7: {
      applicable: true,
      tasks: [
        { task: 'task-03', existingTests: [...files] },
        { task: 'task-04', existingTests: [...files] },
        { task: 'task-05', existingTests: [] },
      ],
    },
  }, { changeName: 'x', now: 't' })
  assert.ok(Array.isArray(facts.probe7ExistingTests), 'facts 含 probe7ExistingTests 段')
  assert.equal(facts.probe7ExistingTests.length, 1, '同集合并为一组')
  assert.deepEqual(facts.probe7ExistingTests[0].tasks, ['task-03', 'task-04'], '承接卡列表在场')
  assert.equal(facts.probe7ExistingTests[0].count, 332, '计数与 md 折叠一致')
  assert.equal(facts.probe7ExistingTests[0].files.length, 332, '文件全量在场')
  assert.deepEqual(facts.probe7ExistingTests[0].files, files, '全量内容不被截断')

  const noP7 = buildVerifyFacts({}, { changeName: 'x', now: 't' })
  assert.ok(!('probe7ExistingTests' in noP7), '无 probe7 → 不落键（存量调用方零回归）')
  const emptyP7 = buildVerifyFacts({ probe7: { applicable: true, tasks: [] } }, { changeName: 'x', now: 't' })
  assert.ok(!('probe7ExistingTests' in emptyP7), 'probe7 无候选 → 不落键')
})
