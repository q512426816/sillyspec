/**
 * 双通道收尾留痕统一夹具（变更 2026-10-07-unify-close-trace）。
 *
 * 根因：thin（flow done）只写 change.patch/change-patch.json、heavy（execute --done）只写
 * scope-audit.json/scope-audit.patch——消费方各认一份，每类变更恰好一张卡失真。本变更落
 * 共用 writeCloseTraceArtifacts：一次写齐四件、sha256 双套同锚（缺陷 thin-flow-done-no-
 * scope-audit-snapshot 修复方向③；方向②读侧回退由 2026-10-07-scope-audit-thin-patch-replay 落地）。
 *
 * 覆盖（requirements FR-01~04）：
 *   1. writer 单测：ok 态四件齐备/同锚；failed 态双标不落 patch（FR-01/03）
 *   2. buildThinSnapshotRows：三态/治理过滤/跨仓补行/stats 缺档（FR-01）
 *   3. round-trip：writer 产物 → computeChangeScopeAudit 快照回放（closedBy 标注）+ --file 切片（FR-04）
 *   4. thin CLI e2e：flow done 全链四件齐备 + 查询走快照态（FR-01/04）
 *   5. heavy CLI e2e：execute --done 双轨落盘，change-patch.json=主仓实改行投影（FR-02）
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { writeCloseTraceArtifacts, buildThinSnapshotRows } from '../src/flow-parity.js'
import { computeChangeScopeAudit, getFileDiff } from '../src/scope-audit.js'
import { makeRepo, initChange, seedStage, runCLI, runStage } from './_cli-step-harness.mjs'
import { ProgressManager } from '../src/progress.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CLI = join(ROOT, 'src', 'index.js')

function sh(cwd, args) {
  return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}
function cleanup(d) {
  try { rmSync(d, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }) } catch { /* Windows 句柄延迟 */ }
}
function sha256(text) {
  return createHash('sha256').update(String(text).replace(/\r\n/g, '\n'), 'utf8').digest('hex')
}

const PATCH_A = 'diff --git a/src/a.js b/src/a.js\nindex 111..222 100644\n--- a/src/a.js\n+++ b/src/a.js\n@@ -1,2 +1,3 @@\n a1\n a2\n+a3\n'

// ───────────────────────── FR-01/03：writer 单测 ─────────────────────────

test('FR-01/03 writer 单测：ok 态四件齐备、两 patch 同字节、两 json 同锚', () => {
  const d = mkdtempSync(join(tmpdir(), 'ct-ok-'))
  try {
    const dir = join(d, 'chg')
    mkdirSync(dir, { recursive: true })
    const r = writeCloseTraceArtifacts({
      changeDir: dir, change: 'chg', baseline: 'abc123', head: 'def456',
      files: ['src/a.js'], metaTotals: { files: 1, additions: 1, deletions: 0 },
      patchText: PATCH_A, savedAt: '2026-10-07T16:00:00.000Z',
      snapObj: {
        mode: 'full-flow', ok: true, degradedReason: null, baseAnchor: 'abc123',
        totals: { files: 1, additions: 1, deletions: 0 },
        rows: [{ path: 'src/a.js', planned: '修改', additions: 1, deletions: 0, kind: 'modified', verdict: 'planned' }],
        excluded: { foreignDeclared: [] },
        note: 'flow done 时点冻结（本文件落盘时采集）', closedBy: 'flow done',
      },
      meta: { note: 'flow done 时点冻结（fixture）' },
    })
    assert.equal(r.patchStatus, 'ok')
    assert.equal(r.patchSha256, sha256(PATCH_A), '返回 sha 与 patch 正文一致（LF 归一口径，正文已带结尾换行不重复补）')
    const cp = readFileSync(join(dir, 'change.patch'), 'utf8')
    const sp = readFileSync(join(dir, 'scope-audit.patch'), 'utf8')
    assert.equal(cp, sp, 'change.patch ≡ scope-audit.patch（字节一致）')
    const cMeta = JSON.parse(readFileSync(join(dir, 'change-patch.json'), 'utf8'))
    const snap = JSON.parse(readFileSync(join(dir, 'scope-audit.json'), 'utf8'))
    assert.equal(cMeta.patchSha256, sha256(cp), 'change-patch.json 锚定')
    assert.equal(snap.patchSha256, cMeta.patchSha256, '两 json patchSha256 相同（双套同锚）')
    assert.equal(cMeta.patchStatus, 'ok'); assert.equal(snap.patchStatus, 'ok')
    assert.equal(cMeta.change, 'chg'); assert.deepEqual(cMeta.files, ['src/a.js'])
    assert.equal(cMeta.baseline, 'abc123'); assert.equal(cMeta.head, 'def456')
    assert.equal(snap.closedBy, 'flow done', '快照带收尾通道标注')
    assert.equal(snap.savedAt, '2026-10-07T16:00:00.000Z', 'savedAt 落盘')
  } finally { cleanup(d) }
})

