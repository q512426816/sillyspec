/**
 * 第四批测试：quick --cancel / workspace / scan-fix-leak（2026-08-21 agent-手工产出审计）
 *
 * 覆盖：
 * 1. cancelQuickSession：QUICKLOG 进行中→已取消（CRLF 容忍）、已完成拒绝、tasks.md 未勾行
 *    移除/已勾拒绝、会话目录+marker 清理
 * 2. workspace：add 外科写入（已有字段保留 + 手写字段不丢）、remove、status 三态探测
 * 3. fixSourceRootLeak：docs/manifest 搬到 specRoot、已存在不覆盖、空目录清理
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { tmpdir } from 'os'
import { spawnSync } from 'child_process'
import { fileURLToPath } from 'url'

import { cancelQuickSession } from '../src/quicklog.js'
import { workspaceAdd, workspaceRemove, workspaceStatus } from '../src/workspace.js'
import { fixSourceRootLeak } from '../src/scan-postcheck.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const cliBin = join(__dirname, '..', 'bin', 'sillyspec.js')

let passed = 0
let failed = 0
const tmpRoots = []

function assert(cond, msg) {
  if (cond) { console.log(`  ✅ PASS: ${msg}`); passed++ }
  else { console.log(`  ❌ FAIL: ${msg}`); failed++ }
}

function makeTmpDir(prefix) {
  const dir = mkdtempSync(join(tmpdir(), prefix))
  tmpRoots.push(dir)
  return dir
}

function runCLI(args, cwd) {
  const res = spawnSync(process.execPath, [cliBin, ...args], {
    cwd, encoding: 'utf8', timeout: 60_000, stdio: ['pipe', 'pipe', 'pipe'],
  })
  return { status: res.status, out: (res.stdout || '') + (res.stderr || '') }
}

console.log('--- 1. cancelQuickSession ---')
{
  const proj = makeTmpDir('qc-')
  const specBase = join(proj, '.sillyspec')
  mkdirSync(join(specBase, 'quicklog'), { recursive: true })
  writeFileSync(join(specBase, 'quicklog', 'QUICKLOG-t.md'), [
    '## ql-20260821-001-aaaa | 2026-08-21 10:00:00 | 骨架任务',
    '状态：进行中',
    '',
    '## ql-20260821-002-bbbb | 2026-08-21 11:00:00 | 已完成的真任务',
    '状态：已完成',
    '结果：需求：x 根因：y 方案：z 结果：w',
    '',
  ].join('\n'))
  // 关联变更 tasks.md：001 未勾（应移除）、002 已勾（取消时拒绝）
  mkdirSync(join(specBase, 'changes', 'c1'), { recursive: true })
  writeFileSync(join(specBase, 'changes', 'c1', 'tasks.md'),
    '- [x] task-01: 甲\n- [ ] ql-20260821-001-aaaa 骨架任务\n')
  // 会话目录 + marker
  mkdirSync(join(specBase, '.runtime', 'quick-sessions', 'quick-abcd1234'), { recursive: true })
  writeFileSync(join(specBase, '.runtime', 'quick-sessions', 'quick-abcd1234', 'guard.json'), '{"qlId":"ql-20260821-001-aaaa"}')
  writeFileSync(join(specBase, '.runtime', 'current-quick-run-id'), 'quick-abcd1234\n')

  const r = await cancelQuickSession({ specBase, gitUser: 't', qlId: 'ql-20260821-001-aaaa', sessionId: 'quick-abcd1234' })
  assert(r.ok === true, `取消成功（${r.reason || ''}）`)
  const log = readFileSync(join(specBase, 'quicklog', 'QUICKLOG-t.md'), 'utf8')
  assert(/## ql-20260821-001-aaaa[\s\S]*?状态：已取消/.test(log), 'QUICKLOG 条目翻已取消（保留痕迹）')
  assert(!/ql-20260821-001-aaaa 骨架任务\n?$/m.test(readFileSync(join(specBase, 'changes', 'c1', 'tasks.md'), 'utf8')), 'tasks.md 未勾挂载行已移除')
  assert(readFileSync(join(specBase, 'changes', 'c1', 'tasks.md'), 'utf8').includes('[x] task-01'), '其它 task 行不受影响')
  assert(!existsSync(join(specBase, '.runtime', 'quick-sessions', 'quick-abcd1234')), '会话 guard 目录已清理')
  assert(!existsSync(join(specBase, '.runtime', 'current-quick-run-id')), '指向本会话的 current marker 已清理')

  const rDone = await cancelQuickSession({ specBase, gitUser: 't', qlId: 'ql-20260821-002-bbbb' }).catch(e => ({ ok: false, reason: e.message }))
  assert(rDone.ok === false && String(rDone.reason).includes('已完成'), '已完成条目拒绝取消（fail-closed）')
}

console.log('--- 2. workspace add/remove/status ---')
{
  const proj = makeTmpDir('ws-')
  const specBase = join(proj, '.sillyspec')
  mkdirSync(join(proj, 'frontend'), { recursive: true })
  mkdirSync(join(proj, 'backend'), { recursive: true })
  mkdirSync(join(proj, 'backend', '.sillyspec', 'docs', 'backend', 'scan'), { recursive: true })
  writeFileSync(join(proj, 'backend', '.sillyspec', 'docs', 'backend', 'scan', 'PROJECT.md'), '# p\n')

  const a1 = workspaceAdd({ cwd: proj, name: 'frontend', path: './frontend', role: '前端 - Vue3', repo: 'https://git/x/frontend' })
  assert(a1.created === true, 'add frontend 建档')
  let y = readFileSync(join(specBase, 'projects', 'frontend.yaml'), 'utf8')
  assert(y.includes('name: frontend') && y.includes("path: ./frontend") && y.includes('status: active') && y.includes('role: 前端 - Vue3'), 'yaml 五字段齐全')

  // 幂等重跑：已有值保留 + 手写字段不丢
  writeFileSync(join(specBase, 'projects', 'frontend.yaml'), y + 'custom_note: 手写备注\n')
  workspaceAdd({ cwd: proj, name: 'frontend', path: './frontend' })
  y = readFileSync(join(specBase, 'projects', 'frontend.yaml'), 'utf8')
  assert(y.includes('role: 前端 - Vue3') && y.includes('custom_note: 手写备注'), '重跑保留 role 与手写字段')

  try { workspaceAdd({ cwd: proj, name: 'ghost', path: './nope' }); assert(false, '应抛') } catch (e) { assert(String(e.message).includes('不存在'), '路径不存在拒绝') }

  workspaceAdd({ cwd: proj, name: 'backend', path: './backend', role: '后端' })
  const st = workspaceStatus({ cwd: proj })
  const fe = st.projects.find(p => p.name === 'frontend')
  const be = st.projects.find(p => p.name === 'backend')
  assert(fe && fe.state === 'unregistered', 'frontend 未初始化（无 .sillyspec）')
  assert(be && be.state === 'scanned' && be.detail.includes('1 份'), 'backend 已扫描（1 份文档）')

  workspaceRemove({ cwd: proj, name: 'frontend' })
  assert(!existsSync(join(specBase, 'projects', 'frontend.yaml')), 'remove 删登记')
  try { workspaceRemove({ cwd: proj, name: 'frontend' }); assert(false, '应抛') } catch { assert(true, '重复 remove 报错') }

  // CLI 集成
  const rCli = runCLI(['workspace', 'status'], proj)
  assert(rCli.status === 0 && rCli.out.includes('backend'), `CLI workspace status（${rCli.out.slice(0, 80)}）`)
  const rAdd = runCLI(['workspace', 'add', 'frontend', './frontend', '--role', '前端'], proj)
  assert(rAdd.status === 0 && rAdd.out.includes('已登记'), 'CLI workspace add')
}

console.log('--- 3. fixSourceRootLeak ---')
{
  const source = makeTmpDir('leak-')
  const specRoot = makeTmpDir('leakspec-')
  mkdirSync(join(source, '.sillyspec', 'docs', 'app', 'scan'), { recursive: true })
  writeFileSync(join(source, '.sillyspec', 'docs', 'app', 'scan', 'PROJECT.md'), '# p\n')
  writeFileSync(join(source, '.sillyspec', 'manifest.json'), '{}\n')
  mkdirSync(join(specRoot, 'docs'), { recursive: true })
  writeFileSync(join(specRoot, 'manifest.json'), '{"existing": true}\n')

  const r = fixSourceRootLeak({ cwd: source, specDir: specRoot })
  assert(r.moved.some(m => m.includes('docs/app')), `产物搬到 specRoot（目录级整搬：${r.moved.join(';')}）`)
  assert(r.skipped.some(s => s.includes('manifest.json')), 'specRoot 已有 manifest 不覆盖（报告 skipped）')
  assert(!existsSync(join(source, '.sillyspec', 'manifest.json')) === false, '冲突文件保留在源（人工比对）')
  assert(readFileSync(join(specRoot, 'docs', 'app', 'scan', 'PROJECT.md'), 'utf8') === '# p\n', '搬移后内容一致')
  assert(r.removedDirs.some(d => d.includes('docs')), '搬空的源目录已清理')

  // 幂等：manifest 冲突保留在源会持续报告 skipped（人工比对项），docs 已搬走不再动
  const r2 = fixSourceRootLeak({ cwd: source, specDir: specRoot })
  assert(r2.moved.length === 0, `二跑零搬移（冲突 manifest 的 skipped 是预期人工项：${r2.skipped.join(';')}）`)
}

for (const t of tmpRoots) { try { rmSync(t, { recursive: true, force: true }) } catch {} }
console.log(`\n合计: ${passed} 通过, ${failed} 失败`)
process.exit(failed > 0 ? 1 : 0)
