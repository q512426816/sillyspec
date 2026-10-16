/**
 * 2026-10-15-pitfall-batch-clearance FR-10 — probe7 矩阵「归属测试文件」列预填降噪
 *
 * 坑 probe-noise-and-commit-suggest-quality 坑A（消费仓实证）：task-03 的 allowed_paths 含宽
 * 目录 backend → 预填表格归属列塞进 82 个测试文件名（单行数千字符 ×3 行），信号全淹。
 * 锁死契约：归属列最多展示 5 个（mdEscapeCell 转义），超出折叠「共 N 个」；收集面同步设帽 20。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { renderProbe7Lines } from '../src/verify-probes.js'

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
