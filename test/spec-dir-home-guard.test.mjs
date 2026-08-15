/**
 * resolveSpecDir home 拒绝守卫测试
 *
 * 背景（坑 sillyspec-cwd-correction-home-collision 的根治补丁）：
 * smoke 测试在 home 下临时目录跑 CLI，_ensureDB 读路径即建库，~/.sillyspec 长出
 * 平行进度库后，任何 home 子目录跑命令都会向上撞它，污染自我延续。
 * 守卫：resolveSpecDir 向上遍历时跳过 os.homedir() 一层，home 下 .sillyspec 恒不命中。
 *
 * 测试点：
 * 1. home 存在 .sillyspec 时，home 子目录解析回退 <cwd>/.sillyspec（不命中 home 的）
 * 2. home 自身跑命令同样不命中（回退 home/.sillyspec —— 但这就是本守卫要允许的「自建」路径）
 * 3. home 下多层子目录同受守卫
 * 4. 项目目录在 home 下且自带 .sillyspec（合法场景：项目就放 home 里）不受影响——命中自己的
 * 5. 守卫不误伤正常项目：非 home 祖先链正常向上命中
 * 6. e2e：home 存在 .sillyspec 时，home 子目录跑 CLI 只读命令不写 home 库
 */
import { join, resolve, dirname } from 'node:path'
import { mkdirSync, existsSync, writeFileSync, rmSync, mkdtempSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { execSync } from 'node:child_process'
import { tmpdir, homedir } from 'node:os'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const root = resolve(__dirname, '..')
const binCLI = join(root, 'bin', 'sillyspec.js')

function imp(path) {
  return import(pathToFileURL(path).href)
}

let passed = 0
let failed = 0

function assert(condition, msg) {
  if (condition) {
    console.log(`  ✅ PASS: ${msg}`)
    passed++
  } else {
    console.log(`  ❌ FAIL: ${msg}`)
    failed++
  }
}

function cleanup(dir) {
  try { rmSync(dir, { recursive: true, force: true }) } catch {}
}

// ── 守卫测试不污染真实 home：模拟 home = 隔离 tmp ──
// resolveSpecDir 用 os.homedir()，Node 的 homedir() 每次调用动态读 USERPROFILE/HOME。
// 进程内注入（单元级）+ CLI 子进程注入（e2e 级），统一指向隔离 tmp，不碰真实 home。
const REAL_HOME_ENV = { HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE }
const FAKE_HOME = mkdtempSync(join(tmpdir(), 'spec-dir-home-guard-'))
mkdirSync(join(FAKE_HOME, '.sillyspec', '.runtime'), { recursive: true })
process.env.HOME = FAKE_HOME
process.env.USERPROFILE = FAKE_HOME

// ── Test 1-4: resolveSpecDir 单元行为 ──
console.log('\n=== Test 1: home 存在 .sillyspec 时，home 子目录不命中 home 的 ===')
{
  const { resolveSpecDir } = await imp(join(root, 'src', 'run', 'shared.js'))
  const sub = join(FAKE_HOME, 'some-tmp-project')
  const got = resolveSpecDir(sub)
  assert(got === join(sub, '.sillyspec'), `回退 cwd/.sillyspec (got: ${got})`)
  assert(got !== join(FAKE_HOME, '.sillyspec'), '未命中 home 的 .sillyspec')
}

console.log('\n=== Test 2: home 自身跑命令不命中已有 .sillyspec，回退自建路径 ===')
{
  const { resolveSpecDir } = await imp(join(root, 'src', 'run', 'shared.js'))
  const got = resolveSpecDir(FAKE_HOME)
  assert(got === join(FAKE_HOME, '.sillyspec'), `home 本身回退 home/.sillyspec (got: ${got})`)
}

console.log('\n=== Test 3: home 下多层子目录同受守卫 ===')
{
  const { resolveSpecDir } = await imp(join(root, 'src', 'run', 'shared.js'))
  const deep = join(FAKE_HOME, 'a', 'b', 'c')
  const got = resolveSpecDir(deep)
  assert(got === join(deep, '.sillyspec'), `多层子目录回退 cwd/.sillyspec (got: ${got})`)
}

console.log('\n=== Test 4: home 里的真项目（自带 .sillyspec）不受影响 ===')
{
  const { resolveSpecDir } = await imp(join(root, 'src', 'run', 'shared.js'))
  const proj = join(FAKE_HOME, 'my-real-project')
  mkdirSync(join(proj, '.sillyspec'), { recursive: true })
  const got = resolveSpecDir(join(proj, 'src', 'sub'))
  assert(got === join(proj, '.sillyspec'), `真项目正常命中自己的 (got: ${got})`)
}

// ── Test 5: 守卫不误伤正常项目（非 home 链）──
console.log('\n=== Test 5: 非 home 祖先链正常向上命中 ===')
{
  const { resolveSpecDir } = await imp(join(root, 'src', 'run', 'shared.js'))
  // 本仓库自身：从 test/ 向上必须命中仓库根 .sillyspec（真实环境 home 不在本链上）
  const got = resolveSpecDir(__dirname)
  assert(got === join(root, '.sillyspec'), `本仓库子目录正常向上命中 (got: ${got})`)
}

// ── Test 6: e2e —— home 存在 .sillyspec 时子目录跑 CLI 只读命令不写 home 库 ──
console.log('\n=== Test 6: e2e —— home 子目录跑 CLI 不写 home 库 ===')
{
  const sub = join(FAKE_HOME, 'smoke-project')
  mkdirSync(sub, { recursive: true })
  const homeDb = join(FAKE_HOME, '.sillyspec', '.runtime', 'sillyspec.db')
  const dbBefore = existsSync(homeDb)
  try {
    // progress show 是只读命令，但旧版走 _ensureDB 会建库；守卫生效时不建
    execSync(`node "${binCLI}" --dir "${sub}" progress show`, {
      encoding: 'utf8', timeout: 30000, stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, HOME: FAKE_HOME, USERPROFILE: FAKE_HOME },
    })
  } catch { /* 命令输出/退出码不关键，关键断言在文件层面 */ }
  assert(!existsSync(homeDb), `home 库未被创建/保持原样 (before: ${dbBefore})`)
  assert(existsSync(join(sub, '.sillyspec')), '子目录自建 .sillyspec（守卫生效，回退本地）')
  cleanup(join(sub, '.sillyspec'))
}

// ── 汇总 ──
console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
console.log('='.repeat(50))

if (failed > 0) throw new Error(`${failed} test(s) failed`)

// 环境恢复 + FAKE_HOME 整体清理放最后（Test 1-4 引用其路径，rmSync 后断言无意义，故置尾）
process.env.HOME = REAL_HOME_ENV.HOME
process.env.USERPROFILE = REAL_HOME_ENV.USERPROFILE
cleanup(FAKE_HOME)
