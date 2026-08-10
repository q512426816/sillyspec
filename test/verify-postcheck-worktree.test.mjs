/**
 * 防回归测试：verify 对账 worktree-aware 变更文件解析
 *
 * 坑 verify-worktree-mode-test-reconciliation-fallback-full：worktree 隔离模式下
 * 主仓只剩 .sillyspec/ 文档改动，旧 gitChangedFiles(cwd) 在主仓跑 `git diff --name-only HEAD`
 * 命不中代码模块 → hitCount=0 → 回退全量 → timeout/预存失败阻断 verify。
 *
 * resolveVerifyChangedFiles 改为：有 worktree meta + baseHash 时，在 worktree 跑
 * `git diff --name-only <baseHash>..HEAD` 取真实代码改动集；否则回退主仓原行为。
 *
 * 用真实 git 临时仓 + meta.json fixture 验证（meta 结构与 checkExecuteCodeEvidence 同源）。
 */
import { execSync } from 'child_process'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { resolveVerifyChangedFiles } from '../src/verify-postcheck.js'

let passed = 0
let failed = 0

function assert(name, cond, detail = '') {
  if (cond) {
    console.log(`✅ PASS: ${name}`)
    passed++
  } else {
    console.error(`❌ FAIL: ${name}${detail ? ' — ' + detail : ''}`)
    failed++
  }
}

function assertEqualUnsorted(name, actual, expected) {
  const norm = (a) => JSON.stringify((a || []).slice().sort())
  assert(name, norm(actual) === norm(expected), `actual=${JSON.stringify(actual)} expected=${JSON.stringify(expected)}`)
}

function git(cwd, args) {
  return execSync(`git ${args}`, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).toString()
}

function mkRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'verify-wt-'))
  git(dir, 'init -q')
  git(dir, 'config user.email t@t.t')
  git(dir, 'config user.name t')
  writeFileSync(join(dir, 'README.md'), 'base\n')
  git(dir, 'add -A')
  git(dir, 'commit -q -m base')
  return dir
}

function writeMeta(cwd, change, meta) {
  const metaDir = join(cwd, '.sillyspec', '.runtime', 'worktrees', change)
  mkdirSync(metaDir, { recursive: true })
  writeFileSync(join(metaDir, 'meta.json'), JSON.stringify(meta))
}

