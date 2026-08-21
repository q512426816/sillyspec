/**
 * 三坑回归：归档尾声 sync 噪音 / 孤儿 worktree 物理目录 / progress show 归档终态展示
 *
 * 坑（2026-08-21 用户实证）：
 *   ① 归档后 CLI sync 尾声连打「变更目录不存在/变更不存在」warn——注销后正常时序观感像出错
 *   ② worktree cleanup 因 meta 已注销跳过，物理目录若残留即孤儿（侥幸被 apply 清掉）
 *   ③ progress show 归档后仍显示「验证确认」——DB current_stage 与展示不同步
 */
import fs from 'fs'
import path from 'path'
import os from 'os'
import { execSync } from 'child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { SyncManager } from '../src/sync.js'
import { ProgressManager } from '../src/progress.js'

const __dirname = fileURLToPath(import.meta.url).replace(/[^/\\]+$/, '')
const root = join(__dirname, '..')
const binCLI = join(root, 'bin', 'sillyspec.js')
const imp = (p) => import(pathToFileURL(join(root, p)).href)
import { join } from 'node:path'

let failed = 0, total = 0
const failures = []
function assertTrue(cond, msg) {
  total++
  if (cond) console.log(`  ✅ PASS: ${msg}`)
  else { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
}
function run(cmd) {
  try { return { out: execSync(cmd, { encoding: 'utf8', timeout: 90000 }), status: 0 } }
  catch (e) { return { out: (e.stdout || '') + (e.stderr || ''), status: e.status } }
}
const tmpDirs = []
function mkRepo(prefix) {
  const d = join(os.tmpdir(), `archtail-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`)
  tmpDirs.push(d)
  fs.mkdirSync(d, { recursive: true })
  execSync('git init -q -b main', { cwd: d, stdio: 'pipe' })
  return d
}
const cleanup = () => { for (const d of tmpDirs) { try { fs.rmSync(d, { recursive: true, force: true }) } catch {} } }

console.log('=== ① 归档尾声 sync 噪音静默化（坑 post-archive-sync-noise）===\n')
{
  const d = mkRepo('sync1')
  fs.mkdirSync(d, { recursive: true })
  run(`node "${binCLI}" --dir "${d}" init`)
  const cn = '2026-08-21-arch-a'
  const pm = new ProgressManager({ specDir: join(d, '.sillyspec') })
  pm.init(d)
  pm.initChange(d, cn)
  // 模拟归档后形态：DB status=archived + 目录移到 archive/
  pm.unregisterChange(d, cn, { archiveStepNames: pm.archiveStepNamesForArchive() })
  const changeDir = join(d, '.sillyspec', 'changes', cn)
  fs.mkdirSync(changeDir, { recursive: true })
  fs.writeFileSync(join(changeDir, 'plan.md'), '# P\n')
  const archiveDir = join(d, '.sillyspec', 'changes', 'archive')
  fs.mkdirSync(archiveDir, { recursive: true })
  fs.renameSync(changeDir, join(archiveDir, cn))
  // 连本地平台配置（目录检查在平台早退之后；url 指向不可达地址也无妨——噪音点在目录检查，
  // 其后的网络动作是 best-effort debugLog/warn 单行）
  fs.writeFileSync(join(d, '.sillyspec', 'local.yaml'), 'platform:\n  url: http://127.0.0.1:1\n  token: tok\n')
  const sm = new SyncManager(d)
  assertTrue(sm._isChangeArchivedInDb(cn) === true, 'DB 归档态探测命中（status=archived）')
  assertTrue(sm._isChangeArchivedInDb('nonexistent-x') === false, '无行/未归档 → false（保守）')
  // syncDocuments 独立调用仍 warn（不静默）；链内（旗标置位）降 debug——锁旗标语义
  // 链内（旗标置位）与独立调用分开捕获：前者不 warn（debug 降级），后者保留 warn
  const cap1 = []; const cap2 = []
  const origWarn = console.warn
  console.warn = (...a) => cap1.push(a.join(' '))
  try { sm._suppressDocsMissingWarn = true; await sm.syncDocuments(cn) } finally { console.warn = origWarn }
  console.warn = (...a) => cap2.push(a.join(' '))
  try { sm._suppressDocsMissingWarn = false; await sm.syncDocuments(cn) } finally { console.warn = origWarn }
  assertTrue(!cap1.some(m => m.includes('变更不存在')), '链内调用不 warn（debug 降级）')
  assertTrue(cap2.some(m => m.includes('变更不存在')), '独立调用保留 warn（手动 sync-docs 不静默）')
}

console.log('\n=== ② 归档清理孤儿 worktree 物理目录（坑 archive-cleanup-orphan-physical-dir）===\n')
{
  const d = mkRepo('orph')
  run(`node "${binCLI}" --dir "${d}" init`)
  const cn = '2026-08-21-arch-orphan'
  // 物理残留：worktrees/<name>/ 目录存在、无 meta.json（meta 已被先行流程注销）
  const wtDir = join(d, '.sillyspec', '.runtime', 'worktrees', cn)
  fs.mkdirSync(wtDir, { recursive: true })
  fs.writeFileSync(join(wtDir, 'stale-file.js'), '// 残留\n')
  const pm = new ProgressManager({ specDir: join(d, '.sillyspec') })
  pm.init(d)
  pm.initChange(d, cn)
  const { archiveWorktreeCleanup } = await imp('src/run/complete-handlers.js')
  const captured = []
  const origLog = console.log
  console.log = (...a) => captured.push(a.join(' '))
  try { await archiveWorktreeCleanup(d, cn, join(d, '.sillyspec'), {}) }
  finally { console.log = origLog }
  assertTrue(!fs.existsSync(wtDir), '孤儿物理目录被清理（不再因无 meta 跳过）')
  assertTrue(captured.some(m => m.includes('孤儿 worktree 残留')), '输出明示孤儿清理（可见性）')
}

console.log('\n=== ③ progress show 归档终态（坑 archive-progress-show-stale）===\n')
{
  const d = mkRepo('show')
  fs.mkdirSync(join(d, '.sillyspec', 'changes', '2026-08-21-arch-show'), { recursive: true })
  const cn = '2026-08-21-arch-show'
  fs.mkdirSync(join(d, '.sillyspec', 'changes', cn), { recursive: true })
  fs.writeFileSync(join(d, '.sillyspec', 'changes', cn, 'plan.md'), '# P\n')
  // 种入 verify completed + execute completed 的进行前状态，走标准归档（step4 --confirm 触发目录移动+终态一致化）
  const pm = new ProgressManager({ specDir: join(d, '.sillyspec') })
  pm.init(d)
  pm.initChange(d, cn)
  const db = pm._ensureDB(d).getDb()
  const idRow = db.prepare('SELECT id FROM changes WHERE name = ?').get(cn)
  db.prepare("UPDATE changes SET current_stage = 'verify' WHERE id = ?").run(idRow.id)
  const progress = pm.read(d, cn)
  progress.currentChange = cn
  progress.stages.archive = { status: 'in-progress', steps: [
    { name: '任务完成度检查', status: 'completed' },
    { name: 'extract-module-impact', status: 'completed' },
    { name: 'sync-module-docs', status: 'completed' },
    { name: '确认归档', status: 'pending' },
    { name: '更新路线图和提交', status: 'pending' },
  ]}
  pm._write(d, progress, cn)
  const r = run(`node "${binCLI}" --dir "${d}" run archive --done --confirm --change ${cn} --output "确认归档"`)
  if (process.env.DBG_TAIL) console.log('--- run out ---\n' + r.out.split('\n').filter(l => /归档|❌|⛔|Step/.test(l)).slice(0, 10).join('\n'))
  const t = pm.read(d, cn)
  assertTrue(t && t.currentStage === 'archive', `归档后 current_stage=archive（实得 ${t?.currentStage}）`)
  const show = run(`node "${binCLI}" --dir "${d}" progress show`)
  assertTrue(show.out.includes('归档') || show.out.includes('没有活跃的变更'), `progress show 指向已归档终态（归档态或无活跃变更，输出：${show.out.trim().slice(0, 40)}）`)
  assertTrue(!show.out.includes('验证确认'), '不再显示「验证确认」旧阶段')
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
if (failures.length) { console.log('失败项:'); failures.forEach(f => console.log('  - ' + f)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
