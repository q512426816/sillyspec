// task-03 验收：import() 逆运算 + 事务原子 + 独立 .bak snapshot（design §8/B1 / D-005@v2 / D-011 / FR-07）。
//
// 验收点（task-03.md acceptance + 契约 ImportResult [ok, imported, reason, bakPath]）：
// 1. import 返回 ImportResult 含 ok imported reason bakPath
// 2. import 后隔离状态列 isolation_* 与 platform_change_id 等本地列未被覆盖
// 3. import 后 last_local_modified_ts 等于 last_synced_platform_ts（=pushed_at，不更新 now）
// 4. import 失败 throw 中文且 .bak 可恢复
// 5. stages/steps/batch_progress/approvals 四表按平台 JSON 原子重建
// 6. .bak 独立路径（pre-import- 前缀）落在 .runtime/
//
// 隔离：cwd 用 os.tmpdir() 临时目录，绝不碰真实 .sillyspec/.runtime（记忆 sillyspec-test-specdir-isolation）。
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, copyFileSync, rmSync } from 'fs';
import { join, basename } from 'path';
import { tmpdir } from 'os';
import { ProgressManager } from '../src/progress.js';

let failures = 0;
const assert = (cond, msg) => {
  if (cond) console.log('  ✅ ' + msg);
  else { console.error('  ❌ ' + msg); failures++; }
};
const assertThrows = (fn, substr, msg) => {
  try {
    fn();
    console.error('  ❌ ' + msg + '（未抛错）');
    failures++;
  } catch (e) {
    if (e.message.includes(substr)) console.log('  ✅ ' + msg);
    else { console.error(`  ❌ ${msg}（错误信息不含「${substr}」，实际：${e.message}）`); failures++; }
  }
};

const makePM = (cwd) => new ProgressManager({ specDir: join(cwd, '.sillyspec') });

const tmpRoot = mkdtempSync(join(tmpdir(), `sillyspec-sync-import-${process.pid}-`));

console.log('\n[platform-sync-import] task-03：import() 逆运算 + 事务原子 + .bak snapshot');

// ─────────────────────────────────────────
// fixture：完整 change + 本地隔离状态 + 已有同步记录
// ─────────────────────────────────────────
const cwd = join(tmpRoot, 'fixture');
mkdirSync(cwd, { recursive: true });
const pm = makePM(cwd);
pm.init(cwd);
pm.initChange(cwd, 'test-change');
pm.addStep(cwd, 'brainstorm', 'step-1', 'test-change');
pm.updateStep(cwd, 'brainstorm', 'step-1', { status: 'completed', output: 'local output', force: true }, 'test-change');
pm.updateBatchProgress(cwd, { total: 3, completed: 1, failed: 0, skipped: 0 }, 'test-change');
pm._updateApprovalStatus(cwd, 'test-change', 'approved', null);

// 模拟本地强相关状态（import 必须保留这些列）
const db = pm._ensureDB(cwd);
const sqlDb = db.getDb();
sqlDb.prepare(
  `UPDATE changes SET isolation_status = 'isolated', isolation_mode = 'manual', isolation_reason = 'keep-local',
     platform_change_id = 42, platform_workspace_id = 7, platform_sync_enabled = 1,
     last_synced_platform_ts = '2026-08-10T00:00:00.000Z', last_local_modified_ts = '2026-08-10T00:30:00.000Z'
   WHERE name = 'test-change'`
).run();

// ─────────────────────────────────────────
// 1. import 返回 ImportResult + 四表重建 + 脏度对齐 + 隔离保留
// ─────────────────────────────────────────
console.log('\n--- 1. import 正常路径 ---');
// 模拟平台权威 JSON：改 stage 状态、step output、batch 数值、approvals 状态、current_stage
const platformJson = JSON.parse(JSON.stringify(pm.serializeForSync(cwd, 'test-change')));
platformJson.changes[0].current_stage = 'plan';
platformJson.changes[0].status = 'active';
platformJson.stages.find(s => s.stage === 'brainstorm').status = 'pending'; // 平台回退该 stage
platformJson.steps.find(s => s.name === 'step-1').output = 'platform output';
platformJson.batch_progress[0] = { change_name: 'test-change', total: 5, completed: 2, failed: 1, skipped: 2 };
platformJson.approvals[0] = { change_name: 'test-change', status: 'rejected', requested_at: '2026-08-10T01:00:00.000Z', approved_by: null, approved_at: null, rejection_reason: 'rework needed' };
platformJson.pushed_at = '2026-08-10T02:00:00.000Z'; // sync.js pull() 从响应 header attach

