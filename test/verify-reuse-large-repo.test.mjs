/**
 * verify 实测复用大仓全链失效回归（2026-10-21-verify-reuse-large-repo）。
 *
 * dsh 会话 0ff6f1c8 取证（multi-agent-platform 2026-10-20-session-page-dsh-alignment）：
 * verify 阶段 76 分钟同码态全量实测 6 次 ×10~13.5 分钟。根因三层，本文件逐面锁死：
 *   FR-01 code-face-key safeGit 未设 maxBuffer（默认 1MB）——大仓 ls-tree -r -z（1.95MB）必抛
 *        ENOBUFS 被吞成 null → 指纹/dedupKey/passedKey 全 null → 复用链整体哑火；
 *   FR-02 complete.js 中间步 --done 无条件预跑亲测（批量不会触发也整轮实测）；
 *   FR-03 收口门 / gate verify 对 failed 记录零复用（同签名失败每轮全量重跑）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { execSync } from 'node:child_process'

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')

const u = (p) => new URL('file:///' + p.replace(/\\/g, '/').replace(/^\/*/, '')).href
const load = async (rel) => await import(u(join(ROOT, rel).replace(/\\/g, '/')))

const { computeCodeTreeKey } = await load('src/run/code-face-key.js')
const { computeQualityScanFingerprint, computeQualityScanDedupKey, consultFailedScanReuse, synthesizeReusedFailedCheck, qualityScanRecordPath } = await load('src/run/verify-quality-scan.js')
const { isVerifyBatchEligible, detectVerifyBatchFinish } = await load('src/run/complete.js')

function makeRepo(withSpec = true) {
  const dir = mkdtempSync(join(tmpdir(), 'vrlr-'))
  execSync('git init -q', { cwd: dir })
  execSync('git config user.email t@t.local', { cwd: dir })
  execSync('git config user.name t', { cwd: dir })
  writeFileSync(join(dir, 'app.js'), 'export const x = 1\n')
  execSync('git add -A', { cwd: dir })
  execSync('git commit -qm init', { cwd: dir })
  if (withSpec) {
    mkdirSync(join(dir, '.sillyspec'), { recursive: true })
    writeFileSync(join(dir, '.sillyspec', 'local.yaml'), 'commands:\n  test: node app.js\n  lint: node app.js\n')
  }
  return dir
}

