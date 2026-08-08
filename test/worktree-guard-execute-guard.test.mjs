/**
 * execute 期 worktree-guard 守卫边界用例（task-16, AC-02 / G2）
 *
 * task-10 废 gate-status.json、task-11 hook 子进程改 better-sqlite3 只读连接后，hook 唯一权威源
 * 是 sillyspec.db（queryDbFirstCell：execFileSync 起真实 node 子进程 require better-sqlite3 只读）。
 * 本测试实证 execute 期守卫边界不 fail-open：
 *   1. hook 子进程实测：_queryDbFirstCellForTest 内部 execFileSync 真实子进程直读
 *      current_stage='execute' 与 active changes 命中（非单元级同步 mock）
 *   2. shouldBlock 4 边界：registered worktree 放行 / unregistered 拦截 /
 *      主工作区 execute 期拦截 / no_worktree=1 拦截
 *   3. fail-closed：db 缺失或损坏时 queryDbFirstCell 返回 null、源码写被拦截而非放行
 *
 * fixture 刻意不写 gate-status.json——验证 DB 为唯一权威源（AC-02/G2，无 stale 缓存）。
 * 跨平台：mkdtemp 临时目录 + better-sqlite3 同步原生绑定（无外部 sqlite3 CLI 依赖），
 * Windows/Linux/macOS 均跑通；路径全用 path.join（path.sep），不硬编码分隔符。
 */
import {
  _queryDbFirstCellForTest as queryDbFirstCell,
  shouldBlock,
  shouldBlockWrite,
} from '../src/hooks/worktree-guard.js'
import { DB } from '../src/db.js'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

let passed = 0
let failed = 0
function assert(condition, message) {
  if (condition) {
    passed++
    console.log('  ✅ ' + message)
  } else {
    failed++
    console.error('  ❌ ' + message)
  }
}

const cleanups = []
function mkProject(prefix) {
  const cwd = mkdtempSync(join(tmpdir(), prefix + '-'))
  cleanups.push(() => {
    try { rmSync(cwd, { recursive: true, force: true }) } catch { /* Windows 偶发文件占用，忽略 */ }
  })
  return cwd
}

/**
 * 在 temp 项目里建 sillyspec.db 并种一条 change 行（刻意不写 gate-status.json）。
 * 用 DB 类（better-sqlite3 同步 API）建库：
 *  - 让 findProjectRoot 命中 temp 项目（.sillyspec/.runtime/sillyspec.db 标记），不误爬到用户 home；
 *  - readCurrentStage / isNoWorktreeMode 经 queryDbFirstCell readonly 子进程读出阶段/no_worktree。
 * 每次 DELETE FROM changes 后插单行，保证 isNoWorktreeMode LIMIT 1 的确定性（无多行竞态）。
 */
function seedDb(cwd, { name = 'c-exec', stage = 'execute', status = 'active', noWorktree = 0 } = {}) {
  const runtimeDir = join(cwd, '.sillyspec', '.runtime')
  mkdirSync(runtimeDir, { recursive: true })
  const db = new DB(join(runtimeDir, 'sillyspec.db'))
  db.init() // better-sqlite3 同步 API，无 await
  const sq = db.getDb()
  sq.prepare("INSERT OR IGNORE INTO project (id,name,created_at,updated_at) VALUES (1,'p','t','t')").run()
  sq.prepare('DELETE FROM changes').run()
  sq.prepare("INSERT INTO changes (name,current_stage,status,no_worktree,created_at,last_active) VALUES (?,?,?,?,'t','t')")
    .run(name, stage, status, noWorktree ? 1 : 0)
  db.close() // close 触发 WAL checkpoint，数据落主库供 readonly 子进程读到
}

const registeredChange = '2026-08-09-registered'
const unregisteredChange = '2026-08-09-unregistered'