test('FR-03 writer 单测：patchText 空 → 双套同标 failed、不落 patch 文件', () => {
  const d = mkdtempSync(join(tmpdir(), 'ct-fail-'))
  try {
    const dir = join(d, 'chg')
    mkdirSync(dir, { recursive: true })
    const r = writeCloseTraceArtifacts({
      changeDir: dir, change: 'chg', baseline: null, head: null,
      files: ['src/a.js'], metaTotals: { files: 1, additions: 0, deletions: 0 },
      patchText: null, savedAt: '2026-10-07T16:01:00.000Z',
      snapObj: { mode: 'full-flow', ok: true, degradedReason: null, baseAnchor: null, totals: { files: 1, additions: 0, deletions: 0 }, rows: [], excluded: { foreignDeclared: [] }, note: 'n', closedBy: 'execute --done' },
      meta: {},
    })
    assert.equal(r.patchStatus, 'failed'); assert.equal(r.patchSha256, null)
    assert.ok(!existsSync(join(dir, 'change.patch')), 'failed 不落 change.patch')
    assert.ok(!existsSync(join(dir, 'scope-audit.patch')), 'failed 不落 scope-audit.patch')
    const cMeta = JSON.parse(readFileSync(join(dir, 'change-patch.json'), 'utf8'))
    const snap = JSON.parse(readFileSync(join(dir, 'scope-audit.json'), 'utf8'))
    assert.equal(cMeta.patchStatus, 'failed'); assert.equal(snap.patchStatus, 'failed', '双套同标')
    assert.ok(!('patchSha256' in cMeta) && !('patchSha256' in snap), '无伪 hash')
  } finally { cleanup(d) }
})

// ───────────────────────── FR-01：buildThinSnapshotRows 单测 ─────────────────────────

test('FR-01 buildThinSnapshotRows：三态/治理过滤/跨仓补行/stats 缺档不出伪数据', () => {
  const { rows, totals } = buildThinSnapshotRows({
    ownFiles: [
      'src/a.js', 'src/b.js', 'src/extra.js',
      '.sillyspec/changes/chg/design.md', // 治理工件 → 不进快照行
    ],
    stats: new Map([
      ['src/a.js', { additions: 2, deletions: 0, kind: 'modified' }],
      ['src/b.js', { additions: 1, deletions: 0, kind: 'new' }],
      // src/extra.js 无 stats → 行数 null 档
    ]),
    planEntries: [
      { path: 'src/a.js', operation: '修改' },
      { path: 'src/c.js', operation: '修改' },           // 清单声明未动 → untouched 补行
      { path: 'other/x.py', operation: '新增', repo: 'other' }, // 跨仓 → ⊘ untouched 补行
    ],
  })
  const byPath = new Map(rows.map((r) => [r.path, r]))
  assert.equal(byPath.get('src/a.js').verdict, 'planned')
  assert.equal(byPath.get('src/a.js').additions, 2)
  assert.equal(byPath.get('src/b.js').verdict, 'unplanned')
  assert.equal(byPath.get('src/extra.js').additions, null, 'stats 缺档 → null 不出伪数据')
  assert.equal(byPath.get('src/c.js').verdict, 'untouched')
  assert.equal(byPath.get('src/c.js').additions, 0)
  assert.equal(byPath.get('other/x.py').crossRepo, 'other', '跨仓补行带 crossRepo（⊘ 形态）')
  assert.ok(!byPath.has('.sillyspec/changes/chg/design.md'), '治理工件被 filterDeliverableFiles 滤除')
  assert.equal(totals.files, 5)
  assert.equal(totals.additions, 3, 'null 行不计合计')
  // planEntries 空 → 实际侧 only（无 verdict）
  const noPlan = buildThinSnapshotRows({ ownFiles: ['src/a.js'], stats: new Map(), planEntries: [] })
  assert.ok(!('verdict' in noPlan.rows[0]), '清单缺失 → 行无 verdict（与主链路降级同语义）')
})

