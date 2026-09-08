/**
 * requiredEvidence 分类核验 v2（2026-09-08-ir-verify-facts task-02 / FR-02）。
 *
 * 代码类三核验（存在×mtime×diff 交集）/ artifact 类豁免 diff / 豁免后缀 / partial /
 * missing 无豁免 blocked / 槽缺失登记 blocked / legacy 降级（无槽走子串提及 + warning）。
 * 函数级 blocked 断言（gates 接线级 e2e 归 task-03）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, utimesSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { execSync } from 'child_process'
import { runVerifyRequiredEvidenceCheck } from '../src/verify-postcheck.js'

function makeFx() {
  const cwd = mkdtempSync(join(tmpdir(), 'sillyspec-evidence-v2-'))
  execSync('git init -q', { cwd })
  execSync('git config user.email t@t', { cwd })
  execSync('git config user.name t', { cwd })
  const specBase = join(cwd, '.sillyspec')
  const changeDir = join(specBase, 'changes', 'c1')
  mkdirSync(changeDir, { recursive: true })
  mkdirSync(join(cwd, 'src'), { recursive: true })
  // design.md（R-05 fallback 基准）——created_at 设为过去
  writeFileSync(join(changeDir, 'design.md'), '---\nauthor: t\ncreated_at: 2020-01-01T00:00:00\nscale: large\n---\n\n# d\n')
  // git diff 内的代码文件（commit 后修改未提交 → working tree diff）
  writeFileSync(join(cwd, 'src', 'code.js'), 'old\n')
  execSync('git add -A && git commit -qm base', { cwd })
  writeFileSync(join(cwd, 'src', 'code.js'), 'new\n')
  // 日志类（artifact）
  const logDir = join(cwd, 'logs')
  mkdirSync(logDir, { recursive: true })
  writeFileSync(join(logDir, 'run.log'), 'started ok\n')
  return { cwd, specBase, changeDir }
}

function writeEvidenceJson(fx, items) {
  writeFileSync(join(fx.changeDir, 'verify-required-evidence.json'),
    JSON.stringify({ generatedAt: '2026-09-08T00:00:00', schemaVersion: 1, items }))
}
function writeReport(fx, lines) {
  writeFileSync(join(fx.changeDir, 'verify-result.md'),
    ['# 报告', '## 证据账（cannot_verify 任务）', '[层：人工判断——CLI 核验]', '', ...lines, ''].join('\n'))
}

test('代码类三核验全过 → passed', () => {
  const fx = makeFx()
  try {
    writeEvidenceJson(fx, [{ task: 'task-02', verdict: 'cannot_verify', evidence: ['真实集成验证'] }])
    writeReport(fx, ['- task-02: satisfied | verifiedFiles: src/code.js'])
    const r = runVerifyRequiredEvidenceCheck({ cwd: fx.cwd, specBase: fx.specBase, changeName: 'c1' })
    assert.equal(r.status, 'passed', JSON.stringify(r.detailed))
    assert.equal(r.detailed[0].verification[0].diffHit, true, 'working tree diff 命中')
  } finally { rmSync(fx.cwd, { recursive: true, force: true }) }
})

test('代码类零 diff 交集 → blocked（蹭词通道关闭）', () => {
  const fx = makeFx()
  try {
    writeFileSync(join(fx.cwd, 'src', 'unrelated.js'), 'x\n')  // 存在但不在 diff（未 add 且未被 baseline 跟踪？——git status untracked 计入三源）
    writeEvidenceJson(fx, [{ task: 'task-02', verdict: 'cannot_verify', evidence: ['x'] }])
    // 用一个「不在三源内的路径」：已 commit 且无改动的文件
    writeReport(fx, ['- task-02: satisfied | verifiedFiles: package.json'])
    writeFileSync(join(fx.cwd, 'package.json'), '{}')
    execSync('git add -A && git commit -qm pkg', { cwd: fx.cwd })
    const r = runVerifyRequiredEvidenceCheck({ cwd: fx.cwd, specBase: fx.specBase, changeName: 'c1' })
    assert.equal(r.status, 'blocked')
    assert.equal(r.detailed[0].verification[0].diffHit, false, '已提交无改动文件不在 diff 内')
  } finally { rmSync(fx.cwd, { recursive: true, force: true }) }
})

test('文件缺失 → blocked（含明细 reason）', () => {
  const fx = makeFx()
  try {
    writeEvidenceJson(fx, [{ task: 'task-02', verdict: 'cannot_verify', evidence: ['x'] }])
    writeReport(fx, ['- task-02: satisfied | verifiedFiles: src/ghost.js'])
    const r = runVerifyRequiredEvidenceCheck({ cwd: fx.cwd, specBase: fx.specBase, changeName: 'c1' })
    assert.equal(r.status, 'blocked')
    assert.equal(r.detailed[0].verification[0].filesExist, false)
    assert.match(r.detailed[0].verification[0].reason, /不存在/)
  } finally { rmSync(fx.cwd, { recursive: true, force: true }) }
})

test('mtime 出窗 → blocked；verifyStartAt 显式传入生效', () => {
  const fx = makeFx()
  try {
    writeEvidenceJson(fx, [{ task: 'task-02', verdict: 'cannot_verify', evidence: ['x'] }])
    writeReport(fx, ['- task-02: satisfied | verifiedFiles: logs/run.log'])
    // log 是 artifact 类（豁免 diff）但 mtime 早于 verifyStartAt
    const old = new Date(Date.now() - 90 * 24 * 3600_000)
    utimesSync(join(fx.cwd, 'logs', 'run.log'), old, old)
    const r = runVerifyRequiredEvidenceCheck({ cwd: fx.cwd, specBase: fx.specBase, changeName: 'c1', verifyStartAt: new Date().toISOString() })
    assert.equal(r.status, 'blocked')
    assert.equal(r.detailed[0].verification[0].mtimeOk, false)
    assert.equal(r.detailed[0].verification[0].diffHit, true, 'artifact 类 diff 豁免仍 true')
  } finally { rmSync(fx.cwd, { recursive: true, force: true }) }
})

test('artifact 类（日志）豁免 diff 交集 → 不假红', () => {
  const fx = makeFx()
  try {
    writeEvidenceJson(fx, [{ task: 'task-02', verdict: 'cannot_verify', evidence: ['x'] }])
    writeReport(fx, ['- task-02: satisfied | verifiedFiles: logs/run.log'])
    const r = runVerifyRequiredEvidenceCheck({ cwd: fx.cwd, specBase: fx.specBase, changeName: 'c1' })
    assert.equal(r.status, 'passed', JSON.stringify(r.detailed))
    assert.equal(r.detailed[0].verification[0].pathClass, 'artifact')
  } finally { rmSync(fx.cwd, { recursive: true, force: true }) }
})

test('missing 无豁免 → blocked；带豁免后缀 → passed', () => {
  const fx = makeFx()
  try {
    writeEvidenceJson(fx, [
      { task: 'task-02', verdict: 'cannot_verify', evidence: ['x'] },
      { task: 'task-03', verdict: 'cannot_verify', evidence: ['y'] },
    ])
    writeReport(fx, [
      '- task-02: missing（豁免：集成环境不可得，改为静态核验见正文）',
      '- task-03: missing',
    ])
    const r = runVerifyRequiredEvidenceCheck({ cwd: fx.cwd, specBase: fx.specBase, changeName: 'c1' })
    assert.equal(r.status, 'blocked')
    const t2 = r.detailed.find(d => d.task === 'task-02')
    const t3 = r.detailed.find(d => d.task === 'task-03')
    assert.equal(t2.exempt, true)
    assert.match(t2.reason, /已豁免/)
    assert.equal(t3.exempt, false)
    assert.match(t3.reason, /未闭环/)
  } finally { rmSync(fx.cwd, { recursive: true, force: true }) }
})

test('槽段在场但 task 未登记 → blocked', () => {
  const fx = makeFx()
  try {
    writeEvidenceJson(fx, [{ task: 'task-09', verdict: 'cannot_verify', evidence: ['x'] }])
    writeReport(fx, ['- task-02: satisfied | verifiedFiles: src/code.js'])
    const r = runVerifyRequiredEvidenceCheck({ cwd: fx.cwd, specBase: fx.specBase, changeName: 'c1' })
    assert.equal(r.status, 'blocked')
    assert.match(r.detailed.find(d => d.task === 'task-09').reason, /未在证据账槽段登记/)
  } finally { rmSync(fx.cwd, { recursive: true, force: true }) }
})

test('无槽存量 md → legacy 子串对账（warning/passed，行为等同旧版）', () => {
  const fx = makeFx()
  try {
    writeEvidenceJson(fx, [{ task: 'task-02', verdict: 'cannot_verify', evidence: ['x'] }])
    writeFileSync(join(fx.changeDir, 'verify-result.md'), '# 旧报告\n\ntask-02 的证据已手工核验：satisfied。\n')
    const r = runVerifyRequiredEvidenceCheck({ cwd: fx.cwd, specBase: fx.specBase, changeName: 'c1' })
    assert.equal(r.status, 'passed')
    assert.equal(r.legacy, true)
    // 未提及 → warning（advisory 同旧版）
    writeFileSync(join(fx.changeDir, 'verify-result.md'), '# 旧报告\n\n无关内容\n')
    const r2 = runVerifyRequiredEvidenceCheck({ cwd: fx.cwd, specBase: fx.specBase, changeName: 'c1' })
    assert.equal(r2.status, 'warning')
    assert.equal(r2.legacy, true)
  } finally { rmSync(fx.cwd, { recursive: true, force: true }) }
})
