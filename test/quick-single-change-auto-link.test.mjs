/**
 * quick 单活跃变更自动关联信号门控 + 自动关联不触发归档（止血）回归测试
 * 坑 quick-single-change-auto-link（2026-09-14 实证：唯一活跃变更恰为他者会话遗留的
 * 空骨架，quick 启动被无条件挂载——tasks.md 污染 + --done 僵尸清理通道可误归档他者变更）
 *
 * 修复契约：
 *   1. 单候选也跑 quick-recommend 双信号打分（脏文件×design 清单 / 任务描述×proposal）：
 *      score>0 → 自动关联 + 大声提示 + autoLinked 溯源；score=0 → 不关联 + 提示
 *   2. 单候选是 quick-<hex8> 会话行 → 不关联（原单候选分支绕过 recommend 的会话过滤）
 *   3. resolver 返回 { changes, autoLinked }；guard 落 linkedChangesAuto 溯源
 *   4. 止血：closeQuickLinkedChanges 对仅被自动关联的变更 skip 归档（机器猜测非协作
 *      声明，不触发破坏性归档）；显式关联的僵尸清理通道（D-002@v1/v2 契约）不变
 *
 * 单元（§1-2）：mkdtemp specDir + mock pm；e2e（§3）：临时 git 仓库 + runCommand 全链路。
 */
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'

import { resolveQuickLinkedChanges } from '../src/run/quick-audit.js'
import { closeQuickLinkedChanges } from '../src/run/complete-handlers.js'
import { runCommand } from '../src/run.js'
import { ProgressManager } from '../src/progress.js'

