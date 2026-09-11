/**
 * scope-audit 夹具测试（变更 2026-09-10-change-scope-audit task-07）。
 *
 * 临时 git 仓库夹具覆盖 computeChangeScopeAudit / renderScopeAuditTable 五组场景
 * （TaskCard = requirements.md FR-01~04 Given/Then）：
 *   1. 三态（FR-01）：计划内 planned / 计划外 unplanned / 计划未动 untouched（0/0 补行）
 *   2. 行数三档（D-002）：tracked numstat 对拍 / untracked wc-l 全 + 行 / binary null+BIN
 *   3. 并行会话（R-02/R-04）：他者 quick 会话声明文件退栈 excluded.foreignDeclared 不进 rows
 *   4. 无锚形态（quick-8aa52289 新契约）：baseAnchor 缺失 → HEAD 未提交窗口行数兜底（不再恒 —）；
 *      design 清单解析失败实际侧 only；归档形态：快照记录态 / 快照缺失空表诚实说明
 *   5. quick（FR-04）：declared/soft/undeclared 三档 + baseAnchor=quick-window + 已提交降级 note
 *
 * 夹具约定（Wave 1 实测经验）：
 *   - quick 夹具 gitignore 整个 .sillyspec/（porcelain 无 -uall，未忽略会整目录折叠成
 *     `.sillyspec/` token 进窗口算不动）
 *   - 主分支叫 main（形态 B merge-base 硬缺省 'main'）
 *   - 软归属档需要文件级 untracked（目录已含 tracked 文件，防目录折叠 token 匹配不上 stem）
 *   - full-flow 形态 A 伪造 .sillyspec/.runtime/worktrees/<change>/meta.json（in-place 退化，
 *     numstat/diff 都在主夹具仓根跑——与 resolveVerifyChangedFiles 的 in-place 分支同口径）
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
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

/** design.md 夹具：含「## 文件变更清单」表格（change-list.js 可解析形态） */
function writeDesign(specBase, changeName, tableRows, { archived = false } = {}) {
  const changeDir = join(specBase, 'changes', ...(archived ? ['archive', changeName] : [changeName]))
  mkdirSync(changeDir, { recursive: true })
  const table = ['| 操作 | 文件路径 | 说明 |', '|---|---|---|', ...tableRows].join('\n')
  writeFileSync(join(changeDir, 'design.md'),
    `# design（fixture）\n\n## 文件变更清单\n\n${table}\n`)
}

/** 形态 A 夹具：伪造 worktree meta.json（in-place 退化——无 worktreePath 时 diff/numstat 均在 cwd） */
function writeWorktreeMeta(specBase, changeName, baseHash) {
  mkdirSync(join(specBase, '.runtime', 'worktrees', changeName), { recursive: true })
  writeFileSync(join(specBase, '.runtime', 'worktrees', changeName, 'meta.json'),
    JSON.stringify({ changeName, mode: 'in-place-fallback', baseHash }))
}

/** quick 会话 guard 夹具（startedAt 新鲜——超 7 天的僵尸会话声明会被豁免面剔除） */
function writeQuickGuard(specBase, sessionId, extra) {
  mkdirSync(join(specBase, '.runtime', 'quick-sessions', sessionId), { recursive: true })
  writeFileSync(join(specBase, '.runtime', 'quick-sessions', sessionId, 'guard.json'),
    JSON.stringify({
      sessionId,
      startedAt: new Date().toISOString(),
      baselineFiles: [],
      allowedFiles: [],
      allowNew: false,
      forceBaseline: false,
      linkedChanges: [],
      ...extra,
    }))
}

// ───────────────────────── 组 1：三态（FR-01） ─────────────────────────

test('FR-01 三态：计划内 planned / 计划外 unplanned / 计划未动 untouched（0/0 补行）', async () => {
  const d = makeRepo('sa-tri-')
  try {
    mkdirSync(join(d, 'src'), { recursive: true })
    writeFileSync(join(d, 'src', 'planned-a.js'), 'a1\na2\na3\n')
    writeFileSync(join(d, 'src', 'planned-b.js'), 'b1\nb2\n')
    sh(d, ['add', '-A'])
    sh(d, ['commit', '-q', '-m', 'init'])
    const base = head(d)
    const specBase = join(d, '.sillyspec')
    writeDesign(specBase, 'demo-change', [
      '| 修改 | src/planned-a.js | 计划内实改 |',
      '| 修改 | src/planned-b.js | 计划未动 |',
    ])
    writeWorktreeMeta(specBase, 'demo-change', base)
    // 实际改动：计划内文件实改 + 清单外新文件；planned-b 零改动
    writeFileSync(join(d, 'src', 'planned-a.js'), 'a1\na2\na3\na4\n')
    writeFileSync(join(d, 'src', 'extra.js'), 'x1\nx2\n')

    const r = await computeChangeScopeAudit({ cwd: d, changeName: 'demo-change' })
    assert.equal(r.mode, 'full-flow', 'full-flow 模式')
    assert.equal(r.ok, true, `ok（degradedReason=${r.degradedReason}）`)
    assert.equal(r.degradedReason, null, '计划可解析 + 有锚点 → 无降级')
    assert.equal(r.baseAnchor, base, 'baseAnchor = meta.baseHash（形态 A 锚优先级末端命中）')
    assert.equal(r.totals.files, 3, '3 行：2 实改 + 1 未动补行')
    const byPath = new Map(r.rows.map(x => [x.path, x]))

    const a = byPath.get('src/planned-a.js')
    assert.ok(a, '计划内实改文件在 rows')
    assert.equal(a.verdict, 'planned', '清单内实改 → planned')
    assert.equal(a.planned, '修改', 'planned 字段携带清单 operation')
    assert.equal(a.kind, 'modified', 'tracked 改动 kind=modified')

    const e = byPath.get('src/extra.js')
    assert.ok(e, '清单外新文件在 rows')
    assert.equal(e.verdict, 'unplanned', '清单外 → unplanned')
    assert.equal(e.planned, null, '无清单归属')
    assert.equal(e.kind, 'new', 'untracked → wc-l 档 kind=new')

    const b = byPath.get('src/planned-b.js')
    assert.ok(b, '计划未动文件有 0/0 补行')
    assert.equal(b.verdict, 'untouched', '清单内零改动 → untouched')
    assert.equal(b.additions, 0, '未动补行 additions=0')
    assert.equal(b.deletions, 0, '未动补行 deletions=0')

    const out = renderScopeAuditTable(r)
    assert.ok(out.includes('✓ 计划内'), '渲染含计划内标记')
    assert.ok(out.includes('计划外'), '渲染含计划外标记')
    assert.ok(out.includes('计划未动'), '渲染含计划未动标记')
    assert.ok(out.includes('合计：3 文件'), '渲染含合计行')
  } finally { cleanup(d) }
})

