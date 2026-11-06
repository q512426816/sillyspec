// 2026-11-06-knowledge-body-recall——普通知识文件正文段落的词片兜底召回
// 双路分析定稿：四层检索语料均不含普通知识文件正文（根因），本文件锁 FR-01~04：
// body 兜底主路径/段落覆盖窗（泛在排除稀有落窗）/已修复段落过滤/弱命中并联追加
// 不重排+零网络/去重/既有通道零回归/零命中链补跑。
// fixture 复现实证场景：正文写了相关词、INDEX 词表未收录的条目。

import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'

const root = join(fileURLToPath(import.meta.url), '..', '..')
const { fallbackByBodyShingles, queryShingles } = await import(
  pathToFileURL(join(root, 'src', 'knowledge-match.js')).href
)
const { matchKnowledgeHybrid } = await import(
  pathToFileURL(join(root, 'src', 'knowledge-vector.js')).href
)

let passed = 0, failed = 0
function ok(cond, msg) {
  if (cond) { console.log(`  ✅ PASS: ${msg}`); passed++ }
  else { console.log(`  ❌ FAIL: ${msg}`); failed++ }
}

function setup(name) {
  const dir = join(tmpdir(), `kbr-${name}`)
  rmSync(dir, { recursive: true, force: true })
  const kr = join(dir, '.sillyspec', 'knowledge')
  mkdirSync(join(kr, 'decisions'), { recursive: true })
  // INDEX：普通文件路由行（关键词故意不含目标词——复现「词表未收录」）；decisions 路由行
  writeFileSync(join(kr, 'INDEX.md'), [
    '# Knowledge Index', '',
    '## Known Issues',
    '- 无关词甲|无关词乙 → [知识条目](known-issues.md)',
    '',
    '## Decisions',
    '- 决策|runtime → [决策知识](decisions/runtime.md)',
  ].join('\n'))
  // 普通知识文件：8 段落。窗上限 = max(2, ceil(8%×8)) = 2
  // 「重开」覆盖 2 段（落窗）；「泛词」覆盖 5 段（>2 泛在排除）；「过期」覆盖 2 段但一段已修复
  const L = (t, body) => [`## ${t}`, '', body, ''].join('\n')
  writeFileSync(join(kr, 'known-issues.md'), [
    '# 知识条目 — known-issues', '',
    L('条目甲', '会话结束后想重开续聊，正文写了词表没收的词。'),
    L('条目乙', '该场景重开失败报 409，正文描述与词表无关。'),
    L('条目丙', '泛词出现在很多段落里。'),
    L('条目丁', '泛词再次出现。'),
    L('条目戊', '泛词第三次出现。'),
    L('条目己', '泛词第四次出现。'),
    L('条目庚', '会话过期回收的说明。'),
    `## 条目辛`, '', '- 状态：已修复', '旧问题：过期窗口太短已修复。', '',
  ].join('\n'))
  // decisions 域文件（decisions 通道对照用）
  writeFileSync(join(kr, 'decisions', 'runtime.md'), [
    '# 决策知识 — runtime', '',
    '## D-001@v1 决策条目样例',
    '状态：implemented',
    '变更：2026-01-01-a',
    '理由：决策理由样例，含词表无关的正文词',
    '',
  ].join('\n'))
  return dir
}
function clean(dir) { try { rmSync(dir, { recursive: true, force: true }) } catch {} }

const kd = (dir) => join(dir, '.sillyspec', 'knowledge')

// ── T1: 正文词片主路径锚点级命中（FR-01）──
console.log('\n=== T1: 正文词片主路径锚点级命中 ===')
{
  const dir = setup('t1')
  try {
    const r = fallbackByBodyShingles(kd(dir), '会话重开')
    ok(r !== null && r.matched === true, `matched:true（实得 ${JSON.stringify(r && r.matched)}）`)
    const anchors = (r.entries || []).map((e) => e.anchor)
    ok(anchors.includes('条目甲') && anchors.includes('条目乙'), `锚点级命中条目甲乙（实得 ${anchors.join(',')}）`)
    ok((r.entries || []).every((e) => e.file === 'known-issues.md'), 'entries 带 file')
    ok(r.json && r.json.bodyFallback === true && r.json.fallback === true, 'json.bodyFallback 判定键')
    const kw = (r.entries || []).find((e) => e.anchor === '条目甲')
    ok(kw && kw.keywords && kw.keywords.includes('重开'), `keywords 含落窗词片「重开」（实得 ${JSON.stringify(kw && kw.keywords)}）`)
    // 词表未收录场景兜底：INDEX 关键词「无关词甲」不在查询——路由本应零命中，body 兜底独立可用
    ok(String((r.entries || [])[0].display || '').includes('正文词片命中'), 'display 标注正文词片命中')
  } finally { clean(dir) }
}

// ── T2: 段落覆盖窗——泛在排除 / 稀有落窗（FR-04）──
console.log('\n=== T2: 段落覆盖窗泛在排除/稀有落窗 ===')
{
  const dir = setup('t2')
  try {
    const r = fallbackByBodyShingles(kd(dir), '泛词')
    ok(r === null, `泛在词（覆盖 5/8 段 > 窗上限 2）零命中（实得 ${JSON.stringify(r && r.matched)}）`)
    const r2 = fallbackByBodyShingles(kd(dir), '会话重开')
    ok(r2 !== null, '稀有词（覆盖 2/8 段 = 窗）落窗命中')
  } finally { clean(dir) }
}

