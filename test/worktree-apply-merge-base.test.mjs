/**
 * worktree-apply merge-base 锚点回归测试（task-09 / FR-05/FR-06）
 *
 * 锁死三个 debt 修复的实证场景：
 *   A. 占位文件干净落盘（FR-05）：baseline checkpoint 含 0 字节占位 → merge-base 锚点下 patch 干净应用
 *   B. --base baseline 回退旧行为：显式回退 baseline 锚点 → 触发 add/delete 冲突
 *   C. merge-base 计算失败回退：分支不存在 → warn + 回退 deliverableBase 仍可跑通
 *   D. 冲突列表 stderr 解析（FR-06）：--3way 失败时错误信息含文件列表或原始 stderr
 *
 * debt 背景：multi-agent-platform/docs/sillyspec/2026-08-19-execute-batch-done-fake-complete-and-apply-3way-baseline.md
 *   "CLI 3way 用的 base 是 baseline checkpoint commit（含 0 字节占位文件），而主仓 main 上这些占位文件从未存在 →
 *   main 侧视为 delete、分支侧视为 modify → add/delete 冲突。真实 merge-base 下纯代码 diff 干净可直落。"
 *
 * 沿用 worktree-apply-classification.test.mjs 的 setupRepo/sh/assertTrue/chdir/cleanup 模式。
 */
import fs from 'fs'
import path from 'path'
import os from 'os'
import { execSync } from 'child_process'
import { applyWorktree } from '../src/worktree-apply.js'

let passed = 0
let failed = 0
const failures = []
function assertTrue(cond, msg) {
  if (cond) { passed++; console.log(`  ✅ PASS: ${msg}`) }
  else { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
}
function sh(cmd, cwd) { execSync(cmd, { cwd, stdio: 'pipe' }) }
function git(args, cwd) { return execSync('git ' + args, { cwd, encoding: 'utf8', stdio: 'pipe' }).trim() }

function setupRepo(prefix) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), prefix || 'wt-merge-'))
  sh('git init -q -b main', d)
  sh('git config user.email t@t.co && git config user.name t', d)
  // main 初始提交：无占位文件
  fs.writeFileSync(path.join(d, 'existing.txt'), 'original\n')
  sh('git add -A && git commit -qm init', d)
  // 预留 worktree 目录结构（避免 _resolveMainRepoRoot 探测失败）
  fs.mkdirSync(path.join(d, '.sillyspec', '.runtime', 'worktrees', 'tc'), { recursive: true })
  fs.writeFileSync(path.join(d, '.gitignore'), '.sillyspec/\n')
  sh('git add -A && git commit -qm gitignore', d)
  process.chdir(d)
  return d
}

function cleanup(d) {
  process.chdir(os.tmpdir())
  fs.rmSync(d, { recursive: true, force: true })
}

// 写 worktree meta.json（wtDir 路径由真实 git worktree add 建立）
function writeMeta(d, meta, wtDir) {
  const metaDir = wtDir || path.join(d, '.sillyspec', '.runtime', 'worktrees', 'tc')
  fs.writeFileSync(path.join(metaDir, 'meta.json'), JSON.stringify(meta))
}

// Windows 路径归一化（断言前转换）
function normalize(p) {
  return p.split(path.sep).join('/')
}

// 换行归一化（CRLF/LF 差异非 apply 正确性问题）
const normCRLF = s => s.replace(/\r\n/g, '\n')

console.log('=== A. 占位文件干净落盘（FR-05）：merge-base 锚点消假冲突 ===\n')

