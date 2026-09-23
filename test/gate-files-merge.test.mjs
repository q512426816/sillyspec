/**
 * gate-files-merge（ql-018，2026-09-23）：门禁文件集「审计 ∪ 声明」合并口径。
 *
 * 锁死契约（快照分叉第三 sibling 根治件的纯函数面）：
 * 1. 并集钉：审计非空时声明文件不再被丢弃（旧二选一 → declared∩前序脏文件不进快照 →
 *    快照 HEAD 旧版缺新导出 → import 炸恒假红，2026-09-23 ql-017 三轮实证）；
 * 2. 去重保序（审计在前）；倒推 B 兜底保留（审计空 → 声明独撑）；空参容忍。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mergeGateFiles } from '../src/run/quick-audit.js'

test('T1 并集钉：审计非空时声明文件保留（旧二选一在此丢文件）', () => {
  const audited = ['test/new-file.test.mjs']
  const declared = ['src/verify-postcheck.js', 'src/run/quick-audit.js', 'src/config-schema.js', '.sillyspec/local.yaml.example', 'test/new-file.test.mjs']
  const out = mergeGateFiles(audited, declared)
  assert.deepEqual(out, [
    'test/new-file.test.mjs',
    'src/verify-postcheck.js',
    'src/run/quick-audit.js',
    'src/config-schema.js',
    '.sillyspec/local.yaml.example',
  ], '声明文件全部补入且去重保序（审计在前）')
})

test('T2 倒推 B 兜底保留：审计空 → 声明独撑', () => {
  assert.deepEqual(mergeGateFiles([], ['src/a.js']), ['src/a.js'])
  assert.deepEqual(mergeGateFiles(null, ['src/a.js', 'src/b.js']), ['src/a.js', 'src/b.js'])
})

test('T3 空与非法容忍', () => {
  assert.deepEqual(mergeGateFiles([], []), [])
  assert.deepEqual(mergeGateFiles(null, undefined), [])
  assert.deepEqual(mergeGateFiles(['src/a.js', null, '', 42, 'src/a.js'], ['src/b.js']), ['src/a.js', 'src/b.js'], 'null/空串/非串/重复剔除')
})
