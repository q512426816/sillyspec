// .runtime 无归属审计类产物的写入侧滚动裁剪契约（2026-09-08 用户反馈④，系统性排查产物）。
// 分野：变更归属类证据（execute-runs/stage-reviews/verify-runs）走归档时精确回收
// （ql-20260908-005/006），不属本模块；本模块锁 pruneTimestampedEntries 的排序口径
// （name/tsRe/mtime）、env 覆盖、幂等、fail-open。
//
// 隔离：cwd 用 os.tmpdir() 临时目录，绝不碰真实 .runtime。
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readdirSync, utimesSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { pruneTimestampedEntries } from '../src/runtime-hygiene.js'

let failures = 0
const assert = (cond, msg) => {
  if (cond) console.log('  ✅ ' + msg)
  else { console.error('  ❌ ' + msg); failures++ }
}

const tmpRoot = mkdtempSync(join(tmpdir(), `sillyspec-runtime-hygiene-${process.pid}-`))
const list = (d) => { try { return readdirSync(d).sort() } catch { return [] } }
const seed = (d, names) => { mkdirSync(d, { recursive: true }); for (const n of names) mkdirSync(join(d, n)) }
const withKeep = (v, fn) => {
  const prev = process.env.SILLYSPEC_RUNTIME_KEEP
  process.env.SILLYSPEC_RUNTIME_KEEP = v
  try { return fn() } finally {
    if (prev === undefined) delete process.env.SILLYSPEC_RUNTIME_KEEP
    else process.env.SILLYSPEC_RUNTIME_KEEP = prev
  }
}

console.log('\n[runtime-hygiene] .runtime 时间戳条目滚动裁剪')

// ─────────────────────────────────────────
console.log('\n--- 1. name 字典序：统一前缀时间戳条目 ---')
{
  const d = join(tmpRoot, 'wr', 'workflow-runs')
  seed(d, [])
  for (const n of ['20260901010101-a-pass.json', '20260902020202-b-fail.json', '20260903030303-c-pass.json', '20260904040404-d-pass.json']) {
    writeFileSync(join(d, n), '{}')
  }
  const removed = pruneTimestampedEntries({ dir: d, keep: 2 })
  assert(removed === 2, `keep=2 裁掉 2 份最旧（实际裁 ${removed}）`)
  const left = list(d)
  assert(left.join(',') === '20260903030303-c-pass.json,20260904040404-d-pass.json', '保留的是最新两份（字典序==时间序）')

  // 幂等：再跑一次零删除
  assert(pruneTimestampedEntries({ dir: d, keep: 2 }) === 0, '幂等：keep 内重复调用零删除')
}

// ─────────────────────────────────────────
console.log('\n--- 2. tsRe：混合前缀目录（前缀字母序≠时间序）---')
{
  const d = join(tmpRoot, 'sr', 'mixed')
  // 前缀晚的条目时间早——纯 name 排序会把新前缀全裁光
  seed(d, [
    'alpha-2026-09-08-120000',
    'beta-2026-09-07-110000',
    'beta-2026-09-06-100000',
    'gamma-2026-09-05-090000',
  ])
  pruneTimestampedEntries({ dir: d, keep: 2, tsRe: /\d{4}-\d{2}-\d{2}-\d{6}/ })
  const left = list(d)
  assert(left.join(',') === 'alpha-2026-09-08-120000,beta-2026-09-07-110000',
    `tsRe 按内嵌时间序保留最新 2（跨前缀；实际剩 ${left.join(',')}）`)

  // 提取不到时间戳的杂项条目沉底（视为最新不误删）
  seed(d, ['hand-written-notes'])
  pruneTimestampedEntries({ dir: d, keep: 2, tsRe: /\d{4}-\d{2}-\d{2}-\d{6}/ })
  assert(list(d).includes('hand-written-notes'), '无时间戳条目保守沉底不裁')
}

// ─────────────────────────────────────────
console.log('\n--- 3. mtime 排序：时间戳在尾部的文件（artifacts 形态）---')
{
  const d = join(tmpRoot, 'art', 'artifacts')
  mkdirSync(d, { recursive: true })
  // 文件名前缀是变更名（自带日期但时序不严格），真实新旧由 mtime 决定
  const files = [
    ['2026-09-01-old-change-step1-20260901100000.txt', new Date('2026-09-01T10:00:00Z')],
    ['2026-09-08-new-change-step1-20260908090000.txt', new Date('2026-09-08T09:00:00Z')],
    ['2026-09-03-mid-change-step1-20260903120000.txt', new Date('2026-09-03T12:00:00Z')],
  ]
  for (const [f, t] of files) { writeFileSync(join(d, f), 'x'); utimesSync(join(d, f), t, t) }
  pruneTimestampedEntries({ dir: d, keep: 2, orderBy: 'mtime' })
  const left = list(d)
  assert(left.join(',') === '2026-09-03-mid-change-step1-20260903120000.txt,2026-09-08-new-change-step1-20260908090000.txt',
    `mtime 序保留最新 2 份文件（实际剩 ${left.join(',')}）`)
}

// ─────────────────────────────────────────
console.log('\n--- 4. fail-open + env 覆盖 ---')
{
  assert(pruneTimestampedEntries({ dir: join(tmpRoot, 'no-such-dir'), keep: 5 }) === 0,
    '目录缺失返回 0 不抛（该仓库从未走过此流程）')

  const d = join(tmpRoot, 'envkeep', 'workflow-runs')
  seed(d, [])
  for (const n of ['20260901010101-a.json', '20260902020202-b.json', '20260903030303-c.json']) {
    writeFileSync(join(d, n), '{}')
  }
  withKeep('1', () => pruneTimestampedEntries({ dir: d, keep: 30 }))
  assert(list(d).length === 1, 'SILLYSPEC_RUNTIME_KEEP=1 覆盖调用方默认 30')
  withKeep('0', () => pruneTimestampedEntries({ dir: d, keep: 30 }))
  assert(list(d).length === 1, '非法 env（0）回落调用方 keep 且下限 1（不裁光）')
  withKeep('not-a-number', () => pruneTimestampedEntries({ dir: d, keep: 2 }))
  assert(list(d).length === 1, '非法 env（非数字）回落调用方默认')
}

try { rmSync(tmpRoot, { recursive: true, force: true }) } catch { /* temp 由 OS 清理 */ }

if (failures > 0) {
  console.error(`\n[runtime-hygiene] ❌ ${failures} 项失败`)
  process.exit(1)
}
console.log('\n[runtime-hygiene] ✅ 全部通过')
