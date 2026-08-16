/**
 * execute-run-dir-fail-loud.test.mjs — task-01 / D-001@v1
 *
 * 四处 marker 写入点原子化 + 分层 fail：
 *   - stage.js（execute 启动主写入点，:96-112）、gates.js:444、prompt.js:518、task-review.js:795
 *     统一改为「mkdir execute-runs/<runId>/tasks 先于 marker 写入」（不变量：marker 在则目录在）。
 *   - 失败分层语义：
 *       stage.js    直接 throw（execute 启动即失败，优于事后 review 错配）
 *       gates.js    gate 内 throw（外层 :494 catch fail-closed 阻断完成，不静默放行）
 *       prompt.js   console.error 留痕 + 保留降级（渲染路径抛错会炸整个 prompt 输出）
 *       task-review.js 去 catch 静默，console.error 留痕但保留 fail-open 契约（:763，不 throw）
 *
 * 策略（无 mock.module / 无 flag）：
 *   - 失败注入用「真实 fs 障碍」：把 <runtimeRoot>/execute-runs 改成普通文件 → 四处 mkdir
 *     必抛 ENOTDIR（Windows/Linux/macOS 一致；已验证 node v24，不依赖 chmod 语义）。
 *     注意：只动 execute-runs 子树，不 rmSync runtimeRoot——测试进程 pm 持有的
 *     sillyspec.db 就在 runtimeRoot 下，Windows 上 rmSync 含打开句柄的目录会 EPERM。
 *   - 子进程（spawnSync bin/sillyspec.js）触发 stage.js / gates.js 路径（隔离 process.exit）。
 *     prompt.js 渲染路径 CLI 层面无法隔离（marker 失败时 stage.js 主写入点先 throw，
 *     prompt.js 永远跑不到）→ 直接 in-process 调 outputStep 触发，断言 console.error + 不抛。
 *   - task-review.js in-process 调 generateTaskReviewDrafts；失败侧用「空 changedFiles 的 task」
 *     隔离 marker 写入点语义（草稿循环本身的 mkdir 抛错是既有行为，由调用方 complete.js:244
 *     / index.js:511 catch 兜底 fail-open，不在本写入点职责内）。
 */
