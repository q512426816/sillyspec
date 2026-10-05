/**
 * 坑 status-empty-guide：status 空态无下一步指引
 *
 * 背景（2026-10-05 实测）：`sillyspec status` 在仓库无任何进度数据时只输出一句
 * 「未找到进度数据（只读查询不建变更）」就 exit 0——新会话 agent/用户得不到任何
 * 下一步入口指引，只能靠翻文档找 flow start / brainstorm。
 *
 * 锁定语义（2026-10-05-status-empty-guide）：
 *   1. 空仓库：run status 与顶层 status 别名同构——原句之后必有引导行（含 flow start
 *      子串与 brainstorm 备选），exit 0 不变，且不落盘任何变更目录（只读语义保持）
 *   2. 有活跃变更：走既有展示路径，禁止出现空态引导行（不回归）
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

console.log('=== status 空态引导（坑 status-empty-guide）===\n')

console.log('--- ① 空仓库 run status：原句 + 引导行 + exit 0 + 零落盘 ---')
{
  const d = join(tmpdir(), `seg-empty-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`)
  mkdirSync(d, { recursive: true })
  run(`node "${binCLI}" --dir "${d}" init`)
  const r = run(`node "${binCLI}" --dir "${d}" run status`)
  assert(r.status === 0, `exit 0（实际 ${r.status}）`)
  assert(r.out.includes('未找到进度数据'), '保留原空态提示句')
  assert(r.out.includes('flow start'), '引导行含 flow start 子串')
  assert(r.out.includes('run brainstorm'), '引导行含 brainstorm 备选')
  const chDir = join(d, '.sillyspec', 'changes')
  const created = existsSync(chDir) ? readdirSync(chDir).filter(x => !x.startsWith('.')).length : 0
  assert(created === 0, `只读不建变更（changes/ 下新建 ${created} 个目录）`)
  try { rmSync(d, { recursive: true, force: true }) } catch {}
}

console.log('--- ② 顶层 status 别名同构 ---')
{
  const d = join(tmpdir(), `seg-alias-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`)
  mkdirSync(d, { recursive: true })
  run(`node "${binCLI}" --dir "${d}" init`)
  const r = run(`node "${binCLI}" --dir "${d}" status`)
  assert(r.status === 0, `exit 0（实际 ${r.status}）`)
  assert(r.out.includes('未找到进度数据') && r.out.includes('flow start'), '别名输出与 run status 同构（原句+引导行）')
  try { rmSync(d, { recursive: true, force: true }) } catch {}
}

console.log('--- ③ 有活跃变更：既有展示路径，禁止空态引导行 ---')
{
  const d = join(tmpdir(), `seg-active-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`)
  mkdirSync(d, { recursive: true })
  run(`node "${binCLI}" --dir "${d}" init`)
  const cn = '2026-10-05-active-a'
  mkdirSync(join(d, '.sillyspec', 'changes', cn), { recursive: true })
  run(`node "${binCLI}" --dir "${d}" run plan --change ${cn} "x"`)
  const r = run(`node "${binCLI}" --dir "${d}" status --change ${cn}`)
  assert(r.status === 0, `exit 0（实际 ${r.status}）`)
  assert(!r.out.includes('未找到进度数据'), '有变更不走空态分支')
  assert(!r.out.includes('→ 可 sillyspec flow start'), '空态引导行不出现')
  try { rmSync(d, { recursive: true, force: true }) } catch {}
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
if (failures.length) { console.log('失败项:'); failures.forEach(f => console.log('  - ' + f)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
