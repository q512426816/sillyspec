/**
 * 决策提炼跨变更同号共存（坑 distill-cross-change-supersede，2026-08-28 用户实证：
 * 决策提炼按 ID 全局幂等，跨变更同号决策（两个 D-002）在 knowledge 里互相 supersede——
 * 条目缺变更名限定）。
 *
 * 修复后契约：
 * - 条目带「变更：<name>」限定行；幂等键 = 号+变更
 * - 跨变更同号共存（不 supersede）；同变更同号版本演进照常 supersede
 * - 无「变更：」行的 legacy 条目不被新条目触碰
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

import { distillIntoKnowledge } from '../src/decision-distill.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
let passed = 0, failed = 0
const failures = []
function assert(cond, msg) {
  if (cond) { passed++; console.log(`  ✅ PASS: ${msg}`) }
  else { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
}
const tmpRoots = []
function mkTmp(prefix) {
  const d = mkdtempSync(join(tmpdir(), `ddx-${prefix}-`))
  tmpRoots.push(d)
  return d
}

function writeDecisions(changeDir, entries) {
  mkdirSync(changeDir, { recursive: true })
  const body = entries.map(e => [
    `## ${e.id} ${e.title}`,
    `- type: ${e.type || 'architecture'}`,
    `- status: ${e.status || 'confirmed'}`,
    e.supersedes ? `- supersedes: ${e.supersedes}` : '',
    `- answer: ${e.answer || '理由'}`,
  ].filter(Boolean).join('\n')).join('\n\n')
  writeFileSync(join(changeDir, 'decisions.md'), `# Decisions\n\n${body}\n`)
}

const countSections = (knowledgeRoot, domain, fn) => {
  const p = join(knowledgeRoot, 'decisions', `${domain}.md`)
  if (!existsSync(p)) return []
  const content = readFileSync(p, 'utf8')
  const heads = content.split('\n').filter(l => /^## D-\d+@v\d+/.test(l))
  if (fn) return fn(content, heads)
  return heads
}

console.log('=== 决策提炼：跨变更同号共存（变更名限定）===\n')
{
  const root = mkTmp('root')
  const knowledgeRoot = join(root, 'knowledge')
  const changeA = join(root, 'changes', '2026-08-28-alpha')
  const changeB = join(root, 'changes', '2026-08-28-beta')

  // 1. 变更 A 落 D-002@v1
  writeDecisions(changeA, [{ id: 'D-002@v1', title: 'alpha 的缓存策略', answer: 'A 侧理由' }])
  const r1 = distillIntoKnowledge(changeA, knowledgeRoot, 'hash-a1', null)
  assert(r1.written.some(w => w.action === 'append'), 'A 的 D-002@v1 首次 append')
  let heads = countSections(knowledgeRoot, 'unmapped')
  assert(heads.length === 1 && heads[0].includes('D-002@v1'), 'A 落库一个 D-002@v1 段')
  let content = readFileSync(join(knowledgeRoot, 'decisions', 'unmapped.md'), 'utf8')
  assert(content.includes('变更：2026-08-28-alpha'), '条目带变更限定行（变更：2026-08-28-alpha）')

  // 2. 变更 B 同号 D-002@v1 → 共存不 supersede（坑现场）
  writeDecisions(changeB, [{ id: 'D-002@v1', title: 'beta 的重试策略', answer: 'B 侧理由' }])
  const r2 = distillIntoKnowledge(changeB, knowledgeRoot, 'hash-b1', null)
  assert(r2.written.some(w => w.action === 'append'), 'B 的同号 D-002@v1 是 append（非 supersede）')
  heads = countSections(knowledgeRoot, 'unmapped')
  assert(heads.length === 2, `跨变更同号共存（2 段；实际 ${JSON.stringify(heads)}）`)
  content = readFileSync(join(knowledgeRoot, 'decisions', 'unmapped.md'), 'utf8')
  assert(content.includes('alpha 的缓存策略') && content.includes('beta 的重试策略'), '两个条目内容都在')

  // 3. 变更 A 的 D-002@v2（版本演进）→ 只 supersede A 自己的 v1，B 的不动
  writeDecisions(changeA, [
    { id: 'D-002@v1', title: 'alpha 的缓存策略', answer: 'A 侧理由' },
    { id: 'D-002@v2', title: 'alpha 的缓存策略 v2', answer: 'A 侧理由 v2', supersedes: 'D-002@v1' },
  ])
  const r3 = distillIntoKnowledge(changeA, knowledgeRoot, 'hash-a2', null)
  heads = countSections(knowledgeRoot, 'unmapped')
  assert(heads.length === 2, `A v2 替换 A v1 后仍 2 段（A@v2 + B@v1；实际 ${JSON.stringify(heads)}）`)
  content = readFileSync(join(knowledgeRoot, 'decisions', 'unmapped.md'), 'utf8')
  assert(content.includes('alpha 的缓存策略 v2'), 'A 的 v2 落库')
  assert(content.includes('beta 的重试策略') && content.includes('变更：2026-08-28-beta'), 'B 的条目原样保留（未被 supersede）')
  assert(!/alpha 的缓存策略\r?\n(?! v2)/.test(content), 'A 的 v1 旧段已清（同变更同号只留最高版）')

  // 4. 同变更重跑 → 幂等 update（不追加）
  const r4 = distillIntoKnowledge(changeA, knowledgeRoot, 'hash-a2', null)
  heads = countSections(knowledgeRoot, 'unmapped')
  assert(heads.length === 2, `同变更重跑幂等（仍 2 段；实际 ${heads.length}）`)
  assert(r4.written.every(w => w.action === 'update'), `重跑 action 全 update（实际 ${JSON.stringify(r4.written.map(w => w.action))}）`)

  // 5. legacy 条目（无变更行）不被新变更同号条目触碰
  const legacyPath = join(knowledgeRoot, 'decisions', 'unmapped.md')
  let c5 = readFileSync(legacyPath, 'utf8')
  // 手工注入 legacy 段（升级前落库形态：无 变更： 行）
  c5 = c5.replace(/\n\n## /, `\n\n## D-009@v1 遗留决策\n状态：implemented\n锚点：未记录\n最近确认：oldhash\n理由：升级前落库\n\n## `)
  writeFileSync(legacyPath, c5)
  const changeC = join(root, 'changes', '2026-08-28-gamma')
  writeDecisions(changeC, [{ id: 'D-009@v1', title: 'gamma 的新决策', answer: 'C 侧理由' }])
  distillIntoKnowledge(changeC, knowledgeRoot, 'hash-c1', null)
  c5 = readFileSync(legacyPath, 'utf8')
  assert(c5.includes('遗留决策') && c5.includes('gamma 的新决策'), 'legacy 段与新变更同号段共存（legacy 不被触碰）')
}

for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} }
console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
if (failures.length) console.log(`失败项: ${failures.join('; ')}`)
console.log('='.repeat(50))
process.exit(failed > 0 ? 1 : 0)
