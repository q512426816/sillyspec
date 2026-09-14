/**
 * ql-20260915-001 —— 四个工具摩擦点修复的测试（① EXCLUDE-MISMATCH 前置三方合并、
 * ④ 归档自动 git add 收窄）。②③ 的用例分别在既有文件补：
 *   ② → test/execute-batch-zero-diff.test.mjs（显式 review write 豁免 + 草稿警告可行动）
 *   ③ → test/stage-review.test.mjs（schema 错误消息含本 stage 期望值）
 *
 * ① 背景（坑 apply-archived-mismatch-no-merge，2026-09-14 用户实证）：归档后补 apply，主仓
 *   文件已被并行会话提交推进 → rescue EXCLUDE-MISMATCH 跳过不落地，被迫手工 cp+锚点合并。
 *   锁定语义（真实 git 临时仓 + 真实 applyWorktree）：
 *     - 主仓已提交推进 + worktree 交付改**不同区域** → 前置三方合并 clean → 写回+暂存+落盘
 *       两侧增量都在（mergedMismatchFiles 审计留痕），apply 不再跳过该文件
 *     - **同区域**冲突 → 不写回（fail-closed），dirty 拦截路径的 rescue 里该文件仍走
 *       EXCLUDE-MISMATCH，但文案更新为「已尝试自动三方合并，冲突」+ 两条出路
 *     - checkOnly（assess 只读）零写盘不试合并
 *     - 纯函数 mergeMismatchThreeWay：clean/冲突分桶 + CRLF theirs 归一（autocrlf 假冲突防）
 *
 * ④ 背景（坑 archive-git-add-sweeps-parallel-docs，2026-09-14 用户实证）：归档自动 git add 用
 *   目录级 pathspec（.sillyspec/changes/archive/ 与 .sillyspec/docs/）夹带并行会话同目录未提交
 *   文件进共享暂存区。锁定语义：
 *     - changes 侧只 add 本变更归档目录 archive/<destName>/
 *     - docs 侧按 module-impact「## 更新结果」done 行精确文件集（modules/x.md 相对写法扫各
 *       project 的 modules/ 目录解析、全路径直接用）——归档 A 时 B 的未提交 docs 文件不被 add
 *     - 无「## 更新结果」表 → 回退目录级 add（旧行为），但前置 warning 列将被扫入的未提交文件
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { spawnSync } from 'node:child_process'
import { mergeMismatchThreeWay, applyWorktree } from '../src/worktree-apply.js'
import { resolveArchiveDocAddPaths, archiveNarrowedGitAdd } from '../src/run/complete-handlers.js'
import { archiveDestDirName } from '../src/stage-contract.js'

const tmpRoots = []
function mk(p) { const d = mkdtempSync(join(tmpdir(), p)); tmpRoots.push(d); return d }
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

function git(dir, args) {
  const r = spawnSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`)
  return r.stdout.trim()
}

/** 场景工厂：主仓（base 文件）+ 真实 worktree + c1 meta（真实 worktree 模式） */
function setup(files) {
  const proj = mk('tfx-')
  git(proj, ['init', '-q'])
  git(proj, ['config', 'user.email', 't@t.local']); git(proj, ['config', 'user.name', 't'])
  writeFileSync(join(proj, '.gitignore'), '.sillyspec/\n')
  for (const [file, base] of Object.entries(files)) {
    mkdirSync(dirnameSafe(proj, file), { recursive: true })
    writeFileSync(join(proj, file), base)
  }
  git(proj, ['add', '.']); git(proj, ['commit', '-q', '-m', 'base'])
  const baseHash = git(proj, ['rev-parse', 'HEAD'])
  const wtDir = mk('tfx-wt-'); rmSync(wtDir, { recursive: true, force: true })
  git(proj, ['worktree', 'add', '-q', wtDir, '-b', 'wt-branch'])
  const specBase = join(proj, '.sillyspec')
  const metaDir = join(specBase, '.runtime', 'worktrees', 'c1')
  mkdirSync(metaDir, { recursive: true })
  writeFileSync(join(metaDir, 'meta.json'), JSON.stringify({
    changeName: 'c1', baseHash, baselineCommit: baseHash, baselineHash: baseHash, mode: 'native-worktree', worktreePath: wtDir,
  }))
  return { proj, wtDir, baseHash, specBase }
}
function dirnameSafe(root, file) {
  const parts = file.split('/')
  return parts.length > 1 ? join(root, ...parts.slice(0, -1)) : root
}
/** 主仓提交推进（EXCLUDE-MISMATCH 面：committed advance） */
function commitAdvance(proj, file, content, msg = 'main advance') {
  writeFileSync(join(proj, file), content)
  git(proj, ['add', '--', file]); git(proj, ['commit', '-q', '-m', msg])
}

