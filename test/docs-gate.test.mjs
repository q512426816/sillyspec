/**
 * docs gate 测试：ratchet 判定语义 + 基线 IO + runDocsGate 集成（无基线/损坏/init/拦/放）。
 * fixture 用 tmp git 仓 + 真文件（无 git 操作，纯 fs），跑完清理。
 */
import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'os'
import {
  evaluateRatchet, readBaseline, writeBaseline, runDocsGate, BASELINE_FILENAME,
} from '../src/docs-gate.js'

let root
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'docsgate-'))
  mkdirSync(join(root, 'src'), { recursive: true })
  mkdirSync(join(root, 'docs'), { recursive: true })
  mkdirSync(join(root, '.sillyspec'), { recursive: true })
  // 源码 3 行；文档引用 L1 正确、L9 超界（1 处失效）
  writeFileSync(join(root, 'src', 'a.js'), 'export const alphaSym = 1\n// l2\n// l3\n')
  writeFileSync(join(root, 'docs', 'x.md'), '见 `src/a.js:1`（`alphaSym`）；另见 `src/a.js:9`（失效）\n')
})
afterEach(() => { try { rmSync(root, { recursive: true, force: true }) } catch {} })

describe('evaluateRatchet（纯判定）', () => {
  it('current < baseline → 过 + 提示可下调基线', () => {
    const r = evaluateRatchet({ current: 2, baseline: 5 })
    assert.equal(r.ok, true)
    assert.equal(r.delta, -3)
    assert.ok(r.message.includes('下调基线'))
  })
  it('current = baseline → 过', () => {
    const r = evaluateRatchet({ current: 5, baseline: 5 })
    assert.equal(r.ok, true)
    assert.equal(r.delta, 0)
  })
  it('current > baseline → 拦 + 报新增数', () => {
    const r = evaluateRatchet({ current: 8, baseline: 5 })
    assert.equal(r.ok, false)
    assert.equal(r.delta, 3)
    assert.ok(r.message.includes('新增 3 处'))
  })
})

describe('基线 IO', () => {
  it('无文件 → null；写后读回；损坏内容 → NaN', () => {
    assert.equal(readBaseline(root), null)
    writeBaseline(root, 7)
    assert.equal(readBaseline(root), 7)
    writeFileSync(join(root, BASELINE_FILENAME), 'not-a-number\n')
    assert.ok(Number.isNaN(readBaseline(root)))
  })
})

describe('runDocsGate（集成）', () => {
  it('无基线 → exit 2 fail-closed（不悄悄合法化存量）', async () => {
    const r = await runDocsGate({ projectRoot: root, specBase: join(root, '.sillyspec') })
    assert.equal(r.exitCode, 2)
    assert.equal(r.current, 1)
    assert.ok(r.message.includes('--init-baseline'))
  })

  it('--init-baseline → 写基线 = 实测数，exit 0，幂等', async () => {
    const r = await runDocsGate({ projectRoot: root, specBase: join(root, '.sillyspec'), initBaseline: true })
    assert.equal(r.exitCode, 0)
    assert.equal(r.baseline, 1)
    assert.equal(readBaseline(join(root, '.sillyspec')), 1)
    const r2 = await runDocsGate({ projectRoot: root, specBase: join(root, '.sillyspec'), initBaseline: true })
    assert.equal(r2.baseline, 1, '幂等重跑同值')
  })

  it('current ≤ baseline → exit 0 放行（存量既往不咎）', async () => {
    writeBaseline(join(root, '.sillyspec'), 5)
    const r = await runDocsGate({ projectRoot: root, specBase: join(root, '.sillyspec') })
    assert.equal(r.exitCode, 0)
    assert.equal(r.delta, -4)
  })

  it('current > baseline → exit 1 拦截增量', async () => {
    writeBaseline(join(root, '.sillyspec'), 0)
    const r = await runDocsGate({ projectRoot: root, specBase: join(root, '.sillyspec') })
    assert.equal(r.exitCode, 1)
    assert.equal(r.delta, 1)
    assert.ok(r.message.includes('新增 1 处'))
  })

  it('基线损坏 → exit 2', async () => {
    writeFileSync(join(root, '.sillyspec', BASELINE_FILENAME), 'x\n')
    const r = await runDocsGate({ projectRoot: root, specBase: join(root, '.sillyspec') })
    assert.equal(r.exitCode, 2)
  })

  it('全绿 + 基线 0 → exit 0（正常干净仓）', async () => {
    writeFileSync(join(root, 'docs', 'x.md'), '见 `src/a.js:1`（`alphaSym`）\n')
    writeBaseline(join(root, '.sillyspec'), 0)
    const r = await runDocsGate({ projectRoot: root, specBase: join(root, '.sillyspec') })
    assert.equal(r.exitCode, 0)
  })
})
