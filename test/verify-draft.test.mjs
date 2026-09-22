/**
 * verify-draft.test.mjs — verify 填槽制（r5l 方案3 / 评审护栏#2，v2 件二）
 *
 * 覆盖验收四面：
 *   ① draft 形态：真骨架（generateVerifyResultSkeleton）→ 四节机器预填完整句子 + MACHINE-DRAFT
 *      指纹标记 + 恰好三处 <!--AGENT:--> 槽（结论枚举/移交项/审查叙述）+ 顶部模式横幅；幂等二跑零改动；
 *   ② --done 篡改门禁（承重件）：机器段内容被改写 / 标记被整删（heredoc 整份重写形态）/
 *      标记被手工重锚而未审计 → 拒收；AGENT 槽改动放行；无 sidecar（未用 draft）零红；
 *   ③ --amend-draft 留痕通道：重锚后放行 + sidecar amendment 审计在案；
 *   ④ 既有槽契约不动：结论枚举槽行 `<待填：三选一>` 形态经 extractVerifyConclusionSlot 仍解析为未填。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const { generateVerifyResultSkeleton } = await import('../src/verify-probes.js')
const { buildDraftSections, transformSkeletonToDraft, applyDraftMode, checkDraftIntegrity, amendDraftMarkers, verifyDraftSidecarPath } = await import('../src/verify-draft.js')
const { extractVerifyConclusionSlot } = await import('../src/stage-contract.js')

const SYNTH = {
  probe1: { matches: [], globEntries: [], skippedFiles: [], markersTotal: 0, filesScanned: 0, taskCardsHit: [] },
  probe2: { hitCount: 0 }, probe3: { tasks: [] }, probe4: { hitCount: 0 },
  probe5: { missingBackend: [] }, probe6: { deletions: [], present: [] },
}

const MATERIALS = {
  summarize: { report: '✅ 任务完成度（review verdict 真源）', total: 3, completed: 3, pending: [] },
  risk: { tier: 'S1', level: 'unit-sufficient', evidenceRequired: false, explicit: false, hitPrefixes: [] },
  testResult: { source: 'ledger', command: 'npm test', status: 'passed', ranAt: '2026-09-22T00:00:00Z', durationMs: 95000, total: 581 },
  decisionChain: { rows: ['| D-001@v1 | FR-01 | task-01 | <待填：证据回指> | <待填> |'], decisionCount: 1, taskCount: 1 },
}

function makeFixture() {
  const root = mkdtempSync(join(tmpdir(), 'vd-'))
  const changeDir = join(root, '.sillyspec', 'changes', 'c1')
  mkdirSync(changeDir, { recursive: true })
  const runtimeRoot = join(root, '.sillyspec', '.runtime')
  mkdirSync(runtimeRoot, { recursive: true })
  const mdPath = join(changeDir, 'verify-result.md')
  return { root, changeDir, runtimeRoot, mdPath }
}
const clean = (root) => { try { rmSync(root, { recursive: true, force: true }) } catch {} }

test('draft 形态：四节机器预填+指纹标记+恰好三 AGENT 槽+横幅；幂等二跑零改动；结论枚举槽契约不动', () => {
  const f = makeFixture()
  try {
    const skeleton = generateVerifyResultSkeleton(SYNTH)
    const sections = buildDraftSections(MATERIALS)
    const { text, applied } = transformSkeletonToDraft(skeleton, sections)
    assert.deepEqual(applied.sort(), ['decision-chain', 'risk-level', 'task-completion', 'test-result'], '四节全部 draft 化')
    assert.equal((text.match(/<!--AGENT:槽/g) || []).length, 3, '恰好三处 AGENT 槽（横幅不写字面标记防误计）')
    assert.ok(text.includes('VERIFY-DRAFT-MODE'), '顶部模式横幅在案')
    assert.ok(text.includes('MACHINE-DRAFT:task-completion:'), '任务完成度指纹标记')
    assert.ok(text.includes('581 断言'), '测试结果机器句子（完整句非占位）')
    assert.ok(text.includes('D-001@v1'), '决策链机械半边表格')
    assert.ok(!/## 任务完成度[^\n]*\n<!--TODO/.test(text), '四节 TODO 占位被替换')
    // 既有槽契约：draft 态结论枚举槽行仍是 <待填：三选一>（gate fail-closed 消费面不动）
    assert.equal(extractVerifyConclusionSlot(text), '', '槽未填仍判不过（契约零回归）')
    // 幂等：二跑零改动
    const again = transformSkeletonToDraft(text, sections)
    assert.deepEqual(again.applied, [], '已 draft 化段落不再触碰')
    assert.equal(again.text, text, '文本逐字节不变')
  } finally { clean(f.root) }
})

test('篡改门禁（承重件）：内容改写/标记整删/手工重锚均拒收；AGENT 槽改动放行；无 sidecar 零红', () => {
  const f = makeFixture()
  try {
    writeFileSync(f.mdPath, generateVerifyResultSkeleton(SYNTH), 'utf8')
    const applied = applyDraftMode({ mdPath: f.mdPath, changeName: 'c1', runtimeRoot: f.runtimeRoot, sections: buildDraftSections(MATERIALS) })
    assert.equal(applied.applied.length, 4, 'draft 落盘')
    assert.ok(existsSync(verifyDraftSidecarPath(f.runtimeRoot, 'c1')), 'sidecar 台账在案')
    // 基线：原样通过
    assert.ok(checkDraftIntegrity({ mdPath: f.mdPath, changeName: 'c1', runtimeRoot: f.runtimeRoot }).ok, '未动放行')
    // AGENT 槽（机器段之外）改动 → 放行（槽是 agent 的合法书写面）
    const withSlot = readFileSync(f.mdPath, 'utf8').replace('结论枚举：`<待填：三选一>`', '结论枚举：PASS（机器段外合法填槽）')
    writeFileSync(f.mdPath, withSlot, 'utf8')
    assert.ok(checkDraftIntegrity({ mdPath: f.mdPath, changeName: 'c1', runtimeRoot: f.runtimeRoot }).ok, 'AGENT 槽改动放行')
    // 形态①：机器段内容被改写（heredoc 整份回写后机器句被顺手改）
    const tampered = withSlot.replace('- 总任务：3；已完成（review verdict 口径）：3', '- 总任务：3；已完成（review verdict 口径）：2')
    writeFileSync(f.mdPath, tampered, 'utf8')
    const v1 = checkDraftIntegrity({ mdPath: f.mdPath, changeName: 'c1', runtimeRoot: f.runtimeRoot })
    assert.ok(!v1.ok && v1.violations.some((x) => x.includes('task-completion') && x.includes('失配')), '内容改写拒收')
    // 形态②：标记被整删（整份重写把注释对洗掉）
    const stripped = tampered.replace(/^<!--\s*MACHINE-DRAFT:[\w.-]+:[0-9a-f]{64}:begin[^>]*-->\n/gm, '').replace(/^<!--\s*MACHINE-DRAFT:[\w.-]+:end[^>]*-->\n/gm, '')
    writeFileSync(f.mdPath, stripped, 'utf8')
    const v2 = checkDraftIntegrity({ mdPath: f.mdPath, changeName: 'c1', runtimeRoot: f.runtimeRoot })
    assert.ok(!v2.ok && v2.violations.length === 4, '标记整删全段拒收')
    // 形态③：内容改写 + begin 行哈希手工重锚到改后内容（绕内容比对）而未走 --amend-draft
    // ——sidecar 台账未同步，标记哈希 ≠ 台账哈希即拦（未经审计的重锚无留痕面）
    const forgedBase = withSlot.replace('- 总任务：3；已完成（review verdict 口径）：3', '- 总任务：3；已完成（review verdict 口径）：2')
    const flines = forgedBase.split('\n')
    const bIdx = flines.findIndex((l) => l.includes('MACHINE-DRAFT:task-completion:'))
    const eIdx = flines.findIndex((l) => l.includes('MACHINE-DRAFT:task-completion:end'))
    const forged = createHash('sha256').update(flines.slice(bIdx + 1, eIdx).join('\n').replace(/\r\n/g, '\n')).digest('hex')
    writeFileSync(f.mdPath, forgedBase.replace(/(<!--\s*MACHINE-DRAFT:task-completion:)[0-9a-f]{64}(:begin)/, `$1${forged}$2`), 'utf8')
    const v3 = checkDraftIntegrity({ mdPath: f.mdPath, changeName: 'c1', runtimeRoot: f.runtimeRoot })
    assert.ok(!v3.ok && v3.violations.some((x) => x.includes('不一致') || x.includes('失配')), '手工重锚未审计拒收（sidecar 哈希是真相基准——内容比对或标记-台账比对任一命中即拦）')
    // 无 sidecar（未用 draft 的存量变更）→ not-applicable 零红
    const other = checkDraftIntegrity({ mdPath: f.mdPath, changeName: 'c-other', runtimeRoot: f.runtimeRoot })
    assert.ok(other.applicable === false && other.ok, '无 sidecar 放行')
  } finally { clean(f.root) }
})

test('--amend-draft 留痕通道：改写后重锚放行 + sidecar amendment 审计在案', async () => {
  const f = makeFixture()
  try {
    writeFileSync(f.mdPath, generateVerifyResultSkeleton(SYNTH), 'utf8')
    applyDraftMode({ mdPath: f.mdPath, changeName: 'c1', runtimeRoot: f.runtimeRoot, sections: buildDraftSections(MATERIALS) })
    // agent 确要改机器段（合法场景：机器句子有事实误差）→ 直接改内容 → 门禁红
    const edited = readFileSync(f.mdPath, 'utf8').replace('- 总任务：3；已完成（review verdict 口径）：3', '- 总任务：3；已完成（review verdict 口径）：2（修正：task-03 实为未过）')
    writeFileSync(f.mdPath, edited, 'utf8')
    assert.ok(!checkDraftIntegrity({ mdPath: f.mdPath, changeName: 'c1', runtimeRoot: f.runtimeRoot }).ok, '改写后先红')
    // --amend-draft 重锚 → 放行 + 审计
    const keys = amendDraftMarkers({ mdPath: f.mdPath, changeName: 'c1', runtimeRoot: f.runtimeRoot })
    assert.ok(keys.includes('task-completion'), '重锚覆盖被改段')
    const verdict = checkDraftIntegrity({ mdPath: f.mdPath, changeName: 'c1', runtimeRoot: f.runtimeRoot })
    assert.ok(verdict.ok, `重锚后放行：${JSON.stringify(verdict.violations)}`)
    const sidecar = JSON.parse(readFileSync(verifyDraftSidecarPath(f.runtimeRoot, 'c1'), 'utf8'))
    assert.ok(Array.isArray(sidecar.amendments) && sidecar.amendments.length === 1 && sidecar.amendments[0].keys.includes('task-completion'), 'amendment 审计在案（留痕）')
    assert.ok(readFileSync(f.mdPath, 'utf8').includes('修正：task-03 实为未过'), 'agent 的修正内容保留（未被重写回机器原文）')
  } finally { clean(f.root) }
})
