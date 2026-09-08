// pre-import 快照滚动裁剪（ql-20260908-004-cdac）：import() 每次 pull / resolve --take-platform
// 都写一份全库 snapshot sillyspec.db.pre-import-<ts>.bak（含 -wal 侧车），此前写完从不回收，
// 实证单仓累积 292 份 / 317MB。裁剪修在写入侧（不靠人工 GC 命令），本测试锁死其契约。
//
// 验收点：
// 1. 默认保留 1 份：import 后目录只剩本次快照，旧快照连 -wal 侧车一并回收
// 2. 本次 bakPath 永不被裁（并发 import 互删护栏）
// 3. SILLYSPEC_PREIMPORT_BAK_KEEP 可配，且按文件名时间戳保留「最新」而非任意 N 份
// 4. 不误伤相邻文件：sillyspec.db / -wal / 主 sillyspec.db.bak 恢复链 / 他者 .bak
// 5. 非法 keep 值降级默认、连续 import 幂等，裁剪异常不阻断 import（fail-open）
//
// 隔离：cwd 用 os.tmpdir() 临时目录，绝不碰真实 .sillyspec/.runtime（记忆 sillyspec-test-specdir-isolation）。
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { ProgressManager } from '../src/progress.js';

let failures = 0;
const assert = (cond, msg) => {
  if (cond) console.log('  ✅ ' + msg);
  else { console.error('  ❌ ' + msg); failures++; }
};

const makePM = (cwd) => new ProgressManager({ specDir: join(cwd, '.sillyspec') });
const runtimeOf = (cwd) => join(cwd, '.sillyspec', '.runtime');
const listBaks = (cwd) => readdirSync(runtimeOf(cwd))
  .filter(f => /^sillyspec\.db\.pre-import-.*\.bak$/.test(f)).sort();

const tmpRoot = mkdtempSync(join(tmpdir(), `sillyspec-preimport-rot-${process.pid}-`));

// 建一个可 import 的 fixture，并返回 { cwd, pm, payload }
let fixtureSeq = 0;
const makeFixture = () => {
  const cwd = join(tmpRoot, `fx-${++fixtureSeq}`);
  mkdirSync(cwd, { recursive: true });
  const pm = makePM(cwd);
  pm.init(cwd);
  pm.initChange(cwd, 'c1');
  const payload = JSON.parse(JSON.stringify(pm.serializeForSync(cwd, 'c1')));
  payload.pushed_at = '2026-09-08T00:00:00.000Z';
  return { cwd, pm, payload };
};

// 预置旧快照（含 -wal 侧车），时间戳按传入顺序由旧到新
const seedOldBaks = (cwd, stamps, { withWal = true } = {}) => {
  for (const ts of stamps) {
    const name = `sillyspec.db.pre-import-${ts}.bak`;
    writeFileSync(join(runtimeOf(cwd), name), `stale-snapshot-${ts}`);
    if (withWal) writeFileSync(join(runtimeOf(cwd), `${name}-wal`), `stale-wal-${ts}`);
  }
};

console.log('\n[preimport-bak-rotation] pre-import 快照滚动裁剪');

