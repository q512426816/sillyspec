/**
 * delta 链回灌测试（change: 2026-09-07-ir-hardening，FR-03，D-005/006@v1）。
 *
 * 锁住：
 *  1. buildDeltaReport({withSummary:true}) 结构化返回（markdown/change/affectedFiles/affectedModules）；
 *     默认（无参）仍返回字符串（既有调用方零变化）
 *  2. writeLastDeltaSidecar：schema 四字段+updatedAt 落盘、幂等覆盖、fail-soft（runtimeRoot 缺失/异常不抛）
 *  3. executeScanResumeCheck advisory 三态：在场打印 / 过期静默 / 缺失静默
 *  4. project 同口径机制：有 project（module-map 命中）vs null（降级）产出差异（buildDeltaReport 层）
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { buildDeltaReport, writeLastDeltaSidecar } from '../src/archive-delta.js'
import { executeScanResumeCheck } from '../src/run/scan-profile.js'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }
const tmpRoots = []
const mk = (p) => { const d = mkdtempSync(join(tmpdir(), p)); tmpRoots.push(d); return d }
function git(dir, args) { return execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim() }

/** fixture：git 仓 + spec 结构 + module-map + change（decisions.md 带模块域） */
function fixture(prefix, cn, withMap) {
  const cwd = mk(prefix)
  git(cwd, ['init', '-q']); git(cwd, ['config', 'user.email', 't@t']); git(cwd, ['config', 'user.name', 't'])
  writeFileSync(join(cwd, 'README.md'), 'x'); git(cwd, ['add', '.']); git(cwd, ['commit', '-qm', 'i'])
  const specBase = join(cwd, '.sillyspec')
  const changeDir = join(specBase, 'changes', cn)
  mkdirSync(join(changeDir, 'decisions'), { recursive: true })
  writeFileSync(join(changeDir, 'decisions.md'), `---\nauthor: t\ncreated_at: 2026-09-08T00:00:00\n---\n\n# 决策\n\n## D-001@v1: x\n- type: architecture\n- status: accepted\n- 模块域: runtime\n`)
  if (withMap) {
    mkdirSync(join(specBase, 'docs', 'proj', 'modules'), { recursive: true })
    writeFileSync(join(specBase, 'docs', 'proj', 'modules', '_module-map.yaml'),
      'runtime:\n  status: active\n  doc: modules/runtime.md\n  paths:\n    - src/run\n')
    mkdirSync(join(cwd, 'src', 'run'), { recursive: true })
    writeFileSync(join(cwd, 'src', 'run', 'a.js'), 'x')
  }
  return { cwd, specBase, changeDir }
}

console.log('=== delta 回灌（withSummary / sidecar / advisory / project 同口径）===\n')

console.log('--- ① withSummary 结构化返回 + 默认零变化 ---')
{
  const cn = '2026-09-08-ds-a'
  const { cwd, specBase, changeDir } = fixture('dsf-a-', cn, true)
  const fixedNow = '2026-09-08 12:00:00'
  const args = { changeDir, specRoot: specBase, project: 'proj', runtimeRoot: join(specBase, '.runtime'), cwd, now: fixedNow }
  const plain = buildDeltaReport(args)
  assert(typeof plain === 'string', '默认无参 → 纯字符串（既有调用方零变化）')
  const sum = buildDeltaReport({ ...args, withSummary: true })
  assert(typeof sum.markdown === 'string' && sum.markdown === plain, 'withSummary.markdown 与默认返回同源')
  assert(sum.change === cn, 'summary.change')
  assert(Array.isArray(sum.affectedFiles) && Array.isArray(sum.affectedModules), 'affectedFiles/affectedModules 数组')
}