function lsTreeBytes(dir) {
  return execSync('git ls-tree -r -z HEAD', { cwd: dir, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).length
}

// ── FR-01：大仓（ls-tree >1MB）键非空——maxBuffer 回归 ─────────────────────────
test('大仓（ls-tree>1MB）computeCodeTreeKey 非 null——maxBuffer 回归', { timeout: 120_000 }, () => {
  const dir = makeRepo(false)
  try {
    // 分批提交直到 ls-tree 输出 >1MB（execFileSync 默认 maxBuffer 上限）。条目 ≈90B（含
    // 30 字符文件名），~12k 文件过线；分批避免单次 git add 过大，批量号入名保证单调增长。
    let batch = 0
    while (lsTreeBytes(dir) <= 1024 * 1024 + 50 * 1024) {
      batch++
      for (let i = 0; i < 3000; i++) {
        writeFileSync(join(dir, `mod${batch}_${String(i).padStart(5, '0')}_padding_name.js`), 'export const a = 1\n')
      }
      execSync('git add -A', { cwd: dir })
      execSync(`git commit -qm big-${batch}`, { cwd: dir })
    }
    assert.ok(lsTreeBytes(dir) > 1024 * 1024, `fixture ls-tree 已超 1MB（实际 ${lsTreeBytes(dir)}B）`)
    const key = computeCodeTreeKey({ cwd: dir })
    assert.ok(typeof key === 'string' && key.length === 64, `大仓键应为 sha256 hex（修复前 null）：${key}`)
    // 指纹链下游同仓恢复非 null（dedupKey/passedKey 依赖链）
    mkdirSync(join(dir, '.sillyspec'), { recursive: true })
    writeFileSync(join(dir, '.sillyspec', 'local.yaml'), 'commands:\n  test: node app.js\n  lint: node app.js\n')
    assert.ok(computeQualityScanFingerprint({ cwd: dir, specBase: join(dir, '.sillyspec') }), '大仓质量扫描指纹恢复非 null（dedupKey/passedKey 链恢复）')
    // 再提交一批：键必变（内容寻址仍然生效——maxBuffer 放大不是钝化）
    const key0 = computeCodeTreeKey({ cwd: dir })
    writeFileSync(join(dir, 'app.js'), 'export const x = 2\n')
    execSync('git add -A && git commit -qm code-change', { cwd: dir })
    assert.notEqual(computeCodeTreeKey({ cwd: dir }), key0, '代码提交仍必击穿键')
    // 非 git 目录仍 null（fail-open 语义保持）
    const notRepo = mkdtempSync(join(tmpdir(), 'norepo-'))
    try {
      assert.equal(computeCodeTreeKey({ cwd: notRepo }), null, '非 git 目录 → null')
    } finally { try { rmSync(notRepo, { recursive: true, force: true }) } catch {} }
  } finally {
    try { rmSync(dir, { recursive: true, force: true }) } catch {}
  }
})

// ── FR-02：批量资格纯判定矩阵 + detectVerifyBatchFinish 等价 ─────────────────
function makeBatchFixture({ report = true, conclusion = true, facts = true } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'vbe-'))
  const specBase = join(dir, '.sillyspec')
  const changeDir = join(specBase, 'changes', 'demo-change')
  mkdirSync(changeDir, { recursive: true })
  if (report) {
    const body = conclusion ? '# 验证报告\n\n- 结论枚举：`PASS`\n' : '# 验证报告\n\n（结论未填）\n'
    writeFileSync(join(changeDir, 'verify-result.md'), body)
  }
  if (facts) writeFileSync(join(changeDir, 'verify-facts.json'), '{}')
  return { dir, specBase, changeName: 'demo-change' }
}

const stepsFrom = (statuses) => statuses.map((s) => ({ name: s, status: s }))

