/**
 * knowledge-quicklog 测试（知识可见性导线①——quicklog 检索面）
 *
 * 覆盖：
 *   1) parseQuicklogEntries：条目头/文件段/方案行解析、括注剥离、CRLF 容错、
 *      多 QUICKLOG-*.md 文件聚合、无 quicklog 目录 → []
 *   2) matchQuicklogContext：文件名命中强信号、token 门槛（单 token 噪音不注入）、
 *      top-3 帽、排序（文件命中 > token 分 > 日期新）、fail-open（异常/空参 → 空）
 *   3) renderQuicklogSection：一行制格式（ql-ID · 标题截 60 · 日期截 10 · ≤2 文件）、
 *      h3 层级开关、空 hits → ''
 *
 * 风格：自研 assert + mkdtempSync（同 knowledge-inject.test.mjs）。
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { parseQuicklogEntries, matchQuicklogContext, renderQuicklogSection } from '../src/knowledge-quicklog.js'

let failed = 0
let total = 0
const tmpRoots = []

function assert(condition, msg) {
  total++
  if (condition) {
    console.log(`  ✅ PASS: ${msg}`)
  } else {
    failed++
    console.log(`  ❌ FAIL: ${msg}`)
  }
}

function makeSpec() {
  const root = mkdtempSync(join(tmpdir(), 'kq-quicklog-'))
  tmpRoots.push(root)
  const specBase = join(root, '.sillyspec')
  mkdirSync(join(specBase, 'quicklog'), { recursive: true })
  return { root, specBase }
}

function writeMain(specBase) {
  writeFileSync(join(specBase, 'quicklog', 'QUICKLOG-test.md'), [
    '## ql-20260920-007-x | 2026-09-20 17:27:00 | claude 引擎 autocompact 做成 provider 级可配（解决 160K 过早压缩）',
    '状态：已完成',
    '关联变更：（无）',
    '文件：',
    '- sillyhub-daemon/src/claude-settings.ts（白名单三键+值守护）',
    '- frontend/src/components/llm-provider-form.tsx（claude 分支表单区）',
    '- docs/daemon.md（增量段）',
    '需求：claude 引擎 autocompact 做成 provider 级可配',
    '根因：引擎默认 believed limit×~80% 触发，白名单未放行',
    '方案：白名单加 autoCompactWindow 等三键+VALUE_GUARDS 值守护',
    '结果：daemon 25/25 全绿',
    '',
    '## ql-20260921-009-y | 2026-09-21 20:00:00 | 多会话摩擦三修复（quick 守卫 TTL）',
    '状态：已完成',
    '文件：',
    '- src/quicklog.js（TTL 剔除）',
    '- src/run/stage.js（并发错峰建议）',
    '方案：guard.json mtime 超 4h 剔除',
    '',
  ].join('\n'), 'utf8')
}

function writeCrlf(specBase) {
  writeFileSync(join(specBase, 'quicklog', 'QUICKLOG-crlf.md'), [
    '## ql-20260918-000-z | 2026-09-18 09:00:00 | cursor 交互会话修复',
    '文件：',
    '- backend/app/cursor.py（会话绑定）',
  ].join('\r\n') + '\r\n', 'utf8')
}

// ── 1. 解析 ──
console.log('\n--- 1. parseQuicklogEntries ---')
{
  const { specBase } = makeSpec()
  writeMain(specBase)
  writeCrlf(specBase)
  const entries = parseQuicklogEntries(specBase)
  assert(entries.length === 3, `1a 三条目（含 CRLF 文件，实际 ${entries.length}）`)
  const e7 = entries.find((e) => e.qlId === 'ql-20260920-007-x')
  assert(e7 && e7.date === '2026-09-20 17:27:00' && e7.title.includes('autocompact'), '1b 条目头三段（id/时间/标题）解析')
  assert(e7 && e7.files.length === 3 && e7.files[0] === 'sillyhub-daemon/src/claude-settings.ts' && !e7.files[0].includes('（'),
    '1c 文件段逐行提取，括注剥离')
  assert(e7 && e7.solution.includes('VALUE_GUARDS'), '1d 方案行捕获（打分语料）')
  const ez = entries.find((e) => e.qlId === 'ql-20260918-000-z')
  assert(ez && ez.files.length === 1 && ez.files[0] === 'backend/app/cursor.py', '1e CRLF 文件容错')
}

// ── 2. 匹配 ──
console.log('\n--- 2. matchQuicklogContext ---')
{
  const { specBase } = makeSpec()
  writeMain(specBase)
  writeCrlf(specBase)
  const r1 = matchQuicklogContext(specBase, 'claude autocompact provider 配置 claude-settings 白名单')
  assert(r1.hits.length >= 1 && r1.hits[0].qlId === 'ql-20260920-007-x', `2a 文件名命中+标题 token 命中（实际 ${JSON.stringify(r1.hits.map(h => h.qlId))}）`)
  const r2 = matchQuicklogContext(specBase, 'cursor 会话 修复 backend')
  assert(r2.hits.length >= 1 && r2.hits[0].qlId === 'ql-20260918-000-z', `2b CJK 子串 + ASCII 词边界命中，文件命中条目居首（实际 ${JSON.stringify(r2.hits.map(h => h.qlId))}）`)
  const r3 = matchQuicklogContext(specBase, 'quicklog')
  assert(r3.hits.length === 0, `2c 单 token 噪音不注入（门槛 ≥2 token 或 ≥1 文件命中，实际 ${r3.hits.length}）`)
  const r4 = matchQuicklogContext(specBase, null)
  assert(r4.hits.length === 0 && r4.report === '', '2d 空参数 fail-open')
  const r5 = matchQuicklogContext(join(specBase, '..', 'no-such-dir'), 'claude autocompact')
  assert(r5.hits.length === 0, '2e quicklog 目录缺失 fail-open')
}

// ── 3. 排序与上限 ──
console.log('\n--- 3. 排序与上限 ---')
{
  const { specBase } = makeSpec()
  writeMain(specBase)
  writeCrlf(specBase)
  // claude-settings 文件命中 007；cursor.py 文件命中 cursor 查询——文件命中优先于纯 token
  const r = matchQuicklogContext(specBase, 'claude-settings cursor.py autocompact 会话 修复 引擎')
  assert(r.hits.length <= 3, `3a top-3 帽（实际 ${r.hits.length}）`)
  assert(r.hits[0].qlId === 'ql-20260920-007-x' || r.hits[0].qlId === 'ql-20260918-000-z', '3b 文件命中条目排前')
  const rLimit = matchQuicklogContext(specBase, 'claude-settings cursor.py autocompact 会话 修复 引擎', { limit: 1 })
  assert(rLimit.hits.length === 1, '3c limit 参数生效')
}

// ── 4. 渲染 ──
console.log('\n--- 4. renderQuicklogSection ---')
{
  const s = renderQuicklogSection([
    { qlId: 'ql-20260920-007-x', date: '2026-09-20 17:27:00', title: 'claude 引擎 autocompact 做成 provider 级可配（解决 160K 过早压缩）', files: ['sillyhub-daemon/src/claude-settings.ts', 'frontend/src/components/llm-provider-form.tsx', 'docs/daemon.md'] },
  ])
  assert(s.startsWith('🕘 近期 quick 修补（quicklog 机械匹配，top-1'), '4a 段头文案')
  assert(s.includes(' - ql-20260920-007-x · claude 引擎 autocompact 做成 provider 级可配（解决 160K 过早压缩） · 2026-09-20 · sillyhub-daemon/src/claude-settings.ts, frontend/src/components/llm-provider-form.tsx'),
    '4b 一行制：ql-ID · 标题 · 日期截 10 · 至多 2 文件（第三个不出现）')
  const s3 = renderQuicklogSection([...Array(5)].map((_, i) => ({ qlId: `ql-x-${i}`, date: '2026-09-21', title: `t${i}`, files: [] })))
  assert(s3.split('\n').length === 6, `4c N 条 N 行+段头（实际 ${s3.split('\n').length}）`)
  const h3 = renderQuicklogSection([{ qlId: 'ql-1', date: '2026-09-21', title: 't', files: [] }], { h3: true })
  assert(h3.startsWith('### 🕘 近期 quick 修补'), '4d h3 层级开关（execute.js Wave 孪生用）')
  assert(renderQuicklogSection([]) === '', '4e 空 hits 空串')
}

for (const dir of tmpRoots) {
  try { rmSync(dir, { recursive: true, force: true }) } catch { /* Windows 句柄迟滞容忍 */ }
}

console.log(`\n${failed === 0 ? '✅ ALL PASS' : '❌ FAILED'}: ${total - failed}/${total}`)
process.exit(failed === 0 ? 0 : 1)
