/**
 * FR-07（2026-10-21-protocol-tax）：doctor 归档锚点校验批量化。
 *
 * 锁定行为（detectArchiveIntegrity 经公开 API，同 doctor-archive-integrity.test.mjs 风格）：
 *   1. 悬空锚等价性：fixture 造 N 份归档（change-patch.json 含真实 commit SHA 与悬空 SHA
 *      混合），批量版悬空名单与「逐 SHA 旧语义的期望值」逐条一致（悬空报、有效不报）
 *   2. batchCatFileExists 单元：真实 SHA → true；不存在 SHA → false；空列表 → 空 Map
 *   3. 无 git 仓（batch 整批失败）→ 全部按悬空处理（同旧 safeGit error 语义，不洗白）
 *
 * 性能验收（本仓 doctor 41.8s → <5s）属真实体量实测，记录在 decisions.md（D-003）。
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import { runDoctorDiagnostics } from '../src/doctor-diagnostics.js'
import { batchCatFileExists } from '../src/git-helper.js'

let failed = 0
let total = 0
function assert(condition, msg) {
  total++
  if (!condition) {
    failed++
    console.log(`  ❌ FAIL: ${msg}`)
  } else {
    console.log(`  ✅ PASS: ${msg}`)
  }
}

function git(dir, args) {
  return execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
}

const tmpRoots = []
function makeGitRepo(prefix) {
  const dir = mkdtempSync(join(tmpdir(), prefix))
  tmpRoots.push(dir)
  git(dir, ['init', '-q'])
  git(dir, ['config', 'user.email', 't@t'])
  git(dir, ['config', 'user.name', 't'])
  writeFileSync(join(dir, 'a.txt'), 'a\n')
  git(dir, ['add', '.'])
  git(dir, ['commit', '-qm', 'init'])
  return dir
}

console.log('=== FR-07 归档锚点批量校验（等价性）===\n')

console.log('--- Case 1: 悬空/有效混合 → findings 与逐 SHA 期望逐条等价 ---')
{
  const repo = makeGitRepo('anchor-batch-1-')
  const specBase = join(repo, '.sillyspec')
  const archiveDir = join(specBase, 'changes', 'archive')
  mkdirSync(archiveDir, { recursive: true })

  const goodSha = git(repo, ['rev-parse', 'HEAD'])
  const danglingSha = 'dead'.repeat(10) // 40-hex 但不存在

  // 3 份归档：good（全有效）、badHead（head 悬空）、both（双悬空）
  const mk = (name, tasksDone, head, baseline) => {
    const dir = join(archiveDir, name)
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'tasks.md'), `# Tasks\n\n- [${tasksDone ? 'x' : ' '}] task-01: a\n`)
    writeFileSync(join(dir, 'plan.md'), '# Plan\n')
    writeFileSync(join(dir, 'change-patch.json'), JSON.stringify({ head, baseline }))
  }
  mk('2026-01-01-good', true, goodSha, goodSha)
  mk('2026-01-02-bad-head', true, danglingSha, goodSha)
  mk('2026-01-03-both-dangling', true, danglingSha, danglingSha)

  const r = await runDoctorDiagnostics({ cwd: repo })
  const dim = (r.dimensions || []).find((d) => d.name === 'archive_integrity')
  assert(dim != null, 'doctor 产出 archive_integrity 维度')
  if (dim) {
    const offendersText = JSON.stringify(dim.offenders || [])
    assert(!offendersText.includes('good'), '全有效锚不报悬空')
    assert(offendersText.includes('bad-head'), 'head 悬空被报')
    assert(/bad-head.*head|head.*bad-head/.test(offendersText), 'bad-head 报 head 侧悬空')
    assert(offendersText.includes('both-dangling'), '双悬空被报')
    assert(/both-dangling.*head\/baseline/.test(offendersText), 'both-dangling 报 head/baseline 双侧')
    // 期望等价性：悬空名单恰为两份 bad 归档（逐 SHA 旧语义同此）
    const offenderNames = (dim.offenders || []).map((o) => o.name).sort()
    assert(JSON.stringify(offenderNames) === JSON.stringify(['2026-01-02-bad-head', '2026-01-03-both-dangling']),
      `悬空名单恰为两份 bad 归档（实际：${JSON.stringify(offenderNames)}）`)
  }
}

console.log('--- Case 2: batchCatFileExists 单元语义 ---')
{
  const repo = makeGitRepo('anchor-batch-2-')
  const good = git(repo, ['rev-parse', 'HEAD'])
  const bad = 'beef'.repeat(10)
  const m = batchCatFileExists(repo, [good, bad])
  assert(m.get(good.toLowerCase()) === true, `真实 commit SHA → true`)
  assert(m.get(bad.toLowerCase()) === false, `不存在 SHA → false`)
  assert(batchCatFileExists(repo, []).size === 0, '空列表 → 空 Map')
  const noneGit = mkdtempSync(join(tmpdir(), 'anchor-batch-nogit-'))
  tmpRoots.push(noneGit)
  const m2 = batchCatFileExists(noneGit, [good])
  assert(m2.size === 0 && m2.get(good.toLowerCase()) === undefined, '无 git 环境 → 空 Map（查表 miss=悬空，同旧 fail 语义）')
}

console.log('--- Case 3: 无 git 仓的 doctor 整体不炸（batch 失败按悬空同向 fail） ---')
{
  const dir = mkdtempSync(join(tmpdir(), 'anchor-batch-3-'))
  tmpRoots.push(dir)
  const specBase = join(dir, '.sillyspec')
  const archiveDir = join(specBase, 'changes', 'archive')
  mkdirSync(archiveDir, { recursive: true })
  const d = join(archiveDir, '2026-01-01-nogit')
  mkdirSync(d, { recursive: true })
  writeFileSync(join(d, 'tasks.md'), '# Tasks\n\n- [x] task-01: a\n')
  writeFileSync(join(d, 'plan.md'), '# Plan\n')
  writeFileSync(join(d, 'change-patch.json'), JSON.stringify({ head: 'cafe'.repeat(10), baseline: null }))
  let r = null
  try { r = await runDoctorDiagnostics({ cwd: dir }) } catch (e) { r = { threw: e.message } }
  assert(!r.threw, `doctor 不抛异常（${r.threw || 'ok'}）`)
  const dim = (r.dimensions || []).find((x) => x.name === 'archive_integrity')
  assert(dim != null, 'archive_integrity 维度在场')
  if (dim) {
    assert(JSON.stringify(dim.offenders || []).includes('nogit'), '无 git 环境下锚点按悬空报（不洗白）')
  }
}

for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} }
console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
console.log(`${'='.repeat(50)}`)
if (failed > 0) process.exit(1)
