/**
 * change-ownership-guards 集成测试（2026-09-14-change-ownership-guards task-04）
 *
 * 真 git 临时仓（不 mock git / SQLite，fixture 形态沿用 apply-conflict-hardening.test.mjs
 * + worktree-apply-review-allowlist.test.mjs 先例）。七组覆盖（FR-01/02/03，D-001~D-005@v1）：
 *   ① 迁移：手工建 v5 库升级自动加 owner_session 列幂等 / 存量行 NULL 无主可认领
 *   ② 所有权四态：自有放行 / 他人活跃结构化拒绝 / 窗口外 takeover-stale / --takeover 留痕
 *      （+ setChangeOwner 心跳刷新 / claimChangeOwner 守卫不覆盖）
 *   ③ 会话标识三级优先级（--session > env > quick 会话名 > anon@host 降级教学 warning）
 *   ④ CLI 接线旁路堵点：apply 他人活跃 exit 1 带指引；assess 自动 apply 软跳零落盘；
 *      --session 命中 self 后 assess 自动落盘（flag 接线回归）
 *   ⑤ 放行过滤：review 外来声明剔除进 violations + reviewOverdeclaredFiles；allow 面内声明零扰动
 *   ⑥ 归因分流：DB 判 worktree 归因零依赖主仓窗口（meta 活/分支活两形态）/ 分支已删 fail-closed 空集注记
 *   ⑦ 归档门：未 apply 交付面阻断 / --skip-apply 留痕（record 随归档包）放行 / 他人活跃归档拒绝
 *
 * 执行顺序说明：③（anon 降级 warning 用例）必须先于 ⑦——resolveSessionIdentity 的
 * 进程内一次性 warning memo 会被 archiveChangeDirectory 直调的 anon 降级路径消耗，
 * 同进程后跑的 warning 断言会假红。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import { DB } from '../src/db.js'
import { openDatabase } from '../src/db-engine.js'
import { ProgressManager, resolveSessionIdentity } from '../src/progress.js'
import { applyWorktree } from '../src/worktree-apply.js'
import { archiveChangeDirectory } from '../src/run/complete-handlers.js'
import { generateTaskReviewDrafts } from '../src/task-review.js'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const binCLI = join(repoRoot, 'bin', 'sillyspec.js')

const tmpRoots = []
function mk(p) { const d = mkdtempSync(join(tmpdir(), p)); tmpRoots.push(d); return d }
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

function git(dir, args) {
  const r = spawnSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`)
  return r.stdout.trim()
}

/** 临时 git 仓（含 .gitignore .sillyspec/ 的 base commit），返回 { cwd, specBase, base } */
function makeRepo(prefix) {
  const cwd = mk(prefix)
  git(cwd, ['init', '-q'])
  git(cwd, ['config', 'user.email', 't@t.local']); git(cwd, ['config', 'user.name', 't'])
  git(cwd, ['config', 'commit.gpgsign', 'false'])
  writeFileSync(join(cwd, '.gitignore'), '.sillyspec/\n')
  mkdirSync(join(cwd, 'src'), { recursive: true })
  writeFileSync(join(cwd, 'src', 'app.js'), 'app v1\n')
  writeFileSync(join(cwd, 'README.md'), 'init\n')
  git(cwd, ['add', '.']); git(cwd, ['commit', '-q', '-m', 'base'])
  return { cwd, specBase: join(cwd, '.sillyspec'), base: git(cwd, ['rev-parse', 'HEAD']) }
}

/**
 * worktree 交付面 fixture：主仓 base commit + worktree 改 src/app.js（未提交）+ 规范位 meta.json
 * + changes/<c>/{design.md(§6 清单),tasks/task-01.md(allowed_paths)} + 进度库 changes 行。
 */
