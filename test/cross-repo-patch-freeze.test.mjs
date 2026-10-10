/**
 * 跨仓 patch 收口冻结回归锁（2026-10-10-cross-repo-patch-freeze）。
 *
 * 用户实证缺口：跨仓变更收口后 change.patch / change-patch.json 只有主仓面——跨仓 diff
 * 正文从未冻结（B/C 档锚内容收口后永久不可复得），轻量道跨仓声明行恒谎报 untouched ⊘。
 *
 * 锁四件事：
 *   1. reconcileCrossRepoPlan patch 采集（D-001/D-003）：B 档 HEAD~1 / C 档 HEAD 窗口正文
 *      + LF 归一 sha256 锚；degraded 仓 patch=null 不出伪件；collectPatch=false 无 patch 键。
 *   2. buildThinSnapshotRows crossRepoRows（D-002@v1）：覆盖判定替代 ⊘ 谎报 + 对账行并表；
 *      缺省参零回归。
 *   3. 无跨仓声明零行为（FR-05）。
 *   4. thin 通道结构契约（FR-04）：两通道 repos[] 条目键一致。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, isAbsolute } from 'node:path'
import { tmpdir } from 'node:os'
import { execSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { reconcileCrossRepoPlan, loadRegisteredRepoKeys } from '../src/scope-audit.js'
import { buildThinSnapshotRows } from '../src/flow-parity.js'
import { parseFileChangeListDetailed } from '../src/change-list.js'

function git(dir, args) {
  return execSync(['git', ...args].join(' '), { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}

function posixPath(p) {
  return isAbsolute(p) ? p.split('\\').join('/') : p
}

/** 主仓 + 注册跨仓仓（local.yaml repos 段）；cross 仓含一笔 init 提交 */
function fixture(name) {
  const main = mkdtempSync(join(tmpdir(), name + '-main-'))
  const cross = mkdtempSync(join(tmpdir(), name + '-cross-'))
  const specBase = join(main, '.sillyspec')
  mkdirSync(join(specBase, 'changes', 'c1'), { recursive: true })
  git(cross, ['init -q'])
  git(cross, ['config user.email t@t.local'])
  git(cross, ['config user.name t'])
  writeFileSync(join(cross, 'README.md'), 'init\n')
  git(cross, ['add -A'])
  git(cross, ['commit -qm init'])
  writeFileSync(join(specBase, 'local.yaml'), 'repos:\n  crossrepo: ' + posixPath(cross) + '\n')
  return { main, cross, specBase }
}

function cleanup(f) {
  try { rmSync(f.main, { recursive: true, force: true }) } catch {}
  try { rmSync(f.cross, { recursive: true, force: true }) } catch {}
}

const sha256Normalized = (text) => createHash('sha256').update(String(text).replace(/\r\n/g, '\n'), 'utf8').digest('hex')

test('FR-01 B 档：跨仓已提交改动 patch 冻结（HEAD~1 字面基点）+ sha256 锚 + 真实三态行', () => {
  const f = fixture('crpf-b')
  try {
    // 跨仓主副本再推一笔（HEAD~1..HEAD 窗口；无 worktree → B' 不命中）
    writeFileSync(join(f.cross, 'src-latest.js'), 'export const a = 1\n')
    git(f.cross, ['add -A'])
    git(f.cross, ['commit -qm latest'])
    const planEntries = [{ path: 'src-latest.js', operation: '新增', repo: 'crossrepo' }]
    const r = reconcileCrossRepoPlan({ cwd: f.main, specBase: f.specBase, changeName: 'c1', planEntries, collectPatch: true })
    assert.equal(r.rows.length, 1, '该仓一行')
    assert.equal(r.rows[0].verdict, 'planned', '声明实改 → planned（不再谎报 untouched）')
    assert.equal(r.rows[0].crossRepo, 'crossrepo')
    assert.ok(r.notes.some((n) => n.includes('跨仓文件')), '跨仓计数注记在场')
    const entry = r.repos.find((x) => x.key === 'crossrepo')
    assert.ok(entry, 'repos[] 有 crossrepo 条目')
    assert.equal(entry.anchor.source, 'head~1-window', 'B 档锚')
    assert.equal(entry.degraded, false)
    assert.ok(typeof entry.patch === 'string' && entry.patch.includes('diff --git a/src-latest.js'),
      'patch 正文含该仓 hunk（HEAD~1 字面基点——B 档 anchor.base 为 null 不出空 patch）')
    assert.equal(entry.patchSha256, sha256Normalized(entry.patch), 'sha256 与正文一致（LF 归一口径）')
  } finally {
    cleanup(f)
  }
})

