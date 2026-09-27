/**
 * 变更出生阶段 brainstorm（2026-09-27-change-birth-stage-brainstorm）
 *
 * 用户裁定：变更起步就是头脑风暴——scan 是 auxiliary（shared.js MAIN_FLOW_ORDER 不含），
 * 旧出生 current_stage='scan' 让 thin/quick 等不进主流程的变更全生命周期显示「🔍 代码扫描」
 * （multi-agent-platform 的 2026-09-27-governance-rpc-actions 实证）。
 *
 * 四组覆盖：
 *   ① 出生阶段：initChange / _readOrInit 新建行 current_stage='brainstorm'
 *   ② DDL 默认：raw INSERT 不带 current_stage → 默认 'brainstorm'
 *   ③ 存量迁移（v8）：出生默认行（active + stages.scan='pending'）改写 brainstorm + 标本地脏度；
 *      真在跑 scan（in-progress）/ 已归档行不动
 *   ④ 幂等：迁移重跑零效果（时间戳不再变）
 *
 * fixture 风格沿用 platform-sync-schema.test.mjs（DB 原语直接构造，避免 PM 副作用）。
 */
import { DB } from '../src/db.js';
import { ProgressManager } from '../src/progress.js';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'path';
import { tmpdir } from 'os';

let failures = 0;
const assert = (cond, msg) => {
  if (cond) console.log('  ✅ ' + msg);
  else { console.error('  ❌ ' + msg); failures++; }
};

const tmpRoot = join(tmpdir(), `sillyspec-birth-stage-${process.pid}-${Date.now()}`);
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
const rowOf = (file, name, cols = 'current_stage, status, last_local_modified_ts') => {
  const probe = new DatabaseSync(file, { readOnly: true });
  try {
    return probe.prepare(`SELECT ${cols} FROM changes WHERE name = ?`).get(name);
  } finally {
    probe.close();
  }
};

console.log('\n[birth-stage] 变更出生阶段 brainstorm + 存量迁移（2026-09-27-change-birth-stage-brainstorm）');

// ─────────────────────────────────────────
// ① 出生阶段：initChange / _readOrInit 新建行 = brainstorm
// ─────────────────────────────────────────
console.log('\n--- 1. 出生阶段 = brainstorm ---');
{
  fresh();
  const specDir = join(tmpRoot, 'spec');
  mkdirSync(join(specDir, '.runtime'), { recursive: true });
  const pmDb = join(specDir, '.runtime', 'sillyspec.db');
  const pm = new ProgressManager({ specDir });
  await pm.init('demo');

  // initChange 路径（flow start / registerChange 首建走此）
  await pm.initChange('demo', 'c-init');
  let row = rowOf(pmDb, 'c-init');
  assert(row && row.current_stage === 'brainstorm', `initChange 新建行 current_stage='brainstorm'（实际 ${row && row.current_stage}）`);
  const data1 = await pm.read('demo', 'c-init');
  assert(data1 && data1.currentStage === 'brainstorm', `read().currentStage='brainstorm'（实际 ${data1 && data1.currentStage}）`);

  // _readOrInit 路径（读未注册变更名时兜底建行）
  await pm._readOrInit('demo', 'c-readinit');
  row = rowOf(pmDb, 'c-readinit');
  assert(row && row.current_stage === 'brainstorm', `_readOrInit 兜底建行 current_stage='brainstorm'（实际 ${row && row.current_stage}）`);

  try { if (pm._db) pm._db.close(); } catch { /* 已关忽略 */ }
}

// ─────────────────────────────────────────
// ② DDL 默认值：raw INSERT 不带 current_stage → 'brainstorm'
// ─────────────────────────────────────────
console.log('\n--- 2. DDL 默认 current_stage = brainstorm ---');
{
  fresh();
  const db = open();
  db.getDb().prepare(
    "INSERT INTO changes (name, status, created_at, last_active) VALUES ('raw-default', 'active', 't', 't')"
  ).run();
  db.close();
  const row = rowOf(dbPath(), 'raw-default');
  assert(row && row.current_stage === 'brainstorm', `raw INSERT 默认 current_stage='brainstorm'（实际 ${row && row.current_stage}）`);
}

