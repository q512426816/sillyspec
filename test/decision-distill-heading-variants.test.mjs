/**
 * 决策条目标题级/冒号变体容收 + 类型集补录（坑 decision-heading-h3-colon-variant，
 * 2026-09-11 驾驭第十二批，本仓归档 2026-08-08-concurrent-write-preflight 实证：
 * `### D-001@v1: 标题`（H3+冒号）形态 8 条 accepted 决策因 (a) 标题正则只认 `##`
 * (b) type feasibility/consistency 不在五类集——双重盲区从未入知识库）。
 *
 * 锁定语义：
 *   - ### / #### 标题级 + 标题前导冒号（中英）均可解析
 *   - feasibility / consistency 类型 + accepted → 入选（与五类同格；scope 排除语义不变）
 *   - 存量归档补录幂等：同变更重跑 update 不重复 append
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { parseDecisions, distillIntoKnowledge } from '../src/decision-distill.js'

const tmpRoots = []
function mk(p) { const d = mkdtempSync(join(tmpdir(), p)); tmpRoots.push(d); return d }
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

const H3_ARCHIVE = [
  '# 决策追踪',
  '',
  '### D-001@v1: H3 带冒号标题',
  '- type: feasibility',
  '- status: accepted',
  '- answer: 并入基线集',
  '',
  '#### D-002 H4 无冒号标题',
  '- type: consistency',
  '- 状态: accepted',
  '',
  '### D-003@v1: scope 语义验证',
  '- type: scope',
  '- status: accepted',
  '',
  '### D-004@v1: deferred 不入选',
  '- type: feasibility',
  '- status: deferred',
  '',
].join('\n') + '\n'

test('H3/H4 标题级 + 前导冒号容收；feasibility/consistency 入选、scope/deferred 不入选', () => {
  const changeDir = mk('h3v-')
  writeFileSync(join(changeDir, 'decisions.md'), H3_ARCHIVE)
  const r = parseDecisions(changeDir)
  assert.equal(r.entries.length, 4, '四种标题形态全解析')
  const d1 = r.entries.find(e => e.number === 'D-001')
  assert.equal(d1.title, 'H3 带冒号标题', 'H3+冒号标题剥前导冒号')
  assert.equal(d1.selected, 'implemented', 'feasibility+accepted 入选（类型集补录）')
  const d2 = r.entries.find(e => e.number === 'D-002')
  assert.equal(d2.title, 'H4 无冒号标题', 'H4 标题级容收')
  assert.equal(d2.selected, 'implemented', 'consistency+accepted 入选')
  assert.equal(r.entries.find(e => e.number === 'D-003').selected, null, 'scope 仍不入选（排除语义不变）')
  assert.equal(r.entries.find(e => e.number === 'D-004').selected, null, 'deferred 不入选')
})

test('存量归档补录：H3 格式 distill 落知识库 + 幂等重跑不重复', () => {
  const changeDir = mk('h3v-distill-')
  mkdirSync(join(changeDir, '.sillyspec'), { recursive: true }) // 形态无碍
  writeFileSync(join(changeDir, 'decisions.md'), H3_ARCHIVE)
  const k = mk('h3v-k-')
  const r1 = distillIntoKnowledge(changeDir, k, 'deadbeef')
  assert.ok(r1.written.filter(w => w.action === 'append').length >= 2, `accepted 条目 append（实际 ${JSON.stringify(r1.written)}）`)
  const file = join(k, 'decisions', 'unmapped.md')
  const content1 = readFileSync(file, 'utf8')
  assert.ok(content1.includes('D-001@v1') && content1.includes('变更：'), '条目含变更限定行')
  // 幂等重跑：同号同变更 update 原地重写，不重复 append
  const r2 = distillIntoKnowledge(changeDir, k, 'deadbeef')
  const content2 = readFileSync(file, 'utf8')
  assert.equal((content2.match(/D-001@v1/g) || []).length, (content1.match(/D-001@v1/g) || []).length,
    '重跑条目数不变（幂等）')
  assert.ok(r2.written.every(w => w.action !== 'append') || r2.written.length === 0, `重跑无 append（实际 ${JSON.stringify(r2.written.map(w => w.action))}）`)
})