// ───────────────────────── FR-04：写读 round-trip ─────────────────────────

test('FR-04 round-trip：writer 产物 → 快照回放（closedBy 标注）+ --file 冻结切片', async () => {
  const d = mkdtempSync(join(tmpdir(), 'ct-rt-'))
  try {
    sh(d, ['init', '-q', '-b', 'main'])
    sh(d, ['config', 'user.email', 't@t.com']); sh(d, ['config', 'user.name', 't'])
    mkdirSync(join(d, 'src'), { recursive: true })
    writeFileSync(join(d, 'src', 'a.js'), 'a1\na2\n')
    writeFileSync(join(d, '.gitignore'), '.sillyspec/\n')
    sh(d, ['add', '-A']); sh(d, ['commit', '-q', '-m', 'init'])
    const baseline = sh(d, ['rev-parse', 'HEAD']).trim()

    const changeDir = join(d, '.sillyspec', 'changes', 'archive', 'rt-chg')
    mkdirSync(changeDir, { recursive: true })
    writeFileSync(join(changeDir, 'design.md'), '# design（fixture）\n\n## 文件变更清单\n\n| 操作 | 文件路径 | 说明 |\n|---|---|---|\n| 修改 | src/a.js | 说明 |\n')
    const { rows, totals } = buildThinSnapshotRows({
      ownFiles: ['src/a.js', '.sillyspec/changes/archive/rt-chg/design.md'],
      stats: new Map([['src/a.js', { additions: 1, deletions: 0, kind: 'modified' }]]),
      planEntries: [{ path: 'src/a.js', operation: '修改' }],
    })
    writeCloseTraceArtifacts({
      changeDir: changeDir, change: 'rt-chg', baseline, head: baseline,
      files: ['src/a.js', '.sillyspec/changes/archive/rt-chg/design.md'],
      metaTotals: { files: 2, additions: 1, deletions: 0 },
      patchText: PATCH_A, savedAt: '2026-10-07T16:02:00.000Z',
      snapObj: { mode: 'full-flow', ok: true, degradedReason: null, baseAnchor: baseline, totals, rows, excluded: { foreignDeclared: [] }, note: 'flow done 时点冻结（本文件落盘时采集）', closedBy: 'flow done' },
      meta: { note: 'flow done 时点冻结（fixture）' },
    })

    const r = await computeChangeScopeAudit({ cwd: d, changeName: 'rt-chg' })
    assert.equal(r.ok, true)
    assert.ok(r.note && r.note.includes('flow done 时点冻结快照'), `note 按通道标注（实际 ${r.note}）`)
    assert.ok(!r.note.includes('execute --done 时点冻结快照'), 'thin 快照不再误标 execute --done')
    assert.equal(r.baseAnchor, baseline)
    const a = r.rows.find((x) => x.path === 'src/a.js')
    assert.ok(a && a.verdict === 'planned', '快照回放出真实三态')

    const fd = await getFileDiff({ cwd: d, changeName: 'rt-chg', filePath: 'src/a.js' })
    assert.equal(fd.ok, true)
    assert.ok(fd.anchorLabel && fd.anchorLabel.includes('冻结 patch'), `--file 走冻结切片（实际 ${fd.anchorLabel}）`)
    assert.ok(fd.diff && fd.diff.includes('+a3'), 'diff 为冻结时点内容')
  } finally { cleanup(d) }
})

// ───────────────────────── FR-01/04：thin CLI e2e ─────────────────────────

