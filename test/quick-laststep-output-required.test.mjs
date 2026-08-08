/**
 * Q6：quick 末步 --done 必须带 --output（缺则回退 pending + exit 1，不静默落空结果）
 * change: multi-agent-review P1 #10 (Q6) — src/run/complete-handlers.js handleQuickStageCompletion
 *
 * 原 `if (outputText)` 守卫 + completeQuicklogEntry 用 `outputText || ''` 兜底，致 quick 末步
 * --done 不带 --output 时结果块为空却翻「已完成」。修复：末步 --done 缺 --output → exit 1 拒绝。
 * （末步 --output 正常完成路径由 quick-cli-managed-e2e.test.mjs 覆盖，本测试聚焦拒绝分支。）
 *
 * 隔离：mkdtempSync 临时 git 仓库 + 临时 specDir，不污染真实仓库。
 */
import { mkdtempSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { runCommand } from '../src/run.js'
import { ProgressManager } from '../src/progress.js'

let total = 0, failed = 0
function assert(c, m) { total++; if (!c) { failed++; console.log(`  ❌ FAIL: ${m}`) } else console.log(`  ✅ PASS: ${m}`) }
function git(d, a) { return execFileSync('git', a, { cwd: d, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim() }
async function hush(fn) { const o = console.log; console.log = () => {}; try { await fn() } finally { console.log = o } }
function extractSid(s) { const m = s.match(/sessionId:\s*(quick-[0-9a-f]{8})/); return m ? m[1] : null }

console.log('=== Q6：quick 末步 --done 必须带 --output ===\n')

const repo = mkdtempSync(join(tmpdir(), 'q6-out-'))
git(repo, ['init', '-q']); git(repo, ['config', 'user.email', 't@t.local']); git(repo, ['config', 'user.name', 't']); git(repo, ['config', 'commit.gpgsign', 'false'])
writeFileSync(join(repo, '.gitignore'), '.sillyspec/\n')
writeFileSync(join(repo, 'm.js'), 'console.log(1)\n')
git(repo, ['add', '.']); git(repo, ['commit', '-q', '-m', 'init'])
const specBase = join(repo, '.sillyspec')
await new ProgressManager({ specDir: specBase }).init(repo)

// 启动 quick（捕获 stdout 取 sid）
let startOut = ''
{ const o = console.log; console.log = (...a) => { startOut += a.join(' ') + '\n' }; const oe = console.error; console.error = () => {}
  try { await runCommand(['quick', 'Q6 末步 output 测试', '--linked-changes', 'none', '--non-interactive'], repo) } finally { console.log = o; console.error = oe } }
const sid = extractSid(startOut)
assert(sid !== null, `启动 quick 分配 sid: ${sid}`)

// 完成 step1 + step2（带 --output）
await hush(() => runCommand(['quick', '--done', '--change', sid, '--output', 'step1 理解', '--confirm'], repo))
await hush(() => runCommand(['quick', '--done', '--change', sid, '--output', 'step2 实现', '--confirm'], repo))

// step3 --done 不带 --output → Q6 守卫拒绝（exit 1）。直接捕获 console.error（不经 hush，避免被覆盖）。
let exitErr = null, capErr = ''
const oe = process.exit; process.exit = (c) => { throw new Error('EXIT_' + c) }
const oerr = console.error; console.error = (...a) => { capErr += a.join(' ') + '\n' }
const olog = console.log; console.log = () => {}
try { await runCommand(['quick', '--done', '--change', sid], repo) } catch (e) { exitErr = e }
process.exit = oe; console.error = oerr; console.log = olog
assert(exitErr && exitErr.message === 'EXIT_1', `step3 --done 缺 --output 被拒绝 exit 1: ${exitErr && exitErr.message}`)
assert(capErr.includes('必须带 --output'), `拒绝信息提示必须带 --output（实际捕获: ${capErr.slice(0, 80)}）`)
// 拒绝后 step3 应回退 pending（不丢进度）
const prog = await new ProgressManager({ specDir: specBase }).read(repo, sid)
assert(prog.stages.quick.steps[prog.stages.quick.steps.length - 1].status === 'pending', '拒绝后末步回退 pending（不丢进度）')

console.log('\n==================================================')
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
console.log('==================================================')
if (failed > 0) process.exit(1)
