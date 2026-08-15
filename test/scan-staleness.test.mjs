/**
 * scan-staleness 单测（债单 D-7 方案 A，ql-20260815-013）
 *
 * 覆盖：parseSourceCommit（含 CRLF 容错）、computeScanStaleness 四态
 * （fresh/stale/unknown/无目录 null）、阈值边界、prompt 注入占位符替换。
 * fixture 全 tmp git 仓（safeGit 需要 .git），不污染真仓库。
 */
import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execSync } from 'node:child_process'
import { parseSourceCommit, computeScanStaleness, STALENESS_THRESHOLDS } from '../src/scan-staleness.js'

let root, specBase
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'stale-'))
  execSync('git init -q', { cwd: root, stdio: 'pipe' })
  execSync('git config user.email t@t.com', { cwd: root, stdio: 'pipe' })
  execSync('git config user.name t', { cwd: root, stdio: 'pipe' })
  execSync('git commit -q --allow-empty -m base', { cwd: root, stdio: 'pipe' })
  specBase = join(root, '.sillyspec')
})
afterEach(() => { try { rmSync(root, { recursive: true, force: true }) } catch {} })

function scanDoc(sourceCommit) {
  const lines = ['---', 'author: test', 'created_at: 2026-08-15 00:00:00']
  if (sourceCommit) lines.push(`source_commit: ${sourceCommit}`)
  lines.push('---', '', '# ARCHITECTURE', '', '内容')
  return lines.join('\n') + '\n'
}
function mkScan(content) {
  mkdirSync(join(specBase, 'docs', 'demo', 'scan'), { recursive: true })
  writeFileSync(join(specBase, 'docs', 'demo', 'scan', 'ARCHITECTURE.md'), content)
}
function advance(n, msg) {
  for (let i = 0; i < n; i++) execSync(`git commit -q --allow-empty -m "${msg}-${i}"`, { cwd: root, stdio: 'pipe' })
}

describe('parseSourceCommit', () => {
  it('LF frontmatter 提取 / 无字段 null / CRLF 容错', () => {
    assert.equal(parseSourceCommit(scanDoc('abc1234def')), 'abc1234def')
    assert.equal(parseSourceCommit(scanDoc(null)), null)
    assert.equal(parseSourceCommit(scanDoc('abc1234def').replace(/\n/g, '\r\n')), 'abc1234def', 'CRLF 容错')
    assert.equal(parseSourceCommit(''), null)
  })
})

describe('computeScanStaleness', () => {
  it('无 scan 目录 → null（绿地项目跳过）', () => {
    assert.equal(computeScanStaleness({ projectRoot: root, specBase, projectName: 'demo' }), null)
  })

  it('有目录无 source_commit → unknown（旧版文档降级说明）', () => {
    mkScan(scanDoc(null))
    const r = computeScanStaleness({ projectRoot: root, specBase, projectName: 'demo' })
    assert.equal(r.status, 'unknown')
    assert.ok(r.message.includes('无 source_commit'))
  })

  it('落后 0 commit → fresh', () => {
    const head = execSync('git rev-parse HEAD', { cwd: root }).toString().trim()
    mkScan(scanDoc(head))
    const r = computeScanStaleness({ projectRoot: root, specBase, projectName: 'demo' })
    assert.equal(r.status, 'fresh')
    assert.equal(r.behindCommits, 0)
  })

  it('落后 ≥ 阈值 commit → stale（message 含刷新指引）', () => {
    const base = execSync('git rev-parse HEAD', { cwd: root }).toString().trim()
    advance(STALENESS_THRESHOLDS.commits, 'c')
    mkScan(scanDoc(base))
    const r = computeScanStaleness({ projectRoot: root, specBase, projectName: 'demo' })
    assert.equal(r.status, 'stale')
    assert.equal(r.behindCommits, STALENESS_THRESHOLDS.commits)
    assert.ok(r.message.includes('scan --standard --force-rescan'))
    assert.ok(r.message.includes('不要盲信'))
  })

  it('阈值内 → fresh（不误报）', () => {
    const base = execSync('git rev-parse HEAD', { cwd: root }).toString().trim()
    advance(5, 'c')
    mkScan(scanDoc(base))
    const r = computeScanStaleness({ projectRoot: root, specBase, projectName: 'demo' })
    assert.equal(r.status, 'fresh')
    assert.equal(r.behindCommits, 5)
  })

  it('source_commit 不在当前历史 → unknown 降级不抛', () => {
    mkScan(scanDoc('deadbeefdeadbeefdeadbeefdeadbeefdeadbeef'))
    const r = computeScanStaleness({ projectRoot: root, specBase, projectName: 'demo' })
    assert.equal(r.status, 'unknown')
    assert.ok(r.message.includes('不在当前分支历史') || r.message.includes('git 读取失败'))
  })

  it('自定义阈值（commits: 2）生效', () => {
    const base = execSync('git rev-parse HEAD', { cwd: root }).toString().trim()
    advance(3, 'c')
    mkScan(scanDoc(base))
    const r = computeScanStaleness({ projectRoot: root, specBase, projectName: 'demo', thresholds: { commits: 2, days: 3650 } })
    assert.equal(r.status, 'stale')
  })
})

describe('prompt 占位符接线（{SCAN_STALENESS}）', () => {
  it('brainstorm.js step2 prompt 含占位符；prompt.js 有替换分支', async () => {
    const { readFileSync } = await import('node:fs')
    const bs = readFileSync(new URL('../src/stages/brainstorm.js', import.meta.url), 'utf8')
    assert.ok(bs.includes('{SCAN_STALENESS}'), 'brainstorm step2 注入占位符')
    const pj = readFileSync(new URL('../src/run/prompt.js', import.meta.url), 'utf8')
    assert.ok(pj.includes("{SCAN_STALENESS}"), 'prompt.js 有替换分支')
  })
})
