/**
 * thin flow done 冻结记录回放夹具（变更 2026-10-07-scope-audit-thin-patch-replay）。
 *
 * 缺陷背景（multi-agent-platform docs/sillyspec/thin-flow-done-no-scope-audit-snapshot.md）：
 * thin 轻量变更 flow done 只冻 change-patch.json + change.patch、不落 execute --done 快照；
 * 归档后 scope-audit 快照缺失 → 实时开放区间兜底 → 无 baseAnchor → HEAD 未提交窗口
 * （干净树=空）→ design 清单全行恒「计划未动 +0/−0」失真。
 *
 * 覆盖（requirements FR-01~03）：
 *   1. FR-01 主路径：快照缺失 + change-patch.json 在 → 三态真实表（计划内带冻结行数）
 *   2. FR-01 failed 留痕：patchStatus=failed → 文件集回放 + 行数 null 档不出伪数据
 *   3. FR-02 冻结语义：后续演进不进表 + --file 冻结切片 + sha256 篡改拒绝
 *   4. FR-03 优先级（2026-10-09-close-trace-single-set 新序）：scopeAudit 子对象 > 旧
 *      scope-audit.json > thin 回放；双缺走开放区间兜底（既有口径）
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { computeChangeScopeAudit, renderScopeAuditTable, getFileDiff, buildFrozenPatch } from '../src/scope-audit.js'

/** git 调用：数组参数不经 shell（Windows 路径安全），stdio pipe 吞输出 */
function sh(cwd, args) {
  return execFileSync('git', ['-C', cwd, ...args], {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  })
}

function cleanup(d) {
  try { rmSync(d, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }) } catch { /* Windows 句柄延迟，重试后仍失败留给 OS Temp 回收 */ }
}

/** 临时 git 仓：main 分支 + 身份配置 + gitignore .sillyspec/（夹具内 spec 产物不进窗口） */
function makeRepo(prefix) {
  const d = mkdtempSync(join(tmpdir(), prefix))
  sh(d, ['init', '-q', '-b', 'main'])
  sh(d, ['config', 'user.email', 't@t.com'])
  sh(d, ['config', 'user.name', 't'])
  writeFileSync(join(d, '.gitignore'), '.sillyspec/\n')
  return d
}

function head(d) { return sh(d, ['rev-parse', 'HEAD']).trim() }

const DESIGN_TABLE = '| 操作 | 文件路径 | 说明 |\n|---|---|---|\n| 修改 | src/a.js | 计划内实改 |\n| 新增 | src/b.js | 计划内新增 |\n| 修改 | src/c.js | 清单声明未动 |\n'

/**
 * 归档 thin 变更夹具：init（baseline）→ 提交交付面（head）→ changes/archive/<名>/ 落
 * design.md + change.patch + change-patch.json（冻结件形态对齐 flow.js flow done 写侧：
 * committed 面走 baseRef..headRef 区间 diff，治理工件目录 untracked 自拼 hunk）。
 */