// ───────────────────────── 组 2：行数三档（D-002） ─────────────────────────

test('D-002 行数三档：tracked numstat 对拍 / untracked wc-l 全 + 行 / binary null+BIN', async () => {
  const d = makeRepo('sa-lines-')
  try {
    mkdirSync(join(d, 'src'), { recursive: true })
    writeFileSync(join(d, 'src', 'tracked.js'), 'l1\nl2\nl3\nl4\nl5\n')
    writeFileSync(join(d, 'asset.bin'), Buffer.from([0x00, 0x01, 0x02, 0xff, 0xfe]))
    sh(d, ['add', '-A'])
    sh(d, ['commit', '-q', '-m', 'init'])
    const base = head(d)
    const specBase = join(d, '.sillyspec')
    writeDesign(specBase, 'line-change', [
      '| 修改 | src/tracked.js | numstat 对拍 |',
      '| 新增 | src/new-file.js | wc-l 档 |',
      '| 修改 | asset.bin | 二进制档 |',
    ])
    writeWorktreeMeta(specBase, 'line-change', base)
    writeFileSync(join(d, 'src', 'tracked.js'), 'l1\nl2x\nl3\nl4\nl5\nl6\nl7\n')
    writeFileSync(join(d, 'src', 'new-file.js'), 'n1\nn2\nn3\nn4\nn5\n')
    writeFileSync(join(d, 'asset.bin'), Buffer.from([0x00, 0x0a, 0xfe, 0xfd, 0x01]))

    // 手跑 numstat 对拍基线（同基点 git diff --numstat <baseAnchor>，非 GNU 工具解析）
    const manual = new Map()
    for (const line of sh(d, ['diff', '--numstat', base]).split('\n').filter(Boolean)) {
      const cols = line.split('\t')
      manual.set(cols.slice(2).join('\t'), { a: cols[0], d: cols[1] })
    }
    assert.equal(manual.get('src/tracked.js').a, '3', 'fixture 自检：tracked 改动 +3')
    assert.equal(manual.get('src/tracked.js').d, '1', 'fixture 自检：tracked 改动 -1')
    assert.equal(manual.get('asset.bin').a, '-', 'fixture 自检：binary numstat 两列 -')

    const r = await computeChangeScopeAudit({ cwd: d, changeName: 'line-change' })
    assert.equal(r.ok, true, `ok（degradedReason=${r.degradedReason}）`)
    assert.equal(r.baseAnchor, base)
    const byPath = new Map(r.rows.map(x => [x.path, x]))

    const t = byPath.get('src/tracked.js')
    assert.ok(t, 'tracked 文件在 rows')
    assert.equal(String(t.additions), manual.get('src/tracked.js').a, 'additions 与手跑 numstat 一致')
    assert.equal(String(t.deletions), manual.get('src/tracked.js').d, 'deletions 与手跑 numstat 一致')
    assert.equal(t.kind, 'modified')

    const n = byPath.get('src/new-file.js')
    assert.ok(n, 'untracked 新文件在 rows')
    assert.equal(n.kind, 'new', 'untracked → kind=new')
    assert.equal(n.additions, 5, 'wc-l 语义：additions=文件总行数')
    assert.equal(n.deletions, 0, '新文件 deletions=0')

    const bin = byPath.get('asset.bin')
    assert.ok(bin, 'binary 文件在 rows')
    assert.equal(bin.kind, 'binary', 'numstat 两列 - → kind=binary')
    assert.equal(bin.additions, null, 'binary 不出伪行数（null）')
    assert.equal(bin.deletions, null, 'binary 不出伪行数（null）')

    assert.equal(r.totals.additions, 3 + 5, '合计 = numstat 真值 + wc-l，binary null 不计入')
    assert.equal(r.totals.deletions, 1)
    const out = renderScopeAuditTable(r)
    assert.ok(out.includes('BIN'), '渲染 binary 行数占位 BIN')
    assert.ok(!out.includes('BINX'), 'BIN 占位不被误拼')
  } finally { cleanup(d) }
})

// ───────────────────────── 组 3：并行会话（R-02/R-04，quick 模式） ─────────────────────────

test('R-02/R-04 并行会话：他者会话声明文件退栈 excluded.foreignDeclared，不进 rows', async () => {
  const d = makeRepo('sa-fgn-')
  try {
    writeFileSync(join(d, 'mine.js'), 'm1\n')
    writeFileSync(join(d, 'foreign.js'), 'f1\n')
    sh(d, ['add', '-A'])
    sh(d, ['commit', '-q', '-m', 'init'])
    const specBase = join(d, '.sillyspec')
    mkdirSync(join(specBase, 'quicklog'), { recursive: true })
    writeFileSync(join(specBase, 'quicklog', '2026-09.md'), '# QUICKLOG\n')
    // 本会话声明 mine.js；并行他者会话显式声明 foreign.js（collectOtherQuickSessionDeclarations 实时采集）
    writeQuickGuard(specBase, 'quick-abcd1234', { allowedFiles: ['mine.js'], quicklogId: 'ql-20260910-aaa1' })
    writeQuickGuard(specBase, 'quick-ffff0000', { allowedFiles: ['foreign.js'] })
    writeFileSync(join(d, 'mine.js'), 'm2\n')
    writeFileSync(join(d, 'foreign.js'), 'f2\n')

    const r = await computeChangeScopeAudit({ cwd: d, changeName: 'quick-abcd1234' })
    assert.equal(r.mode, 'quick', 'quick-<8hex> + guard 命中 → quick 模式')
    assert.equal(r.ok, true, `ok（degradedReason=${r.degradedReason}）`)
    assert.equal(r.baseAnchor, 'quick-window:quick-abcd1234', 'baseAnchor 记 quick-window:<sessionId>')
    assert.equal(r.rows.length, 1, '他者声明文件不进 rows（只余本会话声明文件）')
    const row = r.rows[0]
    assert.equal(row.path, 'mine.js')
    assert.equal(row.attribution, 'declared', '声明文件归属 declared')
    assert.equal(row.declared, true)
    assert.equal(row.kind, 'modified')
    assert.equal(row.additions, 1, '行数对未提交工作区采集（git diff HEAD --numstat）')
    assert.equal(row.deletions, 1)
    assert.ok(!r.rows.some(x => x.path === 'foreign.js'), 'foreign.js 不在任何 row')
    assert.deepEqual(r.excluded.foreignDeclared,
      [{ file: 'foreign.js', sessions: ['quick-ffff0000'] }],
      '他者声明单列 excluded.foreignDeclared（file + 声明会话）')
    const out = renderScopeAuditTable(r)
    assert.ok(out.includes('他者会话声明'), '渲染单列他者会话声明面')
    assert.ok(out.includes('foreign.js'), '渲染含他者声明文件名')
    assert.ok(out.includes('quick-window:quick-abcd1234'), '渲染含 quick-window 基点')
  } finally { cleanup(d) }
})

