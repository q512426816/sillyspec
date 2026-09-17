/**
 * smoke 冒烟门禁测试（2026-09-17-api-coverage-smoke task-07 / FR-01~FR-03 / FR-07 / D-001@v1 /
 * D-002@v1 / D-010@v1）。
 *
 * 九组锁定语义（断言钉行为契约，不钉实现细节）：
 *   ① 执行三态：commands.smoke 配置后 exit 0 记 passed / 非 0 / 超时记 failed **不 throw**
 *      （封顶信号非崩溃——与 test failed 的 throw 语义刻意区分）；未配置 skipped+配置指引。
 *      mock 策略：mock.module('node:child_process') 转发包装——仅拦截含唯一标记的 smoke
 *      命令返回罐头结果（超时态注入 ETIMEDOUT 错误对象，不真等 300s 帽），其余调用原样
 *      转发真实 child_process（跨平台：Windows Git Bash / Linux 同径）。
 *   ② 快照内超时回退主仓复跑一次（fallbackMainRepo；主仓仍超时记双重超时态）；smoke 配置
 *      读主仓 local.yaml（隔离快照内无配置不阻断）。快照供给经 mock.module(gate-snapshot
 *      绝对 URL) 注入假 snap（真实快照创建重且走 junction，非本组断言面）。
 *   ③ 指纹含 commands 段：配置 smoke 前后指纹变化 → 复用失配亲测；additive smokeResult 段
 *      随整条记录复用读回。
 *   ④ 机器段 ensure 三态（passed 单行/含管道降多行 YAML/缺态注释行）+ parseEvidenceSlots
 *      逐条 source 提取 + 幂等/态迁移；deriveSmokeSectionState 口径（ensure 与 postcheck 共享）。
 *   ⑤ 一致性对比（auditSmokeReceiptConsistency，task-02 挂账导出接线）：一致零打回；
 *      改写 exit / 删机器段 / not-ran 冒充 / 无记录冒充 → ERROR 打回。
 *   ⑥ 分类器 B-1 回归（双侧）：脚本形态三命令（node scripts/smoke.mjs / bash smoke.sh /
 *      python smoke.py）无标记判 build 不绿、cli-noai-smoke 标记直判 cross-layer 绿
 *      （change-risk-profile 侧 checkIntegrationEvidence 绿判据）；producer 侧
 *      judgeIntegrationRan 同族口径（facts.integrationRan）。
 *   ⑦ smokeRan producer 五边界（judgeSmokeRan 经 backfillFactsFromMdAndTests 落盘面）：
 *      passed→ran / failed→not-ran / 记录在场无 smokeResult 段→not-ran+注记 / 记录缺失→
 *      not-ran+注记（X-01 fail-open）/ configured=false→not-configured。
 *   ⑧ 第五条件 smoke-not-run：critical×三值 / 字段不在场 fail-closed / advisory handover
 *      不豁免 / 非判级零行为（判级限定与 deployment 计入的壳层形态归 pass-eligibility 增量组）。
 *   ⑨ config-schema：commands.smoke 键登记（live 可选 / reader=executeVerifyQualityScan /
 *      example 含脚本形态）。
 *
 * mock 自举：mock.module 需 --experimental-test-module-mocks，裸跑时 respawn 自己一次
 * （test/backlog-batch-a.test.mjs 先例——run-tests.mjs 直跑与 node --test 两径均兼容）。
 */
import { test, mock } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync as rawSpawnSync } from 'node:child_process'

// 自举：mock.module 需 --experimental-test-module-mocks，裸跑时 respawn 自己一次
if (typeof mock.module !== 'function') {
  if (process.env.SILLYSPEC_MOCK_RESPAWNED === '1') {
    console.error('mock.module 在加旗标 respawn 后仍不可用，放弃')
    process.exit(1)
  }
  const r = rawSpawnSync(process.execPath,
    ['--experimental-test-module-mocks', '--disable-warning=ExperimentalWarning', ...process.argv.slice(1)],
    { stdio: 'inherit', env: { ...process.env, SILLYSPEC_MOCK_RESPAWNED: '1' } })
  process.exit(r.status ?? 0)
}

import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import { parseEvidenceSlots } from '../src/verify-facts-schema.js'
import { ensureSmokeReceiptSection, scanSmokeReceiptSection, backfillFactsFromMdAndTests, deriveSmokeSectionState } from '../src/verify-probes.js'
import { checkIntegrationEvidence } from '../src/change-risk-profile.js'
import { evaluatePassEligibility } from '../src/stage-contract.js'
import { auditSmokeReceiptConsistency } from '../src/verify-postcheck.js'
import { LOCAL_YAML_SCHEMA, renderExample } from '../src/config-schema.js'

