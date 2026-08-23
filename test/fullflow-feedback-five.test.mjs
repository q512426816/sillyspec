/**
 * 五坑回归（2026-08-23 完整流程反馈）：
 *   ① execute 末步 --done 矛盾态（无 pending 但 status 非 completed）→ 自动重播种自愈
 *   ② autoCheck 勾选写入目标漂移锚定（specDriftAnchor 优先，不再写进 worktree 副本）
 *   ③ modules 子模块 link 后验证（linked 报成功但 node_modules 缺 → 降 failed）
 *   ④ 探针5 前端调用收窄到本变更 diff（全仓调用 × 局部登记的误报噪音消除）
 *   ⑤ execute/verify 启动时共享主仓竞态 advisory
 */
import fs from 'fs'
import path from 'path'
import os from 'os'
import { execSync } from 'child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { verifyApiParity } from '../src/contract-matrix.js'
import { provisionDeps } from '../src/worktree-deps.js'
import { buildWavePrompt } from '../src/stages/execute.js'

const __dirname = fileURLToPath(import.meta.url).replace(/[^/\\]+$/, '')
const root = join(__dirname, '..')
const binCLI = join(root, 'bin', 'sillyspec.js')
const imp = (p) => import(pathToFileURL(join(root, p)).href)
import { join } from 'node:path'

