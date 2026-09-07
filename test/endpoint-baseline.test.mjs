// endpoint-baseline 收官测试 — 变更 2026-09-07-endpoint-baseline task-04
//
// 被测对象（commit 005c70d/282b7a6/d478439）：
//   - src/endpoint-baseline.js：captureEndpointBaseline（幂等首拍/exists 不覆盖 + fail-soft +
//     baseCommit git 仓 HEAD short/非仓 null）+ diffEndpointSets（归一键集合运算纯函数——
//     参数改名/method 大小写/尾斜杠同键不假报；键真变天然呈 removed+added 独立行）。
//   - src/index.js endpoints baseline CLI：bin 子进程——生成/幂等跳过/--json 信封/缺 --change
//     exit 2；worktree 主仓锚定（临时 git 仓 + git worktree add，cwd 在 worktree 内跑断言
//     基线落主仓 endpoint-baselines/ 且内容 pre-change 态——worktree 内是交付态不可作 before）。
//   - src/archive-delta.js 第五源：buildDeltaReport 直调——有基线+现算差异出增删表行；
//     无基线出降级注记；backendEndpoints=0 门控无「### 端点基线提示」节。
//   - src/stages/execute.js Step3「确认 worktree 路径」prompt 含 baseline 指引（读文件断言文本）。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync, execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { captureEndpointBaseline, diffEndpointSets } from '../src/endpoint-baseline.js'
import { scanBackendEndpoints } from '../src/endpoint-extractor.js'
import { buildDeltaReport } from '../src/archive-delta.js'

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const BIN = join(REPO_ROOT, 'bin', 'sillyspec.js')
const EXECUTE_JS = join(REPO_ROOT, 'src', 'stages', 'execute.js')

// ─── 脚手架 ─────────────────────────────────────────────────────────────────

const tmpRoots = []
function makeTmp(prefix) {
  const d = mkdtempSync(join(tmpdir(), prefix))
  tmpRoots.push(d)
  return d
}
test.onFinish?.(() => {
  for (const t of tmpRoots) { try { rmSync(t, { recursive: true, force: true }) } catch {} }
})

function gitAt(dir, args) {
  return execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
}
function initGitRepo(dir) {
  gitAt(dir, ['init', '-q'])
  gitAt(dir, ['config', 'user.email', 'test@test.local'])
  gitAt(dir, ['config', 'user.name', 'test'])
  gitAt(dir, ['config', 'commit.gpgsign', 'false'])
}
function commitAll(dir, msg) {
  gitAt(dir, ['add', '.'])
  gitAt(dir, ['commit', '-q', '-m', msg])
}

function runCLI(args, { cwd, timeout = 60_000 } = {}) {
  const r = spawnSync(process.execPath, [BIN, ...args], { cwd, encoding: 'utf8', timeout, stdio: ['pipe', 'pipe', 'pipe'] })
  return { stdout: r.stdout || '', stderr: r.stderr || '', status: r.status, combined: (r.stdout || '') + (r.stderr || '') }
}

/** stdout 中提取首个 JSON 对象（容忍前置人类提示行；--json 纪律下应已纯净，防御性兜底）。 */
function parseFirstJson(s) {
  const m = s.match(/\{[\s\S]*\n\}/)
  try { return m ? JSON.parse(m[0]) : null } catch { return null }
}

// ─── FastAPI router fixture（endpoint-extractor 全套提取器的真实扫描路径）─────

const PY_TWO = [
  'from fastapi import APIRouter',
  '',
  'router = APIRouter(prefix="/api")',
  '',
  '@router.get("/items")',
  'async def list_items():',
  '    ...',
  '',
  '@router.post("/items")',
  'async def create_item():',
  '    ...',
  '',
].join('\n')

// 变更后新增 DELETE /api/items/{id}（幂等测试：代码已变，重拍不得覆盖首拍快照）
const PY_MORE = PY_TWO + [
  '@router.delete("/items/{id}")',
  'async def delete_item():',
  '    ...',
  '',
].join('\n')

