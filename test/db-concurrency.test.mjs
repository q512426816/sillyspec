// 多进程并发写同一 db 不 lost update 回归测试（G1 / AC-01 实证）。
// run-tests.mjs 自动收集 *.test.mjs；退出码 0 = 通过。
//
// 验证目标（design §G1 / AC-01 / NFR-01 / R-07 / R-08）：
//   - better-sqlite3 WAL 下，N 个进程各持独立连接、各自循环多次小事务
//     `UPDATE counters SET v = v + 1`，最终计数 === N * 次数（无 lost update）。
//     对比旧 sql.js 「整库 load→内存→export 写回」会 last-writer-wins 抹掉他者进度，
//     better-sqlite3 原生 WAL 单写者串行 + 每条 UPDATE 在事务内原子读-改-写，
//     根本消除整库覆盖。
//   - 子进程并发写期间不抛 SQLITE_BUSY 崩溃（R-08）：busy_timeout=5000 在引擎层消化
//     大部分写锁等待，DB.transaction 的应用层有限重试（task-05）兜底超时尖刺；
//     所有子进程正常 exit 0，无 BUSY 异常退出。
//
// 设计要点：
//   - 用 src/db.js 的 DB 类（生产路径）：init() 配 WAL + busy_timeout + foreign_keys，
//     transaction() 套 better-sqlite3 原生事务 + SQLITE_BUSY 有限重试（MAX_BUSY_RETRIES=3）。
//     子进程经此路径自增，让 BUSY 重试真正生效（非裸 better-sqlite3）。
//   - 主进程先 init + 建_counters 表 + 插 v=0 后关闭，子进程只并发 UPDATE，
//     避免子进程间的 schema 创建竞争（确定性构造，R-07）。
//   - 子进程脚本写 tmp 目录用绝对路径 + node spawn（不 shell:true，Windows 兼容）；
//     子进程 import DB 用 file:// URL（跨平台绝对路径 specifier）。
//   - 连跑 2 轮取一致结果，进一步隔离偶发 flaky（R-07）。

import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { DB } from '../src/db.js';

// ── 确定性参数（固定进程数 / 次数，R-07）──
const PROCESSES = 8;        // 并发子进程数
const INCREMENTS = 100;     // 每个子进程的自增次数（小事务循环，真测 BUSY 重试）
const ROUNDS = 2;           // 连跑轮数（失败重试隔离 flaky）
const EXPECTED = PROCESSES * INCREMENTS;

let failures = 0;
const assert = (cond, msg) => {
  if (cond) console.log('  ✅ ' + msg);
  else { console.error('  ❌ ' + msg); failures++; }
};

// ── 定位 src/db.js 绝对路径，供子进程 import（file:// URL 跨平台）──
const here = fileURLToPath(import.meta.url);
const dbClassUrl = pathToFileURL(join(dirname(here), '..', 'src', 'db.js')).href;

// ── 子进程脚本：开独立 DB 连接，循环 N 次小事务自增计数器 ──
//    经 DB 类路径（init 配 WAL+busy_timeout，transaction 带 BUSY 重试），
//    让生产写路径的并发保护真正生效。脚本写到 tmp 目录用绝对路径启动，
//    避免命令行长度 / 引号 / shell 转义问题（Windows 兼容）。
const WORKER_SOURCE = `import { pathToFileURL } from 'node:url';
const dbUrl = process.argv[2];
const dbPath = process.argv[3];
const increments = parseInt(process.argv[4], 10);
const { DB } = await import(dbUrl);
const db = new DB(dbPath);
db.init();
// better-sqlite3 prepare 一次复用；每轮 transaction 是独立小事务（BEGIN/UPDATE/COMMIT），
// 8 进程并发时写锁竞争由 busy_timeout + DB.transaction 的 BUSY 重试收敛。
const stmt = db.getDb().prepare('UPDATE counters SET v = v + 1 WHERE id = 1');
for (let i = 0; i < increments; i++) db.transaction(() => stmt.run());
db.close(); // close 自动 WAL checkpoint
`;

/**
 * 起一个子进程跑 worker 脚本，收集退出码 + stderr（后者用于诊断 BUSY 异常）。
 * spawn 不传 shell:true（Windows 兼容，不依赖任何 shell 语法）。
 */
