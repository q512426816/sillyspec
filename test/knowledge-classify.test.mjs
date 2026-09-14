/**
 * knowledge-classify.test.mjs — knowledge classify 子命令测试
 *
 * 覆盖（task-02 验收面）：
 * - 正常路径四步迁移：追加目标文件 / INDEX 补路由行 / 从 uncategorized 删除 / classify 审计落盘
 * - 双格式寻址三通道各 ≥1：标题行 `## <qlId> |` 前缀 ∪ 正文尾注 `（<qlId>）` ∪ --title 模糊兜底
 * - 幂等：目标已含同标题条目 → duplicate-title 跳过追加只做迁移收尾；条目迁空后再跑报 entry_not_found
 * - --dry-run 零写盘（uncategorized / 目标文件 / INDEX / hits.jsonl 字节不变）
 * - INDEX 路由行格式断言（既有 `- kw1|kw2 → [display](file#anchor)` 格式 + 分类段落位 + 既有行不动）
 * - keywords 显式传与标题分词兜底；--section 覆盖标题与 anchor
 * - 坏输入：条目不存在 / 目标文件不存在 / 无处归类的目标 / 缺寻址参数
 * - CRLF 容忍（uncategorized.md CRLF 写盘后迁移成功且保留 CRLF）
 * - CLI 入口 cmdKnowledgeClassify：参数校验 + JSON 输出 + dry-run 计划渲染
 */

