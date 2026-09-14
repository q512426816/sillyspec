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
  ensureAcceptanceMatrixSection, parseTaskAcceptance,
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
  assert((report.match(/<待填：四选一>/g) || []).length === 4, `判定槽四枚举待填数=acceptance 条目数（实际 ${(report.match(/<待填：四选一>/g) || []).length}）`)
  assert((report.match(/<TODO>/g) || []).length === 4, '证据槽与判定槽同数')
  assert(report.includes('covered / partial / uncovered / non-testable'), '四枚举图例在场')
  assert(report.includes('命中≠判定'), '提示列头部标注命中≠判定')
  assert(report.includes('（卡无 acceptance——防御，plan-postcheck 已拦）'), 'task-03 防御行渲染且无待填槽')
  assert(!report.split('\n').find(l => l.includes('卡无 acceptance'))?.includes('待填'), '防御行本身不含待填槽')
  assert(report.includes('无归属测试——判定大概率 uncovered'), '归属空渲染无归属提示')
  const pipeRow = report.split('\n').find(l => l.includes('管道符') && l.startsWith('|'))
  assert(pipeRow && (pipeRow.match(/(?<!\\)\|/g) || []).length === 6 && pipeRow.includes('\\|'),
    'acceptance 含管道符 → 转义为 \\| 且行仍为五列六管')
  assert(report.includes('**task-01**') && report.includes('**task-04**'), '每 task 一表（粗体 task 锚）')
  const sk = generateVerifyResultSkeleton(r)
  assert(sk.indexOf('#### 探针 3：') < sk.indexOf('#### 探针 7：验收×测试覆盖矩阵')
    && sk.indexOf('#### 探针 7：验收×测试覆盖矩阵') < sk.indexOf('#### 探针 4：'), '骨架内探针 7 序同报告')

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
} finally {
  for (const t of tmpRoots) { try { rmSync(t, { recursive: true, force: true }) } catch {} }
}

console.log(`\n合计: ${passed} 通过, ${failed} 失败`)
process.exit(failed > 0 ? 1 : 0)
