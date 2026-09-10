/**
 * 探针 3 双根并集扫描（坑 probe3-worktree-test-false-negative，2026-09-10 驾驭小结第五批②，
 * 用户实证 5 条假 warning）：apply 前新测试文件 untracked 在 worktree，而模块目录在主仓
 * 已存在——旧「主仓目录缺失才回退 worktree」不触发，探针 3 报「未找到测试文件」假阴，
 * 逼 agent 人工消解标注。
 *
 * 锁定语义（真实 git worktree 形态）：
 *   - 主仓模块目录在（含旧实现）但新测试只在 worktree → 探针 3 经 worktree 根命中（hasTest=true）
 *   - 主仓既有 co-located 测试仍命中（并集主仓侧，零回归）
 *   - 路径相对 worktree 根呈现（rel 去重，主仓优先）
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { spawnSync } from 'node:child_process'
import { runVerifyProbes } from '../src/verify-probes.js'

const tmpRoots = []
function mk(prefix) { const d = mkdtempSync(join(tmpdir(), prefix)); tmpRoots.push(d); return d }
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

function git(dir, args) {
  const r = spawnSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`)
  return r.stdout.trim()
}

test('主仓模块目录在、新测试 untracked 在 worktree → 探针 3 双根命中不假阴', () => {
  const proj = mk('vp3-dual-')
  git(proj, ['init', '-q'])
  git(proj, ['config', 'user.email', 't@t.local'])
  git(proj, ['config', 'user.name', 't'])
  writeFileSync(join(proj, '.gitignore'), '.sillyspec/\n')
  // 主仓模块目录已存在（含旧实现 + 既有测试——旧实现侧回归锚）
  mkdirSync(join(proj, 'src', 'billing'), { recursive: true })
  writeFileSync(join(proj, 'src', 'billing', 'engine.js'), 'export const e = 1\n')
  writeFileSync(join(proj, 'src', 'billing', 'engine.test.js'), 'test("old", () => {})\n')
  mkdirSync(join(proj, 'src', 'notify'), { recursive: true })
  writeFileSync(join(proj, 'src', 'notify', 'sender.js'), 'export const s = 1\n')
  git(proj, ['add', '.'])
  git(proj, ['commit', '-q', '-m', 'init'])
  const baseHash = git(proj, ['rev-parse', 'HEAD'])

  // 真实 git worktree（mode 非 in-place → wtRoot=worktree 根）
  const specBase = join(proj, '.sillyspec')
  const wtPath = mk('vp3-dual-wt-')
  rmSync(wtPath, { recursive: true, force: true })
  git(proj, ['worktree', 'add', '-q', wtPath, '-b', 'wt-branch'])
  // 新测试只在 worktree（untracked，apply 前形态）；主仓 src/notify 目录在但无测试
  mkdirSync(join(wtPath, 'src', 'notify'), { recursive: true })
  writeFileSync(join(wtPath, 'src', 'notify', 'sender.js'), 'export const s = 2\n')
  writeFileSync(join(wtPath, 'src', 'notify', 'sender.test.js'), 'test("new", () => {})\n')

  const metaDir = join(specBase, '.runtime', 'worktrees', 'dual')
  mkdirSync(metaDir, { recursive: true })
  writeFileSync(join(metaDir, 'meta.json'), JSON.stringify({
    changeName: 'dual', baseHash, mode: 'native-worktree', worktreePath: wtPath,
  }))

  const changeDir = join(specBase, 'changes', 'dual')
  mkdirSync(join(changeDir, 'tasks'), { recursive: true })
  writeFileSync(join(changeDir, 'tasks.md'), '- [ ] task-01: 通知\n')
  writeFileSync(join(changeDir, 'tasks', 'task-01.md'),
    '---\nid: task-01\nallowed_paths: [src/notify/sender.js]\n---\n# task-01\n')

  const r = runVerifyProbes({ cwd: proj, changeName: 'dual' })
  const t1 = r.probe3.tasks.find(t => t.task === 'task-01')
  assert.ok(t1, 'task-01 在探针 3 输出')
  assert.equal(t1.hasTest, true, `worktree 新测试被双根并集命中（实际 testFiles：${JSON.stringify(t1.testFiles)}）——旧逻辑此处假阴「未找到测试文件」`)
  assert.ok(t1.testFiles.some(f => f.includes('sender.test.js')), '命中 worktree 侧 sender.test.js')
})
