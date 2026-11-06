// 2026-11-07-knowledge-accept-channel——proposed 待审知识收口通道
// CLI 侧核查实证：proposed/ 只进不出（classify 只吃 uncategorized，SKILL 规则悬空）。
// 本文件锁 FR-01~07：accept 主路径迁移+INDEX 注册+删源 / category 自动路由与报错 /
// duplicate 幂等 / dry-run 零写盘 / inbox 清单+digest 信号 / SKILL 文案 / 病态文件。
// fixture 用真实 cmdPropose 生成（格式同源，含尾注分隔形态）。

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'

const root = join(fileURLToPath(import.meta.url), '..', '..')
const { cmdPropose } = await import(pathToFileURL(join(root, 'src', 'stages', 'knowledge.js')).href)
const { cmdKnowledgeAccept, cmdKnowledgeInbox } = await import(
  pathToFileURL(join(root, 'src', 'knowledge-classify.js')).href
)

let passed = 0, failed = 0
function ok(cond, msg) {
  if (cond) { console.log(`  ✅ PASS: ${msg}`); passed++ }
  else { console.log(`  ❌ FAIL: ${msg}`); failed++ }
}

function setup(name) {
  const dir = join(tmpdir(), `kac-${name}`)
  rmSync(dir, { recursive: true, force: true })
  const kr = join(dir, '.sillyspec', 'knowledge')
  mkdirSync(kr, { recursive: true })
  writeFileSync(join(kr, 'INDEX.md'), [
    '# Knowledge Index', '', '## Known Issues', '', '## Patterns', '', '## Conventions', '',
  ].join('\n'))
  for (const f of ['known-issues.md', 'patterns.md', 'conventions.md']) {
    writeFileSync(join(kr, f), `# ${f}\n\n## 存量条目占位\n\n既有正文。\n`)
  }
  return dir
}
function clean(dir) { try { rmSync(dir, { recursive: true, force: true }) } catch {} }
const kr = (dir) => join(dir, '.sillyspec', 'knowledge')

async function runAccept(dir, args) {
  const lines = []
  const orig = console.log
  console.log = (...a) => lines.push(a.join(' '))
  try { await cmdKnowledgeAccept(dir, args, {}) } finally { console.log = orig }
  const text = lines.join('\n')
  const s = text.indexOf('{')
  return s >= 0 ? JSON.parse(text.slice(s)) : { ok: false, _raw: text }
}

/** 静音跑 cmdPropose（其 JSON 输出不入测试断言面）。 */
async function quietPropose(dir, args) {
  const orig = console.log
  console.log = () => {}
  try { await cmdPropose(dir, args, {}) } finally { console.log = orig }
}

