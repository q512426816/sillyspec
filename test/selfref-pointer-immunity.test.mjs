/**
 * selfref-pointer-immunity.test.mjs — 自指指针生命周期免疫三门禁
 * （变更 2026-08-23-repo-native-spec-backfill task-03，design.md Phase 2 消费点 1/2/4）。
 *
 * 自指 = specRoot 经 realpath 解析回 <cwd>/.sillyspec（repo-native junction 回环：
 * daemon 缓存目录 symlink/junction 指回源项目真理源）。三门禁：
 *   ① 恢复忽略：runCommand 读到自指指针 → warn + 本地模式（平台参数不生效、指针不被重写）
 *   ② 写入拦截：writePlatformPointer 自指 → return false 且零落盘；真外部目录维持三写
 *      （显式自指 --spec-root flag 同样被此单点拦截，不重写指针）
 *   ③ 声明降级：fail-closed 分支遇自指 decl → warn + 本地模式 exit 0；非自指 decl 维持 exit 1
 *   ④ doctor repo-native 断链画像三类（自指指针/陈旧声明/凭据缺失）
 *
 * 回归（worktree 漂移守卫 detectWorktreeSpecDrift 与 --spec-dir 真外部目录平台模式）由
 * 既有 worktree-spec-drift-guard.test.mjs / platform-recovery.test.mjs / spec-dir.test.mjs
 * 覆盖，本文件不重写，只以 ② 的非自指三写断言补 write 路径行为锚点。
 *
 * 测试形态：runCommand 是命令入口（进程内含 process.exit），按 platform-managed-declaration
 * .test.mjs 场景③的既有惯例走子进程级测试（bin/sillyspec.js + spawnSync 捕获 stdout/stderr）；
 * writePlatformPointer / runDoctorDiagnostics 为纯导出函数，直接 import 单测。
 */

