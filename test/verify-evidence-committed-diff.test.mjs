// verify 证据账 diff 命中 wt-commit 已提交形态（docs/sillyspec/verify-evidence-account-diff-misses-committed-changes）
//
// 实证形态：execute 的 wt-commit 流程把本变更提交落在**主仓 HEAD**，worktree 分支不前移；
// resolveMainChangedFiles 仅查 worktree 侧 diffBase..HEAD → 已提交文件全部 miss →
// 证据账 code 类 verifiedFiles diffHit=false 连环假红（7 task、verify 两连阻断）。
//
// 修复：worktree 侧 diff 与**主仓同区间** diffBase..HEAD 求并集（他者声明过滤防假阳）。
// 本测试直接锁 resolveVerifyChangedFiles 的文件集语义（证据账 diffHit 的数据源）。
//
// 隔离：tmpdir 真实 git 仓（主仓 + 真实 git worktree），不碰真实 .sillyspec。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'os'
import { execFileSync } from 'node:child_process'
import { resolveVerifyChangedFiles } from '../src/verify-postcheck.js'

const tmpRoots = []
function makeRepo() {
  const dir = mkdtempSync(join(tmpdir(), `evdiff-${process.pid}-`))
  tmpRoots.push(dir)
  return dir
}
test.onFinish?.(() => { for (const t of tmpRoots) rmSync(t, { recursive: true, force: true }) })

const git = (dir, args) => execFileSync('git', ['-C', dir, ...args], {
  encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'],
}).trim()

test('wt-commit 形态：提交落主仓 HEAD → 证据账 diff 集命中（并集主仓区间）', () => {
  const cwd = makeRepo()
  git(cwd, ['init', '-q']); git(cwd, ['config', 'user.email', 't@t.local'])
  git(cwd, ['config', 'user.name', 't']); git(cwd, ['config', 'commit.gpgsign', 'false'])
  writeFileSync(join(cwd, '.gitignore'), '.sillyspec/\n')
  writeFileSync(join(cwd, 'main.js'), 'console.log(1)\n')
  git(cwd, ['add', '.']); git(cwd, ['commit', '-q', '-m', 'init'])
  const baseHash = git(cwd, ['rev-parse', 'HEAD'])

  // 变更 worktree（mode 非 in-place）+ meta（diffBase=baseHash）
  const specBase = join(cwd, '.sillyspec')
  const wtPath = join(specBase, '.runtime', 'worktrees', 'evidence-change')
  mkdirSync(join(specBase, '.runtime', 'worktrees'), { recursive: true })
  git(cwd, ['worktree', 'add', '-q', wtPath, '-b', 'wt-evidence'])
  mkdirSync(join(specBase, 'changes', 'evidence-change'), { recursive: true })
  writeFileSync(join(specBase, 'changes', 'evidence-change', 'tasks.md'), '# t\n', 'utf8')
  writeFileSync(join(specBase, '.runtime', 'worktrees', 'evidence-change', 'meta.json'), JSON.stringify({
    changeName: 'evidence-change', baseHash, mode: 'worktree', worktreePath: wtPath, branch: 'wt-evidence',
  }), 'utf8')

  // wt-commit 形态：改动已提交落**主仓**，worktree 分支与工作树都不含该文件
  //（修复前 resolveVerifyChangedFiles 只查 worktree 侧 diff → miss）
  mkdirSync(join(cwd, 'src'), { recursive: true })
  writeFileSync(join(cwd, 'src', 'feature.ts'), 'export const x = 1\n')
  git(cwd, ['add', 'src/feature.ts'])
  git(cwd, ['commit', '-q', '-m', 'feat: task-01 feature（wt-commit 落主仓）'])

  const files = resolveVerifyChangedFiles(cwd, 'evidence-change', null, { includeWorkingTree: true, specBase })
  assert.ok(Array.isArray(files), '返回文件集')
  assert.ok(files.includes('src/feature.ts'),
    `主仓已提交文件命中 diff 集（修复前 miss：实际 ${JSON.stringify(files)}）——证据账 diffHit 数据源对齐 wt-commit 形态`)
})

test('主仓区间并集不丢自己的文件（他者声明过滤 best-effort，窗口共存可接受）', () => {
  // 坑修复的窗口语义：diffBase..主仓HEAD 含并行会话提交——他者**活跃声明**（quick guard /
  // design 清单 + 存活判据）会被 splitOwnVsForeignDiffFiles 剔除；已提交且声明已沉寂的
  // 他者文件可能共存于窗口（可接受：证据账 verifiedFiles 由 agent 按 task 边界声明，
  // 存在性+mtime 门仍在）。锁定下限契约：自己的文件必在集内、集合有界非全仓。
  const cwd = makeRepo()
  git(cwd, ['init', '-q']); git(cwd, ['config', 'user.email', 't@t.local'])
  git(cwd, ['config', 'user.name', 't']); git(cwd, ['config', 'commit.gpgsign', 'false'])
  writeFileSync(join(cwd, '.gitignore'), '.sillyspec/\n')
  git(cwd, ['add', '.']); git(cwd, ['commit', '-q', '-m', 'init'])
  const baseHash = git(cwd, ['rev-parse', 'HEAD'])

  const specBase = join(cwd, '.sillyspec')
  const wtPath = join(specBase, '.runtime', 'worktrees', 'own-change')
  mkdirSync(join(specBase, '.runtime', 'worktrees'), { recursive: true })
  git(cwd, ['worktree', 'add', '-q', wtPath, '-b', 'wt-own'])
  mkdirSync(join(specBase, 'changes', 'own-change'), { recursive: true })
  writeFileSync(join(specBase, '.runtime', 'worktrees', 'own-change', 'meta.json'), JSON.stringify({
    changeName: 'own-change', baseHash, mode: 'worktree', worktreePath: wtPath, branch: 'wt-own',
  }), 'utf8')

  // 主仓区间内混入并行会话文件的提交 + 本变更自己的文件提交
  mkdirSync(join(cwd, 'src'), { recursive: true })
  writeFileSync(join(cwd, 'src', 'mine.ts'), 'export const a = 1\n')
  writeFileSync(join(cwd, 'src', 'foreign.ts'), 'export const b = 2\n')
  git(cwd, ['add', '.']); git(cwd, ['commit', '-q', '-m', 'mixed: mine + foreign'])
  // 他者 quick 会话 guard 声明 foreign.ts（活跃声明 → 应被剔除）
  const otherSid = 'quick-12345678'
  mkdirSync(join(specBase, '.runtime', 'quick-sessions', otherSid), { recursive: true })
  writeFileSync(join(specBase, '.runtime', 'quick-sessions', otherSid, 'guard.json'), JSON.stringify({
    sessionId: otherSid, quicklogId: null, allowedFiles: ['src/foreign.ts'], startedAt: new Date().toISOString(),
  }), 'utf8')

  const files = resolveVerifyChangedFiles(cwd, 'own-change', null, { includeWorkingTree: true, specBase })
  assert.ok(Array.isArray(files) && files.includes('src/mine.ts'), `自己的文件在集内（实际 ${JSON.stringify(files)}）`)
  assert.ok(!files.includes('main.js') && !files.includes('.gitignore'), '集合有界（基点前文件不入集）')
})