try {
  // ── 1. hook 子进程实测：_queryDbFirstCellForTest 真实子进程直读 DB ──
  console.log('\n[1] hook 子进程实测（execFileSync 起真实 node 子进程 require better-sqlite3 readonly）')
  {
    const cwd = mkProject('wg-exec-subproc')
    seedDb(cwd, { name: registeredChange, stage: 'execute', status: 'active', noWorktree: 0 })

    // readCurrentStage 同款 SQL：直读 active execute change 的 current_stage
    const stage = queryDbFirstCell(
      cwd,
      "SELECT current_stage FROM changes WHERE status='active' AND current_stage IN ('execute','quick') ORDER BY last_active DESC LIMIT 1"
    )
    assert(stage === 'execute', `子进程直读 current_stage=execute（实际 ${JSON.stringify(stage)}）`)

    // active changes 命中：能读出登记的 change 名（验证不是空库/空表/读错列）
    const activeName = queryDbFirstCell(
      cwd,
      "SELECT name FROM changes WHERE status='active' AND current_stage IN ('execute','quick') LIMIT 1"
    )
    assert(activeName === registeredChange, `子进程直读 active changes 命中 ${registeredChange}（实际 ${JSON.stringify(activeName)}）`)
  }

  // ── 2. shouldBlock execute 期 4 边界（DB 为唯一权威源，无 gate-status.json） ──
  console.log('\n[2] shouldBlock execute 期 4 边界（fixture 无 gate-status.json）')
  {
    const cwd = mkProject('wg-exec-bounds')
    seedDb(cwd, { name: registeredChange, stage: 'execute', status: 'active', noWorktree: 0 })

    const runtimeDir = join(cwd, '.sillyspec', '.runtime')
    const registeredWt = join(runtimeDir, 'worktrees', registeredChange)
    const unregisteredWt = join(runtimeDir, 'worktrees', unregisteredChange)
    // 登记已注册 worktree：isInsideRegisteredWorktree 扫描 .runtime/worktrees/ 子目录 + 读 meta.worktreePath
    mkdirSync(registeredWt, { recursive: true })
    mkdirSync(unregisteredWt, { recursive: true })
    writeFileSync(join(registeredWt, 'meta.json'), JSON.stringify({
      changeName: registeredChange,
      worktreePath: registeredWt,
      mode: 'worktree',
    }, null, 2))
    // unregisteredWt 刻意不写 meta.json → readWorktreeMeta 返回 null → 目录扫描视为未登记

    // 边界 1：registered worktree 内源码写 → 放行
    assert(
      shouldBlock({ tool: 'Write', filePath: join(registeredWt, 'src', 'ok.js'), cwd }).blocked === false,
      '边界1 registered worktree 内源码写放行'
    )

    // 边界 2：unregistered worktree 内源码写 → 拦截（在 worktree 存储区但无登记 meta）
    assert(
      shouldBlock({ tool: 'Write', filePath: join(unregisteredWt, 'src', 'blocked.js'), cwd }).blocked === true,
      '边界2 unregistered worktree 内源码写拦截'
    )

    // 边界 3：主工作区 execute 期源码写 → 拦截（不在任何登记 worktree 内）
    assert(
      shouldBlock({ tool: 'Write', filePath: join(cwd, 'src', 'main.js'), cwd }).blocked === true,
      '边界3 主工作区 execute 期源码写拦截'
    )

    // 边界 4：no_worktree=1 变更主工作区源码写 → 拦截（即使 stage=execute 也无 worktree 隔离环境）
    seedDb(cwd, { name: 'c-noworktree', stage: 'execute', status: 'active', noWorktree: 1 })
    const blkNoWt = shouldBlock({ tool: 'Write', filePath: join(cwd, 'src', 'noworktree.js'), cwd })
    assert(blkNoWt.blocked === true, '边界4 no_worktree=1 变更源码写拦截')
    assert(
      typeof blkNoWt.reason === 'string' && blkNoWt.reason.includes('no_worktree'),
      `边界4 拦截 reason 含 no_worktree 提示（实际 ${JSON.stringify(blkNoWt.reason && blkNoWt.reason.slice(0, 48))}）`
    )
  }

  // ── 3. fail-closed：db 缺失或损坏，守卫不 fail-open（源码写被拦截而非误放行） ──
  console.log('\n[3] fail-closed（db 缺失/损坏，源码写拦截而非放行）')
  {
    // 3a. db 缺失：queryDbFirstCell 返回 null（不抛错；findProjectRoot 未命中根本不进 hook，
    //     这里直测 queryDbFirstCell 的 existsSync 门禁 → null fail-closed 路径）
    const missingCwd = join(tmpdir(), 'wg-exec-missing-' + process.pid)
    const missingVal = queryDbFirstCell(missingCwd, 'SELECT 1')
    assert(missingVal === null, '3a db 缺失时 queryDbFirstCell 返回 null（fail-closed，不抛错）')

    // 3b. db 损坏：覆盖主库为非 SQLite 内容 + 清 WAL 侧车 → readonly 子进程 fileMustExist 打开失败
    //     → execFileSync 抛错 → catch warn + 返回 null（fail-closed）
    const cwd = mkProject('wg-exec-corrupt')
    seedDb(cwd, { name: 'c-corrupt', stage: 'execute', status: 'active', noWorktree: 0 })
    const dbPath = join(cwd, '.sillyspec', '.runtime', 'sillyspec.db')
    writeFileSync(dbPath, 'NOT-SQLITE-GARBAGE-CONTENT')
    try { rmSync(dbPath + '-wal', { force: true }) } catch { /* WAL 侧车可能不存在 */ }
    try { rmSync(dbPath + '-shm', { force: true }) } catch { /* 同上 */ }

    const corruptVal = queryDbFirstCell(
      cwd,
      "SELECT current_stage FROM changes WHERE status='active' AND current_stage IN ('execute','quick') LIMIT 1"
    )
    assert(corruptVal === null, '3b db 损坏时 queryDbFirstCell 返回 null（fail-closed warn 已打）')

    // 3c. db 损坏时源码写被拦截：readCurrentStage 降级 null → stage='(none)' → 非执行期 → 拦截
    //     （fail-closed 的核心断言：绝不在 db 不可读时放行源码写）
    const blkCorrupt = shouldBlockWrite(join(cwd, 'src', 'foo.js'), cwd)
    assert(blkCorrupt.blocked === true, '3c db 损坏时源码写拦截（fail-closed，不误放行）')
  }

  // ── 汇总 ──
  console.log(`\n${'='.repeat(60)}`)
  console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
  console.log(`${'='.repeat(60)}`)
} finally {
  for (const fn of cleanups) fn()
}

if (failed > 0) process.exit(1)
