/**
 * quick 会话 ql-ID 分配竞态回归测试
 * 坑 ql-id-double-occupancy（2026-09-13 实证 ql-20260913-007-1351 双占用）
 *
 * 背景：quick 启动在锁内追加 QUICKLOG 条目后把 ql-ID 写入 guard.json。条目随后丢失
 * （并行 git 操作回滚未提交 QUICKLOG / worktree 分裂合并等）时，QUICKLOG 扫描看不到
 * 该预留 → 下一个会话的分配复用同一序号（suffix 再撞上即整 ID 双占用，历史上
 * ql-20260604-001-7a4c 也出现过同款）。修复三层：
 *   1. 分配时查重：盘上全 ID（容错空白形态）+ 他者活跃会话 guard 预留的序号让位
 *   2. --done 占用校验：盘上同 ID 条目 ≥2 → fail-closed 硬拦（记录已损坏，不猜归属）
 *   3. --done 占用校验：他者活跃会话 guard 仍预留同 ID → 本会话换新号完成 + 回写 guard
 *   4. --done 条目缺失自愈：原硬拦改按原 ID 补建骨架（与 guard 缺失分支同 cure）
 *
 * 单元（§1-5）：mkdtempSync 临时 specBase，不依赖 git。
 * e2e（§6-8）：临时 git 仓库 + runCommand 全链路（参照 quick-completion-unregisters-change）。
 */
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'

import {
  allocateQuicklogEntry, countQuicklogEntries, collectGuardReservedQuicklogIds,
} from '../src/quicklog.js'
import { runCommand } from '../src/run.js'
import { ProgressManager } from '../src/progress.js'

let total = 0, failed = 0
function assert(c, m) { total++; if (!c) { failed++; console.log(`  ❌ FAIL: ${m}`) } else console.log(`  ✅ PASS: ${m}`) }
function makeTmpDir(p) { return mkdtempSync(join(tmpdir(), p)) }
function todayStamp() {
  const d = new Date()
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
}
const TODAY = todayStamp()

