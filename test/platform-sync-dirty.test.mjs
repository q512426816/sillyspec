// task-04 验收：全写入路径更新 last_local_modified_ts 脏度（design §8 / D-008 / D-013 / FR-05）。
//
// 验收点（task-04.md acceptance）：
// 1. 任一写入路径后 changes.last_local_modified_ts 更新为写入时刻（ISO 非 null）
// 2. import 后 last_local_modified_ts 等于 last_synced_platform_ts 而非 now
// 3. 读路径（read/serializeForSync/listChanges）不标脏——可用 last_local_modified_ts > last_synced_platform_ts 判本地脏度
//
// 覆盖写入路径：initChange / registerChange / addStep / updateStep / setStage / completeStage /
// updateBatchProgress / updateChangeIsolation / _updateApprovalStatus / renameChange / unregisterChange / _write
//
// 隔离：cwd 用 os.tmpdir() 临时目录，绝不碰真实 .sillyspec/.runtime。
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

const tmpRoot = mkdtempSync(join(tmpdir(), `sillyspec-dirty-${process.pid}-`));

console.log('\n[platform-sync-dirty] task-04：全写入路径 last_local_modified_ts 脏度');

const cwd = join(tmpRoot, 'fixture');
mkdirSync(cwd, { recursive: true });
const pm = makePM(cwd);
pm.init(cwd);

const dirtyOf = (name = 'test-change', dir = cwd) => {
  const row = makePM(dir)._ensureDB(dir).getDb().prepare('SELECT last_local_modified_ts FROM changes WHERE name = ?').get(name);
  return row === undefined ? undefined : row.last_local_modified_ts;
};

// 每个写路径后记录 dirty 值，断言为 ISO 且前进（或新写入）
let dirty;
const checkDirty = (msg, name = 'test-change', dir = cwd) => {
  const d = dirtyOf(name, dir);
  assert(d !== null && d !== undefined && ISO.test(d), `${msg} → last_local_modified_ts 为 ISO 非 null（实际 ${d}）`);
  return d;
};

// ─────────────────────────────────────────
// 1. 逐写入路径验证标脏
// ─────────────────────────────────────────
console.log('\n--- 1. 各写入路径标脏 ---');

// initChange
pm.initChange(cwd, 'test-change');
dirty = checkDirty('initChange 后');
assert(dirtyOf('test-change') === dirty, 'initChange 写入 last_local_modified_ts');

// registerChange（新 change 才标脏）
pm.registerChange(cwd, 'second-change');
const dirty2 = dirtyOf('second-change');
assert(dirty2 !== null && ISO.test(dirty2), `registerChange 新 change 标脏（实际 ${dirty2}）`);
// registerChange 已存在 change 不重复标
pm._ensureDB(cwd).getDb().prepare("UPDATE changes SET last_local_modified_ts = NULL WHERE name = 'second-change'").run();
pm.registerChange(cwd, 'second-change');
assert(dirtyOf('second-change') === null, 'registerChange 已存在 change 不标脏（读路径/重复调用不误判）');

// addStep
pm.addStep(cwd, 'brainstorm', 'step-1', 'test-change');
const dAdd = checkDirty('addStep 后');

// updateStep
pm.updateStep(cwd, 'brainstorm', 'step-1', { status: 'completed', output: 'x', force: true }, 'test-change');
const dUpd = checkDirty('updateStep 后');

// setStage（切阶段）
pm.setStage(cwd, 'plan', 'test-change');
const dSet = checkDirty('setStage 后');

// updateBatchProgress
pm.updateBatchProgress(cwd, { total: 3, completed: 1, failed: 0, skipped: 0 }, 'test-change');
const dBatch = checkDirty('updateBatchProgress 后');

// completeStage（force 跳过产物门）
pm.completeStage(cwd, 'brainstorm', 'test-change', { force: true });
const dComp = checkDirty('completeStage 后');

// updateChangeIsolation
pm.updateChangeIsolation(cwd, 'test-change', { status: 'isolated', mode: 'manual', reason: 'keep' });
const dIso = checkDirty('updateChangeIsolation 后');

// _updateApprovalStatus
pm._updateApprovalStatus(cwd, 'test-change', 'approved', null);
const dAppr = checkDirty('_updateApprovalStatus 后');

// renameChange：新名标脏
pm.renameChange(cwd, 'test-change', 'renamed-change');
const dRen = checkDirty('renameChange 后（新名）', 'renamed-change');

// unregisterChange：归档标脏
pm.unregisterChange(cwd, 'renamed-change');
const dUnreg = checkDirty('unregisterChange 后（归档）', 'renamed-change');

