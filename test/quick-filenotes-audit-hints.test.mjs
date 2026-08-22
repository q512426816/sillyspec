/**
 * 两坑回归（2026-08-22）：
 *   ① quick 非末步 --done 带 --file-notes 被静默忽略 → 前置 warn（CLI 短进程注入即丢）
 *   ② 危险文件拦截时追加 --files 不解锁 → BLOCKED 输出明示「两套开关，需 --force-baseline」
 */
import fs from 'fs'
import path from 'path'
import os from 'os'
import { execSync } from 'child_process'
import { fileURLToPath } from 'node:url'

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
  const d = join(os.tmpdir(), `qfh-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`)
  tmpDirs.push(d)
  fs.mkdirSync(d, { recursive: true })
  execSync('git init -q -b main', { cwd: d, stdio: 'pipe' })
  execSync('git config user.email t@t && git config user.name t', { cwd: d, stdio: 'pipe' })
  fs.writeFileSync(join(d, 'base.txt'), 'base\n')
  execSync('git add -A && git commit -qm base', { cwd: d, stdio: 'pipe' })
  return d
}
const cleanupAll = () => { for (const d of tmpDirs) { try { fs.rmSync(d, { recursive: true, force: true }) } catch {} } }

console.log('=== ① --file-notes 非末步前置 warn（坑 quick-file-notes-nonfinal-ignored）===\n')
{
  const d = mkRepo('fn')
  run(`node "${binCLI}" --dir "${d}" init`)
  // 开 quick 会话（step1 起步）
  const start = run(`node "${binCLI}" --dir "${d}" run quick --input "修一个纯代码小问题"`)
  const sidM = start.out.match(/sessionId:\s*(quick-[0-9a-f]{8})/)
  assertTrue(sidM, 'quick 会话已启动（拿到 sessionId）')
  const sid = sidM[1]
  // step1 --done 带 --file-notes（非末步：三步中还有 2 个 pending）→ 应 warn
  const r1 = run(`node "${binCLI}" --dir "${d}" run quick --done --change ${sid} --file-notes "src/a.js::测试" --output "step1 完成"`)
  assertTrue(r1.status === 0, 'step1 --done 照常完成（warn 不阻断）')
  assertTrue(r1.out.includes('--file-notes 本次不会生效'), `非末步 --done 带 --file-notes → 前置 warn（尾 200：${r1.out.slice(-200).replace(/\n/g, ' ')}）`)
  assertTrue(r1.out.includes('末步 --done'), 'warn 指引在末步再传')
  // 推进到末步后 --done 带 --file-notes → 不 warn（消费点）
  run(`node "${binCLI}" --dir "${d}" run quick --done --change ${sid} --output "step2 完成"`)
  const r3 = run(`node "${binCLI}" --dir "${d}" run quick --done --change ${sid} --file-notes "src/a.js::真括注" --output "需求：x 根因：y 方案：z 结果：w"`)
  assertTrue(!r3.out.includes('--file-notes 本次不会生效'), '末步 --done 带 --file-notes 不再 warn（消费点）')
}

console.log('\n=== ② 危险文件拦截 + --files 追加不解锁 → 两套开关明示（坑 files-flag-not-unlock-protected）===\n')
{
  const d = mkRepo('prot')
  run(`node "${binCLI}" --dir "${d}" init`)
  // 触碰危险模式文件（.sillyspec/ 下非 quick 元数据豁免的文档——如 scan 文档；模块卡
  // modules/*.md 在 isQuickMetadata 有豁免不触发，scan/ARCHITECTURE.md 无豁免必拦）。
  // 必须先 git 提交再改：untracked 目录被 porcelain 折叠遮蔽；已跟踪被修改才以具体路径进 status。
  const docDir = join(d, '.sillyspec', 'docs', 'proj', 'scan')
  fs.mkdirSync(docDir, { recursive: true })
  fs.writeFileSync(join(docDir, 'ARCHITECTURE.md'), '# 架构 v1\n')
  execSync('git add .sillyspec/docs && git commit -qm docs', { cwd: d, stdio: 'pipe' })
  const start = run(`node "${binCLI}" --dir "${d}" run quick --input "改模块文档"`)
  const sidM = start.out.match(/sessionId:\s*(quick-[0-9a-f]{8})/)
  const sid = sidM ? sidM[1] : null
  assertTrue(!!sid, 'quick 会话已启动')
  // step1 --done 后（会话期间）改模块文档——启动后改动不进 baseline，属「本轮新增」触发危险门
  run(`node "${binCLI}" --dir "${d}" run quick --done --change ${sid} --output "step1 完成"`)
  fs.writeFileSync(join(docDir, 'auth.md'), '# 模块卡 v2（本次 quick 改动）\n')
  run(`node "${binCLI}" --dir "${d}" run quick --done --change ${sid} --output "step2 完成"`)
  const r3 = run(`node "${binCLI}" --dir "${d}" run quick --done --change ${sid} --output "需求：a 根因：b 方案：c 结果：d"`)
  assertTrue(r3.status !== 0, `危险文件（.sillyspec/ 模块文档）拦截 BLOCKED（status=${r3.status}）`)
  assertTrue(r3.out.includes('危险文件变更'), 'reason 点名危险文件变更')
  assertTrue(r3.out.includes('--files 边界不会解锁'), 'BLOCKED 输出明示「--files 不解锁受保护文件」（两套开关）')
  assertTrue(r3.out.includes('--force-baseline'), '指明唯一放行开关 --force-baseline')
}

cleanupAll()
console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
if (failures.length) { console.log('失败项:'); failures.forEach(f => console.log('  - ' + f)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
