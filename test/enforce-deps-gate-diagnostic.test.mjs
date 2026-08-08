/**
 * enforce-deps-gate-diagnostic 测试
 *
 * 覆盖 enforceDepsGate 诊断分支 + fail-loud（task-04 实现，FR-04/05/06/07）+ plan 解析复用：
 *   - worktreeGone 判定基础（!existsSync(getWorktreePath(changeName))）—— AC-05 分支条件
 *   - getMeta 读取 depsStatus —— AC-06 放行判定基础
 *   - 门核心 ['linked','installed','n/a'] 放行 / 其他 fail-closed（AC-06 回归）
 *   - readPlanCheckboxStatus 解析（与 alignExecuteToPlan 同源真相源，task-01/02 复用）
 *   - e2e（子进程 runCommand execute --done）：depsStatus=failed → 拒绝 exit 1 +
 *     stderr fail-loud"本次 --done 未完成"（AC-05）+ 诊断修复提示
 *
 * 隔离：自建临时 spec 目录 + 临时 worktree 物理目录 + meta.json（mkTmp），
 *       不依赖真实 sillyspec.db / 真实项目 worktree。
 *
 * 说明：enforceDepsGate 是 run.js 内部函数（未 export），拒绝时 process.exit(1)。
 *       故分两层：
 *       (A) 直接单元测试 worktreeGone 判定 + getMeta/depsStatus + 门核心放行回归（确定性）
 *       (B) 子进程跑 runCommand(['execute','--done',...])，构造 depsStatus=failed 拒绝场景，
 *           捕获 stderr/exit 验证 fail-loud"本次 --done 未完成" + 诊断修复提示（AC-05）
 *
 * change 2026-07-06-execute-deps-gate-deadlock（task-05）
 */
