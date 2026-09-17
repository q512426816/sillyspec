/**
 * 探针 7（验收×测试覆盖矩阵，2026-09-14-acceptance-test-matrix FR-01）单测。
 *
 * 覆盖：
 * 1. acceptance 解析：string/array 双形态归一（口径锚 plan-postcheck best-effort 段）、无
 *    frontmatter → null、非法 YAML → []、无 acceptance 字段 → []（防御行）
 * 2. 双源结构归属：allowed_paths 测试模式命中（test/ 前缀 + .test. 文件名 + NEW: 前缀剥离）
 *    ∪ marker 解析的 runId 下 review.json changedFiles test/ 前缀；marker 读不到 → execute-runs
 *    目录扫描兜底；review.json 读不到 → 该源空集不报错
 * 3. 关键词提示：标识符 + CJK 片段命中、上限 5 词、命中≠判定（hints 只含命中的条目）
 * 4. 无 tasks/ 目录 → applicable=false，渲染「不适用（无 TaskCard）」
 * 5. 骨架渲染：探针 7 段位于探针 3 后、四枚举判定槽 + 证据槽、防御行、无归属提示、管道符转义
 * 6. ensureAcceptanceMatrixSection 幂等补段：插探针 3 段后 / 文末追加两形态、二跑零改动、
 *    applicable=false no-op
 * 7. 禁 task-review 静态 import（三步环）源码级断言
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync, unlinkSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

import {
  runVerifyProbes, renderVerifyProbesReport, generateVerifyResultSkeleton,
  ensureAcceptanceMatrixSection, parseTaskAcceptance, backfillFactsFromMdAndTests,
} from '../src/verify-probes.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

let passed = 0
let failed = 0
const tmpRoots = []

function assert(cond, msg) {
  if (cond) { console.log(`  ✅ PASS: ${msg}`); passed++ }
  else { console.log(`  ❌ FAIL: ${msg}`); failed++ }
}

function makeFixtureA() {
  const proj = mkdtempSync(join(tmpdir(), 'amx7a-'))
  tmpRoots.push(proj)
  const specBase = join(proj, '.sillyspec')
  const changeDir = join(specBase, 'changes', 'c1')
  mkdirSync(join(changeDir, 'tasks'), { recursive: true })
  writeFileSync(join(changeDir, 'design.md'), [
    '## 文件变更清单', '',
    '| 操作 | 文件 | 说明 |',
    '|---|---|---|',
    '| 修改 | src/feature.js | 特性 |',
    '| 新增 | test/unit-foo.test.mjs | 测试 |',
    '',
  ].join('\n'))
  writeFileSync(join(changeDir, 'tasks.md'), '- [ ] task-01: 矩阵\n- [ ] task-02: 幂等\n- [ ] task-03: 防御\n- [ ] task-04: 无归属\n')

  // task-01：array 形态 acceptance + allowed_paths 双测试条目（test/ 前缀、.test. 文件名、NEW: 前缀）
  writeFileSync(join(changeDir, 'tasks', 'task-01.md'), [
    '---',
    'id: task-01',
    'allowed_paths:',
    '  - src/feature.js',
    '  - test/unit-foo.test.mjs',
    '  - NEW:test/acceptance-matrix-probe.test.mjs',
    'acceptance:',
    '  - probe7 输出符合接口定义——runVerifyProbes 返回 applicable 顶层布尔',
    '  - 归属并集含 parseTaskAcceptance extractAcceptanceTerms mdEscapeCell renderProbe7Lines isProbe7TestPath resolveExecuteRunIdInline 七个标识符',
    '---',
    '# task-01', '',
  ].join('\n'))
  // task-02：string 形态（folded >）acceptance + 非测试 allowed_paths → 归属只能来自 review 源
  writeFileSync(join(changeDir, 'tasks', 'task-02.md'), [
    '---',
    'id: task-02',
    'allowed_paths: [src/other.js]',
    'acceptance: >',
    '  ensureAcceptanceMatrixSection 幂等二跑零改动',
    '---',
    '# task-02', '',
  ].join('\n'))
  // task-03：有 frontmatter 无 acceptance → 防御行
  writeFileSync(join(changeDir, 'tasks', 'task-03.md'), [
    '---',
    'id: task-03',
    'allowed_paths: [docs/readme.md]',
    '---',
    '# task-03', '',
  ].join('\n'))
  // task-04：有 acceptance、双源皆空 → 无归属提示
  writeFileSync(join(changeDir, 'tasks', 'task-04.md'), [
    '---',
    'id: task-04',
    'allowed_paths: [docs/guide.md]',
    'acceptance:',
    '  - 文档类条目无测试承接（含管道符 | 的条目）',
    '---',
    '# task-04', '',
  ].join('\n'))
  // task-05：有归属测试但零关键词命中 → partial 预填形态（ql-20260915-004 probe7-prefill-evidence）
  writeFileSync(join(changeDir, 'tasks', 'task-05.md'), [
    '---',
    'id: task-05',
    'allowed_paths: [test/silent-attrib.test.mjs]',
    'acceptance:',
    '  - zqxv 零命中条目 wkj（归属在场但测试内容不含关键词）',
    '---',
    '# task-05', '',
  ].join('\n'))

  // 源文件与归属测试文件（关键词 grep 的真实内容面）
  mkdirSync(join(proj, 'src'), { recursive: true })
  writeFileSync(join(proj, 'src', 'feature.js'), 'export const f = 1\n')
  mkdirSync(join(proj, 'test'), { recursive: true })
  writeFileSync(join(proj, 'test', 'unit-foo.test.mjs'), [
    '// probe7 输出符合接口定义 返回 applicable 顶层布尔',
    'import { runVerifyProbes } from "../src/verify-probes.js"',
    '// 归属并集含 parseTaskAcceptance extractAcceptanceTerms mdEscapeCell renderProbe7Lines isProbe7TestPath resolveExecuteRunIdInline',
    'export {}', '',
  ].join('\n'))
  writeFileSync(join(proj, 'test', 'acceptance-matrix-probe.test.mjs'), 'export const placeholder = 1 // 无关键词命中面\n')
  writeFileSync(join(proj, 'test', 'review-attributed.test.mjs'), '// ensureAcceptanceMatrixSection 幂等二跑零改动\nexport {}\n')
  // task-05 归属面：内容刻意不含其 acceptance 关键词（zqxv/wkj/零命中条目——注释不含）→ 零命中
  writeFileSync(join(proj, 'test', 'silent-attrib.test.mjs'), '// quiet placeholder content\nexport {}\n')

  // execute run：marker + review.json（task-02 双源第二例；其余 task 无 review → 空集防御）
  const runtimeRoot = join(specBase, '.runtime')
  const runId = 'exec-2026-09-14-120000'
  mkdirSync(join(runtimeRoot, 'execute-runs', runId, 'tasks', 'task-02'), { recursive: true })
  writeFileSync(join(runtimeRoot, `current-execute-run-id-c1`), runId + '\n')
  writeFileSync(join(runtimeRoot, 'execute-runs', runId, 'tasks', 'task-02', 'review.json'), JSON.stringify({
    schemaVersion: 1,
    task: 'task-02',
    changedFiles: ['src/other.js', 'test/review-attributed.test.mjs', 'src/nope.js'],
  }, null, 2))

  return { cwd: proj, specBase, changeDir, runtimeRoot, runId }
}

function makeFixtureB() {
  const proj = mkdtempSync(join(tmpdir(), 'amx7b-'))
  tmpRoots.push(proj)
  const specBase = join(proj, '.sillyspec')
  const changeDir = join(specBase, 'changes', 'c2')
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(changeDir, 'design.md'), '## 文件变更清单\n\n| 操作 | 文件 | 说明 |\n|---|---|---|\n| 修改 | a.js | x |\n')
  return { cwd: proj, specBase, changeDir }
}

try {
  const fx = makeFixtureA()
  const r = runVerifyProbes({ cwd: fx.cwd, changeName: 'c1' })
  const t1 = r.probe7.tasks.find(t => t.task === 'task-01')
  const t2 = r.probe7.tasks.find(t => t.task === 'task-02')
  const t3 = r.probe7.tasks.find(t => t.task === 'task-03')
  const t4 = r.probe7.tasks.find(t => t.task === 'task-04')

  console.log('--- 1. acceptance 双形态解析 ---')
  assert(parseTaskAcceptance('no frontmatter here') === null, '无 frontmatter → null（卡跳过）')
  assert(parseTaskAcceptance('---\nid: x\nacceptance: 单条字符串\n---\n') .length === 1, 'string 形态 → 单条数组')
  assert(parseTaskAcceptance('---\nid: x\nacceptance:\n  - a\n  - b\n---\n').length === 2, 'array 形态 → 逐条数组')
  assert(parseTaskAcceptance('---\nid: x\n---\n').length === 0, '有 frontmatter 无 acceptance → []（防御）')
  assert(parseTaskAcceptance('---\nid: x\nacceptance: [unclosed\n---\n').length === 0, '非法 YAML → []（防御不抛）')
  assert(t1.acceptance.length === 2 && t2.acceptance.length === 1, `array/string 双形态归一（t1=${t1.acceptance.length} t2=${t2.acceptance.length}）`)
  assert(t2.acceptance[0].includes('ensureAcceptanceMatrixSection'), 'folded > 字符串条目内容完整')
  assert(t3.acceptance.length === 0, 'task-03 无 acceptance → 空数组（防御行）')
  assert(r.probe7.applicable === true, 'tasks/ 在场且有 frontmatter 卡 → applicable=true')

  console.log('--- 2. 双源结构归属 ---')
  assert(t1.testFiles.includes('test/unit-foo.test.mjs'), '源一：allowed_paths test/ 前缀命中')
  assert(t1.testFiles.includes('test/acceptance-matrix-probe.test.mjs'), '源一：NEW: 前缀剥离后 .test. 条目命中')
  assert(!t1.testFiles.some(f => f.startsWith('src/')), '非测试 allowed_paths 不进归属')
  assert(t2.testFiles.length === 1 && t2.testFiles[0] === 'test/review-attributed.test.mjs',
    `源二：marker 解析 runId → review.json changedFiles test/ 前缀命中（实际 ${JSON.stringify(t2.testFiles)}）`)
  assert(t4.testFiles.length === 0, '双源皆空 → 归属空集（不报错）')

  console.log('--- 3. 关键词提示（命中≠判定）---')
  assert(t1.hints[0] && t1.hints[0].terms.includes('runVerifyProbes') && t1.hints[0].terms.includes('输出符合接口定义'),
    `标识符 + CJK 片段双命中（实际 ${JSON.stringify(t1.hints[0] && t1.hints[0].terms)}）`)
  assert(t1.hints[0].files.includes('test/unit-foo.test.mjs'), '命中文件记录在 hints.files')
  assert(t1.hints[1] && t1.hints[1].terms.length === 5 && !t1.hints[1].terms.includes('resolveExecuteRunIdInline'),
    `提取上限 5 词（第 6/7 个标识符即便在测试文件在场也被裁，实际 ${JSON.stringify(t1.hints[1] && t1.hints[1].terms)}）`)
  assert(!t3.hints[0] && !('1' in t2.hints), '无 acceptance / 无命中条目不产生 hints 键')
  const rt = JSON.parse(JSON.stringify(r.probe7))
  assert(rt.tasks[0].hints['0'].terms.includes('runVerifyProbes'), 'hints 普通对象可 JSON 序列化（键为条目下标）')
  assert(t2.hints[0] && t2.hints[0].files[0] === 'test/review-attributed.test.mjs', 'review 归属文件同样进关键词 grep 面')

  console.log('--- 4. runId 解析兜底 ---')
  unlinkSync(join(fx.runtimeRoot, 'current-execute-run-id-c1'))
  const rNoMarker = runVerifyProbes({ cwd: fx.cwd, changeName: 'c1' })
  const t2NoMarker = rNoMarker.probe7.tasks.find(t => t.task === 'task-02')
  assert(t2NoMarker.testFiles.length === 1 && t2NoMarker.testFiles[0] === 'test/review-attributed.test.mjs',
    'marker 读不到 → execute-runs 目录扫描 exec-* 兜底命中')
  rmSync(join(fx.runtimeRoot, 'execute-runs'), { recursive: true, force: true })
  const rNoRun = runVerifyProbes({ cwd: fx.cwd, changeName: 'c1' })
  const t2NoRun = rNoRun.probe7.tasks.find(t => t.task === 'task-02')
  assert(rNoRun.probe7.applicable === true && t2NoRun.testFiles.length === 0,
    'review.json 整体读不到 → 该源空集不报错（归属退空，applicable 不受影响）')

  console.log('--- 5. 骨架渲染 ---')
  const report = renderVerifyProbesReport(r)
  const i3 = report.indexOf('#### 探针 3：')
  const i7 = report.indexOf('#### 探针 7：验收×测试覆盖矩阵')
  const i4 = report.indexOf('#### 探针 4：')
  assert(i3 !== -1 && i7 !== -1 && i4 !== -1 && i3 < i7 && i7 < i4, '探针 7 段位于探针 3 后、探针 4 前')
  // ql-20260915-004 probe7-prefill-evidence：判定/证据两列机械预填——占位槽淘汰，四形态断言
  assert((report.match(/<待填：四选一>/g) || []).length === 0, '判定槽占位淘汰（全预填）')
  assert((report.match(/<TODO>/g) || []).length === 0, '证据槽占位淘汰（全预填）')
  assert((report.match(/\| covered \|/g) || []).length === 3, `命中≥1 → covered ×3（t1×2 + t2）（实际 ${(report.match(/\| covered \|/g) || []).length}）`)
  assert((report.match(/\| partial \|/g) || []).length === 1, '有归属零命中 → partial ×1（task-05）')
  assert((report.match(/\| non-testable \|/g) || []).length === 1, '无归属 + 文档类词 → non-testable ×1（task-04）')
  assert((report.match(/\| uncovered \|/g) || []).length === 0, '本 fixture 无「无归属非文档类」条目 → uncovered ×0')
  assert(report.includes('`test/unit-foo.test.mjs:1`（probe7）'), 'covered 证据含首命中 file:line + 关键词锚点')
  assert(report.includes('（无机械命中——人工核验 `test/silent-attrib.test.mjs`）'), 'partial 证据 = 人工核验提示 + 反引号归属文件')
  assert(report.includes('（无归属测试）'), '无归属证据 = （无归属测试）')
  assert(report.includes('判定列为 CLI 机械预填，agent 逐格复核改写'), '段头预填注记在场（枚举纯值的复核责任声明）')
  assert(report.includes('covered / partial / uncovered / non-testable'), '四枚举图例在场')
  assert(report.includes('命中≠判定'), '提示列头部标注命中≠判定')
  assert(report.includes('（卡无 acceptance——防御，plan-postcheck 已拦）'), 'task-03 防御行渲染且无待填槽')
  assert(!report.split('\n').find(l => l.includes('卡无 acceptance'))?.includes('待填'), '防御行本身不含待填槽')
  assert(report.includes('无归属测试——判定大概率 uncovered'), '归属空渲染无归属提示')
  const pipeRow = report.split('\n').find(l => l.includes('管道符') && l.startsWith('|'))
  assert(pipeRow && (pipeRow.match(/(?<!\\)\|/g) || []).length === 6 && pipeRow.includes('\\|'),
    'acceptance 含管道符 → 转义为 \\| 且行仍为五列六管')
  assert(report.includes('**task-01**') && report.includes('**task-05**'), '每 task 一表（粗体 task 锚）')
  const sk = generateVerifyResultSkeleton(r)
  assert(sk.indexOf('#### 探针 3：') < sk.indexOf('#### 探针 7：验收×测试覆盖矩阵')
    && sk.indexOf('#### 探针 7：验收×测试覆盖矩阵') < sk.indexOf('#### 探针 4：'), '骨架内探针 7 序同报告')
  // 门禁 round-trip：预填渲染直过 extractAcceptanceMatrixSlots（枚举纯值 + 证据锚点口径双合规）
  const { extractAcceptanceMatrixSlots } = await import('../src/stage-contract.js')
  const slots = extractAcceptanceMatrixSlots(sk)
  assert(slots.present && slots.unfilled === 0, `预填判定全为合法枚举（unfilled=0，实际 ${slots.unfilled}）`)
  assert(slots.missingEvidence === 0, `预填证据全过锚点口径（missingEvidence=0，实际 ${slots.missingEvidence}）`)
  assert(slots.rows.length === 5, `五行数据行（实际 ${slots.rows.length}）`)

  console.log('--- 6. 无 tasks 目录不适用 ---')
  const fxB = makeFixtureB()
  const rB = runVerifyProbes({ cwd: fxB.cwd, changeName: 'c2' })
  assert(rB.probe7.applicable === false && rB.probe7.tasks.length === 0, '无 tasks/ → applicable=false')
  assert(renderVerifyProbesReport(rB).includes('- 不适用（无 TaskCard）'), '不适用单行渲染')
  assert(renderVerifyProbesReport({
    probe1: { matches: [], globEntries: [], skippedFiles: [], worktreeHits: 0 },
    probe3: { tasks: [] },
    probe5: {},
    probe6: { deletions: [], unavailable: false, note: 'x' },
  }).includes('- 不适用（无 TaskCard）'), '存量合成 result（无 probe7 键）零回归 → 渲染不适用')

  console.log('--- 7. ensureAcceptanceMatrixSection 幂等补段 ---')
  {
    const mdA = join(fx.cwd, 'verify-result-a.md')
    writeFileSync(mdA, [
      '## 结论', '',
      '## 探针结果（CLI 机械预填，--init 补注入） [层：可复跑探针——gate 抽查防篡改]',
      '#### 探针 3：验收标准测试覆盖', '- ✅ task-01: 模块目录（src）找到 1 个测试文件', '',
      '#### 探针 4：决策追踪覆盖', '<!--TODO-->', '',
    ].join('\n'))
    const a1 = ensureAcceptanceMatrixSection(mdA, r.probe7)
    const after1 = readFileSync(mdA, 'utf8')
    assert(a1.added === true, '缺段 + applicable → 补段')
    const j3 = after1.indexOf('#### 探针 3：')
    const j7 = after1.indexOf('#### 探针 7：验收×测试覆盖矩阵')
    const j4 = after1.indexOf('#### 探针 4：')
    assert(j3 !== -1 && j7 !== -1 && j4 !== -1 && j3 < j7 && j7 < j4, '补段插入探针 3 小节后（骨架序 3→7→4）')
    assert(after1.includes('## 结论') && after1.includes('<!--TODO-->'), '不触碰既有正文')
    const a2 = ensureAcceptanceMatrixSection(mdA, r.probe7)
    assert(a2.added === false && readFileSync(mdA, 'utf8') === after1, '幂等：二跑零改动（字节级）')

    const mdB = join(fx.cwd, 'verify-result-b.md')
    writeFileSync(mdB, '# 旧格式存量报告\n\n正文既有内容\n')
    const b1 = ensureAcceptanceMatrixSection(mdB, r.probe7)
    const afterB = readFileSync(mdB, 'utf8')
    assert(b1.added === true && afterB.startsWith('# 旧格式存量报告\n\n正文既有内容\n'), '无探针 3 段 → 文末追加，正文前缀不动')
    assert(afterB.indexOf('#### 探针 7：验收×测试覆盖矩阵') > afterB.indexOf('正文既有内容'), '追加段在文末')

    const mdC = join(fx.cwd, 'verify-result-c.md')
    writeFileSync(mdC, '# 手写报告\n')
    const c1r = ensureAcceptanceMatrixSection(mdC, rB.probe7)
    assert(c1r.added === false && readFileSync(mdC, 'utf8') === '# 手写报告\n', 'applicable=false → no-op 不落盘')
  }

  console.log('--- 8. 禁 task-review 静态 import（三步环）---')
  {
    const src = readFileSync(join(__dirname, '..', 'src', 'verify-probes.js'), 'utf8')
    assert(!/^\s*import\b[^\n]*task-review/m.test(src) && !/import\s*\(\s*['"][^'"]*task-review/.test(src),
      'verify-probes.js 全文件零 task-review 静态/动态 import（注释里的「禁 import」说明不算）')
    assert(!existsSync(join(__dirname, '..', 'src', 'verify-probes.js.bak')), '无备份残渣')
  }

  console.log('--- 7. 跨卡归属（probe7-provider-tests-in-consumer-card，2026-09-16 E 变更实证）---')
  {
    // fixture：task-01 provider（allowed_paths 仅 src 文件、acceptance 有关键词）；task-03 测试卡
    // depends_on: task-01（allowed_paths 为测试文件，内容含 provider acceptance 关键词）
    const proj = mkdtempSync(join(tmpdir(), 'amx7x-'))
    tmpRoots.push(proj)
    const specBase = join(proj, '.sillyspec')
    const changeDir = join(specBase, 'changes', 'cx')
    const tasksDir = join(changeDir, 'tasks')
    mkdirSync(tasksDir, { recursive: true })
    writeFileSync(join(changeDir, 'design.md'), '## 文件变更清单\n\n| 操作 | 文件 | 说明 |\n|---|---|---|\n| 修改 | a.js | x |\n')
    writeFileSync(join(proj, 'a.js'), 'export const f = 1\n')
    mkdirSync(join(proj, 'test'), { recursive: true })
    writeFileSync(join(proj, 'test', 'consumer-pivot.test.mjs'), '// crosscard kwvane providerPivot\nexport {}\n')
    writeFileSync(join(tasksDir, 'task-01.md'), [
      '---', 'id: task-01', 'allowed_paths: [src-feature.js]',
      'acceptance:', '  - providerPivot 导出函数由 kwvane 场景覆盖', '---', '# t1', '',
    ].join('\n'))
    writeFileSync(join(tasksDir, 'task-03.md'), [
      '---', 'id: task-03', 'depends_on: task-01', 'allowed_paths: [test/consumer-pivot.test.mjs]',
      'acceptance:', '  - 五用例', '---', '# t3', '',
    ].join('\n'))
    const r = runVerifyProbes({ cwd: proj, changeName: 'cx' })
    const t1 = r.probe7.tasks.find(t => t.task === 'task-01')
    const t3 = r.probe7.tasks.find(t => t.task === 'task-03')
    assert(t1 && t1.testFiles.includes('test/consumer-pivot.test.mjs'),
      `task-01 归属含下游 task-03 的测试文件（实际：${JSON.stringify(t1 && t1.testFiles)}）`)
    assert(t3 && t3.testFiles.includes('test/consumer-pivot.test.mjs'), 'task-03 自身归属不变')
    // 关键词命中走下游测试内容 → task-01 首条 acceptance 预填 covered（anchor 在下游测试内）
    const md = renderVerifyProbesReport(r)
    const seg = md.split('**task-01**')[1] ? md.split('**task-01**')[1].split('**task-03**')[0] : ''
    assert(seg.includes('covered'), `task-01 acceptance 预填 covered（不再假 uncovered；seg=${seg.slice(0, 120)}）`)
    // 无依赖关系的卡不并入（task-03 不反向承接无关卡——用 fixture 内只两卡，反向断言：t3 归属不含 src-feature.js 类）
    assert(!(t3.testFiles || []).some(f => f.includes('src-feature')), '依赖方向单向：下游不反向并入')
  }
  console.log('--- 9. FR-04 producer 增量：matrixPartialRows × handover 双输入同 md 产出（2026-09-17-pass-cap-semantics task-07）---')
  {
    // 门侧 error/放行分支（partial×handover 联动）已在 test/acceptance-matrix-gate.test.mjs 2.9~2.12
    // 覆盖（task-03）；此处钉 producer 半边：verify-probes backfill 对同一份 verify-result.md 产出
    // facts.matrixPartialRows（partial+uncovered 行计数）与 facts.handover.items[].severity（四列
    // 解析）——封顶条件④与联动门的两个消费输入同源落盘。
    const proj = mkdtempSync(join(tmpdir(), 'amx7p4-'))
    tmpRoots.push(proj)
    const specBase = join(proj, '.sillyspec')
    const changeDir = join(specBase, 'changes', 'cp4')
    mkdirSync(join(changeDir, 'tasks'), { recursive: true })
    writeFileSync(join(changeDir, 'design.md'), '## 文件变更清单\n\n| 操作 | 文件 | 说明 |\n|---|---|---|\n| 修改 | a.js | x |\n')
    const factsPath = join(changeDir, 'verify-facts.json')
    writeFileSync(factsPath, JSON.stringify({ schemaVersion: 2, probes: {} }, null, 2))
    const md = [
      '# 验证报告', '',
      '#### 探针 7：验收×测试覆盖矩阵', '',
      '**task-01**',
      '| acceptance 条目 | 归属测试文件 | 关键词命中 | 判定 | 证据 |',
      '|---|---|---|---|---|',
      '| 半承接 | `test/a.test.mjs` | — | partial | 断言见 src/a.js:42 |',
      '| 未承接 | 无归属测试 | — | uncovered | — |',
      '| 全承接 | `test/a.test.mjs` | — | covered | `test/a.test.mjs` |',
      '',
      '## 移交项（结构化） [层：人工判断——CLI 清单核验]', '',
      '| 类型 | 条目 | 复跑/验收条件 | severity |',
      '|---|---|---|---|',
      '| manual-acceptance | 集成用例人工核验 | 按 8.1 逐条 | advisory |',
      '',
      '## 结论', '', '结论枚举：`PASS WITH NOTES`', '',
    ].join('\n')
    const capWarn = console.warn
    const warns = []
    console.warn = (...a) => { warns.push(a.join(' ')) }
    try {
      backfillFactsFromMdAndTests(factsPath, { verifyMd: md, conclusion: 'PASS WITH NOTES' })
      const onDisk = JSON.parse(readFileSync(factsPath, 'utf8'))
      assert(onDisk.matrixPartialRows === 2,
        `facts.matrixPartialRows = partial∪uncovered 行数（1 partial + 1 uncovered = 2；covered 不计；实际 ${onDisk.matrixPartialRows}）`)
      assert(onDisk.handover && onDisk.handover.items[0].severity === 'advisory' && onDisk.handover.items[0].type === 'manual-acceptance',
        '同 md 的 handover 四列行 → facts.handover.items[].severity 落盘（封顶④「有去向」消费输入同源产出）')
      writeFileSync(factsPath, JSON.stringify({ schemaVersion: 2, probes: {} }, null, 2))
      backfillFactsFromMdAndTests(factsPath, { verifyMd: '# 验证报告\n\n无矩阵段\n', conclusion: 'PASS WITH NOTES' })
      const zero = JSON.parse(readFileSync(factsPath, 'utf8'))
      assert(zero.matrixPartialRows === 0, '无矩阵段 md → facts.matrixPartialRows=0（联动/封顶分支不误触发）')
    } finally { console.warn = capWarn }
  }
} finally {
  for (const t of tmpRoots) { try { rmSync(t, { recursive: true, force: true }) } catch {} }
}

console.log(`\n合计: ${passed} 通过, ${failed} 失败`)
process.exit(failed > 0 ? 1 : 0)
