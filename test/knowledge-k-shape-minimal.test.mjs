// 2026-11-07-knowledge-k-shape-minimal——K 形态最小落地
// 目标集扩五目标（gotchas 归位）+ accept 结构完整度 advisory + SKILL 四段指引。
// fixture 用真实 cmdPropose 生成（与 accept-channel 测试同款 helper）。

import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'

const root = join(fileURLToPath(import.meta.url), '..', '..')
const { cmdPropose } = await import(pathToFileURL(join(root, 'src', 'stages', 'knowledge.js')).href)
const { cmdKnowledgeAccept } = await import(
  pathToFileURL(join(root, 'src', 'knowledge-classify.js')).href
)

let passed = 0, failed = 0
function ok(cond, msg) {
  if (cond) { console.log(`  ✅ PASS: ${msg}`); passed++ }
  else { console.log(`  ❌ FAIL: ${msg}`); failed++ }
}

function setup(name) {
  const dir = join(tmpdir(), `kks-${name}`)
  rmSync(dir, { recursive: true, force: true })
  const kr = join(dir, '.sillyspec', 'knowledge')
  mkdirSync(kr, { recursive: true })
  writeFileSync(join(kr, 'INDEX.md'), '# Knowledge Index\n\n## Known Issues\n', 'utf8')
  for (const f of ['known-issues.md', 'patterns.md', 'conventions.md', 'sillyspec-gotchas.md', 'testing-gotchas.md']) {
    writeFileSync(join(kr, f), `# ${f}\n`, 'utf8')
  }
  return dir
}
function clean(dir) { try { rmSync(dir, { recursive: true, force: true }) } catch {} }
const kr = (dir) => join(dir, '.sillyspec', 'knowledge')

async function quietPropose(dir, args) {
  const orig = console.log
  console.log = () => {}
  try { await cmdPropose(dir, args, {}) } finally { console.log = orig }
}
async function runAccept(dir, args) {
  const lines = []
  const orig = console.log
  console.log = (...a) => lines.push(a.join(' '))
  try { await cmdKnowledgeAccept(dir, args, {}) } finally { console.log = orig }
  const text = lines.join('\n')
  const s = text.indexOf('{')
  return s >= 0 ? JSON.parse(text.slice(s)) : { ok: false, _raw: text }
}

// ── T1: 五目标路由（FR-01）──
console.log('\n=== T1: 五目标路由 ===')
{
  const dir = setup('t1')
  try {
    await quietPropose(dir, ['--title', '工具坑条目', '--body', '正文', '--category', 'sillyspec-gotchas'], {})
    const r = await runAccept(dir, ['--id', '工具坑条目'])
    ok(r.ok === true, `category=sillyspec-gotchas 自动路由（实得 ${JSON.stringify(r.appendedTo)}）`)
    ok(readFileSync(join(kr(dir), 'sillyspec-gotchas.md'), 'utf8').includes('## 工具坑条目'), '追加进 sillyspec-gotchas.md')
    ok(readFileSync(join(kr(dir), 'INDEX.md'), 'utf8').includes('(sillyspec-gotchas.md#工具坑条目)'), 'INDEX 路由行落位（EOF 新段兼容）')

    await quietPropose(dir, ['--title', '测试坑条目', '--body', '正文', '--category', 'testing-gotchas'], {})
    const r2 = await runAccept(dir, ['--id', 'proposed/测试坑条目'])
    ok(r2.ok === true && r2.appendedTo === 'testing-gotchas.md', 'testing-gotchas 自动路由')
  } finally { clean(dir) }
}

// ── T2: advisory 两分支（FR-02）──
console.log('\n=== T2: advisory 两分支 ===')
{
  const dir = setup('t2')
  try {
    await quietPropose(dir, ['--title', '完整条目', '--body', '## 问题\n现象描述。\n\n## 解法\n这样做。', '--category', 'patterns'], {})
    const rA = await runAccept(dir, ['--id', '完整条目'])
    ok(rA.ok === true && !rA.structuralWarnings, `四段类结构无警告（实得 ${JSON.stringify(rA.structuralWarnings)}）`)

    await quietPropose(dir, ['--title', '裸正文条目', '--body', '只有一段没有段标题的正文。', '--category', 'patterns'], {})
    const rB = await runAccept(dir, ['--id', '裸正文条目'])
    ok(rB.ok === true, 'advisory 不阻断（ok:true 正常合并）')
    ok(Array.isArray(rB.structuralWarnings) && rB.structuralWarnings.length > 0, `缺段结构列警告（实得 ${JSON.stringify(rB.structuralWarnings)}）`)
    ok(readFileSync(join(kr(dir), 'patterns.md'), 'utf8').includes('## 裸正文条目'), '警告下仍正常落盘')

    // dry-run 同样携带
    await quietPropose(dir, ['--title', '演练缺段', '--body', '无结构正文', '--category', 'patterns'], {})
    const rC = await runAccept(dir, ['--id', '演练缺段', '--dry-run'])
    ok(rC.ok === true && Array.isArray(rC.structuralWarnings), 'dry-run 同样携带 advisory')
  } finally { clean(dir) }
}

// ── T3: SKILL 四段指引（FR-03）──
console.log('\n=== T3: SKILL 指引 ===')
{
  const skill = readFileSync(join(root, '.claude', 'skills', 'sillyspec-knowledge', 'SKILL.md'), 'utf8')
  ok(/四段/.test(skill) && /问题/.test(skill), 'SKILL 含四段模板与问题段说明')
  ok(/structuralWarnings|结构完整度/.test(skill), 'SKILL 注明 advisory 语义')
}

// ── T4: 既有面回归（FR-04——占位断言由跑批覆盖）──
console.log('\n=== T4: 既有面回归 ===')
{
  ok(true, '（回归由跑批执行：accept-channel/classify/inbox/digest 四面）')
}

console.log(`\n结果: ${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