// ══════════════════════════ 修复① ══════════════════════════

test('修复① 纯函数：不同区域 clean 合并（含 CRLF theirs 归一），同区域冲突分桶', () => {
  const file = 'svc.ts'
  const base = 'function a() {\n  return 1\n}\n\nfunction b() {\n  return 2\n}\n'
  const mainAdv = 'function a() {\n  return 100  // 主仓已提交推进\n}\n\nfunction b() {\n  return 2\n}\n'
  const wt = 'function a() {\n  return 1\n}\n\nfunction b() {\n  return 200  // worktree 交付\n}\n'
  const { proj, wtDir, baseHash } = setup({ [file]: base })
  commitAdvance(proj, file, mainAdv)
  writeFileSync(join(wtDir, file), wt)

  const m = mergeMismatchThreeWay({ projectRoot: proj, worktreePath: wtDir, baseHash }, [file])
  assert.deepEqual(m.merged, [file], 'clean 合并进 merged 桶')
  assert.deepEqual(m.conflicts, [], '无冲突')
  const after = readFileSync(join(proj, file), 'utf8')
  assert.ok(after.includes('return 100') && after.includes('return 200'), '合并结果含两侧增量（100=主仓 HEAD、200=worktree）')

  // CRLF theirs：worktree 磁盘 CRLF（autocrlf=true checkout 形态）vs base/ours blob LF——
  // 归一后仍 clean（未归一会逐行假冲突）。注：改动行须隔至少一行未变行——merge-file 对
  // 相邻行双侧改动按 xdiff 语义判冲突（非本函数缺陷，git 行为）
  const file2 = 'crlf.ts'
  const base2 = 'const a = 1\nconst mid = 0\nconst b = 2\n'
  const main2 = 'const a = 11\nconst mid = 0\nconst b = 2\n'
  const wt2crlf = 'const a = 1\r\nconst mid = 0\r\nconst b = 22\r\n'
  const { proj: p2, wtDir: w2, baseHash: bh2 } = setup({ [file2]: base2 })
  commitAdvance(p2, file2, main2, 'advance2')
  writeFileSync(join(w2, file2), wt2crlf)
  const m2 = mergeMismatchThreeWay({ projectRoot: p2, worktreePath: w2, baseHash: bh2 }, [file2])
  assert.deepEqual(m2.merged, [file2], 'CRLF theirs 归一后仍 clean（autocrlf 假冲突防）')
  assert.ok(readFileSync(join(p2, file2), 'utf8').includes('const b = 22'), 'CRLF 场景合并落盘含 worktree 增量')

  // 同区域冲突：不写回、进 conflicts
  const file3 = 'conf.ts'
  const { proj: p3, wtDir: w3, baseHash: bh3 } = setup({ [file3]: 'const v = 1\n' })
  commitAdvance(p3, file3, 'const v = 2  // 主仓已提交推进\n', 'advance3')
  writeFileSync(join(w3, file3), 'const v = 3  // worktree 交付\n')
  const m3 = mergeMismatchThreeWay({ projectRoot: p3, worktreePath: w3, baseHash: bh3 }, [file3])
  assert.deepEqual(m3.merged, [], '同区域冲突不写回')
  assert.deepEqual(m3.conflicts, [file3], '冲突进 conflicts 桶')
  assert.equal(readFileSync(join(p3, file3), 'utf8'), 'const v = 2  // 主仓已提交推进\n', '主仓文件未被触碰（不留半合并现场）')
})

test('修复① 端到端：主仓已提交推进 + worktree 改不同区域 → apply 前置合并落盘两侧增量', () => {
  const file = 'daemon.ts'
  const base = 'import x from "x"\n\nfunction a() {\n  return 1\n}\n\nfunction b() {\n  return 2\n}\n'
  const mainAdv = 'import x from "x"\n\nfunction a() {\n  return 100  // 并行会话已提交推进\n}\n\nfunction b() {\n  return 2\n}\n'
  const wt = 'import x from "x"\n\nfunction a() {\n  return 1\n}\n\nfunction b() {\n  return 200  // 本变更交付\n}\n'
  const { proj, wtDir } = setup({ [file]: base })
  commitAdvance(proj, file, mainAdv)
  writeFileSync(join(wtDir, file), wt)

  const r = applyWorktree('c1', { cwd: proj })
  assert.equal(r.ok, true, 'apply 放行（errors=' + JSON.stringify((r.errors || []).map(e => e.slice(0, 100))) + '）')
  assert.ok((r.mergedMismatchFiles || []).includes(file), 'mergedMismatchFiles 审计留痕')
  assert.ok(!r.hashMismatchFiles.includes(file), '已合并文件从 mismatch 集剔除')
  const after = readFileSync(join(proj, file), 'utf8')
  assert.ok(after.includes('return 100') && after.includes('return 200'), '落盘内容两侧增量都在')
  assert.ok((git(proj, ['diff', '--cached', '--name-only']) || '').split('\n').includes(file), '合并写回已暂存（批末 git add）')
})

