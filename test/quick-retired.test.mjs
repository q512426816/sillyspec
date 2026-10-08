/**
 * quick 通道直接退役 — 拒绝门与在途收尾回归（2026-09-25-quick-channel-retire）
 *
 * R1 CLI 入口预门（子进程）：quick / run quick 新会话形态 exit 1 + 指路文案 + 零副作用
 *    （guard/QUICKLOG/会话目录/共享指针全不落盘）；--status 只读形态放行 exit 0
 * R2 进程内兜底网（stage.js）：runCommand 直调新会话形态 exit 1 + 幻影残留清理
 *    （command.js 先行写入的 owner 空会话目录与 current-quick-run-id 被兜底网回收；
 *    QUICKLOG 条目/guard 因分配点在拒绝之后而天然为零）
 * R3 --change 指向不存在会话：兜底网拒绝 exit 1
 * R4 在途会话收尾（FR-02）：夹具预置 → 渲染（含退役 ℹ️ 提示）→ 三步 --done 全通
 * R5 文档与版本（FR-03）：模板/AGENTS.md 含「已退役」墓碑、无「存量过渡通道」表述；
 *    package.json 3.32.1（init 按版本差刷新存量 AGENTS.md）
 */
import { writeFileSync, readFileSync, existsSync, readdirSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { runCommand } from '../src/run.js'
import { seedQuickSession, git, initGitRepo, makeTmpDir, cleanupTmpDirs } from './helpers/quick-session-fixture.mjs'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const INDEX = join(REPO_ROOT, 'src', 'index.js')

let total = 0, failed = 0
function assert(condition, msg) {
  total++
  if (!condition) { failed++; console.log(`  ❌ FAIL: ${msg}`) }
  else console.log(`  ✅ PASS: ${msg}`)
}
// 桩 process.exit + 捕获 console：返回 { exitCode, out, err }（EXIT_n throw 吞掉记码）
async function captureRun(fn) {
  const origExit = process.exit
  const origLog = console.log, origErr = console.error
  let exitCode = null, out = '', err = ''
  process.exit = (code) => { exitCode = code; throw new Error('EXIT_' + code) }
  console.log = (...a) => { out += a.join(' ') + '\n' }
  console.error = (...a) => { err += a.join(' ') + '\n' }
  try { await fn() } catch (e) { if (!String(e.message || '').startsWith('EXIT_')) throw e }
  finally { process.exit = origExit; console.log = origLog; console.error = origErr }
  return { exitCode, out, err }
}
function runCli(cwd, cliArgs) {
  try {
    const stdout = execFileSync(process.execPath, [INDEX, ...cliArgs],
      { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    return { status: 0, stdout, stderr: '' }
  } catch (e) { return { status: e.status, stdout: e.stdout || '', stderr: e.stderr || '' } }
}
function makeRepo(prefix) {
  const repo = makeTmpDir(prefix)
  initGitRepo(repo)
  writeFileSync(join(repo, '.gitignore'), '.sillyspec/\n')
  writeFileSync(join(repo, 'm.js'), 'console.log(1)\n')
  git(repo, ['add', '.']); git(repo, ['commit', '-q', '-m', 'init'])
  return repo
}
function quickResidue(repo) {
  const spec = join(repo, '.sillyspec')
  const sessDir = join(spec, '.runtime', 'quick-sessions')
  const sessions = existsSync(sessDir) ? readdirSync(sessDir) : []
  const qlogDir = join(spec, 'quicklog')
  const qlogs = existsSync(qlogDir) ? readdirSync(qlogDir).filter(f => f.startsWith('QUICKLOG')) : []
  return { sessions, qlogs }
}

console.log('=== quick 通道退役：拒绝门与在途收尾 ===\n')

// ── R1 CLI 入口预门（子进程，覆盖 sillyspec quick 与 sillyspec run quick 两种形态）──
{
  const repo = makeRepo('qr-r1-')
  for (const [label, args] of [
    ['顶层别名 quick --input', ['quick', '--input', '冒烟任务']],
    ['顶层别名 quick 位置参数', ['quick', '修个东西', '--non-interactive']],
    ['run quick --input', ['run', 'quick', '--input', '冒烟任务', '--non-interactive']],
  ]) {
    const r = runCli(repo, args)
    assert(r.status === 1, `R1 ${label}：exit 1（实际 ${r.status}）`)
    assert(r.stderr.includes('已退役') && r.stderr.includes('flow start'), `R1 ${label}：拒绝文案指路 flow start`)
  }
  const residue = quickResidue(repo)
  assert(residue.sessions.length === 0 && residue.qlogs.length === 0,
    `R1 三次拒绝后零残留（会话目录 ${residue.sessions.length} 个、QUICKLOG ${residue.qlogs.length} 个）`)
  const rs = runCli(repo, ['quick', '--status'])
  assert(rs.status === 0, `R1 quick --status 只读放行 exit 0（实际 ${rs.status}）`)
  console.log('')
}

// ── R2 进程内兜底网（stage.js）：直调 runCommand 的新会话形态被拒 + 幻影残留回收 ──
{
  const repo = makeRepo('qr-r2-')
  const r = await captureRun(() =>
    runCommand(['quick', '进程内新会话应被兜底网拒绝', '--linked-changes', 'none', '--non-interactive'], repo))
  assert(r.exitCode === 1, `R2 直调 runCommand 新会话：exit 1（实际 ${r.exitCode}）`)
  assert(r.err.includes('已退役'), 'R2 兜底网拒绝文案含「已退役」')
  const freshSid = (r.out.match(/quick-[0-9a-f]{8}/) || [])[0]
  assert(!!freshSid, `R2 command.js 先行生成的 sid 可从输出解析（${freshSid || '未解析到'}）`)
  const sessDir = join(repo, '.sillyspec', '.runtime', 'quick-sessions')
  assert(!existsSync(join(sessDir, freshSid || 'x')), 'R2 幻影空会话目录已被兜底网回收')
  const marker = join(repo, '.sillyspec', '.runtime', 'current-quick-run-id')
  assert(!existsSync(marker), 'R2 current-quick-run-id 共享指针已回收（内容为本 sid 时删除）')
  const residue = quickResidue(repo)
  assert(residue.qlogs.length === 0, 'R2 QUICKLOG 零条目（ql-ID 分配点在拒绝之后）')
  console.log('')
}

// ── R3 --change 指向不存在会话：兜底网拒绝 ──
{
  const repo = makeRepo('qr-r3-')
  const r = await captureRun(() =>
    runCommand(['quick', '--change', 'quick-deadbeef', '--non-interactive'], repo))
  assert(r.exitCode === 1, `R3 不存在会话的续跑形态被拒：exit 1（实际 ${r.exitCode}）`)
  assert(r.err.includes('已退役'), 'R3 拒绝文案含「已退役」')
  console.log('')
}

// ── R4 在途会话收尾（FR-02）：夹具预置 → 渲染 → 三步 --done 全通 ──
{
  const repo = makeRepo('qr-r4-')
  const { sid, qlId } = await seedQuickSession(repo, { taskDescription: '退役收尾回归' })
  const r1 = await captureRun(() => runCommand(['quick', '--change', sid, '--non-interactive'], repo))
  assert(r1.exitCode === null && r1.out.includes('理解任务'), 'R4 在途会话渲染 step1（理解任务）')
  assert(r1.out.includes('已退役'), 'R4 渲染带一行退役 ℹ️ 提示（防 agent 再开新会话）')
  await captureRun(() => runCommand(['quick', '--done', '--change', sid, '--output', '理解完成', '--confirm'], repo))
  await captureRun(() => runCommand(['quick', '--done', '--change', sid, '--output', '实现完成', '--confirm'], repo))
  const structured = '需求：quick 退役收尾回归\n根因：通道退役\n方案：夹具预置在途会话走收尾链路\n结果：3 步 --done 全通'
  const r3 = await captureRun(() =>
    runCommand(['quick', '--done', '--change', sid, '--output', structured, '--confirm'], repo))
  const qfile = join(repo, '.sillyspec', 'quicklog', 'QUICKLOG-test.md')
  const qlog = readFileSync(qfile, 'utf8')
  assert(r3.exitCode === null, `R4 step3 --done 收口成功（exitCode=${r3.exitCode}）`)
  assert(qlog.includes(`## ${qlId} |`), `R4 QUICKLOG 条目保留原 ql-ID（${qlId}）`)
  assert(qlog.includes('状态：已完成'), 'R4 条目翻「已完成」')
  assert(qlog.includes('结果：3 步 --done 全通'), 'R4 结构化结果落盘')
  console.log('')
}

// ── R5 文档与版本（FR-03）──
{
  const tpl = readFileSync(join(REPO_ROOT, 'templates', 'agents-instruction.md'), 'utf8')
  assert(!tpl.includes('quick') && tpl.includes('轻量变更') && tpl.includes('flow start'),
    'R5 模板：面向新项目零 quick 表述，轻量变更默认道在位')
  const agents = readFileSync(join(REPO_ROOT, 'AGENTS.md'), 'utf8')
  assert(!agents.includes('run quick') && agents.includes('轻量变更') && agents.includes('flow start'),
    'R5 仓库 AGENTS.md：与模板同源（无 quick 通道指引，轻量变更默认道在位）')
  const pkg = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8'))
  assert(pkg.version === '3.32.1', `R5 package.json 版本 3.32.1（实际 ${pkg.version}，init 按版本差刷新存量 AGENTS.md）`)
}

cleanupTmpDirs()
console.log('\n==================================================')
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
console.log('==================================================')
if (failed > 0) process.exit(1)
