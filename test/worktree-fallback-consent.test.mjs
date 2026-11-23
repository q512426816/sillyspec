/**
 * worktree 降级同意制测试（2026-11-23-worktree-fallback-consent）
 *
 * 覆盖：
 * 1. FR-01 fail-closed：git worktree add 失败默认抛错不降级（原始 stderr + 处置指引），
 *    无 meta 落盘、主仓分支不动。
 * 2. FR-02 同意路由：local.yaml worktree.fallback: allow / opts.allowInPlace 均路由到降级；
 *    降级 checkout 失败 fail-closed（meta 未落盘——凭证不先于隔离态成立）。
 * 3. FR-02 switchMainToWorktreeBranch 直测：新建分支 checkout -b / 既有分支 checkout /
 *    baseHash≠HEAD 跳过；工作区 dirty 文件保留。
 * 4. FR-02 meta 留痕：explicit/fallbackReason 落盘；旧调用形态（不传新字段）meta 零漂移。
 *
 * 确定性失败手法：changeName 以 `.lock` 结尾——git 拒绝以 .lock 结尾的分支名（refs 命名保留
 * 段），`git worktree add -b sillyspec/<名>.lock` 必败；validateChangeName 放行该字符。
 * 跨平台（Windows/Linux/macOS）无需权限/沙箱技巧。若未来 validateChangeName 收紧字符集，
 * 改用 `~` 类 git 非法字符即可（场景同构）。
 *
 * 设计依据：.sillyspec/changes/2026-11-23-worktree-fallback-consent/design.md。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { WorktreeManager, switchMainToWorktreeBranch } from '../src/worktree.js'

const tmpRoots = []
function mk(p) { const d = mkdtempSync(join(tmpdir(), p)); tmpRoots.push(d); return d }
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch { /* Windows 偶发占用 */ } } })

