/**
 * archive 三重核对机械化（ql-20260909-004）：auditModuleImpactAgainstDiff + prompt 注入占位。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { execSync } from 'child_process'
import { auditModuleImpactAgainstDiff } from '../src/archive-delta.js'

function mkFx({ impactBody, extraBase = null } = {}) {
  const cwd = mkdtempSync(join(tmpdir(), 'sillyspec-arc-'))
  execSync('git init -q', { cwd })
  execSync('git config user.email t@t && git config user.name t', { cwd })
  const changeDir = join(cwd, '.sillyspec', 'changes', 'c1')
  mkdirSync(join(cwd, 'src'), { recursive: true })
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(cwd, 'src', 'a.js'), 'x\n')
  if (extraBase) writeFileSync(join(cwd, extraBase), 'base' + String.fromCharCode(10))
  execSync('git add -A && git commit -qm base', { cwd })
  writeFileSync(join(cwd, 'src', 'a.js'), 'y\n')  // working tree diff: src/a.js
  writeFileSync(join(changeDir, 'module-impact.md'), impactBody || [
    '# 模块影响分析（Module Impact）— c1', '',
    '## 模块影响矩阵', '',
    '| 模块 | 变更文件 | 影响类型 |',
    '|---|---|---|',
    '| core | `src/a.js` | 逻辑变更 |', '',
  ].join('\n'))
  return { cwd, changeDir }
}

test('一致：module-impact 列文件 = diff 文件 → ok', () => {
  const fx = mkFx({})
  try {
    const r = auditModuleImpactAgainstDiff({ cwd: fx.cwd, changeName: 'c1' })
    assert.equal(r.ok, true, JSON.stringify(r.mismatches))
    assert.ok(r.summary.includes('一致'))
  } finally { rmSync(fx.cwd, { recursive: true, force: true }) }
})

test('漏标：跟踪文件 src/c.js 改动而 module-impact 未列 → mismatches 点名', () => {
  // 未跟踪新文件不经 resolveMainChangedFiles（working-tree 并入面是 worktree meta 场景）——
  // 用跟踪文件的未提交修改制造真实 diff（与「一致」用例同口径），验证集合比对语义
  const fx = mkFx({ extraBase: 'src/c.js' })
  try {
    writeFileSync(join(fx.cwd, 'src', 'c.js'), 'changed\n')
    const r = auditModuleImpactAgainstDiff({ cwd: fx.cwd, changeName: 'c1' })
    assert.equal(r.ok, false)
    assert.ok(r.mismatches.some(x => x.includes('src/c.js')), JSON.stringify(r.mismatches))
  } finally { rmSync(fx.cwd, { recursive: true, force: true }) }
})

test('缺失 module-impact → 降级提示（不抛）', () => {
  const fx = mkFx({})
  try {
    writeFileSync(join(fx.cwd, '.sillyspec', 'changes', 'c1', 'module-impact.md'), '')
    rmSync(join(fx.changeDir, 'module-impact.md'))
    const r = auditModuleImpactAgainstDiff({ cwd: fx.cwd, changeName: 'c1' })
    assert.equal(r.ok, false)
    assert.ok(r.mismatches[0].includes('不存在'))
  } finally { rmSync(fx.cwd, { recursive: true, force: true }) }
})

test('archive.js prompt 含注入占位 + 指引消费报告', async () => {
  const { definition } = await import('../src/stages/archive.js')
  const step = definition.steps.find(s => (s.name || '').includes('module-impact'))
  assert.ok(step, 'extract-module-impact 步在场')
  assert.ok(step.prompt.includes('{ARCHIVE_IMPACT_AUDIT}'), '注入占位在场')
  assert.ok(step.prompt.includes('不要重跑 git diff 手工比对'), '消费指引在场')
})
