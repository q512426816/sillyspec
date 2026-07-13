/**
 * quick baseline 脏工作区审计回归测试
 *
 * 对应 docs/sillyspec/quick-baseline-blocks-dirty-worktree.md：
 * 脏工作区（quick 启动前已存在大量预存脏文件）下，step3 变更边界审计误把预存脏文件
 * 当「本次 quick 违规」报，且 --force-baseline / --allow-new / --files 组合均无法降级。
 *
 * 修复（src/run.js auditQuickCompletion）：
 *   1. 审计扫描 git status 时跳过 step1 baseline 已记录的预存脏文件（baselineFilesSet）
 *      —— 否则预存文件持续在 git status → 命中 baselineFiles → 误判「覆盖 baseline」
 *   2. status 判定尊重 force-baseline（baselineHit）和 allow-new（newFiles）
 *      —— 原判定直接看数组长度，flag 只压 reasons 文案不降级 status
 *
 * ql-20260713-002-7628 追加修复：
 *   3. baseline 录入不再粗放过滤 .sillyspec/ —— 预存 untracked .sillyspec/changes/ 现进 baseline，
 *      audit 不再误判「危险+新增」（场景 8/9）
 *   4. --done 的 --force-baseline/--allow-new 并入 guard（原只传 {isConfirm}，flag 静默无效）
 *
 * 风格：自研 assert + mkdtemp 临时 git 仓库，参照 quick-session-isolation.test.mjs
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'

import { auditQuickCompletion } from '../src/run.js'

let total = 0
let failed = 0

function assert(condition, msg) {
  total++
  if (!condition) {
    failed++
    console.log(`  ❌ FAIL: ${msg}`)
  } else {
    console.log(`  ✅ PASS: ${msg}`)
  }
}

function git(dir, args) {
  return execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
}

function initGitRepo(dir) {
  git(dir, ['init', '-q'])
  git(dir, ['config', 'user.email', 'test@test.local'])
  git(dir, ['config', 'user.name', 'test'])
  git(dir, ['config', 'commit.gpgsign', 'false'])
  writeFileSync(join(dir, 'README.md'), 'init\n')
  // src/ 与 .sillyspec/quicklog 预先 commit：后续新增文件显示为文件级（?? src/db.js）而非
  // 目录级（?? src/，与 baselineFiles 文件级路径不匹配）；quicklog 元数据不进审计 newFiles
  mkdirSync(join(dir, 'src'), { recursive: true })
  writeFileSync(join(dir, 'src', '.gitkeep'), '')
  mkdirSync(join(dir, '.sillyspec', 'quicklog'), { recursive: true })
  writeFileSync(join(dir, '.sillyspec', 'quicklog', 'QUICKLOG-init.md'), '# init quicklog\n')
  git(dir, ['add', '-A'])
  git(dir, ['commit', '-q', '-m', 'init'])
}

const tmpRoots = []
function makeTmpDir(prefix) {
  const dir = mkdtempSync(join(tmpdir(), prefix))
  tmpRoots.push(dir)
  return dir
}

async function main() {
  // 场景 1：预存脏文件全部被排除 → safe（修复前会 baselineHit → blocked）
  {
    const dir = makeTmpDir('qk-dirty-1-')
    initGitRepo(dir)
    writeFileSync(join(dir, 'A.txt'), 'a')
    writeFileSync(join(dir, 'B.txt'), 'b')
    writeFileSync(join(dir, 'C.txt'), 'c')
    const guard = { baselineFiles: ['A.txt', 'B.txt', 'C.txt'], allowedFiles: [], allowNew: false, forceBaseline: false }
    const review = await auditQuickCompletion(dir, guard, {})
    assert(review.status === 'safe', `场景1 预存全排除 → safe（实际 ${review.status}）`)
    assert(review.changedFiles.length === 0, `场景1 changedFiles 应为空（实际 ${review.changedFiles.length}）`)
    assert(review.reasons.length === 0, `场景1 reasons 应为空（实际 ${JSON.stringify(review.reasons)}）`)
  }

  // 场景 2：预存 + 本次新增（未 --allow-new）→ warning，预存文件被排除
  {
    const dir = makeTmpDir('qk-dirty-2-')
    initGitRepo(dir)
    writeFileSync(join(dir, 'A.txt'), 'a')   // 预存
    writeFileSync(join(dir, 'D.txt'), 'd')   // 本次新增
    const guard = { baselineFiles: ['A.txt'], allowedFiles: [], allowNew: false, forceBaseline: false }
    const review = await auditQuickCompletion(dir, guard, {})
    assert(review.status === 'warning', `场景2 本次新增未 allow-new → warning（实际 ${review.status}）`)
    assert(review.newFiles.includes('D.txt'), `场景2 D.txt 应进 newFiles（实际 ${JSON.stringify(review.newFiles)}）`)
    assert(!review.changedFiles.includes('A.txt'), `场景2 预存 A.txt 应被排除（实际 ${JSON.stringify(review.changedFiles)}）`)
  }

  // 场景 3：预存 + 本次新增 + --allow-new → safe（flag 降级）
  {
    const dir = makeTmpDir('qk-dirty-3-')
    initGitRepo(dir)
    writeFileSync(join(dir, 'A.txt'), 'a')
    writeFileSync(join(dir, 'D.txt'), 'd')
    const guard = { baselineFiles: ['A.txt'], allowedFiles: [], allowNew: true, forceBaseline: false }
    const review = await auditQuickCompletion(dir, guard, {})
    assert(review.status === 'safe', `场景3 --allow-new 降级 → safe（实际 ${review.status}）`)
  }

  // 场景 4：预存文件命中危险 pattern（src/db.js）→ 不再误判 blocked
  {
    const dir = makeTmpDir('qk-dirty-4-')
    initGitRepo(dir)
    mkdirSync(join(dir, 'src'), { recursive: true })
    writeFileSync(join(dir, 'src', 'db.js'), 'x')   // 危险 pattern，但是预存
    const guard = { baselineFiles: ['src/db.js'], allowedFiles: [], allowNew: false, forceBaseline: false }
    const review = await auditQuickCompletion(dir, guard, {})
    assert(review.status === 'safe', `场景4 预存危险文件被排除 → safe（实际 ${review.status}，修复前 blocked）`)
    assert(review.reasons.length === 0, `场景4 reasons 应为空（实际 ${JSON.stringify(review.reasons)}）`)
  }

  // 场景 5：本次改危险文件（非预存）→ blocked（守卫仍有效）
  {
    const dir = makeTmpDir('qk-dirty-5-')
    initGitRepo(dir)
    mkdirSync(join(dir, 'src'), { recursive: true })
    writeFileSync(join(dir, 'src', 'run.js'), 'x')   // 危险 pattern，本次新增
    const guard = { baselineFiles: [], allowedFiles: [], allowNew: false, forceBaseline: false }
    const review = await auditQuickCompletion(dir, guard, {})
    assert(review.status === 'blocked', `场景5 本次改危险文件 → blocked（实际 ${review.status}）`)
  }

  // 场景 6：本次改危险文件 + --force-baseline --allow-new 组合 → safe（报告建议 3：组合应能强制通过）
  {
    const dir = makeTmpDir('qk-dirty-6-')
    initGitRepo(dir)
    mkdirSync(join(dir, 'src'), { recursive: true })
    writeFileSync(join(dir, 'src', 'run.js'), 'x')
    const guard = { baselineFiles: [], allowedFiles: [], allowNew: true, forceBaseline: true }
    const review = await auditQuickCompletion(dir, guard, {})
    assert(review.status === 'safe', `场景6 --force-baseline --allow-new 组合降级 → safe（实际 ${review.status}）`)
  }

  // 场景 7：--files 声明范围，本次改了范围外文件 → warning（建议 2 自动生效）
  {
    const dir = makeTmpDir('qk-dirty-7-')
    initGitRepo(dir)
    writeFileSync(join(dir, 'X.txt'), 'x')   // 本次，在 allowedFiles
    writeFileSync(join(dir, 'Y.txt'), 'y')   // 本次，超出 allowedFiles
    const guard = { baselineFiles: [], allowedFiles: ['X.txt'], allowNew: false, forceBaseline: false }
    const review = await auditQuickCompletion(dir, guard, {})
    assert(review.status === 'warning', `场景7 超出 allowedFiles → warning（实际 ${review.status}）`)
    assert(review.reasons.some(r => r.includes('Y.txt') && r.startsWith('超出')), `场景7 Y.txt 应报超出 allowedFiles（实际 ${JSON.stringify(review.reasons)}）`)
  }

  // 场景 8：预存 untracked .sillyspec/changes/ 进 baseline → audit 不再误判危险/新增
  // （ql-20260713-002-7628 修复：旧 run.js baseline 录入粗放过滤 .sillyspec/，
  //  致预存 untracked 变更目录不进 baseline，却在 audit 被当「危险(.sillyspec/)+新增」永久 blocked）
  {
    const dir = makeTmpDir('qk-dirty-8-')
    initGitRepo(dir)
    // 预存：另一个变更的 untracked 目录（典型：多变更并行时别人的 .sillyspec/changes/）
    mkdirSync(join(dir, '.sillyspec', 'changes', 'other-change'), { recursive: true })
    writeFileSync(join(dir, '.sillyspec', 'changes', 'other-change', 'design.md'), '# other\n')
    // 用 git 实报路径作 baseline（目录折叠时路径可能是 .sillyspec/changes/ 或 .../other-change/，避免硬编码）
    const reported = git(dir, ['status', '--porcelain'])
      .split('\n').filter(l => l.includes('other-change') || l.includes('changes'))
      .map(l => l.slice(3).trim())
    const guard = { baselineFiles: reported, allowedFiles: [], allowNew: false, forceBaseline: false }
    const review = await auditQuickCompletion(dir, guard, {})
    assert(review.status === 'safe', `场景8 预存 untracked .sillyspec/changes/ 进 baseline → safe（实际 ${review.status}，修复前 blocked）`)
    assert(!review.reasons.some(r => r.includes('危险') || r.includes('新增')), `场景8 不应报危险/新增（实际 ${JSON.stringify(review.reasons)}）`)
  }

  // 场景 9：对照——同样 untracked .sillyspec/changes/ 但不在 baseline（本次新建）→ 仍 blocked
  // （证明 Fix A 没有弱化守卫：仅预存项被排除，本次新建的 .sillyspec/ 仍拦截）
  {
    const dir = makeTmpDir('qk-dirty-9-')
    initGitRepo(dir)
    mkdirSync(join(dir, '.sillyspec', 'changes', 'sneaky'), { recursive: true })
    writeFileSync(join(dir, '.sillyspec', 'changes', 'sneaky', 'design.md'), '# sneaky\n')
    const guard = { baselineFiles: [], allowedFiles: [], allowNew: false, forceBaseline: false }
    const review = await auditQuickCompletion(dir, guard, {})
    assert(review.status === 'blocked', `场景9 本次新建 .sillyspec/changes/ 不在 baseline → 仍 blocked（实际 ${review.status}）`)
  }

  for (const d of tmpRoots) {
    try { rmSync(d, { recursive: true, force: true }) } catch {}
  }

  console.log('')
  console.log('==================================================')
  console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
  console.log('==================================================')
  if (failed > 0) process.exit(1)
}

main().catch(e => {
  console.error('测试异常:', e)
  process.exit(1)
})
