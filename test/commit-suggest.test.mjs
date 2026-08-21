/**
 * sillyspec commit（提交建议）测试（2026-08-21 agent-手工产出审计第二批 G1-G3）
 *
 * 验证 collectCommitContext：QUICKLOG 按上次 commit 时间过滤（已完成进语义、进行中标注）、
 * 活跃变更已勾 task（mtime 门）、阶段产出路径归类、conventional 建议 message 生成；
 * CLI 只建议不提交。fixture：git 仓 + 两次 commit 之间的 quicklog/勾选/tasks 产物。
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, utimesSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import { collectCommitContext } from '../src/commit-suggest.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const cliBin = join(__dirname, '..', 'bin', 'sillyspec.js')

let passed = 0
let failed = 0
const tmpRoots = []

function assert(cond, msg) {
  if (cond) { console.log(`  ✅ PASS: ${msg}`); passed++ }
  else { console.log(`  ❌ FAIL: ${msg}`); failed++ }
}

function git(dir, args) {
  return spawnSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).stdout.trim()
}

function makeFixture() {
  const proj = mkdtempSync(join(tmpdir(), 'cs-'))
  tmpRoots.push(proj)
  git(proj, ['init', '-q'])
  git(proj, ['config', 'user.email', 't@t.local'])
  git(proj, ['config', 'user.name', 't'])
  writeFileSync(join(proj, 'main.js'), 'console.log(1)\n')
  git(proj, ['add', '.'])
  git(proj, ['commit', '-q', '-m', 'init'])

  const specBase = join(proj, '.sillyspec')
  // QUICKLOG：两条新于上次 commit（1 完成 1 进行中）+ 一条旧于（不应收）
  const now = new Date()
  const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
  const future = new Date(now.getTime() + 3600_000)
  const old = new Date(now.getTime() - 72 * 3600_000)
  mkdirSync(join(specBase, 'quicklog'), { recursive: true })
  writeFileSync(join(specBase, 'quicklog', 'QUICKLOG-t.md'), [
    `## ql-20260821-001-aaaa | ${fmt(future)} | 手机号校验修复——正则误吞连字符`,
    '状态：已完成',
    '',
    `## ql-20260821-002-bbbb | ${fmt(future)} | 登录限流调整（进行中）`,
    '状态：进行中',
    '',
    `## ql-20260818-003-cccc | ${fmt(old)} | 上周已提交过的旧条目`,
    '状态：已完成',
    '',
  ].join('\n'))

  // 活跃变更 tasks.md（mtime 新）带已勾 task
  const changeDir = join(specBase, 'changes', '2026-08-21-demo')
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(changeDir, 'tasks.md'), '- [x] task-01: 实现校验\n- [ ] task-02: 未完成不收\n')

  // 未提交工作区改动：源码 + 阶段产出
  writeFileSync(join(proj, 'main.js'), 'console.log(2)\n')
  mkdirSync(join(specBase, 'docs', 'app', 'scan'), { recursive: true })
  writeFileSync(join(specBase, 'docs', 'app', 'scan', 'ARCHITECTURE.md'), '# arch')

  return { cwd: proj, specBase }
}

console.log('--- 1. 语义收集与过滤 ---')
{
  const fx = makeFixture()
  const cc = collectCommitContext({ cwd: fx.cwd })
  assert(cc.hasChanges === true && cc.changedCount >= 2, '工作区有未提交改动')
  assert(cc.quickEntries.length === 2, `时间过滤后收 2 条（实际 ${cc.quickEntries.length}）`)
  assert(cc.quickEntries.every(e => e.qlId !== 'ql-20260818-003-cccc'), '旧于上次 commit 的条目不收')
  assert(cc.quickEntries.some(e => e.qlId === 'ql-20260821-001-aaaa' && e.status === '已完成'), '完成条目带状态')
  assert(cc.checkedTasks.length === 1 && cc.checkedTasks[0].item.includes('task-01'), '已勾 task 收 1（未勾不收）')
  assert(cc.stageArtifacts.includes('scan'), '阶段产出归类 scan')

  console.log('--- 2. 建议 message（quick + task + 阶段混合 → feat 主体）---')
  assert(cc.suggestion !== null, '有建议')
  assert(cc.suggestion.subject.startsWith('feat:'), `混合来源 → feat（实际 ${cc.suggestion.subject}）`)
  assert(cc.suggestion.body.includes('ql-20260821-001-aaaa'), 'body 列 quick 条目')
  assert(!cc.suggestion.body.includes('进行中') || !cc.suggestion.body.includes('ql-20260821-002-bbbb'), '进行中条目不进建议')
  assert(cc.suggestion.body.includes('task-01'), 'body 列已勾 task')
}

console.log('--- 3. quick 单条 → fix 单行 ---')
{
  const proj = mkdtempSync(join(tmpdir(), 'cs2-'))
  tmpRoots.push(proj)
  git(proj, ['init', '-q'])
  git(proj, ['config', 'user.email', 't@t.local'])
  git(proj, ['config', 'user.name', 't'])
  writeFileSync(join(proj, 'a.js'), '1\n')
  git(proj, ['add', '.'])
  git(proj, ['commit', '-q', '-m', 'init'])
  const future = new Date(Date.now() + 3600_000)
  const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
  mkdirSync(join(proj, '.sillyspec', 'quicklog'), { recursive: true })
  writeFileSync(join(proj, '.sillyspec', 'quicklog', 'QUICKLOG-t.md'),
    `## ql-20260821-009-dddd | ${fmt(future)} | 修复分页越界\n状态：已完成\n`)
  writeFileSync(join(proj, 'a.js'), '2\n')
  const cc = collectCommitContext({ cwd: proj })
  assert(cc.suggestion.subject === 'fix: 修复分页越界', `quick 单条 → fix: 标题（实际 ${cc.suggestion.subject}）`)
  assert(cc.suggestion.body === '', '单条无 body')
}

console.log('--- 4. CLI：只建议不提交 ---')
{
  const fx = makeFixture()
  const res = spawnSync(process.execPath, [cliBin, 'commit'], {
    cwd: fx.cwd, encoding: 'utf8', timeout: 60_000, stdio: ['pipe', 'pipe', 'pipe'],
  })
  const out = (res.stdout || '') + (res.stderr || '')
  assert(res.status === 0, `exit 0（实际 ${res.status}）`)
  assert(out.includes('建议 commit message'), '输出建议 message')
  assert(out.includes('只建议不提交'), '明示不自动提交')
  assert(out.includes('git add -A && git commit'), '给出可照抄命令')
  const headAfter = git(fx.cwd, ['rev-parse', 'HEAD'])
  const logCount = git(fx.cwd, ['rev-list', '--count', 'HEAD'])
  assert(logCount === '1', '未产生新 commit（确认权在人）')
}

for (const t of tmpRoots) { try { rmSync(t, { recursive: true, force: true }) } catch {} }
console.log(`\n合计: ${passed} 通过, ${failed} 失败`)
process.exit(failed > 0 ? 1 : 0)
