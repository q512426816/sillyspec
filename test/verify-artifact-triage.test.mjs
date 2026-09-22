/**
 * 质量扫描伪影分诊 + 失败签名去重 + module 缺省收窄（ql-20260920-010 修复一 a/c/d，
 * 对撞三轮 verify「运行测试和质量扫描」68 分钟单步的机制收口）：
 *   a. classifyTestFailureArtifact 四类伪影签名命中 + 真失败对照不命中；
 *      applyArtifactTriageRerun 编排四态（命中+主树复跑过=放行有据 / 复跑仍挂=真失败 /
 *      不命中=原样且不触发复跑 / 主树口径失败命中=只注记不复跑）；
 *   d. shouldReuseLastFailedScan 判定矩阵 + computeQualityScanDedupKey 豁免面敏感性 +
 *      executeVerifyQualityScan E2E（签名未变不重跑；逃生阀/代码面/豁免面三路解封）；
 *   c. runVerifyTestCheck 缺省收窄 E2E（modules 已配未显式 test_strategy → module 子集；
 *      显式 full 与未配 modules 两对照保持全量）。
 * 修复一 b（venv junction 回归钉）在 gate-snapshot-monorepo.test.mjs。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execSync } from 'node:child_process'
import { classifyTestFailureArtifact, runVerifyTestCheck } from '../src/verify-postcheck.js'
import {
  computeQualityScanDedupKey,
  loadLastQualityScanRecord,
  shouldReuseLastFailedScan,
  applyArtifactTriageRerun,
  executeVerifyQualityScan,
} from '../src/run/verify-quality-scan.js'

const tmpRoots = []
function mk(p) { const d = mkdtempSync(join(tmpdir(), p)); tmpRoots.push(d); return d }
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

function makeRepo() {
  const dir = mk('vat-')
  execSync('git init -q', { cwd: dir })
  execSync('git config user.email t@t.local', { cwd: dir })
  execSync('git config user.name t', { cwd: dir })
  writeFileSync(join(dir, 'README.md'), 'init\n')
  execSync('git add -A', { cwd: dir })
  execSync('git commit -qm init', { cwd: dir })
  mkdirSync(join(dir, '.sillyspec', 'changes', 'c1'), { recursive: true })
  mkdirSync(join(dir, '.sillyspec', '.runtime'), { recursive: true })
  return dir
}

// ── 修复一 a：classifyTestFailureArtifact ───────────────────────────

test('分诊：沙箱环境缺件（条目 H 签名族）命中 sandbox-env-missing', () => {
  const r = classifyTestFailureArtifact({ status: 'failed', failureRemaining: ['ERROR: usage: pytest -n auto'] })
  assert.equal(r.matched, true)
  assert.equal(r.kind, 'sandbox-env-missing')
  const r2 = classifyTestFailureArtifact({ status: 'failed', failureRemaining: ["ModuleNotFoundError: No module named 'pytest_xdist'"] })
  assert.equal(r2.kind, 'sandbox-env-missing', 'pytest 家族缺件归环境类（先于 module-import 判）')
})

test('分诊：本地模块缺失命中 overlay-module-missing', () => {
  const r = classifyTestFailureArtifact({ status: 'failed', failureRemaining: ["ModuleNotFoundError: No module named 'platform_sync'"] })
  assert.equal(r.matched, true)
  assert.equal(r.kind, 'overlay-module-missing')
})

test('分诊：字面 \\r\\n 字节差命中 crlf-diff', () => {
  const r = classifyTestFailureArtifact({ status: 'failed', failureRemaining: ['AssertionError: expected "a\\r\\n" to equal "a\\n"'] })
  assert.equal(r.matched, true)
  assert.equal(r.kind, 'crlf-diff')
})

test('分诊：全部「失败行」实为通过/汇总形态命中 parser-false-positive', () => {
  const r = classifyTestFailureArtifact({ status: 'failed', failureRemaining: ['✓ 超时后 syncStatus=failed 用例', 'Tests  3 passed | 1 skipped'] })
  assert.equal(r.matched, true)
  assert.equal(r.kind, 'parser-false-positive')
})

test('分诊对照：真实失败（✕ 行 / AssertionError）与 passed 态不命中', () => {
  assert.equal(classifyTestFailureArtifact({ status: 'failed', failureRemaining: ['✕ suite > case (2 ms)', 'AssertionError: expected 1 to be 2'] }).matched, false, '真失败行不命中任何伪影类')
  assert.equal(classifyTestFailureArtifact({ status: 'passed', failureRemaining: [] }).matched, false, 'passed 态不分诊')
  assert.equal(classifyTestFailureArtifact({ status: 'failed', failureRemaining: [], outputTail: 'Error: Process exited with code 1' }).matched, false, '无判账行集时 tail 回退也不含已知签名 → 不命中')
})

// ── 修复一 a：applyArtifactTriageRerun 编排 ─────────────────────────

test('分诊编排：命中且主树复跑通过 → 按主树结果放行（artifactTriage 随行，reason 不伪造）', () => {
  const triage = { matched: true, kind: 'sandbox-env-missing', evidence: ['ERROR: usage: pytest -n auto'], advice: 'adv' }
  let calls = 0
  const out = applyArtifactTriageRerun({
    testCheck: { status: 'failed', reason: '退出码 1' },
    classify: () => triage,
    snap: { snapshotRoot: 'X' },
    rerunInMainScope: () => { calls++; return { status: 'passed', reason: null } },
  })
  assert.equal(calls, 1, '主树复跑恰好一次')
  assert.equal(out.status, 'passed')
  assert.equal(out.artifactTriage, triage, '分诊证据随台账落盘')
  assert.equal(out.reason, null, 'passed 态 reason 不动（披露走 console + artifactTriage 字段）')
})

test('分诊编排：命中但主树复跑仍挂 → 真失败拦截（两口径对照注记）', () => {
  let calls = 0
  const out = applyArtifactTriageRerun({
    testCheck: { status: 'failed', reason: '退出码 1' },
    classify: () => ({ matched: true, kind: 'crlf-diff', evidence: ['x'], advice: 'adv' }),
    snap: {},
    rerunInMainScope: () => { calls++; return { status: 'failed', reason: '也挂' } },
  })
  assert.equal(calls, 1)
  assert.equal(out.status, 'failed')
  assert.match(out.reason, /两口径（快照\/主树）均失败/)
})

test('分诊编排：不命中 → 原样返回且不触发复跑', () => {
  let calls = 0
  const src = { status: 'failed', reason: '退出码 1' }
  const out = applyArtifactTriageRerun({
    testCheck: src,
    classify: () => ({ matched: false, kind: null, evidence: [], advice: null }),
    snap: {},
    rerunInMainScope: () => { calls++; return { status: 'passed' } },
  })
  assert.equal(calls, 0)
  assert.equal(out, src, '原样返回（零新对象零扰动）')
})

test('分诊编排：主树口径失败命中 → 只注记 advice 不复跑（本身即对照口径）', () => {
  let calls = 0
  const out = applyArtifactTriageRerun({
    testCheck: { status: 'failed', reason: '退出码 1' },
    classify: () => ({ matched: true, kind: 'parser-false-positive', evidence: ['✓ x'], advice: '上报输出原文' }),
    snap: null,
    rerunInMainScope: () => { calls++; return { status: 'passed' } },
  })
  assert.equal(calls, 0)
  assert.equal(out.status, 'failed')
  assert.match(out.reason, /伪影分诊命中（parser-false-positive）/)
})

// ── 修复一 d：shouldReuseLastFailedScan 矩阵 + 去重键敏感性 ──────────

test('去重判定矩阵：force / 无记录 / passed / 存量无键 / 键失配 / 口径变化 / 命中', () => {
  const rec = { testResult: { status: 'failed' }, dedupKey: 'k', usedSnapshot: true }
  assert.equal(shouldReuseLastFailedScan({ lastRecord: rec, currentDedupKey: 'k', plannedSnapshot: true, forceRerun: true }).reuse, false, '逃生阀')
  assert.equal(shouldReuseLastFailedScan({ lastRecord: null, currentDedupKey: 'k', plannedSnapshot: true }).reuse, false, '无记录')
  assert.equal(shouldReuseLastFailedScan({ lastRecord: { testResult: { status: 'passed' }, dedupKey: 'k' }, currentDedupKey: 'k', plannedSnapshot: true }).reuse, false, 'passed 不复用')
  assert.equal(shouldReuseLastFailedScan({ lastRecord: { testResult: { status: 'failed' } }, currentDedupKey: 'k', plannedSnapshot: true }).reuse, false, '存量记录无 dedupKey 保守重跑')
  assert.equal(shouldReuseLastFailedScan({ lastRecord: rec, currentDedupKey: 'k2', plannedSnapshot: true }).reuse, false, '键失配')
  assert.equal(shouldReuseLastFailedScan({ lastRecord: rec, currentDedupKey: 'k', plannedSnapshot: false }).reuse, false, '快照口径变化')
  assert.equal(shouldReuseLastFailedScan({ lastRecord: rec, currentDedupKey: 'k', plannedSnapshot: true }).reuse, true, '全未变 → 复用')
})

test('去重键：known_failures 豁免面 / 代码面变化即失配；文档面不失效（指纹口径继承）', () => {
  const dir = makeRepo()
  try {
    const specBase = join(dir, '.sillyspec')
    writeFileSync(join(specBase, 'local.yaml'), 'commands:\n  test: npm test\nknown_failures:\n  - old-debt\n')
    const k0 = computeQualityScanDedupKey({ cwd: dir, specBase })
    assert.ok(typeof k0 === 'string' && k0.length === 64)
    // 豁免面补救（agent 加条目）→ 键失配 → 允许重跑
    writeFileSync(join(specBase, 'local.yaml'), 'commands:\n  test: npm test\nknown_failures:\n  - old-debt\n  - new-exemption\n')
    const k1 = computeQualityScanDedupKey({ cwd: dir, specBase })
    assert.notEqual(k1, k0, 'known_failures 变化即失配（补救路径不被去重误拦）')
    // 代码面变化 → 失配
    writeFileSync(join(dir, 'src-thing.js'), 'module.exports = 1\n')
    const k2 = computeQualityScanDedupKey({ cwd: dir, specBase })
    assert.notEqual(k2, k1)
    // 文档面变化 → 不失效（verify 窗口合法产出）
    writeFileSync(join(specBase, 'changes', 'c1', 'verify-result.md'), '# report\n')
    assert.equal(computeQualityScanDedupKey({ cwd: dir, specBase }), k2, '文档面不触发失配')
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

// ── 修复一 d：executeVerifyQualityScan E2E ──────────────────────────

test('质量扫描 E2E：失败签名未变不重跑；逃生阀/代码面/豁免面三路解封', async () => {
  const dir = makeRepo()
  try {
    // 计数器脚本：真实执行才 append（去重跳过时不增）；打印失败行 + 退出 1
    writeFileSync(join(dir, 'count-fail.js'), 'console.log("\\u2715 Boom-counter test failed")\nrequire("fs").appendFileSync(__dirname + "/runs.txt", "x\\n")\nprocess.exit(1)\n')
    writeFileSync(join(dir, 'exit0.js'), 'process.exit(0)\n')
    writeFileSync(join(dir, '.sillyspec', 'local.yaml'), 'commands:\n  test: node count-fail.js\n  lint: node exit0.js\n')
    const specBase = join(dir, '.sillyspec')
    const runCount = () => (existsSync(join(dir, 'runs.txt')) ? readFileSync(join(dir, 'runs.txt'), 'utf8').trim().split('\n').filter(Boolean).length : 0)
    const prevOff = process.env.SILLYSPEC_VERIFY_GATE_SNAPSHOT_OFF
    const prevRerun = process.env.SILLYSPEC_VERIFY_QUALITY_SCAN_RERUN
    process.env.SILLYSPEC_VERIFY_GATE_SNAPSHOT_OFF = '1'
    delete process.env.SILLYSPEC_VERIFY_QUALITY_SCAN_RERUN
    try {
      // 第一次：真跑失败，台账落盘（dedupKey + usedSnapshot 随行）
      await assert.rejects(executeVerifyQualityScan({ cwd: dir, specBase, changeName: 'c1' }), /实测测试失败/)
      assert.equal(runCount(), 1, '第一次真跑')
      const rec = loadLastQualityScanRecord({ specBase, changeName: 'c1' })
      assert.equal(rec.testResult.status, 'failed')
      assert.ok(rec.dedupKey, '新记录携带去重键')
      assert.equal(rec.usedSnapshot, false, '主树口径如实记录')
      // 第二次：什么都没变 → 去重（不重跑），报「失败签名未变」
      await assert.rejects(executeVerifyQualityScan({ cwd: dir, specBase, changeName: 'c1' }), /失败签名未变/)
      assert.equal(runCount(), 1, '签名未变跳过重跑（三连假红重试根治点）')
      // 第三次：RERUN=1 同签名 → RERUN 签名闸拒绝（r5l 方案 4 新契约：RERUN=1 不再无条件
      // 解封——签名含环境探针，环境真变自动放行；不变则重跑注定同果）
      process.env.SILLYSPEC_VERIFY_QUALITY_SCAN_RERUN = '1'
      await assert.rejects(executeVerifyQualityScan({ cwd: dir, specBase, changeName: 'c1' }), /RERUN 签名闸拒绝重跑/)
      assert.equal(runCount(), 1, '同签名 RERUN=1 被签名闸拒绝（不真跑）')
      // 第三次b：force 逃生阀 → 无条件真跑（旧 RERUN=1 的裸语义移到 force 档）
      process.env.SILLYSPEC_VERIFY_QUALITY_SCAN_RERUN = 'force'
      await assert.rejects(executeVerifyQualityScan({ cwd: dir, specBase, changeName: 'c1' }), /实测测试失败/)
      assert.equal(runCount(), 2, 'force 逃生阀解封真跑')
      delete process.env.SILLYSPEC_VERIFY_QUALITY_SCAN_RERUN
      // 第四次：代码面变化 → 指纹失配 → 真跑
      writeFileSync(join(dir, 'src-thing.js'), 'module.exports = 1\n')
      await assert.rejects(executeVerifyQualityScan({ cwd: dir, specBase, changeName: 'c1' }), /实测测试失败/)
      assert.equal(runCount(), 3, '代码变化解封真跑')
      // 第五次：豁免面补救 → 键失配 → 重跑且豁免命中通过（假红补救全流程闭环）
      writeFileSync(join(dir, '.sillyspec', 'local.yaml'), 'commands:\n  test: node count-fail.js\n  lint: node exit0.js\nknown_failures:\n  - Boom-counter\n')
      await executeVerifyQualityScan({ cwd: dir, specBase, changeName: 'c1' })
      assert.equal(runCount(), 4, '豁免面变化解封重跑且判 passed（不再 throw）')
      assert.equal(loadLastQualityScanRecord({ specBase, changeName: 'c1' }).testResult.status, 'passed')
    } finally {
      if (prevOff === undefined) delete process.env.SILLYSPEC_VERIFY_GATE_SNAPSHOT_OFF
      else process.env.SILLYSPEC_VERIFY_GATE_SNAPSHOT_OFF = prevOff
      if (prevRerun === undefined) delete process.env.SILLYSPEC_VERIFY_QUALITY_SCAN_RERUN
      else process.env.SILLYSPEC_VERIFY_QUALITY_SCAN_RERUN = prevRerun
    }
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

// ── 修复一 c：module 缺省收窄 E2E ───────────────────────────────────

test('缺省收窄：modules 已配未显式 test_strategy → module 子集（不落全量）', () => {
  const dir = makeRepo()
  try {
    writeFileSync(join(dir, 'modok.js'), 'console.log("ok")\n')
    writeFileSync(join(dir, 'exit1.js'), 'process.exit(1)\n')
    mkdirSync(join(dir, 'src'), { recursive: true })
    // 命中口径同 verify-crlf-module-subset-e2e：已提交文件的未提交再修改（git diff HEAD
    // 不含未跟踪文件——纯新增文件不算变更集）
    writeFileSync(join(dir, 'src', 'thing.js'), 'x\n')
    execSync('git add -A && git commit -qm add-src', { cwd: dir })
    writeFileSync(join(dir, 'src', 'thing.js'), 'y\n')
    const specBase = join(dir, '.sillyspec')
    writeFileSync(join(specBase, 'local.yaml'),
      'commands:\n  test: node exit1.js\nmodules:\n  core: { path: "src/", test: "node modok.js" }\n')
    const r = runVerifyTestCheck({ cwd: dir, specBase, changeName: 'c1' })
    assert.equal(r.mode, 'module-subset', '缺省收窄到 module 子集')
    assert.equal(r.status, 'passed', '模块命令实测通过（全量 exit1 未被触发）')
    assert.match(r.command, /^module\[core\]/)
    // 对照 A：显式 test_strategy: full → 全量真跑（用户有意跑全量不受收窄影响）
    writeFileSync(join(specBase, 'local.yaml'),
      'commands:\n  test: node exit1.js\ntest_strategy: full\nmodules:\n  core: { path: "src/", test: "node modok.js" }\n')
    const rFull = runVerifyTestCheck({ cwd: dir, specBase, changeName: 'c1' })
    assert.equal(rFull.mode, 'full')
    assert.equal(rFull.status, 'failed', '显式 full 照跑全量（exit1 失败如实拦截）')
    // 对照 B：未配 modules 且未配 test_strategy → 保持缺省全量（零打扰）
    writeFileSync(join(specBase, 'local.yaml'), 'commands:\n  test: node exit1.js\n')
    const rNoMod = runVerifyTestCheck({ cwd: dir, specBase, changeName: 'c1' })
    assert.equal(rNoMod.mode, 'full')
    assert.equal(rNoMod.status, 'failed')
  } finally { rmSync(dir, { recursive: true, force: true }) }
})
