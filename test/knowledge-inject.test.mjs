/**
 * 机械知识注入（2026-09-14-knowledge-loop-close task-04，FR-04 / D-002@v1 总体方案 D）
 *
 * 覆盖三个注入点 + 共享底座：
 *   1) run/prompt.js buildKnowledgeInjection 单测：top-3 限额（INDEX 行序前 3 个不同 file）/
 *      段头格式/截断标记/未命中零字节/hits.jsonl 落盘字段
 *   2) run/prompt.js outputStep execute「确认执行范围」{KNOWLEDGE_HIT_REPORT} 升级：
 *      命中正文进 prompt + 旧 knowledge-hit-report.json 照旧落盘（新旧遥测共存）；
 *      未命中 prompt 与升级前字节一致（A/B 双跑字节对比——B 用升级前替换值 'Status: no matches'
 *      预替换占位符模拟）
 *   3) run/prompt.js outputStep quick step1：guard.taskDescription 匹配注入 + 未命中零变化
 *   4) stages/execute.js buildWavePrompt：Wave 任务名串匹配段——纯文本注入，include 计数
 *      不被抬高（execute-testcase-design-include.test.mjs:74 约束）；并与 prompt.js 版做
 *      格式等价断言（两处实现因 ESM 环约束无法共享代码，靠本测试锁漂移）
 *
 * fixture：临时 knowledge 目录 + 临时 runtimeDir（mkdtempSync，Windows 兼容 join 路径）。
 */
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildKnowledgeInjection, KNOWLEDGE_INJECT_MAX_FILES, KNOWLEDGE_INJECT_MAX_LINES } from '../src/run/prompt.js'
import { outputStep } from '../src/run/prompt.js'
import { buildWavePrompt } from '../src/stages/execute.js'
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
  const root = mkdtempSync(join(tmpdir(), 'ki-inject-'))
  const specBase = join(root, '.sillyspec')
  mkdirSync(join(specBase, 'knowledge'), { recursive: true })
  mkdirSync(join(specBase, '.runtime'), { recursive: true })
  return { root, specBase, runtimeDir: join(specBase, '.runtime'), knowledgeDir: join(specBase, 'knowledge') }
}

function cleanup({ root }) {
  try { rmSync(root, { recursive: true, force: true }) } catch { /* Windows 句柄迟滞容忍 */ }
}

/**
 * 造 5 文件命中 fixture：INDEX 行序 ka → kb → kc → kd → ke（ka 双条目验证同 file 去重 +
 * 单文件多锚点；ke 60 行验证截断）。query '限流 登录 计数 worktree 补丁 灰度' 命中全部。
 */
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

/** 捕获 console.log 输出（warn/error 放行——后台平台 sync 噪音不进字节对比面） */
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

const HIT_QUERY = '限流 登录 计数 worktree 补丁 灰度'
const HEADER = `📚 命中知识（CLI 按任务描述机械匹配，top-${KNOWLEDGE_INJECT_MAX_FILES}）`
const TRUNC_MARK = '…（截断）'

// ── 1. buildKnowledgeInjection：top-3 限额 + INDEX 行序 + 段头格式 ────────────
console.log('--- 1. buildKnowledgeInjection top-3 限额 / INDEX 行序 / 段头 ---')
{
  const fx = makeSpecRoot()
  try {
    writeFiveFileFixture(fx.knowledgeDir)
    const ki = buildKnowledgeInjection({
      knowledgeDir: fx.knowledgeDir, runtimeDir: fx.runtimeDir,
      change: '2026-09-14-ki-test', query: HIT_QUERY,
    })
    assertTrue(ki.matched === true, '5 文件全命中时 matched=true')
    assertTrue(ki.section.includes(HEADER), `段头含「${HEADER}」`)
    assertTrue(ki.section.includes('Status: matched | Entries: 6 | Sources:'), '段头保留命中报告语义（Status/Entries/Sources，6 条目全列）')
    const fileBlocks = [...ki.section.matchAll(/^── ([^\s（]+)/gm)].map(m => m[1])
    assertTrue(fileBlocks.length === KNOWLEDGE_INJECT_MAX_FILES,
      `正文块数 = top-3（实际 ${fileBlocks.length}）`)
    assertTrue(fileBlocks[0] === 'ka.md#限流坑锚点' && fileBlocks[1] === 'kb.md' && fileBlocks[2] === 'kc.md#计数坑锚点',
      `按 INDEX 行序取前 3 个不同 file（实际 ${fileBlocks.join(' | ')}）——ka 双条目去重只占一席`)
    assertTrue(!ki.section.includes('kd-补丁正文行A') && !ki.section.includes('ke-灰度line-01'),
      '第 4/5 个文件（kd/ke）正文不注入')
    assertTrue(ki.section.includes('ka-限流正文行A') && ki.section.includes('kb-worktree正文行A') && ki.section.includes('kc-计数正文行A'),
      '前 3 个文件正文实际注入')
  } finally { cleanup(fx) }
}