console.log('--- A1: baseline checkpoint 含占位 → 默认 merge-base 锚点干净应用 ---')
{
  const d = setupRepo('wt-merge-a1-')
  const wtDir = path.join(d, '.sillyspec', '.runtime', 'worktrees', 'tc')
  sh(`git worktree add "${wtDir}" -b sillyspec/tc`, d)

  // 分支上模拟 baseline checkpoint：创建 0 字节占位文件并 commit
  const placeholder = path.join(wtDir, 'placeholder.js')
  fs.writeFileSync(placeholder, '') // 0 字节占位
  sh('git add -A && git commit -qm "baseline: 占位文件（allowed_paths 满足）"', wtDir)
  const baselineHash = git('rev-parse HEAD', wtDir)

  // 分支上把占位文件写成真实内容并 commit（模拟子代理交付）
  fs.writeFileSync(placeholder, 'real implementation\n')
  sh('git add -A && git commit -qm "impl: 真实内容落地"', wtDir)

  // 构造 meta：baselineCommit 指向占位 commit，baseHash 指向 main init
  const baseHash = git('rev-parse HEAD~1', d) // gitignore 提交前
  writeMeta(d, {
    name_zh: 'meta', changeName: 'tc', branch: 'sillyspec/tc',
    baseBranch: 'main', baseHash, baselineCommit: baselineHash,
    worktreePath: wtDir, mode: 'worktree', baselineFiles: [],
  }, wtDir)

  // 默认 base=merge-base：apply 应成功，占位文件在 main 干净新建（真实内容）
  const r = applyWorktree('tc', { cwd: d })
  assertTrue(r.ok === true, `apply ok=true（实际 errors: ${r.errors.join(';') || '无'}）`)
  assertTrue(r.errors.length === 0, `无 error（实际 ${r.errors.length}）`)

  // 主仓工作区占位文件存在 = 真实内容（非 add/delete 冲突）
  const mainPlaceholder = path.join(d, 'placeholder.js')
  assertTrue(fs.existsSync(mainPlaceholder), 'main 侧 placeholder.js 存在（干净新建）')
  const actualContent = fs.readFileSync(mainPlaceholder, 'utf8')
  assertTrue(
    normCRLF(actualContent) === 'real implementation\n',
    `placeholder.js 内容=真实内容（实际: ${JSON.stringify(actualContent)}）`
  )

  cleanup(d)
}

console.log('--- A2: 显式 --base baseline 回退旧行为 → 触发冲突（FR-06 顺带验证）---')
{
  const d = setupRepo('wt-merge-a2-')
  const wtDir = path.join(d, '.sillyspec', '.runtime', 'worktrees', 'tc')
  sh(`git worktree add "${wtDir}" -b sillyspec/tc`, d)

  // 同拓扑：占位 commit → 真实内容
  const placeholder = path.join(wtDir, 'placeholder.js')
  fs.writeFileSync(placeholder, '')
  sh('git add -A && git commit -qm "baseline: 占位"', wtDir)
  const baselineHash = git('rev-parse HEAD', wtDir)
  fs.writeFileSync(placeholder, 'real impl\n')
  sh('git add -A && git commit -qm "impl: 真实"', wtDir)

  const baseHash = git('rev-parse HEAD~1', d)
  writeMeta(d, {
    name_zh: 'meta', changeName: 'tc', branch: 'sillyspec/tc',
    baseBranch: 'main', baseHash, baselineCommit: baselineHash,
    worktreePath: wtDir, mode: 'worktree', baselineFiles: [],
  }, wtDir)

  // base=baseline 回退旧行为：patch 锚点用 baselineCommit（含占位）→ main 侧视为 add/delete 冲突
  // 注：实际冲突会走到 hashMismatch 拦截（task-02 前移），报"主干已提交推进重叠"
  const r = applyWorktree('tc', { cwd: d, base: 'baseline' })
  assertTrue(r.ok === false, `apply ok=false（baseline 锚点触发冲突）`)
  assertTrue(
    r.errors.some(e => e.includes('冲突') || e.includes('重叠')),
    `errors 含冲突提示（实际首行: ${r.errors[0] || '空'}）`
  )
  // FR-06：冲突列表不再静默（含文件名或原始 stderr）
  assertTrue(
    r.errors.some(e => e.includes('placeholder.js') || e.length > 100), // 文件名 或 原始 stderr 尾部
    `errors 含冲突文件(placeholder.js)或原始 stderr（实际: ${r.errors.join(';')}）`
  )

  cleanup(d)
}

