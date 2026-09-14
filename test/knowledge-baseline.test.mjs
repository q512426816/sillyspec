/**
 * knowledge-baseline 棘轮 + 归类提议收尾渲染测试（2026-09-14-knowledge-loop-close task-03）。
 *
 * 覆盖 FR-03 Then（棘轮三态）+ FR-01 Then（归类提议渲染/零渲染）：
 *  - 单元（直接 import complete-handlers.js 导出的三个纯函数，先例：concurrent-preflight-hooks
 *    Part B 的源文件 + run-sanitize-project-name 的直接 import 惯例）：
 *      countUncategorizedEntries 计数正则口径（##/### 计、# 与 #### 不计、行中锚不计、
 *      空标题不计、CRLF 容忍、uncategorized.md 缺失算 0）
 *      checkKnowledgeBaselineRatchet 三态（缺失=disabled 不写盘 / 超线=over 基线不动 /
 *      降线=tightened 自动收紧写回 / 平线=steady / 非整数基线=disabled）
 *      extractQuickCauseField 四字段根因提取（多行块/单行压缩/缺字段空串）
 *  - E2E（_cli-step-harness 子进程真 CLI，fixture 构造同 run-complete-step-quick.test.mjs）：
 *      E1 超线软警告不阻断（exit 0）+ 基线文件不被改写
 *      E2 降线自动收紧（真 CLI 收尾写回当前值）+ 归类提议渲染（ql-ID + file#anchor + classify 命令）
 *      E3 根因「无，纯新增」形态零提议输出 + 基线缺失不警告（零输出变化）
 */
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { makeRepo, initChange, seedStage, runStage, cleanup, report } from './_cli-step-harness.mjs'
import { countUncategorizedEntries, checkKnowledgeBaselineRatchet, extractQuickCauseField } from '../src/run/complete-handlers.js'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }

const tmpUnitRoots = []
function unitDir(prefix) {
  const d = mkdtempSync(join(tmpdir(), prefix)); tmpUnitRoots.push(d); return d
}
function writeKnowledgeFixture(specBase, { uncategorized, baseline } = {}) {
  if (uncategorized !== undefined) {
    mkdirSync(join(specBase, 'knowledge'), { recursive: true })
    writeFileSync(join(specBase, 'knowledge', 'uncategorized.md'), uncategorized)
  }
  if (baseline !== undefined) writeFileSync(join(specBase, 'knowledge-baseline'), baseline)
}

console.log('=== knowledge-baseline 棘轮 + 归类提议（task-03）===\n')

// ── 单元 1：计数正则口径（与 knowledge validate 同款 /^#{2,3}\s+\S/gm，X-010）──
console.log('--- 单元：countUncategorizedEntries 计数口径 ---')
{
  const specBase = unitDir('kb-count-')
  writeKnowledgeFixture(specBase, {
    uncategorized: [
      '# 未分类知识（Uncategorized）', // # 一级不计
      '',
      '## ql-20260914-001-aaaa | 标题一', // ## 计
      '正文一',
      '',
      '### 历史条目二', // ### 计
      '正文二',
      '',
      '# 一级标题不计',
      '#### 四级标题不计',
      '正文里的 ## 行中锚不计',
      '##  ', // 空标题不计（## 后仅空白无 \S）
      '',
    ].join('\n'),
  })
  const n = countUncategorizedEntries(join(specBase, 'knowledge'))
  assert(n === 2, `## 与 ### 都计、# / #### / 行中 / 空标题不计（实际 ${n}）`)

  // CRLF 容忍（Windows 下手工编辑的 uncategorized.md）
  const specBaseCrlf = unitDir('kb-crlf-')
  writeKnowledgeFixture(specBaseCrlf, {
    uncategorized: '## ql-x | a\r\n正文\r\n### 历史条目 b\r\n',
  })
  const nCrlf = countUncategorizedEntries(join(specBaseCrlf, 'knowledge'))
  assert(nCrlf === 2, `CRLF 行尾同样计数（实际 ${nCrlf}）`)

  // uncategorized.md 缺失算 0（未启用知识库的仓不警告）
  const specBaseEmpty = unitDir('kb-miss-')
  const nMiss = countUncategorizedEntries(join(specBaseEmpty, 'knowledge'))
  assert(nMiss === 0, `uncategorized.md 缺失算 0（实际 ${nMiss}）`)
}

