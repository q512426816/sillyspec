/**
 * quick 关联变更存在性守卫 CLI 测试（坑 quick-change-phantom-linked）
 *
 * 背景：quick 的 --change <名> 被历史语义解析为「关联变更」，传不存在的变更名被静默接受
 * （quick 不建变更，f70c9c3 后也不建幻影目录），后果：QUICKLOG 挂悬空关联污染 change 关联
 * 图谱 + --done 时 sessionId 走 fallback 可能命中他者会话。本守卫在 flag 装载层 fail-loud
 * （exit 2，对齐 --files 空格检测 / assertSafeChangeName 先例）。
 *
 * 用例：
 *  1. --change <不存在名> → exit 2 + 报错文案含出路（拦截核心）
 *  2. --change <已存在变更名> → 放行（正常关联）
 *  3. --done --change quick-<8hex>（sessionId 形态）→ 放行（特例优先，不被守卫误伤）
 *  4. --linked-changes <不存在名> → 同拦（显式写法同检）
 *  5. --linked-changes none → 放行（语义值，非变更名）
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { makeRepo, runCLI, cleanup, report } from './_cli-step-harness.mjs'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }

console.log('=== quick 关联变更存在性守卫（坑 quick-change-phantom-linked）===\n')

console.log('--- 用例1: --change <不存在名> → exit 2 + 出路文案 ---')
{
  const { cwd } = makeRepo('ql-guard-blk-')
  const r = runCLI(['--dir', cwd, 'run', 'quick', '--change', '2026-08-16-my-phantom-change'], { cwd })
  assert(r.status === 2, `exit 2（实际 ${r.status}）`)
  assert(r.combined.includes('2026-08-16-my-phantom-change'), '报错点名幻影变更名')
  assert(r.combined.includes('sessionId 由 CLI 自动生成') || r.combined.includes('不要传 --change'), '出路①给会话起名的正确用法')
  assert(r.combined.includes('--linked-changes'), '出路②给出显式关联写法')
  assert(r.combined.includes('brainstorm'), '出路③建变更指路完整流程')
}

console.log('\n--- 用例2: --change <已存在变更名> → 放行 ---')
{
  const { cwd, specBase } = makeRepo('ql-guard-ok-')
  // 预置一个存在的变更目录（quick 关联只查目录存在性）
  mkdirSync(join(specBase, 'changes', '2026-08-16-real-change', 'tasks'), { recursive: true })
  writeFileSync(join(specBase, 'changes', '2026-08-16-real-change', 'plan.md'), '# Plan\n')
  const r = runCLI(['--dir', cwd, 'run', 'quick', '--change', '2026-08-16-real-change'], { cwd })
  assert(r.status === 0, `exit 0（实际 ${r.status}，尾：${r.combined.slice(-150)}）`)
  // 锚守卫专属文案（quick step1 prompt 正文自带「不存在则跳过」字样，不能用裸「不存在」断言）
  assert(!r.combined.includes('以下变更不存在'), '不触发守卫报错')
  assert(r.combined.includes('关联变更') || r.combined.includes('2026-08-16-real-change'), '确认关联变更被记录')
}

console.log('\n--- 用例3: --change quick-<8hex>（sessionId 形态）→ 放行 ---')
{
  const { cwd } = makeRepo('ql-guard-sid-')
  // sessionId 形态特例在守卫之前放行（--done 精确恢复会话用）；目录不存在也不能拦
  const r = runCLI(['--dir', cwd, 'run', 'quick', '--change', 'quick-1a2b3c4d', '--status'], { cwd })
  assert(r.status === 0, `exit 0（实际 ${r.status}，尾：${r.combined.slice(-150)}）`)
  assert(!r.combined.includes('以下变更不存在'), 'sessionId 形态不被守卫误伤')
}

console.log('\n--- 用例4: --linked-changes <不存在名> → 同拦 ---')
{
  const { cwd } = makeRepo('ql-guard-lc-')
  const r = runCLI(['--dir', cwd, 'run', 'quick', '--linked-changes', 'ghost-change'], { cwd })
  assert(r.status === 2, `exit 2（实际 ${r.status}）`)
  assert(r.combined.includes('ghost-change'), '报错点名幻影变更名')
}

console.log('\n--- 用例5: --linked-changes none → 放行（语义值） ---')
{
  const { cwd } = makeRepo('ql-guard-none-')
  const r = runCLI(['--dir', cwd, 'run', 'quick', '--linked-changes', 'none', '--input', '守卫测试'], { cwd })
  assert(r.status === 0, `exit 0（实际 ${r.status}，尾：${r.combined.slice(-150)}）`)
  assert(!r.combined.includes('以下变更不存在'), '语义值 none 不触发守卫')
}

cleanup()
report(count.passed, count.failed, count.failures)
if (count.failed > 0) process.exit(1)