function setupWtFixture({ prefix = 'cog-', changeName = 'c1', owner = null } = {}) {
  const { cwd, specBase, base } = makeRepo(prefix)
  const wtDir = join(specBase, '.runtime', 'worktrees', changeName)
  git(cwd, ['worktree', 'add', '-q', wtDir, '-b', `sillyspec/${changeName}`])
  writeFileSync(join(wtDir, 'src', 'app.js'), 'app v2  // 本变更交付\n')
  writeFileSync(join(wtDir, 'meta.json'), JSON.stringify({
    changeName, branch: `sillyspec/${changeName}`, worktreePath: wtDir,
    baseHash: base, actualBaseHash: base, baselineCommit: base, mode: 'worktree',
  }))
  const changeDir = join(specBase, 'changes', changeName)
  mkdirSync(join(changeDir, 'tasks'), { recursive: true })
  writeFileSync(join(changeDir, 'design.md'), [
    '# D', '', '## 文件变更清单', '| 操作 | 文件路径 | 说明 |', '|---|---|---|',
    `| 修改 | src/app.js | 改动 |`, '',
  ].join('\n'))
  writeFileSync(join(changeDir, 'tasks', 'task-01.md'), [
    '---', 'id: task-01', 'title: t', 'title_zh: 任务', 'allowed_paths:', '  - src/app.js',
    'goal: >', '  实现。', 'implementation:', '  - 步骤', 'acceptance:', '  - 验收',
    'verify:', '  - node --version', 'constraints:', '  - 无', '---', '',
  ].join('\n'))
  const pm = new ProgressManager({ specDir: specBase })
  pm.registerChange(cwd, changeName)
  if (owner) pm.setChangeOwner(cwd, changeName, owner)
  return { cwd, specBase, base, wtDir, changeDir, pm, changeName }
}

/** 捕获 console + 桩 process.exit（throw 隔离），供直调含 process.exit 的 handler */
async function runCaptureExit(fn) {
  const origLog = console.log, origErr = console.error, origWarn = console.warn, origExit = process.exit
  let buf = '', exitCode = null, error = null, result
  console.log = (...a) => { buf += a.join(' ') + '\n' }
  console.error = (...a) => { buf += a.join(' ') + '\n' }
  console.warn = (...a) => { buf += a.join(' ') + '\n' }
  process.exit = (code) => { exitCode = code; throw new Error('EXIT_' + code) }
  try { result = await fn() }
  catch (e) { error = e }
  finally {
    console.log = origLog; console.error = origErr; console.warn = origWarn; process.exit = origExit
  }
  return { stdout: buf, exitCode, error, result }
}

function runCLI(args, { cwd } = {}) {
  const env = { ...process.env }
  delete env.SILLYSPEC_SESSION_ID // 隔离本进程 ⑦ 组 env 实验的泄漏
  const r = spawnSync(process.execPath, [binCLI, ...args], {
    cwd, env, encoding: 'utf8', timeout: 60_000, stdio: ['ignore', 'pipe', 'pipe'],
  })
  return { status: r.status, combined: (r.stdout || '') + (r.stderr || '') }
}

// ─────────────────────────────────────────────────────────────
console.log('\n=== ① v5→v6 迁移：自动加列幂等 / 存量行 NULL 无主 ===\n')

test('① 手工 v5 库（无 owner_session 列）→ init 自动加列 + 存量行 NULL + 戳升 7（v7 authority 双轨列，2026-09-23-watcher-preview-progress） + 重跑幂等', () => {
  const root = mk('cog-mig-')
  const runtimeDir = join(root, '.runtime')
  mkdirSync(runtimeDir, { recursive: true })
  const dbPath = join(runtimeDir, 'sillyspec.db')
  // 手工建 v5 库：changes 表为 v6 前基座形态（无 owner_session；isolation/title 等列留给幂等 ALTER 补）；
  // project 表不预建——由 _createSchema 以 DEFAULT 6 落盘（CREATE IF NOT EXISTS 不会改既有表默认值）
  const raw = openDatabase(dbPath)
  raw.exec(`
    CREATE TABLE changes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      current_stage TEXT DEFAULT 'scan',
      status TEXT DEFAULT 'active',
      no_worktree INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      last_active TEXT NOT NULL,
      platform_change_id INTEGER,
      platform_workspace_id INTEGER,
      platform_last_sync TEXT,
      platform_sync_enabled INTEGER DEFAULT 0
    );
  `)
  raw.prepare("INSERT INTO changes (name, created_at, last_active) VALUES ('legacy', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')").run()
  raw.close()
  const stampPath = `${dbPath}.schema-version`
  writeFileSync(stampPath, '5') // v5 戳 → 与 DB_SCHEMA_VERSION=6 不匹配 → init 重跑 _createSchema

  const db = new DB(dbPath)
  db.init()
  const cols = db.getDb().prepare('PRAGMA table_info(changes)').all().map(c => c.name)
  assert.ok(cols.includes('owner_session'), `owner_session 列已加（cols=${cols.join(',')}）`)
  assert.ok(cols.includes('title') && cols.includes('isolation_mode'), '历史幂等 ALTER 照常补齐（v5 先例同款）')
  const legacy = db.getDb().prepare("SELECT owner_session FROM changes WHERE name = 'legacy'").get()
  assert.equal(legacy.owner_session, null, '存量行 owner_session=NULL（无主，任何会话可接管）')
  assert.equal(readFileSync(stampPath, 'utf8').trim(), '7', 'schema 戳升 7（v7 authority 双轨列，2026-09-23-watcher-preview-progress）')
  const projDflt = db.getDb().prepare("SELECT dflt_value FROM pragma_table_info('project') WHERE name = 'schema_version'").get()
  assert.equal(String(projDflt.dflt_value), '7', 'project.schema_version DEFAULT 同步 bump 7（新建库口径）')

  // 幂等：删戳强制重跑 _createSchema——duplicate column 被吞，列数不翻倍、数据不丢
  rmSync(stampPath)
  const db2 = new DB(dbPath)
  db2.init()
  const nCols = db2.getDb().prepare("SELECT COUNT(*) AS c FROM pragma_table_info('changes') WHERE name = 'owner_session'").get()
  assert.equal(nCols.c, 1, '重跑后 owner_session 仍只有一列（幂等 ALTER）')
  assert.equal(db2.getDb().prepare("SELECT COUNT(*) AS c FROM changes WHERE name = 'legacy'").get().c, 1, '存量行未受迁移扰动')

  // 迁移后的库可被 ProgressManager 直接消费：无主行认领成功（数据载体 ↔ 语义层打通）
  const pm = new ProgressManager({ specDir: root })
  assert.equal(pm.getChangeOwner(root, 'legacy'), null, '迁移前读 owner=null（无主）')
  const claimed = pm.claimChangeOwner(root, 'legacy', 'sess-A')
  assert.equal(claimed, 'sess-A', '存量无主行认领写入')
})