// ── mock 供给（转发式：唯一标记命令返回罐头结果，其余原样转发真实 child_process）──
const MOCK_MARK = '__ss_smoke_gate_mock__'
const SNAP_DIR_MARK = '__ss_fake_snap__'
const smokeMock = { mode: 'exit0' }
const snapMock = { enabled: false }

const cpReal = await import('node:child_process')
const cpMockExports = { ...cpReal }
cpMockExports.spawnSync = (command, opts) => {
  if (typeof command === 'string' && command.includes(MOCK_MARK)) {
    const TIMEOUT_RESULT = { status: null, error: { code: 'ETIMEDOUT', message: 'spawnSync ETIMEDOUT' }, stdout: '', stderr: '' }
    if (smokeMock.mode === 'exit0') return { status: 0, error: undefined, stdout: 'smoke endpoint ok', stderr: '' }
    if (smokeMock.mode === 'exit3') return { status: 3, error: undefined, stdout: '', stderr: 'smoke boom' }
    if (smokeMock.mode === 'timeout') return TIMEOUT_RESULT
    if (smokeMock.mode === 'snap-fallback') {
      // 快照 cwd 内超时 → 主仓 cwd 复跑 exit 0（回退分支的两侧输入）
      return opts && String(opts.cwd || '').includes(SNAP_DIR_MARK) ? TIMEOUT_RESULT
        : { status: 0, error: undefined, stdout: 'smoke endpoint ok', stderr: '' }
    }
    if (smokeMock.mode === 'snap-both') return TIMEOUT_RESULT
  }
  return cpReal.spawnSync(command, opts)
}
await mock.module('node:child_process', { exports: cpMockExports })

// 快照供给 mock：executeVerifyQualityScan 动态 import('./gate-snapshot.js') 按解析 URL 拦截
await mock.module(new URL('../src/run/gate-snapshot.js', import.meta.url).href, {
  exports: {
    createVerifyGateSnapshot: async ({ cwd }) => (snapMock.enabled
      ? { snapshotRoot: join(cwd, SNAP_DIR_MARK), changeFileCount: 1, sourceRoot: null, cleanup() {} }
      : null),
    printSnapshotFailureHint() {},
  },
})

// mock 注册后再动态 import：拿绑定了 mock 的模块副本（转发式包装对指纹 git 调用等无害）
const qscan = await import('../src/run/verify-quality-scan.js?smoke-gate=1')

// ── 夹具 ──
const tmpRoots = []
function mk(prefix) { const d = mkdtempSync(join(tmpdir(), prefix)); tmpRoots.push(d); return d }
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

function captureWarn() {
  const caught = []
  const orig = console.warn
  console.warn = (...a) => caught.push(a.join(' '))
  return { caught, restore: () => { console.warn = orig } }
}

/** 落 quality-scan 记录（readSmokeResultRecord 口径：schemaVersion 1 + source cli-noai） */
function writeScanRecord(specBase, change, smokeResult, { withSmoke = true } = {}) {
  mkdirSync(join(specBase, '.runtime'), { recursive: true })
  const rec = { schemaVersion: 1, source: 'cli-noai', testResult: { status: 'passed', command: 'npm test', exitCode: 0 } }
  if (withSmoke) rec.smokeResult = smokeResult
  writeFileSync(join(specBase, '.runtime', `verify-quality-scan-${change}.json`), JSON.stringify(rec, null, 2))
}

/** 经 executeVerifyQualityScan 亲跑 smoke 并读回记录（三态/回退组的统一入口） */
async function runSmokeScan({ mode, snapEnabled = false, smokeLine = null, change }) {
  smokeMock.mode = mode
  snapMock.enabled = snapEnabled
  const root = mk('sg-scan-')
  const specBase = join(root, '.sillyspec')
  mkdirSync(specBase, { recursive: true })
  const lines = ['commands:']
  if (smokeLine) lines.push('  smoke: ' + smokeLine)
  lines.push('')
  writeFileSync(join(specBase, 'local.yaml'), lines.join('\n'))
  const cap = captureWarn()
  let threw = null
  try {
    await qscan.executeVerifyQualityScan({ cwd: root, specBase, changeName: change })
  } catch (e) { threw = e }
  cap.restore()
  const record = JSON.parse(readFileSync(join(specBase, '.runtime', `verify-quality-scan-${change}.json`), 'utf8'))
  return { root, specBase, change, record, threw, caught: cap.caught }
}