test('FR-01 C 档：跨仓未提交改动 patch 冻结（HEAD 基点，untracked 自拼 hunk）', () => {
  const f = fixture('crpf-c')
  try {
    // 仅 init 单笔提交（HEAD~1 不存在 → B 档 diff 失败）+ 未提交新文件 → C 档
    writeFileSync(join(f.cross, 'draft-note.md'), 'uncommitted content\nline2\n')
    const planEntries = [{ path: 'draft-note.md', operation: '新增', repo: 'crossrepo' }]
    const r = reconcileCrossRepoPlan({ cwd: f.main, specBase: f.specBase, changeName: 'c1', planEntries, collectPatch: true })
    const entry = r.repos.find((x) => x.key === 'crossrepo')
    assert.ok(entry, 'repos 条目在场')
    assert.equal(entry.anchor.source, 'head-uncommitted-window', 'C 档锚')
    assert.ok(typeof entry.patch === 'string' && entry.patch.includes('b/draft-note.md'),
      'patch 正文含未提交文件自拼 hunk（HEAD 基点）——收口后内容不再丢失')
    assert.equal(entry.patchSha256, sha256Normalized(entry.patch))
    assert.ok(r.rows.some((x) => x.path === 'draft-note.md' && x.verdict === 'planned'), '实改行 planned')
  } finally {
    cleanup(f)
  }
})

test('FR-02/FR-03 降级仓：未注册 repo → patch=null + degradedReason + ⊘ 行诚实留痕', () => {
  const f = fixture('crpf-dg')
  try {
    const planEntries = [{ path: 'x.java', operation: '新增', repo: 'ghost' }]
    const r = reconcileCrossRepoPlan({ cwd: f.main, specBase: f.specBase, changeName: 'c1', planEntries, collectPatch: true })
    const entry = r.repos.find((x) => x.key === 'ghost')
    assert.ok(entry, 'degraded 仓也入 repos[]')
    assert.equal(entry.degraded, true)
    assert.ok(String(entry.degradedReason).includes('未在 local.yaml repos 注册'), '降级原因诚实留痕')
    assert.equal(entry.patch, null, '无窗口不落伪 patch')
    assert.equal(entry.patchSha256, null)
    assert.ok(r.rows.some((x) => x.path === 'x.java' && x.verdict === 'untouched' && x.crossRepo === 'ghost'),
      '⊘ 行形态（与 heavy 降级语义同款）')
    assert.ok(r.notes.some((n) => n.includes('对账降级')), '降级注记进 notes')
  } finally {
    cleanup(f)
  }
})

test('FR-04 结构契约：collectPatch=false 无 patch 两键（additive）；true 时条目键全量', () => {
  const f = fixture('crpf-ct')
  try {
    writeFileSync(join(f.cross, 'a.js'), 'x\n')
    git(f.cross, ['add -A'])
    git(f.cross, ['commit -qm add-a'])
    const planEntries = [{ path: 'a.js', operation: '新增', repo: 'crossrepo' }]
    const lite = reconcileCrossRepoPlan({ cwd: f.main, specBase: f.specBase, changeName: 'c1', planEntries, collectPatch: false })
    assert.equal(lite.repos.length, 1)
    assert.ok(!('patch' in lite.repos[0]) && !('patchSha256' in lite.repos[0]), 'collectPatch=false 不产 patch 键（verify 查询面零新增）')
    const full = reconcileCrossRepoPlan({ cwd: f.main, specBase: f.specBase, changeName: 'c1', planEntries, collectPatch: true })
    for (const k of ['key', 'repoPath', 'anchor', 'totals', 'degraded', 'degradedReason', 'patch', 'patchSha256']) {
      assert.ok(k in full.repos[0], `heavy/thin 共用条目含 ${k}`)
    }
  } finally {
    cleanup(f)
  }
})

