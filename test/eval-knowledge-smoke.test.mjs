/**
 * eval-knowledge-smoke.test.mjs — baseline 读写往返与 CLI 冒烟（FR-05 绑定）
 *
 * 零网络零数据依赖：--smoke 只跑六类探针 + mkdtemp 内 baseline 往返。
 */
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const root = join(__filename, '..', '..')

let passed = 0
let failed = 0
function assert(cond, msg) {
  if (cond) { console.log(`  ✅ PASS: ${msg}`); passed++ }
  else { console.log(`  ❌ FAIL: ${msg}`); failed++ }
}

// ── 1: --smoke --json 可跑通且结构正确 ──
console.log('\n=== Test 1: smoke 冒烟 ===')
{
  const out = execFileSync(process.execPath, [join(root, 'eval', 'knowledge', 'run.mjs'), '--smoke', '--json'], {
    encoding: 'utf8',
    timeout: 120000,
    env: { ...process.env, SILLYSPEC_KNOWLEDGE_VECTOR: 'off', SILLYSPEC_HITS_PUSH: '0' },
  })
  const j = JSON.parse(out)
  assert(j.ok === true, 'ok=true')
  assert(j.mode === 'smoke', 'mode=smoke')
  assert(Object.keys(j.probes || {}).length === 6, '六类探针均有结果')
  assert(Array.isArray(j.detected_defects), 'detected_defects 为数组')
}

// ── 2: package.json 脚本存在 ──
console.log('\n=== Test 2: npm 脚本 ===')
{
  const pkg = JSON.parse(execFileSync(process.execPath, ['-e', 'process.stdout.write(require("fs").readFileSync(process.argv[1],"utf8"))', join(root, 'package.json')], { encoding: 'utf8' }))
  assert(typeof pkg.scripts?.['eval:knowledge'] === 'string', 'package.json 含 eval:knowledge 脚本')
  assert(pkg.scripts['eval:knowledge'].includes('eval/knowledge/run.mjs'), '脚本指向 run.mjs')
}

// ── 3: baseline 结构契约（若已提交） ──
console.log('\n=== Test 3: baseline 契约 ===')
{
  const fs = await import('node:fs')
  const f = join(root, 'eval', 'knowledge', 'baseline.json')
  if (fs.existsSync(f)) {
    const b = JSON.parse(fs.readFileSync(f, 'utf8'))
    assert(b.version === 1, 'baseline version=1')
    assert(b.snapshot && typeof b.snapshot === 'object', '含 snapshot')
    assert(b.metrics && typeof b.metrics === 'object', '含 metrics')
    assert(b.probes && Object.keys(b.probes).length === 6, '含六类 probe 状态')
  } else {
    assert(true, 'baseline 未生成（--set-baseline 阶段前合法）——契约检查跳过')
  }
}

// ── 汇总 ──
console.log(`\n${'='.repeat(40)}`)
console.log(`eval-knowledge-smoke tests: ${passed} passed, ${failed} failed, ${passed + failed} total`)
if (failed > 0) process.exit(1)
