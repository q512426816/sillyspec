/**
 * worktree-guard db fallback（node + sql.js）回归：
 * gate-status.json 缺失时，readCurrentStage / isNoWorktreeMode 经 queryDbFirstCell
 * 从 sillyspec.db 读取——不依赖外部 sqlite3 CLI（Windows 默认没有），全平台用 node。
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
  await db.init()
  const sq = db.getDb()
  sq.run("INSERT INTO project (id,name,created_at,updated_at) VALUES (1,'p','t','t')")
  sq.run("INSERT INTO changes (name,current_stage,status,no_worktree,created_at,last_active) VALUES ('c1','execute','active',1,'t','t')")
  db.close()

  // 无 gate-status.json → 走 db fallback（queryDbFirstCell）
  const stage = queryDbFirstCell(cwd, "SELECT current_stage FROM changes WHERE status='active' AND current_stage IN ('execute','quick') ORDER BY last_active DESC LIMIT 1")
  assert(stage === 'execute', `db fallback 读出 current_stage=execute（实际 ${stage}）`)

  const noWt = queryDbFirstCell(cwd, "SELECT no_worktree FROM changes WHERE status='active' AND current_stage IN ('execute','quick') LIMIT 1")
  assert(noWt === '1', `db fallback 读出 no_worktree=1（实际 ${noWt}）`)

  // db 不存在 → null（不抛错）
  const empty = queryDbFirstCell(join(tmpdir(), `no-such-${process.pid}`), 'SELECT 1')
  assert(empty === null, 'db 不存在时返回 null（不抛错）')
} finally {
  try { rmSync(cwd, { recursive: true, force: true }) } catch {}
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
console.log(`${'='.repeat(50)}`)
if (failed > 0) process.exit(1)
