/**
 * cross-repo-baseline-anchor.test.mjs — 跨仓基线锚（2026-10-13-cross-repo-baseline-anchor）
 *
 * 背景（实验实证）：thin 手工跨仓交付此前落 B 档（HEAD~1..HEAD 单笔窗口）——多笔交付漏首笔
 * （fire-ledger 两笔形态）、交错时序抓错面。修复：flow start 记 cross_baselines（首写者胜）；
 * collectRepoActual 3c 档 flow-start-baseline：窗口=基线..工作树，token 归因主面（窗口内
 * 提交消息含变更名的并集）剔除外来提交；零命中回退全窗口（噪音可见）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import yaml from 'js-yaml'

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..')

function git(cwd, args) {
  return execFileSync('git', ['-C', cwd, ...args], { stdio: 'pipe' }).toString().trim()
}

function cli(cwd, args) {
  return spawnSync(process.execPath, [join(REPO, 'src', 'index.js'), ...args], {
    cwd, encoding: 'utf8', timeout: 180_000, env: { ...process.env, SILLYSPEC_WATCHER: '0' },
  })
}

/** 主仓 + 注册跨仓 libx；返回 { main, cross, change }。 */
function fixture(change) {
  const main = mkdtempSync(join(tmpdir(), 'crba-m-'))
  const cross = mkdtempSync(join(tmpdir(), 'crba-x-'))
  for (const r of [main, cross]) {
    git(r, ['init', '-q', '-b', 'main'])
    git(r, ['config', 'user.email', 't@t'])
    git(r, ['config', 'user.name', 't'])
  }
  mkdirSync(join(main, '.sillyspec'), { recursive: true })
  // deadkey 注册不可达路径（fail-soft 锚：start 跳过该仓不阻断、cross_baselines 只记可达仓）
  writeFileSync(join(main, '.sillyspec', 'local.yaml'),
    `project:\n  type: generic\ncommands:\n  test: "node exit0.js"\nflow:\n  mode: thin\nrepos:\n  libx: ${cross.split('\\').join('/')}\n  deadkey: C:/nonexistent-repo-path-xyz\n`)
  writeFileSync(join(cross, 'base.txt'), 'base\n')
  git(cross, ['add', '.'])
  git(cross, ['commit', '-qm', 'base'])
  writeFileSync(join(main, 'base.txt'), 'base\n')
  git(main, ['add', '.'])
  git(main, ['commit', '-qm', 'base'])
  return { main, cross, change }
}

function fillDocs(specBase, change) {
  const base = join(specBase, 'changes', change)
  const fill = (f, fn) => writeFileSync(join(base, f), fn(readFileSync(join(base, f), 'utf8')))
  fill('design.md', (t) => t
    .replace(/^(本变更怎么解决问题|动了哪些函数|1\. 乱序|2\. 并发写|3\. 切换|4\. 作用域|本方案最大的风险)([^\n]*)$/gm, '$&\n不适用：协议测试夹具——一行作答即合规')
    // 主仓面（保证非空冻结面——纯跨仓空面不落 patch 两件，scopeAudit 无载体）+ 跨仓段头声明
    + '\n## 文件变更清单\n\n| 操作 | 路径 | 说明 |\n|---|---|---|\n| 修改 | work.txt | 主仓交付 |\n\n## libx 仓变更\n\n- impl.txt（交付：主文件）\n- fix.txt\n')
  fill('requirements.md', (t) => t
    .replace(/^- （待撰写.*$/gm, '- 系统 MUST 达成该条标准行为（协议夹具行为句）')
    .replace(/^FR-\d{2}: （待填.*$/gm, (m) => m.split(':')[0] + ': 不适用：协议测试夹具——无独立测试面'))
}

/** 主仓一笔带变更名交付（保证冻结面非空 → change-patch.json 落盘）。 */
function deliverMain(cwd, change) {
  writeFileSync(join(cwd, 'work.txt'), 'main\n')
  git(cwd, ['add', 'work.txt'])
  git(cwd, ['commit', '-qm', `work (${change}) (task-01)`])
}

