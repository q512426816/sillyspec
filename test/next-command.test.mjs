/**
 * sillyspec next 测试（2026-08-21 agent-手工产出审计第二批 G7/G8）
 *
 * 验证 detectNextStep 状态机（吸收 continue/resume 两个 skill 的手工探测表）：
 * HANDOFF → 活跃变更逐产物推断（proposal/design/tasks/plan/execute/verify/archive）
 * → 已扫描无变更 → 绿地需求 → 未初始化；含 task 勾选进度。CLI 集成输出「状态+下一步+依据」。
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import { detectNextStep } from '../src/run/next.js'

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

console.log('--- 1. 未初始化 ---')
{
  const dir = makeTmpDir('next-')
  const r = detectNextStep({ cwd: dir })
  assert(r.state.includes('未初始化'), '空目录 → 未初始化')
  assert(r.next.includes('init') && r.next.includes('scan'), '建议 init 或 scan')
}

console.log('--- 2. HANDOFF 交接 ---')
{
  const dir = makeTmpDir('next-')
  writeFileSync(join(dir, 'HANDOFF.json'), '{}')
  const r = detectNextStep({ cwd: dir })
  assert(r.state.includes('HANDOFF'), 'HANDOFF.json → 交接状态')
  assert(r.next.includes('HANDOFF.json'), '下一步指向读 HANDOFF')
}

console.log('--- 3. 活跃变更产物链推断 ---')
{
  const dir = makeTmpDir('next-')
  const changeDir = join(dir, '.sillyspec', 'changes', '2026-08-21-demo')
  mkdirSync(changeDir, { recursive: true })
  let r = detectNextStep({ cwd: dir })
  assert(r.state.includes('变更目录为空') && r.next.includes('brainstorm'), '空变更目录 → brainstorm 完善 proposal')

  writeFileSync(join(changeDir, 'proposal.md'), '# p')
  r = detectNextStep({ cwd: dir })
  assert(r.state.includes('缺 design') && r.next.includes('brainstorm'), '有 proposal 缺 design → brainstorm')

  writeFileSync(join(changeDir, 'design.md'), '# d')
  r = detectNextStep({ cwd: dir })
  assert(r.state.includes('缺 tasks.md') && r.next.includes('brainstorm'), '有 design 缺 tasks → brainstorm 末步')

  writeFileSync(join(changeDir, 'tasks.md'), '- [ ] task-01: 甲\n- [ ] task-02: 乙\n')
  r = detectNextStep({ cwd: dir })
  assert(r.state.includes('缺 plan') && r.next.includes('plan'), '有 tasks 缺 plan → plan')

  writeFileSync(join(changeDir, 'plan.md'), '# plan\n## Wave 1\n- [ ] task-01: 甲\n')
  r = detectNextStep({ cwd: dir })
  assert(r.state.includes('执行中') && r.next.includes('execute'), 'task 未全勾 → execute')
  assert(r.activeChanges.length === 1 && r.activeChanges[0].checked === 0 && r.activeChanges[0].total === 2, 'task 进度 0/2')

  writeFileSync(join(changeDir, 'tasks.md'), '- [x] task-01: 甲\n- [x] task-02: 乙\n')
  r = detectNextStep({ cwd: dir })
  assert(r.state.includes('待验证') && r.next.includes('verify'), '全勾无 verify-result → verify')

  writeFileSync(join(changeDir, 'verify-result.md'), '# v\n结论：PASS\n')
  r = detectNextStep({ cwd: dir })
  assert(r.state.includes('待归档') && r.next.includes('archive'), '有 verify-result → archive')
}

console.log('--- 4. 已扫描无变更 / 绿地需求 ---')
{
  const dir = makeTmpDir('next-')
  mkdirSync(join(dir, '.sillyspec', 'docs', 'app', 'scan'), { recursive: true })
  let r = detectNextStep({ cwd: dir })
  assert(r.state.includes('已扫描') && r.next.includes('brainstorm'), '有 scan 文档无变更 → brainstorm')

  const dir2 = makeTmpDir('next-')
  mkdirSync(join(dir2, '.sillyspec'), { recursive: true })
  writeFileSync(join(dir2, '.sillyspec', 'REQUIREMENTS.md'), '# 需求')
  r = detectNextStep({ cwd: dir2 })
  assert(r.state.includes('REQUIREMENTS') && r.next.includes('brainstorm'), '绿地有需求 → brainstorm')
}

console.log('--- 5. CLI 集成 ---')
{
  const dir = makeTmpDir('next-')
  const changeDir = join(dir, '.sillyspec', 'changes', 'c-demo')
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(changeDir, 'proposal.md'), '# p')
  writeFileSync(join(changeDir, 'design.md'), '# d')
  writeFileSync(join(changeDir, 'tasks.md'), '- [ ] task-01: 甲\n')

  const res = spawnSync(process.execPath, [cliBin, 'next'], {
    cwd: dir, encoding: 'utf8', timeout: 60_000, stdio: ['pipe', 'pipe', 'pipe'],
  })
  const out = (res.stdout || '') + (res.stderr || '')
  assert(res.status === 0, `exit 0（实际 ${res.status}）`)
  assert(out.includes('状态探测') && out.includes('下一步'), '输出含状态与下一步')
  assert(out.includes('plan --change'), '缺 plan.md 时建议 plan（产物链推断在 CLI 生效）')

  const resJ = spawnSync(process.execPath, [cliBin, 'next', '--json'], {
    cwd: dir, encoding: 'utf8', timeout: 60_000, stdio: ['pipe', 'pipe', 'pipe'],
  })
  let parsed = null
  try { parsed = JSON.parse(resJ.stdout || '') } catch {}
  assert(parsed !== null && parsed.state && parsed.next, '--json 输出可解析且含 state/next')
}

for (const t of tmpRoots) { try { rmSync(t, { recursive: true, force: true }) } catch {} }
console.log(`\n合计: ${passed} 通过, ${failed} 失败`)
process.exit(failed > 0 ? 1 : 0)