// ── 2. 截断标记：单文件首 40 行 + '…（截断）' ────────────────────────────────
console.log('\n--- 2. 截断标记（单文件行数截断） ---')
{
  const fx = makeSpecRoot()
  try {
    // 只留 ke（60 行）可命中：构造单条目 INDEX
    writeFileSync(join(fx.knowledgeDir, 'ke.md'),
      ['# ke', ...Array.from({ length: 59 }, (_, i) => `ke-灰度line-${String(i + 1).padStart(2, '0')}`)].join('\n') + '\n', 'utf8')
    writeFileSync(join(fx.knowledgeDir, 'INDEX.md'), '## Known Issues\n- 灰度 → [灰度坑](ke.md)\n', 'utf8')
    const ki = buildKnowledgeInjection({ knowledgeDir: fx.knowledgeDir, runtimeDir: fx.runtimeDir, change: 'c1', query: '灰度 发布' })
    assertTrue(ki.section.includes(TRUNC_MARK), `超长文件截断标记「${TRUNC_MARK}」出现`)
    const l40 = `ke-灰度line-${String(40 - 1).padStart(2, '0')}`  // 正文首行是 '# ke'，第 40 行 = line-39
    const l41 = `ke-灰度line-${String(41 - 1).padStart(2, '0')}`
    assertTrue(ki.section.includes(l40), `首 40 行内容在内（${l40}）`)
    assertTrue(!ki.section.includes(l41), `第 41 行起被截掉（${l41} 不出现）`)
    assertTrue(KNOWLEDGE_INJECT_MAX_LINES === 40, '截断行数常量 = 40（R-02）')
  } finally { cleanup(fx) }
}

// ── 3. 未命中零字节 + INDEX 缺失 no-op ────────────────────────────────────────
console.log('\n--- 3. 未命中 / INDEX 缺失零变化 ---')
{
  const fx = makeSpecRoot()
  try {
    writeFiveFileFixture(fx.knowledgeDir)
    const ki = buildKnowledgeInjection({ knowledgeDir: fx.knowledgeDir, runtimeDir: fx.runtimeDir, change: 'c1', query: '完全不相关的查询词组' })
    assertTrue(ki.matched === false && ki.section === '', '未命中 section 恒空串（零字节）')
    assertTrue(ki.report === 'Status: no matches', '未命中 report 与升级前字节一致（Status: no matches）')
    assertTrue(!existsSync(join(fx.runtimeDir, 'knowledge-hits.jsonl')), '未命中不落 hits.jsonl')
    const ki2 = buildKnowledgeInjection({ knowledgeDir: join(fx.root, 'no-such-knowledge'), runtimeDir: fx.runtimeDir, change: 'c1', query: '限流' })
    assertTrue(ki2.section === '' && ki2.report === 'Status: no matches (INDEX.md not found)',
      'INDEX 缺失 no-op（matchKnowledge 既有口径透传，不抛）')
  } finally { cleanup(fx) }
}