const tmpRoots = []
function tmp(p) { const d = makeTmpDir(p); tmpRoots.push(d); return d }
function git(d, a) { return execFileSync('git', a, { cwd: d, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim() }
async function hush(fn) { const o = console.log; console.log = () => {}; const oe = console.error; console.error = () => {}; try { await fn() } finally { console.log = o; console.error = oe } }
function extractSid(s) { const m = s.match(/sessionId:\s*(quick-[0-9a-f]{8})/); return m ? m[1] : null }
const STRUCTURED = '需求：占用校验测试\n根因：无，测试用例\n方案：分配查重 + 完成校验\n结果：测试全绿'

console.log('=== ql-ID 分配竞态回归测试 ===\n')

// ─────────────────────────────────────────
// §1 分配查重：他者活跃 guard 预留的序号让位（核心坑形态：条目丢失、guard 仍在）
// ─────────────────────────────────────────
console.log('--- §1 分配让位他者 guard 预留 ---')
{
  const specBase = tmp('qlr-claim-')
  const sessionsDir = join(specBase, '.runtime', 'quick-sessions')
  // 会话 quick-aaaa1111 已预留 007-1351，但其 QUICKLOG 条目已丢失（盘上无 007 条目）
  mkdirSync(join(sessionsDir, 'quick-aaaa1111'), { recursive: true })
  writeFileSync(join(sessionsDir, 'quick-aaaa1111', 'guard.json'), JSON.stringify({
    sessionId: 'quick-aaaa1111', quicklogId: `ql-${TODAY}-007-1351`,
    taskDescription: '他者会话', startedAt: new Date().toISOString(),
  }))
  const r = await allocateQuicklogEntry(specBase, 'alice', { description: '本会话任务', sessionsDir })
  assert(!r.qlId.includes('-007-'), `分配让位他者预留序号 007（实际 ${r.qlId}）`)
  assert(r.qlId.includes('-008-'), `让位后取下一序号 008（实际 ${r.qlId}）`)
  assert(r.qlId !== `ql-${TODAY}-007-1351`, '整 ID 不与他者预留相同')

  // sessionsDir 省略 → 默认 <specBase>/.runtime/quick-sessions 同样生效
  const specBase2 = tmp('qlr-claimdef-')
  mkdirSync(join(specBase2, '.runtime', 'quick-sessions', 'quick-bbbb2222'), { recursive: true })
  writeFileSync(join(specBase2, '.runtime', 'quick-sessions', 'quick-bbbb2222', 'guard.json'), JSON.stringify({
    quicklogId: `ql-${TODAY}-007-1351`, startedAt: new Date().toISOString(),
  }))
  const r2 = await allocateQuicklogEntry(specBase2, 'alice', { description: '默认路径' })
  assert(r2.qlId.includes('-008-'), `sessionsDir 缺省走默认路径同样让位（实际 ${r2.qlId}）`)
}

// ─────────────────────────────────────────
// §2 分配查重：僵尸 guard（>7 天）不钉序号
// ─────────────────────────────────────────
console.log('--- §2 僵尸 guard 不钉序号 ---')
{
  const specBase = tmp('qlr-stale-')
  const sessionsDir = join(specBase, '.runtime', 'quick-sessions')
  mkdirSync(join(sessionsDir, 'quick-cccc3333'), { recursive: true })
  writeFileSync(join(sessionsDir, 'quick-cccc3333', 'guard.json'), JSON.stringify({
    quicklogId: `ql-${TODAY}-007-1351`,
    startedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
  }))
  const r = await allocateQuicklogEntry(specBase, 'alice', { description: '僵尸不钉号', sessionsDir })
  assert(r.qlId.includes('-001-'), `超龄 guard 不钉序号，取 001（实际 ${r.qlId}）`)
}

// ─────────────────────────────────────────
// §3 分配查重：盘上畸形头（双空格）容错——严格正则漏计的序号也让位
// ─────────────────────────────────────────
console.log('--- §3 盘上畸形头容错查重 ---')
{
  const specBase = tmp('qlr-loose-')
  mkdirSync(join(specBase, 'quicklog'), { recursive: true })
  // 双空格头：scanExisting 严格正则 ^## ql- 漏匹配 → 旧实现 maxSeq=0 会再分配 001
  writeFileSync(join(specBase, 'quicklog', 'QUICKLOG-alice.md'),
    `# QUICKLOG\n\n##  ql-${TODAY}-001-a1b2 | 畸形头条目\n状态：进行中\n\n`)
  const r = await allocateQuicklogEntry(specBase, 'alice', { description: '容错查重' })
  assert(!r.qlId.startsWith(`ql-${TODAY}-001-`), `畸形头占用的序号 001 不复用（实际 ${r.qlId}）`)
  assert(r.qlId.includes('-002-'), `让位后取 002（实际 ${r.qlId}）`)
}

// ─────────────────────────────────────────
// §4 countQuicklogEntries：跨文件 / 单文件双头 / 缺失
// ─────────────────────────────────────────
console.log('--- §4 countQuicklogEntries ---')
{
  const specBase = tmp('qlr-count-')
  const qdir = join(specBase, 'quicklog')
  mkdirSync(qdir, { recursive: true })
  writeFileSync(join(qdir, 'QUICKLOG-alice.md'), `## ql-${TODAY}-001-aaaa | 一\n状态：进行中\n\n## ql-${TODAY}-001-aaaa | 二（合并带回重复）\n状态：进行中\n\n`)
  writeFileSync(join(qdir, 'QUICKLOG-bob.md'), `## ql-${TODAY}-001-aaaa | 三（跨用户文件重复）\n状态：进行中\n\n`)
  const c1 = countQuicklogEntries(specBase, `ql-${TODAY}-001-aaaa`)
  assert(c1.count === 3, `同 ID 三处命中（单文件双头 + 跨文件，实际 ${c1.count}）`)
  assert(c1.files.length === 2, `命中文件数 2（实际 ${c1.files.join('、')}）`)
  const c2 = countQuicklogEntries(specBase, `ql-${TODAY}-009-zzzz`)
  assert(c2.count === 0, '不存在的 ID 计 0')
}

// ─────────────────────────────────────────
// §5 collectGuardReservedQuicklogIds：多会话 / 僵尸跳过 / 损坏跳过 / 目录缺失
// ─────────────────────────────────────────
console.log('--- §5 collectGuardReservedQuicklogIds ---')
{
  const specBase = tmp('qlr-collect-')
  const sessionsDir = join(specBase, '.runtime', 'quick-sessions')
  mkdirSync(join(sessionsDir, 'quick-dddd4444'), { recursive: true })
  mkdirSync(join(sessionsDir, 'quick-eeee5555'), { recursive: true })
  mkdirSync(join(sessionsDir, 'quick-ffff6666'), { recursive: true })
  mkdirSync(join(sessionsDir, 'quick-dead0000'), { recursive: true })
  writeFileSync(join(sessionsDir, 'quick-dddd4444', 'guard.json'), JSON.stringify({ quicklogId: `ql-${TODAY}-001-1111`, startedAt: new Date().toISOString() }))
  writeFileSync(join(sessionsDir, 'quick-eeee5555', 'guard.json'), JSON.stringify({ quicklogId: `ql-${TODAY}-001-1111`, startedAt: new Date().toISOString() }))
  writeFileSync(join(sessionsDir, 'quick-ffff6666', 'guard.json'), '{not json')
  writeFileSync(join(sessionsDir, 'quick-dead0000', 'guard.json'), JSON.stringify({
    quicklogId: `ql-${TODAY}-005-2222`,
    startedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
  }))
  const m = collectGuardReservedQuicklogIds(specBase, sessionsDir)
  assert(m.get(`ql-${TODAY}-001-1111`)?.length === 2, `同 ID 两会话预留（实际 ${JSON.stringify([...m])}）`)
  assert(!m.has(`ql-${TODAY}-005-2222`), '超龄僵尸预留不计')
  const empty = collectGuardReservedQuicklogIds(specBase, join(specBase, '.runtime', 'no-such'))
  assert(empty.size === 0, '目录缺失 fail-open 返回空')
}

// ─────────────────────────────────────────
// e2e 公共 harness（§6-8）
// ─────────────────────────────────────────
function initRepo(prefix) {
  const repo = tmp(prefix)
  git(repo, ['init', '-q']); git(repo, ['config', 'user.email', 't@t.local'])
  git(repo, ['config', 'user.name', 't']); git(repo, ['config', 'commit.gpgsign', 'false'])
  writeFileSync(join(repo, '.gitignore'), '.sillyspec/\n')
  writeFileSync(join(repo, 'm.js'), 'console.log(1)\n')
  git(repo, ['add', '.']); git(repo, ['commit', '-q', '-m', 'init'])
  return repo
}
async function startQuickToStep3(repo) {
  let out = ''
  { const o = console.log; console.log = (...a) => { out += a.join(' ') + '\n' }; const oe = console.error; console.error = () => {}
    try { await runCommand(['quick', 'ql-ID 竞态测试任务', '--linked-changes', 'none', '--non-interactive'], repo) } finally { console.log = o; console.error = oe } }
  const sid = extractSid(out)
  const m = out.match(/QUICKLOG 条目已创建:\s*(ql-\S+)/)
  await hush(() => runCommand(['quick', '--done', '--change', sid, '--output', 's1 理解', '--confirm'], repo))
  await hush(() => runCommand(['quick', '--done', '--change', sid, '--output', 's2 实现', '--confirm'], repo))
  return { sid, qlId: m ? m[1] : null }
}
function readQuicklog(repo) {
  return readFileSync(join(repo, '.sillyspec', 'quicklog', 'QUICKLOG-t.md'), 'utf8')
}

// ─────────────────────────────────────────
// §6 e2e：--done 盘上同 ID 双条目 → 硬拦（不猜归属）
// ─────────────────────────────────────────
console.log('--- §6 e2e：双条目硬拦 ---')
{
  const repo = initRepo('qlr-e2e-dup-')
  await new ProgressManager({ specDir: join(repo, '.sillyspec') }).init(repo)
  const { sid, qlId } = await startQuickToStep3(repo)
  assert(qlId !== null, `会话已到 step3（${sid} / ${qlId}）`)
  // 复制条目块再追加一份 → 同 ID 双条目（合并带回的损坏形态）
  const qfile = join(repo, '.sillyspec', 'quicklog', 'QUICKLOG-t.md')
  const content = readFileSync(qfile, 'utf8')
  writeFileSync(qfile, content + content)
  let exitErr = null, capErr = ''
  const oe = process.exit; process.exit = (c) => { throw new Error('EXIT_' + c) }
  const oerr = console.error; console.error = (...a) => { capErr += a.join(' ') + '\n' }
  const olog = console.log; console.log = () => {}
  try { await runCommand(['quick', '--done', '--change', sid, '--output', STRUCTURED, '--confirm'], repo) } catch (e) { exitErr = e }
  process.exit = oe; console.error = oerr; console.log = olog
  assert(exitErr && exitErr.message === 'EXIT_1', `双占用被硬拦 exit 1（${exitErr && exitErr.message}）`)
  assert(capErr.includes('双占用') || capErr.includes('去重'), `拦截信息含双占用指引（实际: ${capErr.slice(0, 120)}）`)
  const prog = await new ProgressManager({ specDir: join(repo, '.sillyspec') }).read(repo, sid)
  assert(prog.stages.quick.steps[prog.stages.quick.steps.length - 1].status === 'pending', '硬拦后末步回退 pending（不丢进度）')
}

// ─────────────────────────────────────────
// §7 e2e：--done 他者活跃 guard 占用同 ID → 换新号完成
// ─────────────────────────────────────────
console.log('--- §7 e2e：他者占用换新号 ---')
{
  const repo = initRepo('qlr-e2e-mig-')
  await new ProgressManager({ specDir: join(repo, '.sillyspec') }).init(repo)
  const { sid, qlId } = await startQuickToStep3(repo)
  // 伪造他者活跃会话 guard 预留同 ID（竞态残留形态）
  const otherDir = join(repo, '.sillyspec', '.runtime', 'quick-sessions', 'quick-99999999')
  mkdirSync(otherDir, { recursive: true })
  writeFileSync(join(otherDir, 'guard.json'), JSON.stringify({
    sessionId: 'quick-99999999', quicklogId: qlId, taskDescription: '他者并行会话',
    startedAt: new Date().toISOString(),
  }))
  let out = ''
  { const o = console.log; console.log = (...a) => { out += a.join(' ') + '\n' }; const oe = console.error; console.error = (...a) => { out += a.join(' ') + '\n' }; const ow = console.warn; console.warn = (...a) => { out += a.join(' ') + '\n' }
    try { await runCommand(['quick', '--done', '--change', sid, '--output', STRUCTURED, '--confirm'], repo) } finally { console.log = o; console.error = oe; console.warn = ow } }
  assert(out.includes('换新号') || out.includes('占用'), `完成输出含换号警示（${out.includes('换新号') ? '换新号' : '占用'} 命中）`)
  const log = readQuicklog(repo)
  const newIds = [...log.matchAll(/^## (ql-\S+) \|.*$/gm)].map(x => x[1]).filter(id => id !== qlId)
  assert(newIds.length >= 1, `QUICKLOG 出现换号新条目（${newIds.join('、')}）`)
  assert(log.includes(`## ${qlId} |`) && log.includes('状态：进行中'), '原 ID 条目保持进行中（让位他者，未被本会话翻态）')
  const doneBlock = log.split(/^## /m).find(seg => newIds[0] && seg.startsWith(newIds[0]))
  assert(doneBlock && doneBlock.includes('状态：已完成') && doneBlock.includes('结果：'), '新号条目已完成且含结果块')
}

// ─────────────────────────────────────────
// §8 e2e：--done 条目缺失（会话期间丢失）→ 原硬拦改自愈补建
// ─────────────────────────────────────────
console.log('--- §8 e2e：条目丢失自愈 ---')
{
  const repo = initRepo('qlr-e2e-heal-')
  await new ProgressManager({ specDir: join(repo, '.sillyspec') }).init(repo)
  const { sid, qlId } = await startQuickToStep3(repo)
  // 清空 QUICKLOG：模拟条目被并行 git 操作回滚丢失
  writeFileSync(join(repo, '.sillyspec', 'quicklog', 'QUICKLOG-t.md'), '')
  let out = '', exitErr = null
  const oe = process.exit; process.exit = (c) => { throw new Error('EXIT_' + c) }
  const olog = console.log; console.log = (...a) => { out += a.join(' ') + '\n' }
  const oerr = console.error; console.error = (...a) => { out += a.join(' ') + '\n' }
  const owarn = console.warn; console.warn = (...a) => { out += a.join(' ') + '\n' }
  try { await runCommand(['quick', '--done', '--change', sid, '--output', STRUCTURED, '--confirm'], repo) } catch (e) { exitErr = e }
  process.exit = oe; console.log = olog; console.error = oerr; console.warn = owarn
  assert(!exitErr, `条目丢失不再硬拦（${exitErr ? exitErr.message : '正常完成'}）`)
  assert(out.includes('补建'), `输出含补建提示`)
  const log = readQuicklog(repo)
  assert(log.includes(`## ${qlId} |`), `按原 ID 补建条目（${qlId}）`)
  assert(log.includes('状态：已完成') && log.includes('结果：'), '补建条目翻已完成且含结果块')
}

for (const dir of tmpRoots) { try { rmSync(dir, { recursive: true, force: true }) } catch {} }
console.log('\n==================================================')
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
console.log('==================================================')
if (failed > 0) process.exit(1)
