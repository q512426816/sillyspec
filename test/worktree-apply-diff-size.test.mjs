// assessApplyRisk diff 规模两档阈值测试。
//
// 修复的坑：原单档 >2000 行即 BLOCKED，正常规模 change（+2368 行）被误伤，
// 逼进 rescue cp 手动路径。修复后两档：
//   - >5000 行 → BLOCKED（reasons）
//   - 2000~5000 行 → WARNING（warnings，assess 仍自动 apply）
//   - ≤2000 行 → 不触发
//
// 真实 git + worktree fixture（参考 worktree-apply-incidental.test.mjs），
// 用大文件行数精确控制 diff 规模。
import fs from 'fs'
import path from 'path'
import os from 'os'
import { execSync } from 'child_process'
import { assessApplyRisk } from '../src/worktree-apply.js'

let failed = 0
const failures = []
function assertTrue(cond, msg) {
  if (cond) console.log(`  ✅ PASS: ${msg}`)
  else { failed++; failures.push(msg); console.error(`  ❌ FAIL: ${msg}`) }
}
function sh(cmd, cwd) { execSync(cmd, { cwd, stdio: 'pipe' }) }

function setupRepo(changeName) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'wtdiff-'))
  sh('git init', d)
  sh('git config user.email t@t.co && git config user.name t', d)
  fs.writeFileSync(path.join(d, 'feature.js'), 'base\n')
  sh('git add -A && git commit -m base', d)
  fs.writeFileSync(path.join(d, '.gitignore'), '.sillyspec/\n')
  sh('git add -A && git commit -m gitignore', d)
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

function writeDesignAndTask(d, changeName, file) {
  const dir = path.join(d, '.sillyspec', 'changes', changeName)
  fs.mkdirSync(path.join(dir, 'tasks'), { recursive: true })
  fs.writeFileSync(path.join(dir, 'design.md'),
    `# Design\n\n## 文件变更清单\n\n| 操作 | 文件路径 | 说明 |\n| --- | --- | --- |\n| 修改 | ${file} | 主变更 |\n`)
  fs.writeFileSync(path.join(dir, 'tasks', 'task-01.md'),
    `---\nid: task-01\nallowed_paths:\n  - ${file}\n---\n\n# task-01\n\ngoal: ...\n`)
}

// 在 worktree 写 N 行变更并 commit（git diff --shortstat 需已提交才有 baseline..HEAD diff）
const commitNLines = (wtDir, file, n) => {
  fs.writeFileSync(path.join(wtDir, file), Array.from({ length: n }, (_, i) => `line ${i}\n`).join(''))
  sh('git add -A && git commit -m work', wtDir)
}

console.log('=== assessApplyRisk: diff 规模两档阈值（2000 warn / 5000 block）===\n')

console.log('--- ① 2368 行（正常规模 change）→ WARNING 不 BLOCKED ---')
{
  const { d, base, wtDir } = setupRepo('diff2368')
  commitNLines(wtDir, 'feature.js', 2368)
  writeMeta(wtDir, 'diff2368', base)
  writeDesignAndTask(d, 'diff2368', 'feature.js')
  const r = assessApplyRisk('diff2368', { cwd: d })
  assertTrue(r.decision === 'WARNING', `decision=WARNING（实际 ${r.decision}）—— 2368 行不再误伤`)
  assertTrue(r.stats.additions >= 2368, `stats.additions 计入（实际 +${r.stats.additions}）`)
  assertTrue(!r.reasons.some(x => x.includes('diff 规模')), `reasons 不含 diff 规模拦截（实际 reasons: ${r.reasons.join(';') || '无'}）`)
  assertTrue(r.warnings.some(x => x.includes('diff 规模偏大') && x.includes('2368')), 'warnings 含规模偏大提示（含实际行数）')
  process.chdir(os.tmpdir()); fs.rmSync(d, { recursive: true, force: true })
}

console.log('--- ② 5500 行 → 仍 BLOCKED ---')
{
  const { d, base, wtDir } = setupRepo('diff5500')
  commitNLines(wtDir, 'feature.js', 5500)
  writeMeta(wtDir, 'diff5500', base)
  writeDesignAndTask(d, 'diff5500', 'feature.js')
  const r = assessApplyRisk('diff5500', { cwd: d })
  assertTrue(r.reasons.some(x => x.includes('diff 规模异常') && x.includes('5000')), `reasons 含超 5000 硬上限拦截`)
  process.chdir(os.tmpdir()); fs.rmSync(d, { recursive: true, force: true })
}

console.log('--- ③ 1500 行 → 不触发规模检查 ---')
{
  const { d, base, wtDir } = setupRepo('diff1500')
  commitNLines(wtDir, 'feature.js', 1500)
  writeMeta(wtDir, 'diff1500', base)
  writeDesignAndTask(d, 'diff1500', 'feature.js')
  const r = assessApplyRisk('diff1500', { cwd: d })
  assertTrue(!r.reasons.some(x => x.includes('diff 规模')), 'reasons 无规模拦截')
  assertTrue(!r.warnings.some(x => x.includes('diff 规模')), 'warnings 无规模提示')
  assertTrue(r.decision === 'SAFE', `decision=SAFE（实际 ${r.decision}）`)
  process.chdir(os.tmpdir()); fs.rmSync(d, { recursive: true, force: true })
}

if (failed > 0) {
  console.error(`\n❌ ${failed} 项失败: ${failures.join(' | ')}`)
  process.exit(1)
}
console.log('\n=== 全部通过 ===')
