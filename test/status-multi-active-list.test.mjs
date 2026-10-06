/**
 * 坑 status-multi-active-list：裸 status 多活跃误报空态 + 库不在场只读破防
 *
 * 背景（2026-10-06 实测，变更 2026-10-06-status-multi-active-list）：
 *   1. `sillyspec status`（无 --change）在进度库 ≥2 活跃变更时，read() 因「多活跃无法自动
 *      推导」返回 null，只读空态分支一律打「未找到进度数据（只读查询不建变更）」——数据
 *      存在、歧义在选谁，被误报成无数据（本仓实测 10 行 active、2 个目录待收口）。
 *   2. `.runtime/sillyspec.db` 被删（schema-version 戳残留）时，裸 status 经 read()→
 *      listChanges→_ensureDB 凭空新建空库，空库撞孤儿戳无表可查，`no such table: changes`
 *      裸栈崩溃 exit 1——只读承诺双重破防（建了库、崩了查询）。
 *
 * 锁定语义：
 *   ① 多活跃（≥2）：列出全部活跃变更名 + 计数 + --change 提示，禁止「未找到进度数据」
 *   ② 幽灵行（DB active 但目录缺失）标注「本地无目录」
 *   ③ 零活跃：既有空态引导逐字不回归
 *   ④ 库不在场：走空态引导、exit 0、零落盘（不新建 sillyspec.db / changes/ 目录）
 *   ⑤ 多活跃分支只读零落盘（不新增 changes/ 目录）
 *   ⑥ 库丢失后写路径可恢复：全新建库分支重跑建表，首个写命令不再 no-such-table 崩溃
 */