test('FR-01/04 thin CLI e2e：flow done 全链四件齐备 + 查询走快照态', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'ct-thin-'))
  try {
    sh(cwd, ['init', '-q', '-b', 'main'])
    sh(cwd, ['config', 'user.email', 't@t.com']); sh(cwd, ['config', 'user.name', 't'])
    mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
    writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), 'project:\n  type: generic\ncommands:\n  test: "node -e \\"0\\""\n  lint: "node -e \\"0\\""\nflow:\n  mode: thin\n')
    writeFileSync(join(cwd, 'base.txt'), 'base\n')
    sh(cwd, ['add', '.']); sh(cwd, ['commit', '-q', '-m', 'base'])
    const cn = '2026-10-07-ct-thin-e2e'
    const env = { ...process.env, SILLYSPEC_WATCHER: '0' }
    const s1 = spawnSync(process.execPath, [CLI, '--dir', cwd, 'flow', 'start', '--change', cn, '--autopilot', '--input', '双轨留档 e2e\n\n成功标准：\n- flow done 后四件齐备'], { cwd, encoding: 'utf8', timeout: 120_000, env })
    assert.equal(s1.status, 0, `start 失败: ${s1.stderr}`)
    const base = join(cwd, '.sillyspec', 'changes', cn)
    // design 四问一行作答（plain，不触发评审定档）+ 文件变更清单声明交付文件
    writeFileSync(join(base, 'design.md'), readFileSync(join(base, 'design.md'), 'utf8')
      .replace(/^(本变更怎么解决问题|动了哪些函数|1\. 乱序|2\. 并发写|3\. 切换|4\. 作用域|本方案最大的风险)([^\n]*)$/gm, '$&\n不适用：协议测试夹具——一行作答即合规')
      + '\n## 文件变更清单\n\n| 操作 | 路径 | 说明 |\n|---|---|---|\n| 新增 | src/work.js | 交付 |\n')
    writeFileSync(join(base, 'requirements.md'), readFileSync(join(base, 'requirements.md'), 'utf8')
      .replace(/^- （待撰写.*$/gm, '- 系统 MUST 达成该条标准行为（协议夹具行为句）')
      .replace(/^FR-\d{2}: （待填.*$/gm, (m) => m.split(':')[0] + ': 不适用：协议测试夹具——无独立测试面'))
    // 任务面收敛为单任务 + 证据提交 + 勾选
    writeFileSync(join(base, 'tasks.md'), '---\nauthor: fixture\n---\n\n# 任务注册表（Tasks）\n\n- [x] task-01: 交付 src/work.js（e2e 夹具）\n')
    mkdirSync(join(cwd, 'src'), { recursive: true })
    writeFileSync(join(cwd, 'src', 'work.js'), 'export const a = 1\n')
    sh(cwd, ['add', 'src/work.js']); sh(cwd, ['commit', '-q', '-m', `work (${cn}) (task-01)`])

    const s2 = spawnSync(process.execPath, [CLI, '--dir', cwd, 'flow', 'done', '--change', cn], { cwd, encoding: 'utf8', timeout: 300_000, env })
    const out2 = s2.stdout + s2.stderr
    assert.equal(s2.status, 0, `done 失败: ${out2.split('\n').slice(-8).join(' | ')}`)
    assert.match(out2, /变更 patch 留档（双轨统一）/, '双轨留档行（保既有前缀断言兼容）')

    const arch = join(cwd, '.sillyspec', 'changes', 'archive', cn)
    for (const f of ['change.patch', 'change-patch.json', 'scope-audit.json', 'scope-audit.patch']) {
      assert.ok(existsSync(join(arch, f)), `归档目录含 ${f}`)
    }
    const snap = JSON.parse(readFileSync(join(arch, 'scope-audit.json'), 'utf8'))
    assert.equal(snap.closedBy, 'flow done', 'thin 快照带通道标注')
    const work = (snap.rows || []).find((r) => r.path === 'src/work.js')
    assert.ok(work && work.verdict === 'planned', '快照行真实三态（work.js planned）')
    const cp = readFileSync(join(arch, 'change.patch'), 'utf8')
    assert.equal(readFileSync(join(arch, 'scope-audit.patch'), 'utf8'), cp, '两 patch 同字节')
    const meta = JSON.parse(readFileSync(join(arch, 'change-patch.json'), 'utf8'))
    assert.equal(meta.patchSha256, snap.patchSha256, '两 json 同锚')

    // 查询面：归档后走快照记录态（closedBy 标注），不再依赖 change-patch 回放兜底
    const s3 = spawnSync(process.execPath, [CLI, '--dir', cwd, 'scope-audit', '--change', cn], { cwd, encoding: 'utf8', timeout: 60_000, env })
    const out3 = s3.stdout + s3.stderr
    assert.equal(s3.status, 0, `scope-audit 失败: ${out3}`)
    assert.ok(out3.includes('flow done 时点冻结快照'), `查询 note 标通道（实际 ${out3.split('\n').slice(2, 5).join(' | ')}）`)
    assert.ok(out3.includes('✓ 计划内'), '查询出真实三态')
  } finally { cleanup(cwd) }
})

