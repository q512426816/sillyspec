/**
 * 2026-10-06-resume-domain-flip 回归：flow start 重入（恢复简报）知识注入的域路由不被
 * 先于变更存在的他侧未跟踪文件劫持，重入知识面 ⊇ fresh 知识面。
 *
 * 覆盖：
 *   ① filterPreChangeUntracked 过滤判据各分支（旧 mtime 剔除 / 新 mtime 保留 / 目录递归
 *      取成员最大 mtime / 无出生时戳不滤 / 非 ?? 条目不滤）
 *   ② 重入简报端到端：他侧遗留未跟踪目录（mtime 早于变更出生时刻）不再劫持触达域，
 *      --input 路由域恢复注入（无「该域暂无 active FR」误导行）
 *   ③ 源码钉：resume 分支路由面 = changedFilesSinceBaseline 包裹 filterPreChangeUntracked
 *      ∪ extractRoutingInputPaths（fr-rot-precision ⑥ 的调用形态钉不破坏）
 *   ④ test:core 清单驻留断言
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, utimesSync, statSync as statSyncReal } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = dirname(fileURLToPath(import.meta.url))
const { filterPreChangeUntracked, cmdFlow } = await import(pathToFileURL(join(ROOT, '..', 'src', 'flow.js')).href)
const { ProgressManager } = await import(pathToFileURL(join(ROOT, '..', 'src', 'progress.js')).href)

const OLD = new Date('2020-01-01T00:00:00Z')
const BIRTH = Date.now() - 60_000 // 变更出生时刻：1 分钟前（「干活期」= 出生之后）

function git(dir, args) {
  return execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
}

function gitRepo(base) {
  const cwd = mkdtempSync(join(tmpdir(), 'rdf-git-'))
  git(cwd, ['init', '-q'])
  git(cwd, ['config', 'user.email', 't@t.local'])
  git(cwd, ['config', 'user.name', 't'])
  writeFileSync(join(cwd, 'tracked-mod.txt'), 'base\n')
  writeFileSync(join(cwd, 'src-cli-login.txt'), 'base\n') // 占位：确保仓库有提交
  git(cwd, ['add', '.'])
  git(cwd, ['commit', '-q', '-m', 'base'])
  return cwd
}

async function cleanup(cwd) {
  const key = join(cwd, '.sillyspec', '.runtime', 'sillyspec.db')
  try {
    const db = ProgressManager._dbPool.get(key)
    if (db) { try { db.close() } catch {} ProgressManager._dbPool.delete(key) }
  } catch { /* 池里无实例则无需处理 */ }
  try { rmSync(cwd, { recursive: true, force: true }) } catch { /* Windows 句柄竞态容忍 */ }
}

