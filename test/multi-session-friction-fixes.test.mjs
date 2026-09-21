/**
 * 多会话摩擦三修复（ql-20260921-009，2026-09-21 batch2 归档全程实证）：
 *
 * ① quick 守卫 TTL——collectActiveQuickGuardFiles（apply 相交拦截消费口）按 guard.json
 *    mtime 超 4h 过期；quicklog ID 预留（collectGuardReservedQuicklogIds）保持 7 天 startedAt
 *    口径不受影响。实证形态：36h 幽灵守卫拦 apply。
 * ② 交付包含判定（合并感知未-apply）——detectDeliverableContained 只读三方合并测试：
 *    merge(base, ours=主仓现状, theirs=worktree) clean 且 === 主仓现状 ⟺ 交付 delta 已全在
 *    主仓（差异=并行增量）。归档门（applyWorktree changedFiles）与清理门（_changesAlreadyOnMain）
 *    双侧消费。实证形态：EXCLUDE-DIRTY/MISMATCH 三方合并落地后字节等值恒误拦。
 * ③ quick 启动并发错峰建议——detectQuickConcurrencyAdvice：他者活跃守卫（TTL 过滤后）≥1
 *    且主仓有 src/test 脏文件 → suggest。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, utimesSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execSync } from 'node:child_process'
import {
  collectActiveQuickGuardFiles,
  collectGuardReservedQuicklogIds,
  detectQuickConcurrencyAdvice,
} from '../src/quicklog.js'
import { detectDeliverableContained } from '../src/worktree.js'

const roots = []
function mk(p) { const d = mkdtempSync(join(tmpdir(), p)); roots.push(d); return d }
test.after(() => { for (const d of roots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

const H = 3600 * 1000

/** 建守卫目录（mtime 偏移小时数可注入；startedAt 一并按同偏移写，7 天僵尸窗口不触发） */
function makeGuard(sessionsDir, id, { allowedFiles = [], mtimeAgeH = 0, quicklogId = null } = {}) {
  const dir = join(sessionsDir, id)
  mkdirSync(dir, { recursive: true })
  const startedAtMs = Date.now() - mtimeAgeH * H
  const guard = { sessionId: id, allowedFiles, startedAt: new Date(startedAtMs).toISOString() }
  if (quicklogId) guard.quicklogId = quicklogId
  const p = join(dir, 'guard.json')
  writeFileSync(p, JSON.stringify(guard))
  const t = new Date(startedAtMs)
  utimesSync(p, t, t)
  return p
}

// ── ① 守卫 TTL ────────────────────────────────────────────────────

test('T1 TTL：mtime >4h 守卫从拦截面剔除，≤4h 与无 guard 会话保留（36h 幽灵实证复刻）', () => {
  const specBase = mk('ttl-')
  const sessionsDir = join(specBase, '.runtime', 'quick-sessions')
  mkdirSync(sessionsDir, { recursive: true })
  makeGuard(sessionsDir, 'quick-fresh', { allowedFiles: ['src/a.js'], mtimeAgeH: 1 })
  makeGuard(sessionsDir, 'quick-ghost36h', { allowedFiles: ['src/run/prompt.js'], mtimeAgeH: 36 })
  mkdirSync(join(sessionsDir, 'quick-noguard'), { recursive: true }) // 无 guard.json → 空声明条目

  const now = Date.now()
  const guards = collectActiveQuickGuardFiles(specBase, { excludeChange: 'quick-self', nowMs: now })
  assert.ok(guards.has('quick-fresh'), 'T1: 1h 守卫在拦截面')
  assert.deepEqual(guards.get('quick-fresh'), ['src/a.js'], 'T1: 声明文件原样')
  assert.ok(!guards.has('quick-ghost36h'), 'T1: 36h 幽灵守卫 TTL 过期剔除（batch2 实证形态）')
  assert.ok(guards.has('quick-noguard'), 'T1: 无 guard 会话保留为空声明（既有行为）')
  assert.deepEqual(guards.get('quick-noguard'), [])

  // 边界贴线：恰 4h 不剔、4h+1ms 剔
  makeGuard(sessionsDir, 'quick-4h', { allowedFiles: ['src/b.js'], mtimeAgeH: 4 })
  assert.ok(collectActiveQuickGuardFiles(specBase, { nowMs: now }).has('quick-4h'), 'T1: 恰 4h 不过期（> 判定）')

  // 回退口径：staleAfterMs=null 关 TTL（遗留全量行为）
  const legacy = collectActiveQuickGuardFiles(specBase, { nowMs: now, staleAfterMs: null })
  assert.ok(legacy.has('quick-ghost36h'), 'T1: null 关闭 TTL=遗留口径')

  // excludeChange 语义不回归
  const selfExcluded = collectActiveQuickGuardFiles(specBase, { excludeChange: 'quick-fresh', nowMs: now })
  assert.ok(!selfExcluded.has('quick-fresh'), 'T1: 排除自身会话')
})