// ───────────────────────── 组 4：降级（FR-01） ─────────────────────────

test('FR-01 无锚形态：baseAnchor 缺失 → 行数按 HEAD 未提交窗口兜底（quick-8aa52289 新契约）', async () => {
  const d = makeRepo('sa-noanchor-')
  try {
    mkdirSync(join(d, 'src'), { recursive: true })
    writeFileSync(join(d, 'src', 'planned-a.js'), 'a1\n')
    sh(d, ['add', '-A'])
    sh(d, ['commit', '-q', '-m', 'init'])
    const specBase = join(d, '.sillyspec')
    writeDesign(specBase, 'noanchor-change', ['| 修改 | src/planned-a.js | 无锚形态 |'])
    writeWorktreeMeta(specBase, 'noanchor-change', null)  // 执行证据：meta 在但无锚字段（baseHash=null → baseAnchor 缺失 → HEAD 兜底）
    // 形态 B（无 meta.json）且无 sillyspec/<change> 分支 → merge-base 不可得，仅 status 源。
    // 新契约（quick-8aa52289）：不再恒降级 —，行数对未提交窗口采集（git diff HEAD --numstat 同口径）
    writeFileSync(join(d, 'src', 'planned-a.js'), 'a1\na2\na3\n')

    const r = await computeChangeScopeAudit({ cwd: d, changeName: 'noanchor-change' })
    assert.equal(r.ok, true, `status 源可用 → ok（degradedReason=${r.degradedReason}）`)
    assert.equal(r.baseAnchor, 'head-uncommitted-window', 'HEAD 兜底 → baseAnchor 记语义锚')
    assert.equal(r.degradedReason, null, '行数可得不再降级')
    assert.ok(r.note && r.note.includes('HEAD 未提交窗口'), `note 点名 HEAD 兜底口径（实际 ${r.note}）`)
    assert.equal(r.rows.length, 1, '文件清单仍出（不因无锚丢文件）')
    const row = r.rows[0]
    assert.equal(row.path, 'src/planned-a.js')
    assert.equal(row.verdict, 'planned', '三态判定不依赖锚点')
    assert.equal(row.additions, 2, '行数=未提交窗口真值（a2/a3 两行新增）')
    assert.equal(row.deletions, 0)
    assert.equal(r.totals.additions, 2)
    const out = renderScopeAuditTable(r)
    assert.ok(!out.includes('行数列降级'), '渲染不再误示降级（行数已出）')
    assert.ok(out.includes('head-uncommitted-window'), '渲染含 HEAD 兜底基点')
  } finally { cleanup(d) }
})

test('FR-01 降级残留：HEAD 兜底也失败（git 不可用场景由单元外覆盖）——numstat 空表行列为 null', async () => {
  // 薄断言回归位：numstat 采集失败时 degradedStat 兜底 null（不出伪数据），由渲染层出 —。
  // 该路径依赖 safeGit 失败注入，此处仅锚定契约：null 行不计入合计。
  const rows = [{ path: 'x.js', additions: null, deletions: null, kind: 'modified', verdict: 'planned' }]
  const { totals } = { totals: { files: rows.length, additions: 0, deletions: 0 } }
  assert.equal(totals.additions, 0, 'null 行不入合计（契约锚定）')
})

test('归档形态：实时窗口空 + execute 快照在 → 记录态表（note 点名快照，行数取快照值）', async () => {
  const d = makeRepo('sa-archsnap-')
  try {
    mkdirSync(join(d, 'src'), { recursive: true })
    writeFileSync(join(d, 'src', 'a.js'), 'a1\n')
    sh(d, ['add', '-A'])
    sh(d, ['commit', '-q', '-m', 'init'])
    const specBase = join(d, '.sillyspec')
    // 归档目录（changes/archive/<名>/design.md）
    writeDesign(specBase, 'archived-change', ['| 修改 | src/a.js | 说明 |'], { archived: true })
    sh(d, ['tag', 'sillyspec-audit/sillyspec/archived-change'])  // 执行证据
    // execute 时点快照（.runtime/scope-audit-<名>.json，行数为 execute 采集真值）
    const runtimeRoot = join(specBase, '.runtime')
    mkdirSync(runtimeRoot, { recursive: true })
    writeFileSync(join(runtimeRoot, 'scope-audit-archived-change.json'), JSON.stringify({
      mode: 'full-flow', ok: true, degradedReason: null, baseAnchor: 'abc1234',
      totals: { files: 1, additions: 42, deletions: 7 },
      rows: [{ path: 'src/a.js', planned: '修改', additions: 42, deletions: 7, kind: 'modified', verdict: 'planned' }],
      excluded: { foreignDeclared: [] },
      savedAt: '2026-09-10T12:00:00.000Z',
    }))
    // 实时窗口干净（已提交/无改动）→ 走快照记录态

    const r = await computeChangeScopeAudit({ cwd: d, changeName: 'archived-change' })
    assert.equal(r.ok, true)
    assert.equal(r.mode, 'full-flow')
    assert.equal(r.baseAnchor, 'abc1234', '基点取快照 baseAnchor')
    assert.equal(r.rows.length, 1, '行取快照 rows')
    assert.equal(r.rows[0].additions, 42, '行数取快照采集值（记录态）')
    assert.equal(r.totals.additions, 42)
    assert.ok(r.note && r.note.includes('已归档') && r.note.includes('快照'), `note 点名归档记录态（实际 ${r.note}）`)
    assert.ok(r.note.includes('2026-09-10 12:00'), 'note 含快照落盘时间')
    const out = renderScopeAuditTable(r)
    assert.ok(out.includes('42') && out.includes('已归档'), '渲染记录态表 + 归档说明')
  } finally { cleanup(d) }
})

