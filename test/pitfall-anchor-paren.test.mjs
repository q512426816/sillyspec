/**
 * 2026-10-15-pitfall-batch-clearance FR-01/FR-02 — 矩阵锚点正则括号对称 + 空指报错附解析面
 *
 * 坑 verify-close-gate-staggered-exposure（消费仓 2026-10-14-admin-server-status 四轮 --done 实证）：
 *   ① API_ANCHOR_DESIGN_API_RE 路径字符类排除了中文右括号）没排除左括号（——
 *      `design接口表#GET /api/system-status（design.md 接口定义节端点一致）` 路径被吞成
 *      `/api/system-status（design.md` 与解析集永不匹配 → 恒空指；
 *   ② 空指报错不附 facts 实际解析到的端点集，「吞字」与「design 缺表」不可辨。
 * 锁死契约：四形括号（（（）)）对称终止捕获；空指报错含解析面端点集（空集显式标注）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { extractApiCoverageMatrixSlots, judgeApiCoverageMatrix } from '../src/stage-contract.js'

const EP = (method, path, rowIdx = 1) => ({ method, path, rowIdx })

function matrixMd(rows) {
  const lines = ['## 接口验证覆盖矩阵 [层：人工判断——CLI 预填复核]', '',
    '| 端点 | 判定 | 用例依据 ID | 结果 | 证据 |', '|---|---|---|---|---|']
  for (const r of rows) lines.push(`| ${r[0]} | ${r[1]} | ${r[2] || ''} | ${r[3] || ''} | ${r[4] || ''} |`)
  lines.push('', '## 后续章节', '')
  return lines.join('\n')
}

function judgeWith({ rows, endpoints }) {
  return judgeApiCoverageMatrix({
    matrix: extractApiCoverageMatrixSlots(matrixMd(rows || [])),
    apiFace: { endpoints, declared: null, writeEndpoints: [] },
    facts: { handover: { count: 0, items: [] } },
    factsExpected: true,
    riskLevel: 'unit-sufficient',
    changeName: 'pitfall-x',
  })
}

test('FR-01：锚点后紧跟中文左括号注记不再吞字空指', () => {
  const r = judgeWith({
    rows: [['GET /api/system-status', 'covered', '', '', 'design接口表#GET /api/system-status（design.md 接口定义节端点一致）']],
    endpoints: [EP('GET', '/api/system-status')],
  })
  assert.equal(r.ok, true, `左括号注记形态应命中（errors=${JSON.stringify(r.errors)}）`)
  assert.equal(r.errors.filter(e => e.includes('空指')).length, 0, '无空指违规')
})

test('FR-01：半角左括号注记同样终止捕获；既有分隔形态（右括号/逗号/空格）不回归', () => {
  const half = judgeWith({
    rows: [['GET /api/status', 'covered', '', '', 'design接口表#GET /api/status(note)']],
    endpoints: [EP('GET', '/api/status')],
  })
  assert.equal(half.ok, true, `半角括号注记应命中（errors=${JSON.stringify(half.errors)}）`)

  const legacy = judgeWith({
    rows: [
      ['GET /api/a', 'covered', '', '', 'design接口表#GET /api/a）注记'],
      ['GET /api/b', 'covered', '', '', 'design接口表#GET /api/b，注记'],
      ['GET /api/c', 'covered', '', '', 'design接口表#GET /api/c 注记'],
    ],
    endpoints: [EP('GET', '/api/a'), EP('GET', '/api/b'), EP('GET', '/api/c')],
  })
  assert.equal(legacy.ok, true, `既有分隔形态不回归（errors=${JSON.stringify(legacy.errors)}）`)
})

test('FR-02：空指报错附 facts 实际解析面端点集', () => {
  // 用一个真实吞不掉的错锚点触发空指（路径后紧跟中文句号截断出的假端点）
  const r = judgeWith({
    rows: [['GET /api/ghost', 'covered', '', '', 'design接口表#GET /api/ghost。注记']],
    endpoints: [EP('GET', '/api/real-one'), EP('POST', '/api/real-two')],
  })
  assert.equal(r.ok, false, '错端点应空指拦截')
  const err = r.errors.find(e => e.includes('空指'))
  assert.ok(err, '存在空指 error')
  assert.ok(err.includes('GET /api/real-one'), `报错含解析面端点1（got: ${err}）`)
  assert.ok(err.includes('POST /api/real-two'), '报错含解析面端点2')
})

test('FR-02：解析面为空时空指报错显式标注', () => {
  const r = judgeWith({
    rows: [['GET /api/ghost', 'covered', '', '', 'design接口表#GET /api/ghost。注记']],
    endpoints: [],
  })
  const err = r.errors.find(e => e.includes('空指'))
  assert.ok(err, '空指 error 在场')
  assert.ok(err.includes('解析面为空'), `空解析面显式标注（got: ${err}）`)
})
