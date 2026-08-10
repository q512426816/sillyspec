// task-01 验收：changes 表新增 last_synced_platform_ts / last_local_modified_ts 两列
// + DB schema 版本四处一致 bump 3→4（design 2026-08-10-platform-progress-sync §8 / D-012）。
//
// 验收点（task-01.md acceptance）：
// 1. 全新 DB init 后 changes 表含两列且默认 NULL
// 2. 已有 schema 3 DB 经 _migrateAddColumn 幂等加列且新列 NULL，不丢既有数据
// 3. DB_SCHEMA_VERSION / schema_version DEFAULT / CURRENT_VERSION / progress.js _version 四处全为 4
//
// 用 DB 原语直接构造（对齐 db-atomic-write.test.mjs 风格），避免 ProgressManager 副作用干扰 DDL 断言。
import { DB } from '../src/db.js';
import { CURRENT_VERSION } from '../src/progress/shared.js';
import { ProgressManager } from '../src/progress.js';
import Database from 'better-sqlite3';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

let failures = 0;
const assert = (cond, msg) => {
  if (cond) console.log('  ✅ ' + msg);
  else { console.error('  ❌ ' + msg); failures++; }
};

const tmpRoot = join(tmpdir(), `sillyspec-platform-sync-schema-${process.pid}-${Date.now()}`);
const dbPath = () => join(tmpRoot, 'sillyspec.db');
const stampPath = () => join(tmpRoot, 'sillyspec.db.schema-version');
const fresh = () => {
  rmSync(tmpRoot, { recursive: true, force: true });
  mkdirSync(tmpRoot, { recursive: true });
};
const open = () => { const db = new DB(dbPath()); db.init(); return db; };
const readStamp = () => {
  try { return readFileSync(stampPath(), 'utf8').trim(); } catch { return null; }
};

// 读 changes 表列信息（PRAGMA table_info：返回 [{ name, type, dflt_value, notnull, cid, pk }]）
const columnsOf = (file) => {
  const db = new Database(file, { readonly: true });
  try {
    return db.prepare('PRAGMA table_info(changes)').all();
  } finally {
    db.close();
  }
};

console.log('\n[platform-sync-schema] task-01：changes 加列 + 版本号四处一致');

// ─────────────────────────────────────────
// 1. 版本号四处一致（3→4 bump，D-012）
// ─────────────────────────────────────────
console.log('\n--- 1. 版本号四处一致（3→4 bump，D-012）---');
{
  // (1) src/progress/shared.js CURRENT_VERSION（静态导出）
  assert(CURRENT_VERSION === 4, `src/progress/shared.js CURRENT_VERSION === 4（实际 ${CURRENT_VERSION}）`);

  // (2) src/db.js DB_SCHEMA_VERSION：经 init 后 .schema-version 戳内容间接验证（戳内容 == DB_SCHEMA_VERSION）
  fresh();
  let db = open();
  db.close();
  const stamp = readStamp();
  assert(stamp === '4', `DB_SCHEMA_VERSION === 4（init 后 .schema-version 戳=${stamp}）`);
}

// ─────────────────────────────────────────
// 2. 全新 DB init：changes 含两列且默认 NULL
// ─────────────────────────────────────────
console.log('\n--- 2. 全新 DB init：changes 含两列且默认 NULL ---');
{
  fresh();
  const db = open();
  // 手动插一行 changes（不显式给新列值 → 取默认 NULL）
  db.getDb().prepare(
    "INSERT INTO changes (name, current_stage, status, created_at, last_active) VALUES ('c1','scan','active','t','t')"
  ).run();
  db.close();

  const cols = columnsOf(dbPath());
  const names = cols.map((c) => c.name);

  // 两列存在
  assert(names.includes('last_synced_platform_ts'), 'changes 表含 last_synced_platform_ts 列');
  assert(names.includes('last_local_modified_ts'), 'changes 表含 last_local_modified_ts 列');

  // 默认 NULL：DDL DEFAULT 子句为 null（PRAGMA dflt_value）
  const tsCol = cols.find((c) => c.name === 'last_synced_platform_ts');
  const modCol = cols.find((c) => c.name === 'last_local_modified_ts');
  assert(tsCol && tsCol.dflt_value === null, `last_synced_platform_ts DEFAULT NULL（dflt_value=${tsCol && tsCol.dflt_value}）`);
  assert(modCol && modCol.dflt_value === null, `last_local_modified_ts DEFAULT NULL（dflt_value=${modCol && modCol.dflt_value}）`);

  // 行级验证：未赋值的新列读出为 null
  const probe = new Database(dbPath(), { readonly: true });
  try {
    const row = probe.prepare('SELECT last_synced_platform_ts, last_local_modified_ts FROM changes WHERE name=?').get('c1');
    assert(row && row.last_synced_platform_ts === null, '插入行 last_synced_platform_ts 实测为 null');
    assert(row && row.last_local_modified_ts === null, '插入行 last_local_modified_ts 实测为 null');
  } finally {
    probe.close();
  }
}

