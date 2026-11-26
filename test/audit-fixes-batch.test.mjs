/**
 * 外部审核修正批（ql-20260909-005）：lint 硬门决策 / 三重核对真接 map。（严格档结论槽用例随 verify 阶段退役——2026-11-26-verify-stage-retire）
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { execSync } from 'child_process'
import { shouldBlockVerifyLint } from '../src/verify-postcheck.js'
import { auditModuleImpactAgainstDiff } from '../src/archive-delta.js'

test('shouldBlockVerifyLint：failed 默认阻断；advisory 逃生；passed/skipped 不拦', () => {
  assert.equal(shouldBlockVerifyLint({ status: 'failed' }), true, 'failed 默认硬门')
  assert.equal(shouldBlockVerifyLint({ status: 'failed' }, { SILLYSPEC_VERIFY_LINT_GATE: 'advisory' }), false, '逃生档放行')
  assert.equal(shouldBlockVerifyLint({ status: 'passed' }), false)
  assert.equal(shouldBlockVerifyLint({ status: 'skipped' }), false)
  assert.equal(shouldBlockVerifyLint(null), false)
})

test('三重核对第三重：矩阵模块列误标 → map 归属不一致点名', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'sillyspec-audit3-'))
  try {
    execSync('git init -q', { cwd })
    execSync('git config user.email t@t && git config user.name t', { cwd })
    const changeDir = join(cwd, '.sillyspec', 'changes', 'c1')
    const mapDir = join(cwd, '.sillyspec', 'docs', 'proj', 'modules')
    mkdirSync(join(cwd, 'src', 'core'), { recursive: true })
    mkdirSync(changeDir, { recursive: true })
    mkdirSync(mapDir, { recursive: true })
    writeFileSync(join(mapDir, '_module-map.yaml'), 'schema_version: 2\nmodules:\n  core:\n    paths:\n      - src/core/\n')
    writeFileSync(join(cwd, 'src', 'core', 'a.js'), 'x\n')
    execSync('git add -A && git commit -qm base', { cwd })
    writeFileSync(join(cwd, 'src', 'core', 'a.js'), 'y\n')
    // 矩阵模块列故意误标 wrong-mod（map 推导应为 core）
    writeFileSync(join(changeDir, 'module-impact.md'), [
      '# 模块影响分析（Module Impact）— c1', '',
      '## 模块影响矩阵', '',
      '| 模块 | 变更文件 | 影响类型 |',
      '|---|---|---|',
      '| wrong-mod | `src/core/a.js` | 逻辑变更 |', '',
    ].join('\n'))
    const r = auditModuleImpactAgainstDiff({ cwd, changeName: 'c1' })
    assert.equal(r.ok, false)
    assert.ok(r.mismatches.some(m => m.includes('map 归属不一致') && m.includes('wrong-mod') && m.includes('core')),
      `第三重点名误标（mismatches：${JSON.stringify(r.mismatches)}）`)
    assert.ok(r.summary.includes('map 归属'), 'summary 含第三重字样')
    // 修对后 → 三重全过
    writeFileSync(join(changeDir, 'module-impact.md'), [
      '# 模块影响分析（Module Impact）— c1', '',
      '## 模块影响矩阵', '',
      '| 模块 | 变更文件 | 影响类型 |',
      '|---|---|---|',
      '| core | `src/core/a.js` | 逻辑变更 |', '',
    ].join('\n'))
    const r2 = auditModuleImpactAgainstDiff({ cwd, changeName: 'c1' })
    assert.equal(r2.ok, true, JSON.stringify(r2.mismatches))
  } finally { rmSync(cwd, { recursive: true, force: true }) }
})