test('isVerifyBatchEligible 纯资格判定矩阵（不 mutating）', () => {
  const pendingTail = stepsFrom(['completed', 'completed', 'pending', 'pending', 'pending', 'pending', 'pending'])
  const mk = (opts) => makeBatchFixture(opts)
  let f
  f = mk({ report: false })
  try {
    assert.equal(isVerifyBatchEligible({ changeName: 'demo-change', specBase: f.specBase, steps: pendingTail }).eligible, false, '报告缺席不资格')
    assert.equal(isVerifyBatchEligible({ changeName: 'demo-change', specBase: f.specBase, steps: pendingTail }).reason, 'verify-result.md 缺席（报告未写不批量）')
  } finally { rmSync(f.dir, { recursive: true, force: true }) }
  f = mk({ conclusion: false })
  try {
    const r = isVerifyBatchEligible({ changeName: 'demo-change', specBase: f.specBase, steps: pendingTail })
    assert.equal(r.eligible, false)
    assert.equal(r.reason, '结论枚举未填（待填占位不批量）')
  } finally { rmSync(f.dir, { recursive: true, force: true }) }
  f = mk({ facts: false })
  try {
    const r = isVerifyBatchEligible({ changeName: 'demo-change', specBase: f.specBase, steps: pendingTail })
    assert.equal(r.eligible, false)
    assert.equal(r.reason, 'verify-facts.json 缺席（探针未跑不批量）')
  } finally { rmSync(f.dir, { recursive: true, force: true }) }
  f = mk({})
  try {
    const anchored = stepsFrom(['completed', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending'])
    assert.equal(isVerifyBatchEligible({ changeName: 'demo-change', specBase: f.specBase, steps: anchored }).eligible, false, '锚定步未过不资格')
    assert.equal(isVerifyBatchEligible({ changeName: 'demo-change', specBase: f.specBase, steps: stepsFrom(Array(7).fill('completed')) }).eligible, false, '无剩余 step 不资格')
    const snapshot = pendingTail.map((s) => ({ ...s }))
    const r = isVerifyBatchEligible({ changeName: 'demo-change', specBase: f.specBase, steps: snapshot })
    assert.equal(r.eligible, true, '报告齐 + 锚定过 + 有 pending → 资格成立')
    assert.deepEqual(snapshot, pendingTail, '纯判定不 mutating 步骤状态')
    assert.equal(isVerifyBatchEligible({ changeName: null, specBase: f.specBase, steps: pendingTail }).eligible, false, '无 changeName 不资格')
  } finally { rmSync(f.dir, { recursive: true, force: true }) }
})

test('detectVerifyBatchFinish 行为等价（理由串保留；资格成立照旧 mutating 批量）', () => {
  const f = makeBatchFixture({ report: false })
  try {
    const steps = stepsFrom(['completed', 'completed', 'pending', 'pending'])
    const r = detectVerifyBatchFinish({ changeName: 'demo-change', specBase: f.specBase, steps })
    assert.equal(r.batched, false)
    assert.equal(r.reason, 'verify-result.md 缺席（报告未写不批量）', '不资格理由串与既有口径逐字一致')
    assert.deepEqual(steps.map((s) => s.status), ['completed', 'completed', 'pending', 'pending'], '不资格不 mutating')
  } finally { rmSync(f.dir, { recursive: true, force: true }) }
  const g = makeBatchFixture({})
  try {
    const steps = stepsFrom(['completed', 'completed', 'pending', 'in-progress', 'pending'])
    const r = detectVerifyBatchFinish({ changeName: 'demo-change', specBase: g.specBase, steps })
    assert.equal(r.batched, true)
    assert.equal(r.aligned, 3, '剩余 pending/in-progress 全部批量对齐')
    assert.ok(steps.slice(2).every((s) => s.status === 'completed' && s._batchAligned === true), '本次对齐步乐观预标戳保留（rollback 面）')
    assert.ok(!('_batchAligned' in steps[0]) && !('_batchAligned' in steps[1]), '批量前已完成的步不打预标戳')
  } finally { rmSync(g.dir, { recursive: true, force: true }) }
})

// ── FR-03：失败签名复用矩阵（命中/键失配/TTL/RERUN）+ 合成结果披露 ────────────
function makeReuseFixture() {
  const dir = makeRepo(true)
  const specBase = join(dir, '.sillyspec')
  const changeName = 'demo-change'
  const dedupKey = computeQualityScanDedupKey({ cwd: dir, specBase })
  assert.ok(dedupKey, 'fixture dedupKey 可计算（依赖 FR-01 指纹链）')
  return { dir, specBase, changeName, dedupKey }
}

function writeRecord(specBase, changeName, fields) {
  const path = qualityScanRecordPath(specBase, changeName)
  writeFileSync(path, JSON.stringify({
    schemaVersion: 1, source: 'cli-noai', change: changeName,
    testResult: { status: 'failed', reason: '模块子集测试失败：deps(auto-py)', command: 'module[]+deps(py86)', exitCode: 1, durationMs: 60000, outputTail: 'FAIL ...' },
    usedSnapshot: false, ranAt: new Date().toISOString(),
    ...fields,
  }))
  return path
}

test('consultFailedScanReuse：同签名失败命中 / 键失配 / TTL 过期 / RERUN 旁路 / 无失败记录', () => {
  const f = makeReuseFixture()
  try {
    writeRecord(f.specBase, f.changeName, { dedupKey: f.dedupKey })
    const hit = consultFailedScanReuse({ specBase: f.specBase, cwd: f.dir, changeName: f.changeName, plannedSnapshot: false })
    assert.equal(hit.reuse, true, 'dedupKey 全等 + 快照口径一致 + 窗口内 → 复用命中')
    assert.equal(hit.record.testResult.status, 'failed')

    // 键失配：known_failures 面变化（豁免一动即失配——复用不吞合法补救）
    const yaml = readFileSync(join(f.specBase, 'local.yaml'), 'utf8')
    writeFileSync(join(f.specBase, 'local.yaml'), yaml + '\nknown_failures:\n  - "deps(auto-py)"\n')
    const miss = consultFailedScanReuse({ specBase: f.specBase, cwd: f.dir, changeName: f.changeName, plannedSnapshot: false })
    assert.equal(miss.reuse, false, '豁免面变化 → dedupKey 失配回退真跑')
    assert.match(miss.reason, /dedup-key-mismatch/)
    writeFileSync(join(f.specBase, 'local.yaml'), yaml)

    // TTL 过期：31 分钟前的失败记录不复用（面漂移防护）
    writeRecord(f.specBase, f.changeName, { dedupKey: f.dedupKey, ranAt: new Date(Date.now() - 31 * 60 * 1000).toISOString() })
    const stale = consultFailedScanReuse({ specBase: f.specBase, cwd: f.dir, changeName: f.changeName, plannedSnapshot: false })
    assert.equal(stale.reuse, false)
    assert.match(stale.reason, /ttl-expired/)
    // maxAgeMs=null 显式关闭 TTL（消费侧可控）
    assert.equal(consultFailedScanReuse({ specBase: f.specBase, cwd: f.dir, changeName: f.changeName, plannedSnapshot: false, maxAgeMs: null }).reuse, true, 'maxAgeMs=null 显式免 TTL')

    // RERUN 逃生阀（与 noAI 失败签名闸同阀对称）
    writeRecord(f.specBase, f.changeName, { dedupKey: f.dedupKey })
    const forced = consultFailedScanReuse({ specBase: f.specBase, cwd: f.dir, changeName: f.changeName, plannedSnapshot: false, forceRerun: true })
    assert.equal(forced.reuse, false)
    assert.match(forced.reason, /force-rerun/)

    // 快照口径失配：记录主仓口径，本轮快照口径 → miss（既有 shouldReuseLastFailedScan 判据透传）
    const scope = consultFailedScanReuse({ specBase: f.specBase, cwd: f.dir, changeName: f.changeName, plannedSnapshot: true })
    assert.equal(scope.reuse, false)
    assert.match(scope.reason, /snapshot-scope-changed/)

    // 无失败记录：passed 记录不进失败复用
    writeRecord(f.specBase, f.changeName, { dedupKey: f.dedupKey, testResult: { status: 'passed', command: 'x', exitCode: 0 } })
    const none = consultFailedScanReuse({ specBase: f.specBase, cwd: f.dir, changeName: f.changeName, plannedSnapshot: false })
    assert.equal(none.reuse, false)
    assert.match(none.reason, /no-failed-record/)
  } finally {
    try { rmSync(f.dir, { recursive: true, force: true }) } catch {}
  }
})

test('synthesizeReusedFailedCheck：gates/machine-interface 消费的合成 failed 结果（♻️ 披露 + 逃生阀）', () => {
  const ranAt = '2026-10-21T14:00:00.000Z'
  const check = synthesizeReusedFailedCheck({
    ranAt,
    testResult: { status: 'failed', reason: '模块子集测试失败：deps(auto-py)', command: 'module[]+deps(py86)+fr(239)', exitCode: 1, outputTail: 'FAIL sample', strategy: 'dynamic-subset' },
  })
  assert.equal(check.status, 'failed', '合成结果保持 failed——阻断语义不因复用放水')
  assert.match(check.reason, /♻️ 复用上次失败实测/, '披露复用来源')
  assert.match(check.reason, new RegExp(ranAt.slice(0, 10)), '带上次实测时间')
  assert.match(check.reason, /SILLYSPEC_VERIFY_QUALITY_SCAN_RERUN=force/, '出路含无条件重跑逃生阀')
  assert.match(check.command, /\(failed-scan-reuse\)$/, 'command 标注复用口径')
  assert.equal(check.exitCode, 1)
  assert.equal(check.reusedFromRecord, true)
  assert.equal(check.durationMs, 0, '复用零时长——观测层可区分真跑/复用')
})
