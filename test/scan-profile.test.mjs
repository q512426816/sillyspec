/**
 * scan-profile 显式选择 + 估算 bug 修复 + postcheck profile 感知 的回归测试。
 *
 * 覆盖 2026-07-31 改动：
 *  - computeScanProfile 的 --quick/--standard/--deep 显式 flag 优先于自动判定
 *  - estimateSourceSize 扩展 skipDirs（排除 .next/coverage 等产物目录）+ maxDepth 兜底
 *  - runScanPostCheck 按 profile 取 required 清单（quick→4 份，否则 7 份）
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { computeScanProfile, estimateSourceSize } from '../src/run/scan-profile.js'
import { runScanPostCheck } from '../src/scan-postcheck.js'
import { SCAN_REQUIRED_DOCS_QUICK } from '../src/constants.js'

test('computeScanProfile: --quick/--standard/--deep 显式优先于自动判定', () => {
  const saved = process.argv
  const probe = (argv) => { process.argv = ['node', 'sillyspec', 'scan', ...argv]; return computeScanProfile('.').mode }
  try {
    assert.equal(probe(['--quick']), 'quick')
    assert.equal(probe(['--standard']), 'standard')
    assert.equal(probe(['--deep']), 'deep')
    const auto = probe([])
    assert.ok(['quick', 'standard', 'deep'].includes(auto), `auto 应落在三档之一，实际 ${auto}`)
  } finally {
    process.argv = saved
  }
})

test('estimateSourceSize: 排除 .next/coverage 等构建产物目录（修小项目误判 deep）', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'scan-est-'))
  try {
    mkdirSync(join(tmp, 'src'), { recursive: true })
    mkdirSync(join(tmp, '.next', 'static'), { recursive: true })
    mkdirSync(join(tmp, 'coverage'), { recursive: true })
    writeFileSync(join(tmp, 'src', 'a.js'), 'export const a = 1\n')
    writeFileSync(join(tmp, 'src', 'b.js'), 'export const b = 2\n')
    for (let i = 0; i < 50; i++) writeFileSync(join(tmp, '.next', 'static', `c-${i}.js`), `console.log(${i})\n`)
    for (let i = 0; i < 20; i++) writeFileSync(join(tmp, 'coverage', `v-${i}.js`), `cov(${i})\n`)
    const r = estimateSourceSize(tmp)
    assert.equal(r.fileCount, 2, '只计 src/ 的 2 个 .js，排除 .next(50)/coverage(20) 产物')
    assert.ok(r.sourceBytes < 100, `sourceBytes 应很小，实际 ${r.sourceBytes}`)
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
})

test('estimateSourceSize: maxDepth 兜底防极深嵌套产物被遍历', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'scan-depth-'))
  try {
    let d = tmp
    for (let i = 0; i < 8; i++) { d = join(d, `l${i}`); mkdirSync(d, { recursive: true }) }
    writeFileSync(join(d, 'deep.js'), 'export const deep = 1\n')
    writeFileSync(join(tmp, 'top.js'), 'export const top = 1\n')
    const r = estimateSourceSize(tmp)
    assert.equal(r.fileCount, 1, '深层（超 maxDepth=6）的 deep.js 不计入，只 top.js')
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
})

test('runScanPostCheck: quick 平台模式只要求 4 份，不 failed', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'scan-src-'))
  const specDir = mkdtempSync(join(tmpdir(), 'scan-spec-'))
  try {
    const scanDir = join(specDir, 'docs', basename(cwd), 'scan')
    mkdirSync(scanDir, { recursive: true })
    for (const doc of SCAN_REQUIRED_DOCS_QUICK) {
      writeFileSync(join(scanDir, doc), `---\nauthor: t\ncreated_at: 2026-07-31 00:00:00\nscan_depth: quick\n---\n# ${doc}\n`)
    }
    const result = runScanPostCheck({ cwd, specDir, scanProfile: { mode: 'quick' } })
    assert.notEqual(result.status, 'failed_post_check', `quick 4 份不应 failed，实际 ${result.status}`)
    assert.ok(result.checks.some(c => c.name === 'quick_profile_notice'), '应有 quick_profile_notice informational check')
  } finally {
    rmSync(cwd, { recursive: true, force: true })
    rmSync(specDir, { recursive: true, force: true })
  }
})

test('runScanPostCheck: 非 quick 平台模式缺 3 份仍 failed（向后兼容不破）', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'scan-src2-'))
  const specDir = mkdtempSync(join(tmpdir(), 'scan-spec2-'))
  try {
    const scanDir = join(specDir, 'docs', basename(cwd), 'scan')
    mkdirSync(scanDir, { recursive: true })
    for (const doc of SCAN_REQUIRED_DOCS_QUICK) {
      writeFileSync(join(scanDir, doc), `---\nauthor: t\ncreated_at: 2026-07-31 00:00:00\n---\n# ${doc}\n`)
    }
    const result = runScanPostCheck({ cwd, specDir }) // 无 scanProfile → mode=null → 要求完整 7 份
    assert.equal(result.status, 'failed_post_check', '非 quick 缺 INTEGRATIONS/TESTING/CONCERNS 应 failed')
  } finally {
    rmSync(cwd, { recursive: true, force: true })
    rmSync(specDir, { recursive: true, force: true })
  }
})
