/**
 * scope-audit 夹具测试（变更 2026-09-10-change-scope-audit task-07）。
 *
 * 临时 git 仓库夹具覆盖 computeChangeScopeAudit / renderScopeAuditTable 五组场景
 * （TaskCard = requirements.md FR-01~04 Given/Then）：
 *   1. 三态（FR-01）：计划内 planned / 计划外 unplanned / 计划未动 untouched（0/0 补行）
 *   2. 行数三档（D-002）：tracked numstat 对拍 / untracked wc-l 全 + 行 / binary null+BIN
 *   3. 并行会话（R-02/R-04）：他者 quick 会话声明文件退栈 excluded.foreignDeclared 不进 rows
 *   4. 降级（FR-01）：baseAnchor=null 不出伪行数（清单仍出）/ design 清单解析失败实际侧 only
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
import { computeChangeScopeAudit, renderScopeAuditTable } from '../src/scope-audit.js'

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
function writeDesign(specBase, changeName, tableRows) {
  mkdirSync(join(specBase, 'changes', changeName), { recursive: true })
  const table = ['| 操作 | 文件路径 | 说明 |', '|---|---|---|', ...tableRows].join('\n')
  writeFileSync(join(specBase, 'changes', changeName, 'design.md'),
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

test('FR-01 降级：形态 B 无 merge-base → baseAnchor=null 不出伪行数（文件清单仍出）', async () => {
  const d = makeRepo('sa-noanchor-')
  try {
    mkdirSync(join(d, 'src'), { recursive: true })
    writeFileSync(join(d, 'src', 'planned-a.js'), 'a1\n')
    sh(d, ['add', '-A'])
    sh(d, ['commit', '-q', '-m', 'init'])
    const specBase = join(d, '.sillyspec')
    writeDesign(specBase, 'noanchor-change', ['| 修改 | src/planned-a.js | 无锚形态 |'])
    // 形态 B（无 meta.json）且无 sillyspec/<change> 分支 → merge-base 不可得，仅 status 源
    writeFileSync(join(d, 'src', 'planned-a.js'), 'a1\na2\n')

    const r = await computeChangeScopeAudit({ cwd: d, changeName: 'noanchor-change' })
    assert.equal(r.ok, true, `status 源可用 → ok（degradedReason=${r.degradedReason}）`)
    assert.equal(r.baseAnchor, null, '无分支锚 → baseAnchor=null')
    assert.ok(r.degradedReason && r.degradedReason.includes('baseAnchor=null'),
      `degradedReason 非空且点名 baseAnchor=null（实际 ${r.degradedReason}）`)
    assert.equal(r.rows.length, 1, '文件清单仍出（不因无锚丢文件）')
    const row = r.rows[0]
    assert.equal(row.path, 'src/planned-a.js')
    assert.equal(row.verdict, 'planned', '三态判定不依赖锚点')
    assert.equal(row.additions, null, '不出伪 additions（Grill 残余 P2-①）')
    assert.equal(row.deletions, null, '不出伪 deletions')
    assert.equal(r.totals.additions, 0, 'null 行不入合计')
    assert.equal(r.totals.deletions, 0)
    const out = renderScopeAuditTable(r)
    assert.ok(out.includes('—'), '渲染行数降级占位 —')
    assert.ok(out.includes('无 diff 锚点') || out.includes('降级'), '渲染明示降级')
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