// ─────────────────────────────────────────
// 1. 默认保留 1 份 + -wal 成对回收 + 本次快照必存活
// ─────────────────────────────────────────
console.log('\n--- 1. 默认保留 1 份（旧快照连 -wal 一并回收）---');
{
  const { cwd, pm, payload } = makeFixture();
  seedOldBaks(cwd, [
    '2026-08-30T22-00-00-000Z',
    '2026-08-31T01-00-00-000Z',
    '2026-09-01T23-00-00-000Z',
    '2026-09-02T13-00-00-000Z',
  ]);
  assert(listBaks(cwd).length === 4, '前置：4 份旧快照已就位');

  const r = pm.import(cwd, payload, 'c1');
  const baks = listBaks(cwd);

  assert(r.ok === true, 'import 正常返回 ok:true（裁剪不影响主流程）');
  assert(baks.length === 1, `裁剪后只剩 1 份快照（实际 ${baks.length} 份：${baks.join(', ')}）`);
  assert(existsSync(r.bakPath), '本次 bakPath 仍在磁盘（并发护栏：本次快照永不被裁）');
  assert(baks[0] === r.bakPath.split(/[\\/]/).pop(), '存活的那份就是本次快照');

  // 被裁快照的 -wal 必须一起走；存活快照的 -wal 必须留下——缺侧车的快照恢复时会丢
  // 尾部已提交事务（BUG-18 正是为此才连 -wal 一起备份）。
  const leftoverWal = readdirSync(runtimeOf(cwd))
    .filter(f => /^sillyspec\.db\.pre-import-.*\.bak-wal$/.test(f));
  const survivorWal = `${baks[0]}-wal`;
  const orphanWal = leftoverWal.filter(f => f !== survivorWal);
  assert(orphanWal.length === 0,
    `被裁快照的 -wal 侧车成对回收（孤儿侧车残留 ${orphanWal.length} 个：${orphanWal.join(', ')}）`);
  assert(leftoverWal.includes(survivorWal),
    '存活快照自己的 -wal 侧车保留（恢复完整性，勿连坐删）');
}

// ─────────────────────────────────────────
// 2. 保留「最新」N 份而非任意 N 份（文件名时间戳字典序 == 时间序）
// ─────────────────────────────────────────
console.log('\n--- 2. KEEP 可配，且保留的是最新几份 ---');
{
  const { cwd, pm, payload } = makeFixture();
  const stamps = [
    '2026-08-30T22-00-00-000Z', // 最旧
    '2026-08-31T01-00-00-000Z',
    '2026-09-01T23-00-00-000Z', // 次新
    '2026-09-02T13-00-00-000Z', // 预置里最新
  ];
  seedOldBaks(cwd, stamps, { withWal: false });

  const prev = process.env.SILLYSPEC_PREIMPORT_BAK_KEEP;
  process.env.SILLYSPEC_PREIMPORT_BAK_KEEP = '3';
  const r = pm.import(cwd, payload, 'c1');
  if (prev === undefined) delete process.env.SILLYSPEC_PREIMPORT_BAK_KEEP;
  else process.env.SILLYSPEC_PREIMPORT_BAK_KEEP = prev;

  const baks = listBaks(cwd);
  assert(baks.length === 3, `KEEP=3 时保留 3 份（实际 ${baks.length} 份）`);
  assert(existsSync(r.bakPath), 'KEEP=3 下本次快照仍存活');
  assert(baks.includes(`sillyspec.db.pre-import-${stamps[3]}.bak`), '预置里最新那份保留');
  assert(baks.includes(`sillyspec.db.pre-import-${stamps[2]}.bak`), '预置里次新那份保留');
  assert(!baks.includes(`sillyspec.db.pre-import-${stamps[0]}.bak`), '最旧那份被裁（按时间序，非任意 N 份）');
  assert(!baks.includes(`sillyspec.db.pre-import-${stamps[1]}.bak`), '次旧那份被裁');
}

// ─────────────────────────────────────────
// 3. 不误伤相邻文件（主 .bak 恢复链是 _openWithFallback 的兜底，误删即毁恢复能力）
// ─────────────────────────────────────────
console.log('\n--- 3. 相邻文件零误伤 ---');
{
  const { cwd, pm, payload } = makeFixture();
  seedOldBaks(cwd, ['2026-08-30T22-00-00-000Z'], { withWal: false });
  const rt = runtimeOf(cwd);
  writeFileSync(join(rt, 'sillyspec.db.bak'), 'main-fallback-chain');
  writeFileSync(join(rt, 'sillyspec.db.corrupt-2026-08-31T00-00-00-000Z'), 'rescue-copy');
  writeFileSync(join(rt, 'other-tool.bak'), 'not-ours');
  writeFileSync(join(rt, 'audit.log'), '{"at":"x"}\n');

  pm.import(cwd, payload, 'c1');

  assert(existsSync(join(rt, 'sillyspec.db')), 'sillyspec.db 主库未被裁');
  assert(readFileSync(join(rt, 'sillyspec.db.bak'), 'utf8') === 'main-fallback-chain',
    '主 sillyspec.db.bak 恢复链未被裁（前缀相似但非 pre-import-）');
  assert(existsSync(join(rt, 'sillyspec.db.corrupt-2026-08-31T00-00-00-000Z')), '.corrupt-<ts> 救援副本未被裁');
  assert(existsSync(join(rt, 'other-tool.bak')), '他者 .bak 未被裁');
  assert(existsSync(join(rt, 'audit.log')), 'audit.log 未被裁');
  assert(listBaks(cwd).length === 1, '同时旧 pre-import 快照确实被裁（裁剪真的生效了）');
}

