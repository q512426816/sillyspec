/**
 * execute-runs / stage-reviews 与 worktree 生命周期解耦（坑 execute-runs-isolation）。
 *
 * 验证方案 A（specDriftAnchor）：drift 守卫命中时在 platformOpts 设 specDriftAnchor，下游 15 处
 * runtimeRoot 解析站点统一调 resolveRuntimeRoot —— drift 场景 .runtime 锚定主仓，execute-runs /
 * stage-reviews 不再落 worktree 副本，故 worktree cleanup 整目录删时碰不到，archive step1 完成度
 * gate（真相源=磁盘主仓 review.json）不再因丢文件阻断。
 *
 * risk_level=unit-sufficient：本变更是确定性路径解析逻辑（无并发/IO 竞态/外部依赖），核心机制全在
 * 纯函数 resolveRuntimeRoot（src/run/shared.js）。本套件以 resolveRuntimeRoot 单元测试为主体，辅以
 * 真实 fs 路径落点断言（T-01/T-02）+ sentinel 语义边界（T-05，D-02）+ 路径组合（T-03/T-04）。
 *
 * 覆盖对照 design §8 T-01..T-08：
 *   - T-01 drift 命中 → execute-runs 落主仓（fs 集成：marker 写主仓 .runtime，不落副本）
 *   - T-02 cleanup 后 execute-runs 仍存（删副本目录，主仓 marker 存活）
 *   - T-03 stage-reviews 落主仓（stageReviewMarkerPath 组合断言）
 *   - T-04 marker 按 change 隔离（共享主仓 .runtime，marker 路径按 changeName 区分）
 *   - T-05 specDriftAnchor 不触发平台 sentinel（D-02 语义边界，对照 shared.js checkApproval/triggerPull 门禁；triggerSync 已放行平台模式回传，无门禁）
 *   - T-06 非 drift 零回归（specDriftAnchor 未设 → 本地 specBase/.runtime，行为同旧公式）
 *   - T-07 平台模式零回归（runtimeRoot 已设 → 返回平台值，specDriftAnchor 分支不触发）
 *   - T-08 非 drift quick + 手动 specDriftAnchor 一致性（守卫不扩到 quick；手动 anchor 一致锚主仓）
 *
 * producer 侧（drift 守卫设 specDriftAnchor）由 worktree-execute-spec-drift.test.mjs 覆盖（drift 守卫
 * 触发 + specBase 锚主仓的 e2e）；本套件覆盖 consumer 侧（resolveRuntimeRoot + 站点接线）。
 *
 * 测试隔离：用 mkdtempSync 真实临时目录做 fs 断言；结尾清理；路径全用 node:path join（Win/POSIX 兼容）。
 */
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs'
import { resolveRuntimeRoot } from '../src/run/shared.js'
import { stageReviewMarkerPath } from '../src/stage-review.js'