// ─────────────────────────────────────────
// ③ 存量迁移（v8）：出生默认行改写 / 真在跑·已归档不动
// ─────────────────────────────────────────
console.log('\n--- 3. 存量迁移：三类行各得其所 ---');
{
  fresh();
  // 手工建 v7 形态旧库：changes（无 last_local_modified_ts / owner_session 等新列，_migrateAddColumn 补）+ stages
  const oldDb = new DatabaseSync(dbPath());
  oldDb.exec(`
    CREATE TABLE changes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      current_stage TEXT DEFAULT 'scan',
      status TEXT DEFAULT 'active',
      no_worktree INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      last_active TEXT NOT NULL
    );
    CREATE TABLE stages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      change_id INTEGER NOT NULL,
      stage TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      UNIQUE(change_id, stage)
    );
  `);
  const insertChange = (name, currentStage, status) =>
    oldDb.prepare("INSERT INTO changes (name, current_stage, status, created_at, last_active) VALUES (?, ?, ?, 't', 't')").run(name, currentStage, status).lastInsertRowid;
  const insertStage = (changeId, stage, status) =>
    oldDb.prepare('INSERT INTO stages (change_id, stage, status) VALUES (?, ?, ?)').run(changeId, stage, status);

  // a. 出生默认未动过：active + scan/pending（迁移目标——governance-rpc-actions 同形态）
  const aId = insertChange('born-scan-stale', 'scan', 'active');
  insertStage(aId, 'scan', 'pending');
  insertStage(aId, 'brainstorm', 'pending');
  // b. 真在跑 scan：active + scan/in-progress（setStage('scan') 置 in-progress）→ 不动
  const bId = insertChange('scan-inflight', 'scan', 'active');
  insertStage(bId, 'scan', 'in-progress');
  // c. 已跑完 scan 的 default 辅助容器：active + scan/completed → 不动
  const cId = insertChange('scan-done', 'scan', 'active');
  insertStage(cId, 'scan', 'completed');
  // d. 已归档的出生默认行：archived + scan/pending → 不动（历史行不重写）
  const dId = insertChange('born-scan-archived', 'scan', 'archived');
  insertStage(dId, 'scan', 'pending');
  // e. 非出生默认主流程行：plan → 不动（防误伤对照）
  const eId = insertChange('plan-row', 'plan', 'active');
  insertStage(eId, 'plan', 'in-progress');
  oldDb.close();

  // 旧戳 '7' → 新版 init 重跑 _createSchema → v8 迁移
  writeFileSync(stampPath(), '7');
  const db = open();
  db.close();

  let row = rowOf(dbPath(), 'born-scan-stale');
  assert(row && row.current_stage === 'brainstorm', `出生默认行迁移为 brainstorm（实际 ${row && row.current_stage}）`);
  assert(row && row.last_local_modified_ts !== null, `迁移行标本地脏度 last_local_modified_ts=${row && row.last_local_modified_ts}（防平台 pull 静默导回 scan）`);
  const migratedTs = row && row.last_local_modified_ts;
  assert(row && typeof migratedTs === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(migratedTs), `脏度戳 toISOString 形态（实际 ${migratedTs}）`);

  row = rowOf(dbPath(), 'scan-inflight');
  assert(row && row.current_stage === 'scan', `真在跑 scan 行不动（实际 ${row && row.current_stage}）`);
  row = rowOf(dbPath(), 'scan-done');
  assert(row && row.current_stage === 'scan', `已跑完 scan 行不动（实际 ${row && row.current_stage}）`);
  row = rowOf(dbPath(), 'born-scan-archived');
  assert(row && row.current_stage === 'scan', `已归档出生行不动（实际 ${row && row.current_stage}）`);
  row = rowOf(dbPath(), 'plan-row');
  assert(row && row.current_stage === 'plan', `主流程行不受迁移影响（实际 ${row && row.current_stage}）`);

  assert(readStamp() === '8', `迁移后 .schema-version 戳=8（实际 ${readStamp()}）`);

  // ─────────────────────────────────────────
  // ④ 幂等：迁移重跑零效果
  // ─────────────────────────────────────────
  console.log('\n--- 4. 幂等：迁移重跑零效果 ---');
  writeFileSync(stampPath(), '7'); // 再度失配强制重跑
  const db2 = open();
  db2.close();
  row = rowOf(dbPath(), 'born-scan-stale');
  assert(row && row.current_stage === 'brainstorm' && row.last_local_modified_ts === migratedTs,
    `重跑后值与脏度戳均不变（current_stage=${row && row.current_stage}, ts=${row && row.last_local_modified_ts}）`);
}

// ─────────────────────────────────────────
// ⑤ 阶段转换契约：出生未入门态等价旧 scan 出生语义
// （18 个存量测试文件的回归锚——archive-delta / run-complete-step-* 等从出生态直 run 目标阶段）
// ─────────────────────────────────────────
console.log('\n--- 5. checkTransition：出生未入门态（brainstorm pending）等价旧 scan 出生 ---');
{
  const { checkTransition } = await import('../src/stage-contract.js');
  assert(checkTransition('brainstorm', 'archive', { fromStageData: { status: 'pending' } }).allowed === true,
    'brainstorm(pending) → archive 放行（thin/quick 出生态归档）');
  assert(checkTransition('brainstorm', 'archive', {}).allowed === true,
    'brainstorm(无 stages 行) → archive 放行（存量行无 brainstorm 行的同形态）');
  assert(checkTransition('brainstorm', 'execute', { fromStageData: { status: 'pending' } }).allowed === true,
    'brainstorm(pending) → execute 放行（backfill/complete-step 直 run 路径）');
  assert(checkTransition('brainstorm', 'archive', { fromStageData: { status: 'in-progress' } }).allowed === false,
    'brainstorm(in-progress) → archive 拒绝（真在主流程中，守卫不放松）');
  assert(checkTransition('brainstorm', 'archive', { fromStageData: { status: 'completed' } }).allowed === false,
    'brainstorm(completed) → archive 拒绝（主流程空窗期不得跳归档）');
  assert(checkTransition('verify', 'archive', {}).allowed === true, 'verify → archive 放行（不变）');
  assert(checkTransition('scan', 'archive', {}).allowed === true, 'scan(auxiliary) → archive 放行（不变）');
  assert(checkTransition('plan', 'archive', {}).allowed === false, 'plan → archive 拒绝（不变）');
}

// 清理（Windows WAL 句柄偶发延迟释放致 EPERM，吞错不阻断退出码）
try { rmSync(tmpRoot, { recursive: true, force: true }); }
catch { /* temp dir 由 OS 清理，不阻断退出码 */ }

if (failures > 0) {
  console.error(`\n[birth-stage] ❌ ${failures} 项失败`);
  process.exit(1);
}
console.log('\n[birth-stage] ✅ 全部通过');