// worktree 锚定测试：主仓 pre 态（1 端点）× worktree 交付态（2 端点，+ POST /pre/new）
const PY_PRE = [
  'from fastapi import APIRouter',
  '',
  'router = APIRouter(prefix="/pre")',
  '',
  '@router.get("/old")',
  'async def get_old():',
  '    ...',
  '',
].join('\n')
const PY_AFTER = PY_PRE + [
  '@router.post("/new")',
  'async def post_new():',
  '    ...',
  '',
].join('\n')

// delta 集成测试的现算态：GET /api/items + POST /api/items + GET /api/v2/items（3 端点）
const PY_CUR = [
  'from fastapi import APIRouter',
  '',
  'router = APIRouter(prefix="/api")',
  '',
  '@router.get("/items")',
  'async def list_items():',
  '    ...',
  '',
  '@router.post("/items")',
  'async def create_item():',
  '    ...',
  '',
  '@router.get("/v2/items")',
  'async def list_items_v2():',
  '    ...',
  '',
].join('\n')

// ═════════════════════════════════════════════════════════════════════════════
// 1. captureEndpointBaseline（纯函数：幂等 / fail-soft / baseCommit）
// ═════════════════════════════════════════════════════════════════════════════

test('capture 首拍：written:true + count + payload 形态（schemaVersion/change/endpoints/generatedAt）', () => {
  const root = makeTmp('eb-cap1-')
  writeFileSync(join(root, 'router.py'), PY_TWO)
  const cn = '2026-09-07-eb-cap1'
  const res = captureEndpointBaseline({ cwd: root, changeName: cn, runtimeRoot: join(root, 'runtime') })

  assert.equal(res.written, true, '首拍 written:true')
  assert.equal(res.count, 2, 'count=扫描端点数（GET+POST /api/items）')
  assert.ok(res.path && res.path.endsWith(join('endpoint-baselines', `${cn}.json`)), '返回 path 指向 <runtimeRoot>/endpoint-baselines/<change>.json')
  assert.ok(existsSync(res.path), '基线文件已落盘')

  const payload = JSON.parse(readFileSync(res.path, 'utf8'))
  assert.equal(payload.schemaVersion, 1, 'schemaVersion:1')
  assert.equal(payload.change, cn, 'payload.change 回填变更名')
  assert.ok(!Number.isNaN(Date.parse(payload.generatedAt)), 'generatedAt 为可解析 ISO 时刻')
  assert.deepEqual(payload.endpoints.map(e => `${e.method} ${e.path}`).sort(), ['GET /api/items', 'POST /api/items'],
    'endpoints 为 {method,path,source} 数组（FastAPI 提取器真实扫描）')
  assert.ok(payload.endpoints.every(e => typeof e.source === 'string' && e.source.endsWith('router.py')), 'source 保留扫描来源文件')
})

test('capture 幂等：重跑 exists 不覆盖（代码已变全文仍逐字节一致，generatedAt 不变）', () => {
  const root = makeTmp('eb-cap2-')
  writeFileSync(join(root, 'router.py'), PY_TWO)
  const cn = '2026-09-07-eb-cap2'
  const first = captureEndpointBaseline({ cwd: root, changeName: cn, runtimeRoot: join(root, 'runtime') })
  const firstText = readFileSync(first.path, 'utf8')
  const firstAt = JSON.parse(firstText).generatedAt

  // 变更后（+1 端点）重拍：幂等守卫拦截，不覆盖首拍快照
  writeFileSync(join(root, 'router.py'), PY_MORE)
  const second = captureEndpointBaseline({ cwd: root, changeName: cn, runtimeRoot: join(root, 'runtime') })

  assert.equal(second.written, false, '重跑 written:false')
  assert.equal(second.reason, 'exists', '重跑 reason:exists')
  assert.equal(readFileSync(first.path, 'utf8'), firstText, '文件全文逐字节不变（首拍即变更前状态）')
  assert.equal(JSON.parse(firstText).generatedAt, firstAt, 'generatedAt 不变（无重写）')
})

