// D-8 落盘修复（2026-08-18）：advisory 欠账信号（docSyncHint / docsCheckHint）随 QUICKLOG 条目
// 落盘为「审计：」行——修复「欠账已记录（QUICKLOG reasons）」不实承诺（原纯 console，事后不可审计）。
// 覆盖：落盘位置（结果块之后）/ 幂等（重跑不重复）/ 不传不写（向后兼容）/ 平台 payload 不污染
// （审计行只进 raw_block，不进 body_sections——续行误挂是改造前的隐性坑）。
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { strict as assert } from 'node:assert'
import { allocateQuicklogEntry, completeQuicklogEntry } from '../src/quicklog.js'

let passed = 0
function ok(cond, msg) { assert.ok(cond, msg); passed++ }

function makeFixture(platform) {
  const tmp = mkdtempSync(join(tmpdir(), `ql-audit-${process.pid}-`))
  const specBase = join(tmp, '.sillyspec')
  mkdirSync(join(specBase, 'quicklog'), { recursive: true })
  if (platform) {
    writeFileSync(join(specBase, 'local.yaml'),
      `platform:\n  url: ${platform.url}\n  token: ${platform.token}\n`)
  }
  return { tmp, specBase }
}

function readQuicklog(specBase, gitUser) {
  const dir = join(specBase, 'quicklog')
  const f = readdirSync(dir).find((x) => x === `QUICKLOG-${gitUser}.md`)
  return readFileSync(join(dir, f), 'utf8')
}

// 1. auditNotes 落盘：结果块之后出现「审计：」行
{
  const { specBase } = makeFixture()
  const { qlId } = await allocateQuicklogEntry(specBase, 'qinyi', { description: '修侧栏宽度' })
  await completeQuicklogEntry(specBase, 'qinyi', qlId, {
    resultText: '需求：修侧栏。\n根因：flex 塌陷。\n方案：min-width。\n结果：3 测试绿。',
    changedFiles: ['frontend/src/x.tsx'],
    auditNotes: ['📝 文档欠账（D-8）：1 个源码文件改动未同步任何模块文档（涉及模块：ui）'],
  })
  const content = readQuicklog(specBase, 'qinyi')
  const auditLine = `审计：📝 文档欠账（D-8）：1 个源码文件改动未同步任何模块文档（涉及模块：ui）`
  ok(content.includes(auditLine), '审计行落盘')
  ok(content.indexOf('结果：3 测试绿。') < content.indexOf(auditLine), '审计行在结果块之后')
  ok(content.includes('状态：已完成'), '状态正常翻转（审计行不影响既有流程）')
}

// 2. 幂等：--done 重跑同条目不重复写审计行
{
  const { specBase } = makeFixture()
  const { qlId } = await allocateQuicklogEntry(specBase, 'qinyi', { description: '幂等验证' })
  const notes = ['📝 文档欠账（D-8）：2 个源码文件改动未同步任何模块文档']
  await completeQuicklogEntry(specBase, 'qinyi', qlId, { resultText: '需求：a\n根因：b\n方案：c\n结果：d', auditNotes: notes })
  await completeQuicklogEntry(specBase, 'qinyi', qlId, { resultText: '', auditNotes: notes })
  const content = readQuicklog(specBase, 'qinyi')
  ok(content.split('审计：📝').length === 2, '重跑后审计行不重复（幂等）')
}

// 3. 不传 auditNotes → 不写审计行（向后兼容）
{
  const { specBase } = makeFixture()
  const { qlId } = await allocateQuicklogEntry(specBase, 'qinyi', { description: '兼容验证' })
  await completeQuicklogEntry(specBase, 'qinyi', qlId, {
    resultText: '需求：a\n根因：b\n方案：c\n结果：d',
    changedFiles: ['src/x.js'],
  })
  ok(!readQuicklog(specBase, 'qinyi').includes('审计：'), '无 auditNotes 无审计行')
}

// 4. 平台 payload 不污染：审计行只进 raw_block，不进 body_sections（含续行误挂回归）
{
  const { specBase } = makeFixture({ url: 'http://hub.test', token: 'shpsync_tok1' })
  const captured = []
  const saved = globalThis.fetch
  globalThis.fetch = async (url, options) => {
    captured.push({ url, options, body: JSON.parse(options.body) })
    return { ok: true, status: 200, json: async () => ({}) }
  }
  try {
    const { qlId } = await allocateQuicklogEntry(specBase, 'qinyi', { description: '平台验证' })
    captured.length = 0
    await completeQuicklogEntry(specBase, 'qinyi', qlId, {
      resultText: '需求：a\n根因：b\n方案：c\n结果：d',
      auditNotes: ['📝 文档欠账（D-8）：1 个源码文件改动未同步任何模块文档'],
    })
    const body = captured[0].body
    ok(body.body_sections['结果'] === 'd', '审计行不误挂进 body_sections 结果段')
    ok(!('审计' in body.body_sections), 'body_sections 不新增 审计 key（平台 DTO schema 不扩）')
    ok(body.raw_block.includes('审计：📝 文档欠账'), 'raw_block 含审计行（可追溯）')
  } finally { globalThis.fetch = saved }
}

console.log(`✅ quicklog-audit-notes: ${passed} assertions PASS`)