function finish(cwd, specBase, change) {
  const tasksPath = join(specBase, 'changes', change, 'tasks.md')
  writeFileSync(tasksPath, readFileSync(tasksPath, 'utf8').replace(/^- \[ \] (task-\d+):/gm, '- [x] $1:'))
  git(cwd, ['add', tasksPath])
  git(cwd, ['commit', '-qm', 'chore: tick (task-01)'])
  writeFileSync(join(specBase, 'changes', change, 'review.json'), JSON.stringify({
    schemaVersion: 1, change, reviewer: 'test-fixture', verdict: 'PASS', reviewedAgainst: git(cwd, ['rev-parse', 'HEAD']),
    findings: [], dimensionNotes: { 乱序: 'n/a', 并发: 'n/a', 切换: 'n/a', 作用域: 'n/a' }, reviewedAt: new Date().toISOString(),
  }, null, 2))
}

function readState(specBase, change) {
  return yaml.load(readFileSync(join(specBase, 'changes', change, 'flow-state.yaml'), 'utf8'))
}

// ── 主场景：基线记录 + 两笔交付全覆盖 + token 剔除外来 + anchor 档位 ──
test('e2e：start 记基线（首写者胜）；两笔跨仓交付+untracked 全进对账面；外来提交被 token 剔除；anchor=flow-start-baseline', () => {
  const change = '2026-10-13-crba-e2e'
  const { main, cross } = fixture(change)
  const specBase = join(main, '.sillyspec')
  try {
    const s1 = cli(main, ['flow', 'start', '--change', change, '--input', 'x\n成功标准：\n- y', '--autopilot'])
    assert.equal(s1.status, 0, `start: ${s1.stderr}`)
    assert.match(s1.stdout, /跨仓基线锚：1 个注册仓/, 'start 提示基线锚')
    const baseSha = readState(specBase, change).cross_baselines?.libx
    assert.match(baseSha || '', /^[0-9a-f]{40}$/, 'cross_baselines.libx 已记录')
    // 我方两笔交付（带变更名 token）+ untracked + 外来提交（无 token）
    writeFileSync(join(cross, 'impl.txt'), 'impl\n')
    git(cross, ['add', '.'])
    git(cross, ['commit', '-qm', `feat: 实现 (${change})`])
    writeFileSync(join(cross, 'fix.txt'), 'fix\n')
    git(cross, ['add', '.'])
    git(cross, ['commit', '-qm', `fix: 评审修复 (${change})`])
    writeFileSync(join(cross, 'brand-new.txt'), 'new\n')
    writeFileSync(join(cross, 'foreign.txt'), 'foreign\n')
    git(cross, ['add', 'foreign.txt'])
    git(cross, ['commit', '-qm', 'chore: 另一工作区的活儿'])
    deliverMain(main, change)
    // 首写者胜：重入 start 后基线不刷新
    cli(main, ['flow', 'start', '--change', change])
    assert.equal(readState(specBase, change).cross_baselines?.libx, baseSha, '重入不刷新（首写者胜）')
    fillDocs(specBase, change)
    finish(main, specBase, change)
    const done = cli(main, ['flow', 'done', '--change', change])
    assert.equal(done.status, 0, `done: ${done.stdout}\n${done.stderr}`)
    const arch = join(specBase, 'changes', 'archive', change)
    const meta = JSON.parse(readFileSync(join(arch, 'change-patch.json'), 'utf8'))
    const rows = (meta.scopeAudit || {}).rows || []
    const paths = rows.map((r) => r.path)
    assert.ok(paths.includes('impl.txt') && paths.includes('fix.txt'), `两笔交付全进面: ${JSON.stringify(paths)}`)
    assert.ok(rows.find((r) => r.path === 'impl.txt')?.verdict === 'planned', 'impl.txt 声明命中 planned')
    assert.ok(paths.includes('brand-new.txt'), 'untracked 进面')
    assert.ok(!paths.includes('foreign.txt'), `外来提交被 token 剔除: ${JSON.stringify(paths)}`)
    const libxRepo = ((meta.scopeAudit || {}).repos || meta.repos || []).find((r) => r.key === 'libx')
    assert.equal(libxRepo?.anchor?.source, 'flow-start-baseline', `anchor 档位: ${JSON.stringify(libxRepo?.anchor)}`)
  } finally {
    rmSync(main, { recursive: true, force: true })
    rmSync(cross, { recursive: true, force: true })
  }
})

