/**
 * changes 表 title + quicklog_id 列：让 quick-<hex> 机器 hash 名的 change 行可读、DB↔QUICKLOG 可对账。
 * change: changes-表加-title-quicklog-列
 *
 * 覆盖：
 *   1. schema：新建库 changes 表含 title / quicklog_id 列（DB_SCHEMA_VERSION bump 后）
 *   2. initChange(cwd, name, { title, quicklogId }) 写入新列
 *   3. updateChangeMeta 全量更新 + 部分更新（只传 title 不动 quicklog_id）
 *   4. 向后兼容：initChange(cwd, name) 不传 meta → title/quicklog_id NULL（老调用方不破）
 *   5. updateChangeMeta 对不存在的 change 静默（UPDATE 0 行不抛错）
 */
import { mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import Database from 'better-sqlite3'
import { ProgressManager } from '../src/progress.js'

let total = 0, failed = 0
function assert(cond, msg) {
  total++
  if (!cond) { failed++; console.log(`  ❌ FAIL: ${msg}`) }
  else console.log(`  ✅ PASS: ${msg}`)
}

const tmp = mkdtempSync(join(tmpdir(), 'change-meta-'))
const specBase = join(tmp, '.sillyspec')
const pm = new ProgressManager({ specDir: specBase })
pm.init(tmp)
const dbPath = join(specBase, '.runtime', 'sillyspec.db')

function query(sql, ...params) {
  const db = new Database(dbPath, { readonly: true })
  try { return db.prepare(sql).get(...params) } finally { db.close() }
}

console.log('=== changes 表 title + quicklog_id 列 ===\n')

// 1. schema 列存在
{
  const db = new Database(dbPath, { readonly: true })
  const names = db.prepare("SELECT name FROM pragma_table_info('changes')").all().map(r => r.name)
  db.close()
  assert(names.includes('title'), 'changes 表有 title 列')
  assert(names.includes('quicklog_id'), 'changes 表有 quicklog_id 列')
}

// 2. initChange 带 meta 写入（用 quick-<hex> 名，跳过 change 目录创建，纯测 DB 层）
pm.initChange(tmp, 'quick-11111111', { title: '中文标题测试', quicklogId: 'ql-20260811-001-a3f2' })
let row = query("SELECT title, quicklog_id FROM changes WHERE name='quick-11111111'")
assert(row.title === '中文标题测试', 'initChange meta.title 写入')
assert(row.quicklog_id === 'ql-20260811-001-a3f2', 'initChange meta.quicklogId 写入')

// 3. updateChangeMeta 全量更新
pm.updateChangeMeta(tmp, 'quick-11111111', { title: '改后标题', quicklogId: 'ql-20260811-002-b4e5' })
row = query("SELECT title, quicklog_id FROM changes WHERE name='quick-11111111'")
assert(row.title === '改后标题', 'updateChangeMeta 全量更新 title')
assert(row.quicklog_id === 'ql-20260811-002-b4e5', 'updateChangeMeta 全量更新 quicklog_id')

// 4. updateChangeMeta 部分更新（只传 title，quicklog_id 不动）
pm.updateChangeMeta(tmp, 'quick-11111111', { title: '再改标题' })
row = query("SELECT title, quicklog_id FROM changes WHERE name='quick-11111111'")
assert(row.title === '再改标题', 'updateChangeMeta 部分更新 title')
assert(row.quicklog_id === 'ql-20260811-002-b4e5', 'updateChangeMeta 只传 title 时 quicklog_id 保持不变')

// 5. 向后兼容：initChange 不传 meta（老调用方）
pm.initChange(tmp, 'quick-22222222')
row = query("SELECT title, quicklog_id FROM changes WHERE name='quick-22222222'")
assert(row.title === null, 'initChange 不传 meta → title NULL（向后兼容）')
assert(row.quicklog_id === null, 'initChange 不传 meta → quicklog_id NULL')

// 6. updateChangeMeta 对不存在的 change 静默（UPDATE 0 行不抛错）
try {
  pm.updateChangeMeta(tmp, 'quick-ffffffff', { title: 'x' })
  assert(true, 'updateChangeMeta 对不存在 change 不抛错')
} catch (e) {
  assert(false, `updateChangeMeta 对不存在 change 不应抛错: ${e.message}`)
}

console.log(`\n${failed === 0 ? '✅ 全部通过' : `❌ ${failed} 失败`} (${total} 断言)`)
process.exit(failed === 0 ? 0 : 1)
