/**
 * verify 门隔离快照定向跑（2026-09-10 驾驭小结第八批，用户第二次真实阻塞：CLI 门跑在
 * main 工作区，多会话并发任何人的 WIP 都能弄红别人的门）。
 *
 * 锁定语义（真实 git worktree + 真实 meta）：
 *   - createVerifyGateSnapshot：变更文件集经 resolveVerifyChangedFiles（worktree-aware），
 *     overlay 源=worktree 根（native-worktree meta）——「--worktree 定向跑」等价：快照含
 *     本变更 worktree 版本文件 + 变更文档（module-impact.md 等），**不含**主仓他者脏文件
 *   - in-place meta → overlay 源退主仓 cwd（本变更 working-tree 文件照进，他者文件不进）
 *   - 非 git / 无变更文件集 → null（fallback 主仓现行为）
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { spawnSync } from 'node:child_process'
import { createVerifyGateSnapshot } from '../src/run/gate-snapshot.js'

const tmpRoots = []
function mk(p) { const d = mkdtempSync(join(tmpdir(), p)); tmpRoots.push(d); return d }
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

function git(dir, args) {
  const r = spawnSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`)
  return r.stdout.trim()
}

function setupBase(proj, mode) {
  git(proj, ['init', '-q'])
  git(proj, ['config', 'user.email', 't@t.local']); git(proj, ['config', 'user.name', 't'])
  writeFileSync(join(proj, '.gitignore'), '.sillyspec/\n')
  mkdirSync(join(proj, 'src'), { recursive: true })
  writeFileSync(join(proj, 'src', 'feature.js'), 'export const f = 1\n')
  git(proj, ['add', '.']); git(proj, ['commit', '-q', '-m', 'init'])
  const baseHash = git(proj, ['rev-parse', 'HEAD'])
  const specBase = join(proj, '.sillyspec')

  let wtDir = null
  if (mode === 'native') {
    wtDir = mk('vgs-wt-'); rmSync(wtDir, { recursive: true, force: true })
    git(proj, ['worktree', 'add', '-q', wtDir, '-b', 'wt-branch'])
    // 本变更交付（worktree 内未提交——apply 前形态）
    writeFileSync(join(wtDir, 'src', 'feature.js'), 'export const f = 2 // 本变更交付\n')
    writeFileSync(join(wtDir, 'src', 'feature.test.js'), 'test("f2", () => {})\n')
  }
  const metaDir = join(specBase, '.runtime', 'worktrees', 'c1')
  mkdirSync(metaDir, { recursive: true })
  writeFileSync(join(metaDir, 'meta.json'), JSON.stringify(mode === 'native'
    ? { changeName: 'c1', baseHash, baselineCommit: baseHash, mode: 'native-worktree', worktreePath: wtDir }
    : { changeName: 'c1', baseHash, mode: 'in-place-fallback', worktreePath: proj }))

  // 变更文档（module-impact.md 随快照复制——test_strategy 消费）
  mkdirSync(join(specBase, 'changes', 'c1'), { recursive: true })
  writeFileSync(join(specBase, 'changes', 'c1', 'module-impact.md'), '# 模块影响\n')

  // local.yaml（快照 cfg 段复制源）
  writeFileSync(join(specBase, 'local.yaml'), '# empty\n')
  return { specBase, baseHash, wtDir }
}

test('native worktree：快照含本变更 worktree 版本 + 变更文档，不含主仓他者脏文件', async () => {
  const proj = mk('vgs-main-')
  const { specBase, wtDir } = setupBase(proj, 'native')
  // 并行会话污染（主仓在途脏坏文件——旧路径实测必被弄红）
  writeFileSync(join(proj, 'src', 'foreign-wip.js'), 'const broken = {{{\n')

  const snap = await createVerifyGateSnapshot({ cwd: proj, changeName: 'c1', specBase })
  assert.ok(snap, '快照创建成功')
  assert.equal(snap.sourceRoot, wtDir, 'overlay 源=worktree 根（--worktree 定向跑）')
  try {
    assert.ok(existsSync(join(snap.snapshotRoot, 'src', 'feature.js')), '本变更文件进快照')
    assert.equal(readFileSync(join(snap.snapshotRoot, 'src', 'feature.js'), 'utf8'), 'export const f = 2 // 本变更交付\n',
      '内容是 worktree 版本（本变更分支内容）')
    assert.ok(existsSync(join(snap.snapshotRoot, 'src', 'feature.test.js')), '本变更新测试进快照')
    assert.ok(!existsSync(join(snap.snapshotRoot, 'src', 'foreign-wip.js')), '并行会话脏文件不进快照（门不被弄红的核心）')
    assert.ok(existsSync(join(snap.snapshotRoot, '.sillyspec', 'changes', 'c1', 'module-impact.md')), '变更文档随快照')
    assert.ok(existsSync(join(snap.snapshotRoot, '.sillyspec', 'local.yaml')), 'local.yaml 复制')
  } finally {
    snap.cleanup()
  }
})

test('in-place meta：overlay 源退主仓；他者显式声明的文件剔除，无主文件保留（fail-closed）', async () => {
  const proj = mk('vgs-ip-')
  const { specBase } = setupBase(proj, 'inplace')
  // 本变更 working-tree 改动
  writeFileSync(join(proj, 'src', 'feature.js'), 'export const f = 3 // 本变更 in-place\n')
  // 他者活跃变更显式声明的脏文件（quick --files / design 清单口径）
  const otherDir = join(specBase, 'changes', 'other-change')
  mkdirSync(otherDir, { recursive: true })
  writeFileSync(join(otherDir, 'design.md'), '# D\n\n## 文件变更清单\n\n| 文件 | 操作 |\n|------|------|\n| src/declared-foreign.js | 修改 |\n')
  writeFileSync(join(proj, 'src', 'declared-foreign.js'), 'const x = 1\n')
  // 无主脏文件（未被任何变更声明——fail-closed 保留，可能是本变更自己的未声明改动）
  writeFileSync(join(proj, 'src', 'ownerless-wip.js'), 'const y = 2\n')

  const snap = await createVerifyGateSnapshot({ cwd: proj, changeName: 'c1', specBase })
  assert.ok(snap, 'in-place 快照可用')
  assert.equal(snap.sourceRoot, null, 'overlay 源=主仓 cwd（in-place 无 worktree）')
  try {
    assert.equal(readFileSync(join(snap.snapshotRoot, 'src', 'feature.js'), 'utf8'), 'export const f = 3 // 本变更 in-place\n',
      '本变更 working-tree 文件进快照')
    assert.ok(!existsSync(join(snap.snapshotRoot, 'src', 'declared-foreign.js')),
      '他者显式声明的文件剔除（归属可判——多会话并发的主场景）')
    assert.ok(existsSync(join(snap.snapshotRoot, 'src', 'ownerless-wip.js')),
      '无主文件保留（fail-closed：无法排除是本变更自己的未声明改动）')
  } finally { snap.cleanup() }
})

test('非 git / 无变更文件集 → null（fallback 主仓现行为）', async () => {
  const plain = mk('vgs-nogit-')
  assert.equal(await createVerifyGateSnapshot({ cwd: plain, changeName: 'c1', specBase: join(plain, '.sillyspec') }), null,
    '非 git 环境 → null')
  // git 仓但无 meta 无 diff（变更文件集空）→ null
  const proj = mk('vgs-empty-')
  setupBase(proj, 'nometa')
  const metaFile = join(proj, '.sillyspec', '.runtime', 'worktrees', 'c1', 'meta.json')
  rmSync(metaFile, { force: true })
  assert.equal(await createVerifyGateSnapshot({ cwd: proj, changeName: 'c1', specBase: join(proj, '.sillyspec') }), null,
    '无变更文件集 → null（无从定向）')
})

test('native 收养态（meta 缺席、cwd 即 linked worktree）：untracked 新文件内容进快照——回放摩擦#5 永久钉', async () => {
  const proj = mk('vgs-adopt-')
  const { specBase, wtDir } = setupBase(proj, 'native')
  // 回放 2026-09-18 摩擦#5 形态：worktree 收养但不写 meta.json，verify --done 在 worktree 内跑。
  // 修复前（e47ab3a 之前）untracked 新文件不进 resolveVerifyChangedFiles 文件集 → 快照 overlay
  // 漏拷 → 快照内 import 该文件 ERR_MODULE_NOT_FOUND 裸崩；修复链=native 分支 porcelain
  // --untracked-files=all 并入（resolve 层 §5/§5b 已钉，本测试钉快照层端到端）
  rmSync(join(specBase, '.runtime', 'worktrees', 'c1', 'meta.json'), { force: true })
  const snap = await createVerifyGateSnapshot({ cwd: wtDir, changeName: 'c1', specBase: join(wtDir, '.sillyspec') })
  assert.ok(snap, 'native 收养态快照可用（文件集经 native 分支含 untracked）')
  try {
    assert.equal(snap.sourceRoot, null, 'overlay 源=cwd（worktree 自身，meta 缺席不切源）')
    assert.ok(existsSync(join(snap.snapshotRoot, 'src', 'feature.test.js')),
      'untracked 新文件进快照（NEW: 未 commit 形态——摩擦#5 的 ERR_MODULE_NOT_FOUND 守卫）')
    assert.equal(readFileSync(join(snap.snapshotRoot, 'src', 'feature.test.js'), 'utf8'), 'test("f2", () => {})\n',
      'untracked 新文件内容是工作区版本（非 HEAD 缺席态）')
    assert.equal(readFileSync(join(snap.snapshotRoot, 'src', 'feature.js'), 'utf8'), 'export const f = 2 // 本变更交付\n',
      '未提交修改 overlay 工作区版本')
  } finally { snap.cleanup() }
})
