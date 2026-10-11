/**
 * 坑 verify-reconcile-base-stale-parallel-drift 回归：worktree 侧 diff 基点 merge-base 化
 *
 * 实证（2026-10-10）：执行期把 main 合入 worktree 分支后，立项 diffBase..HEAD 把主仓并行
 * 演进算成本变更产出——对账 21 条 undeclared 噪声淹没真实信号。
 *
 * 锁定：
 *   ① merge main 后：diff 面只含本分支自身提交（并行文件不进），merge-base 锚生效；
 *   ② 未合 main（常规形态）：merge-base == 立项点，行为零变化；
 *   ③ merge-base 不可得（无 main ref）→ 退旧区间不放大（比旧窗口只窄不宽的守卫）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { resolveVerifyChangedFiles } from '../src/verify-postcheck.js'

const tmpRoots = []
function makeRepo() {
  const cwd = mkdtempSync(join(tmpdir(), 'mbase-'))
  tmpRoots.push(cwd)
  const g = (a) => execFileSync('git', a, { cwd, stdio: 'pipe' }).toString().trim()
  g(['init', '-q', '-b', 'main']); g(['config', 'user.email', 't@t']); g(['config', 'user.name', 't'])
  writeFileSync(join(cwd, 'base.txt'), 'base\n')
  g(['add', '.']); g(['commit', '-q', '-m', 'base'])
  return { cwd, g }
}
function seedMeta(cwd, change, baselineCommit) {
  const metaDir = join(cwd, '.sillyspec', '.runtime', 'worktrees', change)
  mkdirSync(metaDir, { recursive: true })
  writeFileSync(join(metaDir, 'meta.json'), JSON.stringify({
    changeName: change, baselineCommit, baseBranch: 'main', mode: 'in-place-fallback',
  }))
}
test.onFinish?.(() => { for (const t of tmpRoots) rmSync(t, { recursive: true, force: true }) })

test('① merge main 后：diff 面只含本分支自身提交（并行演进不圈入）', () => {
  const { cwd, g } = makeRepo()
  const base = g(['rev-parse', 'HEAD'])
  // 本变更分支：own 提交
  g(['checkout', '-q', '-b', 'dev'])
  mkdirSync(join(cwd, 'own'), { recursive: true })
  writeFileSync(join(cwd, 'own', 'work.txt'), 'own\n')
  g(['add', '.']); g(['commit', '-q', '-m', 'own work'])
  // 主仓并行演进（另一变更的文件）
  g(['checkout', '-q', 'main'])
  mkdirSync(join(cwd, 'parallel'), { recursive: true })
  writeFileSync(join(cwd, 'parallel', 'other.txt'), 'other\n')
  g(['add', '.']); g(['commit', '-q', '-m', 'parallel advance'])
  // 本分支合入 main（坑现场形态）
  g(['checkout', '-q', 'dev'])
  execFileSync('git', ['merge', '-q', '--no-edit', 'main'], { cwd, stdio: 'pipe' })
  const change = '2026-10-10-mbase-x'
  seedMeta(cwd, change, base)
  const files = resolveVerifyChangedFiles(cwd, change)
  assert.ok(Array.isArray(files) && files.includes('own/work.txt'), `本变更文件在：${files && files.join(',')}`)
  assert.ok(!files.includes('parallel/other.txt'), `并行演进不圈入（实际 ${files && files.join(',')}）`)
})

test('② 未合 main：merge-base == 立项点，行为零变化', () => {
  const { cwd, g } = makeRepo()
  const base = g(['rev-parse', 'HEAD'])
  g(['checkout', '-q', '-b', 'dev2'])
  writeFileSync(join(cwd, 'solo.txt'), 'solo\n')
  g(['add', '.']); g(['commit', '-q', '-m', 'solo'])
  const change = '2026-10-10-mbase-y'
  seedMeta(cwd, change, base)
  const files = resolveVerifyChangedFiles(cwd, change)
  assert.ok(files.includes('solo.txt'), '常规形态照常命中')
})

test('③ main ref 不可得 → 退旧区间（守卫：只窄不宽）', () => {
  const { cwd, g } = makeRepo()
  const base = g(['rev-parse', 'HEAD'])
  // meta 声明不存在的 baseBranch + 无 master → merge-base 双失败退 diffBase 旧区间
  const metaDir = join(cwd, '.sillyspec', '.runtime', 'worktrees', '2026-10-10-mbase-z')
  mkdirSync(metaDir, { recursive: true })
  writeFileSync(join(metaDir, 'meta.json'), JSON.stringify({
    changeName: '2026-10-10-mbase-z', baselineCommit: base, baseBranch: 'no-such-branch', mode: 'in-place-fallback',
  }))
  writeFileSync(join(cwd, 'fallback.txt'), 'f\n')
  g(['add', '.']); g(['commit', '-q', '-m', 'fb'])
  const files = resolveVerifyChangedFiles(cwd, '2026-10-10-mbase-z')
  assert.ok(files.includes('fallback.txt'), `退旧区间仍出文件（实际 ${files && files.join(',')}）`)
})
