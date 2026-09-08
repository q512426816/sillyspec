/**
 * verify-facts v2 数据层（2026-09-08-ir-verify-facts task-01 / FR-01）。
 *
 * schema 单点（verify-facts-schema.js）+ 分段合并写入（writeVerifyFacts）+ 槽段渲染与
 * 段落补齐（generateVerifyResultSkeleton / backfillMissingEvidenceSlots）+ --done 回填
 * （backfillFactsFromMdAndTests）。占位不含枚举词 fail-closed 是刀③教训的延续锁。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import {
  FACTS_SCHEMA_VERSION, EVIDENCE_STATUS, EVIDENCE_SLOT_HEADING, RECEIPT_SLOT_HEADING,
  classifyVerifiedFile, parseEvidenceSlots, validateFactsV2,
} from '../src/verify-facts-schema.js'
import {
  generateVerifyResultSkeleton, writeVerifyFacts, backfillFactsFromMdAndTests, backfillMissingEvidenceSlots,
} from '../src/verify-probes.js'

const R = {
  probe1: { matches: [], globEntries: [], worktreeHits: 0, skippedFiles: [] },
  probe3: { tasks: [{ task: 'task-01', hasTest: true }], note: 'n' },
  probe5: { summary: 'backend 1 端点 / frontend 1 调用' },
  probe6: { unavailable: true, deletions: [], note: 'n' },
}

function tmpDir() { return mkdtempSync(join(tmpdir(), 'sillyspec-facts-v2-')) }

test('schema 常量：v2 版本号与状态枚举单源', () => {
  assert.equal(FACTS_SCHEMA_VERSION, 2)
  assert.deepEqual(EVIDENCE_STATUS, ['satisfied', 'missing', 'partial'])
  assert.ok(EVIDENCE_SLOT_HEADING.startsWith('## 证据账'), '证据账标题行首形态')
  assert.ok(RECEIPT_SLOT_HEADING.startsWith('## 集成验证回执'), '回执标题不与 Runtime Evidence 章混淆')
})

test('classifyVerifiedFile：代码类 vs 运行时产物类边界', () => {
  assert.equal(classifyVerifiedFile('src/index.js'), 'code')
  assert.equal(classifyVerifiedFile('test/foo.test.mjs'), 'code')
  assert.equal(classifyVerifiedFile('.runtime/verify-runs/x/test-result.json'), 'artifact')
  assert.equal(classifyVerifiedFile('logs/run.log'), 'artifact')
  assert.equal(classifyVerifiedFile('docs/sillyspec/x.md'), 'artifact')
  assert.equal(classifyVerifiedFile('.sillyspec/docs/sillyspec/modules/core-engine.md'), 'artifact')
})

test('parseEvidenceSlots：正常填写命中 + 豁免后缀解析', () => {
  const md = [
    '# 报告',
    `## 证据账（cannot_verify 任务）`,
    '[层：人工判断——CLI 核验]',
    '',
    '- task-02: satisfied | verifiedFiles: src/a.js, logs/run.log',
    '- task-03: missing（豁免：环境不可得，见风险章）',
    '- task-04: partial | verifiedFiles: src/b.js（仅覆盖首条）',
    '',
    '## 集成验证回执',
    '- claim: 启动冒烟 | command: npm run smoke | exit: 0 | log: logs/smoke.log',
  ].join('\n')
  const slots = parseEvidenceSlots(md)
  assert.equal(slots.hasEvidenceSlot, true)
  assert.equal(slots.hasReceiptSlot, true)
  const t2 = slots.requiredEvidence.find(e => e.task === 'task-02')
  assert.equal(t2.status, 'satisfied')
  assert.deepEqual(t2.verifiedFiles, ['src/a.js', 'logs/run.log'])
  const t3 = slots.requiredEvidence.find(e => e.task === 'task-03')
  assert.equal(t3.exempt, true, 'missing + 豁免后缀 → 豁免成立')
  assert.ok(t3.exemptionReason.includes('环境不可得'))
  const t4 = slots.requiredEvidence.find(e => e.task === 'task-04')
  assert.equal(t4.status, 'partial')
  assert.equal(slots.runtimeEvidence.length, 1)
  assert.equal(slots.runtimeEvidence[0].exitCode, 0)
  assert.equal(slots.runtimeEvidence[0].logPath, 'logs/smoke.log')
})

test('parseEvidenceSlots：占位/无槽 fail-closed（不含枚举词双保险）', () => {
  const placeholder = [
    `## 证据账（cannot_verify 任务）`,
    '- task-02: <待填：三选一> | verifiedFiles: <精确路径，逗号分隔>（satisfied 必填）',
    `## 集成验证回执`,
    '- claim: <待填：一句话> | command: <待填：命令> | exit: <待填：0 或非 0> | log: <待填：日志路径>',
  ].join('\n')
  const slots = parseEvidenceSlots(placeholder)
  assert.equal(slots.hasEvidenceSlot, true)
  assert.equal(slots.requiredEvidence.length, 0, '占位行不命中（行首枚举锚定）')
  assert.equal(slots.runtimeEvidence.length, 0, '回执占位不命中')
  const noSlot = parseEvidenceSlots('# 无槽存量报告\n## 结论\n结论枚举：`PASS`')
  assert.equal(noSlot.hasEvidenceSlot, false)
  assert.equal(noSlot.requiredEvidence.length, 0)
})

test('validateFactsV2：结构校验正反例', () => {
  const ok = validateFactsV2({ schemaVersion: 2, probes: {}, conclusion: 'PASS', requiredEvidence: [{ task: 'task-02', status: 'satisfied', verifiedFiles: ['a.js'] }] })
  assert.equal(ok.ok, true)
  const bad = validateFactsV2({ schemaVersion: 1, probes: {}, conclusion: 'MAYBE', requiredEvidence: [{ task: 't', status: 'satisfied', verifiedFiles: [] }] })
  assert.equal(bad.ok, false)
  assert.ok(bad.errors.some(e => e.includes('schemaVersion')))
  assert.ok(bad.errors.some(e => e.includes('conclusion')))
  assert.ok(bad.errors.some(e => e.includes('verifiedFiles 为空')))
})

test('骨架：含两槽段且占位不含枚举词（刀③教训延续锁）', () => {
  const sk = generateVerifyResultSkeleton(R)
  assert.ok(sk.includes(EVIDENCE_SLOT_HEADING), '含证据账槽段')
  assert.ok(sk.includes(RECEIPT_SLOT_HEADING), '含集成验证回执槽段')
  assert.ok(!/\| <satisfied\|missing\|partial>/.test(sk), '占位不含三枚举并列形态')
  assert.ok(sk.includes('<待填：三选一>'), '证据账占位形态')
  assert.ok(sk.includes('<待填：0 或非 0>'), '回执 exit 占位形态')
})

test('writeVerifyFacts 分段合并：re-init 保留固化段、刷新机器段', () => {
  const dir = tmpDir()
  try {
    writeVerifyFacts(dir, R, 'c1')
    let facts = JSON.parse(readFileSync(join(dir, 'verify-facts.json'), 'utf8'))
    assert.equal(facts.schemaVersion, 2)
    assert.equal(facts.probes.probe1.metrics.matches, 0)
    // 模拟 --done 回填固化段
    backfillFactsFromMdAndTests(join(dir, 'verify-facts.json'), {
      verifyMd: `${EVIDENCE_SLOT_HEADING}\n- task-02: satisfied | verifiedFiles: src/a.js`,
      conclusion: 'PASS WITH NOTES',
    })
    // re-init（probes 指标变化：matches 0→2）
    const R2 = { ...R, probe1: { ...R.probe1, matches: [{}, {}] } }
    writeVerifyFacts(dir, R2, 'c1')
    facts = JSON.parse(readFileSync(join(dir, 'verify-facts.json'), 'utf8'))
    assert.equal(facts.probes.probe1.metrics.matches, 2, '机器段刷新')
    assert.equal(facts.conclusion, 'PASS WITH NOTES', '固化段保留（不抹）')
    assert.equal(facts.requiredEvidence[0].task, 'task-02')
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('backfillMissingEvidenceSlots：缺失补齐 + 幂等二跑零改动', () => {
  const dir = tmpDir()
  try {
    const mdPath = join(dir, 'verify-result.md')
    writeFileSync(mdPath, '# 存量报告\n\n## 结论\n结论枚举：`PASS`\n\n正文既有内容不应被触碰。\n')
    const r1 = backfillMissingEvidenceSlots(mdPath, [{ task: 'task-02', evidence: ['真实集成验证'] }])
    assert.deepEqual(r1.added, [EVIDENCE_SLOT_HEADING, RECEIPT_SLOT_HEADING])
    const after1 = readFileSync(mdPath, 'utf8')
    assert.ok(after1.includes('正文既有内容不应被触碰。'), '既有正文未动')
    assert.ok(after1.includes('- task-02: <待填：三选一>'), 'task 行按 items 预填')
    const r2 = backfillMissingEvidenceSlots(mdPath, [])
    assert.deepEqual(r2.added, [], '二跑零追加')
    assert.equal(readFileSync(mdPath, 'utf8'), after1, '幂等：二跑内容零改动')
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('backfillFactsFromMdAndTests：缺失 facts 跳过（不无中生有）+ v1 原地升 v2 + tests 段二次回填', () => {
  const dir = tmpDir()
  try {
    const factsPath = join(dir, 'verify-facts.json')
    // 缺失 → skipped（底稿创建唯一入口 --init；接线实证：凭空建 facts 会误升存量判别）
    const r0 = backfillFactsFromMdAndTests(factsPath, { verifyMd: EVIDENCE_SLOT_HEADING, conclusion: 'PASS' })
    assert.equal(r0.skipped, true)
    assert.ok(!existsSync(factsPath), '不落盘')
    writeFileSync(factsPath, JSON.stringify({ schemaVersion: 1, change: 'c1', probes: { probe1: { command: 'x', metrics: { matches: 1 } } } }))
    const r = backfillFactsFromMdAndTests(factsPath, {
      verifyMd: `${EVIDENCE_SLOT_HEADING}\n- task-02: satisfied | verifiedFiles: src/a.js\n${RECEIPT_SLOT_HEADING}\n- claim: c | command: cmd | exit: 0 | log: l.log`,
      conclusion: 'PASS',
    })
    assert.equal(r.conclusion, 'PASS')
    assert.equal(r.evidenceCount, 1)
    assert.equal(r.testsBackfilled, false, '无 testCheckResult → tests 不回填（留给实测后）')
    let facts = JSON.parse(readFileSync(factsPath, 'utf8'))
    assert.equal(facts.schemaVersion, 2, 'v1 原地升 v2')
    assert.equal(facts.probes.probe1.metrics.matches, 1, 'v1 probes 段保留')
    // 实测后二次回填
    backfillFactsFromMdAndTests(factsPath, {
      verifyMd: `${EVIDENCE_SLOT_HEADING}\n- task-02: satisfied | verifiedFiles: src/a.js`,
      conclusion: 'PASS',
      testCheckResult: { status: 'passed', command: 'npm test', exitCode: 0, mode: 'module', failureNames: [] },
    })
    facts = JSON.parse(readFileSync(factsPath, 'utf8'))
    assert.equal(facts.tests.command, 'npm test')
    assert.equal(facts.tests.exitCode, 0)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})
