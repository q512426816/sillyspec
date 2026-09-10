/**
 * EXCLUDE-DIRTY 自动三方合并（坑 apply-dirty-block-no-merge，2026-09-10 驾驭小结第六批③，
 * 用户实证 daemon.ts 需手工 patch 合并）。
 *
 * 锁定语义（真实 git worktree + 真实 applyWorktree）：
 *   - 主仓脏改动与 worktree 交付改**不同区域** → merge-file clean → 主仓文件 = 两侧并集，
 *     apply 不再拦截（mergedDirtyFiles 审计留痕），剩余文件正常走 patch
 *   - 两侧改**同一行** → 冲突 → 维持原拦截（errors 含「仍冲突」）+ 主仓文件未被触碰
 *   - 纯函数 mergeDirtyOverlapThreeWay：clean/冲突分桶
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { spawnSync } from 'node:child_process'
import { mergeDirtyOverlapThreeWay, applyWorktree } from '../src/worktree-apply.js'

const tmpRoots = []
function mk(p) { const d = mkdtempSync(join(tmpdir(), p)); tmpRoots.push(d); return d }
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

function git(dir, args) {
  const r = spawnSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`)
  return r.stdout.trim()
}

/** 场景工厂：主仓（含 base 文件）+ 真实 worktree；dirtyContent/wtContent 写入同文件 */
function setup({ file, base, main, wt }) {
  const proj = mk('tw3-')
  git(proj, ['init', '-q'])
  git(proj, ['config', 'user.email', 't@t.local']); git(proj, ['config', 'user.name', 't'])
  writeFileSync(join(proj, '.gitignore'), '.sillyspec/\n')
  writeFileSync(join(proj, file), base)
  git(proj, ['add', '.']); git(proj, ['commit', '-q', '-m', 'base'])
  const baseHash = git(proj, ['rev-parse', 'HEAD'])
  const wtDir = mk('tw3-wt-'); rmSync(wtDir, { recursive: true, force: true })
  git(proj, ['worktree', 'add', '-q', wtDir, '-b', 'wt-branch'])
  // 主仓在途（不提交）+ worktree 交付（不提交，apply 按 worktree working tree 取 diff）
  writeFileSync(join(proj, file), main)
  writeFileSync(join(wtDir, file), wt)
  // meta（真实 worktree 模式）
  const specBase = join(proj, '.sillyspec')
  const metaDir = join(specBase, '.runtime', 'worktrees', 'c1')
  mkdirSync(metaDir, { recursive: true })
  writeFileSync(join(metaDir, 'meta.json'), JSON.stringify({
    changeName: 'c1', baseHash, baselineCommit: baseHash, baselineHash: baseHash, mode: 'native-worktree', worktreePath: wtDir,
  }))
  return { proj, wtDir, baseHash, file }
}

test('不同区域改动 → clean 三方合并写回（两侧并集），apply 放行', () => {
  const file = 'daemon.ts'
  const base = 'import x from "x"\n\nfunction a() {\n  return 1\n}\n\nfunction b() {\n  return 2\n}\n'
  const main = 'import x from "x"\n\nfunction a() {\n  return 100  // 并行会话改的\n}\n\nfunction b() {\n  return 2\n}\n'
  const wt = 'import x from "x"\n\nfunction a() {\n  return 1\n}\n\nfunction b() {\n  return 200  // 本变更交付\n}\n'
  const { proj, baseHash, wtDir } = setup({ file, base, main, wt })

  const m = mergeDirtyOverlapThreeWay({ projectRoot: proj, worktreePath: wtDir, baseHash }, [file])
  assert.deepEqual(m.merged, [file], 'clean 合并进 merged 桶')
  assert.deepEqual(m.conflicts, [], '无冲突')
  const after = readFileSync(join(proj, file), 'utf8')
  assert.ok(after.includes('return 100') && after.includes('return 200'), '合并结果含两侧改动（100=主仓在途、200=worktree 交付），实际：' + after)

  // 端到端：applyWorktree 默认路径不再被 EXCLUDE-DIRTY 拦（merged 文件已从 patch 集剔除视为已应用）
  const r = applyWorktree('c1', { cwd: proj })
  assert.equal(r.ok, true, 'apply 放行（errors=' + JSON.stringify((r.errors || []).map(e => e.slice(0, 80))) + '）')
  assert.ok((r.mergedDirtyFiles || []).includes(file), 'mergedDirtyFiles 审计留痕')
})

test('同一行改动 → 冲突维持拦截，主仓未被触碰', () => {
  const file = 'svc.ts'
  const base = 'const v = 1\n'
  const main = 'const v = 2  // 主仓在途\n'
  const wt = 'const v = 3  // worktree 交付\n'
  const { proj } = setup({ file, base, main, wt })

  const r = applyWorktree('c1', { cwd: proj })
  assert.equal(r.ok, false, '冲突 → 维持拦截')
  assert.ok((r.errors || []).some(e => e.includes('仍冲突')), 'error 明示三方合并后仍冲突')
  assert.equal(readFileSync(join(proj, file), 'utf8'), main, '主仓在途文件未被触碰（不留半合并现场）')
})

test('checkOnly（assess 只读）不试合并——零写盘', () => {
  const file = 'ro.ts'
  const base = 'const a = 1\nconst b = 2\n'
  const main = 'const a = 11\nconst b = 2\n'
  const wt = 'const a = 1\nconst b = 22\n'
  const { proj } = setup({ file, base, main, wt })
  const r = applyWorktree('c1', { cwd: proj, checkOnly: true })
  assert.equal(readFileSync(join(proj, file), 'utf8'), main, 'checkOnly 不写回（合并只在真实 apply 试）')
})
