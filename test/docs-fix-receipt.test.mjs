/**
 * docs check --fix 修复回执测试（change: 2026-09-07-ir-hardening，FR-04，D-007@v1）。
 *
 * 锁住：
 *  1. --fix：回执行「前 N → 重锚 M → 后 K」且后值真实重算（fixture：2 处超界可重锚 + 1 处零命中待人工）
 *     ——层2 容差窗口对小漂移有救济，失效构造必须用超界行号（> 总行数）
 *  2. 非 --fix 路径（纯检查/--dry-run）输出零变化（无回执行）
 *  3. --fix --json：fixReport.receipt 四字段
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }
const tmpRoots = []
const binCLI = join(fileURLToPath(new URL('..', import.meta.url)), 'bin', 'sillyspec.js')

function mkRepo(prefix) {
  const d = mkdtempSync(join(tmpdir(), prefix)); tmpRoots.push(d)
  for (const a of [['init', '-q'], ['config', 'user.email', 't@t'], ['config', 'user.name', 't']]) {
    execFileSync('git', a, { cwd: d, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  }
  return d
}
// docs check 失效时 exit 1（预期路径）——helper 容错退出码，返回 combined 输出
const run = (cwd, args) => {
  const r = spawnSync(process.execPath, [binCLI, '--dir', cwd, 'docs', 'check', ...args],
    { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  return (r.stdout || '') + (r.stderr || '')
}

console.log('=== docs check --fix 修复回执 ===\n')

// fixture：源文件 6 行（alphaOne@4 / betaTwo@6）；文档 3 处超界引用（:99/:98/:97）
// alphaOne/betaTwo token 全文唯一 → fixable；ghostFn 零命中 → needs-manual
const cwd = mkRepo('dfr-')
mkdirSync(join(cwd, 'src'), { recursive: true })
writeFileSync(join(cwd, 'src', 'a.js'), '// pad\n// pad\n// pad\nexport function alphaOne() { return 1 }\n// pad\nexport function betaTwo() { return 2 }\n')
mkdirSync(join(cwd, 'docs'), { recursive: true })
writeFileSync(join(cwd, 'docs', 'g.md'), '# D\n\n- `alphaOne` 见 src/a.js:99\n- `betaTwo` 见 src/a.js:98\n- `ghostFn` 见 src/a.js:97\n')

console.log('--- ① 纯检查：3/3 失效 + 无回执行 ---')
{
  const out = run(cwd, [])
  const mm = out.match(/(\d+)\/(\d+) 处引用失效/)
  assert(mm && mm[1] === '3' && mm[2] === '3', `纯检查报 3/3 处失效（实际 ${mm ? mm[0] : '未匹配'}）`)
  assert(!out.includes('修复回执'), '纯检查无回执行')
}

console.log('\n--- ② --dry-run：预览不写盘无回执（零变化） ---')
{
  const out = run(cwd, ['--dry-run'])
  assert(out.includes('预览'), 'dry-run 走预览路径')
  assert(!out.includes('修复回执'), 'dry-run 无回执行（未写盘重算无意义）')
  const doc = String(await import('node:fs').then(m => m.readFileSync(join(cwd, 'docs', 'g.md'), 'utf8')))
  assert(doc.includes('src/a.js:99'), 'dry-run 未写盘（引用原样）')
}

console.log('\n--- ③ --fix：回执三段计数 + 后值真实重算 ---')
{
  const out = run(cwd, ['--fix'])
  assert(out.includes('修复回执'), '--fix 输出回执行')
  const m = out.match(/修复前 (\d+) 处失效 → 重锚 (\d+) 处 → 修复后 (\d+) 处（消除 (\d+) 处）/)
  assert(!!m, `回执四段计数可解析（片段：${(out.split('\n').find(l => l.includes('修复回执')) || '').slice(0, 80)}）`)
  if (m) {
    assert(Number(m[1]) === 3, `invalidBefore=3（实际 ${m[1]}）`)
    assert(Number(m[2]) === 2, `reAnchored=2（alphaOne/betaTwo 唯一命中；实际 ${m[2]}）`)
    assert(Number(m[3]) === 1, `invalidAfter=1（ghostFn 待人工；实际 ${m[3]}）——后值真实重算非前值复用`)
    assert(Number(m[4]) === 2, `eliminated=2（实际 ${m[4]}）`)
  }
  const doc = String(await import('node:fs').then(m => m.readFileSync(join(cwd, 'docs', 'g.md'), 'utf8')))
  assert(doc.includes('src/a.js:4') && doc.includes('src/a.js:6'), '重锚写盘（:99→:4 / :98→:6）')
  assert(doc.includes('src/a.js:97'), '待人工条目原样保留')
}

console.log('\n--- ④ --fix --json：fixReport.receipt 字段 ---')
{
  writeFileSync(join(cwd, 'docs', 'g.md'), '# D\n\n- `alphaOne` 见 src/a.js:88\n- `ghostFn` 见 src/a.js:77\n')
  const out = run(cwd, ['--fix', '--json'])
  const parsed = JSON.parse(out)
  assert(parsed.fixReport && typeof parsed.fixReport === 'object', 'fixReport 在')
  const r = parsed.fixReport.receipt
  assert(r && r.invalidBefore === 2 && r.reAnchored === 1 && r.invalidAfter === 1 && r.eliminated === 1,
    `receipt 四字段正确（实际 ${JSON.stringify(r)}）`)
}

for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} }
console.log(`\n${'='.repeat(50)}\n✅ 通过: ${count.passed}  ❌ 失败: ${count.failed}\n${'='.repeat(50)}`)
if (count.failed > 0) process.exit(1)