test('FR-03 thin 覆盖判定：crossRepoRows 提供时对账行并表替代 ⊘ 补行；缺省参零回归', () => {
  // 纯函数构造：主仓 planned 行 + 跨仓声明——提供对账行 → 跨仓行真实形态且不重复补 ⊘；
  // 不提供 → ⊘ 补行（现行为）
  const ownFiles = ['src/main.js']
  const stats = new Map([['src/main.js', { additions: 3, deletions: 1, kind: 'modified' }]])
  const planEntries = [
    { path: 'src/main.js', operation: '修改', repo: null },
    { path: 'src/remote.js', operation: '新增', repo: 'fe' },
  ]
  const crossRows = [{ path: 'src/remote.js', planned: '新增', additions: 7, deletions: 0, kind: 'new', verdict: 'planned', crossRepo: 'fe' }]
  const withCross = buildThinSnapshotRows({ ownFiles, stats, planEntries, crossRepoRows: crossRows })
  assert.deepEqual(
    withCross.rows.map((r) => [r.path, r.verdict]),
    [['src/main.js', 'planned'], ['src/remote.js', 'planned']],
    '对账行并表 + 覆盖判定生效（无重复 ⊘ 行）'
  )
  assert.equal(withCross.totals.additions, 10, 'totals 计入跨仓行数（heavy 同款合并口径）')
  const without = buildThinSnapshotRows({ ownFiles, stats, planEntries })
  assert.deepEqual(
    without.rows.map((r) => [r.path, r.verdict, r.crossRepo]),
    [['src/main.js', 'planned', undefined], ['src/remote.js', 'untouched', 'fe']],
    '缺省参现行为逐字节（⊘ 补行 + crossRepo 标记）'
  )
})

test('FR-05 无跨仓声明零行为：reconcile 空产物 + buildThinSnapshotRows 无 repos 面', () => {
  const f = fixture('crpf-zero')
  try {
    const r = reconcileCrossRepoPlan({ cwd: f.main, specBase: f.specBase, changeName: 'c1', planEntries: [{ path: 'a.js', operation: '新增' }], collectPatch: true })
    assert.deepEqual(r, { rows: [], repos: [], notes: [] }, '无 repo 条目 → 三产物全空（单仓零调用零行为）')
    assert.deepEqual(loadRegisteredRepoKeys(f.specBase), ['crossrepo'], '注册表读取导出可用')
  } finally {
    cleanup(f)
  }
})

test('FR-03 端到端：design 跨仓段解析带 repo 标注 → reconcile 三态 + patch（thin 链路同参）', () => {
  const f = fixture('crpf-e2e')
  try {
    writeFileSync(join(f.cross, 'src-latest.js'), 'export const a = 1\n')
    git(f.cross, ['add -A'])
    git(f.cross, ['commit -qm latest'])
    // design.md 跨仓子段（与 heavy 通道同款写法——repoKeys 传入才带 repo 标注）
    writeFileSync(join(f.specBase, 'changes', 'c1', 'design.md'), [
      '# 设计记录 — c1', '', '## 文件变更清单', '', '### crossrepo 仓', '',
      '| 操作 | 文件路径 | 说明 |', '|---|---|---|', '| 新增 | src-latest.js | 跨仓交付 |', '',
    ].join('\n'))
    const repoKeys = loadRegisteredRepoKeys(f.specBase)
    const planEntries = parseFileChangeListDetailed(join(f.specBase, 'changes', 'c1', 'design.md'), { keepSillyspecDocs: true, repoKeys })
    assert.ok(planEntries.some((e) => e.repo === 'crossrepo'), '跨仓子段条目带 repo 标注')
    const r = reconcileCrossRepoPlan({ cwd: f.main, specBase: f.specBase, changeName: 'c1', planEntries, collectPatch: true })
    const entry = r.repos.find((x) => x.key === 'crossrepo')
    assert.ok(entry && typeof entry.patch === 'string' && entry.patch.includes('src-latest.js'), 'design 声明驱动 patch 冻结')
    // thin 覆盖链：对账行喂 buildThinSnapshotRows，声明不再落 ⊘
    const snap = buildThinSnapshotRows({ ownFiles: [], stats: new Map(), planEntries, crossRepoRows: r.rows })
    assert.ok(snap.rows.some((x) => x.path === 'src-latest.js' && x.verdict === 'planned' && x.crossRepo === 'crossrepo'),
      'thin 快照行真实三态')
    assert.ok(!snap.rows.some((x) => x.path === 'src-latest.js' && x.verdict === 'untouched'), '⊘ 谎报消失')
  } finally {
    cleanup(f)
  }
})