// ─────────────────────────────────────────────────────────────
console.log('\n=== ② 所有权四态（assertChangeOwnership 直调）+ owner 读写语义 ===\n')

test('② 四态：self 放行 / 他人活跃结构化拒绝 / 窗口外 takeover-stale / --takeover 留痕 + no-owner', () => {
  const { cwd, specBase } = makeRepo('cog-own-')
  const pm = new ProgressManager({ specDir: specBase })
  pm.registerChange(cwd, 'c1')
  const iso = new Date().toISOString()
  const setLastActive = (isoStr) => pm._ensureDB(cwd).getDb()
    .prepare("UPDATE changes SET last_active = ? WHERE name = 'c1'").run(isoStr)

  // 态 0：无主（刚 registerChange 未写 owner）→ 放行
  const t0 = pm.assertChangeOwnership(cwd, 'c1', { selfSession: 'sess-A', nowMs: Date.now() })
  assert.equal(t0.allowed, true, '无主放行')
  assert.equal(t0.action, 'no-owner')
  assert.equal(t0.heartbeatMs, 15 * 60 * 1000, '心跳窗缺省 15 分钟')

  // 态 1：自有 → 放行零路径变化
  pm.setChangeOwner(cwd, 'c1', 'sess-A')
  const t1 = pm.assertChangeOwnership(cwd, 'c1', { selfSession: 'sess-A', nowMs: Date.now() })
  assert.equal(t1.allowed, true); assert.equal(t1.action, 'self')
  assert.equal(t1.owner, 'sess-A')

  // 态 2：他人且活跃窗内 → 拒绝（结构化字段 owner + lastActive + heartbeatMs）
  pm.setChangeOwner(cwd, 'c1', 'other-session') // setChangeOwner 同事务刷新 last_active=now
  const t2 = pm.assertChangeOwnership(cwd, 'c1', { selfSession: 'sess-B', nowMs: Date.now() })
  assert.equal(t2.allowed, false, '他人活跃 → 拒绝接管类操作')
  assert.equal(t2.action, 'blocked-active-owner')
  assert.equal(t2.owner, 'other-session', '结构化字段 owner')
  assert.ok(t2.lastActive && Math.abs(Date.now() - new Date(t2.lastActive).getTime()) < 60_000, '结构化字段 lastActive=新鲜心跳')
  assert.equal(t2.heartbeatMs, 15 * 60 * 1000)

  // 态 3：他人但 last_active 距今超窗 → 放行并标 takeover-stale（调用方重写 owner）
  setLastActive(new Date(Date.now() - 30 * 60 * 1000).toISOString())
  const t3 = pm.assertChangeOwnership(cwd, 'c1', { selfSession: 'sess-B', nowMs: Date.now() })
  assert.equal(t3.allowed, true); assert.equal(t3.action, 'takeover-stale')
  assert.equal(t3.owner, 'other-session')
  // 接管写库侧：setChangeOwner 重写 + 心跳从接管时刻起算（下次校验不再读到旧 owner 陈旧时间戳）
  pm.setChangeOwner(cwd, 'c1', 'sess-B')
  const t3b = pm.assertChangeOwnership(cwd, 'c1', { selfSession: 'sess-C', nowMs: Date.now() })
  assert.equal(t3b.action, 'blocked-active-owner', '接管后 last_active 已刷新（sess-C 立即抢不走）')

  // 态 4：--takeover（forced）→ 活跃窗内也无条件放行留痕
  const t4 = pm.assertChangeOwnership(cwd, 'c1', { selfSession: 'sess-C', nowMs: Date.now(), forced: true })
  assert.equal(t4.allowed, true); assert.equal(t4.action, 'takeover-forced')

  // last_active 不可解析 → 按陈旧处理（逃生通道优先，不把 change 锁死）
  setLastActive('not-a-date')
  const t5 = pm.assertChangeOwnership(cwd, 'c1', { selfSession: 'sess-C', nowMs: Date.now() })
  assert.equal(t5.allowed, true); assert.equal(t5.action, 'takeover-stale', '时间戳损坏按陈旧放行')
})

