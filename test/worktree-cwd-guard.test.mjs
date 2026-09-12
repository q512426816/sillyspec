/**
 * worktree cwd 硬拦测试（坑 worktree-cwd-silent-split，2026-08-29 用户实证）
 *
 * 事故：Bash cwd 残留导致 agent 两次误在隔离 worktree 内跑 sillyspec——第一次（status 类顶层
 * 命令）完全静默，进度险些写进 worktree 副本 .sillyspec 与主仓进度库分裂；第二次靠 execute
 * 多实例告警才拦住。修复：CLI 入口（src/index.js main()）对目标目录（cwd / --dir）命中
 * .sillyspec/.runtime/worktrees/<change> 段统一硬报错 exit 2；逃生门 --allow-worktree-cwd /
 * --dir 显式主仓 / wt-commit 命令豁免。runCommand 内的 specDrift 自动锚定保留为第二层防线
 * （不经 CLI 入口的调用方仍受保护）。
 */
import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { detectCwdInsideWorktree } from '../src/run/shared.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const cliBin = join(__dirname, '..', 'bin', 'sillyspec.js')

describe('detectCwdInsideWorktree（判定单元）', () => {
  const mainRepo = join(tmpdir(), 'wt-cwd-guard-main')

  it('worktree 根 / 其子目录 → 命中（含 changeName 与主仓根）', () => {
    const wtRoot = join(mainRepo, '.sillyspec', '.runtime', 'worktrees', 'demo-change')
    const hit = detectCwdInsideWorktree(wtRoot)
    assert.ok(hit, 'worktree 根应命中')
    assert.equal(hit.changeName, 'demo-change')
    assert.equal(hit.mainRepoRoot, mainRepo)
    assert.equal(hit.worktreeRoot, wtRoot)

    const hitSub = detectCwdInsideWorktree(join(wtRoot, 'src', 'lib'))
    assert.ok(hitSub, 'worktree 子目录应命中')
    assert.equal(hitSub.changeName, 'demo-change')
  })

  it('主仓根 / worktrees 基目录本身 / 无关目录 → null（零误伤）', () => {
    assert.equal(detectCwdInsideWorktree(mainRepo), null)
    assert.equal(detectCwdInsideWorktree(join(mainRepo, '.sillyspec', '.runtime', 'worktrees')), null)
    assert.equal(detectCwdInsideWorktree(join(tmpdir(), 'some-other-project')), null)
    assert.equal(detectCwdInsideWorktree(null), null)
  })
})

describe('CLI 入口 worktree cwd 硬拦（e2e）', () => {
  let mainRepo
  let wtRoot
  beforeEach(() => {
    mainRepo = join(tmpdir(), `wt-cwd-guard-${Math.random().toString(36).slice(2)}`)
    wtRoot = join(mainRepo, '.sillyspec', '.runtime', 'worktrees', 'demo-change')
    mkdirSync(join(wtRoot, 'src'), { recursive: true })
  })
  afterEach(() => { try { rmSync(mainRepo, { recursive: true, force: true }) } catch {} })

  const runCli = (cwd, args) => spawnSync(process.execPath, [cliBin, ...args], { cwd, encoding: 'utf8' })

  it('cwd 在 worktree 内跑 status → exit 2 + 硬拦文案（第一次静默事故的回归）', () => {
    const res = runCli(wtRoot, ['status'])
    const combined = (res.stdout || '') + (res.stderr || '')
    assert.equal(res.status, 2, `期望 exit 2，实际 ${res.status}\n${combined}`)
    assert.ok(combined.includes('demo-change') && combined.includes('隔离 worktree 内'), combined)
    assert.ok(combined.includes(mainRepo), '修复指引应给出主仓根路径')
  })

  it('cwd 在 worktree 子目录同样硬拦', () => {
    const res = runCli(join(wtRoot, 'src'), ['status'])
    assert.equal(res.status, 2)
  })

  it('逃生门 --allow-worktree-cwd → 不再被硬拦（后续行为与守卫无关）', () => {
    const res = runCli(wtRoot, ['--allow-worktree-cwd', 'status'])
    const combined = (res.stdout || '') + (res.stderr || '')
    assert.ok(!combined.includes('隔离 worktree 内'), `不应出现硬拦文案：\n${combined}`)
  })

  it('--dir 显式主仓 → 目标不在 worktree 内，不拦', () => {
    mkdirSync(join(mainRepo, '.sillyspec'), { recursive: true })
    writeFileSync(join(mainRepo, '.sillyspec', 'local.yaml'), '# guard-test\n', 'utf8')
    const res = runCli(wtRoot, ['status', '--dir', mainRepo])
    const combined = (res.stdout || '') + (res.stderr || '')
    assert.ok(!combined.includes('隔离 worktree 内'), `不应出现硬拦文案：\n${combined}`)
  })

  it('wt-commit 命令豁免（子代理 workdir=worktree 内合法操作）', async () => {
    // 无 git 仓 → wt-commit 会在守卫之后失败，但失败原因不应是 worktree 硬拦
    const res = runCli(wtRoot, ['wt-commit', '-m', 'x', '--', 'a.txt'])
    const combined = (res.stdout || '') + (res.stderr || '')
    assert.ok(!combined.includes('隔离 worktree 内'), `wt-commit 不应被 worktree 硬拦：\n${combined}`)
  })
})
