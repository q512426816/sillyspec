/**
 * docs migrate 单测（change: 2026-09-08-docs-fix-capability，task-04）
 *
 * 覆盖 FR-2（docs-migrate.js 薄模块）：
 *   planDocsMigrate 正确性（前缀过滤/newRef 重组/行号保留）
 *   dry-run 零写盘（内容与 mtime 均不变）
 *   --apply 写盘 + postCheck 失效数报告
 *   unverified 标记（目标不存在）
 *   from=to 反例（零计划）
 *   exit code 契约（dry-run 恒 0；--apply unverified>0 或 postCheck 失效 → 1）
 *
 * fixture 全 tmp（mkdtempSync）独立互不依赖；Windows 兼容。
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { planDocsMigrate, runDocsMigrate } from '../src/docs-migrate.js'

function makeFixture(files) {
  const d = mkdtempSync(join(tmpdir(), 'dcmig-'))
  for (const [rel, content] of Object.entries(files)) {
    const p = join(d, rel)
    mkdirSync(join(p, '..'), { recursive: true })
    writeFileSync(p, content, 'utf8')
  }
  return d
}

function cleanup(d) { try { rmSync(d, { recursive: true, force: true }) } catch {} }

describe('FR-2 planDocsMigrate', () => {
  it('前缀过滤 + newRef 重组 + 行号保留', () => {
    const d = makeFixture({
      'docs/d.md': '见 `modules/agent/service.py:361` 与 `backend/other.py:10`\n',
      'backend/app/modules/agent/service.py': 'def foo():\n    pass\n',
    })
    try {
      const { plans, scanned } = planDocsMigrate({
        projectRoot: d,
        from: 'modules/',
        to: 'backend/app/modules/',
      })
      assert.equal(scanned, 1)
      assert.equal(plans.length, 1, '只迁移前缀匹配的引用')
      assert.equal(plans[0].ref, 'modules/agent/service.py:361')
      assert.equal(plans[0].newRef, 'backend/app/modules/agent/service.py:361')
      assert.equal(plans[0].verified, true, '目标存在 → verified')
    } finally { cleanup(d) }
  })

  it('unverified 标记（目标不存在）', () => {
    const d = makeFixture({
      'docs/d.md': '见 `modules/typo/file.py:10`\n',
    })
    try {
      const { plans } = planDocsMigrate({
        projectRoot: d,
        from: 'modules/',
        to: 'backend/app/modules/',
      })
      assert.equal(plans.length, 1)
      assert.equal(plans[0].verified, false, '目标不存在 → unverified')
    } finally { cleanup(d) }
  })

  it('from=to 反例（零计划）', () => {
    const d = makeFixture({
      'docs/d.md': '见 `modules/a.py:1`\n',
    })
    try {
      const { plans } = planDocsMigrate({ projectRoot: d, from: 'modules/', to: 'modules/' })
      assert.equal(plans.length, 0, 'from=to 无迁移计划（前缀已匹配，newRef === ref）')
    } finally { cleanup(d) }
  })
})

describe('FR-2 runDocsMigrate', () => {
  it('dry-run 零写盘', () => {
    const d = makeFixture({
      'docs/d.md': '见 `modules/a.py:1`\n',
      'backend/app/modules/a.py': 'def foo():\n    pass\n',
    })
    try {
      const before = readFileSync(join(d, 'docs/d.md'), 'utf8')
      runDocsMigrate({ projectRoot: d, from: 'modules/', to: 'backend/app/modules/' })
      const after = readFileSync(join(d, 'docs/d.md'), 'utf8')
      assert.equal(after, before, 'dry-run 文档内容不变')
    } finally { cleanup(d) }
  })

  it('--apply 写盘 + postCheck 复核', () => {
    const d = makeFixture({
      'docs/d.md': '见 `modules/a.py:1`\n',
      'backend/app/modules/a.py': 'def foo():\n    pass\n',
    })
    try {
      const r = runDocsMigrate({ projectRoot: d, from: 'modules/', to: 'backend/app/modules/', apply: true })
      const after = readFileSync(join(d, 'docs/d.md'), 'utf8')
      assert.ok(after.includes('backend/app/modules/a.py:1'), '写盘后引用已迁移')
      assert.equal(r.applied, 1)
      assert.ok(r.postCheck, 'postCheck 存在')
      assert.equal(r.postCheck.invalid, 0, '迁移后 docs check 全绿（新路径真实存在）')
    } finally { cleanup(d) }
  })

  it('--apply unverified>0 → unverified 计数非零', () => {
    const d = makeFixture({
      'docs/d.md': '见 `modules/typo/file.py:10`\n',
    })
    try {
      const r = runDocsMigrate({ projectRoot: d, from: 'modules/', to: 'backend/app/modules/', apply: true })
      assert.equal(r.unverified, 1, 'unverified 计数 1')
      assert.ok(r.postCheck, 'postCheck 存在')
    } finally { cleanup(d) }
  })
})
