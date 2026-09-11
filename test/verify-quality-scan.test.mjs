/**
 * verify 质量扫描 noAI 化三件套（P0-1，docs/sillyspec/noai-ir-roadmap.md §3）：
 *   ①指纹复用防重复跑——computeQualityScanFingerprint / storeQualityScan /
 *     loadReusableQualityScan：文档面变化不失效、代码面变化即失效、git 不可用 fail-closed；
 *   ②归因透传 + noAI 动作——executeVerifyQualityScan 成败两路（失败 throw 不盖步）；
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
  qualityScanRecordPath,
  storeQualityScan,
  loadReusableQualityScan,
  evaluateConclusionDraft,
  executeVerifyQualityScan,
} from '../src/run/verify-quality-scan.js'
import { applyConclusionDraftToText, buildDecisionChainMatrix, injectDecisionChainDraft } from '../src/verify-probes.js'
import { extractVerifyConclusionSlot } from '../src/stage-contract.js'

function makeFixtureRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'vqs-'))
  execSync('git init -q', { cwd: dir })
  execSync('git config user.email t@t.local', { cwd: dir })
  execSync('git config user.name t', { cwd: dir })
  writeFileSync(join(dir, 'README.md'), 'init\n')
  execSync('git add -A', { cwd: dir })
  execSync('git commit -qm init', { cwd: dir })
  mkdirSync(join(dir, '.sillyspec', 'changes', 'c1'), { recursive: true })
  mkdirSync(join(dir, '.sillyspec', '.runtime'), { recursive: true })
  // 命令用裸值形态（extractTestCommand 裸值正则排除引号——node -e "…" 解析不到，实测坑）
  writeFileSync(join(dir, 'exit0.js'), 'process.exit(0)\n')
  writeFileSync(join(dir, 'exit1.js'), 'process.exit(1)\n')
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
    assert.equal(st.path, qualityScanRecordPath(specBase, 'c1'), '记录路径按变更名分片（.runtime/verify-quality-scan-<change>.json）')
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

test('结论草稿槽变换：待填槽 → PASS 草稿（槽解析器认可）；已填/无槽原样返回', () => {
  const skeleton = `# 验证报告\n\n## 结论 [层：人工判断]\n\n结论枚举：\`<待填：三选一>\`（把尖括号占位整体替换为 PASS / PASS WITH NOTES / FAIL 之一）\n\n## 下文\n`
  const drafted = applyConclusionDraftToText(skeleton)
  assert.ok(drafted.includes('草稿待确认'), '草稿显式标注')
  assert.equal(extractVerifyConclusionSlot(drafted), 'PASS', '槽行解析为 PASS（gate 判定链同口径）')
  assert.ok(!drafted.includes('<待填：三选一>'), '待填占位已消除')
  // 已填 FAIL → 不改写（尊重 agent/前次裁决）
  const filled = skeleton.replace('结论枚举：`<待填：三选一>`（把尖括号占位整体替换为 PASS / PASS WITH NOTES / FAIL 之一）', '结论枚举：FAIL（存在未修复缺陷）')
  assert.equal(applyConclusionDraftToText(filled), filled, '已填枚举原样返回')
  // 无槽行（legacy 存量）→ 原样返回
  const legacy = '# 旧报告\n结论：看起来没问题\n'
  assert.equal(applyConclusionDraftToText(legacy), legacy, '无槽行原样返回')
})

test('决策链矩阵：D→FR→task 自 decisions.md × task 卡 frontmatter 构建；未闭环显式标注；幂等注入', () => {
  const dir = mkdtempSync(join(tmpdir(), 'vqs-chain-'))
  try {
    mkdirSync(join(dir, 'tasks'), { recursive: true })
    writeFileSync(join(dir, 'decisions.md'), [
      '---',
      'author: t',
      'created_at: 2026-09-10 00:00:00',
      '---',
      '',
      '## D-001@v2 决策一',
      '- 状态：implemented',
      '',
      '- D-002@v1：决策二（扁平式）',
      '',
    ].join('\n'))
    writeFileSync(join(dir, 'tasks', 'task-01.md'), [
      '---',
      'id: task-01',
      'title: 做 A',
      'decision_ids: [D-001]',
      'requirement_ids: [FR-01, FR-02]',
      'allowed_paths: [src/a.js]',
      '---',
      '正文',
    ].join('\n'))
    const matrix = buildDecisionChainMatrix(dir)
    assert.ok(matrix, '有 decisions → 矩阵')
    assert.equal(matrix.decisionCount, 2)
    assert.equal(matrix.taskCount, 1)
    const row1 = matrix.rows.find((r) => r.startsWith('| D-001@v2 '))
    assert.ok(row1.includes('FR-01、FR-02'), 'FR 自 requirement_ids 聚合')
    assert.ok(row1.includes('task-01'), 'task 自 decision_ids 匹配（D-001 无版本号同源匹配）')
    const row2 = matrix.rows.find((r) => r.startsWith('| D-002@v1 '))
    assert.ok(row2.includes('未闭环'), '无 task 回指显式标未闭环')
    // 注入骨架：TODO 行被表格替换；二跑幂等零改动
    const mdPath = join(dir, 'verify-result.md')
    writeFileSync(mdPath, [
      '# 验证报告', '',
      '## 决策追踪矩阵（如存在 decisions.md；无则删本节） [层：人工判断]',
      '<!--TODO: | 决策 ID | FR | Task | Evidence | 状态 |（D-xxx@vN → FR-xxx → task → 证据回指闭环）-->',
      '',
      '## 技术债务 [层：人工判断]',
      '<!--TODO: 统计-->',
      '',
    ].join('\n'))
    const inj = injectDecisionChainDraft(mdPath, dir)
    assert.ok(inj && inj.decisions === 2, '注入成功')
    const after = readFileSync(mdPath, 'utf8')
    assert.ok(after.includes('| D-001@v2 |'), '表格落盘')
    assert.ok(!/<!--TODO:[^\n]*D-xxx/.test(after), 'TODO 行被替换')
    assert.ok(after.includes('<!--TODO: 统计-->'), '其他章节 TODO 不受影响')
    const inj2 = injectDecisionChainDraft(mdPath, dir)
    assert.equal(inj2, null, '二跑幂等（已有表格零改动）')
    // 无 decisions.md → null
    const dir2 = mkdtempSync(join(tmpdir(), 'vqs-chain2-'))
    try {
      assert.equal(buildDecisionChainMatrix(dir2), null, '无 decisions.md → null')
    } finally { rmSync(dir2, { recursive: true, force: true }) }
  } finally {
    try { rmSync(dir, { recursive: true, force: true }) } catch {}
  }
})

const CLEAN_PROBES = {
  probe1: { matches: [] },
  probe3: { tasks: [{ task: 'task-01', hasTest: true, located: true }] },
  probe5: { missingBackend: [] },
  probe6: { deletions: [] },
}

function seedGreenRecord(dir, specBase, over = {}) {
  storeQualityScan({
    specBase, cwd: dir, changeName: 'c1',
    testResult: over.testResult || PASSED_TEST,
    lintResult: over.lintResult === undefined ? PASSED_LINT : over.lintResult,
  })
}

test('结论草稿评估：全绿 → PASS；各否决分支给 reasons（skip/lint败/探针/风险门）', () => {
  const dir = makeFixtureRepo()
  try {
    const specBase = join(dir, '.sillyspec')
    const changeDir = join(specBase, 'changes', 'c1')
    writeFileSync(join(changeDir, 'design.md'), '---\nauthor: t\ncreated_at: 2026-09-10 00:00:00\n---\n\n# 设计\n\n普通工具函数变更，无运行时组件。\n')
    // 无记录 → 不预填
    let r = evaluateConclusionDraft({ cwd: dir, specBase, changeName: 'c1', changeDir, probesResult: CLEAN_PROBES })
    assert.equal(r.draft, null)
    assert.ok(r.reasons.length > 0)
    // 全绿 → PASS
    seedGreenRecord(dir, specBase)
    r = evaluateConclusionDraft({ cwd: dir, specBase, changeName: 'c1', changeDir, probesResult: CLEAN_PROBES })
    assert.equal(r.draft, 'PASS', `全绿应预填（reasons: ${r.reasons.join(';')}）`)
    assert.equal(r.reasons.length, 0)
    // 测试 skip（策略跳过≠实测）→ 不预填
    seedGreenRecord(dir, specBase, { testResult: { status: 'skipped', command: null, exitCode: null, durationMs: null, outputTail: null, reason: 'test_strategy=skip', resultPath: null } })
    r = evaluateConclusionDraft({ cwd: dir, specBase, changeName: 'c1', changeDir, probesResult: CLEAN_PROBES })
    assert.equal(r.draft, null)
    assert.ok(r.reasons.some((x) => x.includes('跳过')), 'skip 有可解释 reason')
    // lint 失败 → 不预填
    seedGreenRecord(dir, specBase, { lintResult: { status: 'failed', command: 'y', exitCode: 1, durationMs: 2, outputTail: '', reason: 'lint 命令退出码 1' } })
    r = evaluateConclusionDraft({ cwd: dir, specBase, changeName: 'c1', changeDir, probesResult: CLEAN_PROBES })
    assert.equal(r.draft, null)
    assert.ok(r.reasons.some((x) => x.includes('lint')))
    // 探针 1 命中 → 不预填
    seedGreenRecord(dir, specBase)
    r = evaluateConclusionDraft({ cwd: dir, specBase, changeName: 'c1', changeDir, probesResult: { ...CLEAN_PROBES, probe1: { matches: [{ file: 'a.js', line: 1, content: 'TODO' }] } } })
    assert.equal(r.draft, null)
    assert.ok(r.reasons.some((x) => x.includes('探针 1')))
    // 风险门 integration-critical（frontmatter 显式声明）→ 不预填
    writeFileSync(join(changeDir, 'design.md'), '---\nauthor: t\ncreated_at: 2026-09-10 00:00:00\nrisk_level: integration-critical\n---\n\n# 设计\n')
    r = evaluateConclusionDraft({ cwd: dir, specBase, changeName: 'c1', changeDir, probesResult: CLEAN_PROBES })
    assert.equal(r.draft, null)
    assert.ok(r.reasons.some((x) => x.includes('integration-critical')), `风险 reason 在列（实得 ${r.reasons.join(';')}）`)
  } finally {
    try { rmSync(dir, { recursive: true, force: true }) } catch {}
  }
})

test('noAI 动作：实测全绿 → 落记录不抛；实测失败 → throw（进度不推进语义）且记录仍落盘', async () => {
  const dir = makeFixtureRepo()
  try {
    const specBase = join(dir, '.sillyspec')
    await executeVerifyQualityScan({ cwd: dir, specBase, changeName: 'c1', platformOpts: {} })
    const rec = loadReusableQualityScan({ specBase, cwd: dir, changeName: 'c1' })
    assert.ok(rec, '全绿后记录可回环（--done 复用面）')
    assert.equal(rec.testResult.status, 'passed')
    // 失败路：test 退出码 1 → throw
    writeFileSync(join(specBase, 'local.yaml'), 'commands:\n  test: node exit1.js\n  lint: node exit0.js\n')
    await assert.rejects(
      () => executeVerifyQualityScan({ cwd: dir, specBase, changeName: 'c1', platformOpts: {} }),
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