test('②b claimChangeOwner 守卫：他人持有不覆盖 / NULL 行认领写入 / 首建即得', () => {
  const { cwd, specBase } = makeRepo('cog-claim-')
  const pm = new ProgressManager({ specDir: specBase })
  // 首建即得
  assert.equal(pm.claimChangeOwner(cwd, 'c9', 'sess-A'), 'sess-A', '行不存在 → 创建并认领')
  // 他人持有 → 不覆盖
  assert.equal(pm.claimChangeOwner(cwd, 'c9', 'sess-B'), 'sess-A', '他人已持有 → 返回既有 owner 不覆盖')
  assert.equal(pm.getChangeOwner(cwd, 'c9'), 'sess-A')
  // NULL 行 → 认领写入
  pm.registerChange(cwd, 'c10') // 未带 owner → NULL
  assert.equal(pm.claimChangeOwner(cwd, 'c10', 'sess-B'), 'sess-B', '无主行 → 认领写入')
  // 无行 + 读容错
  assert.equal(pm.getChangeOwner(cwd, 'no-such'), null)
})

// ─────────────────────────────────────────────────────────────
console.log('\n=== ③ 会话标识三级优先级 + anon 降级教学 warning ===\n')
// （本组先于 ⑦ 归档组跑：resolveSessionIdentity 的进程内一次性 warning memo 会被后续直调消耗）

test('③ 三级解析：--session > env SILLYSPEC_SESSION_ID > quick 会话名 > anon@host 降级', () => {
  const prevEnv = process.env.SILLYSPEC_SESSION_ID
  try {
    // 第一级：flag（空白 flag 视为未提供）
    process.env.SILLYSPEC_SESSION_ID = 'env-id'
    assert.deepEqual(resolveSessionIdentity({ flagSession: 'flag-id' }), { session: 'flag-id', source: 'flag' })
    assert.deepEqual(resolveSessionIdentity({ flagSession: '   ' }), { session: 'env-id', source: 'env' }, '空白 flag 回落 env')
    // 第二级：env
    assert.deepEqual(resolveSessionIdentity({}), { session: 'env-id', source: 'env' })
    // 第三级：quick 会话名（quick-<8hex> 才启用；full-flow 名不启用）
    delete process.env.SILLYSPEC_SESSION_ID
    assert.deepEqual(resolveSessionIdentity({ quickChangeName: 'quick-1a2b3c4d', warn: false }),
      { session: 'quick-1a2b3c4d', source: 'quick-session' })
    assert.equal(resolveSessionIdentity({ quickChangeName: 'full-flow-change', warn: false }).source, 'anon-host',
      '非 quick-<8hex> 名不启用第三级')
    // 第四级：anon@host 降级 + 一次性教学 warning + marker 落盘
    const anonRoot = mk('cog-anon-')
    const warns = []
    const origWarn = console.warn
    console.warn = (...a) => warns.push(a.join(' '))
    let ident
    try { ident = resolveSessionIdentity({ cwd: anonRoot, warn: true }) }
    finally { console.warn = origWarn }
    assert.equal(ident.source, 'anon-host')
    assert.ok(ident.session.startsWith('anon@'), `anon 标识形态（实际 ${ident.session}）`)
    assert.ok(warns.some(w => w.includes('SILLYSPEC_SESSION_ID')), '降级 warning 含 export 教学指引')
    assert.ok(warns.some(w => w.includes('--session')), '降级 warning 含 --session flag 指引')
    assert.ok(existsSync(join(anonRoot, '.sillyspec', '.runtime', 'anon-session-warn.json')), '降频 marker 已落盘')
    // 同进程二次解析不再重复 warning（进程内 memo；跨进程 24h 窗由 marker 承担）
    const warns2 = []
    console.warn = (...a) => warns2.push(a.join(' '))
    try { resolveSessionIdentity({ cwd: anonRoot, warn: true }) }
    finally { console.warn = origWarn }
    assert.equal(warns2.length, 0, '二次解析零重复 warning')
  } finally {
    if (prevEnv === undefined) delete process.env.SILLYSPEC_SESSION_ID
    else process.env.SILLYSPEC_SESSION_ID = prevEnv
  }
})

