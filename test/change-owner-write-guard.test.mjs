/**
 * 所有权写路径断言测试（2026-09-20 双写碰撞实证修复）
 *
 * 场景（经 CLI 子进程端到端，最真实面）：tmp 仓 + DB 预置 owner 行 →
 *   1. 他人活跃窗内 --done → 拒绝（exit 非零 + owner 提示 + 指引）
 *   2. --takeover 强制 → 放行且 owner 重写为本会话
 *   3. 他人活跃窗外（stale）→ 放行且自动接管
 *   4. 读路径（无写 flag，prompt 显示）→ 不拦
 *   5. 本会话自有 → 放行零扰动
 *
 * 风格：自研 assert + tmp fixture + CLI 子进程（同 quick-cli-managed-e2e）。
 */
import { mkdtempSync, mkdirSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { execFileSync, spawnSync } from 'child_process'
import { fileURLToPath } from 'url'
import { DatabaseSync } from 'node:sqlite'

let failed = 0
let total = 0
function assert(cond, msg) {
  total++
  if (!cond) { failed++; console.log(`  ❌ FAIL: ${msg}`) } else { console.log(`  ✅ PASS: ${msg}`) }
}
const tmpRoots = []
function mk(p) { const d = mkdtempSync(join(tmpdir(), p)); tmpRoots.push(d); return d }

const BIN = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'bin', 'sillyspec.js')

/** 造仓：git init + .sillyspec + DB 预置 c1 行（owner/last_active 可参）。 */
async function makeRepo({ owner, lastActive }) {
  const proj = mk('ownguard-')
  mkdirSync(join(proj, '.sillyspec', 'changes', 'c1'), { recursive: true })
  for (const a of [['init', '-q'], ['config', 'user.email', 't@t.local'], ['config', 'user.name', 't']]) {
    execFileSync('git', a, { cwd: proj, stdio: 'ignore' })
  }
  // 建库走 ProgressManager（progress show 是只读路径不建库——套件/直跑环境差异实证）
  const { ProgressManager } = await import('../src/progress.js')
  const pm = new ProgressManager({ specDir: join(proj, '.sillyspec') })
  pm.read(proj, 'c1')
  const db2 = new DatabaseSync(join(proj, '.sillyspec', '.runtime', 'sillyspec.db'))
  db2.prepare(`INSERT OR REPLACE INTO changes (name, created_at, last_active, owner_session, status) VALUES ('c1', ?, ?, ?, 'active')`)
    .run(lastActive, lastActive, owner)
  db2.close()
  return proj
}

function run(cwd, args, { session, expectFail = false } = {}) {
  // 子进程 env 隔离：套件 runner 把 HOME/USERPROFILE 重定向到共享 suiteTmp——前序测试
  // 可能在那里留过平台指针/全局态，spawn 的 CLI 走平台路径早退（套件内 stderr 无所有权
  // 文案实证）。每次调用一次性 HOME，平台耦合归零。
  const hermeticHome = mk('ownguard-home-')
  const env = {
    ...process.env,
    HOME: hermeticHome,
    USERPROFILE: hermeticHome,
  }
  if (session) env.SILLYSPEC_SESSION_ID = session
  else delete env.SILLYSPEC_SESSION_ID
  const r = spawnSync('node', [BIN, ...args], { cwd, encoding: 'utf8', env, stdio: ['ignore', 'pipe', 'pipe'] })
  try { rmSync(hermeticHome, { recursive: true, force: true }) } catch { /* Windows 句柄延迟 */ }
  if (expectFail) return r
  return r
}

const NOW = new Date().toISOString()

// ── 1. 他人活跃 → --done 拒 ──
{
  const proj = await makeRepo({ owner: 'session-A', lastActive: NOW })
  const r = run(proj, ['run', 'brainstorm', '--change', 'c1', '--done', '--output', 'x'], { session: 'session-B' })
  assert(r.status !== 0, `1a 他人活跃 --done → exit 非零（实际 ${r.status}）`)
  assert((r.stderr || '').includes('session-A') && (r.stderr || '').includes('拒绝写操作'), '1b 错误指认 owner + 拒绝写操作字样')
  assert((r.stderr || '').includes('--takeover'), '1c 指引含 --takeover 逃生阀')
}
// ── 2. --takeover 强制 → 放行 + owner 重写 ──
{
  const proj = await makeRepo({ owner: 'session-A', lastActive: NOW })
  const r = run(proj, ['run', 'brainstorm', '--change', 'c1', '--takeover', '--done', '--output', 'x'], { session: 'session-B' })
  // takeover 后 --done 可能因产物校验失败 exit 1——区分：不得是所有权拒绝（stderr 无「拒绝写操作」）
  const ownershipBlocked = (r.stderr || '').includes('拒绝写操作')
  assert(!ownershipBlocked, `2 --takeover → 不被所有权拦（后续门禁另行判）`)
  const db = new DatabaseSync(join(proj, '.sillyspec', '.runtime', 'sillyspec.db'), { readOnly: true })
  const row = db.prepare('SELECT owner_session FROM changes WHERE name = ?').get('c1')
  db.close()
  assert(row && row.owner_session === 'session-B', `2b owner 重写为接管会话（实际 ${row && row.owner_session}）`)
}
// ── 3. 他人 stale（窗外）→ 放行 + 自动接管 ──
{
  const stale = new Date(Date.now() - 30 * 60 * 1000).toISOString() // 30 分钟前 > 15 分钟窗
  const proj = await makeRepo({ owner: 'session-A', lastActive: stale })
  const r = run(proj, ['run', 'brainstorm', '--change', 'c1', '--done', '--output', 'x'], { session: 'session-B' })
  assert(!(r.stderr || '').includes('拒绝写操作'), '3 他人 stale → 不拦（自动接管）')
  const db = new DatabaseSync(join(proj, '.sillyspec', '.runtime', 'sillyspec.db'), { readOnly: true })
  const row = db.prepare('SELECT owner_session FROM changes WHERE name = ?').get('c1')
  db.close()
  assert(row && row.owner_session === 'session-B', `3b owner 自动接管（实际 ${row && row.owner_session}）`)
}
// ── 4. 读路径（prompt 显示）→ 不拦 ──
{
  const proj = await makeRepo({ owner: 'session-A', lastActive: NOW })
  const r = run(proj, ['run', 'brainstorm', '--change', 'c1'], { session: 'session-B' })
  assert(!(r.stderr || '').includes('拒绝写操作'), '4 读路径（无写 flag）不拦——prompt 显示保持开放')
}
// ── 5. 本会话自有 → 放行 ──
{
  const proj = await makeRepo({ owner: 'session-A', lastActive: NOW })
  const r = run(proj, ['run', 'brainstorm', '--change', 'c1', '--done', '--output', 'x'], { session: 'session-A' })
  assert(!(r.stderr || '').includes('拒绝写操作'), '5 本会话自有 → 写操作零扰动')
}

for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} }
console.log(`\n${failed === 0 ? '✅ ALL PASS' : '❌ FAILED'}: ${total - failed}/${total}`)
process.exit(failed === 0 ? 0 : 1)