console.log('\n=== B. merge-base 计算失败回退（warn + 仍可跑通）===\n')

console.log('--- B1: 分支不存在 → warn + 回退 deliverableBase ---')
{
  const d = setupRepo('wt-merge-b1-')
  const wtDir = path.join(d, '.sillyspec', '.runtime', 'worktrees', 'tc')
  sh(`git worktree add "${wtDir}" -b sillyspec/tc`, d)

  // worktree 交付一个文件
  fs.writeFileSync(path.join(wtDir, 'src.txt'), 'from worktree\n')
  const baseHash = git('rev-parse HEAD', d)
  writeMeta(d, {
    name_zh: 'meta', changeName: 'tc',
    // branch 指向不存在的分支（模拟已删除分支）
    branch: 'sillyspec/nonexistent',
    baseBranch: 'main', baseHash, baselineCommit: null,
    worktreePath: wtDir, mode: 'worktree', baselineFiles: [],
  }, wtDir)

  // merge-base 计算失败 → 回退 deliverableBase（baseHash）→ 仍应成功
  const r = applyWorktree('tc', { cwd: d })
  // 按实现语义：warn 打印到 stderr（非 errors），apply 仍跑通
  assertTrue(r.ok === true, `apply ok=true（回退后跑通；实际 errors: ${r.errors.join(';') || '无'}）`)

  // 交付内容正确落地
  const mainSrc = path.join(d, 'src.txt')
  assertTrue(fs.existsSync(mainSrc), 'main 侧 src.txt 存在（回退后仍 apply 成功）')
  const actual = fs.readFileSync(mainSrc, 'utf8')
  assertTrue(normCRLF(actual) === 'from worktree\n', 'src.txt 内容正确')

  cleanup(d)
}

console.log('\n=== C. 冲突列表 stderr 解析（FR-06）===\n')

console.log('--- C1: --3way 失败 → errors 含冲突文件或原始 stderr 尾部 ---')
{
  const d = setupRepo('wt-merge-c1-')
  const wtDir = path.join(d, '.sillyspec', '.runtime', 'worktrees', 'tc')
  sh(`git worktree add "${wtDir}" -b sillyspec/tc`, d)

  // 构造真实冲突：worktree 修改文件 A，main 也修改同一文件（内容冲突）
  const conflictFile = path.join(wtDir, 'conflict.txt')
  fs.writeFileSync(conflictFile, 'worktree version\n')
  const baseHash = git('rev-parse HEAD', d)
  writeMeta(d, {
    name_zh: 'meta', changeName: 'tc', branch: 'sillyspec/tc',
    baseBranch: 'main', baseHash, baselineCommit: null,
    worktreePath: wtDir, mode: 'worktree', baselineFiles: [],
  }, wtDir)

  // main 先修改同一文件
  const mainConflictFile = path.join(d, 'conflict.txt')
  fs.writeFileSync(mainConflictFile, 'main version\n')
  sh('git add -A && git commit -qm "main: 先修改"', d)

  // applyWorktree 会触发 --3way 冲突
  const r = applyWorktree('tc', { cwd: d })
  assertTrue(r.ok === false, `apply ok=false（冲突阻断）`)

  // FR-06：errors 不再静默（含 conflict.txt 或原始 stderr）
  assertTrue(
    r.errors.some(e => e.includes('conflict.txt') || e.length > 50),
    `errors 含冲突文件(conflict.txt)或原始 stderr（实际: ${r.errors.join(';')}）`
  )

  cleanup(d)
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
if (failures.length > 0) { console.log('失败项:'); failures.forEach(f => console.log(`  - ${f}`)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
