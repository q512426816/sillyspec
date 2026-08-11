// task-02 验收：serializeForSync() 六表完整序列化（design §8/B1 / D-005@v2 / FR-07）。
//
// 验收点（task-02.md acceptance + 契约 ProgressSyncJSON [project, changes, stages, steps, batch_progress, approvals]）：
// 1. 返回对象含六键
// 2. changes 行含 last_synced_platform_ts 与 last_local_modified_ts，且不含 isolation_* 与 platform_* 系列列
// 3. 未连平台时本地调用不依赖网络（构造纯本地 fixture 即证明）
// 4. stages/steps 用 change_name+stage 关联，行内容与 DB 一致（含 wait_ 列 JSON 字符串透传）
// 5. batch_progress / approvals 存在时正确序列化（read() 漏 approvals，本方法补齐）
// 6. 单活跃 change 无参自动推导；多活跃无参返回 null；不存在 change 返回 null
//
// 隔离：cwd 用 os.tmpdir() 临时目录，绝不碰真实 .sillyspec/.runtime（记忆 sillyspec-test-specdir-isolation）。
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'fs';
import { join, basename } from 'path';
import { tmpdir } from 'os';
import { ProgressManager } from '../src/progress.js';

let failures = 0;
const assert = (cond, msg) => {
  if (cond) console.log('  ✅ ' + msg);
  else { console.error('  ❌ ' + msg); failures++; }
};

const makePM = (cwd) => new ProgressManager({ specDir: join(cwd, '.sillyspec') });

const tmpRoot = mkdtempSync(join(tmpdir(), `sillyspec-sync-serial-${process.pid}-`));

console.log('\n[platform-sync-serialization] task-02：serializeForSync 六表完整序列化');

// ─────────────────────────────────────────
// fixture：完整构造一个 change（init + change + step + batch + approval + 脏度列）
// ─────────────────────────────────────────
const cwd = join(tmpRoot, 'fixture');
mkdirSync(cwd, { recursive: true });
const pm = makePM(cwd);
pm.init(cwd);
pm.initChange(cwd, 'test-change');
pm.addStep(cwd, 'brainstorm', 'step-1', 'test-change');
// force:true 跳过产物校验门（fixture 无 design.md 等产物），让 stage 真正流转到 completed
pm.updateStep(cwd, 'brainstorm', 'step-1', { status: 'completed', output: 'step output', force: true }, 'test-change');
pm.updateBatchProgress(cwd, { total: 3, completed: 1, failed: 0, skipped: 0 }, 'test-change');
pm._updateApprovalStatus(cwd, 'test-change', 'approved', 'by-agent');

// 模拟 task-01 加列已落值（task-04 才全写入路径更新，此处直接 UPDATE 验证投影）
const db = pm._ensureDB(cwd);
const sqlDb = db.getDb();
sqlDb.prepare(
  'UPDATE changes SET last_synced_platform_ts = ?, last_local_modified_ts = ? WHERE name = ?'
).run('2026-08-10T00:00:00.000Z', '2026-08-10T01:00:00.000Z', 'test-change');
// 模拟 step 的 wait_ 列（DB 存 JSON 字符串，serializeForSync 应原样透传）
sqlDb.prepare(
  'UPDATE steps SET wait_reason = ?, wait_options = ?, wait_answers = ?, wait_round = 2, max_wait_rounds = 5 WHERE name = ?'
).run('需要用户决策', '["A","B"]', '[{"answer":"A"}]', 'step-1');