// ── 单元 2：棘轮三态（FR-03 Then）──
console.log('\n--- 单元：checkKnowledgeBaselineRatchet 三态 ---')
{
  // 基线缺失 = 未启用：disabled，且不创建基线文件（存量仓零迁移）
  const d1 = unitDir('kb-off-')
  const r1 = checkKnowledgeBaselineRatchet(d1)
  assert(r1.status === 'disabled', `基线缺失 → disabled（实际 ${r1.status}）`)
  assert(!existsSync(join(d1, 'knowledge-baseline')), '基线缺失时不创建基线文件（零迁移）')

  // 超线：over，软警告态不改写基线（棘轮只降不升）
  const d2 = unitDir('kb-over-')
  writeKnowledgeFixture(d2, { uncategorized: '## a | x\n## b | y\n## c | z\n', baseline: '2\n' })
  const r2 = checkKnowledgeBaselineRatchet(d2)
  assert(r2.status === 'over' && r2.count === 3 && r2.baseline === 2, `count 3 > 基线 2 → over（实际 ${JSON.stringify(r2)}）`)
  assert(readFileSync(join(d2, 'knowledge-baseline'), 'utf8').trim() === '2', '超线不改写基线文件')

  // 降线：自动收紧写回当前值（docs-check-baseline 同款 `${value}\n` 形态）
  const d3 = unitDir('kb-tight-')
  writeKnowledgeFixture(d3, { uncategorized: '## a | x\n', baseline: '5\n' })
  const r3 = checkKnowledgeBaselineRatchet(d3)
  assert(r3.status === 'tightened' && r3.count === 1 && r3.baseline === 5, `count 1 < 基线 5 → tightened（实际 ${JSON.stringify(r3)}）`)
  assert(readFileSync(join(d3, 'knowledge-baseline'), 'utf8') === '1\n', '基线文件已自动收紧写回当前值（"1\\n"）')

  // 平线：steady，不动文件
  const d4 = unitDir('kb-steady-')
  writeKnowledgeFixture(d4, { uncategorized: '## a | x\n## b | y\n', baseline: '2' })
  const r4 = checkKnowledgeBaselineRatchet(d4)
  assert(r4.status === 'steady', `count == 基线 → steady（实际 ${r4.status}）`)
  assert(readFileSync(join(d4, 'knowledge-baseline'), 'utf8').trim() === '2', '平线不改写基线文件')

  // 基线内容非单整数（脏数据）→ disabled（未启用），不抛错
  const d5 = unitDir('kb-dirty-')
  writeKnowledgeFixture(d5, { uncategorized: '## a | x\n', baseline: 'abc' })
  const r5 = checkKnowledgeBaselineRatchet(d5)
  assert(r5.status === 'disabled', `基线非单整数 → disabled（实际 ${r5.status}）`)

  // 基线存在但 uncategorized 缺失：count 0，降线收紧到 0（归零是终态收紧）
  const d6 = unitDir('kb-zero-')
  writeKnowledgeFixture(d6, { baseline: '3\n' })
  const r6 = checkKnowledgeBaselineRatchet(d6)
  assert(r6.status === 'tightened' && r6.count === 0, `uncategorized 缺失 count=0 < 基线 3 → tightened 0（实际 ${JSON.stringify(r6)}）`)
}