function runWorker(workerPath, dbPath, increments) {
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      [workerPath, dbClassUrl, dbPath, String(increments)],
      { stdio: ['ignore', 'pipe', 'pipe'], shell: false, windowsHide: true }
    );
    let stderr = '';
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('error', (err) => resolve({ code: null, signal: null, error: err, stderr }));
    child.on('close', (code, signal) => resolve({ code, signal, error: null, stderr }));
  });
}

/**
 * 跑一轮：建 fresh db + counters 初值 0 → spawn PROCESSES 个子进程并发自增 →
 * 校验退出码全 0 + 最终计数 === EXPECTED。返回是否通过。
 */
async function runRound(roundLabel) {
  const tmpDir = mkdtempSync(join(tmpdir(), `sillyspec-dbconc-${process.pid}-${Date.now()}-`));
  const workerPath = join(tmpDir, 'worker.mjs');
  const dbPath = join(tmpDir, 'sillyspec.db');
  writeFileSync(workerPath, WORKER_SOURCE);

  try {
    // 主进程先初始化：DB 类 init 建 sillyspec schema + 写 .schema-version 戳，
    // 再建 counters 表 + 插初值 0，然后关闭。子进程 init 时 schema 戳已就绪跳过建表，
    // 避免并发 schema 创建竞争（确定性构造）。
    const setupDb = new DB(dbPath);
    setupDb.init();
    setupDb.getDb().exec(
      'CREATE TABLE IF NOT EXISTS counters (id INTEGER PRIMARY KEY, v INTEGER NOT NULL DEFAULT 0)'
    );
    setupDb.getDb().prepare('INSERT OR REPLACE INTO counters (id, v) VALUES (1, 0)').run();
    setupDb.close();

    // 并发起 PROCESSES 个子进程，各持独立连接做 INCREMENTS 次小事务自增。
    const results = await Promise.all(
      Array.from({ length: PROCESSES }, () => runWorker(workerPath, dbPath, INCREMENTS))
    );

    // 读最终计数（fresh 连接，读最新 checkpoint + WAL 状态）。
    const readDb = new DB(dbPath);
    readDb.init();
    const row = readDb.getDb().prepare('SELECT v FROM counters WHERE id = 1').get();
    readDb.close();
    const finalV = row ? row.v : null;

    const allExit0 = results.every((r) => r.code === 0);
    const busyErrors = results
      .map((r, i) => ({ i, stderr: r.stderr }))
      .filter((r) => /database is locked|SQLITE_BUSY/i.test(r.stderr));

    console.log(`  [${roundLabel}] 子进程退出码: [${results.map((r) => r.code).join(', ')}] / 最终计数: ${finalV} (期望 ${EXPECTED})`);

    assert(allExit0, `${roundLabel}: 全部 ${PROCESSES} 子进程正常 exit 0（无 SQLITE_BUSY 崩溃，R-08）`);
    assert(busyErrors.length === 0, `${roundLabel}: 子进程 stderr 无 SQLITE_BUSY / "database is locked" 异常`);
    assert(finalV === EXPECTED, `${roundLabel}: 最终计数 === ${EXPECTED}（${PROCESSES} 进程 × ${INCREMENTS} 次，无 lost update，G1/AC-01）`);

    return allExit0 && busyErrors.length === 0 && finalV === EXPECTED;
  } finally {
    // 整目录递归删，连带 .db-wal / .db-shm 侧车与 worker.mjs / .schema-version 一并清理。
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

console.log('\n[db-concurrency] 多进程并发写不 lost update（G1 / AC-01）');
console.log(`  配置: ${PROCESSES} 进程 × 各 ${INCREMENTS} 次小事务自增 = 期望 ${EXPECTED}，连跑 ${ROUNDS} 轮\n`);

// 连跑 ROUNDS 轮，每轮独立 fresh tmp + db，取一致结果隔离 flaky（R-07）。
let allRoundsPassed = true;
for (let r = 1; r <= ROUNDS; r++) {
  console.log(`--- 第 ${r} / ${ROUNDS} 轮 ---`);
  const ok = await runRound(`round-${r}`);
  if (!ok) allRoundsPassed = false;
  console.log('');
}

assert(allRoundsPassed, `全部 ${ROUNDS} 轮一致通过（连跑稳定，R-07 flaky 已隔离）`);

if (failures > 0) {
  console.error(`\n❌ db-concurrency: ${failures} 项失败\n`);
  process.exit(1);
}
console.log('\n✅ db-concurrency 全部通过\n');
