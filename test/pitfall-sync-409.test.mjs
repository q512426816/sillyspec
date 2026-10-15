/**
 * 2026-10-15-pitfall-batch-clearance FR-12 — 平台 409 回显折叠单行
 *
 * 坑 probe-noise-and-commit-suggest-quality 坑C（消费仓实证）：spec-sync 对平台 POST 多次 409，
 * 响应体含整段 platform_progress 大对象，本地 text.slice(0,200) 密排回显挂在每条 CLI 命令尾部
 * 刷屏。锁死契约：409 冲突体折叠为一行摘要（conflict 标识 + 关键字段，不回显大对象）；
 * 非 JSON 退回截断原文（零回归）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatSyncHttpErrorLine } from '../src/sync.js'

const CONFLICT_BODY = JSON.stringify({
  conflict: true,
  change: 'mychange',
  last_pushed_at: '2026-10-15T06:51:30Z',
  platform_progress: { stages: { execute: { status: 'completed', steps: Array.from({ length: 40 }, (_, i) => ({ name: `s${i}`, status: 'completed' })) } }, timeline: Array.from({ length: 30 }, (_, i) => ({ t: i })) },
})

test('FR-12：409 冲突体折叠单行摘要（不回显 platform_progress）', () => {
  const line = formatSyncHttpErrorLine('POST', 'https://crrcdt.ppdmq.top/api/progress', 409, CONFLICT_BODY)
  assert.ok(!line.includes('\n'), '单行')
  assert.ok(line.includes('→ 409'), '状态码在场')
  assert.ok(line.includes('conflict'), 'conflict 标识在场')
  assert.ok(line.includes('change=mychange'), '变更标识在场')
  assert.ok(line.includes('last_pushed_at=2026-10-15T06:51:30Z'), '时间戳在场')
  assert.ok(!line.includes('platform_progress') || !line.includes('stages'), '不回显大对象内容')
  assert.ok(line.length < 200, `行长远小于响应体（got ${line.length}）`)
})

test('FR-12：非 JSON 错误体退回截断原文（零回归）', () => {
  const line = formatSyncHttpErrorLine('GET', 'https://x/y', 502, 'Bad Gateway'.repeat(50))
  assert.ok(line.includes('→ 502'), '状态码在场')
  assert.ok(line.length <= '[sync] GET https://x/y → 502 '.length + 200, '截断 200 语义保留')
})

test('FR-12：其他 JSON 错误体打键名摘要', () => {
  const line = formatSyncHttpErrorLine('POST', 'https://x/y', 400, JSON.stringify({ error: 'bad', detail: { a: 1 } }))
  assert.ok(line.includes('json(error,detail)'), `键名摘要（got ${line}）`)
  assert.ok(!line.includes('{"a":1}'), '不回显对象内容')
})
