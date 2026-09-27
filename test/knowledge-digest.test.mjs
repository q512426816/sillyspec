/**
 * 2026-09-27-knowledge-digest 防回归：
 * ① collectKnowledgeDigest 四信号扫描与阈值（rot>100 / inbox>20 / 伪域>0（unmapped 基线消音）/ 坏绑定>0）
 * ② suggestDomainFromFiles 交付路径→建议域（backend 模块归属最强/daemon/frontend/src 段）
 * ③ renderKnowledgeDigestText 文本出口 + healthy 静默态
 * ④ CLI knowledge digest --json 端到端
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { collectKnowledgeDigest, renderKnowledgeDigestText, suggestDomainFromFiles } from '../src/knowledge-digest.js'

const tmpRoots = []
function mk(p) { const d = mkdtempSync(join(tmpdir(), p)); tmpRoots.push(d); return d }
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

function fixture({ rotCount = 0, inboxCount = 0, autoDomain = false, unmappedCount = 0, unmappedBaseline = null, badBinding = false }) {
  const root = mk('kd-')
  const specBase = join(root, '.sillyspec')
  mkdirSync(join(specBase, 'knowledge', 'fr'), { recursive: true })
  mkdirSync(join(root, 'backend', 'app', 'modules', 'platform_sync', 'tests'), { recursive: true })
  writeFileSync(join(root, 'backend', 'app', 'modules', 'platform_sync', 'tests', 't.py'), 'x = 1\n')
  const frLines = ['---', 'author: t', '---', '', '# FR 索引 — core', '']
  frLines.push('## FR-core-001 行为一', '状态：active', rotCount > 0 ? '待复核：2026-09-27-某变更' : null,
    '', '测试绑定：', '<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->',
    '- row: src-change:task-01:FR-01',
    `  tests: ${badBinding ? 'nope-missing.test.ts' : 'backend/app/modules/platform_sync/tests/t.py'}`,
    '  reason: spec', '  state: candidate', '  discovery: machine', '  confirmed_by: null', '  confirmed_at: null', '')
  frLines.filter(Boolean).forEach(l => { })
  writeFileSync(join(specBase, 'knowledge', 'fr', 'core.md'), frLines.filter(l => l !== null).join('\n') + '\n')
  if (rotCount > 1) {
    const extra = []
    for (let i = 2; i <= rotCount; i++) extra.push(`## FR-core-${String(i).padStart(3, '0')} 行为${i}`, '状态：active', '待复核：2026-09-27-某变更', '')
    writeFileSync(join(specBase, 'knowledge', 'fr', 'core.md'), frLines.filter(l => l !== null).join('\n') + '\n' + extra.join('\n') + '\n')
  }
  if (autoDomain) {
    writeFileSync(join(specBase, 'knowledge', 'fr', 'auto-backend.md'), '---\nauthor: t\n---\n\n# FR 索引 — auto-backend\n\n## FR-auto-backend-001 伪域条目\n状态：active\n')
  }
  if (unmappedCount > 0) {
    const lines = ['---', 'author: t', '---', '', '# FR 索引 — unmapped', '']
    for (let i = 1; i <= unmappedCount; i++) lines.push(`## FR-unmapped-${String(i).padStart(3, '0')} 池条目${i}`, '状态：active', '')
    writeFileSync(join(specBase, 'knowledge', 'fr', 'unmapped.md'), lines.join('\n') + '\n')
  }
  if (inboxCount > 0) {
    const lines = ['# 未归类知识', '']
    for (let i = 1; i <= inboxCount; i++) lines.push(`## 2026-06-05 — 收件箱条目${i}：某坑的描述`)
    writeFileSync(join(specBase, 'knowledge', 'uncategorized.md'), lines.join('\n') + '\n')
  }
  if (unmappedBaseline != null) {
    writeFileSync(join(specBase, 'local.yaml'), `fr_unmapped_baseline: ${unmappedBaseline}\n`)
  }
  return { root, specBase }
}

test('① 四信号阈值：全在阈内 healthy；各类超阈逐项进摘要；unmapped 基线消音', () => {
  const q = fixture({})
  const d = collectKnowledgeDigest({ specBase: q.specBase, projectRoot: q.root })
  assert.equal(d.healthy, true, '空库healthy')
  assert.equal(d.signals.length, 0)
  assert.ok(renderKnowledgeDigestText(d).includes('安静即健康态'), 'healthy 文案')

  const r = fixture({ rotCount: 101 })
  const dr = collectKnowledgeDigest({ specBase: r.specBase, projectRoot: r.root })
  assert.equal(dr.totals.rot, 101)
  assert.ok(dr.signals.some(s => s.kind === 'rot' && s.count === 101), 'rot 超阈进摘要')

  const i = fixture({ inboxCount: 21 })
  const di = collectKnowledgeDigest({ specBase: i.specBase, projectRoot: i.root })
  assert.ok(di.signals.some(s => s.kind === 'inbox' && s.count === 21), 'inbox 超阈进摘要')

  const a = fixture({ autoDomain: true })
  const da = collectKnowledgeDigest({ specBase: a.specBase, projectRoot: a.root })
  assert.ok(da.signals.some(s => s.kind === 'pseudo-domain' && s.count === 1), 'auto-* 伪域恒计')

  const u = fixture({ unmappedCount: 30, unmappedBaseline: 30 })
  const du = collectKnowledgeDigest({ specBase: u.specBase, projectRoot: u.root })
  assert.equal(du.totals.pseudo, 0, 'unmapped 基线内消音')
  const u2 = fixture({ unmappedCount: 35, unmappedBaseline: 30 })
  const du2 = collectKnowledgeDigest({ specBase: u2.specBase, projectRoot: u2.root })
  assert.equal(du2.totals.pseudo, 5, '超基线只报增量 5')

  const b = fixture({ badBinding: true })
  const db = collectKnowledgeDigest({ specBase: b.specBase, projectRoot: b.root })
  assert.equal(db.totals.unresolvedBindings, 1)
  assert.ok(db.signals.some(s => s.kind === 'binding-unresolved' && /repair-paths/.test(s.suggestion)), '坏绑定给 repair 指引')
})

test('② suggestDomainFromFiles：backend 模块归属最强 → src 段 → 目录段兜底', () => {
  assert.equal(suggestDomainFromFiles(['backend/app/modules/platform_sync/router.py', 'frontend/x.tsx']), 'platform_sync')
  assert.equal(suggestDomainFromFiles(['sillyhub-daemon/src/a.ts']), 'daemon')
  assert.equal(suggestDomainFromFiles(['frontend/src/app/page.tsx']), 'frontend')
  assert.equal(suggestDomainFromFiles(['src/flow.js', 'src/run/gates.js']), 'src', '扁平 src 布局取首段（monorepo 子包由 <pkg>/src/ 规则在前覆盖）')
  assert.equal(suggestDomainFromFiles(['docs/a.md']), 'docs')
  assert.equal(suggestDomainFromFiles([]), null)
})

test('④ CLI knowledge digest --json 端到端', () => {
  const q = fixture({ autoDomain: true, inboxCount: 25 })
  const bin = join(dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'sillyspec.js')
  const out = execFileSync('node', [bin, 'knowledge', 'digest', '--json'], { cwd: q.root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  const j = JSON.parse(out)
  assert.equal(j.ok, true)
  assert.ok(Array.isArray(j.signals) && j.signals.length >= 2, 'json 出信号数组（平台 RPC 消费面）')
  assert.ok(j.signals.some(s => s.kind === 'pseudo-domain'))
  assert.ok(j.signals.some(s => s.kind === 'inbox'))
})
