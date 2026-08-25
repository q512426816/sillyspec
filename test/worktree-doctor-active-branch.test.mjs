/**
 * 坑 doctor-fix-orphan-branch-parallel-active 回归：孤儿分支判定的活跃变更交叉核对
 *
 * 背景（2026-08-20 实证）：doctor 第5步孤儿分支判定只看本地 meta 目录注册表（metaNames），
 * 与变更活跃态权威注册表（进度库 changes 表）数据源不一致——并行会话的活跃变更（meta 已清 /
 * in-place / 平台模式 meta 在别处）分支被全局 doctor --fix 误删。
 *
 * 锁定语义：
 *   1. 分支无 meta 但变更在进度库注册为 active → 报 active-branch（fixable:false），
 *      --fix 不删（保留 + 人工确认指引）
 *   2. 分支无 meta 且变更非活跃（无进度库 / 已归档注销）→ 原 orphan-branch 行为，--fix 删
 *   3. --change 过滤与 doctor 异步化不破坏常规调用
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { execSync } from 'child_process'
import { WorktreeManager } from '../src/worktree.js'
import { ProgressManager } from '../src/progress.js'

let passed = 0, failed = 0
const failures = []
function assert(cond, msg) {
  if (cond) { passed++; console.log(`  ✅ PASS: ${msg}`) }
  else { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
}
const tmpDirs = []
function mkRepo(prefix) {
  const root = mkdtempSync(join(tmpdir(), `wtdoc-act-${prefix}-`))
  tmpDirs.push(root)
  execSync('git init -b main', { cwd: root, stdio: 'ignore' })
  execSync('git config user.email t@t && git config user.name t', { cwd: root, stdio: 'ignore' })
  writeFileSync(join(root, 'README.md'), 'x')
  execSync('git add . && git commit -m init', { cwd: root, stdio: 'ignore' })
  mkdirSync(join(root, '.sillyspec'), { recursive: true })
  return root
}
const branchExists = (root, name) => {
  try {
    return execSync(`git branch --list sillyspec/${name}`, { cwd: root, encoding: 'utf8' }).trim().length > 0
  } catch { return false }
}
const cleanup = () => { for (const d of tmpDirs) { try { rmSync(d, { recursive: true, force: true }) } catch {} } }

console.log('=== doctor 孤儿分支活跃变更交叉核对（坑 doctor-fix-orphan-branch-parallel-active）===\n')

console.log('--- ① 活跃变更的分支：--fix 不删，报 active-branch ---')
{
  const root = mkRepo('active')
  const cn = '2026-08-20-parallel-live'
  // 分支存在、无 meta（模拟：并行会话 meta 已清/在别处，但变更仍注册活跃）
  execSync(`git branch sillyspec/${cn}`, { cwd: root, stdio: 'ignore' })
  const pm = new ProgressManager({ specDir: join(root, '.sillyspec') })
  pm.init(root)
  pm.initChange(root, cn)

  const diag = await new WorktreeManager({ cwd: root }).doctor({ fix: true })
  const active = diag.issues.find(i => i.type === 'active-branch' && i.name === cn)
  assert(!!active, `报 active-branch（issues: ${diag.issues.map(i => i.type).join(',')}）`)
  assert(active && active.fixable === false, 'active-branch fixable=false')
  assert(!diag.fixed.some(m => m.includes(cn)), `--fix 未删活跃分支（fixed: [${diag.fixed.join(' | ')}]）`)
  assert(branchExists(root, cn), '分支物理保留')
  cleanup()
}

console.log('--- ② 无进度库（git-only 工作流）：保守保留（坑 worktree-user-branch-conflict，2026-08-24 收紧）---')
{
  const root = mkRepo('nodb')
  const cn = '2026-08-20-dead-change'
  execSync(`git branch sillyspec/${cn}`, { cwd: root, stdio: 'ignore' })
  // 不 init 进度库（无 sillyspec.db）→ 无法区分孤儿与用户自建分支 → 保守保留（fixable:false）
  // 旧行为「照删」是用户自建分支误删向量（用户反馈五期①），故意反转

  const diag = await new WorktreeManager({ cwd: root }).doctor({ fix: true })
  const issue = diag.issues.find(i => i.type === 'orphan-branch' && i.name === cn)
  assert(!!issue && issue.fixable === false, '无库场景 orphan-branch fixable=false（保守保留）')
  assert(!!issue && issue.detail.includes('无进度库'), 'detail 注明无库无法区分')
  assert(!diag.fixed.some(m => m.includes(cn)), `--fix 不删（fixed: [${diag.fixed.join(' | ')}]）`)
  assert(branchExists(root, cn), '分支物理保留')
  cleanup()
}

console.log('--- ③ 变更已注销（非活跃）：孤儿分支照删（有进度库可核对，保持原行为）---')
{
  const root = mkRepo('unreg')
  const cn = '2026-08-20-archived-change'
  execSync(`git branch sillyspec/${cn}`, { cwd: root, stdio: 'ignore' })
  const pm = new ProgressManager({ specDir: join(root, '.sillyspec') })
  pm.init(root)
  pm.initChange(root, cn)
  pm.unregisterChange(root, cn) // 模拟归档注销 → 非活跃

  const diag = await new WorktreeManager({ cwd: root }).doctor({ fix: true })
  assert(!diag.issues.some(i => i.type === 'active-branch' && i.name === cn), '已注销变更不报 active-branch')
  assert(diag.fixed.some(m => m.includes(cn)), `非活跃孤儿分支被删（fixed: [${diag.fixed.join(' | ')}]）`)
  cleanup()
}

console.log('--- ③b review 锚点保护（坑 worktree-user-branch-conflict）：非活跃但被 review 引用 → 不删 ---')
{
  const root = mkRepo('revref')
  const cn = '2026-08-20-reviewed-change'
  // 分支带一个真实 commit（review.head 引用它）
  execSync(`git checkout -q -b sillyspec/${cn}`, { cwd: root, stdio: 'ignore' })
  writeFileSync(join(root, 'feature.js'), 'x')
  execSync('git add . && git commit -qm feature', { cwd: root, stdio: 'ignore' })
  const head = execSync('git rev-parse HEAD', { cwd: root, encoding: 'utf8' }).trim()
  execSync('git checkout -q main', { cwd: root, stdio: 'ignore' })
  // 变更已注销（非活跃）但 review.json 的 head 引用分支上的 commit
  const pm = new ProgressManager({ specDir: join(root, '.sillyspec') })
  pm.init(root)
  pm.initChange(root, cn)
  pm.unregisterChange(root, cn)
  const runTaskDir = join(root, '.sillyspec', '.runtime', 'execute-runs', 'exec-2026-08-24-100000', 'tasks', 'task-01')
  mkdirSync(runTaskDir, { recursive: true })
  writeFileSync(join(runTaskDir, 'review.json'), JSON.stringify({
    schemaVersion: 2, task: 'task-01', base: '0'.repeat(40), head,
    changedFiles: ['feature.js'], specVerdict: 'pass', qualityVerdict: 'pass', reviewerNotes: 't', requiredEvidence: [],
  }))

  const diag = await new WorktreeManager({ cwd: root }).doctor({ fix: true })
  const issue = diag.issues.find(i => i.type === 'orphan-branch' && i.name === cn)
  assert(!!issue && issue.fixable === false, 'review 锚点分支 fixable=false（保留）')
  assert(!!issue && issue.detail.includes('review.json'), 'detail 注明 review 锚点保护')
  assert(!diag.fixed.some(m => m.includes(cn)), '--fix 不删有审计锚点的分支')
  assert(branchExists(root, cn), '分支物理保留')
  cleanup()
}

console.log('--- ④ 有 meta 的分支不受影响（常规路径零回归）---')
{
  const root = mkRepo('withmeta')
  const cn = '2026-08-20-meta-change'
  execSync(`git branch sillyspec/${cn}`, { cwd: root, stdio: 'ignore' })
  const wm = new WorktreeManager({ cwd: root })
  mkdirSync(join(wm.worktreeBase, cn), { recursive: true })
  writeFileSync(join(wm.worktreeBase, cn, 'meta.json'), JSON.stringify({
    changeName: cn, worktreePath: join(root, 'wt-x'), mode: 'worktree',
    branch: `sillyspec/${cn}`, baseHash: 'deadbeef', createdAt: new Date().toISOString(),
    depsStatus: 'linked',
  }))

  const diag = await wm.doctor({ fix: true })
  assert(!diag.issues.some(i => (i.type === 'orphan-branch' || i.type === 'active-branch') && i.name === cn), '有 meta 分支不进孤儿判定')
  assert(branchExists(root, cn), '有 meta 分支保留')
  cleanup()
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
if (failures.length) { console.log('失败项:'); failures.forEach(f => console.log('  - ' + f)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