test('capture 幂等守卫先于扫描：扫描根消失后重跑仍 exists（不重扫不抛）', () => {
  const root = makeTmp('eb-cap3-')
  const scanDir = join(root, 'scan')
  mkdirSync(scanDir, { recursive: true })
  writeFileSync(join(scanDir, 'router.py'), PY_TWO)
  const cn = '2026-09-07-eb-cap3'
  const runtimeRoot = join(root, 'runtime') // runtimeRoot 独立于扫描根（删 scan 不动基线）
  const first = captureEndpointBaseline({ cwd: scanDir, changeName: cn, runtimeRoot })
  assert.equal(first.written, true, '前置：首拍成功')

  rmSync(scanDir, { recursive: true, force: true })
  const second = captureEndpointBaseline({ cwd: scanDir, changeName: cn, runtimeRoot })
  assert.deepEqual(second, { written: false, reason: 'exists' }, '扫描根不存在 + 基线已存在 → 直接 exists（存在性检查先于扫描，不做无效重扫）')
})

test('capture fail-soft：扫描根不存在（首次拍）→ 不抛、written:true、空端点集基线仍可拍', () => {
  const root = makeTmp('eb-cap4-')
  const cn = '2026-09-07-eb-cap4'
  const res = captureEndpointBaseline({ cwd: join(root, 'no-such-scan-root'), changeName: cn, runtimeRoot: join(root, 'runtime') })

  assert.equal(res.written, true, '扫描根不存在不阻断（scanBackendEndpoints fail-soft 返回 []）')
  assert.equal(res.count, 0, 'count=0')
  assert.ok(!('error' in res), '无 error 字段（非异常路径）')
  assert.deepEqual(JSON.parse(readFileSync(res.path, 'utf8')).endpoints, [], '落盘空端点集（端点集是主体，baseCommit 可后补语境）')
})

test('capture baseCommit：git 仓 → HEAD short；非仓目录 → null', () => {
  const repo = makeTmp('eb-git-')
  initGitRepo(repo)
  writeFileSync(join(repo, 'router.py'), PY_TWO)
  commitAll(repo, 'init')
  const shortHead = gitAt(repo, ['rev-parse', '--short', 'HEAD'])
  const inRepo = captureEndpointBaseline({ cwd: repo, changeName: '2026-09-07-eb-git', runtimeRoot: join(repo, 'rr') })
  const gitPayload = JSON.parse(readFileSync(inRepo.path, 'utf8'))
  assert.match(gitPayload.baseCommit, /^[0-9a-f]{7,40}$/, 'git 仓内为 short SHA 形态')
  assert.equal(gitPayload.baseCommit, shortHead, '与 git rev-parse --short HEAD 一致')

  const plain = makeTmp('eb-plain-')
  writeFileSync(join(plain, 'router.py'), PY_TWO)
  const nonRepo = captureEndpointBaseline({ cwd: plain, changeName: '2026-09-07-eb-plain', runtimeRoot: join(plain, 'rr') })
  assert.equal(JSON.parse(readFileSync(nonRepo.path, 'utf8')).baseCommit, null, '非 git 仓 → null（rev-parse fail-soft，基线仍可拍）')
})

// ═════════════════════════════════════════════════════════════════════════════
// 2. diffEndpointSets（归一键集合运算纯函数）
// ═════════════════════════════════════════════════════════════════════════════

test('diff 归一全套：参数改名同键（:id/{plan_id} vs {param}/{plan_id}）+ method 大小写 + 尾斜杠 → 不假报', () => {
  const dParam = diffEndpointSets(
    [{ method: 'GET', path: '/api/ppm/project-plan/:id/{plan_id}', source: 'a.py' }],
    [{ method: 'GET', path: '/api/ppm/project-plan/{param}/{plan_id}', source: 'b.py' }],
  )
  assert.deepEqual(dParam, { added: [], removed: [] }, ':id 与 {param} 归一为同键——参数改名不产生增删行')

  const dCase = diffEndpointSets(
    [{ method: 'get', path: '/api/x/', source: 'a.py' }],
    [{ method: 'GET', path: '/api/x', source: 'b.py' }],
  )
  assert.deepEqual(dCase, { added: [], removed: [] }, 'method 小写 + 尾斜杠归一为同键')
})

