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
 *      audit 不再误判「危险+新增」（场景 8）
 *   4. --done 的 --force-baseline/--allow-new 并入 guard（原只传 {isConfirm}，flag 静默无效）
 *
 * ql-20260723 追加修复（多会话并发时别人的 .sillyspec/changes/ 误判 BLOCKED）：
 *   5. isQuickMetadata 放行非关联 changes/（场景 9/11）；关联变更仍审计（场景 12）
 *   6. baseline 前缀匹配：折叠目录 token（尾斜杠）放行其下文件级路径（场景 10）
 *   7. parsePorcelainPath 修 .trim() 削首行空格致首文件丢首字符（场景 13/14）
 *
 * 风格：自研 assert + mkdtemp 临时 git 仓库，参照 quick-session-isolation.test.mjs
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'

import { auditQuickCompletion, parsePorcelainPath } from '../src/run.js'

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
      .map(l => parsePorcelainPath(l))
    const guard = { baselineFiles: reported, allowedFiles: [], allowNew: false, forceBaseline: false }
    const review = await auditQuickCompletion(dir, guard, {})
    assert(review.status === 'safe', `场景8 预存 untracked .sillyspec/changes/ 进 baseline → safe（实际 ${review.status}，修复前 blocked）`)
    assert(!review.reasons.some(r => r.includes('危险') || r.includes('新增')), `场景8 不应报危险/新增（实际 ${JSON.stringify(review.reasons)}）`)
  }

  // 场景 9（语义更新）：非关联变更 .sillyspec/changes/ 不再阻断。quick 没有自己的 changes/ 目录，
  // 该路径下内容要么是关联变更（reverse-sync）要么是并发其他会话工作；确定性审计无法区分后者
  // 与「本 quick 偷建变更」，按定位把意图软判定留给 sillyhub，故非关联 changes/ 整体放行。
  // 关联变更仍审计（见场景 12）。
  {
    const dir = makeTmpDir('qk-dirty-9-')
    initGitRepo(dir)
    mkdirSync(join(dir, '.sillyspec', 'changes', 'sneaky'), { recursive: true })
    writeFileSync(join(dir, '.sillyspec', 'changes', 'sneaky', 'design.md'), '# sneaky\n')
    const guard = { baselineFiles: [], allowedFiles: [], allowNew: false, forceBaseline: false, linkedChanges: [] }
    const review = await auditQuickCompletion(dir, guard, {})
    assert(review.status !== 'blocked', `场景9 非关联 changes/ 不再阻断（实际 ${review.status}）`)
    assert(!review.reasons.some(r => r.includes('危险')), `场景9 不应报危险（实际 ${JSON.stringify(review.reasons)}）`)
  }

  // 场景 10（Fix 1 折叠目录前缀匹配）：baseline 录入时整片 changes/ 未跟踪 → git 折叠成
  // `?? .sillyspec/changes/`（带尾斜杠 token）。审计时该目录下文件已被并发会话跟踪而展开成
  // 文件级 `.../concurrent/design.md`——精确匹配对不上，靠尾斜杠 token 前缀匹配放行。
  // 用 linkedChanges=['concurrent'] 隔离 Fix 2（关联变更不被 Fix 2 放行，只能靠 Fix 1 跳过）。
  {
    const dir = makeTmpDir('qk-dirty-10-')
    initGitRepo(dir)
    mkdirSync(join(dir, '.sillyspec', 'changes', 'concurrent'), { recursive: true })
    writeFileSync(join(dir, '.sillyspec', 'changes', 'concurrent', 'design.md'), '# v1\n')
    const baseline = git(dir, ['status', '--porcelain']).split('\n').filter(Boolean).map(parsePorcelainPath)
    git(dir, ['add', '-A'])                 // 并发会话提交 → changes/ 下文件变跟踪
    git(dir, ['commit', '-q', '-m', 'concurrent'])
    writeFileSync(join(dir, '.sillyspec', 'changes', 'concurrent', 'design.md'), '# v2\n')
    const guard = { baselineFiles: baseline, allowedFiles: [], allowNew: false, forceBaseline: false, linkedChanges: ['concurrent'] }
    const review = await auditQuickCompletion(dir, guard, {})
    assert(baseline.some(b => b.startsWith('.sillyspec/changes/')), `场景10 baseline 应含折叠 changes/ token（实际 ${JSON.stringify(baseline)}）`)
    assert(review.status === 'safe', `场景10 折叠 token 前缀匹配文件级路径 → safe（实际 ${review.status}）`)
    assert(!review.changedFiles.some(f => f.includes('concurrent')), `场景10 concurrent 文件应被 baseline 跳过（实际 ${JSON.stringify(review.changedFiles)}）`)
  }

  // 场景 11（Fix 2 非关联变更放行，文件级）：并发会话已跟踪并修改某非关联变更文件 → 不阻断。
  {
    const dir = makeTmpDir('qk-dirty-11-')
    initGitRepo(dir)
    mkdirSync(join(dir, '.sillyspec', 'changes', 'other'), { recursive: true })
    writeFileSync(join(dir, '.sillyspec', 'changes', 'other', 'design.md'), '# v1\n')
    git(dir, ['add', '-A']); git(dir, ['commit', '-q', '-m', 'other'])
    writeFileSync(join(dir, '.sillyspec', 'changes', 'other', 'design.md'), '# v2\n')
    const guard = { baselineFiles: [], allowedFiles: [], allowNew: false, forceBaseline: false, linkedChanges: ['myown'] }
    const review = await auditQuickCompletion(dir, guard, {})
    assert(review.status !== 'blocked', `场景11 非关联变更文件不阻断（实际 ${review.status}）`)
    assert(!review.reasons.some(r => r.includes('危险')), `场景11 不应报危险（实际 ${JSON.stringify(review.reasons)}）`)
  }

  // 场景 12（坑 linked-change-leftover-false-block 新契约，2026-08-22 用户裁决）：关联变更文件
  // 被改且不在 baseline → 放行不阻断（quick 无法区分「他者遗留」与「本次偷改」），剔除出本会话
  // 归属并收集 linkedChangeLeftovers（审计输出 🧹 提示，归关联变更自己的流程管）。旧契约
  // （blocked + 危险 reason）已废——并发下上个 session 的遗留脏文件曾因此被误拦只能
  // --force-baseline。
  {
    const dir = makeTmpDir('qk-dirty-12-')
    initGitRepo(dir)
    mkdirSync(join(dir, '.sillyspec', 'changes', 'mylinked'), { recursive: true })
    writeFileSync(join(dir, '.sillyspec', 'changes', 'mylinked', 'design.md'), '# v1\n')
    git(dir, ['add', '-A']); git(dir, ['commit', '-q', '-m', 'linked'])
    writeFileSync(join(dir, '.sillyspec', 'changes', 'mylinked', 'design.md'), '# v2\n')
    const guard = { baselineFiles: [], allowedFiles: [], allowNew: false, forceBaseline: false, linkedChanges: ['mylinked'] }
    const review = await auditQuickCompletion(dir, guard, {})
    assert(review.status !== 'blocked', `场景12 关联变更遗留放行不阻断（实际 ${review.status}）`)
    assert((review.linkedChangeLeftovers || []).includes('.sillyspec/changes/mylinked/design.md'),
      `场景12 遗留收集 linkedChangeLeftovers（实际 ${JSON.stringify(review.linkedChangeLeftovers)}）`)
    assert(!review.changedFiles.includes('.sillyspec/changes/mylinked/design.md'), `场景12 遗留剔除出本会话归属`)
  }

  // 场景 13（Fix 3 porcelain 解析单元）：去引号 / rename 取新路径 / 归一化，且首行不丢首字符。
  {
    assert(parsePorcelainPath(' M frontend/src/app/(dashboard)/page.tsx') === 'frontend/src/app/(dashboard)/page.tsx', `场景13a 普通路径不丢首字符`)
    assert(parsePorcelainPath('?? "front end.txt"') === 'front end.txt', `场景13b 去引号`)
    assert(parsePorcelainPath('R  old/name.ts -> new/name.ts') === 'new/name.ts', `场景13c rename 取新路径`)
    const multi = ' M AAA.txt\n M BBB.txt\n'
    const parsed = multi.split('\n').filter(Boolean).map(parsePorcelainPath)
    assert(parsed[0] === 'AAA.txt' && parsed[1] === 'BBB.txt', `场景13d 多行首行完整（实际 ${JSON.stringify(parsed)}）`)
    // 对照：旧 .trim().split 会削首行前导空格 → 首文件丢首字符（证明 Fix 3 修复的 bug 真实存在）
    const oldStyle = multi.trim().split('\n').filter(Boolean).map(l => l.slice(3).trim())
    assert(oldStyle[0] === 'AA.txt', `场景13e 旧 .trim() 削首行空格致首文件丢首字符（实际 ${JSON.stringify(oldStyle)}）`)
  }

  // 场景 14（Fix 3 集成）：baseline 首行是【空格前导状态】的危险文件（` M src/run.js`）。
  // 修复前 run.js 的 .trim().split 削首行前导空格 → slice(3) 吃掉 's' → baseline 存 'rc/run.js'
  // → 审计 src/run.js 对不上 → 既没被 baseline 跳过、危险 pattern 又因路径错位…实际危险 pattern
  // 用审计侧正确路径仍命中 → 误判 blocked。修复后两侧都正确 → 匹配 → 跳过 → safe。
  {
    const dir = makeTmpDir('qk-dirty-14-')
    initGitRepo(dir)
    writeFileSync(join(dir, 'src', 'run.js'), 'v1\n')
    git(dir, ['add', '-A']); git(dir, ['commit', '-q', '-m', 'run'])   // 跟踪
    writeFileSync(join(dir, 'src', 'run.js'), 'v2\n')                  // 修改 → ` M src/run.js`（首行前导空格）
    // 注意：用 execFileSync 原始读取，不能用 git() helper——后者 .trim() 会削首行前导空格
    // （与 run.js 旧 bug 同源）；run.js 实际用 execSync 原始输出 + split，不 trim。
    const raw = execFileSync('git', ['status', '--porcelain'], { cwd: dir, encoding: 'utf8' })
    const baseline = raw.split('\n').filter(Boolean).map(parsePorcelainPath)
    const guard = { baselineFiles: baseline, allowedFiles: [], allowNew: false, forceBaseline: false }
    const review = await auditQuickCompletion(dir, guard, {})
    assert(baseline[0] === 'src/run.js', `场景14 baseline 首文件应完整（实际 ${JSON.stringify(baseline)}）`)
    assert(review.status === 'safe', `场景14 首行(空格前导)危险文件在 baseline → safe（实际 ${review.status}，修复前丢首字符致误判 blocked）`)
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
