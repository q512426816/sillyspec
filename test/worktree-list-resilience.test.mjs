/**
 * 2026-10-05-wt-list-resilience 回归：WorktreeManager.list() 对缺字段 meta 的读侧归一化
 *
 * 背景（2026-10-05 实证）：注册表（.sillyspec/.runtime/worktrees/）混入缺 changeName/branch
 * 的 meta（2026-09-27 e2e 手测残留 4 个 mode:"native" 旧形态件），list() 原样透传 undefined，
 * CLI `worktree list` 渲染 i.changeName.length 直接 TypeError 崩溃；doctor 孤儿匹配
 * （metaNames 集合）也因 undefined 失配。
 *
 * 锁定语义：
 *   1. 缺 changeName/branch 的 meta → 兜底目录名/'-'，恒为 string（FR-01）
 *   2. 完整 meta → changeName/branch 取原值逐字不变（FR-02）
 *   3. 解析失败（非法 JSON）meta → 跳过不进列表不抛错（FR-03）
 *   4. 空字符串字段等同缺失（走兜底，防 ''.length===0 渲染零宽列）
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { WorktreeManager } from '../src/worktree.js'

let passed = 0, failed = 0
const failures = []
function assert(cond, msg) {
  if (cond) { passed++; console.log(`  ✅ PASS: ${msg}`) }
  else { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
}

console.log('=== list() 缺字段 meta 读侧归一化（2026-10-05-wt-list-resilience）===\n')

{
  const registry = mkdtempSync(join(tmpdir(), 'wt-list-res-'))
  const mkMeta = (dir, obj) => {
    mkdirSync(join(registry, dir), { recursive: true })
    writeFileSync(join(registry, dir, 'meta.json'), JSON.stringify(obj))
  }
  // 完整件（对照组——原值透传不变）
  mkMeta('2026-09-01-full-change', {
    changeName: '2026-09-01-full-change', branch: 'sillyspec/2026-09-01-full-change',
    baseHash: 'abc123', createdAt: '2026-09-01T00:00:00.000Z',
    worktreePath: join(registry, '2026-09-01-full-change'), mode: 'worktree',
  })
  // 实证形态①：缺 changeName + 缺 branch（e2e 残留 mode:"native"）
  mkMeta('b2-leftover', { worktreePath: join(registry, 'b2-leftover'), mode: 'native', baseHash: 'deadbeef' })
  // 实证形态②：连 branch/createdAt 都缺
  mkMeta('meta-leftover', { worktreePath: join(registry, 'meta-leftover'), mode: 'native', depsStatus: 'failed' })
  // 空字符串字段：等同缺失走兜底
  mkMeta('empty-strings', { changeName: '', branch: '', mode: 'worktree' })
  // 解析失败件：跳过不进列表
  mkdirSync(join(registry, 'broken-json'), { recursive: true })
  writeFileSync(join(registry, 'broken-json', 'meta.json'), '{ not valid json !!')
  // 无 meta 目录：既有跳过语义保持
  mkdirSync(join(registry, 'no-meta-dir'), { recursive: true })

  // worktreeDir 注入——registry 直用临时目录，零 git 依赖
  const wm = new WorktreeManager({ cwd: tmpdir(), worktreeDir: registry })
  const items = wm.list()

  console.log('--- ① 缺字段 meta 兜底列出不崩溃（changeName=目录名、branch=-）---')
  const b2 = items.find(i => i.changeName === 'b2-leftover')
  assert(!!b2, 'b2-leftover 在列（changeName 兜底=目录名）')
  assert(b2 && b2.branch === '-', 'b2-leftover branch 兜底 "-"')
  assert(b2 && typeof b2.changeName === 'string' && typeof b2.branch === 'string', '兜底字段恒为 string（渲染器 .length 安全）')
  const metaLeft = items.find(i => i.changeName === 'meta-leftover')
  assert(!!metaLeft && metaLeft.branch === '-', 'meta-leftover（仅 mode/deps 字段）双兜底在列')
  const empty = items.find(i => i.changeName === 'empty-strings')
  assert(!!empty && empty.branch === '-', '空字符串字段等同缺失走兜底')
  // 消费端等价性：渲染器口径全量 .length 不抛（旧实现此循环 TypeError）
  let renderOk = true
  try { for (const i of items) { void String(i.changeName).length; void String(i.branch).length } }
  catch { renderOk = false }
  assert(renderOk, '渲染器口径（逐项 .length）全量不抛')

  console.log('--- ② 完整 meta 原值透传不变 ---')
  const full = items.find(i => i.changeName === '2026-09-01-full-change')
  assert(!!full, '完整件在列')
  assert(full && full.branch === 'sillyspec/2026-09-01-full-change', '完整件 branch 原值')
  assert(full && full.baseHash === 'abc123' && full.mode === 'worktree', '完整件其余字段原值（baseHash/mode）')

  console.log('--- ③ 解析失败 meta 跳过不进列表 ---')
  assert(items.length === 4, `列表共 4 项（解析失败与无 meta 目录跳过；实得 ${items.length}：${items.map(i => i.changeName).join(',')}）`)
  assert(!items.some(i => i.changeName === 'broken-json'), '解析失败件不进列表')
  assert(!items.some(i => i.changeName === 'no-meta-dir'), '无 meta 目录不进列表（既有语义保持）')

  rmSync(registry, { recursive: true, force: true })
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
if (failures.length) { console.log('失败项:'); failures.forEach(f => console.log('  - ' + f)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
