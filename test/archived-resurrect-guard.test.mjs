/**
 * 坑 archived-change-resurrect-by-merge 回归：远端 merge 把已归档变更旧四件套带回活跃
 * 路径 → run <stage> 自动注册幽灵行 + doctor 无检测。
 *
 * 锁定：
 *   ① run verify --change <同名>：活跃目录 + archive 同名 + 库内无活跃行 → 拒绝注册
 *      （exit 2 + 幽灵复活指认），不建进度行；
 *   ② 库内有活跃行（正常在途变更 + 已有归档同名旧档并存）→ 照常放行（不误拦恢复场景）；
 *   ③ doctor archive_integrity：同名并存 → FAILED + resurrected 清单 + 勿 align 警示。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ProgressManager } from '../src/progress.js'
const { detectArchiveIntegrity } = await import('../src/doctor-diagnostics.js')

const CLI = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'index.js')
const tmpRoots = []
function makeRepo() {
  const cwd = mkdtempSync(join(tmpdir(), 'ghost-'))
  tmpRoots.push(cwd)
  const run = (args) => execFileSync('git', args, { cwd, stdio: 'pipe' }).toString().trim()
  run(['init', '-q']); run(['config', 'user.email', 't@t']); run(['config', 'user.name', 't'])
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), 'project:\n  type: generic\ncommands:\n  test: "node -e \\"0\\""\n')
  writeFileSync(join(cwd, 'base.txt'), 'base\n')
  run(['add', '.']); run(['commit', '-q', '-m', 'base'])
  return { cwd, run }
}
function cli(cwd, args) {
  return spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf8', timeout: 120_000, env: { ...process.env, SILLYSPEC_WATCHER: '0' } })
}
test.onFinish?.(() => { for (const t of tmpRoots) rmSync(t, { recursive: true, force: true }) })

test('① 幽灵复活：活跃目录 + archive 同名 + 库无活跃行 → run verify 拒绝注册', () => {
  const { cwd } = makeRepo()
  const cn = '2026-10-10-ghost-x'
  // 归档侧（完整终态形态）+ 幽灵活跃侧（merge 带回的旧四件套）
  const archDir = join(cwd, '.sillyspec', 'changes', 'archive', cn)
  mkdirSync(archDir, { recursive: true })
  writeFileSync(join(archDir, 'design.md'), '# v2 终版\n')
  const activeDir = join(cwd, '.sillyspec', 'changes', cn)
  mkdirSync(activeDir, { recursive: true })
  writeFileSync(join(activeDir, 'design.md'), '# v1 旧版（merge 带回）\n')
  const r = cli(cwd, ['run', 'verify', '--change', cn])
  assert.notEqual(r.status, 0, '应拒绝注册')
  const out = r.stdout + r.stderr
  assert.ok(out.includes('幽灵复活'), `指认幽灵复活：${out.split('\n').filter((l) => l.includes('幽灵')).join(' | ')}`)
  assert.ok(out.includes(`changes/archive/${cn}`), '指向归档侧工件')
  // 未注册幽灵进度行
  const pm = new ProgressManager({ specDir: join(cwd, '.sillyspec') })
  const row = pm._ensureDB(cwd).getDb().prepare('SELECT status FROM changes WHERE name = ?').get(cn)
  assert.equal(row, undefined, '不建幽灵进度行')
})

test('② 库内有活跃行的同名并存（归档后重开恢复场景）→ 放行', () => {
  const { cwd } = makeRepo()
  const cn = '2026-10-10-reopen-x'
  mkdirSync(join(cwd, '.sillyspec', 'changes', 'archive', cn), { recursive: true })
  // 先注册活跃行（模拟恢复归档流程：行在库、目录回活跃）
  const pm = new ProgressManager({ specDir: join(cwd, '.sillyspec') })
  pm.initChange(cwd, cn)
  const r = cli(cwd, ['run', 'verify', '--change', cn])
  const out = r.stdout + r.stderr
  assert.ok(!out.includes('幽灵复活'), '有活跃行不拦（恢复场景）')
})

test('③ doctor：同名并存 → archive_integrity FAILED + resurrected 清单 + 勿 align', () => {
  const { cwd } = makeRepo()
  const cn = '2026-10-10-doc-x'
  mkdirSync(join(cwd, '.sillyspec', 'changes', 'archive', cn), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', 'changes', 'archive', cn, 'plan.md'), '# P\n')
  mkdirSync(join(cwd, '.sillyspec', 'changes', cn), { recursive: true })
  const dim = detectArchiveIntegrity(cwd, join(cwd, '.sillyspec'))
  assert.equal(dim.pass, false, '同名并存应 FAILED')
  assert.equal(dim.severity, 'failed')
  assert.deepEqual(dim.resurrected, [cn], 'resurrected 清单点名')
  assert.ok(dim.findings.some((f) => f.includes('勿用 --align-execute-progress')), '勿 align 警示')
  // 干净仓零误报
  rmSync(join(cwd, '.sillyspec', 'changes', cn), { recursive: true, force: true })
  const dim2 = detectArchiveIntegrity(cwd, join(cwd, '.sillyspec'))
  assert.notEqual(dim2.pass, false, '清幽灵后不 FAILED')
})