function makeThinArchive(prefix, { patchStatus = 'ok', changeName = 'thin-demo' } = {}) {
  const d = makeRepo(prefix)
  mkdirSync(join(d, 'src'), { recursive: true })
  writeFileSync(join(d, 'src', 'a.js'), 'a1\na2\n')
  writeFileSync(join(d, 'src', 'c.js'), 'c1\n')
  sh(d, ['add', '-A'])
  sh(d, ['commit', '-q', '-m', 'init'])
  const baseline = head(d)
  // 交付面：a.js 修改（+2）、b.js 新增、extra.js 清单外改动——c.js 保持不动（design 声明但未动的真·untouched）
  writeFileSync(join(d, 'src', 'a.js'), 'a1\na2\na3\na4\n')
  writeFileSync(join(d, 'src', 'b.js'), 'b1\n')
  writeFileSync(join(d, 'src', 'extra.js'), 'x1\n')
  sh(d, ['add', '-A'])
  sh(d, ['commit', '-q', '-m', 'thin work'])
  const headCommit = head(d)

  const changeDir = join(d, '.sillyspec', 'changes', 'archive', changeName)
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(changeDir, 'design.md'), `# design（fixture）\n\n## 文件变更清单\n\n${DESIGN_TABLE}`)

  const ownFiles = ['src/a.js', 'src/b.js', 'src/extra.js', `.sillyspec/changes/archive/${changeName}/design.md`]
  const meta = {
    change: changeName,
    baseline,
    head: headCommit,
    files: ownFiles,
    totals: { files: ownFiles.length, additions: 3, deletions: 0 },
    savedAt: '2026-10-07T15:00:00.000Z',
    note: 'flow done 时点冻结（fixture）',
  }
  if (patchStatus === 'ok') {
    const patchText = (buildFrozenPatch(d, ownFiles, { baseRef: baseline, headRef: headCommit }) || '') + '\n'
    writeFileSync(join(changeDir, 'change.patch'), patchText)
    meta.patchSha256 = createHash('sha256').update(patchText.replace(/\r\n/g, '\n'), 'utf8').digest('hex')
  }
  meta.patchStatus = patchStatus
  writeFileSync(join(changeDir, 'change-patch.json'), JSON.stringify(meta, null, 2) + '\n')
  return { d, changeDir, baseline, headCommit }
}

// ───────────────────────── FR-01：三态真实表 ─────────────────────────

test('FR-01 归档 thin 回放：快照缺失 + change-patch.json 在 → 三态真实表（计划内带冻结行数，不再恒计划未动）', async () => {
  const { d, baseline } = makeThinArchive('sa-thin-')
  try {
    const r = await computeChangeScopeAudit({ cwd: d, changeName: 'thin-demo' })
    assert.equal(r.ok, true, `ok（degradedReason=${r.degradedReason}）`)
    assert.equal(r.mode, 'full-flow')
    assert.equal(r.baseAnchor, baseline, 'baseAnchor = meta.baseline')

    const byPath = new Map(r.rows.map(x => [x.path, x]))
    const a = byPath.get('src/a.js')
    assert.ok(a, '冻结面计划内文件在 rows')
    assert.equal(a.verdict, 'planned', '计划内实改 → planned（不再恒 untouched）')
    assert.equal(a.planned, '修改')
    assert.equal(a.additions, 2, '行数自冻结 patch 按段统计（+2）')
    assert.equal(a.deletions, 0)
    assert.equal(a.kind, 'modified')

    const b = byPath.get('src/b.js')
    assert.ok(b)
    assert.equal(b.verdict, 'planned')
    assert.equal(b.planned, '新增')
    assert.equal(b.kind, 'new', 'new file 段 → kind=new')
    assert.equal(b.additions, 1)

    const x = byPath.get('src/extra.js')
    assert.ok(x, '清单外冻结面文件在 rows')
    assert.equal(x.verdict, 'unplanned', '清单外 → unplanned（评审 P3 覆盖清偿）')
    assert.equal(x.planned, null)
    assert.equal(x.additions, 1)

    const c = byPath.get('src/c.js')
    assert.ok(c, '清单内未进冻结面 → untouched 补行')
    assert.equal(c.verdict, 'untouched')
    assert.equal(c.additions, 0)
    assert.equal(c.deletions, 0)

    assert.ok(!byPath.has('.sillyspec/changes/archive/thin-demo/design.md'), '治理工件不进表（filterDeliverableFiles 同口径）')
    assert.equal(r.totals.files, 4)
    assert.equal(r.totals.additions, 4)

    assert.ok(r.note && r.note.includes('flow done') && r.note.includes('冻结 patch 记录'), `note 点名冻结记录（实际 ${r.note}）`)
    assert.ok(!r.note.includes('快照缺失'), '不再落「快照缺失→开放区间」失真链')

    const out = renderScopeAuditTable(r)
    assert.ok(out.includes('✓ 计划内'), '渲染含计划内标记')
    assert.ok(out.includes('已归档'), '渲染含归档态说明')
  } finally { cleanup(d) }
})

