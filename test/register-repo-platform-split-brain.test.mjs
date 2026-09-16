/**
 * register-repo 平台双根写目标回归（坑 register-repo-specbase-split-brain，2026-09-15 wp
 * 平台模式会话实证）。
 *
 * 事故形态：平台模式（cwd 指针指向外部 specRoot）下 register-repo 的写候选链 specBase 优先
 * → 写进平台 spec 根 local.yaml；而 repos: 段全部读侧（execute MultiRepoContext / worktree
 * cross / run shared）恒读 <cwd>/.sillyspec/local.yaml —— 注册「成功」但 execute 启动
 * fail-closed 报未注册，agent 三轮排查才试出 --spec-dir 绕过。
 *
 * 修复语义锁定：
 *   1. 平台指针在场、无显式 --spec-dir → 写项目侧 <cwd>/.sillyspec/local.yaml（读侧对齐）
 *   2. 平台 spec 根另有 local.yaml 时输出「死配置」提醒（不双写）
 *   3. 显式 --spec-dir 是用户明示选择 → 仍写 specBase 侧（尊重）
 */
import { execSync, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

const binCLI = join(dirname(dirname(fileURLToPath(import.meta.url))), 'bin', 'sillyspec.js')

let passed = 0, failed = 0
const failures = []
function assert(cond, msg) {
  if (cond) { passed++; console.log(`  ✅ PASS: ${msg}`) }
  else { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
}
function runCLI(args, cwd) {
  const r = spawnSync(process.execPath, [binCLI, ...args], { cwd, encoding: 'utf8', timeout: 30000, stdio: ['pipe', 'pipe', 'pipe'] })
  return { status: r.status, combined: (r.stdout || '') + (r.stderr || '') }
}

const tmpRoots = []
function mkTmp(prefix) {
  const d = mkdtempSync(join(tmpdir(), prefix))
  tmpRoots.push(d)
  return d
}
function git(cwd, args) { execSync(`git ${args}`, { cwd, stdio: 'pipe' }) }

console.log('=== register-repo 平台双根写目标（register-repo-specbase-split-brain 回归）===\n')

try {
  // fixture：项目仓（cwd，含 .sillyspec-platform.json 指针）+ 外部 specRoot（躺着一份 local.yaml）+ 待注册 git 仓
  const project = mkTmp('rrsb-proj-')
  git(project, 'init -q -b main')
  git(project, 'config user.email t@t.t')
  git(project, 'config user.name t')
  const platformRoot = mkTmp('rrsb-spec-')
  mkdirSync(join(platformRoot, '.runtime'), { recursive: true })
  writeFileSync(join(platformRoot, 'local.yaml'), '# 平台 spec 根既有 local.yaml（repos: 段读侧不消费）\nrepos:\n  stale-key: C:/dead/path\n')
  const crossRepo = mkTmp('rrsb-cross-')
  git(crossRepo, 'init -q -b main')
  git(crossRepo, 'config user.email t@t.t')
  git(crossRepo, 'config user.name t')
  writeFileSync(join(crossRepo, 'README.md'), 'x')
  git(crossRepo, 'add .')
  git(crossRepo, 'commit -q -m init')
  // 平台指针（progress.js resolvePlatformSpecDir 的指针协议）
  writeFileSync(join(project, '.sillyspec-platform.json'), JSON.stringify({ specRoot: platformRoot }))

  // 1. 无显式 --spec-dir：写项目侧（读侧对齐），不写平台 spec 根
  const r1 = runCLI(['local', 'register-repo', 'shared-lib', crossRepo], project)
  assert(r1.status === 0, `注册成功（exit ${r1.status}；输出：${r1.combined.slice(-150)}）`)
  const projYaml = join(project, '.sillyspec', 'local.yaml')
  assert(existsSync(projYaml), `默认写目标=项目侧 local.yaml（${projYaml}）`)
  assert(readFileSync(projYaml, 'utf8').includes('shared-lib'), '项目侧 local.yaml 含注册条目')
  assert(readFileSync(join(platformRoot, 'local.yaml'), 'utf8').includes('stale-key')
    && !readFileSync(join(platformRoot, 'local.yaml'), 'utf8').includes('shared-lib'),
    '平台 spec 根 local.yaml 不被双写（避免两份各自演化再分裂）')
  assert(r1.combined.includes('死配置'), '平台根另有一份 local.yaml 时输出死配置提醒')

  // 2. 显式 --spec-dir：用户明示选择 → 写 specBase 侧（尊重）
  const r2 = runCLI(['local', 'register-repo', 'explicit-lib', crossRepo, '--spec-dir', join(platformRoot)], project)
  assert(r2.status === 0, `显式 --spec-dir 注册成功（exit ${r2.status}）`)
  assert(readFileSync(join(platformRoot, 'local.yaml'), 'utf8').includes('explicit-lib'),
    '显式 --spec-dir 时写平台 spec 根 local.yaml（明示选择被尊重）')
} finally {
  for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch { /* Windows EPERM best-effort */ } }
}

console.log(`\n=== 结果: ${passed} 通过 / ${failed} 失败 ===`)
if (failures.length) { console.log('失败项:'); for (const f of failures) console.log('  - ' + f) }
if (failed > 0) process.exitCode = 1
