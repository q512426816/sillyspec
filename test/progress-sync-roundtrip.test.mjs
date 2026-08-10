// task-05 验收：serializeForSync → import → serializeForSync round-trip 等值（design §8/B1 / D-005@v2 / FR-07）。
//
// 验收点（task-05.md acceptance）：
// 1. serializeForSync→import→serializeForSync 两次输出逐键等值
// 2. import 后 isolation_* / platform_change_id / created_at 保持本地原值（import 不覆盖）
// 3. import 后 last_local_modified_ts 等于 last_synced_platform_ts（D-013 import 重置语义）
//
// 隔离：两个 cwd basename 同为 'proj'（保 round-trip project.name 等值），tmpdir 隔离不碰真实库。
import { mkdirSync, mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { ProgressManager } from '../src/progress.js';

let failures = 0;
const assert = (cond, msg) => {
  if (cond) console.log('  ✅ ' + msg);
  else { console.error('  ❌ ' + msg); failures++; }
};
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

const makePM = (cwd) => new ProgressManager({ specDir: join(cwd, '.sillyspec') });

const tmpRoot = mkdtempSync(join(tmpdir(), `sillyspec-roundtrip-${process.pid}-`));

console.log('\n[progress-sync-roundtrip] task-05：serializeForSync ↔ import 互逆往返等值');

// ─────────────────────────────────────────
// fixture DB-A：完整 change（steps wait_ 列 + stage revision + batch + approval）+ 干净态时间戳
// ─────────────────────────────────────────
const cwdA = join(tmpRoot, 'dbA', 'proj');
mkdirSync(cwdA, { recursive: true });
const pmA = makePM(cwdA);
pmA.init(cwdA);
pmA.initChange(cwdA, 'rt-change');
pmA.addStep(cwdA, 'brainstorm', 'explore', 'rt-change');
pmA.updateStep(cwdA, 'brainstorm', 'explore', { status: 'completed', output: 'done A', force: true }, 'rt-change');
pmA.updateBatchProgress(cwdA, { total: 5, completed: 2, failed: 1, skipped: 0 }, 'rt-change');
pmA._updateApprovalStatus(cwdA, 'rt-change', 'approved', null);
// 设 revision（reopened 场景）+ wait_ 列 + 干净态时间戳
const sqlA = pmA._ensureDB(cwdA).getDb();
sqlA.prepare('UPDATE stages SET revision = 2, reopened_from_step = ? WHERE stage = ?').run('explore', 'brainstorm');
sqlA.prepare('UPDATE steps SET wait_reason = ?, wait_options = ?, wait_answers = ?, wait_round = 1, max_wait_rounds = 3 WHERE name = ?').run('需决策', '["A","B"]', '[{"answer":"A"}]', 'explore');
const T = '2026-08-10T01:00:00.000Z';
sqlA.prepare('UPDATE changes SET last_synced_platform_ts = ?, last_local_modified_ts = ? WHERE name = ?').run(T, T, 'rt-change');

const jsonA = pmA.serializeForSync(cwdA, 'rt-change');
assert(jsonA !== null, 'DB-A serializeForSync 成功');
assert(jsonA.project && jsonA.project.name === 'proj', `jsonA.project.name=proj（实际 ${jsonA.project && jsonA.project.name}）`);
assert(!jsonA.project.created_at && !jsonA.project.id, 'project 投影不含本地元数据（id/created_at）');

// ─────────────────────────────────────────
// 1. round-trip 逐键等值（jsonA → import → jsonB）
// ─────────────────────────────────────────
console.log('\n--- 1. round-trip 逐键等值 ---');
const cwdB = join(tmpRoot, 'dbB', 'proj'); // basename 同为 'proj'
mkdirSync(cwdB, { recursive: true });
const pmB = makePM(cwdB);
pmB.init(cwdB);
pmB.initChange(cwdB, 'rt-change');

// 预置本地隔离状态（import 必须保留这些列）+ 记录 created_at
const presetTs = '2026-01-01T00:00:00.000Z';
const sqlB = pmB._ensureDB(cwdB).getDb();
sqlB.prepare(
  `UPDATE changes SET isolation_status = 'isolated', isolation_mode = 'manual', isolation_reason = 'keep',
     platform_change_id = 99, platform_workspace_id = 7, platform_sync_enabled = 1,
     created_at = ?, last_synced_platform_ts = ?, last_local_modified_ts = ?
   WHERE name = 'rt-change'`
).run(presetTs, '2025-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z');

// import：用 jsonA + pushed_at（设为 T，使 import 后两列=T 与 jsonA 一致 → 逐键等值）
const importInput = { ...jsonA, pushed_at: T };
const importResult = pmB.import(cwdB, importInput, 'rt-change');
assert(importResult.ok === true, `import 成功（bakPath=${importResult.bakPath ? '有' : '无'}）`);

const jsonB = pmB.serializeForSync(cwdB, 'rt-change');
assert(jsonB !== null, 'DB-B serializeForSync 成功');

// 逐键等值（六表 + project 完全相等）
assert(JSON.stringify(jsonA) === JSON.stringify(jsonB),
  `jsonA === jsonB 逐键等值（serializeForSync↔import 互逆）\n     jsonA=${JSON.stringify(jsonA)}\n     jsonB=${JSON.stringify(jsonB)}`);
// 分项再断言（失败时定位）
assert(JSON.stringify(jsonA.stages) === JSON.stringify(jsonB.stages), 'stages 等值（含 revision/reopened_from_step）');
assert(JSON.stringify(jsonA.steps) === JSON.stringify(jsonB.steps), 'steps 等值（含 wait_options/wait_answers JSON 透传）');
assert(JSON.stringify(jsonA.batch_progress) === JSON.stringify(jsonB.batch_progress), 'batch_progress 等值');
assert(JSON.stringify(jsonA.approvals) === JSON.stringify(jsonB.approvals), 'approvals 等值');
assert(jsonA.project.name === jsonB.project.name && jsonA.project.schema_version === jsonB.project.schema_version, 'project 稳定字段等值');

// ─────────────────────────────────────────
// 2. import 后本地强相关列保留（isolation / platform_change_id / created_at）
// ─────────────────────────────────────────
console.log('\n--- 2. 本地列保留 ---');
const kept = sqlB.prepare(
  `SELECT isolation_status, isolation_mode, isolation_reason, platform_change_id, platform_workspace_id, platform_sync_enabled, created_at
   FROM changes WHERE name = 'rt-change'`
).get();
assert(kept.isolation_status === 'isolated', `isolation_status 保留（实际 ${kept.isolation_status}）`);
assert(kept.isolation_mode === 'manual' && kept.isolation_reason === 'keep', 'isolation_mode/reason 保留');
assert(kept.platform_change_id === 99 && kept.platform_workspace_id === 7, 'platform_change_id/workspace_id 保留');
assert(kept.platform_sync_enabled === 1, 'platform_sync_enabled 保留');
assert(kept.created_at === presetTs, `created_at 保持本地原值（实际 ${kept.created_at}）`);

// ─────────────────────────────────────────
// 3. import 后 last_local_modified_ts === last_synced_platform_ts === pushed_at（D-013）
// ─────────────────────────────────────────
console.log('\n--- 3. import 重置语义（D-013）---');
const tsRow = sqlB.prepare('SELECT last_synced_platform_ts, last_local_modified_ts FROM changes WHERE name = ?').get('rt-change');
assert(tsRow.last_synced_platform_ts === T, `last_synced_platform_ts === pushed_at（实际 ${tsRow.last_synced_platform_ts}）`);
assert(tsRow.last_local_modified_ts === T, `last_local_modified_ts === pushed_at（实际 ${tsRow.last_local_modified_ts}）`);
assert(tsRow.last_local_modified_ts === tsRow.last_synced_platform_ts, '两列相等（本地=平台干净）');

// ─────────────────────────────────────────
// 4. 本地脏态 import：两列都重置为 pushed_at（非保留原脏值）
// ─────────────────────────────────────────
console.log('\n--- 4. 本地脏态 import 重置 ---');
{
  const cwdC = join(tmpRoot, 'dbC', 'proj');
  mkdirSync(cwdC, { recursive: true });
  const pmC = makePM(cwdC);
  pmC.init(cwdC);
  pmC.initChange(cwdC, 'rt-change');
  // 本地脏态：last_local_modified_ts(T1) > last_synced_platform_ts(T0)
  pmC._ensureDB(cwdC).getDb().prepare(
    'UPDATE changes SET last_synced_platform_ts = ?, last_local_modified_ts = ? WHERE name = ?'
  ).run('2026-08-10T00:00:00.000Z', '2026-08-10T00:30:00.000Z', 'rt-change');
  const importC = { ...jsonA, pushed_at: '2026-08-10T05:00:00.000Z' };
  pmC.import(cwdC, importC, 'rt-change');
  const c = pmC._ensureDB(cwdC).getDb().prepare('SELECT last_synced_platform_ts, last_local_modified_ts FROM changes WHERE name = ?').get('rt-change');
  assert(c.last_local_modified_ts === '2026-08-10T05:00:00.000Z' && c.last_synced_platform_ts === '2026-08-10T05:00:00.000Z',
    `本地脏态 import → 两列重置为 pushed_at（实际 ${c.last_local_modified_ts}/${c.last_synced_platform_ts}）`);
}

// 清理
try { rmSync(tmpRoot, { recursive: true, force: true }); }
catch { /* temp dir 由 OS 清理 */ }

if (failures > 0) {
  console.error(`\n[progress-sync-roundtrip] ❌ ${failures} 项失败`);
  process.exit(1);
}
console.log('\n[progress-sync-roundtrip] ✅ 全部通过');