import { spawnSync, execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, mkdirSync, existsSync, rmSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { ProgressManager } from '../src/progress.js'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(here, '..')
const binCLI = join(repoRoot, 'bin', 'sillyspec.js')

let total = 0, failed = 0
const failures = []
function assert(cond, msg) {
  total++
  if (cond) console.log(`  ✅ PASS: ${msg}`)
  else { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
}
function git(dir, args) {
  return execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
}

const tmpRoots = []
const openPms = []
function makeRepo(prefix = 'erd-') {
  const cwd = mkdtempSync(join(tmpdir(), prefix)); tmpRoots.push(cwd)
  git(cwd, ['init', '-q']); git(cwd, ['config', 'user.email', 't@t.co']); git(cwd, ['config', 'user.name', 't'])
  git(cwd, ['config', 'commit.gpgsign', 'false'])
  writeFileSync(join(cwd, '.gitignore'), '.sillyspec/\n')
  writeFileSync(join(cwd, 'README.md'), 'init\n')
  git(cwd, ['add', '.']); git(cwd, ['commit', '-q', '-m', 'init'])
  const specBase = join(cwd, '.sillyspec')
  return { cwd, specBase, runtimeRoot: join(specBase, '.runtime') }
}
async function initPm(cwd, specBase, cn, setStage = false) {
  const pm = new ProgressManager({ specDir: specBase })
  openPms.push(pm)
  await pm.init(cwd); await pm.initChange(cwd, cn)
  if (setStage) await pm.setStage(cwd, 'execute', cn)
  return pm
}
// 关闭 pm 持有的 SQLite（Windows：打开句柄会挡 rmSync）
function closePms() {
  for (const pm of openPms) { try { pm._db?.close?.() } catch {} try { pm._db = null } catch {} }
  openPms.length = 0
}

// 子进程 CLI：返回 { status, combined }（status 捕获 process.exit 真实退出码）
function runCli(cwd, args) {
  const r = spawnSync(process.execPath, [binCLI, ...args], {
    cwd, encoding: 'utf8', timeout: 30000, stdio: ['pipe', 'pipe', 'pipe'],
  })
  return { status: r.status, combined: (r.stdout || '') + (r.stderr || '') }
}

// 捕获 console.error / console.log（in-process 调用用）
async function capture(fn) {
  const origErr = console.error, origLog = console.log, origWarn = console.warn
  let errBuf = '', logBuf = ''
  console.error = (...a) => { errBuf += a.join(' ') + '\n' }
  console.log = (...a) => { logBuf += a.join(' ') + '\n' }
  console.warn = () => {}
  let result, error = null
  try { result = await fn() } catch (e) { error = e }
  finally { console.error = origErr; console.log = origLog; console.warn = origWarn }
  return { result, error, errBuf, logBuf }
}

// ════════════════════════════════════════════════════════════════
console.log('=== 四处 marker 写入点原子化 + 分层 fail（D-001@v1）===\n')

// ── ① 源码顺序扫描：四处写入点 mkdir …/tasks 先于 marker + 分层语义注释 ──
console.log('--- ① 源码顺序扫描：mkdir execute-runs/<runId>/tasks 先于 marker 写入 ---')
{
  const stageSrc = readFileSync(join(repoRoot, 'src', 'run', 'stage.js'), 'utf8')
  const gatesSrc = readFileSync(join(repoRoot, 'src', 'run', 'gates.js'), 'utf8')
  const promptSrc = readFileSync(join(repoRoot, 'src', 'run', 'prompt.js'), 'utf8')
  const trSrc = readFileSync(join(repoRoot, 'src', 'task-review.js'), 'utf8')

  function siteOrder(src, from, markerWriteName) {
    const mkIdx = src.indexOf("mkdirSync(join(runtimeRoot, 'execute-runs'", from)
    const wrIdx = src.indexOf(`writeFileSync(${markerWriteName}`, from)
    if (mkIdx === -1 || wrIdx === -1) return '缺 mkdir/writeFileSync'
    if (wrIdx < mkIdx) return 'marker 写在 mkdir 之前（逆序）'
    return src.slice(mkIdx, mkIdx + 90).includes("'tasks'") ? 1 : 'mkdir 目标不含 tasks/'
  }

  const s1 = stageSrc.indexOf("currentExecuteRunId = generateExecuteRunId()")
  const g1 = gatesSrc.indexOf("executeRunId = generateExecuteRunId()")
  const p1 = promptSrc.indexOf("runId = generateExecuteRunId()")
  const t1 = trSrc.indexOf("executeRunId = generateExecuteRunId()")
  assert(siteOrder(stageSrc, s1, 'runIdFile') === 1, 'stage.js 主写入点：mkdir …/tasks 先于 marker')
  assert(siteOrder(gatesSrc, g1, 'runIdFile') === 1, 'gates.js:444 fallback：mkdir …/tasks 先于 marker')
  assert(siteOrder(promptSrc, p1, 'runIdFile') === 1, 'prompt.js:518 fallback：mkdir …/tasks 先于 marker')
  assert(siteOrder(trSrc, t1, 'runIdFile') === 1, 'task-review.js:795 fallback：mkdir …/tasks 先于 marker')

  assert(/throw new Error\(`execute run 目录创建失败/.test(stageSrc), 'stage.js throw fail-loud（含修复指引）')
  const gBlock = gatesSrc.slice(g1, g1 + 700)
  assert(!/try \{/.test(gBlock) && gBlock.includes('fail-closed'), 'gates.js 写入块无 try/catch（异常直穿外层 fail-closed catch）')
  const pBlock = promptSrc.slice(p1, p1 + 700)
  assert(pBlock.includes('execute run marker/目录写入失败') && pBlock.includes('} catch (e) {'),
    'prompt.js catch 内 console.error 留痕 + 保留降级')
  const tBlock = trSrc.slice(t1, t1 + 700)
  // 剥掉行注释再查 throw 语句——修复注释里「不 throw」的字样会误命中裸 /throw/（首版即踩此坑）
  assert(tBlock.includes('execute run marker/目录写入失败') && !/^\s*throw\b/m.test(tBlock.replace(/\/\/[^\n]*/g, '')),
    'task-review.js console.error 留痕但保留 fail-open（写入块不 throw）')
}

// ── ② 主写入点不变量（子进程 run execute 启动）：marker 在则 tasks/ 目录在 ──
console.log('\n--- ② 主写入点不变量（run execute 启动）：marker 在则目录在 ---')
{
  const { cwd, specBase, runtimeRoot } = makeRepo()
  const cn = 'invariant-main'
  await initPm(cwd, specBase, cn, true)
  writeFileSync(join(specBase, 'changes', cn, 'plan.md'),
    '# Plan\n\n## Wave 1\n\n- [ ] task-01: a\n')
  mkdirSync(join(cwd, 'src'), { recursive: true })

  const r = runCli(cwd, ['run', 'execute', '--change', cn, '--skip-approval'])
  assert(r.status === 0, `execute 启动 exit 0（实际 ${r.status}，尾输出：${r.combined.slice(-120)}）`)

  const marker = join(runtimeRoot, `current-execute-run-id-${cn}`)
  assert(existsSync(marker), 'marker 已写入')
  const runId = readFileSync(marker, 'utf8').trim()
  assert(existsSync(join(runtimeRoot, 'execute-runs', runId, 'tasks')),
    `不变量：execute-runs/<runId>/tasks/ 已建（${runId}）`)
}

// ── ③ 分层语义 A：stage.js 主写入点 throw fail-loud（子进程 exit 1 + 修复指引）──
console.log('\n--- ③ stage.js：mkdir 失败 → 直接 throw → CLI exit 1 + 修复指引 ---')
{
  const { cwd, specBase, runtimeRoot } = makeRepo()
  const cn = 'stage-throw'
  await initPm(cwd, specBase, cn, true)
  writeFileSync(join(specBase, 'changes', cn, 'plan.md'),
    '# Plan\n\n## Wave 1\n\n- [ ] task-01: a\n')
  mkdirSync(join(cwd, 'src'), { recursive: true })
  mkdirSync(runtimeRoot, { recursive: true })
  writeFileSync(join(runtimeRoot, 'execute-runs'), 'not a directory\n') // 障碍：目录位被普通文件占用

  const r = runCli(cwd, ['run', 'execute', '--change', cn, '--skip-approval'])
  assert(r.status === 1, `stage.js 主写入点失败 → exit 1（实际 ${r.status}）`)
  assert(r.combined.includes('execute run 目录创建失败'), '输出含「execute run 目录创建失败」')
  assert(r.combined.includes('请检查该路径是否为普通文件/只读'), '输出含修复指引（普通文件/只读）')
  assert(!existsSync(join(runtimeRoot, `current-execute-run-id-${cn}`)), 'marker 未写入（mkdir 失败先行）')
}

// ── ④ 分层语义 B：prompt.js 渲染路径降级（console.error 留痕，不抛，prompt 正常输出）──
// CLI 层面无法隔离 prompt.js（marker 失败时 stage.js 主写入点先 throw）→ in-process 直接调 outputStep。
console.log('\n--- ④ prompt.js：mkdir 失败 → console.error 留痕 + 保留降级（不抛，prompt 正常渲染）---')
{
  const { cwd, specBase, runtimeRoot } = makeRepo()
  const cn = 'prompt-degrade'
  const pm = await initPm(cwd, specBase, cn, true)
  writeFileSync(join(specBase, 'changes', cn, 'plan.md'),
    '# Plan\n\n## Wave 1\n\n- [ ] task-01: a\n')
  mkdirSync(runtimeRoot, { recursive: true })
  writeFileSync(join(runtimeRoot, 'execute-runs'), 'not a directory\n') // 障碍

  const { getStageSteps } = await import('../src/run/shared.js')
  const { outputStep } = await import('../src/run/prompt.js')
  const progress = await pm.read(cwd, cn)
  const steps = await getStageSteps('execute', cwd, progress, null)
  assert(steps && steps.length > 0, `buildExecuteSteps 产出步骤（${steps && steps.length}）`)
  // {EXECUTE_RUN_ID} 只在 Wave 执行步的 prompt 里（step 0「进度确认」不含）——必须定位到该步，
  // 否则 outputStep 的注入块整块跳过，后续断言全部空过（首版即踩此坑）。
  const waveIdx = steps.findIndex(s => (s.prompt || '').includes('{EXECUTE_RUN_ID}'))
  assert(waveIdx >= 0, `定位含 {EXECUTE_RUN_ID} 的 Wave 步骤（idx=${waveIdx}）`)

  const { error, errBuf, logBuf } = await capture(() => outputStep('execute', waveIdx, steps, cwd, cn, 'p', {}))
  assert(!error, `prompt.js mkdir 失败 → 不抛（降级，实际 error=${error && error.message}）`)
  assert(errBuf.includes('execute run marker/目录写入失败'), 'console.error 留痕（marker/目录写入失败）')
  assert(logBuf.includes('stage: execute'), 'prompt 仍正常渲染输出（保留降级）')
  // 降级注入的 runId 已替换占位符（无残留 {EXECUTE_RUN_ID}）
  const leftover = logBuf.match(/\{EXECUTE_RUN_ID\}/)
  assert(!leftover, 'prompt 内 {EXECUTE_RUN_ID} 已被降级 runId 替换')
  assert(!existsSync(join(runtimeRoot, `current-execute-run-id-${cn}`)), 'marker 未写入（mkdir 失败先行）')
}

// ── ⑤ 分层语义 C：gates.js gate 内 throw → 外层 fail-closed 阻断完成 ──
// 路径：首跑 run execute 写 marker+tasks（mkdir 无障碍）；随后 execute-runs 改普通文件 + 删 marker
// → --done 批量完成 → Task Review Gate 读 marker 缺失 → fallback generate + mkdir 抛 → :494 catch
// fail-closed 阻断（exitCode 1，stage 未标 completed）。plan_level: light → Stage Review tier=self 不挡。
console.log('\n--- ⑤ gates.js：gate 内 mkdir 失败 → 外层 fail-closed 阻断（不静默放行完成）---')
{
  const { cwd, specBase, runtimeRoot } = makeRepo()
  const cn = 'gates-block'
  const pm = await initPm(cwd, specBase, cn, true)
  // plan_level: light 让 Stage Review tier=self（否则 independent 缺 review 会先拦在 Stage Review Gate）
  writeFileSync(join(specBase, 'changes', cn, 'plan.md'),
    '---\nplan_level: light\n---\n\n# Plan\n\n## Wave 1\n\n- [x] task-01: a\n')
  mkdirSync(join(cwd, 'src'), { recursive: true })
  writeFileSync(join(cwd, 'src', 'app.js'), 'module.exports = 1\n') // 未提交改动 → code evidence changed
  // in-place-fallback 无 baseHash → checkExecuteCodeEvidence 走 path 3（主工作区未提交改动=changed）
  const wtPath = join(runtimeRoot, 'worktrees', cn)
  mkdirSync(wtPath, { recursive: true })
  writeFileSync(join(wtPath, 'meta.json'), JSON.stringify({
    changeName: cn, mode: 'in-place-fallback', worktreePath: wtPath,
    depsStatus: 'n/a', baselineFiles: [],
  }))

  // 首跑入口：stage.js mkdir+marker 无障碍写入；同时初始化 execute steps
  let r = runCli(cwd, ['run', 'execute', '--change', cn, '--skip-approval'])
  assert(r.status === 0, `前置 execute 启动 exit 0（实际 ${r.status}，尾输出：${r.combined.slice(-150)}）`)

  // 种子进度：Wave 前全部 completed、Wave 1 执行 pending → --done 批量完成 → 进阶段完成分支
  const realSteps = (await pm.read(cwd, cn)).stages.execute.steps
  const waveIdx = realSteps.findIndex(s => s.name.includes('Wave 1 执行'))
  const progress = await pm.read(cwd, cn)
  progress.stages.execute.steps = realSteps.map((s, i) => ({ name: s.name, status: i < waveIdx ? 'completed' : 'pending' }))
  await pm._write(cwd, progress, cn)

  // 障碍：execute-runs 改普通文件 + 删 marker（gate fallback 重新 generate + mkdir 必抛）
  rmSync(join(runtimeRoot, 'execute-runs'), { recursive: true, force: true })
  writeFileSync(join(runtimeRoot, 'execute-runs'), 'not a directory\n')
  rmSync(join(runtimeRoot, `current-execute-run-id-${cn}`), { force: true })

  r = runCli(cwd, ['run', 'execute', '--done', '--change', cn, '--skip-approval', '--output', 'step done'])
  assert(r.status === 1, `gate 失败 → exit 1（fail-closed，实际 ${r.status}，尾输出：${r.combined.slice(-220)}）`)
  assert(r.combined.includes('Task Review Gate 异常'),
    `输出含 fail-closed 阻断文案「Task Review Gate 异常」（尾输出：${r.combined.slice(-260)}）`)
  const after = await pm.read(cwd, cn)
  assert(after.stages.execute.status !== 'completed',
    `DB: execute stage 未标 completed（rollback 生效，实际 ${after.stages.execute.status}）`)
}

// ── ⑥ 分层语义 D：task-review.js 去静默保 fail-open（console.error 留痕，不 throw，返回统计）──
console.log('\n--- ⑥ task-review.js：mkdir 失败 → console.error 留痕但保留 fail-open（不 throw）---')
{
  const { cwd, specBase, runtimeRoot } = makeRepo()
  const cn = 'taskreview-open'
  await initPm(cwd, specBase, cn, false)
  const tasksDir = join(specBase, 'changes', cn, 'tasks')
  mkdirSync(tasksDir, { recursive: true })
  const taskCard = (allowed) =>
    '---\nid: task-01\nallowed_paths:\n' + allowed.map(p => `  - ${p}`).join('\n') + '\n---\n\n# task-01\n\ngoal: ...\n'
  writeFileSync(join(tasksDir, 'task-01.md'), taskCard(['app.js']))
  writeFileSync(join(specBase, 'changes', cn, 'plan.md'),
    '# Plan\n\n## Wave 1\n\n- [ ] task-01: a\n')
  // in-place-fallback base=HEAD（先记）→ 再落一笔 commit 让 base..HEAD diff 非空
  const wtPath = join(runtimeRoot, 'worktrees', cn)
  mkdirSync(wtPath, { recursive: true })
  const base = git(cwd, ['rev-parse', 'HEAD'])
  writeFileSync(join(wtPath, 'meta.json'), JSON.stringify({
    changeName: cn, mode: 'in-place-fallback', worktreePath: wtPath,
    baseHash: base, baselineCommit: base, depsStatus: 'n/a', baselineFiles: [],
  }))
  writeFileSync(join(cwd, 'app.js'), 'console.log(1)\n')
  git(cwd, ['add', '-A']); git(cwd, ['commit', '-q', '-m', 'work'])

  const { generateTaskReviewDrafts } = await import('../src/task-review.js')
  const marker = join(runtimeRoot, `current-execute-run-id-${cn}`)

  // 成功侧：marker + tasks 目录齐备（不变量），task-01 草稿落盘
  let r1 = (await capture(() => generateTaskReviewDrafts({ changeName: cn, cwd }))).result
  assert(existsSync(marker), '成功侧：marker 已写入')
  const runId = readFileSync(marker, 'utf8').trim()
  assert(existsSync(join(runtimeRoot, 'execute-runs', runId, 'tasks')), '成功侧：不变量，tasks/ 目录在')
  assert(r1 && r1.generated === 1, `成功侧：generated=1（实际 ${r1 && r1.generated}）`)

  // 失败侧：execute-runs 改普通文件 + 删 marker → 新 runId mkdir 必抛 → console.error、不 throw、有统计
  // task 卡改 allowed_paths=['other.js']（空 changedFiles → 草稿循环跳过，隔离本写入点语义）
  writeFileSync(join(tasksDir, 'task-01.md'), taskCard(['other.js']))
  rmSync(join(runtimeRoot, 'execute-runs'), { recursive: true, force: true })
  writeFileSync(join(runtimeRoot, 'execute-runs'), 'not a directory\n')
  rmSync(marker, { force: true })

  const { result: r2, error: e2, errBuf: err2 } = await capture(() => generateTaskReviewDrafts({ changeName: cn, cwd }))
  assert(!e2, `失败侧：不 throw（保留 fail-open 契约，实际 error=${e2 && e2.message}）`)
  assert(err2.includes('execute run marker/目录写入失败'), '失败侧：console.error 留痕（去静默）')
  assert(r2 && r2.generated === 0 && r2.skipped === 1 && Array.isArray(r2.unattributed),
    `失败侧：返回统计对象不抛（generated=${r2 && r2.generated}, skipped=${r2 && r2.skipped}）`)
  assert(!existsSync(marker), '失败侧：marker 未写入（mkdir 失败先行）')
}

// ════════════════════════════════════════════════════════════════
closePms()
for (const d of tmpRoots) {
  for (let i = 0; i < 3; i++) { try { rmSync(d, { recursive: true, force: true }); break } catch { execFileSync('node', ['-e', 'setTimeout(()=>{},200)']) } }
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
if (failures.length > 0) { console.log('失败项:'); failures.forEach(f => console.log(`  - ${f}`)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
