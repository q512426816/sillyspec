/**
 * execute 派发集成测试 — task-09（依赖 task-07 已落地）
 *
 * 覆盖 buildWavePrompt 三条派发路径（Local 零回归 / SillyHub / local-fallback），
 * 验证 D-005（零回归）/ D-006（路径A stub）/ D-007（dispatcher 抽象层）/ D-008（一 Wave 一 mission）
 * 接入。纯 buildWavePrompt 字符串断言，不调真实 daemon / MCP / 网络。
 *
 * 派发模板链架构（零网络保证）：execute.js → strategy.js → backends/{local-agent,sillyhub-mcp}.js
 * 全是模板生成器，**不 import sillyhub-mcp/client.js**（client 才连 daemon/HTTP）。本测试也不
 * 调 fetch / MCP tool，只断言 prompt 文本。
 *
 * env 策略：用 options.dispatchMode 覆盖测 SillyHub / local-fallback（避免设/清 env 污染套件）；
 * Local 零回归用例前 delete SILLYHUB_MCP_URL/TOKEN + 用例后恢复，验证 getDispatchMode() 同步判定
 * （无 env → 'local'，零回归关键）。
 */
import { buildWavePrompt, getDispatchMode } from '../../src/stages/execute.js'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))

let failed = 0
let passed = 0
const failures = []
function assertTrue(cond, msg) {
  if (cond) { passed++; console.log(`  ✅ PASS: ${msg}`) }
  else { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
}
function assertContains(haystack, needle, msg) {
  assertTrue(typeof haystack === 'string' && haystack.includes(needle), msg)
}
function assertNotContains(haystack, needle, msg) {
  assertTrue(typeof haystack === 'string' && !haystack.includes(needle), msg)
}

// wave 样例（单 task 单 Wave，够触发 buildWavePrompt 全分支）
const wave = { index: 1, tasks: [{ index: 1, name: 'task-01: 示例', file: 'src/x.js' }] }
const worktreePath = 'C:/wt/dispatch-test'

// env 隔离工具：进入前清 SILLYHUB_MCP_URL/TOKEN，返回恢复函数（保留原值或还原为 absent）
function withoutSillyHubEnv() {
  const saved = {
    url: process.env.SILLYHUB_MCP_URL,
    token: process.env.SILLYHUB_MCP_TOKEN,
  }
  delete process.env.SILLYHUB_MCP_URL
  delete process.env.SILLYHUB_MCP_TOKEN
  return () => {
    if (saved.url === undefined) delete process.env.SILLYHUB_MCP_URL
    else process.env.SILLYHUB_MCP_URL = saved.url
    if (saved.token === undefined) delete process.env.SILLYHUB_MCP_TOKEN
    else process.env.SILLYHUB_MCP_TOKEN = saved.token
  }
}

console.log('=== execute 派发集成测试（task-09）===\n')

// ── 1. Local 零回归（无 env，不传 dispatchMode）──
// 验证 D-005：无 MCP 配置时 buildWavePrompt 输出与改前一致，dispatchSection 为空
console.log('--- 1. Local 零回归（options.dispatchMode=local 强制本地派发路径）---')
{
  const restore = withoutSillyHubEnv()
  const out = buildWavePrompt(wave, 1, null, worktreePath, { dispatchMode: 'local' })
  // 含现有结构关键词（先读源确认确切字符串）
  assertContains(out, '## 执行方式', 'Local 输出含现有「执行方式」段')
  assertContains(out, '### 工作目录', 'Local 输出含「工作目录」段（worktreePath 非空）')
  assertContains(out, '### Task Review Gate', 'Local 输出含 Task Review Gate')
  assertContains(out, '## Wave 1: 执行以下任务', 'Local 输出含 Wave 标题')
  // 零回归核心：dispatchSection=''，不含任何派发段
  assertNotContains(out, '派发后端：SillyHub', 'Local 输出不含 SillyHub 派发段（零回归核心）')
  assertNotContains(out, '派发后端提示：SillyHub', 'Local 输出不含 local-fallback 提示段（零回归核心）')
  assertNotContains(out, 'create_mission', 'Local 输出不含 create_mission 指令')
  assertNotContains(out, 'dispatch_worker', 'Local 输出不含 dispatch_worker 指令')
  assertNotContains(out, 'list_workers', 'Local 输出不含 list_workers 指令')
  // 2026-08-17-quick-close-linked-changes 工具驾驭修复：子代理 prompt 要点新增中断接手 + 边界纪律
  assertContains(out, '增量落盘与中断接手指引', 'Local 输出含子代理中断接手指引')
  assertContains(out, '任务边界铁律', 'Local 输出含子代理任务边界铁律')
  assertContains(out, '已完成清单', 'Local 输出含「已完成清单」关键词')
  assertContains(out, '严格只实现本 task 的', 'Local 输出含「严格只实现本 task」边界约束')
  restore()
}

// ── 2. SillyHub 路径（options.dispatchMode='sillyhub'，覆盖 getDispatchMode）──
// 验证 D-006/D-007：路径A 探测可用时注入完整 SillyHub 派发指令
console.log('\n--- 2. SillyHub 路径（dispatchMode=sillyhub，options 覆盖）---')
{
  const restore = withoutSillyHubEnv()
  const out = buildWavePrompt(wave, 1, null, worktreePath, { dispatchMode: 'sillyhub' })
  // execute.js 外层拼的段标题
  assertContains(out, '### 派发后端：SillyHub MCP（探测可用，一 Wave 一 mission）',
    'SillyHub 输出含外层派发段标题')
  // renderSillyHubInstruction 注入的 MCP tool 指令
  assertContains(out, 'create_mission', 'SillyHub 输出含 create_mission 指令')
  assertContains(out, 'dispatch_worker', 'SillyHub 输出含 dispatch_worker 指令')
  assertContains(out, 'list_workers', 'SillyHub 输出含 list_workers 轮询指令')
  assertContains(out, 'kill lease', 'SillyHub 输出含 kill lease 防双写（UB-6）')
  assertContains(out, 'worktree_path', 'SillyHub 输出含 dispatch_worker 的 worktree_path 参数（路径A）')
  assertContains(out, worktreePath, 'SillyHub 输出把 contract.worktreePath 注入派发指令（非占位符）')
  // worktreePath 守卫：为空时即使 dispatchMode=sillyhub 也不注入（无 worktree 无谓派发）
  const noWt = buildWavePrompt(wave, 1, null, null, { dispatchMode: 'sillyhub' })
  assertNotContains(noWt, '派发后端：SillyHub', 'worktreePath 为空时 sillyhub 也不注入派发段（守卫生效）')
  restore()
}

// ── 3. local-fallback 路径（options.dispatchMode='local-fallback'）──
// 验证 D-006 stub：有 MCP 配置但路径A 未落地（isPathASupported()=false）→ 短提示，派发仍走 Local
console.log('\n--- 3. local-fallback 路径（dispatchMode=local-fallback，短提示）---')
{
  const restore = withoutSillyHubEnv()
  const out = buildWavePrompt(wave, 1, null, worktreePath, { dispatchMode: 'local-fallback' })
  // 短提示文案
  assertContains(out, '路径A 未落地', 'local-fallback 输出含「路径A 未落地」短提示')
  assertContains(out, '派发后端提示', 'local-fallback 输出含「派发后端提示」段（区分完整 SillyHub 指令）')
  assertContains(out, '本次派发走 Local', 'local-fallback 输出声明派发走 Local（与默认一致）')
  // 只短提示，非完整 SillyHub 指令
  assertNotContains(out, 'create_mission', 'local-fallback 输出不含 create_mission（非完整 SillyHub 指令）')
  assertNotContains(out, '### 派发后端：SillyHub MCP（探测可用',
    'local-fallback 输出不含完整 SillyHub 派发段标题')
  restore()
}

// ── 4. 一 Wave 一 mission（D-008）语义 ──
// SillyHub 输出含 mission 创建 + Wave 内并行 / Wave 间串行
console.log('\n--- 4. 一 Wave 一 mission（D-008）---')
{
  const restore = withoutSillyHubEnv()
  const out = buildWavePrompt(wave, 1, null, worktreePath, { dispatchMode: 'sillyhub' })
  assertContains(out, '一 Wave 一 mission', 'SillyHub 输出含「一 Wave 一 mission」语义')
  assertContains(out, 'create_mission', 'mission 创建走 create_mission tool（每 Wave 一个）')
  assertContains(out, '并行 dispatch', 'SillyHub 输出声明 Wave 内 task→worker 并行 dispatch')
  assertContains(out, 'Wave 间 mission 串行', 'SillyHub 输出声明 Wave 间 mission 串行')
  restore()
}

// ── 5. 不依赖真实 daemon / 网络（元断言）──
// 纯函数字符串生成，无 fetch / MCP tool 调用；派发模板链不 import client.js
console.log('\n--- 5. 不依赖真实 daemon / 网络 ---')
{
  const restore = withoutSillyHubEnv()
  // 同步纯函数：快速返回，无网络阻塞
  const before = Date.now()
  const out = buildWavePrompt(wave, 1, null, worktreePath, { dispatchMode: 'sillyhub' })
  const elapsed = Date.now() - before
  assertTrue(typeof out === 'string' && out.length > 0, 'buildWavePrompt 同步返回非空字符串（纯函数）')
  assertTrue(elapsed < 1000, `buildWavePrompt 同步快速返回（${elapsed}ms < 1s，无 daemon/网络阻塞）`)
  // 架构断言：派发模板链不 import client.js（client 才连 daemon/HTTP），证明零网络
  const strategySrc = readFileSync(join(here, '..', '..', 'src', 'dispatch', 'strategy.js'), 'utf8')
  assertTrue(!/from\s+['"][^'"]*client['"]/.test(strategySrc),
    'strategy.js 不 import client（派发策略纯模板生成，零网络）')
  restore()
}

// ───────────────────────────────────────────────────────────────────────────
// W3 task-08（D-012 per-task workdir + D-010 双锡点）—— buildWavePrompt 跨仓改造
// ───────────────────────────────────────────────────────────────────────────
// 复用 multi-repo-context.test.mjs 的真实 git fixture 模式（mkdtemp + git init）。
// 隔离：每条用例独立 tmp repo，无 frontmatter 串味。结尾清理。
import { MultiRepoContext } from '../../src/run/multi-repo-context.js'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync as _readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { execSync } from 'node:child_process'

const task08TempDirs = []
function makeRepo08() {
  const d = mkdtempSync(join(tmpdir(), 'exec08-'))
  task08TempDirs.push(d)
  execSync('git init -q', { cwd: d, stdio: 'pipe' })
  execSync('git config user.email t@t.com', { cwd: d, stdio: 'pipe' })
  execSync('git config user.name t', { cwd: d, stdio: 'pipe' })
  execSync('git config commit.gpgsign false', { cwd: d, stdio: 'pipe' })
  writeFileSync(join(d, 'README.md'), 'init\n')
  execSync('git add .', { cwd: d, stdio: 'pipe' })
  execSync('git commit -q -m init', { cwd: d, stdio: 'pipe' })
  return d
}
function makeWm08(metaMap) {
  return { getMeta: (name) => metaMap.get(name) || null }
}
// 写 task 卡 frontmatter（含 repo 字段可选）。num 必须为已零填充字符串（与 resolveTaskRepo 同源 task-NN.md）
function writeTaskCard(changeDir, num, repo) {
  const tasksDir = join(changeDir, 'tasks')
  try { mkdirSync(tasksDir, { recursive: true }) } catch {}
  const fm = repo
    ? `---\nid: task-${num}\nrepo: ${repo}\nallowed_paths:\n  - src/x.js\n---\n\n# task-${num}\n`
    : `---\nid: task-${num}\nallowed_paths:\n  - src/x.js\n---\n\n# task-${num}\n`
  writeFileSync(join(tasksDir, `task-${num}.md`), fm)
}
function readTaskCard(changeDir, num) {
  return _readFileSync(join(changeDir, 'tasks', `task-${num}.md`), 'utf8')
}

// ── 6. 无 ctx 单仓退化零回归（D-012 缺省路径）──
// buildWavePrompt 不传 ctx → 全 task workdir=主仓 worktreePath，worktreeSection 单值（与改前一致）
console.log('\n--- 6. 无 ctx 单仓退化（D-012 零回归）---')
{
  const restore = withoutSillyHubEnv()
  const w = { index: 1, tasks: [{ index: 1, name: 'task-01: 主仓', file: 'src/x.js' }] }
  const out = buildWavePrompt(w, 1, null, worktreePath)
  // 旧单值 worktreeSection 关键字（workdir 强制必传 + JSON 单值示例）
  assertContains(out, '### 工作目录', '无 ctx：worktreeSection 为旧单值标题（非 per-task）')
  assertContains(out, `"workdir": "${worktreePath}"`, '无 ctx：worktreeSection JSON 示例注入单 worktreePath')
  assertNotContains(out, 'per-task workdir 表', '无 ctx：不注入 per-task 多值表')
  assertNotContains(out, '跨仓 task 派发与双锡点', '无 ctx：不注入跨仓 commit 指引段')
  restore()
}

// ── 7. ctx 含跨仓 task：per-task workdir 多值表 + 跨仓 commit 指引（D-012 核心）──
console.log('\n--- 7. per-task workdir 多值表（D-012 混合 Wave 主仓+跨仓）---')
{
  const restore = withoutSillyHubEnv()
  const mainRepo = makeRepo08()
  const crossRepo = makeRepo08()
  const baseHash = execSync('git rev-parse HEAD', { cwd: mainRepo, encoding: 'utf8' }).trim()
  // changeDir：真实 change 目录结构（含 tasks/）
  const changeDir = mkdtempSync(join(tmpdir(), 'chg08-'))
  task08TempDirs.push(changeDir)
  writeTaskCard(changeDir, '01', null)        // task-01 主仓
  writeTaskCard(changeDir, '02', 'sillyspec') // task-02 跨仓
  const wm = makeWm08(new Map([['c1', { mode: 'worktree', worktreePath: mainRepo, baseHash }]]))
  const ctx = new MultiRepoContext({
    cwd: mainRepo, changeName: 'c1', declaredRepos: ['main', 'sillyspec'],
    repoRegistry: new Map([['sillyspec', crossRepo]]), worktreeManager: wm,
  })
  const w = {
    index: 1,
    tasks: [
      { index: 1, name: 'task-01: 主仓改', file: 'src/a.js' },
      { index: 2, name: 'task-02: 跨仓改', file: 'src/b.js' },
    ],
  }
  const out = buildWavePrompt(w, 1, changeDir, mainRepo, { ctx })
  // per-task worktreeSection
  assertContains(out, '### 工作目录（per-task）', 'ctx 跨仓：worktreeSection 切 per-task 标题')
  assertContains(out, 'task-01 (repo: main) → workdir', 'ctx 跨仓：per-task 表含 task-01 主仓行')
  assertContains(out, 'task-02 (repo: sillyspec) → workdir', 'ctx 跨仓：per-task 表含 task-02 跨仓行')
  assertContains(out, mainRepo, 'ctx 跨仓：主仓 task workdir=主仓 worktreePath')
  assertContains(out, crossRepo, 'ctx 跨仓：跨仓 task workdir=跨仓仓根')
  // 跨仓 commit 指引段
  assertContains(out, '### 跨仓 task 派发与双锡点', 'ctx 跨仓：注入「跨仓派发与双锡点」段')
  assertContains(out, '不经主仓 worktree', 'ctx 跨仓：注入「不经主仓 worktree」commit 指引')
  assertContains(out, '直接在该仓主干工作区改+commit', 'ctx 跨仓：注入直接 commit 到主干指引')
  assertContains(out, 'base 锡点', 'ctx 跨仓：base 锡点指引存在')
  assertContains(out, 'head 锡点', 'ctx 跨仓：head 锡点指引存在')
  restore()
}

// ── 8. D-010 base 锡点落盘：跨仓 task 派发前 CLI 写 task 卡 base_commit ──
console.log('\n--- 8. base 锡点落盘（D-010 派发前写 task 卡 base_commit）---')
{
  const restore = withoutSillyHubEnv()
  const mainRepo = makeRepo08()
  const crossRepo = makeRepo08()
  const crossHeadBefore = execSync('git rev-parse HEAD', { cwd: crossRepo, encoding: 'utf8' }).trim()
  const baseHash = execSync('git rev-parse HEAD', { cwd: mainRepo, encoding: 'utf8' }).trim()
  const changeDir = mkdtempSync(join(tmpdir(), 'chg08b-'))
  task08TempDirs.push(changeDir)
  writeTaskCard(changeDir, '01', 'sillyspec') // 仅跨仓 task
  const wm = makeWm08(new Map([['c1', { mode: 'worktree', worktreePath: mainRepo, baseHash }]]))
  const ctx = new MultiRepoContext({
    cwd: mainRepo, changeName: 'c1', declaredRepos: ['main', 'sillyspec'],
    repoRegistry: new Map([['sillyspec', crossRepo]]), worktreeManager: wm,
  })
  const w = { index: 1, tasks: [{ index: 1, name: 'task-01: 跨仓', file: 'src/x.js' }] }
  // 派发前（buildWavePrompt 构造时）base_commit 应已落 task 卡
  assertTrue(!/base_commit:/.test(readTaskCard(changeDir, '01')), '派发前 task 卡 base_commit 字段不存在（前置态）')
  const out = buildWavePrompt(w, 1, changeDir, mainRepo, { ctx })
  const cardAfter = readTaskCard(changeDir, '01')
  assertContains(cardAfter, `base_commit: ${crossHeadBefore}`, '派发后 task 卡 base_commit 已写入跨仓 HEAD（base 锡点）')
  // 幂等：再调一次 buildWavePrompt，HEAD 未推进，值不变不重复写
  buildWavePrompt(w, 1, changeDir, mainRepo, { ctx })
  const cardTwice = readTaskCard(changeDir, '01')
  const occurrences = (cardTwice.match(/base_commit:/g) || []).length
  assertTrue(occurrences === 1, `幂等：base_commit 仅 1 行（实际 ${occurrences}，HEAD 未推进不重复写）`)
  // task-01 是主仓时不写 base_commit（主仓走 meta.baseHash）
  assertTrue(out.length > 0, 'buildWavePrompt 返回非空 prompt')
  restore()
}

// ── 9. ctx 单仓（无跨仓 task）：退化为单值 worktreeSection（零回归）──
console.log('\n--- 9. ctx 单仓（无跨仓 task）退化为单值 worktreeSection（零回归）---')
{
  const restore = withoutSillyHubEnv()
  const mainRepo = makeRepo08()
  const baseHash = execSync('git rev-parse HEAD', { cwd: mainRepo, encoding: 'utf8' }).trim()
  const changeDir = mkdtempSync(join(tmpdir(), 'chg08c-'))
  task08TempDirs.push(changeDir)
  writeTaskCard(changeDir, '01', null) // 主仓 task
  const wm = makeWm08(new Map([['c1', { mode: 'worktree', worktreePath: mainRepo, baseHash }]]))
  const ctx = new MultiRepoContext({
    cwd: mainRepo, changeName: 'c1', declaredRepos: ['main'],
    repoRegistry: new Map(), worktreeManager: wm,
  })
  const w = { index: 1, tasks: [{ index: 1, name: 'task-01: 主仓', file: 'src/x.js' }] }
  const out = buildWavePrompt(w, 1, changeDir, mainRepo, { ctx })
  // ctx 存在但无跨仓 task → 退回旧单值 worktreeSection（不注入 per-task 表 / 跨仓段）
  assertContains(out, '### 工作目录', 'ctx 单仓：worktreeSection 旧单值标题（无 per-task）')
  assertContains(out, `"workdir": "${mainRepo}"`, 'ctx 单仓：单值 JSON 注入主仓 worktreePath')
  assertNotContains(out, 'per-task workdir 表', 'ctx 单仓：不注入 per-task 多值表')
  assertNotContains(out, '跨仓 task 派发与双锡点', 'ctx 单仓：不注入跨仓 commit 指引段')
  // 主仓 task 不写 base_commit（meta.baseHash 管 base，不污染 task 卡）
  assertTrue(!/base_commit:/.test(readTaskCard(changeDir, '01')), '主仓 task 不写 base_commit（meta.baseHash 管 base）')
  restore()
}

// ── 10. batch 调度断言（2026-08-17-execute-batch-dispatch，FR-06）──
// 断言锚点 = design.md「接口定义」节 prompt 文本契约；全部 needle 逐字取自
// task-01 落地后 buildWavePrompt 实际产出（先 dump 实际输出核实再落盘，不预写死字符串）。
console.log('\n--- 10. batch 调度（三条件分组 / 逐 task 闭环 / 职责边界 / 越权即停 / 并行铁律 / 旧文案移除）---')
{
  const restore = withoutSillyHubEnv()
  const out = buildWavePrompt(wave, 1, null, worktreePath, { dispatchMode: 'local' })

  // a. 三条件分组指导存在（①文件正交 ②无契约链 ③组大小上限 3）
  assertContains(out,
    '可选 batch（合并实现）：同一 Wave 内，若一组任务同时满足以下三个条件，可把它们合并为一个 batch（最多 3 个 task），交给单个子代理串行逐个完成实现：',
    'batch 三条件分组指导存在（开篇整句含「最多 3 个 task」）')
  assertContains(out, '组内任意两个 task 的 allowed_paths 无交集（文件正交）',
    '条件①：组内 allowed_paths 两两无交集（文件正交）')
  assertContains(out, '组内任意两个 task 之间无 provides / expects_from 契约链',
    '条件②：组内无 provides / expects_from 契约链')
  assertContains(out, '契约 task 禁止同批', '契约 task 禁止同批（与 plan batch「尽量同批」方向相反）')
  assertContains(out, '组大小不超过 3 个 task', '条件③：组大小不超过 3 个 task（batch 上限 3）')

  // b. 逐 task 实现闭环协议（「逐个完成实现」类表述 + 记录报告后才下一个）
  assertContains(out, '按 batch 内 task 顺序逐个完成实现闭环',
    'batch 协议含「逐个完成实现闭环」表述')
  assertContains(out, '跑该 task 的 verify 命令 → 记录该 task 报告（改动文件清单 / verify 结果 / 卡点）→ 才开始下一个 task',
    'batch 闭环顺序：verify → 记录报告 → 才开始下一个 task')
  assertContains(out, '最终回复输出逐 task 报告清单', 'batch 最终回复输出逐 task 报告清单')

  // c. 职责边界：batch 子代理不写 review.json、不勾选 checkbox（审查与勾选归主 agent）
  assertContains(out, '禁止写 review.json、禁止勾选 plan.md checkbox——task 审查与勾选归主 agent',
    'batch 子代理禁止写 review.json / 禁止勾选 checkbox（审查归主 agent）')
  assertContains(out, 'batch 子代理只做实现与自验，task 审查、review.json 产出与 checkbox 勾选仍归你（主 agent）',
    '主 agent 角色段：审查/review.json/勾选仍归主 agent（batch 只合并实现不合并审查）')

  // d. 越权即停（「立即停止」类表述）
  assertContains(out,
    '越权即停：发现必须改 batch 内其他 task 或任何 batch 外 task 的 allowed_paths 文件 → 立即停止本 task 及后续，报告冲突文件与卡点，回主 agent 裁决',
    '越权即停：改 batch 外/其他 task 文件立即停止并报告冲突')

  // e. 并行铁律改写（「独立或 batch」+「并行启动」+「batch 内部串行」组合表述）
  assertContains(out, '同一 Wave 的多个子代理（独立或 batch）必须并行启动，batch 内部串行',
    '并行铁律改写：独立或 batch 并行启动 + batch 内部串行')

  // f. 旧独占文案移除（NotContains 锚旧整句；新版为「默认每个任务由独立子代理执行」默认+例外结构，
  //    不断言子串「由独立子代理执行」——该子串在新默认句中仍存在，会误伤）
  assertNotContains(out, '每个任务必须由独立子代理执行，你不要自己写代码。',
    '旧独占整句「每个任务必须由独立子代理执行，你不要自己写代码。」已移除')
  assertContains(out, '默认每个任务由独立子代理执行',
    '新版默认形态「默认每个任务由独立子代理执行」存在（默认+batch 例外结构）')

  // g. SillyHub 互斥句存在（batch 分组仅本地 Agent tool 派发适用）
  assertContains(out, 'SillyHub 派发模式下按派发段执行（一 Wave 一 mission），不按 batch 分组',
    'SillyHub 派发互斥句存在（SillyHub 模式不按 batch 分组）')
  assertContains(out, 'batch 分组指导仅适用于本地 Agent tool 派发',
    'batch 分组指导仅适用于本地 Agent tool 派发')
  // 互斥句在 SillyHub 派发段注入时同样在场（batch 指导与派发段共存时消歧）
  const shOut = buildWavePrompt(wave, 1, null, worktreePath, { dispatchMode: 'sillyhub' })
  assertContains(shOut, 'SillyHub 派发模式下按派发段执行（一 Wave 一 mission），不按 batch 分组',
    'SillyHub 模式输出同样含派发互斥句（与派发段共存消歧）')

  restore()
}

// 清理 task-08 tmp 仓（最后用例后）
for (const d of task08TempDirs) {
  try { rmSync(d, { recursive: true, force: true }) } catch { /* Windows EPERM best-effort */ }
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
if (failures.length > 0) { console.log('失败项:'); failures.forEach(f => console.log(`  - ${f}`)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