// ─────────────────────────────────────────────────────────────
console.log('\n=== ④ CLI 接线：apply 他人活跃拒绝带指引 / assess 旁路软跳零落盘 / --session 命中 self ===\n')

test('④a worktree apply 他人活跃 change → exit 1 + 结构化指引（owner/--takeover）+ 主仓零落盘', () => {
  const { cwd, changeName } = setupWtFixture({ prefix: 'cog-apply-', owner: 'other-session' })
  const r = runCLI(['--dir', cwd, 'worktree', 'apply', changeName])
  assert.equal(r.status, 1, 'apply 被所有权护栏拒绝（exit 1）')
  assert.ok(r.combined.includes('正被其他会话持有'), '报错含持有语义')
  assert.ok(r.combined.includes('other-session'), '报错点名 owner（结构化字段）')
  assert.ok(r.combined.includes('--takeover'), '报错含 --takeover 显式接管指引')
  assert.equal(readFileSync(join(cwd, 'src', 'app.js'), 'utf8'), 'app v1\n', '主仓零落盘（拦截在实际 apply 前）')
})

test('④b assess 自动 apply 他人活跃 → 软跳零落盘（exit 0 + warning + --takeover 指引，旁路已堵）', () => {
  const { cwd, changeName } = setupWtFixture({ prefix: 'cog-assess-', owner: 'other-session' })
  const r = runCLI(['--dir', cwd, 'worktree', 'assess', changeName])
  assert.equal(r.status, 0, '软跳不抛错（无人值守不越权也不阻断审计流）')
  assert.ok(r.combined.includes('正被其他会话持有'), 'warning 含持有方信息')
  assert.ok(r.combined.includes('--takeover'), 'warning 含显式接管指引')
  assert.ok(!r.combined.includes('已自动应用'), '未执行自动落盘')
  assert.equal(readFileSync(join(cwd, 'src', 'app.js'), 'utf8'), 'app v1\n', 'assess 旁路主仓零落盘')
})

test('④c assess 带 --session 命中 self → 自动 apply 落盘（flag 接线回归）', () => {
  const { cwd, changeName } = setupWtFixture({ prefix: 'cog-self-', owner: 'other-session' })
  const r = runCLI(['--dir', cwd, 'worktree', 'assess', changeName, '--session', 'other-session'])
  assert.equal(r.status, 0)
  assert.ok(r.combined.includes('已自动应用'), '所有权放行后自动 apply 执行')
  assert.ok(readFileSync(join(cwd, 'src', 'app.js'), 'utf8').includes('app v2'), '交付面落主仓')
})

// ─────────────────────────────────────────────────────────────
console.log('\n=== ⑤ 放行过滤：review 外来声明剔除进违规报告 / allow 面内声明零扰动 ===\n')

function writeReview(specBase, changeName, changedFiles) {
  const runDir = join(specBase, '.runtime', 'execute-runs', 'exec-2026-09-14-120000')
  const taskDir = join(runDir, 'tasks', 'task-01')
  mkdirSync(taskDir, { recursive: true })
  writeFileSync(join(runDir, 'change'), changeName + '\n')
  writeFileSync(join(taskDir, 'review.json'), JSON.stringify({
    schemaVersion: 2, task: 'task-01',
    base: '0'.repeat(40), head: '1'.repeat(40),
    changedFiles, specVerdict: 'pass', qualityVerdict: 'pass',
    reviewerNotes: 't', requiredEvidence: [],
  }, null, 2))
}

