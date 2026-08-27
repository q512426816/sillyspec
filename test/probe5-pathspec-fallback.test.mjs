/**
 * 探针 5 前端范围兜底链（坑 probe5-single-task-artifact-scope，2026-08-28 用户实证：
 * apply+commit/cleanup 后主仓 diff 为空 → 回退全仓调用 × 本变更局部端点 = 150 条假 missing）。
 *
 * _resolveDiffFilesForParity 兜底链：worktree meta diff → 主仓 diff（他者过滤）→
 * apply-pathspec-<change>.txt → null（调用方全仓）。
 *
 * 覆盖：
 * 1. 主仓 diff 空 + apply-pathspec 在 → 前端调用收窄到 pathspec 文件（范围外调用不算 missing）
 * 2. 对照：diff 空 + 无 pathspec → 全仓（旧噪音行为，文档口径）
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'

import { verifyApiParity } from '../src/contract-matrix.js'

let passed = 0, failed = 0
const failures = []
function assert(cond, msg) {
  if (cond) { console.log(`  ✅ PASS: ${msg}`); passed++ }
  else { console.log(`  ❌ FAIL: ${msg}`); failed++; failures.push(msg) }
}
function git(dir, args) {
  const r = spawnSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  return r.status === 0 ? r.stdout.trim() : null
}

const tmpRoots = []
function mkTmp(prefix) {
  const d = mkdtempSync(join(tmpdir(), `p5p-${prefix}-`))
  tmpRoots.push(d)
  return d
}

function makeFixture() {
  const proj = mkTmp('proj')
  const specBase = join(proj, '.sillyspec')
  git(proj, ['init', '-q'])
  git(proj, ['config', 'user.email', 't@t.local'])
  git(proj, ['config', 'user.name', 't'])
  writeFileSync(join(proj, '.gitignore'), '.sillyspec/\n')
  mkdirSync(join(proj, 'web'), { recursive: true })
  // page.js：本变更 apply 过的文件——一个已配端点调用 + 一个真缺失调用
  writeFileSync(join(proj, 'web', 'page.js'),
    'export function load() {\n  fetch("/api/hit")\n  fetch("/api/page-missing")\n}\n')
  // other.js：范围外存量文件——调用未登记端点（口径错配时才会被算成 missing 的那类噪音）
  writeFileSync(join(proj, 'web', 'other.js'),
    'export function other() {\n  fetch("/api/outside-noise")\n}\n')
  git(proj, ['add', '.'])
  git(proj, ['commit', '-q', '-m', 'init'])
  // 局部端点 artifact（单 task 形态）：只有 /api/hit
  const artifactDir = join(specBase, '.runtime', 'contract-artifacts', 'p5p', 'task-1')
  mkdirSync(artifactDir, { recursive: true })
  writeFileSync(join(artifactDir, 'endpoints.json'), JSON.stringify({
    task: 'task-1', type: 'backend_endpoints',
    endpoints: [{ method: 'GET', path: '/api/hit', source: 'daemon/router.py' }],
  }))
  return { proj, specBase, runtimeRoot: join(specBase, '.runtime') }
}

console.log('=== 探针 5：apply-pathspec 兜底（diff 空时不回退全仓）===\n')
{
  const { proj, specBase, runtimeRoot } = makeFixture()
  // 主仓 diff 干净（全部已 commit = apply+commit 后形态）+ apply-pathspec 只含 page.js
  writeFileSync(join(runtimeRoot, 'apply-pathspec-p5p.txt'), 'web/page.js\n')
  const r = verifyApiParity(specBase, proj, runtimeRoot, 'p5p')
  console.log(`  summary: ${r.summary}`)
  const missingPaths = r.missingBackend.map(m => m.path)
  assert(missingPaths.includes('/api/page-missing'), '范围内真缺失调用仍报 missing（收窄不许变全过）')
  assert(!missingPaths.includes('/api/outside-nooise') && !missingPaths.includes('/api/outside-noise'),
    `范围外存量调用不算 missing（噪音剔除；实际 ${JSON.stringify(missingPaths)}）`)
  assert(r.summary.includes('change-diff'), 'scope 标注为 change-diff（agent 可判定口径可信）')
}
{
  const { proj, specBase, runtimeRoot } = makeFixture()
  // 对照：diff 空 + 无 pathspec → 全仓兜底（旧行为留档：噪音口径）
  const r = verifyApiParity(specBase, proj, runtimeRoot, 'p5p')
  const missingPaths = r.missingBackend.map(m => m.path)
  assert(missingPaths.includes('/api/outside-noise'), '对照：无 pathspec 时全仓口径（范围外调用计入 missing——兜底链缺失时的旧噪音形态）')
  assert(r.summary.includes('full-repo'), 'scope 标注 full-repo（printVerifyParityCheck 会打口径错配告警）')
}

for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} }
console.log('=== endpoints extract --all-tasks 聚合模式（探针 5 口径对齐）===\n')
{
  const proj = mkTmp('agg')
  const specBase = join(proj, '.sillyspec')
  git(proj, ['init', '-q'])
  git(proj, ['config', 'user.email', 't@t.local'])
  git(proj, ['config', 'user.name', 't'])
  writeFileSync(join(proj, '.gitignore'), '.sillyspec/\n')
  mkdirSync(join(proj, 'backend'), { recursive: true })
  writeFileSync(join(proj, 'backend', 'router_a.py'),
    'from fastapi import APIRouter\nrouter = APIRouter()\n\n@router.get("/api/a")\ndef a():\n    return {}\n')
  writeFileSync(join(proj, 'backend', 'router_b.py'),
    'from fastapi import APIRouter\nrouter = APIRouter()\n\n@router.post("/api/b")\ndef b():\n    return {}\n')
  git(proj, ['add', '.'])
  git(proj, ['commit', '-q', '-m', 'init'])
  const changeDir = join(specBase, 'changes', 'agg')
  mkdirSync(join(changeDir, 'tasks'), { recursive: true })
  writeFileSync(join(changeDir, 'tasks', 'task-01.md'),
    '---\nid: task-01\nallowed_paths: [backend/router_a.py]\n---\n# task-01\n')
  writeFileSync(join(changeDir, 'tasks', 'task-02.md'),
    '---\nid: task-02\nallowed_paths: [backend/router_b.py]\n---\n# task-02\n')

  const cliBin = join(import.meta.dirname, '..', 'bin', 'sillyspec.js')
  const res = spawnSync(process.execPath, [cliBin, 'endpoints', 'extract', '--change', 'agg', '--all-tasks'], {
    cwd: proj, encoding: 'utf8', timeout: 60_000, stdio: ['pipe', 'pipe', 'pipe'],
  })
  const out = (res.stdout || '') + (res.stderr || '')
  assert(res.status === 0, `--all-tasks exit 0（实际 ${res.status}；${out.slice(0, 200)}）`)
  const artRoot = join(specBase, '.runtime', 'contract-artifacts', 'agg')
  const readEps = (task) => {
    const p = join(artRoot, task, 'endpoints.json')
    if (!existsSync(p)) return null
    try { return JSON.parse(readFileSync(p, 'utf8')).endpoints || [] } catch { return 'bad-json' }
  }
  const eps1 = readEps('task-01')
  const eps2 = readEps('task-02')
  assert(Array.isArray(eps1) && eps1.some(e => e.method === 'GET' && e.path === '/api/a'),
    `task-01 产物落各自目录且含 GET /api/a（实际 ${JSON.stringify(eps1)}）`)
  assert(Array.isArray(eps2) && eps2.some(e => e.method === 'POST' && e.path === '/api/b'),
    `task-02 产物落各自目录且含 POST /api/b（实际 ${JSON.stringify(eps2)}）`)
  // 互斥校验：--all-tasks 与 --task 同传 → exit 2
  const res2 = spawnSync(process.execPath, [cliBin, 'endpoints', 'extract', '--change', 'agg', '--all-tasks', '--task', 'task-01'], {
    cwd: proj, encoding: 'utf8', timeout: 60_000, stdio: ['pipe', 'pipe', 'pipe'],
  })
  assert(res2.status === 2, `--all-tasks 与 --task 互斥 exit 2（实际 ${res2.status}）`)
}

for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} }
console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
if (failures.length) console.log(`失败项: ${failures.join('; ')}`)
console.log('='.repeat(50))
process.exit(failed > 0 ? 1 : 0)