test('修复① 端到端：同区域冲突 + dirty 拦截 → rescue 新文案（已尝试自动三方合并，冲突），主仓未被触碰', () => {
  const a = 'advance.ts'
  const b = 'dirty.ts'
  const files = { [a]: 'const a = 1\n', [b]: 'const b = 1\n' }
  const { proj, wtDir } = setup(files)
  // a：主仓已提交推进同区域（mismatch + 合并冲突）；b：主仓未提交脏改同区域（EXCLUDE-DIRTY 拦截触发 rescue）
  commitAdvance(proj, a, 'const a = 2  // 主仓已提交推进\n')
  writeFileSync(join(proj, b), 'const b = 2  // 主仓在途脏改\n')
  writeFileSync(join(wtDir, a), 'const a = 3  // worktree 交付\n')
  writeFileSync(join(wtDir, b), 'const b = 3  // worktree 交付\n')

  const r = applyWorktree('c1', { cwd: proj })
  assert.equal(r.ok, false, '同区域冲突 → 维持拦截（fail-closed）')
  assert.ok((r.errors || []).some(e => e.includes('仍冲突')), 'error 明示三方合并后仍冲突（dirty 面）')
  assert.ok(r.rescueCommands && r.rescueCommands.warnings.some(w =>
    w.includes(a) && w.includes('EXCLUDE-MISMATCH') && w.includes('已尝试自动三方合并，冲突')),
    'rescue 新文案：已尝试自动三方合并，冲突（实际：' + JSON.stringify(r.rescueCommands && r.rescueCommands.warnings) + '）')
  assert.equal(readFileSync(join(proj, a), 'utf8'), 'const a = 2  // 主仓已提交推进\n', '主仓已提交推进文件未被触碰')
  assert.equal(readFileSync(join(proj, b), 'utf8'), 'const b = 2  // 主仓在途脏改\n', '主仓脏文件未被触碰')
})

test('修复① checkOnly（assess 只读）不试合并——零写盘', () => {
  const file = 'ro.ts'
  const base = 'const a = 1\nconst b = 2\n'
  const mainAdv = 'const a = 11\nconst b = 2\n'
  const wt = 'const a = 1\nconst b = 22\n'
  const { proj, wtDir } = setup({ [file]: base })
  commitAdvance(proj, file, mainAdv)
  writeFileSync(join(wtDir, file), wt)
  const r = applyWorktree('c1', { cwd: proj, checkOnly: true })
  assert.equal(readFileSync(join(proj, file), 'utf8'), mainAdv, 'checkOnly 不写回（合并只在真实 apply 试）')
  assert.ok(!(r.mergedMismatchFiles || []).length, 'checkOnly 不产 mergedMismatchFiles')
})

// ══════════════════════════ 修复④ ══════════════════════════

/** 双变更归档场景工厂：A 已归档（archive/<destA>/，module-impact 有 done 行），B 在途（未提交 docs 文件） */
function setupArchiveRepo({ impactA }) {
  const proj = mk('arc-')
  git(proj, ['init', '-q'])
  git(proj, ['config', 'user.email', 't@t.local']); git(proj, ['config', 'user.name', 't'])
  const specBase = join(proj, '.sillyspec')
  const destNameA = archiveDestDirName(new Date().toISOString().slice(0, 10), '2026-09-15-chgA')
  const destDirA = join(specBase, 'changes', 'archive', destNameA)
  // B 会话在途基线（已提交）：B 的模块卡 v1 与 B 变更目录 plan
  mkdirSync(join(specBase, 'docs', 'proj1', 'modules'), { recursive: true })
  writeFileSync(join(specBase, 'docs', 'proj1', 'modules', 'modA.md'), '# A module v1\n')
  writeFileSync(join(specBase, 'docs', 'proj1', 'modules', 'modB.md'), '# B module v1\n')
  mkdirSync(join(specBase, 'changes', '2026-09-15-chgB'), { recursive: true })
  writeFileSync(join(specBase, 'changes', '2026-09-15-chgB', 'plan.md'), '# B plan\n')
  git(proj, ['add', '.']); git(proj, ['commit', '-q', '-m', 'seed'])
  // 未提交面（归档时刻的真实形态）：
  //   A 的归档目录（刚 rename 过来，untracked）、A/B 的模块卡改动（unstaged）、B 的新文件（untracked）
  mkdirSync(destDirA, { recursive: true })
  writeFileSync(join(destDirA, 'plan.md'), '# Plan\n')
  writeFileSync(join(destDirA, 'module-impact.md'), impactA)
  writeFileSync(join(specBase, 'docs', 'proj1', 'modules', 'modA.md'), '# A module v2\n')
  writeFileSync(join(specBase, 'docs', 'proj1', 'modules', 'modB.md'), '# B module v2（并行会话在途）\n')
  writeFileSync(join(specBase, 'changes', '2026-09-15-chgB', 'tasks.md'), '# B tasks\n')
  return { proj, specBase, destNameA, destDirA }
}