// ── 4. hits.jsonl 落盘：记录数与字段 ─────────────────────────────────────────
console.log('\n--- 4. hits.jsonl 遥测（type:inject） ---')
{
  const fx = makeSpecRoot()
  try {
    writeFiveFileFixture(fx.knowledgeDir)
    buildKnowledgeInjection({ knowledgeDir: fx.knowledgeDir, runtimeDir: fx.runtimeDir, change: '2026-09-14-ki-test', query: HIT_QUERY })
    buildKnowledgeInjection({ knowledgeDir: fx.knowledgeDir, runtimeDir: fx.runtimeDir, change: '2026-09-14-ki-test', query: '完全不相关' })
    const hits = readKnowledgeHits(fx.runtimeDir)
    assertTrue(hits.length === 1, `注入事件逐条落盘：1 次命中 1 条、未命中 0 条（实际 ${hits.length}）`)
    const rec = hits[0]
    assertTrue(rec.type === 'inject', 'type=inject')
    assertTrue(rec.change === '2026-09-14-ki-test', 'change 字段透传变更名')
    assertTrue(rec.query === HIT_QUERY, 'query 字段为查询串原文')
    assertTrue(Array.isArray(rec.matchedFiles) && rec.matchedFiles.length === 6 &&
      rec.matchedFiles.includes('ka.md#限流坑锚点') && rec.matchedFiles.includes('kb.md') && rec.matchedFiles.includes('ke.md'),
      'matchedFiles 含全部命中条目（file#anchor，无锚点裸 file）')
    assertTrue(typeof rec.at === 'string' && Number.isFinite(Date.parse(rec.at)), 'at 为可解析 ISO 时间')
  } finally { cleanup(fx) }
}

// ── 5. outputStep execute「确认执行范围」：正文进 prompt + 旧 report.json 共存 ──
console.log('\n--- 5. outputStep execute {KNOWLEDGE_HIT_REPORT} 升级 ---')
{
  const fx = makeSpecRoot()
  try {
    writeFiveFileFixture(fx.knowledgeDir)
    const changeName = '2026-09-14-ki-exec'
    const changeDir = join(fx.specBase, 'changes', changeName)
    mkdirSync(join(changeDir, 'tasks'), { recursive: true })
    // taskContext = changeName + tasks.md 任务行（既有查询串来源）
    writeFileSync(join(changeDir, 'tasks.md'), '# Tasks\n\n- [ ] task-01: 限流 登录 修复\n- [ ] task-02: worktree 计数 补丁\n', 'utf8')
    const steps = [{ name: '确认执行范围', prompt: '解析任务，确认执行范围。\n\n### 知识命中报告\n{KNOWLEDGE_HIT_REPORT}\n' }]
    const out = await captureOutput(() => outputStep('execute', 0, steps, fx.root, changeName, 'ki-proj', { specRoot: fx.specBase }))
    assertTrue(out.includes(HEADER), 'execute step prompt 含「📚 命中知识」段头')
    assertTrue(out.includes('ka-限流正文行A') && out.includes('kb-worktree正文行A'), '命中文件正文进 step prompt')
    assertTrue(!out.includes('{KNOWLEDGE_HIT_REPORT}'), '占位符已替换无残留')
    // 旧 report.json 照旧落盘（matched:true 快照）
    const reportPath = join(fx.runtimeDir, 'knowledge-hit-report.json')
    assertTrue(existsSync(reportPath), '既有 knowledge-hit-report.json 照旧落盘（兼容共存）')
    const reportJson = JSON.parse(readFileSync(reportPath, 'utf8'))
    // 查询串 = changeName + tasks.md 任务行（不含「灰度」→ 5/6 条命中）
    assertTrue(reportJson.matched === true && reportJson.entry_count === 5, 'report.json 内容为 matchKnowledge json 快照（matched/entry_count）')
    // 新遥测
    const hits = readKnowledgeHits(fx.runtimeDir)
    assertTrue(hits.length === 1 && hits[0].type === 'inject' && hits[0].change === changeName, 'hits.jsonl 落 1 条 inject 记录（change=变更名）')
    assertTrue(hits[0].query.includes(changeName) && hits[0].query.includes('限流 登录 修复') && hits[0].query.includes('worktree 计数 补丁'),
      '查询串含 changeName + tasks.md 任务行（既有来源）')
  } finally { cleanup(fx) }
}