import { join, dirname } from 'path'
import { existsSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'fs'
import { fileURLToPath, pathToFileURL } from 'url'
import { tmpdir } from 'os'

const __filename = fileURLToPath(import.meta.url)
const root = join(__filename, '..', '..')

const { classifyUncategorizedEntry, cmdKnowledgeClassify } = await import(
  pathToFileURL(join(root, 'src', 'knowledge-classify.js')).href
)
// 路由行可用性交叉验证：classify 生成的 INDEX 行必须能被既有匹配引擎解析回同语义
const { parseKnowledgeIndex } = await import(
  pathToFileURL(join(root, 'src', 'knowledge-match.js')).href
)

let passed = 0, failed = 0

function assert(cond, msg) {
  if (cond) { console.log(`  ✅ PASS: ${msg}`); passed++ }
  else { console.log(`  ❌ FAIL: ${msg}`); failed++ }
}

let seq = 0
function setup(name) {
  const dir = join(tmpdir(), `kc-test-${name}-${process.pid}-${++seq}`)
  mkdirSync(dir, { recursive: true })
  return dir
}
function clean(...dirs) {
  for (const d of dirs) try { rmSync(d, { recursive: true, force: true }) } catch { /* best effort */ }
}

// ── fixture ──

// 三种格式各一条：标题行契约格式 / 正文尾注（中文括号）/ 无标注历史条目
const UNCATEGORIZED = [
  '---',
  'author: test',
  '---',
  '',
  '# 未分类知识',
  '',
  '> execute/quick 执行中发现的坑暂存于此。',
  '',
  '## ql-20260901-001-ab12 | worktree 删除需先清 junction',
  '',
  '正文说明 A：worktree 目录在 Windows 上可能是 junction，直接 rm 会穿透主仓。',
  '',
  '## 平台配额池不独立',
  '',
  '正文说明 B：本地 agent 与平台 worker 同吃账号级池。来源（ql-20260901-002-cd34）',
  '',
  '## 历史遗留条目标题丙',
  '',
  '正文说明 C：无 ql 标注的老条目。',
  '',
].join('\n')

const INDEX_TEMPLATE = [
  '# Knowledge Index',
  '',
  '> 子代理任务开始前查询此文件，按关键词匹配，只读命中的知识文件。',
  '',
  '## Conventions',
  '- ESM|module → [conventions.md#esm-only](conventions.md#esm-only)',
  '',
  '## Patterns',
  '- stage|stages → [patterns.md#stage-step-pattern](patterns.md#stage-step-pattern)',
  '',
  '## Known Issues',
  '- 平台审核|approve → [known-issues.md#平台审核占位](known-issues.md#平台审核占位)',
  '',
  '## Decisions',
  '- change-management|decision → [decisions/change-management.md](decisions/change-management.md)',
  '',
].join('\n')

const DEFAULT_TARGET_FILES = {
  'known-issues.md': '# Known Issues\n\n## 既有占位\n\n既有内容。\n',
  'patterns.md': '# Patterns\n\n## stage-step-pattern\n\n既有内容。\n',
  'conventions.md': '# Conventions\n\n## esm-only\n\n既有内容。\n',
  'decisions/change-management.md': '# 决策：change-management\n\n## D-001@v1 示例\n\n状态：implemented\n',
}

/** 造一套隔离的 knowledge fixture（eol 可选 CRLF，验证双容忍） */
function makeKnowledge(base, { eol = '\n', uncategorized = UNCATEGORIZED, targetFiles = DEFAULT_TARGET_FILES } = {}) {
  const knowledgeDir = join(base, 'knowledge')
  mkdirSync(knowledgeDir, { recursive: true })
  const w = (rel, content) => {
    const p = join(knowledgeDir, rel)
    mkdirSync(dirname(p), { recursive: true })
    writeFileSync(p, content.split('\n').join(eol))
  }
  w('uncategorized.md', uncategorized)
  w('INDEX.md', INDEX_TEMPLATE)
  for (const [rel, content] of Object.entries(targetFiles)) w(rel, content)
  return knowledgeDir
}

const read = (p) => readFileSync(p, 'utf8')

async function captureOutput(fn) {
  const orig = console.log
  const buf = []
  console.log = (...a) => buf.push(a.map(String).join(' '))
  try { await fn() } finally { console.log = orig }
  return buf.join('\n')
}

// ── Test 1: 正常路径（标题行通道）——四步迁移 + keywords 分词兜底 + 默认 runtimeDir 审计 ──
console.log('\n=== Test 1: 正常路径四步迁移（标题行前缀寻址） ===')
{
  const base = setup('t1')
  try {
    const knowledgeDir = makeKnowledge(base)
    const r = classifyUncategorizedEntry({
      knowledgeDir, qlId: 'ql-20260901-001-ab12', targetFile: 'known-issues.md',
    })
    assert(r.ok === true, 'ok is true')
    assert(r.moved === true, 'moved is true（条目已从 uncategorized 删除）')
    assert(r.appendedTo === 'known-issues.md', 'appendedTo is known-issues.md')
    assert(r.indexUpdated === true, 'indexUpdated is true')
    assert(r.channel === 'ql-heading', 'channel is ql-heading（标题行前缀寻址）')
    assert(r.skippedReason === undefined, 'no skippedReason')
    assert(r.anchor === 'worktree 删除需先清 junction', 'anchor=条目标题（剥 ql 前缀后的标题）')

    const uncat = read(join(knowledgeDir, 'uncategorized.md'))
    assert(!uncat.includes('ql-20260901-001-ab12'), 'uncategorized 不再含该条目（ql 标识）')
    assert(!uncat.includes('worktree 删除需先清 junction'), 'uncategorized 不再含该条目（标题）')
    assert(!uncat.includes('正文说明 A'), 'uncategorized 不再含该条目（正文）')
    assert(uncat.startsWith('---\n') && uncat.includes('# 未分类知识'), 'uncategorized frontmatter/h1 保留')
    assert(uncat.includes('平台配额池不独立') && uncat.includes('历史遗留条目标题丙'), '其余条目保留')

    const target = read(join(knowledgeDir, 'known-issues.md'))
    assert(target.includes('## worktree 删除需先清 junction'), '目标文件含新条目标题 ## <标题>')
    assert(target.includes('正文说明 A：worktree 目录在 Windows 上可能是 junction，直接 rm 会穿透主仓。'), '目标文件含原文正文')
    assert(target.includes('## 既有占位') && target.includes('既有内容。'), '目标文件既有内容不受损')

    const idx = read(join(knowledgeDir, 'INDEX.md'))
    const expectedRoute = '- worktree|删除需先清|junction → [known-issues.md#worktree 删除需先清 junction](known-issues.md#worktree 删除需先清 junction)'
    assert(idx.includes(expectedRoute), 'INDEX 路由行按既有格式生成（keywords 标题分词兜底）')
    assert(idx.includes('- 平台审核|approve → [known-issues.md#平台审核占位](known-issues.md#平台审核占位)'), 'INDEX 既有行未被改动')

    const parsed = parseKnowledgeIndex(knowledgeDir)
    const hit = parsed.find(e => e.file === 'known-issues.md' && e.anchor === 'worktree 删除需先清 junction')
    assert(!!hit, '新路由行可被 knowledge-match 解析')
    assert(hit && hit.category === 'Known Issues', '路由行落在 Known Issues 分类段')
    assert(hit && hit.keywords.join('|') === 'worktree|删除需先清|junction', '解析回的 keywords 与分词一致')

    const hitsPath = join(base, '.runtime', 'knowledge-hits.jsonl')
    assert(existsSync(hitsPath), '默认 runtimeDir（knowledgeDir/../.runtime）落审计文件')
    const hitLines = read(hitsPath).trim().split('\n')
    assert(hitLines.length === 1, '审计恰好一行')
    const rec = JSON.parse(hitLines[0])
    assert(rec.type === 'classify', '审计记录 type=classify')
    assert(rec.qlId === 'ql-20260901-001-ab12' && rec.targetFile === 'known-issues.md', '审计记录含 qlId/targetFile')
  } finally { clean(base) }
}

// ── Test 2: 尾注通道（正文 `（<qlId>）` 中文括号）+ 原文尾注保留 ──
console.log('\n=== Test 2: 正文尾注寻址（（qlId）双格式之二） ===')
{
  const base = setup('t2')
  try {
    const knowledgeDir = makeKnowledge(base)
    const runtimeDir = join(base, 'rt')
    const r = classifyUncategorizedEntry({
      knowledgeDir, qlId: 'ql-20260901-002-cd34', targetFile: 'patterns.md', runtimeDir,
    })
    assert(r.ok === true && r.channel === 'ql-suffix', 'channel is ql-suffix（正文尾注寻址）')
    assert(r.anchor === '平台配额池不独立', 'anchor 为尾注条目标题')

    const target = read(join(knowledgeDir, 'patterns.md'))
    assert(target.includes('## 平台配额池不独立'), '目标文件含 ## 平台配额池不独立')
    assert(target.includes('来源（ql-20260901-002-cd34）'), '原文（含尾注）逐字保留')
    const uncat = read(join(knowledgeDir, 'uncategorized.md'))
    assert(!uncat.includes('平台配额池不独立') && !uncat.includes('ql-20260901-002-cd34'), 'uncategorized 该条目已删除')

    const rec = JSON.parse(read(join(runtimeDir, 'knowledge-hits.jsonl')).trim())
    assert(rec.type === 'classify' && rec.qlId === 'ql-20260901-002-cd34', '尾注通道审计含 qlId')
  } finally { clean(base) }
}

// ── Test 3: --title 模糊兜底通道（无 ql 标注历史条目）──
console.log('\n=== Test 3: --title 模糊匹配兜底（三通道之三） ===')
{
  const base = setup('t3')
  try {
    const knowledgeDir = makeKnowledge(base)
    const r = classifyUncategorizedEntry({
      knowledgeDir, titleFallback: '遗留条目', targetFile: 'conventions.md', runtimeDir: join(base, 'rt'),
    })
    assert(r.ok === true && r.channel === 'title-fallback', 'channel is title-fallback（模糊兜底寻址）')
    assert(r.anchor === '历史遗留条目标题丙', 'anchor 为完整条目标题')

    const target = read(join(knowledgeDir, 'conventions.md'))
    assert(target.includes('## 历史遗留条目标题丙') && target.includes('正文说明 C'), '目标文件含标题+原文')
    const uncat = read(join(knowledgeDir, 'uncategorized.md'))
    assert(!uncat.includes('历史遗留条目标题丙'), 'uncategorized 该条目已删除')

    // 审计 qlId 取条目自身 qlIdPrefix 兜底（本条无标注 → 字段缺省）
    const rec = JSON.parse(read(join(base, 'rt', 'knowledge-hits.jsonl')).trim())
    assert(rec.type === 'classify' && !('qlId' in rec), '无标注条目审计不含 qlId 字段')
  } finally { clean(base) }
}

// ── Test 4: 显式 keywords + decisions 目标（Decisions 段落落位）──
console.log('\n=== Test 4: 显式 keywords + decisions 目标段落落位 ===')
{
  const base = setup('t4')
  try {
    const knowledgeDir = makeKnowledge(base)
    const r = classifyUncategorizedEntry({
      knowledgeDir, qlId: 'ql-20260901-001-ab12', targetFile: 'decisions/change-management.md',
      keywords: ['配额', 'quota', 'pool'], runtimeDir: join(base, 'rt'),
    })
    assert(r.ok === true, 'ok is true')
    const idx = read(join(knowledgeDir, 'INDEX.md'))
    const expectedRoute = '- 配额|quota|pool → [decisions/change-management.md#worktree 删除需先清 junction](decisions/change-management.md#worktree 删除需先清 junction)'
    assert(idx.includes(expectedRoute), 'INDEX 路由行用显式 keywords 按既有格式生成')
    const hit = parseKnowledgeIndex(knowledgeDir)
      .find(e => e.file === 'decisions/change-management.md' && e.anchor === 'worktree 删除需先清 junction')
    assert(!!hit && hit.category === 'Decisions', 'decisions/ 目标路由行落在 Decisions 分类段')
    const target = read(join(knowledgeDir, 'decisions', 'change-management.md'))
    assert(target.includes('## worktree 删除需先清 junction'), 'decisions 目标文件含新条目')
  } finally { clean(base) }
}

// ── Test 5: --section 覆盖标题与 anchor ──
console.log('\n=== Test 5: --section 覆盖落盘标题（anchor 随实际标题） ===')
{
  const base = setup('t5')
  try {
    const knowledgeDir = makeKnowledge(base)
    const r = classifyUncategorizedEntry({
      knowledgeDir, qlId: 'ql-20260901-001-ab12', targetFile: 'known-issues.md',
      sectionTitle: 'worktree-junction-清理', runtimeDir: join(base, 'rt'),
    })
    assert(r.ok === true && r.anchor === 'worktree-junction-清理', 'anchor 随 --section 实际落盘标题')
    const target = read(join(knowledgeDir, 'known-issues.md'))
    assert(target.includes('## worktree-junction-清理'), '目标文件用覆盖标题')
    assert(target.includes('正文说明 A'), '正文原文保留')
    assert(read(join(knowledgeDir, 'INDEX.md')).includes('](known-issues.md#worktree-junction-清理)'), '路由行 anchor 同步')
  } finally { clean(base) }
}

// ── Test 6: 幂等——目标已含同标题条目 → duplicate-title 跳过追加只做迁移收尾 ──
console.log('\n=== Test 6: 幂等 duplicate-title 跳过追加 ===')
{
  const base = setup('t6')
  try {
    const knowledgeDir = makeKnowledge(base, {
      targetFiles: {
        ...DEFAULT_TARGET_FILES,
        'known-issues.md': '# Known Issues\n\n## worktree 删除需先清 junction\n\n已先行手工搬运的段落。\n',
      },
    })
    const targetBefore = read(join(knowledgeDir, 'known-issues.md'))
    const r = classifyUncategorizedEntry({
      knowledgeDir, qlId: 'ql-20260901-001-ab12', targetFile: 'known-issues.md', runtimeDir: join(base, 'rt'),
    })
    assert(r.ok === true, 'ok is true（幂等重入成功）')
    assert(r.skippedReason === 'duplicate-title', 'skippedReason=duplicate-title')
    assert(r.moved === true, '迁移收尾完成（uncategorized 删除）')
    assert(read(join(knowledgeDir, 'known-issues.md')) === targetBefore, '目标文件字节不变（不重复追加）')
    assert(!read(join(knowledgeDir, 'uncategorized.md')).includes('ql-20260901-001-ab12'), '原条目已删除')
    assert(r.indexUpdated === true, 'INDEX 路由行仍补齐（收尾一部分）')

    // 幂等终点：条目已迁空后再跑 → entry_not_found（不再重复迁移）
    const r2 = classifyUncategorizedEntry({
      knowledgeDir, qlId: 'ql-20260901-001-ab12', targetFile: 'known-issues.md', runtimeDir: join(base, 'rt'),
    })
    assert(r2.ok === false && r2.error.code === 'entry_not_found', '条目迁空后再跑报 entry_not_found')
  } finally { clean(base) }
}

// ── Test 7: --dry-run 零写盘 ──
console.log('\n=== Test 7: --dry-run 零写盘（三文件 + 审计字节不变） ===')
{
  const base = setup('t7')
  try {
    const knowledgeDir = makeKnowledge(base)
    const paths = [
      join(knowledgeDir, 'uncategorized.md'),
      join(knowledgeDir, 'known-issues.md'),
      join(knowledgeDir, 'INDEX.md'),
    ]
    const before = paths.map(read)
    const r = classifyUncategorizedEntry({
      knowledgeDir, qlId: 'ql-20260901-001-ab12', targetFile: 'known-issues.md', dryRun: true,
      runtimeDir: join(base, 'rt'),
    })
    assert(r.ok === true && r.dryRun === true, 'ok + dryRun 标记')
    assert(r.moved === false && r.indexUpdated === false, 'moved/indexUpdated 均为 false（未落盘）')
    assert(r.plan && r.plan.appendToTarget === true && r.plan.removeFromUncategorized === true, 'plan 声明将发生的变更')
    assert(r.plan && typeof r.plan.indexRouteLine === 'string' && r.plan.indexRouteLine.includes('→ ['), 'plan 渲染路由行')
    assert(paths.every((p, i) => read(p) === before[i]), 'uncategorized/目标/INDEX 字节级不变')
    assert(!existsSync(join(base, 'rt', 'knowledge-hits.jsonl')), 'dry-run 不落审计（零写盘）')
  } finally { clean(base) }
}

// ── Test 8: 坏输入（条目不存在 / 目标文件不存在 / 无处归类 / 缺寻址参数） ──
console.log('\n=== Test 8: 坏输入错误码 ===')
{
  const base = setup('t8')
  try {
    const knowledgeDir = makeKnowledge(base)
    const rt = join(base, 'rt')

    const r1 = classifyUncategorizedEntry({ knowledgeDir, qlId: 'ql-99999999-999-zzzz', targetFile: 'known-issues.md', runtimeDir: rt })
    assert(r1.ok === false && r1.error.code === 'entry_not_found', 'ql 不存在 → entry_not_found')

    const r2 = classifyUncategorizedEntry({ knowledgeDir, qlId: 'ql-20260901-001-ab12', targetFile: 'ghost.md', runtimeDir: rt })
    assert(r2.ok === false && r2.error.code === 'target_file_missing', '目标文件不存在 → target_file_missing')

    // 存在但四类之外的目标：无处落路由行
    mkdirSync(join(knowledgeDir, 'notes'), { recursive: true })
    writeFileSync(join(knowledgeDir, 'notes', 'misc.md'), '# Misc\n')
    const r3 = classifyUncategorizedEntry({ knowledgeDir, qlId: 'ql-20260901-001-ab12', targetFile: 'notes/misc.md', runtimeDir: rt })
    assert(r3.ok === false && r3.error.code === 'unknown_category', '非四类目标 → unknown_category')

    const r4 = classifyUncategorizedEntry({ knowledgeDir, targetFile: 'known-issues.md', runtimeDir: rt })
    assert(r4.ok === false && r4.error.code === 'address_required', '缺 qlId/titleFallback → address_required')

    // 失败路径零写盘
    assert(!existsSync(join(rt, 'knowledge-hits.jsonl')), '失败路径不落审计')
  } finally { clean(base) }
}

// ── Test 9: CRLF 容忍（uncategorized.md 为 CRLF 时迁移成功且保留 CRLF） ──
console.log('\n=== Test 9: CRLF 双容忍 ===')
{
  const base = setup('t9')
  try {
    const knowledgeDir = makeKnowledge(base, { eol: '\r\n' })
    const r = classifyUncategorizedEntry({
      knowledgeDir, qlId: 'ql-20260901-001-ab12', targetFile: 'known-issues.md', runtimeDir: join(base, 'rt'),
    })
    assert(r.ok === true && r.moved === true, 'CRLF uncategorized 迁移成功')
    const uncat = read(join(knowledgeDir, 'uncategorized.md'))
    assert(uncat.includes('\r\n'), '回写保留 CRLF 行尾')
    assert(!uncat.includes('ql-20260901-001-ab12'), 'CRLF 条目已删除')
    const target = read(join(knowledgeDir, 'known-issues.md'))
    assert(target.includes('\r\n## worktree 删除需先清 junction\r\n'), '目标文件（CRLF）追加块同 EOL')
    const idx = read(join(knowledgeDir, 'INDEX.md'))
    assert(idx.includes('- worktree|删除需先清|junction → [known-issues.md#worktree 删除需先清 junction](known-issues.md#worktree 删除需先清 junction)'), 'INDEX（CRLF）路由行正常')
  } finally { clean(base) }
}

// ── Test 10: CLI 入口——参数校验 + JSON 输出 ──
console.log('\n=== Test 10: CLI 入口参数校验 ===')
{
  const base = setup('t10')
  try {
    const knowledgeDir = makeKnowledge(base)
    const opts = { specDir: base }

    const out1 = JSON.parse(await captureOutput(() => cmdKnowledgeClassify(base, [], opts)))
    assert(out1.ok === false && out1.error === '--ql or --title is required', '缺寻址参数报错')

    const out2 = JSON.parse(await captureOutput(() => cmdKnowledgeClassify(base, ['--ql', 'ql-20260901-001-ab12'], opts)))
    assert(out2.ok === false && out2.error === '--file is required', '缺 --file 报错')

    const out3 = JSON.parse(await captureOutput(() =>
      cmdKnowledgeClassify(base, ['--ql', 'ql-nope', '--file', 'known-issues.md'], opts)))
    assert(out3.ok === false && out3.error.code === 'entry_not_found', 'CLI 坏输入透传 error.code')
    assert(!existsSync(join(base, '.runtime', 'knowledge-hits.jsonl')), 'CLI 失败路径零审计')
  } finally { clean(base) }
}

// ── Test 11: CLI 入口——实迁移 + --keywords 逗号切分 + --dry-run 计划渲染 ──
console.log('\n=== Test 11: CLI 实迁移与 dry-run ===')
{
  const base = setup('t11')
  try {
    const knowledgeDir = makeKnowledge(base)
    const opts = { specDir: base }

    const uncatBefore = read(join(knowledgeDir, 'uncategorized.md'))
    const outDry = JSON.parse(await captureOutput(() =>
      cmdKnowledgeClassify(base, ['--ql', 'ql-20260901-001-ab12', '--file', 'known-issues.md', '--keywords', 'kw1,kw2', '--dry-run'], opts)))
    assert(outDry.ok === true && outDry.dryRun === true, 'CLI dry-run 输出 ok+dryRun')
    assert(outDry.plan.indexRouteLine === '- kw1|kw2 → [known-issues.md#worktree 删除需先清 junction](known-issues.md#worktree 删除需先清 junction)', 'CLI --keywords 逗号切分进 plan 路由行')
    assert(read(join(knowledgeDir, 'uncategorized.md')) === uncatBefore, 'CLI dry-run 零写盘')

    const out = JSON.parse(await captureOutput(() =>
      cmdKnowledgeClassify(base, ['--ql', 'ql-20260901-001-ab12', '--file', 'known-issues.md', '--keywords', 'kw1,kw2'], opts)))
    assert(out.ok === true && out.moved === true && out.appendedTo === 'known-issues.md', 'CLI 实迁移输出结果字段')
    assert(!read(join(knowledgeDir, 'uncategorized.md')).includes('ql-20260901-001-ab12'), 'CLI 实迁移后 uncategorized 无该段')
    assert(read(join(knowledgeDir, 'known-issues.md')).includes('## worktree 删除需先清 junction'), 'CLI 实迁移后目标文件有该段')
    assert(read(join(knowledgeDir, 'INDEX.md')).includes('- kw1|kw2 → [known-issues.md#worktree 删除需先清 junction](known-issues.md#worktree 删除需先清 junction)'), 'CLI 实迁移后 INDEX 有路由行')
    const hitsPath = join(base, '.runtime', 'knowledge-hits.jsonl')
    assert(existsSync(hitsPath) && JSON.parse(read(hitsPath).trim()).type === 'classify', 'CLI 实迁移落 classify 审计（opts.runtimeDir 缺省 base/.runtime）')
  } finally { clean(base) }
}

// ── Test 12: CLI --file 容错（knowledge/ 前缀与反斜杠） ──
console.log('\n=== Test 12: --file 路径归一容错 ===')
{
  const base = setup('t12')
  try {
    const knowledgeDir = makeKnowledge(base)
    const r = classifyUncategorizedEntry({
      knowledgeDir, qlId: 'ql-20260901-001-ab12', targetFile: 'knowledge\\known-issues.md', runtimeDir: join(base, 'rt'),
    })
    assert(r.ok === true && r.appendedTo === 'known-issues.md', '反斜杠+knowledge/ 前缀归一为 INDEX 相对路径')
  } finally { clean(base) }
}

// ── 汇总 ──
console.log(`\n${'='.repeat(40)}`)
console.log(`knowledge-classify tests: ${passed} passed, ${failed} failed, ${passed + failed} total`)
if (failed > 0) process.exit(1)
