/**
 * change title 回填测试 —— 完整流程 change 创建时写 title + proposal 落盘刷新 + rename 保留。
 *
 * 背景：changes.title 列已存在（db.js migration），原设计 quick 回填、完整流程留空。
 * 改动后：完整流程 change 创建时（command.js initChange）即写 title（--input/name 兜底），
 * proposal/design 落盘后（complete.js 通用完成路径）deriveTitleFromLinkedChange 刷新为 # 标题，
 * rename 时 title 保留。
 *
 * 本测试覆盖机制三段（initChange 写 / deriveTitleFromLinkedChange 提取 + updateChangeMeta 刷新 /
 * rename 保留）。complete.js 的接线（调这两个函数）由 code review + completeStep 既有测试覆盖。
 *
 * 模式：复用 _complete-step-harness.mjs（makeRepo/cleanup/report），白盒 pm._ensureDB 读 changes.title。
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { ProgressManager } from '../src/progress.js'
import { deriveTitleFromLinkedChange } from '../src/quicklog.js'
import { makeRepo, cleanup, report } from './_complete-step-harness.mjs'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => {
  cond ? (count.passed++, console.log(`  ✅ ${msg}`))
    : (count.failed++, count.failures.push(msg), console.log(`  ❌ ${msg}`))
}

function readChangeTitle(pm, cwd, name) {
  const db = pm._ensureDB(cwd).getDb()
  const row = db.prepare('SELECT title FROM changes WHERE name = ?').get(name)
  return row ? row.title : undefined
}

console.log('change title 回填测试（创建时写 + proposal 落盘刷新 + rename 保留）\n')

// ── Case 1：initChange 传 title → db 写入（创建时即写，对应 command.js initChange meta.title）──
console.log('--- Case 1：initChange 传 title → db changes.title ---')
{
  const { cwd, specBase } = makeRepo('title-create-')
  const pm = new ProgressManager({ specDir: specBase })
  await pm.init(cwd)
  await pm.initChange(cwd, '2026-08-13-add-login', { title: '加登录限流' })
  assert(
    readChangeTitle(pm, cwd, '2026-08-13-add-login') === '加登录限流',
    'initChange 传 title → db changes.title 写入'
  )
}

// ── Case 2：initChange 不传 title → null（向后兼容，旧调用方不破）──
console.log('\n--- Case 2：initChange 不传 title → null ---')
{
  const { cwd, specBase } = makeRepo('title-null-')
  const pm = new ProgressManager({ specDir: specBase })
  await pm.init(cwd)
  await pm.initChange(cwd, '2026-08-13-no-title')
  assert(
    readChangeTitle(pm, cwd, '2026-08-13-no-title') === null,
    'initChange 不传 title → db changes.title = null（向后兼容）'
  )
}

// ── Case 3：proposal 落盘 → deriveTitleFromLinkedChange 提取 # 标题 + updateChangeMeta 刷新 ──
// 模拟 brainstorm 完成（proposal.md 落盘）后 complete.js 通用完成路径的 title 刷新。
console.log('\n--- Case 3：proposal 落盘 → 提取 # 标题 + 刷新 ---')
{
  const { cwd, specBase } = makeRepo('title-proposal-')
  const pm = new ProgressManager({ specDir: specBase })
  await pm.init(cwd)
  await pm.initChange(cwd, '2026-08-13-captcha', { title: 'temp-captcha' })
  // brainstorm 产出 proposal.md（首个 # 标题含「提案书（Proposal）—」固定前缀）
  const changeDir = join(specBase, 'changes', '2026-08-13-captcha')
  writeFileSync(join(changeDir, 'proposal.md'), '# 提案书（Proposal）— 滑块验证码\n\n正文\n')
  const derived = deriveTitleFromLinkedChange(specBase, '2026-08-13-captcha')
  assert(
    derived === '滑块验证码',
    `deriveTitleFromLinkedChange 从 proposal 首个 # 标题提取（去「提案书（Proposal）—」前缀）: got ${JSON.stringify(derived)}`
  )
  // complete.js 通用完成路径：非空则 updateChangeMeta 刷新
  pm.updateChangeMeta(cwd, '2026-08-13-captcha', { title: derived })
  assert(
    readChangeTitle(pm, cwd, '2026-08-13-captcha') === '滑块验证码',
    'updateChangeMeta 刷新 title = proposal 首个 # 标题（覆盖创建时的 temp 兜底）'
  )
}

// ── Case 4：proposal 无 # 标题 → deriveTitleFromLinkedChange 返回 ''，不刷新（不覆盖现有 title）──
console.log('\n--- Case 4：proposal 无 # 标题 → 不刷新（保留现有 title）---')
{
  const { cwd, specBase } = makeRepo('title-no-h1-')
  const pm = new ProgressManager({ specDir: specBase })
  await pm.init(cwd)
  await pm.initChange(cwd, '2026-08-13-noH1', { title: '保留我' })
  const changeDir = join(specBase, 'changes', '2026-08-13-noH1')
  writeFileSync(join(changeDir, 'proposal.md'), '无一级标题的 proposal\n\n正文\n')
  const derived = deriveTitleFromLinkedChange(specBase, '2026-08-13-noH1')
  assert(derived === '', 'proposal 无 # 标题 → deriveTitleFromLinkedChange 返回空串')
  // complete.js: if (refinedTitle) 才刷新 → 空串不刷新
  if (derived) pm.updateChangeMeta(cwd, '2026-08-13-noH1', { title: derived })
  assert(
    readChangeTitle(pm, cwd, '2026-08-13-noH1') === '保留我',
    '空串不刷新 → 保留创建时的 title（不被空覆盖）'
  )
}

// ── Case 5：rename → title 保留（renameChange 只 UPDATE name，不动 title）──
console.log('\n--- Case 5：rename → title 保留 ---')
{
  const { cwd, specBase } = makeRepo('title-rename-')
  const pm = new ProgressManager({ specDir: specBase })
  await pm.init(cwd)
  await pm.initChange(cwd, '2026-08-13-old', { title: '原标题' })
  pm.renameChange(cwd, '2026-08-13-old', '2026-08-13-new')
  assert(
    readChangeTitle(pm, cwd, '2026-08-13-new') === '原标题',
    'rename 后 title 保留（不随 KEY 丢）'
  )
  assert(
    readChangeTitle(pm, cwd, '2026-08-13-old') === undefined,
    'rename 后旧行已不存在（name 改名）'
  )
}

cleanup()
report(count.passed, count.failed, count.failures)