test('FR-01 patchStatus=failed：文件集回放 + 行数 null 档不出伪数据', async () => {
  const { d } = makeThinArchive('sa-thinfail-', { patchStatus: 'failed' })
  try {
    const r = await computeChangeScopeAudit({ cwd: d, changeName: 'thin-demo' })
    assert.equal(r.ok, true)
    assert.equal(r.patchStatus, 'failed')
    const a = r.rows.find(x => x.path === 'src/a.js')
    assert.ok(a)
    assert.equal(a.verdict, 'planned', '文件集独立冻结——三态仍真实')
    assert.equal(a.additions, null, '行数不可得 → null（—）不出伪数据')
    assert.equal(r.totals.additions, 0, 'null 行不入合计')
    assert.ok(r.note && r.note.includes('采集失败'), `note 明示行数不可得原因（实际 ${r.note}）`)
  } finally { cleanup(d) }
})

// ───────────────────────── FR-02：冻结语义 + --file 切片 ─────────────────────────

test('FR-02 冻结语义：后续演进不进表 + --file 冻结切片与 sha256 篡改拒绝', async () => {
  const { d, changeDir } = makeThinArchive('sa-thinfrz-')
  try {
    // 主仓后续演进：新文件 + 冻结面文件再改（未提交）
    writeFileSync(join(d, 'src', 'later.js'), 'later\n')
    writeFileSync(join(d, 'src', 'a.js'), 'a1\na2\na3\na4\nDRIFT\n')

    const r = await computeChangeScopeAudit({ cwd: d, changeName: 'thin-demo' })
    const byPath = new Map(r.rows.map(x => [x.path, x]))
    assert.ok(!byPath.has('src/later.js'), '冻结后主仓新文件不进表')
    assert.equal(byPath.get('src/a.js').additions, 2, '冻结面行数不随后续再改漂移')

    // --file：冻结 patch 切片（收尾时点内容，无 DRIFT 混入）
    const fd = await getFileDiff({ cwd: d, changeName: 'thin-demo', filePath: 'src/a.js' })
    assert.equal(fd.ok, true)
    assert.ok(fd.anchorLabel && fd.anchorLabel.includes('冻结 patch'), `--file 走冻结切片（实际 ${fd.anchorLabel}）`)
    assert.ok(fd.diff && fd.diff.includes('a3') && !fd.diff.includes('DRIFT'), 'diff 为冻结时点内容')

    // 篡改检测（A-F01 同款）：change.patch 被改致 sha256 与 meta 不匹配 → 拒绝出 diff
    writeFileSync(join(changeDir, 'change.patch'), readFileSync(join(changeDir, 'change.patch'), 'utf8') + 'TAMPER\n')
    const bad = await getFileDiff({ cwd: d, changeName: 'thin-demo', filePath: 'src/a.js' })
    assert.equal(bad.ok, false)
    assert.ok(bad.note && bad.note.includes('篡改'), `sha 不匹配 → 告警拒绝（实际 ${bad.note}）`)
  } finally { cleanup(d) }
})

// ───────────────────────── FR-03：优先级与双缺兜底 ─────────────────────────