function makeTmp(prefix) { return mkdtempSync(join(tmpdir(), prefix)) }
function git(d, a) { return execFileSync('git', a, { cwd: d, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim() }
async function hush(fn) { const o = console.log; console.log = () => {}; const oe = console.error; console.error = () => {}; const ow = console.warn; console.warn = () => {}; try { await fn() } finally { console.log = o; console.error = oe; console.warn = ow } }
function extractSid(s) { const m = s.match(/sessionId:\s*(quick-[0-9a-f]{8})/); return m ? m[1] : null }
const STRUCTURED = '需求：自动关联门控测试\n根因：无，测试用例\n方案：单候选信号打分 + 止血\n结果：测试全绿'

const tmpRoots = []
function tmp(p) { const d = makeTmp(p); tmpRoots.push(d); return d }

// ─────────────────────────────────────────
// §1 单元：resolver 单候选信号门控
// ─────────────────────────────────────────
test('§1 单候选：proposal 命中任务描述 → 自动关联 + autoLinked 溯源', async () => {
  const specDir = tmp('qsal-hit-')
  const name = '2026-09-14-fix-login-race'
  mkdirSync(join(specDir, 'changes', name), { recursive: true })
  writeFileSync(join(specDir, 'changes', name, 'proposal.md'), '# 提案\n\n修复登录校验的竞态窗口，登录并发场景下状态错乱。\n')
  let out = ''
  const o = console.log; console.log = (...a) => { out += a.join(' ') + '\n' }
  try {
    const r = await resolveQuickLinkedChanges({
      pm: { listChanges: () => [name] },
      cwd: specDir, // 非 git 目录 → safeGit 失败 → baselineFiles []，只留描述信号
      specDir, quickFiles: [], taskDescription: '修复登录竞态问题', nonInteractive: true,
    })
    assert.deepEqual(r.changes, [name], `命中信号自动关联（实际 ${JSON.stringify(r.changes)}）`)
    assert.deepEqual(r.autoLinked, [name], 'autoLinked 溯源标记')
  } finally { console.log = o }
  assert(out.includes('命中关联信号'), `自动关联大声提示（实际: ${out.slice(0, 80)}）`)
})

test('§1 单候选：无信号 → 不关联 + 提示', async () => {
  const specDir = tmp('qsal-miss-')
  const name = '2026-09-14-unrelated-skeleton'
  mkdirSync(join(specDir, 'changes', name), { recursive: true })
  writeFileSync(join(specDir, 'changes', name, 'proposal.md'), '# 提案\n\n做一件完全无关的事：看板拖拽排序。\n')
  let out = ''
  const o = console.log; console.log = (...a) => { out += a.join(' ') + '\n' }
  try {
    const r = await resolveQuickLinkedChanges({
      pm: { listChanges: () => [name] },
      cwd: specDir, specDir, quickFiles: [], taskDescription: '修复登录竞态问题', nonInteractive: true,
    })
    assert.deepEqual(r.changes, [], `未命中信号不关联（实际 ${JSON.stringify(r.changes)}）`)
    assert.deepEqual(r.autoLinked, [], 'autoLinked 空')
  } finally { console.log = o }
  assert(out.includes('未命中关联信号'), `不关联提示（实际: ${out.slice(0, 80)}）`)
})

test('§1 单候选是 quick 会话行 → 不关联（防会话互挂）', async () => {
  const specDir = tmp('qsal-sid-')
  const r = await resolveQuickLinkedChanges({
    pm: { listChanges: () => ['quick-abcdef12'] },
    cwd: specDir, specDir, quickFiles: [], taskDescription: '任何任务', nonInteractive: true,
  })
  assert.deepEqual(r.changes, [], 'quick-<hex8> 会话行不被自动关联（原单候选分支绕过 recommend 会话过滤）')
  assert.deepEqual(r.autoLinked, [], 'autoLinked 空')
})

test('§1 零活跃 / ≥2 非交互 → 不关联（原行为保持）', async () => {
  const specDir = tmp('qsal-multi-')
  const zero = await resolveQuickLinkedChanges({
    pm: { listChanges: () => [] }, cwd: specDir, specDir, quickFiles: [], taskDescription: 'x', nonInteractive: true,
  })
  assert.deepEqual(zero.changes, [], '零活跃不关联')
  const multi = await resolveQuickLinkedChanges({
    pm: { listChanges: () => ['2026-09-14-a', '2026-09-14-b'] },
    cwd: specDir, specDir, quickFiles: [], taskDescription: 'x', nonInteractive: true,
  })
  assert.deepEqual(multi.changes, [], '≥2 非交互不关联（原行为）')
  assert.deepEqual(multi.autoLinked, [], 'autoLinked 空')
})

// ─────────────────────────────────────────
// §2 单元：closeQuickLinkedChanges 止血
// ─────────────────────────────────────────

function makePm(stageByChange = null) {
  const calls = []
  return {
    unregisterChange: (cwd, changeName) => { calls.push({ cwd, changeName }) },
    getChangeStage: stageByChange === null
      ? () => null
      : (cwd, changeName) => {
          const s = stageByChange[changeName]
          return s ? { current_stage: s.current_stage ?? null, status: s.status ?? null, stage_status: s.stage_status ?? null } : null
        },
    _calls: calls,
  }
}
function makeChange(specBase, changeName, tasksContent) {
  const changeDir = join(specBase, 'changes', changeName)
  mkdirSync(changeDir, { recursive: true })
  if (tasksContent !== undefined) writeFileSync(join(changeDir, 'tasks.md'), tasksContent)
  return changeDir
}

test('§2 止血：自动关联变更不触发归档（僵尸形态也 skip）', async () => {
  const specBase = tmp('qsal-stop-')
  const name = '2026-09-14-auto-linked-zombie'
  makeChange(specBase, name, '- [x] ql-20260914-001-aaaa 修复竞态\n') // 全勾僵尸形态（原通道必归档）
  const pm = makePm({ [name]: { current_stage: 'scan', status: 'active', stage_status: null } })
  const r = await closeQuickLinkedChanges({ pm, cwd: specBase, specBase, linkedChanges: [name], linkedChangesAuto: [name] })
  assert.deepEqual(r.closed, [], '自动关联不归档')
  assert(r.skipped.some(s => s.name === name && s.reason.includes('自动关联')), `skip 原因含自动关联（实际 ${JSON.stringify(r.skipped)}）`)
  assert(existsSync(join(specBase, 'changes', name)), '变更目录保持原位')
  assert(pm._calls.length === 0, 'unregisterChange 未被调用')
})

test('§2 对照：显式关联 + 僵尸形态 → 归档照常（D-002 契约不破坏）', async () => {
  const specBase = tmp('qsal-keep-')
  const name = '2026-09-14-explicit-zombie'
  makeChange(specBase, name, '- [x] ql-20260914-001-bbbb 修复竞态\n')
  const pm = makePm({ [name]: { current_stage: 'scan', status: 'active', stage_status: null } })
  const r = await closeQuickLinkedChanges({ pm, cwd: specBase, specBase, linkedChanges: [name] })
  assert.deepEqual(r.closed, [name], '显式关联僵尸照常清理')
  assert(!existsSync(join(specBase, 'changes', name)), '目录已归档移走')
})

// ─────────────────────────────────────────
// §3 e2e：全链路（runCommand）
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
async function seedChange(repo, name, proposalText) {
  const specBase = join(repo, '.sillyspec')
  mkdirSync(join(specBase, 'changes', name), { recursive: true })
  writeFileSync(join(specBase, 'changes', name, 'proposal.md'), `# 提案\n\n${proposalText}\n`)
  const pm = new ProgressManager({ specDir: specBase })
  await pm.registerChange(repo, name)
  return pm
}
async function driveQuickToDone(repo, startArgs) {
  let out = ''
  { const o = console.log; console.log = (...a) => { out += a.join(' ') + '\n' }; const oe = console.error; console.error = () => {}; const ow = console.warn; console.warn = (...a) => { out += a.join(' ') + '\n' }
    try { await runCommand(startArgs, repo) } finally { console.log = o; console.error = oe; console.warn = ow } }
  const sid = extractSid(out)
  let doneOut = ''
  { const o = console.log; console.log = (...a) => { doneOut += a.join(' ') + '\n' }; const oe = console.error; console.error = () => {}; const ow = console.warn; console.warn = (...a) => { doneOut += a.join(' ') + '\n' }
    try {
      await runCommand(['quick', '--done', '--change', sid, '--output', 's1', '--confirm'], repo)
      await runCommand(['quick', '--done', '--change', sid, '--output', 's2', '--confirm'], repo)
      await runCommand(['quick', '--done', '--change', sid, '--output', STRUCTURED, '--confirm'], repo)
    } finally { console.log = o; console.error = oe; console.warn = ow } }
  return { sid, out, doneOut }
}

test('§3 e2e：信号命中自动关联 + guard 溯源 + --done 不误归档他者变更', async () => {
  const repo = initRepo('qsal-e2e-auto-')
  const name = '2026-09-14-fix-login-race'
  await seedChange(repo, name, '修复登录校验的竞态窗口，登录并发场景下状态错乱。')
  const { sid, out, doneOut } = await driveQuickToDone(repo, ['quick', '修复登录竞态问题', '--non-interactive'])
  assert(sid !== null, `quick 会话完成（${sid}）`)
  assert(out.includes('命中关联信号') && out.includes(name), `启动输出含自动关联提示（${out.includes(name) ? '含变更名' : '缺变更名'}）`)

  // 自动关联发生（tasks.md 有 ql 挂载行且已勾）但变更不被归档
  const specBase = join(repo, '.sillyspec')
  const tasks = readFileSync(join(specBase, 'changes', name, 'tasks.md'), 'utf8')
  assert(/- \[x\] ql-\S+/.test(tasks), `tasks.md ql 行已勾选（${tasks.trim().slice(0, 60)}）`)
  const pm = new ProgressManager({ specDir: specBase })
  const active = await pm.listChanges(repo)
  assert(active.includes(name), `自动关联的变更未被归档（仍 active：${JSON.stringify(active)}）`)
  assert(!existsSync(join(specBase, 'changes', 'archive', name)), '归档目录不存在')
  assert(doneOut.includes('自动关联'), `--done 输出含不归档原因（实际: ${doneOut.slice(0, 200)}）`)
})

test('§3 e2e 对照：显式 --linked-changes + 同僵尸形态 → 归档照常', async () => {
  const repo = initRepo('qsal-e2e-explicit-')
  const name = '2026-09-14-fix-login-race'
  await seedChange(repo, name, '修复登录校验的竞态窗口，登录并发场景下状态错乱。')
  const { sid } = await driveQuickToDone(repo, ['quick', '修复登录竞态问题', '--linked-changes', name, '--non-interactive'])
  assert(sid !== null, `quick 会话完成（${sid}）`)
  const specBase = join(repo, '.sillyspec')
  const pm = new ProgressManager({ specDir: specBase })
  const active = await pm.listChanges(repo)
  assert(!active.includes(name), `显式关联僵尸被归档（不再 active：${JSON.stringify(active)}）`)
  assert(existsSync(join(specBase, 'changes', 'archive', name)), '归档目录存在')
})

after(() => { for (const dir of tmpRoots) { try { rmSync(dir, { recursive: true, force: true }) } catch {} } })