// ─────────────────────────────────────────
// 1. serializeForSync 返回六键 + 关联正确
// ─────────────────────────────────────────
console.log('\n--- 1. serializeForSync 六键 + 关联正确 ---');
let json;
try {
  json = pm.serializeForSync(cwd, 'test-change');
} catch (e) {
  console.error('  ❌ serializeForSync 抛错:', e.message);
  failures++;
}
if (json) {
  for (const k of ['project', 'changes', 'stages', 'steps', 'batch_progress', 'approvals']) {
    assert(k in json, `返回对象含 ${k} 键`);
  }

  // changes 投影列
  const ch = json.changes[0];
  assert(ch && ch.name === 'test-change', `changes[0].name === 'test-change'（实际 ${ch && ch.name}）`);
  assert(ch && ch.last_synced_platform_ts === '2026-08-10T00:00:00.000Z', 'changes 行含 last_synced_platform_ts');
  assert(ch && ch.last_local_modified_ts === '2026-08-10T01:00:00.000Z', 'changes 行含 last_local_modified_ts');
  assert(ch && ch.current_stage === 'scan', `changes 行含 current_stage（实际 ${ch && ch.current_stage}）`);
  const chKeys = Object.keys(ch);
  assert(!chKeys.some(k => k.startsWith('isolation_')), 'changes 行不含 isolation_* 系列列');
  assert(!chKeys.some(k => k.startsWith('platform_')), 'changes 行不含 platform_* 系列列（platform_change_id/workspace_id/last_sync/sync_enabled）');
  assert(!chKeys.includes('created_at'), 'changes 行不含 created_at（本地强相关，不同步）');

  // project 全局行
  assert(json.project && json.project.name === basename(cwd), `project.name === basename(cwd)（实际 ${json.project && json.project.name}）`);
  assert(json.project && json.project.schema_version === 5, `project.schema_version === 5（实际 ${json.project && json.project.schema_version}）`);

  // stages：initChange 插入全部 VALID_STAGES，每行 change_name+stage
  assert(Array.isArray(json.stages) && json.stages.length >= 5, `stages 数组非空（实际 ${json.stages.length} 行）`);
  const bsStage = json.stages.find(s => s.stage === 'brainstorm');
  assert(bsStage && bsStage.change_name === 'test-change', 'stages 行含 change_name 关联');
  assert(bsStage && bsStage.status === 'completed', `brainstorm stage status='completed'（实际 ${bsStage && bsStage.status}）`);

  // steps：change_name+stage 关联 + wait_ 列 JSON 字符串透传
  const step = json.steps.find(s => s.name === 'step-1');
  assert(step, 'steps 含 step-1');
  assert(step && step.change_name === 'test-change' && step.stage === 'brainstorm', 'step 含 change_name+stage 关联');
  assert(step && step.status === 'completed' && step.output === 'step output', `step status/output 正确（${step && step.status}/${step && step.output}）`);
  assert(step && step.wait_reason === '需要用户决策', 'step wait_reason 透传');
  assert(step && step.wait_options === '["A","B"]', 'step wait_options 透传 DB JSON 字符串（原样不 parse）');
  assert(step && step.wait_answers === '[{"answer":"A"}]', 'step wait_answers 透传 DB JSON 字符串');
  assert(step && step.wait_round === 2 && step.max_wait_rounds === 5, 'step wait_round/max_wait_rounds 整数保留');
  assert(step && step.ordering === 1, `step ordering 保留（实际 ${step && step.ordering}）`);

  // batch_progress
  const bp = json.batch_progress[0];
  assert(bp && bp.change_name === 'test-change', 'batch_progress 含 change_name');
  assert(bp && bp.total === 3 && bp.completed === 1 && bp.failed === 0 && bp.skipped === 0,
    `batch_progress 数值正确（${bp && bp.total}/${bp && bp.completed}/${bp && bp.failed}/${bp && bp.skipped}）`);

  // approvals（read() 漏读此表，serializeForSync 补齐；approved_by 无写入 API 保持 null）
  const ap = json.approvals[0];
  assert(ap && ap.change_name === 'test-change', 'approvals 含 change_name');
  assert(ap && ap.status === 'approved', `approvals status='approved'（实际 ${ap && ap.status}）`);
  assert(ap && typeof ap.requested_at === 'string' && ap.requested_at.length > 0, 'approvals requested_at 非空（_updateApprovalStatus 写入）');
  assert(ap && typeof ap.approved_at === 'string' && ap.approved_at.length > 0, 'approvals approved_at 非空');
  assert(ap && ap.approved_by === null, 'approvals approved_by 归一为 null（该列无写入 API，DB 即 null）');
  assert(ap && ap.rejection_reason === null, 'approvals rejection_reason 归一为 null');
}

// ─────────────────────────────────────────
// 2. 未连平台：纯本地 fixture 可调用（上面已构造本地库并成功调用，本组无网络依赖）
// ─────────────────────────────────────────
console.log('\n--- 2. 纯本地调用不依赖网络（fixture 无任何网络配置） ---');
assert(json !== null, '纯本地 DB serializeForSync 正常返回（无 local.yaml / 无网络）');

// ─────────────────────────────────────────
// 3. 单活跃 change 无参自动推导
// ─────────────────────────────────────────
console.log('\n--- 3. 单活跃 change 无参自动推导 ---');
{
  const cwd2 = join(tmpRoot, 'auto');
  mkdirSync(cwd2, { recursive: true });
  const pm2 = makePM(cwd2);
  pm2.init(cwd2);
  pm2.initChange(cwd2, 'only-change');
  const j2 = pm2.serializeForSync(cwd2);
  assert(j2 !== null, '无 changeName 参数 → 单活跃自动推导成功');
  assert(j2 && j2.changes[0] && j2.changes[0].name === 'only-change', `自动推导到 only-change（实际 ${j2 && j2.changes[0] && j2.changes[0].name}）`);
}

// ─────────────────────────────────────────
// 4. 多活跃 change 无参 → null
// ─────────────────────────────────────────
console.log('\n--- 4. 多活跃 change 无参 → null ---');
{
  const cwd3 = join(tmpRoot, 'multi');
  mkdirSync(cwd3, { recursive: true });
  const pm3 = makePM(cwd3);
  pm3.init(cwd3);
  pm3.initChange(cwd3, 'change-a');
  pm3.initChange(cwd3, 'change-b');
  assert(pm3.serializeForSync(cwd3) === null, '多活跃 change 无参 → null（无法确定目标）');
  // 显式指定仍可用
  const j3 = pm3.serializeForSync(cwd3, 'change-b');
  assert(j3 !== null && j3.changes[0].name === 'change-b', '显式指定 change-b 正常返回');
}

// ─────────────────────────────────────────
// 5. 不存在 change → null；无活跃 change → null
// ─────────────────────────────────────────
console.log('\n--- 5. 不存在 / 无活跃 change → null ---');
{
  const cwd4 = join(tmpRoot, 'missing');
  mkdirSync(cwd4, { recursive: true });
  const pm4 = makePM(cwd4);
  pm4.init(cwd4);
  assert(pm4.serializeForSync(cwd4, 'ghost') === null, '显式指定不存在的 change → null');
  assert(pm4.serializeForSync(cwd4) === null, '无活跃 change 无参 → null');
}

// 清理（Windows 下偶发 EPERM，吞错不阻断退出码）
try { rmSync(tmpRoot, { recursive: true, force: true }); }
catch { /* temp dir 由 OS 清理 */ }

if (failures > 0) {
  console.error(`\n[platform-sync-serialization] ❌ ${failures} 项失败`);
  process.exit(1);
}
console.log('\n[platform-sync-serialization] ✅ 全部通过');