import { join } from 'node:path'
import { mkdirSync, rmSync, existsSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'
import { tmpdir } from 'node:os'

const __dirname = fileURLToPath(import.meta.url).replace(/[^/\\]+$/, '')
const root = join(__dirname, '..')
const binCLI = join(root, 'bin', 'sillyspec.js')

let passed = 0, failed = 0
const failures = []
function assert(cond, msg) { cond ? (passed++, console.log(`  ✅ PASS: ${msg}`)) : (failed++, failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }
function run(cmd) {
  try { return { out: execSync(cmd, { encoding: 'utf8', timeout: 60000 }), status: 0 } }
  catch (e) { return { out: (e.stdout || '') + (e.stderr || ''), status: e.status } }
}
function countChanges(d) {
  const chDir = join(d, '.sillyspec', 'changes')
  return existsSync(chDir) ? readdirSync(chDir).filter(x => !x.startsWith('.')).length : 0
}

console.log('=== 裸 status 多活跃清单 + 库不在场只读语义（2026-10-06-status-multi-active-list）===\n')

console.log('--- ① 多活跃列表：计数+全名+--change 提示+无空态误报+只读零落盘（⑤） ---')
{
  const d = join(tmpdir(), `smal-multi-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`)
  mkdirSync(d, { recursive: true })
  run(`node "${binCLI}" --dir "${d}" init`)
  for (const cn of ['2026-10-06-a', '2026-10-06-b']) {
    mkdirSync(join(d, '.sillyspec', 'changes', cn), { recursive: true })
    run(`node "${binCLI}" --dir "${d}" run plan --change ${cn} "x"`)
  }
  const before = countChanges(d)
  const r = run(`node "${binCLI}" --dir "${d}" run status`)
  assert(r.status === 0, `exit 0（实际 ${r.status}）`)
  assert(r.out.includes('2 个活跃变更'), '输出含「2 个活跃变更」计数')
  assert(r.out.includes('2026-10-06-a') && r.out.includes('2026-10-06-b'), '两个活跃变更名都在清单中')
  assert(r.out.includes('--change'), '含 --change 指定提示')
  assert(!r.out.includes('未找到进度数据'), '不再误报「未找到进度数据」')
  assert(countChanges(d) === before, `只读零落盘：changes/ 目录数不变（${before}）`)
  const alias = run(`node "${binCLI}" --dir "${d}" status`)
  assert(alias.status === 0 && alias.out.includes('2 个活跃变更') && !alias.out.includes('未找到进度数据'),
    '顶层 status 别名与 run status 同构（清单分支）')

  console.log('--- ② 幽灵行标注本地无目录 ---')
  rmSync(join(d, '.sillyspec', 'changes', '2026-10-06-b'), { recursive: true, force: true })
  const g = run(`node "${binCLI}" --dir "${d}" run status`)
  assert(g.status === 0, `exit 0（实际 ${g.status}）`)
  const lines = g.out.split('\n').map(s => s.trim()).filter(s => s.startsWith('- '))
  const ghost = lines.find(l => l.startsWith('- 2026-10-06-b'))
  const alive = lines.find(l => l.startsWith('- 2026-10-06-a'))
  assert(!!ghost && ghost.includes('本地无目录'), `幽灵行标注本地无目录（实际：${ghost}）`)
  assert(!!alive && !alive.includes('本地无目录'), `目录在场行不带标注（实际：${alive}）`)
  try { rmSync(d, { recursive: true, force: true }) } catch {}
}

console.log('--- ③ 零活跃：既有空态引导不回归 ---')
{
  const d = join(tmpdir(), `smal-zero-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`)
  mkdirSync(d, { recursive: true })
  run(`node "${binCLI}" --dir "${d}" init`)
  const r = run(`node "${binCLI}" --dir "${d}" run status`)
  assert(r.status === 0, `exit 0（实际 ${r.status}）`)
  assert(r.out.includes('未找到进度数据'), '保留原空态提示句')
  assert(r.out.includes('flow start'), '引导行含 flow start 子串')
  assert(r.out.includes('run brainstorm'), '引导行含 brainstorm 备选')
  try { rmSync(d, { recursive: true, force: true }) } catch {}
}

console.log('--- ④ 库不在场：走空态引导且不新建库（FR-02/FR-03） ---')
{
  const d = join(tmpdir(), `smal-nodb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`)
  mkdirSync(d, { recursive: true })
  run(`node "${binCLI}" --dir "${d}" init`)
  const dbPath = join(d, '.sillyspec', '.runtime', 'sillyspec.db')
  // 删主库及 WAL/SHM 侧车，保留 schema-version 戳（复现实测的孤儿戳形态）
  for (const p of [dbPath, dbPath + '-wal', dbPath + '-shm']) {
    try { rmSync(p, { force: true }) } catch {}
  }
  const before = countChanges(d)
  const r = run(`node "${binCLI}" --dir "${d}" run status`)
  assert(r.status === 0, `exit 0（实际 ${r.status}）`)
  assert(r.out.includes('未找到进度数据') && r.out.includes('flow start'), '库不在场走既有空态引导')
  assert(!r.out.includes('no such table'), '不因缺库裸栈崩溃')
  assert(!existsSync(dbPath), '只读不新建 sillyspec.db')
  assert(countChanges(d) === before, `只读不建变更目录（${before} 不变）`)

  console.log('--- ⑥ 库丢失后写路径可恢复：全新建库重跑建表 ---')
  mkdirSync(join(d, '.sillyspec', 'changes', '2026-10-06-c'), { recursive: true })
  const w = run(`node "${binCLI}" --dir "${d}" run plan --change 2026-10-06-c "x"`)
  assert(w.status === 0, `库丢失后首个写命令 exit 0（实际 ${w.status}）`)
  assert(!w.out.includes('no such table'), '不再 no such table 崩溃')
  assert(existsSync(dbPath), '写路径正常重建库文件')
  const s = run(`node "${binCLI}" --dir "${d}" run status`)
  assert(s.status === 0 && !s.out.includes('未找到进度数据'), '重建库后单活跃可正常展示')
  try { rmSync(d, { recursive: true, force: true }) } catch {}
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
if (failures.length) { console.log('失败项:'); failures.forEach(f => console.log('  - ' + f)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