// ── 零 token 命中回退全窗口（外来可见 unplanned）+ 基线不可达回退 B 档 ──
test('回退面：零 token 命中 → 全窗口（外来可见）；基线 sha 不可达 → 回退 B 档', () => {
  const change = '2026-10-13-crba-fb'
  const { main, cross } = fixture(change)
  const specBase = join(main, '.sillyspec')
  try {
    cli(main, ['flow', 'start', '--change', change, '--input', 'x\n成功标准：\n- y', '--autopilot'])
    // 提交均不带变更名（零 token 命中形态）
    writeFileSync(join(cross, 'mine.txt'), 'm\n')
    git(cross, ['add', '.'])
    git(cross, ['commit', '-qm', 'feat: 我的交付'])
    writeFileSync(join(cross, 'theirs.txt'), 't\n')
    git(cross, ['add', '.'])
    git(cross, ['commit', '-qm', 'chore: 外来提交'])
    deliverMain(main, change)
    fillDocs(specBase, change)
    finish(main, specBase, change)
    let done = cli(main, ['flow', 'done', '--change', change])
    assert.equal(done.status, 0, `done: ${done.stdout}\n${done.stderr}`)
    let arch = join(specBase, 'changes', 'archive', change)
    let rows = (JSON.parse(readFileSync(join(arch, 'change-patch.json'), 'utf8')).scopeAudit || {}).rows || []
    let paths = rows.map((r) => r.path)
    assert.ok(paths.includes('theirs.txt'), `零命中回退全窗口（外来可见）: ${JSON.stringify(paths)}`)
    assert.equal(rows.find((r) => r.path === 'theirs.txt')?.verdict, 'unplanned', '外来行 unplanned 可见')
  } finally {
    rmSync(main, { recursive: true, force: true })
    rmSync(cross, { recursive: true, force: true })
  }
  // 基线不可达 → B 档（手工伪造 cross_baselines 为不存在 sha）
  const change2 = '2026-10-13-crba-deg'
  const f2 = fixture(change2)
  try {
    cli(f2.main, ['flow', 'start', '--change', change2, '--input', 'x\n成功标准：\n- y', '--autopilot'])
    const stPath = join(f2.main, '.sillyspec', 'changes', change2, 'flow-state.yaml')
    const st = yaml.load(readFileSync(stPath, 'utf8'))
    st.cross_baselines.libx = '0'.repeat(40)
    writeFileSync(stPath, yaml.dump(st))
    writeFileSync(join(f2.cross, 'late.txt'), 'l\n')
    git(f2.cross, ['add', '.'])
    git(f2.cross, ['commit', '-qm', `feat: 交付 (${change2})`])
    deliverMain(f2.main, change2)
    fillDocs(join(f2.main, '.sillyspec'), change2)
    finish(f2.main, join(f2.main, '.sillyspec'), change2)
    const done = cli(f2.main, ['flow', 'done', '--change', change2])
    assert.equal(done.status, 0, `done: ${done.stdout}\n${done.stderr}`)
    const arch = join(f2.main, '.sillyspec', 'changes', 'archive', change2)
    const meta = JSON.parse(readFileSync(join(arch, 'change-patch.json'), 'utf8'))
    const libxRepo = ((meta.scopeAudit || {}).repos || meta.repos || []).find((r) => r.key === 'libx')
    assert.equal(libxRepo?.anchor?.source, 'head~1-window', `基线不可达回退 B 档: ${JSON.stringify(libxRepo?.anchor)}`)
  } finally {
    rmSync(f2.main, { recursive: true, force: true })
    rmSync(f2.cross, { recursive: true, force: true })
  }
})