// ── 6. outputStep execute 未命中：与升级前字节一致（A/B 双跑字节对比） ─────────
console.log('\n--- 6. outputStep execute 未命中零变化（字节对比） ---')
{
  const fx = makeSpecRoot()
  try {
    writeFiveFileFixture(fx.knowledgeDir)
    const changeName = '2026-09-14-ki-nomatch' // 查询词不命中任何 keyword
    // A：升级后真实路径——占位符经未命中分支替换
    const stepsA = [{ name: '确认执行范围', prompt: '解析任务，确认执行范围。\n\n### 知识命中报告\n{KNOWLEDGE_HIT_REPORT}\n' }]
    const outA = await captureOutput(() => outputStep('execute', 0, stepsA, fx.root, changeName, 'ki-proj', { specRoot: fx.specBase }))
    // B：模拟升级前输出——占位符预替换为旧替换值 'Status: no matches'（知识块整体跳过）
    const stepsB = [{ name: '确认执行范围', prompt: '解析任务，确认执行范围。\n\n### 知识命中报告\nStatus: no matches\n' }]
    const outB = await captureOutput(() => outputStep('execute', 0, stepsB, fx.root, changeName, 'ki-proj', { specRoot: fx.specBase }))
    assertTrue(outA === outB, '未命中时完整 prompt 输出与升级前字节一致（A/B 全文对比）')
    assertTrue(outA.includes('Status: no matches') && !outA.includes('📚 命中知识'), '未命中替换为旧口径文本，无知识段膨胀')
    const reportJson = JSON.parse(readFileSync(join(fx.runtimeDir, 'knowledge-hit-report.json'), 'utf8'))
    assertTrue(reportJson.matched === false && reportJson.entry_count === 0, '未命中 report.json 仍落盘 matched:false（既有行为不变）')
    assertTrue(readKnowledgeHits(fx.runtimeDir).length === 0, '未命中零遥测')
  } finally { cleanup(fx) }
}

// ── 7. outputStep quick step1：taskDescription 匹配注入 ───────────────────────
console.log('\n--- 7. quick step1 注入（guard.taskDescription） ---')
{
  const fx = makeSpecRoot()
  try {
    writeFiveFileFixture(fx.knowledgeDir)
    const sid = 'quick-abcd1234'
    const guardDir = join(fx.specBase, '.runtime', 'quick-sessions', sid)
    mkdirSync(guardDir, { recursive: true })
    writeFileSync(join(guardDir, 'guard.json'), JSON.stringify({ taskDescription: '修复 限流 登录 计数 的坑' }), 'utf8')
    const steps = [{ name: '理解任务', prompt: '解析任务参数，加载项目上下文。' }]
    const out = await captureOutput(() => outputStep('quick', 0, steps, fx.root, sid, 'ki-proj', { specRoot: fx.specBase }))
    assertTrue(out.includes(HEADER), 'quick step1 prompt 含「📚 命中知识」段')
    assertTrue(out.includes('ka-限流正文行A'), '命中正文注入 step1 prompt')
    const hits = readKnowledgeHits(fx.runtimeDir)
    assertTrue(hits.length === 1 && hits[0].change === sid && hits[0].query === '修复 限流 登录 计数 的坑',
      'hits.jsonl 落 1 条 inject（change=quick sessionId，query=taskDescription 原文）')
  } finally { cleanup(fx) }
}

// ── 8. quick step1 未命中零变化（字节对比） ──────────────────────────────────
console.log('\n--- 8. quick step1 未命中零变化（字节对比） ---')
{
  const fx = makeSpecRoot()
  try {
    writeFiveFileFixture(fx.knowledgeDir)
    const sid = 'quick-0badc0de'
    const guardDir = join(fx.specBase, '.runtime', 'quick-sessions', sid)
    mkdirSync(guardDir, { recursive: true })
    writeFileSync(join(guardDir, 'guard.json'), JSON.stringify({ taskDescription: '改个文案和样式而已' }), 'utf8')
    const steps = [{ name: '理解任务', prompt: '解析任务参数，加载项目上下文。' }]
    const outA = await captureOutput(() => outputStep('quick', 0, steps, fx.root, sid, 'ki-proj', { specRoot: fx.specBase }))
    // B：无 guard.taskDescription（未带 --input）→ 查询串空整段跳过
    const sid2 = 'quick-11112222'
    const outB = await captureOutput(() => outputStep('quick', 0, steps, fx.root, sid2, 'ki-proj', { specRoot: fx.specBase }))
    assertTrue(!outA.includes('📚 命中知识') && !outB.includes('📚 命中知识'), '未命中 / 无 taskDescription 均零注入')
    const norm = s => s.replace(/quick-[0-9a-f]{8}/g, 'quick-SID')
    assertTrue(norm(outA) === norm(outB), '两路径输出字节一致（sessionId 归一后全文对比）')
    assertTrue(readKnowledgeHits(fx.runtimeDir).length === 0, '零遥测')
  } finally { cleanup(fx) }
}

