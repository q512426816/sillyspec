/**
 * 坑 verify-pids-cross-session-kill + verify-reconcile-foreign-wip 回归
 *
 * ① 服务 PID 分片（2026-08-23 实证：verify-services.pids 单文件无归属，A 会话 --done 把 B
 *   正在收集 Runtime Evidence 的服务一并杀掉）：reapVerifyServices 只回收本变更分片 +
 *   兼容旧单文件 + 回执按变更分片。
 * ② 对账归属过滤（2026-08-23 实证：verify 对账在主仓共享工作区取 git diff，无 meta 回退时
 *   并行会话在途 WIP 全量混入本变更判定）：只认他者显式声明（quick --files / 他者 design
 *   清单），无主文件保留参与判定（fail-closed）。
 */
import { mkdirSync, mkdtempSync, writeFileSync, rmSync, existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { spawn } from 'child_process'
import { execSync } from 'child_process'
import { reapVerifyServices, filterStaleBaselineOverlap } from '../src/run/gates.js'
import { collectForeignDeclaredFiles, splitOwnVsForeignDiffFiles } from '../src/foreign-declared.js'
import { runVerifyDeletionCheck } from '../src/verify-postcheck.js'

let passed = 0, failed = 0
const failures = []
function assert(cond, msg) {
  if (cond) { passed++; console.log(`  ✅ PASS: ${msg}`) }
  else { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
}
const tmpDirs = []
function mkTmp(prefix) {
  const d = mkdtempSync(join(tmpdir(), `vconc-${prefix}-`))
  tmpDirs.push(d)
  return d
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
const isAlive = (pid) => { try { process.kill(pid, 0); return true } catch (e) { return e.code === 'EPERM' } }

console.log('=== ① verify 服务 PID 分片回收（reapVerifyServices）===\n')
{
  const cwd = mkTmp('pids')
  const runtimeDir = join(cwd, '.sillyspec', '.runtime')
  mkdirSync(runtimeDir, { recursive: true })
  // 两个「服务进程」：A 会话与 B 会话各自的长驻子进程
  const spawnSrv = () => {
    const p = spawn(process.execPath, ['-e', 'setInterval(() => {}, 60000)'], { stdio: 'ignore' })
    return p.pid
  }
  const pidA = spawnSrv()
  const pidB = spawnSrv()
  await sleep(300)
  // A 分片 + B 分片 + 旧格式单文件（含已退出的 PID——ESRCH 静默；99999 大概率不存在）
  writeFileSync(join(runtimeDir, 'verify-services-changeA.pids'), `${pidA}\n`)
  writeFileSync(join(runtimeDir, 'verify-services-changeB.pids'), `${pidB}\n`)
  writeFileSync(join(runtimeDir, 'verify-services.pids'), '99999\n')

  const r = reapVerifyServices(null, join(cwd, '.sillyspec'), 'changeA')
  await sleep(300)
  assert(r.reaped >= 1, `A 分片回收计数 ≥1（实际 ${r.reaped}）`)
  assert(!isAlive(pidA), 'A 的服务进程已被杀（本变更分片回收）')
  assert(isAlive(pidB), 'B 的服务进程仍存活（他变更分片不被误杀——坑 verify-pids-cross-session-kill 核心）')
  assert(!existsSync(join(runtimeDir, 'verify-services-changeA.pids')), 'A 分片文件已清')
  assert(existsSync(join(runtimeDir, 'verify-services-changeB.pids')), 'B 分片文件保留')
  assert(!existsSync(join(runtimeDir, 'verify-services.pids')), '旧格式单文件被兼容回收清理')
  const receiptPath = join(runtimeDir, 'verify-services-changeA.receipt.json')
  assert(existsSync(receiptPath), '回执按变更分片落盘')
  const receipt = JSON.parse(readFileSync(receiptPath, 'utf8'))
  assert(receipt.change === 'changeA' && receipt.reapedPidCount >= 1, `回执内容正确（${JSON.stringify(receipt)}）`)
  // 收尾：杀 B 的子进程
  try { process.kill(pidB, 'SIGKILL') } catch {}
}

console.log('\n=== ② 他者声明归属过滤（foreign-declared）===\n')
{
  const cwd = mkTmp('foreign')
  const specBase = join(cwd, '.sillyspec')
  // 本变更与他者变更的 design §6 清单
  const mkChange = (name, files) => {
    mkdirSync(join(specBase, 'changes', name), { recursive: true })
    const rows = files.map(f => `| ${f} | 修改 |`).join('\n')
    writeFileSync(join(specBase, 'changes', name, 'design.md'),
      `# D\n\n## 文件变更清单\n\n| 文件 | 操作 |\n|------|------|\n${rows}\n`)
  }
  mkChange('current-change', ['src/mine.js'])
  mkChange('other-change', ['src/other.js'])
  mkChange('archive/archived-old', ['src/old.js']) // archive 下不算（目录名含 / 的 readdir 条目？
  // 他者 quick 会话的 --files 声明
  mkdirSync(join(specBase, '.runtime', 'quick-sessions', 'quick-abcd1234'), { recursive: true })
  writeFileSync(join(specBase, '.runtime', 'quick-sessions', 'quick-abcd1234', 'guard.json'),
    JSON.stringify({ sessionId: 'quick-abcd1234', allowedFiles: ['daemon/router.py'] }))
  // 本会话自身的 quick 声明（应排除自身）
  mkdirSync(join(specBase, '.runtime', 'quick-sessions', 'quick-cur09999'), { recursive: true })
  writeFileSync(join(specBase, '.runtime', 'quick-sessions', 'quick-cur09999', 'guard.json'),
    JSON.stringify({ sessionId: 'quick-cur09999', allowedFiles: ['src/self.js'] }))

  const foreign = collectForeignDeclaredFiles(cwd, 'quick-cur09999')
  assert(foreign.has('src/other.js') && foreign.get('src/other.js').includes('other-change'), '他者变更 design 清单文件入集')
  assert(foreign.has('daemon/router.py') && foreign.get('daemon/router.py').includes('quick-abcd1234'), '他者 quick --files 声明入集')
  assert(!foreign.has('src/self.js'), '本会话自身声明排除')
  assert(foreign.has('src/mine.js'), '视角为本 quick 会话时，其他在途变更（current-change）的清单文件入集')

  // 切分：无主文件保留（fail-closed）
  const { own, foreign: fList } = splitOwnVsForeignDiffFiles(cwd, 'current-change',
    ['src/mine.js', 'src/other.js', 'daemon/router.py', 'src/orphan.js'])
  assert(own.includes('src/mine.js') && own.includes('src/orphan.js'), `own 含本变更文件与无主文件（实际 ${JSON.stringify(own)}）`)
  assert(fList.some(x => x.file === 'src/other.js') && fList.some(x => x.file === 'daemon/router.py'), 'foreign 含他者声明文件（带 owner）')
  // null 透传（git 不可用语义）
  const nullRet = splitOwnVsForeignDiffFiles(cwd, 'x', null)
  assert(nullRet.own === null && nullRet.foreign.length === 0, 'null diffFiles 透传（保持调用方 null 语义）')
}

console.log('\n=== ③ 删除对账的他者过滤集成（runVerifyDeletionCheck）===\n')
{
  const cwd = mkTmp('delcheck')
  const specBase = join(cwd, '.sillyspec')
  execSync('git init -q -b main', { cwd })
  execSync('git config user.email t@t.co && git config user.name t', { cwd })
  // 基线提交三个文件
  for (const f of ['src/mine-del.js', 'src/other-del.js', 'src/orphan-del.js']) {
    mkdirSync(join(cwd, f, '..'), { recursive: true })
    writeFileSync(join(cwd, f), 'x\n')
  }
  execSync('git add -A && git commit -qm init', { cwd })
  // 本变更 design：声明删除 mine-del.js
  mkdirSync(join(specBase, 'changes', 'del-change'), { recursive: true })
  writeFileSync(join(specBase, 'changes', 'del-change', 'design.md'),
    '# D\n\n## 文件变更清单\n\n| 文件 | 操作 |\n|------|------|\n| src/mine-del.js | 删除 |\n')
  // 他者变更 design：声明 other-del.js
  mkdirSync(join(specBase, 'changes', 'other-change'), { recursive: true })
  writeFileSync(join(specBase, 'changes', 'other-change', 'design.md'),
    '# D\n\n## 文件变更清单\n\n| 文件 | 操作 |\n|------|------|\n| src/other-del.js | 删除 |\n')
  // 主仓工作区删除三个文件（本变更声明 + 他者声明 + 无主）
  for (const f of ['src/mine-del.js', 'src/other-del.js', 'src/orphan-del.js']) rmSync(join(cwd, f))

  const check = runVerifyDeletionCheck({ cwd, specBase, changeName: 'del-change' })
  const paths = (check.highRisk || []).concat(check.mediumRisk || [], check.compliant || []).map(x => x.path).filter(Boolean)
  // runVerifyDeletionCheck 返回结构里各桶的形态可能不同——直接看 JSON 兜底
  const dump = JSON.stringify(check)
  assert(!dump.includes('src/other-del.js'), `他者声明的删除不进本变更对账（dump 含: ${dump.includes('src/other-del.js')}）`)
  assert(dump.includes('src/orphan-del.js'), '无主删除保留参与判定（fail-closed：未声明删除仍被抓）')
  assert(dump.includes('src/mine-del.js'), '本变更声明的删除参与对账')
}

for (const d of tmpDirs) { try { rmSync(d, { recursive: true, force: true }) } catch {} }

// ── ③ 归因提示②重叠集过滤（坑 verify-attr2-foreign-wip-misdirection：并行会话在途文件
//    让重叠集虚高（51 文件），逐轮误导 agent 重跑 gen:types，实际失败源是他者 WIP）──
console.log('\n=== ③ 归因提示②重叠集过滤（filterStaleBaselineOverlap）===\n')
{
  const overlap = ['src/gen/api-types.ts', 'src/app/page.tsx', 'src/other/wip.ts', 'src/clean/same.ts']
  const dirty = new Set(['src/gen/api-types.ts', 'src/other/wip.ts']) // 仅前者在场且非他者
  const foreign = new Set(['src/other/wip.ts'])                        // 他者会话声明的在途文件
  const out = filterStaleBaselineOverlap(overlap, dirty, foreign)
  console.log(`  overlap=${JSON.stringify(overlap)} → actionable=${JSON.stringify(out)}`)
  assert(JSON.stringify(out) === JSON.stringify(['src/gen/api-types.ts']),
    '只留「dirty 且非他者声明」的文件（他者在途归提示①、未落盘重叠不行动）')
}
{
  // 2026-08-28 实证场景复原：51 个重叠全为他者在途/已收尾文件 → 提示②整体静默
  const overlap = Array.from({ length: 51 }, (_, i) => `src/mod${i}/file.ts`)
  const dirty = new Set(overlap)
  const foreignMap = new Map(overlap.map((f) => [f, {}]))
  const out = filterStaleBaselineOverlap(overlap, dirty, foreignMap)
  assert(out.length === 0, `全为他者声明 → 空（不出提示②，实际 ${out.length}）；foreignDeclared 支持 Map`)
}
{
  const out = filterStaleBaselineOverlap(['a', 'b'], new Set(), new Set())
  assert(out.length === 0, '重叠文件均未落盘（不 dirty）→ 空（重跑生成命令改变不了本轮实测）')
  const out2 = filterStaleBaselineOverlap(null, new Set(['a']), null)
  assert(out2.length === 0, 'overlap null → 空不抛错')
  const out3 = filterStaleBaselineOverlap(['a', 'b'], null, null)
  assert(out3.length === 0, 'dirtySet null → 空不抛错（fail-closed 不出提示）')
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
if (failures.length) console.log(`失败项: ${failures.join('; ')}`)
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
