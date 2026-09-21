/**
 * base-commit-anchor-keepexisting.test.mjs — base_commit 锚点先写先得（R5 对撞实证 F1）
 *
 * 2026-09-21 R5 对撞（round5/r5-collision-ehs-attribution.md P4/N5）：Wave 派发循环每次
 * 渲染都重跑 base 锡点写入，legacy 直写模式用实时 HEAD 覆写既有锚点 → Wave --done 后
 * task 卡 base_commit 漂移到新 HEAD，与 review.json 手写 head 漂移，主代理被迫手工修卡。
 *
 * 契约：
 *   1. writeCommitAnchorToTaskCard(field='base_commit', {keepExisting:true})：已有非空
 *      base_commit 时跳过不覆写（先写先得），返回 false；无锚点时正常首写。
 *   2. writeBaseCommitToTaskCard 走 keepExisting 通道（派发循环重入安全）。
 *   3. head_commit 不受影响：仍为「有则替换」（head 随交付推进，语义本就是最新）。
 *   4. 既有空值锚点（`base_commit:` 尾随空格）+ keepExisting → 视为无值，仍覆写。
 *   5. 不带 keepExisting 的 base 直写保持旧「有则替换」语义（显式刷新通道不回归）。
 */
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { writeCommitAnchorToTaskCard, writeBaseCommitToTaskCard } from '../src/stages/execute.js'

let total = 0, failed = 0
function assert(cond, msg) {
  total++
  if (!cond) { failed++; console.log(`  ❌ FAIL: ${msg}`) }
  else console.log(`  ✅ PASS: ${msg}`)
}

function cardFile(fm) {
  const dir = mkdtempSync(join(tmpdir(), 'anchor-keep-'))
  const p = join(dir, 'task-05.md')
  writeFileSync(p, `---\n${fm}\n---\n\nbody\n`, 'utf8')
  return p
}
const read = p => readFileSync(p, 'utf8')
const SHA1 = 'a7c091b30838ac198b302cb46a96f8c2b8b0f615'
const SHA2 = 'bedaba59c19e4fe1d04de167f68d6bccd0340b03'
const SHA3 = 'b2e28b04a3a9b58820e3d077e261e1bd343eeec8'

console.log('=== base_commit 锚点先写先得（F1，R5 对撞 P4/N5）===\n')

// ── 1: 无锚点首写正常 ──
console.log('--- 场景 1：无锚点 → keepExisting 首写成功 ---')
{
  const p = cardFile('id: task-05\ntitle: t\nrepo: sub-grid-security')
  const ok = writeCommitAnchorToTaskCard(p, 'base_commit', SHA1, { keepExisting: true })
  assert(ok === true, '首写返回 true')
  assert(read(p).includes(`base_commit: ${SHA1}`), '锚点已写入')
  rmSync(join(p, '..'), { recursive: true, force: true })
}

// ── 2: 先写先得（核心）──
console.log('--- 场景 2：已有非空锚点 + keepExisting → 不覆写 ---')
{
  const p = cardFile(`id: task-05\ntitle: t\nrepo: sub-grid-security\nbase_commit: ${SHA1}`)
  const ok = writeCommitAnchorToTaskCard(p, 'base_commit', SHA2, { keepExisting: true })
  assert(ok === false, '重入写入返回 false（跳过）')
  assert(read(p).includes(`base_commit: ${SHA1}`), '锚点保持首写值（未漂移）')
  assert(!read(p).includes(SHA2), '新 HEAD 未混入')
  rmSync(join(p, '..'), { recursive: true, force: true })
}

// ── 3: writeBaseCommitToTaskCard 走 keepExisting 通道 ──
console.log('--- 场景 3：writeBaseCommitToTaskCard 派发循环重入安全 ---')
{
  const p = cardFile('id: task-05\ntitle: t\nrepo: sub-grid-security')
  assert(writeBaseCommitToTaskCard(p, SHA1) === true, '首次落锚 true')
  assert(writeBaseCommitToTaskCard(p, SHA2) === false, 'Wave 重渲染再落锚 false（先写先得）')
  assert(read(p).includes(`base_commit: ${SHA1}`), '锚点仍为首写值')
  rmSync(join(p, '..'), { recursive: true, force: true })
}

// ── 4: head_commit 仍为有则替换 ──
console.log('--- 场景 4：head_commit 语义不回归（有则替换） ---')
{
  const p = cardFile(`id: task-05\ntitle: t\nbase_commit: ${SHA1}\nhead_commit: ${SHA2}`)
  const ok = writeCommitAnchorToTaskCard(p, 'head_commit', SHA3)
  assert(ok === true, 'head 更新返回 true')
  const c = read(p)
  assert(c.includes(`head_commit: ${SHA3}`) && !c.includes(`head_commit: ${SHA2}`), 'head 已替换为最新')
  rmSync(join(p, '..'), { recursive: true, force: true })
}

// ── 5: 空值锚点仍覆写 ──
console.log('--- 场景 5：空值锚点 + keepExisting → 视为无值仍覆写 ---')
{
  const p = cardFile('id: task-05\ntitle: t\nrepo: sub-grid-security\nbase_commit: ')
  const ok = writeCommitAnchorToTaskCard(p, 'base_commit', SHA1, { keepExisting: true })
  assert(ok === true, '空值覆写返回 true')
  assert(read(p).includes(`base_commit: ${SHA1}`), '锚点已补值')
  rmSync(join(p, '..'), { recursive: true, force: true })
}

// ── 6: 不带 keepExisting 的 base 直写保持替换语义（显式刷新通道）──
console.log('--- 场景 6：无 keepExisting 的 base 直写不回归（有则替换） ---')
{
  const p = cardFile(`id: task-05\ntitle: t\nbase_commit: ${SHA1}`)
  const ok = writeCommitAnchorToTaskCard(p, 'base_commit', SHA2)
  assert(ok === true, '显式刷新返回 true')
  assert(read(p).includes(`base_commit: ${SHA2}`) && !read(p).includes(SHA1), '已替换')
  rmSync(join(p, '..'), { recursive: true, force: true })
}

console.log(`\n${failed === 0 ? '✅ ALL PASS' : '❌ FAILURES'}: ${total - failed}/${total}`)
process.exit(failed === 0 ? 0 : 1)