let failed = 0, total = 0
const failures = []
function assertTrue(cond, msg) {
  total++
  if (cond) console.log(`  ✅ PASS: ${msg}`)
  else { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
}
function run(cmd) {
  try { return { out: execSync(cmd + ' 2>&1', { encoding: 'utf8', timeout: 90000, shell: true }), status: 0 } }
  catch (e) { return { out: (e.stdout || '') + (e.stderr || ''), status: e.status } }
}
function sh(cmd, cwd) { execSync(cmd, { cwd, stdio: 'pipe' }) }
const tmpDirs = []
function mkRepo(prefix) {
  const d = join(os.tmpdir(), `ff5-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`)
  tmpDirs.push(d)
  fs.mkdirSync(d, { recursive: true })
  sh('git init -q -b main', d)
  sh('git config user.email t@t && git config user.name t', d)
  sh('git config core.autocrlf false', d)
  fs.writeFileSync(join(d, 'base.txt'), 'base\n')
  sh('git add -A && git commit -qm base', d)
  return d
}
const cleanupAll = () => { for (const d of tmpDirs) { try { fs.rmSync(d, { recursive: true, force: true }) } catch {} } }

console.log('=== ④ 探针5 前端调用收窄到本变更 diff（坑 probe5-fullrepo-frontend-noise）===\n')
{
  const d = mkRepo('scope')
  // 存量旧调用（不在本变更 diff，对不上局部登记——此前全量误报的来源）+ 本变更新调用
  fs.writeFileSync(join(d, 'old-fe.tsx'), 'fetch("/api/old/noise")\n')
  fs.writeFileSync(join(d, 'backend-r.py'), '@router.get("/api/new")\ndef f(): pass\n')
  fs.writeFileSync(join(d, 'new-fe.tsx'), '// placeholder\n')
  sh('git add -A && git commit -qm base', d)
  fs.writeFileSync(join(d, 'new-fe.tsx'), 'fetch("/api/new")\n') // 本变更 diff 只改这个
  const rt = path.join(d, '.rt')
  fs.mkdirSync(path.join(rt, 'contract-artifacts', 'cn9', 't1'), { recursive: true })
  fs.writeFileSync(join(rt, 'contract-artifacts', 'cn9', 't1', 'endpoints.json'),
    JSON.stringify({ endpoints: [{ method: 'GET', path: '/api/new', source: 'backend-r.py' }] }))
  const r = verifyApiParity(d, d, rt, 'cn9')
  assertTrue(r.ok === true && r.missingBackend.length === 0, `存量调用（不在 diff）不再误报 missing（实得 ${r.missingBackend.length}）`)
  assertTrue(r.summary.includes('change-diff'), `summary 标注 scope=change-diff（${r.summary.slice(-50)}）`)
  // 无 changeName（CLI contractScan 全仓场景）仍全仓
  const r2 = verifyApiParity(d, d, rt, null)
  assertTrue(r2.summary.includes('full-repo'), '无 changeName → 全仓口径（零回归）')
  // diff 内调用对不上登记仍报（底线）——liveEndpoints 会现算出 /api/new，diff 内只调
  // unregistered（不在后端也不在登记）→ 报 1 个 missing
  fs.writeFileSync(join(d, 'new-fe.tsx'), 'fetch("/api/unregistered")\n')
  const r3 = verifyApiParity(d, d, rt, 'cn9')
  assertTrue(r3.ok === false && r3.missingBackend.length === 1 && r3.missingBackend[0].path === '/api/unregistered',
    `diff 内未登记调用仍报 missing（实得 ${JSON.stringify(r3.missingBackend.map(m => m.path))}）`)
}

console.log('\n=== ③ modules 子模块 link 后验证（坑 modules-submodule-link-verify）===\n')
{
  const d = mkRepo('submod')
  const main = path.join(d, 'main'); const wt = path.join(d, 'wt'); const spec = path.join(d, 'spec')
  fs.mkdirSync(main); fs.mkdirSync(wt); fs.mkdirSync(spec)
  for (const sub of ['frontend']) {
    fs.mkdirSync(path.join(main, sub)); fs.mkdirSync(path.join(wt, sub))
    fs.writeFileSync(path.join(main, sub, 'package.json'), JSON.stringify({ name: sub, dependencies: { vue: '3' } }))
    fs.writeFileSync(path.join(wt, sub, 'package.json'), JSON.stringify({ name: sub, dependencies: { vue: '3' } }))
    fs.writeFileSync(path.join(main, sub, 'pnpm-lock.yaml'), 'lock-same')
    fs.writeFileSync(path.join(wt, sub, 'pnpm-lock.yaml'), 'lock-same')
    // main 的 frontend/node_modules 故意缺失（漏链源）——linkOneDir 会 skip 而非 linked
  }
  fs.writeFileSync(path.join(spec, 'local.yaml'),
    'project:\n  type: generic\nmodules:\n  frontend: { path: "frontend/", test: "cd frontend && pnpm test" }\n')
  const r = provisionDeps(wt, main, { specBase: spec })
  // main 无 node_modules → linkOneDir skipped → 不误报 linked；核心断言：绝不出现「linked 但目录缺」
  const mod = (r.depsModules || []).find(m => m.path === 'frontend')
  assertTrue(!mod || mod.status !== 'linked' || fs.existsSync(path.join(wt, 'frontend', 'node_modules')),
    `linked 状态必伴随 node_modules 实存（实得 ${mod ? mod.status : '未参与'}）`)
  // main 有 node_modules 的正向场景：linked + 实存
  fs.mkdirSync(path.join(main, 'frontend', 'node_modules'))
  fs.writeFileSync(path.join(main, 'frontend', 'node_modules', '.keep'), '')
  const r2 = provisionDeps(wt, main, { specBase: spec })
  const mod2 = (r2.depsModules || []).find(m => m.path === 'frontend')
  assertTrue(mod2 && mod2.status === 'linked' && fs.existsSync(path.join(wt, 'frontend', 'node_modules')),
    `main 有 node_modules → linked + junction 实存（实得 ${mod2 ? mod2.status : '无'}）`)
}

console.log('\n=== ① 矛盾态自愈 + ② autoCheck 漂移锚定（源码契约锁定）===\n')
{
  const src = fs.readFileSync(join(root, 'src', 'run', 'complete.js'), 'utf8')
  assertTrue(src.includes('状态机矛盾') && src.includes('ensureStageSteps'), '① completeStep 矛盾态分支调用 ensureStageSteps 重播种自愈')
  assertTrue(src.includes('重播种后仍无待完成步骤'), '① 自愈失败给精确指引（reset/doctor）')
  assertTrue(src.includes('specDriftAnchor') && src.includes('autocheck-worktree-tasks-lost'),
    '② autoCheckPlanFromReviews 的 changeDir 走 specDriftAnchor 优先（不再写进 worktree 副本）')
  const stageSrc = fs.readFileSync(join(root, 'src', 'run', 'stage.js'), 'utf8')
  assertTrue(stageSrc.includes('parallel-shared-main-race') && stageSrc.includes('精确 pathspec'),
    '⑤ execute/verify 启动时共享主仓竞态 advisory（pathspec 提示）')
  // e2e：矛盾态 --done 自愈
  const d = mkRepo('selfh')
  run(`node "${binCLI}" --dir "${d}" init`)
  const cn = '2026-08-23-contradiction'
  const cd = path.join(d, '.sillyspec', 'changes', cn)
  fs.mkdirSync(cd, { recursive: true })
  fs.writeFileSync(path.join(cd, 'plan.md'), '---\nplan_level: none\n---\n# Plan\n')
  const { ProgressManager } = await imp('src/progress.js')
  const pm = new ProgressManager({ specDir: path.join(d, '.sillyspec') })
  pm.init(d); pm.initChange(d, cn)
  const progress = pm.read(d, cn)
  progress.currentChange = cn
  progress.currentStage = 'execute'
  // 矛盾态：步骤全 completed 但阶段 status 停在 in-progress（并发半写）
  // 按 def 全名种「全 completed + status in-progress」（步数一致——入口 ensureStageSteps
  // 的步数不匹配重播种不触发，矛盾态留给 completeStep 的自愈分支处理）
  const { getStageSteps } = await imp('src/run/shared.js')
  const execDef = await getStageSteps('execute', d, progress, null)
  progress.stages.execute = { status: 'in-progress', steps: (execDef || []).map(st => ({ name: st.name, status: 'completed' })) }
  pm._write(d, progress, cn)
  // in-place meta + depsStatus n/a（execute deps 门放行——矛盾态自愈与 worktree 无关）
  const wtMetaDir = join(d, '.sillyspec', '.runtime', 'worktrees', cn)
  fs.mkdirSync(wtMetaDir, { recursive: true })
  fs.writeFileSync(join(wtMetaDir, 'meta.json'), JSON.stringify({
    changeName: cn, worktreePath: d, mode: 'in-place-fallback',
    baseHash: execSync('git rev-parse HEAD', { cwd: d, encoding: 'utf8' }).trim(),
    branch: 'sillyspec/' + cn, depsStatus: 'n/a', depsLockHash: 'none', depsCheckedAt: new Date().toISOString(),
  }))
  const r = run(`node "${binCLI}" --dir "${d}" run execute --done --change ${cn} --output "收尾"`)
  assertTrue(r.out.includes('状态机矛盾') && r.out.includes('重播种'), `矛盾态触发自愈路径（尾 200：${r.out.slice(-200).replace(/\n/g, ' ')}）`)
}

cleanupAll()
console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
if (failures.length) { console.log('失败项:'); failures.forEach(f => console.log('  - ' + f)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
