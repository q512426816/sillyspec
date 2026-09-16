/**
 * 防回归测试：resolveSpecDir tmpdir 硬边界（坑 temp-root-stray-sillyspec，
 * 2026-09-16-friction5-hardening verify 移交项①实证）。
 *
 * 事故形态：某次 cwd=%TEMP% 直系的调用在 Temp 根遗留游离 .sillyspec，此后所有 temp 夹具的
 * 祖先解析被劫持——agent-automation-batch4『add frontend 建档』与 feedback-batch2-hardening
 * 两测试假败的真根因（specBase 解析到 Temp\.sillyspec，夹具内断言读自身路径 ENOENT）。
 *
 * 隔离手法：不动真 %TEMP%（测试自身会污染机器环境）——Node 的 os.tmpdir() 每次调用都读
 * process.env（win32: TEMP/TMP，POSIX: TMPDIR），测试内把 env 指向自建可控目录再造游离库，
 * finally 恢复 env 并清理。
 */
import { resolveSpecDir } from '../src/run/shared.js'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

let passed = 0
let failed = 0

function assert(name, cond, detail = '') {
  if (cond) {
    console.log(`✅ PASS: ${name}`)
    passed++
  } else {
    console.error(`❌ FAIL: ${name}${detail ? `（${detail}）` : ''}`)
    failed++
    process.exitCode = 1
  }
}

// ── env 隔离：把 os.tmpdir() 指向自建 base ──
const realTmp = tmpdir()
const base = mkdtempSync(join(realTmp, 'tmpcap-'))
const savedEnv = { TEMP: process.env.TEMP, TMP: process.env.TMP, TMPDIR: process.env.TMPDIR }
const setTmpEnv = (dir) => {
  if (process.platform === 'win32') { process.env.TEMP = dir; process.env.TMP = dir }
  else process.env.TMPDIR = dir
}
const restoreTmpEnv = () => {
  for (const [k, v] of Object.entries(savedEnv)) {
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
}

try {
  setTmpEnv(base)

  // 游离库：tmp 根下的 .sillyspec（事故复刻）
  mkdirSync(join(base, '.sillyspec', 'projects'), { recursive: true })
  writeFileSync(join(base, '.sillyspec', 'projects', 'frontend.yaml'), 'name: frontend\n', 'utf8')

  console.log('--- 1. tmp 根游离库不劫持 temp 夹具（事故形态）---')
  {
    const fixture = join(base, 'ws-GZwxhO')
    mkdirSync(fixture, { recursive: true })
    const got = resolveSpecDir(fixture)
    assert('夹具无自身 .sillyspec → 回退夹具自身路径（不被 tmp 游离库劫持）',
      got === join(fixture, '.sillyspec'), `got=${got}`)
  }

  console.log('--- 2. tmp 封顶不阻断夹具内部的合法祖先解析 ---')
  {
    const fixture = join(base, 'proj-ok')
    mkdirSync(join(fixture, '.sillyspec'), { recursive: true })
    mkdirSync(join(fixture, 'sub', 'deep'), { recursive: true })
    const got = resolveSpecDir(join(fixture, 'sub', 'deep'))
    assert('夹具自身 .sillyspec 仍可被深层子目录向上命中（封顶只在 tmp 层）',
      got === join(fixture, '.sillyspec'), `got=${got}`)
  }

  console.log('--- 3. cwd 即 tmp 根：同样封顶（返回自身回退路径，不命中游离库）---')
  {
    const got = resolveSpecDir(base)
    assert('origin===tmpdir → 回退 join(origin, .sillyspec)（与普通非项目目录回退语义一致）',
      got === join(base, '.sillyspec'), `got=${got}`)
  }

  console.log('--- 4. specDir 显式指定优先级不变（封顶不吞 override）---')
  {
    const fixture = join(base, 'ws-x2')
    mkdirSync(fixture, { recursive: true })
    const explicit = join(base, 'explicit-spec')
    const got = resolveSpecDir(fixture, { specDir: explicit })
    assert('opts.specDir 显式指定恒优先', got === resolve(explicit), `got=${got}`)
  }
} finally {
  restoreTmpEnv()
  rmSync(base, { recursive: true, force: true })
}

console.log('--- 5. 非 tmp 场景零回归：真实仓祖先解析照常（env 已还原）---')
{
  // 仓根按测试文件位置锚定（cwd 无关）：run-tests.mjs 以 cwd=<repo>/test 执行子进程，
  // process.cwd() 依执行方式漂移（runner=仓/test、直跑=仓根）——用 cwd 锚定时祖先解析会上移
  // 一层命中仓内 .sillyspec、期望值却拼在 test/ 下，断言随执行方式假败（2026-09-16 套件实证）。
  const repoRoot = resolve(join(dirname(fileURLToPath(import.meta.url)), '..', '..'))
  const got = resolveSpecDir(repoRoot)
  // 本仓根有 .sillyspec（无上移）——与既有行为一致；断言命中的是仓内真实目录
  assert('真实仓 cwd 解析不受 tmp 封顶影响', got === join(repoRoot, '.sillyspec'), `got=${got}`)
}

console.log(`\n==================================================`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
if (failed > 0) process.exit(1)
