/**
 * verify 移交项结构化（坑 handover-only-in-prose，2026-09-15/16 EHS 生产实证：verify 结论
 * PASS WITH NOTES 的三项移交（环境阻断集成测试/三端联调人工验收/待执行 SQL）只活在结论槽
 * 正文叙述——后续独立复核发现被环境阻断 deferred 的集成测试里正藏着 5 个 P1；「移交项
 * 没有结构化清单 = 没人兜」。骨架新增「移交项（结构化）」章节 + parseHandoverRows 解析 +
 * PASS WITH NOTES 零有效行 advisory + facts.handover 回填。
 *
 * 锁定语义：
 *   - 骨架：结论章节后出现「## 移交项（结构化）」+ 表头（类型/条目/复跑或验收条件）+ 枚举注释
 *   - parseHandoverRows：无段 → []；表行解析（| type | item | condition |）；占位行（<待填）
 *     跳过；类型列归一小写连字符（env-blocked 等）；非表格行（prose/注释）忽略
 *   - backfillFactsFromMdAndTests：PASS WITH NOTES 且 0 有效行 → console.warn advisory；
 *     有有效行 → facts.handover = { count, items } 落盘
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import {
  generateVerifyResultSkeleton, parseHandoverRows, backfillFactsFromMdAndTests,
} from '../src/verify-probes.js'

const tmpRoots = []
function mk(prefix) { const d = mkdtempSync(join(tmpdir(), prefix)); tmpRoots.push(d); return d }
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

const SKELETON_RESULT = {
  probe1: { matches: [], globEntries: [], worktreeHits: 0, skippedFiles: [] },
  probe3: { tasks: [], note: 'tasks.md 无 checkbox 任务' },
  probe5: { summary: 'backend 0 端点 / frontend 0 调用' },
  probe6: { unavailable: true, deletions: [], note: 'git 不可用，删除对账跳过' },
}

test('骨架：结论章节后含「移交项（结构化）」章节与表头/枚举注释', () => {
  const sk = generateVerifyResultSkeleton(SKELETON_RESULT)
  assert.match(sk, /^## 移交项（结构化） \[层：人工判断——CLI 清单核验\]$/m, '章节标题+层标注')
  assert.match(sk, /\| 类型 \| 条目 \| 复跑\/验收条件 \|/, '三列表头')
  assert.match(sk, /env-blocked/, '环境阻断枚举在注释')
  assert.match(sk, /manual-acceptance/, '人工验收枚举在注释')
  assert.match(sk, /db-script/, '待执行脚本枚举在注释')
  const conclIdx = sk.indexOf('## 结论')
  const handoverIdx = sk.indexOf('## 移交项（结构化）')
  assert.ok(conculIdxGuard(), '移交项章节在结论章节之后（顺序守卫）')
  function conculIdxGuard() { return conclIdx >= 0 && handoverIdx > conclIdx }
})

test('parseHandoverRows：无段→[]；有效表行解析+占位行跳过+类型归一', () => {
  assert.deepEqual(parseHandoverRows(''), [])
  assert.deepEqual(parseHandoverRows('# 验证报告\n\n## 结论 [层：人工判断]\n结论枚举：PASS\n'), [])
  const md = [
    '## 移交项（结构化） [层：人工判断——CLI 清单核验]',
    '<!-- 注释行忽略 -->',
    '| 类型 | 条目 | 复跑/验收条件 |',
    '|---|---|---|',
    '| env-blocked | 集成测试 5 用例（zk/eureka/redis 不可达） | dev 基础设施恢复后同口径直跑，条件固化在测试类头注释 |',
    '| manual-acceptance | 三端联调（网页双菜单+小程序分包） | 按需求 8.1-8.4 逐条人工验收 |',
    '| db-script | 2026-09-15-rp-fix.sql | dev 库手工执行（先库后码同批部署） |',
    '| <待填> | <待填> | <待填> |',
    'prose 行忽略',
  ].join('\n')
  const items = parseHandoverRows(md)
  assert.equal(items.length, 3, `占位行不计（实际 ${JSON.stringify(items)}）`)
  assert.equal(items[0].type, 'env-blocked')
  assert.match(items[0].item, /集成测试/)
  assert.match(items[0].condition, /同口径直跑/)
  assert.equal(items[1].type, 'manual-acceptance')
  assert.equal(items[2].type, 'db-script')
})

test('parseHandoverRows：全角表格线/杂类型容错（unknown 保留原值供 agent 复核）', () => {
  const md = [
    '## 移交项（结构化） [层：人工判断——CLI 清单核验]',
    '| 类型 | 条目 | 复跑/验收条件 |',
    '|---|---|---|',
    '| ENV-BLOCKED | 大写形态 | 条件 |',
    '| weird | 未知类型保留 | 条件 |',
  ].join('\n')
  const items = parseHandoverRows(md)
  assert.equal(items[0].type, 'env-blocked', '大写归一小写连字符')
  assert.equal(items[1].type, 'weird', '未知类型不丢弃（advisory 面向 agent 复核）')
})

test('backfillFacts：PASS WITH NOTES 零有效移交行 → advisory 警告；有行 → facts.handover 落盘', () => {
  const dir = mk('hov-backfill-')
  const factsPath = join(dir, 'verify-facts.json')
  writeFileSync(factsPath, JSON.stringify({ schemaVersion: 'v2-placeholder', probes: {} }))

  // 场景一：PASS WITH NOTES + 零移交段 → warn（捕获 console.warn）
  const warns1 = []
  const origWarn = console.warn
  console.warn = (...a) => warns1.push(a.join(' '))
  try {
    const r1 = backfillFactsFromMdAndTests(factsPath, {
      verifyMd: '## 结论\n结论枚举：PASS WITH NOTES——遗留三项环境/人工依赖\n',
      conclusion: 'PASS WITH NOTES',
    })
    assert.ok(warns1.some(w => /移交项/.test(w) && /PASS WITH NOTES/.test(w)), `advisory 应命中（实际 warns：${JSON.stringify(warns1)}）`)
    assert.equal(r1.facts.handover, undefined, '零有效行不落空 handover 段')
  } finally { console.warn = origWarn }

  // 场景二：PASS WITH NOTES + 有效移交行 → facts.handover 落盘、无 advisory
  const warns2 = []
  console.warn = (...a) => warns2.push(a.join(' '))
  try {
    const md = [
      '## 移交项（结构化） [层：人工判断——CLI 清单核验]',
      '| 类型 | 条目 | 复跑/验收条件 |',
      '|---|---|---|',
      '| env-blocked | 集成测试被 dev 基础设施阻断 | 恢复后同口径直跑 |',
    ].join('\n')
    const r2 = backfillFactsFromMdAndTests(factsPath, {
      verifyMd: `## 结论\n结论枚举：PASS WITH NOTES\n\n${md}\n`,
      conclusion: 'PASS WITH NOTES',
    })
    assert.ok(!warns2.some(w => /移交项.*空/.test(w)), '有有效行不再警告')
    assert.equal(r2.facts.handover.count, 1)
    assert.equal(r2.facts.handover.items[0].type, 'env-blocked')
    // 落盘核对
    const onDisk = JSON.parse(readFileSync(factsPath, 'utf8'))
    assert.equal(onDisk.handover.count, 1, 'facts.json 落盘 handover')
  } finally { console.warn = origWarn }

  // 场景三：结论 PASS（非 NOTES）+ 零移交 → 不警告（移交项章节对 PASS 非必需）
  const warns3 = []
  console.warn = (...a) => warns3.push(a.join(' '))
  try {
    backfillFactsFromMdAndTests(factsPath, {
      verifyMd: '## 结论\n结论枚举：PASS\n',
      conclusion: 'PASS',
    })
    assert.ok(!warns3.some(w => /移交项/.test(w)), 'PASS 结论零移交不警告')
  } finally { console.warn = origWarn }
})
