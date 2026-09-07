/**
 * verify-probes-facts.test.mjs — P3b facts 底稿 / 骨架层标注 / 探针一致性抽查 / gates 接线测试套件
 * （ir-stage-p3b task-05 收官，锁定 task-01/02/03 行为，commit 86c15ba/3798986/3079e67）
 *
 * 覆盖（对应 design 分层）：
 *   - buildVerifyFacts（task-01，src/verify-probes.js）：完整 result→metrics 映射、缺字段/类型
 *     不符 fail-soft（少列键不报错）、now 缺省取当前 ISO。
 *   - writeVerifyFacts（task-01）：落盘 JSON + 尾换行 + 覆盖刷新（两次调用 generatedAt 前进、
 *     metrics 反映最近一次 result——「最近一次 init 快照」语义）。
 *   - generateVerifyResultSkeleton 层标注（task-01）：十章节标题全部带 [层：…] 纯后缀（不新增行）、
 *     结论占位 <待填 前缀保留；extractVerifyConclusion 行为等价断言（stage-contract.js:461-482
 *     提取正则副本——层后缀不改 PASS/FAIL 关键词提取，骨架不能因后缀而过/不过门）。
 *   - 锚点 round-trip（task-02，src/verify-postcheck.js）：runVerifyProbes 形态 result →
 *     renderVerifyProbesReport 渲染 → parseProbePrefillAnchors 解析 → 指标一致；探针 2/4 撞形
 *     散文不计数（#### 子节定界 G8）+ 行首锚定 + CRLF 归一。
 *   - checkProbeConsistency（task-02，真实 git 仓 fixture 场景矩阵）：未篡改 ok / 篡改 probe1 命中数
 *     ERROR / 篡改 probe6 fail-closed（facts 缺席无法证实 HEAD 前进→按疑似篡改报）/ R-06 HEAD 前进
 *     降 WARNING / probe3、probe5 漂移 WARNING / 删全部子节 facts 在场 ERROR 不在场 skipped /
 *     verify-result.md 不存在 skipped / 重跑异常 degraded。
 *   - gates 接线（task-03，src/run/gates.js 三 helper 直调）：print 返回值 = 阻断契约
 *     （error→true、warning/skip/degraded/ok→false）；信封 code 四值路由 + severity 分级 +
 *     evidence 计数；落盘 verify-runs/<ts>/probe-consistency-result.json snake_case 字段 + fail-soft。
 *   - CLI --init 集成（子进程真跑 bin/sillyspec.js）：骨架 + facts 落盘；二跑骨架不覆盖、facts 照样刷新。
 */
