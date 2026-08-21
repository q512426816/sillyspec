/**
 * 坑 manual-archive-desync-status-only 回归：归档终态一致化
 *
 * 背景（2026-08-21 产品仓实证）：手动搬目录 + git commit 绕过 `run archive --done --confirm`
 * 后，自愈/幽灵清理路径只改 changes.status='archived' 一个字段——留下「已归档 + current_stage
 * 停在 execute + 归档 0/5 步」的矛盾终态，推送平台后详情页渲染成「进度丢失」。
 *
 * 锁定语义：
 *   ① unregisterChange({archiveStepNames})：同事务收尾 current_stage='archive' +
 *      stages.archive=completed + 步骤全 completed（含从未初始化时按定义补种 5 步）
 *   ② archiveChangeDirectory 自愈路径（源目录已移 archive/）：走完整终态
 *   ③ doctor --cleanup-ghosts --confirm：手动归档型幽灵（archive/ 有实体证据）收尾终态；
 *      真丢失型（无证据）保持 status-only（可逆语义，不伪造完成）
 *   ④ 不传 archiveStepNames（quick 会话注销等旧调用）：零回归 status-only
 */
import { join } from 'node:path'
import { writeFileSync, mkdirSync, readFileSync, rmSync, mkdtempSync, existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { execSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { ProgressManager } from '../src/progress.js'

const __dirname = fileURLToPath(import.meta.url).replace(/[^/\\]+$/, '')
const root = join(__dirname, '..')
const binCLI = join(root, 'bin', 'sillyspec.js')
const imp = (p) => import(pathToFileURL(join(root, p)).href)

let passed = 0, failed = 0
const failures = []
function assert(cond, msg) { cond ? (passed++, console.log(`  ✅ PASS: ${msg}`)) : (failed++, failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }
function run(cmd) {
  try { return { out: execSync(cmd, { encoding: 'utf8', timeout: 90000 }), status: 0 } }
  catch (e) { return { out: (e.stdout || '') + (e.stderr || ''), status: e.status } }
}
const tmpDirs = []
function mkRepo(prefix) {
  const d = mkdtempSync(join(tmpdir(), `archterm-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`))
  tmpDirs.push(d)
  mkdirSync(d, { recursive: true })
  run(`node "${binCLI}" --dir "${d}" init`)
  return d
}
const cleanup = () => { for (const d of tmpDirs) { try { rmSync(d, { recursive: true, force: true }) } catch {} } }

/** 读 DB 终态三元组：status/current_stage/archive 阶段行与步骤 */
function readTerminal(pm, cwd, cn) {
  const db = pm._ensureDB(cwd).getDb()
  const change = db.prepare('SELECT id, status, current_stage FROM changes WHERE name = ?').get(cn)
  if (!change) return null
  const stage = db.prepare('SELECT id, status FROM stages WHERE change_id = ? AND stage = ?').get(change.id, 'archive')
  const steps = stage
    ? db.prepare('SELECT name, status FROM steps WHERE stage_id = ? ORDER BY ordering').all(stage.id)
    : []
  return { status: change.status, currentStage: change.current_stage, stageStatus: stage?.status || null, steps }
}

console.log('=== 归档终态一致化（坑 manual-archive-desync-status-only）===\n')

console.log('--- ① unregisterChange 收尾参数：未初始化 archive 阶段按定义补种 5 步 ---')
{
  const d = mkRepo('u1')
  const cn = '2026-08-21-term-a'
  const pm = new ProgressManager({ specDir: join(d, '.sillyspec') })
  pm.initChange(d, cn)
  // 模拟真实事故形态：execute 停留 + archive 从未初始化
  const db = pm._ensureDB(d).getDb()
  const idRow = db.prepare('SELECT id FROM changes WHERE name = ?').get(cn)
  db.prepare("UPDATE changes SET current_stage = 'execute' WHERE id = ?").run(idRow.id)

  const names = pm.archiveStepNamesForArchive()
  assert(names.length === 5, `archive 步骤名取自 registry（${names.length} 步）`)
  pm.unregisterChange(d, cn, { archiveStepNames: names })

  const t = readTerminal(pm, d, cn)
  assert(t.status === 'archived', 'status=archived')
  assert(t.currentStage === 'archive', `current_stage 推进到 archive（实得 ${t.currentStage}）`)
  assert(t.stageStatus === 'completed', 'stages.archive=completed')
  assert(t.steps.length === 5 && t.steps.every(s => s.status === 'completed'), `5 步全 completed（实得 ${t.steps.length} 步）`)
  cleanup()
}

console.log('--- ② archiveChangeDirectory 自愈路径（手动搬目录后）走完整终态 ---')
{
  const d = mkRepo('u2')
  const cn = '2026-08-21-term-b'
  const changeDir = join(d, '.sillyspec', 'changes', cn)
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(changeDir, 'plan.md'), '# Plan\n')
  const pm = new ProgressManager({ specDir: join(d, '.sillyspec') })
  pm.initChange(d, cn)
  // 模拟手动归档：直接 mv 到 archive/（不经 CLI）
  const archiveDest = join(d, '.sillyspec', 'changes', 'archive', cn)
  mkdirSync(join(d, '.sillyspec', 'changes', 'archive'), { recursive: true })
  execSync(`mv "${changeDir}" "${archiveDest}"`, { cwd: d, stdio: 'ignore' })

  const progress = pm.read(d, cn)
  progress.currentChange = cn
  const { archiveChangeDirectory } = await imp('src/run/complete-handlers.js')
  const r = await archiveChangeDirectory(pm, d, progress, join(d, '.sillyspec'), {})

  assert(r && existsSync(r), '自愈路径返回归档目录')
  const t = readTerminal(pm, d, cn)
  assert(t.status === 'archived' && t.currentStage === 'archive', `终态一致（status=${t.status}, stage=${t.currentStage}）`)
  assert(t.steps.length === 5 && t.steps.every(s => s.status === 'completed'), `归档步骤全 completed（${t.steps.filter(s => s.status === 'completed').length}/${t.steps.length}）`)
  cleanup()
}

console.log('--- ③ doctor --cleanup-ghosts：手动归档型收尾，真丢失型 status-only ---')
{
  const d = mkRepo('u3')
  const pm = new ProgressManager({ specDir: join(d, '.sillyspec') })
  const cnManual = '2026-08-21-term-manual'
  const cnLost = '2026-08-21-term-lost'
  // initChange 会建 changes/<cn>/ 目录；模拟两种幽灵：manual=目录被手动 mv 到 archive/（含
  // plan.md 实体证据）；lost=目录被删（无证据）
  for (const cn of [cnManual, cnLost]) pm.initChange(d, cn)
  const manualDir = join(d, '.sillyspec', 'changes', cnManual)
  writeFileSync(join(manualDir, 'plan.md'), '# Plan\n')
  const archDir = join(d, '.sillyspec', 'changes', 'archive', cnManual)
  mkdirSync(join(d, '.sillyspec', 'changes', 'archive'), { recursive: true })
  execSync(`mv "${manualDir}" "${archDir}"`, { cwd: d, stdio: 'ignore' })
  execSync(`rm -rf "${join(d, '.sillyspec', 'changes', cnLost)}"`, { cwd: d, stdio: 'ignore' })

  const r = run(`node "${binCLI}" --dir "${d}" doctor --cleanup-ghosts --confirm`)
  assert(r.status === 0, `doctor 成功（exit ${r.status}，输出尾：${r.out.slice(-120)}）`)
  const tm = readTerminal(pm, d, cnManual)
  assert(tm.status === 'archived' && tm.currentStage === 'archive' && tm.steps.length === 5 && tm.steps.every(s => s.status === 'completed'),
    `手动归档型：完整终态（stage=${tm.currentStage}, ${tm.steps.filter(s => s.status === 'completed').length}/${tm.steps.length}）`)
  const tl = readTerminal(pm, d, cnLost)
  assert(tl.status === 'archived', `真丢失型：status=archived（可逆语义保留，实得 ${tl.status}）`)
  assert(tl.currentStage !== 'archive' && tl.steps.length === 0, `真丢失型：不伪造 archive 完成（stage=${tl.currentStage}, steps=${tl.steps.length}）`)
  cleanup()
}

console.log('--- ④ 旧调用形态（无 archiveStepNames）零回归 ---')
{
  const d = mkRepo('u4')
  const cn = '2026-08-21-term-legacy'
  const pm = new ProgressManager({ specDir: join(d, '.sillyspec') })
  pm.initChange(d, cn)
  pm.unregisterChange(d, cn) // 旧形态：不收尾
  const t = readTerminal(pm, d, cn)
  assert(t.status === 'archived', 'status=archived')
  assert(t.currentStage !== 'archive' && t.steps.length === 0, '不补种不推进（quick 会话注销等旧语义零回归）')
  cleanup()
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
if (failures.length) { console.log('失败项:'); failures.forEach(f => console.log('  - ' + f)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