// ── 9. buildWavePrompt：Wave 任务名串匹配段（纯文本，include 计数不抬高） ─────
console.log('\n--- 9. buildWavePrompt Wave 粒度注入 ---')
{
  const fx = makeSpecRoot()
  const restore = withoutSillyHubEnv()
  try {
    writeFiveFileFixture(fx.knowledgeDir)
    const changeName = '2026-09-14-ki-wave'
    const changeDir = join(fx.specBase, 'changes', changeName)
    mkdirSync(changeDir, { recursive: true })
    const wave = {
      index: 1,
      tasks: [
        { index: 1, name: '限流 登录 修复' },
        { index: 2, name: 'worktree 计数 补丁 灰度' },
      ]
    }
    const out = buildWavePrompt(wave, 1, changeDir, join(fx.root, 'wt'), { cwd: fx.root })
    assertTrue(out.includes('### 📚 命中知识（CLI 按 Wave 任务名机械匹配，top-3'), 'Wave prompt 含知识段头（Wave 任务名来源标注）')
    assertTrue(out.includes('ka-限流正文行A') && out.includes('kb-worktree正文行A') && out.includes('kc-计数正文行A'), 'top-3 文件正文注入 Wave prompt')
    assertTrue(out.includes('勿自行重跑 INDEX 匹配'), '段内注明来源 + 勿自行重跑匹配')
    const n = (out.match(/\{\{include: testcase-design\}\}/g) || []).length
    assertTrue(n === 1, `知识段为纯文本注入，include 计数仍恰为 1（实际 ${n}）`)
    const hits = readKnowledgeHits(fx.runtimeDir)
    assertTrue(hits.length === 1 && hits[0].type === 'inject' && hits[0].change === changeName,
      'hits.jsonl 落 1 条 inject（change=变更名）')
    assertTrue(hits[0].query.includes('限流 登录 修复') && hits[0].query.includes('worktree 计数 补丁 灰度'),
      '查询串为本 Wave 各 task 标题拼接')
    // 未命中 Wave：零段零遥测，include 计数不抬
    const missDir = join(fx.specBase, 'changes', '2026-09-14-ki-wave-miss')
    mkdirSync(missDir, { recursive: true })
    const outMiss = buildWavePrompt({ index: 2, tasks: [{ index: 3, name: '纯文案调整' }] }, 2, missDir, join(fx.root, 'wt'), { cwd: fx.root })
    assertTrue(!outMiss.includes('📚 命中知识'), '未命中 Wave 零注入（字节零膨胀）')
    const nMiss = (outMiss.match(/\{\{include: testcase-design\}\}/g) || []).length
    assertTrue(nMiss === 1, `未命中 Wave include 计数仍为 1（实际 ${nMiss}）`)
    assertTrue(readKnowledgeHits(fx.runtimeDir).length === 1, '未命中 Wave 不追加遥测')
    // 格式等价锁：Wave 段与 prompt.js 版 buildKnowledgeInjection 同 query 时正文块逐字一致
    const ki = buildKnowledgeInjection({ knowledgeDir: fx.knowledgeDir, runtimeDir: join(fx.root, 'fmt-lock-runtime'), change: changeName, query: hits[0].query })
    const blocksOf = s => [...s.matchAll(/^── .+$/gm)].map(m => m[0])
    assertTrue(JSON.stringify(blocksOf(out)) === JSON.stringify(blocksOf(ki.section)),
      'Wave 段与 prompt.js 版文件块格式逐字一致（ESM 环约束下双实现的漂移锁）')
    assertTrue(out.includes('（命中清单如上；正文按 INDEX 行序注入前 3 个不同文件，单文件首 40 行截断') &&
      ki.section.includes('（命中清单如上；正文按 INDEX 行序注入前 3 个不同文件，单文件首 40 行截断'),
      '限额说明行文案一致（限额常量漂移锁）')
  } finally { restore(); cleanup(fx) }
}

