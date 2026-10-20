/**
 * worktree cwd 锚定测试（坑 worktree-cwd-silent-split 硬拦 → 坑 cli-cwd-coupling 拦→导，
 * 2026-10-20-cli-worktree-cwd-anchor 改钉）
 *
 * 沿革：2026-08-29 事故（Bash cwd 残留致 agent 误在隔离 worktree 内跑 sillyspec，进度险些
 * 写进副本分裂）后以 exit 2 硬拦 + 指引修复；生产实证（会话 47e2ff1a）agent 三次被拦每次
 * 1-2 个交互来回——2026-10-20 起「守卫建议的事自动做掉」：⚠️警告（变更名/原 cwd/锚定主仓
 * 根/逃生门整行）+ 自动重锚定主仓根执行（写入恒落主仓单源，worktree 副本零 CLI 写入）。
 * 逃生门 --allow-worktree-cwd（零警告零锚定）/ --dir 显式主仓 / wt-commit 豁免语义不变。
 * runCommand 内的 specDrift 自动锚定保留为第二层防线（不经 CLI 入口的调用方仍受保护）。
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

describe('CLI 入口 worktree cwd 锚定（e2e）', () => {
  let mainRepo
  let wtRoot
  beforeEach(() => {
    mainRepo = join(tmpdir(), `wt-cwd-guard-${Math.random().toString(36).slice(2)}`)
    wtRoot = join(mainRepo, '.sillyspec', '.runtime', 'worktrees', 'demo-change')
    mkdirSync(join(wtRoot, 'src'), { recursive: true })
  })
  afterEach(() => { try { rmSync(mainRepo, { recursive: true, force: true }) } catch {} })

  const runCli = (cwd, args) => spawnSync(process.execPath, [cliBin, ...args], { cwd, encoding: 'utf8' })

  it('cwd 在 worktree 内跑 status → 锚定警告 + 主仓口径执行（改钉：不再 exit 2）', () => {
    const res = runCli(wtRoot, ['status'])
    const combined = (res.stdout || '') + (res.stderr || '')
    assert.notEqual(res.status, 2, `不应再 exit 2（锚定语义），实际 ${res.status}\n${combined}`)
    assert.ok(combined.includes('demo-change') && combined.includes('已自动锚定主仓根'), combined)
    assert.ok(combined.includes(mainRepo), '警告应给出锚定主仓根路径')
    assert.ok(combined.includes('--allow-worktree-cwd'), '逃生门整行保留')
  })

  it('cwd 在 worktree 子目录同样锚定', () => {
    const res = runCli(join(wtRoot, 'src'), ['status'])
    const combined = (res.stdout || '') + (res.stderr || '')
    assert.notEqual(res.status, 2)
    assert.ok(combined.includes('已自动锚定主仓根'))
  })

  it('主仓未 init 极端态 → 锚定后走既有未初始化口径（守卫不新增失败面）', () => {
    // 评审 P3② 核实：worktree 段路径结构蕴含主仓 .sillyspec 祖先在场——真实「主仓未 init」
    // 不可构造，本例退化为与首例同态（守卫对该形态零新增失败面的回归钉，FR-03 防御性注记）。
    const res = runCli(wtRoot, ['status'])
    const combined = (res.stdout || '') + (res.stderr || '')
    assert.notEqual(res.status, 2)
    assert.ok(combined.includes('已自动锚定主仓根'), '锚定警告照常')
  })

  it('--dir 显式指进 worktree → 同样锚定主仓（评审 P3① 补正例）', () => {
    mkdirSync(join(mainRepo, '.sillyspec'), { recursive: true })
    writeFileSync(join(mainRepo, '.sillyspec', 'local.yaml'), '# anchor-test\n', 'utf8')
    const res = runCli(mainRepo, ['status', '--dir', wtRoot])
    const combined = (res.stdout || '') + (res.stderr || '')
    assert.notEqual(res.status, 2, `--dir 进 worktree 不再 exit 2，实际 ${res.status}\n${combined}`)
    assert.ok(combined.includes('已自动锚定主仓根') && combined.includes('demo-change'), '锚定警告含变更名')
  })

  it('--spec-dir 指进同一 worktree（无逃生 flag）→ 一并锚定主仓 spec 根（评审 P2 清偿）', () => {
    mkdirSync(join(mainRepo, '.sillyspec'), { recursive: true })
    writeFileSync(join(mainRepo, '.sillyspec', 'local.yaml'), '# anchor-test\n', 'utf8')
    const wtSpec = join(wtRoot, '.sillyspec')
    const res = runCli(wtRoot, ['status', '--spec-dir', wtSpec])
    const combined = (res.stdout || '') + (res.stderr || '')
    assert.notEqual(res.status, 2)
    assert.ok(combined.includes('已一并锚定主仓 spec 根'), `specDir 锚定警告可见（实际：${combined.slice(-200)}）`)
  })

  it('逃生门 --allow-worktree-cwd → 零警告零锚定（行为与守卫无关）', () => {
    const res = runCli(wtRoot, ['--allow-worktree-cwd', 'status'])
    const combined = (res.stdout || '') + (res.stderr || '')
    assert.ok(!combined.includes('已自动锚定主仓根'), `不应出现锚定警告：\n${combined}`)
  })

  it('--dir 显式主仓 → 目标不在 worktree 内，不锚定', () => {
    mkdirSync(join(mainRepo, '.sillyspec'), { recursive: true })
    writeFileSync(join(mainRepo, '.sillyspec', 'local.yaml'), '# guard-test\n', 'utf8')
    const res = runCli(wtRoot, ['status', '--dir', mainRepo])
    const combined = (res.stdout || '') + (res.stderr || '')
    assert.ok(!combined.includes('已自动锚定主仓根'), `不应出现锚定警告：\n${combined}`)
  })

  it('wt-commit 命令豁免（子代理 workdir=worktree 内合法操作）', async () => {
    // 无 git 仓 → wt-commit 会在守卫之后失败，但失败原因不应是 worktree 锚定
    const res = runCli(wtRoot, ['wt-commit', '-m', 'x', '--', 'a.txt'])
    const combined = (res.stdout || '') + (res.stderr || '')
    assert.ok(!combined.includes('已自动锚定主仓根'), `wt-commit 不应触发锚定：\n${combined}`)
  })
})
