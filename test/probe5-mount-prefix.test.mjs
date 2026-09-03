/**
 * 探针 5 挂载前缀对齐测试（坑 endpoints-mount-prefix-gap，2026-08-31 用户实证）。
 *
 * multi-agent-platform 形态：router 文件自带子前缀（APIRouter(prefix="/daemon")），挂载点
 * main.py 的 include_router(prefix="/api") 与 router 文件分离 → endpoints 提取欠挂载前缀
 * （/daemon/machines），前端全路径调用（/api/daemon/machines）→ 17 个存量端点全量假
 * missing、人工逐条定性成本高。
 *
 * 覆盖：
 * 1. verifyApiParity 端到端：挂载前缀从扫描根现收集，欠前缀端点 + 全路径调用 → 0 missing
 * 2. 真缺失端点仍报 missing（对齐不许变成全过）
 * 3. 渲染层披露 prefixAlignedCount（报告不静默对齐）
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import { verifyApiParity } from '../src/contract-matrix.js'
import { renderVerifyProbesReport } from '../src/verify-probes.js'

let passed = 0
let failed = 0

function assert(cond, msg, detail = '') {
  if (cond) { console.log(`  ✅ PASS: ${msg}`); passed++ }
  else { console.log(`  ❌ FAIL: ${msg}${detail ? ' — ' + detail : ''}`); failed++ }
}

function git(dir, args) {
  return spawnSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).stdout.trim()
}

const tmpRoots = []

function makeFixture() {
  const proj = mkdtempSync(join(tmpdir(), 'p5m-'))
  tmpRoots.push(proj)
  git(proj, ['init', '-q'])
  git(proj, ['config', 'user.email', 't@t.local'])
  git(proj, ['config', 'user.name', 't'])

  // 挂载点：main.py（include_router prefix 与 router 文件分离——用户实证形态）
  mkdirSync(join(proj, 'backend', 'app'), { recursive: true })
  writeFileSync(join(proj, 'backend', 'app', 'main.py'), [
    'from fastapi import FastAPI',
    'app = FastAPI()',
    'app.include_router(daemon_router, prefix="/api")',
  ].join('\n'), 'utf8')
  // router 文件：自带子前缀，装饰器路径不含挂载前缀 → 提取口径 /daemon/machines
  mkdirSync(join(proj, 'backend', 'app', 'modules', 'daemon'), { recursive: true })
  writeFileSync(join(proj, 'backend', 'app', 'modules', 'daemon', 'router.py'), [
    'from fastapi import APIRouter',
    'router = APIRouter(prefix="/daemon")',
    '',
    '@router.get("/machines")',
    'async def list_machines():',
    '    pass',
  ].join('\n'), 'utf8')
  // 前端：全路径调用（挂载前缀 + 子前缀 + 路径）+ 真缺失调用
  mkdirSync(join(proj, 'web'), { recursive: true })
  writeFileSync(join(proj, 'web', 'api.ts'), [
    'export const listMachines = () => apiFetch("/api/daemon/machines")',
    '// separator',
    '// separator',
    'export const broken = () => apiFetch("/api/genuinely-missing")',
  ].join('\n'), 'utf8')
  return proj
}

// 1+2. verifyApiParity 端到端：欠前缀端点对齐匹配、真缺失仍报
{
  const proj = makeFixture()
  const r = verifyApiParity(join(proj, '.sillyspec'), proj, null, null)
  assert(r.missingBackend.length === 1, '欠前缀端点经挂载前缀对齐匹配，仅真缺失报 missing',
    JSON.stringify(r.missingBackend))
  assert(r.missingBackend[0].path === '/api/genuinely-missing', '报的是真缺失路径',
    JSON.stringify(r.missingBackend))
  assert(r.prefixAlignedCount === 1, 'prefixAlignedCount=1（/api/daemon/machines 剥 /api 匹配）',
    `actual=${r.prefixAlignedCount}`)
  assert(!r.ok, '有真缺失 → ok=false')
  assert((r.summary || '').includes('mount-prefix'), 'summary 披露挂载前缀对齐口径', r.summary)
  assert(r.unusedBackend.length === 0, '欠前缀端点不再误报 unused', JSON.stringify(r.unusedBackend))
}

// 3. 渲染层披露对齐数（报告不静默）
{
  const proj = makeFixture()
  const r = verifyApiParity(join(proj, '.sillyspec'), proj, null, null)
  const report = renderVerifyProbesReport({
    probe1: { matches: [], globEntries: [], worktreeHits: 0, skippedFiles: [] },
    probe3: { tasks: [], note: 'n/a' },
    probe5: r,
    probe6: { deletions: [], note: 'n/a' },
  })
  assert(report.includes('挂载前缀对齐匹配'), '探针 5 报告含挂载前缀对齐说明行')
}

for (const root of tmpRoots) {
  try { rmSync(root, { recursive: true, force: true }) } catch {}
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
console.log(`${'='.repeat(50)}`)

if (failed > 0) {
  console.error('\n💥 probe5 挂载前缀对齐测试有失败！')
  throw new Error('test failed')
} else {
  console.log('\n✅ 全部通过 — probe5 挂载前缀对齐 OK')
}