test('diff 键真变独立行：path v1→v2 / method GET→POST 各呈 removed+added 两条（changed 不配对）', () => {
  const dPath = diffEndpointSets(
    [{ method: 'GET', path: '/api/v1/items', source: 'old.py' }],
    [{ method: 'GET', path: '/api/v2/items', source: 'new.py' }],
  )
  assert.deepEqual(dPath.removed, [{ method: 'GET', path: '/api/v1/items', source: 'old.py' }], 'path 变更 → removed 一条独立行（v1）')
  assert.deepEqual(dPath.added, [{ method: 'GET', path: '/api/v2/items', source: 'new.py' }], 'path 变更 → added 一条独立行（v2）')

  const dMethod = diffEndpointSets(
    [{ method: 'GET', path: '/api/items', source: 'old.py' }],
    [{ method: 'POST', path: '/api/items', source: 'new.py' }],
  )
  assert.deepEqual(dMethod.removed, [{ method: 'GET', path: '/api/items', source: 'old.py' }], 'method 变更 → removed 一条（GET）')
  assert.deepEqual(dMethod.added, [{ method: 'POST', path: '/api/items', source: 'new.py' }], 'method 变更 → added 一条（POST）')
})

test('diff 边界：null / 非数组 / 空集（任一输入 null → null；空×空 → 空结果非 null）', () => {
  assert.equal(diffEndpointSets(null, []), null, 'baseline=null → null（调用方降级：无基线不比）')
  assert.equal(diffEndpointSets([], null), null, 'current=null → null（现算不可得不比）')
  assert.equal(diffEndpointSets(null, null), null, '双 null → null')
  assert.equal(diffEndpointSets('not-an-array', []), null, '非数组输入按 null 语义降级')
  assert.deepEqual(diffEndpointSets([], []), { added: [], removed: [] }, '空集×空集 → 空增删（非 null——两侧均合法可比）')
})

test('diff 同键重复输入去重：保留首个，不产生重复行', () => {
  const d = diffEndpointSets(
    [
      { method: 'GET', path: '/api/x', source: 'first.py' },
      { method: 'GET', path: '/api/x', source: 'dup.py' },
    ],
    [],
  )
  assert.equal(d.removed.length, 1, '同键两条只出一行')
  assert.equal(d.removed[0].source, 'first.py', '保留首个（Map 首写胜出）')
})

// ═════════════════════════════════════════════════════════════════════════════
// 3. endpoints baseline CLI（bin 子进程，临时 fixture 普通仓）
// ═════════════════════════════════════════════════════════════════════════════

test('CLI 生成 + 幂等跳过 + baseCommit 透传（bin/sillyspec.js 子进程）', () => {
  const root = makeTmp('eb-cli1-')
  initGitRepo(root)
  mkdirSync(join(root, 'backend'), { recursive: true })
  writeFileSync(join(root, 'backend', 'app.py'), PY_TWO)
  writeFileSync(join(root, '.gitignore'), '.sillyspec/\n')
  commitAll(root, 'init')
  const shortHead = gitAt(root, ['rev-parse', '--short', 'HEAD'])
  mkdirSync(join(root, '.sillyspec'), { recursive: true }) // 预建 spec，钉死 resolveSpecDir 解析落点
  const cn = '2026-09-07-eb-cli'
  const baselinePath = join(root, '.sillyspec', '.runtime', 'endpoint-baselines', `${cn}.json`)

  const r1 = runCLI(['endpoints', 'baseline', '--change', cn], { cwd: root })
  assert.equal(r1.status, 0, `生成 exit 0（combined 尾：${r1.combined.slice(-200)}）`)
  assert.ok(existsSync(baselinePath), `基线落 <cwd>/.sillyspec/.runtime/endpoint-baselines/${cn}.json`)
  assert.ok(r1.combined.includes('已拍变更前端点基线（2 个端点）'), 'stdout 提示已拍 + 端点数')
  assert.ok(r1.combined.includes('幂等'), 'stdout 附幂等语义说明')

  const payload = JSON.parse(readFileSync(baselinePath, 'utf8'))
  assert.equal(payload.change, cn, 'payload.change')
  assert.deepEqual(payload.endpoints.map(e => `${e.method} ${e.path}`).sort(), ['GET /api/items', 'POST /api/items'], 'CLI 扫描根=cwd，端点集完整')
  assert.equal(payload.baseCommit, shortHead, 'CLI 层 baseCommit 透传（HEAD short）')
  const firstText = readFileSync(baselinePath, 'utf8')

  const r2 = runCLI(['endpoints', 'baseline', '--change', cn], { cwd: root })
  assert.equal(r2.status, 0, `幂等重跑 exit 0（实际 ${r2.status}）`)
  assert.ok(r2.combined.includes('已存在，跳过（幂等不覆盖）'), 'stdout 提示已存在跳过')
  assert.equal(readFileSync(baselinePath, 'utf8'), firstText, '重跑不覆盖（全文不变）')
})

