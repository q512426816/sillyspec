/**
 * worktree 副本漂移自动锚定 e2e 测试（task-05，D-03@v1，坑 worktree-execute-spec-drift）。
 *
 * 覆盖 command.js 副本漂移守卫的「自动锚定」行为：
 *   - 场景 A：cwd 命中 worktree checkout 副本（<mainRepo>/.sillyspec/.runtime/worktrees/<change>/.sillyspec）
 *     跑 execute → 不再 exit(2)，自动把 specBase 锚回主仓 wt.mainSpecBase，warn 含「自动锚定」，
 *     流程继续——validateChangeExists 用主仓 specBase 复查、pm 重建后读写主仓 db、副本不被写入。
 *   - 场景 B：非副本漂移的 changeMissing（cwd 在主仓根、--change 指向不存在的变更）→ 仍 exit(2)，
 *     证明只放宽副本漂移，其他漂移（changeMissing / quick session drift）拦截逻辑不变。
 *
 * 策略：子进程跑 runCommand（隔离 process.exit + 捕获 stderr/stdout/exit code），自建临时 fixture
 * 模拟 worktree 副本目录结构（主仓 .sillyspec/ + 副本 .sillyspec/），不依赖真实 git worktree。
 *
 * 互补：worktree-spec-drift-guard.test.mjs 测纯函数 detectWorktreeSpecDrift 的路径判据（本 task 不动）；
 * 本测试测 command.js 集成路径——命中后重写 specBase/specRoot/specDir + 重建 pm + warn + 不 exit。
 *
 * change 2026-08-05-tooling-feedback-fixes（task-05）
 */
