/**
 * Machine Interface v1 测试套件（task-07）
 *
 * 覆盖 plan.md 全局验收标准 1-7：
 *   1. gate execute 退出码语义（0/1/2）
 *   2. derive 四 facet 结构 + 非法 facet
 *   3. 只读性：gate/derive 不改 DB 语义内容（project + changes 行不变，D-002）
 *   4. --json stdout 可被 JSON.parse（含异常兜底）
 *   5. platform approve/reject（mock HTTP + approvals 表落库）
 *   6. saveWorkflowRun 平台/本地两分支落盘路径
 *   7. D-008 一致性：artifacts 与 execute-evidence 结论不矛盾
 *
 * 风格：自研 assert（参照 agent-gate-hardening.test.mjs），mkdtempSync 临时目录，不引入测试框架。
 * 只改本文件（+ 可能的 package.json），不污染仓库工作区。
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { tmpdir } from 'os'
import { execFileSync } from 'child_process'
import { DatabaseSync } from 'node:sqlite'
import http from 'node:http'
import { fileURLToPath } from 'url'

import {
  buildEnvelope,
  runGate,
  runDerive,
  FACETS,
  EXIT_OK,
  EXIT_BLOCKED,
  EXIT_UNKNOWN,
  SCHEMA_VERSION,
} from '../src/machine-interface.js'
import { ProgressManager } from '../src/progress.js'
import { saveWorkflowRun } from '../src/workflow.js'
import { approve, reject } from '../src/sync.js'

let failed = 0
let total = 0

function assert(condition, msg) {
  total++
  if (!condition) {
    failed++
    console.log(`  ❌ FAIL: ${msg}`)
  } else {
    console.log(`  ✅ PASS: ${msg}`)
  }
}

function git(dir, args) {
  return execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
}

function initGitRepo(dir) {
  git(dir, ['init', '-q'])
  git(dir, ['config', 'user.email', 'test@test.local'])
  git(dir, ['config', 'user.name', 'test'])
  git(dir, ['config', 'commit.gpgsign', 'false'])
}

const tmpRoots = []
function makeTmpDir(prefix) {
  const dir = mkdtempSync(join(tmpdir(), prefix))
  tmpRoots.push(dir)
  return dir
}

// worktree 根目录（用于 binPath）
const worktreeRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

// ─────────────────────────────────────────
// fixture：构造一个可被 ProgressManager.read 到的变更
// 返回 { cwd, specBase, changeName, dbPath }
// ─────────────────────────────────────────
async function makeProjectFixture({ withGit = true, changeName = 'c1', codeChange = false, lowRiskTask = false } = {}) {
  const proj = makeTmpDir('mi-')
  const specBase = join(proj, '.sillyspec')
  mkdirSync(specBase, { recursive: true })

  if (withGit) {
    initGitRepo(proj)
    // .sillyspec 忽略：meta/变更目录/db 的写入不算"代码变更"
    writeFileSync(join(proj, '.gitignore'), '.sillyspec/\n')
    writeFileSync(join(proj, 'main.js'), 'console.log(1)\n')
    git(proj, ['add', '.'])
    git(proj, ['commit', '-q', '-m', 'init'])
    const baseHash = git(proj, ['rev-parse', 'HEAD'])

    // worktree meta 指向主仓库（in-place-fallback），让 checkExecuteCodeEvidence 能判定
    const wtMetaDir = join(specBase, '.runtime', 'worktrees', changeName)
    mkdirSync(wtMetaDir, { recursive: true })
    writeFileSync(join(wtMetaDir, 'meta.json'), JSON.stringify({
      changeName, baseHash, mode: 'in-place-fallback', worktreePath: proj,
    }))

    // 真实代码变更：在 base 之后写一个未提交文件 → changed
    if (codeChange) {
      writeFileSync(join(proj, 'feature.js'), 'export const x = 1\n')
    }
  }

  // 初始化 progress（建 db + project 行）+ 注册变更（async，必须 await）
  const pm = new ProgressManager({ specDir: specBase })
  await pm.init(proj)
  await pm.initChange(proj, changeName)

  // 可选：声明 task-01 为 low_risk，让 task-reviews 缺 review.json 时走 warning 而非 error
  if (lowRiskTask) {
    const tasksDir = join(specBase, 'changes', changeName, 'tasks')
    mkdirSync(tasksDir, { recursive: true })
    writeFileSync(join(tasksDir, 'task-01.md'),
      '---\nid: task-01\nlow_risk: true\n---\n# task-01\n')
  }

  const dbPath = join(specBase, '.runtime', 'sillyspec.db')
  return { cwd: proj, specBase, changeName, dbPath }
}

// 写一份含 task-01 checkbox 的 plan.md（配合 lowRiskTask 让 execute-evidence 成为综合 ok 的决定因素）
function writeTaskPlan(specBase, changeName) {
  writeFileSync(join(specBase, 'changes', changeName, 'plan.md'),
    '# Plan\n\n## Wave 1\n- [x] task-01: 实现\n')
}

// ─────────────────────────────────────────
// 1. envelope：buildEnvelope 固定字段
// ─────────────────────────────────────────
console.log('--- 1. envelope（buildEnvelope）---')
{
  const env = buildEnvelope({ command: 'gate', stage: 'execute', change: 'c1', ok: true })

  // 顶层固定字段
  assert(env.schema_version === SCHEMA_VERSION, `schema_version === ${SCHEMA_VERSION}（实际 ${env.schema_version}）`)
  assert(SCHEMA_VERSION === 1, 'SCHEMA_VERSION === 1（v1 契约）')
  assert(env.command === 'gate', 'command 字段')
  assert(env.change === 'c1', 'change 字段')
  assert(env.ok === true, 'ok 字段')
  assert(Array.isArray(env.errors), 'errors 字段为数组')
  assert(Array.isArray(env.warnings), 'warnings 字段为数组')
  assert(typeof env.generated_at === 'string', 'generated_at 字段存在')

  // generated_at 是合法 ISO 时间戳（new Date 能解析且非 Invalid）
  const parsed = new Date(env.generated_at)
  assert(!isNaN(parsed.getTime()), `generated_at 是合法 ISO 时间戳（实际 ${env.generated_at}）`)

  // 按需字段：传了才出现
  assert(env.stage === 'execute', 'stage 按需出现（显式传参）')
  assert(env.facet === undefined, 'facet 未传参时不出现')
  assert(env.checks === undefined, 'checks 未传参时不出现')
  assert(env.data === undefined, 'data 未传参时不出现')

  // 传 checks/data 时出现
  const env2 = buildEnvelope({ command: 'derive', facet: 'artifacts', ok: true, checks: [], data: { x: 1 } })
  assert(env2.facet === 'artifacts', 'facet 显式传参时出现')
  assert(Array.isArray(env2.checks), 'checks 显式传参时出现')
  assert(env2.data && env2.data.x === 1, 'data 显式传参时出现')

  // 默认 errors/warnings 为空数组
  const env3 = buildEnvelope({ command: 'gate', ok: false })
  assert(env3.errors.length === 0 && env3.warnings.length === 0, 'errors/warnings 默认空数组')
}

// ─────────────────────────────────────────
// 2. gate：退出码语义（0/1/2）+ envelope 合法性
// ─────────────────────────────────────────
console.log('\n--- 2. gate（runGate 退出码语义）---')
{
  // 2a. 变更不存在 → exit 2
  {
    const proj = makeTmpDir('mi-novchange-')
    mkdirSync(join(proj, '.sillyspec'), { recursive: true })
    const pm = new ProgressManager({ specDir: join(proj, '.sillyspec') })
    await pm.init(proj)
    const { envelope, exitCode } = await runGate('execute', 'no-such-change', { cwd: proj })
    assert(exitCode === EXIT_UNKNOWN, `变更不存在 → exitCode=2（实际 ${exitCode}）`)
    assert(envelope.ok === false, '变更不存在 → envelope.ok=false')
    assert(envelope.errors.length > 0 && envelope.errors.some(e => e.includes('不存在')),
      `变更不存在 → errors 指明原因（实际 ${envelope.errors.join('; ')}）`)
    assert(envelope.command === 'gate', 'envelope.command=gate')
  }

  // 2b. execute 产物齐 + 真实代码变更 → exit 0（low_risk 豁免 review.json）
  {
    const { cwd, specBase, changeName } = await makeProjectFixture({ withGit: true, codeChange: true, lowRiskTask: true })
    writeTaskPlan(specBase, changeName)
    const { envelope, exitCode } = await runGate('execute', changeName, { cwd, specBase })
    assert(exitCode === EXIT_OK, `execute 有真实代码变更 → exitCode=0（实际 ${exitCode}）`)
    assert(envelope.ok === true, 'execute 有代码变更 → envelope.ok=true')
    // envelope 合法：有 checks 数组
    assert(Array.isArray(envelope.checks) && envelope.checks.length > 0, 'envelope.checks 非空数组')
    const artifacts = envelope.checks.find(c => c.id === 'artifacts')
    const execEv = envelope.checks.find(c => c.id === 'execute-evidence')
    assert(artifacts != null, 'artifacts check 存在')
    assert(execEv != null, 'execute-evidence check 存在')
    assert(execEv.ok === true, `execute-evidence.ok=true（有代码变更，实际 ${execEv.ok}）`)
    assert(execEv.data && typeof execEv.data.status === 'string', 'execute-evidence.data.status 字符串')
  }

  // 2c. execute 有 plan+task 但零代码变更 → exit 1（BLOCKED）
  {
    const { cwd, specBase, changeName } = await makeProjectFixture({ withGit: true, codeChange: false, lowRiskTask: true })
    writeTaskPlan(specBase, changeName)
    const { envelope, exitCode } = await runGate('execute', changeName, { cwd, specBase })
    assert(exitCode === EXIT_BLOCKED, `零代码变更 → exitCode=1（实际 ${exitCode}）`)
    assert(envelope.ok === false, '零代码变更 → envelope.ok=false')
    assert(envelope.errors.length > 0, '零代码变更 → errors 非空')
    assert(envelope.errors.some(e => e.includes('代码变更') || e.includes('checkbox')),
      `errors 指明代码变更原因（实际 ${envelope.errors.join('; ')}）`)
  }
}

// ─────────────────────────────────────────
// 3. D-008 一致性：artifacts 与 execute-evidence 结论不矛盾
// ─────────────────────────────────────────
console.log('\n--- 3. D-008 一致性（artifacts vs execute-evidence）---')
{
  // 零代码变更场景：artifacts(=validateExecuteOutputs) 与 execute-evidence(=checkExecuteCodeEvidence)
  // 同源——artifacts 应因零代码变更报错，execute-evidence.ok 也应为 false。两者不矛盾。
  const { cwd, specBase, changeName } = await makeProjectFixture({ withGit: true, codeChange: false, lowRiskTask: true })
  writeTaskPlan(specBase, changeName)
  const { envelope } = await runGate('execute', changeName, { cwd, specBase })
  const artifacts = envelope.checks.find(c => c.id === 'artifacts')
  const execEv = envelope.checks.find(c => c.id === 'execute-evidence')

  // execute-evidence.ok=false（unchanged）时，artifacts 不应为 ok（同源核验）
  if (execEv.ok === false) {
    assert(artifacts.ok === false,
      `execute-evidence 未过时 artifacts 也未过（不矛盾）— execEv.ok=${execEv.ok}, artifacts.ok=${artifacts.ok}`)
  }

  // 有代码变更场景：execute-evidence.ok=true，artifacts.ok 也应为 true
  const { cwd: cwd2, specBase: specBase2, changeName: cn2 } = await makeProjectFixture({ withGit: true, codeChange: true, lowRiskTask: true })
  writeTaskPlan(specBase2, cn2)
  const env2 = await runGate('execute', cn2, { cwd: cwd2, specBase: specBase2 })
  const a2 = env2.envelope.checks.find(c => c.id === 'artifacts')
  const e2 = env2.envelope.checks.find(c => c.id === 'execute-evidence')
  assert(e2.ok === true, `有代码变更 → execute-evidence.ok=true（实际 ${e2.ok}）`)
  if (e2.ok === true) {
    assert(a2.ok === true,
      `execute-evidence 通过时 artifacts 也通过（不矛盾）— a2.ok=${a2.ok}`)
  }
}

// ─────────────────────────────────────────
// 4. derive：四 facet 结构 + 非法 facet
// ─────────────────────────────────────────
console.log('\n--- 4. derive（四 facet 结构）---')
{
  const { cwd, specBase, changeName } = await makeProjectFixture({ withGit: true, codeChange: true, lowRiskTask: true })
  writeTaskPlan(specBase, changeName)

  // 4a. 非法 facet → exit 2 + errors 合法枚举
  {
    const { envelope, exitCode } = await runDerive('bogus-facet', changeName, { cwd, specBase })
    assert(exitCode === EXIT_UNKNOWN, `非法 facet → exitCode=2（实际 ${exitCode}）`)
    assert(envelope.errors.length > 0 && envelope.errors.some(e => e.includes('非法 facet')),
      `非法 facet → errors 指明枚举（实际 ${envelope.errors.join('; ')}）`)
    // errors 里包含合法枚举值列表
    assert(FACETS.every(f => envelope.errors.some(e => e.includes(f))),
      '非法 facet errors 含完整合法枚举列表')
  }

  // 4b. execute-evidence facet
  {
    const { envelope, exitCode } = await runDerive('execute-evidence', changeName, { cwd, specBase })
    assert(exitCode === EXIT_OK, `execute-evidence 有代码变更 → exit 0（实际 ${exitCode}）`)
    assert(envelope.data && typeof envelope.data.status === 'string', 'execute-evidence.data.status 字符串')
    assert(envelope.data && typeof envelope.data.detail === 'string', 'execute-evidence.data.detail 字符串')
    assert(envelope.facet === 'execute-evidence', 'envelope.facet=execute-evidence')
    // 非 artifacts facet 不应带 stage
    assert(envelope.stage === undefined, 'execute-evidence facet 不带 stage')
  }

  // 4c. task-reviews facet
  {
    const { envelope, exitCode } = await runDerive('task-reviews', changeName, { cwd, specBase })
    assert(exitCode === EXIT_OK || exitCode === EXIT_BLOCKED, `task-reviews → exit ∈ {0,1}（实际 ${exitCode}）`)
    assert(envelope.data && typeof envelope.data.ok === 'boolean', 'task-reviews.data.ok 布尔')
    assert(envelope.data && Array.isArray(envelope.data.errors), 'task-reviews.data.errors 数组')
    assert(envelope.facet === 'task-reviews', 'envelope.facet=task-reviews')
  }

  // 4d. artifacts facet（带 stage）
  {
    const { envelope, exitCode } = await runDerive('artifacts', changeName, { cwd, specBase })
    assert(envelope.data && typeof envelope.data.ok === 'boolean', 'artifacts.data.ok 布尔')
    assert(envelope.facet === 'artifacts', 'envelope.facet=artifacts')
    // artifacts facet 绑定阶段语义 → 带 stage
    assert(typeof envelope.stage === 'string', `artifacts facet 带 stage（实际 ${envelope.stage}）`)
  }

  // 4e. verify-test facet（用极简 fixture：test 命令 = node --version，快速通过）
  {
    // 独立 fixture 避免 local.yaml 串扰
    const f = await makeProjectFixture({ withGit: false })
    writeFileSync(join(f.specBase, 'local.yaml'), 'commands:\n  test: "node --version"\n')
    const { envelope, exitCode } = await runDerive('verify-test', f.changeName, { cwd: f.cwd, specBase: f.specBase })
    assert(envelope.data && typeof envelope.data.status === 'string',
      `verify-test.data.status 字符串（实际 ${envelope.data && envelope.data.status}）`)
    assert(['passed', 'failed', 'skipped'].includes(envelope.data.status),
      `verify-test.data.status ∈ {passed,failed,skipped}（实际 ${envelope.data && envelope.data.status}）`)
    assert(envelope.facet === 'verify-test', 'envelope.facet=verify-test')
    assert(exitCode === EXIT_OK || exitCode === EXIT_BLOCKED, `verify-test → exit ∈ {0,1}（实际 ${exitCode}）`)
  }

  // 4f. derive 变更不存在 → exit 2
  {
    const proj = makeTmpDir('mi-dn-')
    mkdirSync(join(proj, '.sillyspec'), { recursive: true })
    const pm = new ProgressManager({ specDir: join(proj, '.sillyspec') })
    await pm.init(proj)
    const { envelope, exitCode } = await runDerive('artifacts', 'no-such', { cwd: proj })
    assert(exitCode === EXIT_UNKNOWN, `derive 变更不存在 → exit 2（实际 ${exitCode}）`)
    assert(envelope.ok === false, 'derive 变更不存在 → ok=false')
  }
}

// ─────────────────────────────────────────
// 5. 只读性：gate/derive 不改 DB 语义内容（D-002 只读边界）
// ─────────────────────────────────────────
console.log('\n--- 5. 只读性（gate/derive 不改 DB 语义内容，D-002）---')
{
  const { cwd, specBase, changeName, dbPath } = await makeProjectFixture({ withGit: true, codeChange: true, lowRiskTask: true })
  writeTaskPlan(specBase, changeName)

  // 语义级快照：读 project + changes 行（D-002 只读边界：gate/derive 调用前后内容应不变）。
  // 不再用文件 hash——node:sqlite WAL 下 close 可能 checkpoint 改写主库字节（语义不变但 hash 变），
  // 文件 hash 断言在此引擎下不稳。gate-status.json 已由 task-10 废除（D-02），不再断言其产生/不变。
  const snapshot = () => {
    const db = new DatabaseSync(dbPath, { readOnly: true })
    try {
      const project = db.prepare('SELECT id, name, schema_version FROM project ORDER BY id').all()
      const changes = db.prepare('SELECT name, current_stage, status, no_worktree FROM changes ORDER BY name').all()
      return JSON.stringify({ project, changes })
    } finally { db.close() }
  }
  const before = snapshot()

  // gate 调用
  await runGate('execute', changeName, { cwd, specBase })
  // derive 调用（多 facet）
  await runDerive('execute-evidence', changeName, { cwd, specBase })
  await runDerive('artifacts', changeName, { cwd, specBase })

  const after = snapshot()
  assert(before === after, `gate/derive 调用前后 DB 语义内容不变（project + changes 行不变，D-002 只读）`)
}

// ─────────────────────────────────────────
// 6. CLI 端到端：execFileSync bin/sillyspec.js gate/derive --json
// ─────────────────────────────────────────
console.log('\n--- 6. CLI 端到端（gate/derive --json stdout 可解析）---')
{
  const binPath = join(worktreeRoot, 'bin', 'sillyspec.js')
  assert(existsSync(binPath), `bin/sillyspec.js 存在（${binPath}）`)

  const { cwd, specBase, changeName } = await makeProjectFixture({ withGit: true, codeChange: true, lowRiskTask: true })
  writeTaskPlan(specBase, changeName)

  // 6a. gate --json：stdout 可 JSON.parse
  {
    let stdout, status
    try {
      stdout = execFileSync('node', [binPath, 'gate', 'execute', '--change', changeName, '--json', '--dir', cwd],
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
      status = 0
    } catch (e) {
      stdout = e.stdout ? e.stdout.toString() : ''
      status = e.status ?? 1
    }
    let env
    try { env = JSON.parse(stdout) } catch (e) { env = null }
    assert(env !== null, `gate --json stdout 可 JSON.parse（实际 stdout: ${stdout.slice(0, 120)}）`)
    if (env) {
      assert(env.command === 'gate', 'CLI gate envelope.command=gate')
      assert(typeof env.ok === 'boolean', 'CLI gate envelope.ok 布尔')
    }
    assert(status === 0 || status === 1, `gate 退出码 ∈ {0,1}（实际 ${status}）`)
  }

  // 6b. derive --json：stdout 可 JSON.parse
  {
    let stdout, status
    try {
      stdout = execFileSync('node', [binPath, 'derive', 'execute-evidence', '--change', changeName, '--json', '--dir', cwd],
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
      status = 0
    } catch (e) {
      stdout = e.stdout ? e.stdout.toString() : ''
      status = e.status ?? 1
    }
    let env
    try { env = JSON.parse(stdout) } catch (e) { env = null }
    assert(env !== null, `derive --json stdout 可 JSON.parse（实际 stdout: ${stdout.slice(0, 120)}）`)
    if (env) {
      assert(env.command === 'derive', 'CLI derive envelope.command=derive')
      assert(env.facet === 'execute-evidence', 'CLI derive envelope.facet 正确')
    }
  }

  // 6c. 兜底 JSON + exit 2：变更不存在
  {
    const proj = makeTmpDir('mi-cli-nc-')
    mkdirSync(join(proj, '.sillyspec'), { recursive: true })
    const pm = new ProgressManager({ specDir: join(proj, '.sillyspec') })
    await pm.init(proj)
    let stdout, status
    try {
      stdout = execFileSync('node', [binPath, 'gate', 'execute', '--change', 'ghost', '--json', '--dir', proj],
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
      status = 0
    } catch (e) {
      stdout = e.stdout ? e.stdout.toString() : ''
      status = e.status ?? 1
    }
    let env
    try { env = JSON.parse(stdout) } catch (e) { env = null }
    assert(env !== null, `变更不存在场景 stdout 仍是合法 JSON（兜底，实际 ${stdout.slice(0, 120)}）`)
    assert(status === 2, `变更不存在 → exit 2（实际 ${status}）`)
    if (env) {
      assert(env.ok === false, '兜底 envelope.ok=false')
      assert(env.errors.length > 0, '兜底 envelope.errors 非空')
    }
  }
}

// ─────────────────────────────────────────
// 7. approve/reject：mock HTTP + approvals 表落库 + 失败场景
// ─────────────────────────────────────────
console.log('\n--- 7. approve/reject（mock HTTP + approvals 表）---')
{
  // mock server：记录收到的请求
  let lastReq = null
  const server = http.createServer((req, res) => {
    let body = ''
    req.on('data', (c) => { body += c })
    req.on('end', () => {
      lastReq = { method: req.method, url: req.url, headers: req.headers, body }
      res.setHeader('Content-Type', 'application/json')
      res.writeHead(200)
      res.end(JSON.stringify({ ok: true }))
    })
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const port = server.address().port
  const mockUrl = `http://127.0.0.1:${port}`

  try {
    // 构造 fixture：含变更 + local.yaml 指向 mock server
    // 注意：parseSimpleYaml 不剥离值两端引号，故 url/token 不加引号（与 sync.js connect 写入格式一致）
    const f = await makeProjectFixture({ withGit: false })
    writeFileSync(join(f.specBase, 'local.yaml'),
      `platform:\n  url: ${mockUrl}\n  token: test-token-xyz\n`)

    const approvalPath = (enc) => `/api/changes/${enc}/approval`

    // 7a. approve：POST 路径 + body + Authorization Bearer + 落库
    {
      const ok = await approve(f.changeName, f.cwd)
      assert(ok === true, 'approve mock 成功返回 true')
      assert(lastReq && lastReq.method === 'POST', 'approve 用 POST')
      assert(lastReq && lastReq.url === approvalPath(f.changeName),
        `approve POST 路径正确（实际 ${lastReq && lastReq.url}）`)
      // Authorization Bearer 透传
      assert(lastReq && lastReq.headers.authorization === 'Bearer test-token-xyz',
        `Authorization Bearer 透传（实际 ${lastReq && lastReq.headers.authorization}）`)
      // body 含 decision=approved
      const parsed = lastReq ? JSON.parse(lastReq.body) : {}
      assert(parsed.decision === 'approved', `approve body.decision=approved（实际 ${parsed.decision}）`)

      // approvals 表落库：status=approved
      const pm = new ProgressManager({ specDir: f.specBase })
      const db = pm._ensureDB(f.cwd)
      const sqlDb = db.getDb()
      const row = sqlDb.prepare('SELECT a.status FROM approvals a JOIN changes c ON a.change_id = c.id WHERE c.name = ?').get(f.changeName)
      const status = row && row.status
      assert(status === 'approved', `approve 后 approvals.status=approved（实际 ${status}）`)
    }

    // 7b. reject：body 含 decision=rejected + reason + 落库 rejection_reason
    {
      lastReq = null
      const ok = await reject(f.changeName, '原因 A', f.cwd)
      assert(ok === true, 'reject mock 成功返回 true')
      assert(lastReq && lastReq.method === 'POST', 'reject 用 POST')
      assert(lastReq && lastReq.url === approvalPath(f.changeName),
        `reject POST 路径正确（实际 ${lastReq && lastReq.url}）`)
      const parsed = lastReq ? JSON.parse(lastReq.body) : {}
      assert(parsed.decision === 'rejected', `reject body.decision=rejected（实际 ${parsed.decision}）`)
      assert(parsed.reason === '原因 A', `reject body.reason 透传（实际 ${parsed.reason}）`)

      // approvals 表：status=rejected + rejection_reason
      const pm = new ProgressManager({ specDir: f.specBase })
      const db = pm._ensureDB(f.cwd)
      const sqlDb = db.getDb()
      const row = sqlDb.prepare('SELECT a.status, a.rejection_reason FROM approvals a JOIN changes c ON a.change_id = c.id WHERE c.name = ?').get(f.changeName)
      assert(row && row.status === 'rejected', `reject 后 approvals.status=rejected（实际 ${row && row.status}）`)
      assert(row && row.rejection_reason === '原因 A', `reject 后 rejection_reason 落库（实际 ${row && row.rejection_reason}）`)
    }

    // 7c. 失败场景：HTTP 500 → exitCode=1 且表不变
    {
      // 换一个返回 500 的 server
      const server500 = http.createServer((req, res) => { res.writeHead(500); res.end('err') })
      await new Promise((r) => server500.listen(0, '127.0.0.1', r))
      const port500 = server500.address().port
      const url500 = `http://127.0.0.1:${port500}`

      const f2 = await makeProjectFixture({ withGit: false })
      writeFileSync(join(f2.specBase, 'local.yaml'),
        `platform:\n  url: ${url500}\n  token: tok\n`)

      process.exitCode = 0 // 重置
      const ok = await approve(f2.changeName, f2.cwd)
      assert(ok === false, 'HTTP 500 → approve 返回 false')
      assert(process.exitCode === 1, `HTTP 500 → process.exitCode=1（实际 ${process.exitCode}）`)
      // 表不变：无 approvals 行（落库前 HTTP 已失败）
      const pm = new ProgressManager({ specDir: f2.specBase })
      const db = pm._ensureDB(f2.cwd)
      const sqlDb = db.getDb()
      const row = sqlDb.prepare('SELECT a.status FROM approvals a JOIN changes c ON a.change_id = c.id WHERE c.name = ?').get(f2.changeName)
      assert(!row, 'HTTP 500 失败 → approvals 表无新行（落库前置失败）')

      process.exitCode = 0 // 复位，避免污染后续
      server500.close()
    }

    // 7d. 失败场景：网络不可达（端口黑洞）→ exitCode=1
    {
      const f3 = await makeProjectFixture({ withGit: false })
      // 指向一个几乎肯定不可达的地址（127.0.0.1:1 通常是拒绝连接）
      writeFileSync(join(f3.specBase, 'local.yaml'),
        `platform:\n  url: http://127.0.0.1:1\n  token: tok\n`)
      process.exitCode = 0
      const ok = await approve(f3.changeName, f3.cwd)
      assert(ok === false, '网络不可达 → approve 返回 false')
      assert(process.exitCode === 1, `网络不可达 → process.exitCode=1（实际 ${process.exitCode}）`)
      process.exitCode = 0
    }
  } finally {
    server.close()
  }
}

// ─────────────────────────────────────────
// 8. saveWorkflowRun：runtimeRoot+scanRunId 两分支落盘路径
// ─────────────────────────────────────────
console.log('\n--- 8. saveWorkflowRun（平台/本地两分支路径）---')
{
  const result = {
    workflow: 'scan-docs', project: 'demo', status: 'pass', spec_version: 1,
    roles: [], workflow_checks: [], failures: [], retry_prompts: [],
  }

  // 8a. 带 runtimeRoot + scanRunId → <runtimeRoot>/scan-runs/<scanRunId>/workflow-runs/
  {
    const rt = makeTmpDir('mi-wfrt-')
    const saved = saveWorkflowRun(result, { cwd: rt, runtimeRoot: rt, scanRunId: 'run-42', source: 'run.js' })
    assert(saved !== null, 'saveWorkflowRun 平台模式返回路径')
    const expectedDir = join(rt, 'scan-runs', 'run-42', 'workflow-runs')
    assert(saved && saved.startsWith(expectedDir),
      `平台模式落 scan-runs/<scanRunId>/workflow-runs/（实际 ${saved}）`)
    assert(saved && saved.endsWith('.json'), '落盘文件是 .json')
    assert(existsSync(saved), '平台模式文件确实落盘')
    // 内容校验
    const rec = JSON.parse(readFileSync(saved, 'utf8'))
    assert(rec.workflow === 'scan-docs' && rec.source === 'run.js', '落盘内容含 workflow/source')
  }

  // 8b. 不带 runtimeRoot → cwd/.sillyspec/.runtime/workflow-runs/
  {
    const proj = makeTmpDir('mi-wflocal-')
    const saved = saveWorkflowRun(result, { cwd: proj, source: 'cli' })
    assert(saved !== null, 'saveWorkflowRun 本地模式返回路径')
    const expectedDir = join(proj, '.sillyspec', '.runtime', 'workflow-runs')
    assert(saved && saved.startsWith(expectedDir),
      `本地模式落 cwd/.sillyspec/.runtime/workflow-runs/（实际 ${saved}）`)
    assert(existsSync(saved), '本地模式文件确实落盘')
  }
}

// ─────────────────────────────────────────
// 9. --spec-dir 透传 specBase（CLI 接线：derive verify-test 读对 local.yaml）
//    回归 P3 坑 3 sillyspec 侧：index.js gate/derive case 必须把 --spec-dir 作为
//    specBase 透传给 runGate/runDerive；漏传则 --spec-dir 对 verify-test 无效。
//    对照设计：cwd（--dir）下放"注定失败"的 local.yaml，specDir（--spec-dir）下放
//    成功命令 + progress。透传对 → 读 specDir 成功命令 → passed；透传错 → 读 cwd 失败
//    命令 → failed。（gate/derive 透传代码对称，见 index.js case 'gate'/'derive'；
//    此处用 derive verify-test facet 端到端，覆盖 --spec-dir 解析→透传→runVerifyTestCheck 全链路。）
// ─────────────────────────────────────────
console.log('\n--- 9. --spec-dir 透传 specBase（derive verify-test 读对 local.yaml）---')
{
  const binPath = join(worktreeRoot, 'bin', 'sillyspec.js')

  // cwd（--dir）：.sillyspec 下建 progress + 放"失败 local.yaml"做对照（9b 无 --spec-dir 时
  // specBase 回退 resolveSpecDir(cwd) 读到这里）。A4 修复后 pm 从 specBase 读进度——
  // specBase 才是 spec 根（progress + local.yaml 同处），故 proj/.sillyspec 也要有 progress。
  const proj = makeTmpDir('mi-specdir-proj-')
  const projSpec = join(proj, '.sillyspec')
  mkdirSync(projSpec, { recursive: true })
  const pm = new ProgressManager({ specDir: projSpec })
  await pm.init(proj)
  await pm.initChange(proj, 'c1')
  writeFileSync(join(projSpec, 'local.yaml'),
    "commands:\n  test: 'node -e \"process.exit(1)\"'\n")

  // specDir（--spec-dir）：独立 spec 目录，放 progress + "成功 local.yaml"（真实 spec 布局：
  // progress 与 local.yaml 同处；A4 修复后 runDerive 的 pm 从 specBase 读进度，specDir 须有 change）
  const specDir = makeTmpDir('mi-specdir-spec-')
  mkdirSync(specDir, { recursive: true })
  const pm2 = new ProgressManager({ specDir })
  await pm2.init(proj)
  await pm2.initChange(proj, 'c1')
  writeFileSync(join(specDir, 'local.yaml'), 'commands:\n  test: "node --version"\n')

  // 9a. derive verify-test --spec-dir → 读 specDir 成功命令 → passed
  {
    let stdout, status
    try {
      stdout = execFileSync('node',
        [binPath, 'derive', 'verify-test', '--change', 'c1', '--json', '--dir', proj, '--spec-dir', specDir],
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
      status = 0
    } catch (e) {
      stdout = e.stdout ? e.stdout.toString() : ''
      status = e.status ?? 1
    }
    let env
    try { env = JSON.parse(stdout) } catch (e) { env = null }
    assert(env !== null, `derive --spec-dir stdout 可 JSON.parse（实际 ${stdout.slice(0, 120)}）`)
    assert(env && env.facet === 'verify-test', 'envelope.facet=verify-test')
    assert(env && env.data && env.data.status === 'passed',
      `--spec-dir 透传：读到 specDir 的成功命令 → status=passed（实际 ${env && env.data && env.data.status}；若透传错读 cwd 失败命令会 =failed）`)
    // resultPath 落在透传的 specDir 下（间接证明 specBase=specDir 生效）
    assert(env && env.data && env.data.resultPath && env.data.resultPath.includes(specDir),
      `resultPath 落 specDir 下（实际 ${env && env.data && env.data.resultPath}），证明 specBase 透传`)
  }

  // 9b. 同一 proj 不带 --spec-dir → 读 cwd 失败命令 → failed
  //     （唯一变量是 --spec-dir，证明 9a 的 passed 由透传带来）
  {
    let stdout, status
    try {
      stdout = execFileSync('node',
        [binPath, 'derive', 'verify-test', '--change', 'c1', '--json', '--dir', proj],
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
      status = 0
    } catch (e) {
      stdout = e.stdout ? e.stdout.toString() : ''
      status = e.status ?? 1
    }
    let env
    try { env = JSON.parse(stdout) } catch (e) { env = null }
    assert(env !== null, `对照 stdout 可 JSON.parse（实际 ${stdout.slice(0, 120)}）`)
    assert(env && env.data && env.data.status === 'failed',
      `无 --spec-dir 对照：读 cwd 失败命令 → status=failed（实际 ${env && env.data && env.data.status}，证明 9a 的 passed 由透传带来）`)
  }
}

// ─────────────────────────────────────────
// 10. runStatusOverview：全局状态总览（progress show --json，单一状态源 2026-09-02）
// ─────────────────────────────────────────
console.log('--- 10. runStatusOverview（progress show --json）---')
{
  const { runStatusOverview } = await import('../src/machine-interface.js')
  const binPath = join(worktreeRoot, 'bin', 'sillyspec.js')

  // 10a. DB 不存在 → fail-closed exit 2，不建库（只读契约同 gate）
  {
    const proj = makeTmpDir('mi-ov-nodb-')
    const specBase = join(proj, '.sillyspec')
    mkdirSync(specBase, { recursive: true })
    const { envelope, exitCode } = runStatusOverview({ cwd: proj })
    assert(exitCode === EXIT_UNKNOWN, `DB 不存在 → exit 2（实际 ${exitCode}）`)
    assert(envelope.ok === false && envelope.errors.length > 0, 'DB 不存在 → ok=false + errors 非空')
    assert(!existsSync(join(specBase, '.runtime', 'sillyspec.db')), 'DB 不存在时不建库（只读契约）')
  }

  // 10b. 有活跃变更 → exit 0，envelope 含变更明细（stage/steps/ghost/stall 字段契约）
  {
    const { cwd, specBase, changeName } = await makeProjectFixture({ changeName: 'c1' })
    const { envelope, exitCode } = runStatusOverview({ cwd, specBase })
    assert(exitCode === EXIT_OK, `有活跃变更 → exit 0（实际 ${exitCode}）`)
    assert(envelope.ok === true, 'ok=true')
    assert(envelope.command === 'progress show', 'command=progress show')
    assert(envelope.data && envelope.data.active_changes === 1, `active_changes=1（实际 ${envelope.data && envelope.data.active_changes}）`)
    const c = envelope.data.changes[0]
    assert(c && c.name === changeName, `changes[0].name=${changeName}`)
    assert(c.ghost === false, '正常 fixture → ghost=false')
    assert(c.readable === true, 'readable=true')
    assert(typeof c.current_stage === 'string' || c.current_stage === null, 'current_stage 字段存在')
    assert(c.stages && typeof c.stages === 'object', 'stages 汇总对象存在')
    assert(c.steps && typeof c.steps.total === 'number' && typeof c.steps.completed === 'number', 'steps {total,completed} 数值汇总')
  }

  // 10c. ghost 变更（DB 有记录、目录缺失）→ ghost=true + warnings 透出
  {
    const { cwd, specBase, changeName } = await makeProjectFixture({ changeName: 'c-ghost' })
    rmSync(join(specBase, 'changes', changeName), { recursive: true, force: true })
    const { envelope, exitCode } = runStatusOverview({ cwd, specBase })
    assert(exitCode === EXIT_OK, 'ghost 存在仍 exit 0（总览成功，ghost 是待清理事实非阻断）')
    const c = envelope.data.changes.find(x => x.name === changeName)
    assert(c && c.ghost === true, '目录缺失 → ghost=true')
    assert(envelope.warnings.length === 1 && envelope.warnings[0].includes(changeName), 'ghost 升 warnings（含变更名）')
  }

  // 10d. 只读性：调用前后 DB project/changes 行不变（D-002 同源验证）
  {
    const { cwd, specBase, dbPath } = await makeProjectFixture({ changeName: 'c-ro' })
    const before = readFileSync(dbPath)
    runStatusOverview({ cwd, specBase })
    const after = readFileSync(dbPath)
    assert(before.equals(after), '总览调用前后 DB 文件字节不变（只读契约）')
  }

  // 10e. CLI 端到端：progress show --json stdout 纯 JSON 可解析（含 ghost 变更）
  {
    const { cwd, specBase } = await makeProjectFixture({ changeName: 'c-cli' })
    let stdout, status
    try {
      stdout = execFileSync('node', [binPath, 'progress', 'show', '--json', '--dir', cwd],
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
      status = 0
    } catch (e) {
      stdout = e.stdout ? e.stdout.toString() : ''
      status = e.status ?? 1
    }
    let env
    try { env = JSON.parse(stdout) } catch { env = null }
    assert(env !== null, `CLI stdout 可 JSON.parse（实际 ${stdout.slice(0, 120)}）`)
    assert(status === 0, `CLI 退出码 0（实际 ${status}）`)
    assert(env && env.ok === true && env.data && Array.isArray(env.data.changes), 'CLI envelope.data.changes 数组')
  }

  // 10f. P2-2-①：未决同步冲突透出（pending_conflicts + warnings 升条）
  {
    const { cwd, specBase, changeName } = await makeProjectFixture({ changeName: 'c-cf' })
    // 造两类冲突文件（progress + spec-tree），字段与 sync.js listConflictFiles 对齐
    mkdirSync(join(specBase, '.runtime'), { recursive: true })
    writeFileSync(join(specBase, '.runtime', `sync-conflict-${changeName}.json`),
      JSON.stringify({ change: changeName, created_at: '2026-09-02T10:00:00Z' }))
    writeFileSync(join(specBase, '.runtime', `spec-sync-conflict-${changeName}.json`),
      JSON.stringify({ change: changeName }))
    const { envelope, exitCode } = runStatusOverview({ cwd, specBase })
    assert(exitCode === EXIT_OK, '有冲突仍 exit 0（总览成功，冲突是待处理事实非阻断）')
    assert(Array.isArray(envelope.data.pending_conflicts) && envelope.data.pending_conflicts.length === 2,
      `pending_conflicts 含 2 条（实际 ${JSON.stringify(envelope.data.pending_conflicts)}）`)
    const types = envelope.data.pending_conflicts.map(c => c.type).sort()
    assert(JSON.stringify(types) === JSON.stringify(['progress', 'spec-tree']), `type 字段区分两类冲突（实际 ${types}）`)
    assert(envelope.warnings.some(w => w.includes(changeName) && w.includes('未决同步冲突')),
      '冲突升 warnings（含变更名，面板看顶层即知）')
    // 损坏文件容错：写一个坏 JSON → 按文件名兜底不崩
    writeFileSync(join(specBase, '.runtime', 'sync-conflict-broken.json'), '{oops')
    const again = runStatusOverview({ cwd, specBase })
    assert(again.exitCode === EXIT_OK && again.envelope.data.pending_conflicts.some(c => c.change === 'broken'),
      '损坏冲突文件按文件名兜底（不崩、change=broken）')

    // 10f-补丁：挂在非活跃变更上的冲突，人类可读 show 全局段也显示（治 11 条漏显盲区）
    // 注：全局段在多变更汇总分支——fixture 需 ≥2 活跃 change（单变更走 _showChange 详情分支）
    writeFileSync(join(specBase, '.runtime', 'sync-conflict-archived-old.json'),
      JSON.stringify({ change: 'archived-old', created_at: '2026-09-01T00:00:00Z' }))
    {
      const { ProgressManager } = await import('../src/progress.js')
      const pmShow = new ProgressManager({ specDir: specBase })
      await pmShow.initChange(cwd, 'second-active')
      let showOut = ''
      const origShowLog = console.log
      console.log = (...a) => { showOut += a.join(' ') + '\n' }
      try {
        pmShow.show(cwd)
      } finally {
        console.log = origShowLog
      }
      assert(showOut.includes('未决同步冲突') && showOut.includes('archived-old'),
        'show 人类可读全局段兜底显示非活跃变更的冲突（archived-old 可见）')
    }
  }
}

// ─────────────────────────────────────────
// 清理 & 汇总
// ─────────────────────────────────────────
for (const dir of tmpRoots) {
  try { rmSync(dir, { recursive: true, force: true }) } catch {}
}

console.log('\n==================================================')
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
console.log('==================================================')
if (failed > 0) process.exit(1)
