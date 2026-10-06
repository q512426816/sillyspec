/**
 * 2026-10-06-verify-docs-prefill — 填卡 batch 阈值配置化回归
 *
 * postmortem（sess_4769fd5d）：3 个填卡子代理 430 万 token 产出模板化内容——「task 总数 ≤8
 * 主 agent 直填」的阈值写死在 plan 阶段协调器 prompt 文案，项目无法按自己的体系调。
 * 锁死契约：
 *   B1 未配置：文案含「≤8」（内置缺省，现状一致）；
 *   B2 配 plan.fill_batch_min_tasks: 3：文案含「≤3」（两处阈值口径同步插值）；
 *   B3 非法值（0 / 负数 / 字符串）：回退 8（fail-safe）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildCoordinatorStep } from '../src/stages/plan.js'

const roots = []
function mk(p) { const d = mkdtempSync(join(tmpdir(), p)); roots.push(d); return d }
test.after(() => { for (const d of roots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

function changeDirWith(yaml) {
  const root = mk('fillcfg-')
  const specBase = join(root, '.sillyspec')
  const changeDir = join(specBase, 'changes', 'c1')
  mkdirSync(changeDir, { recursive: true })
  if (yaml != null) writeFileSync(join(specBase, 'local.yaml'), yaml)
  return changeDir
}

const stepPrompt = (changeDir) => {
  const step = buildCoordinatorStep(changeDir, ['task-01', 'task-02'])
  return String(step && (step.prompt || step.output || step.text || ''))
}

test('B1 未配置：文案含「≤8」（缺省，现状一致）', () => {
  const p = stepPrompt(changeDirWith(null))
  assert.ok(p.includes('≤8'), '阈值插值为内置 8')
})

test('B2 配 plan.fill_batch_min_tasks: 3：文案两处口径均插值为 3', () => {
  const p = stepPrompt(changeDirWith('plan:\n  fill_batch_min_tasks: 3\n'))
  assert.ok(p.includes('≤3'), '直填阈值插值 3')
  assert.ok(!p.includes('≤8') && !p.includes('>8'), `旧硬编码 8 不再出现：${p.match(/task 总数[^\n]*\n[^\n]*/) ? p.slice(p.indexOf('task 总数') - 40, p.indexOf('task 总数') + 200) : '?'}`)
})

test('B3 非法值回退 8', () => {
  for (const v of ['plan:\n  fill_batch_min_tasks: 0\n', 'plan:\n  fill_batch_min_tasks: -2\n', 'plan:\n  fill_batch_min_tasks: abc\n', 'plan: [broken\n']) {
    const p = stepPrompt(changeDirWith(v))
    assert.ok(p.includes('≤8'), `非法值 ${v.trim().split('\n').pop()} 回退 8`)
  }
})