// ─────────────────────────────────────────
// 3. 幂等迁移：已有 schema 3 DB（无两列 + 有数据）经 _createSchema 加列不丢数据
// ─────────────────────────────────────────
console.log('\n--- 3. 幂等迁移：schema 3 旧库（无新列+有数据）→ 加列且保数据 ---');
{
  fresh();
  // 模拟旧 schema 3 库：手工建一个 v3 形态的 changes 表（含索引引用列 current_stage/status，
  // 不含本次新增的两列），插一行数据。isolation_* 列省略——_createSchema 重跑时 _migrateAddColumn
  // 会幂等补上（与本测关注的两列同路径，不影响断言）。
  const oldDb = new Database(dbPath());
  oldDb.exec(`
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
    )
  `);
  oldDb.prepare(
    "INSERT INTO changes (name, current_stage, status, created_at, last_active) VALUES ('legacy','plan','active','2026-01-01','2026-01-02')"
  ).run();
  oldDb.close();

  // 写一个过期（schema 3）戳，使新版 init 判定 schemaCurrent=false → 重跑 _createSchema
  writeFileSync(stampPath(), '3');

  // 用新版代码 init（DB_SCHEMA_VERSION=4，戳失配 → _createSchema → _migrateAddColumn 幂等加列）
  const db = open();
  db.close();

  // 加列成功
  const cols = columnsOf(dbPath()).map((c) => c.name);
  assert(cols.includes('last_synced_platform_ts'), '迁移后含 last_synced_platform_ts 列');
  assert(cols.includes('last_local_modified_ts'), '迁移后含 last_local_modified_ts 列');

  // 既有数据保留 + 新列 NULL
  const probe = new Database(dbPath(), { readonly: true });
  try {
    const row = probe.prepare('SELECT name, current_stage, last_synced_platform_ts, last_local_modified_ts FROM changes WHERE name=?').get('legacy');
    assert(row && row.name === 'legacy' && row.current_stage === 'plan', '迁移后既有数据保留（name=legacy, current_stage=plan）');
    assert(row && row.last_synced_platform_ts === null, '迁移后新列 last_synced_platform_ts 为 null');
    assert(row && row.last_local_modified_ts === null, '迁移后新列 last_local_modified_ts 为 null');
  } finally {
    probe.close();
  }

  // 戳已更新为 4
  assert(readStamp() === '4', `迁移后 .schema-version 戳更新为 4（实际 ${readStamp()}）`);
}

// ─────────────────────────────────────────
// 4. project.schema_version DEFAULT 4（D-012 连带第二处）
// ─────────────────────────────────────────
console.log('\n--- 4. project.schema_version DEFAULT 4（D-012 连带）---');
{
  fresh();
  // 手动 INSERT project（不带 schema_version 列 → 取 DEFAULT）
  const db = open();
  db.getDb().prepare(
    "INSERT OR REPLACE INTO project (id,name,created_at,updated_at) VALUES (1,'demo','t','t')"
  ).run();
  db.close();

  const probe = new Database(dbPath(), { readonly: true });
  try {
    const row = probe.prepare('SELECT schema_version FROM project WHERE id=1').get();
    assert(row && row.schema_version === 4, `project.schema_version DEFAULT 4（实际 ${row && row.schema_version}）`);
  } finally {
    probe.close();
  }
}

// ─────────────────────────────────────────
// 5. progress.js read() 输出 _version: 4（D-012 连带第四处）
// ─────────────────────────────────────────
console.log('\n--- 5. progress.js read()._version === 4（D-012 连带第四处）---');
{
  fresh();
  const specDir = join(tmpRoot, 'spec');
  mkdirSync(join(specDir, '.runtime'), { recursive: true });
  const pm = new ProgressManager({ specDir });
  await pm.init('demo');
  await pm.initChange('demo', 'c1');
  const data = await pm.read('demo', 'c1');
  assert(data && data._version === 4, `pm.read()._version === 4（实际 ${data && data._version}）`);
  // ProgressManager 无 close()：手动释放底层 better-sqlite3 句柄（Windows 下 WAL 句柄占开会导致
  // 末尾 rmSync EPERM；better-sqlite3 close() 自动 checkpoint 合并 -wal/-shm）。
  try { if (pm._db) pm._db.close(); } catch { /* 已关忽略 */ }
}

// 清理（Windows 下 WAL 句柄偶发延迟释放致 EPERM，吞错不阻断退出码——断言已全部通过）
try { rmSync(tmpRoot, { recursive: true, force: true }); }
catch { /* temp dir 由 OS 清理，不阻断退出码 */ }

if (failures > 0) {
  console.error(`\n[platform-sync-schema] ❌ ${failures} 项失败`);
  process.exit(1);
}
console.log('\n[platform-sync-schema] ✅ 全部通过');