test('⑤a review 声明含 allow 面外文件 → 剔除出放行面 + reviewOverdeclaredFiles + violations 嫌疑标注', () => {
  const { cwd, specBase, changeName } = setupWtFixture({ prefix: 'cog-filter-' })
  // worktree 追加外来文件（并行会话在途文件混入声明的形态）
  writeFileSync(join(specBase, '.runtime', 'worktrees', changeName, 'src', 'foreign-wip.js'), 'foreign\n')
  writeReview(specBase, changeName, ['src/app.js', 'src/foreign-wip.js'])
  const r = applyWorktree(changeName, { cwd })
  assert.equal(r.ok, false, '外来声明不再放行（D-003 翻转：admission 增量归零）')
  assert.ok((r.reviewOverdeclaredFiles || []).includes('src/foreign-wip.js'),
    `reviewOverdeclaredFiles 记录外来声明（实际 ${JSON.stringify(r.reviewOverdeclaredFiles)}）`)
  assert.ok((r.errors || []).some(e => e.includes('review 声明了越权文件') && e.includes('src/foreign-wip.js')),
    'violations 报告行含嫌疑标注')
  assert.ok((r.warnings || []).some(w => w.includes('review 声明了越权文件') && w.includes('src/foreign-wip.js')),
    '审计 warning 点名外来声明')
  assert.ok(!existsSync(join(cwd, 'src', 'foreign-wip.js')), '外来声明文件不落地主仓')
})

test('⑤b review 声明全在 allow 面内 → 放行不受收紧影响', () => {
  const { cwd, specBase, changeName } = setupWtFixture({ prefix: 'cog-inface-' })
  writeReview(specBase, changeName, ['src/app.js'])
  const r = applyWorktree(changeName, { cwd })
  assert.equal(r.ok, true, '面内声明 apply 照常放行（errors=' + JSON.stringify(r.errors) + '）')
  assert.equal(r.reviewOverdeclaredFiles, undefined, '无外来声明 → 无剔除留痕')
  assert.ok(readFileSync(join(cwd, 'src', 'app.js'), 'utf8').includes('app v2'), '交付面落主仓')
})

// ─────────────────────────────────────────────────────────────
console.log('\n=== ⑥ 归因分流：worktree 判源零依赖主仓窗口 / 分支已删 fail-closed 空集 ===\n')

function setupAttributionFixture({ prefix }) {
  const { cwd, specBase, base } = makeRepo(prefix)
  const changeName = 'c6'
  const wtDir = join(specBase, '.runtime', 'worktrees', changeName)
  git(cwd, ['worktree', 'add', '-q', wtDir, '-b', `sillyspec/${changeName}`])
  writeFileSync(join(wtDir, 'src', 'wt-file.js'), 'wt v1\n')
  git(wtDir, ['add', 'src/wt-file.js']); git(wtDir, ['commit', '-q', '-m', 'base-wt'])
  writeFileSync(join(wtDir, 'meta.json'), JSON.stringify({
    changeName, branch: `sillyspec/${changeName}`, worktreePath: wtDir,
    baseHash: base, actualBaseHash: base, baselineCommit: base, mode: 'worktree',
  }))
  const changeDir = join(specBase, 'changes', changeName)
  mkdirSync(join(changeDir, 'tasks'), { recursive: true })
  // plan.md：getOrCreateMultiRepoContext 无 plan.md 时返 null 退化单仓（execute 链同款前提）
  writeFileSync(join(changeDir, 'plan.md'), '# plan\n\n- [ ] task-01\n')
  writeFileSync(join(changeDir, 'tasks', 'task-01.md'), [
    '---', 'id: task-01', 'title: t', 'title_zh: 任务', 'allowed_paths:', '  - src/wt-file.js',
    'goal: >', '  实现。', 'implementation:', '  - 步骤', 'acceptance:', '  - 验收',
    'verify:', '  - node --version', 'constraints:', '  - 无', '---', '',
  ].join('\n'))
  const pm = new ProgressManager({ specDir: specBase })
  pm.registerChange(cwd, changeName)
  pm.updateChangeIsolation(cwd, changeName, { status: 'verified', mode: 'worktree' }) // DB 判源
  return { cwd, specBase, wtDir, changeName, pm }
}

