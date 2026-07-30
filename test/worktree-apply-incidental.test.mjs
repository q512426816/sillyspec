/**
 * assessApplyRisk 顺带修复（incidental）豁免 + 一次报全 characterization 测试
 *
 * 锁住坑 worktree-execute-apply-friction 坑1/4 的修复契约：
 *   ① design §6 标「顺带修复」的预存债文件 → 豁免 allowed_paths 严格校验，降 warning 不 BLOCKED
 *      （治坑1：顺带修预存债被 task 边界卡死，只能 cherry-pick 绕过）
 *   ② 对照：未标记 → 仍 BLOCKED（豁免需 design 显式声明，防真越界文件被误放行）
 *   ③ 一次报全：Gate1（文件清单）+ Gate2（allowed_paths）同时违反 → reasons 都报，不逐道挤牙膏
 *      （治坑4：原 assessApplyRisk 提前 return + Gate1/3 短路，修一道才看到下一道）
 *
 * 真实 git + worktree fixture（参考 worktree-apply-classification.test.mjs）。
 * 不设 meta.baselineHash → 跳过 Gate3a（主区 dirty），隔离 incidental/Gate2 行为。
 */
import fs from 'fs'
import path from 'path'
import os from 'os'
import { execSync } from 'child_process'
import { assessApplyRisk } from '../src/worktree-apply.js'

let failed = 0
let total = 0
const failures = []
function assertTrue(cond, msg) {
  total++
  if (cond) console.log(`  ✅ PASS: ${msg}`)
  else { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
}
function sh(cmd, cwd) { execSync(cmd, { cwd, stdio: 'pipe' }) }

function setupRepo(changeName) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'wtinc-'))
  sh('git init', d)
  sh('git config user.email t@t.co && git config user.name t', d)
  fs.writeFileSync(path.join(d, 'feature.js'), 'base\n')
  sh('git add -A && git commit -m base', d)
  fs.writeFileSync(path.join(d, '.gitignore'), '.sillyspec/\n')
  sh('git add -A && git commit -m gitignore', d)
  // base 取 gitignore commit 之后——worktree 分支自此创建，base..HEAD diff 才不含 .gitignore 引入
  const base = execSync('git rev-parse HEAD', { cwd: d, encoding: 'utf8' }).trim()
  const wtDir = path.join(d, '.sillyspec', '.runtime', 'worktrees', changeName)
  fs.mkdirSync(wtDir, { recursive: true })
  sh(`git worktree add "${wtDir}" -b sillyspec/${changeName}`, d)
  process.chdir(d)
  return { d, base, wtDir }
}

function writeMeta(wtDir, changeName, base) {
  const meta = {
    name_zh: 'meta', changeName, branch: 'sillyspec/' + changeName,
    baseBranch: 'master', baseHash: base, baselineCommit: base,
    worktreePath: wtDir, mode: 'worktree', baselineFiles: [],
  }
  fs.writeFileSync(path.join(wtDir, 'meta.json'), JSON.stringify(meta))
}

function writeDesign(d, changeName, files) {
  const dir = path.join(d, '.sillyspec', 'changes', changeName)
  fs.mkdirSync(dir, { recursive: true })
  const lines = ['# Design\n', '## 文件变更清单\n', '| 操作 | 文件路径 | 说明 |', '| --- | --- | --- |']
  for (const f of files) lines.push(`| 修改 | ${f.path} | ${f.note || ''} |`)
  fs.writeFileSync(path.join(dir, 'design.md'), lines.join('\n') + '\n')
}

function writeTask(d, changeName, taskId, allowedPaths) {
  const dir = path.join(d, '.sillyspec', 'changes', changeName, 'tasks')
  fs.mkdirSync(dir, { recursive: true })
  const lines = ['---', `id: ${taskId}`]
  if (allowedPaths.length > 0) {
    lines.push('allowed_paths:')
    for (const p of allowedPaths) lines.push(`  - ${p}`)
  }
  lines.push('---', '', `# ${taskId}`, '', 'goal: ...')
  fs.writeFileSync(path.join(dir, taskId + '.md'), lines.join('\n') + '\n')
}

console.log('=== assessApplyRisk: 顺带修复 allowed_paths 豁免 + 一次报全（坑1/4）===\n')