// ── 单元 3：根因字段提取（归类提议查询串口径）──
console.log('\n--- 单元：extractQuickCauseField 四字段提取 ---')
{
  const multi = '需求：修标题\n根因：基线棘轮计数口径\n与 validate 打架\n方案：同款正则\n结果：测试通过'
  assert(extractQuickCauseField(multi) === '基线棘轮计数口径 与 validate 打架', `多行字段块提取根因（实际「${extractQuickCauseField(multi)}」）`)
  const single = '需求：x 根因：单行压缩形态 方案：y 结果：z'
  assert(extractQuickCauseField(single) === '单行压缩形态', `单行压缩形态提取根因（实际「${extractQuickCauseField(single)}」）`)
  assert(extractQuickCauseField('方案：只有三字段') === '', '缺根因字段返回空串')
  assert(extractQuickCauseField('') === '', '空 outputText 返回空串')
  assert(extractQuickCauseField('根因：无，纯新增/纯样式\n方案：x\n结果：y') === '无，纯新增/纯样式', '「无，纯新增/纯样式」原样提取（拦截在调用侧守卫）')
}

// ── E2E：真 CLI 子进程（exit code 即真实阻断语义）──
console.log('\n--- E2E：quick --done 收尾渲染（真 CLI 子进程）---')

const QL_ID = 'ql-kbtest-001-aaaa'
function quickStepsThirdPending() {
  return [
    { name: '理解任务', status: 'completed' },
    { name: '实现并验证', status: 'completed' },
    { name: '暂存和更新记录', status: 'pending' },
  ]
}
function writeGuard(specBase, sid, overrides = {}) {
  const guardFile = join(specBase, '.runtime', 'quick-sessions', sid, 'guard.json')
  mkdirSync(join(specBase, '.runtime', 'quick-sessions', sid), { recursive: true })
  writeFileSync(guardFile, JSON.stringify({
    quicklogId: QL_ID, baselineFiles: [], allowedFiles: [], allowNew: false, forceBaseline: false,
    linkedChanges: [], taskDescription: '基线测试任务', ...overrides,
  }))
}
function writeQuicklogEntry(specBase) {
  const dir = join(specBase, 'quicklog')
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'QUICKLOG-test.md'),
    `# QUICKLOG\n\n## ${QL_ID} | 2026/07/26 02:00:00 | 基线测试条目\n状态：进行中\n关联变更：（无）\n文件：（见实际改动）\n`)
}
async function seedQuickToThird(cwd, specBase, sid) {
  const pm = await initChange(cwd, specBase, sid)
  return seedStage(pm, cwd, sid, 'quick', quickStepsThirdPending())
}

// E1：超线软警告不阻断（exit 0）+ 基线不被改写
console.log('\n--- E1 超线：软警告 + 不阻断 ---')
{
  const { cwd, specBase } = makeRepo('kb-e2e-over-')
  const sid = 'quick-deadbee1'
  await seedQuickToThird(cwd, specBase, sid)
  writeGuard(specBase, sid)
  writeQuicklogEntry(specBase)
  writeKnowledgeFixture(specBase, { uncategorized: '## a | x\n## b | y\n## c | z\n', baseline: '2\n' })

  const r = runStage('quick', sid, cwd, { done: true, output: '需求：E1\n根因：无关联知识\n方案：跑收尾\n结果：exit 0' })

  assert(r.status === 0, `超线软警告不阻断 exit 0（实际 ${r.status}，输出尾：${r.combined.slice(-150)}）`)
  assert(r.combined.includes('超 knowledge-baseline 基线 2') && r.combined.includes('待归类 3 条'), 'stdout 含超线软警告（条数 + 基线值）')
  assert(r.combined.includes('sillyspec knowledge classify'), '软警告带 classify 建议命令')
  assert(readFileSync(join(specBase, 'knowledge-baseline'), 'utf8').trim() === '2', '超线收尾不改写基线（只警告）')
}

