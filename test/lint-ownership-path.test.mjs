/**
 * lint 归属降档共享 helper（lintOwnershipDowngrade）+ 双路径接线 —— 单测。
 * 2026-10-15-lint-triage-path-unify：消费仓坑档案 verify-lint-triage-path-divergence.md
 * 的修复承载——helper 四态语义（pre-existing 放行 / owned / unattributable / 鉴定链异常
 * 保守硬拦）+ gates.js 与 verify-quality-scan.js 两路径源级接线断言（防分叉复发）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { lintOwnershipDowngrade } from '../src/run/lint-ownership.js'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

/** 捕获 console.warn 输出（恢复原句柄）。 */
function captureWarn() {
  const lines = []
  const orig = console.warn
  console.warn = (...args) => lines.push(args.join(' '))
  return { lines, restore: () => { console.warn = orig } }
}

/** 造注入式 importer：返回可控的 resolveVerifyChangedFiles / triageLintOwnership。 */
function mkImporter({ files = [], verdict = 'pre-existing', throwOnLoad = false } = {}) {
  return async () => {
    if (throwOnLoad) throw new Error('loader boom')
    return {
      resolveVerifyChangedFiles: () => files,
      triageLintOwnership: ({ failureFiles = [], changeFiles = [] }) => {
        if (verdict === 'unattributable') return { verdict: 'unattributable', overlap: [] }
        // 与真实现同口径的最小模拟：零交集=pre-existing，有交集=owned
        const overlap = failureFiles.filter((f) => changeFiles.includes(f))
        return overlap.length > 0
          ? { verdict: 'owned', overlap }
          : { verdict: 'pre-existing', overlap: [] }
      },
    }
  }
}

const base = { cwd: '/repo', changeName: 'demo-change', specBase: '/repo/.sillyspec' }
const lintCheck = { status: 'failed', failureFiles: ['other/module/legacy.py'] }

test('pre-existing（零交集存量债）→ 返回 true 放行 + 打印降档 warning（含存量债文件名）', async () => {
  const cap = captureWarn()
  try {
    const ok = await lintOwnershipDowngrade({
      ...base,
      lintCheck,
      importer: mkImporter({ files: ['src/mine.js'], verdict: 'pre-existing' }),
    })
    assert.equal(ok, true, '零交集应降档放行')
    const text = cap.lines.join('\n')
    assert.match(text, /归属鉴定为 HEAD 存量债/, 'warning 含降档说明')
    assert.match(text, /other\/module\/legacy\.py/, 'warning 列出存量债文件')
  } finally {
    cap.restore()
  }
})

test('owned（失败文件与本变更有交集）→ 返回 false 维持硬拦', async () => {
  const cap = captureWarn()
  try {
    const ok = await lintOwnershipDowngrade({
      ...base,
      lintCheck: { status: 'failed', failureFiles: ['src/mine.js'] },
      importer: mkImporter({ files: ['src/mine.js'], verdict: 'owned' }),
    })
    assert.equal(ok, false, '有交集应硬拦')
    assert.equal(cap.lines.length, 0, '硬拦路径不打印降档 warning')
  } finally {
    cap.restore()
  }
})

test('unattributable（无可识别失败文件）→ 返回 false 保守硬拦', async () => {
  const ok = await lintOwnershipDowngrade({
    ...base,
    lintCheck: { status: 'failed', failureFiles: [] },
    importer: mkImporter({ verdict: 'unattributable' }),
  })
  assert.equal(ok, false, 'unattributable 应保守硬拦')
})

test('鉴定链异常（importer 抛错）→ 返回 false 保守硬拦', async () => {
  const ok = await lintOwnershipDowngrade({
    ...base,
    lintCheck,
    importer: mkImporter({ throwOnLoad: true }),
  })
  assert.equal(ok, false, '鉴定链异常应保守硬拦')
})

test('源级接线：gates.js 与 verify-quality-scan.js 两路径均走 lintOwnershipDowngrade（防分叉复发）', () => {
  const gates = readFileSync(join(repoRoot, 'src/run/gates.js'), 'utf8')
  const scan = readFileSync(join(repoRoot, 'src/run/verify-quality-scan.js'), 'utf8')
  // gates --done 路径：helper 调用替换原内联块
  assert.match(gates, /lintOwnershipDowngrade/, 'gates.js 应调用共享 helper')
  assert.ok(!gates.includes('let lintOwnership = null'), 'gates.js 原内联判定应已移除（单一来源）')
  // noAI 质量扫描路径：throw 条件须带降档豁免（lintBlocked && !lintAdvisoryDowngraded）
  assert.match(scan, /lintOwnershipDowngrade/, 'verify-quality-scan.js 应调用共享 helper')
  assert.match(scan, /lintBlocked && !lintAdvisoryDowngraded/, 'throw 条件应带降档豁免')
  // 降档仅在 lint 单独失败时判定（testFailed 优先 throw）
  assert.match(scan, /if \(lintBlocked && !testFailed\)/, '降档判定应限定 lint 单独失败场景')
})
