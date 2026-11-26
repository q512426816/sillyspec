/**
 * verify 质量扫描 noAI 化三件套（P0-1，docs/sillyspec/noai-ir-roadmap.md §3）：
 *   ①指纹复用防重复跑——computeQualityScanFingerprint / storeQualityScan /
 *     loadReusableQualityScan：文档面变化不失效、代码面变化即失效、git 不可用 fail-closed；
 *   ②归因透传 + noAI 动作——runArchiveCloseGate 成败两路（失败 throw 不盖步）；
 *   ③结论草稿不进判定链——applyConclusionDraftToText 三态 + evaluateConclusionDraft
 *     全绿/各否决分支；决策追踪矩阵机械半边 buildDecisionChainMatrix / injectDecisionChainDraft。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, readFileSync, writeFileSync, mkdirSync, existsSync, appendFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { execSync } from 'node:child_process'
import {
  computeQualityScanFingerprint,
  computeQualityScanDedupKey,
  computeQualityScanDirtyContentKey,
  computeQualityScanPassedKey,
  shouldReuseLastFailedScan,
  shouldReuseLastPassedScan,
  qualityScanRecordPath,
  storeQualityScan,
  loadReusableQualityScan,
  loadLastQualityScanRecord,
  computeRerunSignature,
  evaluateConclusionDraft,
  runArchiveCloseGate,
} from '../src/run/archive-quality-scan.js'

function makeFixtureRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'vqs-'))
  execSync('git init -q', { cwd: dir })
  execSync('git config user.email t@t.local', { cwd: dir })
  execSync('git config user.name t', { cwd: dir })
  writeFileSync(join(dir, 'README.md'), 'init\n')
  // 命令用裸值形态（extractTestCommand 裸值正则排除引号——node -e "…" 解析不到，实测坑）。
  // 2026-09-26-dynamic-test-inference：exit0/1 随基线提交（快照 HEAD 在场——门内 lint 引用可达）
  writeFileSync(join(dir, 'exit0.js'), 'process.exit(0)\n')
  writeFileSync(join(dir, 'exit1.js'), 'process.exit(1)\n')
  execSync('git add -A', { cwd: dir })
  execSync('git commit -qm init', { cwd: dir })
  mkdirSync(join(dir, '.sillyspec', 'changes', 'c1'), { recursive: true })
  mkdirSync(join(dir, '.sillyspec', '.runtime'), { recursive: true })
  writeFileSync(join(dir, '.sillyspec', 'local.yaml'), 'commands:\n  test: node exit0.js\n  lint: node exit0.js\n')
  return dir
}

const PASSED_TEST = { status: 'passed', command: 'x', exitCode: 0, durationMs: 12, outputTail: '', reason: null, resultPath: null }
const PASSED_LINT = { status: 'passed', command: 'y', exitCode: 0, durationMs: 3, outputTail: '', reason: null }

test('指纹：同代码态稳定；文档面（.sillyspec//docs//*.md）变化不失效；代码/配置/HEAD 变化即失效', () => {
  const dir = makeFixtureRepo()
  try {
    const specBase = join(dir, '.sillyspec')
    const fp0 = computeQualityScanFingerprint({ cwd: dir, specBase })
    assert.ok(typeof fp0 === 'string' && fp0.length === 64, 'git 仓内指纹为 sha256 hex')
    // 文档面变化（verify 窗口内的合法产出）→ 指纹不变
    appendFileSync(join(specBase, 'changes', 'c1', 'verify-result.md'), '# report\n')
    mkdirSync(join(dir, 'docs'), { recursive: true })
    writeFileSync(join(dir, 'docs', 'note.md'), 'doc\n')
    writeFileSync(join(dir, 'NOTE.md'), 'doc\n')
    assert.equal(computeQualityScanFingerprint({ cwd: dir, specBase }), fp0, 'md/.sillyspec/docs 写入不触发失效')
    // 源码面变化 → 失效
    writeFileSync(join(dir, 'src-thing.js'), 'module.exports = 1\n')
    const fp1 = computeQualityScanFingerprint({ cwd: dir, specBase })
    assert.notEqual(fp1, fp0, 'src 文件新增触发失效')
    // 配置面变化（commands 段）→ 失效
    writeFileSync(join(specBase, 'local.yaml'), 'commands:\n  test: node exit0.js\n  lint: node exit0.js\n  typecheck: npx tsc --noEmit\n')
    const fp2 = computeQualityScanFingerprint({ cwd: dir, specBase })
    assert.notEqual(fp2, fp1, 'commands 配置变化触发失效')
    // HEAD 变化（提交）→ 失效
    writeFileSync(join(specBase, 'local.yaml'), 'commands:\n  test: node exit0.js\n  lint: node exit0.js\n')
    assert.equal(computeQualityScanFingerprint({ cwd: dir, specBase }), fp1, '配置还原后指纹回到 fp1（未提交 src 仍在）')
    execSync('git add -A && git commit -qm c2', { cwd: dir })
    assert.notEqual(computeQualityScanFingerprint({ cwd: dir, specBase }), fp1, 'HEAD 推进触发失效')
  } finally {
    try { rmSync(dir, { recursive: true, force: true }) } catch {}
  }
})

test('复用记录：同指纹回环可读；失配/损坏/failed 不复用；changeName 缺失无记录路径', () => {
  const dir = makeFixtureRepo()
  try {
    const specBase = join(dir, '.sillyspec')
    const st = storeQualityScan({ specBase, cwd: dir, changeName: 'c1', testResult: PASSED_TEST, lintResult: PASSED_LINT })
    assert.ok(st && st.path && existsSync(st.path), '记录落盘')
    assert.equal(st.path, qualityScanRecordPath(specBase, 'c1'), '记录路径按变更名分片（.runtime/archive-quality-scan-<change>.json）')
    assert.equal(qualityScanRecordPath(specBase, null), null, '无 changeName → 无记录路径')
    const loaded = loadReusableQualityScan({ specBase, cwd: dir, changeName: 'c1' })
    assert.ok(loaded, '同指纹回环可读')
    assert.equal(loaded.testResult.status, 'passed')
    assert.equal(loaded.lintResult.status, 'passed')
    // 代码变化 → 失配不复用
    writeFileSync(join(dir, 'src2.js'), 'export const x = 2\n')
    assert.equal(loadReusableQualityScan({ specBase, cwd: dir, changeName: 'c1' }), null, '代码失配 → null')
    execSync('git add -A && git commit -qm c3', { cwd: dir })
    // 损坏 JSON → null
    writeFileSync(st.path, '{broken')
    assert.equal(loadReusableQualityScan({ specBase, cwd: dir, changeName: 'c1' }), null, '损坏记录 → null')
    // failed 实测不复用（防御兜底：失败态指纹下步骤本就未完成）
    writeFileSync(st.path, JSON.stringify({ schemaVersion: 1, source: 'cli-noai', change: 'c1', fingerprint: computeQualityScanFingerprint({ cwd: dir, specBase }), testResult: { ...PASSED_TEST, status: 'failed' } }))
    assert.equal(loadReusableQualityScan({ specBase, cwd: dir, changeName: 'c1' }), null, 'failed 不复用')
    assert.equal(loadReusableQualityScan({ specBase, cwd: dir, changeName: null }), null, '无 changeName → null')
  } finally {
    try { rmSync(dir, { recursive: true, force: true }) } catch {}
  }
})

test('收口实测门记录前缀：archive-quality-scan-（更名随挂载点，2026-11-26-verify-stage-retire）', () => {
  const p = qualityScanRecordPath('/spec', 'c1')
  assert.ok(p && p.includes('archive-quality-scan-c1.json'), '记录文件名为 archive-quality-scan-<change>.json（实际 ' + p + '）')
  assert.ok(!p.includes('verify-quality-scan-'), '不再写旧前缀（存量缓存一次性失配，设计已声明）')
})

test('noAI 动作：实测全绿 → 落记录不抛；实测失败 → throw（进度不推进语义）且记录仍落盘', async () => {
  const dir = makeFixtureRepo()
  try {
    const specBase = join(dir, '.sillyspec')
    // 2026-09-26-dynamic-test-inference 迁移：commands.test 全量道退役——动态子集面放
    // 可翻转测试文件（提交基线 + 未提交翻转）；原 fixtures 经 commands.test exit0/exit1 触达
    delete process.env.NODE_TEST_CONTEXT // 嵌套 runner 防污染
    const flipPath = join(dir, 'flip.test.mjs')
    const flipOk = "import { test } from 'node:test'" + '\n' + "import assert from 'node:assert/strict'" + '\n' + "test('flip', () => { assert.ok(true) })" + '\n'
    const flipBad = "import { test } from 'node:test'" + '\n' + "import assert from 'node:assert/strict'" + '\n' + "test('flip', () => { assert.fail('planned failure') })" + '\n'
    writeFileSync(flipPath, flipOk)
    execSync('git add flip.test.mjs && git commit -qm flip', { cwd: dir, stdio: 'ignore' })
    writeFileSync(flipPath, flipOk + '// touched\n') // 未提交触碰（in-diff 通过版）
    await runArchiveCloseGate({ cwd: dir, specBase, changeName: 'c1', platformOpts: {} })
    const rec = loadReusableQualityScan({ specBase, cwd: dir, changeName: 'c1' })
    assert.ok(rec, '全绿后记录可回环（--done 复用面）')
    assert.equal(rec.testResult.status, 'passed')
    // 失败路：翻转失败版（代码指纹随动 → 去重失配真跑）→ throw；退役 commands.test 不参与判定
    writeFileSync(flipPath, flipBad)
    await assert.rejects(
      () => runArchiveCloseGate({ cwd: dir, specBase, changeName: 'c1', platformOpts: {} }),
      (e) => {
        assert.ok(String(e.message).includes('复入本步'), '失败信息指引复入本步')
        return true
      },
    )
    // 失败记录同样落盘（审计台账），但 failed 不进复用面
    const rec2 = loadReusableQualityScan({ specBase, cwd: dir, changeName: 'c1' })
    assert.equal(rec2, null, 'failed 记录不复用')
  } finally {
    try { rmSync(dir, { recursive: true, force: true }) } catch {}
  }
})

// ── RERUN 失败签名闸（r5l-forensic-verdict.md 方案 4 / 评审护栏#6 五态回归）──

test('RERUN 签名纯函数：同态稳定；RERUN 自身取值不入键；环境/代码/测试面变化即失配', () => {
  const dir = makeFixtureRepo()
  try {
    const specBase = join(dir, '.sillyspec')
    const baseEnv = { ...process.env }
    delete baseEnv.SILLYSPEC_VERIFY_QUALITY_SCAN_RERUN
    delete baseEnv.SILLYSPEC_STEP_GUIDE
    const s0 = computeRerunSignature({ cwd: dir, specBase, env: baseEnv })
    assert.ok(typeof s0 === 'string' && s0.length === 64, '签名 sha256 hex')
    assert.equal(computeRerunSignature({ cwd: dir, specBase, env: baseEnv }), s0, '同态稳定')
    // 被测旋钮不是环境：RERUN=1/force 取值不影响签名（否则闸门与历史记录恒失配永不触发）
    const withRerun = { ...baseEnv, SILLYSPEC_VERIFY_QUALITY_SCAN_RERUN: '1' }
    assert.equal(computeRerunSignature({ cwd: dir, specBase, env: withRerun }), s0, 'RERUN 取值不入键')
    assert.equal(computeRerunSignature({ cwd: dir, specBase, env: { ...baseEnv, SILLYSPEC_VERIFY_QUALITY_SCAN_RERUN: 'force' } }), s0, 'force 取值同样不入键')
    // 环境探针入键：行为开关变化 → 签名失配（环境真变自动放行的机制基础）
    const envChanged = { ...baseEnv, SILLYSPEC_STEP_GUIDE: '0' }
    assert.notEqual(computeRerunSignature({ cwd: dir, specBase, env: envChanged }), s0, '环境探针变化 → 失配')
    // 代码变化 → dedupKey 变 → 失配
    writeFileSync(join(dir, 'src-thing.js'), 'module.exports = 1\n')
    assert.notEqual(computeRerunSignature({ cwd: dir, specBase, env: baseEnv }), s0, '代码变化 → 失配')
    // 测试面变化 → 失配（fixture 无 test/ 目录时为 unavailable 占位，建目录后摘要生效）
    writeFileSync(join(dir, 'src-thing.js'), 'module.exports = 1\n') // 保持同一代码态
    const withFace = computeRerunSignature({ cwd: dir, specBase, env: baseEnv })
    mkdirSync(join(dir, 'test'), { recursive: true })
    writeFileSync(join(dir, 'test', 'a.test.js'), 'import { test } from "node:test"\n')
    assert.notEqual(computeRerunSignature({ cwd: dir, specBase, env: baseEnv }), withFace, '测试面出现 → 失配（unavailable→实测摘要）')
  } finally {
    try { rmSync(dir, { recursive: true, force: true }) } catch {}
  }
})

test('RERUN 签名闸五态：同签名拒（throw=退出码非0 同源）/ 代码变放行 / 环境变放行 / force 放行 / 既有去重语义零回归', async () => {
  const dir = makeFixtureRepo()
  try {
    const specBase = join(dir, '.sillyspec')
    // 2026-09-26-dynamic-test-inference 迁移：动态子集面放失败测试文件（原 commands.test exit1 触达）
    delete process.env.NODE_TEST_CONTEXT // 嵌套 runner 防污染
    const flipPath = join(dir, 'flip.test.mjs')
    const flipBad = "import { test } from 'node:test'" + '\n' + "import assert from 'node:assert/strict'" + '\n' + "test('flip', () => { assert.fail('planned failure') })" + '\n'
    writeFileSync(flipPath, flipBad)
    execSync('git add flip.test.mjs && git commit -qm flip-bad', { cwd: dir, stdio: 'ignore' })
    writeFileSync(flipPath, flipBad + '// touched' + '\n') // 未提交触碰（in-diff）
    // 造失败记录（RERUN 未设——真实时序：失败在先，重扫在后）
    await assert.rejects(() => runArchiveCloseGate({ cwd: dir, specBase, changeName: 'c2', platformOpts: {} }))
    const rec0 = loadLastQualityScanRecord({ specBase, changeName: 'c2' })
    assert.ok(rec0.rerunSignature, '失败记录携带 rerunSignature（additive 落盘）')

    // 态①：同签名 + RERUN=1 → 拒绝重跑（throw=CLI 顶层 exitCode 1 同源；不是实测失败的复入语义）
    process.env.SILLYSPEC_VERIFY_QUALITY_SCAN_RERUN = '1'
    await assert.rejects(
      () => runArchiveCloseGate({ cwd: dir, specBase, changeName: 'c2', platformOpts: {} }),
      (e) => String(e.message).includes('RERUN 签名闸拒绝重跑'),
    )
    assert.equal(loadLastQualityScanRecord({ specBase, changeName: 'c2' }).rerunSignature, rec0.rerunSignature, '拒跑不刷新记录')

    // 态②：代码变（指纹失配）→ RERUN=1 自动放行（真跑了：失败语义回到「复入本步」而非签名闸）
    writeFileSync(join(dir, 'src-thing.js'), 'module.exports = 2\n')
    await assert.rejects(
      () => runArchiveCloseGate({ cwd: dir, specBase, changeName: 'c2', platformOpts: {} }),
      (e) => String(e.message).includes('复入本步'),
    )
    const rec2 = loadLastQualityScanRecord({ specBase, changeName: 'c2' })
    assert.notEqual(rec2.rerunSignature, rec0.rerunSignature, '代码变化 → 重跑后签名刷新')

    // 态③：环境变（探针入键：SILLYSPEC_STEP_GUIDE 未设→设值）→ RERUN=1 自动放行
    process.env.SILLYSPEC_STEP_GUIDE = '0'
    await assert.rejects(
      () => runArchiveCloseGate({ cwd: dir, specBase, changeName: 'c2', platformOpts: {} }),
      (e) => String(e.message).includes('复入本步'),
    )
    delete process.env.SILLYSPEC_STEP_GUIDE
    // 环境回摆同样是环境变化：首跑相对态③记录（探针含 STEP_GUIDE='0'）失配 → 放行并按
    // 回摆后环境刷记录；紧接着同签名再跑 → 拒绝（闸门对来回摆动敏感，双向生效）
    await assert.rejects(
      () => runArchiveCloseGate({ cwd: dir, specBase, changeName: 'c2', platformOpts: {} }),
      (e) => String(e.message).includes('复入本步'),
    )
    await assert.rejects(
      () => runArchiveCloseGate({ cwd: dir, specBase, changeName: 'c2', platformOpts: {} }),
      (e) => String(e.message).includes('RERUN 签名闸拒绝重跑'),
    )

    // 态④：force——同签名也放行（无条件逃生阀）
    process.env.SILLYSPEC_VERIFY_QUALITY_SCAN_RERUN = 'force'
    await assert.rejects(
      () => runArchiveCloseGate({ cwd: dir, specBase, changeName: 'c2', platformOpts: {} }),
      (e) => String(e.message).includes('复入本步'),
    )
    delete process.env.SILLYSPEC_VERIFY_QUALITY_SCAN_RERUN

    // 态⑤：RERUN 未设 → 既有失败签名去重语义零回归。函数级断言（shouldReuseLastFailedScan
    // 纯函数）：dedupKey 全等 + 口径一致 → reuse=true——RERUN 未设路径的判定输入与分流一行
    // 未动，语义即未动（集成级 refused-by-reuse 在本 fixture 不可达：tmpdir 无 change 目录 →
    // 快照创建 fail-soft 回退主仓 usedSnapshot=false ≠ plannedSnapshot=true，既有口径短路
    // snapshot-scope-changed 与本改动无关；快照口径变化在 RERUN 闸侧由环境探针覆盖）。
    const recEnd = loadLastQualityScanRecord({ specBase, changeName: 'c2' })
    const verdictSame = shouldReuseLastFailedScan({
      lastRecord: recEnd,
      currentDedupKey: computeQualityScanDedupKey({ cwd: dir, specBase }),
      plannedSnapshot: Boolean(recEnd.usedSnapshot),
    })
    assert.equal(verdictSame.reuse, true, '同 dedupKey+同口径 → 既有去重照常复用（语义零回归）')
    assert.equal(shouldReuseLastFailedScan({
      lastRecord: recEnd,
      currentDedupKey: 'deadbeef',
      plannedSnapshot: Boolean(recEnd.usedSnapshot),
    }).reason, 'dedup-key-mismatch（代码/配置/豁免面/HEAD 已变化）', '失配路径文案逐字保持')
  } finally {
    delete process.env.SILLYSPEC_VERIFY_QUALITY_SCAN_RERUN
    delete process.env.SILLYSPEC_STEP_GUIDE
    try { rmSync(dir, { recursive: true, force: true }) } catch {}
  }
})


test('passed 幂等闸（2026-09-30-quality-scan-passed-idempotent）：同 dedupKey+同口径免重跑（ranAt 不刷新）；代码变/RERUN=1 自动重测；纯函数六态', async (t) => {
  const dir = makeFixtureRepo()
  // tmpdir fixture 快照建不成（usedSnapshot=false）——SNAPSHOT_OFF=1 对齐 plannedSnapshot 口径，
  // 闸在集成级可达（与失败闸态⑤注释同因由）
  process.env.SILLYSPEC_VERIFY_GATE_SNAPSHOT_OFF = '1'
  const logs = []
  const mocked = t.mock.method(console, 'log', (...a) => { logs.push(a.join(' ')) })
  try {
    const specBase = join(dir, '.sillyspec')
    // 动态子集需要测试面（无测试文件 → skip 非 passed）：放 passing 测试 + 未提交触碰（in-diff）
    // 命中子集——与 RERUN 签名闸测试 c2 放 flip.test.mjs 同手法
    const okPath = join(dir, 'ok.test.mjs')
    const okSrc = "import { test } from 'node:test'\nimport assert from 'node:assert/strict'\ntest('ok', () => { assert.ok(true) })\n"
    writeFileSync(okPath, okSrc)
    execSync('git add ok.test.mjs && git commit -qm ok-test', { cwd: dir, stdio: 'ignore' })
    writeFileSync(okPath, okSrc + '// touched\n')
    // 第一轮：真跑 passed
    await runArchiveCloseGate({ cwd: dir, specBase, changeName: 'c1', platformOpts: {} })
    const rec1 = loadLastQualityScanRecord({ specBase, changeName: 'c1' })
    assert.equal(rec1.testResult.status, 'passed', '第一轮真跑 passed 落盘')
    assert.ok(rec1.dedupKey, '记录携带 dedupKey')

    // 第二轮：码态不动、只改文档（收敛循环实态）→ 幂等命中免重跑
    appendFileSync(join(specBase, 'changes', 'c1', 'verify-result.md'), '# 第二轮修订\n')
    logs.length = 0
    await runArchiveCloseGate({ cwd: dir, specBase, changeName: 'c1', platformOpts: {} })
    const rec2 = loadLastQualityScanRecord({ specBase, changeName: 'c1' })
    assert.equal(rec2.ranAt, rec1.ranAt, '幂等命中不重写记录（ranAt 不刷新——真跑必刷新）')
    assert.ok(logs.some((l) => l.includes('幂等命中')), '披露行在场（含免重跑声明）')
    assert.ok(logs.some((l) => l.includes('幂等复用')), '完成提示在场')

    // 第三轮：代码变化 → dedupKey 失配自动重测（ranAt 刷新）
    writeFileSync(join(dir, 'src-thing.js'), 'module.exports = 1\n')
    await runArchiveCloseGate({ cwd: dir, specBase, changeName: 'c1', platformOpts: {} })
    const rec3 = loadLastQualityScanRecord({ specBase, changeName: 'c1' })
    assert.notEqual(rec3.ranAt, rec2.ranAt, '代码变化 → 重测刷新记录')

    // 第四轮：RERUN=1 逃生阀旁路幂等闸（码态未变也强制重跑，ranAt 刷新）
    process.env.SILLYSPEC_VERIFY_QUALITY_SCAN_RERUN = '1'
    await runArchiveCloseGate({ cwd: dir, specBase, changeName: 'c1', platformOpts: {} })
    const rec4 = loadLastQualityScanRecord({ specBase, changeName: 'c1' })
    assert.notEqual(rec4.ranAt, rec3.ranAt, 'RERUN=1 旁路幂等闸 → 强制重跑刷新记录')

    // 第五轮（关键防吞面）：同文件内容修改（文件集不变——dedupKey 盲区）→ passedKey 内容键失配重测
    const contentKeyBeforeFlip = computeQualityScanDirtyContentKey({ cwd: dir })
    writeFileSync(okPath, okSrc + '// content flip\n' + 'assert.ok(1)\n')
    assert.notEqual(computeQualityScanDirtyContentKey({ cwd: dir }), contentKeyBeforeFlip, '内容键函数级：同文件未提交内容修改 → 键变化（trim:false 保行首状态位，路径可读）')
    assert.ok(computeQualityScanPassedKey({ cwd: dir, specBase }), '合成键函数级：git 仓内非 null')
    await runArchiveCloseGate({ cwd: dir, specBase, changeName: 'c1', platformOpts: {} })
    const rec5 = loadLastQualityScanRecord({ specBase, changeName: 'c1' })
    assert.notEqual(rec5.ranAt, rec4.ranAt, '同文件未提交内容修改 → 内容键失配自动重测（闸不吞真实代码修改）')

    // 纯函数七态（与 shouldReuseLastFailedScan 对称）
    const passedRec = { testResult: { status: 'passed' }, lintResult: { status: 'passed' }, passedKey: 'k1', usedSnapshot: false }
    assert.equal(shouldReuseLastPassedScan({ lastRecord: passedRec, currentPassedKey: 'k1', plannedSnapshot: false }).reuse, true, '全等 → 复用')
    assert.match(shouldReuseLastPassedScan({ lastRecord: passedRec, currentPassedKey: 'k1', plannedSnapshot: false, forceRerun: true }).reason, /force-rerun/, '逃生阀')
    assert.match(shouldReuseLastPassedScan({ lastRecord: null, currentPassedKey: 'k1', plannedSnapshot: false }).reason, /no-passed-record/, '无记录')
    assert.match(shouldReuseLastPassedScan({ lastRecord: { testResult: { status: 'failed' }, passedKey: 'k1' }, currentPassedKey: 'k1', plannedSnapshot: false }).reason, /no-passed-record/, 'failed 记录不入 passed 闸')
    assert.match(shouldReuseLastPassedScan({ lastRecord: { ...passedRec, lintResult: { status: 'failed' } }, currentPassedKey: 'k1', plannedSnapshot: false }).reason, /lint-failed/, 'lint failed 记录不入闸（阻断语义须重跑发声）')
    assert.match(shouldReuseLastPassedScan({ lastRecord: passedRec, currentPassedKey: 'other', plannedSnapshot: false }).reason, /passed-key-mismatch/, 'passedKey 失配（内容/文件集/配置/豁免面/HEAD）')
    assert.match(shouldReuseLastPassedScan({ lastRecord: passedRec, currentPassedKey: 'k1', plannedSnapshot: true }).reason, /snapshot-scope-changed/, '快照口径变化')
    assert.match(shouldReuseLastPassedScan({ lastRecord: { testResult: { status: 'passed' }, lintResult: { status: 'passed' } }, currentPassedKey: 'k1', plannedSnapshot: false }).reason, /no-passed-key/, '存量记录无 passedKey 保守重跑')
  } finally {
    mocked.mock.restore()
    delete process.env.SILLYSPEC_VERIFY_GATE_SNAPSHOT_OFF
    delete process.env.SILLYSPEC_VERIFY_QUALITY_SCAN_RERUN
    try { rmSync(dir, { recursive: true, force: true }) } catch {}
  }
})