console.log('--- ① design §6 标「顺带修复」→ 豁免 allowed_paths，降 warning 不 BLOCKED ---')
{
  const { d, base, wtDir } = setupRepo('inc1')
  fs.writeFileSync(path.join(wtDir, 'feature.js'), 'modified\n')
  fs.writeFileSync(path.join(wtDir, 'old-debt.test.js'), 'debt fix\n')
  sh('git add -A && git commit -m work', wtDir)
  writeMeta(wtDir, 'inc1', base)
  writeDesign(d, 'inc1', [
    { path: 'feature.js' },
    { path: 'old-debt.test.js', note: '顺带修复：预存测试债（CLAUDE.md 规则20）' },
  ])
  writeTask(d, 'inc1', 'task-01', ['feature.js'])

  const r = assessApplyRisk('inc1', { cwd: d })
  assertTrue(r.decision !== 'BLOCKED', `decision 非 BLOCKED（实际 ${r.decision}）—— 顺带修复文件不应卡死 apply`)
  assertTrue(!r.reasons.some(x => x.includes('allowed_paths')), `reasons 不含「超出 allowed_paths」（顺带修复豁免）`)
  assertTrue(
    r.warnings.some(x => x.includes('顺带修复') && x.includes('old-debt.test.js')),
    `warnings 含顺带修复豁免提示（实际 warnings: ${r.warnings.join(';') || '无'}）`,
  )

  process.chdir(os.tmpdir()); fs.rmSync(d, { recursive: true, force: true })
}

console.log('--- ② 对照：design 未标「顺带修复」→ 仍 BLOCKED（豁免需显式标记，防真越界）---')
{
  const { d, base, wtDir } = setupRepo('inc2')
  fs.writeFileSync(path.join(wtDir, 'feature.js'), 'modified\n')
  fs.writeFileSync(path.join(wtDir, 'old-debt.test.js'), 'debt fix\n')
  sh('git add -A && git commit -m work', wtDir)
  writeMeta(wtDir, 'inc2', base)
  writeDesign(d, 'inc2', [
    { path: 'feature.js' },
    { path: 'old-debt.test.js', note: '' },
  ])
  writeTask(d, 'inc2', 'task-01', ['feature.js'])

  const r = assessApplyRisk('inc2', { cwd: d })
  assertTrue(r.decision === 'BLOCKED', `decision=BLOCKED（实际 ${r.decision}）—— 未标记文件超 allowed_paths 必拦`)
  assertTrue(
    r.reasons.some(x => x.includes('allowed_paths') && x.includes('old-debt.test.js')),
    `reasons 含 old-debt.test.js 超出 allowed_paths（实际 reasons: ${r.reasons.join(' | ') || '无'}）`,
  )

  process.chdir(os.tmpdir()); fs.rmSync(d, { recursive: true, force: true })
}

console.log('--- ③ 一次报全：Gate1（文件清单缺）+ Gate2（超 allowed_paths）同时违反 → reasons 都报 ---')
{
  const { d, base, wtDir } = setupRepo('inc3')
  fs.writeFileSync(path.join(wtDir, 'feature.js'), 'modified\n')
  fs.writeFileSync(path.join(wtDir, 'stray.js'), 'stray\n')
  sh('git add -A && git commit -m work', wtDir)
  writeMeta(wtDir, 'inc3', base)
  // design 只列 feature.js（stray.js 既不在清单也不在 allowed_paths → Gate1 + Gate2 都报）
  writeDesign(d, 'inc3', [{ path: 'feature.js' }])
  writeTask(d, 'inc3', 'task-01', ['feature.js'])

  const r = assessApplyRisk('inc3', { cwd: d })
  assertTrue(r.decision === 'BLOCKED', `decision=BLOCKED（一次报全后仍 BLOCKED）`)
  const joined = r.reasons.join(' | ')
  assertTrue(joined.includes('stray.js'), `reasons 含 stray.js（一次报全，实际 reasons: ${joined || '无'}）`)
  // Gate1（文件清单）与 Gate2（allowed_paths）文案都在，证明两道都跑了、不短路
  assertTrue(
    r.reasons.some(x => x.includes('文件清单校验失败') || x.includes('不在 design.md 清单')),
    `Gate1 文案在 reasons（实际: ${joined || '无'}）`,
  )
  assertTrue(
    r.reasons.some(x => x.includes('超出 allowed_paths')),
    `Gate2 文案也在 reasons（一次报全，非逐道挤牙膏；实际: ${joined || '无'}）`,
  )

  process.chdir(os.tmpdir()); fs.rmSync(d, { recursive: true, force: true })
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
if (failures.length > 0) { console.log('失败项:'); failures.forEach(f => console.log(`  - ${f}`)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