import { WorktreeManager } from '../src/worktree.js'
import { ProgressManager } from '../src/progress.js'
import { runCommand } from '../src/run.js'
import { mkdtempSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'fs'
import { join, resolve } from 'path'
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
function assertEqual(actual, expected, msg) {
  const ok = actual === expected
  if (ok) { passed++; console.log(`  ✅ PASS: ${msg}`) }
  else {
    const detail = `${msg} (expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`
    failed++; failures.push(detail); console.log(`  ❌ FAIL: ${detail}`)
  }
}

const tmpDirs = []
function mkTmp(prefix) {
  const d = mkdtempSync(join(tmpdir(), `gate-${prefix}-`))
  tmpDirs.push(d)
  return d
}
function cleanup() {
  for (const d of tmpDirs) {
    try { rmSync(d, { recursive: true, force: true }) } catch {}
  }
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = resolve(__filename, '..')
const repoRoot = resolve(__dirname, '..')

console.log('=== enforce-deps-gate-diagnostic 测试 ===\n')

// ════════════════════════════════════════════════════════════
// (A1) worktreeGone 判定基础：!existsSync(getWorktreePath(changeName))
// ════════════════════════════════════════════════════════════
console.log('--- (A1) worktreeGone 判定：物理目录不存在 → existsSync=false ---')
{
  // 非 git 临时目录：WorktreeManager._resolveMainRepoRoot fallback 到 cwd
  // → worktreeBase = cwd/.sillyspec/.runtime/worktrees
  const cwd = mkTmp('gone-cwd')
  const wm = new WorktreeManager({ cwd })
  const changeName = 'demo-change'
  const wtPath = wm.getWorktreePath(changeName)
  assert(typeof wtPath === 'string' && wtPath.length > 0, `getWorktreePath 返回有效路径`)
  // 目录不存在 → worktreeGone 判定（!existsSync）为 true
  assertEqual(existsSync(wtPath), false, '物理目录不存在 → existsSync=false（worktreeGone=true）')

  // 现在创建目录 → existsSync=true → worktreeGone=false
  mkdirSync(wtPath, { recursive: true })
  assertEqual(existsSync(wtPath), true, '创建目录后 existsSync=true（worktreeGone=false）')

  // 删除 → 重新变为 gone
  rmSync(wtPath, { recursive: true, force: true })
  assertEqual(existsSync(wtPath), false, '删除目录后 existsSync=false（worktreeGone=true，模拟 cleanup 终态）')
}

// ════════════════════════════════════════════════════════════
// (A2) getMeta：worktree 目录存在 + meta.json → 返回 depsStatus
// ════════════════════════════════════════════════════════════
console.log('\n--- (A2) getMeta：worktree 目录 + meta.json → 读 depsStatus ---')
{
  const cwd = mkTmp('meta-cwd')
  const wm = new WorktreeManager({ cwd })
  const changeName = 'meta-change'
  const wtPath = wm.getWorktreePath(changeName)
  mkdirSync(wtPath, { recursive: true })

  // 无 meta.json → getMeta 返回 null（depsStatus=undefined → 拒绝路径）
  assertEqual(wm.getMeta(changeName), null, '无 meta.json → getMeta=null')

  // 写 meta.json depsStatus=linked（放行集合内）
  writeFileSync(join(wtPath, 'meta.json'), JSON.stringify({
    worktreePath: wtPath, mode: 'native', depsStatus: 'linked', depsMethod: 'junction',
  }, null, 2) + '\n')
  const meta = wm.getMeta(changeName)
  assert(meta !== null, '有 meta.json → getMeta 非 null')
  assertEqual(meta.depsStatus, 'linked', 'getMeta 读取 depsStatus=linked')

  // 改成 failed（拒绝集合）
  writeFileSync(join(wtPath, 'meta.json'), JSON.stringify({
    worktreePath: wtPath, mode: 'native', depsStatus: 'failed', depsError: 'install boom',
  }, null, 2) + '\n')
  const metaFail = wm.getMeta(changeName)
  assertEqual(metaFail.depsStatus, 'failed', '改写后 getMeta 读取 depsStatus=failed')
}

// ════════════════════════════════════════════════════════════
// (A3) 门核心放行回归：depsStatus ∈ [linked, installed, n/a] 放行（AC-06）
// ════════════════════════════════════════════════════════════
console.log('\n--- (A3) 门核心放行回归（AC-06）---')
{
  // 复刻 enforceDepsGate 的放行判定（task-04 不改放行标准，D-006@v2）
  const PASS = ['linked', 'installed', 'n/a']
  const gateAllows = (depsStatus) => PASS.includes(depsStatus)
  for (const ds of PASS) {
    assertEqual(gateAllows(ds), true, `AC-06: depsStatus='${ds}' → 门核心放行（return true）`)
  }
  // 拒绝集合（不在放行标准里 → fail-closed）
  for (const ds of ['unknown', 'failed', undefined, null, '']) {
    assertEqual(gateAllows(ds), false, `depsStatus=${JSON.stringify(ds)} → fail-closed（拒绝）`)
  }
}

// ════════════════════════════════════════════════════════════
// (A4) readPlanCheckboxStatus 解析（与 alignExecuteToPlan 同源真相源）
// ════════════════════════════════════════════════════════════
console.log('\n--- (A4) readPlanCheckboxStatus 解析 plan.md / tasks.md ---')
{
  const cwd = mkTmp('plan-cwd')
  const pm = new ProgressManager({}) // readPlanCheckboxStatus 不依赖 specDir，只用 changeDir 参数
  const changeDir = mkTmp('plan-change')

  // 无 plan.md / tasks.md → {0,0}
  const empty = pm.readPlanCheckboxStatus(changeDir)
  assertEqual(empty.total, 0, '无 plan.md/tasks.md → total=0')
  assertEqual(empty.checked, 0, '无 plan.md/tasks.md → checked=0')

  // 全勾 plan.md（3 个 task-NN checkbox）
  writeFileSync(join(changeDir, 'plan.md'),
    '# Plan\n\n## Wave 1\n\n- [x] task-01: a\n- [x] task-02: b\n- [x] task-03: c\n', 'utf8')
  const full = pm.readPlanCheckboxStatus(changeDir)
  assertEqual(full.total, 3, 'plan.md 全勾 → total=3')
  assertEqual(full.checked, 3, 'plan.md 全勾 → checked=3')

  // 部分勾（task-03 未勾）
  writeFileSync(join(changeDir, 'plan.md'),
    '# Plan\n\n## Wave 1\n\n- [x] task-01: a\n- [x] task-02: b\n- [ ] task-03: c\n', 'utf8')
  const partial = pm.readPlanCheckboxStatus(changeDir)
  assertEqual(partial.total, 3, 'plan.md 部分勾 → total=3')
  assertEqual(partial.checked, 2, 'plan.md 部分勾 → checked=2')

  // 非 task-NN 前缀的 checkbox 不被收（避免误捞非任务项）
  writeFileSync(join(changeDir, 'plan.md'),
    '# Plan\n\n- [x] task-01: real task\n- [x] not-a-task: should be ignored\n', 'utf8')
  const filtered = pm.readPlanCheckboxStatus(changeDir)
  assertEqual(filtered.total, 1, '只收 task-NN 前缀（非任务 checkbox 不计）')
  assertEqual(filtered.checked, 1, 'task-NN 勾选计数正确')

  // 回退 tasks.md（删 plan.md）
  rmSync(join(changeDir, 'plan.md'), { force: true })
  writeFileSync(join(changeDir, 'tasks.md'),
    '- [x] task-01: a\n- [ ] task-02: b\n', 'utf8')
  const fallback = pm.readPlanCheckboxStatus(changeDir)
  assertEqual(fallback.total, 2, '回退 tasks.md → total=2')
  assertEqual(fallback.checked, 1, '回退 tasks.md → checked=1')
}

// ════════════════════════════════════════════════════════════
// (B) e2e：runCommand execute --done → enforceDepsGate 拒绝 + fail-loud
//     构造 depsStatus=failed → 门控拒绝（fail-closed）
// ════════════════════════════════════════════════════════════
console.log('\n--- (B) e2e：depsStatus=failed → 拒绝 exit 1 + fail-loud + 诊断提示 ---')
{
  const cwd = mkTmp('e2e-cwd')
  const specDir = mkTmp('e2e-spec')
  const changeName = 'e2e-change'
  const changeDir = join(specDir, 'changes', changeName)

  // 1. 初始化项目 + 变更 + execute 阶段（execute --done 会经 ensureStageSteps 从 plan.md
  //    重建 10 个框架步骤，手动 addStep 的假步骤会被替换；此处只设阶段，步骤由 execute 重建）
  const pm = new ProgressManager({ specDir })
  pm.init(cwd)
  pm.initChange(cwd, changeName)
  pm.setStage(cwd, 'execute', changeName)

  // 2. 写 plan.md（全勾，排除 plan 缺失干扰；execute 步骤可解析）
  writeFileSync(join(changeDir, 'plan.md'),
    `# Plan\n\n## Wave 1\n\n- [x] task-01: do something\n`, 'utf8')

  // 3. 预创建 worktree 物理目录 + meta.json（depsStatus=failed，不在放行集合）
  //    runCommand 中 existingMeta != null → 跳过 wm.create；ensureDepsFreshness 不重供给
  const wm = new WorktreeManager({ cwd })
  const wtPath = wm.getWorktreePath(changeName)
  mkdirSync(wtPath, { recursive: true })
  writeFileSync(join(wtPath, 'meta.json'), JSON.stringify({
    worktreePath: wtPath,
    mode: 'native',
    branch: `sillyspec/${changeName}`,
    baseHash: 'deadbeef',
    depsStatus: 'failed',
    depsMethod: 'install',
    depsError: 'test forced failure',
    depsLockHash: null,
  }, null, 2) + '\n')

  // 4. 子进程跑 runCommand（隔离 process.exit + 捕获 stderr/stdout/exit code）
  const runUrl = JSON.stringify(pathToFileURL(join(repoRoot, 'src', 'run.js')).href)
  const helper = [
    `import { runCommand } from ${runUrl}`,
    `try {`,
    `  await runCommand(['execute', '--done', '--change', ${JSON.stringify(changeName)}, '--spec-dir', ${JSON.stringify(specDir)}, '--skip-approval', '--non-interactive', '--output', 'e2e done attempt'], ${JSON.stringify(cwd)}, ${JSON.stringify(specDir)})`,
    `  process.exit(0)`,
    `} catch (e) { console.error('HELPER_THROW:' + (e && e.message ? e.message : String(e))); process.exit(2) }`,
  ].join('\n')
  const helperPath = join(cwd, '_gate-helper.mjs')
  writeFileSync(helperPath, helper, 'utf8')

  const res = spawnSync(process.execPath, [helperPath], {
    cwd,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    timeout: 60_000,
  })
  const stderr = res.stderr || ''
  const stdout = res.stdout || ''
  const combined = stdout + stderr
  const code = res.status

  // 门控拒绝 → 进程非 0 退出（enforceDepsGate 调 process.exit(1)）
  assert(code === 1, `AC-05: e2e 进程 exit=1（门控拒绝，实际 exit=${code}）`)

  if (code === 2) {
    console.log(`  ⚠️  e2e helper 抛错（未到门控）：${stderr.slice(-400)}`)
  }

  // AC-05 / Phase 3：fail-loud stderr 含"本次 --done 未完成"阻断块
  assert(combined.includes('本次 --done 未完成'),
    `AC-05: 输出含 fail-loud"本次 --done 未完成，进度未推进"阻断块`)

  // 诊断修复提示：worktreeGone 分支（align/create）或 deps-not-ready 分支（doctor --fix）至少命中一个
  const hasAlignOrCreate = /align-execute-progress|worktree create/i.test(combined)
  const hasDepsFix = /doctor\s+--fix|依赖未就绪/i.test(combined)
  assert(hasAlignOrCreate || hasDepsFix,
    `诊断分支提示存在（align/create 或 doctor --fix/依赖未就绪）`)

  // 进度未推进：门控拒绝（enforceDepsGate 在 completeStep 标 completed 前 process.exit(1)），
  // 故 execute 所有步骤应仍为 pending（无一被标 completed）。execute --done 经 ensureStageSteps
  // 从 plan.md 重建框架步骤（10 个，如「进度确认」「Wave 1 执行」等），手动加的假 step-1 会被替换，
  // 故此处断言「无 step 被 completed」而非查特定假步骤（对齐真实 execute 流程）。
  const after = pm.read(cwd, changeName)
  const execSteps = (after.stages.execute && after.stages.execute.steps) || []
  const anyCompleted = execSteps.some(s => s.status === 'completed')
  assert(execSteps.length > 0 && !anyCompleted,
    `门控拒绝时 execute 无 step 被标 completed（${execSteps.length} 步均 pending，进度未推进）`)
}

cleanup()

console.log(`\n==================================================`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
console.log(failed === 0 ? '全部通过' : `❌ 失败项: ${failures.join('; ')}`)
console.log(`==================================================`)
process.exit(failed === 0 ? 0 : 1)