test('T2 quicklog ID 预留不套 TTL：36h 幽灵的 qlId 仍被预留（7 天 startedAt 口径原样）', () => {
  const specBase = mk('reserve-')
  const sessionsDir = join(specBase, '.runtime', 'quick-sessions')
  mkdirSync(sessionsDir, { recursive: true })
  makeGuard(sessionsDir, 'quick-ghost36h', { allowedFiles: [], mtimeAgeH: 36, quicklogId: 'ql-20260921-009-c2d3' })
  const reserved = collectGuardReservedQuicklogIds(specBase, sessionsDir, Date.now())
  assert.deepEqual(reserved.get('ql-20260921-009-c2d3'), ['quick-ghost36h'], 'T2: 预留口径不受拦截 TTL 影响')
})

// ── ② 交付包含判定 ────────────────────────────────────────────────

function initRepo(dir) {
  execSync('git init -q', { cwd: dir })
  execSync('git config user.email t@t', { cwd: dir })
  execSync('git config user.name t', { cwd: dir })
}

test('T3 包含：主仓=交付 delta+并行增量（不同区域）→ 判已含；快路径相等 → 判已含', () => {
  const repo = mk('contain-')
  initRepo(repo)
  writeFileSync(join(repo, 'a.js'), 'A\nB\nC\n')
  writeFileSync(join(repo, 'same.js'), 'x\n')
  execSync('git add -A && git commit -qm base', { cwd: repo })
  const baseRef = execSync('git rev-parse HEAD', { cwd: repo }).toString().trim()

  const wt = join(repo, 'wt') // 模拟 worktree 侧目录（无需真 worktree，helper 只读文件）
  mkdirSync(wt)
  // a.js：mine 在尾部加 D（交付 delta，尾部区域）；main 顶部加 Z（并行增量，不同区域）且已含 D
  // ——复刻 EXCLUDE-DIRTY/MISMATCH 三方合并落地后的真实形态（区域不重叠，重合并 clean）
  writeFileSync(join(wt, 'a.js'), 'A\nB\nC\nD\n')
  writeFileSync(join(repo, 'a.js'), 'Z\nA\nB\nC\nD\n')
  // same.js：内容相等（快路径）
  writeFileSync(join(wt, 'same.js'), 'x\n')

  const contained = detectDeliverableContained({ projectRoot: repo, worktreePath: wt, baseRef }, ['a.js', 'same.js'])
  assert.deepEqual(contained, ['a.js', 'same.js'], 'T3: delta 已含（差异=并行 Z）与相等快路径均判已含')

  // 同位追加（双方都改同一区域）→ merge-file 冲突 → fail-safe 不剔（归 T4 口径，此处钉语义）
  writeFileSync(join(wt, 'b.js'), 'A\nB\nC\nD\n')
  writeFileSync(join(repo, 'b.js'), 'A\nB\nC\nD\nE\n')
  writeFileSync(join(repo, 'c.js'), 'A\nB\nC\n')
  execSync('git add b.js c.js && git commit -qm b', { cwd: repo }) // b/c 进 base 后再同位分叉
  const baseRef2 = execSync('git rev-parse HEAD', { cwd: repo }).toString().trim()
  writeFileSync(join(repo, 'b.js'), 'A\nB\nC\nD\nE\n')
  assert.deepEqual(
    detectDeliverableContained({ projectRoot: repo, worktreePath: wt, baseRef: baseRef2 }, ['b.js']),
    [], 'T3: 同区域追加=冲突区 → 保守不剔（宁误拦不误放）',
  )
})

