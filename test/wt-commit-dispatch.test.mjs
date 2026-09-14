/**
 * wt-commit CLI dispatch 接线测试（ql-20260914-016-8786）
 *
 * 坑 wt-commit-ghost-dispatch：src/wt-commit.js 的 runWtCommit 自 bd1cb91 引入以来无任何
 * 调用点（孤儿模块），execute Wave prompt 却指示 agent 用 `sillyspec wt-commit`——实际跑报
 * 「未知命令」打帮助。本测试锁三件事：
 * ① dispatch 接通：CLI 真跑 wt-commit 能完成串行化提交（不再是未知命令）；
 * ② 参数面：-m 必填 / `--` 后 pathspec / 缺 pathspec 报错文案含「add -A」语义；
 * ③ 豁免测试补强：worktree cwd 内跑 wt-commit 不被硬拦（原断言太弱——「未知命令」也不含
 *    拦截文案，鬼命令时代照样绿；现在要求真实错误而非未知命令）。
 */
import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { execSync, spawnSync } from 'node:child_process'
import { writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const CLI = join(process.cwd(), 'bin', 'sillyspec.js')
const CHANGE = 'wtc-dispatch-demo'

describe('wt-commit CLI dispatch（幽灵命令根治）', () => {
  let repo
  let wt

  beforeEach(() => {
    repo = join(tmpdir(), `wt-cli-${Math.random().toString(36).slice(2)}`)
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

  const runCli = (args, cwd) => spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf8' })

  it('① dispatch 接通：CLI 在 worktree 内提交成功（cwd 推断 changeName）', () => {
    writeFileSync(join(wt, 'a.txt'), 'a\n', 'utf8')
    const res = runCli(['wt-commit', '-m', 'task-01 a', '--', 'a.txt'], wt)
    const combined = (res.stdout || '') + (res.stderr || '')
    assert.equal(res.status, 0, `退出码应 0：\n${combined}`)
    assert.ok(!combined.includes('未知命令'), `不应再是幽灵命令：\n${combined}`)
    const committed = execSync('git show --name-only --format= HEAD', { cwd: wt, encoding: 'utf8' }).trim()
    assert.ok(committed.includes('a.txt'), `a.txt 应已提交：${committed}`)
  })

  it('①b 显式 --change + 主仓 cwd 调用同样可用', () => {
    writeFileSync(join(wt, 'b.txt'), 'b\n', 'utf8')
    const res = runCli(['wt-commit', '--change', CHANGE, '-m', 'task-02 b', '--', 'b.txt'], repo)
    const combined = (res.stdout || '') + (res.stderr || '')
    assert.equal(res.status, 0, `退出码应 0：\n${combined}`)
  })

  it('② 缺 pathspec 报错含防 add -A 语义（exit 非 0）', () => {
    const res = runCli(['wt-commit', '--change', CHANGE, '-m', 'x'], repo)
    const combined = (res.stdout || '') + (res.stderr || '')
    assert.notEqual(res.status, 0, '缺 pathspec 应失败')
    assert.ok(combined.includes('add -A') || combined.includes('pathspec'), `错误文案应说明 pathspec 语义：\n${combined}`)
  })

  it('②b 缺 -m 报错（exit 非 0）', () => {
    const res = runCli(['wt-commit', '--change', CHANGE, '--', 'a.txt'], repo)
    assert.notEqual(res.status, 0, '缺 message 应失败')
  })

  it('③ worktree cwd 豁免补强：真实命令错误而非「未知命令」', () => {
    // 无 --change 且 cwd 非 worktree → 应报「缺少 --change」类真实错误，既不被 worktree 硬拦、也不是未知命令
    const res = runCli(['wt-commit', '-m', 'x', '--', 'a.txt'], repo)
    const combined = (res.stdout || '') + (res.stderr || '')
    assert.ok(!combined.includes('隔离 worktree 内'), `不应被 worktree 硬拦：\n${combined}`)
    assert.ok(!combined.includes('未知命令'), `不应是未知命令（幽灵命令回归哨兵）：\n${combined}`)
    assert.ok(combined.includes('--change') || combined.includes('变更名'), `应提示 change 缺失：\n${combined}`)
  })
})
