/**
 * progress dump 测试套件（task-03）
 *
 * 覆盖 plan.md Wave 3 验收标准：
 *   1. dump() 有活跃变更时返回完整结构
 *   2. dump() 无活跃变更时返回骨架（project/stages/userInputs/artifacts）
 *   3. dump() DB 不存在时返回 null
 *   4. buildEnvelope 包装 progress dump 命令
 *   5. --json 模式 JSON.parse 成功
 *   6. artifacts/userInputs 路径正确
 *
 * 风格：自研 assert（与 machine-interface.test.mjs 同）。
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { tmpdir } from 'os'
import { execFileSync } from 'child_process'
import { fileURLToPath } from 'url'

import { ProgressManager } from '../src/progress.js'
import { buildEnvelope, SCHEMA_VERSION } from '../src/machine-interface.js'

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

function assertThrows(fn, msg) {
  total++
  try {
    fn()
    failed++
    console.log(`  ❌ FAIL: ${msg}（未抛异常）`)
  } catch {
    console.log(`  ✅ PASS: ${msg}`)
  }
}

const tmpRoots = []
function makeTmpDir(prefix) {
  const dir = mkdtempSync(join(tmpdir(), prefix))
  tmpRoots.push(dir)
  return dir
}

const worktreeRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const binPath = join(worktreeRoot, 'bin', 'sillyspec.js')

// 隔离 HOME，防止并发全量套件中 CLI 子进程读写真实 HOME 影响其他测试
const originalHome = process.env.HOME
const originalUserProfile = process.env.USERPROFILE
const testHome = mkdtempSync(join(tmpdir(), 'dump-home-'))
tmpRoots.push(testHome)
process.env.HOME = testHome
process.env.USERPROFILE = testHome

// ─────────────────────────────────────────
// fixture：创建包含活跃变更的 DB
// ─────────────────────────────────────────
async function makeFixture({ changeName = 'test-change', withArtifacts = false, withUserInputs = false } = {}) {
  const proj = makeTmpDir('dump-')
  const specBase = join(proj, '.sillyspec')
  mkdirSync(specBase, { recursive: true })

  const pm = new ProgressManager({ specDir: specBase })
  await pm.init(proj)
  await pm.initChange(proj, changeName)

  // 可选：写 user-inputs.md
  if (withUserInputs) {
    const runtimeDir = join(specBase, '.runtime')
    writeFileSync(join(runtimeDir, 'user-inputs.md'), '# 用户输入记录\n\n> 请实现登录功能\n')
  }

  // 可选：创建 artifacts
  if (withArtifacts) {
    const artDir = join(specBase, '.runtime', 'artifacts')
    mkdirSync(artDir, { recursive: true })
    writeFileSync(join(artDir, 'design.md'), '# 设计文档\n')
    writeFileSync(join(artDir, 'plan.md'), '# 实现计划\n')
  }

  return { proj, specBase, changeName }
}

// ─────────────────────────────────────────
// 1. dump() 有活跃变更 → 完整结构
// ─────────────────────────────────────────
console.log('--- 1. dump() 有活跃变更 ---')
{
  const { proj, specBase, changeName } = await makeFixture({ withArtifacts: true, withUserInputs: true })
  const pm = new ProgressManager({ specDir: specBase })
  const data = pm.dump(proj)

  assert(data !== null, 'dump() 返回非 null')
  assert(typeof data.project === 'string' && data.project.length > 0, `project 字段非空（实际 "${data.project}"）`)
  assert(data.currentChange === changeName, `currentChange === "${changeName}"（实际 "${data.currentChange}"）`)
  assert(typeof data.currentStage === 'string', `currentStage 为字符串（实际 ${typeof data.currentStage}）`)
  assert(data.stages !== null && typeof data.stages === 'object', 'stages 为对象')
  assert('scan' in data.stages, 'stages 包含 scan')
  assert('brainstorm' in data.stages, 'stages 包含 brainstorm')
  assert(data.stages.scan.status === 'pending' || data.stages.scan.status === 'active', `scan.status 合法（实际 ${data.stages.scan.status}）`)
  assert(Array.isArray(data.stages.scan.steps), 'scan.steps 为数组')
  assert(typeof data.userInputs === 'string' && data.userInputs.length > 0, 'userInputs 有内容')
  assert(Array.isArray(data.artifacts), 'artifacts 为数组')
  assert(data.artifacts.length === 2, `artifacts 有 2 项（实际 ${data.artifacts.length}）`)
  assert(data.artifacts[0].filename === 'design.md' || data.artifacts[0].filename === 'plan.md', 'artifacts 含设计/计划文件')
  assert(typeof data.artifacts[0].sizeBytes === 'number', 'artifacts[0].sizeBytes 为数字')
  assert(typeof data.artifacts[0].lastModified === 'string', 'artifacts[0].lastModified 为字符串')
  assert(data.lastActive !== null, 'lastActive 非 null')
}

// ─────────────────────────────────────────
// 2. dump() 无活跃变更 → 骨架
// ─────────────────────────────────────────
console.log('--- 2. dump() 无活跃变更 ---')
{
  const proj = makeTmpDir('dump-empty-')
  const specBase = join(proj, '.sillyspec')
  mkdirSync(specBase, { recursive: true })

  const pm = new ProgressManager({ specDir: specBase })
  await pm.init(proj)
  // 不 initChange

  const data = pm.dump(proj)
  assert(data !== null, '有 DB 但无变更 → 返回骨架（非 null）')
  assert(data.project !== '', 'project 非空')
  assert(data.currentChange === null, 'currentChange 为 null')
  assert(data.currentStage === null, 'currentStage 为 null')
  assert(data.stages !== null && typeof data.stages === 'object', 'stages 为空对象')
  assert(data.artifacts.length === 0, 'artifacts 为空数组')
}

// ─────────────────────────────────────────
// 3. dump() DB 不存在 → null
// ─────────────────────────────────────────
console.log('--- 3. dump() DB 不存在 ---')
{
  const proj = makeTmpDir('dump-nodb-')
  const specBase = join(proj, '.sillyspec')
  mkdirSync(specBase, { recursive: true })
  // 不 init → DB 不存在

  const pm = new ProgressManager({ specDir: specBase })
  const data = pm.dump(proj)
  assert(data === null, 'DB 不存在 → dump() 返回 null')
}

// ─────────────────────────────────────────
// 4. dump() 无 artifacts/user-inputs → 空数组/null
// ─────────────────────────────────────────
console.log('--- 4. dump() 无 artifacts/user-inputs ---')
{
  const { proj, specBase } = await makeFixture({ withArtifacts: false, withUserInputs: false })
  // pm.init() 会自动创建 user-inputs.md，需手动删除测试 null 场景
  const inputsPath = join(specBase, '.runtime', 'user-inputs.md')
  if (existsSync(inputsPath)) rmSync(inputsPath)
  const pm = new ProgressManager({ specDir: specBase })
  const data = pm.dump(proj)
  assert(data.artifacts.length === 0, '无 artifacts 目录 → 空数组')
  assert(data.userInputs === null, '无 user-inputs.md → null')
}

// ─────────────────────────────────────────
// 5. buildEnvelope 包装 progress dump
// ─────────────────────────────────────────
console.log('--- 5. buildEnvelope(progress dump) ---')
{
  const env = buildEnvelope({
    command: 'progress dump',
    ok: true,
    data: { project: 'test', currentStage: 'brainstorm' },
  })
  assert(env.schema_version === SCHEMA_VERSION, `schema_version === ${SCHEMA_VERSION}`)
  assert(env.command === 'progress dump', `command === "progress dump"（实际 "${env.command}"）`)
  assert(env.ok === true, 'ok === true')
  assert(env.data !== undefined, 'data 字段存在')
  assert(env.data.project === 'test', 'data.project === "test"')
  assert(env.errors.length === 0, 'errors 为空')
  assert(typeof env.generated_at === 'string', 'generated_at 为字符串')

  // null data 包装
  const envNull = buildEnvelope({
    command: 'progress dump',
    ok: false,
    data: null,
    errors: ['无活跃变更或进度数据不存在'],
  })
  assert(envNull.ok === false, 'null data → ok === false')
  assert(envNull.errors.length === 1, 'errors 含一条')
}

// ─────────────────────────────────────────
// 6. CLI --json 集成测试
// ─────────────────────────────────────────
console.log('--- 6. CLI progress dump --json ---')
{
  const { proj, specBase, changeName } = await makeFixture({ withArtifacts: true, withUserInputs: true })
  const result = execFileSync('node', [binPath, 'progress', 'dump', '--spec-dir', specBase, '--json'], {
    cwd: proj,
    encoding: 'utf8',
    timeout: 10000,
  })
  const envelope = JSON.parse(result)
  assert(envelope.schema_version === 1, `CLI --json schema_version === 1（实际 ${envelope.schema_version}）`)
  assert(envelope.command === 'progress dump', `CLI --json command === "progress dump"`)
  assert(envelope.ok === true, 'CLI --json ok === true')
  assert(envelope.data !== null && envelope.data !== undefined, 'CLI --json data 非 null')
  assert(envelope.data.currentChange === changeName, `CLI --json currentChange === "${changeName}"`)
  assert(Array.isArray(envelope.data.artifacts), 'CLI --json artifacts 为数组')
}

// ─────────────────────────────────────────
// 7. CLI 无 DB → ok:false envelope
// ─────────────────────────────────────────
console.log('--- 7. CLI progress dump 无 DB ---')
{
  const proj = makeTmpDir('dump-cli-nodb-')
  const specBase = join(proj, '.sillyspec')
  mkdirSync(specBase, { recursive: true })
  const result = execFileSync('node', [binPath, 'progress', 'dump', '--spec-dir', specBase, '--json'], {
    cwd: proj,
    encoding: 'utf8',
    timeout: 10000,
  })
  const envelope = JSON.parse(result)
  assert(envelope.ok === false, '无 DB → ok === false')
  assert(envelope.errors.length > 0, 'errors 非空')
}

// ─────────────────────────────────────────
// 8. CLI 无 --json → 人类可读
// ─────────────────────────────────────────
console.log('--- 8. CLI progress dump 无 --json ---')
{
  const { proj, specBase } = await makeFixture()
  const result = execFileSync('node', [binPath, 'progress', 'dump', '--spec-dir', specBase], {
    cwd: proj,
    encoding: 'utf8',
    timeout: 10000,
  })
  assert(result.includes('项目:'), '人类可读输出含"项目:"')
  assert(result.includes('当前变更:'), '人类可读输出含"当前变更:"')
  assert(!result.includes('{'), '无 --json 时不输出 JSON')
}

// 恢复 HOME
if (originalHome !== undefined) process.env.HOME = originalHome
else delete process.env.HOME
if (originalUserProfile !== undefined) process.env.USERPROFILE = originalUserProfile
else delete process.env.USERPROFILE

// ─────────────────────────────────────────
// 清理
// ─────────────────────────────────────────
for (const root of tmpRoots) {
  try { rmSync(root, { recursive: true, force: true }) } catch {}
}

// ─────────────────────────────────────────
// 汇总
// ─────────────────────────────────────────
console.log(`\n=== progress-dump: ${total} tests, ${failed} failures ===`)
if (failed > 0) process.exit(1)