function git(dir, args) {
  const r = spawnSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`)
  return r.stdout.trim()
}

function mkRepo(prefix) {
  const root = mk(prefix)
  git(root, ['init', '-q'])
  git(root, ['config', 'user.name', 't'])
  git(root, ['config', 'user.email', 't@t'])
  // .sillyspec/ 忽略是 create 前置门（checkWorktreeDirIgnored：未忽略即阻断）
  writeFileSync(join(root, '.gitignore'), '.sillyspec/\n')
  git(root, ['add', '.gitignore'])
  git(root, ['commit', '-q', '-m', 'init'])
  return root
}

const currentBranch = (root) => git(root, ['symbolic-ref', '--short', 'HEAD'])

// ── 1. FR-01：fail-closed 缺省 ──
test('FR-01 add 失败默认抛错不降级：原始指引在场、无 meta、主仓分支不动', () => {
  const root = mkRepo('wfc-block-')
  const wm = new WorktreeManager({ cwd: root })
  const before = currentBranch(root)
  assert.throws(
    () => wm.create('t1-bad.lock'),
    (e) => {
      assert.match(e.message, /不降级 in-place——主仓直写需显式同意/, '缺省拒绝语义在场')
      assert.match(e.message, /worktree doctor --fix/, '处置指引 1：doctor')
      assert.match(e.message, /git branch -D sillyspec\/t1-bad\.lock/, '处置指引 2：遗留分支')
      assert.match(e.message, /--allow-in-place/, '处置指引 3：显式同意出口')
      assert.match(e.message, /worktree\.fallback: allow/, '常备同意配置指引')
      assert.ok(!/可能是沙箱权限限制/.test(e.message), '不再硬编码归因猜测')
      return true
    },
    'worktree add 失败（.lock 分支名非法）默认 fail-closed'
  )
  assert.equal(existsSync(join(wm.worktreeBase, 't1-bad.lock', 'meta.json')), false, '无 in-place meta 落盘')
  assert.equal(currentBranch(root), before, '主仓分支不动（不切专用分支也不占用户分支）')
})

// ── 2. FR-02：同意路由（policy / flag 双通道）+ checkout 失败 fail-closed ──
test('FR-02 policy allow 路由到降级：checkout 失败 fail-closed、meta 未落盘', () => {
  const root = mkRepo('wfc-allow-')
  mkdirSync(join(root, '.sillyspec'), { recursive: true })
  writeFileSync(join(root, '.sillyspec', 'local.yaml'), 'worktree:\n  fallback: allow\n')
  const wm = new WorktreeManager({ cwd: root })
  assert.throws(
    () => wm.create('t2-bad.lock'),
    (e) => {
      assert.match(e.message, /in-place 降级 checkout 专用分支 sillyspec\/t2-bad\.lock 失败/, 'checkout 失败语义')
      assert.match(e.message, /meta 未落盘/, 'fail-closed 留痕')
      assert.ok(!/不降级 in-place——主仓直写需显式同意/.test(e.message), '已过同意门（非门口拒绝）')
      return true
    },
    '同意降级后 checkout 失败（.lock 非法分支名）fail-closed'
  )
  assert.equal(existsSync(join(wm.worktreeBase, 't2-bad.lock', 'meta.json')), false, '授权 meta 未落盘（凭证不先于隔离态成立）')
})

test('FR-02 opts.allowInPlace 显式 flag 同效路由（无 local.yaml 配置）', () => {
  const root = mkRepo('wfc-flag-')
  const wm = new WorktreeManager({ cwd: root })
  assert.throws(
    () => wm.create('t3-bad.lock', { allowInPlace: true }),
    (e) => {
      assert.match(e.message, /in-place 降级 checkout 专用分支/, 'flag 同意路由到降级 checkout')
      assert.ok(!/不降级 in-place——主仓直写需显式同意/.test(e.message), 'flag 已过同意门')
      return true
    },
    'opts.allowInPlace 与 policy 同效'
  )
  assert.equal(existsSync(join(wm.worktreeBase, 't3-bad.lock', 'meta.json')), false, 'checkout 失败同样不落 meta')
})

// ── 3. FR-02：switchMainToWorktreeBranch 直测（幸福路径）──
test('FR-02 switchMainToWorktreeBranch：新建/既有分支切换 + baseHash 不等跳过 + dirty 保留', () => {
  const root = mkRepo('wfc-sw-')
  const head = git(root, ['rev-parse', 'HEAD'])
  writeFileSync(join(root, 'dirty.txt'), 'wip')

  // a) 分支不存在 + HEAD==baseHash → checkout -b；dirty 文件保留
  const r1 = switchMainToWorktreeBranch(root, 'sillyspec/sw-a', head)
  assert.deepEqual(r1, { skipped: false, created: true }, '新建专用分支')
  assert.equal(currentBranch(root), 'sillyspec/sw-a', '主仓已切到专用分支')
  assert.equal(readFileSync(join(root, 'dirty.txt'), 'utf8'), 'wip', '工作区 dirty 文件保留')

  // b) 分支已存在（adopt 场景）→ checkout 既有分支
  git(root, ['checkout', '-q', '-b', 'other'])
  const r2 = switchMainToWorktreeBranch(root, 'sillyspec/sw-a', head)
  assert.deepEqual(r2, { skipped: false, created: false }, '既有专用分支 checkout')
  assert.equal(currentBranch(root), 'sillyspec/sw-a', '切回既有专用分支')

  // c) baseHash ≠ 当前 HEAD（--base 显式指定形态）→ 跳过不切
  writeFileSync(join(root, 'f2.txt'), 'x')
  git(root, ['add', 'f2.txt'])
  git(root, ['commit', '-q', '-m', 'second'])
  const r3 = switchMainToWorktreeBranch(root, 'sillyspec/sw-b', head)
  assert.deepEqual(r3, { skipped: true }, 'baseHash 不匹配跳过')
  assert.equal(currentBranch(root), 'sillyspec/sw-a', '分支不动（交人判断）')
})

// ── 4. FR-02：meta 留痕字段 ──
test('FR-02 meta 留痕：explicit/fallbackReason 落盘；旧调用形态零漂移', () => {
  const root = mkRepo('wfc-meta-')
  const wm = new WorktreeManager({ cwd: root })
  const head = git(root, ['rev-parse', 'HEAD'])
  wm._createInPlaceMeta('t5-x', {
    worktreePath: root, branch: 'sillyspec/t5-x', baseBranch: 'master', baseHash: head,
    mode: 'in-place-fallback', explicit: true, fallbackReason: 'fatal: boom',
  })
  const meta = JSON.parse(readFileSync(join(wm.worktreeBase, 't5-x', 'meta.json'), 'utf8'))
  assert.equal(meta.mode, 'in-place-fallback')
  assert.equal(meta.explicit, true, '显式同意标记落盘')
  assert.equal(meta.fallbackReason, 'fatal: boom', '原始错误留痕')

  // 旧形态（不传新字段）：meta 不出现新键（既有消费方零漂移）
  wm._createInPlaceMeta('t5-y', {
    worktreePath: root, branch: 'sillyspec/t5-y', baseHash: head, mode: 'in-place-fallback',
  })
  const metaY = JSON.parse(readFileSync(join(wm.worktreeBase, 't5-y', 'meta.json'), 'utf8'))
  assert.equal('explicit' in metaY, false, '旧形态无 explicit 键')
  assert.equal('fallbackReason' in metaY, false, '旧形态无 fallbackReason 键')
})
