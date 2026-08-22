/**
 * 两坑回归（2026-08-22）：
 *   ① 关联变更目录的他者遗留脏文件不再 blocked（从本会话归属剔除 + warning 可见）
 *   ② tasks.md 追加行不再落「提案书（Proposal）」占位（固定前缀显式剥取）
 */
import fs from 'fs'
import path from 'path'
import os from 'os'
import { execSync } from 'child_process'
import { fileURLToPath } from 'node:url'
import { deriveTitleFromLinkedChange, allocateQuicklogEntry } from '../src/quicklog.js'
import { auditQuickCompletion } from '../src/run/shared.js'

const __dirname = fileURLToPath(import.meta.url).replace(/[^/\\]+$/, '')
const root = join(__dirname, '..')
const binCLI = join(root, 'bin', 'sillyspec.js')
import { join } from 'node:path'

let failed = 0, total = 0
const failures = []
function assertTrue(cond, msg) {
  total++
  if (cond) console.log(`  ✅ PASS: ${msg}`)
  else { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
}
function run(cmd) {
  try { return { out: execSync(cmd + ' 2>&1', { encoding: 'utf8', timeout: 90000, shell: true }), status: 0 } }
  catch (e) { return { out: (e.stdout || '') + (e.stderr || ''), status: e.status } }
}
const tmpDirs = []
function mkRepo(prefix) {
  const d = join(os.tmpdir(), `qlt-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`)
  tmpDirs.push(d)
  fs.mkdirSync(d, { recursive: true })
  execSync('git init -q -b main', { cwd: d, stdio: 'pipe' })
  execSync('git config user.email t@t && git config user.name t', { cwd: d, stdio: 'pipe' })
  fs.writeFileSync(join(d, 'base.txt'), 'base\n')
  execSync('git add -A && git commit -qm base', { cwd: d, stdio: 'pipe' })
  return d
}
const cleanupAll = () => { for (const d of tmpDirs) { try { fs.rmSync(d, { recursive: true, force: true }) } catch {} } }

console.log('=== ② 标题剥取（坑 linked-task-placeholder-title）===\n')
{
  const d = mkRepo('ttl')
  const cn = '2026-08-22-linked-a'
  const cd = join(d, '.sillyspec', 'changes', cn)
  fs.mkdirSync(cd, { recursive: true })
  const cases = [
    ['# 提案书（Proposal）— 表格列宽统一可拖拽', '表格列宽统一可拖拽'],
    ['# 提案书（Proposal）: 半角冒号形态', '半角冒号形态'],
    ['# 提案书（Proposal）：全角冒号形态', '全角冒号形态'],
  ]
  for (const [h, want] of cases) {
    fs.writeFileSync(join(cd, 'proposal.md'), h + '\n')
    const got = deriveTitleFromLinkedChange(join(d, '.sillyspec'), cn)
    assertTrue(got === want, `${h.slice(0, 18)}… → ${JSON.stringify(got)}`)
  }
  // e2e：启动 quick（--linked-changes，无 --input）→ 关联 tasks.md 追加行带语义标题
  fs.writeFileSync(join(cd, 'proposal.md'), '# 提案书（Proposal）：修复表格列宽\n')
  run(`node "${binCLI}" --dir "${d}" init`)
  const start = run(`node "${binCLI}" --dir "${d}" run quick --linked-changes ${cn} "关联修复"`)
  const sidM = start.out.match(/sessionId:\s*(quick-[0-9a-f]{8})/)
  assertTrue(!!sidM, 'quick 会话启动')
  const tasksMd = fs.readFileSync(join(cd, 'tasks.md'), 'utf8')
  const appended = tasksMd.split('\n').find(l => l.includes('ql-2026'))
  assertTrue(!!appended && appended.includes('修复表格列宽'), `tasks.md 追加行含语义标题（实际：${appended || '无'}）`)
  assertTrue(!(appended || '').includes('提案书'), '追加行不再含「提案书（Proposal）」占位')
  // QUICKLOG 条目标题同源
  const qlFile = fs.readFileSync(join(d, '.sillyspec', 'quicklog', 'QUICKLOG-t.md'), 'utf8')
  const qlLine = qlFile.split('\n').find(l => l.includes('## ql-2026'))
  assertTrue((qlLine || '').includes('修复表格列宽'), `QUICKLOG 条目标题同源语义化（实际：${qlLine || '无'}）`)
}

console.log('\n=== ① 关联变更遗留放行（坑 linked-change-leftover-false-block）===\n')
{
  const d = mkRepo('lov')
  run(`node "${binCLI}" --dir "${d}" init`)
  const cn = '2026-08-22-linked-b'
  const cd = join(d, '.sillyspec', 'changes', cn)
  fs.mkdirSync(cd, { recursive: true })
  fs.writeFileSync(join(cd, 'proposal.md'), '---\nauthor: t\ncreated_at: 2026-08-22 00:00:00\n---\n# 提案书（Proposal）— 关联\n')
  execSync('git add .sillyspec/changes && git commit -qm linked', { cwd: d, stdio: 'pipe' }) // 已跟踪才走 leftover（untracked 折叠被 baseline 前缀放行）
  // 启动 quick（baseline 快照时关联目录干净）
  const start = run(`node "${binCLI}" --dir "${d}" run quick --linked-changes ${cn} "关联工作"`)
  const sidM = start.out.match(/sessionId:\s*(quick-[0-9a-f]{8})/)
  const sid = sidM ? sidM[1] : null
  assertTrue(!!sid, 'quick 会话启动')
  // 启动后立即写他者遗留（step1 --done 的审计首次可见——其轻量归档会移走关联目录）
  fs.writeFileSync(join(cd, 'design.md'), '---\nauthor: other\ncreated_at: 2026-08-22 00:00:01\n---\n# 设计文档（Design）— 他者遗留\n')
  fs.mkdirSync(join(cd, 'tasks'), { recursive: true })
  fs.writeFileSync(join(cd, 'tasks', 'task-99.md'), '# 他者遗留\n')
  const r1 = run(`node "${binCLI}" --dir "${d}" run quick --done --change ${sid} --output "step1"`)
  const r2 = run(`node "${binCLI}" --dir "${d}" run quick --done --change ${sid} --output "step2"`)
  const r3 = run(`node "${binCLI}" --dir "${d}" run quick --done --change ${sid} --output "需求：x 根因：y 方案：z 结果：w"`)
  assertTrue(r1.status === 0 && r2.status === 0 && r3.status === 0, `遗留不再 blocked（s1=${r1.status} s2=${r2.status} 末=${r3.status}）`)
  const combined = r1.out + r2.out + r3.out
  assertTrue(combined.includes('遗留脏文件') && combined.includes('已放行不计入本会话'),
    `放行提示可见（step2 审计段：${(combined.match(/变更边界审计[\s\S]{0,260}/) || [''])[0].replace(/\n/g, ' ')}`)
  assertTrue(combined.includes('design.md'), '遗留文件点名')
  // 非关联的 .sillyspec/ 脏文件仍 blocked（保护面不变）——用新的独立场景验证
  const d2 = mkRepo('prot2')
  run(`node "${binCLI}" --dir "${d2}" init`)
  const scanDir = join(d2, '.sillyspec', 'docs', 'p', 'scan')
  fs.mkdirSync(scanDir, { recursive: true })
  fs.writeFileSync(join(scanDir, 'ARCHITECTURE.md'), '# v1\n')
  execSync('git add .sillyspec/docs && git commit -qm docs', { cwd: d2, stdio: 'pipe' })
  const s2 = run(`node "${binCLI}" --dir "${d2}" run quick "x"`)
  const sid2 = (s2.out.match(/sessionId:\s*(quick-[0-9a-f]{8})/) || [])[1]
  fs.writeFileSync(join(scanDir, 'ARCHITECTURE.md'), '# v2\n')
  run(`node "${binCLI}" --dir "${d2}" run quick --done --change ${sid2} --output "s1"`)
  run(`node "${binCLI}" --dir "${d2}" run quick --done --change ${sid2} --output "s2"`)
  const rp = run(`node "${binCLI}" --dir "${d2}" run quick --done --change ${sid2} --output "需求：a 根因：b 方案：c 结果：d"`)
  assertTrue(rp.status !== 0 && rp.out.includes('危险文件变更'), '非关联 .sillyspec/ 脏文件仍 blocked（保护面零回归）')
}

cleanupAll()
console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
if (failures.length) { console.log('失败项:'); failures.forEach(f => console.log('  - ' + f)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
