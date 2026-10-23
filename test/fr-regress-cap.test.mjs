/**
 * fr-regress-cap.test.mjs — FR 回归面帽配置键（2026-10-23-fr-regress-cap；
 * 语义 v2 缺省翻转 2026-10-23-fr-regress-default-off：缺省/坏值/不可读→0=off，all→null=旧行为）
 *
 *   ① applyFrRegressCap 四态：无帽原对象/N 内不截/超帽截断 kept-total/off 归零（FR-01）
 *   ② readFrRegressCap v2 五态：缺省 0（新缺省 off）/all null/N/off 0/坏值 0（含 CRLF）（FR-01）
 *   ③ 本仓缺省断言：local.yaml 无键 + readFrRegressCap(本仓)=0 + 消费点单一源锚（FR-03）
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { applyFrRegressCap, readFrRegressCap } from '../src/verify-postcheck.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

const FR = (n) => ({ files: Array.from({ length: n }, (_, i) => `test/t${i}.test.mjs`), frHits: Array.from({ length: n }, (_, i) => ({ id: `FR-01${i}` })), unresolved: [] })

test('① applyFrRegressCap 四态', () => {
  const fr = FR(100)
  assert.equal(applyFrRegressCap(fr, null).fr, fr, 'null（all 消费态）无帽原对象')
  assert.equal(applyFrRegressCap(fr, undefined).fr, fr, 'undefined 无帽原对象')
  assert.equal(applyFrRegressCap(null, 24).fr, null, 'fr 缺席原样')
  const inCap = applyFrRegressCap(fr, 200)
  assert.equal(inCap.fr, fr, '帽内零截断原对象')
  assert.equal(inCap.capApplied, null, '帽内无披露')
  const over = applyFrRegressCap(fr, 24)
  assert.equal(over.fr.files.length, 24, '截前 24')
  assert.deepEqual(over.fr.files, fr.files.slice(0, 24), '现有稳定序前缀')
  assert.deepEqual(over.capApplied, { kept: 24, total: 100 }, 'kept/total 披露口径')
  assert.equal(over.fr.frHits.length, 100, 'frHits 保留（触达披露仍按全量计）')
  const off = applyFrRegressCap(fr, 0)
  assert.deepEqual(off.fr.files, [], 'off 整层归零')
  assert.deepEqual(off.capApplied, { kept: 0, total: 100 }, 'off 披露')
  assert.equal(applyFrRegressCap(FR(0), 24).capApplied, null, '空面无披露')
})

test('② readFrRegressCap v2 五态（缺省翻转：默认就不跑，配置可开启）', () => {
  const d = mkdtempSync(join(tmpdir(), 'frc-'))
  try {
    mkdirSync(join(d, '.sillyspec'), { recursive: true })
    const specBase = join(d, '.sillyspec')
    const p = join(specBase, 'local.yaml')
    writeFileSync(p, 'project:\n  type: generic\n')
    assert.equal(readFrRegressCap(specBase), 0, '缺省（无键）=0=off（新缺省，v2 翻转）')
    writeFileSync(p, 'project:\n  type: generic\nfr_regress_cap: all\n')
    assert.equal(readFrRegressCap(specBase), null, 'all=null（无帽=旧行为，显式恢复全跑）')
    writeFileSync(p, 'project:\n  type: generic\nfr_regress_cap: 24\n')
    assert.equal(readFrRegressCap(specBase), 24, '合法 N=前 N 个')
    writeFileSync(p, 'project:\n  type: generic\nfr_regress_cap: off\n')
    assert.equal(readFrRegressCap(specBase), 0, 'off=0（显式同缺省）')
    writeFileSync(p, 'project:\n  type: generic\nfr_regress_cap: abc\n')
    assert.equal(readFrRegressCap(specBase), 0, '坏值 fail-soft=新缺省 0')
    writeFileSync(p, 'project:\n  type: generic\nfr_regress_cap: 99999\n')
    assert.equal(readFrRegressCap(specBase), 0, '超界（>2000）fail-soft=新缺省 0')
    writeFileSync(p, 'project:\r\n  type: generic\r\nfr_regress_cap: all\r\n')
    assert.equal(readFrRegressCap(specBase), null, 'CRLF 行尾仍命中（all）')
    writeFileSync(p, 'project:\r\n  type: generic\r\nfr_regress_cap: 24\r\n')
    assert.equal(readFrRegressCap(specBase), 24, 'CRLF 行尾仍命中（N）')
    rmSync(p, { force: true })
    assert.equal(readFrRegressCap(specBase), 0, '不可读 fail-soft=新缺省 0')
  } finally { rmSync(d, { recursive: true, force: true, maxRetries: 3 }) }
})

test('③ 本仓缺省断言与消费点单一源锚', () => {
  const yaml = readFileSync(join(ROOT, '.sillyspec', 'local.yaml'), 'utf8')
  assert.ok(!/^fr_regress_cap:/m.test(yaml), '本仓 local.yaml 无键（缺省即 off——2026-10-23-fr-regress-default-off 收敛，键已移除）')
  assert.equal(readFrRegressCap(join(ROOT, '.sillyspec')), 0, '本仓读取=0（缺省 off）')
  const src = readFileSync(join(ROOT, 'src', 'verify-postcheck.js'), 'utf8')
  assert.ok(src.includes('applyFrRegressCap(fr, capVal)'), '组面接线在位（本地收集路径单一消费点）')
  assert.ok(src.includes('applyFrRegressCap(frPre, capVal)'), '决策层产生点施帽在位（单一时点单一口径）')
  assert.ok(src.includes('可开启：local.yaml fr_regress_cap'), '披露行含开启指引（不静默）')
  assert.ok(src.includes('缺省（无键）/坏值/不可读 → 0'), 'v2 缺省语义注释在位')
})