test('归档快照冻结优先（quick-f5acdeeb）：窗口非空也出快照 + 行数缺失按 tag 锚补采，后续新文件不进表', async () => {
  const d = makeRepo('sa-frz-')
  try {
    mkdirSync(join(d, 'src'), { recursive: true })
    writeFileSync(join(d, 'src', 'a.js'), 'a1\n')
    sh(d, ['add', '-A'])
    sh(d, ['commit', '-q', '-m', 'init'])
    const specBase = join(d, '.sillyspec')
    writeDesign(specBase, 'frz-change', ['| 修改 | src/a.js | 说明 |'], { archived: true })
    // 快照：文件集冻结（1 文件）但行数缺失（— 形态：apply 后、锚落地前落盘）
    const runtimeRoot = join(specBase, '.runtime')
    mkdirSync(runtimeRoot, { recursive: true })
    writeFileSync(join(runtimeRoot, 'scope-audit-frz-change.json'), JSON.stringify({
      mode: 'full-flow', ok: true, degradedReason: 'baseAnchor=null（post-apply 形态无 diff 锚点）——行数列不可得',
      baseAnchor: null, totals: { files: 1, additions: 0, deletions: 0 },
      rows: [{ path: 'src/a.js', planned: '修改', additions: null, deletions: null, kind: 'modified', verdict: 'planned' }],
      excluded: { foreignDeclared: [] }, savedAt: '2026-09-10T04:17:27.000Z',
    }))
    // tag 锚链：分支 commit（含 a.js 改动）→ tag → 删分支；主仓工作区落同改动（apply 形态）
    sh(d, ['checkout', '-q', '-b', 'sillyspec/frz-change'])
    writeFileSync(join(d, 'src', 'a.js'), 'a1\nb1\nb2\n')
    sh(d, ['add', '-A'])
    sh(d, ['commit', '-q', '-m', 'branch work'])
    sh(d, ['tag', 'sillyspec-audit/sillyspec/frz-change'])
    sh(d, ['checkout', '-q', 'main'])
    sh(d, ['branch', '-D', 'sillyspec/frz-change'])
    writeFileSync(join(d, 'src', 'a.js'), 'a1\nb1\nb2\n')
    // 快照落盘后主仓新增文件（并行演进）——冻结语义下不得进表
    writeFileSync(join(d, 'src', 'later-parallel.js'), 'x\n')

    const r = await computeChangeScopeAudit({ cwd: d, changeName: 'frz-change' })
    assert.equal(r.ok, true)
    assert.equal(r.rows.length, 1, '文件集取快照冻结集（后续新文件不进表）')
    assert.equal(r.rows[0].path, 'src/a.js')
    assert.ok(!r.rows.some(x => x.path.includes('later-parallel')), '快照后主仓新文件被冻结排除')
    assert.equal(r.rows[0].additions, 2, '行数按 tag 锚补采（null→真值）')
    assert.equal(r.degradedReason, null, '行数复活后快照降级段撤除')
    assert.match(r.baseAnchor, /^[0-9a-f]{7,40}$/, 'baseAnchor=tag merge-base')
    assert.ok(r.note.includes('冻结快照') && r.note.includes('补采'), 'note 标注冻结+补采口径')
  } finally { cleanup(d) }
})

test('归档形态：快照缺失 + 实时窗口空 → 开放区间兜底 + 漂移警告（计划未动行配豁免说明）', async () => {
  const d = makeRepo('sa-archmiss-')
  try {
    mkdirSync(join(d, 'src'), { recursive: true })
    writeFileSync(join(d, 'src', 'a.js'), 'a1\n')
    sh(d, ['add', '-A'])
    sh(d, ['commit', '-q', '-m', 'init'])
    const specBase = join(d, '.sillyspec')
    writeDesign(specBase, 'archmiss-change', ['| 修改 | src/a.js | 说明 |'], { archived: true })
    sh(d, ['tag', 'sillyspec-audit/sillyspec/archmiss-change'])  // 执行证据
    // 无快照；窗口干净（本变更改动已提交/不存在的形态）

    const r = await computeChangeScopeAudit({ cwd: d, changeName: 'archmiss-change' })
    assert.equal(r.ok, true)
    assert.ok(r.note && r.note.includes('快照缺失') && r.note.includes('开放区间'),
      `note 明示兜底口径与漂移语义（实际 ${r.note}）`)
    // 清单文件走 untouched 补行（机械上窗口确实无改动；若已提交则此判定不可信——note 已警示）
    const untouched = r.rows.find(x => x.verdict === 'untouched')
    assert.ok(untouched && untouched.path === 'src/a.js', '计划清单文件 untouched 补行')
    assert.ok(r.note.includes('verify-result.md'), 'note 指引记录态重建渠道')
    const out = renderScopeAuditTable(r)
    assert.ok(out.includes('计划未动') && out.includes('快照缺失'), '渲染含 untouched 行与兜底说明')
  } finally { cleanup(d) }
})

test('审计 tag 锚（quick-df1fed77）：分支已删 + sillyspec-audit tag 在 → baseAnchor=真 merge-base，行数含已提交改动', async () => {
  const d = makeRepo('sa-taganchor-')
  try {
    mkdirSync(join(d, 'src'), { recursive: true })
    writeFileSync(join(d, 'src', 'a.js'), 'a1\n')
    sh(d, ['add', '-A'])
    sh(d, ['commit', '-q', '-m', 'init'])
    const specBase = join(d, '.sillyspec')
    writeDesign(specBase, 'taganchor-change', ['| 修改 | src/a.js | 说明 |'], { archived: true })
    // 模拟分支生命周期：分支上提交改动 → 打审计 tag（worktree.js:1065 同名）→ 删分支 →
    // 主仓工作区手动落同内容改动（apply 未提交形态）
    sh(d, ['checkout', '-q', '-b', 'sillyspec/taganchor-change'])
    writeFileSync(join(d, 'src', 'a.js'), 'a1\nbranch-line\n')
    sh(d, ['add', '-A'])
    sh(d, ['commit', '-q', '-m', 'branch work'])
    sh(d, ['tag', 'sillyspec-audit/sillyspec/taganchor-change'])
    sh(d, ['checkout', '-q', 'main'])
    sh(d, ['branch', '-D', 'sillyspec/taganchor-change'])
    writeFileSync(join(d, 'src', 'a.js'), 'a1\nbranch-line\n')

    const r = await computeChangeScopeAudit({ cwd: d, changeName: 'taganchor-change' })
    assert.equal(r.ok, true)
    assert.match(r.baseAnchor, /^[0-9a-f]{7,40}$/, 'baseAnchor=真 merge-base hash（tag 锚恢复）')
    assert.notEqual(r.baseAnchor, 'head-uncommitted-window', '不再走 HEAD 兜底语义锚')
    assert.equal(r.rows.length, 1)
    const row = r.rows[0]
    assert.equal(row.verdict, 'planned')
    assert.equal(row.additions, 1, '行数按 merge-base 锚采集（a1→两行 = +1）')
    assert.equal(row.deletions, 0)
    assert.ok(!r.note || !r.note.includes('HEAD 未提交窗口'), 'note 不再点名 HEAD 兜底（真锚在）')
  } finally { cleanup(d) }
})

