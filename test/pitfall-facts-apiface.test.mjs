/**
 * 2026-10-15-pitfall-batch-clearance FR-04 — verify-probes --init 落 apiFace 键 + re-init 保固化键
 *
 * 坑 verify-close-gate-staggered-exposure 第 3 轮实证：facts 由 --init 落盘且刻意不落 apiFace 键
 * （源码注释自认，只有 --done 收口 backfill 才写）——重跑 --init 刷新 facts 后空指依旧，报错
 * 完全没提这一点；且 writeVerifyFacts 合并白名单缺 apiFace，re-init 会把 --done 回填的键抹掉。
 * 锁死契约：buildVerifyFacts 透传 result.apiFace；writeVerifyFacts re-init 保留 backfill 固化键
 * （apiFace fresh 侧重算，consumerHints/handover 等 fresh 未带的键原样保留）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { buildVerifyFacts, writeVerifyFacts } from '../src/verify-probes.js'

const tmpRoots = []
function mk(p) { const d = mkdtempSync(join(tmpdir(), p)); tmpRoots.push(d); return d }
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

const FACE = () => ({ endpoints: [{ method: 'GET', path: '/api/status', rowIdx: 1 }], declared: 1, writeEndpoints: [], sectionHint: ['接口设计'] })

test('FR-04：buildVerifyFacts 透传 result.apiFace（--init 即落键，undefined 自然丢）', () => {
  const withFace = buildVerifyFacts({ apiFace: FACE() }, { changeName: 'pf-x' })
  assert.deepEqual(withFace.apiFace, FACE(), 'facts.apiFace = result.apiFace 同形透传')
  const withoutFace = buildVerifyFacts({}, { changeName: 'pf-x' })
  assert.ok(!('apiFace' in withoutFace) || withoutFace.apiFace === undefined, '无 apiFace 调用面不造键')
})

test('FR-04：writeVerifyFacts re-init 保留 backfill 固化键（fresh 未带者原样、apiFace 随 fresh 刷新）', () => {
  const changeDir = mk('pff-')
  mkdirSync(changeDir, { recursive: true })
  const factsPath = join(changeDir, 'verify-facts.json')
  // 既有 --done 回填形态：v2 机器段 + 五段固化 + backfill 键
  writeFileSync(factsPath, JSON.stringify({
    schemaVersion: 2, change: 'pf-x', generatedAt: '2026-10-14T00:00:00.000Z',
    apiFace: FACE(),
    consumerHints: { 'GET /api/status': ['前端 x.ts'] },
    handover: { count: 1, items: [{ type: 'env-blocked', item: 'i', condition: 'c', severity: 'advisory' }] },
    conclusion: 'PASS', tests: { ran: true }, requiredEvidence: [], runtimeEvidence: {}, factsConsistency: { checked: true },
    probes: {},
  }, null, 2))

  // re-init：fresh 结果无 apiFace（旧调用面形态）→ prev 固化键保留
  const r1 = writeVerifyFacts(changeDir, { probe1: {} }, 'pf-x')
  assert.deepEqual(r1.facts.apiFace, FACE(), 'fresh 无 apiFace → prev.apiFace 保留（不再被抹）')
  assert.deepEqual(r1.facts.consumerHints, { 'GET /api/status': ['前端 x.ts'] }, 'consumerHints 保留')
  assert.equal(r1.facts.handover.count, 1, 'handover 保留')
  assert.equal(r1.facts.conclusion, 'PASS', '五段固化键照旧保留')
  assert.ok(r1.facts.probes && r1.facts.probes.probe1, '机器段被 fresh 刷新')

  // re-init：fresh 带 apiFace（新调用面）→ 值随 fresh 刷新
  const NEW_FACE = { endpoints: [{ method: 'POST', path: '/api/new', rowIdx: 1 }], declared: 1, writeEndpoints: [] }
  const r2 = writeVerifyFacts(changeDir, { apiFace: NEW_FACE }, 'pf-x')
  assert.deepEqual(r2.facts.apiFace, NEW_FACE, 'fresh 有 apiFace → 以 fresh 为准（同源重算语义）')
  const onDisk = JSON.parse(readFileSync(factsPath, 'utf8'))
  assert.equal(onDisk.apiFace.endpoints[0].path, '/api/new', '落盘与返回一致')
})