function readDraft(specBase, changeName) {
  const runId = readFileSync(join(specBase, '.runtime', `current-execute-run-id-${changeName}`), 'utf8').trim()
  const p = join(specBase, '.runtime', 'execute-runs', runId, 'tasks', 'task-01', 'review.json')
  return { exists: existsSync(p), draft: existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null }
}

test('⑥a DB 判 worktree + meta 活：草稿归因取 worktree，主仓脏文件不被吸入', async () => {
  const { cwd, specBase, wtDir, changeName } = setupAttributionFixture({ prefix: 'cog-attrA-' })
  // worktree 未提交交付 + 主仓并行会话脏窗口（未跟踪新文件 + 已跟踪文件改动）
  writeFileSync(join(wtDir, 'src', 'wt-file.js'), 'wt v2  // 本变更交付\n')
  writeFileSync(join(cwd, 'src', 'foreign-dirty.js'), 'other session wip\n')
  writeFileSync(join(cwd, 'README.md'), 'init  // other session touched\n')
  const r = await generateTaskReviewDrafts({ changeName, cwd, platformOpts: {} })
  assert.ok(r.generated >= 1, `草稿已生成（generated=${r.generated}, reason=${r.reason}）`)
  const { draft } = readDraft(specBase, changeName)
  assert.ok(draft, 'task-01 review.json 草稿在盘')
  assert.ok(draft.changedFiles.includes('src/wt-file.js'), 'worktree 交付文件被归因')
  assert.ok(!draft.changedFiles.some(f => f.includes('foreign-dirty')), '主仓未跟踪脏文件不被吸入')
  assert.ok(!draft.changedFiles.includes('README.md'), '主仓已跟踪脏改动不被吸入')
})

test('⑥b DB 判 worktree + meta 缺失但分支活：归因=分支 diff，主仓脏文件仍零吸入（不落共享窗口）', async () => {
  const { cwd, specBase, wtDir, changeName } = setupAttributionFixture({ prefix: 'cog-attrB-' })
  // 分支上提交交付（worktree-branch 口径的可归因源）
  writeFileSync(join(wtDir, 'src', 'wt-file.js'), 'wt v2  // 分支交付\n')
  git(wtDir, ['add', 'src/wt-file.js']); git(wtDir, ['commit', '-q', '-m', 'deliver'])
  // 模拟 cleanup 后 meta 失联：删 meta + 删 worktree 目录 + prune（分支 ref 保留）
  rmSync(join(wtDir, 'meta.json'))
  rmSync(wtDir, { recursive: true, force: true })
  git(cwd, ['worktree', 'prune'])
  // 主仓脏窗口（旧口径会经 gitChangedFiles(cwd) 兜底吸入的正是这批）
  writeFileSync(join(cwd, 'src', 'foreign-dirty2.js'), 'other session wip 2\n')
  writeFileSync(join(cwd, 'README.md'), 'init  // other session touched 2\n')
  // ctx 走 execute 链同款构造（getOrCreateMultiRepoContext 单仓退化 {main}）：
  // meta 缺失时 base 锚定走 worktree-branch 分支锚（branchBase/branchHead）——无 ctx 的
  // 单仓 legacy 路径在「无 meta.baseHash」早退，分支锚不可达（缺陷回报，不越卡修 src）
  const { getOrCreateMultiRepoContext } = await import('../src/run/shared.js')
  const ctx = await getOrCreateMultiRepoContext({ cwd, changeName, platformOpts: {} })
  const r = await generateTaskReviewDrafts({ changeName, cwd, platformOpts: {}, ctx })
  assert.ok(r.generated >= 1, `草稿已生成（generated=${r.generated}, reason=${r.reason}）`)
  const { draft } = readDraft(specBase, changeName)
  assert.ok(draft, 'task-01 review.json 草稿在盘')
  assert.deepEqual(draft.changedFiles, ['src/wt-file.js'], '归因=worktree 分支 diff（仅分支交付文件）')
})