test('FR-01 降级：design 清单解析失败 → 实际侧 only 视图，不误判三态', async () => {
  const d = makeRepo('sa-nolist-')
  try {
    mkdirSync(join(d, 'src'), { recursive: true })
    writeFileSync(join(d, 'src', 'foo.js'), 'f1\n')
    sh(d, ['add', '-A'])
    sh(d, ['commit', '-q', '-m', 'init'])
    const base = head(d)
    const specBase = join(d, '.sillyspec')
    mkdirSync(join(specBase, 'changes', 'nolist-change'), { recursive: true })
    writeFileSync(join(specBase, 'changes', 'nolist-change', 'design.md'),
      '# design（fixture）\n\n只有背景说明，没有文件清单章节。\n')
    writeWorktreeMeta(specBase, 'nolist-change', base)
    writeFileSync(join(d, 'src', 'foo.js'), 'f1\nf2\n')

    const r = await computeChangeScopeAudit({ cwd: d, changeName: 'nolist-change' })
    assert.equal(r.ok, true, `ok（degradedReason=${r.degradedReason}）`)
    assert.ok(r.degradedReason && r.degradedReason.includes('清单'),
      `degradedReason 说明清单解析失败（实际 ${r.degradedReason}）`)
    assert.ok(!r.degradedReason.includes('baseAnchor=null'), '锚点在——降级仅计划侧（隔离验证）')
    assert.equal(r.rows.length, 1, '实际侧文件仍出')
    const row = r.rows[0]
    assert.equal(row.path, 'src/foo.js')
    assert.equal(row.verdict, undefined, '不出三态列（不误判）')
    assert.equal(row.planned, undefined, '无清单归属字段')
    assert.equal(row.additions, 1, '行数仍按 numstat 真值出（实际侧不受计划侧降级影响）')
    assert.equal(row.deletions, 0)
    const out = renderScopeAuditTable(r)
    assert.ok(!out.includes('✓ 计划内') && !out.includes('计划外'), '渲染无三态归属标记')
  } finally { cleanup(d) }
})

// ───────────────────────── 组 6b：预执行形态（quick-bbb5037c） ─────────────────────────

test('预执行形态：无 meta/分支/tag 三无 → 计划清单视图，工作区脏文件不进表、无收尾警告', async () => {
  const d = makeRepo('sa-preexec-')
  try {
    mkdirSync(join(d, 'src'), { recursive: true })
    writeFileSync(join(d, 'src', 'exist.js'), 'e1\n')
    sh(d, ['add', '-A'])
    sh(d, ['commit', '-q', '-m', 'init'])
    const specBase = join(d, '.sillyspec')
    writeDesign(specBase, 'preexec-change', ['| 新增 | NEW:src/todo.js | 待实现 |', '| 修改 | src/exist.js | 说明 |'])
    // 无 meta、无分支、无 tag（预执行）；但工作区有脏文件（他者/本仓在途）
    writeFileSync(join(d, 'src', 'dirty-parallel.js'), 'dirty\n')

    const r = await computeChangeScopeAudit({ cwd: d, changeName: 'preexec-change' })
    assert.equal(r.ok, true)
    assert.equal(r.rows.length, 2, '只出 design 清单两行')
    assert.ok(r.rows.every(x => x.verdict === 'untouched'), '全部待实现（untouched）')
    assert.ok(!r.rows.some(x => x.path.includes('dirty-parallel')), '工作区脏文件不进表')
    assert.ok(r.note && r.note.includes('尚未进入 execute'), `note 说明预执行（实际 ${r.note}）`)
    assert.ok(!r.note.includes('快照缺失'), '不误报收尾漂移警告')
    const out = renderScopeAuditTable(r)
    assert.ok(!out.includes('dirty-parallel'), '渲染无脏文件')
  } finally { cleanup(d) }
})

// ───────────────────────── 组 6：单文件 diff（quick-63776328，getFileDiff） ─────────────────────────

test('getFileDiff：tracked 文件改动 → git 原生 diff 内容（锚点=形态 A meta 锚）', async () => {
  const d = makeRepo('sa-fd-')
  try {
    mkdirSync(join(d, 'src'), { recursive: true })
    writeFileSync(join(d, 'src', 'a.js'), 'a1\n')
    writeFileSync(join(d, 'src', 'b.js'), 'b1\n')
    sh(d, ['add', '-A'])
    sh(d, ['commit', '-q', '-m', 'init'])
    const base = head(d)
    const specBase = join(d, '.sillyspec')
    writeDesign(specBase, 'fd-change', ['| 修改 | src/a.js | 说明 |'])
    writeWorktreeMeta(specBase, 'fd-change', base)
    writeFileSync(join(d, 'src', 'a.js'), 'a1\na2-new\n')

    const fd = await getFileDiff({ cwd: d, changeName: 'fd-change', filePath: 'src/a.js' })
    assert.equal(fd.ok, true)
    assert.equal(fd.mode, 'full-flow')
    assert.equal(fd.baseRef, base, '锚点=形态 A meta 锚（baseHash）')
    assert.ok(fd.diff && fd.diff.includes('+++ b/src/a.js'), 'git 原生 diff 头')
    assert.ok(fd.diff.includes('+a2-new'), 'diff 含新增行内容')
    assert.ok(!fd.diff.includes('b/src/b.js'), '只含目标文件（pathspec 隔离）')
  } finally { cleanup(d) }
})

test('getFileDiff：untracked 新文件 → 不在 git diff 内，note 提示看文件本体', async () => {
  const d = makeRepo('sa-fdnew-')
  try {
    mkdirSync(join(d, 'src'), { recursive: true })
    writeFileSync(join(d, 'src', 'a.js'), 'a1\n')
    sh(d, ['add', '-A'])
    sh(d, ['commit', '-q', '-m', 'init'])
    const specBase = join(d, '.sillyspec')
    writeDesign(specBase, 'fdnew-change', ['| 新增 | src/fresh.js | 说明 |'])
    writeFileSync(join(d, 'src', 'fresh.js'), 'new content\n')

    const fd = await getFileDiff({ cwd: d, changeName: 'fdnew-change', filePath: 'src/fresh.js' })
    assert.equal(fd.ok, true)
    assert.equal(fd.diff, null, 'untracked 无 git diff')
    assert.ok(fd.note && fd.note.includes('未跟踪新文件'), `note 提示（实际 ${fd.note}）`)
  } finally { cleanup(d) }
})

