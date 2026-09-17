/**
 * verify 结论枚举槽（刀③，ql-20260908-012-31e5）。
 *
 * 结论判定从「标题关键词 + 400 字符窗口」改为固定槽行 `结论枚举：`<枚举>`` 优先
 * （extractVerifyConclusionSlot），窗口扫描降级为无槽存量文件的 legacy 回退。
 * 顺带修掉旧骨架占位符 `<待填：PASS 或 FAIL>` 含 PASS 字样被窗口正则误读成
 * 已填 PASS 的自通过缺陷——新占位符 `<待填：三选一>` 不含枚举词，双解析下 fail-closed。
 *
 * 覆盖：
 *   槽解析：填 PASS / PASS WITH NOTES（防裸 PASS 截断）/ FAIL / 未填 fail-closed / 无槽 → null
 *   骨架：含槽行、占位符不含枚举词（旧自通过缺陷回归锁）、整骨架喂解析器得 ''
 *   劫持回归：槽 FAIL + 诱饵「## 结论：PASS」标题 → 槽赢
 *   legacy 兼容：无槽自由格式不再本测试直接测（test/stage-contract.test.mjs 集成 4/5 全走 legacy 路径回归）
 *   smoke-not-run（2026-09-17-api-coverage-smoke task-07 / FR-02）：判级 critical ×
 *   facts.smokeRan=not-ran × 槽 PASS → 第五条件拦截文案；槽 NOTES 放行
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { extractVerifyConclusionSlot, validatePassEligibility } from '../src/stage-contract.js'
import { generateVerifyResultSkeleton } from '../src/verify-probes.js'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const tmpRoots = []
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

test('槽解析：填 PASS', () => {
  assert.equal(extractVerifyConclusionSlot('## 结论 [层：人工判断]\n\n结论枚举：`PASS`——全绿'), 'PASS')
})

test('槽解析：PASS WITH NOTES 不被裸 PASS 截断（交替序）', () => {
  assert.equal(extractVerifyConclusionSlot('结论枚举：`PASS WITH NOTES`（遗留告警见风险章节）'), 'PASS WITH NOTES')
  assert.equal(extractVerifyConclusionSlot('结论枚举：PASS WITH NOTES'), 'PASS WITH NOTES')
})

test('槽解析：FAIL', () => {
  assert.equal(extractVerifyConclusionSlot('结论枚举：`FAIL`——探针5 有 contract gap'), 'FAIL')
})

test('槽解析：占位未填 → fail-closed 空串（正文其他枚举词不参与）', () => {
  const doc = [
    '## 结论 [层：人工判断]',
    '',
    '结论枚举：`<待填：三选一>`（把尖括号占位整体替换为 PASS / PASS WITH NOTES / FAIL 之一；一句话理由写在枚举后同行或下一行）',
  ].join('\n')
  assert.equal(extractVerifyConclusionSlot(doc), '')
})

test('槽解析：无槽行 → null（调用方走 legacy 窗口扫描）', () => {
  assert.equal(extractVerifyConclusionSlot('## 验收结论：✅ PASS\n\n一切正常'), null)
})

test('劫持回归：槽 FAIL + 诱饵「## 结论：PASS」标题在前 → 槽赢', () => {
  const doc = [
    '# 验证报告',
    '',
    '## 测试结果：PASS（ CLI 实测 42 个全过）',
    '',
    '## 结论 [层：人工判断]',
    '',
    '结论枚举：`FAIL`——探针5 存在 missing backend',
  ].join('\n')
  assert.equal(extractVerifyConclusionSlot(doc), 'FAIL')
})

test('骨架：含槽行且占位符不含枚举词（旧 `<待填：PASS 或 FAIL>` 自通过缺陷回归锁）', () => {
  const R = {
    probe1: { matches: [], globEntries: [], worktreeHits: 0, skippedFiles: [] },
    probe3: { tasks: [], note: 'tasks.md 无 checkbox 任务' },
    probe5: { summary: 'backend 0 端点 / frontend 0 调用' },
    probe6: { unavailable: true, deletions: [], note: 'git 不可用，删除对账跳过' },
  }
  const sk = generateVerifyResultSkeleton(R)

  assert.ok(sk.includes('## 结论 [层：人工判断]'), '骨架结论章节标题保留（claims 层标注不变）')
  assert.ok(/^结论枚举：`<待填：三选一>`/m.test(sk), '骨架含固定槽行（行首锚定）')
  assert.ok(!sk.includes('<待填：PASS'), '旧占位符形态已消灭（不再被窗口正则误读成 PASS）')
  // 整骨架喂槽解析器：槽存在未填 → ''（fail-closed，骨架不能直接过结论门）
  assert.equal(extractVerifyConclusionSlot(sk), '')
})

// ── smoke-not-run 触发文案（2026-09-17-api-coverage-smoke task-03/task-07 / FR-02）──
// 壳层接线：detectChangeRisk 判级 critical（design frontmatter risk_level）× facts.smokeRan=not-ran
// × 结论槽 PASS → 第五条件 [fact smoke-not-run] 拦截；槽改 NOTES 放行（封顶只管 PASS 的联动）。
test('FR-02 文案：结论槽 PASS + 判级 critical + smokeRan=not-ran → [fact smoke-not-run] 拦截；槽 NOTES 放行', () => {
  const root = mkdtempSync(join(tmpdir(), 'slot-smoke-'))
  tmpRoots.push(root)
  const changeDir = join(root, '.sillyspec', 'changes', 'slot-smoke')
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(changeDir, 'design.md'), [
    '---', 'author: t', 'risk_level: integration-critical', 'created_at: 2026-01-01 08:00:00', '---',
    '# 设计', '',
  ].join('\n'))
  writeFileSync(join(changeDir, 'verify-facts.json'), JSON.stringify({
    schemaVersion: 2,
    integrationRan: 'ran',
    handover: { count: 0, items: [] },
    dbScriptDeclarations: [],
    runtimeEndpointExcluded: false,
    matrixPartialRows: 0,
    smokeRan: 'not-ran',
  }, null, 2))
  writeFileSync(join(changeDir, 'verify-result.md'),
    '# 验证报告\n\n## 结论 [层：人工判断]\n\n结论枚举：`PASS`——全绿\n\n单测全过。\n')
  const capped = validatePassEligibility(root, 'slot-smoke', {})
  assert.ok(capped.ok === false
    && capped.errors.some((e) => e.includes('[fact smoke-not-run]') && e.includes('commands.smoke')),
    `封顶 error 含 [fact smoke-not-run] 枚举行与 commands.smoke 出路（实际 ${JSON.stringify(capped.errors.map((e) => e.slice(0, 60)))}）`)
  writeFileSync(join(changeDir, 'verify-result.md'),
    '# 验证报告\n\n## 结论 [层：人工判断]\n\n结论枚举：`PASS WITH NOTES`——冒烟移交承载\n')
  const notes = validatePassEligibility(root, 'slot-smoke', {})
  assert.ok(notes.ok === true, '结论槽 PASS WITH NOTES → 第五条件不生效（NOTES 由移交项承载路径接管）')
})

// ── 封顶文案联动（2026-09-17-pass-cap-semantics task-07 / FR-01 Then 文案）──
// 结论槽值 PASS 被四事实封顶拦截时，error 文案含触发行枚举与「改写 PASS WITH NOTES +
// 补『## 移交项（结构化）』」修复指引；结论槽 NOTES 放行（封顶只管 PASS 的联动口径）。
test('FR-01 Then 文案：结论槽 PASS 被封顶 → error 含触发行枚举 + 修复指引；槽 NOTES 放行', () => {
  const root = mkdtempSync(join(tmpdir(), 'slot-cap-'))
  tmpRoots.push(root)
  const changeDir = join(root, '.sillyspec', 'changes', 'slot-cap')
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(changeDir, 'verify-facts.json'), JSON.stringify({
    schemaVersion: 2,
    integrationRan: 'not-ran',
    handover: { count: 0, items: [] },
    dbScriptDeclarations: [],
    runtimeEndpointExcluded: false,
    matrixPartialRows: 0,
  }, null, 2))
  writeFileSync(join(changeDir, 'verify-result.md'),
    '# 验证报告\n\n## 结论 [层：人工判断]\n\n结论枚举：`PASS`——全绿\n\n单测全过。\n')
  const capped = validatePassEligibility(root, 'slot-cap', {})
  assert.ok(capped.ok === false
    && capped.errors.some(e => e.includes('[fact integration-not-run]') && e.includes('facts.integrationRan=not-ran')),
    `封顶 error 含触发行枚举（[fact integration-not-run] × facts.integrationRan=not-ran）（实际 ${JSON.stringify(capped.errors.map(e => e.slice(0, 60)))}）`)
  assert.ok(capped.errors.some(e => e.includes('改写结论为 PASS WITH NOTES') && e.includes('## 移交项（结构化）')),
    '封顶 error 含修复指引：改写 PASS WITH NOTES + 补「## 移交项（结构化）」')
  // 结论槽改 NOTES → 同 facts 不封顶（NOTES 由移交项承载路径接管——联动口径）
  writeFileSync(join(changeDir, 'verify-result.md'),
    '# 验证报告\n\n## 结论 [层：人工判断]\n\n结论枚举：`PASS WITH NOTES`——移交承载\n')
  const notes = validatePassEligibility(root, 'slot-cap', {})
  assert.ok(notes.ok === true, '结论槽 PASS WITH NOTES → 封顶不生效（放行联动）')
})
