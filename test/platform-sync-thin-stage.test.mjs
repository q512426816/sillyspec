// 2026-10-13-thin-sync-stage：thin 活跃变更上行 current_stage 投影为 'thin'。
//
// 背景：平台变更中心「进行中」列表的轻量变更不显示「轻量」徽章——CLI 对 thin 变更上行
// 恒为出生值 'brainstorm'（thin 不走阶段机），平台读侧 is_thin 三分支全不命中。平台侧
// StageEnum.THIN / 前端徽章与筛选 / ingest 双守卫均已按 current_stage='thin' 消费，
// 本测试钉住 CLI 上行这一环的四形态：
// 1. thin + active → 覆写 'thin'（仅载荷，本地 DB 行不动）
// 2. thin + archived → 不覆写（终态走既有链）
// 3. tier=thick（升厚）+ active → 不覆写
// 4. 无 flow-state（厚流程）→ 不覆写（现状回归）
// 5. flow-state 损坏 → readFlowState null → 不覆写（fail-open 回退现状）
//
// 隔离：cwd 用 os.tmpdir() 临时目录，绝不碰真实 .sillyspec/.runtime（记忆 sillyspec-test-specdir-isolation）。
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { ProgressManager } from '../src/progress.js';

let failures = 0;
const assert = (cond, msg) => {
  if (cond) console.log('  ✅ ' + msg);
  else { console.error('  ❌ ' + msg); failures++; }
};

const tmpRoot = mkdtempSync(join(tmpdir(), `sillyspec-thin-stage-${process.pid}-`));

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

console.log('\n[platform-sync-thin-stage] thin 活跃变更上行阶段投影');

// ── 1. thin + active → 'thin'（载荷覆写、DB 行不动）──
console.log('\n--- 1. thin 活跃变更覆写为 thin ---');
{
  const { cwd, pm } = makeFixture('thin-active', 'tier: thin\nborn_face: thin\nsubsteps: {}\n');
  const json = pm.serializeForSync(cwd, 'chg');
  const ch = json && json.changes[0];
  assert(ch && ch.current_stage === 'thin', `载荷 current_stage === 'thin'（实际 ${ch && ch.current_stage}）`);
  const row = pm._ensureDB(cwd).getDb().prepare('SELECT current_stage, status FROM changes WHERE name = ?').get('chg');
  assert(row.current_stage === 'brainstorm', `本地 DB 行不动仍 'brainstorm'（实际 ${row.current_stage}，仅载荷覆写不落库）`);
  assert(row.status === 'active' && ch.status === 'active', 'status 双侧均 active');
}

// ── 2. thin + archived → 不覆写（终态既有链）──
console.log('\n--- 2. thin 已归档不覆写 ---');
{
  const { cwd, pm } = makeFixture('thin-archived', 'tier: thin\nborn_face: thin\n');
  pm._ensureDB(cwd).getDb().prepare("UPDATE changes SET status = 'archived', current_stage = 'archive' WHERE name = ?").run('chg');
  const ch = pm.serializeForSync(cwd, 'chg').changes[0];
  assert(ch.current_stage === 'archive', `归档行上行 'archive'（实际 ${ch.current_stage}）`);
  assert(ch.status === 'archived', `归档行上行 status 'archived'（实际 ${ch.status}）`);
}

// ── 3. tier=thick（升厚）+ active → 不覆写 ──
console.log('\n--- 3. 升厚（tier=thick）不覆写 ---');
{
  const { cwd, pm } = makeFixture('thick-upgraded', 'tier: thick\nborn_face: thin\n');
  const ch = pm.serializeForSync(cwd, 'chg').changes[0];
  assert(ch.current_stage === 'brainstorm', `升厚行上行 'brainstorm'（实际 ${ch.current_stage}）`);
}

// ── 4. 无 flow-state（厚流程）→ 不覆写（现状回归）──
console.log('\n--- 4. 无 flow-state 不覆写 ---');
{
  const { cwd, pm } = makeFixture('no-state', undefined);
  const ch = pm.serializeForSync(cwd, 'chg').changes[0];
  assert(ch.current_stage === 'brainstorm', `无 flow-state 行上行 'brainstorm'（实际 ${ch.current_stage}）`);
}

// ── 5. flow-state 损坏 → fail-open 不覆写 ──
console.log('\n--- 5. flow-state 损坏 fail-open ---');
{
  const { cwd, pm } = makeFixture('broken-state', 'tier: [unclosed\n  bad yaml :::\n');
  const ch = pm.serializeForSync(cwd, 'chg').changes[0];
  assert(ch.current_stage === 'brainstorm', `损坏 flow-state 行上行 'brainstorm'（实际 ${ch.current_stage}）`);
}

// 清理（Windows 下偶发 EPERM，吞错不阻断退出码）
try { rmSync(tmpRoot, { recursive: true, force: true }); }
catch { /* temp dir 由 OS 清理 */ }

if (failures > 0) {
  console.error(`\n[platform-sync-thin-stage] ❌ ${failures} 项失败`);
  process.exit(1);
}
console.log('\n[platform-sync-thin-stage] ✅ 全部通过');