// ── T1: 主路径迁移 + INDEX 注册 + 删源（FR-01）──
console.log('\n=== T1: 主路径 ===')
{
  const dir = setup('t1')
  try {
    await quietPropose(dir, ['--title', '测试条目甲', '--body', '问题：X。\n规则：必须先 Y。', '--category', 'known-issues'], {})
    const r = await runAccept(dir, ['--id', 'proposed/测试条目甲', '--file', 'known-issues.md'])
    ok(r.ok === true && r.moved === true, `ok+moved（实得 ${JSON.stringify(r)}）`)
    ok(r.anchor === '测试条目甲', 'anchor=标题')
    const ki = readFileSync(join(kr(dir), 'known-issues.md'), 'utf8')
    ok(ki.includes('## 测试条目甲') && ki.includes('规则：必须先 Y。'), '目标文件追加条目块（含正文）')
    ok((ki.match(/## 存量条目占位/g) || []).length === 1, '既有条目零改动')
    const idx = readFileSync(join(kr(dir), 'INDEX.md'), 'utf8')
    ok(idx.includes('(known-issues.md#测试条目甲)'), 'INDEX 路由行注册')
    ok(!existsSync(join(kr(dir), 'proposed', '测试条目甲.md')), '源 proposed 文件已删除')
    ok(!idx.includes('This is a proposed knowledge entry'), '尾注未随迁')
  } finally { clean(dir) }
}

// ── T2: category 自动路由与 target_file_required（FR-02）──
console.log('\n=== T2: category 路由 ===')
{
  const dir = setup('t2')
  try {
    await quietPropose(dir, ['--title', '模式条目乙', '--body', '正文乙', '--category', 'patterns'], {})
    const r = await runAccept(dir, ['--id', '模式条目乙']) // 裸 slug 容错 + category 自动路由
    ok(r.ok === true, `裸 slug + category 自动路由 ok（实得 ${JSON.stringify(r)}）`)
    ok(readFileSync(join(kr(dir), 'patterns.md'), 'utf8').includes('## 模式条目乙'), '追加进 patterns.md')

    await quietPropose(dir, ['--title', '无类条目丙', '--body', '正文丙'], {}) // category 缺省 uncategorized
    const r2 = await runAccept(dir, ['--id', 'proposed/无类条目丙'])
    ok(r2.ok === false && r2.error && r2.error.code === 'target_file_required', `缺省 category 无 --file 报 target_file_required（实得 ${JSON.stringify(r2.error)}）`)
    ok(!readFileSync(join(kr(dir), 'known-issues.md'), 'utf8').includes('无类条目丙'), '报错零写盘')
  } finally { clean(dir) }
}

// ── T3: duplicate-title 幂等（FR-03）──
console.log('\n=== T3: duplicate 幂等 ===')
{
  const dir = setup('t3')
  try {
    await quietPropose(dir, ['--title', '重复条目丁', '--body', '正文丁', '--category', 'known-issues'], {})
    await runAccept(dir, ['--id', 'proposed/重复条目丁'])
    // 同名再提议（cmdPropose 同 slug 覆盖重写）→ 再 accept → duplicate 收尾
    await quietPropose(dir, ['--title', '重复条目丁', '--body', '正文丁改', '--category', 'known-issues'], {})
    const r2 = await runAccept(dir, ['--id', 'proposed/重复条目丁'])
    ok(r2.ok === true && r2.skippedReason === 'duplicate-title', `duplicate-title 收尾（实得 ${JSON.stringify(r2)}）`)
    const ki = readFileSync(join(kr(dir), 'known-issues.md'), 'utf8')
    ok((ki.match(/## 重复条目丁/g) || []).length === 1, '目标文件无重复条目')
    ok(!existsSync(join(kr(dir), 'proposed', '重复条目丁.md')), '源文件已清')
  } finally { clean(dir) }
}

// ── T4: dry-run 零写盘（FR-04）──
console.log('\n=== T4: dry-run ===')
{
  const dir = setup('t4')
  try {
    await quietPropose(dir, ['--title', '演练条目戊', '--body', '正文戊', '--category', 'conventions'], {})
    const before = {
      ki: readFileSync(join(kr(dir), 'conventions.md'), 'utf8'),
      idx: readFileSync(join(kr(dir), 'INDEX.md'), 'utf8'),
      prop: readFileSync(join(kr(dir), 'proposed', '演练条目戊.md'), 'utf8'),
    }
    const r = await runAccept(dir, ['--id', 'proposed/演练条目戊', '--dry-run'])
    ok(r.ok === true && r.dryRun === true, 'dry-run 标记')
    ok(r.plan && r.plan.appendToTarget === true && r.plan.indexRouteLine, `plan 渲染（实得 ${JSON.stringify(r.plan)}）`)
    ok(readFileSync(join(kr(dir), 'conventions.md'), 'utf8') === before.ki, '目标文件零改动')
    ok(readFileSync(join(kr(dir), 'INDEX.md'), 'utf8') === before.idx, 'INDEX 零改动')
    ok(readFileSync(join(kr(dir), 'proposed', '演练条目戊.md'), 'utf8') === before.prop, '源文件零改动')
  } finally { clean(dir) }
}

// ── T5: inbox 清单 + digest 信号（FR-05）──
console.log('\n=== T5: inbox + digest ===')
{
  const dir = setup('t5')
  try {
    await quietPropose(dir, ['--title', '清单条目一', '--body', '正文一', '--category', 'patterns'], {})
    await quietPropose(dir, ['--title', '清单条目二', '--body', '正文二', '--category', 'patterns'], {})
    const lines = []
    const orig = console.log
    console.log = (...a) => lines.push(a.join(' '))
    try {
      await cmdKnowledgeInbox(dir, ['--json'], {})
    } finally { console.log = orig }
    const raw = lines.join('\n')
    const s = raw.indexOf('{')
    const inboxJson = s >= 0 ? JSON.parse(raw.slice(s)) : null
    ok(inboxJson && inboxJson.inbox && Array.isArray(inboxJson.inbox.proposed), `inbox 含 proposed 清单（实得键 ${inboxJson && Object.keys(inboxJson.inbox)}）`)
    ok(inboxJson.inbox.proposed.length === 2, 'proposed 清单 2 条')
    ok(inboxJson.inbox.proposed.some((p) => p.title === '清单条目一' && typeof p.ageDays === 'number'), '清单项含标题与积压天数')

    const { collectKnowledgeDigest } = await import(pathToFileURL(join(root, 'src', 'knowledge-digest.js')).href)
    const d = collectKnowledgeDigest({ specBase: join(dir, '.sillyspec'), projectRoot: dir })
    const sig = (d.signals || []).find((x) => x.kind === 'proposed')
    ok(sig && sig.count === 2, `digest proposed 信号 count=2（实得 ${JSON.stringify(sig)}）`)
    ok(sig && (sig.level === 'info' || sig.level === 'warn'), '信号级别 info/warn')

    // 评审 P1 修复回归：文本路径空收件箱不吞 proposed 清单（uncategorized 缺席场景）
    const txtLines = []
    console.log = (...a) => txtLines.push(a.join(' '))
    try {
      await cmdKnowledgeInbox(dir, [], {})
    } finally { console.log = orig }
    const txt = txtLines.join('\n')
    ok(txt.includes('待审提议') && txt.includes('清单条目一'), `文本面空收件箱仍列 proposed（实得 ${JSON.stringify(txt)}）`)
  } finally { clean(dir) }
}

// ── T6: SKILL 文案同步（FR-06）──
console.log('\n=== T6: SKILL 文案 ===')
{
  const skill = readFileSync(join(root, '.claude', 'skills', 'sillyspec-knowledge', 'SKILL.md'), 'utf8')
  ok(skill.includes('knowledge accept'), 'SKILL 含 accept 命令用法')
  ok(!/不要自动审核合并\s*`?proposed/.test(skill), '悬空规则已被指向命令的表述替代')
}

// ── T7: 病态文件报错不落盘（FR-07 边界）──
console.log('\n=== T7: 病态文件 ===')
{
  const dir = setup('t7')
  try {
    const propDir = join(kr(dir), 'proposed')
    mkdirSync(propDir, { recursive: true })
    writeFileSync(join(propDir, '病态.md'), '---\ncategory: known-issues\n---\n\n无标题正文', 'utf8')
    const r = await runAccept(dir, ['--id', 'proposed/病态', '--file', 'known-issues.md'])
    ok(r.ok === false && r.error && r.error.code === 'proposed_invalid', `无 # 标题结构化报错（实得 ${JSON.stringify(r.error)}）`)
    ok(!readFileSync(join(kr(dir), 'known-issues.md'), 'utf8').includes('病态'), '病态零写盘')
    ok(existsSync(join(propDir, '病态.md')), '病态源文件保留（不被误删）')
    const r2 = await runAccept(dir, ['--id', 'proposed/不存在条目', '--file', 'known-issues.md'])
    ok(r2.ok === false && r2.error && r2.error.code === 'proposed_not_found', '不存在条目报 proposed_not_found')
  } finally { clean(dir) }
}

console.log(`\n结果: ${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