test('① filterPreChangeUntracked 过滤判据各分支', () => {
  const cwd = gitRepo()
  try {
    // 未跟踪旧垃圾（文件 + 目录树全员旧 mtime）
    writeFileSync(join(cwd, 'old-file.log'), 'junk\n'); utimesSync(join(cwd, 'old-file.log'), OLD, OLD)
    mkdirSync(join(cwd, 'old-junk', 'inner'), { recursive: true })
    writeFileSync(join(cwd, 'old-junk', 'a.txt'), 'junk\n')
    writeFileSync(join(cwd, 'old-junk', 'inner', 'b.txt'), 'junk\n')
    for (const p of ['old-junk', 'old-junk/a.txt', 'old-junk/inner', 'old-junk/inner/b.txt']) {
      utimesSync(join(cwd, p), OLD, OLD)
    }
    // 未跟踪新文件（干活期创建）
    writeFileSync(join(cwd, 'fresh-work.txt'), 'wip\n')
    // 未跟踪旧目录 + 干活期新写成员（mtime 面被拉高 → 保留）
    mkdirSync(join(cwd, 'mixed-dir'), { recursive: true })
    writeFileSync(join(cwd, 'mixed-dir', 'old.txt'), 'old\n'); utimesSync(join(cwd, 'mixed-dir', 'old.txt'), OLD, OLD)
    utimesSync(join(cwd, 'mixed-dir'), OLD, OLD)
    writeFileSync(join(cwd, 'mixed-dir', 'new.txt'), 'new\n')
    // 跟踪文件工作树修改（非 ?? 条目 → 不滤）
    writeFileSync(join(cwd, 'tracked-mod.txt'), 'modified\n')

    const files = ['old-file.log', 'old-junk/', 'fresh-work.txt', 'mixed-dir/', 'tracked-mod.txt']
    const out = filterPreChangeUntracked(cwd, files, BIRTH)
    assert.ok(!out.includes('old-file.log'), `旧 mtime 未跟踪文件应剔除，实际：${out}`)
    assert.ok(!out.includes('old-junk/'), `全员旧 mtime 的未跟踪目录应剔除（递归取最大 mtime），实际：${out}`)
    assert.ok(out.includes('fresh-work.txt'), `干活期新写的未跟踪文件应保留，实际：${out}`)
    assert.ok(out.includes('mixed-dir/'), `旧目录含干活期新成员应保留（成员最大 mtime 拉高），实际：${out}`)
    assert.ok(out.includes('tracked-mod.txt'), `跟踪条目（非 ??）禁止过滤，实际：${out}`)

    // 无出生时戳 → 不过滤（保守=现状）
    const noop = filterPreChangeUntracked(cwd, files, null)
    assert.deepEqual(noop.sort(), [...files].sort(), '无 birthTs 时原样返回')

    // stat 失败 → 保守保留（评审 P2 清偿：注入缝注入抛错的 statFn，只有旧垃圾条目受影响）
    const statFail = filterPreChangeUntracked(cwd, files, BIRTH, {
      statFn: (p) => { if (p.endsWith('old-file.log')) throw new Error('EACCES'); return statSyncReal(p) },
    })
    assert.ok(statFail.includes('old-file.log'), `stat 失败的条目应保守保留，实际：${statFail}`)
    assert.ok(!statFail.includes('old-junk/'), `stat 正常的旧垃圾目录照常剔除，实际：${statFail}`)
  } finally { rmSync(cwd, { recursive: true, force: true }) }
})

/** 最小 specBase 夹具：cli 域（src/cli/ 前缀）+ active FR 一条（thin-fr-inject-parity 同款形状）。 */
function buildSpecRoot(base) {
  const specBase = join(base, '.sillyspec')
  const knowledge = join(specBase, 'knowledge')
  mkdirSync(join(knowledge, 'fr'), { recursive: true })
  const mapDir = join(specBase, 'docs', 'proj', 'modules')
  mkdirSync(mapDir, { recursive: true })
  writeFileSync(join(mapDir, '_module-map.yaml'), 'modules:\n  cli:\n    paths:\n      - src/cli/\n')
  writeFileSync(join(knowledge, 'fr', 'cli.md'), [
    '---',
    'author: sillyspec-fr-index',
    '---',
    '',
    '# FR 索引 — cli',
    '',
    '## FR-cli-001 登录必须校验会话',
    '变更：hist-a',
    '状态：active',
    '摘要：默认场景',
    '场景正文：',
    '- 场景：默认场景 — Given 会话存在 When 调登录 Then 校验通过',
    '全文：hist-a/requirements.md#FR-01',
    '最近确认：aaaa1111',
    '',
  ].join('\n'))
  return specBase
}

/** 重入夹具：git 仓（基线提交含未动的 src/cli/login.js）+ 他侧遗留未跟踪目录（旧 mtime）
 * + flow-state（input 指向 src/cli/login.js）+ 进度库行（created_at=now 即变更出生时刻）。 */
function resumeFixture() {
  const cwd = gitRepo()
  mkdirSync(join(cwd, 'src', 'cli'), { recursive: true })
  writeFileSync(join(cwd, 'src', 'cli', 'login.js'), 'export {}\n')
  git(cwd, ['add', 'src'])
  git(cwd, ['commit', '-q', '-m', 'cli module'])
  const baseline = git(cwd, ['rev-parse', 'HEAD'])
  // 他侧会话遗留的未跟踪目录（早于本变更出生）
  mkdirSync(join(cwd, '.claude', 'skills', 'legacy'), { recursive: true })
  writeFileSync(join(cwd, '.claude', 'skills', 'legacy', 'SKILL.md'), 'other session\n')
  for (const p of ['.claude', '.claude/skills', '.claude/skills/legacy', '.claude/skills/legacy/SKILL.md']) {
    utimesSync(join(cwd, p), OLD, OLD)
  }
  const specBase = buildSpecRoot(cwd)
  const CHANGE = '2026-10-06-rdf-e2e'
  const dir = join(specBase, 'changes', CHANGE)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'flow-state.yaml'), [
    'tier: thin',
    'substeps: {}',
    `baseline_commit: ${baseline}`,
    'input: >-',
    '  重构 src/cli/login.js 的登录流程，收敛会话校验。',
    '',
  ].join('\n'))
  new ProgressManager().initChange(cwd, CHANGE)
  return { cwd, specBase, CHANGE, baseline }
}