// ─────────────────────────────────────────
// 2. import 例外：last_local_modified_ts === last_synced_platform_ts === pushed_at（非 now）
// ─────────────────────────────────────────
console.log('\n--- 2. import 例外（D-013）---');
// 重新注册一个 active change 用于 import
pm.registerChange(cwd, 'import-target');
pm._ensureDB(cwd).getDb().prepare(
  `UPDATE changes SET last_synced_platform_ts = '2026-08-10T00:00:00.000Z', last_local_modified_ts = '2026-08-10T00:30:00.000Z' WHERE name = 'import-target'`
).run();
const json = pm.serializeForSync(cwd, 'import-target');
json.pushed_at = '2026-08-10T02:00:00.000Z';
json.changes[0].status = 'active';
const r = pm.import(cwd, json, 'import-target');
assert(r.ok === true, 'import 成功');
const row = pm._ensureDB(cwd).getDb().prepare(
  `SELECT last_synced_platform_ts, last_local_modified_ts FROM changes WHERE name = 'import-target'`
).get();
assert(row.last_local_modified_ts === '2026-08-10T02:00:00.000Z',
  `import 后 last_local_modified_ts === pushed_at（实际 ${row.last_local_modified_ts}，非 now——D-013 例外）`);
assert(row.last_local_modified_ts === row.last_synced_platform_ts, 'last_local_modified_ts === last_synced_platform_ts（本地=平台干净）');

// ─────────────────────────────────────────
// 3. 读路径不标脏 + 脏度可判
// ─────────────────────────────────────────
console.log('\n--- 3. 读路径不标脏 + 脏度判定 ---');
// 固定一个已知脏度，读路径后必须不变
const cwd3 = join(tmpRoot, 'readonly');
mkdirSync(cwd3, { recursive: true });
const pm3 = makePM(cwd3);
pm3.init(cwd3);
pm3.initChange(cwd3, 'ro-change');
const beforeRead = dirtyOf('ro-change', cwd3);
// 直接设一个确定值避免时间戳秒级相等干扰
pm3._ensureDB(cwd3).getDb().prepare(
  `UPDATE changes SET last_local_modified_ts = '2026-08-10T00:00:00.000Z' WHERE name = 'ro-change'`
).run();
pm3.read(cwd3, 'ro-change');
pm3.serializeForSync(cwd3, 'ro-change');
pm3.listChanges(cwd3);
pm3.readGlobal(cwd3);
pm3.show(cwd3, 'ro-change');
pm3.status(cwd3, 'ro-change');
pm3.readBatchProgress(cwd3, 'ro-change');
const afterRead = dirtyOf('ro-change', cwd3);
assert(afterRead === '2026-08-10T00:00:00.000Z', `读路径不标脏（实际 ${afterRead}，应为固定值）`);

// 脏度判定：last_local_modified_ts > last_synced_platform_ts → 本地有未同步推进
pm3._ensureDB(cwd3).getDb().prepare(
  `UPDATE changes SET last_synced_platform_ts = '2026-08-09T00:00:00.000Z' WHERE name = 'ro-change'`
).run();
const localDirty = pm3._ensureDB(cwd3).getDb().prepare(
  `SELECT (last_local_modified_ts > last_synced_platform_ts) AS dirty FROM changes WHERE name = 'ro-change'`
).get();
assert(localDirty.dirty === 1, `last_local_modified_ts > last_synced_platform_ts → 本地脏（实际 ${localDirty.dirty}）`);

// ─────────────────────────────────────────
// 4. _write（progress.js 全量 UPSERT）标脏——经 completeStage 的 history 无关，直接验证 _write
// ─────────────────────────────────────────
console.log('\n--- 4. _write 标脏 ---');
{
  const cwd4 = join(tmpRoot, 'write');
  mkdirSync(cwd4, { recursive: true });
  const pm4 = makePM(cwd4);
  pm4.init(cwd4);
  pm4.initChange(cwd4, 'w-change');
  pm4._write(cwd4, { currentChange: 'w-change', currentStage: 'scan', stages: {} });
  const d = dirtyOf('w-change', cwd4);
  assert(d !== null && ISO.test(d), `_write 后标脏（实际 ${d}）`);
}

// 清理（Windows 下偶发 EPERM，吞错不阻断退出码）
try { rmSync(tmpRoot, { recursive: true, force: true }); }
catch { /* temp dir 由 OS 清理 */ }

if (failures > 0) {
  console.error(`\n[platform-sync-dirty] ❌ ${failures} 项失败`);
  process.exit(1);
}
console.log('\n[platform-sync-dirty] ✅ 全部通过');
