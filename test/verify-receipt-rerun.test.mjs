/**
 * 集成回执一致性校验 + facts 基线对比（2026-09-08-ir-verify-facts task-04 / task-05）。
 * task-04 部分：checkIntegrationEvidence v2 绿判据四条件 / 签名噪声剔除 / mtime 出窗 /
 * exit≠0 / 槽缺失 legacy 回退 / extraEvidenceText 合并。
 * task-05 部分（W3 追加）：checkProbeConsistency facts 基线对比。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, utimesSync, rmSync, readFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { checkIntegrationEvidence } from '../src/change-risk-profile.js'

function fxWithLog(body, { ageDays = 0, exitCode = 0 } = {}) {
  const cwd = mkdtempSync(join(tmpdir(), 'sillyspec-receipt-'))
  mkdirSync(join(cwd, 'logs'), { recursive: true })
  writeFileSync(join(cwd, 'logs', 'run.log'), body)
  if (ageDays > 0) {
    const old = new Date(Date.now() - ageDays * 24 * 3600_000)
    utimesSync(join(cwd, 'logs', 'run.log'), old, old)
  }
  return { cwd, receipt: { claim: 'daemon 启动冒烟', command: 'npm run smoke', exitCode, logPath: 'logs/run.log' } }
}

const NEEDS = ['real_daemon_backend_integration', 'runtime_log_evidence']

test('绿判据全过 → ok（structured 通道）', () => {
  const fx = fxWithLog('started\nhealth ok\nall done\n')
  try {
    const r = checkIntegrationEvidence('# 报告\n## 集成验证回执\n- claim: x | command: c | exit: 0 | log: logs/run.log', NEEDS, { runtimeEvidence: [fx.receipt], cwd: fx.cwd, verifyStartAt: new Date(Date.now() - 60_000).toISOString() })
    assert.equal(r.ok, true, JSON.stringify(r))
    assert.equal(r.structured, true)
    assert.equal(r.receiptAudit[0].green, true)
  } finally { rmSync(fx.cwd, { recursive: true, force: true }) }
})

test('失败签名命中 → 不绿；「0 errors」良性行剔除不计', () => {
  const bad = fxWithLog('started\nerror: connection refused\n0 errors in cleanup\ndone\n')
  try {
    const r = checkIntegrationEvidence('x', NEEDS, { runtimeEvidence: [bad.receipt], cwd: bad.cwd })
    assert.equal(r.ok, false)
    assert.equal(r.receiptAudit[0].failSignatures, 1, 'error: 行首命中 1；「0 errors」剔除')
    assert.match(r.receiptAudit[0].reason, /失败签名/)
  } finally { rmSync(bad.cwd, { recursive: true, force: true }) }
})

test('exit≠0 → 不绿', () => {
  const fx = fxWithLog('ok\n', { exitCode: 1 })
  try {
    const r = checkIntegrationEvidence('x', NEEDS, { runtimeEvidence: [fx.receipt], cwd: fx.cwd })
    assert.equal(r.ok, false)
    assert.match(r.receiptAudit[0].reason, /exitCode=1/)
  } finally { rmSync(fx.cwd, { recursive: true, force: true }) }
})

test('日志不存在 → 不绿；mtime 出窗（verifyStartAt 晚于日志）→ 不绿', () => {
  const missing = { claim: 'x', command: 'c', exitCode: 0, logPath: 'logs/ghost.log' }
  const r1 = checkIntegrationEvidence('x', NEEDS, { runtimeEvidence: [missing], cwd: 'C:\\nonexistent-root' })
  assert.equal(r1.ok, false)
  assert.match(r1.receiptAudit[0].reason, /日志不存在/)

  const stale = fxWithLog('ok\n', { ageDays: 30 })
  try {
    const r2 = checkIntegrationEvidence('x', NEEDS, { runtimeEvidence: [stale.receipt], cwd: stale.cwd, verifyStartAt: new Date().toISOString() })
    assert.equal(r2.ok, false)
    assert.equal(r2.receiptAudit[0].mtimeInWindow, false)
  } finally { rmSync(stale.cwd, { recursive: true, force: true }) }
})

test('槽缺失（无 runtimeEvidence）→ legacy literals 回退 + structured:false', () => {
  const legacyOk = checkIntegrationEvidence('## Runtime Evidence\n端到端 daemon log 已验证', NEEDS, {})
  assert.equal(legacyOk.structured, false)
  assert.equal(legacyOk.ok, true, 'legacy 字面命中照常通过（存量兼容）')
  const legacyBad = checkIntegrationEvidence('只写了些散文', NEEDS, {})
  assert.equal(legacyBad.ok, false)
})

test('extraEvidenceText 保留合并（verify-services 回执注入不丢弃）', () => {
  // real_startup_once 的 literals 含「真实启动」——CLI 回执文本命中即在场（存量语义不变）
  const r = checkIntegrationEvidence('散文无关键词', ['real_startup_once'], { extraEvidenceText: 'CLI 回执：verify 服务进程已回收 2 个（PID 已登记，真实启动，运行时证据 reapedAt=t）' })
  assert.equal(r.structured, false)
  assert.equal(r.ok, true, '回执文本参与 legacy 匹配（真实启动命中）')
})

// ══ task-05：facts 基线对比（W3 追加） ══
import { checkProbeConsistency } from '../src/verify-postcheck.js'
import { execSync as _exec } from 'child_process'

function mkBaselineFx({ tamperFacts = false } = {}) {
  const cwd = mkdtempSync(join(tmpdir(), 'sillyspec-factsbase-'))
  _exec('git init -q', { cwd })
  _exec('git config user.email t@t', { cwd })
  _exec('git config user.name t', { cwd })
  const sb = join(cwd, '.sillyspec')
  const change = 'c9'
  const changeDir = join(sb, 'changes', change)
  mkdirSync(join(cwd, 'src'), { recursive: true })
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(cwd, 'src', 'app.js'), 'x\n')
  writeFileSync(join(changeDir, 'design.md'), '---\nauthor: t\ncreated_at: 2026-09-08T00:00:00\n---\n\n## 文件变更清单\n- src/app.js\n')
  writeFileSync(join(changeDir, 'tasks.md'), '# 任务清单（Tasks）\n\n- [x] task-01: 做事\n')
  _exec('git add -A && git commit -qm base', { cwd })
  // facts 快照（probe1 matches=0）+ 正文锚（与快照一致）
  writeFileSync(join(changeDir, 'verify-facts.json'), JSON.stringify({ schemaVersion: 2, change, generatedAt: new Date().toISOString(), probes: { probe1: { command: 'c', metrics: { matches: 0 } } } }))
  writeFileSync(join(changeDir, 'verify-result.md'), [
    '# 报告', '## 探针结果（CLI 机械预填） [层：可复跑探针]', '',
    '#### 探针 1：未实现标记扫描（design 清单文件）', '- ✅ 无 TODO/FIXME/尚未实现 标记命中', '',
    '#### 探针 3：验收标准测试覆盖', '- ℹ️ tasks.md 无 checkbox 任务', '',
    '#### 探针 5：API Contract Parity', '- backend 0 端点 / frontend 0 调用', '',
    '#### 探针 6：代码删除对账', '- ✅ git diff 无整文件删除（D/R/C）记录', '',
    '## 结论 [层：人工判断]', '', '结论枚举：`PASS`', '',
  ].join('\n'))
  if (tamperFacts === 'align-md') {
    // 场景：代码新增 TODO 标记 → md 手改对齐（锚点不 mismatch）→ facts 快照过期
    writeFileSync(join(cwd, 'src', 'app.js'), 'x\n// TODO: fix\n')
    writeFileSync(join(changeDir, 'verify-result.md'), [
      '# 报告', '## 探针结果（CLI 机械预填） [层：可复跑探针]', '',
      '#### 探针 1：未实现标记扫描（design 清单文件）', '- ⚠️ `src/app.js:2` TODO: fix', '',
      '#### 探针 3：验收标准测试覆盖', '- ℹ️ tasks.md 无 checkbox 任务', '',
      '#### 探针 5：API Contract Parity', '- backend 0 端点 / frontend 0 调用', '',
      '#### 探针 6：代码删除对账', '- ✅ git diff 无整文件删除（D/R/C）记录', '',
      '## 结论 [层：人工判断]', '', '结论枚举：`PASS`', '',
    ].join('\n'))
  }
  return { cwd, sb, change, changeDir }
}

test('facts 基线 match：环境未变 → ok + factsConsistency 固化 match', () => {
  const fx = mkBaselineFx()
  try {
    const r = checkProbeConsistency({ cwd: fx.cwd, specBase: fx.sb, changeName: fx.change })
    assert.equal(r.status, 'ok', JSON.stringify(r.mismatches))
    assert.equal(r.factsConsistency.verdict, 'match')
    const saved = JSON.parse(readFileSync(join(fx.changeDir, 'verify-facts.json'), 'utf8'))
    assert.equal(saved.factsConsistency.verdict, 'match', '固化进 facts')
  } finally { rmSync(fx.cwd, { recursive: true, force: true }) }
})

test('facts 过期：md 手改对齐新代码（锚点过）但 facts 快照滞后 → facts:probe1 ERROR', () => {
  const fx = mkBaselineFx({ tamperFacts: 'align-md' })
  try {
    const r = checkProbeConsistency({ cwd: fx.cwd, specBase: fx.sb, changeName: fx.change })
    assert.equal(r.status, 'mismatch')
    const fm = r.mismatches.find(m => m.probe === 'facts:probe1')
    assert.ok(fm, `facts:probe1 在场（实际：${JSON.stringify(r.mismatches)}）`)
    assert.equal(fm.severity, 'error')
    assert.equal(fm.actual, 0, '快照值（f acts 侧）')
    assert.equal(fm.expected, 1, '重跑值（当前世界）')
    assert.equal(r.factsConsistency.verdict, 'mismatch')
    const d1 = r.factsConsistency.detail.find(x => x.probe === 'probe1')
    assert.equal(d1.snapshot, 0)
    assert.equal(d1.rerun, 1)
    const saved = JSON.parse(readFileSync(join(fx.changeDir, 'verify-facts.json'), 'utf8'))
    assert.ok(saved.factsConsistency.detail.some(x => x.probe === 'probe1'), 'mismatch 明细固化')
  } finally { rmSync(fx.cwd, { recursive: true, force: true }) }
})

test('facts 缺失 → 基线维度跳过（factsConsistency null，不误报）', () => {
  const fx = mkBaselineFx()
  try {
    rmSync(join(fx.changeDir, 'verify-facts.json'))
    const r = checkProbeConsistency({ cwd: fx.cwd, specBase: fx.sb, changeName: fx.change })
    assert.equal(r.status, 'ok')
    assert.equal(r.factsConsistency, null)
  } finally { rmSync(fx.cwd, { recursive: true, force: true }) }
})