// ── 10. quicklog 检索面（知识可见性导线）：独立于 INDEX 知识面，INDEX 未命中时照常注入 ──
console.log('\n--- 10. quicklog 检索面注入 ---')
{
  const fx = makeSpecRoot()
  const restore = withoutSillyHubEnv()
  try {
    // quicklog fixture：一条 claude autocompact 修补（标题/文件名可被查询命中）
    mkdirSync(join(fx.specBase, 'quicklog'), { recursive: true })
    writeFileSync(join(fx.specBase, 'quicklog', 'QUICKLOG-test.md'), [
      '## ql-20260920-007-x | 2026-09-20 17:27:00 | claude 引擎 autocompact 做成 provider 级可配',
      '状态：已完成',
      '文件：',
      '- sillyhub-daemon/src/claude-settings.ts（白名单三键）',
      '方案：白名单加 autoCompactWindow 等三键+值守护',
      '',
    ].join('\n'), 'utf8')
    const QL_QUERY = 'claude autocompact provider 配置 claude-settings 白名单'

    // 10a INDEX 缺失 + quicklog 命中 → matched:true 且段注入（两检索面独立）
    const ki = buildKnowledgeInjection({ knowledgeDir: fx.knowledgeDir, runtimeDir: fx.runtimeDir, change: 't-ql', query: QL_QUERY })
    assertTrue(ki.matched === true && ki.section.includes('🕘 近期 quick 修补') && ki.section.includes('ql-20260920-007-x'),
      '10a INDEX 未命中时 quicklog 段照常注入（matched=true）')
    // 10b quickHits 字段形状（日期截 10）
    assertTrue(Array.isArray(ki.quickHits) && ki.quickHits[0] && ki.quickHits[0].qlId === 'ql-20260920-007-x' && ki.quickHits[0].date === '2026-09-20',
      '10b quickHits 返回形状（qlId/date 截 10/title/files）')
    // 10c 遥测记录带 quicklogIds
    const rec = readKnowledgeHits(fx.runtimeDir).find((h) => h.type === 'inject')
    assertTrue(rec && Array.isArray(rec.quicklogIds) && rec.quicklogIds.includes('ql-20260920-007-x'),
      '10c hits.jsonl inject 记录含 quicklogIds')
    // 10d 双面并存：INDEX 命中 + quicklog 命中 → 两段都在
    writeFiveFileFixture(fx.knowledgeDir)
    const both = buildKnowledgeInjection({ knowledgeDir: fx.knowledgeDir, runtimeDir: join(fx.root, 'rt2'), change: 't-both', query: `${HIT_QUERY} claude autocompact claude-settings` })
    assertTrue(both.section.includes('📚 命中知识') && both.section.includes('🕘 近期 quick 修补'),
      '10d INDEX 知识段与 quicklog 段并存')
    // 10e Wave 孪生：quicklog-only 查询词（INDEX 不含这些关键词）→ Wave prompt 含 h3 quicklog 段
    const changeName = '2026-09-21-ki-ql-wave'
    const changeDir = join(fx.specBase, 'changes', changeName)
    mkdirSync(changeDir, { recursive: true })
    const wave = { index: 1, tasks: [{ index: 1, name: 'claude autocompact 白名单 调整' }] }
    const out = buildWavePrompt(wave, 1, changeDir, join(fx.root, 'wt'), { cwd: fx.root })
    assertTrue(out.includes('### 🕘 近期 quick 修补') && out.includes('ql-20260920-007-x'),
      '10e execute.js Wave 孪生注入 quicklog 段（h3 层级）')
    // 10f 无 quicklog 无 INDEX → 既有行为零回归（matched:false 零字节）
    const fx2 = makeSpecRoot()
    try {
      const miss = buildKnowledgeInjection({ knowledgeDir: fx2.knowledgeDir, runtimeDir: fx2.runtimeDir, change: 't-miss', query: '任意 查询 词组' })
      assertTrue(miss.matched === false && miss.section === '', '10f 无 quicklog 无 INDEX → matched:false 零字节（既有行为）')
    } finally { cleanup(fx2) }
  } finally { restore(); cleanup(fx) }
}

console.log(`\n${'='.repeat(50)}`)
const total = 47
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
if (failures.length > 0) { console.log('失败项:'); failures.forEach(f => console.log(`  - ${f}`)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
