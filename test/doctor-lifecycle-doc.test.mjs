/**
 * doctor file-lifecycle 文档欠账检查测试（P2-2-②，2026-09-02 跨 agent 工单）
 *
 * 覆盖（detectLifecycleDocStaleness 经 runDoctorDiagnostics 出口，走公开 API 测行为）：
 *   1. 文档不存在 → pass + 跳过注记（不误报）
 *   2. 文档 untracked（从未提交）→ WARNING
 *   3. 文档落后生命周期代码（src 后提交）→ WARNING + 落后天数 + safe_action
 *   4. 文档比代码新 → pass
 *   5. CLI 端到端：sillyspec doctor --json dimensions 含 lifecycle_doc_staleness
 *
 * 风格：自研 assert + tmp git 仓 fixture（同 worktree-auto-anchor.test.mjs）。
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { join, dirname } from 'path'
import { tmpdir } from 'os'
import { execFileSync } from 'child_process'
import { fileURLToPath } from 'url'

import { runDoctorDiagnostics } from '../src/doctor-diagnostics.js'

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

function initGitRepo(dir) {
  writeFileSync(join(dir, '.gitignore'), '.sillyspec/\n')
  sh('git init -q', dir)
  sh('git config user.email t@t.local', dir)
  sh('git config user.name t', dir)
  sh('git config commit.gpgsign false', dir)
}

function commitAll(dir, msg, opts = {}) {
  sh(opts.paths ? `git add ${opts.paths.join(' ')}` : 'git add .', dir)
  // 显式提交时间（%ct 是整数秒：同秒内连续 commit 会让「文档 vs 代码」时间戳相等走歧义分支；
  // 经 env 选项注入 GIT_COMMITTER_DATE/GIT_AUTHOR_DATE 消除同秒竞态——不用 shell 内联 env
  // （POSIX 语法，Windows cmd 不认，规则 13 跨平台）
  const args = ['-q', '-m', msg]
  if (opts.date) args.push('--date', opts.date)
  execFileSync('git', ['commit', ...args], {
    cwd: dir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: opts.date
      ? { ...process.env, GIT_COMMITTER_DATE: opts.date, GIT_AUTHOR_DATE: opts.date }
      : process.env,
  })
}

function getDim(result, name) {
  return result.dimensions.find(d => d.name === name)
}

const DOC_REL = 'docs/sillyspec/file-lifecycle.md'

// ─── 1. 文档不存在 → pass 跳过 ───
console.log('--- 1. 文档不存在 → 不误报 ---')
{
  const proj = makeTmpDir('d8-nodoc-')
  initGitRepo(proj)
  mkdirSync(join(proj, 'src/stages'), { recursive: true })
  writeFileSync(join(proj, 'src/stages/a.js'), 'export {}\n')
  commitAll(proj, 'add stages')
  const dim = getDim(await runDoctorDiagnostics({ cwd: proj }), 'lifecycle_doc_staleness')
  assert(dim && dim.pass === true, '文档缺失 → pass（跳过不误报）')
  assert(dim.findings[0].includes('未找到'), 'findings 注记跳过原因')
}

// ─── 2. 文档 untracked → WARNING ───
console.log('--- 2. 文档 untracked → WARNING ---')
{
  const proj = makeTmpDir('d8-untracked-')
  initGitRepo(proj)
  mkdirSync(join(proj, 'docs/sillyspec'), { recursive: true })
  writeFileSync(join(proj, DOC_REL), '# lifecycle\n')
  mkdirSync(join(proj, 'src/stages'), { recursive: true })
  writeFileSync(join(proj, 'src/stages/a.js'), 'export {}\n')
  // 只提交 src（doc 留工作树 untracked）
  commitAll(proj, 'code only', { paths: ['src'] })
  const dim = getDim(await runDoctorDiagnostics({ cwd: proj }), 'lifecycle_doc_staleness')
  assert(dim && dim.pass === false && dim.severity === 'warning', 'untracked 文档 → WARNING')
  assert(dim.findings[0].includes('从未提交'), 'findings 指明 untracked')
}

// ─── 3. 文档落后代码 → WARNING + safe_action ───
console.log('--- 3. 文档落后 → WARNING ---')
{
  const proj = makeTmpDir('d8-behind-')
  initGitRepo(proj)
  mkdirSync(join(proj, 'docs/sillyspec'), { recursive: true })
  writeFileSync(join(proj, DOC_REL), '# lifecycle\n')
  commitAll(proj, 'doc commit', { date: '2026-09-01T10:00:00' })
  // 代码后提交（文档落后；显式晚 1 天，消除同秒竞态）
  mkdirSync(join(proj, 'src/stages'), { recursive: true })
  writeFileSync(join(proj, 'src/stages/b.js'), 'export {}\n')
  commitAll(proj, 'code after doc', { date: '2026-09-02T10:00:00' })
  const dim = getDim(await runDoctorDiagnostics({ cwd: proj }), 'lifecycle_doc_staleness')
  assert(dim && dim.pass === false && dim.severity === 'warning', '文档落后 → WARNING')
  assert(dim.findings[0].includes('src/stages/'), 'findings 点名最新代码提交路径')
  assert(dim.safe_actions.length === 1 && dim.safe_actions[0].action === 'sync_file_lifecycle_doc', 'safe_action 给出同步指引')
}

// ─── 4. 文档比代码新 → pass ───
console.log('--- 4. 文档最新 → pass ---')
{
  const proj = makeTmpDir('d8-fresh-')
  initGitRepo(proj)
  mkdirSync(join(proj, 'src/stages'), { recursive: true })
  writeFileSync(join(proj, 'src/stages/a.js'), 'export {}\n')
  commitAll(proj, 'code first')
  mkdirSync(join(proj, 'docs/sillyspec'), { recursive: true })
  writeFileSync(join(proj, DOC_REL), '# lifecycle v2\n')
  commitAll(proj, 'doc after code')
  const dim = getDim(await runDoctorDiagnostics({ cwd: proj }), 'lifecycle_doc_staleness')
  assert(dim && dim.pass === true && dim.severity === null, '文档 ≥ 代码 → pass')
  assert(dim.findings[0].includes('一致'), 'findings 注记一致')
}

// ─── 5. CLI 端到端 ───
console.log('--- 5. doctor --json 含新维度 ---')
{
  const proj = makeTmpDir('d8-cli-')
  initGitRepo(proj)
  mkdirSync(join(proj, 'docs/sillyspec'), { recursive: true })
  writeFileSync(join(proj, DOC_REL), '# lifecycle\n')
  commitAll(proj, 'init')
  let stdout
  try {
    stdout = execFileSync('node', [binPath, 'doctor', '--json', '--dir', proj],
      { encoding: 'utf8', timeout: 60000, stdio: ['ignore', 'pipe', 'pipe'] })
  } catch (e) {
    stdout = e.stdout ? e.stdout.toString() : ''
  }
  assert(stdout.includes('lifecycle_doc_staleness'), `doctor --json dimensions 含 lifecycle_doc_staleness（输出含：${stdout.includes('lifecycle_doc_staleness')}）`)
}

// ─── 清理 & 汇总 ───
for (const dir of tmpRoots) {
  try { rmSync(dir, { recursive: true, force: true }) } catch {}
}
console.log('\n==================================================')
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
console.log('==================================================')
if (failed > 0) process.exit(1)
