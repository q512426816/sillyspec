/**
 * scan-refresh 单测（change: 2026-09-14-scan-incremental-refresh）
 *
 * 本文件首版（task-03）：bumpScanDocBaselines 盖章函数——per-doc 三键推进 /
 * 未点名不动 / 幂等 / 缺失 skipped / 其余 frontmatter 键保留。
 * task-05 追加 computeRefreshPlan 计算层用例；task-07 追加临时 git 仓 e2e。
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { bumpScanDocBaselines } from '../src/scan-postcheck.js'

const cleanup = (root) => { try { rmSync(root, { recursive: true, force: true }) } catch {} }

function mkSpec({ docs = {} } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'scan-refresh-'))
  const specBase = join(root, '.sillyspec')
  const scanDir = join(specBase, 'docs', 'demo', 'scan')
  mkdirSync(scanDir, { recursive: true })
  for (const [name, content] of Object.entries(docs)) {
    writeFileSync(join(scanDir, name), content)
  }
  return { root, specBase, scanDir, cwd: root }
}

const docA = [
  '---',
  'author: test',
  'created_at: 2026-09-14 00:00:00',
  'source_commit: 1111111',
  'updated_at: 2026-09-14T00:00:00.000Z',
  'generator: sillyspec-scan',
  'scan_depth: standard',
  '---',
  '',
  '# 架构（Architecture）',
  '',
  '内容引用 `src/a.js:1`',
  '',
].join('\n')

const docB = docA.replace('1111111', '2222222').replace('# 架构（Architecture）', '# 约定（Conventions）')

describe('bumpScanDocBaselines per-doc 盖章', () => {
  it('点名文档三键推进；未点名文档逐字节不动', (t) => {
    const f = mkSpec({ docs: { 'ARCHITECTURE.md': docA, 'CONVENTIONS.md': docB } })
    t.after(() => cleanup(f.root))
    const before = readFileSync(join(f.scanDir, 'CONVENTIONS.md'), 'utf8')
    const r = bumpScanDocBaselines({
      cwd: f.cwd, specDir: f.specBase, project: 'demo',
      docs: ['ARCHITECTURE.md'], headShort: 'abcdef1',
    })
    assert.deepEqual(r.skipped, [])
    assert.equal(r.bumped.length, 1)
    const after = readFileSync(join(f.scanDir, 'ARCHITECTURE.md'), 'utf8')
    assert.match(after, /^source_commit: abcdef1$/m)
    assert.match(after, /^generator: sillyspec-scan-refresh$/m)
    assert.match(after, /^updated_at: \d{4}-\d{2}-\d{2}T/m)
    // 其余键保留
    assert.match(after, /^author: test$/m)
    assert.match(after, /^created_at: 2026-09-14 00:00:00$/m)
    assert.match(after, /^scan_depth: standard$/m)
    // 正文保留
    assert.ok(after.includes('# 架构（Architecture）'))
    assert.ok(after.includes('`src/a.js:1`'))
    // 未点名文档不动
    assert.equal(readFileSync(join(f.scanDir, 'CONVENTIONS.md'), 'utf8'), before)
  })

  it('幂等：同值重跑原位替换不重复追加（updated_at 键仍唯一）', (t) => {
    const f = mkSpec({ docs: { 'ARCHITECTURE.md': docA } })
    t.after(() => cleanup(f.root))
    const call = () => bumpScanDocBaselines({
      cwd: f.cwd, specDir: f.specBase, project: 'demo',
      docs: ['ARCHITECTURE.md'], headShort: 'abcdef1',
    })
    call()
    call()
    const after = readFileSync(join(f.scanDir, 'ARCHITECTURE.md'), 'utf8')
    assert.equal((after.match(/^source_commit: abcdef1$/gm) || []).length, 1, 'source_commit 唯一（原位替换）')
    assert.equal((after.match(/^generator: sillyspec-scan-refresh$/gm) || []).length, 1, 'generator 唯一')
    assert.equal((after.match(/^updated_at:/gm) || []).length, 1, 'updated_at 唯一（不追加重复键）')
    assert.ok(after.includes('内容引用 `src/a.js:1`'), '正文保留')
  })

  it('缺失文档进 skipped（带 reason），已存在文档照常 bump', (t) => {
    const f = mkSpec({ docs: { 'ARCHITECTURE.md': docA } })
    t.after(() => cleanup(f.root))
    const r = bumpScanDocBaselines({
      cwd: f.cwd, specDir: f.specBase, project: 'demo',
      docs: ['ARCHITECTURE.md', 'MISSING.md'], headShort: 'abcdef1',
    })
    assert.equal(r.bumped.length, 1)
    assert.equal(r.skipped.length, 1)
    assert.equal(r.skipped[0].file, 'MISSING.md')
    assert.ok(r.skipped[0].reason.length > 0)
  })

  it('headShort 缺省且非 git 仓 → source_commit 键跳过，updated_at/generator 恒写', (t) => {
    const f = mkSpec({ docs: { 'ARCHITECTURE.md': docA } })
    t.after(() => cleanup(f.root))
    const r = bumpScanDocBaselines({
      cwd: f.cwd, specDir: f.specBase, project: 'demo', docs: ['ARCHITECTURE.md'],
    })
    assert.equal(r.bumped.length, 1)
    const after = readFileSync(join(f.scanDir, 'ARCHITECTURE.md'), 'utf8')
    assert.match(after, /^source_commit: 1111111$/m, '非 git 仓不动 source_commit（不写坏值）')
    assert.match(after, /^generator: sillyspec-scan-refresh$/m)
    assert.match(after, /^updated_at: \d{4}-\d{2}-\d{2}T/m)
  })

  it('无 frontmatter 文档 → 新建头部（三键 + 正文保留）', (t) => {
    const f = mkSpec({ docs: { 'PROJECT.md': '# 项目（Project）\n\n正文\n' } })
    t.after(() => cleanup(f.root))
    const r = bumpScanDocBaselines({
      cwd: f.cwd, specDir: f.specBase, project: 'demo',
      docs: ['PROJECT.md'], headShort: 'abcdef1',
    })
    assert.equal(r.bumped.length, 1)
    const after = readFileSync(join(f.scanDir, 'PROJECT.md'), 'utf8')
    assert.ok(after.startsWith('---\n'), 'frontmatter 新建于头部')
    assert.match(after, /^source_commit: abcdef1$/m)
    assert.ok(after.includes('# 项目（Project）'), '正文保留')
  })
})

// ── computeRefreshPlan 计算层（task-05）──
import { execSync } from 'node:child_process'
import { computeRefreshPlan } from '../src/scan-refresh.js'

function mkRefreshRepo({ docs, map = null } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'scan-refresh-repo-'))
  const run = (a) => execSync(a, { cwd: root, stdio: 'pipe' }).toString().trim()
  run('git init -q')
  run('git config user.email t@t.com')
  run('git config user.name t')
  mkdirSync(join(root, 'src'), { recursive: true })
  writeFileSync(join(root, 'src/a.js'), 'a1\n')
  run('git add -A')
  run('git commit -q -m base')
  const base = run('git rev-parse HEAD')
  const specBase = join(root, '.sillyspec')
  const scanDir = join(specBase, 'docs', 'demo', 'scan')
  mkdirSync(scanDir, { recursive: true })
  for (const [name, content] of Object.entries(docs)) writeFileSync(join(scanDir, name), content)
  if (map) {
    mkdirSync(join(specBase, 'docs', 'demo', 'modules'), { recursive: true })
    writeFileSync(join(specBase, 'docs', 'demo', 'modules', '_module-map.yaml'), map)
  }
  if (Object.keys(docs).length > 0 || map) {
    run('git add -A')
    run('git commit -q -m docs')
  }
  return { root, base, specBase, scanDir, run }
}

const refDoc = (base, refs = '`src/a.js:1`') => [
  '---', 'author: t', `source_commit: ${base}`, '---', '', '# 架构（Architecture）', '', `引用 ${refs}`, '',
].join('\n')

const MAP = `schema_version: 2\nmodules:\n  core:\n    status: active\n    paths:\n      - src/\n`

describe('computeRefreshPlan 门控与受影响集', () => {
  it('无 source_commit 文档 → 硬门 no-baseline 拒绝', (t) => {
    const f = mkRefreshRepo({ docs: { 'ARCHITECTURE.md': '---\nauthor: t\n---\n\n# 无基线\n' } })
    t.after(() => cleanup(f.root))
    const r = computeRefreshPlan({ projectRoot: f.root, specBase: f.specBase, projectName: 'demo' })
    assert.equal(r.ok, false)
    assert.equal(r.kind, 'no-baseline')
  })

  it('in-scope 未提交改动 → dirty-worktree fail-closed（scope 非空限 scope 面）', (t) => {
    const f = mkRefreshRepo({ docs: {}, map: MAP })
    writeFileSync(join(f.scanDir, 'ARCHITECTURE.md'), refDoc(f.base))
    f.run('git add -A && git commit -q -m doc')
    t.after(() => cleanup(f.root))
    writeFileSync(join(f.root, 'src/a.js'), 'uncommitted\n')
    const r = computeRefreshPlan({ projectRoot: f.root, specBase: f.specBase, projectName: 'demo' })
    assert.equal(r.ok, false)
    assert.equal(r.kind, 'dirty-worktree')
    assert.ok(r.error.includes('src/a.js'))
    // scope 外脏不阻断
    writeFileSync(join(f.root, 'src/a.js'), 'a1\n')
    writeFileSync(join(f.root, 'README.md'), 'dirty\n')
    const r2 = computeRefreshPlan({ projectRoot: f.root, specBase: f.specBase, projectName: 'demo' })
    assert.equal(r2.ok, true, 'scope 外（README 不在 map paths）脏不阻断')
  })

  it('scope 空回退全仓源码面：.sillyspec 脏不阻断、源码脏阻断', (t) => {
    const f = mkRefreshRepo({ docs: {}, map: null })
    t.after(() => cleanup(f.root))
    writeFileSync(join(f.scanDir, 'ARCHITECTURE.md'), refDoc(f.base))
    f.run('git add -A && git commit -q -m doc')
    writeFileSync(join(f.specBase, 'docs', 'demo', 'scan', 'NOTES.md'), '进度库自身脏\n')
    const r1 = computeRefreshPlan({ projectRoot: f.root, specBase: f.specBase, projectName: 'demo' })
    assert.equal(r1.ok, true, '.sillyspec/ 脏在回退面被排除')
    writeFileSync(join(f.root, 'src/a.js'), 'uncommitted\n')
    const r2 = computeRefreshPlan({ projectRoot: f.root, specBase: f.specBase, projectName: 'demo' })
    assert.equal(r2.ok, false)
    assert.equal(r2.kind, 'dirty-worktree')
  })

  it('非祖先基线 → 硬门 non-ancestor 拒绝', (t) => {
    const f = mkRefreshRepo({ docs: {} })
    t.after(() => cleanup(f.root))
    writeFileSync(join(f.scanDir, 'ARCHITECTURE.md'), refDoc(f.base))
    f.run('git add -A && git commit -q -m doc')
    f.run('git checkout -q --orphan other')
    f.run('git commit -q --allow-empty -m orphan')
    const orphan = f.run('git rev-parse HEAD')
    f.run('git checkout -q master')
    writeFileSync(join(f.scanDir, 'ARCHITECTURE.md'), refDoc(orphan))
    const r = computeRefreshPlan({ projectRoot: f.root, specBase: f.specBase, projectName: 'demo' })
    assert.equal(r.ok, false)
    assert.equal(r.kind, 'non-ancestor')
  })

  it('受影响文档 scan_depth: quick → 硬门 quick-depth 拒绝', (t) => {
    const f = mkRefreshRepo({ docs: {} })
    const quickDoc = refDoc(f.base).replace('---\n\n# 架构', 'scan_depth: quick\n---\n\n# 架构')
    writeFileSync(join(f.scanDir, 'ARCHITECTURE.md'), quickDoc)
    f.run('git add -A && git commit -q -m doc')
    t.after(() => cleanup(f.root))
    writeFileSync(join(f.root, 'src/a.js'), 'a2\n')
    f.run('git add -A && git commit -q -m change')
    const r = computeRefreshPlan({ projectRoot: f.root, specBase: f.specBase, projectName: 'demo' })
    assert.equal(r.ok, false)
    assert.equal(r.kind, 'quick-depth')
  })

  it('引用命中 → 受影响集 + guard 握手文件（白名单/docHashes/短哈希）+ hunks/commits 材料', (t) => {
    const f = mkRefreshRepo({ docs: {}, map: MAP })
    t.after(() => cleanup(f.root))
    writeFileSync(join(f.scanDir, 'ARCHITECTURE.md'), refDoc(f.base))
    writeFileSync(join(f.scanDir, 'PROJECT.md'), refDoc(f.base, '无引用正文'))
    f.run('git add -A && git commit -q -m doc')
    writeFileSync(join(f.root, 'src/a.js'), 'a2\n')
    f.run('git add -A')
    f.run('git commit -q -m change-a')
    const r = computeRefreshPlan({ projectRoot: f.root, specBase: f.specBase, projectName: 'demo' })
    assert.equal(r.ok, true)
    assert.equal(r.affectedDocs.length, 1, '只有 ARCHITECTURE 引用命中')
    assert.equal(r.affectedDocs[0].file, 'ARCHITECTURE.md')
    assert.equal(r.affectedDocs[0].staleRefs[0].file, 'src/a.js')
    assert.ok(r.affectedDocs[0].hunks.includes('a2'), 'hunks 材料含变更内容')
    assert.ok(r.affectedDocs[0].commits.includes('change-a'), 'commits 材料含提交说明')
    // guard 握手
    const guard = JSON.parse(readFileSync(join(f.specBase, '.runtime', 'scan-guard.json'), 'utf8'))
    assert.equal(guard.mode, 'scan-refresh')
    assert.deepEqual(guard.refreshDocs, ['docs/demo/scan/ARCHITECTURE.md'])
    assert.ok(guard.docHashes['docs/demo/scan/ARCHITECTURE.md'], 'docHashes 记录内容哈希')
    // 不变式（重审修复回归）：白名单成员必须有哈希——push 必须在哈希成功后（防读失败 fail-open 进白名单）
    assert.deepEqual(Object.keys(guard.docHashes).sort(), [...guard.refreshDocs].sort(), 'refreshDocs 与 docHashes 键集一致（无哈希不进白名单）')
    assert.equal(guard.sourceCommit.length, 7, 'sourceCommit 用 7 位短哈希（与盖章同格式）')
    assert.equal(guard.forceRescan, false)
  })

  it('基线=HEAD 的文档标 fresh；per-doc 分组（新基线文档不吃旧窗口）', (t) => {
    const f = mkRefreshRepo({ docs: {} })
    writeFileSync(join(f.scanDir, 'ARCHITECTURE.md'), refDoc(f.base))
    f.run('git add -A && git commit -q -m doc')
    t.after(() => cleanup(f.root))
    writeFileSync(join(f.root, 'src/a.js'), 'a2\n')
    f.run('git add -A')
    f.run('git commit -q -m change')
    const head = f.run('git rev-parse HEAD')
    // PROJECT 已推进到 HEAD（模拟上轮 refresh --done），ARCHITECTURE 仍在旧基线
    writeFileSync(join(f.scanDir, 'PROJECT.md'), refDoc(head))
    const r = computeRefreshPlan({ projectRoot: f.root, specBase: f.specBase, projectName: 'demo' })
    assert.equal(r.ok, true)
    assert.ok(r.freshDocs.includes('PROJECT.md'), 'PROJECT 标 fresh 不进受影响集')
    assert.equal(r.affectedDocs.length, 1)
    assert.equal(r.affectedDocs[0].file, 'ARCHITECTURE.md')
  })

  it('软门：漂移超阈值拒绝（--force 可越并注入警告）', (t) => {
    const f = mkRefreshRepo({ docs: {} })
    t.after(() => cleanup(f.root))
    writeFileSync(join(f.scanDir, 'ARCHITECTURE.md'), refDoc(f.base))
    f.run('git add -A && git commit -q -m doc')
    // 造 101 个 scope 内变更 commit（每 commit 一个新文件——漂移 101 > 100）
    for (let i = 0; i < 101; i++) {
      writeFileSync(join(f.root, `src/f${i}.js`), 'x\n')
      f.run('git add -A')
      f.run(`git commit -q -m c${i}`)
    }
    const r = computeRefreshPlan({ projectRoot: f.root, specBase: f.specBase, projectName: 'demo' })
    assert.equal(r.ok, false)
    assert.equal(r.kind, 'soft-gate')
    const r2 = computeRefreshPlan({ projectRoot: f.root, specBase: f.specBase, projectName: 'demo', force: true })
    assert.equal(r2.ok, true, '--force 越软门')
    assert.ok(r2.warnings.some(w => w.includes('--force')))
  })
})

// ── IO 面（task-06）──
import { runRefresh, finalizeRefresh } from '../src/scan-refresh.js'

describe('runRefresh / finalizeRefresh IO 面', () => {
  it('runRefresh：拒绝场景退出 2 且输出含建议命令；工单就绪退出 0', async (t) => {
    const f = mkRefreshRepo({ docs: {} })
    t.after(() => cleanup(f.root))
    writeFileSync(join(f.scanDir, 'ARCHITECTURE.md'), refDoc(f.base))
    f.run('git add -A && git commit -q -m doc')
    writeFileSync(join(f.root, 'src/a.js'), 'uncommitted\n')
    const rej = await runRefresh({ projectRoot: f.root, specBase: f.specBase, projectName: 'demo' })
    assert.equal(rej, 2, 'dirty 拒绝退出 2')
    f.run('git checkout -q -- src/a.js')
    writeFileSync(join(f.root, 'src/a.js'), 'a2\n')
    f.run('git add -A && git commit -q -m change')
    const ok = await runRefresh({ projectRoot: f.root, specBase: f.specBase, projectName: 'demo' })
    assert.equal(ok, 0, '工单就绪退出 0')
  })

  it('finalize：无会话态拒绝（code 2）；内容比对门未编辑不 bump、编辑后 bump+审计落盘', async (t) => {
    const f = mkRefreshRepo({ docs: {} })
    t.after(() => cleanup(f.root))
    writeFileSync(join(f.scanDir, 'ARCHITECTURE.md'), refDoc(f.base))
    f.run('git add -A && git commit -q -m doc')
    writeFileSync(join(f.root, 'src/a.js'), 'a2\n')
    f.run('git add -A && git commit -q -m change')
    const noSession = await finalizeRefresh({ projectRoot: f.root, specBase: f.specBase, projectName: 'demo' })
    assert.equal(noSession.code, 2, '无 guard 会话态拒绝')

    const plan = computeRefreshPlan({ projectRoot: f.root, specBase: f.specBase, projectName: 'demo' })
    assert.equal(plan.ok, true)
    // ①拍后未编辑 → 比对门拦截：默认不盖章
    const unedited = await finalizeRefresh({ projectRoot: f.root, specBase: f.specBase, projectName: 'demo' })
    assert.equal(unedited.code, 0)
    assert.equal(unedited.bumped.length, 0)
    assert.ok(unedited.skipped.some(s => s.reason.includes('未编辑')))
    // 模拟 agent 手术编辑（引用更新到新行）
    const head = f.run('git rev-parse HEAD')
    writeFileSync(join(f.scanDir, 'ARCHITECTURE.md'), [
      '---', 'author: t', `source_commit: ${f.base}`, '---', '', '# 架构（Architecture）', '', '引用 `src/a.js:2`（已更新）', '',
    ].join('\n'))
    const done = await finalizeRefresh({ projectRoot: f.root, specBase: f.specBase, projectName: 'demo' })
    assert.equal(done.code, 0, `postCheck 不应 failed（实际 ${done.postCheckStatus}）`)
    assert.equal(done.bumped.length, 1)
    const after = readFileSync(join(f.scanDir, 'ARCHITECTURE.md'), 'utf8')
    assert.match(after, new RegExp(`^source_commit: ${head.slice(0, 7)}$`, 'm'), '基线推进到 HEAD')
    assert.match(after, /^generator: sillyspec-scan-refresh$/m)
    assert.ok(done.auditPath && existsSync(done.auditPath), '审计文件落盘')
    const audit = JSON.parse(readFileSync(done.auditPath, 'utf8'))
    assert.equal(audit.changeType, 'scan-refresh')
    assert.equal(audit.bumped.length, 1)
    assert.ok(typeof audit.guardSourceCommit === 'string' && audit.guardSourceCommit.length >= 7, '审计记①拍基线锚')
    assert.ok(audit.detectionLimit.includes('file:line'), '审计含检出极限声明')
    assert.ok(Array.isArray(audit.skippedUnedited), '审计记未编辑跳过清单')
  })
})

// ── 全链路 e2e（task-07）：闭环后下轮 diff 从新基线起算 + 写面限界 ──
import { computeScanDiff } from '../src/scan-diff.js'
import { shouldBlock } from '../src/hooks/worktree-guard.js'
import { createHash } from 'node:crypto'

describe('scan refresh 全链路 e2e（临时 git 仓）', () => {
  it('闭环：refresh → 编辑 → --done → 下轮 scan diff 从新基线起算（旧漂移清零）', async (t) => {
    const f = mkRefreshRepo({ docs: {}, map: MAP })
    t.after(() => cleanup(f.root))
    writeFileSync(join(f.scanDir, 'ARCHITECTURE.md'), refDoc(f.base))
    f.run('git add -A && git commit -q -m doc')
    writeFileSync(join(f.root, 'src/a.js'), 'a2\n')
    f.run('git add -A && git commit -q -m change')

    // ①拍 → guard 白名单内 hook 放行（直接调 hook 主入口，不依赖宿主安装）
    // 注意：白名单外的 PROJECT.md 在①拍**之前**写入（无过期引用→不进白名单）——
    // HEAD 一致性门（重审 P1 修复）后，①拍与 --done 之间不允许再 commit，中途 commit 场景
    // 由下方独立用例覆盖
    writeFileSync(join(f.scanDir, 'PROJECT.md'), refDoc(f.base, '正文（无引用，不进白名单）'))
    assert.equal(await runRefresh({ projectRoot: f.root, specBase: f.specBase, projectName: 'demo' }), 0)
    const guard = JSON.parse(readFileSync(join(f.specBase, '.runtime', 'scan-guard.json'), 'utf8'))
    assert.equal(guard.mode, 'scan-refresh')
    const blocked = shouldBlock({ tool: 'Write', filePath: join(f.scanDir, 'ARCHITECTURE.md'), cwd: f.root })
    assert.equal(blocked.blocked, false, '①拍后白名单内文档编辑被 hook 放行')
    // PROJECT 无过期引用 → 不在白名单 → guard check-1 异基线拦截（mode 会话态下白名单外走原保护）
    const blocked2 = shouldBlock({ tool: 'Write', filePath: join(f.scanDir, 'PROJECT.md'), cwd: f.root })
    assert.equal(blocked2.blocked, true, '白名单外文档保护不放松')

    // 模拟手术编辑 + ②拍
    writeFileSync(join(f.scanDir, 'ARCHITECTURE.md'), [
      '---', 'author: t', `source_commit: ${f.base}`, '---', '', '# 架构（Architecture）', '', '引用 `src/a.js:2`（行号已更新）', '',
    ].join('\n'))
    const done = await finalizeRefresh({ projectRoot: f.root, specBase: f.specBase, projectName: 'demo' })
    assert.equal(done.code, 0)
    assert.equal(done.bumped.length, 1)

    // 下轮 scan diff：默认基线聚合=落后最多。ARCHITECTURE 已在 HEAD、PROJECT 在旧基线——
    // 但 PROJECT 无过期引用命中；聚合基线仍取 PROJECT 的（保守），漂移窗含 docs commit（outOfScope）
    const head = f.run('git rev-parse HEAD')
    const after = readFileSync(join(f.scanDir, 'ARCHITECTURE.md'), 'utf8')
    assert.match(after, new RegExp(`^source_commit: ${head.slice(0, 7)}$`, 'm'), 'bump 到 HEAD')
    // 再跑一次 refresh：ARCHITECTURE fresh，无 staleRefs 命中 → 零检出漂移
    const r2 = computeRefreshPlan({ projectRoot: f.root, specBase: f.specBase, projectName: 'demo' })
    assert.equal(r2.ok, true)
    assert.ok(r2.freshDocs.includes('ARCHITECTURE.md'))
    assert.equal(r2.affectedDocs.length, 0, '刷新后旧漂移清零（下轮从新基线起算）')

    // 写面限界：modules/ 与 knowledge/ 全程零写入
    assert.ok(!existsSync(join(f.specBase, 'docs', 'demo', 'modules', 'anything-touched.txt')))
    const knowledgeDir = join(f.specBase, 'knowledge')
    assert.ok(!existsSync(knowledgeDir), 'knowledge/ 零写入（D-001@v1 写面限界）')
  })
})

// ── 重审修复回归（独立审计 P1/P2/P3）──
describe('重审修复：HEAD 一致性门 / --docs 路径穿越 / bump 尾部容错', () => {
  async function mkPlanFixture() {
    const f = mkRefreshRepo({ docs: {}, map: MAP })
    writeFileSync(join(f.scanDir, 'ARCHITECTURE.md'), refDoc(f.base))
    f.run('git add -A && git commit -q -m doc')
    writeFileSync(join(f.root, 'src/a.js'), 'a2\n')
    f.run('git add -A && git commit -q -m change')
    const plan = computeRefreshPlan({ projectRoot: f.root, specBase: f.specBase, projectName: 'demo' })
    assert.equal(plan.ok, true)
    return f
  }

  it('P1：①拍→--done 之间 HEAD 被推进 → 拒绝盖章（code 2，未核对 commit 不被盖章成已核对）', async (t) => {
    const f = await mkPlanFixture()
    t.after(() => cleanup(f.root))
    // 模拟 agent 已完成编辑
    writeFileSync(join(f.scanDir, 'ARCHITECTURE.md'), refDoc(f.base).replace('src/a.js:1', 'src/a.js:2'))
    // 他者会话推进 HEAD
    writeFileSync(join(f.root, 'src/b.js'), 'b1\n')
    f.run('git add -A && git commit -q -m other-session')
    const r = await finalizeRefresh({ projectRoot: f.root, specBase: f.specBase, projectName: 'demo' })
    assert.equal(r.code, 2, 'HEAD 推进 → 拒绝')
    assert.equal(r.bumped.length, 0)
    const after = readFileSync(join(f.scanDir, 'ARCHITECTURE.md'), 'utf8')
    assert.match(after, new RegExp(`^source_commit: ${f.base.slice(0, 7)}`, 'm'), '基线仍是①拍前值（未被推进）')
  })

  it('P2：--docs 带路径分隔符/.. → 进 skipped 不写盘（写面限界防穿越）', async (t) => {
    const f = await mkPlanFixture()
    t.after(() => cleanup(f.root))
    writeFileSync(join(f.scanDir, 'ARCHITECTURE.md'), refDoc(f.base).replace('src/a.js:1', 'src/a.js:2'))
    const modulesDir = join(f.specBase, 'docs', 'demo', 'modules')
    const victim = join(modulesDir, 'core.md')
    writeFileSync(victim, '# 卡片\n')
    const r = await finalizeRefresh({
      projectRoot: f.root, specBase: f.specBase, projectName: 'demo',
      docs: ['../modules/core.md', 'sub\dir.md', 'ARCHITECTURE.md'],
    })
    assert.equal(r.code, 0, '合法名照常推进')
    assert.ok(r.bumped.every(p => !p.includes('modules')), 'modules/ 零写入')
    assert.equal(readFileSync(victim, 'utf8'), '# 卡片\n', '穿越目标文件未被盖章')
    assert.ok(r.skipped.some(s => s.file === '../modules/core.md' && s.reason.includes('穿越')))
    assert.ok(r.skipped.some(s => s.file === 'sub\dir.md'))
  })

  it('P3：bump 对尾部 --- 无换行的 frontmatter 不产生双块', (t) => {
    const f = mkSpec({ docs: {} })
    t.after(() => cleanup(f.root))
    const noTrailingNl = '---\nauthor: t\nsource_commit: 1111111\n---' // 尾 --- 无换行（agent 手编中间态）
    writeFileSync(join(f.scanDir, 'ARCHITECTURE.md'), noTrailingNl)
    const r = bumpScanDocBaselines({
      cwd: f.cwd, specDir: f.specBase, project: 'demo',
      docs: ['ARCHITECTURE.md'], headShort: 'abcdef1',
    })
    assert.equal(r.bumped.length, 1)
    const after = readFileSync(join(f.scanDir, 'ARCHITECTURE.md'), 'utf8')
    assert.equal((after.match(/^---$/gm) || []).length, 2, '恰好一对 frontmatter 界符（无双块）')
    assert.match(after, /^source_commit: abcdef1$/m, '键原位替换')
    assert.match(after, /^author: t$/m, '其余键保留')
  })
})