// ───────────────────────── FR-02：heavy CLI e2e ─────────────────────────

function writePlan(changeDir, allChecked) {
  const t3 = allChecked ? '[x]' : '[ ]'
  writeFileSync(join(changeDir, 'tasks.md'), `- [x] task-01: a\n- [x] task-02: b\n- ${t3} task-03: c\n`, 'utf8')
  writeFileSync(join(changeDir, 'plan.md'), '# Plan\n\n## Wave 1\n\n- task-01\n- task-02\n- task-03\n', 'utf8')
}
function writeWorktreeMeta(specBase, cn) {
  const dir = join(specBase, '.runtime', 'worktrees', cn)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'meta.json'), JSON.stringify({ depsStatus: 'n/a', mode: 'in-place-fallback' }), 'utf8')
}
const FIXED_RUN_ID = 'exec-2026-10-07-100000'
function writePassingTaskReviews(specBase, cn, gitHead) {
  const runtimeRoot = join(specBase, '.runtime')
  writeFileSync(join(runtimeRoot, `current-execute-run-id-${cn}`), FIXED_RUN_ID, 'utf8')
  for (const taskNum of ['01', '02', '03']) {
    const dir = join(runtimeRoot, 'execute-runs', FIXED_RUN_ID, 'tasks', `task-${taskNum}`)
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'review.json'), JSON.stringify({
      schemaVersion: 1, task: `task-${taskNum}`, base: gitHead, head: gitHead,
      changedFiles: [], specVerdict: 'pass', qualityVerdict: 'pass', reviewerNotes: 't', requiredEvidence: [],
    }), 'utf8')
  }
}

test('FR-02 heavy CLI e2e：execute --done 双轨落盘，change-patch.json=主仓实改行投影', async () => {
  const { cwd, specBase } = makeRepo('ct-heavy-')
  const cn = '2026-10-07-ct-heavy-e2e'
  const pm = await initChange(cwd, specBase, cn)
  writePlan(join(specBase, 'changes', cn), true)
  writeWorktreeMeta(specBase, cn)
  mkdirSync(join(cwd, 'src'), { recursive: true })
  writeFileSync(join(cwd, 'src', 'app.js'), 'module.exports = 1\n') // 未提交交付 → 实改行
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd, encoding: 'utf8' }).trim()
  writePassingTaskReviews(specBase, cn, head)
  runCLI(['--dir', cwd, 'run', 'execute', '--change', cn], { cwd })
  const realSteps = (await pm.read(cwd, cn)).stages.execute.steps
  const waveIdx = realSteps.findIndex((s) => s.name.includes('Wave 1 执行'))
  await seedStage(pm, cwd, cn, 'execute', realSteps.map((s, i) => ({ name: s.name, status: i < waveIdx ? 'completed' : 'pending' })))

  const r = runStage('execute', cn, cwd, { done: true, output: 'step done' })
  assert.equal(r.status, 0, `execute --done 失败: ${r.combined.slice(-200)}`)
  assert.match(r.combined, /双轨落盘/, '双轨落盘行')

  const changeDir = join(specBase, 'changes', cn)
  for (const f of ['change.patch', 'change-patch.json', 'scope-audit.json', 'scope-audit.patch']) {
    assert.ok(existsSync(join(changeDir, f)), `heavy 收尾后含 ${f}`)
  }
  const snap = JSON.parse(readFileSync(join(changeDir, 'scope-audit.json'), 'utf8'))
  assert.equal(snap.closedBy, 'execute --done', 'heavy 快照带通道标注')
  const meta = JSON.parse(readFileSync(join(changeDir, 'change-patch.json'), 'utf8'))
  assert.equal(meta.change, cn)
  assert.ok(meta.files.includes('src/app.js'), 'files=主仓实改行投影（含未提交交付）')
  assert.equal(meta.totals.files, meta.files.length, 'totals.files 与投影行数一致')
  const cp = readFileSync(join(changeDir, 'change.patch'), 'utf8')
  assert.equal(readFileSync(join(changeDir, 'scope-audit.patch'), 'utf8'), cp, '两 patch 同字节')
  assert.equal(meta.patchSha256, snap.patchSha256, '两 json 同锚')
})