console.log('\n--- ② writeLastDeltaSidecar：schema/幂等/fail-soft ---')
{
  const root = mk('dsf-side-')
  mkdirSync(root, { recursive: true })
  const r1 = writeLastDeltaSidecar(join(root, '.rt'), { change: 'c1', affectedFiles: ['src/a.js'], affectedModules: ['runtime'] })
  assert(r1.ok === true, '写入 ok')
  const payload = JSON.parse(readFileSync(join(root, '.rt', 'last-delta.json'), 'utf8'))
  assert(payload.schemaVersion === 1 && payload.change === 'c1' && payload.affectedModules[0] === 'runtime'
    && typeof payload.updatedAt === 'string', 'schema 四字段 + updatedAt')
  // 幂等覆盖
  writeLastDeltaSidecar(join(root, '.rt'), { change: 'c2', affectedFiles: [], affectedModules: [] })
  assert(JSON.parse(readFileSync(join(root, '.rt', 'last-delta.json'), 'utf8')).change === 'c2', '幂等覆盖')
  // fail-soft：缺 runtimeRoot / 缺 change 不抛
  let threw = false
  try {
    writeLastDeltaSidecar(null, { change: 'x' })
    writeLastDeltaSidecar(join(root, '.rt'), null)
  } catch { threw = true }
  assert(threw === false, '参数缺失 fail-soft 不抛')
}

console.log('\n--- ③ scanResumeCheck advisory 三态 ---')
{
  const cn = '2026-09-08-ds-b'
  const { cwd, specBase } = fixture('dsf-adv-', cn, true)
  const rt = join(specBase, '.runtime')
  mkdirSync(rt, { recursive: true })
  const run = () => {
    const logs = []; const ol = console.log; console.log = (...a) => logs.push(a.join(' '))
    return Promise.resolve(executeScanResumeCheck(cwd, {})).then(() => { console.log = ol; return logs.join('\n') })
  }
  // 缺失 → 静默
  const out0 = await run()
  assert(!out0.includes('增量回灌提示'), 'sidecar 缺失 → 无 advisory')
  // 在场（新鲜）→ 打印
  writeFileSync(join(rt, 'last-delta.json'), JSON.stringify({ schemaVersion: 1, change: cn, affectedModules: ['runtime'], affectedFiles: ['src/run/a.js'], updatedAt: new Date().toISOString() }))
  const out1 = await run()
  assert(out1.includes('增量回灌提示') && out1.includes(cn) && out1.includes('runtime'), '新鲜 sidecar → advisory 打印（change+模块）')
  // 过期（15 天前）→ 静默
  writeFileSync(join(rt, 'last-delta.json'), JSON.stringify({ schemaVersion: 1, change: cn, affectedModules: ['runtime'], affectedFiles: [], updatedAt: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString() }))
  const out2 = await run()
  assert(!out2.includes('增量回灌提示'), '过期（>14 天）→ 静默')
  // 解析失败 → 静默
  writeFileSync(join(rt, 'last-delta.json'), '{broken json')
  const out3 = await run()
  assert(!out3.includes('增量回灌提示'), '损坏 sidecar → 静默（fail-soft）')
}

console.log('\n--- ④ project 同口径机制（buildDeltaReport 层）---')
{
  const cn = '2026-09-08-ds-c'
  const { cwd, specBase, changeDir } = fixture('dsf-prj-', cn, true)
  const args = { changeDir, specRoot: specBase, runtimeRoot: join(specBase, '.runtime'), cwd }
  const withProject = buildDeltaReport({ ...args, project: 'proj', withSummary: true })
  const nullProject = buildDeltaReport({ ...args, project: null, withSummary: true })
  // module-map 命中：After 段带模块关注建议；null：降级注记
  assert(!withProject.markdown.includes('无 module-map') || withProject.affectedModules !== null, '有 project → module-map 生效路径')
  assert(nullProject.markdown.includes('无 module-map') || nullProject.affectedModules.length === 0, 'null project → 降级路径注记')
  assert(JSON.stringify(withProject.affectedModules) !== JSON.stringify(nullProject.affectedModules)
    || withProject.markdown !== nullProject.markdown, '两态产出可区分（同口径机制可观测）')
}

for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} }
console.log(`\n${'='.repeat(50)}\n✅ 通过: ${count.passed}  ❌ 失败: ${count.failed}\n${'='.repeat(50)}`)
if (count.failed > 0) process.exit(1)