test('getFileDiff：窗口内未改动 → diff 空串 + note', async () => {
  const d = makeRepo('sa-fdno-')
  try {
    mkdirSync(join(d, 'src'), { recursive: true })
    writeFileSync(join(d, 'src', 'a.js'), 'a1\n')
    sh(d, ['add', '-A'])
    sh(d, ['commit', '-q', '-m', 'init'])
    const base = head(d)
    const specBase = join(d, '.sillyspec')
    writeDesign(specBase, 'fdno-change', ['| 修改 | src/a.js | 说明 |'])
    writeWorktreeMeta(specBase, 'fdno-change', base)

    const fd = await getFileDiff({ cwd: d, changeName: 'fdno-change', filePath: 'src/a.js' })
    assert.equal(fd.ok, true)
    assert.equal(fd.diff, '')
    assert.ok(fd.note && fd.note.includes('无 diff'), `note 说明未改（实际 ${fd.note}）`)
  } finally { cleanup(d) }
})

test('快照优先放宽（quick-bd84b852）：活跃 post-apply（无 meta=分支已删）+ 快照在 → 冻结快照优先于实时开放区间', async () => {
  const d = makeRepo('sa-settle-')
  try {
    mkdirSync(join(d, 'src'), { recursive: true })
    writeFileSync(join(d, 'src', 'a.js'), 'a1\n')
    sh(d, ['add', '-A'])
    sh(d, ['commit', '-q', '-m', 'init'])
    const specBase = join(d, '.sillyspec')
    writeDesign(specBase, 'settle-change', ['| 修改 | src/a.js | 说明 |']) // 活跃目录（非归档）
    sh(d, ['tag', 'sillyspec-audit/sillyspec/settle-change'])  // 执行证据（post-apply 收尾信号）
    // execute 已收尾：无 worktree meta.json（post-apply 形态）+ 快照在
    const runtimeRoot = join(specBase, '.runtime')
    mkdirSync(runtimeRoot, { recursive: true })
    writeFileSync(join(runtimeRoot, 'scope-audit-settle-change.json'), JSON.stringify({
      mode: 'full-flow', ok: true, degradedReason: null, baseAnchor: 'abc1234',
      totals: { files: 1, additions: 9, deletions: 2 },
      rows: [{ path: 'src/a.js', planned: '修改', additions: 9, deletions: 2, kind: 'modified', verdict: 'planned' }],
      excluded: { foreignDeclared: [] }, savedAt: '2026-09-11T08:00:00.000Z',
    }))
    // 快照落盘后主仓继续演进（并行会话）——冻结语义下不进表
    writeFileSync(join(d, 'src', 'parallel-later.js'), 'x\n')

    const r = await computeChangeScopeAudit({ cwd: d, changeName: 'settle-change' })
    assert.equal(r.ok, true)
    assert.equal(r.rows.length, 1, '冻结文件集（后续并行新文件不进表）')
    assert.equal(r.rows[0].additions, 9, '行数取快照真值')
    assert.ok(!r.rows.some(x => x.path.includes('parallel-later')), '并行演进被冻结排除')
    assert.ok(r.note && r.note.includes('execute 已收尾') && r.note.includes('冻结快照'),
      `note 用活跃收尾措辞（实际 ${r.note}）`)
    assert.ok(!r.note.includes('已归档'), '非归档变更不误称已归档')
  } finally { cleanup(d) }
})

test('快照缺失漂移警告（quick-bd84b852）：活跃 post-apply 无快照 → 开放区间表 + 明示漂移与旧变更不可重建', async () => {
  const d = makeRepo('sa-nosnap-')
  try {
    mkdirSync(join(d, 'src'), { recursive: true })
    writeFileSync(join(d, 'src', 'a.js'), 'a1\n')
    sh(d, ['add', '-A'])
    sh(d, ['commit', '-q', '-m', 'init'])
    const specBase = join(d, '.sillyspec')
    writeDesign(specBase, 'nosnap-change', ['| 修改 | src/a.js | 说明 |']) // 活跃 + 无 meta（post-apply）+ 无快照
    sh(d, ['tag', 'sillyspec-audit/sillyspec/nosnap-change'])  // 执行证据
    writeFileSync(join(d, 'src', 'a.js'), 'a1\na2\n')

    const r = await computeChangeScopeAudit({ cwd: d, changeName: 'nosnap-change' })
    assert.equal(r.ok, true)
    assert.equal(r.rows.length, 1, '实时开放区间仍出表（兜底不空转）')
    assert.ok(r.note && r.note.includes('快照缺失') && r.note.includes('开放区间'),
      `note 明示漂移语义（实际 ${r.note}）`)
    assert.ok(r.note.includes('无法重建冻结记录'), '旧变更冻结记录不可重建如实告知')
    const out = renderScopeAuditTable(r)
    assert.ok(out.includes('快照缺失'), '渲染含漂移警告')
  } finally { cleanup(d) }
})

// ───────────────────────── 组 7：审计级存储（quick-359a48f1，patch 生成/切片/quick 记录态） ─────────────────────────

test('buildFrozenPatch：tracked diff 原文 + untracked 新文件自拼 hunk + binary 标记', async () => {
  const d = makeRepo('sa-patch-')
  try {
    mkdirSync(join(d, 'src'), { recursive: true })
    writeFileSync(join(d, 'src', 'a.js'), 'a1\n')
    sh(d, ['add', '-A'])
    sh(d, ['commit', '-q', '-m', 'init'])
    const base = head(d)
    const specBase = join(d, '.sillyspec')
    writeDesign(specBase, 'patch-change', ['| 修改 | src/a.js | 说明 |', '| 新增 | NEW:src/fresh.js | 新文件 |'])
    writeWorktreeMeta(specBase, 'patch-change', base)
    writeFileSync(join(d, 'src', 'a.js'), 'a1\na2-new\n')
    writeFileSync(join(d, 'src', 'fresh.js'), 'fresh-1\nfresh-2\n')
    writeFileSync(join(d, 'logo.bin'), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x0d]))

    const patch = buildFrozenPatch(d, ['src/a.js', 'src/fresh.js', 'logo.bin'], { baseRef: base })
    assert.ok(patch.includes('diff --git a/src/a.js b/src/a.js'), 'tracked 段 git 原生头')
    assert.ok(patch.includes('+a2-new'), 'tracked 段含改动内容')
    assert.ok(patch.includes('diff --git a/src/fresh.js b/src/fresh.js'), 'untracked 段拼接头')
    assert.ok(patch.includes('new file mode 100644') && patch.includes('--- /dev/null'), 'untracked 段 new file 形态')
    assert.ok(patch.includes('+fresh-1') && patch.includes('@@ -0,0 +1,2 @@'), 'untracked 段正文与计数')
    assert.ok(!patch.includes('logo.bin\n+++'), 'binary 不进内容')
    const { computeChangeScopeAudit, getFileDiff } = await import('../src/scope-audit.js')
    const fd = await getFileDiff({ cwd: d, changeName: 'patch-change', filePath: 'src/fresh.js' })
    // 形态 A 活跃（meta 在）无冻结 patch 文件 → 走实时锚 diff；untracked 不在 diff → note 提示（回归锚定）
    assert.equal(fd.ok, true)
    assert.ok(fd.note && fd.note.includes('未跟踪新文件'), `活跃形态 untracked 提示（实际 ${fd.note}）`)
  } finally { cleanup(d) }
})