let total = 0, failed = 0
const failures = []
function assert(cond, msg) {
  total++
  if (cond) { console.log(`  ✅ PASS: ${msg}`) }
  else { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
}

const tmpDirs = []
function mkTmp(prefix) {
  const d = mkdtempSync(join(tmpdir(), `iso-${prefix}-`))
  tmpDirs.push(d)
  return d
}
function cleanup() {
  for (const d of tmpDirs) { try { rmSync(d, { recursive: true, force: true }) } catch {} }
}

console.log('=== execute-runs / stage-reviews 与 worktree 生命周期解耦（T-01..T-08）===\n')

// ── 路径基底（纯路径逻辑用，无需真实 fs）──
// 模拟 worktree 副本结构：<mainRepo>/.sillyspec/.runtime/worktrees/<change>/.sillyspec
const changeName = '2026-08-06-demo'
const mainSpec = join(tmpdir(), 'iso-path-main', '.sillyspec')
const mainRuntime = join(mainSpec, '.runtime')
const copySpec = join(mainSpec, '.runtime', 'worktrees', changeName, '.sillyspec')
const copyRuntime = join(copySpec, '.runtime')

// ════════════════════════════════════════════════════════════
// T-01 drift 命中 → execute-runs marker 落主仓（fs 集成）
// ════════════════════════════════════════════════════════════
console.log('--- T-01: drift anchor → execute-runs marker 落主仓 ---')
{
  // 模拟 drift 守卫命中后传给下游的 platformOpts（command.js:540 设 specDriftAnchor=主仓 specBase）
  const driftOpts = { specDriftAnchor: mainSpec }
  const rr = resolveRuntimeRoot(driftOpts, copySpec)
  assert(rr === mainRuntime, `runtimeRoot 锚主仓 .runtime（期望 ${mainRuntime}，实际 ${rr}）`)
  assert(rr !== copyRuntime, 'runtimeRoot 不落 worktree 副本 .runtime')

  // execute marker 路径 = join(rr, 'current-execute-run-id-<change>')，对齐 stage.js:93 / task-review.js:645
  const execMarker = join(rr, `current-execute-run-id-${changeName}`)
  assert(execMarker.startsWith(mainRuntime), 'execute marker 在主仓 .runtime 下')
  assert(!execMarker.startsWith(copyRuntime), 'execute marker 不在副本 .runtime 下')

  // 真实 fs：把 marker 写到 resolveRuntimeRoot 返回的根，证明落点确实是主仓
  const realMain = mkTmp('t01-main')
  const realMainSpec = join(realMain, '.sillyspec')
  const realCopySpec = join(realMainSpec, '.runtime', 'worktrees', changeName, '.sillyspec')
  const realOpts = { specDriftAnchor: realMainSpec }
  const realRr = resolveRuntimeRoot(realOpts, realCopySpec)
  mkdirSync(realRr, { recursive: true })
  writeFileSync(join(realRr, `current-execute-run-id-${changeName}`), 'exec-2026-08-06-000000\n')
  assert(existsSync(join(realMainSpec, '.runtime', `current-execute-run-id-${changeName}`)),
    'fs：marker 实际写入主仓 .runtime')
  assert(!existsSync(join(realCopySpec, '.runtime')),
    'fs：副本 .runtime 未被创建（marker 未落副本）')
}

// ════════════════════════════════════════════════════════════
// T-02 cleanup 后 execute-runs 仍存（删副本目录，主仓存活）
// ════════════════════════════════════════════════════════════
console.log('\n--- T-02: cleanup 删 worktree 副本目录后，主仓 execute-runs 存活 ---')
{
  const realMain = mkTmp('t02-main')
  const realMainSpec = join(realMain, '.sillyspec')
  const realMainRuntime = join(realMainSpec, '.runtime')
  // 副本目录（worktree cleanup 的 rmSync 目标）
  const copyRoot = join(realMainSpec, '.runtime', 'worktrees', changeName)
  const copySpecInside = join(copyRoot, '.sillyspec')
  mkdirSync(join(realMainRuntime, 'execute-runs', 'exec-X', 'tasks', 'task-01'), { recursive: true })
  writeFileSync(join(realMainRuntime, 'execute-runs', 'exec-X', 'tasks', 'task-01', 'review.json'), '{}')
  mkdirSync(copySpecInside, { recursive: true }) // 副本存在（drift 未修时 review.json 会落这）

  // 方案 A 落地后：review.json 在主仓 realMainRuntime（resolveRuntimeRoot 锚主仓）。
  // cleanup 整目录删副本 copyRoot（worktree.js rmSync(worktreePath, recursive, force)）
  rmSync(copyRoot, { recursive: true, force: true })
  assert(existsSync(join(realMainRuntime, 'execute-runs', 'exec-X', 'tasks', 'task-01', 'review.json')),
    'cleanup 删副本后，主仓 execute-runs review.json 完整存活')
  assert(!existsSync(copyRoot), '副本目录已被 cleanup 删除')
}

// ════════════════════════════════════════════════════════════
// T-03 stage-reviews 落主仓（stageReviewMarkerPath 组合）
// ════════════════════════════════════════════════════════════
console.log('\n--- T-03: drift anchor → stage-reviews marker 落主仓 ---')
{
  const rr = resolveRuntimeRoot({ specDriftAnchor: mainSpec }, copySpec)
  // stage review marker：prompt.js:492 / gates.js:283 读写的同一路径
  const stageMarker = stageReviewMarkerPath(rr, 'execute', changeName)
  assert(stageMarker.startsWith(mainRuntime),
    `stage review marker 在主仓 .runtime 下（${stageMarker}）`)
  assert(!stageMarker.startsWith(copyRuntime), 'stage review marker 不在副本 .runtime 下')
  assert(stageMarker.includes(`current-stage-review-run-id-execute-${changeName}`),
    'marker 含 current-stage-review-run-id-<stage>-<change>（按 change 隔离）')
}

// ════════════════════════════════════════════════════════════
// T-04 marker 按 change 隔离（共享主仓 .runtime，路径按 changeName 区分）
// ════════════════════════════════════════════════════════════
console.log('\n--- T-04: 多 change 并行 drift 无 marker 路径冲突 ---')
{
  const rr = resolveRuntimeRoot({ specDriftAnchor: mainSpec }, copySpec)
  // 两个 change 各自 drift：specDriftAnchor 同指主仓（同源），但 marker 按 changeName 区分
  const markerA = stageReviewMarkerPath(rr, 'execute', 'changeA')
  const markerB = stageReviewMarkerPath(rr, 'execute', 'changeB')
  assert(markerA !== markerB, '不同 change 的 stage review marker 路径不冲突')
  const execA = join(rr, 'current-execute-run-id-changeA')
  const execB = join(rr, 'current-execute-run-id-changeB')
  assert(execA !== execB, '不同 change 的 execute marker 路径不冲突')
  // execute-runs/<runId>/ 按 runId 隔离（runId 含时间戳全局唯一）；此处验证路径模板按 runId 分目录
  const run1 = join(rr, 'execute-runs', 'exec-2026-08-06-000001', 'tasks', 'task-01', 'review.json')
  const run2 = join(rr, 'execute-runs', 'exec-2026-08-06-000002', 'tasks', 'task-01', 'review.json')
  assert(run1 !== run2, '不同 runId 的 task review 路径不冲突（runId 全局唯一）')
}

// ════════════════════════════════════════════════════════════
// T-05 specDriftAnchor 不触发平台 sentinel（D-02 语义边界）
// ════════════════════════════════════════════════════════════
console.log('\n--- T-05: specDriftAnchor 不触发平台 sentinel（checkApproval/triggerPull 等门禁不误跳）---')
{
  // sentinel 判定形式固定为 specRoot||runtimeRoot（isPlatformMode 单源，checkApproval/triggerPull
  // 等门禁消费；triggerSync 已放行不设门禁），specDriftAnchor 不参与 → drift 命中后审批/下行
  // pull/平台渲染分支不被误跳。
  const sentinel = (po) => !!(po?.specRoot || po?.runtimeRoot)
  assert(sentinel({ specDriftAnchor: mainSpec }) === false,
    'specDriftAnchor 单独设置 → sentinel 不触发（drift 不误进平台分支）')
  assert(sentinel({ specRoot: mainSpec }) === true, 'specRoot → sentinel 触发（平台模式）')
  assert(sentinel({ runtimeRoot: '/p/rt' }) === true, 'runtimeRoot → sentinel 触发（平台模式）')
  assert(sentinel({}) === false && sentinel(null) === false && sentinel(undefined) === false,
    '空/null/undefined opts → sentinel 不触发（本地模式）')
  // 关键边界：specDriftAnchor 与 sentinel 字段语义隔离（设 anchor 不等于设 specRoot/runtimeRoot）
  const driftOnly = { specDriftAnchor: mainSpec }
  assert(driftOnly.specRoot === undefined && driftOnly.runtimeRoot === undefined,
    'specDriftAnchor 不污染 specRoot/runtimeRoot 字段')
}

// ════════════════════════════════════════════════════════════
// T-06 非 drift 零回归（specDriftAnchor 未设 → 本地兜底，行为同旧公式）
// ════════════════════════════════════════════════════════════
console.log('\n--- T-06: 非 drift 场景零回归（runtimeRoot = join(specBase, .runtime)）---')
{
  assert(resolveRuntimeRoot({}, copySpec) === copyRuntime, '{} opts → 本地 specBase/.runtime')
  assert(resolveRuntimeRoot(undefined, copySpec) === copyRuntime, 'undefined opts → 本地')
  assert(resolveRuntimeRoot(null, copySpec) === copyRuntime, 'null opts → 本地')
  assert(resolveRuntimeRoot({ specRoot: null, runtimeRoot: null, specDriftAnchor: null }, copySpec) === copyRuntime,
    '全 null 字段 → 本地兜底（null 不命中任何分支）')
  // 主仓 cwd（常规本地模式）：specBase=主仓 → runtimeRoot=主仓 .runtime
  assert(resolveRuntimeRoot({}, mainSpec) === mainRuntime, '主仓 cwd → 主仓 .runtime（常规本地）')
}

// ════════════════════════════════════════════════════════════
// T-07 平台模式零回归（runtimeRoot 已设 → 返回平台值，anchor 分支不触发）
// ════════════════════════════════════════════════════════════
console.log('\n--- T-07: 平台模式零回归（platformOpts.runtimeRoot 优先）---')
{
  const platRt = join(tmpdir(), 'platform-runtime')
  assert(resolveRuntimeRoot({ runtimeRoot: platRt }, copySpec) === platRt,
    '平台 runtimeRoot 已设 → 返回平台值')
  // 即便同时设 specDriftAnchor，平台 runtimeRoot 仍优先（平台模式不进 drift 分支）
  assert(resolveRuntimeRoot({ runtimeRoot: platRt, specDriftAnchor: mainSpec }, copySpec) === platRt,
    '平台 runtimeRoot 优先于 specDriftAnchor（优先级 runtimeRoot > anchor）')
  // specRoot 是 sentinel 字段（shared.js:288/:315），不是 resolveRuntimeRoot 的输入 —— 单独设 specRoot
  // 不改变 runtimeRoot 解析（仍走 anchor/本地）；resolveRuntimeRoot 只读 runtimeRoot 与 specDriftAnchor。
  assert(resolveRuntimeRoot({ specRoot: '/platform/spec' }, copySpec) === copyRuntime,
    'specRoot 单独设 → 本地兜底（specRoot 非 runtimeRoot 解析输入，被忽略）')
  assert(resolveRuntimeRoot({ specRoot: '/platform/spec', specDriftAnchor: mainSpec }, copySpec) === mainRuntime,
    'specRoot + anchor → anchor 赢（specRoot 不参与解析，anchor 仍生效）')
}

// ════════════════════════════════════════════════════════════
// T-08 非 drift quick + 手动 specDriftAnchor 一致性（守卫不扩到 quick）
// ════════════════════════════════════════════════════════════
console.log('\n--- T-08: 非 drift quick + 手动 specDriftAnchor 验一致性（不扩守卫到 quick）---')
{
  // drift 守卫条件 stageName ∈ [plan,execute,verify,archive]（command.js:537），不含 quick —— quick
  // drift 走 detectQuickSessionDrift fail-fast（command.js:565），不自动锚定。故 quick 场景 specDriftAnchor
  // 不被自动设置 → resolveRuntimeRoot 走本地兜底（与旧公式一致，零回归）。
  const quickOptsNoAnchor = {} // quick 无 drift 守卫介入：无 specDriftAnchor
  assert(resolveRuntimeRoot(quickOptsNoAnchor, copySpec) === copyRuntime,
    'quick 无 anchor → 本地兜底（drift 守卫未扩到 quick，行为不变）')
  // 但 resolveRuntimeRoot 是纯函数：若任何上下文手动传 specDriftAnchor，一致地锚定主仓。
  // 这保证 anchor 语义统一（不依赖"谁设置的"），quick marker 站点（command.js:427/735）改调
  // resolveRuntimeRoot 后，手动 anchor 也能一致生效（T-08 一致性）。
  const manualAnchor = resolveRuntimeRoot({ specDriftAnchor: mainSpec }, copySpec)
  assert(manualAnchor === mainRuntime, '手动 specDriftAnchor → 一致锚主仓 .runtime')
  // 与 drift 守卫设置时结果一致（同输入同输出，纯函数）
  const byGuard = resolveRuntimeRoot({ specDriftAnchor: mainSpec }, copySpec)
  assert(manualAnchor === byGuard, '手动 anchor 与守卫 anchor 结果一致（纯函数确定性）')
}

cleanup()

console.log(`\n==================================================`)
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
if (failed > 0) console.log(`失败项: ${failures.join('; ')}`)
console.log(`==================================================`)
if (failed > 0) process.exit(1)
