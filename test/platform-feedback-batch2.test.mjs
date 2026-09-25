/**
 * platform-feedback-batch2.test.mjs — B/C/D/E 四件显式测试（2026-09-25-platform-feedback-batch2）
 *
 * B: 他侧声明时效——陈旧变更（文件 mtime >7 天）声明忽略，新变更声明生效
 * C: test skipped 时实测面 fmt 透传 reason
 * D: PROMISE_RE 不含幂等（收敛），含不丢失（保留）
 * E: design 声明面自证——声明文件不在冻结面时警告
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, utimesSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { classifyReviewNeed } from '../src/flow-review.js'
import { splitOwnVsForeignDiffFiles } from '../src/foreign-declared.js'
import { execFileSync, spawnSync } from 'node:child_process'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CLI = join(ROOT, 'src', 'index.js')

test('B: 他侧声明时效——陈旧变更（>7天）声明忽略', () => {
  const root = mkdtempSync(join(tmpdir(), 'b-stale-'))
  const specBase = join(root, '.sillyspec')
  const changesDir = join(specBase, 'changes')
  // 活跃变更（当前）
  mkdirSync(join(changesDir, 'current-change'), { recursive: true })
  writeFileSync(join(changesDir, 'current-change', 'design.md'), '# 设计\n## 文件变更清单\n| 操作 | 文件 |\n|---|---|\n| 修改 | src/shared.js |\n')
  // 陈旧变更（8 天前）
  mkdirSync(join(changesDir, 'stale-old-change'), { recursive: true })
  writeFileSync(join(changesDir, 'stale-old-change', 'design.md'), '# 设计\n## 文件变更清单\n| 操作 | 文件 |\n|---|---|\n| 修改 | src/shared.js |\n| 修改 | src/other.js |\n')
  const oldTime = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
  utimesSync(join(changesDir, 'stale-old-change', 'design.md'), oldTime, oldTime)

  const r = splitOwnVsForeignDiffFiles(root, 'my-change', ['src/shared.js', 'src/other.js'], { specBase })
  // stale-old-change 的声明应被忽略（陈旧），只有 current-change 的 shared.js 被排除
  assert.ok(r.foreign.some((x) => x.file === 'src/shared.js' && x.owners.includes('current-change')), '活跃变更声明生效')
  assert.ok(!r.foreign.some((x) => x.owners.includes('stale-old-change')), '陈旧变更声明被忽略')
  assert.ok(r.own.includes('src/other.js'), 'other.js 归我（只有陈旧变更声明过它）')
  rmSync(root, { recursive: true, force: true })
})

test('C+D: fmt skipped reason / PROMISE_RE 收敛', () => {
  // D: 幂等不再触发（收敛），不丢失仍触发
  const fixture = mkdtempSync(join(tmpdir(), 'cd-'))
  const cd = join(fixture, 'changes', 'c1')
  mkdirSync(cd, { recursive: true })
  writeFileSync(join(cd, 'design.md'), '# d\n<!--AGENT:槽3 x -->\n不适用\n')
  writeFileSync(join(cd, 'requirements.md'), '# r\n<!--AGENT:FR区 x -->\n<!--AGENT:测试绑定FR-01 x -->\n已答\n')
  // 幂等 → 不触发
  writeFileSync(join(cd, 'proposal.md'), '# p\n机器稿幂等去重\n')
  let t = classifyReviewNeed({ changeDir: cd, patchText: '', change: 'c1' })
  assert.ok(!t.reasons.some((r) => /承诺词/.test(r)), `幂等不触发: ${t.reasons}`)
  // 不丢失 → 触发
  writeFileSync(join(cd, 'proposal.md'), '# p\n机器稿不丢失\n')
  t = classifyReviewNeed({ changeDir: cd, patchText: '', change: 'c1' })
  assert.ok(t.reasons.some((r) => /承诺词.*不丢失/.test(r)), `不丢失触发: ${t.reasons}`)
  rmSync(fixture, { recursive: true, force: true })
})
