/**
 * worktree-guard db 主路径回归（node:sqlite DatabaseSync 同步只读子进程）：
 * task-10 废 gate-status.json 后，readCurrentStage / isNoWorktreeMode 唯一来源是
 * queryDbFirstCell 直读 sillyspec.db（node + node:sqlite 只读子进程，不依赖外部
 * sqlite3 CLI——Windows 默认没有，全平台用 node）。本测试直接调 _queryDbFirstCellForTest
 * 验证同步只读查询语义。
 */
import { _queryDbFirstCellForTest as queryDbFirstCell } from '../src/hooks/worktree-guard.js'
import { DB } from '../src/db.js'
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

let passed = 0
let failed = 0
const assert = (c, m) => {
  if (c) { passed++; console.log('  ✅ ' + m) }
  else { failed++; console.error('  ❌ ' + m) }
}

const cwd = mkdtempSync(join(tmpdir(), 'wgdb-'))
try {
  mkdirSync(join(cwd, '.sillyspec', '.runtime'), { recursive: true })
  const db = new DB(join(cwd, '.sillyspec', '.runtime', 'sillyspec.db'))
  db.init() // node:sqlite DatabaseSync 同步 API，无 await
  const sq = db.getDb()
  // node:sqlite：prepare(sql).run(...) 绑定参数（原 sql.js 的 sq.run(sql) 不存在）
  sq.prepare("INSERT INTO project (id,name,created_at,updated_at) VALUES (1,'p','t','t')").run()
  sq.prepare("INSERT INTO changes (name,current_stage,status,no_worktree,created_at,last_active) VALUES ('c1','execute','active',1,'t','t')").run()
  db.close()

  // 直读 sillyspec.db（queryDbFirstCell 同步返回，node:sqlite readOnly 子进程）
  const stage = queryDbFirstCell(cwd, "SELECT current_stage FROM changes WHERE status='active' AND current_stage IN ('execute','quick') ORDER BY last_active DESC LIMIT 1")
  assert(stage === 'execute', `直读 DB 读出 current_stage=execute（实际 ${stage}）`)

  const noWt = queryDbFirstCell(cwd, "SELECT no_worktree FROM changes WHERE status='active' AND current_stage IN ('execute','quick') LIMIT 1")
  assert(noWt === '1', `直读 DB 读出 no_worktree=1（实际 ${noWt}）`)

  // db 不存在 → null（fail-closed，不抛错）
  const empty = queryDbFirstCell(join(tmpdir(), `no-such-${process.pid}`), 'SELECT 1')
  assert(empty === null, 'db 不存在时返回 null（fail-closed，不抛错）')
} finally {
  try { rmSync(cwd, { recursive: true, force: true }) } catch {}
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
console.log(`${'='.repeat(50)}`)
if (failed > 0) process.exit(1)
