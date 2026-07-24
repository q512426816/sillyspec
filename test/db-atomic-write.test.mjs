// 验证 DB 原子写 + .bak 回滚（src/db.js）。
// run-tests.mjs 自动收集 *.test.mjs；退出码 0 = 通过。
import { DB } from '../src/db.js';
import initSqlJs from 'sql.js';
import { existsSync, readFileSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

let failures = 0;
const assert = (cond, msg) => {
  if (cond) console.log('  ✅ ' + msg);
  else { console.error('  ❌ ' + msg); failures++; }
};

const tmpRoot = join(tmpdir(), `sillyspec-db-test-${process.pid}-${Date.now()}`);
const path = () => join(tmpRoot, 'sillyspec.db');
const fresh = () => {
  rmSync(tmpRoot, { recursive: true, force: true });
  mkdirSync(tmpRoot, { recursive: true });
};
const open = async () => { const db = new DB(path()); await db.init(); return db; };
const readName = async (file) => {
  const SQL = await initSqlJs();
  const d = new SQL.Database(readFileSync(file));
  const r = d.exec('SELECT name FROM project WHERE id=1');
  d.close();
  return r.length ? r[0].values[0][0] : null;
};

console.log('\n[db-atomic-write] DB 原子写 + .bak 回滚');

// Case 1: 连续两次写后，.bak 保留上一版、主库为最新
fresh();
{
  let db = await open();
  db.getDb().run("INSERT INTO project (id,name,created_at,updated_at) VALUES (1,'v1','t','t')");
  db.close();
  db = await open();
  db.getDb().run("UPDATE project SET name='v2' WHERE id=1");
  db.close();
  assert(existsSync(path() + '.bak'), '连续写后生成 .bak');
  assert(await readName(path() + '.bak') === 'v1', '.bak 内容是上一版 v1');
  assert(await readName(path()) === 'v2', '主库内容是最新 v2');
}

// Case 2: 主库被截断/损坏 → 从 .bak 恢复，不抛错
fresh();
{
  let db = await open();
  db.getDb().run("INSERT INTO project (id,name,created_at,updated_at) VALUES (1,'keep','t','t')");
  db.close();
  db = await open(); db.close(); // 再写一次以产生 .bak（内容=keep）
  writeFileSync(path(), Buffer.from('not-a-sqlite-db-corrupted-payload-xxxxxxxx'));
  db = await open(); // 应回滚到 .bak
  const r = db.getDb().exec('SELECT name FROM project WHERE id=1');
  assert(r.length && r[0].values[0][0] === 'keep', '主库损坏后从 .bak 恢复（keep）');
  db.close();
}

// Case 3: 主库损坏且无 .bak → fail-loud 抛错（不静默建空库吞掉进度）
fresh();
{
  writeFileSync(path(), Buffer.from('corrupted-and-no-backup-payload'));
  let threw = false;
  try { await open(); } catch { threw = true; }
  assert(threw, '主库损坏且无 .bak 时 fail-loud 抛错');
}

// Case 4: 全新项目（主库与 .bak 都不存在）→ 正常建空库
fresh();
{
  const db = await open();
  assert(existsSync(path()), '全新项目创建空库');
  db.close();
}

// Case 5: 主库被误删但 .bak 在 → 从 .bak 恢复
fresh();
{
  let db = await open();
  db.getDb().run("INSERT INTO project (id,name,created_at,updated_at) VALUES (1,'rescued','t','t')");
  db.close();
  db = await open(); db.close(); // 产生 .bak
  rmSync(path(), { force: true }); // 模拟主库被外部误删
  db = await open();
  const r = db.getDb().exec('SELECT name FROM project WHERE id=1');
  assert(r.length && r[0].values[0][0] === 'rescued', '主库误删后从 .bak 恢复（rescued）');
  db.close();
}

rmSync(tmpRoot, { recursive: true, force: true });

if (failures > 0) {
  console.error(`\n❌ db-atomic-write: ${failures} 项失败\n`);
  process.exit(1);
}
console.log('\n✅ db-atomic-write 全部通过\n');
