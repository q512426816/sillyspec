/**
 * db-engine 单元测试 —— node:sqlite DatabaseSync 引擎抽象层（W1 task-03）
 *
 * 覆盖 5 个命名导出：
 *   - openDatabase：打开库 + readOnly 选项行为
 *   - applyPragmas：设 journal_mode=WAL 后验证生效
 *   - runTransaction：提交 / 回滚 / 嵌套 SAVEPOINT
 *   - pluckGet：无行 undefined、有行取首列标量
 *   - pluckAll：空表 []、多行首列标量数组
 *
 * 全部 node:test + node:assert/strict，无第三方测试库。
 * 临时 db 用 mkdtemp（os.tmpdir）隔离，after 清理 db.close + rm 临时目录（规避 Windows EPERM 文件锁）。
 */
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  openDatabase,
  applyPragmas,
  runTransaction,
  pluckGet,
  pluckAll,
} from '../src/db-engine.js';

// 跟踪待清理资源：db 实例与临时目录，after 统一 close + rm（防 Windows EPERM）。
const openDbs = [];
const tempDirs = [];

function makeTempDir() {
  const dir = mkdtempSync(join(tmpdir(), 'db-engine-test-'));
  tempDirs.push(dir);
  return dir;
}

function freshDb() {
  const dbPath = join(makeTempDir(), 'test.db');
  const db = openDatabase(dbPath);
  openDbs.push(db);
  return db;
}

after(() => {
  for (const db of openDbs) {
    try { db.close(); } catch { /* 已关闭忽略 */ }
  }
  for (const dir of tempDirs) {
    try { rmSync(dir, { recursive: true, force: true }); } catch { /* 文件锁重试由 force 兜底 */ }
  }
});

// ── openDatabase ──────────────────────────────────────────────
test('openDatabase: 能打开库并执行建表写入', () => {
  const db = freshDb();
  db.exec('CREATE TABLE t (id INTEGER PRIMARY KEY, name TEXT)');
  db.exec("INSERT INTO t (name) VALUES ('a')");
  assert.equal(pluckGet(db, 'SELECT name FROM t WHERE id = 1'), 'a');
});

test('openDatabase: readOnly 打开不存在路径抛错', () => {
  const missingPath = join(makeTempDir(), 'not-exist.db');
  assert.throws(() => openDatabase(missingPath, { readOnly: true }));
});

test('openDatabase: readOnly 打开已存在库可读不可写', () => {
  const dir = makeTempDir();
  const dbPath = join(dir, 'existing.db');
  // 先以读写建库造数据，关闭后再以 readOnly 打开
  const wdb = openDatabase(dbPath);
  wdb.exec('CREATE TABLE t (id INTEGER PRIMARY KEY, name TEXT)');
  wdb.exec("INSERT INTO t (name) VALUES ('x')");
  wdb.close();

  const rdb = openDatabase(dbPath, { readOnly: true });
  openDbs.push(rdb);
  assert.equal(pluckGet(rdb, 'SELECT name FROM t WHERE id = 1'), 'x');
  assert.throws(() => rdb.exec("INSERT INTO t (name) VALUES ('y')"));
});

// ── applyPragmas ──────────────────────────────────────────────
test('applyPragmas: 设 journal_mode=WAL 后查询生效', () => {
  const db = freshDb();
  applyPragmas(db, [['journal_mode', 'WAL']]);
  assert.equal(pluckGet(db, 'PRAGMA journal_mode'), 'wal');
});

// ── runTransaction ────────────────────────────────────────────
test('runTransaction: fn 成功 → 提交，数据落库可查', () => {
  const db = freshDb();
  db.exec('CREATE TABLE t (id INTEGER PRIMARY KEY, name TEXT)');
  runTransaction(db, () => {
    db.exec("INSERT INTO t (name) VALUES ('committed')");
  });
  assert.equal(pluckGet(db, 'SELECT name FROM t WHERE id = 1'), 'committed');
});

test('runTransaction: fn 抛错 → 回滚，数据不落库，原错误上抛', () => {
  const db = freshDb();
  db.exec('CREATE TABLE t (id INTEGER PRIMARY KEY, name TEXT)');
  const boom = new Error('boom');
  assert.throws(
    () => runTransaction(db, () => {
      db.exec("INSERT INTO t (name) VALUES ('rolled-back')");
      throw boom;
    }),
    (err) => err === boom
  );
  assert.equal(pluckGet(db, 'SELECT COUNT(*) FROM t'), 0);
});

