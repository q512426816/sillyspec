// 验证 H1 checkDepsFreshness（src/worktree-deps.js）—— 统一 doctor / ensureDepsFreshness 的 deps 判定。
// 覆盖 5 状态（fresh/missing/stale/main-drift/failed）+ wtHash≠mainHash→main-drift + 无 lockfile 优雅降级。
// run-tests.mjs 自动收集 *.test.mjs；退出码 0 = 通过。也可 `node test/worktree-deps.test.mjs` 直跑。
import { checkDepsFreshness, lockfileHash } from '../src/worktree-deps.js';
import { createHash } from 'crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, mkdirSync as mkdir } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

let failures = 0;
const assert = (cond, msg) => {
  if (cond) console.log('  ✅ ' + msg);
  else { console.error('  ❌ ' + msg); failures++; }
};

// 与 lockfileHash 同算法的本地镜像，用于构造 meta.depsLockHash 期望值。
const hashOf = (text) => createHash('sha256').update(text).digest('hex').slice(0, 16);

// 每个用例独立 tmp 树（wt + main 两目录），跑完清理。
const newTree = () => {
  const root = mkdtempSync(join(tmpdir(), `sillyspec-deps-fresh-${process.pid}-${Date.now()}-`));
  return {
    wt: join(root, 'wt'),
    main: join(root, 'main'),
    root,
  };
};

console.log('\n[worktree-deps] checkDepsFreshness 5 状态 + main-drift + 无 lockfile 降级');

// Case 1: fresh — wt/main/meta 三者 hash 一致，node_modules 在，depsStatus=linked
{
  const t = newTree();
  mkdir(t.wt, { recursive: true });
  mkdir(t.main, { recursive: true });
  mkdir(join(t.wt, 'node_modules'), { recursive: true });
  writeFileSync(join(t.wt, 'pnpm-lock.yaml'), 'lock-v1');
  writeFileSync(join(t.main, 'pnpm-lock.yaml'), 'lock-v1');
  const meta = { depsStatus: 'linked', depsLockHash: hashOf('lock-v1') };
  const r = checkDepsFreshness(meta, t.wt, t.main);
  assert(r.status === 'fresh', `fresh：三者一致 → status=fresh（实得 ${r.status}）`);
  assert(r.wtHash === hashOf('lock-v1'), 'fresh：wtHash = 当前 wt lockfile hash');
  assert(r.mainHash === hashOf('lock-v1'), 'fresh：mainHash = 主仓 lockfile hash');
  assert(r.metaLockHash === hashOf('lock-v1'), 'fresh：metaLockHash 回显 meta.depsLockHash');
  rmSync(t.root, { recursive: true, force: true });
}

// Case 2: missing — depsStatus=linked 但 node_modules 缺失
{
  const t = newTree();
  mkdir(t.wt, { recursive: true });
  mkdir(t.main, { recursive: true });
  writeFileSync(join(t.wt, 'pnpm-lock.yaml'), 'lock-v1');
  writeFileSync(join(t.main, 'pnpm-lock.yaml'), 'lock-v1');
  // 不建 node_modules
  const meta = { depsStatus: 'linked', depsLockHash: hashOf('lock-v1') };
  const r = checkDepsFreshness(meta, t.wt, t.main);
  assert(r.status === 'missing', `missing：linked 但 node_modules 缺失 → status=missing（实得 ${r.status}）`);
  assert(/node_modules 缺失/.test(r.detail), 'missing：detail 提示 node_modules 缺失');
  rmSync(t.root, { recursive: true, force: true });
}

// Case 3: stale — wt 自身 lockfile 与 meta 快照不一致（wt 也更新到 v2，main 跟到 v2，所以不触发 main-drift）
{
  const t = newTree();
  mkdir(t.wt, { recursive: true });
  mkdir(t.main, { recursive: true });
  mkdir(join(t.wt, 'node_modules'), { recursive: true });
  writeFileSync(join(t.wt, 'pnpm-lock.yaml'), 'lock-v2');
  writeFileSync(join(t.main, 'pnpm-lock.yaml'), 'lock-v2');
  const meta = { depsStatus: 'linked', depsLockHash: hashOf('lock-v1') }; // 旧快照
  const r = checkDepsFreshness(meta, t.wt, t.main);
  assert(r.status === 'stale', `stale：wt lockfile 与 meta 快照不一致 → status=stale（实得 ${r.status}）`);
  assert(/依赖清单变化|lockfile 变化/.test(r.detail), 'stale：detail 提示依赖清单变化（生态中立措辞，2026-08-27 deps-ecosystem-hardcode）');
  assert(r.wtHash === hashOf('lock-v2') && r.metaLockHash === hashOf('lock-v1'), 'stale：wtHash≠metaLockHash');
  rmSync(t.root, { recursive: true, force: true });
}