// ═══════════════════════════════════════════════════════════════════
// ① 执行三态（FR-01 GWT1 / D-001@v1）：失败记失败态不 throw——封顶信号非崩溃
// ═══════════════════════════════════════════════════════════════════
test('① 执行三态：exit 0 记 passed 实录（log 落盘）；exit 非 0 / 超时记 failed 不 throw；未配置 skipped', async () => {
  const ok = await runSmokeScan({ mode: 'exit0', smokeLine: `node ${MOCK_MARK} exit0`, change: 'sg-exec-ok' })
  assert.deepEqual(
    {
      configured: ok.record.smokeResult.configured, status: ok.record.smokeResult.status,
      exitCode: ok.record.smokeResult.exitCode, timeout: ok.record.smokeResult.timeout,
      source: ok.record.smokeResult.source, reason: ok.record.smokeResult.reason,
    },
    { configured: true, status: 'passed', exitCode: 0, timeout: false, source: 'cli-noai-smoke', reason: null },
    'exit 0 → smokeResult passed 实录（command/exit/duration 落记录，source=cli-noai-smoke）')

  const bad = await runSmokeScan({ mode: 'exit3', smokeLine: `node ${MOCK_MARK} exit3`, change: 'sg-exec-bad' })
  const s3 = bad.record.smokeResult
  assert.ok(s3.status === 'failed' && s3.exitCode === 3 && s3.reason.includes('退出码 3') && bad.threw === null,
    `exit 3 → failed + reason 含退出码，且不 throw（封顶信号非崩溃，PASS 封顶归 --done 消费）（实际 ${JSON.stringify(s3)} / threw=${bad.threw && bad.threw.message}）`)

  const tmo = await runSmokeScan({ mode: 'timeout', smokeLine: `node ${MOCK_MARK} hang`, change: 'sg-exec-tmo' })
  const st = tmo.record.smokeResult
  assert.ok(st.status === 'failed' && st.timeout === true && st.exitCode === null && st.reason.includes('超时') && tmo.threw === null,
    `超时 → failed 态（timeout=true / exitCode 无值 / reason 含超时帽说明）且不 throw（实际 ${JSON.stringify(st)}）`)

  const nc = await runSmokeScan({ mode: 'exit0', smokeLine: null, change: 'sg-exec-nc' })
  const sn = nc.record.smokeResult
  assert.ok(sn.configured === false && sn.status === 'skipped' && sn.reason.includes('未配置 commands.smoke'),
    `未配置 → configured=false + skipped + 配置指引（记录仍写，供 --done 判 not-configured）（实际 ${JSON.stringify(sn)}）`)

  assert.ok(ok.record.smokeResult.logPath && existsSync(ok.record.smokeResult.logPath)
    && readFileSync(ok.record.smokeResult.logPath, 'utf8').includes('# smoke 实录（source: cli-noai-smoke）'),
    '实录 log 落 .runtime/verify-logs/smoke-<change>.log 且头行标注 source: cli-noai-smoke')
})

// ═══════════════════════════════════════════════════════════════════
// ② 快照内超时回退主仓复跑（D-010@v1；lint 快照超时回退先例同款策略）
// ═══════════════════════════════════════════════════════════════════
test('② 快照内超时 → 主仓复跑（fallbackMainRepo）；主仓仍超时记双重超时态；配置读主仓 local.yaml', async () => {
  const fb = await runSmokeScan({ mode: 'snap-fallback', snapEnabled: true, smokeLine: `node ${MOCK_MARK} fb`, change: 'sg-snap-fb' })
  const s = fb.record.smokeResult
  assert.ok(s.configured === true && s.status === 'passed' && s.fallbackMainRepo === true && s.timeout === false && s.exitCode === 0
    && fb.caught.some((w) => w.includes('主仓复跑')),
    `快照超时 → 主仓复跑 exit 0 → passed + fallbackMainRepo=true + 警示「主仓复跑」（口径可见性）；配置取主仓 local.yaml（快照内无配置不阻断）（实际 ${JSON.stringify(s)} / warn=${fb.caught.length}）`)

  const both = await runSmokeScan({ mode: 'snap-both', snapEnabled: true, smokeLine: `node ${MOCK_MARK} fb2`, change: 'sg-snap-both' })
  const s2 = both.record.smokeResult
  assert.ok(s2.status === 'failed' && s2.fallbackMainRepo === true && s2.timeout === true && s2.reason.includes('主仓复跑仍超时'),
    `主仓复跑仍超时 → failed + fallbackMainRepo=true + reason 注明主仓复跑仍超时（实际 ${JSON.stringify(s2)}）`)
})