import { ProgressManager } from '../src/progress.js'
import { mkdtempSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'fs'
import { join, dirname, resolve } from 'path'
import { tmpdir } from 'os'
import { spawnSync } from 'child_process'
import { fileURLToPath, pathToFileURL } from 'url'

let failed = 0
let passed = 0
const failures = []
function assert(cond, msg) {
  if (cond) { passed++; console.log(`  ✅ PASS: ${msg}`) }
  else { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
}

const tmpDirs = []
function mkTmp(prefix) {
  const d = mkdtempSync(join(tmpdir(), `wtexec-${prefix}-`))
  tmpDirs.push(d)
  return d
}
function cleanup() {
  for (const d of tmpDirs) {
    try { rmSync(d, { recursive: true, force: true }) } catch {}
  }
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const repoRoot = resolve(__dirname, '..')
const runUrl = JSON.stringify(pathToFileURL(join(repoRoot, 'src', 'run.js')).href)

/**
 * 子进程跑 runCommand（隔离 process.exit + 捕获 stderr/stdout/exit code）。
 * runCommand 内部 process.exit(N) 直接体现为子进程 exit code N；正常返回则 helper process.exit(0)。
 * 不传 --spec-dir（否则跳过副本漂移守卫），仅传 cwd，让 specBase=join(cwd,'.sillyspec') 自然命中副本。
 */
function runInSubprocess(cwd, args) {
  const helper = [
    `import { runCommand } from ${runUrl}`,
    `try {`,
    `  await runCommand(${JSON.stringify(args)}, ${JSON.stringify(cwd)})`,
    `  process.exit(0)`,
    `} catch (e) { console.error('HELPER_THROW:' + (e && e.message ? e.message : String(e))); process.exit(2) }`,
  ].join('\n')
  const helperPath = join(cwd, '_drift-helper.mjs')
  writeFileSync(helperPath, helper, 'utf8')
  return spawnSync(process.execPath, [helperPath], {
    cwd,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    timeout: 60_000,
  })
}

console.log('=== worktree 副本漂移自动锚定 e2e 测试（task-05）===\n')

// ════════════════════════════════════════════════════════════
// 场景 A：副本漂移 → 自动锚定主仓 spec，不 exit(2)，进度落主仓
// ════════════════════════════════════════════════════════════
console.log('--- 场景 A：cwd 命中 worktree 副本 → 自动锚定，不 exit，进度落主仓 ---')
{
  const mainRepo = mkTmp('main-repo')
  const mainSpec = join(mainRepo, '.sillyspec')
  const changeName = '2026-08-05-demo-change'
  const wtRoot = join(mainSpec, '.runtime', 'worktrees', changeName)
  const copySpec = join(wtRoot, '.sillyspec')

  // 主仓 spec：初始化 project + change（锚定后 validateChangeExists 复查 + pm.read 都依赖它）
  mkdirSync(mainSpec, { recursive: true })
  const pmMain = new ProgressManager({ specDir: mainSpec })
  await pmMain.init(mainRepo)
  await pmMain.initChange(mainRepo, changeName)
  // execute 步骤可解析：写一份最小 plan.md（buildExecuteSteps 读它构造步骤）
  writeFileSync(join(mainSpec, 'changes', changeName, 'plan.md'),
    `# Plan\n\n## Wave 1\n\n- [x] task-01: do something\n`, 'utf8')

  // worktree 副本目录结构：cwd=wtRoot 时 specBase=join(wtRoot,'.sillyspec')=copySpec
  // → detectWorktreeSpecDrift 命中（路径含 .sillyspec/.runtime/worktrees/<change>/.sillyspec）
  // 故意不在 copySpec 下建 changes/<change>/：若未锚定，validateChangeExists(copySpec) 复查会失败 →
  // exit(2)。锚定后 specBase=mainSpec → 复查 mainSpec/changes/<change>（存在）放行。这正是锚定的硬证明。
  mkdirSync(copySpec, { recursive: true })

  // 子进程跑 runCommand(['execute','--status','--change',changeName], cwd=wtRoot)
  // --status 走只读路径（line 749 早返回 showStatus），避免 worktree 创建/审批副作用。
  const res = runInSubprocess(wtRoot, ['execute', '--status', '--change', changeName])
  const combined = (res.stdout || '') + (res.stderr || '')
  const code = res.status

  assert(code === 0,
    `AC-A1: 副本漂移不 exit(2)（期望 exit=0，实际 exit=${code}）`)
  assert(combined.includes('自动锚定'),
    `AC-A2: stderr/stdout 含「自动锚定」warn`)
  assert(combined.includes(mainSpec),
    `AC-A3: warn 含主仓 spec 路径（锚定目标）`)
  assert(!combined.includes('HELPER_THROW'),
    `AC-A4: helper 未抛异常（combined 不含 HELPER_THROW，尾=${combined.slice(-200)})`)

  // 进度落主仓的硬证明：runCommand 的 ensureStageSteps 会写 execute steps 到 pm（已重建为主仓）。
  // pre-init 的 initChange 不写 execute steps → 读到 steps 即证明 runCommand 写到了主仓 db。
  const pmAfter = new ProgressManager({ specDir: mainSpec })
  const progressAfter = await pmAfter.read(wtRoot, changeName)
  const execStepCount = progressAfter?.stages?.execute?.steps?.length || 0
  assert(execStepCount > 0,
    `AC-A5: 进度落主仓 mainSpec（execute steps 已初始化=${execStepCount}）`)

  // 副本未被写入：pm 重建指向主仓，任何 pm._write 都不会落到 copySpec/.runtime/
  assert(!existsSync(join(copySpec, '.runtime')),
    `AC-A6: 副本 spec 未被写入（copySpec/.runtime 不存在）`)
}

// ════════════════════════════════════════════════════════════
// 场景 B：非副本漂移的 changeMissing → 仍 exit(2)（拦截不变，只放宽副本场景）
// ════════════════════════════════════════════════════════════
console.log('\n--- 场景 B：主仓 cwd + 不存在变更 → changeMissing 仍 exit(2) ---')
{
  const mainRepo = mkTmp('main-repo-B')
  const mainSpec = join(mainRepo, '.sillyspec')
  const changeName = 'totally-nonexistent-change'

  mkdirSync(mainSpec, { recursive: true })
  const pmMain = new ProgressManager({ specDir: mainSpec })
  await pmMain.init(mainRepo)
  // 故意不 initChange(changeName)：让 validateChangeExists 复查失败 → exit(2)

  // cwd=mainRepo（主仓根，detectWorktreeSpecDrift 返回 null，副本守卫不锚定）
  const res = runInSubprocess(mainRepo, ['execute', '--status', '--change', changeName])
  const combined = (res.stdout || '') + (res.stderr || '')
  const code = res.status

  assert(code === 2,
    `AC-B1: 非副本 changeMissing 仍 exit(2)（实际 exit=${code}）`)
  assert(combined.includes('当前 spec 下不存在'),
    `AC-B2: 含 changeMissing 错误文案（"当前 spec 下不存在"）`)
  assert(!combined.includes('自动锚定'),
    `AC-B3: 非副本漂移不触发「自动锚定」（只放宽副本场景）`)
}

cleanup()

console.log(`\n==================================================`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
console.log(failed === 0 ? '全部通过' : `❌ 失败项: ${failures.join('; ')}`)
console.log(`==================================================`)
process.exit(failed === 0 ? 0 : 1)
