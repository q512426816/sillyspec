/**
 * 2026-10-06-verify-docs-prefill — step-guide 旧指纹清理回归
 *
 * postmortem（sess_4769fd5d）：step-guides 目录同一步多版本共存且永不清理——agent 自行
 * ls/glob 目录会读到旧版本指引（step5 内容实为 step6 指引的错位疑云）。锁死契约：
 *   G1 写新 guide 后：同步骤旧指纹文件被清理；
 *   G2 仍被任一变更 state 引用的文件保留（他变更复入短输出依赖 existsSync 回退）；
 *   G3 其他步骤的文件不动。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pruneStaleStepGuides } from '../src/run/prompt.js'

const roots = []
function mk(p) { const d = mkdtempSync(join(tmpdir(), p)); roots.push(d); return d }
test.after(() => { for (const d of roots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

test('G1-G3：旧指纹清理 / state 引用保留 / 他步骤不动', () => {
  const root = mk('guideprune-')
  const guideRoot = join(root, 'step-guides')
  const stateRoot = join(root, 'step-guide-state')
  mkdirSync(guideRoot, { recursive: true })
  mkdirSync(stateRoot, { recursive: true })
  const aaaa = join(guideRoot, 'plan-step0-aaaa1111.md')
  const bbbb = join(guideRoot, 'plan-step0-bbbb2222.md')
  const cccc = join(guideRoot, 'plan-step1-cccc3333.md')
  const fresh = join(guideRoot, 'plan-step0-dead4444.md')
  for (const p of [aaaa, bbbb, cccc, fresh]) writeFileSync(p, 'x\n')
  writeFileSync(join(stateRoot, 'plan-step0-other-change.json'), JSON.stringify({ fingerprint: 'bbbb2222', guidePath: bbbb }))

  const pruned = pruneStaleStepGuides({ guideRoot, stateRoot, stageName: 'plan', stepIndex: 0, keepAbsPaths: [fresh] })

  assert.equal(pruned, 1, `只清 1 个（实际 ${pruned}）`)
  assert.ok(!existsSync(aaaa), 'G1: 无引用旧指纹被清理')
  assert.ok(existsSync(bbbb), 'G2: state 引用文件保留')
  assert.ok(existsSync(fresh), 'keep 集合内新文件保留')
  assert.ok(existsSync(cccc), 'G3: 其他步骤文件不动')
})

test('目录缺失：返回 0 不抛（fail-soft）', () => {
  const root = mk('guideprune2-')
  const n = pruneStaleStepGuides({ guideRoot: join(root, 'none'), stateRoot: join(root, 'none2'), stageName: 'plan', stepIndex: 0, keepAbsPaths: [] })
  assert.equal(n, 0)
})
