/**
 * 铁律 8 收窄（P2-e，noai-ir-roadmap §5）：CLI 骨架出品盖 generated_by provenance 戳——
 * 「骨架优先，仅手写补文档才手填元数据」的机制依据。锁定：design/taskcard/fourpiece 三类
 * 骨架的 frontmatter 均含 generated_by + author + created_at（validateMetadata 的元数据
 * 要求对 CLI 出品恒满足，铁律从「所有文档手填」收窄为「手写补文档才手填」）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, mkdirSync, readFileSync, existsSync } from 'fs'
import { join, resolve } from 'path'
import { tmpdir } from 'os'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { generateDesignSkeleton } from '../src/design-facts.js'
import { buildTaskcardSkeleton } from '../src/taskcard.js'

const REPO = resolve(fileURLToPath(new URL('.', import.meta.url)), '..')
const CLI = (args, cwd) => execFileSync('node', [join(REPO, 'src', 'index.js'), ...args], { cwd, encoding: 'utf8' })

test('design 骨架：generated_by + author + created_at 三戳齐', () => {
  const md = generateDesignSkeleton({ changeName: 'x', author: 't', now: '2026-09-11 00:00:00' })
  assert.ok(md.includes('generated_by: sillyspec-design-init'), 'provenance 戳')
  assert.ok(md.includes('author: t'))
  assert.ok(md.includes('created_at: 2026-09-11 00:00:00'))
})

test('taskcard 骨架：generated_by 戳在 frontmatter', () => {
  const md = buildTaskcardSkeleton({ taskId: 'task-01', title: 'T', titleZh: '任务', author: 'ttester-prov', now: '2026-09-11 00:00:00' })
  assert.ok(md.includes('generated_by: sillyspec-taskcard'), 'provenance 戳')
  assert.ok(/author: ['"]?ttester-prov/.test(md), 'author 戳（yamlScalar 可加引号）')
})

test('fourpiece-init：三件骨架均盖 generated_by（CLI e2e）', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'fp-prov-'))
  try {
    execFileSync('git', ['init', '-q'], { cwd })
    execFileSync('git', ['config', 'user.email', 't@t'], { cwd })
    execFileSync('git', ['config', 'user.name', 't'], { cwd })
    mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
    CLI(['fourpiece-init', '--change', 'demo-prov', '--spec-dir', join(cwd, '.sillyspec')], cwd)
    for (const f of ['proposal.md', 'requirements.md', 'decisions.md']) {
      const p = join(cwd, '.sillyspec', 'changes', 'demo-prov', f)
      assert.ok(existsSync(p), `${f} 生成`)
      const text = readFileSync(p, 'utf8')
      assert.ok(text.includes('generated_by: sillyspec-fourpiece-init'), `${f} provenance 戳`)
      assert.ok(text.includes('author:'), `${f} author 戳`)
      assert.ok(text.includes('created_at:'), `${f} created_at 戳`)
    }
  } finally {
    try { rmSync(cwd, { recursive: true, force: true }) } catch {}
  }
})
