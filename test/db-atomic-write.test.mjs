// 验证 DB 持久化 + .bak 回退（src/db.js，node:sqlite DatabaseSync 同步原生引擎）。
// run-tests.mjs 自动收集 *.test.mjs；退出码 0 = 通过。
//
// 引擎替换（task-03/04）后语义变化：
// - node:sqlite DatabaseSync 是原生同步 SQLite，打开即持久化（commit 落盘），不再有 sql.js 时代的
//   _save/_atomicWriteSync 整库 export。故不再测「整库 export 原子写」。
// - .bak 不再随每次写自动生成（无 _atomicWriteSync）；.bak 现为「外部恢复源」，仅在
//   _openWithFallback 中被读取（主库损坏/空/缺失时 copy 回主库）。生产环境 .bak 由版本控制
//   等外部备份提供；测试中手动构造 .bak（对齐 task-04 verify 的 inline 构造方式）。
// - DB.init() 同步，getDb() 返回 node:sqlite DatabaseSync；SELECT 用 prepare().get()。
import { DB } from '../src/db.js';
import { DatabaseSync } from 'node:sqlite';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, statSync } from 'fs';
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
// 同步打开（node:sqlite DatabaseSync 是同步 API，无 await init）
const open = () => { const db = new DB(path()); db.init(); return db; };
// 只读读取 project.name（用完即关；node:sqlite prepare().get() 返回行对象，无行返回 undefined）
const readName = (file) => {
  const db = new DatabaseSync(file, { readOnly: true });
  try {
    const row = db.prepare('SELECT name FROM project WHERE id=1').get();
    return row ? row.name : null;
  } finally {
    db.close();
  }
};
// 写一行 project（node:sqlite prepare().run() 绑定参数）
const writeName = (db, name) => {
  db.getDb().prepare("INSERT OR REPLACE INTO project (id,name,created_at,updated_at) VALUES (1,?,'t','t')").run(name);
};

console.log('\n[db-atomic-write] node:sqlite 持久化 + .bak 回退');

// Case 1: node:sqlite commit 即持久化——写后 close，新实例读得到最新值
fresh();
{
  let db = open();
  writeName(db, 'v1');
  db.close();
  db = open();
  writeName(db, 'v2');
  db.close();
  assert(existsSync(path()), '写后主库文件存在');
  assert(readName(path()) === 'v2', 'node:sqlite commit 持久化：新实例读出最新 v2');
}

// Case 2: 主库被截断/损坏 → 从 .bak 恢复，不抛错（.bak 需外部预先准备）
fresh();
{
  let db = open();
  writeName(db, 'keep');
  db.close();
  // .bak 不再自动生成：手动把上一完整主库复制为 .bak（模拟外部备份）
  copyFileSync(path(), path() + '.bak');
  // 再写一版主库（让主库内容与 .bak 不同，验证恢复后读到的是 .bak 的内容）
  db = open();
  writeName(db, 'newer');
  db.close();
  assert(readName(path() + '.bak') === 'keep', '.bak 内容是 keep');
  // 截断主库 → _openWithFallback 走 .bak 回退
  writeFileSync(path(), Buffer.from('not-a-sqlite-db-corrupted-payload-xxxxxxxx'));
  db = open(); // 应回滚到 .bak
  const name = readName(path());
  assert(name === 'keep', '主库损坏后从 .bak 恢复（keep，实际 ' + name + '）');
  db.close();
}

// Case 3: 主库损坏且无 .bak → fail-loud 抛错（不静默建空库吞掉进度）
fresh();
{
  writeFileSync(path(), Buffer.from('corrupted-and-no-backup-payload'));
  let threw = false;
  try { open(); } catch { threw = true; }
  assert(threw, '主库损坏且无 .bak 时 fail-loud 抛错');
}

// Case 4: 全新项目（主库与 .bak 都不存在）→ 正常建空库
fresh();
{
  const db = open();
  assert(existsSync(path()), '全新项目创建空库');
  db.close();
}

// Case 5: 主库被误删但 .bak 在 → 从 .bak 恢复
fresh();
{
  let db = open();
  writeName(db, 'rescued');
  db.close();
  copyFileSync(path(), path() + '.bak'); // 手动准备 .bak
  rmSync(path(), { force: true }); // 模拟主库被外部误删
  db = open();
  const name = readName(path());
  assert(name === 'rescued', '主库误删后从 .bak 恢复（rescued，实际 ' + name + '）');
  db.close();
}

// Case 6: 主库 0 字节（截断信号）且 .bak 在 → warn「为空」后从 .bak 恢复
fresh();
{
  let db = open();
  writeName(db, 'zero-recover');
  db.close();
  copyFileSync(path(), path() + '.bak');
  writeFileSync(path(), Buffer.alloc(0)); // 0 字节
  assert(statSync(path()).size === 0, '构造主库 0 字节');
  db = open();
  const name = readName(path());
  assert(name === 'zero-recover', '主库 0 字节后从 .bak 恢复（zero-recover，实际 ' + name + '）');
  db.close();
}

rmSync(tmpRoot, { recursive: true, force: true });

if (failures > 0) {
  console.error(`\n❌ db-atomic-write: ${failures} 项失败\n`);
  process.exit(1);
}
console.log('\n✅ db-atomic-write 全部通过\n');