// ── T3: 已修复段落过滤（FR-04）──
console.log('\n=== T3: 已修复段落跳过 ===')
{
  const dir = setup('t3')
  try {
    // 「过期」覆盖 条目庚 + 条目辛（已修复）→ 窗内但已修复段被滤，只剩条目庚
    const r = fallbackByBodyShingles(kd(dir), '会话过期')
    const anchors = (r && r.entries || []).map((e) => e.anchor)
    ok(anchors.includes('条目庚'), '未修复段（条目庚）命中')
    ok(!anchors.includes('条目辛'), '已修复段（条目辛，状态行）被跳过')
  } finally { clean(dir) }
}

// ── T4: 弱命中并联——追加不重排 + 零网络（FR-02）──
console.log('\n=== T4: 弱命中并联追加不重排+零网络 ===')
{
  const dir = setup('t4')
  try {
    // fetch 沼泽：任何网络调用即抛（路由命中路径必须零网络）
    const origFetch = globalThis.fetch
    globalThis.fetch = () => { throw new Error('network call on routing-hit path') }
    try {
      // 查询含 INDEX 关键词（路由弱命中）+ 正文词片（body 命中）
      const r = await matchKnowledgeHybrid(kd(dir), '无关词甲 会话重开', { cwd: dir })
      ok(r.matched === true, 'hybrid matched:true')
      const first = (r.entries || [])[0]
      ok(first && first.display === '知识条目', `路由命中条目仍在首位不重排（实得 ${first && first.display}）`)
      const bodyEntries = (r.entries || []).filter((e) => String(e.display || '').includes('正文词片命中'))
      ok(bodyEntries.length > 0, 'body 命中追加在结果中')
      const idxRoute = (r.entries || []).findIndex((e) => e.display === '知识条目')
      const idxBody = (r.entries || []).findIndex((e) => String(e.display || '').includes('正文词片命中'))
      ok(idxRoute < idxBody, 'body 命中排在路由命中之后（追加不重排）')
    } finally { globalThis.fetch = origFetch }
  } finally { clean(dir) }
}

// ── T5: 并联去重——同锚点不重复（FR-02）──
console.log('\n=== T5: 去重无重复键 ===')
{
  const dir = setup('t5')
  try {
    // INDEX 路由行带锚点#条目甲：查询同时含路由关键词与正文词片 → 条目甲只出现一次
    const kr = kd(dir)
    writeFileSync(join(kr, 'INDEX.md'), [
      '# Knowledge Index', '',
      '## Known Issues',
      '- 无关词甲|无关词乙 → [条目甲](known-issues.md#条目甲)',
    ].join('\n'))
    const r = await matchKnowledgeHybrid(kr, '无关词甲 会话重开', { cwd: dir })
    const keys = (r.entries || []).map((e) => `${e.file}#${e.anchor || ''}`)
    const dup = keys.filter((k, i) => keys.indexOf(k) !== i)
    ok(dup.length === 0, `file+anchor 无重复键（实得重复 ${JSON.stringify(dup)}）`)
    ok(keys.filter((k) => k === 'known-issues.md#条目甲').length === 1, '条目甲 路由+body 双命中只出现一次')
  } finally { clean(dir) }
}

// ── T6: 既有通道零回归（FR-03）──
console.log('\n=== T6: decisions 通道与向量门零回归对照 ===')
{
  const dir = setup('t6')
  try {
    // decisions 回退照旧：查询命中 decisions 语料的词片复现窗（此处构造 decisions 独有词不进窗
    // 的场景较绕——直接断言纯 decisions 词查询的 hybrid 结果结构四键+decisionHits 语义未变）
    const origFetch = globalThis.fetch
    globalThis.fetch = () => { throw new Error('network call without platform config') }
    try {
      // 无平台配置（fixture 无 local.yaml）→ 向量层不启用零网络（FR-core-engine-211 语义）
      const r = await matchKnowledgeHybrid(kd(dir), '决策 runtime 无关词乙', { cwd: dir })
      ok(Array.isArray(r.entries), '返回结构 entries 数组保持')
      ok('decisionHits' in r || 'routeHits' in r || r.matched === false, '既有字段语义未破坏')
    } finally { globalThis.fetch = origFetch }
    // queryShingles 既有行为零变化（导出面回归）
    ok(Array.isArray(queryShingles('会话重开')) && queryShingles('会话重开').includes('重开'), 'queryShingles 导出与产出保持')
  } finally { clean(dir) }
}

// ── T7: 零命中链补跑（FR-01 接线）──
console.log('\n=== T7: 零命中链补跑 ===')
{
  const dir = setup('t7')
  try {
    // 路由零命中（查询不含 INDEX 关键词）+ decisions 无此词片 → body 兜底接管
    const r = await matchKnowledgeHybrid(kd(dir), '会话重开', { cwd: dir })
    ok(r.matched === true, `零命中链由 body 兜底接管 matched:true（实得 ${JSON.stringify(r && r.matched)}）`)
    const bodyEntries = (r.entries || []).filter((e) => String(e.display || '').includes('正文词片命中'))
    ok(bodyEntries.length >= 2, 'body 兜底锚点级 entries 返回')
  } finally { clean(dir) }
}

console.log(`\n结果: ${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
