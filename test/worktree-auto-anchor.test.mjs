/**
 * resolveEffectiveDir worktree 主仓自动锚定测试（P1-1，2026-09-02 跨 agent 工单）
 *
 * 覆盖场景（.sillyspec 被 gitignore 的仓——run 链路 D-03 守卫/quick drift 守卫均拦不住的新会话分裂）：
 *   1. cwd 在 linked worktree + 主仓有 .sillyspec → CLI 自动锚定主仓（progress show --json 读主仓数据，
 *      worktree 内不新建 .sillyspec）
 *   2. run 链路入口（run quick --status 只读）同款锚定
 *   3. 非 worktree 的普通目录（无 .sillyspec）→ 行为不变（不锚定不建库）
 *   4. linked worktree 但主仓无 .sillyspec（未 init）→ 不锚定（行为不变）
 *
 * 风格：自研 assert（与 machine-interface.test.mjs 同），execFileSync CLI 子进程 + 真实 git worktree。
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { tmpdir } from 'os'
import { execFileSync } from 'child_process'
import { fileURLToPath } from 'url'

import { ProgressManager } from '../src/progress.js'

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

const tmpRoots = []
function makeTmpDir(prefix) {
  const dir = mkdtempSync(join(tmpdir(), prefix))
  tmpRoots.push(dir)
  return dir
}

const worktreeRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const binPath = join(worktreeRoot, 'bin', 'sillyspec.js')

function sh(cmd, cwd) {
  return execFileSync(cmd, { cwd, encoding: 'utf8', shell: true, stdio: ['ignore', 'pipe', 'pipe'] }).trim()
}

/** 构造主仓 fixture：git 仓（.sillyspec gitignore）+ ProgressManager init + 注册变更 */
async function makeMainRepoFixture() {
  const proj = makeTmpDir('wta-')
  writeFileSync(join(proj, '.gitignore'), '.sillyspec/\n')
  writeFileSync(join(proj, 'main.js'), 'console.log(1)\n')
  sh('git init -q', proj)
  sh('git config user.email t@t.local', proj)
  sh('git config user.name t', proj)
  sh('git config commit.gpgsign false', proj)
  sh('git add .', proj)
  sh('git commit -q -m init', proj)
  const pm = new ProgressManager({ specDir: join(proj, '.sillyspec') })
  await pm.init(proj)
  await pm.initChange(proj, 'c-anchor')
  return { proj, specBase: join(proj, '.sillyspec') }
}

function runCli(args, opts = {}) {
  try {
    const stdout = execFileSync('node', [binPath, ...args], {
      cwd: opts.cwd,
      encoding: 'utf8',
      timeout: 30000,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    return { stdout, status: 0 }
  } catch (e) {
    return { stdout: e.stdout ? e.stdout.toString() : '', stderr: e.stderr ? e.stderr.toString() : '', status: e.status ?? 1 }
  }
}

// ─── 1. linked worktree + 主仓有 .sillyspec → 锚定主仓 ───
console.log('--- 1. worktree cwd → 自动锚定主仓 ---')
{
  const { proj } = await makeMainRepoFixture()
  const wtDir = join(proj, 'wt-test')
  sh(`git worktree add "${wtDir}" -b sillyspec/wt-test`, proj)

  // worktree 内无 .sillyspec（gitignore 不复制）——前置事实
  assert(!existsSync(join(wtDir, '.sillyspec')), '前置：worktree 内无 .sillyspec 副本（gitignore）')

  const r = runCli(['progress', 'show', '--json', '--dir', wtDir], { cwd: wtDir })
  assert(r.status === 0, `progress show --json 退出 0（实际 ${r.status}${r.stderr ? ' stderr: ' + r.stderr.slice(0, 200) : ''}）`)
  let env = null
  try { env = JSON.parse(r.stdout) } catch { env = null }
  assert(env !== null, `stdout 可 JSON.parse（实际 ${r.stdout.slice(0, 120)}）`)
  const anchored = env && env.ok === true
    && Array.isArray(env.data?.changes)
    && env.data.changes.some(c => c.name === 'c-anchor')
  assert(anchored, '读到主仓进度（含主仓变更 c-anchor，证明锚定主仓而非 worktree 空库）')
  assert(!existsSync(join(wtDir, '.sillyspec')), 'worktree 内未新建 .sillyspec（零分裂）')
}

// ─── 2. run 链路入口（run quick --status 只读）同款锚定 ───
console.log('--- 2. run quick --status 在 worktree → 读主仓 ---')
{
  const { proj } = await makeMainRepoFixture()
  const wtDir = join(proj, 'wt-run')
  sh(`git worktree add "${wtDir}" -b sillyspec/wt-run`, proj)
  const r = runCli(['run', 'quick', '--status', '--dir', wtDir], { cwd: wtDir })
  assert(r.status === 0, `run quick --status 退出 0（实际 ${r.status}）`)
  assert(!existsSync(join(wtDir, '.sillyspec')), 'run 链路也未在 worktree 新建 .sillyspec')
}

// ─── 3. 非 worktree 普通目录（无 .sillyspec）→ 行为不变 ───
console.log('--- 3. 非 worktree 目录行为不变 ---')
{
  const proj = makeTmpDir('wta-plain-')
  const r = runCli(['progress', 'show', '--json', '--dir', proj], { cwd: proj })
  assert(r.status === 2, `无 DB 无 git → exit 2 无法核验（实际 ${r.status}；行为同旧版）`)
  let env = null
  try { env = JSON.parse(r.stdout) } catch { env = null }
  assert(env && env.ok === false, 'fail-closed envelope（不建库）')
  assert(!existsSync(join(proj, '.sillyspec')), '未凭空建库（只读契约保持）')
}

// ─── 4. linked worktree 但主仓无 .sillyspec → 不锚定（行为不变）───
console.log('--- 4. worktree 但主仓未 init → 不锚定 ---')
{
  const proj = makeTmpDir('wta-nowt-')
  writeFileSync(join(proj, 'a.txt'), 'x\n')
  sh('git init -q', proj)
  sh('git config user.email t@t.local', proj)
  sh('git config user.name t', proj)
  sh('git config commit.gpgsign false', proj)
  sh('git add .', proj)
  sh('git commit -q -m init', proj)
  const wtDir = join(proj, 'wt-bare')
  sh(`git worktree add "${wtDir}" -b sillyspec/wt-bare`, proj)
  // 主仓无 .sillyspec → 锚定条件不满足 → resolveEffectiveDir 返回 baseDir（旧行为）
  const r = runCli(['progress', 'show', '--json', '--dir', wtDir], { cwd: wtDir })
  assert(r.status === 2, `主仓无 .sillyspec → 不锚定 → exit 2（实际 ${r.status}）`)
}

// ─── 清理 & 汇总 ───
for (const dir of tmpRoots) {
  try { rmSync(dir, { recursive: true, force: true }) } catch {}
}
console.log('\n==================================================')
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
console.log('==================================================')
if (failed > 0) process.exit(1)
