/**
 * flow-diff-cmd.test.mjs — flow diff 只读查询子命令（2026-10-13-flow-diff-cmd）
 *
 * 背景：change 粒度文件统计的两态数据都已存在（归档件 change-patch.json scopeAudit /
 * 活跃面 baseline+git），缺查询口。本文件锚：
 *   FR-01 归档态：读 scopeAudit 渲染逐文件 +N/-M 与 totals（含 verdict），--json 同构；
 *   FR-02 活跃态：提交面+dirty 面双段、untracked 按行数、治理件（ownPrefix）剔除；
 *   FR-03 错误面：不存在 exit 1 一次给全 / 非法名白名单拒收 / 无 git 基线 exit 0；
 *   FR-04 只读零副作用：flow-state/工作树/HEAD 调用前后字节不变。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..')

function git(cwd, args) {
  return execFileSync('git', ['-C', cwd, ...args], { stdio: 'pipe' }).toString().trim()
}

function makeRepo() {
  const cwd = mkdtempSync(join(tmpdir(), 'fdiff-'))
  git(cwd, ['init', '-q', '-b', 'main'])
  git(cwd, ['config', 'user.email', 't@t'])
  git(cwd, ['config', 'user.name', 't'])
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), 'project:\n  type: generic\ncommands:\n  test: "node exit0.js"\nflow:\n  mode: thin\n')
  writeFileSync(join(cwd, 'base.txt'), 'base\n')
  git(cwd, ['add', '.'])
  git(cwd, ['commit', '-q', '-m', 'base'])
  return cwd
}

function cli(cwd, args) {
  return spawnSync(process.execPath, [join(REPO, 'src', 'index.js'), ...args], {
    cwd, encoding: 'utf8', timeout: 180_000,
    env: { ...process.env, SILLYSPEC_WATCHER: '0' },
  })
}

function fillDocs(specBase, change) {
  const base = join(specBase, 'changes', change)
  writeFileSync(join(base, 'design.md'), readFileSync(join(base, 'design.md'), 'utf8')
    .replace(/^(本变更怎么解决问题|动了哪些函数|1\. 乱序|2\. 并发写|3\. 切换|4\. 作用域|本方案最大的风险)([^\n]*)$/gm, '$&\n不适用：协议测试夹具——一行作答即合规'))
  writeFileSync(join(base, 'requirements.md'), readFileSync(join(base, 'requirements.md'), 'utf8')
    .replace(/^- （待撰写.*$/gm, '- 系统 MUST 达成该条标准行为（协议夹具行为句）')
    .replace(/^FR-\d{2}: （待填.*$/gm, (m) => m.split(':')[0] + ': 不适用：协议测试夹具——无独立测试面'))
}

function tickTasks(specBase, cwd, change) {
  const tasksPath = join(specBase, 'changes', change, 'tasks.md')
  writeFileSync(tasksPath, readFileSync(tasksPath, 'utf8').replace(/^- \[ \] (task-\d+):/gm, '- [x] $1:'))
  git(cwd, ['add', tasksPath])
  git(cwd, ['commit', '-q', '-m', 'chore: tick (task-01)'])
}

function writeReviewFixture(specBase, cwd, change) {
  const head = git(cwd, ['rev-parse', 'HEAD'])
  writeFileSync(join(specBase, 'changes', change, 'review.json'), JSON.stringify({
    schemaVersion: 1, change, reviewer: 'test-fixture', verdict: 'PASS', reviewedAgainst: head,
    findings: [], dimensionNotes: { 乱序: 'n/a', 并发: 'n/a', 切换: 'n/a', 作用域: 'n/a' }, reviewedAt: new Date().toISOString(),
  }, null, 2))
}

// ── FR-02：活跃态双段（提交面 + dirty 面），治理件剔除 ──
test('活跃态：提交面+dirty 面渲染，untracked 计行数，治理件剔除，--json 同构', () => {
  const cwd = makeRepo()
  const change = '2026-10-13-fdiff-live'
  const specBase = join(cwd, '.sillyspec')
  try {
    const s1 = cli(cwd, ['flow', 'start', '--change', change, '--input', 'x\n成功标准：\n- y', '--autopilot'])
    assert.equal(s1.status, 0, `start: ${s1.stderr}`)
    // 已提交交付 + 治理件提交（tick）
    writeFileSync(join(cwd, 'work.txt'), 'a\nb\n')
    git(cwd, ['add', 'work.txt'])
    git(cwd, ['commit', '-q', '-m', `work (${change}) (task-01)`])
    fillDocs(specBase, change)
    tickTasks(specBase, cwd, change)
    // 未提交：修改 tracked + 新建 untracked（3 行）
    writeFileSync(join(cwd, 'work.txt'), 'a\nb\nc\n')
    writeFileSync(join(cwd, 'fresh.txt'), '1\n2\n3\n')
    const before = {
      st: readFileSync(join(specBase, 'changes', change, 'flow-state.yaml'), 'utf8'),
      head: git(cwd, ['rev-parse', 'HEAD']),
      dirty: git(cwd, ['status', '--porcelain']),
    }
    const s2 = cli(cwd, ['flow', 'diff', '--change', change])
    assert.equal(s2.status, 0, `diff: ${s2.stdout}\n${s2.stderr}`)
    const out = s2.stdout
    assert.match(out, /work\.txt/, '交付文件在场')
    assert.match(out, /fresh\.txt/, 'untracked 文件在场')
    assert.doesNotMatch(out, /\.sillyspec\/changes\//, '治理件（本变更目录）剔除')
    assert.match(out, /active|活跃/, '活跃态标识')
    // 零副作用
    assert.equal(readFileSync(join(specBase, 'changes', change, 'flow-state.yaml'), 'utf8'), before.st, 'flow-state 字节不变')
    assert.equal(git(cwd, ['rev-parse', 'HEAD']), before.head, 'HEAD 不变')
    assert.equal(git(cwd, ['status', '--porcelain']), before.dirty, '工作树状态不变')
    // --json 同构
    const j = JSON.parse(cli(cwd, ['flow', 'diff', '--change', change, '--json']).stdout)
    assert.equal(j.mode, 'active')
    assert.equal(j.change, change)
    const work = j.rows.find((r) => r.path === 'work.txt')
    assert.ok(work, 'work.txt 在 rows')
    assert.equal(work.additions, 3, 'baseline→工作树累计 +3（新文件，终态 3 行）')
    assert.equal(work.deletions, 0)
    assert.equal(work.state, 'dirty', '有未提交改动标 dirty')
    const fresh = j.rows.find((r) => r.path === 'fresh.txt')
    assert.ok(fresh && fresh.additions === 3 && fresh.state === 'untracked', `untracked +3 state=untracked: ${JSON.stringify(fresh)}`)
    assert.ok(!j.rows.some((r) => r.path.includes(change)), '治理件不在 rows')
    assert.ok(j.totals && typeof j.totals.files === 'number' && j.totals.files >= 2, 'totals.files')
  } finally {
    rmSync(cwd, { recursive: true, force: true })
  }
})

// ── FR-01：归档态读 scopeAudit ──
test('归档态：读 change-patch.json scopeAudit 渲染 totals，--json 同构', () => {
  const cwd = makeRepo()
  const change = '2026-10-13-fdiff-arch'
  const specBase = join(cwd, '.sillyspec')
  try {
    cli(cwd, ['flow', 'start', '--change', change, '--input', 'x\n成功标准：\n- y', '--autopilot'])
    writeFileSync(join(cwd, 'work.txt'), 'hello\n')
    git(cwd, ['add', 'work.txt'])
    git(cwd, ['commit', '-q', '-m', `work (${change}) (task-01)`])
    fillDocs(specBase, change)
    // 声明 work.txt → 归档 scopeAudit verdict=planned（F1 断言锚）
    writeFileSync(join(specBase, 'changes', change, 'design.md'), readFileSync(join(specBase, 'changes', change, 'design.md'), 'utf8')
      + '\n## 文件变更清单\n\n| 操作 | 路径 | 说明 |\n|---|---|---|\n| 修改 | work.txt | 交付 |\n')
    tickTasks(specBase, cwd, change)
    writeReviewFixture(specBase, cwd, change)
    const done = cli(cwd, ['flow', 'done', '--change', change])
    assert.equal(done.status, 0, `done: ${done.stdout}\n${done.stderr}`)
    const meta = JSON.parse(readFileSync(join(specBase, 'changes', 'archive', change, 'change-patch.json'), 'utf8'))
    const s2 = cli(cwd, ['flow', 'diff', '--change', change])
    assert.equal(s2.status, 0, `diff: ${s2.stderr}`)
    assert.match(s2.stdout, /work\.txt/, '交付文件在场')
    assert.match(s2.stdout, /archived|归档/, '归档态标识')
    const j = JSON.parse(cli(cwd, ['flow', 'diff', '--change', change, '--json']).stdout)
    assert.equal(j.mode, 'archived')
    const cp = meta.scopeAudit || {}
    const srcTotals = (cp.totals && cp.totals.files != null) ? cp.totals : meta.totals
    assert.deepEqual({ files: j.totals.files, additions: j.totals.additions }, { files: srcTotals.files, additions: srcTotals.additions }, 'totals 与冻结件一致')
    const row = j.rows.find((r) => r.path === 'work.txt')
    assert.ok(row && row.additions === 1 && row.state === 'archived', `work.txt +1 state=archived: ${JSON.stringify(row)}`)
    assert.equal(row.verdict, 'planned', '归档行带 verdict（声明面命中 → planned）')
  } finally {
    rmSync(cwd, { recursive: true, force: true })
  }
})

// ── FR-03：错误面 ──
test('变更不存在 exit 1 一次给全；非法名白名单拒收', () => {
  const cwd = makeRepo()
  try {
    const s1 = cli(cwd, ['flow', 'diff', '--change', '2026-10-13-nope-missing'])
    assert.notEqual(s1.status, 0, '不存在必须非零退出')
    const out = `${s1.stdout}\n${s1.stderr}`
    assert.match(out, /不存在/, '点名不存在')
    assert.match(out, /flow status|status/, '给修复路径（查列表）')
    const s2 = cli(cwd, ['flow', 'diff', '--change', '../evil'])
    assert.equal(s2.status, 2, '非法名走白名单 exit 2')
    assert.match(`${s2.stdout}\n${s2.stderr}`, /非法变更名/, '白名单拒收文案')
  } finally {
    rmSync(cwd, { recursive: true, force: true })
  }
})

// ── FR-03b：无 git 基线 → exit 0 显式提示 ──
test('无 git 基线（无历史仓）：显式提示 exit 0', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'fdiff-nh-'))
  git(cwd, ['init', '-q', '-b', 'main'])
  git(cwd, ['config', 'user.email', 't@t'])
  git(cwd, ['config', 'user.name', 't'])
  mkdirSync(join(cwd, '.sillyspec', 'changes', '2026-10-13-fdiff-nb',), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', 'changes', '2026-10-13-fdiff-nb', 'flow-state.yaml'), 'tier: thin\nsubsteps: {}\n')
  try {
    const s = cli(cwd, ['flow', 'diff', '--change', '2026-10-13-fdiff-nb'])
    assert.equal(s.status, 0, `无基线应 exit 0: ${s.stdout}\n${s.stderr}`)
    assert.match(`${s.stdout}\n${s.stderr}`, /无 git 基线|无基线/, '显式提示')
  } finally {
    rmSync(cwd, { recursive: true, force: true })
  }
})

// ── FR-05：usage 行含 diff ──
test('flow 族 usage 报错行含 diff', () => {
  const cwd = makeRepo()
  try {
    const s = cli(cwd, ['flow', 'bogus-sub'])
    assert.notEqual(s.status, 0)
    assert.match(`${s.stdout}\n${s.stderr}`, /flow diff/, 'usage 行含 diff')
  } finally {
    rmSync(cwd, { recursive: true, force: true })
  }
})
