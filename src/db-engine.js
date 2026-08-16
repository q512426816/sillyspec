// db-engine.js — node:sqlite DatabaseSync 引擎抽象层
// 封装 node:sqlite 内置模块 + 消解 better-sqlite3 → node:sqlite 三缺口：
//   pragma → exec / transaction → 手写 SAVEPOINT / pluck → Object.values 取首列
// 供 db.js 与 doctor-diagnostics 共用（方案 B 单一换引擎点，D-002）。
// node:sqlite 在 node v22.13.0+ 无需 --experimental-sqlite flag（仍发 ExperimentalWarning）。
// Author: sillyspec execute W1 task-02
// Created: 2026-08-11
import { DatabaseSync } from 'node:sqlite';

// 打开数据库。opts.readOnly（驼峰）透传 node:sqlite。
// fileMustExist 语义由调用方 existsSync 前置门实现（node:sqlite 不拒缺失文件，不凭空建库由调用方保证）。
export function openDatabase(dbPath, opts = {}) {
  return new DatabaseSync(dbPath, { readOnly: !!opts.readOnly });
}

// 逐条 exec PRAGMA。entries: [['journal_mode','WAL'], ['busy_timeout','5000'], ...]
// node:sqlite 无 .pragma()，统一走 .exec('PRAGMA key = value')。
export function applyPragmas(db, entries) {
  for (const [key, value] of entries) {
    db.exec(`PRAGMA ${key} = ${value}`);
  }
}

// 手写事务（node:sqlite 无 .transaction()）。
// 统一用 SAVEPOINT/RELEASE/ROLLBACK TO —— SQLite 允许顶层 SAVEPOINT（等价事务），
// 嵌套调用自动形成 savepoint 栈（better-sqlite3 嵌套自动 SAVEPOINT 的兼容实现）。
// fn 抛错自动 ROLLBACK TO + RELEASE 且原错误上抛不吞。
// 本函数不含 BUSY 重试（由 db.js wrapper 外层包裹）。
export function runTransaction(db, fn) {
  const sp = 'tx_sp_' + Math.random().toString(36).slice(2);
  db.exec(`SAVEPOINT ${sp}`);
  try {
    const result = fn();
    db.exec(`RELEASE ${sp}`);
    return result;
  } catch (err) {
    try {
      db.exec(`ROLLBACK TO ${sp}`);
      db.exec(`RELEASE ${sp}`);
    } catch { /* 回滚失败不掩盖原错误 */ }
    throw err;
  }
}

// pluck 替代：取第一行第一列，无行 undefined。
// node:sqlite .get() 返回行对象（不像 better-sqlite3 pluck 返标量），故 Object.values 取首列。
export function pluckGet(db, sql, ...params) {
  const row = db.prepare(sql).get(...params);
  return row === undefined ? undefined : Object.values(row)[0];
}

// pluck 替代：取所有行第一列成数组。
export function pluckAll(db, sql, ...params) {
  return db.prepare(sql).all(...params).map((row) => Object.values(row)[0]);
}