// ─────────────────────────────────────────
// 4. 非法 KEEP 值降级默认 + 连续 import 幂等
// ─────────────────────────────────────────
console.log('\n--- 4. 非法 KEEP 降级 + 幂等 ---');
{
  const { cwd, pm, payload } = makeFixture();
  seedOldBaks(cwd, ['2026-08-30T22-00-00-000Z', '2026-08-31T01-00-00-000Z'], { withWal: false });

  const prev = process.env.SILLYSPEC_PREIMPORT_BAK_KEEP;
  process.env.SILLYSPEC_PREIMPORT_BAK_KEEP = 'not-a-number';
  const r1 = pm.import(cwd, payload, 'c1');
  process.env.SILLYSPEC_PREIMPORT_BAK_KEEP = '0';
  const r2 = pm.import(cwd, payload, 'c1');
  if (prev === undefined) delete process.env.SILLYSPEC_PREIMPORT_BAK_KEEP;
  else process.env.SILLYSPEC_PREIMPORT_BAK_KEEP = prev;

  assert(r1.ok === true && r2.ok === true, '非法 KEEP 值下 import 仍成功（降级默认，不崩）');
  assert(existsSync(r2.bakPath), 'KEEP=0 也不会把本次快照裁掉（下限钳到 1）');
  const baks = listBaks(cwd);
  assert(baks.length === 1, `连续两次 import 后仍只剩 1 份（幂等，实际 ${baks.length} 份）`);
}

// ─────────────────────────────────────────
// 5. 裁剪 fail-open：目录被抽走也不阻断 import 主流程
// ─────────────────────────────────────────
console.log('\n--- 5. 裁剪失败不阻断 import（fail-open）---');
{
  const { cwd, pm, payload } = makeFixture();
  // 直调私有裁剪：runtime 目录不存在（readdirSync 抛 ENOENT）时必须被调用方吞掉。
  // 注意路径由构造注入的 specDir 决定（cwd 参数不参与解析），故另建一个 specDir 指向虚空的 pm。
  assert(typeof pm._pruneImportBaks === 'function', '_pruneImportBaks 已实现（防「方法不存在」把本例刷成假绿）');
  const voidPm = new ProgressManager({ specDir: join(tmpRoot, 'no-such-project', '.sillyspec') });
  let threw = null;
  try {
    voidPm._pruneImportBaks(join(tmpRoot, 'no-such-project'), null);
  } catch (e) { threw = e; }
  assert(threw !== null && threw.code === 'ENOENT',
    `_pruneImportBaks 对不存在目录如实抛 ENOENT（不静默假成功；实际 ${threw && (threw.code || threw.name)}）`);

  // 而 import 路径把它包在 try 里 —— 主流程照常完成
  const r = pm.import(cwd, payload, 'c1');
  assert(r.ok === true, 'import 主流程不受裁剪异常影响');
}

// 清理（Windows 下偶发 EPERM，吞错不阻断退出码）
try { rmSync(tmpRoot, { recursive: true, force: true }); }
catch { /* temp dir 由 OS 清理 */ }

if (failures > 0) {
  console.error(`\n[preimport-bak-rotation] ❌ ${failures} 项失败`);
  process.exit(1);
}
console.log('\n[preimport-bak-rotation] ✅ 全部通过');
