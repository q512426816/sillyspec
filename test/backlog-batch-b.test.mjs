/**
 * backlog 批 B 四项修复回归（ql-20260912-003）。
 *
 * 锁行为：
 *  1. db._migrateAddColumn 仅吞 duplicate column（幂等常态）；no-such-table 等其他错误上抛
 *  2. .bak 恢复后删除伴生 -wal/-shm（旧 WAL 回放到恢复库 = 二次损坏），恢复数据完整
 *  3. extractTestCommand bare 值含引号不再判「未配置」（Windows 常见 cd "..." && 命令）——
 *     旧行为是 test 硬门静默 skipped（fail-open）
 *  4. stage-review 原子写与 --cancel 平台对齐由既有套件 + import 冒烟覆盖（见文件尾注）
 */
import { mkdtempSync, rmSync, writeFileSync, existsSync, copyFileSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { DB } from '../src/db.js'
import { extractTestCommand } from '../src/verify-postcheck.js'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }
const _tmpDirs = []
const mkTmp = (p) => { const d = mkdtempSync(join(tmpdir(), p + '-')); _tmpDirs.push(d); return d }

console.log('=== ① _migrateAddColumn 吞错收窄 ===')
{
  const dir = mkTmp('bb-mig-')
  const db = new DB(join(dir, 'sillyspec.db'))
  db.init()
  const sq = db.getDb()
  sq.exec('CREATE TABLE mig_test (a TEXT)')
  db._migrateAddColumn('mig_test', 'b', 'TEXT')
  const cols = sq.prepare("SELECT name FROM pragma_table_info('mig_test')").all().map(r => r.name)
  assert(cols.includes('b'), `新列落盘（${cols.join(',')}）`)
  db._migrateAddColumn('mig_test', 'b', 'TEXT') // 重复加列：duplicate → 幂等吞
  assert(true, 'duplicate column 幂等不抛')
  let threw = null
  try { db._migrateAddColumn('no_such_table', 'c', 'TEXT') } catch (e) { threw = e }
  assert(threw !== null && /no such table/i.test(threw.message),
    `非 duplicate 错误上抛（${threw ? threw.message : '被吞'}）——旧版 catch-all 连 SQLITE_BUSY/磁盘满一起吞`)
  db.close()
}

console.log('\n=== ② .bak 恢复删除伴生 WAL 侧车 ===')
{
  const dir = mkTmp('bb-bak-')
  const dbPath = join(dir, 'sillyspec.db')
  const db = new DB(dbPath)
  db.init()
  const sq = db.getDb()
  sq.prepare("INSERT OR IGNORE INTO project (id,name,created_at,updated_at) VALUES (1,'p','t','t')").run()
  db.close()
  copyFileSync(dbPath, dbPath + '.bak')

  // 损坏主库 + 留下旧 -wal/-shm（模拟损坏库的侧车残留）
  writeFileSync(dbPath, 'corrupted-primary-not-a-db')
  writeFileSync(dbPath + '-wal', 'stale-wal-bytes')
  writeFileSync(dbPath + '-shm', 'stale-shm-bytes')

  const db2 = new DB(dbPath)
  db2.init()
  // 恢复后连接存活时 SQLite 会新建自己的空 -wal/-shm——判定点是「旧字节未残留」而非文件不存在
  const walNow = existsSync(dbPath + '-wal') ? readFileSync(dbPath + '-wal') : null
  const shmNow = existsSync(dbPath + '-shm') ? readFileSync(dbPath + '-shm') : null
  assert((!walNow || !walNow.equals(Buffer.from('stale-wal-bytes')))
    && (!shmNow || !shmNow.equals(Buffer.from('stale-shm-bytes'))),
    '旧 -wal/-shm 字节未残留（已被删除并由连接重建——旧版回放旧 WAL 会二次损坏恢复库）')
  const rows = db2.getDb().prepare('SELECT COUNT(*) AS n FROM project').get()
  assert(rows.n === 1, `.bak 数据完整恢复（project ${rows.n} 行）`)
  db2.close()
  assert(!existsSync(dbPath + '-wal'), '干净 close 后侧车清空（WAL checkpoint 语义正常）')
}

console.log('\n=== ③ extractTestCommand bare 值含引号 ===')
{
  const cases = [
    // [yaml, 期望, 说明]（期望 null = unavailable/未配置语义）
    ['commands:\n  test: npm test\n', 'npm test', '普通 bare'],
    ['commands:\n  test: cd "C:\\proj" && npm test\n', 'cd "C:\\proj" && npm test', 'bare 含双引号（Windows 常见）——旧版判未配置'],
    ["commands:\n  test: echo 'hi' && pytest -k 'a b'\n", "echo 'hi' && pytest -k 'a b'", 'bare 含单引号'],
    ['commands:\n  test: "npm run test" # 注释\n', 'npm run test', '全引号 + 注释（quoted 分支）'],
    ['commands:\n  test: npm test # 行尾注释\n', 'npm test', 'bare + 行尾注释剥除'],
    ['commands:\n  test: unavailable\n', null, 'unavailable 哨兵仍判未配置'],
    ['commands:\n  lint: npx eslint "src/**"\n', null, 'lint 键不误命中 test 提取'],
  ]
  for (const [yaml, expected, label] of cases) {
    const got = extractTestCommand(yaml)
    assert(got === expected, `${label}（实得 ${JSON.stringify(got)}）`)
  }
}

for (const d of _tmpDirs) { try { rmSync(d, { recursive: true, force: true }) } catch {} }
console.log(`\n${'='.repeat(50)}\n✅ 通过: ${count.passed}  ❌ 失败: ${count.failed}\n${'='.repeat(50)}`)
if (count.failed > 0) process.exit(1)
