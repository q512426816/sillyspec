/**
 * green-cache（R8 对撞修复，2026-09-23）：verify 门禁绿结果指纹缓存。
 *
 * 锁死契约：
 * 1. filterCodePorcelain：.sillyspec/、docs/、*.md 剔除（rename 两侧任一命中即剔），
 *    代码面保留，同输入排序稳定——verify 收敛循环里的 verify-result.md 修订不击穿指纹。
 * 2. store/lookup 往返：同指纹命中（cached:true + ageMs）；异指纹 miss；TTL 过期 miss
 *    （时钟注入，默认 30min）；SILLYSPEC_GREEN_CACHE_OFF=1 双向关；TTL_MIN env 覆盖。
 * 3. computeGateFingerprint：非 git 目录 null；同状态稳定；代码脏面变化敏感；
 *    local.yaml 内容变化敏感（换 commands 不吃旧结果）。
 * 4. greenCacheNotice 披露行：label + 未重跑声明 + 逃生阀提示 + 年龄分钟。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import {
  filterCodePorcelain, computeGateFingerprint, lookupGreenCache, storeGreenCache, greenCacheNotice,
} from '../src/run/green-cache.js'

const tmpRoots = []
function mk(p) { const d = mkdtempSync(join(tmpdir(), p)); tmpRoots.push(d); return d }
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

// ── 1. 代码面过滤口径 ───────────────────────────────────────────────

test('T1 filterCodePorcelain：文档面剔除（含 rename 两侧）、代码面保留、排序稳定', () => {
  const porcelain = [
    ' M .sillyspec/changes/x/verify-result.md',
    ' M docs/sillyspec/sync.md',
    ' M README.md',
    ' M src/a.js',
    '?? test/b.test.mjs',
    'R  old.md -> new.md',
    'R  src/old.js -> src/new.js',
  ].join('\n')
  const out = filterCodePorcelain(porcelain)
  assert.deepEqual(out, [' M src/a.js', '?? test/b.test.mjs', 'R  src/old.js -> src/new.js'].sort(), '仅代码面保留且排序')
  assert.deepEqual(filterCodePorcelain(porcelain), out, '同输入同输出（排序稳定）')
  assert.deepEqual(filterCodePorcelain(''), [], '空输入空数组')
  assert.deepEqual(filterCodePorcelain(null), [], 'null 容忍')
})

// ── 2. 缓存存取语义 ─────────────────────────────────────────────────

test('T2 store/lookup 往返：同指纹命中、异指纹 miss、TTL 过期 miss（时钟注入）', () => {
  const root = mk('gc-a')
  const base = { runtimeRoot: root, scope: 'change:t1', kind: 'test', fingerprint: 'fp1' }
  assert.ok(storeGreenCache({ ...base, result: { status: 'passed', exitCode: 0 }, now: 1000 }), 'store ok')
  const hit = lookupGreenCache({ ...base, now: 1000 + 5 * 60_000 })
  assert.ok(hit && hit.cached === true, '同指纹命中且带 cached 标')
  assert.equal(hit.ageMs, 5 * 60_000, 'ageMs 为距今时长')
  assert.equal(hit.result.status, 'passed', '结果原样回带')
  assert.equal(lookupGreenCache({ ...base, fingerprint: 'fp2', now: 1000 }), null, '异指纹 miss')
  assert.equal(lookupGreenCache({ ...base, now: 1000 + 31 * 60_000 }), null, '默认 TTL 30min 过期 miss')
  assert.ok(lookupGreenCache({ ...base, now: 1000 + 29 * 60_000 }), '29min 仍在 TTL 内命中')
})

test('T2b 阀与 TTL 覆盖：OFF=1 双向关；SILLYSPEC_GREEN_CACHE_TTL_MIN 生效', () => {
  const root = mk('gc-b')
  const base = { runtimeRoot: root, scope: 'change:t2', kind: 'lint', fingerprint: 'fp1' }
  const off = { SILLYSPEC_GREEN_CACHE_OFF: '1' }
  assert.equal(storeGreenCache({ ...base, result: { status: 'passed' }, now: 0, env: off }), false, 'OFF 下不写')
  assert.ok(storeGreenCache({ ...base, result: { status: 'passed' }, now: 0, env: {} }), '无阀可写')
  assert.equal(lookupGreenCache({ ...base, now: 10, env: off }), null, 'OFF 下不读')
  assert.equal(lookupGreenCache({ ...base, now: 2 * 60_000, env: { SILLYSPEC_GREEN_CACHE_TTL_MIN: '1' } }), null, 'TTL_MIN=1 已过期')
  assert.ok(lookupGreenCache({ ...base, now: 2 * 60_000, env: { SILLYSPEC_GREEN_CACHE_TTL_MIN: '60' } }), 'TTL_MIN=60 命中')
})

// ── 3. 指纹敏感性 ───────────────────────────────────────────────────

test('T3 computeGateFingerprint：非仓 null；同状态稳定；代码脏面/local.yaml 变化→指纹变', () => {
  const d = mk('gc-git-')
  assert.equal(computeGateFingerprint({ cwd: d, specBase: d }), null, '非 git 目录 null（调用方按 miss 处理）')
  const git = (args) => execFileSync('git', args, { cwd: d, stdio: 'ignore' })
  git(['init', '-q'])
  git(['config', 'user.email', 't@t'])
  git(['config', 'user.name', 't'])
  writeFileSync(join(d, 'a.js'), '1')
  git(['add', 'a.js'])
  git(['commit', '-qm', 'init'])
  mkdirSync(join(d, 'spec'), { recursive: true })
  writeFileSync(join(d, 'spec', 'local.yaml'), 'commands:\n  test: npm test\n')
  const fp1 = computeGateFingerprint({ cwd: d, specBase: join(d, 'spec') })
  assert.ok(fp1, '真仓返回指纹')
  assert.equal(computeGateFingerprint({ cwd: d, specBase: join(d, 'spec') }), fp1, '同状态稳定')
  // 文档面脏（verify 收敛循环修订 verify-result.md 场景）不击穿
  mkdirSync(join(d, '.sillyspec'), { recursive: true })
  writeFileSync(join(d, '.sillyspec', 'verify-result.md'), '内容修订')
  assert.equal(computeGateFingerprint({ cwd: d, specBase: join(d, 'spec') }), fp1, '.sillyspec 脏面不击穿指纹')
  // 代码脏面击穿
  writeFileSync(join(d, 'a.js'), '2')
  const fp2 = computeGateFingerprint({ cwd: d, specBase: join(d, 'spec') })
  assert.notEqual(fp2, fp1, '代码脏面变化 → 指纹变')
  // local.yaml 变化击穿（换 commands 防吃旧结果）
  writeFileSync(join(d, 'spec', 'local.yaml'), 'commands:\n  test: npm run other\n')
  const fp3 = computeGateFingerprint({ cwd: d, specBase: join(d, 'spec') })
  assert.notEqual(fp3, fp2, 'local.yaml 变化 → 指纹变')
})

// ── 4. 披露行 ───────────────────────────────────────────────────────

test('T4 greenCacheNotice：label + 未重跑声明 + 逃生阀 + 年龄分钟', () => {
  const s = greenCacheNotice({ ageMs: 90_000 }, 'verify-test')
  assert.ok(s.includes('verify-test'), 'label 在场')
  assert.ok(s.includes('未重跑'), '明示本次未重跑')
  assert.ok(s.includes('SILLYSPEC_GREEN_CACHE_OFF'), '逃生阀提示在场')
  assert.ok(s.includes('2 分钟'), '年龄分钟在场（90s → 2 分钟）')
})
