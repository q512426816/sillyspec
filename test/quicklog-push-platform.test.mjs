// task-06（2026-08-16-change-center-quick-tab / FR-02 / D-003）：quicklog 平台推送验证。
//
// 验收点（task-06.md acceptance）：
// 1. allocateQuicklogEntry 成功后 POST 一次（status=in_progress，payload 字段对齐 QuicklogEntryPushRequest）
// 2. completeQuicklogEntry 成功后 POST 一次（以落盘终态组装：completed + 结果四段 + raw_block）
// 3. 无 platform 配置（未连接平台）→ 静默跳过（不发请求、不抛错）
// 4. fetch 拒绝（网络断/非 2xx）→ 不阻断主流程（函数正常返回，本地文件已落盘）
// 5. linked_changes 白名单：日期前缀才进 payload.linked_changes
// 6. 幂等语义：同 ql_id 二推（complete 覆盖 allocate 的 in_progress）payload.status=completed
//
// 隔离：mkdtemp tmp 目录 + mock globalThis.fetch（对齐 test/check-approval-status.test.mjs 风格）。
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import assert from 'node:assert/strict'
import {
  allocateQuicklogEntry,
  completeQuicklogEntry,
} from '../src/quicklog.js'

let failures = 0
const tests = []
const test = (name, fn) => tests.push({ name, fn })

function mockFetch(capture) {
  const saved = globalThis.fetch
  globalThis.fetch = async (url, options = {}) => {
    capture.push({ url: String(url), options, body: options.body ? JSON.parse(options.body) : null })
    return { ok: true, status: 200, headers: new Map(), json: async () => ({ status: 'ok' }) }
  }
  return () => { globalThis.fetch = saved }
}

function mockFetchReject() {
  const saved = globalThis.fetch
  globalThis.fetch = async () => { throw new Error('ECONNREFUSED mock') }
  return () => { globalThis.fetch = saved }
}

function makeFixture(platform) {
  const tmp = mkdtempSync(join(tmpdir(), `ql-push-${process.pid}-`))
  const specBase = join(tmp, '.sillyspec')
  mkdirSync(join(specBase, 'quicklog'), { recursive: true })
  if (platform) {
    writeFileSync(join(specBase, 'local.yaml'),
      `platform:\n  url: ${platform.url}\n  token: ${platform.token}\n`)
  }
  return { tmp, specBase }
}

test('1. allocate → POST 一次 in_progress 条目（字段对齐平台 DTO）', async () => {
  const { specBase } = makeFixture({ url: 'http://hub.test', token: 'shpsync_tok1' })
  const captured = []
  const restore = mockFetch(captured)
  try {
    const { qlId } = await allocateQuicklogEntry(specBase, 'qinyi', {
      description: '修侧栏宽度塌陷',
      linkedChanges: ['2026-08-16-change-center-quick-tab'],
      allowedFiles: ['frontend/src/app/x.tsx'],
    })
    assert.equal(captured.length, 1, '恰好 POST 一次')
    const { url, options, body } = captured[0]
    assert.ok(url.endsWith('/api/quicklog-entries'), `URL 形态：${url}`)
    assert.equal(options.method, 'POST')
    assert.equal(options.headers.Authorization, 'Bearer shpsync_tok1')
    assert.equal(body.ql_id, qlId)
    assert.equal(body.status, 'in_progress')
    assert.equal(body.title, '修侧栏宽度塌陷')
    assert.equal(body.author_raw, 'qinyi')
    assert.deepEqual(body.linked_changes, ['2026-08-16-change-center-quick-tab'])
    assert.deepEqual(body.files, [{ path: 'frontend/src/app/x.tsx', note: null }])
    assert.ok(body.timestamp, 'timestamp 非空')
    assert.ok(body.raw_block.includes(`## ${qlId} |`), 'raw_block 含条目头')
  } finally { restore() }
})

