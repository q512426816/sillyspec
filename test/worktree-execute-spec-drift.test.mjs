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
import { getStageSteps } from '../src/run/shared.js'
import { mkdtempSync, writeFileSync, mkdirSync, existsSync, readFileSync, rmSync } from 'fs'
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

  // ════════════════════════════════════════════════════════════
  // producer 侧 e2e 硬证（execute-runs-isolation 遗留 gap 2）：
  // 场景 A 现有断言用 --status 只读路径（AC-A1..A6），grep specDriftAnchor 0 命中——
  // drift 守卫虽设了 specDriftAnchor，但 marker 落盘从未真实触发。这里追加**非 --status 的真实
  // execute step**（renderPrompt 真实渲染 acceptance step），断言 execute-runs/stage-reviews
  // marker 经 resolveRuntimeRoot(specDriftAnchor) 落**主仓 .runtime**而非副本。
  // ════════════════════════════════════════════════════════════

  // 预置 worktree meta（in-place-fallback，depsStatus='n/a'）：真实 execute 的 runStage
  // 会 wm.getMeta 命中跳过 wm.create（临时 fixture 非 git 仓库，wm.create 必败 → exit 1）。
  // worktreeBase = resolve(_resolveMainRepoRoot(wtRoot), '.sillyspec/.runtime/worktrees')；
  // wtRoot 非 git 仓库 → _resolveMainRepoRoot fallback cwd → meta 落在 copySpec/.runtime/worktrees/ 下。
  const wmMetaDir = join(copySpec, '.runtime', 'worktrees', changeName)
  mkdirSync(wmMetaDir, { recursive: true })
  writeFileSync(join(wmMetaDir, 'meta.json'), JSON.stringify({
    name_zh: 'worktree 元数据',
    changeName,
    branch: 'sillyspec/' + changeName,
    baseBranch: 'main',
    baseHash: 'deadbeef',
    actualBaseHash: 'deadbeef',
    createdAt: new Date().toISOString(),
    worktreePath: wtRoot,
    mode: 'in-place-fallback',
    baselineFiles: [],
    baselineCommit: null,
    baselineHash: null,
    depsStatus: 'n/a',
  }, null, 2) + '\n', 'utf8')

  // 推进 progress 到「对照设计检查」acceptance step（defSteps 里含 {REVIEW_TIER}，唯一触发
  // stage review marker 落盘的步骤）。用 getStageSteps(specBase=null) 探测 index——与 runStage
  // 真实渲染的 defSteps 同参同构（drift 场景 platformOpts.specRoot=null），不硬编码魔法数字，
  // 幻影 wave step 数变化时仍准确。progress.stages.execute.steps 与 defSteps 同长，index 对齐。
  const progPre = await pmAfter.read(wtRoot, changeName)
  const defSteps = await getStageSteps('execute', wtRoot, progPre, null)
  const acceptanceIdx = defSteps.findIndex(s => (s.prompt || '').includes('{REVIEW_TIER}'))
  assert(acceptanceIdx >= 0,
    `AC-A7: defSteps 含 acceptance step（{REVIEW_TIER}，index=${acceptanceIdx}）`)
  for (let i = 0; i < acceptanceIdx; i++) progPre.stages.execute.steps[i].status = 'completed'
  await pmAfter._write(wtRoot, progPre, changeName)

  // 跑真实 execute step（非 --status）：runStage → renderPrompt 注入 {EXECUTE_RUN_ID} +
  // {REVIEW_TIER}/{STAGE_REVIEW_RUN_ID}，两处 marker 经 resolveRuntimeRoot(specDriftAnchor) 落盘。
  const resReal = runInSubprocess(wtRoot, ['execute', '--change', changeName])
  const combReal = (resReal.stdout || '') + (resReal.stderr || '')
  assert(resReal.status === 0,
    `AC-A8: 真实 execute step exit=0（实际 exit=${resReal.status}，尾=${combReal.slice(-150)})`)
  assert(combReal.includes('自动锚定'),
    `AC-A9: 真实 execute 仍自动锚定主仓（含「自动锚定」warn）`)

  const mainRuntime = join(mainSpec, '.runtime')
  const copyRuntime = join(copySpec, '.runtime')
  const mainExecMarker = join(mainRuntime, `current-execute-run-id-${changeName}`)
  const mainStageMarker = join(mainRuntime, `current-stage-review-run-id-execute-${changeName}`)
  const copyExecMarker = join(copyRuntime, `current-execute-run-id-${changeName}`)
  const copyStageMarker = join(copyRuntime, `current-stage-review-run-id-execute-${changeName}`)

  // 硬证 1：execute-runs marker（stage.js 固定 runId + prompt.js {EXECUTE_RUN_ID} 注入落盘点）落主仓
  assert(existsSync(mainExecMarker),
    `AC-A10: execute marker 落主仓 .runtime（current-execute-run-id-${changeName}）`)
  assert(existsSync(mainExecMarker) && readFileSync(mainExecMarker, 'utf8').trim().startsWith('exec-'),
    `AC-A11: execute marker 内容为 exec- runId（stage.js 固定 runId 落盘）`)

  // 硬证 2：stage-reviews marker（prompt.js {STAGE_REVIEW_RUN_ID} 注入落盘点）落主仓
  assert(existsSync(mainStageMarker),
    `AC-A12: stage review marker 落主仓 .runtime（current-stage-review-run-id-execute-${changeName}）`)

  // 硬证 3：副本 .runtime 无任何 execute/stage marker（未随 drift 写分裂副本；worktree meta 除外——
  // 那是本测试为跳过 wm.create 预置的，非本变更产物）
  assert(!existsSync(copyExecMarker) && !existsSync(copyStageMarker),
    `AC-A13: 副本 .runtime 无 execute/stage marker（specDriftAnchor 锚定生效，不落 worktree 副本）`)
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
