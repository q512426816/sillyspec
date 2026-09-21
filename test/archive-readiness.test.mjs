/**
 * P3 归档就绪度前置（2026-09-21-r5-efficiency-batch3 task-04，FR-03 / D-003@v1）
 *
 * 锁死契约：
 * R1 有交付面：face 报告 + manifest 缺行草拟（design 清单外文件）+ module-impact 归因草拟（矩阵外文件）
 * R2 基线老化四态：main 前进∩交付交集→agingHit=true；前进无交集/未前进→false
 * R3 无 worktree（meta 缺/in-place/native）→ 全空零输出
 * R4 面空（已 apply）→ 全空零输出（零噪音钉）
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { buildArchiveReadinessReport } from '../src/run/gates.js'

const roots = []
function mk(p) { const d = mkdtempSync(join(tmpdir(), p)); roots.push(d); return d }
test.after(() => { for (const d of roots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

const git = (cwd, args) => execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8' })

function initProj() {
  const proj = mk('readiness-')
  const specBase = join(proj, '.sillyspec')
  mkdirSync(specBase, { recursive: true })
  writeFileSync(join(proj, '.gitignore'), '.sillyspec/\n')
  writeFileSync(join(proj, 'main.js'), 'console.log(1)\n')
  git(proj, ['init', '-q']); git(proj, ['add', '.']); git(proj, ['commit', '-qm', 'init'])
  return { proj, specBase }
}

function makeWorktreeLike({ proj, specBase, changeName = 'c1' }) {
  const baseHash = git(proj, ['rev-parse', 'HEAD']).trim()
  const wtPath = join(proj, 'wt-fake')
  mkdirSync(wtPath, { recursive: true })
  // 伪造 worktree 分支形态：在 wtPath 下建独立 git 仓库不可行（applyWorktree 需真 worktree）——
  // 用主仓分支 + meta 指向的简化形态：meta.worktreePath 指向真实 git worktree
  execFileSync('git', ['-C', proj, 'worktree', 'add', '-q', '-b', 'sillyspec/' + changeName, wtPath], { stdio: 'ignore' })
  const wtMeta = join(specBase, '.runtime', 'worktrees', changeName)
  mkdirSync(wtMeta, { recursive: true })
  writeFileSync(join(wtMeta, 'meta.json'), JSON.stringify({
    changeName, baseHash, baselineCommit: baseHash, branch: 'sillyspec/' + changeName,
    baseBranch: 'main', mode: 'worktree', worktreePath: wtPath,
  }))
  const changeDir = join(specBase, 'changes', changeName)
  mkdirSync(join(changeDir, 'tasks'), { recursive: true })
  writeFileSync(join(changeDir, 'design.md'), ['# 设计', '', '## 文件变更清单', '', '| 操作 | 文件路径 | 说明 |', '|---|---|---|', '| 修改 | src-claimed.js | 已声明 |', ''].join('\n'))
  writeFileSync(join(changeDir, 'module-impact.md'), ['# 模块影响分析', '', '| 模块 | 变更文件 |', '|---|---|', '| x | src-claimed.js |', ''].join('\n'))
  return { wtPath, changeDir, baseHash }
}

test('R1 有交付面：face+双草拟（清单外/矩阵外文件被点名）', async () => {
  const { proj, specBase } = initProj()
  const { wtPath } = makeWorktreeLike({ proj, specBase })
  // worktree 分支交付两个文件：一个 design 已声明、一个未声明（草拟应只点未声明）
  writeFileSync(join(wtPath, 'src-claimed.js'), 'export const a = 1\n')
  writeFileSync(join(wtPath, 'src-unlisted.js'), 'export const b = 2\n')
  git(wtPath, ['add', '.']); git(wtPath, ['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'deliv'])
  const r = await buildArchiveReadinessReport({ cwd: proj, changeName: 'c1', progress: null, specBase })
  assert.equal(r.face.length, 2, 'R1: 交付面 2 文件')
  assert.deepEqual(r.manifestGaps.sort(), ['src-unlisted.js'], 'R1: manifest 草拟只点清单外文件')
  assert.ok(r.impactUnlisted.includes('src-unlisted.js') && !r.impactUnlisted.includes('src-claimed.js'), 'R1: impact 草拟只点矩阵外文件')
})

test('R2 基线老化四态：前进∩交集→true；前进无交集/未前进→false', async () => {
  // 态 1+2：main 前进（一个撞交付文件、一个不撞）
  const { proj, specBase } = initProj()
  const { wtPath } = makeWorktreeLike({ proj, specBase })
  writeFileSync(join(wtPath, 'src-claimed.js'), 'export const a = 1\n')
  git(wtPath, ['add', '.']); git(wtPath, ['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'd'])
  // main 前进：改 main.js（不撞交付）→ false
  writeFileSync(join(proj, 'main.js'), 'console.log(2)\n')
  git(proj, ['add', '.']); git(proj, ['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'advance-no-overlap'])
  const r1 = await buildArchiveReadinessReport({ cwd: proj, changeName: 'c1', progress: null, specBase })
  assert.equal(r1.agingHit, false, 'R2: 前进无交集 → false')
  // main 再前进：改 src-claimed.js（撞交付）→ true
  writeFileSync(join(proj, 'src-claimed.js'), 'export const a = 999 // 并行改\n')
  git(proj, ['add', '.']); git(proj, ['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'advance-overlap'])
  const r2 = await buildArchiveReadinessReport({ cwd: proj, changeName: 'c1', progress: null, specBase })
  assert.equal(r2.agingHit, true, 'R2: 前进∩交付交集 → true（batch2 118bb92f 形态）')

  // 态 3：未前进（新项目重造，交付后 main 不动）→ false
  const p2 = initProj()
  const w2 = makeWorktreeLike({ proj: p2.proj, specBase: p2.specBase })
  writeFileSync(join(w2.wtPath, 'src-claimed.js'), 'x\n')
  git(w2.wtPath, ['add', '.']); git(w2.wtPath, ['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'd'])
  const r3 = await buildArchiveReadinessReport({ cwd: p2.proj, changeName: 'c1', progress: null, specBase: p2.specBase })
  assert.equal(r3.agingHit, false, 'R2: main 未前进 → false')
})

test('R3+R4 无 worktree→全空；面空（交付已在 main）→全空零噪音', async () => {
  const { proj, specBase } = initProj()
  // R3: 无 meta
  const r3 = await buildArchiveReadinessReport({ cwd: proj, changeName: 'nope', progress: null, specBase })
  assert.deepEqual(r3, { face: [], manifestGaps: [], impactUnlisted: [], agingHit: false }, 'R3: 无 worktree 全空')

  // R4: 有 worktree 但分支与 main 同内容（无交付）→ 全空
  const { wtPath } = makeWorktreeLike({ proj, specBase })
  const r4 = await buildArchiveReadinessReport({ cwd: proj, changeName: 'c1', progress: null, specBase })
  assert.equal(r4.face.length, 0, 'R4: 无交付面 → 空（零输出钉）')
})