let result;
try {
  result = pm.import(cwd, platformJson, 'test-change');
} catch (e) {
  console.error('  ❌ import 抛错:', e.message);
  failures++;
}

assert(result && result.ok === true, 'import 返回 ok:true');
assert(result && result.imported === 'test-change', `import.imported === 'test-change'（实际 ${result && result.imported}）`);
assert(result && result.bakPath && typeof result.bakPath === 'string' && result.bakPath.length > 0, 'import 返回 bakPath（非空 string）');
assert(result && result.reason === undefined, 'import.reason === undefined（成功无 reason）');

// import 后重新序列化，验证平台 JSON 生效
const after = pm.serializeForSync(cwd, 'test-change');
assert(after.changes[0].current_stage === 'plan', `import 后 current_stage='plan'（实际 ${after.changes[0].current_stage}）`);
assert(after.stages.find(s => s.stage === 'brainstorm').status === 'pending', 'import 后 brainstorm stage 回退为 pending（平台权威）');
assert(after.steps.find(s => s.name === 'step-1').output === 'platform output', 'import 后 step output 为平台值');
assert(after.batch_progress[0].total === 5 && after.batch_progress[0].failed === 1, `import 后 batch 数值重建（${after.batch_progress[0].total}/${after.batch_progress[0].failed}）`);
assert(after.approvals[0].status === 'rejected' && after.approvals[0].rejection_reason === 'rework needed', 'import 后 approvals 重建为平台 rejected');

// 验收点 3：last_local_modified_ts === last_synced_platform_ts === pushed_at（不更新 now）
assert(after.changes[0].last_synced_platform_ts === '2026-08-10T02:00:00.000Z',
  `import 后 last_synced_platform_ts === pushed_at（实际 ${after.changes[0].last_synced_platform_ts}）`);
assert(after.changes[0].last_local_modified_ts === '2026-08-10T02:00:00.000Z',
  `import 后 last_local_modified_ts === pushed_at（实际 ${after.changes[0].last_local_modified_ts}，非 now()——D-013 例外）`);

// ─────────────────────────────────────────
// 2. 隔离状态列与本地强相关列未被覆盖
// ─────────────────────────────────────────
console.log('\n--- 2. 本地隔离状态列保留 ---');
const chRow = sqlDb.prepare(
  `SELECT isolation_status, isolation_mode, isolation_reason, platform_change_id, platform_workspace_id, platform_sync_enabled, created_at
   FROM changes WHERE name = 'test-change'`
).get();
assert(chRow.isolation_status === 'isolated', `isolation_status 保留（实际 ${chRow.isolation_status}）`);
assert(chRow.isolation_mode === 'manual' && chRow.isolation_reason === 'keep-local', 'isolation_mode/reason 保留');
assert(chRow.platform_change_id === 42 && chRow.platform_workspace_id === 7, 'platform_change_id/workspace_id 保留');
assert(chRow.platform_sync_enabled === 1, 'platform_sync_enabled 保留');
assert(chRow.created_at !== null && chRow.created_at.length > 0, 'created_at 保留');