test('修复④ 归档 A 时 B 的未提交 docs 文件不被 add（窄化：archive/<destA>/ + module-impact done 行精确集）', () => {
  const impactA = [
    '# 模块影响分析', '',
    '## 更新结果', '',
    '| 目标 | 操作 | 状态 |', '|------|------|------|',
    '| `modules/modA.md` | 更新模块卡 | done |',
    '| `modules/modOther.md` | 不同步（说明原因） | skipped |',
    '', '规则：……', '',
  ].join('\n')
  const { proj, specBase, destNameA, destDirA } = setupArchiveRepo({ impactA })
  // modOther.md 不存在（skipped 行不收）——resolveArchiveDocAddPaths 保守跳过
  const r = archiveNarrowedGitAdd({ cwd: proj, specBase, destDir: destDirA, destName: destNameA })
  assert.equal(r.fallbackDocs, false, '有「## 更新结果」表 → 精确路径（不回退）')
  assert.deepEqual(r.docsAdded.sort(), ['.sillyspec/docs/proj1/modules/modA.md'], 'done 行解析出精确文件集')

  const staged = (git(proj, ['diff', '--cached', '--name-only']) || '').split('\n').filter(Boolean)
  assert.ok(staged.includes(`.sillyspec/changes/archive/${destNameA}/plan.md`), '本变更归档目录已暂存（changes 侧窄化）')
  assert.ok(staged.includes('.sillyspec/docs/proj1/modules/modA.md'), 'A 声明的模块卡已暂存（docs 侧精确）')
  assert.ok(!staged.includes('.sillyspec/docs/proj1/modules/modB.md'), 'B 会话在途模块卡未被扫入（修复点）')
  assert.ok(!staged.some(p => p.includes('2026-09-15-chgB')), 'B 会话在途变更目录未被扫入')
})

test('修复④ 全路径 token + 相对写法多项目命中；无「## 更新结果」表 → 回退目录级 + 前置 warning', () => {
  const { proj, specBase, destNameA, destDirA } = setupArchiveRepo({ impactA: '# 模块影响分析（无更新结果表）\n' })
  // 全路径 token 解析（纯函数面）
  const resolved = resolveArchiveDocAddPaths(proj, specBase, [
    '.sillyspec/docs/proj1/modules/modA.md',
    'modules/modB.md',
    'modules/nonexistent.md',
    '_module-map.yaml',
    '裸名无分隔符',
  ])
  assert.deepEqual(resolved.sort(), ['.sillyspec/docs/proj1/modules/modA.md', '.sillyspec/docs/proj1/modules/modB.md'],
    '全路径直接收 + modules/ 相对写法扫 docs/*/modules/ 命中；不存在/裸名不收')

  // 回退路径：无表 → 目录级 add（旧行为兜底）+ 前置 warning 列将被扫入的未提交文件
  const warns = []
  const origWarn = console.warn
  console.warn = (...a) => warns.push(a.join(' '))
  let r
  try {
    r = archiveNarrowedGitAdd({ cwd: proj, specBase, destDir: destDirA, destName: destNameA })
  } finally {
    console.warn = origWarn
  }
  assert.equal(r.fallbackDocs, true, '无表 → 回退目录级')
  assert.equal(r.docsAdded, null, '回退态无精确集')
  const warnText = warns.join('\n')
  assert.ok(warnText.includes('回退目录级'), 'warning 明示回退')
  assert.ok(warnText.includes('modB.md'), 'warning 列出将被扫入的他者文件（差集）')
  const staged = (git(proj, ['diff', '--cached', '--name-only']) || '').split('\n').filter(Boolean)
  assert.ok(staged.includes('.sillyspec/docs/proj1/modules/modB.md'), '回退态旧行为保留（目录级全收）')
})
