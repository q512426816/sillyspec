// 2026-10-21-overview-thin-stage：overview（progress show --json）thin 出身阶段投影。
//
// 背景：SillyHub 工作区总览卡经 daemon 采集 progress show --json 渲染，轻量（thin）变更
// 被显示成 brainstorm 主管线+步骤 0/0；变更比对弹窗 progress 行本地=brainstorm vs 平台=thin
// 恒假漂移。根因：2026-10-13-thin-sync-stage 只给 serializeForSync 平台上行做了 tier=thin
// 覆写，overview() 漏同款投影（envelope 直报 DB 出生值 brainstorm，thin 不走阶段机）。
// 本测试钉住 overview 投影的五形态：
// 1. thin + active → current_stage='thin' + stage_label='◈ 轻量变更'（仅载荷，DB 行不动）
// 2. tier=thick（升厚）+ active → 不覆写（'brainstorm'）
// 3. 无 flow-state（厚流程）→ 不覆写（现状回归）
// 4. flow-state 损坏 → readFlowState null → 不覆写（fail-open 同 sync）
// 5. 归档行不出现在 overview（listChanges 活跃口径不变）
// 另钉 steps 口径：thin 维持 stages 全 pending + steps {0,0} 真实值（daemon asCount 强转
// 使省略成为 no-op，契约不扩散——design「接口契约」节）。
//
// 隔离：cwd 用 os.tmpdir() 临时目录，绝不碰真实 .sillyspec/.runtime（记忆 sillyspec-test-specdir-isolation）。
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { ProgressManager } from '../src/progress.js';
import { runStatusOverview } from '../src/machine-interface.js';

let failures = 0;
const assert = (cond, msg) => {
  if (cond) console.log('  ✅ ' + msg);
  else { console.error('  ❌ ' + msg); failures++; }
};

const tmpRoot = mkdtempSync(join(tmpdir(), `sillyspec-overview-thin-${process.pid}-`));

/** 建独立 fixture：本地 DB 一个活跃 change + 可选 flow-state.yaml 内容。 */
const makeFixture = (name, flowStateYaml) => {
  const cwd = join(tmpRoot, name);
  mkdirSync(cwd, { recursive: true });
  const pm = new ProgressManager({ specDir: join(cwd, '.sillyspec') });
  pm.init(cwd);
  pm.initChange(cwd, 'chg');
  if (flowStateYaml !== undefined) {
    const dir = join(cwd, '.sillyspec', 'changes', 'chg');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'flow-state.yaml'), flowStateYaml, 'utf8');
  }
  return { cwd, pm };
};

/** overview changes[] 条目 + runStatusOverview envelope 双层断言（facade 与 machine-interface 同源）。 */
const overviewOf = (cwd) => new ProgressManager({ specDir: join(cwd, '.sillyspec') }).overview(cwd).changes;
const envelopeChanges = (cwd) => {
  const { envelope } = runStatusOverview({ cwd, specBase: join(cwd, '.sillyspec') });
  return envelope?.data?.changes ?? [];
};

console.log('\n[overview-thin-stage] overview thin 出身阶段投影');

// ── 1. thin + active → 'thin' + '◈ 轻量变更'（仅载荷，DB 行不动）──
console.log('\n--- 1. thin 活跃变更 overview 投影 thin ---');
{
  const { cwd } = makeFixture('thin-active', 'tier: thin\nborn_face: thin\nsubsteps: {}\n');
  const entry = overviewOf(cwd)[0];
  assert(entry && entry.current_stage === 'thin', `overview current_stage === 'thin'（实际 ${entry && entry.current_stage}）`);
  assert(entry.stage_label === '◈ 轻量变更', `stage_label === '◈ 轻量变更'（实际 ${entry.stage_label}）`);
  const envCh = envelopeChanges(cwd)[0];
  assert(envCh && envCh.current_stage === 'thin' && envCh.stage_label === '◈ 轻量变更',
    `runStatusOverview envelope 同投影（实际 ${envCh && envCh.current_stage}/${envCh && envCh.stage_label}）`);
  const row = new ProgressManager({ specDir: join(cwd, '.sillyspec') })._ensureDB(cwd).getDb()
    .prepare('SELECT current_stage FROM changes WHERE name = ?').get('chg');
  assert(row.current_stage === 'brainstorm', `本地 DB 行不动仍 'brainstorm'（实际 ${row.current_stage}，仅载荷覆写不落库）`);
  // steps 口径：thin 维持真实零值（stages 全 pending + steps {0,0}），契约不省略键
  assert(entry.steps && entry.steps.total === 0 && entry.steps.completed === 0,
    `thin steps 维持 {0,0} 口径（实际 ${entry.steps && entry.steps.total}/${entry.steps && entry.steps.completed}）`);
}

// ── 2. tier=thick（升厚）+ active → 不覆写 ──
console.log('\n--- 2. 升厚（tier=thick）不覆写 ---');
{
  const { cwd } = makeFixture('thick-upgraded', 'tier: thick\nborn_face: thin\n');
  const entry = overviewOf(cwd)[0];
  assert(entry.current_stage === 'brainstorm', `升厚行 overview 'brainstorm'（实际 ${entry.current_stage}）`);
  assert(entry.stage_label === '🧠 需求探索', `升厚行 label '🧠 需求探索'（实际 ${entry.stage_label}）`);
}

// ── 3. 无 flow-state（厚流程）→ 不覆写（现状回归）──
console.log('\n--- 3. 无 flow-state 不覆写 ---');
{
  const { cwd } = makeFixture('no-state', undefined);
  const entry = overviewOf(cwd)[0];
  assert(entry.current_stage === 'brainstorm', `无 flow-state 行 overview 'brainstorm'（实际 ${entry.current_stage}）`);
}

// ── 4. flow-state 损坏 → fail-open 不覆写 ──
console.log('\n--- 4. flow-state 损坏 fail-open ---');
{
  const { cwd } = makeFixture('broken-state', 'tier: [unclosed\n  bad yaml :::\n');
  const entry = overviewOf(cwd)[0];
  assert(entry.current_stage === 'brainstorm', `损坏 flow-state 行 overview 'brainstorm'（实际 ${entry.current_stage}）`);
}

// ── 5. 归档行不出现在 overview（listChanges 活跃口径不变）──
console.log('\n--- 5. 归档行不出现 ---');
{
  const { cwd } = makeFixture('thin-archived', 'tier: thin\nborn_face: thin\n');
  new ProgressManager({ specDir: join(cwd, '.sillyspec') })._ensureDB(cwd).getDb()
    .prepare("UPDATE changes SET status = 'archived', current_stage = 'archive' WHERE name = ?").run('chg');
  const ov = new ProgressManager({ specDir: join(cwd, '.sillyspec') }).overview(cwd);
  assert(ov.active_changes === 0 && ov.changes.length === 0,
    `归档行不在 overview（active_changes=${ov.active_changes}, changes=${ov.changes.length}）`);
}

// 清理（Windows 下偶发 EPERM，吞错不阻断退出码）
try { rmSync(tmpRoot, { recursive: true, force: true }); }
catch { /* temp dir 由 OS 清理 */ }

if (failures > 0) {
  console.error(`\n[overview-thin-stage] ❌ ${failures} 项失败`);
  process.exit(1);
}
console.log('\n[overview-thin-stage] ✅ 全部通过');