test('CLI --json envelope（首拍 written:true + 重跑 reason:exists）+ 缺 --change exit 2', () => {
  const root = makeTmp('eb-cli2-')
  initGitRepo(root)
  mkdirSync(join(root, 'backend'), { recursive: true })
  writeFileSync(join(root, 'backend', 'app.py'), PY_TWO)
  commitAll(root, 'init')
  mkdirSync(join(root, '.sillyspec'), { recursive: true })
  const cn = '2026-09-07-eb-json'

  const r1 = runCLI(['endpoints', 'baseline', '--change', cn, '--json'], { cwd: root })
  assert.equal(r1.status, 0, `--json 首拍 exit 0（实际 ${r1.status}）`)
  const env1 = parseFirstJson(r1.stdout)
  assert.ok(env1, 'stdout 为可解析 JSON')
  assert.equal(env1.command, 'endpoints-baseline', 'envelope.command')
  assert.equal(env1.change, cn, 'envelope.change')
  assert.equal(env1.ok, true, 'envelope.ok:true')
  assert.equal(env1.written, true, 'envelope.written:true')
  assert.equal(env1.count, 2, 'envelope.count')
  assert.ok(String(env1.path).endsWith(join('endpoint-baselines', `${cn}.json`)), 'envelope.path 绝对路径')

  const r2 = runCLI(['endpoints', 'baseline', '--change', cn, '--json'], { cwd: root })
  assert.equal(r2.status, 0, '--json 幂等重跑 exit 0')
  const env2 = parseFirstJson(r2.stdout)
  assert.equal(env2.ok, true, '幂等跳过 ok 仍 true（非错误）')
  assert.equal(env2.written, false, 'envelope.written:false')
  assert.equal(env2.reason, 'exists', 'envelope.reason:exists')

  const r3 = runCLI(['endpoints', 'baseline'], { cwd: root })
  assert.equal(r3.status, 2, `缺 --change exit 2（实际 ${r3.status}）`)
  assert.ok(r3.combined.includes('用法'), '用法文案')
  assert.ok(r3.combined.includes('endpoints baseline --change'), '用法含命令行形态')
})

// ═════════════════════════════════════════════════════════════════════════════
// 4. CLI worktree 主仓锚定（临时 git 仓 + git worktree add；cwd 在 worktree 内跑）
// ═════════════════════════════════════════════════════════════════════════════

