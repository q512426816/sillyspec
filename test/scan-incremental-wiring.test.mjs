/**
 * scan-incremental 接线单测（change: 2026-11-14-scan-incremental / task-03）。
 * 三块：worktree-guard mode='scan-incremental' 白名单内放行/外拦截（D-006 核心行为）、
 * bumpScanDocBaselines generator 透传与统一推进机制（FR-05）、CLI 帮助文本新 flag（FR-07）。
 * stage.js 启动段探测/guard 写入与 finalize 增量分支属集成面，由 task-06 跨仓实测覆盖。
 */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { shouldBlockWrite } from '../src/hooks/worktree-guard.js'
import { bumpScanDocBaselines } from '../src/scan-postcheck.js'
import { SCAN_REQUIRED_DOCS } from '../src/constants.js'
import { fileURLToPath } from 'node:url'

let tmp
before(() => { tmp = mkdtempSync(join(tmpdir(), 'scan-wire-')) })
after(() => { try { rmSync(tmp, { recursive: true, force: true }) } catch {} })

function mkSpec({ guard, docs = true } = {}) {
  const specRoot = join(tmp, 'spec')
  const scanDir = join(specRoot, 'docs', 'proj', 'scan')
  mkdirSync(scanDir, { recursive: true })
  mkdirSync(join(specRoot, 'docs', 'proj', 'modules'), { recursive: true })
  if (docs) {
    for (const d of ['ARCHITECTURE.md', 'PROJECT.md']) {
      writeFileSync(join(scanDir, d), `---\nsource_commit: aaaaaaa\nupdated_at: 2020-01-01T00:00:00.000Z\n---\n\n# ${d}\n`)
    }
  }
  if (guard) {
    const stateDir = join(specRoot, '.runtime', 'state')
    mkdirSync(stateDir, { recursive: true })
    writeFileSync(join(stateDir, 'scan-guard.json'), JSON.stringify(guard, null, 2))
  }
  return { specRoot, scanDir }
}

const OLD_BASE_DOC = `---\nsource_commit: aaaaaaa\nupdated_at: 2020-01-01T00:00:00.000Z\n---\n\n# 文档\n`

// ── D-006：worktree-guard mode='scan-incremental' 白名单分支 ────────────────

test('guard 白名单内（重生成篇章文档）→ 放行（source_commit 落后也不拦）', () => {
  const { specRoot } = mkSpec({
    guard: {
      name_zh: '增量扫描守卫', mode: 'scan-incremental',
      incrementalDocs: ['docs/proj/scan/ARCHITECTURE.md', 'docs/proj/modules/mod-a.md'],
      docHashes: {}, sourceCommit: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      startedAt: new Date().toISOString(), forceRescan: false,
    },
  })
  // 文档 frontmatter 基线 aaa << guard bbb——无白名单本应拦截（覆盖保护）
  const r = shouldBlockWrite(join(specRoot, 'docs', 'proj', 'scan', 'ARCHITECTURE.md'), tmp)
  assert.deepEqual(r, { blocked: false })
})

test('guard 白名单内（新增模块卡，磁盘不存在旧文件）→ 放行（membership 即凭据，Review Focus #2）', () => {
  const { specRoot } = mkSpec({
    guard: {
      mode: 'scan-incremental',
      incrementalDocs: ['docs/proj/modules/new-mod.md'],
      sourceCommit: 'bbbbbbbb', forceRescan: false, startedAt: new Date().toISOString(),
    },
  })
  const r = shouldBlockWrite(join(specRoot, 'docs', 'proj', 'modules', 'new-mod.md'), tmp)
  assert.deepEqual(r, { blocked: false })
})

test('guard 白名单外（未受影响文档）→ 照常拦截（增量模式保护更强，D-006）', () => {
  const { specRoot } = mkSpec({
    guard: {
      mode: 'scan-incremental',
      incrementalDocs: ['docs/proj/scan/ARCHITECTURE.md'],
      sourceCommit: 'bbbbbbbb', forceRescan: false, startedAt: new Date().toISOString(),
    },
  })
  // PROJECT.md 基线 aaa ≠ guard bbbb 且不在白名单 → 走原覆盖保护拦截
  const r = shouldBlockWrite(join(specRoot, 'docs', 'proj', 'scan', 'PROJECT.md'), tmp)
  assert.equal(r.blocked, true)
  assert.match(r.reason, /覆盖保护/)
})

test('存量 guard（无 mode）+ 基线落后 → 原行为拦截不变（零回归）', () => {
  const { specRoot } = mkSpec({
    guard: { name_zh: '扫描守卫', sourceCommit: 'bbbbbbbb', forceRescan: false, startedAt: new Date().toISOString() },
  })
  const r = shouldBlockWrite(join(specRoot, 'docs', 'proj', 'scan', 'PROJECT.md'), tmp)
  assert.equal(r.blocked, true)
})

test('mode=scan-incremental 但 incrementalDocs 非数组 → 不走白名单分支（fail-closed 回原保护）', () => {
  const { specRoot } = mkSpec({
    guard: { mode: 'scan-incremental', sourceCommit: 'bbbbbbbb', forceRescan: false, startedAt: new Date().toISOString() },
  })
  const r = shouldBlockWrite(join(specRoot, 'docs', 'proj', 'scan', 'PROJECT.md'), tmp)
  assert.equal(r.blocked, true)
})

// ── FR-05：bumpScanDocBaselines 统一推进机制（generator 透传）──────────────

test('bumpScanDocBaselines：docs=SCAN_REQUIRED_DOCS + generator=sillyspec-scan-incremental → 存在的载体统一推进', () => {
  const { specRoot } = mkSpec({ guard: null }) // 无 guard——bump 是纯文档面操作
  const r = bumpScanDocBaselines({
    cwd: tmp, specDir: specRoot, project: 'proj',
    docs: SCAN_REQUIRED_DOCS, headShort: 'ccccccc', generator: 'sillyspec-scan-incremental',
  })
  // fixture 只建了 2 份载体，其余 5 份跳过（读取失败）
  assert.equal(r.bumped.length, 2)
  assert.equal(r.skipped.length, 5)
  const content = readFileSync(join(specRoot, 'docs', 'proj', 'scan', 'ARCHITECTURE.md'), 'utf8')
  assert.match(content, /source_commit: ccccccc/)
  assert.match(content, /generator: sillyspec-scan-incremental/)
})

// ── FR-07：CLI 帮助文本含新 flag（防「指引指向未登记 flag」死路）───────────

test('command.js 双处登记：knownFlags 白名单 + printStageUsage 帮助文本（防未登记 flag 死路）', () => {
  const src = readFileSync(fileURLToPath(new URL('../src/run/command.js', import.meta.url)), 'utf8')
  // 白名单行（knownFlags Set 内）
  assert.match(src, /'--incremental',\s*'--force-incremental'/)
  // 帮助文本行（printStageUsage scan 专属段）
  assert.match(src, /--incremental（显式请求增量，不可行时警告\+回退全量）/)
  assert.match(src, /--force-incremental（越软门）/)
})