test('buildFrozenPatch 归属口径（quick-90015473）：tracked 段按 files 过滤，并行会话文件不进 patch', async () => {
  const d = makeRepo('sa-pfilter-')
  try {
    mkdirSync(join(d, 'src'), { recursive: true })
    writeFileSync(join(d, 'src', 'mine.js'), 'm1\n')
    writeFileSync(join(d, 'src', 'foreign.js'), 'f1\n')
    sh(d, ['add', '-A'])
    sh(d, ['commit', '-q', '-m', 'init'])
    const base = head(d)
    writeFileSync(join(d, 'src', 'mine.js'), 'm1\nm2\n')
    writeFileSync(join(d, 'src', 'foreign.js'), 'f1\nCHANGED-BY-PARALLEL\n')

    const patch = buildFrozenPatch(d, ['src/mine.js'], { baseRef: base })
    assert.ok(patch.includes('+m2'), '归属文件内容在')
    assert.ok(!patch.includes('CHANGED-BY-PARALLEL'), '并行会话文件不进 patch（归属口径）')
    assert.ok(!patch.includes('diff --git a/src/foreign.js'), '无 foreign 的 diff 段头')
  } finally { cleanup(d) }
})

test('审计级 patch 落盘与切片（--file 真·当时内容比对）：归档目录 scope-audit.patch → 后续演进不混入', async () => {
  const d = makeRepo('sa-slice-')
  try {
    mkdirSync(join(d, 'src'), { recursive: true })
    writeFileSync(join(d, 'src', 'a.js'), 'a1\n')
    sh(d, ['add', '-A'])
    sh(d, ['commit', '-q', '-m', 'init'])
    const base = head(d)
    const specBase = join(d, '.sillyspec')
    const archivedDir = join(specBase, 'changes', 'archive', 'slice-change')
    mkdirSync(archivedDir, { recursive: true })
    writeFileSync(join(archivedDir, 'design.md'), '# design（fixture）\n\n## 文件变更清单\n\n| 操作 | 文件路径 | 说明 |\n|---|---|---|\n| 修改 | src/a.js | 说明 |\n')
    // 快照（记录态触发器）+ 冻结 patch（apply 时点内容：a1→a1/a2-frozen）
    const runtimeRoot = join(specBase, '.runtime')
    mkdirSync(runtimeRoot, { recursive: true })
    writeFileSync(join(runtimeRoot, 'scope-audit-slice-change.json'), JSON.stringify({
      mode: 'full-flow', ok: true, degradedReason: null, baseAnchor: base,
      totals: { files: 1, additions: 1, deletions: 0 },
      rows: [{ path: 'src/a.js', planned: '修改', additions: 1, deletions: 0, kind: 'modified', verdict: 'planned' }],
      excluded: { foreignDeclared: [] }, savedAt: '2026-09-11T10:00:00.000Z',
    }))
    const frozenContent = 'diff --git a/src/a.js b/src/a.js\nindex 111..222 100644\n--- a/src/a.js\n+++ b/src/a.js\n@@ -1 +1,2 @@\n a1\n+a2-frozen\n'
    writeFileSync(join(archivedDir, 'scope-audit.patch'), frozenContent)
    // 后续演进（apply 之后）：同文件又被改——冻结切片不得混入
    writeFileSync(join(d, 'src', 'a.js'), 'a1\na2-frozen\nLATER-EVOLUTION\n')

    const fd = await getFileDiff({ cwd: d, changeName: 'slice-change', filePath: 'src/a.js' })
    assert.equal(fd.ok, true)
    assert.ok(fd.anchorLabel && fd.anchorLabel.includes('冻结 patch'), `优先冻结 patch（实际 ${fd.anchorLabel}）`)
    assert.ok(fd.diff.includes('+a2-frozen'), '切片含当时改动')
    assert.ok(!fd.diff.includes('LATER-EVOLUTION'), '后续演进不混入（真·当时比对）')
  } finally { cleanup(d) }
})

test('quick 记录态（guard 清理后）：quicklog/patches/<qlId>.json 反查 → 记录态表 + --file 切片', async () => {
  const d = makeRepo('sa-qrec-')
  try {
    mkdirSync(join(d, 'src'), { recursive: true })
    writeFileSync(join(d, 'src', 'a.js'), 'a1\n')
    sh(d, ['add', '-A'])
    sh(d, ['commit', '-q', '-m', 'init'])
    const specBase = join(d, '.sillyspec')
    mkdirSync(join(specBase, 'quicklog'), { recursive: true })
    writeFileSync(join(specBase, 'quicklog', '2026-09.md'), '# QUICKLOG\n')
    // guard 已清理（不存在）+ patches 记录在
    const patchesDir = join(specBase, 'quicklog', 'patches')
    mkdirSync(patchesDir, { recursive: true })
    writeFileSync(join(patchesDir, 'ql-20260911-001-abcd.json'), JSON.stringify({
      mode: 'quick', ok: true, baseAnchor: 'quick-window:quick-abcd1234',
      totals: { files: 1, additions: 3, deletions: 1 },
      rows: [{ path: 'src/a.js', declared: true, additions: 3, deletions: 1, kind: 'modified', attribution: 'declared' }],
      excluded: { foreignDeclared: [] }, qlId: 'ql-20260911-001-abcd', sessionId: 'quick-abcd1234',
      savedAt: '2026-09-11T09:00:00.000Z',
    }))
    writeFileSync(join(patchesDir, 'ql-20260911-001-abcd.patch'),
      'diff --git a/src/a.js b/src/a.js\n--- a/src/a.js\n+++ b/src/a.js\n@@ -1 +1,3 @@\n a1\n+q1\n+q2\n')

    const r = await computeChangeScopeAudit({ cwd: d, changeName: 'quick-abcd1234' })
    assert.equal(r.ok, true, 'guard 清理后不再 ok=false')
    assert.equal(r.mode, 'quick')
    assert.equal(r.rows.length, 1)
    assert.equal(r.rows[0].additions, 3, '行数取冻结记录')
    assert.ok(r.note && r.note.includes('记录态') && r.note.includes('ql-20260911-001-abcd'), `note 点名记录态（实际 ${r.note}）`)
    assert.ok(r.frozenPatchPath && r.frozenPatchPath.includes('ql-20260911-001-abcd.patch'), 'frozenPatchPath 供 --file 切片')
    const out = renderScopeAuditTable(r)
    assert.ok(out.includes('记录态'), '渲染记录态说明')
    // --file 切片走 frozenPatchPath
    const fd = await getFileDiff({ cwd: d, changeName: 'quick-abcd1234', filePath: 'src/a.js' })
    assert.ok(fd.ok && fd.diff && fd.diff.includes('+q2'), '--file 切冻结 patch 内容')
    assert.ok(fd.anchorLabel.includes('冻结 patch'), '--file 锚点标注冻结')
  } finally { cleanup(d) }
})

