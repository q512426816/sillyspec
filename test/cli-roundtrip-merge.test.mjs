/**
 * cli-roundtrip-merge.test.mjs — 协议往返合并引导（2026-11-27-cli-roundtrip-merge）
 *
 * 语境：completeStep 的 printNext 分支（src/run/complete.js:1021）早在 --done 时尾接下一步
 * prompt（平台日志实证）——本轮实际改动是两段 prompt 引导，非机制：
 *   - run/prompt.js 完成契约：显式告知「下一步已尾接，勿重复 run <stage>」
 *   - stages/execute.js Wave 闭环：多次编辑合并为一次 wt-commit
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => readFileSync(join(ROOT, p), 'utf8')

test('run/prompt.js 完成契约：含「下一步已尾接，勿重复 run」引导', () => {
  const src = read('src/run/prompt.js')
  assert.match(src, /下一步已尾接/, '引导句标题在场')
  assert.match(src, /不要再调/, '明确禁止重复渲染调用')
  assert.match(src, /阶段切换/, '给出唯一合法例外（阶段切换）')
})

test('stages/execute.js Wave 闭环：含「合并为一次提交」引导', () => {
  const src = read('src/stages/execute.js')
  assert.match(src, /合并为一次提交/, '合并提交引导在场')
  assert.match(src, /不要每改一个文件就 wt-commit/, '反例明示（逐文件立即提交）')
})

test('complete.js 尾接机制仍在（引导句依赖的事实锚）', () => {
  const src = read('src/run/complete.js')
  assert.match(src, /if \(printNext\) \{/, 'printNext 分支在场')
  assert.match(src, /await outputStep\(stageName, nextPendingIdx/, '尾接渲染调用在场')
})