import { join, resolve, dirname } from 'node:path'
import { existsSync, mkdirSync, writeFileSync, rmSync, readFileSync, symlinkSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { spawnSync, execSync } from 'node:child_process'
import { tmpdir } from 'node:os'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const root = resolve(__dirname, '..')
const binCLI = join(root, 'bin', 'sillyspec.js')

let passed = 0, failed = 0
function assert(cond, msg) {
  if (cond) { console.log(`  ✅ PASS: ${msg}`); passed++ }
  else { console.log(`  ❌ FAIL: ${msg}`); failed++ }
}

const LINK_TYPE = process.platform === 'win32' ? 'junction' : 'dir'
const P = 'selfref'

function gitInit(d) {
  try {
    execSync('git init -q', { cwd: d, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    execSync('git config user.email t@t.local', { cwd: d, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    execSync('git config user.name t', { cwd: d, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  } catch {}
}

/** repo-native 源项目 fixture：git 根 + 本地 .sillyspec 真理源 + 指回它的缓存链接（junction 回环形态）。 */
function setupProject(name) {
  const cwd = join(tmpdir(), `${P}-${name}`)
  rmSync(cwd, { recursive: true, force: true })
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
  gitInit(cwd) // 隔离：防 tmpdir 落在 home git repo 内被 resolveEffectiveDir 纠正
  const cacheWs = join(tmpdir(), `${P}-${name}-cache`)
  rmSync(cacheWs, { recursive: true, force: true })
  symlinkSync(join(cwd, '.sillyspec'), cacheWs, LINK_TYPE)
  return { cwd, cacheWs }
}

/** 真外部目录（platform-managed 形态：与本地 .sillyspec 不同物理目录）。 */
function setupExternal(name) {
  const d = join(tmpdir(), `${P}-${name}-ext`)
  rmSync(d, { recursive: true, force: true })
  mkdirSync(d, { recursive: true })
  return d
}

function clean(...dirs) { for (const d of dirs) try { rmSync(d, { recursive: true, force: true }) } catch {} }

/** 子进程跑 CLI，捕获 code/stdout/stderr（成功路径也要断言 stderr 的 warn 输出）。 */
function runCLI(args) {
  const r = spawnSync(process.execPath, [binCLI, ...args], {
    encoding: 'utf8', timeout: 30000, stdio: ['ignore', 'pipe', 'pipe'],
  })
  return { code: r.status, stdout: String(r.stdout || ''), stderr: String(r.stderr || '') }
}

const POINTER = '.sillyspec-platform.json'
const DECL = '.sillyspec-platform-managed'
const OLD_TS = '2000-01-01T00:00:00.000Z'

// ── ① 指针恢复忽略（FR-4 消费点 1，子进程级）──
console.log('\n=== ① 自指指针存在 → 忽略恢复，本地模式运行 ===')
{
  const { cwd, cacheWs } = setupProject('t1')
  const pointerPath = join(cwd, POINTER)
  const pointerRaw = JSON.stringify({
    specRoot: cacheWs, runtimeRoot: join(cacheWs, '.runtime'),
    workspaceId: 'ws1', scanRunId: 'sr1', savedAt: OLD_TS,
  }, null, 2) + '\n'
  writeFileSync(pointerPath, pointerRaw)

  const r = runCLI(['--dir', cwd, 'run', 'quick', '--status'])
  assert(r.code === 0, `exit 0 本地模式运行（实际 ${r.code}）stderr=${r.stderr.slice(0, 200)}`)
  assert(r.stderr.includes('自指平台指针'), 'stderr 含"自指平台指针"告警')
  assert(r.stderr.includes('已忽略并按本地模式运行'), 'stderr 含"已忽略并按本地模式运行"')
  // 恢复若生效 → writePlatformPointer 必重写指针（savedAt 刷新）+ 落接管声明；
  // 两者原样/缺失即证明平台参数未生效（platformOpts 保持空）
  assert(readFileSync(pointerPath, 'utf8') === pointerRaw, '指针文件字节级未重写（savedAt 未刷新 → 恢复未生效）')
  assert(!existsSync(join(cwd, DECL)), '接管声明未被补写（writePlatformPointer 未被调用）')
  assert(!existsSync(join(cwd, '.sillyspec', '.runtime', 'platform-scan.json')), '主文件未落 .sillyspec/.runtime/')
  clean(cwd, cacheWs)
}

// ── ①b 非自指指针恢复不回归（恢复→重写链路保持原行为）──
console.log('\n=== ①b 非自指指针 → 恢复照旧生效（回归锚点）===')
{
  const { cwd } = setupProject('t1b')
  const ext = setupExternal('t1b')
  writeFileSync(join(cwd, POINTER), JSON.stringify({
    specRoot: ext, runtimeRoot: join(ext, '.runtime'),
    workspaceId: 'ws1', scanRunId: null, savedAt: OLD_TS,
  }, null, 2) + '\n')

  const r = runCLI(['--dir', cwd, 'run', 'quick', '--status'])
  assert(r.code === 0, `exit 0（实际 ${r.code}）`)
  assert(!r.stderr.includes('自指平台指针'), '非自指指针不触发自指告警')
  const after = JSON.parse(readFileSync(join(cwd, POINTER), 'utf8'))
  assert(after.savedAt !== OLD_TS, '指针被重写（savedAt 刷新 → 平台恢复 + 回写链路原样）')
  assert(after.specRoot === ext, '恢复后 specRoot 仍指向外部目录')
  assert(existsSync(join(cwd, DECL)), '接管声明照写（三写语义不变）')
  clean(cwd, ext)
}

// ── ② 写入拦截（FR-4 消费点 2，writePlatformPointer 单点收口）──
console.log('\n=== ② writePlatformPointer 自指 → false 且零落盘；真外部目录 → 三写照旧 ===')
{
  const { cwd, cacheWs } = setupProject('t2')
  const ext = setupExternal('t2')
  const { writePlatformPointer } = await import(pathToFileURL(join(root, 'src', 'run', 'shared.js')).href)

  // 自指 → false，三处全不落盘
  const rSelf = writePlatformPointer(cwd, {
    specRoot: cacheWs, runtimeRoot: join(cacheWs, '.runtime'), workspaceId: 'ws2', scanRunId: 'sr2',
  })
  assert(rSelf === false, '自指 specRoot → return false')
  assert(!existsSync(join(cwd, POINTER)), '指针未落盘')
  assert(!existsSync(join(cwd, DECL)), '接管声明未落盘')
  assert(!existsSync(join(cwd, '.sillyspec', '.runtime', 'platform-scan.json')), '主文件未落盘（经链接穿透本地 .sillyspec）')

  // 真外部目录 → true，三处照写（--spec-dir 外部目录平台模式保持的行为锚点）
  const rExt = writePlatformPointer(cwd, {
    specRoot: ext, runtimeRoot: join(ext, '.runtime'), workspaceId: 'ws3',
  })
  assert(rExt === true, '非自指外部 specRoot → return true（原行为不变）')
  assert(existsSync(join(ext, '.runtime', 'platform-scan.json')), '主文件落盘（外部目录）')
  assert(existsSync(join(cwd, POINTER)), '指针落盘')
  assert(existsSync(join(cwd, DECL)), '接管声明落盘')
  clean(cwd, cacheWs, ext)
}

// ── ②b 显式自指 --spec-root flag 不重写指针（FR-4 验收项，旧模板/存量脚本投毒入口）──
console.log('\n=== ②b 显式 --spec-root 自指 → 不写指针、不删本地真理源 ===')
{
  const { cwd, cacheWs } = setupProject('t2b')
  const r = runCLI(['--dir', cwd, 'run', 'quick', '--status', '--spec-root', cacheWs])
  assert(r.code === 0, `exit 0（实际 ${r.code}）stderr=${r.stderr.slice(0, 200)}`)
  assert(r.stderr.includes('自指平台指针'), 'stderr 含自指写入拦截告警')
  assert(!existsSync(join(cwd, POINTER)), '指针未落盘（写入被单点拦截）')
  assert(!existsSync(join(cwd, DECL)), '接管声明未落盘')
  // 平台残留清理不得把 cwd/.sillyspec（junction 目标 = repo-native 唯一真理源）当残留删掉
  assert(existsSync(join(cwd, '.sillyspec')), '本地 .sillyspec 真理源未被误删')
  assert(!existsSync(join(cwd, '.sillyspec-platform-cleaned')), '自指跳过清理决策（marker 不误写，后续真平台接入清理不被屏蔽）')
  clean(cwd, cacheWs)
}

// ── ③ 接管声明降级（FR-4 消费点 4，fail-closed 分支分裂）──
console.log('\n=== ③ 自指声明 + 指针缺失 → 降级本地模式 exit 0；非自指声明维持 exit 1 ===')
{
  // 自指 decl → warn + 本地模式
  const a = setupProject('t3a')
  writeFileSync(join(a.cwd, DECL), JSON.stringify({
    managed: true, specRoot: a.cacheWs, workspaceId: 'ws9', declaredAt: OLD_TS,
  }, null, 2) + '\n')
  const ra = runCLI(['--dir', a.cwd, 'run', 'quick', '--status'])
  assert(ra.code === 0, `自指声明 exit 0 本地模式（实际 ${ra.code}）stderr=${ra.stderr.slice(0, 200)}`)
  assert(ra.stderr.includes('陈旧的自指平台接管声明'), 'stderr 含"陈旧的自指平台接管声明"降级告警')
  assert(ra.stderr.includes('本地模式'), 'stderr 含本地模式语义')
  assert(!existsSync(join(a.cwd, POINTER)), '指针未被补写（保持无平台参数状态）')
  clean(a.cwd, a.cacheWs)

  // 非自指 decl（specRoot 为真外部目录）→ fail-closed 原样 exit 1
  const b = setupProject('t3b')
  const ext = setupExternal('t3b')
  writeFileSync(join(b.cwd, DECL), JSON.stringify({
    managed: true, specRoot: ext, workspaceId: 'ws8', declaredAt: OLD_TS,
  }, null, 2) + '\n')
  const rb = runCLI(['--dir', b.cwd, 'run', 'quick', '--status'])
  assert(rb.code === 1, `非自指声明维持 fail-closed exit 1（实际 ${rb.code}）`)
  assert(rb.stderr.includes('平台接管声明生效'), 'stderr 含"平台接管声明生效"（阻断语义原样）')
  clean(b.cwd, ext)
}

// ── ④ doctor repo-native 断链画像三类（直接单测 runDoctorDiagnostics）──
console.log('\n=== ④ doctor 三画像：自指指针 / 陈旧声明 / 凭据缺失 ===')
{
  const { runDoctorDiagnostics } = await import(pathToFileURL(join(root, 'src', 'doctor-diagnostics.js')).href)
  const dimOf = (result) => result.dimensions.find((d) => d.name === 'repo_native_chain')

  // 画像①：自指指针在盘（local.yaml 带 platform 段 → 不叠画像③）
  const a = setupProject('t4a')
  writeFileSync(join(a.cwd, '.sillyspec', 'local.yaml'), 'platform:\n  url: http://x\n  token: t\n')
  writeFileSync(join(a.cwd, POINTER), JSON.stringify({
    specRoot: a.cacheWs, runtimeRoot: null, workspaceId: 'w', savedAt: OLD_TS,
  }, null, 2) + '\n')
  const dimA = dimOf(await runDoctorDiagnostics({ cwd: a.cwd }))
  assert(dimA.findings.join('\n').includes('repo_native_self_referential_pointer'), '画像① 自指指针命中')
  assert(!dimA.findings.join('\n').includes('repo_native_missing_credentials'), '有凭据 → 不误报画像③')
  assert(dimA.pass === false && dimA.severity === 'warning', '画像① warning 级')
  clean(a.cwd, a.cacheWs)

  // 画像②：自指声明 + 指针缺失（陈旧声明）
  const b = setupProject('t4b')
  writeFileSync(join(b.cwd, '.sillyspec', 'local.yaml'), 'platform:\n  url: http://x\n  token: t\n')
  writeFileSync(join(b.cwd, DECL), JSON.stringify({
    managed: true, specRoot: b.cacheWs, workspaceId: 'w', declaredAt: OLD_TS,
  }, null, 2) + '\n')
  const dimB = dimOf(await runDoctorDiagnostics({ cwd: b.cwd }))
  const fb = dimB.findings.join('\n')
  assert(fb.includes('repo_native_stale_declaration'), '画像② 陈旧声明命中')
  assert(fb.includes('disconnect'), '画像② 给出 disconnect 清理引导')
  clean(b.cwd, b.cacheWs)

  // 画像③：.sillyspec 存在 + 无 platform 段 + 自指残留 → 凭据缺失静默失败预警
  const c = setupProject('t4c')
  writeFileSync(join(c.cwd, DECL), JSON.stringify({
    managed: true, specRoot: c.cacheWs, workspaceId: 'w', declaredAt: OLD_TS,
  }, null, 2) + '\n')
  const dimC = dimOf(await runDoctorDiagnostics({ cwd: c.cwd }))
  const fc = dimC.findings.join('\n')
  assert(fc.includes('repo_native_stale_declaration'), '画像③ fixture 同时命中画像②')
  assert(fc.includes('repo_native_missing_credentials'), '画像③ 凭据缺失命中')
  assert(fc.includes('静默失败'), '画像③ 含"上行静默失败"风险语义')
  clean(c.cwd, c.cacheWs)

  // 健康：无指针无声明 → pass
  const d = setupProject('t4d')
  const dimD = dimOf(await runDoctorDiagnostics({ cwd: d.cwd }))
  assert(dimD.pass === true, '无残留 → 画像维度 pass')
  clean(d.cwd, d.cacheWs)
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
console.log(`${'='.repeat(50)}`)
if (failed > 0) process.exit(1)