test('FR-03 优先级：scopeAudit 子对象 > 旧 scope-audit.json > thin 回放；双缺走开放区间兜底', async () => {
  // ⓪ 新形态最高优先：change-patch.json 带 scopeAudit 子对象 → 胜过同名旧 scope-audit.json
  const { d: d0, changeDir: cd0 } = makeThinArchive('sa-thinprio0-')
  try {
    writeFileSync(join(cd0, 'scope-audit.json'), JSON.stringify({
      mode: 'full-flow', ok: true, degradedReason: null, baseAnchor: 'snap0000',
      totals: { files: 1, additions: 999, deletions: 0 },
      rows: [{ path: 'src/a.js', planned: '修改', additions: 999, deletions: 0, kind: 'modified', verdict: 'planned' }],
      excluded: { foreignDeclared: [] }, savedAt: '2026-09-10T00:00:00.000Z',
    }))
    const meta0 = JSON.parse(readFileSync(join(cd0, 'change-patch.json'), 'utf8'))
    meta0.scopeAudit = {
      mode: 'full-flow', ok: true, degradedReason: null, baseAnchor: 'snap1111',
      totals: { files: 1, additions: 777, deletions: 0 },
      rows: [{ path: 'src/a.js', planned: '修改', additions: 777, deletions: 0, kind: 'modified', verdict: 'planned' }],
      excluded: { foreignDeclared: [] }, note: 'flow done 时点冻结（fixture）', closedBy: 'flow done',
    }
    writeFileSync(join(cd0, 'change-patch.json'), JSON.stringify(meta0, null, 2) + '\n')
    const r0 = await computeChangeScopeAudit({ cwd: d0, changeName: 'thin-demo' })
    assert.equal(r0.totals.additions, 777, 'scopeAudit 子对象胜出（旧 scope-audit.json 让位）')
    assert.equal(r0.baseAnchor, 'snap1111')
  } finally { cleanup(d0) }

  // ① 旧形态兜底：change-patch.json 无子对象（旧 thin 冻结件）+ 旧 scope-audit.json 在
  //    → 旧名快照回放赢（行数取快照值），change-patch 回放让位
  const { d, changeDir } = makeThinArchive('sa-thinprio-')
  try {
    writeFileSync(join(changeDir, 'scope-audit.json'), JSON.stringify({
      mode: 'full-flow', ok: true, degradedReason: null, baseAnchor: 'snap0000',
      totals: { files: 1, additions: 999, deletions: 0 },
      rows: [{ path: 'src/a.js', planned: '修改', additions: 999, deletions: 0, kind: 'modified', verdict: 'planned' }],
      excluded: { foreignDeclared: [] }, savedAt: '2026-09-10T00:00:00.000Z',
    }))
    const r = await computeChangeScopeAudit({ cwd: d, changeName: 'thin-demo' })
    assert.equal(r.totals.additions, 999, '快照行数胜出（change-patch 回放让位）')
    assert.ok(r.note.includes('execute --done 时点冻结快照'), 'note 点名快照记录态')
  } finally { cleanup(d) }

  // ② 快照（新子对象与旧名）双缺 → 实时开放区间兜底 + 既有漂移警告口径
  const d2 = makeRepo('sa-thinmiss-')
  try {
    mkdirSync(join(d2, 'src'), { recursive: true })
    writeFileSync(join(d2, 'src', 'a.js'), 'a1\n')
    sh(d2, ['add', '-A'])
    sh(d2, ['commit', '-q', '-m', 'init'])
    const cd2 = join(d2, '.sillyspec', 'changes', 'archive', 'miss-demo')
    mkdirSync(cd2, { recursive: true })
    writeFileSync(join(cd2, 'design.md'), '# design（fixture）\n\n## 文件变更清单\n\n| 操作 | 文件路径 | 说明 |\n|---|---|---|\n| 修改 | src/a.js | 说明 |\n')
    const r2 = await computeChangeScopeAudit({ cwd: d2, changeName: 'miss-demo' })
    assert.equal(r2.ok, true)
    assert.ok(r2.note && r2.note.includes('快照缺失') && r2.note.includes('开放区间'), `双缺走兜底（实际 ${r2.note}）`)
    assert.ok(r2.note.includes('change-patch.json'), '兜底 note 明示冻结件双缺')
    const out = renderScopeAuditTable(r2)
    assert.ok(out.includes('计划未动') && out.includes('快照缺失'), '既有兜底渲染口径不变')
  } finally { cleanup(d2) }
})