// ── 1. worktree meta + baseHash → baseHash..HEAD 真实代码改动集 ──
{
  const dir = mkRepo()
  try {
    const baseHash = git(dir, 'rev-parse HEAD').trim()
    mkdirSync(join(dir, 'backend'), { recursive: true })
    writeFileSync(join(dir, 'backend', 'foo.py'), 'x')
    mkdirSync(join(dir, 'frontend'), { recursive: true })
    writeFileSync(join(dir, 'frontend', 'page.tsx'), 'y')
    git(dir, 'add -A')
    git(dir, 'commit -q -m code')

    const change = '2026-07-28-test-change'
    writeMeta(dir, change, { baseHash, worktreePath: dir, mode: 'worktree' })

    const files = resolveVerifyChangedFiles(dir, change)
    assertEqualUnsorted(
      'worktree meta: 返回 baseHash..HEAD 代码改动集（backend+frontend，非 .sillyspec/ 文档）',
      files,
      ['backend/foo.py', 'frontend/page.tsx'],
    )
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

// ── 2. 无 worktree meta → brownfield 主仓 working tree diff（原行为）──
{
  const dir = mkRepo()
  try {
    mkdirSync(join(dir, 'backend'), { recursive: true })
    writeFileSync(join(dir, 'backend', 'x.py'), 'x')
    git(dir, 'add -A') // staged 未 commit → git diff --name-only HEAD 可见

    const files = resolveVerifyChangedFiles(dir, 'some-change-without-meta')
    assertEqualUnsorted(
      '无 meta: brownfield 主仓 working tree diff',
      files,
      ['backend/x.py'],
    )
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

// ── 3. meta 有 baseHash 但 worktreePath 不存在 → gitDir 回退 cwd，仍用 base..HEAD ──
{
  const dir = mkRepo()
  try {
    const baseHash = git(dir, 'rev-parse HEAD').trim()
    writeFileSync(join(dir, 'main.txt'), 'x')
    git(dir, 'add -A')
    git(dir, 'commit -q -m c')

    const change = 'c3'
    writeMeta(dir, change, { baseHash, worktreePath: '/nonexistent/path-xyz', mode: 'worktree' })

    const files = resolveVerifyChangedFiles(dir, change)
    assertEqualUnsorted(
      'worktreePath 无效: gitDir 回退 cwd 跑 base..HEAD',
      files,
      ['main.txt'],
    )
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

// ── 4. changeName=null → 直接走主仓原行为（不读 meta）──
{
  const dir = mkRepo()
  try {
    writeFileSync(join(dir, 'scratch.txt'), 'x')
    git(dir, 'add -A')

    const files = resolveVerifyChangedFiles(dir, null)
    assertEqualUnsorted(
      'changeName=null: 跳过 meta 直接主仓 working tree diff',
      files,
      ['scratch.txt'],
    )
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

// ── 5. baseline checkpoint：meta 有 baselineCommit → 用它做 base，排除 baseline overlay 文件 ──
// 坑 verify-worktree-baseline-basehash-wrong-module-detect：worktree + baseline checkpoint 模式下
// baseHash = pre-baseline（分支点），baselineCommit/actualBaseHash = post-baseline（含 baseline 同步
// 进来的他人跨模块 overlay 文件）。旧实现用 baseHash..HEAD 会把 overlay 文件全算进 verify diff
// → pickHitModules 命中无关模块（如 ppm-only 变更误测 daemon/frontend）→ 跑无关测试 → 撞 timeout
// 阻断 verify。修复：diff base 优先 baselineCommit || actualBaseHash || baseHash（与 task-review.js
// :694 / worktree.js:1108 / worktree-apply.js:169 同源）。
{
  const dir = mkRepo()
  try {
    const baseHash = git(dir, 'rev-parse HEAD').trim() // pre-baseline 分支点

    // 模拟 baseline checkpoint：同步他人/历史跨模块 overlay 文件（baseline 那一笔）
    mkdirSync(join(dir, 'daemon'), { recursive: true })
    writeFileSync(join(dir, 'daemon', 'svc.py'), 'overlay')
    mkdirSync(join(dir, 'frontend'), { recursive: true })
    writeFileSync(join(dir, 'frontend', 'page.tsx'), 'overlay')
    git(dir, 'add -A')
    git(dir, 'commit -q -m baseline-checkpoint')
    const baselineCommit = git(dir, 'rev-parse HEAD').trim() // post-baseline

    // 本 change 真实改动（ppm-only）
    mkdirSync(join(dir, 'backend', 'app', 'modules', 'ppm'), { recursive: true })
    writeFileSync(join(dir, 'backend', 'app', 'modules', 'ppm', 'owner.py'), 'real')
    git(dir, 'add -A')
    git(dir, 'commit -q -m real-change')

    const change = 'c5-baseline'
    writeMeta(dir, change, {
      baseHash,                       // pre-baseline（旧实现误用 → 会返回 3 文件）
      baselineCommit,                 // post-baseline（修复后优先用）
      actualBaseHash: baselineCommit, // 同义兜底（worktree.js 设值时两者同指 post-baseline）
      worktreePath: dir,
      mode: 'worktree',
    })

    const files = resolveVerifyChangedFiles(dir, change)
    assertEqualUnsorted(
      'baseline checkpoint: 用 baselineCommit 做 base，排除 overlay（只 ppm 真实改动，不含 daemon/frontend）',
      files,
      ['backend/app/modules/ppm/owner.py'],
    )
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

// ── 汇总 ─────────────────────────────────────────────────────────

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
console.log(`${'='.repeat(50)}`)

if (failed > 0) {
  console.error('\n💥 verify-postcheck worktree 对账测试有失败！')
  throw new Error('test failed')
} else {
  console.log('\n✅ 全部通过 — verify 对账 worktree-aware 解析 OK')
}