// ═══════════════════════════════════════════════════════════════════
// ③ 指纹含 commands 段（FR-01 / D-001@v1）：配置 smoke 前后指纹变化 → 复用失配
// ═══════════════════════════════════════════════════════════════════
test('③ 指纹：配置 commands.smoke 前后指纹变化→复用失配亲测；additive smokeResult 随记录复用读回', () => {
  const root = mk('sg-fp-')
  const git = (args) => {
    const r = rawSpawnSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`)
    return String(r.stdout || '').trim()
  }
  git(['init', '-q'])
  git(['config', 'user.email', 't@t.local'])
  git(['config', 'user.name', 't'])
  writeFileSync(join(root, 'a.txt'), 'x')
  git(['add', '.'])
  git(['commit', '-qm', 'init'])
  const specBase = join(root, '.sillyspec')
  mkdirSync(specBase, { recursive: true })
  const writeYaml = (smokeLine) => writeFileSync(join(specBase, 'local.yaml'),
    ['commands:', '  test: npm test', ...(smokeLine ? [smokeLine] : []), ''].join('\n'))

  writeYaml(null)
  qscan.storeQualityScan({
    specBase, cwd: root, changeName: 'sg-fp',
    testResult: { status: 'passed', command: 'npm test' }, lintResult: null,
    smokeResult: { configured: true, status: 'passed', exitCode: 0, source: 'cli-noai-smoke' },
  })
  const reuse = qscan.loadReusableQualityScan({ specBase, cwd: root, changeName: 'sg-fp' })
  assert.ok(reuse && reuse.smokeResult && reuse.smokeResult.status === 'passed',
    '代码与配置未变 → 复用记录 additive smokeResult 段读回（不重跑）')

  writeYaml('  smoke: "node scripts/smoke.mjs"')
  assert.equal(qscan.loadReusableQualityScan({ specBase, cwd: root, changeName: 'sg-fp' }), null,
    '配置 commands.smoke 后指纹变化 → 复用失配（--done 照旧亲测）')
})

// ═══════════════════════════════════════════════════════════════════
// ④ 机器段 ensure 三态 + parseEvidenceSlots source 提取（FR-03 / D-001@v1）
// ═══════════════════════════════════════════════════════════════════
test('④ 机器段 passed 单行形态：注入 + parseEvidenceSlots source 尾注提取 + 幂等', () => {
  const specBase = mk('sg-ens1-')
  const change = 'sg-ens-1'
  const changeDir = join(specBase, 'changes', change)
  mkdirSync(changeDir, { recursive: true })
  writeScanRecord(specBase, change, {
    configured: true, status: 'passed', command: 'node scripts/smoke.mjs', exitCode: 0,
    durationMs: 12, logPath: 'logs/smoke.log', ranAt: '2026-09-17T00:00:00Z',
    timeout: false, fallbackMainRepo: false, source: 'cli-noai-smoke',
  })
  const mdPath = join(changeDir, 'verify-result.md')
  writeFileSync(mdPath, ['# 验证报告', '', '## 集成验证回执 [层：自述声明——CLI 一致性校验]', '', '无', ''].join('\n'))

  const r1 = ensureSmokeReceiptSection(mdPath, { specBase, changeName: change })
  const r2 = ensureSmokeReceiptSection(mdPath, { specBase, changeName: change })
  assert.ok(r1.changed === true && r1.state === 'passed' && r2.changed === false,
    `passed 记录 → 注入机器段；二跑幂等零改动（实际 ${JSON.stringify(r1)} / ${JSON.stringify(r2)}）`)

  const md = readFileSync(mdPath, 'utf8')
  assert.ok(md.includes('- claim: commands.smoke CLI 亲跑 | command: node scripts/smoke.mjs | exit: 0 | log: logs/smoke.log | source: cli-noai-smoke'),
    '机器段单行形态：claim 钦定文案 + command/exit/log 实录 + source: cli-noai-smoke 尾注')

  assert.deepEqual(parseEvidenceSlots(md).runtimeEvidence[0],
    { claim: 'commands.smoke CLI 亲跑', command: 'node scripts/smoke.mjs', exitCode: 0, logPath: 'logs/smoke.log', source: 'cli-noai-smoke' },
    'parseEvidenceSlots 逐条 source 提取（单行尾注形态，第五字段 additive，四字段 fail-closed 不动）')
})

test('④b command 含管道 → 降多行 YAML 机器段 + source 字段回填', () => {
  const specBase = mk('sg-ens2-')
  const change = 'sg-ens-2'
  const changeDir = join(specBase, 'changes', change)
  mkdirSync(changeDir, { recursive: true })
  writeScanRecord(specBase, change, {
    configured: true, status: 'passed', command: 'node scripts/smoke.mjs ｜ stage=gray', exitCode: 0,
    durationMs: 8, logPath: 'logs/smoke.log', ranAt: '2026-09-17T00:00:00Z',
    timeout: false, fallbackMainRepo: false, source: 'cli-noai-smoke',
  })
  const mdPath = join(changeDir, 'verify-result.md')
  writeFileSync(mdPath, ['# 验证报告', '', '## 集成验证回执 [层：自述声明——CLI 一致性校验]', '', '无', ''].join('\n'))
  const r = ensureSmokeReceiptSection(mdPath, { specBase, changeName: change })
  const md = readFileSync(mdPath, 'utf8')
  const entry = parseEvidenceSlots(md).runtimeEvidence[0]
  assert.ok(r.changed === true && md.includes('\n  source: cli-noai-smoke') && entry && entry.source === 'cli-noai-smoke'
    && entry.command === 'node scripts/smoke.mjs ｜ stage=gray' && entry.exitCode === 0 && entry.logPath === 'logs/smoke.log',
    `command 含 ｜ 时降多行 YAML 形态（防单行字段截断）且 source 字段被 parseEvidenceSlots 回填（实际 ${JSON.stringify(entry)}）`)
})

test('④c 缺态注释行两态 + 态迁移原位替换 + 无记录 no-op；deriveSmokeSectionState 共享口径', () => {
  const specBase = mk('sg-ens3-')
  const change = 'sg-ens-3'
  const changeDir = join(specBase, 'changes', change)
  mkdirSync(changeDir, { recursive: true })
  writeScanRecord(specBase, change, { configured: false, status: 'skipped', command: null, exitCode: null, reason: '未配置 commands.smoke', source: 'cli-noai-smoke' })
  const mdPath = join(changeDir, 'verify-result.md')
  writeFileSync(mdPath, ['# 验证报告', '', '## 集成验证回执 [层：自述声明——CLI 一致性校验]', '', '无', ''].join('\n'))

  ensureSmokeReceiptSection(mdPath, { specBase, changeName: change })
  const scan1 = scanSmokeReceiptSection(readFileSync(mdPath, 'utf8'))
  assert.ok(scan1.absentState === 'not-configured' && scan1.machineEntries.length === 0,
    `未配置 → 缺态注释行（非回执行形态，parseEvidenceSlots 不收取）（实际 ${JSON.stringify(scan1)}）`)

  writeScanRecord(specBase, change, {
    configured: true, status: 'passed', command: 'node scripts/smoke.mjs', exitCode: 0,
    durationMs: 5, logPath: 'logs/smoke.log', ranAt: '2026-09-17T00:00:00Z',
    timeout: false, fallbackMainRepo: false, source: 'cli-noai-smoke',
  })
  const r2 = ensureSmokeReceiptSection(mdPath, { specBase, changeName: change })
  const scan2 = scanSmokeReceiptSection(readFileSync(mdPath, 'utf8'))
  assert.ok(r2.changed === true && scan2.machineEntries.length === 1 && scan2.absentState === null,
    '态迁移 not-configured → passed：缺态行原位替换为机器段条目（配置后亲跑自动更新）')

  rmSync(join(specBase, '.runtime', `verify-quality-scan-${change}.json`))
  const r3 = ensureSmokeReceiptSection(mdPath, { specBase, changeName: change })
  assert.ok(r3.changed === false && String(r3.reason || '').includes('不注入'),
    '无 quality-scan smokeResult 记录 → ensure no-op 不注入（facts.smokeRan 由 task-03 判 not-ran）')

  assert.deepEqual(
    [deriveSmokeSectionState(null), deriveSmokeSectionState({ configured: false }),
      deriveSmokeSectionState({ configured: true, status: 'passed' }),
      deriveSmokeSectionState({ configured: true, status: 'failed' }),
      deriveSmokeSectionState({ configured: true, status: 'failed', timeout: true })],
    [null, 'not-configured', 'passed', 'not-ran', 'not-ran'],
    'deriveSmokeSectionState 五输入态：无记录 null / 未配置 / 绿跑 passed / 失败与超时并归 not-ran（超时归 failed 契约）——ensure 与 postcheck 共享口径')
})

// ═══════════════════════════════════════════════════════════════════
// ⑤ 一致性对比三态（FR-03 / Grill #6 / R-06）：改写/删除/冒充打回
// ═══════════════════════════════════════════════════════════════════
test('⑤ 一致性对比：一致零打回；改写 exit / 删机器段 / not-ran 冒充 / 无记录冒充 → ERROR', () => {
  const specBase = mk('sg-audit-')
  const change = 'sg-audit'
  const smokeRec = {
    configured: true, status: 'passed', command: 'node scripts/smoke.mjs', exitCode: 0,
    logPath: 'logs/smoke.log', ranAt: '2026-09-17T00:00:00Z', durationMs: 9,
    timeout: false, fallbackMainRepo: false, source: 'cli-noai-smoke',
  }
  writeScanRecord(specBase, change, smokeRec)
  const md = (receiptLine) => ['# 验证报告', '', '## 集成验证回执 [层：自述声明——CLI 一致性校验]', '', receiptLine, ''].join('\n')
  const okLine = '- claim: commands.smoke CLI 亲跑 | command: node scripts/smoke.mjs | exit: 0 | log: logs/smoke.log | source: cli-noai-smoke'

  const a1 = auditSmokeReceiptConsistency(md(okLine), specBase, change)
  assert.ok(a1.state === 'passed' && a1.mismatches.length === 0,
    `机器段与记录逐字段一致 → 零 mismatch（实际 ${JSON.stringify(a1)}）`)

  const a2 = auditSmokeReceiptConsistency(md(okLine.replace('exit: 0', 'exit: 1')), specBase, change)
  assert.ok(a2.mismatches.length === 1 && a2.mismatches[0].severity === 'error' && a2.mismatches[0].note.includes('不符'),
    'agent 改写 exit → ERROR 打回（command/exit/log 任一字段被改写即不符）')

  const a3 = auditSmokeReceiptConsistency(md('- claim: 别的回执 | command: curl -s http://127.0.0.1:18080/api/health | exit: 0 | log: logs/a.log'), specBase, change)
  assert.ok(a3.mismatches.length === 1 && a3.mismatches.some((x) => x.note.includes('缺失')),
    '删除机器段（回执槽仅剩他条）→ ERROR 打回')

  writeScanRecord(specBase, change, { ...smokeRec, status: 'failed', exitCode: 3, reason: 'smoke 命令退出码 3' })
  const a4 = auditSmokeReceiptConsistency(md(okLine), specBase, change)
  const okA4 = a4.mismatches.length >= 1 && a4.mismatches.some((x) => x.note.includes('冒充'))
  rmSync(join(specBase, '.runtime', `verify-quality-scan-${change}.json`))
  const a5 = auditSmokeReceiptConsistency(md(okLine), specBase, change)
  const okA5 = a5.mismatches.length >= 1 && a5.mismatches.some((x) => x.note.includes('冒充'))
  assert.ok(okA4 && okA5,
    `记录 not-ran 而 md 有标记条目 = 冒充绿回执；无记录而 md 有标记行 = 冒充（标记行唯一合法来源是 CLI ensure）（实际 ${JSON.stringify(a4.mismatches.length)}/${a5.mismatches.length}）`)
})

// ═══════════════════════════════════════════════════════════════════
// ⑥ 分类器 B-1 回归（双侧）：脚本形态三命令 × 标记两态（FR-03 / Grill B-1）
// ═══════════════════════════════════════════════════════════════════
test('⑥ 脚本形态三命令：无标记判 build 不绿；cli-noai-smoke 标记直判 cross-layer 绿；producer 侧同口径', async () => {
  const root = mk('sg-cls-')
  mkdirSync(join(root, 'logs'), { recursive: true })
  writeFileSync(join(root, 'logs', 'smoke.log'), 'smoke endpoint ok\n')
  const scriptCmds = ['node scripts/smoke.mjs', 'bash smoke.sh', 'python smoke.py']
  const judge = (command, source) => checkIntegrationEvidence('', ['real_daemon_backend_integration'], {
    runtimeEvidence: [{ claim: '接口冒烟', command, exitCode: 0, logPath: 'logs/smoke.log', ...(source ? { source } : {}) }],
    cwd: root,
  })

  const noMark = scriptCmds.map((c) => ({ c, r: judge(c, null) }))
  assert.ok(noMark.every(({ r }) => r.ok === false && r.errors.some((e) => e.includes('build'))),
    `B-1 回归：三脚本命令无标记全判 build 不作集成绿判据（${noMark.map(({ c, r }) => `${c}→${r.ok}`).join(' / ')}——词表不可枚举，修正点在标记识别）`)

  const marked = scriptCmds.map((c) => ({ c, r: judge(c, 'cli-noai-smoke') }))
  assert.ok(marked.every(({ r }) => r.ok === true),
    `B-1 金路径：三脚本命令 + cli-noai-smoke 标记全直判 cross-layer 绿（${marked.map(({ c, r }) => `${c}→${r.ok}`).join(' / ')}）`)

  // producer 侧（judgeIntegrationRan 消费 classifyReceiptCommandSource 同族口径，G-3 双侧同步）
  const mkProducer = async (withMark) => {
    const specBase = mk('sg-prod-')
    const change = 'sg-prod-' + (withMark ? 'a' : 'b')
    const changeDir = join(specBase, 'changes', change)
    mkdirSync(changeDir, { recursive: true })
    writeFileSync(join(changeDir, 'verify-facts.json'), JSON.stringify({ schemaVersion: 2, probes: {} }, null, 2))
    const line = `- claim: 接口冒烟 | command: node scripts/smoke.mjs | exit: 0 | log: logs/smoke.log${withMark ? ' | source: cli-noai-smoke' : ''}`
    const verifyMd = ['# 验证报告', '', '## 集成验证回执 [层：自述声明——CLI 一致性校验]', '', line, ''].join('\n')
    const cap = captureWarn()
    try {
      await backfillFactsFromMdAndTests(join(changeDir, 'verify-facts.json'), { verifyMd, conclusion: 'PASS WITH NOTES' })
    } finally { cap.restore() }
    return JSON.parse(readFileSync(join(changeDir, 'verify-facts.json'), 'utf8'))
  }
  assert.equal((await mkProducer(true)).integrationRan, 'ran', 'producer 侧：机器段标记条目 → facts.integrationRan=ran（金路径不误拦）')
  assert.equal((await mkProducer(false)).integrationRan, 'not-ran', 'producer 侧对照：同命令无标记 → not-ran（build 不计入集成实测）')
})

// ═══════════════════════════════════════════════════════════════════
// ⑦ smokeRan producer 五边界（FR-02 / D-002@v1）：唯一事实源=quality-scan 记录
// ═══════════════════════════════════════════════════════════════════
test('⑦ smokeRan 五边界：passed→ran / failed→not-ran / 无段→not-ran+注记 / 记录缺失→not-ran+注记 / 未配置→not-configured', async () => {
  const run = async ({ smoke, withSmoke = true, record = true, tag }) => {
    const specBase = mk('sg-ran-')
    const change = 'sg-ran-' + tag
    const changeDir = join(specBase, 'changes', change)
    mkdirSync(changeDir, { recursive: true })
    writeFileSync(join(changeDir, 'verify-facts.json'), JSON.stringify({ schemaVersion: 2, probes: {} }, null, 2))
    if (record) writeScanRecord(specBase, change, smoke, { withSmoke })
    const cap = captureWarn()
    try {
      await backfillFactsFromMdAndTests(join(changeDir, 'verify-facts.json'),
        { verifyMd: '# 验证报告\n\n结论枚举：`PASS WITH NOTES`\n', conclusion: 'PASS WITH NOTES' })
    } finally { cap.restore() }
    const facts = JSON.parse(readFileSync(join(changeDir, 'verify-facts.json'), 'utf8'))
    return { facts, caught: cap.caught }
  }
  const SM = { configured: true, status: 'passed', command: 'node scripts/smoke.mjs', exitCode: 0, source: 'cli-noai-smoke' }

  const r1 = await run({ smoke: SM, tag: 'p1' })
  assert.equal(r1.facts.smokeRan, 'ran', '记录在场 status=passed → ran')

  const r2 = await run({ smoke: { ...SM, status: 'failed', exitCode: 3 }, tag: 'p2' })
  assert.equal(r2.facts.smokeRan, 'not-ran', 'status=failed（exit 非 0 / 超时归 failed）→ not-ran')

  const r3 = await run({ smoke: null, withSmoke: false, tag: 'p3' })
  assert.ok(r3.facts.smokeRan === 'not-ran' && r3.caught.some((w) => w.includes('无 smokeResult 段')),
    `记录在场但无 smokeResult 段（升级过渡期存量）→ not-ran + fail-open 注记（实际 ${JSON.stringify(r3.caught)}）`)

  const r4 = await run({ record: false, tag: 'p4' })
  assert.ok(r4.facts.smokeRan === 'not-ran' && r4.caught.some((w) => w.includes('quality-scan 实测记录缺失')),
    '记录缺失 → not-ran + fail-open 注记（X-01：--done 亲测替代扫描场景记录时序不可得）')

  const r5 = await run({ smoke: { configured: false, status: 'skipped', source: 'cli-noai-smoke' }, tag: 'p5' })
  assert.equal(r5.facts.smokeRan, 'not-configured', 'configured=false（未配置 / unavailable）→ not-configured')
})

// ═══════════════════════════════════════════════════════════════════
// ⑧ 第五条件 smoke-not-run（FR-02 / D-002@v1）：critical×三值 / handover 不豁免 / 非判级零行为
// ═══════════════════════════════════════════════════════════════════
test('⑧ 第五条件：critical×三值；字段不在场 fail-closed；advisory handover 不豁免；非判级零行为', () => {
  const CLEAN = () => ({
    integrationRan: 'ran', handover: { count: 0, items: [] },
    dbScriptDeclarations: [], matrixPartialRows: 0, runtimeEndpointExcluded: false,
  })
  const base = (facts, level) => ({ conclusion: 'PASS', factsExpected: true, facts, changeRiskProfile: { level } })

  const r1 = evaluatePassEligibility(base({ ...CLEAN(), smokeRan: 'ran' }, 'integration-critical'))
  assert.ok(r1.ok === true && !r1.triggered.some((t) => t.fact === 'smoke-not-run'),
    'critical × ran → 放行不触发（绿跑即满足）')

  const r2 = evaluatePassEligibility(base({ ...CLEAN(), smokeRan: 'not-ran' }, 'integration-critical'))
  assert.ok(r2.ok === false && r2.triggered.some((t) => t.fact === 'smoke-not-run')
    && r2.errors.some((e) => e.includes('[fact smoke-not-run]') && e.includes('接口冒烟未跑')),
    'critical × not-ran → smoke-not-run 触发 + 文案点名接口冒烟未跑')

  const r3 = evaluatePassEligibility(base({ ...CLEAN(), smokeRan: 'not-configured' }, 'integration-critical'))
  assert.ok(r3.triggered.some((t) => t.fact === 'smoke-not-run')
    && r3.errors.some((e) => e.includes('先在 local.yaml 配置键 commands.smoke')),
    'critical × not-configured → 触发 + 配置键指引文案（not-configured 出路的操作面）')

  const r4 = evaluatePassEligibility(base(CLEAN(), 'integration-critical'))
  assert.ok(r4.triggered.some((t) => t.fact === 'smoke-not-run' && t.detail.includes('不在场')),
    'facts 在场但 smokeRan 字段不在场（升级过渡期存量 backfill 前）→ 同未跑触发（fail-closed 侧）')

  const r5 = evaluatePassEligibility(base({
    ...CLEAN(), smokeRan: 'not-ran',
    handover: { count: 1, items: [{ type: 'env-blocked', item: '冒烟环境阻断', condition: '恢复后复跑', severity: 'advisory' }] },
  }, 'integration-critical'))
  assert.ok(r5.triggered.some((t) => t.fact === 'smoke-not-run'),
    'advisory handover 在场仍触发（不豁免——smoke 缺失的合法出路只有配 commands.smoke 复跑 / 降级 NOTES 两条）')

  const r6 = evaluatePassEligibility(base({ ...CLEAN(), smokeRan: 'not-ran' }, 'unit-sufficient'))
  assert.ok(r6.ok === true && r6.triggered.length === 0,
    '非判级（unit-sufficient）× not-ran → 零行为不触发（判级限定，brownfield 兼容）')
})

// ═══════════════════════════════════════════════════════════════════
// ⑨ config-schema：commands.smoke 键登记（FR-01 配置面 / D-001@v1）
// ═══════════════════════════════════════════════════════════════════
test('⑨ config-schema：commands.smoke 登记为 live 可选键，reader=executeVerifyQualityScan，example 含脚本形态', () => {
  const cmdSection = LOCAL_YAML_SCHEMA.sections.find((s) => s.id === 'commands')
  const key = cmdSection && cmdSection.keys.find((k) => k.path === 'commands.smoke')
  assert.ok(key && key.status === 'live' && key.optional === true && key.readers.some((r) => r.includes('executeVerifyQualityScan')),
    `commands.smoke 登记为 live 可选键且 reader=executeVerifyQualityScan（verify 阶段 CLI 亲跑，配置生效面可追溯）（实际 ${JSON.stringify(key && { status: key.status, optional: key.optional, readers: key.readers })}）`)
  assert.ok(renderExample().includes('smoke: node scripts/smoke.mjs'),
    'local.yaml.example 模板含 smoke 示例行（每个 live 键必现于 example 的耦合不漂移）')
})