import { execSync, spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

import {
  buildVerifyFacts, writeVerifyFacts, renderVerifyProbesReport, generateVerifyResultSkeleton, runVerifyProbes,
} from '../src/verify-probes.js'
import {
  checkProbeConsistency, parseProbePrefillAnchors,
  PROBE1_HIT_LINE_RE, PROBE3_HASTEST_LINE_RE, PROBE5_SUMMARY_LINE_RE, PROBE5_MISSING_ROW_RE, PROBE6_DELETION_LINE_RE,
} from '../src/verify-postcheck.js'
import {
  buildProbeConsistencyEnvelope, writeProbeConsistencyRunResult, printProbeConsistencyCheck,
} from '../src/run/gates.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const cliBin = join(__dirname, '..', 'bin', 'sillyspec.js')

let total = 0
let failed = 0
function assert(cond, msg) {
  total++
  if (!cond) { failed++; console.log(`  ❌ FAIL: ${msg}`) }
  else console.log(`  ✅ PASS: ${msg}`)
}

/** 同步毫秒级 sleep（Atomics.wait 主线程可用）：保证两次 writeVerifyFacts 的 generatedAt（ms 精度）可分辨 */
function sleepMs(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

// ── fixture helpers（风格同 plan-target-files.test.mjs，P3a 收官套件同源）──

function mkDir(prefix) {
  return mkdtempSync(join(tmpdir(), prefix))
}
function git(cwd, args) {
  return execSync(`git ${args}`, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).toString()
}
function mkRepo(prefix) {
  const dir = mkDir(prefix)
  git(dir, 'init -q -b main')
  git(dir, 'config user.email t@t.t')
  git(dir, 'config user.name t')
  return dir
}
function commitAll(dir, msg) {
  git(dir, 'add -A')
  git(dir, `commit -q -m "${msg}"`)
}

/** 捕获 console 输出（gates print 层断言用，避免污染测试输出且可断言文案） */
function captureConsole(fn) {
  const out = []
  const orig = { log: console.log, warn: console.warn, error: console.error }
  console.log = (...a) => out.push(a.map(String).join(' '))
  console.warn = (...a) => out.push(a.map(String).join(' '))
  console.error = (...a) => out.push(a.map(String).join(' '))
  try {
    const ret = fn()
    return { ret, out: out.join('\n') }
  } finally {
    console.log = orig.log; console.warn = orig.warn; console.error = orig.error
  }
}

/**
 * 标准探针 fixture（真实 git 仓）：
 *   - a.js 含 2 个 TODO 标记（probe1 可命中 2 条）；src/feature.js + co-located 测试（probe3 hasTest）；
 *   - design.md 声明删除 old.js（probe6 ✅ 合规 verdict——`（git 状态 D）` 尾缀锚行可构造）；
 *   - old.js 存活于 base commit，调用方自行 rm 以制造工作树删除（rmOld=true 时 init 前已删）。
 * 返回 { dir, sb, cd, change }，changeDir 内已写 design.md / tasks.md / task-01.md。
 */
function mkProbeFixture(prefix, { rmOld = false } = {}) {
  const dir = mkRepo(prefix)
  writeFileSync(join(dir, '.gitignore'), '.sillyspec/\n')
  writeFileSync(join(dir, 'a.js'), 'console.log(1)\n// TODO: one\n// FIXME: two\n')
  mkdirSync(join(dir, 'src'), { recursive: true })
  writeFileSync(join(dir, 'src', 'feature.js'), 'export const f = 1\n')
  writeFileSync(join(dir, 'src', 'feature.test.js'), 'test("f", () => {})\n')
  writeFileSync(join(dir, 'old.js'), 'x\n')
  commitAll(dir, 'base')
  if (rmOld) rmSync(join(dir, 'old.js'))

  const sb = join(dir, '.sillyspec')
  const change = '2026-09-07-' + prefix.replace(/[^a-z0-9]/gi, '').slice(0, 6)
  const cd = join(sb, 'changes', change)
  mkdirSync(join(cd, 'tasks'), { recursive: true })
  writeFileSync(join(cd, 'design.md'), [
    '## 文件变更清单', '',
    '| 操作 | 文件 | 说明 |', '|---|---|---|',
    '| 修改 | a.js | 加功能 |',
    '| 删除 | old.js | 清理 |',
    '',
  ].join('\n'))
  writeFileSync(join(cd, 'tasks.md'), '- [ ] task-01: 特性\n')
  writeFileSync(join(cd, 'tasks', 'task-01.md'), '---\nid: task-01\nallowed_paths: [src/feature.js]\n---\n# task-01\n')
  return { dir, sb, cd, change }
}

/** 对 fixture 跑探针 → 写骨架 + facts（等价 verify-probes --init 的产物落盘路径） */
function initProbeArtifacts(fx) {
  const result = runVerifyProbes({ cwd: fx.dir, changeName: fx.change })
  writeFileSync(join(fx.cd, 'verify-result.md'), generateVerifyResultSkeleton(result))
  const { facts, path } = writeVerifyFacts(fx.cd, result, fx.change)
  return { result, reportPath: join(fx.cd, 'verify-result.md'), factsPath: path, facts }
}

/** rewrite facts（generatedAt 等字段直改——facts 是 JSON 底稿，测试拨钟构造 R-06 时序） */
function rewriteFacts(factsPath, patch) {
  const f = JSON.parse(readFileSync(factsPath, 'utf8'))
  Object.assign(f, patch)
  writeFileSync(factsPath, JSON.stringify(f, null, 2) + '\n')
  return f
}

/**
 * extractVerifyConclusion 行为等价副本（正则逐字复制自 src/stage-contract.js:461-482——该函数
 * 非 export，这里锁定「P3b 层标注后缀不改提取行为」的兼容契约：同输入必同输出）。
 */
function extractConclusionLike(verify) {
  const headingRe = /^##\s[^\n]*(?:结论|conclusion|result|结果)/gim
  let best = null
  let bestPriority = -1
  for (const headingMatch of verify.matchAll(headingRe)) {
    const start = headingMatch.index
    const slice = verify.slice(start, start + 400)
    const kw = slice.match(/\b(PASS(?:\s+WITH\s+NOTES)?|FAIL)\b/i)
    if (!kw) continue
    const text = headingMatch[0].toLowerCase()
    const priority = (/结论|conclusion/i.test(text)) ? 1 : 0
    if (priority > bestPriority || (priority === bestPriority && !best)) {
      best = kw[1].toUpperCase().replace(/\s+/g, ' ')
      bestPriority = priority
    }
  }
  return best || ''
}

/** 手工构造的 runVerifyProbes 形态 result（round-trip 用：可控的各探针计数/三态） */
function mkRoundTripResult() {
  return {
    probe1: {
      matches: [
        { file: 'a.js', line: 3, content: '// TODO: one' },
        { file: 'b.js', line: 9, content: '// FIXME: two' },
      ],
      globEntries: ['src/*.js'],
      skippedFiles: ['gone.js'],
      worktreeHits: 2,
    },
    probe3: {
      tasks: [
        { task: 'task-01', moduleDirs: ['src'], testFiles: ['src/a.test.js', 'src/b.spec.js'], testFileCount: 2, hasTest: true, located: true },
        { task: 'task-02', moduleDirs: [], testFiles: [], testFileCount: 0, hasTest: false, located: false },
      ],
      note: '语义判断留 agent',
    },
    probe5: {
      summary: '❌ API parity check failed: backend 2 / frontend 3 (1 missing)',
      backendCount: 2,
      frontendCount: 3,
      missingBackend: [{ method: 'GET', path: '/api/ghost', consumerFile: 'web/app.ts', consumerLine: 42 }],
      unusedBackend: [{ method: 'POST', path: '/api/y' }],
      prefixAlignedCount: 1,
      scanRoots: ['main', 'worktree'],
    },
    probe6: {
      deletions: [
        { path: 'old-a.js', status: 'D', designOp: '删除', verdict: '✅ 合规（design 声明删除）' },
        { path: 'old-b.js', status: 'D', designOp: null, verdict: '⚠️ 未声明删除（design 清单未列出）' },
      ],
      unavailable: false,
      note: '以 git 事实为准',
    },
  }
}

// ═══════════════════════════════════════════════════════════════
// A. buildVerifyFacts（纯函数：映射 / fail-soft / now 缺省）
// ═══════════════════════════════════════════════════════════════
console.log('=== A. buildVerifyFacts 纯函数 ===\n')

// ── A1. 完整 result → metrics 映射 + 统一命令行 + 显式 now ──
{
  const facts = buildVerifyFacts(mkRoundTripResult(), { changeName: '2026-09-07-vp', now: '2026-09-07T10:00:00.000Z' })
  assert(facts.schemaVersion === 1, `schemaVersion=1（实际: ${facts.schemaVersion}）`)
  assert(facts.change === '2026-09-07-vp', `change 回填变更名（实际: ${facts.change}）`)
  assert(facts.generatedAt === '2026-09-07T10:00:00.000Z', `显式 now 原样进 generatedAt（实际: ${facts.generatedAt}）`)
  const cmd = 'sillyspec verify-probes --change 2026-09-07-vp'
  assert(Object.values(facts.probes).every(p => p.command === cmd), '四个探针条目统一 command 命令行（可复跑审计）')
  assert(JSON.stringify(facts.probes.probe1.metrics) === JSON.stringify({ matches: 2, skippedFiles: 1, worktreeHits: 2, globEntries: 1 }),
    `probe1 metrics 四维计数（实际: ${JSON.stringify(facts.probes.probe1.metrics)}）`)
  assert(JSON.stringify(facts.probes.probe3.metrics) === JSON.stringify({ tasks: 2, hasTest: 1 }),
    `probe3 metrics = 任务数 + hasTest 数（实际: ${JSON.stringify(facts.probes.probe3.metrics)}）`)
  assert(JSON.stringify(facts.probes.probe5.metrics) === JSON.stringify({ backendEndpoints: 2, frontendCalls: 3 }),
    `probe5 metrics = backend/frontend 总数（实际: ${JSON.stringify(facts.probes.probe5.metrics)}）`)
  assert(JSON.stringify(facts.probes.probe6.metrics) === JSON.stringify({ deletions: 2, unavailable: false }),
    `probe6 metrics = 删除数 + unavailable 布尔（false 也列——typeof 过滤只剔 undefined）（实际: ${JSON.stringify(facts.probes.probe6.metrics)}）`)
}

// ── A2. 缺字段 / 类型不符 fail-soft：少列该键而非报错（「宁可少列不可失真」）──
{
  const empty = buildVerifyFacts({}, { changeName: 'c', now: 't' })
  assert(Object.values(empty.probes).every(p => JSON.stringify(p.metrics) === '{}'),
    `空 result → 四探针 metrics 全空对象不报错（实际: ${JSON.stringify(empty.probes)}）`)

  const nullResult = buildVerifyFacts(null, { changeName: 'c', now: 't' })
  assert(nullResult.probes && Object.values(nullResult.probes).every(p => JSON.stringify(p.metrics) === '{}'),
    'result=null 同样 fail-soft')

  const partial = buildVerifyFacts({
    probe1: { worktreeHits: 3 },                       // matches/skippedFiles/globEntries 缺 → 三键缺席
    probe3: { tasks: 'not-an-array' },                 // 非数组 → tasks/hasTest 均缺席
    probe5: { backendCount: '4', frontendCount: 5 },   // 非数字 → 缺席；数字 → 在场
    probe6: { deletions: [{}], unavailable: 'yes' },   // 布尔过滤 → unavailable 缺席
  }, { changeName: 'c', now: 't' })
  assert(JSON.stringify(partial.probes.probe1.metrics) === JSON.stringify({ worktreeHits: 3 }),
    `probe1 部分字段在场只列可得键（实际: ${JSON.stringify(partial.probes.probe1.metrics)}）`)
  assert(JSON.stringify(partial.probes.probe3.metrics) === '{}',
    `probe3 tasks 非数组 → 两键均缺席（实际: ${JSON.stringify(partial.probes.probe3.metrics)}）`)
  assert(JSON.stringify(partial.probes.probe5.metrics) === JSON.stringify({ frontendCalls: 5 }),
    `probe5 非数字 backendCount 缺席、数字 frontendCalls 在场（实际: ${JSON.stringify(partial.probes.probe5.metrics)}）`)
  assert(JSON.stringify(partial.probes.probe6.metrics) === JSON.stringify({ deletions: 1 }),
    `probe6 非布尔 unavailable 缺席、deletions 计数在场（实际: ${JSON.stringify(partial.probes.probe6.metrics)}）`)
}

// ── A3. now 缺省 → 当前时刻 ISO ──
{
  const before = Date.now()
  const facts = buildVerifyFacts({}, { changeName: 'c' })
  const ts = Date.parse(facts.generatedAt)
  assert(Number.isFinite(ts) && ts >= before - 1000 && ts <= Date.now() + 1000,
    `now 缺省 generatedAt 为当前时刻 ISO（实际: ${facts.generatedAt}）`)
  assert(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(facts.generatedAt), '缺省值是 ISO 8601 形态')
}

// ═══════════════════════════════════════════════════════════════
// B. writeVerifyFacts（落盘 + 覆盖刷新）
// ═══════════════════════════════════════════════════════════════
console.log('\n=== B. writeVerifyFacts 落盘/覆盖 ===\n')

{
  const changeDir = mkDir('vpf-b-')
  try {
    const r1 = mkRoundTripResult()
    const { facts: f1, path: p1 } = writeVerifyFacts(changeDir, r1, '2026-09-07-b1')
    assert(p1 === join(changeDir, 'verify-facts.json'), `落盘路径 = <changeDir>/verify-facts.json（实际: ${p1}）`)
    assert(existsSync(p1), '文件真实写盘')
    const raw = readFileSync(p1, 'utf8')
    assert(raw.endsWith('\n'), 'JSON 文本以换行收尾（POSIX 友好）')
    assert(JSON.parse(raw).change === '2026-09-07-b1', '盘上 JSON 可解析且内容一致')
    assert(JSON.parse(raw).probes.probe1.metrics.matches === 2, '首跑 metrics 进盘（probe1 matches=2）')

    // 覆盖刷新：最近快照语义——第二次调用无条件覆盖，generatedAt 前进 + metrics 反映最新 result
    sleepMs(20) // generatedAt 是 ms 精度，隔一拍保证可分辨
    const r2 = { ...r1, probe1: { ...r1.probe1, matches: r1.probe1.matches.concat([{ file: 'c.js', line: 1, content: 'TODO' }]) } }
    const { facts: f2 } = writeVerifyFacts(changeDir, r2, '2026-09-07-b1')
    const onDisk = JSON.parse(readFileSync(p1, 'utf8'))
    assert(onDisk.probes.probe1.metrics.matches === 3, `覆盖后 metrics 反映最近一次 result（实际: ${onDisk.probes.probe1.metrics.matches}）`)
    assert(onDisk.generatedAt !== f1.generatedAt,
      `两次调用 generatedAt 变化（${f1.generatedAt} → ${onDisk.generatedAt}）——最近一次 init 快照`)
    assert(onDisk.generatedAt === f2.generatedAt, '返回值与盘上一致')
  } finally { rmSync(changeDir, { recursive: true, force: true }) }
}

// ═══════════════════════════════════════════════════════════════
// C. 骨架层标注 + extractVerifyConclusion 兼容
// ═══════════════════════════════════════════════════════════════
console.log('\n=== C. 骨架十章节层标注 ===\n')

const skeleton = generateVerifyResultSkeleton(mkRoundTripResult())

// ── C1. 十章节标题全部带 [层：…] 纯后缀 ──
{
  const headings = skeleton.split('\n').filter(l => l.startsWith('## '))
  assert(headings.length === 10, `十章节齐全（实际: ${headings.length}——${headings.map(h => h.slice(0, 12)).join('/')}）`)
  assert(headings.every(h => /^## .+ \[层：[^\]]+\]$/.test(h)), '每章标题行以 [层：…] 后缀收尾')
  assert(headings.filter(h => h.endsWith('[层：人工判断]')).length === 8, '八个语义章节层标注=人工判断')
  const probeHeading = headings.find(h => h.startsWith('## 探针结果'))
  assert(probeHeading && probeHeading.includes('[层：可复跑探针——gate 抽查防篡改]'),
    `探针结果章 = 可复跑探针层（实际: ${probeHeading}）`)
  const testHeading = headings.find(h => h.startsWith('## 测试结果'))
  assert(testHeading && testHeading.includes('[层：确定性检查——CLI 实测对账]'),
    `测试结果章 = 确定性检查层（实际: ${testHeading}）`)

  // 纯渲染层后缀不新增行：剥掉全部后缀后行数不变
  const stripped = skeleton.split('\n').map(l => l.replace(/ \[层：[^\]]+\]$/, '')).join('\n')
  assert(stripped.split('\n').length === skeleton.split('\n').length, '层标注是行尾纯后缀（不新增行）')
  // 探针结果章正文内嵌 renderVerifyProbesReport 机械产物
  assert(skeleton.includes('#### 探针 1：未实现标记扫描') && skeleton.includes('b.js:9'), '骨架探针章预填渲染报告产物')
}

// ── C2. 结论占位 <待填 前缀保留（gate 判不过语义的载体）──
{
  const conclusionLine = skeleton.split('\n').find(l => l.startsWith('## 结论：'))
  assert(conclusionLine && conclusionLine.includes('<待填：PASS 或 FAIL'), `结论占位 <待填 前缀保留（实际: ${conclusionLine}）`)
  assert(conclusionLine && conclusionLine.indexOf('<待填') < conclusionLine.indexOf('[层：'), '占位在前、层后缀在后（顺序不倒）')
}

// ── C3. extractVerifyConclusion 行为等价（stage-contract 提取正则副本）──
{
  // ①层后缀不改提取行为：带后缀骨架 vs 去后缀骨架，提取结果一致
  const strippedSkeleton = skeleton.split('\n').map(l => l.replace(/ \[层：[^\]]+\]$/, '')).join('\n')
  const withSuffix = extractConclusionLike(skeleton)
  assert(withSuffix === extractConclusionLike(strippedSkeleton) && withSuffix === 'PASS',
    `层后缀不改结论提取（带后缀=${withSuffix}，去后缀=${extractConclusionLike(strippedSkeleton)}——占位模板文案含关键词，两侧一致）`)

  // ②如实填写后提取命中（P3b 后缀在场，关键词窗口制照常工作）
  const passFilled = skeleton.replace(/^## 结论：.*$/m, '## 结论：PASS 全部探针与测试通过 [层：人工判断]')
  assert(extractConclusionLike(passFilled) === 'PASS', `填写 PASS → 提取 PASS（实际: ${extractConclusionLike(passFilled)}）`)
  const failFilled = skeleton.replace(/^## 结论：.*$/m, '## 结论：FAIL 存在未修复缺陷 [层：人工判断]')
  assert(extractConclusionLike(failFilled) === 'FAIL', `填写 FAIL → 提取 FAIL（实际: ${extractConclusionLike(failFilled)}）`)

  // ③无关键词占位 → ''（verify.conclusion.fail-gate 的 noConclusionWarning 路径——骨架不能直接过门）
  const noKeyword = skeleton.replace(/^## 结论：.*$/m, '## 结论：<待填> [层：人工判断]')
  assert(extractConclusionLike(noKeyword) === '', `占位无 PASS/FAIL 关键词 → 提取空串（gate 判不过，实际: ${JSON.stringify(extractConclusionLike(noKeyword))}）`)

  // ④标题优先级不受层后缀劫持：结论章 PASS + 测试结果章正文含 FAIL → 仍取结论章（priority 结论>结果）
  const hijack = passFilled.replace(/<!--TODO: 测试命令 \+ 结果/, '测试输出出现 FAIL 字样（同形干扰）<!--TODO: 测试命令 + 结果')
  assert(extractConclusionLike(hijack) === 'PASS',
    `「结果」系标题的 FAIL 干扰不劫持「结论」章（实际: ${extractConclusionLike(hijack)}）`)
}

// ═══════════════════════════════════════════════════════════════
// D. 锚点 round-trip（render → parse 指标一致 / 撞形不计数 / CRLF）
// ═══════════════════════════════════════════════════════════════
console.log('\n=== D. 锚点 round-trip ===\n')

// ── D1. 构造 result → 渲染 → 解析：五组锚点指标与构造值一致 ──
const rtReport = renderVerifyProbesReport(mkRoundTripResult())
{
  const a = parseProbePrefillAnchors(rtReport)
  assert(a.subsections.any === true && a.subsections.probe1 && a.subsections.probe3 && a.subsections.probe5 && a.subsections.probe6,
    `四机械探针子节全在场（实际: ${JSON.stringify(a.subsections)}）`)
  assert(a.probe1Hits === 2, `probe1 命中行计数=matches.length（实际: ${a.probe1Hits}）`)
  assert(a.probe3HasTest === 1, `probe3 hasTest 行计数=1（实际: ${a.probe3HasTest}）`)
  assert(a.probe5SummaryPresent === true, 'probe5 summary 锚行存在（fail 形态）')
  assert(a.probe5Missing === 1, `probe5 missing 表行=missingBackend.length（实际: ${a.probe5Missing}）`)
  assert(a.probe6Deletions === 2, `probe6 删除条目行=deletions.length（实际: ${a.probe6Deletions}）`)
}

// ── D2. 五组导出锚点正则：行首锚定 + 形态区分 ──
{
  assert(PROBE1_HIT_LINE_RE.test('- ⚠️ `src/a.js:9` // TODO: x'), 'PROBE1_HIT_LINE_RE 命中反引号 file:line 形态')
  assert(!PROBE1_HIT_LINE_RE.test('- ⚠️ `src/a.js` 无行号'), 'probe1 正则要求 :数字 行号段（区分同形 ⚠️ 行）')
  assert(!PROBE1_HIT_LINE_RE.test('  - ⚠️ `src/a.js:9` 缩进行'), 'probe1 行首锚定（^，缩进/行内不命中）')
  assert(PROBE3_HASTEST_LINE_RE.test('- ✅ task-01: 模块目录（src）找到 2 个测试文件（a、b）'), 'PROBE3_HASTEST_LINE_RE 命中 ✅ task 行')
  assert(!PROBE3_HASTEST_LINE_RE.test('- ⚠️ task-01: 无 task 卡'), 'probe3 正则不认 ⚠️ 无卡行')
  for (const line of [
    '- ✅ API parity check passed: backend 2 / frontend 2',
    '- ❌ API parity check failed: backend 2 / frontend 3',
    '- No scan root for parity check',
    '- backend 2 端点 / frontend 3 调用',
  ]) {
    assert(PROBE5_SUMMARY_LINE_RE.test(line), `PROBE5_SUMMARY_LINE_RE 覆盖四态 summary（${line.slice(0, 24)}…）`)
  }
  assert(!PROBE5_SUMMARY_LINE_RE.test('- ℹ️ 后端端点比对集为多根并集'), 'probe5 正则不认 ℹ️ 注记行')
  assert(PROBE5_MISSING_ROW_RE.test('| ❌ missing | GET /api/x | — | web/app.ts:42 |'), 'PROBE5_MISSING_ROW_RE 命中表格行')
  assert(PROBE6_DELETION_LINE_RE.test('- ✅ 合规（design 声明删除） `old-a.js`（git 状态 D）'), 'PROBE6_DELETION_LINE_RE 命中 ✅ 合规行')
  assert(PROBE6_DELETION_LINE_RE.test('- ⚠️ 未声明删除（design 清单未列出） `old-b.js`（git 状态 D）'), 'PROBE6_DELETION_LINE_RE 命中 ⚠️ 未声明行')
  assert(!PROBE6_DELETION_LINE_RE.test('- ✅ git diff 无整文件删除（D/R/C）记录'), 'probe6 正则不认「无删除」清零行（无路径+状态尾缀形态）')
  assert(!PROBE6_DELETION_LINE_RE.test('- ⚠️ git 不可用或非仓库，删除对账无法执行'), 'probe6 正则不认 unavailable 降级行')
}

// ── D3. 探针 2/4 撞形散文不计数（#### 子节定界 G8）+ 行内同形不计数 ──
{
  const lines = rtReport.split('\n')
  const i2 = lines.indexOf('#### 探针 2：设计关键词覆盖')
  const i4 = lines.indexOf('#### 探针 4：决策追踪覆盖')
  assert(i2 !== -1 && i4 !== -1, '渲染报告含探针 2/4 半语义占位子节')
  // 向 2/4 子节注入与 probe1/3/6 同形的散文行（agent 补写内容天然落此处）
  lines.splice(i2 + 1, 0, '- ⚠️ `ghost.js:9` 关键词 grep 命中（探针 2 语义散文）')
  const i4b = lines.indexOf('#### 探针 4：决策追踪覆盖')
  lines.splice(i4b + 1, 0,
    '- ✅ task-99: 决策追踪摘要（探针 4 撞形）',
    '- ⚠️ 未声明删除（design 清单未列出） `rogue.js`（git 状态 D）')
  // probe1 子节内注入非行首同形片段（^ 锚定不命中）
  const i1 = lines.indexOf('#### 探针 1：未实现标记扫描（design 清单文件）')
  lines.splice(i1 + 1, 0, '备注：- ⚠️ `inline.js:1` 行内引用不算命中')
  const polluted = parseProbePrefillAnchors(lines.join('\n'))
  assert(polluted.probe1Hits === 2, `探针 2/4 撞形 + 行内同形不进 probe1 计数（实际: ${polluted.probe1Hits}）`)
  assert(polluted.probe3HasTest === 1, `探针 4 的 ✅ task 撞形行不进 probe3 计数（实际: ${polluted.probe3HasTest}）`)
  assert(polluted.probe6Deletions === 2, `探针 4 的删除撞形行不进 probe6 计数（实际: ${polluted.probe6Deletions}）`)
  assert(polluted.probe5Missing === 1 && polluted.probe5SummaryPresent === true, 'probe5 锚不受其它子节污染')
}

// ── D4. CRLF 归一（Windows 手写报告常态）──
{
  const lf = parseProbePrefillAnchors(rtReport)
  const crlf = parseProbePrefillAnchors(rtReport.replace(/\n/g, '\r\n'))
  assert(JSON.stringify(lf) === JSON.stringify(crlf), 'CRLF 报告锚点解析结果与 LF 一致（入口归一）')
}

// ═══════════════════════════════════════════════════════════════
// E. checkProbeConsistency 场景矩阵（真实 git 仓 fixture）
// ═══════════════════════════════════════════════════════════════
console.log('\n=== E. checkProbeConsistency 场景矩阵 ===\n')

// ── E1. 未篡改 → ok（+ 真实 fixture 的 render→parse round-trip 一致性）──
{
  const fx = mkProbeFixture('vpc-ok-', { rmOld: true })
  try {
    const { result, reportPath } = initProbeArtifacts(fx)
    assert(result.probe1.matches.length === 2 && result.probe3.tasks.filter(t => t.hasTest).length === 1
      && result.probe6.deletions.length === 1 && result.probe6.deletions[0].path === 'old.js',
      'fixture 基线：probe1=2 命中 / probe3 hasTest=1 / probe6=1 删除（old.js）')
    // 真实产物 round-trip：落盘正文的锚点解析值 === 探针实跑指标
    const a = parseProbePrefillAnchors(readFileSync(reportPath, 'utf8'))
    assert(a.probe1Hits === result.probe1.matches.length && a.probe3HasTest === 1
      && a.probe5SummaryPresent === true && a.probe5Missing === (result.probe5.missingBackend || []).length
      && a.probe6Deletions === result.probe6.deletions.length, '真实 fixture 骨架正文锚点与探针指标一致（round-trip）')

    const r = checkProbeConsistency({ cwd: fx.dir, specBase: fx.sb, changeName: fx.change })
    assert(r.status === 'ok', `未篡改 → ok（实际: ${r.status}${r.mismatches.length ? ' ' + JSON.stringify(r.mismatches) : ''}）`)
    assert(r.severity === null && r.mismatches.length === 0 && r.skipReason === null, 'ok 态无 severity/mismatch/skipReason')
    assert(r.subsections && r.subsections.any === true, '诊断字段 subsections 在场（additive）')
  } finally { rmSync(fx.dir, { recursive: true, force: true }) }
}

// ── E2. 篡改 probe1 命中数（删一条 ⚠️ 命中行）→ ERROR mismatch ──
{
  const fx = mkProbeFixture('vpc-p1-')
  try {
    initProbeArtifacts(fx)
    const reportPath = join(fx.cd, 'verify-result.md')
    const lines = readFileSync(reportPath, 'utf8').split('\n')
    const hitIdx = lines.findIndex(l => PROBE1_HIT_LINE_RE.test(l))
    assert(hitIdx !== -1, 'fixture 正文含 probe1 命中锚行（可篡改载体）')
    lines.splice(hitIdx, 1) // agent 删一条机械命中 → 正文计数 1 vs 重跑 2
    writeFileSync(reportPath, lines.join('\n'))

    const r = checkProbeConsistency({ cwd: fx.dir, specBase: fx.sb, changeName: fx.change })
    assert(r.status === 'mismatch', `probe1 篡改 → mismatch（实际: ${r.status}）`)
    assert(r.severity === 'error', `severity=error（阻断级，实际: ${r.severity}）`)
    const m = r.mismatches.find(m => m.probe === 'probe1')
    assert(m && m.expected === 2 && m.actual === 1 && m.severity === 'error',
      `expected=重跑指标 2 / actual=正文锚点 1（实际: ${JSON.stringify(m)}）`)
    assert(m && m.note.includes('篡改'), 'note 点名疑似篡改')

    // 端到端冒烟：真实 error 结果过 gates 三 helper（task-03 接线契约）
    const env = buildProbeConsistencyEnvelope(r)
    assert(env.code === 'probe_consistency_mismatch' && env.severity === 'error',
      `真实篡改结果 → 信封 code=probe_consistency_mismatch/severity=error（实际: ${env.code}/${env.severity}）`)
    const { ret, out } = captureConsole(() => printProbeConsistencyCheck(r, env))
    assert(ret === true, '真实篡改结果 → print 返回 true（gates 走 rollbackCompletionAndReturn）')
    assert(out.includes('probe1') && out.includes('❌') && out.includes('修复'), '阻断输出含 probe/❌/修复指引')
  } finally { rmSync(fx.dir, { recursive: true, force: true }) }
}

// ── E3. 篡改 probe6 删行 + facts 缺席 → ERROR（fail-closed：无法证实 HEAD 前进就按疑似篡改报）──
{
  const fx = mkProbeFixture('vpc-p6-', { rmOld: true })
  try {
    initProbeArtifacts(fx)
    const reportPath = join(fx.cd, 'verify-result.md')
    const txt = readFileSync(reportPath, 'utf8')
    assert(/^- ✅ 合规（design 声明删除） `old\.js`（git 状态 D）$/m.test(txt), 'fixture 正文含 probe6 合规删除锚行')
    writeFileSync(reportPath, txt.replace(/^- ✅ 合规（design 声明删除） `old\.js`（git 状态 D）$/m, ''))
    rmSync(join(fx.cd, 'verify-facts.json')) // 连 facts 底稿一起删——对比基准是正文，删 facts 不救场

    const r = checkProbeConsistency({ cwd: fx.dir, specBase: fx.sb, changeName: fx.change })
    assert(r.status === 'mismatch' && r.severity === 'error', `probe6 篡改且 facts 缺席 → error（实际: ${r.status}/${r.severity}）`)
    const m = r.mismatches.find(m => m.probe === 'probe6')
    assert(m && m.expected === 1 && m.actual === 0 && m.severity === 'error',
      `probe6 expected=1/actual=0/error（实际: ${JSON.stringify(m)}）`)
  } finally { rmSync(fx.dir, { recursive: true, force: true }) }
}

// ── E4. R-06 HEAD 前进子案：facts.generatedAt 之后有 commit → probe6 不符降 WARNING ──
{
  const fx = mkProbeFixture('vpc-r06-', { rmOld: true })
  try {
    const { factsPath } = initProbeArtifacts(fx) // 报告含 1 条 probe6 删除行（old.js 未提交删除）
    rewriteFacts(factsPath, { generatedAt: new Date(Date.now() - 120_000).toISOString() }) // init 拨到 2 分钟前
    commitAll(fx.dir, 'rm old.js（HEAD 前进）')                                     // 删除落 commit → git diff HEAD 口径漂移

    const r = checkProbeConsistency({ cwd: fx.dir, specBase: fx.sb, changeName: fx.change })
    assert(r.status === 'mismatch' && r.severity === 'warning',
      `HEAD 前进后 probe6 口径漂移 → warning 不阻断（实际: ${r.status}/${r.severity}）`)
    const m = r.mismatches.find(m => m.probe === 'probe6')
    assert(m && m.severity === 'warning' && m.note.includes('重跑 verify-probes --init'),
      `R-06 note 指引重跑 --init 刷新预填（实际: ${JSON.stringify(m)}）`)
    const onlyProbe6 = r.mismatches.every(x => x.probe === 'probe6')
    assert(onlyProbe6, '环境未变的 probe1/3/5 不产生连带 mismatch（commit 不改文件内容/任务/parity 根）')
  } finally { rmSync(fx.dir, { recursive: true, force: true }) }
}

// ── E5. probe3 / probe5 漂移 → WARNING（环境敏感维度 advisory）──
{
  // probe3：删 ✅ task 行 → hasTest 计数不符
  const fx3 = mkProbeFixture('vpc-p3-')
  try {
    initProbeArtifacts(fx3)
    const reportPath = join(fx3.cd, 'verify-result.md')
    const txt = readFileSync(reportPath, 'utf8')
    const has = txt.match(/^- ✅ task-01: .*$/m)
    assert(has, 'fixture 正文含 probe3 hasTest 锚行')
    writeFileSync(reportPath, txt.replace(/^- ✅ task-01: .*$/m, ''))
    const r = checkProbeConsistency({ cwd: fx3.dir, specBase: fx3.sb, changeName: fx3.change })
    assert(r.status === 'mismatch' && r.severity === 'warning', `probe3 漂移 → warning（实际: ${r.status}/${r.severity}）`)
    const m = r.mismatches.find(m => m.probe === 'probe3')
    assert(m && m.expected === 1 && m.actual === 0, `probe3 expected=1/actual=0（实际: ${JSON.stringify(m)}）`)
    const env = buildProbeConsistencyEnvelope(r)
    assert(env.code === 'probe_consistency_drift', `drift code 路由（实际: ${env.code}）`)
    const { ret } = captureConsole(() => printProbeConsistencyCheck(r, env))
    assert(ret === false, 'probe3 漂移 print 返回 false（放行告警）')
  } finally { rmSync(fx3.dir, { recursive: true, force: true }) }

  // probe5：删 summary 锚行 → 锚行存在性不符（G2 存在性口径）
  const fx5 = mkProbeFixture('vpc-p5-')
  try {
    initProbeArtifacts(fx5)
    const reportPath = join(fx5.cd, 'verify-result.md')
    const txt = readFileSync(reportPath, 'utf8')
    const summaryLine = txt.split('\n').find(l => PROBE5_SUMMARY_LINE_RE.test(l))
    assert(summaryLine, 'fixture 正文含 probe5 summary 锚行')
    writeFileSync(reportPath, txt.replace(summaryLine, ''))
    const r = checkProbeConsistency({ cwd: fx5.dir, specBase: fx5.sb, changeName: fx5.change })
    assert(r.status === 'mismatch' && r.severity === 'warning', `probe5 summary 缺失 → warning（实际: ${r.status}/${r.severity}）`)
    const m = r.mismatches.find(m => m.probe === 'probe5')
    assert(m && m.expected === 'summary 锚行在场' && m.actual === '缺失', `锚行存在性 mismatch 形态（实际: ${JSON.stringify(m)}）`)
  } finally { rmSync(fx5.dir, { recursive: true, force: true }) }
}

// ── E6. 删全部 #### 子节：facts 在场 → ERROR（删预填段）；facts 不在场 → skipped（存量旧报告）──
{
  const fx = mkProbeFixture('vpc-del-')
  try {
    const { factsPath } = initProbeArtifacts(fx)
    const reportPath = join(fx.cd, 'verify-result.md')
    writeFileSync(reportPath, '# 验证报告\n\n## 结论：PASS\n\n（agent 删光 #### 探针 子节的旧正文）\n')

    let r = checkProbeConsistency({ cwd: fx.dir, specBase: fx.sb, changeName: fx.change })
    assert(r.status === 'mismatch' && r.severity === 'error', `子节全缺 + facts 在场 → error（实际: ${r.status}/${r.severity}）`)
    assert(r.mismatches.length === 1 && r.mismatches[0].probe === 'prefill',
      `prefill 整段缺失 mismatch（实际: ${JSON.stringify(r.mismatches.map(m => m.probe))}）`)
    assert(r.mismatches[0].note.includes('删 verify-facts.json 绕不过防护') || r.mismatches[0].note.includes('对比基准是正文'),
      'note 声明对比基准是正文（删 facts 绕不过）')
    assert(r.subsections && r.subsections.any === false, '诊断 subsections.any=false（判别子证据）')

    rmSync(factsPath)
    r = checkProbeConsistency({ cwd: fx.dir, specBase: fx.sb, changeName: fx.change })
    assert(r.status === 'skipped' && r.mismatches.length === 0,
      `子节全缺 + facts 不在场 → skipped 零红（存量旧格式报告，实际: ${r.status}）`)
    assert(r.skipReason && r.skipReason.includes('存量旧格式'), 'skipReason 说明存量口径')
  } finally { rmSync(fx.dir, { recursive: true, force: true }) }
}

// ── E7. verify-result.md 不存在 → skipped（未走 --init 的存量/quick 场景）──
{
  const fx = mkProbeFixture('vpc-norep-')
  try {
    initProbeArtifacts(fx)
    rmSync(join(fx.cd, 'verify-result.md'))
    const r = checkProbeConsistency({ cwd: fx.dir, specBase: fx.sb, changeName: fx.change })
    assert(r.status === 'skipped' && r.severity === null && r.mismatches.length === 0,
      `报告缺失 → skipped 不产差集（实际: ${r.status}）`)
    assert(r.skipReason && r.skipReason.includes('不存在'), 'skipReason 指明报告不存在')
    assert(r.subsections === null, '早期 skip 的 subsections 诊断为 null')

    const noChange = checkProbeConsistency({ cwd: fx.dir, specBase: fx.sb })
    assert(noChange.status === 'skipped' && noChange.skipReason.includes('无 changeName'),
      '无 changeName（quick 场景）→ skipped')
  } finally { rmSync(fx.dir, { recursive: true, force: true }) }
}

// ── E8. 重跑异常 → degraded（fail-soft 不误红：design.md 变目录令 readFileSync 抛 EISDIR）──
{
  const fx = mkProbeFixture('vpc-deg-')
  try {
    initProbeArtifacts(fx)
    renameToDir(join(fx.cd, 'design.md'))
    const r = checkProbeConsistency({ cwd: fx.dir, specBase: fx.sb, changeName: fx.change })
    assert(r.status === 'degraded', `探针重跑异常 → degraded（实际: ${r.status}）`)
    assert(r.mismatches.length === 0, 'degraded 不产 mismatch（不误红）')
    assert(r.skipReason && r.skipReason.includes('降级'), 'skipReason 带降级说明')
    const env = buildProbeConsistencyEnvelope(r)
    assert(env.code === 'probe_consistency_skipped', `degraded 与 skipped 同 code（放行提示，实际: ${env.code}）`)
  } finally { rmSync(fx.dir, { recursive: true, force: true }) }
}

/** 把文件改名为目录（保内容到 .bak）：制造 readFileSync EISDIR 异常注入 */
function renameToDir(filePath) {
  renameSyncLike(filePath, filePath + '.bak')
  mkdirSync(filePath)
}
function renameSyncLike(from, to) {
  const content = readFileSync(from, 'utf8')
  writeFileSync(to, content)
  rmSync(from)
}

// ═══════════════════════════════════════════════════════════════
// F. CLI --init 集成（子进程真跑 bin/sillyspec.js）
// ═══════════════════════════════════════════════════════════════
console.log('\n=== F. verify-probes --init CLI 集成 ===\n')

{
  const fx = mkProbeFixture('vpc-cli-', { rmOld: true })
  try {
    const run = () => spawnSync(process.execPath, [cliBin, 'verify-probes', '--change', fx.change, '--init'],
      { cwd: fx.dir, encoding: 'utf8', timeout: 120_000, stdio: ['ignore', 'pipe', 'pipe'] })
    const r1 = run()
    const out1 = (r1.stdout || '') + (r1.stderr || '')
    assert(r1.status === 0, `首跑 --init exit 0（实际 ${r1.status}: ${out1.slice(0, 200)}）`)

    const reportPath = join(fx.cd, 'verify-result.md')
    const factsPath = join(fx.cd, 'verify-facts.json')
    assert(existsSync(reportPath), '骨架 verify-result.md 落盘')
    assert(existsSync(factsPath), '机器底稿 verify-facts.json 落盘')
    const sk1 = readFileSync(reportPath, 'utf8')
    assert(sk1.includes('#### 探针 1：未实现标记扫描') && (sk1.match(/^## .+ \[层：[^\]]+\]$/gm) || []).length === 10,
      'CLI 骨架含探针子节 + 十章节层标注后缀')
    const f1 = JSON.parse(readFileSync(factsPath, 'utf8'))
    assert(f1.schemaVersion === 1 && f1.change === fx.change && f1.probes.probe1.metrics.matches === 2,
      `CLI facts 底稿内容正确（实际: ${JSON.stringify(f1.probes.probe1.metrics)}）`)

    // 二跑：骨架已存在不覆盖；facts 照样刷新（最近快照语义——CLI 全权写，agent 手改无效）
    appendFileSyncLike(reportPath, '\n<!-- agent 补写 marker -->\n')
    writeFileSync(factsPath, JSON.stringify({ tampered: true }, null, 2) + '\n')
    sleepMs(20)
    const r2 = run()
    assert(r2.status === 0, `二跑 --init exit 0（实际 ${r2.status}）`)
    const sk2 = readFileSync(reportPath, 'utf8')
    const f2 = JSON.parse(readFileSync(factsPath, 'utf8'))
    assert(sk2.includes('<!-- agent 补写 marker -->'), '二跑骨架不覆盖（agent 正文保留）')
    assert(sk2 === sk1 + '\n<!-- agent 补写 marker -->\n', '骨架逐字未变（只追加过 marker）')
    assert(f2.tampered === undefined && f2.change === fx.change, '二跑 facts 无条件刷新（手改被 CLI 覆盖恢复）')
    assert(f2.generatedAt > f1.generatedAt, `二跑 facts generatedAt 前进（${f1.generatedAt} → ${f2.generatedAt}）`)
  } finally { rmSync(fx.dir, { recursive: true, force: true }) }
}

/** 追加文本（保没有 fs.appendFileSync import 的本文件自包含） */
function appendFileSyncLike(path, text) {
  writeFileSync(path, readFileSync(path, 'utf8') + text)
}

// ═══════════════════════════════════════════════════════════════
// G. gates 接线契约（三 helper 直调：print 阻断 / 信封 code 四值 / 落盘 snake_case + fail-soft）
// ═══════════════════════════════════════════════════════════════
console.log('\n=== G. gates 接线契约 ===\n')

/** 构造 checkProbeConsistency 四态返回值（形态对齐 src/verify-postcheck.js:2321-2329 JSDoc） */
function mkProbeResult(status, { severity = null, mismatches = [], skipReason = null, subsections = null } = {}) {
  return { status, severity, mismatches, skipReason, subsections }
}
const mm = (probe, severity) => ({ probe, expected: 2, actual: 1, severity, note: 'n' })

// ── G1. print 四态返回值 = gates 阻断分支判定契约（gates.js:710 `if (print(...)) rollback`）──
{
  const cases = [
    ['mismatch+error', mkProbeResult('mismatch', { severity: 'error', mismatches: [mm('probe1', 'error'), mm('probe6', 'error')] }), true],
    ['mismatch+warning', mkProbeResult('mismatch', { severity: 'warning', mismatches: [mm('probe3', 'warning')] }), false],
    ['skipped', mkProbeResult('skipped', { skipReason: 'verify-result.md 不存在' }), false],
    ['degraded', mkProbeResult('degraded', { skipReason: '探针重跑异常' }), false],
    ['ok', mkProbeResult('ok', { subsections: { probe1: true, probe3: true, probe5: true, probe6: true, any: true } }), false],
  ]
  for (const [label, r, expectBlock] of cases) {
    const { ret, out } = captureConsole(() => printProbeConsistencyCheck(r))
    assert(ret === expectBlock, `${label}: print 返回 ${expectBlock}（实际: ${ret}）`)
    if (expectBlock) {
      assert(out.includes('❌') && out.includes('probe1') && out.includes('修复'), `${label}: 阻断输出含 ❌/mismatch 明细/修复指引`)
    }
    if (label === 'mismatch+warning') {
      assert(out.includes('⚠️') && out.includes('probe3') && out.includes('提示'), 'warning 级输出 ⚠️ + 漂移明细 + 提示')
    }
    if (label === 'skipped' || label === 'degraded') {
      assert(out.includes('不阻断') && out.includes('跳过') || out.includes('降级'), `${label}: 输出含 skipReason 放行说明`)
    }
  }
  const okOut = captureConsole(() => printProbeConsistencyCheck(mkProbeResult('ok'))).out
  assert(okOut === '', "ok 静默放行（task-02 JSDoc「'ok' → 静默」）")
}

// ── G2. 信封 code 四值路由 + severity 分级 + evidence/subsections ──
{
  const codeOf = r => buildProbeConsistencyEnvelope(r).code
  assert(codeOf(mkProbeResult('mismatch', { severity: 'error', mismatches: [mm('probe1', 'error')] })) === 'probe_consistency_mismatch',
    'mismatch+error → probe_consistency_mismatch（阻断路由键）')
  assert(codeOf(mkProbeResult('mismatch', { severity: 'warning', mismatches: [mm('probe3', 'warning')] })) === 'probe_consistency_drift',
    'mismatch+warning → probe_consistency_drift（放行告警）')
  assert(codeOf(mkProbeResult('ok')) === 'probe_consistency_ok', 'ok → probe_consistency_ok')
  assert(codeOf(mkProbeResult('skipped', { skipReason: 'r' })) === 'probe_consistency_skipped'
    && codeOf(mkProbeResult('degraded', { skipReason: 'r' })) === 'probe_consistency_skipped',
    'skipped/degraded → 同 code probe_consistency_skipped（两态对消费方语义一致）')

  const env = buildProbeConsistencyEnvelope(mkProbeResult('mismatch', {
    severity: 'error',
    mismatches: [mm('probe1', 'error'), mm('probe3', 'warning')],
    subsections: { probe1: true, probe3: true, probe5: false, probe6: false, any: true },
  }))
  assert(env.name === 'probe_consistency', '信封 name 固定')
  assert(env.severity === 'error', '阻断 severity=error')
  assert(env.evidence.mismatch_count === 2 && env.evidence.error_count === 1 && env.evidence.warning_count === 1,
    `evidence 三计数（实际: ${JSON.stringify(env.evidence)}）`)
  assert(env.evidence.subsections.any === true && env.evidence.subsections.probe5 === false,
    'evidence 透传 subsections 在场性（判别子 D-003 排查入口）')
  assert(env.supportedFixes.length === 2 && env.supportedFixes[0].includes('--init'),
    'error 级给 2 条指引（首条 --init 重生成，次条 expected/actual 核对）')
  assert(env.detail.includes('status=mismatch') && env.detail.includes('severity=error'), 'detail 带状态与级别')

  const driftEnv = buildProbeConsistencyEnvelope(mkProbeResult('mismatch', { severity: 'warning', mismatches: [mm('probe3', 'warning')] }))
  assert(driftEnv.severity === 'warning' && driftEnv.supportedFixes.length === 1, 'drift severity=warning + 1 条刷新指引')
  assert(driftEnv.supportedFixes[0].includes('不阻断'), 'drift 指引明示不阻断')

  const okEnv = buildProbeConsistencyEnvelope(mkProbeResult('ok'))
  assert(okEnv.severity === 'info' && okEnv.supportedFixes.length === 0, 'ok severity=info 无指引')

  for (const st of ['skipped', 'degraded']) {
    const e = buildProbeConsistencyEnvelope(mkProbeResult(st, { skipReason: '原因文案' }))
    assert(e.severity === 'warning' && e.supportedFixes.length === 1 && e.detail.includes('（原因文案）'),
      `${st}: severity=warning + 补 --init 指引 + detail 带 skipReason`)
  }
  assert(buildProbeConsistencyEnvelope(mkProbeResult('skipped')).evidence.subsections === null,
    'subsections 缺省 → null（?? 语义，不误报在场）')
}

// ── G3. 落盘 probe-consistency-result.json：snake_case 字段 + verify-runs/<ts> 组织 + fail-soft ──
{
  const root = mkDir('vpf-g3-')
  try {
    const result = mkProbeResult('mismatch', {
      severity: 'error',
      mismatches: [{ probe: 'probe1', expected: 2, actual: 1, severity: 'error', note: '疑似篡改' }],
      skipReason: null,
      subsections: { probe1: true, probe3: true, probe5: true, probe6: true, any: true },
    })
    const envelope = buildProbeConsistencyEnvelope(result)
    const runtimeRoot = join(root, '.runtime')
    const { out } = captureConsole(() => writeProbeConsistencyRunResult({ runtimeRoot, changeName: '2026-09-07-g3', envelope, result }))
    const runsDir = join(runtimeRoot, 'verify-runs')
    const runDirs = existsSync(runsDir) ? readdirSync(runsDir) : []
    assert(runDirs.length === 1 && /^\d{14}$/.test(runDirs[0]), `目录组织 verify-runs/<UTC紧凑ts>（实际: ${runDirs.join(',')}）`)
    const persisted = JSON.parse(readFileSync(join(runsDir, runDirs[0], 'probe-consistency-result.json'), 'utf8'))
    assert(persisted.change === '2026-09-07-g3' && persisted.code === 'probe_consistency_mismatch'
      && persisted.severity === 'error' && persisted.status === 'mismatch' && persisted.result_severity === 'error',
      `落盘 snake_case 字段：change/code/severity/status/result_severity（实际: ${JSON.stringify(Object.keys(persisted))}）`)
    assert(persisted.supported_fixes !== undefined && persisted.skip_reason === null && persisted.ran_at !== undefined,
      '落盘 supported_fixes/skip_reason/ran_at（camelCase 信封→snake_case 写盘映射）')
    assert(Array.isArray(persisted.mismatches) && persisted.mismatches[0].probe === 'probe1', 'mismatches 逐条落盘（probe/severity 细读）')
    assert(persisted.evidence.mismatch_count === 1 && persisted.subsections.any === true, 'evidence/subsections 落盘')
    assert(out.includes('probe-consistency-result.json'), '落盘成功打印路径回执')

    // fail-soft：runtimeRoot 路径被同名文件占位 → mkdir 抛 → 不冒泡、返回 null、error 留痕
    const blocker = join(root, 'blocker')
    writeFileSync(blocker, 'x')
    const { ret: softRet, out: softOut } = captureConsole(() =>
      writeProbeConsistencyRunResult({ runtimeRoot: join(blocker, 'sub'), changeName: 'c', envelope, result }))
    assert(softRet === null && softOut.includes('落盘失败'), `写失败 fail-soft：返回 null + 留痕不阻断（实际: ${softRet}）`)
  } finally { rmSync(root, { recursive: true, force: true }) }
}

// ── 汇总 ──
console.log('\n==================================================')
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
console.log('==================================================')
if (failed > 0) process.exit(1)

// ═══════════════════════════════════════════════════════════════
// H. P1 修复回归（2026-09-07）：旧格式报告 + --init 补注入探针预填段（修死路）
// ═══════════════════════════════════════════════════════════════
console.log('\n=== H. 旧格式 verify-result.md + --init 补注入（P1 修复）===\n')

{
  const fx = mkProbeFixture('vpc-oldfmt-', { rmOld: true })
  try {
    // 存量旧九章节格式：无任何 #### 探针 子节，正文是 agent 写过的真实内容
    const reportPath = join(fx.cd, 'verify-result.md')
    writeFileSync(reportPath, [
      '# 验证报告（旧格式）', '',
      '## 结论：PASS', '',
      '## 任务完成度', '全部完成（agent 手写正文，必须保留）', '',
    ].join('\n') + '\n')

    // 修复前行为：--init 对已存在报告 no-op，但 facts 无条件刷新 →
    // checkProbeConsistency 判「疑似 agent 删除预填段」error 阻断（死路：修复指引 --init 是 no-op）。
    // 先手写一份 facts 模拟「agent 跑过 --init」后的状态
    writeFileSync(join(fx.cd, 'verify-facts.json'), JSON.stringify({ schemaVersion: 1, change: fx.change }, null, 2) + '\n')
    const r = checkProbeConsistency({ cwd: fx.dir, specBase: fx.sb, changeName: fx.change })
    assert(r.status === 'mismatch' && r.severity === 'error', `修复前确认：旧格式 + facts 在场（手动写一份模拟）判 error`)
    rmSync(join(fx.cd, 'verify-facts.json'), { force: true }) // 清掉手动模拟，走真实 CLI 路径

    const cli = spawnSync(process.execPath, [cliBin, 'verify-probes', '--change', fx.change, '--init'],
      { cwd: fx.dir, encoding: 'utf8', timeout: 120_000, stdio: ['ignore', 'pipe', 'pipe'] })
    assert(cli.status === 0, `--init exit 0（实际 ${cli.status}: ${((cli.stdout || '') + (cli.stderr || '')).slice(0, 200)}）`)
    const after = readFileSync(reportPath, 'utf8')
    assert(after.includes('# 验证报告（旧格式）') && after.includes('agent 手写正文，必须保留'), '原正文逐字保留（只补注入不重写）')
    assert(/^#### 探针 1：/m.test(after) && after.includes('## 探针结果（CLI 机械预填，--init 补注入）'), '探针预填段已补注入')
    assert(existsSync(join(fx.cd, 'verify-facts.json')), 'facts 照常刷新')

    // 补注入后：判别子有子节可对账 → 不再是 prefill-missing error（ok 或环境性 warning 均可，死路已通）
    const r2 = checkProbeConsistency({ cwd: fx.dir, specBase: fx.sb, changeName: fx.change })
    assert(r2.status !== 'mismatch' || r2.severity !== 'error' || !r2.mismatches.some(m => m.probe === 'prefill'),
      `补注入后不再判 prefill 缺失 error（实际 ${r2.status}/${r2.severity}: ${JSON.stringify(r2.mismatches?.map(m => m.probe))}）`)

    // 二跑：已有子节 → 不重复注入
    const cli2 = spawnSync(process.execPath, [cliBin, 'verify-probes', '--change', fx.change, '--init'],
      { cwd: fx.dir, encoding: 'utf8', timeout: 120_000, stdio: ['ignore', 'pipe', 'pipe'] })
    const after2 = readFileSync(reportPath, 'utf8')
    assert((after2.match(/## 探针结果（CLI 机械预填/g) || []).length === 1, '二跑不重复注入（幂等）')
    assert(cli2.status === 0 && (cli2.stdout || '').includes('不覆盖'), '二跑输出不覆盖提示')
  } finally { rmSync(fx.dir, { recursive: true, force: true }) }
}

// BUG-1 回归（对抗复审，2026-09-07）：无冒号走样探针标题 `#### 探针 1` 不算「已有子节」——
// 检测正则须与提取侧对齐（要求 [：:]），否则 --init 跳过注入而提取侧不认 → 死路复活
{
  const fx = mkProbeFixture('vpc-nocolon-', { rmOld: true })
  try {
    const reportPath = join(fx.cd, 'verify-result.md')
    writeFileSync(reportPath, '# 验证报告\n\n## 结论：PASS\n\n#### 探针 1\n（agent 手写走样标题，无冒号）\n')
    const cli = spawnSync(process.execPath, [cliBin, 'verify-probes', '--change', fx.change, '--init'],
      { cwd: fx.dir, encoding: 'utf8', timeout: 120_000, stdio: ['ignore', 'pipe', 'pipe'] })
    assert(cli.status === 0, `--init exit 0（实际 ${cli.status}）`)
    const after = readFileSync(reportPath, 'utf8')
    assert(after.includes('## 探针结果（CLI 机械预填，--init 补注入）'), '无冒号走样标题不挡注入（预填段照常补入）')
    assert(/^#### 探针 1：/m.test(after), '补入的规范子节（带冒号）在场')
    const r = checkProbeConsistency({ cwd: fx.dir, specBase: fx.sb, changeName: fx.change })
    assert(!r.mismatches?.some(m => m.probe === 'prefill'), `不落 prefill error（实际 ${r.status}: ${JSON.stringify(r.mismatches?.map(m => m.probe))}）`)
  } finally { rmSync(fx.dir, { recursive: true, force: true }) }
}

// 尾部守卫：H / BUG-1 追加段在原汇总块之后执行，失败也必须反映到退出码
if (failed > 0) process.exit(1)
