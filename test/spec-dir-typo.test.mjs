import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { detectSpecDirTypo } from '../src/spec-dir-typo.js'

// 造临时项目根：含规范 .sillyspec/.runtime，可选附加一个变体目录
function makeFixture(variant) {
  const root = mkdtempSync(join(tmpdir(), 'spec-typo-'))
  const specRoot = join(root, '.sillyspec')
  mkdirSync(join(specRoot, '.runtime'), { recursive: true })
  if (variant) mkdirSync(join(root, variant), { recursive: true })
  return { root, runtimeRoot: join(specRoot, '.runtime') }
}

test('detectSpecDirTypo：存在 .silyspec 变体（少 l）时命中', () => {
  const fx = makeFixture('.silyspec')
  try {
    const r = detectSpecDirTypo(fx.runtimeRoot)
    assert.ok(r, '应检测到变体')
    assert.match(r.typoDir, /\.silyspec[\\/]?$/)
    assert.equal(r.canonical, '.sillyspec')
  } finally {
    rmSync(fx.root, { recursive: true, force: true })
  }
})

test('detectSpecDirTypo：.sillyspc 变体（漏 e）也命中', () => {
  const fx = makeFixture('.sillyspc')
  try {
    const r = detectSpecDirTypo(fx.runtimeRoot)
    assert.ok(r, '编辑距离 ≤2 应命中')
    assert.match(r.typoDir, /\.sillyspc/)
  } finally {
    rmSync(fx.root, { recursive: true, force: true })
  }
})

test('detectSpecDirTypo：无变体时返回 null', () => {
  const fx = makeFixture(null)
  try {
    assert.equal(detectSpecDirTypo(fx.runtimeRoot), null)
  } finally {
    rmSync(fx.root, { recursive: true, force: true })
  }
})

test('detectSpecDirTypo：编辑距离 >2 的目录不误报（.sillyhub）', () => {
  const fx = makeFixture('.sillyhub')
  try {
    assert.equal(detectSpecDirTypo(fx.runtimeRoot), null)
  } finally {
    rmSync(fx.root, { recursive: true, force: true })
  }
})

test('detectSpecDirTypo：runtimeRoot 为空返回 null（fail-safe）', () => {
  assert.equal(detectSpecDirTypo(null), null)
  assert.equal(detectSpecDirTypo(''), null)
  assert.equal(detectSpecDirTypo(undefined), null)
})