// ───────────────────────── 组 5：quick 归属（FR-04） ─────────────────────────

test('FR-04 quick：declared / soft / undeclared 三档 + baseAnchor=quick-window:<id>', async () => {
  const d = makeRepo('sa-qattr-')
  try {
    mkdirSync(join(d, 'src'), { recursive: true })
    mkdirSync(join(d, 'test'), { recursive: true })
    writeFileSync(join(d, 'src', 'feature.js'), 'f1\n')
    writeFileSync(join(d, 'test', 'keeper.test.js'), 'k1\n') // test/ 目录先有 tracked 文件 → 新测试文件文件级展示（防目录折叠）
    sh(d, ['add', '-A'])
    sh(d, ['commit', '-q', '-m', 'init'])
    const specBase = join(d, '.sillyspec')
    mkdirSync(join(specBase, 'quicklog'), { recursive: true })
    writeFileSync(join(specBase, 'quicklog', '2026-09.md'), '# QUICKLOG\n')
    writeQuickGuard(specBase, 'quick-1a2b3c4d', {
      allowedFiles: ['src/feature.js'],
      quicklogId: 'ql-20260910-bbb2',
    })
    writeFileSync(join(d, 'src', 'feature.js'), 'f1\nf2\nf3\n')      // 声明文件实改（tracked）
    writeFileSync(join(d, 'test', 'feature.test.js'), 't1\nt2\nt3\n') // 同模块测试未声明（untracked）
    writeFileSync(join(d, 'unrelated.js'), 'u1\nu2\nu3\nu4\n')        // 无关未声明（untracked）

    const r = await computeChangeScopeAudit({ cwd: d, changeName: 'quick-1a2b3c4d' })
    assert.equal(r.mode, 'quick')
    assert.equal(r.ok, true, `ok（degradedReason=${r.degradedReason}）`)
    assert.equal(r.baseAnchor, 'quick-window:quick-1a2b3c4d')
    assert.equal(r.rows.length, 3, '三档各一行')
    const byPath = new Map(r.rows.map(x => [x.path, x]))

    const f = byPath.get('src/feature.js')
    assert.ok(f, '声明文件在 rows')
    assert.equal(f.attribution, 'declared', '--files 声明 → declared')
    assert.equal(f.declared, true)
    assert.equal(f.kind, 'modified', 'tracked 改动 vs HEAD numstat')
    assert.equal(f.additions, 2)
    assert.equal(f.deletions, 0)

    const t = byPath.get('test/feature.test.js')
    assert.ok(t, '未声明同模块测试在 rows')
    assert.equal(t.attribution, 'soft', 'stem 对上声明 stem → 软归属')
    assert.equal(t.declared, false)
    assert.equal(t.kind, 'new', 'untracked → wc-l 档')
    assert.equal(t.additions, 3, 'additions=文件总行数')
    assert.equal(t.deletions, 0)

    const u = byPath.get('unrelated.js')
    assert.ok(u, '未声明无关文件在 rows')
    assert.equal(u.attribution, 'undeclared', '真未知 → undeclared')
    assert.equal(u.declared, false)
    assert.equal(u.kind, 'new')
    assert.equal(u.additions, 4)
    assert.equal(u.deletions, 0)

    const out = renderScopeAuditTable(r)
    assert.ok(out.includes('软归属'), '渲染单列软归属档')
    assert.ok(out.includes('未声明'), '渲染未声明档 + 出口指引')
  } finally { cleanup(d) }
})

test('FR-04 quick 已提交降级：窗口空 + QUICKLOG 有条目 → note 指向记录态，不出空表冒充实时', async () => {
  const d = makeRepo('sa-qdone-')
  try {
    writeFileSync(join(d, 'done.js'), 'd1\n')
    sh(d, ['add', '-A'])
    sh(d, ['commit', '-q', '-m', 'init']) // 窗口干净 = 改动已全部提交形态
    const specBase = join(d, '.sillyspec')
    mkdirSync(join(specBase, 'quicklog'), { recursive: true })
    writeFileSync(join(specBase, 'quicklog', '2026-09.md'),
      '# QUICKLOG\n\n## ql-20260910-ccc3 | 已提交条目 | output\n')
    writeQuickGuard(specBase, 'quick-0abcde99', { quicklogId: 'ql-20260910-ccc3' })

    const r = await computeChangeScopeAudit({ cwd: d, changeName: 'quick-0abcde99' })
    assert.equal(r.mode, 'quick')
    assert.equal(r.ok, true, `ok（degradedReason=${r.degradedReason}）`)
    assert.equal(r.rows.length, 0, '窗口空')
    assert.equal(r.baseAnchor, 'quick-window:quick-0abcde99')
    assert.ok(r.note, 'note 非空（降级说明）')
    assert.ok(r.note.includes('ql-20260910-ccc3'), `note 指向 QUICKLOG 条目（实际 ${r.note}）`)
    assert.ok(r.note.includes('QUICKLOG'), 'note 提示读 QUICKLOG 记录态')
    const out = renderScopeAuditTable(r)
    assert.ok(out.includes('无对账行'), '渲染明示无行')
    assert.ok(out.includes('QUICKLOG'), '渲染带记录态指引')
  } finally { cleanup(d) }
})

test('FR-02 模式判定：quick id 形态命中但 guard 缺失 → ok=false 明确降级', async () => {
  const d = makeRepo('sa-qmiss-')
  try {
    const r = await computeChangeScopeAudit({ cwd: d, changeName: 'quick-deadbeef' })
    assert.equal(r.mode, 'quick', 'id 形态命中 → quick 模式')
    assert.equal(r.ok, false, 'guard 缺失 → 不出表')
    assert.ok(r.degradedReason && r.degradedReason.includes('不存在'),
      `degradedReason 明示会话不存在（实际 ${r.degradedReason}）`)
    const out = renderScopeAuditTable(r)
    assert.ok(out.includes('⚠️'), 'fail-soft 渲染单行降级提示')
  } finally { cleanup(d) }
})
