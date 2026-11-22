/**
 * 词汇通道（常读词汇旁路注入）——mattpocock-absorb ticket-01
 *
 * 契约（.scratch/mattpocock-absorb/spec.md Implementation Decisions 1-3）：
 *   1. 词汇文件 knowledge/glossary.md 在场 → 阶段级注入输出恒含「📖 词汇基准」段
 *      （query 零命中也注入——旁路不经 matchKnowledge 三层匹配，读取是独立路径）
 *   2. 词汇段不挤占 top-3 命中名额、不进命中分母（matched/section/report/json/遥测
 *      与无词汇文件时逐字段一致；词汇内容本身也不参与任何匹配层）
 *   3. 词汇文件缺失 → 静默（vocabSection 恒 ''，输出与基线逐字一致，零告警）
 *
 * fixture：临时 knowledge 目录（mkdtempSync）+ glossary.md 写入/删除两态切换；
 * 不动仓内真实 knowledge 目录。只断言注入函数输出的 section 文本形态（外部行为），
 * 不测内部解析细节。
 */
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { buildKnowledgeInjection, outputStep } from '../src/run/prompt.js'
import { readKnowledgeHits } from '../src/knowledge-hits.js'

let failed = 0
const failures = []
function assertTrue(cond, msg) {
  if (cond) console.log(`  ✅ PASS: ${msg}`)
  else { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
}

// ── fixture 助手 ──────────────────────────────────────────────────────────────

/** 造临时 spec 树：<root>/.sillyspec/{knowledge/, .runtime/, changes/<change>/} */
function makeSpecRoot() {
  const root = mkdtempSync(join(tmpdir(), 'ki-vocab-'))
  const specBase = join(root, '.sillyspec')
  mkdirSync(join(specBase, 'knowledge'), { recursive: true })
  mkdirSync(join(specBase, '.runtime'), { recursive: true })
  return { root, specBase, runtimeDir: join(specBase, '.runtime'), knowledgeDir: join(specBase, 'knowledge') }
}

function cleanup({ root }) {
  try { rmSync(root, { recursive: true, force: true }) } catch { /* Windows 句柄迟滞容忍 */ }
}

/** 5 文件命中 fixture（与 knowledge-inject.test.mjs 同款）：ka→kb→kc→kd→ke 行序，
 *  query '限流 登录 计数 worktree 补丁 灰度' 命中全部。 */
function writeFiveFileFixture(knowledgeDir) {
  writeFileSync(join(knowledgeDir, 'ka.md'), '# ka\n\nka-限流正文行A\nka-登录正文行B\n', 'utf8')
  writeFileSync(join(knowledgeDir, 'kb.md'), '# kb\n\nkb-worktree正文行A\n', 'utf8')
  writeFileSync(join(knowledgeDir, 'kc.md'), '# kc\n\nkc-计数正文行A\n', 'utf8')
  writeFileSync(join(knowledgeDir, 'kd.md'), '# kd\n\nkd-补丁正文行A\n', 'utf8')
  const keLines = ['# ke', ...Array.from({ length: 59 }, (_, i) => `ke-灰度line-${String(i + 1).padStart(2, '0')}`)]
  writeFileSync(join(knowledgeDir, 'ke.md'), keLines.join('\n') + '\n', 'utf8')
  writeFileSync(join(knowledgeDir, 'INDEX.md'), [
    '## Known Issues',
    '- 限流 → [限流坑](ka.md#限流坑锚点)',
    '- 登录 → [登录坑](ka.md#登录坑锚点)',
    '- worktree → [worktree坑](kb.md)',
    '- 计数 → [计数坑](kc.md#计数坑锚点)',
    '- 补丁 → [补丁坑](kd.md)',
    '- 灰度 → [灰度坑](ke.md)',
    ''
  ].join('\n'), 'utf8')
}

/** 词汇文件（术语+定义行式，每行一条「术语：定义」）；「限流」词条与知识命中词重叠——
 *  用于证明词汇内容不参与匹配层；「吸收/批次」为词汇专属词。 */
const GLOSSARY_TEXT = [
  '吸收：把外部实践转写为本仓可执行约定并落 knowledge 的过程',
  '批次：一次 push 压扁的提交分组单位',
  '限流：对高频调用方按配额削峰的防护手段',
  ''
].join('\n')

function writeGlossary(knowledgeDir, text = GLOSSARY_TEXT) {
  writeFileSync(join(knowledgeDir, 'glossary.md'), text, 'utf8')
}

/** 捕获 console.log 输出（warn/error 由专门 hook 场景接管） */
async function captureOutput(fn) {
  const orig = console.log
  const parts = []
  console.log = (...a) => { parts.push(a.map(x => String(x)).join(' ')) }
  try { await fn() } finally { console.log = orig }
  return parts.join('\n')
}

function withoutSillyHubEnv() {
  const saved = { url: process.env.SILLYHUB_MCP_URL, token: process.env.SILLYHUB_MCP_TOKEN }
  delete process.env.SILLYHUB_MCP_URL
  delete process.env.SILLYHUB_MCP_TOKEN
  return () => {
    if (saved.url === undefined) delete process.env.SILLYHUB_MCP_URL
    else process.env.SILLYHUB_MCP_URL = saved.url
    if (saved.token === undefined) delete process.env.SILLYHUB_MCP_TOKEN
    else process.env.SILLYHUB_MCP_TOKEN = saved.token
  }
}

const VOCAB_HEADER = '📖 词汇基准'
const HIT_QUERY = '限流 登录 计数 worktree 补丁 灰度'
const MISS_QUERY = '完全不相关的查询词组'
const KNOW_HEADER = '📚 命中知识'

// ── 1. 在场恒注入：query 零命中也注入 ─────────────────────────────────────────
console.log('--- 1. 词汇在场恒注入（零命中 query 也注入） ---')
{
  const fx = makeSpecRoot()
  const restore = withoutSillyHubEnv()
  try {
    writeFiveFileFixture(fx.knowledgeDir)
    writeGlossary(fx.knowledgeDir)
    // 零命中：知识段零字节不变，词汇段恒在场
    const miss = buildKnowledgeInjection({ knowledgeDir: fx.knowledgeDir, runtimeDir: fx.runtimeDir, change: 'c1', query: MISS_QUERY })
    assertTrue(miss.vocabSection && miss.vocabSection.startsWith(VOCAB_HEADER), `零命中时 vocabSection 恒含段头「${VOCAB_HEADER}」`)
    assertTrue(miss.vocabSection.includes('吸收：把外部实践转写为本仓可执行约定并落 knowledge 的过程'), '词汇段含术语行原文（吸收）')
    assertTrue(miss.vocabSection.includes('限流：对高频调用方按配额削峰的防护手段'), '词汇段含术语行原文（限流）')
    assertTrue(miss.matched === false && miss.section === '', '零命中知识段仍零字节（词汇段不改变零命中口径）')
    assertTrue(miss.report === 'Status: no matches', '零命中 report 基线口径不变')
    // 命中：词汇段同样在场（与命中与否无关）
    const hit = buildKnowledgeInjection({ knowledgeDir: fx.knowledgeDir, runtimeDir: fx.runtimeDir, change: 'c1', query: HIT_QUERY })
    assertTrue(hit.matched === true, '命中 query matched=true')
    assertTrue(hit.vocabSection && hit.vocabSection.startsWith(VOCAB_HEADER), '命中时 vocabSection 同样在场（恒注入）')
    assertTrue(hit.section.startsWith(KNOW_HEADER), '命中时知识段照常（词汇段为并列独立小节，不在知识段内）')
    assertTrue(!hit.section.includes(VOCAB_HEADER), '词汇段不混入「📚 命中知识」段（独立小节）')
    // 空白 glossary（存在但无内容）→ 与缺失同态静默
    writeGlossary(fx.knowledgeDir, '\n\n  \n')
    const blank = buildKnowledgeInjection({ knowledgeDir: fx.knowledgeDir, runtimeDir: fx.runtimeDir, change: 'c1', query: HIT_QUERY })
    assertTrue(blank.vocabSection === '', '全空白 glossary 与缺失同态（vocabSection 恒 \'\'）')
  } finally { restore(); cleanup(fx) }
}

// ── 2. 旁路：不进匹配层、不挤占 top-3、不进命中分母 ───────────────────────────
console.log('\n--- 2. 词汇旁路（不挤占 top-3 / 不进分母 / 不进匹配层） ---')
{
  const fx = makeSpecRoot()
  const restore = withoutSillyHubEnv()
  try {
    writeFiveFileFixture(fx.knowledgeDir)
    // A：无词汇文件基线
    const a = buildKnowledgeInjection({ knowledgeDir: fx.knowledgeDir, runtimeDir: join(fx.root, 'rt-a'), change: 'c1', query: HIT_QUERY })
    assertTrue(a.vocabSection === undefined || a.vocabSection === '', '无词汇文件 vocabSection 恒 \'\'')
    // B：词汇文件在场（含「限流」词条，与命中词重叠）
    writeGlossary(fx.knowledgeDir)
    const b = buildKnowledgeInjection({ knowledgeDir: fx.knowledgeDir, runtimeDir: join(fx.root, 'rt-b'), change: 'c1', query: HIT_QUERY })
    assertTrue(b.section === a.section, '命中知识段与无词汇文件时逐字一致（top-3 名额与正文零挤占）')
    assertTrue(JSON.stringify(b.json) === JSON.stringify(a.json), 'json 快照逐字段一致（命中分母 entry_count 不变，词汇不进 json）')
    const hitsB = readKnowledgeHits(join(fx.root, 'rt-b'))
    assertTrue(hitsB.length === 1 && !hitsB[0].matchedFiles.some(f => String(f).includes('glossary.md')),
      '遥测 matchedFiles 不含 glossary.md（词汇不进命中遥测）')
    // 词汇专属词（只在 glossary 出现，不在 INDEX 任何 keyword）：不得经词汇文件产生命中
    const vocabOnly = buildKnowledgeInjection({ knowledgeDir: fx.knowledgeDir, runtimeDir: join(fx.root, 'rt-c'), change: 'c1', query: '批次 吸收' })
    assertTrue(vocabOnly.matched === false && vocabOnly.section === '', '词汇专属词查询零命中（glossary 内容不参与任何匹配层）')
    assertTrue(vocabOnly.vocabSection.startsWith(VOCAB_HEADER), '词汇专属词查询零命中但词汇段仍注入（旁路独立路径）')
  } finally { restore(); cleanup(fx) }
}

// ── 3. 缺失静默：零告警 + 基线口径逐字 ────────────────────────────────────────
console.log('\n--- 3. 词汇缺失静默（零告警） ---')
{
  const fx = makeSpecRoot()
  const restore = withoutSillyHubEnv()
  try {
    writeFiveFileFixture(fx.knowledgeDir)
    // hook warn/error：直调链路（无平台 sync 噪音）下两态均应零告警
    const origWarn = console.warn, origErr = console.error
    const warnings = []
    console.warn = (...a) => { warnings.push(['warn', ...a].join(' ')) }
    console.error = (...a) => { warnings.push(['error', ...a].join(' ')) }
    try {
      const miss = buildKnowledgeInjection({ knowledgeDir: fx.knowledgeDir, runtimeDir: fx.runtimeDir, change: 'c1', query: MISS_QUERY })
      assertTrue(miss.vocabSection === '', '缺失态 vocabSection 恒 \'\'')
      assertTrue(miss.matched === false && miss.section === '' && miss.report === 'Status: no matches',
        '缺失态返回与基线口径逐字一致（matched/section/report）')
      writeGlossary(fx.knowledgeDir)
      buildKnowledgeInjection({ knowledgeDir: fx.knowledgeDir, runtimeDir: fx.runtimeDir, change: 'c1', query: MISS_QUERY })
      rmSync(join(fx.knowledgeDir, 'glossary.md'), { force: true })
      buildKnowledgeInjection({ knowledgeDir: fx.knowledgeDir, runtimeDir: fx.runtimeDir, change: 'c1', query: MISS_QUERY })
      assertTrue(warnings.length === 0, `在场/缺失/删除三态直调链路零 warn/error 告警（实际 ${warnings.length} 条）`)
    } finally {
      console.warn = origWarn; console.error = origErr
    }
  } finally { restore(); cleanup(fx) }
}

// ── 4. execute 端到端：占位符替换值恒含词汇段 ─────────────────────────────────
console.log('\n--- 4. outputStep execute {KNOWLEDGE_HIT_REPORT} 词汇段恒注入 ---')
{
  const fx = makeSpecRoot()
  try {
    writeFiveFileFixture(fx.knowledgeDir)
    writeGlossary(fx.knowledgeDir)
    // 4a. 零命中 change：替换值 = 未命中报告 + 词汇段
    const changeMiss = '2026-11-22-vocab-nomatch'
    mkdirSync(join(fx.specBase, 'changes', changeMiss, 'tasks'), { recursive: true })
    writeFileSync(join(fx.specBase, 'changes', changeMiss, 'tasks.md'), '# Tasks\n\n- [ ] task-01: 完全不相关的事\n', 'utf8')
    const stepsMiss = [{ name: '确认执行范围', prompt: '解析任务，确认执行范围。\n\n### 知识命中报告\n{KNOWLEDGE_HIT_REPORT}\n' }]
    const outMiss = await captureOutput(() => outputStep('execute', 0, stepsMiss, fx.root, changeMiss, 'ki-proj', { specRoot: fx.specBase }))
    assertTrue(outMiss.includes('Status: no matches'), '零命中替换值保留旧口径文本（Status: no matches）')
    assertTrue(outMiss.includes(VOCAB_HEADER) && outMiss.includes('吸收：把外部实践转写为本仓可执行约定并落 knowledge 的过程'),
      '零命中时替换值恒含词汇基准段与术语行')
    const reportMiss = JSON.parse(readFileSync(join(fx.runtimeDir, 'state', 'knowledge-hit-report.json'), 'utf8'))
    assertTrue(reportMiss.matched === false, '零命中 report.json matched:false（词汇不进 json）')
    // 4b. 命中 change：命中知识段 + 词汇段并列
    const changeHit = '2026-11-22-vocab-hit'
    mkdirSync(join(fx.specBase, 'changes', changeHit, 'tasks'), { recursive: true })
    writeFileSync(join(fx.specBase, 'changes', changeHit, 'tasks.md'), '# Tasks\n\n- [ ] task-01: 限流 登录 修复\n', 'utf8')
    const stepsHit = [{ name: '确认执行范围', prompt: '解析任务，确认执行范围。\n\n### 知识命中报告\n{KNOWLEDGE_HIT_REPORT}\n' }]
    const outHit = await captureOutput(() => outputStep('execute', 0, stepsHit, fx.root, changeHit, 'ki-proj', { specRoot: fx.specBase }))
    assertTrue(outHit.includes(KNOW_HEADER) && outHit.includes(VOCAB_HEADER), '命中时知识段与词汇段同场（并列独立小节）')
    assertTrue(outHit.indexOf(KNOW_HEADER) < outHit.indexOf(VOCAB_HEADER), '词汇基准段位于命中知识段之后（base + 词汇段拼装序）')
  } finally { cleanup(fx) }
}

// ── 5. 缺失静默·端到端 A/B 逐字一致（与没有本特性时逐字一致） ──────────────────
console.log('\n--- 5. execute 缺失态与基线逐字一致（A/B 全文对比） ---')
{
  const fx = makeSpecRoot()
  try {
    writeFiveFileFixture(fx.knowledgeDir)
    const changeName = '2026-11-22-vocab-baseline'
    mkdirSync(join(fx.specBase, 'changes', changeName, 'tasks'), { recursive: true })
    writeFileSync(join(fx.specBase, 'changes', changeName, 'tasks.md'), '# Tasks\n\n- [ ] task-01: 完全不相关的事\n', 'utf8')
    const prevGuide = process.env.SILLYSPEC_STEP_GUIDE
    process.env.SILLYSPEC_STEP_GUIDE = '0'
    try {
      // A：真实路径——无 glossary，未命中分支替换
      const stepsA = [{ name: '确认执行范围', prompt: '解析任务，确认执行范围。\n\n### 知识命中报告\n{KNOWLEDGE_HIT_REPORT}\n' }]
      const outA = await captureOutput(() => outputStep('execute', 0, stepsA, fx.root, changeName, 'ki-proj', { specRoot: fx.specBase }))
      // B：模拟没有本特性时的输出——占位符预替换为旧替换值（零命中知识口径）
      const stepsB = [{ name: '确认执行范围', prompt: '解析任务，确认执行范围。\n\n### 知识命中报告\nStatus: no matches\n' }]
      const outB = await captureOutput(() => outputStep('execute', 0, stepsB, fx.root, changeName, 'ki-proj', { specRoot: fx.specBase }))
      assertTrue(outA === outB, '无词汇文件时完整 prompt 输出与没有本特性时逐字一致（A/B 全文对比）')
      assertTrue(!outA.includes(VOCAB_HEADER), '无词汇文件零词汇段膨胀')
    } finally {
      if (prevGuide === undefined) delete process.env.SILLYSPEC_STEP_GUIDE
      else process.env.SILLYSPEC_STEP_GUIDE = prevGuide
    }
  } finally { cleanup(fx) }
}

// ── 6. quick step1 对称：词汇段追加注入 ───────────────────────────────────────
console.log('\n--- 6. quick step1 词汇段对称注入 ---')
{
  const fx = makeSpecRoot()
  try {
    writeFiveFileFixture(fx.knowledgeDir)
    writeGlossary(fx.knowledgeDir)
    const sid = 'quick-abcd9999'
    const guardDir = join(fx.specBase, '.runtime', 'quick-sessions', sid)
    mkdirSync(guardDir, { recursive: true })
    writeFileSync(join(guardDir, 'guard.json'), JSON.stringify({ taskDescription: '改个文案和样式而已' }), 'utf8')
    const steps = [{ name: '理解任务', prompt: '解析任务参数，加载项目上下文。' }]
    const out = await captureOutput(() => outputStep('quick', 0, steps, fx.root, sid, 'ki-proj', { specRoot: fx.specBase }))
    assertTrue(!out.includes(KNOW_HEADER), 'taskDescription 零命中：知识段零注入（既有口径）')
    assertTrue(out.includes(VOCAB_HEADER), 'quick step1 词汇段对称注入（恒在场）')
  } finally { cleanup(fx) }
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${6} 节  ❌ 失败断言: ${failed}`)
if (failures.length > 0) { console.log('失败项:'); failures.forEach(f => console.log(`  - ${f}`)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
