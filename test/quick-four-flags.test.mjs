/**
 * quick 四字段参数（--req/--cause/--solution/--result）CLI 冒烟测试
 * （2026-08-21 agent-手工产出审计第二批 F6）
 *
 * 验证 flag 层行为：缺项 fail-fast（exit 2 + 列缺失）、与 --output 互斥（exit 2）、
 * 全四给齐时通过 flag 解析合成结构化 output（后续失败只能是会话/流程层错误，
 * 不再是四字段格式错误）。
 */
import { mkdtempSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const cliBin = join(__dirname, '..', 'bin', 'sillyspec.js')

let passed = 0
let failed = 0
function assert(cond, msg) {
  if (cond) { console.log(`  ✅ PASS: ${msg}`); passed++ }
  else { console.log(`  ❌ FAIL: ${msg}`); failed++ }
}

function runCLI(args, cwd) {
  const res = spawnSync(process.execPath, [cliBin, 'run', 'quick', ...args], {
    cwd, encoding: 'utf8', timeout: 60_000, stdio: ['pipe', 'pipe', 'pipe'],
  })
  return { status: res.status, out: (res.stdout || '') + (res.stderr || '') }
}

const dir = mkdtempSync(join(tmpdir(), 'qf-'))
try {
  {
    const r = runCLI(['--done', '--req', 'a', '--cause', 'b', '--solution', 'c'], dir)
    assert(r.status === 2, `缺 --result → exit 2（实际 ${r.status}）`)
    assert(r.out.includes('--result') && r.out.includes('缺项'), '报错列出缺失参数')
  }
  {
    const r = runCLI(['--done', '--req', 'a', '--cause', 'b', '--solution', 'c', '--result', 'd', '--output', 'x'], dir)
    assert(r.status === 2, `四参数与 --output 混用 → exit 2（实际 ${r.status}）`)
    assert(r.out.includes('互斥'), '报错提示互斥')
  }
  {
    const r = runCLI(['--done', '--req', 'a', '--cause', 'b', '--solution', 'c', '--result', 'd'], dir)
    const flagError = r.status === 2 && (r.out.includes('缺项') || r.out.includes('互斥'))
    assert(!flagError, `全四给齐 → 通过 flag 解析（失败只能是会话层：${r.out.split('\n')[0].slice(0, 80)}）`)
  }
} finally {
  try { rmSync(dir, { recursive: true, force: true }) } catch {}
}

console.log(`\n合计: ${passed} 通过, ${failed} 失败`)
process.exit(failed > 0 ? 1 : 0)