// E2：降线自动收紧 + 归类提议渲染（FR-01 Then：ql-ID + file#anchor + classify 命令）
console.log('\n--- E2 降线收紧 + 归类提议命中 ---')
{
  const { cwd, specBase } = makeRepo('kb-e2e-tight-')
  const sid = 'quick-deadbee2'
  await seedQuickToThird(cwd, specBase, sid)
  writeGuard(specBase, sid)
  writeQuicklogEntry(specBase)
  writeKnowledgeFixture(specBase, { uncategorized: '## a | x\n## b | y\n', baseline: '5\n' })
  // INDEX 路由行（parseKnowledgeIndex 契约格式）：关键词命中根因文本 → 提议渲染
  mkdirSync(join(specBase, 'knowledge'), { recursive: true })
  writeFileSync(join(specBase, 'knowledge', 'INDEX.md'),
    '# Knowledge Index\n\n## Known Issues\n\n- 基线棘轮|双数字打架 → [基线棘轮计数口径](known-issues.md#基线棘轮计数口径)\n')

  const r = runStage('quick', sid, cwd, { done: true, output: '需求：修基线\n根因：基线棘轮计数与 validate 口径不一致双数字打架\n方案：同款正则统一\n结果：测试通过' })

  assert(r.status === 0, `E2 收尾 exit 0（实际 ${r.status}，输出尾：${r.combined.slice(-150)}）`)
  assert(readFileSync(join(specBase, 'knowledge-baseline'), 'utf8') === '2\n', '降线自动收紧：基线写回当前条数（"2\\n"）')
  assert(r.combined.includes('knowledge-baseline 已自动收紧：5 → 2'), 'stdout 含收紧留痕（5 → 2）')
  assert(r.combined.includes('📚 待归类提议'), 'stdout 含归类提议标记（📚）')
  assert(r.combined.includes(QL_ID) && r.combined.includes('--ql ' + QL_ID), `提议含 ql-ID 与 classify 命令（${QL_ID}）`)
  assert(r.combined.includes('known-issues.md#基线棘轮计数口径'), '提议含目标 file#anchor')
  assert(r.combined.includes('sillyspec knowledge classify --ql ' + QL_ID + ' --file known-issues.md'), '提议含完整确认归类命令')
}

// E3：根因「无，纯新增」零提议 + 基线缺失不警告（零输出变化）
console.log('\n--- E3 无形态零提议 + 基线缺失零警告 ---')
{
  const { cwd, specBase } = makeRepo('kb-e2e-pure-')
  const sid = 'quick-deadbee3'
  await seedQuickToThird(cwd, specBase, sid)
  writeGuard(specBase, sid)
  writeQuicklogEntry(specBase)
  // INDEX 关键词「注销」只出现在需求/方案/结果——根因拦截后查询串不含它，命中即说明查询串口径错误
  mkdirSync(join(specBase, 'knowledge'), { recursive: true })
  writeFileSync(join(specBase, 'knowledge', 'INDEX.md'),
    '# Knowledge Index\n\n## Misc\n\n- 注销|销账 → [注销语义](misc.md#注销语义)\n')
  writeKnowledgeFixture(specBase, { uncategorized: '## a | x\n' }) // 无 baseline 文件

  const r = runStage('quick', sid, cwd, { done: true, output: '需求：注销测试\n根因：无，纯新增\n方案：加注销测试文件\n结果：测试通过' })

  assert(r.status === 0, `E3 收尾 exit 0（实际 ${r.status}，输出尾：${r.combined.slice(-150)}）`)
  assert(!r.combined.includes('待归类提议'), '根因「无，纯新增」形态零提议输出（查询串不含需求/方案字段）')
  assert(!r.combined.includes('超 knowledge-baseline'), '基线缺失不警告（未启用零输出）')
  assert(!existsSync(join(specBase, 'knowledge-baseline')), '基线缺失时收尾不创建基线文件')
}

for (const d of tmpUnitRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} }
cleanup()
report(count.passed, count.failed, count.failures)
