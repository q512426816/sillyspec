/**
 * gate 失败明细稳定路径落盘 + known_failures 豁免提示带路径测试（quick-D/E，2026-09-20 报告
 * 问题 D/E）。
 *
 * 1. writeGateResultArtifact（src/machine-interface.js）：gate 信封落
 *    .runtime/verify-runs/gate-<stage>-<change>.json（稳定路径每次覆盖，fail-soft）
 * 2. writeVerifyGatePointer（src/run/gates.js）：verify --done 阻断时落
 *    verify-runs/gate-last-<change>.json 稳定锚点（指向 ts 目录产物），blocked 时打印 📄 行
 * 3. E：known_failures 豁免提示文案含 local.yaml 路径（源码级断言——runGate 需真进度库，
 *    提示行构造在 machine-interface.js 单点，precedent：acceptance-matrix-probe 归属并集断言）
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

import { writeGateResultArtifact } from '../src/machine-interface.js'
import { writeVerifyGatePointer } from '../src/run/gates.js'

test('writeGateResultArtifact：稳定路径落盘信封（每次覆盖）', () => {
  const specBase = mkdtempSync(join(tmpdir(), 'gfa-'))
  try {
    const env1 = { ok: false, errors: ['❌ target_files 对账阻断：2 条「声明未做」'], checks: [{ id: 'artifacts', ok: false, errors: ['明细一', '明细二'] }] }
    const p1 = writeGateResultArtifact({ specBase, stage: 'verify', changeName: 'c-d', envelope: env1 })
    assert.ok(p1 && existsSync(p1), `落盘成功（${p1}）`)
    assert.ok(p1.includes(join('verify-runs', 'gate-verify-c-d.json')), '稳定路径形态（gate-<stage>-<change>.json，不随 ts 变）')
    const onDisk = JSON.parse(readFileSync(p1, 'utf8'))
    assert.equal(onDisk.envelope.ok, false)
    assert.deepEqual(onDisk.envelope.checks[0].errors, ['明细一', '明细二'], '失败明细进落盘——stdout 截断时 agent 直读此文件')
    // 覆盖语义：二写同路径替换
    const p2 = writeGateResultArtifact({ specBase, stage: 'verify', changeName: 'c-d', envelope: { ok: true, checks: [] } })
    assert.equal(p2, p1, '同 stage+change 稳定覆盖同一路径')
    assert.equal(JSON.parse(readFileSync(p2, 'utf8')).envelope.ok, true)
  } finally {
    try { rmSync(specBase, { recursive: true, force: true }) } catch {}
  }
})

test('writeVerifyGatePointer：阻断锚点文件 + blocked 打印 📄 行', () => {
  const runtimeRoot = mkdtempSync(join(tmpdir(), 'gvp-'))
  const capErr = console.error
  const errs = []
  console.error = (...a) => { errs.push(a.join(' ')) }
  try {
    const p = writeVerifyGatePointer({ runtimeRoot, changeName: 'c-e', blocked: true, note: 'target_files ②类阻断' })
    assert.ok(p && existsSync(p), `锚点落盘（${p}）`)
    assert.ok(p.endsWith('gate-last-c-e.json'), '稳定锚点路径形态')
    const onDisk = JSON.parse(readFileSync(p, 'utf8'))
    assert.equal(onDisk.blocked, true)
    assert.ok(onDisk.latest_run_dir.includes('verify-runs'), '指向本轮 ts 目录')
    assert.ok(onDisk.artifacts_hint.some(h => h.includes('reconcile-result.json')), '产物提示含 reconcile-result.json（missing 数组所在）')
    assert.ok(errs.some(l => l.includes('稳定锚点') && l.includes(p)), `blocked 时打印 📄 指引行（实际 ${JSON.stringify(errs)}）`)
    // 放行态不打印指引（噪音面控制）
    errs.length = 0
    writeVerifyGatePointer({ runtimeRoot, changeName: 'c-e', blocked: false })
    assert.ok(!errs.some(l => l.includes('稳定锚点')), '放行态不打印指引行')
  } finally {
    console.error = capErr
    try { rmSync(runtimeRoot, { recursive: true, force: true }) } catch {}
  }
})

test('E：known_failures 豁免提示含 local.yaml 清单位置（源码级单点断言）', () => {
  const src = readFileSync(fileURLToPath(new URL('../src/machine-interface.js', import.meta.url)), 'utf8')
  const m = src.match(/known_failures 豁免（\$\{vt\.reason \|\| ''\}）；[\s\S]{0,120}/)
  assert.ok(m, '豁免提示构造行在场')
  assert.ok(m[0].includes(`join(specRoot, 'local.yaml')`), `提示文案带清单位置（local.yaml 路径）——复核不用先翻一遍（实际片段：${m[0].slice(0, 160)}）`)
})