// Case 4: main-drift — wt 与 meta 一致（非 stale），但 wt ≠ main（主仓 lockfile 漂移）
{
  const t = newTree();
  mkdir(t.wt, { recursive: true });
  mkdir(t.main, { recursive: true });
  mkdir(join(t.wt, 'node_modules'), { recursive: true });
  writeFileSync(join(t.wt, 'pnpm-lock.yaml'), 'lock-v1');
  writeFileSync(join(t.main, 'pnpm-lock.yaml'), 'lock-v2'); // 主仓更新过
  const meta = { depsStatus: 'linked', depsLockHash: hashOf('lock-v1') }; // 与 wt 一致 → 不 stale
  const r = checkDepsFreshness(meta, t.wt, t.main);
  assert(r.status === 'main-drift', `main-drift：wtHash≠mainHash 且非 stale → status=main-drift（实得 ${r.status}）`);
  assert(/主仓不一致|不一致/.test(r.detail), 'main-drift：detail 提示与主仓不一致');
  assert(r.wtHash === hashOf('lock-v1') && r.mainHash === hashOf('lock-v2'), 'main-drift：wtHash≠mainHash');
  rmSync(t.root, { recursive: true, force: true });
}

// Case 5: failed — depsStatus=failed 占最高优先级（即便 lockfile 同时漂移也只报 failed）
{
  const t = newTree();
  mkdir(t.wt, { recursive: true });
  mkdir(t.main, { recursive: true });
  mkdir(join(t.wt, 'node_modules'), { recursive: true });
  writeFileSync(join(t.wt, 'pnpm-lock.yaml'), 'lock-v1');
  writeFileSync(join(t.main, 'pnpm-lock.yaml'), 'lock-v2'); // 同时存在 main-drift
  const meta = { depsStatus: 'failed', depsError: 'pnpm install boom', depsLockHash: hashOf('lock-v1') };
  const r = checkDepsFreshness(meta, t.wt, t.main);
  assert(r.status === 'failed', `failed：depsStatus=failed 最高优先级（实得 ${r.status}）`);
  assert(/pnpm install boom/.test(r.detail), 'failed：detail 含 depsError');
  rmSync(t.root, { recursive: true, force: true });
}

// Case 6: 无 lockfile 优雅降级 — wt/main 均无 lockfile（lockfileHash→null），不报 stale / main-drift
{
  const t = newTree();
  mkdir(t.wt, { recursive: true });
  mkdir(t.main, { recursive: true });
  mkdir(join(t.wt, 'node_modules'), { recursive: true }); // 避开 missing 分支
  // 不写任何 lockfile / package.json
  const meta = { depsStatus: 'linked' }; // 无 depsLockHash
  const r = checkDepsFreshness(meta, t.wt, t.main);
  assert(r.status === 'fresh', `无 lockfile 降级：wtHash/mainHash=null 不报 drift → status=fresh（实得 ${r.status}）`);
  assert(r.wtHash === null, '无 lockfile：wtHash=null');
  assert(r.mainHash === null, '无 lockfile：mainHash=null');
  assert(r.metaLockHash === null, '无 lockfile：metaLockHash=null');
  rmSync(t.root, { recursive: true, force: true });
}

// Case 7: 单边 null 不报 main-drift — wt 有 lockfile，main 无（或反之），不误判 drift
{
  const t = newTree();
  mkdir(t.wt, { recursive: true });
  mkdir(t.main, { recursive: true });
  mkdir(join(t.wt, 'node_modules'), { recursive: true });
  writeFileSync(join(t.wt, 'pnpm-lock.yaml'), 'lock-v1');
  // main 无 lockfile → mainHash=null
  const meta = { depsStatus: 'linked', depsLockHash: hashOf('lock-v1') };
  const r = checkDepsFreshness(meta, t.wt, t.main);
  assert(r.status === 'fresh', `单边 null：mainHash=null 不报 main-drift → status=fresh（实得 ${r.status}）`);
  assert(r.wtHash === hashOf('lock-v1') && r.mainHash === null, '单边 null：wtHash 有值、mainHash=null');
  rmSync(t.root, { recursive: true, force: true });
}

// Case 8: failed 优先于 missing — depsStatus=failed 且 node_modules 缺失，仍报 failed
{
  const t = newTree();
  mkdir(t.wt, { recursive: true });
  mkdir(t.main, { recursive: true });
  writeFileSync(join(t.wt, 'pnpm-lock.yaml'), 'lock-v1');
  writeFileSync(join(t.main, 'pnpm-lock.yaml'), 'lock-v1');
  // 不建 node_modules，但 depsStatus=failed（不在 linked/installed，故 missing 分支本就不命中；这里加固优先级语义）
  const meta = { depsStatus: 'failed' };
  const r = checkDepsFreshness(meta, t.wt, t.main);
  assert(r.status === 'failed', `failed 优先：depsStatus=failed → status=failed（实得 ${r.status}）`);
  rmSync(t.root, { recursive: true, force: true });
}

// Case 9: meta/depsStatus 缺失（未知）+ 一致 lockfile + node_modules 在 → fresh（不报 missing）
{
  const t = newTree();
  mkdir(t.wt, { recursive: true });
  mkdir(t.main, { recursive: true });
  mkdir(join(t.wt, 'node_modules'), { recursive: true });
  writeFileSync(join(t.wt, 'pnpm-lock.yaml'), 'lock-v1');
  writeFileSync(join(t.main, 'pnpm-lock.yaml'), 'lock-v1');
  const meta = {}; // 全空 meta
  const r = checkDepsFreshness(meta, t.wt, t.main);
  assert(r.status === 'fresh', `空 meta + 一致 lockfile → status=fresh（实得 ${r.status}）`);
  rmSync(t.root, { recursive: true, force: true });
}

if (failures > 0) {
  console.error(`\n❌ worktree-deps: ${failures} 项失败\n`);
  process.exit(1);
}
console.log('\n✅ worktree-deps 全部通过\n');