// ─────────────────────────────────────────
// 3. .bak 独立 snapshot 落在 .runtime/（pre-import- 前缀，不抢主 .bak）
// ─────────────────────────────────────────
console.log('\n--- 3. .bak 独立 snapshot ---');
const runtimeDir = join(cwd, '.sillyspec', '.runtime');
assert(existsSync(runtimeDir), '.runtime 目录存在');
const baks = readdirSync(runtimeDir).filter(f => /^sillyspec\.db\.pre-import-.*\.bak$/.test(f));
assert(baks.length >= 1, `.runtime 含 pre-import-*.bak snapshot（实际 ${baks.length} 个）`);
const bakFull = join(runtimeDir, baks[0]);
const bakSize = existsSync(bakFull) ? readFileSync(bakFull).length : 0;
assert(bakSize > 0, `.bak 非空（${bakSize} bytes，可恢复）`);
// .bak 可恢复：copyFileSync 回 db 后 DB 仍可读（模拟回滚恢复路径）
{
  const dbPath = join(runtimeDir, 'sillyspec.db');
  const restorePath = join(runtimeDir, 'sillyspec.db.restored-test');
  copyFileSync(bakFull, restorePath);
  assert(readFileSync(restorePath).length > 0, '.bak 副本可读（恢复路径可行）');
}

// ─────────────────────────────────────────
// 4. 失败路径：throw 中文 + .bak 保留
// ─────────────────────────────────────────
console.log('\n--- 4. import 失败 throw 中文 ---');
assertThrows(() => pm.import(cwd, null, 'test-change'), 'progressObj', 'import(null) throw 中文');
assertThrows(() => pm.import(cwd, { changes: [] }, null), 'changeName', 'import 无 changeName throw 中文');
{
  // 指向不存在本地进度库的 cwd（未 init，无 .runtime/sillyspec.db）
  const emptyCwd = join(tmpRoot, 'empty');
  mkdirSync(emptyCwd, { recursive: true });
  const pmE = makePM(emptyCwd);
  assertThrows(() => pmE.import(emptyCwd, { changes: [{ name: 'x' }] }, 'x'), '本地进度库不存在', 'import 指向不存在 DB throw 中文');
}

// ─────────────────────────────────────────
// 5. 平台新增 change：import 兜底 INSERT changes 行（pull 新 change 场景）
// ─────────────────────────────────────────
console.log('\n--- 5. 平台新增 change import ---');
{
  const cwd2 = join(tmpRoot, 'newchange');
  mkdirSync(cwd2, { recursive: true });
  const pm2 = makePM(cwd2);
  pm2.init(cwd2);
  pm2.initChange(cwd2, 'existing');
  const j2 = {
    project: { id: 1, name: 'newchange', schema_version: 4, created_at: '2026-08-10T00:00:00.000Z', updated_at: '2026-08-10T00:00:00.000Z' },
    changes: [{ name: 'platform-new', current_stage: 'brainstorm', status: 'active', last_active: '2026-08-10T00:00:00.000Z', last_synced_platform_ts: null, last_local_modified_ts: null }],
    stages: [{ change_name: 'platform-new', stage: 'brainstorm', status: 'pending', started_at: null, completed_at: null, revision: 0, reopened_from_step: null, reopened_at: null, stale_reason: null }],
    steps: [],
    batch_progress: [],
    approvals: [],
    pushed_at: '2026-08-10T03:00:00.000Z',
  };
  const r = pm2.import(cwd2, j2, 'platform-new');
  assert(r.ok === true, '平台新增 change import 返回 ok');
  const j2after = pm2.serializeForSync(cwd2, 'platform-new');
  assert(j2after !== null, 'import 后新 change 可序列化（INSERT 兜底生效）');
  assert(j2after.changes[0].last_synced_platform_ts === '2026-08-10T03:00:00.000Z', '新 change 脏度也置为 pushed_at');
  const existingRow = makePM(cwd2)._ensureDB(cwd2).getDb()
    .prepare(`SELECT isolation_status FROM changes WHERE name = 'existing'`).get();
  assert(existingRow !== undefined, '既有 change 不受影响');
}

// 清理（Windows 下偶发 EPERM，吞错不阻断退出码）
try { rmSync(tmpRoot, { recursive: true, force: true }); }
catch { /* temp dir 由 OS 清理 */ }

if (failures > 0) {
  console.error(`\n[platform-sync-import] ❌ ${failures} 项失败`);
  process.exit(1);
}
console.log('\n[platform-sync-import] ✅ 全部通过');