test('CLI worktree 锚定：基线落主仓 endpoint-baselines/ 且内容 pre-change 态（非 worktree 交付态）', () => {
  const fx = makeTmp('eb-wt-')
  const mainRoot = join(fx, 'main')
  const wtRoot = join(fx, 'wt')

  // 主仓：pre-change 代码（1 端点）已提交；.sillyspec 手建不入版本库（gitignore）
  mkdirSync(join(mainRoot, 'backend'), { recursive: true })
  writeFileSync(join(mainRoot, 'backend', 'app.py'), PY_PRE)
  writeFileSync(join(mainRoot, '.gitignore'), '.sillyspec/\n')
  initGitRepo(mainRoot)
  commitAll(mainRoot, 'pre-change')
  const shortHead = gitAt(mainRoot, ['rev-parse', '--short', 'HEAD'])
  mkdirSync(join(mainRoot, '.sillyspec'), { recursive: true })

  // linked worktree（--git-dir ≠ --git-common-dir 判据的真实形态）+ 交付态代码（2 端点）
  gitAt(mainRoot, ['worktree', 'add', '-q', '-b', 'feat-delivery', wtRoot])
  writeFileSync(join(wtRoot, 'backend', 'app.py'), PY_AFTER)

  const cn = '2026-09-07-eb-wt'
  const r = runCLI(['endpoints', 'baseline', '--change', cn], { cwd: wtRoot })

  assert.equal(r.status, 0, `worktree 内跑 exit 0（combined 尾：${r.combined.slice(-200)}）`)
  assert.ok(r.combined.includes('基线扫描根与落点已锚定主仓'), 'stdout 提示扫描根与落点锚定主仓')

  const baselinePath = join(mainRoot, '.sillyspec', '.runtime', 'endpoint-baselines', `${cn}.json`)
  assert.ok(existsSync(baselinePath), `基线落主仓 ${join('.sillyspec', '.runtime', 'endpoint-baselines')}（防 worktree .runtime 随清理丢失）`)
  assert.ok(!existsSync(join(wtRoot, '.sillyspec')), 'worktree 副本内无 spec/基线残留（gitignore 语义下本就不检出）')

  const payload = JSON.parse(readFileSync(baselinePath, 'utf8'))
  assert.deepEqual(payload.endpoints.map(e => `${e.method} ${e.path}`), ['GET /pre/old'],
    '基线内容 = 主仓 pre-change 态（变更前代码在主仓；worktree 内是交付态不可作 before）')
  assert.ok(!payload.endpoints.some(e => e.path.includes('/new')), '交付态新增端点（POST /pre/new）不混入基线')
  assert.equal(payload.baseCommit, shortHead, 'baseCommit = 主仓 HEAD short（锚定后的 cwd）')
})

test('CLI worktree 锚定保险二：显式 --spec-dir 指向 worktree 副本仍锚定主仓（EB 审查 nit-3 专测）', () => {
  const fx = makeTmp('eb-wt2-')
  const mainRoot = join(fx, 'main')
  const wtRoot = join(fx, 'wt')

  mkdirSync(join(mainRoot, 'backend'), { recursive: true })
  writeFileSync(join(mainRoot, 'backend', 'app.py'), PY_PRE)
  writeFileSync(join(mainRoot, '.gitignore'), '.sillyspec/\n')
  initGitRepo(mainRoot)
  commitAll(mainRoot, 'pre-change')
  mkdirSync(join(mainRoot, '.sillyspec'), { recursive: true })

  gitAt(mainRoot, ['worktree', 'add', '-q', '-b', 'feat2', wtRoot])
  writeFileSync(join(wtRoot, 'backend', 'app.py'), PY_AFTER)
  // 误导源：worktree 副本内手建 spec 目录（resolvePlatformSpecDir 会返回显式路径）
  mkdirSync(join(wtRoot, '.sillyspec', 'changes'), { recursive: true })

  const cn = '2026-09-07-eb-wt2'
  const r = runCLI(['endpoints', 'baseline', '--change', cn, '--spec-dir', join(wtRoot, '.sillyspec')], { cwd: wtRoot })

  assert.equal(r.status, 0, `显式 --spec-dir 指副本 exit 0（combined 尾：${r.combined.slice(-200)}）`)
  const baselinePath = join(mainRoot, '.sillyspec', '.runtime', 'endpoint-baselines', `${cn}.json`)
  assert.ok(existsSync(baselinePath), '基线仍落主仓 runtimeRoot（drift 检查恒跑，显式副本路径不豁免锚定）')
  assert.ok(!existsSync(join(wtRoot, '.sillyspec', '.runtime', 'endpoint-baselines', `${cn}.json`)), '副本 .runtime 无基线残留')
  const payload = JSON.parse(readFileSync(baselinePath, 'utf8'))
  assert.ok(payload.endpoints.every(e => !e.path.includes('/new')), '内容仍为 pre-change 态（锚定后扫描主仓代码）')
})

// ═════════════════════════════════════════════════════════════════════════════
// 5. archive-delta 第五源集成（buildDeltaReport 直调）
// ═════════════════════════════════════════════════════════════════════════════

/** delta 集成 fixture：spec/changes/<cn>/verify-facts.json + runtime/endpoint-baselines/<cn>.json +
 *  cur/app.py 现算根。baselineEps=null → 不落基线文件（无基线降级路径）。 */