test('2. complete → POST 落盘终态（completed + 状态括注 + 四段正文 + raw_block）', async () => {
  const { specBase } = makeFixture({ url: 'http://hub.test', token: 'shpsync_tok1' })
  const captured = []
  const restore = mockFetch(captured)
  try {
    const { qlId } = await allocateQuicklogEntry(specBase, 'qinyi', { description: '修 daemon 重连' })
    captured.length = 0
    await completeQuicklogEntry(specBase, 'qinyi', qlId, {
      resultText: '需求：修 daemon 重连。\n根因：token 过期。\n方案：刷新。\n结果：17 测试绿。',
      changedFiles: ['backend/app/modules/daemon/service.py'],
    })
    assert.equal(captured.length, 1, 'complete 恰好 POST 一次')
    const body = captured[0].body
    assert.equal(body.ql_id, qlId)
    assert.equal(body.status, 'completed', '以落盘终态为准（翻完成）')
    assert.equal(body.body_sections['需求'], '修 daemon 重连。')
    assert.equal(body.body_sections['结果'], '17 测试绿。')
    assert.ok(body.files.some(f => f.path === 'backend/app/modules/daemon/service.py'), '文件行带实际改动')
    assert.ok(body.raw_block.includes(`## ${qlId} |`), 'raw_block 是落盘块')
  } finally { restore() }
})

test('3. 无 platform 配置 → 静默跳过（零请求零异常）', async () => {
  const { specBase } = makeFixture(null)
  const captured = []
  const restore = mockFetch(captured)
  try {
    const { qlId } = await allocateQuicklogEntry(specBase, 'qinyi', { description: '本地任务' })
    assert.equal(captured.length, 0, '未连接平台不发请求')
    assert.ok(qlId, '分配正常返回（本地主流程不受影响）')
    await completeQuicklogEntry(specBase, 'qinyi', qlId, { resultText: '结果：绿。' })
    assert.equal(captured.length, 0)
    const content = readFileSync(join(specBase, 'quicklog', 'QUICKLOG-qinyi.md'), 'utf8')
    assert.ok(content.includes('状态：已完成'), '本地文件照常落盘完成态')
  } finally { restore() }
})

test('4. fetch 拒绝（断网）→ best-effort 不阻断（本地照常写、函数不抛）', async () => {
  const { specBase } = makeFixture({ url: 'http://hub.test', token: 'shpsync_tok1' })
  const restore = mockFetchReject()
  try {
    const { qlId } = await allocateQuicklogEntry(specBase, 'qinyi', { description: '断网任务' })
    assert.ok(qlId, '推送失败不影响分配返回')
    await completeQuicklogEntry(specBase, 'qinyi', qlId, { resultText: '结果：绿。' })
    const content = readFileSync(join(specBase, 'quicklog', 'QUICKLOG-qinyi.md'), 'utf8')
    assert.ok(content.includes('状态：已完成'), '本地文件照常完成')
  } finally { restore() }
})

test('5. linked_changes 白名单：非日期前缀自由文本滤掉', async () => {
  const { specBase } = makeFixture({ url: 'http://hub.test', token: 'shpsync_tok1' })
  const captured = []
  const restore = mockFetch(captured)
  try {
    await allocateQuicklogEntry(specBase, 'qinyi', {
      description: '白名单',
      linkedChanges: ['2026-08-09-complete-stage-deepcopy', 'backend-monitoring'],
    })
    const body = captured[0].body
    assert.deepEqual(body.linked_changes, ['2026-08-09-complete-stage-deepcopy'], '白名单正则过滤')
    assert.ok(body.raw_block.includes('backend-monitoring'), 'raw_block 原文保留（不丢数据）')
  } finally { restore() }
})

test('6. 幂等：同 ql_id 二推覆盖（complete 推送 status=completed 覆盖 allocate 的 in_progress）', async () => {
  const { specBase } = makeFixture({ url: 'http://hub.test', token: 'shpsync_tok1' })
  const captured = []
  const restore = mockFetch(captured)
  try {
    const { qlId } = await allocateQuicklogEntry(specBase, 'qinyi', { description: '幂等' })
    await completeQuicklogEntry(specBase, 'qinyi', qlId, { resultText: '结果：绿。' })
    assert.equal(captured.length, 2, '两次推送同 ql_id')
    assert.equal(captured[0].body.status, 'in_progress')
    assert.equal(captured[1].body.status, 'completed')
    assert.equal(captured[0].body.ql_id, captured[1].body.ql_id)
  } finally { restore() }
})

// ── runner（对齐 test/ 惯例：逐条 console + 汇总 exit code）──
for (const { name, fn } of tests) {
  try {
    await fn()
    console.log(`  ✅ ${name}`)
  } catch (e) {
    failures++
    console.error(`  ❌ ${name}\n     ${e.message}`)
  }
}
console.log(failures === 0 ? '\nquicklog-push-platform: ALL PASS' : `\nquicklog-push-platform: ${failures} FAILED`)
process.exit(failures === 0 ? 0 : 1)
