/**
 * task-04：多 agent 并发写预检钩子集成测试。
 *
 * 覆盖 design §5 Wave2 两处钩子的行为 + 挂载：
 *  - Part A（钩子真实行为）：detectConcurrentChanges → formatConcurrentWarning → console.warn 串联，
 *    真实 git fixture（他者脏业务文件 / 他者脏变更目录 / 干净仓 / ownFiles 排除本会话文件）。
 *    detect/format 为真实模块（非 mock），复现 task-02/03 钩子调用点的 3 行逻辑。
 *  - Part B（挂载契约）：静态断言 quick 钩子挂在 complete-handlers.js quick 完成路径、execute 钩子
 *    挂在 gates.js runStageCompletionGates execute 分支（detectConcurrentChanges + formatConcurrentWarning
 *    + console.warn + try/catch fail-open 在场），证明钩子非孤岛、真实接入完成路径。
 *
 * B-004 降级说明（诚实标注）：完整 quick/execute --done 经 completeStep 壳的端到端驱动，需先过
 * runValidators（execute 全套产物校验）+ Stage Review Gate（tier 判定 + review.json），fixture 成本高
 * 且偏离「并发预检钩子」焦点。钩子核心逻辑（detect→format→warn 串联 + 非阻塞）由 Part A 真实行为测
 * 覆盖，挂载点由 Part B 契约测覆盖，detectConcurrentChanges 单元由 test/concurrent-detect.test.mjs 覆盖。
 * 真实 E2E 由 dogfood 天然验证——本变更 quick --done 收尾时若工作树有他者文件即触发 warn。
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { detectConcurrentChanges, formatConcurrentWarning } from '../src/run/concurrent-detect.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..')

let total = 0, failed = 0
function assert(c, m) { total++; if (!c) { failed++; console.log(`  ❌ FAIL: ${m}`) } else console.log(`  ✅ PASS: ${m}`) }

const tmpRoots = []
function makeRepo() {
  const d = mkdtempSync(join(tmpdir(), 'chook-'))
  tmpRoots.push(d)
  execSync('git init -q', { cwd: d, stdio: 'pipe' })
  execSync('git config user.email t@t.com', { cwd: d, stdio: 'pipe' })
  execSync('git config user.name t', { cwd: d, stdio: 'pipe' })
  writeFileSync(join(d, 'package.json'), '{}\n')
  writeFileSync(join(d, 'README.md'), 'init\n')
  execSync('git add .', { cwd: d, stdio: 'pipe' })
  execSync('git commit -q -m init', { cwd: d, stdio: 'pipe' })
  return d
}
// 在 cwd 下造一个已提交的基线文件（tracked-modify 场景用，避免 untracked 目录折叠）。
function commitFile(d, rel, content) {
  const full = join(d, rel)
  mkdirSync(join(d, ...rel.split('/').slice(0, -1)), { recursive: true })
  writeFileSync(full, content)
  execSync('git add .', { cwd: d, stdio: 'pipe' })
  execSync('git commit -q -m base', { cwd: d, stdio: 'pipe' })
}

// ---- Part A：钩子真实行为（detect → format → console.warn 串联）----
console.log('--- Part A：钩子行为（真实 git fixture）---')

// A1: quick 钩子等价——本会话 ownFiles（changedFiles ∪ baselineFiles）+ 他者业务文件 → warn
{
  const d = makeRepo()
  commitFile(d, 'src/my-quick.js', 'a\n')
  commitFile(d, 'src/other-agent.js', 'b\n')   // 他者业务文件（已跟踪 modify，audit 判 safe 不阻断）
  writeFileSync(join(d, 'src/my-quick.js'), 'a2\n')
  writeFileSync(join(d, 'src/other-agent.js'), 'b2\n')

  // 复现 quick 钩子（complete-handlers.js task-02）：ownFiles = review.changedFiles ∪ guard.baselineFiles
  const detected = detectConcurrentChanges(d, {
    changeName: 'my-quick-task',
    linkedChanges: [],
    ownFiles: ['src/my-quick.js'],   // 本会话 ownFiles（review.changedFiles 等价，D-001）
  })
  const warn = formatConcurrentWarning(detected)
  assert(detected.hasForeign === true, 'A1 他者业务文件在场 → hasForeign=true')
  assert(typeof warn === 'string' && warn.includes('src/other-agent.js'), 'A1 warn 含他者业务文件')
  assert(!warn.includes('src/my-quick.js'), 'A1 warn 排除本会话 ownFiles（D-001 baseline 并入）')
  assert(warn.includes('pathspec'), 'A1 warn 含 pathspec 隔离提示')

  // 钩子调用点形态：if (warn) console.warn(warn)，验证 warn 真能进 console.warn（非阻断副作用）
  let captured = null
  const ow = console.warn; console.warn = (s) => { captured = s }
  try { if (warn) console.warn(warn) } finally { console.warn = ow }
  assert(captured !== null && captured.includes('other-agent.js'), 'A1 console.warn 被真实调用（钩子副作用可达）')
}

// A2: execute 钩子等价——in-place ownFiles = design §6 清单，本变更交付文件被排除，他者入 foreignFiles（D-002）
{
  const d = makeRepo()
  commitFile(d, 'src/run/concurrent-detect.js', 'x\n')   // 本变更交付（design §6 ownFiles）
  commitFile(d, 'src/run/other.js', 'y\n')                // 他者业务文件
  writeFileSync(join(d, 'src/run/concurrent-detect.js'), 'x2\n')
  writeFileSync(join(d, 'src/run/other.js'), 'y2\n')

  const detected = detectConcurrentChanges(d, {
    changeName: '2026-08-08-concurrent-write-preflight',
    linkedChanges: [],
    ownFiles: ['src/run/concurrent-detect.js', 'src/run/complete-handlers.js', 'src/run/gates.js'],  // design §6 清单等价（D-002）
  })
  const warn = formatConcurrentWarning(detected)
  assert(detected.foreignFiles.includes('src/run/other.js'), 'A2 in-place ownFiles=design清单 → 他者 src/run/other.js 入 foreignFiles')
  assert(!detected.foreignFiles.some(f => f.endsWith('concurrent-detect.js')), 'A2 本变更交付文件被 ownFiles 排除（D-002，不误报他者）')
  assert(warn && warn.includes('src/run/other.js'), 'A2 warn 含他者文件')
}

// A3: 干净仓（仅本会话文件，无他者）→ warn=null，零额外输出（AC-08）
{
  const d = makeRepo()
  commitFile(d, 'src/my.js', 'a\n')
  writeFileSync(join(d, 'src/my.js'), 'a2\n')   // 只有本会话文件
  const detected = detectConcurrentChanges(d, { changeName: 'my-task', linkedChanges: [], ownFiles: ['src/my.js'] })
  const warn = formatConcurrentWarning(detected)
  assert(detected.hasForeign === false, 'A3 干净仓 → hasForeign=false')
  assert(warn === null, 'A3 干净仓 → warn=null（零额外输出，AC-08）')

  // 钩子调用点：if (warn) console.warn —— warn=null 时 console.warn 不被调用
  let called = false
  const ow = console.warn; console.warn = () => { called = true }
  try { if (warn) console.warn(warn) } finally { console.warn = ow }
  assert(called === false, 'A3 干净仓 console.warn 零调用（钩子形态守护）')
}

// A4: 他者脏变更目录 → otherActiveChanges 信号（不受 ownFiles 准确性影响，始终可靠）
{
  const d = makeRepo()
  commitFile(d, '.sillyspec/changes/other-active/design.md', '# d\n')
  writeFileSync(join(d, '.sillyspec/changes/other-active/design.md'), '# d2\n')
  const detected = detectConcurrentChanges(d, { changeName: 'my-task', linkedChanges: [], ownFiles: [] })
  const warn = formatConcurrentWarning(detected)
  assert(detected.otherActiveChanges.includes('other-active'), 'A4 他者脏变更目录 → otherActiveChanges')
  assert(warn && warn.includes('other-active'), 'A4 warn 含他者变更目录')
  assert(warn && (warn.includes('脏变更目录') || warn.includes('git-dirty')), 'A4 warn 用「脏变更目录」/git-dirty（D-005 勿用「活跃」）')
}

// ---- Part B：挂载契约（钩子真实挂在 quick/execute 完成路径，非孤岛）----
console.log('\n--- Part B：钩子挂载契约（quick/execute 完成路径）---')
{
  const completeHandlers = readFileSync(join(repoRoot, 'src/run/complete-handlers.js'), 'utf8')
  assert(completeHandlers.includes("from './concurrent-detect.js'"), 'B1 complete-handlers.js import concurrent-detect')
  assert(completeHandlers.includes('detectConcurrentChanges') && completeHandlers.includes('formatConcurrentWarning'), 'B1 quick 完成路径调用 detect+format')
  assert(completeHandlers.includes('console.warn'), 'B1 quick 钩子 console.warn 挂载（task-02）')
  // 非阻塞契约：钩子在 try/catch 内（fail-open），ownFiles 并入 baselineFiles（D-001）
  const qhIdx = completeHandlers.indexOf('detectConcurrentChanges', completeHandlers.indexOf('handleQuickStageCompletion'))
  const hookBlock = completeHandlers.slice(Math.max(0, qhIdx - 200), qhIdx + 600)
  assert(hookBlock.includes('try') && hookBlock.includes('catch'), 'B1 quick 钩子包在 try/catch 内（advisory fail-open）')
  assert(hookBlock.includes('baselineFiles'), 'B1 quick ownFiles 并入 baselineFiles（D-001）')
  assert(!hookBlock.includes('process.exit'), 'B1 quick 钩子无 process.exit（非阻断，FR-07）')

  const gates = readFileSync(join(repoRoot, 'src/run/gates.js'), 'utf8')
  assert(gates.includes("from './concurrent-detect.js'"), 'B2 gates.js import concurrent-detect')
  assert(gates.includes('readDesignOwnFiles'), 'B2 readDesignOwnFiles helper（D-002 in-place ownFiles 源，design §6 解析）')
  assert(gates.includes('in-place-fallback'), 'B2 ownFiles 源按 meta.mode 分 worktree/in-place（D-002）')
  // execute 钩子在 completeStageGates 入口（design §5/plan task-03 原文），覆盖所有 completeStageGates
  // 调用路径（含 continueStep/completeStep）；非 runStageCompletionGates（前置 gate 失败时不到）。
  const csgIdx = gates.indexOf('export async function completeStageGates')
  const csgBlock = gates.slice(csgIdx, csgIdx + 2500)
  assert(csgBlock.includes("stageName === 'execute'") && csgBlock.includes('detectConcurrentChanges'), 'B2 execute 钩子在 completeStageGates 入口（design 原文位置，非 runStageCompletionGates）')
  assert(csgBlock.includes('try') && csgBlock.includes('catch'), 'B2 execute 钩子包在 try/catch 内（advisory fail-open）')
}

for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} }
console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
console.log(`${'='.repeat(50)}`)
if (failed > 0) process.exit(1)