function buildDeltaFixture({ backendEndpoints, baselineEps } = {}) {
  const root = makeTmp('eb-delta-')
  const cn = '2026-09-07-eb-delta'
  const specRoot = join(root, 'spec')
  const changeDir = join(specRoot, 'changes', cn)
  const runtimeRoot = join(root, 'runtime')
  mkdirSync(changeDir, { recursive: true })
  mkdirSync(runtimeRoot, { recursive: true })
  writeFileSync(join(changeDir, 'verify-facts.json'), JSON.stringify({
    schemaVersion: 1,
    change: cn,
    generatedAt: '2026-09-07T00:00:00.000Z',
    probes: { probe5: { command: 'sillyspec verify-probes --change x', metrics: { backendEndpoints } } },
  }, null, 2))
  if (baselineEps) {
    mkdirSync(join(runtimeRoot, 'endpoint-baselines'), { recursive: true })
    writeFileSync(join(runtimeRoot, 'endpoint-baselines', `${cn}.json`), JSON.stringify({
      schemaVersion: 1, change: cn, baseCommit: 'abc1234',
      generatedAt: '2026-09-07T00:00:00.000Z', endpoints: baselineEps,
    }, null, 2))
  }
  const curRoot = join(root, 'cur')
  mkdirSync(curRoot, { recursive: true })
  writeFileSync(join(curRoot, 'app.py'), PY_CUR)
  return { cn, specRoot, changeDir, runtimeRoot, curRoot }
}

test('delta 集成：有基线 + 现算差异 → After 端点增删表（+ 新增 / - 删除 各自格行）', () => {
  const fx = buildDeltaFixture({
    backendEndpoints: 5,
    baselineEps: [
      { method: 'GET', path: '/api/items', source: 'backend/app.py' },
      { method: 'GET', path: '/api/v1/items', source: 'backend/app.py' },
    ],
  })
  const md = buildDeltaReport({
    changeDir: fx.changeDir, specRoot: fx.specRoot, project: 'demo',
    runtimeRoot: fx.runtimeRoot, cwd: fx.curRoot, now: '2026-09-07T08:00:00.000Z',
  })

  assert.ok(md.includes('### 端点基线提示'), 'backendEndpoints=5 > 0 → 端点基线提示节出现（门控不变）')
  assert.ok(md.includes('| 增删 | method | path | source |'), '增删表表头')
  assert.ok(md.includes('| + 新增 | POST | /api/items |'), '新增行：POST /api/items（现算新 method）')
  assert.ok(md.includes('| + 新增 | GET | /api/v2/items |'), '新增行：GET /api/v2/items（现算新 path）')
  assert.ok(md.includes('| - 删除 | GET | /api/v1/items |'), '删除行：GET /api/v1/items（基线侧消失）')
  assert.ok(md.includes('端点 diff：基线 2 端点 × 现算 3 端点'), '计数行（基线 × 现算，changed 不配对天然独立行）')
})

test('delta 集成：无基线（backendEndpoints>0）→ 降级注记不比对', () => {
  const fx = buildDeltaFixture({ backendEndpoints: 5, baselineEps: null })
  const md = buildDeltaReport({
    changeDir: fx.changeDir, specRoot: fx.specRoot, project: 'demo',
    runtimeRoot: fx.runtimeRoot, cwd: fx.curRoot, now: '2026-09-07T08:00:00.000Z',
  })
  assert.ok(md.includes('### 端点基线提示'), '门控只看 backendEndpoints>0，与有无基线无关 → 节仍出现')
  assert.ok(md.includes('无基线（变更未拍 baseline）'), '基线缺失降级注记')
  assert.ok(md.includes(join(fx.runtimeRoot, 'endpoint-baselines', `${fx.cn}.json`)), '注记含期望基线路径（补拍指引语境）')
  assert.ok(!md.includes('| + 新增 |'), '无基线不出增删表')
})

test('delta 集成：backendEndpoints=0 → 无「### 端点基线提示」节（Gap-4 无端点变更不收噪音）', () => {
  const fx = buildDeltaFixture({ backendEndpoints: 0, baselineEps: null })
  const md = buildDeltaReport({
    changeDir: fx.changeDir, specRoot: fx.specRoot, project: 'demo',
    runtimeRoot: fx.runtimeRoot, cwd: fx.curRoot, now: '2026-09-07T08:00:00.000Z',
  })
  assert.ok(!md.includes('### 端点基线提示'), 'backendEndpoints=0 → 端点提示节缺席')
  assert.ok(!md.includes('端点 diff') && !md.includes('无基线'), '节内任何形态均不出现')
})

