/**
 * fr-regress-cap.test.mjs — FR 回归面帽配置键（2026-10-23-fr-regress-cap）
 *
 *   ① applyFrRegressCap 四态：无帽原对象/N 内不截/超帽截断 kept-total/off 归零（FR-01）
 *   ② readFrRegressCap 三态 fail-soft：缺省 null/合法 N/off=0/坏值 null（含 CRLF 容错）（FR-02）
 *   ③ 既有面零回归：本仓 local.yaml 键在场（自举断言）+ verify-postcheck 导出面既有套件回归（FR-02/03）
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
  // 无帽（null/undefined）→ 原对象零变化
  assert.equal(applyFrRegressCap(fr, null).fr, fr, 'null 无帽原对象')
  assert.equal(applyFrRegressCap(fr, undefined).fr, fr, 'undefined 无帽原对象')
  assert.equal(applyFrRegressCap(null, 24).fr, null, 'fr 缺席原样')
  // N 内不截
  const inCap = applyFrRegressCap(fr, 200)
  assert.equal(inCap.fr, fr, '帽内零截断原对象')
  assert.equal(inCap.capApplied, null, '帽内无披露')
  // 超帽截断
  const over = applyFrRegressCap(fr, 24)
  assert.equal(over.fr.files.length, 24, '截前 24')
  assert.deepEqual(over.fr.files, fr.files.slice(0, 24), '现有稳定序前缀')
  assert.deepEqual(over.capApplied, { kept: 24, total: 100 }, 'kept/total 披露口径')
  assert.equal(over.fr.frHits.length, 100, 'frHits 保留（触达披露仍按全量计）')
  // off 归零
  const off = applyFrRegressCap(fr, 0)
  assert.deepEqual(off.fr.files, [], 'off 整层归零')
  assert.deepEqual(off.capApplied, { kept: 0, total: 100 }, 'off 披露')
  // 空面零操作
  assert.equal(applyFrRegressCap(FR(0), 24).capApplied, null, '空面无披露')
})

test('② readFrRegressCap 三态 fail-soft（含 CRLF 容错）', () => {
  const d = mkdtempSync(join(tmpdir(), 'frc-'))
  try {
    mkdirSync(join(d, '.sillyspec'), { recursive: true })
    const specBase = join(d, '.sillyspec')
    const p = join(specBase, 'local.yaml')
    writeFileSync(p, 'project:\n  type: generic\n')
    assert.equal(readFrRegressCap(specBase), null, '未配置 null（无帽=现状）')
    writeFileSync(p, 'project:\n  type: generic\nfr_regress_cap: 24\n')
    assert.equal(readFrRegressCap(specBase), 24, '合法 N')
    writeFileSync(p, 'project:\n  type: generic\nfr_regress_cap: off\n')
    assert.equal(readFrRegressCap(specBase), 0, 'off=0')
    writeFileSync(p, 'project:\n  type: generic\nfr_regress_cap: abc\n')
    assert.equal(readFrRegressCap(specBase), null, '坏值 fail-soft null')
    writeFileSync(p, 'project:\n  type: generic\nfr_regress_cap: 99999\n')
    assert.equal(readFrRegressCap(specBase), null, '超界（>2000）fail-soft null')
    // CRLF 容错（local.yaml 常为 CRLF——normalizeLineEndings 入口归一）
    writeFileSync(p, 'project:\r\n  type: generic\r\nfr_regress_cap: 24\r\n')
    assert.equal(readFrRegressCap(specBase), 24, 'CRLF 行尾仍命中')
    rmSync(p, { force: true })
    assert.equal(readFrRegressCap(specBase), null, '不可读 fail-soft null')
  } finally { rmSync(d, { recursive: true, force: true, maxRetries: 3 }) }
})

test('③ 本仓自举：local.yaml 键在场 + 缺省消费方语义锚', () => {
  const yaml = readFileSync(join(ROOT, '.sillyspec', 'local.yaml'), 'utf8')
  assert.match(yaml, /^fr_regress_cap:[ \t]*24[ \t]*$/m, '本仓已落地 fr_regress_cap: 24（自举——本变更收口即吃到帽）')
  // 键读取单源消费（组面接线在 runModuleSubset fr 段——源码锚）
  const src = readFileSync(join(ROOT, 'src', 'verify-postcheck.js'), 'utf8')
  assert.ok(src.includes('applyFrRegressCap(fr, frCap)'), '组面接线在位（单一消费点）')
  assert.ok(src.includes('归 pre-push/CI 门'), 'loud 披露去向在位')
})