/** 重入 flow start（resume 路径）——SILLYSPEC_WATCHER=0 防 watcher 副作用，捕获 console 输出。 */
async function runResumeStart(cwd, change) {
  const origLog = console.log
  const origWarn = console.warn
  const origWatcher = process.env.SILLYSPEC_WATCHER
  let out = ''
  console.log = (...a) => { out += a.join('\n') + '\n' }
  console.warn = () => {}
  process.env.SILLYSPEC_WATCHER = '0'
  try {
    await cmdFlow(['start', '--change', change], cwd, null)
  } finally {
    console.log = origLog
    console.warn = origWarn
    if (origWatcher === undefined) delete process.env.SILLYSPEC_WATCHER
    else process.env.SILLYSPEC_WATCHER = origWatcher
  }
  return out
}

test('② 重入早于干活：垃圾未跟踪目录不劫持触达域、input 域恢复注入', async () => {
  const { cwd, CHANGE } = resumeFixture()
  try {
    const out = await runResumeStart(cwd, CHANGE)
    assert.ok(out.includes('🔁 flow start 恢复简报'), `恢复简报在场，实际：${out.slice(0, 200)}`)
    assert.ok(out.includes('触达域'), `触达域行在场，实际：${out.split('\n').filter((l) => l.includes('触达域'))}`)
    assert.ok(!out.includes('该域暂无 active FR 索引条目'), `不得出现「该域暂无」误导行（域被垃圾劫持的病征），实际：${out.split('\n').filter((l) => l.includes('触达域') || l.includes('暂无'))}`)
    assert.ok(out.includes('FR-cli-001'), `input 路由域的 active FR 应恢复注入（重入知识面 ⊇ fresh），实际：${out.split('\n').filter((l) => l.includes('FR-cli'))}`)
    assert.ok(!out.includes('auto-claude') && !out.includes('auto-.claude'), `伪域不应在场，实际：${out.split('\n').filter((l) => l.includes('触达域'))}`)
  } finally { await cleanup(cwd) }
})

test('③ 源码钉：resume 路由面包裹 filterPreChangeUntracked 并并集 input 路由面（⑥ 调用形态不变）', () => {
  const src = readFileSync(join(ROOT, '..', 'src', 'flow.js'), 'utf8')
  const resumeBlock = src.split('resume 路径域路由')[1]?.split('printRecoveryBriefing')[0] || ''
  assert.ok(resumeBlock.length > 0, 'resume 注入段定位')
  assert.ok(src.includes('changedFilesSinceBaseline(cwd, st.baseline_commit)'), '⑥ 的调用形态钉保持（resume 复用 changedFilesSinceBaseline）')
  assert.ok(resumeBlock.includes('filterPreChangeUntracked('), 'resume 路由面应经 filterPreChangeUntracked 过滤')
  assert.ok(resumeBlock.includes('extractRoutingInputPaths('), 'resume 路由面应并集 input 路由面')
  assert.ok(!resumeBlock.includes('..HEAD`') || resumeBlock.includes('changedFilesSinceBaseline(cwd, st.baseline_commit)'), '不回潮裸双提交区间 diff')
})

test('④ test:core 清单驻留：本测试文件在 package.json test:core 内', () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, '..', 'package.json'), 'utf8'))
  assert.ok(
    (pkg.scripts?.['test:core'] || '').includes('test/resume-domain-flip.test.mjs'),
    'test:core 必须包含 test/resume-domain-flip.test.mjs',
  )
})
