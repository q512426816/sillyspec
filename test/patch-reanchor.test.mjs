/**
 * patch-reanchor.test.mjs — 收口留痕锚点回写直测（2026-10-12-close-trace-freeze-integrity FR-03）。
 *
 * 覆盖验收面：
 *   ① 悬空锚按归属提交回写并重冻 patch（worktree 锚降级溯源字段 + sha256 重锚 + 幂等）；
 *   ② 锚点已可解析时 no-op；
 *   ③ 无归属提交 fail-closed（不改写原文件）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { reAnchorChangePatch, locateChangeDir } from '../src/patch-reanchor.js'

function git(cwd, args) {
  return execFileSync('git', ['-C', cwd, ...args], { stdio: 'pipe' }).toString().trim()
}

function makeRepo() {
  const cwd = mkdtempSync(join(tmpdir(), 'pr-'))
  git(cwd, ['init', '-q', '-b', 'main'])
  git(cwd, ['config', 'user.email', 't@t'])
  git(cwd, ['config', 'user.name', 't'])
  writeFileSync(join(cwd, 'base.txt'), 'base\n')
  git(cwd, ['add', '.'])
  git(cwd, ['commit', '-q', '-m', 'base'])
  return cwd
}

const DANGLING_HEAD = '40622e032cbece20e57db17154d582ce835e67b2'
const DANGLING_BASE = 'c74958a1c702af951b3349cbb46f8836d2ea096c'

function writeChangePatch(changeDir, { head = DANGLING_HEAD, baseline = DANGLING_BASE, files = ['src/a.js'] } = {}) {
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(changeDir, 'change-patch.json'), JSON.stringify({
    change: '2026-10-12-pr-x',
    baseline,
    head,
    files,
    totals: { files: files.length, additions: 10, deletions: 2 },
    savedAt: '2026-10-12T05:11:38.071Z',
    note: 'flow done 时点冻结',
    scopeAudit: { mode: 'full-flow', ok: true, baseAnchor: baseline, totals: { files: 0, additions: 0, deletions: 0 }, rows: [], closedBy: 'flow done' },
    patchSha256: '0'.repeat(64),
    patchStatus: 'ok',
  }, null, 2))
}

test('悬空锚按归属提交回写并重冻 patch', () => {
  const cwd = makeRepo()
  const changeName = '2026-10-12-pr-x'
  const changeDir = join(cwd, '.sillyspec', 'changes', 'archive', changeName)
  try {
    // 主仓侧归属链：base → c1(实现, 主题含变更名) → c2(归档留档, 主题含变更名)
    mkdirSync(join(cwd, 'src'), { recursive: true })
    writeFileSync(join(cwd, 'src', 'a.js'), 'impl\n')
    git(cwd, ['add', 'src/a.js'])
    git(cwd, ['commit', '-q', '-m', `feat: impl (thin ${changeName}) (task-01)`])
    writeChangePatch(changeDir)
    git(cwd, ['add', '.sillyspec'])
    git(cwd, ['commit', '-q', '-m', `chore(archive): ${changeName} 归档留档`])
    const head = git(cwd, ['rev-parse', 'HEAD'])
    const base = git(cwd, ['rev-parse', 'HEAD~2'])

    const r = reAnchorChangePatch({ projectRoot: cwd, changeDir, changeName })
    assert.equal(r.ok, true, `回写失败: ${r.reason}`)
    assert.equal(r.noop, false)
    assert.equal(r.baseline, base, 'baseline=首笔归属提交^')
    assert.equal(r.head, head, 'head=末笔归属提交')

    const meta = JSON.parse(readFileSync(join(changeDir, 'change-patch.json'), 'utf8'))
    assert.equal(meta.baseline, base)
    assert.equal(meta.head, head)
    assert.equal(meta.scopeAudit.baseAnchor, base, 'scopeAudit.baseAnchor 同步回写')
    assert.equal(meta.worktreeBaseline, DANGLING_BASE, '原 worktree 锚降级溯源字段')
    assert.equal(meta.worktreeHead, DANGLING_HEAD)
    const patch = readFileSync(join(changeDir, 'change.patch'), 'utf8')
    assert.match(patch, /diff --git a\/src\/a\.js/, 'change.patch 按主仓区间重生成')
    const sha = createHash('sha256').update(patch.replace(/\r\n/g, '\n'), 'utf8').digest('hex')
    assert.equal(meta.patchSha256, sha, 'patchSha256 与重冻正文一致（LF 归一口径）')
    assert.ok(meta.reanchoredAt)

    // 幂等：重跑 no-op
    const r2 = reAnchorChangePatch({ projectRoot: cwd, changeDir, changeName })
    assert.equal(r2.ok, true)
    assert.equal(r2.noop, true, '锚点已可解析时幂等 no-op')
  } finally {
    rmSync(cwd, { recursive: true, force: true })
  }
})

test('锚点可解析时 no-op', () => {
  const cwd = makeRepo()
  const changeName = '2026-10-12-pr-ok'
  const changeDir = join(cwd, '.sillyspec', 'changes', changeName)
  try {
    writeFileSync(join(cwd, 'x.js'), 'x\n')
    git(cwd, ['add', 'x.js'])
    git(cwd, ['commit', '-q', '-m', `feat: x (${changeName})`])
    const head = git(cwd, ['rev-parse', 'HEAD'])
    writeChangePatch(changeDir, { head, baseline: git(cwd, ['rev-parse', 'HEAD~1']), files: ['x.js'] })
    const before = readFileSync(join(changeDir, 'change-patch.json'), 'utf8')
    const r = reAnchorChangePatch({ projectRoot: cwd, changeDir, changeName })
    assert.equal(r.ok, true)
    assert.equal(r.noop, true)
    assert.equal(readFileSync(join(changeDir, 'change-patch.json'), 'utf8'), before, 'no-op 零改动')
  } finally {
    rmSync(cwd, { recursive: true, force: true })
  }
})

test('无归属提交 fail-closed', () => {
  const cwd = makeRepo()
  const changeName = '2026-10-12-pr-none'
  const changeDir = join(cwd, '.sillyspec', 'changes', 'archive', changeName)
  try {
    writeChangePatch(changeDir)
    const before = readFileSync(join(changeDir, 'change-patch.json'), 'utf8')
    const r = reAnchorChangePatch({ projectRoot: cwd, changeDir, changeName })
    assert.equal(r.ok, false, '无归属提交不得改写')
    assert.match(r.reason, /无可归属提交/)
    assert.equal(readFileSync(join(changeDir, 'change-patch.json'), 'utf8'), before, 'fail-closed 原文件不动')
  } finally {
    rmSync(cwd, { recursive: true, force: true })
  }
})

test('locateChangeDir：活跃区优先，归档后缀匹配兜底', () => {
  const cwd = makeRepo()
  const specBase = join(cwd, '.sillyspec')
  const changeName = '2026-10-12-pr-loc'
  try {
    assert.equal(locateChangeDir(specBase, changeName), null, '无目录 → null')
    const active = join(specBase, 'changes', changeName)
    mkdirSync(active, { recursive: true })
    writeFileSync(join(active, 'design.md'), '# d\n')
    assert.equal(locateChangeDir(specBase, changeName), active, '活跃区命中')
    rmSync(active, { recursive: true, force: true })
    const archName = `2026-10-12-renamed-${changeName}`
    const archDir = join(specBase, 'changes', 'archive', archName)
    mkdirSync(archDir, { recursive: true })
    writeFileSync(join(archDir, 'design.md'), '# d\n')
    assert.equal(locateChangeDir(specBase, changeName), archDir, '归档后缀 -<名> 匹配命中')
  } finally {
    rmSync(cwd, { recursive: true, force: true })
  }
})