test('T4 不包含：main 缺交付 delta → 不剔；同行改写冲突 → 不剔（fail-safe）', () => {
  const repo = mk('notcontain-')
  initRepo(repo)
  writeFileSync(join(repo, 'a.js'), 'A\nB\nC\n')
  writeFileSync(join(repo, 'c.js'), 'A\nB\nC\n')
  execSync('git add -A && git commit -qm base', { cwd: repo })
  const baseRef = execSync('git rev-parse HEAD', { cwd: repo }).toString().trim()

  const wt = join(repo, 'wt')
  mkdirSync(wt)
  // a.js：mine 加 D，main 只有并行 E（无 D）→ delta 未到 → 不含
  writeFileSync(join(wt, 'a.js'), 'A\nB\nC\nD\n')
  writeFileSync(join(repo, 'a.js'), 'A\nB\nC\nE\n')
  // c.js：双方改同一行 B → merge-file 冲突 → 不含
  writeFileSync(join(wt, 'c.js'), 'A\nB-mine\nC\n')
  writeFileSync(join(repo, 'c.js'), 'A\nB-theirs\nC\n')

  const contained = detectDeliverableContained({ projectRoot: repo, worktreePath: wt, baseRef }, ['a.js', 'c.js'])
  assert.deepEqual(contained, [], 'T4: delta 未到与同行冲突均保守不剔（宁误拦不误放）')
})

test('T5 边界：base 缺席且内容不等 / worktree 文件缺失 / 空入参 → 不剔不炸；新文件相等 → 快路径判已含', () => {
  const repo = mk('edge-')
  initRepo(repo)
  writeFileSync(join(repo, 'keep.js'), 'x\n')
  execSync('git add -A && git commit -qm base', { cwd: repo })
  const baseRef = execSync('git rev-parse HEAD', { cwd: repo }).toString().trim()
  const wt = join(repo, 'wt')
  mkdirSync(wt)
  writeFileSync(join(wt, 'new-diff.js'), 'mine\n')           // base 无此文件且内容不等 → base 取不到保守不剔
  writeFileSync(join(repo, 'new-diff.js'), 'theirs\n')
  writeFileSync(join(wt, 'new-same.js'), 'brand new\n')      // base 无此文件但内容相等 → 快路径判已含（交付确在主仓）
  writeFileSync(join(repo, 'new-same.js'), 'brand new\n')
  writeFileSync(join(wt, 'gone.js'), 'wt-only\n')            // main 无此文件（readFileSync 失败）
  const contained = detectDeliverableContained({ projectRoot: repo, worktreePath: wt, baseRef }, ['new-diff.js', 'new-same.js', 'gone.js'])
  assert.deepEqual(contained, ['new-same.js'], 'T5: 相等快路径判已含；base 缺席/不可读保守不剔')
  assert.deepEqual(detectDeliverableContained({ projectRoot: repo, worktreePath: wt, baseRef }, []), [], 'T5: 空入参')
  assert.deepEqual(detectDeliverableContained({ projectRoot: repo, worktreePath: wt, baseRef: null }, ['keep.js']), [], 'T5: baseRef 缺省直接空')
})

// ── ③ quick 并发错峰建议 ──────────────────────────────────────────

test('T6 建议：他者活跃守卫≥1 + 主仓 src/test 脏 → suggest；单会话/无 src 脏 → 不建议', () => {
  const specBase = mk('advice-')
  const sessionsDir = join(specBase, '.runtime', 'quick-sessions')
  mkdirSync(sessionsDir, { recursive: true })
  makeGuard(sessionsDir, 'quick-other', { allowedFiles: ['src/run/prompt.js'], mtimeAgeH: 0.5 })
  makeGuard(sessionsDir, 'quick-ghost', { allowedFiles: ['src/x.js'], mtimeAgeH: 30 })
  const now = Date.now()

  const hit = detectQuickConcurrencyAdvice({ specBase, changeName: 'quick-self', baselineFiles: ['docs/a.md', 'src/b.js'], nowMs: now })
  assert.equal(hit.suggest, true, 'T6: 活跃他者+src 脏 → 建议')
  assert.deepEqual(hit.others, ['quick-other'], 'T6: others 只列 TTL 存活者（幽灵不计）')

  const noOther = detectQuickConcurrencyAdvice({ specBase, changeName: 'quick-other', baselineFiles: ['src/b.js'], nowMs: now })
  assert.equal(noOther.suggest, false, 'T6: 排除自身后无他者 → 不建议')

  const noSrcDirty = detectQuickConcurrencyAdvice({ specBase, changeName: 'quick-self', baselineFiles: ['docs/a.md'], nowMs: now })
  assert.equal(noSrcDirty.suggest, false, 'T6: 脏文件非 src/test → 不建议')

  const onlyGhost = (() => { // 只剩幽灵守卫在场
    rmSync(join(sessionsDir, 'quick-other'), { recursive: true, force: true })
    return detectQuickConcurrencyAdvice({ specBase, changeName: 'quick-self', baselineFiles: ['src/b.js'], nowMs: now })
  })()
  assert.equal(onlyGhost.suggest, false, 'T6: 唯一在场者是 TTL 过期幽灵 → 不建议（过期守卫不应触发建议噪音）')
})