test('delta 集成：基线 == 现算 → 「无增删」一行（EB 审查 nit-2 渲染级断言）', () => {
  const fx = buildDeltaFixture({ backendEndpoints: 3 })
  const current = scanBackendEndpoints(fx.curRoot)
  assert.ok(current.length > 0, `fixture 现算非空（实际 ${current.length}）`)
  const fx2 = buildDeltaFixture({ backendEndpoints: 3, baselineEps: current })
  const md = buildDeltaReport({
    changeDir: fx2.changeDir, specRoot: fx2.specRoot, project: 'demo',
    runtimeRoot: fx2.runtimeRoot, cwd: fx2.curRoot, now: '2026-09-07T08:00:00.000Z',
  })
  assert.ok(md.includes('### 端点基线提示'), '门控命中 → 节出现')
  assert.ok(md.includes(`端点增删：无增删（基线 ${current.length} 端点 × 现算 ${current.length} 端点`),
    '「无增删」渲染行（基线×现算计数）')
  assert.ok(!md.includes('| + 新增 |') && !md.includes('| - 删除 |'), '无增删不出增删表')
})

test('delta 集成：基线在 + 现算不可得（cwd 为文件 ENOTDIR）→ 现算失败降级注记（EB 审查 nit-2 渲染级断言）', () => {
  const fx = buildDeltaFixture({
    backendEndpoints: 3,
    baselineEps: [{ method: 'GET', path: '/api/items', source: 'backend/app.py' }],
  })
  const md = buildDeltaReport({
    changeDir: fx.changeDir, specRoot: fx.specRoot, project: 'demo',
    runtimeRoot: fx.runtimeRoot,
    cwd: join(fx.curRoot, 'app.py'), // 文件路径作扫描根：readdirSync ENOTDIR → collect 侧 catch → null
    now: '2026-09-07T08:00:00.000Z',
  })
  assert.ok(md.includes('### 端点基线提示'), '门控命中 → 节出现')
  assert.ok(md.includes('基线已拍（1 端点）但现算不可得（scanBackendEndpoints 扫描失败）'), '现算不可得降级注记渲染')
  assert.ok(!md.includes('| + 新增 |'), '不可比不出增删表')
})

// ═════════════════════════════════════════════════════════════════════════════
// 6. execute.js Step3 prompt 含 baseline 指引（读文件断言文本）
// ═════════════════════════════════════════════════════════════════════════════

test('execute Step3「确认 worktree 路径」prompt 含 endpoints baseline 指引', () => {
  const text = readFileSync(EXECUTE_JS, 'utf8')
  const prefixStart = text.indexOf('const fixedPrefix = [')
  const step3 = text.indexOf("name: '确认 worktree 路径'")
  assert.ok(prefixStart >= 0 && step3 > prefixStart, 'fixedPrefix 与 Step3 定位命中')

  // 第 3 步定位：fixedPrefix 内该 step 前恰有 2 个 step 条目（进度确认/加载上下文）
  const before = text.slice(prefixStart, step3)
  assert.equal((before.match(/^\s{4}name: '/gm) || []).length, 2, '「确认 worktree 路径」为 fixedPrefix 第 3 步（Step3）')

  const stepEnd = text.indexOf("name: '确认执行范围'")
  assert.ok(stepEnd > step3, 'Step3 区间闭合定位命中')
  const step3Block = text.slice(step3, stepEnd)
  assert.ok(step3Block.includes('sillyspec endpoints baseline --change <change-name>'), 'Step3 prompt 含 baseline 拍摄命令')
  assert.ok(step3Block.includes('幂等'), 'Step3 prompt 注明幂等语义（已拍过会跳过）')
  assert.ok(step3Block.includes('自动把扫描根与落点锚定主仓'), 'Step3 prompt 注明 worktree 内跑自动锚定主仓（agent 无需手动 cd）')
})
