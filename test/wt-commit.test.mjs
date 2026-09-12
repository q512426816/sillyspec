/**
 * wt-commit（worktree 串行化提交）测试
 *
 * 坑 wt-parallel-commit-race（2026-08-29 用户实证×2）：同 Wave 多子代理共享 worktree，
 * 裸 git add -A/commit 互卷 WIP + 撞 index.lock。wt-commit 双保险：
 * ① 文件锁串行（per-task 提交队列）；② 强制 pathspec（命令语义上杜绝 add -A）。
 */
import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { execSync } from 'node:child_process'
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { runWtCommit } from '../src/wt-commit.js'

const CHANGE = 'wtc-demo'

describe('runWtCommit（worktree 串行化提交）', () => {
  let repo
  let wt

  beforeEach(() => {
    repo = join(tmpdir(), `wt-commit-${Math.random().toString(36).slice(2)}`)
    wt = join(repo, '.sillyspec', '.runtime', 'worktrees', CHANGE)
    mkdirSync(repo, { recursive: true })
    const g = (cmd) => execSync(cmd, { cwd: repo, stdio: 'pipe' })
    g('git init -b main')
    g('git config user.email t@t.com')
    g('git config user.name t')
    writeFileSync(join(repo, 'base.txt'), 'base\n', 'utf8')
    g('git add base.txt && git commit -q -m init')
    execSync(`git worktree add "${wt}" -b ${CHANGE}-branch`, { cwd: repo, stdio: 'pipe' })
  })
  afterEach(() => {
    try { execSync('git worktree prune', { cwd: repo, stdio: 'ignore' }) } catch {}
    try { rmSync(repo, { recursive: true, force: true }) } catch {}
  })

  const headOf = () => execSync('git rev-parse HEAD', { cwd: wt, encoding: 'utf8' }).trim()
  const filesIn = (rev) => execSync(`git show --name-only --format= ${rev}`, { cwd: wt, encoding: 'utf8' }).trim().split(/\r?\n/).filter(Boolean)

  it('pathspec 隔离：兄弟 WIP 文件不被卷入提交', async () => {
    writeFileSync(join(wt, 'a.txt'), 'a\n', 'utf8')
    writeFileSync(join(wt, 'b-wip.txt'), 'b（并行兄弟的 WIP）\n', 'utf8')
    const before = headOf()

    const r = await runWtCommit({ changeName: CHANGE, message: 'task-01 a', pathspecs: ['a.txt'], cwd: repo })

    assert.equal(r.ok, true)
    assert.equal(r.skipped, false)
    assert.notEqual(r.head, before, 'HEAD 应推进')
    assert.deepEqual(filesIn(r.head), ['a.txt'], '提交只含 a.txt，兄弟 WIP 不被卷入')
    assert.ok(!existsSync(join(repo, '.sillyspec', '.runtime', `wt-commit-${CHANGE}.lock`)), '锁应释放')
  })

  it('并发两提交：文件锁排队串行，各自只含自己的文件', async () => {
    writeFileSync(join(wt, 'c1.txt'), 'c1\n', 'utf8')
    writeFileSync(join(wt, 'c2.txt'), 'c2\n', 'utf8')
    const before = headOf()

    const [r1, r2] = await Promise.all([
      runWtCommit({ changeName: CHANGE, message: 'task-01 c1', pathspecs: ['c1.txt'], cwd: repo }),
      runWtCommit({ changeName: CHANGE, message: 'task-02 c2', pathspecs: ['c2.txt'], cwd: repo }),
    ])

    assert.ok(r1.ok && r2.ok)
    assert.notEqual(r1.head, r2.head, '两次提交应串行落成两个不同 commit（锁排队）')
    assert.deepEqual(filesIn(r1.head), ['c1.txt'])
    assert.deepEqual(filesIn(r2.head), ['c2.txt'])
    const total = execSync(`git rev-list --count ${before}..HEAD`, { cwd: wt, encoding: 'utf8' }).trim()
    assert.equal(total, '2')
  })

  it('空 pathspec 拒绝（杜绝 add -A 语义）', async () => {
    writeFileSync(join(wt, 'd.txt'), 'd\n', 'utf8')
    await assert.rejects(
      () => runWtCommit({ changeName: CHANGE, message: 'no-pathspec', pathspecs: [], cwd: repo }),
      (e) => { assert.ok(String(e.message).includes('add -A') || String(e.message).includes('精确路径'), e.message); return true }
    )
  })

  it('无变更可提交 → skipped（幂等重跑不炸）', async () => {
    writeFileSync(join(wt, 'e.txt'), 'e\n', 'utf8')
    const r1 = await runWtCommit({ changeName: CHANGE, message: 'task-03 e', pathspecs: ['e.txt'], cwd: repo })
    const headAfter = headOf()
    const r2 = await runWtCommit({ changeName: CHANGE, message: 'task-03 e（重跑）', pathspecs: ['e.txt'], cwd: repo })
    assert.equal(r2.skipped, true, '无新变更应为 skipped')
    assert.equal(headOf(), headAfter, 'HEAD 不动')
    assert.equal(r1.skipped, false)
  })

  it('--pathspec-from-file：逐行路径 + # 注释忽略', async () => {
    writeFileSync(join(wt, 'f1.txt'), 'f1\n', 'utf8')
    writeFileSync(join(wt, 'f2.txt'), 'f2\n', 'utf8')
    const psFile = join(repo, '.sillyspec', 'ps.txt')
    writeFileSync(psFile, '# 本 task 文件清单\nf1.txt\nf2.txt\n', 'utf8')

    const r = await runWtCommit({ changeName: CHANGE, message: 'task-04 f', pathspecs: [], pathspecFile: psFile, cwd: repo })

    assert.equal(r.ok, true)
    assert.deepEqual(filesIn(r.head).sort(), ['f1.txt', 'f2.txt'])
  })
})
