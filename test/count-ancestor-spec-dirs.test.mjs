/**
 * countAncestorSpecDirs 回归测试
 * 漂移提醒（坑：monorepo cwd 漂移到子项目 .sillyspec）的触发条件:
 * 祖先链 .sillyspec ≥2 才提醒;单实例项目任意子目录恒为 1,不误报。
 * 计数上界 = git root,排除 home 等无关祖先的孤立 .sillyspec(否则 home 下任何项目都误报)。
 */
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { countAncestorSpecDirs, ancestorSpecDirs } from '../src/run/shared.js'

let total = 0, failed = 0
function assert(cond, msg) {
  total++
  if (!cond) { failed++; console.log(`  ❌ FAIL: ${msg}`) }
  else console.log(`  ✅ PASS: ${msg}`)
}

console.log('=== countAncestorSpecDirs 祖先链计数测试 ===\n')

// 多实例 git 仓库:root/.sillyspec(根) + root/frontend/.sillyspec(子项目)
const root = mkdtempSync(join(tmpdir(), 'asd-'))
execSync('git init', { cwd: root, stdio: 'ignore' })
mkdirSync(join(root, '.sillyspec'), { recursive: true })
mkdirSync(join(root, 'frontend', '.sillyspec'), { recursive: true })
mkdirSync(join(root, 'frontend', 'src'), { recursive: true })

assert(countAncestorSpecDirs(join(root, 'frontend')) === 2, '子项目根 frontend/ → git root 范围内 2 个 → 提醒')
assert(countAncestorSpecDirs(join(root, 'frontend', 'src')) === 2, '子项目深层 frontend/src/ → 2 个 → 提醒')
assert(countAncestorSpecDirs(root) === 1, 'git root 自身 → 1 个 → 不提醒')

// 删子项目实例(漂移源已除)→ 回到 1
rmSync(join(root, 'frontend', '.sillyspec'), { recursive: true, force: true })
assert(countAncestorSpecDirs(join(root, 'frontend')) === 1, '删 frontend/.sillyspec 后 → 1 个 → 不再提醒')
assert(countAncestorSpecDirs(join(root, 'frontend', 'src')) === 1, '删后 frontend/src/ → 1 个 → 不再提醒')

// 非 git 目录:不向上数,只看 cwd 自身(避免撞 home 孤立 .sillyspec 误报)
const noGit = mkdtempSync(join(tmpdir(), 'asd-ng-'))
mkdirSync(join(noGit, '.sillyspec'), { recursive: true })
assert(countAncestorSpecDirs(noGit) === 1, '非 git 目录自身有 .sillyspec → 1 个(不向上数,不撞 home)')
rmSync(noGit, { recursive: true, force: true })

// ── linked worktree(坑 worktree-execute-spec-drift)──
// --show-toplevel 在 linked worktree 内返回 worktree 根(非主仓根)→ 旧 ceiling 截断,count≤1 漏报。
// 修复后 ceiling 抬到主仓根(--git-common-dir 的 dirname)→ count=2(worktree 副本 + 主仓)。
console.log('\n--- linked worktree ---')
const wtRoot = mkdtempSync(join(tmpdir(), 'asd-wt-'))
execSync('git init', { cwd: wtRoot, stdio: 'ignore' })
execSync('git config user.email t@t.com', { cwd: wtRoot, stdio: 'ignore' })
execSync('git config user.name t', { cwd: wtRoot, stdio: 'ignore' })
// 主仓 .sillyspec/changes/<change>/ 被跟踪 → worktree add 会 checkout 出副本(漂移的根源)
mkdirSync(join(wtRoot, '.sillyspec', 'changes', 'demo'), { recursive: true })
writeFileSync(join(wtRoot, '.sillyspec', 'changes', 'demo', 'plan.md'), 'x')
writeFileSync(join(wtRoot, '.gitignore'), '.sillyspec/.runtime/\n')
execSync('git add -A', { cwd: wtRoot, stdio: 'ignore' })
execSync('git commit -m init', { cwd: wtRoot, stdio: 'ignore' })
// worktree 落在 sillyspec 真实位置 <mainRepo>/.sillyspec/.runtime/worktrees/<change>/
const wtDir = join(wtRoot, '.sillyspec', '.runtime', 'worktrees', 'demo')
execSync(`git worktree add "${wtDir}" -b sillyspec/demo`, { cwd: wtRoot, stdio: 'pipe' })

assert(existsSync(join(wtDir, '.sillyspec')), 'worktree checkout 出 .sillyspec 副本(漂移源)')
const wtAncestors = ancestorSpecDirs(wtDir)
assert(wtAncestors.length === 2, `worktree 根祖先链 2 个(副本+主仓),actual=${wtAncestors.length}`)
assert(wtAncestors[0] === join(wtDir, '.sillyspec'), '最近 = worktree 副本 .sillyspec')
assert(wtAncestors[1] === join(wtRoot, '.sillyspec'), '其次 = 主仓 .sillyspec(ceiling 已抬到主仓根)')
// worktree 内深层子目录(模拟 cd worktree/backend 测 .venv)也 =2
mkdirSync(join(wtDir, 'backend'), { recursive: true })
assert(ancestorSpecDirs(join(wtDir, 'backend')).length === 2, 'worktree 内 backend/ 深层 → 2 个')
// countAncestorSpecDirs 同步受益
assert(countAncestorSpecDirs(wtDir) === 2, 'countAncestorSpecDirs(worktree 根) === 2 → warn 会触发')

try { rmSync(wtDir, { recursive: true, force: true }) } catch {}
try { execSync('git worktree prune', { cwd: wtRoot, stdio: 'ignore' }) } catch {}
try { rmSync(wtRoot, { recursive: true, force: true }) } catch {}

try { rmSync(root, { recursive: true, force: true }) } catch {}

console.log('\n==================================================')
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
console.log('==================================================')
if (failed > 0) process.exit(1)