test('⑥c DB 判 worktree + 分支已删（cleanup 终态）→ fail-closed 空集 + 不可归因注记（不回退主仓窗口）', async () => {
  const { cwd, specBase, changeName } = setupAttributionFixture({ prefix: 'cog-attrC-' })
  rmSync(join(specBase, '.runtime', 'worktrees', changeName, 'meta.json'))
  rmSync(join(specBase, '.runtime', 'worktrees', changeName), { recursive: true, force: true })
  git(cwd, ['worktree', 'prune'])
  git(cwd, ['branch', '-D', `sillyspec/${changeName}`])
  // 主仓脏文件在场——若回退主仓窗口会被吸入（回归锁定的反向证明）
  writeFileSync(join(cwd, 'src', 'foreign-dirty3.js'), 'other session wip 3\n')
  const r = await generateTaskReviewDrafts({ changeName, cwd, platformOpts: {} })
  assert.equal(r.generated, 0, '分支已删 → 零草稿生成')
  assert.ok(r.reason && r.reason.includes('不可归因（worktree 已清理）'), `reason 含终态空源注记（实际 ${r.reason}）`)
  assert.ok(!readDraft(specBase, changeName).exists, '未写任何草稿（fail-closed 空集）')
})

// ─────────────────────────────────────────────────────────────
console.log('\n=== ⑦ 归档门：未 apply 交付面阻断 / --skip-apply 留痕放行 / 他人活跃归档拒绝 ===\n')

test('⑦a worktree 有未 apply 交付面 → 归档阻断消息 + exit 1（探测门契约）', async () => {
  const { cwd, specBase, changeName, changeDir, pm } = setupWtFixture({ prefix: 'cog-arch-' })
  writeFileSync(join(changeDir, 'plan.md'), '# plan\n') // 归档移动前硬校验必需产物
  // 注：直调用 exit 桩（throw）会被归档门的 fail-open 探测 catch 吞掉后继续走完归档——
  // 这是桩伪象（生产 process.exit 真终止，拦截语义即生效）；故本用例只锁消息面 + exit 码
  // 记录，目录未移动语义交由 CLI 真进程语义（process.exit 终止）保证，不在桩下断言。
  const blocked = await runCaptureExit(() => archiveChangeDirectory(pm, cwd, { currentChange: changeName }, specBase, {}, {}))
  assert.equal(blocked.exitCode, 1, '未 apply 交付面 → 归档 exit 1')
  assert.ok(blocked.stdout.includes('未 apply 的交付面'), '报错含交付面语义')
  assert.ok(blocked.stdout.includes(`worktree apply ${changeName}`), '报错含 apply 指引')
  assert.ok(blocked.stdout.includes('--skip-apply'), '报错含 --skip-apply 出路')
})

test('⑦a2 --skip-apply → skip-apply.record.json 留痕随归档包 + 归档完成', async () => {
  const { cwd, specBase, changeName, changeDir, pm } = setupWtFixture({ prefix: 'cog-arch-skip-' })
  writeFileSync(join(changeDir, 'plan.md'), '# plan\n')
  const passed = await runCaptureExit(() => archiveChangeDirectory(pm, cwd, { currentChange: changeName }, specBase, {}, { skipApply: true }))
  assert.equal(passed.exitCode, null, '--skip-apply 放行归档（无 exit）')
  const destDir = join(specBase, 'changes', 'archive', changeName)
  const recordPath = join(destDir, 'skip-apply.record.json')
  assert.ok(existsSync(recordPath), 'skip-apply.record.json 随归档包留存')
  const record = JSON.parse(readFileSync(recordPath, 'utf8'))
  assert.equal(record.flag, '--skip-apply')
  assert.equal(record.change, changeName)
  assert.ok(record.deliverableFiles.includes('src/app.js'), 'record 记录未确认落地的交付文件')
  assert.ok(record.deliverableCount >= 1)
  assert.ok(!existsSync(changeDir), '源目录已移动')
  assert.ok(passed.stdout.includes('--skip-apply') || passed.stdout.includes('未确认落地'), '控制台留痕输出')
})

test('⑦b 他人活跃 change 归档 → 所有权拒绝（exit 1 + 接管指引）', async () => {
  const { cwd, specBase, changeName, changeDir, pm } = setupWtFixture({ prefix: 'cog-arch2-', owner: 'other-session' })
  writeFileSync(join(changeDir, 'plan.md'), '# plan\n')
  const r = await runCaptureExit(() => archiveChangeDirectory(pm, cwd, { currentChange: changeName }, specBase, {}, {}))
  assert.equal(r.exitCode, 1, '他人活跃 → 归档拒绝 exit 1')
  assert.ok(r.stdout.includes('正被其他会话持有') && r.stdout.includes('other-session'), '报错含 owner 结构化字段')
  assert.ok(r.stdout.includes('--takeover'), '报错含显式接管指引')
  assert.ok(existsSync(changeDir), '目录未动')
})