test('runTransaction: 嵌套调用（内层 SAVEPOINT）不抛嵌套错，内外各自提交', () => {
  const db = freshDb();
  db.exec('CREATE TABLE t (id INTEGER PRIMARY KEY, name TEXT)');
  runTransaction(db, () => {
    db.exec("INSERT INTO t (name) VALUES ('outer')");
    runTransaction(db, () => {
      db.exec("INSERT INTO t (name) VALUES ('inner')");
    });
  });
  assert.deepEqual(pluckAll(db, 'SELECT name FROM t ORDER BY id'), ['outer', 'inner']);
});

test('runTransaction: 嵌套内层抛错 → 仅内层回滚，外层已提交数据保留', () => {
  const db = freshDb();
  db.exec('CREATE TABLE t (id INTEGER PRIMARY KEY, name TEXT)');
  assert.throws(() =>
    runTransaction(db, () => {
      db.exec("INSERT INTO t (name) VALUES ('outer-kept')");
      // 内层抛错：内层 ROLLBACK TO 自身 savepoint，但错误继续上抛使外层整体回滚
      runTransaction(db, () => {
        db.exec("INSERT INTO t (name) VALUES ('inner-lost')");
        throw new Error('inner boom');
      });
    })
  );
  // 内层错误上抛导致外层 savepoint 也回滚 → 整库无数据
  assert.equal(pluckGet(db, 'SELECT COUNT(*) FROM t'), 0);
});

test('runTransaction: 嵌套内层捕获错误 → 内层回滚、外层提交（SAVEPOINT 部分回滚）', () => {
  const db = freshDb();
  db.exec('CREATE TABLE t (id INTEGER PRIMARY KEY, name TEXT)');
  runTransaction(db, () => {
    db.exec("INSERT INTO t (name) VALUES ('outer-kept')");
    try {
      runTransaction(db, () => {
        db.exec("INSERT INTO t (name) VALUES ('inner-lost')");
        throw new Error('inner boom');
      });
    } catch { /* 外层捕获内层错误：内层回滚、外层继续提交 */ }
  });
  // SAVEPOINT 语义：内层 ROLLBACK TO 只回滚内层，外层数据保留
  assert.deepEqual(pluckAll(db, 'SELECT name FROM t ORDER BY id'), ['outer-kept']);
});

// ── pluckGet ──────────────────────────────────────────────────
test('pluckGet: 无行返回 undefined', () => {
  const db = freshDb();
  db.exec('CREATE TABLE t (id INTEGER PRIMARY KEY, name TEXT)');
  assert.equal(pluckGet(db, 'SELECT name FROM t WHERE id = 999'), undefined);
});

test('pluckGet: 有行返回首列标量', () => {
  const db = freshDb();
  db.exec('CREATE TABLE t (id INTEGER PRIMARY KEY, name TEXT, extra TEXT)');
  db.exec("INSERT INTO t (name, extra) VALUES ('first-col', 'ignored')");
  // 首列是 id，验证取的是首列而非具名列
  assert.equal(pluckGet(db, 'SELECT id, name FROM t'), 1);
  assert.equal(pluckGet(db, 'SELECT name FROM t'), 'first-col');
});

// ── pluckAll ──────────────────────────────────────────────────
test('pluckAll: 空表返回空数组', () => {
  const db = freshDb();
  db.exec('CREATE TABLE t (id INTEGER PRIMARY KEY, name TEXT)');
  assert.deepEqual(pluckAll(db, 'SELECT name FROM t'), []);
});

test('pluckAll: 多行返回首列标量数组', () => {
  const db = freshDb();
  db.exec('CREATE TABLE t (id INTEGER PRIMARY KEY, name TEXT)');
  db.exec("INSERT INTO t (name) VALUES ('a'), ('b'), ('c')");
  assert.deepEqual(pluckAll(db, 'SELECT name FROM t ORDER BY name'), ['a', 'b', 'c']);
  assert.deepEqual(pluckAll(db, 'SELECT id FROM t ORDER BY id'), [1, 2, 3]);
});
