/**
 * archive-delta 测试套件 — IR P3d task-03 收官（change: 2026-09-07-ir-stage-p3d）
 *
 * 被测对象（commit 23ae3ce/b231106）：
 *   - src/archive-delta.js：collectDeltaSources（五源 fail-soft 采集 + apply-pathspec 兜底；
 *     ⑤ endpointBaseline/currentEndpoints 为 2026-09-07-endpoint-baseline task-03，集成断言在
 *     test/endpoint-baseline.test.mjs task-04）/ buildDeltaReport（Before/Delta/After 三段式
 *     渲染，now 可注入）。本文件消费两导出，消 check-syntax 的 src 未引用导出项。
 *   - src/design-facts.js deriveActualModules（P3d 导出）：归属 + 反斜杠归一 + 未匹配。
 *   - src/index.js delta CLI：生成/幂等覆盖/--json/缺 --change exit 2/目录不存在 exit 1。
 *   - src/run/complete-handlers.js handleArchiveConfirmStep 归档接线（fail-soft）。
 *
 * 归档集成走 CLI 子进程完整 confirm 路径（run archive --done --confirm，较 handler 直调更
 * 端到端）：断言 delta.md 在目录移动前生成于 changes/<cn>/ 并随归档包进 changes/archive/。
 * fail-soft 用「delta.md 名下预置目录」让 writeFileSync 抛 EISDIR（Windows chmod 不可靠，
 * 目录占位法与本仓 design-facts.test.mjs §7 的 _facts.md EISDIR 先例同款）。
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { collectDeltaSources, buildDeltaReport } from '../src/archive-delta.js'
import { deriveActualModules } from '../src/design-facts.js'
import { archiveDestDirName } from '../src/stage-contract.js'
import { makeRepo, seedStage, runCLI, runStage, cleanup, report } from './_cli-step-harness.mjs'
import { ProgressManager } from '../src/progress.js'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }
const tmpRoots = []
const deepEq = (a, b) => JSON.stringify(a) === JSON.stringify(b)

// ═══════════════════════════════════════════════════════════════════════════
// 共享 fixture（单测级：非 git 临时目录；CLI 级：makeRepo git 仓）
// ═══════════════════════════════════════════════════════════════════════════

const CN = '2026-09-05-delta-demo'
const OTHER_CN = '2026-09-05-other-change'

/** 模块索引 fixture：block 数组（目录条目带尾斜杠）+ inline 数组 + core_files（Windows
 *  反斜杠）+ status 标量——覆盖 prefixPairs 归一与 Before 注册摘要 status 列。 */
const MAP_YAML = [
  'modules:',
  '  mod-a:',
  '    status: stable',
  '    paths:',
  '      - src/a/',
  '  mod-b:',
  '    status: experimental',
  '    paths: [src/b/one.js]',
  '    core_files:',
  '      - src\\b\\core.js',
  '',
].join('\n')

/** verify-facts.json 底稿（buildVerifyFacts 形态；probe6 故意排最前——锁定渲染层
 *  probe1→3→5→6 的 canonical 顺序不随对象键序漂移；probe6 空 metrics 走降级行）。 */
const FACTS = {
  schemaVersion: 1,
  change: CN,
  generatedAt: '2026-09-05T12:30:00.000Z',
  probes: {
    probe6: { command: 'sillyspec verify-probes --change x', metrics: {} },
    probe1: { command: 'sillyspec verify-probes --change x', metrics: { matches: 4, skippedFiles: 1 } },
    probe3: { command: 'sillyspec verify-probes --change x', metrics: { tasks: 2 } },
    probe5: { command: 'sillyspec verify-probes --change x', metrics: { backendEndpoints: 3, endpointsCovered: 2 } },
  },
}

/** decisions.md：一条带域（含 NEW: 前缀新模块声明）+ 一条未填域（（未填写）单元格 + 存量兼容）。 */
const DECISIONS_TEXT = [
  '# 决策记录',
  '',
  '## D-001@v1 归属域声明',
  '- type: architecture',
  '- status: confirmed',
  `- 模块域: mod-a、NEW:delta-report`,
  '',
  '## D-002@v1 未填域',
  '- type: process',
  '- status: confirmed',
  '',
].join('\n')

/** module-impact.md：含「## 更新结果」小节（After 段引用）。目标列不含带 / 的 .md 路径——
 *  避免归档集成里 done 目标存在性对账（extractDoneDocTargets）误报「假申报」噪音。 */
const IMPACT_MD = [
  '# 模块影响分析',
  '',
  '## 更新结果',
  '',
  '| 目标 | 状态 |',
  '|---|---|',
  '| mod-a 模块卡 | done |',
  '',
].join('\n')

/** R-01 verify-runs fixture：多 ts 多 change 混存（跨变更串台防护）+ 损坏 JSON ts（跳过
 *  后落更旧的合法 run）+ 非数字目录名（被 ts 过滤忽略）。T13 为 CN 的最新合法 run。 */
const RUNS = [
  { ts: '20260905100000', data: { change: OTHER_CN, matched: ['src/other.js'], ran_at: '2026-09-05T10:00:00.000Z' } },
  { ts: '20260905120000', data: { change: CN, matched: ['src/a/one.js'], ran_at: '2026-09-05T12:00:00.000Z' } },
  {
    ts: '20260905130000',
    data: {
      change: CN,
      status: 'pass',
      form: 'diff',
      sources: ['git', 'plan.md'],
      matched: ['src/a/one.js', 'src/b/one.js'],
      missing: [{ task: 'task-02', path: 'src/a/missing.js', isNew: true }],
      undeclared: [{ path: 'src/orphan.js', suspectTask: 'task-03' }],
      ran_at: '2026-09-05T13:00:00.000Z',
    },
  },
  { ts: '20260905140000', raw: '{ 损坏 JSON（readJsonSafe fail-soft 跳过）' },
]

/**
 * 单测级工作区：specRoot/changes/<cn>/ + docs/<project>/modules/_module-map.yaml +
 * runtimeRoot/verify-runs/<ts>/reconcile-result.json + apply-pathspec-<change>.txt。
 * 全部可选（null = 不落盘），供四源逐源命中/缺失矩阵拼装。
 */
function buildFixture({
  cn = CN,
  project = 'demo',
  mapYaml = MAP_YAML,
  facts = FACTS,
  decisionsText = DECISIONS_TEXT,
  impactText = IMPACT_MD,
  runs = RUNS,
  pathspec = null,
  extraChangeDirs = [],
} = {}) {
  const root = mkdtempSync(join(tmpdir(), 'ad-fx-')); tmpRoots.push(root)
  const specRoot = join(root, 'spec')
  const runtimeRoot = join(root, 'runtime')
  const changeDir = join(specRoot, 'changes', cn)
  mkdirSync(changeDir, { recursive: true })
  mkdirSync(runtimeRoot, { recursive: true })
  if (mapYaml != null) {
    mkdirSync(join(specRoot, 'docs', project, 'modules'), { recursive: true })
    writeFileSync(join(specRoot, 'docs', project, 'modules', '_module-map.yaml'), mapYaml)
  }
  if (facts != null) writeFileSync(join(changeDir, 'verify-facts.json'), typeof facts === 'string' ? facts : JSON.stringify(facts, null, 2))
  if (decisionsText != null) writeFileSync(join(changeDir, 'decisions.md'), decisionsText)
  if (impactText != null) writeFileSync(join(changeDir, 'module-impact.md'), impactText)
  for (const { ts, data, raw } of runs) {
    const d = join(runtimeRoot, 'verify-runs', ts)
    mkdirSync(d, { recursive: true })
    writeFileSync(join(d, 'reconcile-result.json'), raw != null ? raw : JSON.stringify(data, null, 2))
  }
  // 非数字目录名：合法 CN reconcile 也不得被 ts 过滤捞起（listRunTsDescending 只认纯数字）
  const garbage = join(runtimeRoot, 'verify-runs', 'garbage-dir')
  mkdirSync(garbage, { recursive: true })
  writeFileSync(join(garbage, 'reconcile-result.json'), JSON.stringify({ change: CN, matched: ['src/from-garbage.js'] }))
  if (pathspec != null) writeFileSync(join(runtimeRoot, `apply-pathspec-${cn}.txt`), pathspec)
  for (const name of extraChangeDirs) mkdirSync(join(specRoot, 'changes', name), { recursive: true })
  return { root, specRoot, changeDir, runtimeRoot, cn, project }
}

/** CLI stdout 中提取首个 JSON 对象（容忍前置 warning 行）。 */
function parseJsonOutput(stdout) {
  const m = stdout.match(/\{[\s\S]*\n\}/)
  try { return m ? JSON.parse(m[0]) : null } catch { return null }
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. collectDeltaSources：四源采集（R-01 按 change 过滤取最新 / 逐源缺失 fail-soft / 兜底）
// ═══════════════════════════════════════════════════════════════════════════
console.log('=== 1. collectDeltaSources（四源 fail-soft 采集）===\n')
{
  console.log('--- 四源全命中 + R-01 跨变更串台防护（多 ts 多 change 取最新合法 run）---')
  const fx = buildFixture({ extraChangeDirs: [OTHER_CN] })
  const res = collectDeltaSources({ changeDir: fx.changeDir, specRoot: fx.specRoot, project: fx.project, runtimeRoot: fx.runtimeRoot })

  assert(res.reconcile !== null && res.reconcile.ran_at === '2026-09-05T13:00:00.000Z',
    `reconcile 按 change 过滤取最新：T13 run（got ran_at=${res.reconcile && res.reconcile.ran_at}）`)
  assert(res.reconcile.matched.includes('src/b/one.js'), '命中的是 T13 的 matched（含 src/b/one.js），非 T12 旧 run')
  assert(res.reconcile.change === CN, '命中 run 的 change 字段与请求变更一致')
  assert(res.deliverables.length === 0, 'reconcile 命中 → apply-pathspec 兜底不启用（deliverables=[]）')

  const otherRes = collectDeltaSources({
    changeDir: join(fx.specRoot, 'changes', OTHER_CN), specRoot: fx.specRoot, project: fx.project, runtimeRoot: fx.runtimeRoot,
  })
  assert(otherRes.reconcile !== null && otherRes.reconcile.ran_at === '2026-09-05T10:00:00.000Z',
    '另一变更取到自己的 run（T10），与 CN 的 run 不串台')

  assert(res.verifyFacts !== null && res.verifyFacts.probes.probe5.metrics.backendEndpoints === 3,
    'verifyFacts 命中（verify-facts.json JSON.parse 成功）')
  assert(res.moduleMap !== null && res.moduleMap.ids.has('mod-a') && res.moduleMap.ids.has('mod-b'),
    'moduleMap 命中（ids 含 mod-a/mod-b）')
  assert(res.moduleMap.prefixPairs.some(p => p.id === 'mod-b' && p.path === 'src/b/core.js'),
    'prefixPairs 反斜杠归一：src\\b\\core.js → src/b/core.js（core_files 并入前缀对）')
  assert(res.moduleMap.prefixPairs.some(p => p.id === 'mod-a' && p.path === 'src/a'),
    'prefixPairs 目录条目去尾斜杠：src/a/ → src/a')
  assert(deepEq(res.decisions, [
    { id: 'D-001@v1', domains: ['mod-a', 'NEW:delta-report'] },
    { id: 'D-002@v1', domains: [] },
  ]), `decisions 命中（当前版本条目投影；got ${JSON.stringify(res.decisions)}）`)

  console.log('--- 逐源缺失 / fail-soft：损坏 JSON / 全空环境 ---')
  const corruptFx = buildFixture({ facts: '{ 损坏的 verify-facts' })
  const corruptRes = collectDeltaSources({ changeDir: corruptFx.changeDir, specRoot: corruptFx.specRoot, project: corruptFx.project, runtimeRoot: corruptFx.runtimeRoot })
  assert(corruptRes.verifyFacts === null, 'verify-facts.json 损坏 → null（JSON.parse fail-soft 不抛）')
  assert(corruptRes.decisions !== null && corruptRes.decisions.length === 2,
    'verify-facts 损坏不殃及邻源（decisions 仍解析——fail-soft 源间隔离）')
  assert(corruptRes.reconcile !== null && corruptRes.reconcile.ran_at === '2026-09-05T13:00:00.000Z',
    'verify-runs 内损坏 JSON ts 被跳过，落更旧的合法 T13 run（扫描不因单 ts 损坏中断）')

  const bareFx = buildFixture({ mapYaml: null, facts: null, decisionsText: null, impactText: null, runs: [] })
  const bareRes = collectDeltaSources({ changeDir: bareFx.changeDir, specRoot: bareFx.specRoot, project: bareFx.project, runtimeRoot: bareFx.runtimeRoot })
  assert(bareRes.reconcile === null && bareRes.verifyFacts === null && bareRes.moduleMap === null && bareRes.decisions === null,
    '全空环境四源全 null（不抛出）')
  assert(Array.isArray(bareRes.deliverables) && bareRes.deliverables.length === 0, '无 reconcile 且无 apply-pathspec → deliverables=[]')

  console.log('--- apply-pathspec 兜底（D-003）：无 reconcile 时交付清单非空 ---')
  const fbFx = buildFixture({ runs: [], pathspec: 'src/a/one.js\r\nsrc/misc/z.txt\r\n\r\n' })
  const fbRes = collectDeltaSources({ changeDir: fbFx.changeDir, specRoot: fbFx.specRoot, project: fbFx.project, runtimeRoot: fbFx.runtimeRoot })
  assert(fbRes.reconcile === null, '无 verify-runs 命中 → reconcile=null')
  assert(deepEq(fbRes.deliverables, ['src/a/one.js', 'src/misc/z.txt']),
    `apply-pathspec-<change>.txt 逐行为交付清单（CRLF/空行容错；got ${JSON.stringify(fbRes.deliverables)}）`)

  const ghostFx = buildFixture({ cn: '2026-09-05-ghost', extraChangeDirs: [], runs: [], pathspec: null })
  mkdirSync(join(ghostFx.runtimeRoot, `apply-pathspec-${OTHER_CN}.txt`).replace(/[^\\/]*$/, ''), { recursive: true })
  writeFileSync(join(ghostFx.runtimeRoot, `apply-pathspec-${OTHER_CN}.txt`), 'src/not-mine.js\n')
  const ghostRes = collectDeltaSources({ changeDir: ghostFx.changeDir, specRoot: ghostFx.specRoot, project: ghostFx.project, runtimeRoot: ghostFx.runtimeRoot })
  assert(ghostRes.deliverables.length === 0, '兜底清单按 change 名精确匹配（他人 apply-pathspec 不串台）')
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. buildDeltaReport：三段式全量字面断言（模块表/未匹配/决策清单/探针摘要/scan/端点）
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 2. buildDeltaReport（Before/Delta/After 三段式，now 注入）===\n')
{
  const fx = buildFixture()
  const NOW = '2026-09-07T08:09:10.000Z'
  const md = buildDeltaReport({ changeDir: fx.changeDir, specRoot: fx.specRoot, project: fx.project, runtimeRoot: fx.runtimeRoot, now: NOW })

  console.log('--- 骨架：三段标题顺序 + frontmatter + now 注入确定性 ---')
  assert(md.includes(`generated_at: ${NOW}`), `now 注入 → generated_at 精确受控（${NOW}）`)
  const again = buildDeltaReport({ changeDir: fx.changeDir, specRoot: fx.specRoot, project: fx.project, runtimeRoot: fx.runtimeRoot, now: NOW })
  assert(md === again, '同 fixture 同 now 两次生成全文逐字节一致（确定性快照）')
  assert(md.endsWith('\n') && !md.endsWith('\n\n'), '单一尾换行')
  assert(!md.includes('\r'), 'LF 行尾（无 CR 残留）')
  const h1 = md.indexOf(`# 变更 Delta — ${CN}`)
  const hBefore = md.indexOf('## Before（变更前状态）')
  const hDelta = md.indexOf('## Delta（做了什么）')
  const hAfter = md.indexOf('## After（建议动作）')
  assert(h1 >= 0 && hBefore > h1 && hDelta > hBefore && hAfter > hDelta, '三段顺序：H1 → Before → Delta → After')
  assert(md.includes('sources_reconcile: 命中（ran_at=2026-09-05T13:00:00.000Z，verify-runs 按 change 过滤取最新）'),
    'frontmatter sources_reconcile 命中行（含 ran_at）')
  assert(md.includes('sources_verify_facts: 命中') && md.includes('sources_module_map: 命中') && md.includes('sources_decisions: 命中'),
    'frontmatter 其余三源命中状态')

  console.log('--- Before：模块注册摘要表 + status 列 + 未匹配文件 ---')
  assert(md.includes('### 受影响模块（module-map 注册摘要）'), 'Before 模块注册摘要小节标题')
  assert(md.includes('| 模块 | status | paths+core_files 条目数 |') && md.includes('|---|---|---|'), '模块表表头')
  assert(md.includes('| mod-a | stable | 1 |'), 'mod-a 行：status 取 _module-map.yaml 标量 + paths 条目数 1')
  assert(md.includes('| mod-b | experimental | 2 |'), 'mod-b 行：paths+core_files 并计条目数 2')
  assert(md.includes('未匹配文件（不归属任何模块 paths，人工裁量）：src/orphan.js'),
    '未匹配文件显式列出（R-02 不猜）：undeclared 的 src/orphan.js 未命中任何模块 paths')

  console.log('--- Before：声明域并集 + NEW: 新模块标记 ---')
  assert(md.includes('### 声明域并集（decisions.md 模块域）'), '声明域并集小节标题')
  assert(md.includes('mod-a、NEW:delta-report（新模块）'), '域并集一行（NEW: 前缀项带「（新模块）」标记）')

  console.log('--- Delta：交付文件×模块归属表 + 对账基线 + missing/undeclared 差集 ---')
  assert(md.includes('### 交付文件 × 模块归属'), '交付文件×模块归属小节标题')
  assert(md.includes('| src/a/one.js | mod-a |') && md.includes('| src/b/one.js | mod-b |'), '归属表逐行（前缀命中/全等命中）')
  assert(md.includes('- 对账基线：status=pass / form=diff / sources=git、plan.md'), '对账基线一行（status/form/sources）')
  assert(md.includes('- missing（声明未落盘，1 项）：task-02：src/a/missing.js（NEW: 声明，路径已剥前缀）'),
    'missing 差集行（task：path + isNew 注记）')
  assert(md.includes('- undeclared（落盘未声明，1 项）：src/orphan.js（疑似归因 task-03）'),
    'undeclared 差集行（path + 疑似归因）')

  console.log('--- Delta：决策清单 + 探针 metrics 摘要（canonical 顺序 + 空 metrics 降级）---')
  assert(md.includes('### 决策清单（id × 模块域）'), '决策清单小节标题')
  assert(md.includes('| D-001@v1 | mod-a、NEW:delta-report |') && md.includes('| D-002@v1 | （未填写） |'),
    '决策表逐行（未填域 → （未填写）单元格）')
  assert(md.includes('### 探针 metrics 摘要（验证结论表的机器半边）'), '探针摘要小节标题')
  assert(md.includes('快照时刻：2026-09-05T12:30:00.000Z'), '快照时刻行（verify-facts.generatedAt）')
  const p1 = md.indexOf('- probe1：'), p3 = md.indexOf('- probe3：'), p5 = md.indexOf('- probe5：'), p6 = md.indexOf('- probe6：')
  assert(p1 >= 0 && p3 > p1 && p5 > p3 && p6 > p5, '探针行按 probe1→3→5→6 canonical 顺序渲染（fixture 键序打乱不漂移）')
  assert(md.includes('- probe1：matches=4 / skippedFiles=1') && md.includes('- probe5：backendEndpoints=3 / endpointsCovered=2'),
    'metrics 键值行（k=v 以「 / 」连接）')
  assert(md.includes('- probe6：（无 metrics）'), '空 metrics → 整行降级注记不报错')

  console.log('--- After：module-impact「更新结果」引用 + scan 建议 + 端点提示（>0 才出现）---')
  assert(md.includes('### 模块卡同步状态（module-impact.md「更新结果」）'), '模块卡同步状态小节标题')
  assert(md.includes('（引自变更目录 module-impact.md，人工维护为准）') && md.includes('| mod-a 模块卡 | done |'),
    '「## 更新结果」小节正文被引用（含表格体）')
  assert(!/^## 更新结果$/m.test(md), '引用正文不含原「## 更新结果」标题行（避免 H3 小节下嵌 H2 破坏层级）')
  assert(md.includes('### scan 刷新建议'), 'scan 刷新建议小节标题')
  assert(md.includes('- `sillyspec scan facts` 下次刷新重点关注：mod-a、mod-b（共 2 个模块）'), 'scan 建议点名受影响模块')
  assert(md.includes('- 未匹配文件补录提示：以下文件未命中任何模块 paths——建议补录 _module-map.yaml（新文件）或核对归属（人工裁量）：src/orphan.js'),
    '未匹配文件补录提示（After 段）')
  assert(md.includes('### 端点基线提示'), '端点基线提示小节（backendEndpoints=3 > 0 → 出现，门控不变）')
  assert(md.includes(`- 无基线（变更未拍 baseline）：${join(fx.runtimeRoot, 'endpoint-baselines', `${CN}.json`)} 不存在或不可解析——端点增删不可比（backendEndpoints=3（>0））`),
    '端点提示降级注记（fixture 无基线 → 「无基线（变更未拍 baseline）」口径，2026-09-07-endpoint-baseline task-03 替代旧「独立立项」行）')

  console.log('--- 端点提示条件性：backendEndpoints=0 / 无 facts → 小节缺席 ---')
  const zeroFx = buildFixture({ facts: { ...FACTS, probes: { ...FACTS.probes, probe5: { metrics: { backendEndpoints: 0 } } } } })
  const zeroMd = buildDeltaReport({ changeDir: zeroFx.changeDir, specRoot: zeroFx.specRoot, project: zeroFx.project, runtimeRoot: zeroFx.runtimeRoot, now: NOW })
  assert(!zeroMd.includes('### 端点基线提示'), 'backendEndpoints=0 → 无端点基线提示小节')
  const noFactsFx = buildFixture({ facts: null })
  const noFactsMd = buildDeltaReport({ changeDir: noFactsFx.changeDir, specRoot: noFactsFx.specRoot, project: noFactsFx.project, runtimeRoot: noFactsFx.runtimeRoot, now: NOW })
  assert(!noFactsMd.includes('### 端点基线提示') && noFactsMd.includes(`（无 verify-facts.json：${join(noFactsFx.changeDir, 'verify-facts.json')} 不存在或不可解析——探针指标快照缺位，可跑 sillyspec verify-probes --change ${CN} --init 补）`),
    '无 verify-facts → 探针段降级注记（含补跑指引）+ 无端点提示')
}

console.log('\n--- 2b. buildDeltaReport 逐源降级注记（全空环境仍成文）---\n')
{
  const fx = buildFixture({ mapYaml: null, facts: null, decisionsText: null, impactText: null, runs: [] })
  const md = buildDeltaReport({ changeDir: fx.changeDir, specRoot: fx.specRoot, project: fx.project, runtimeRoot: fx.runtimeRoot })

  assert(md.includes('sources_reconcile: 未命中（apply-pathspec 兜底，0 项）'), 'frontmatter：reconcile 未命中（兜底 0 项）')
  assert(md.includes('sources_verify_facts: 缺失') && md.includes('sources_module_map: 缺失') && md.includes('sources_decisions: 缺失'),
    'frontmatter：其余三源缺失')
  assert(md.includes('（无 module-map：docs/demo/modules/_module-map.yaml 不存在或不可解析——模块归属推导跳过，交付文件全部按未匹配列出）'),
    'Before：无 module-map 降级注记（含路径）')
  assert(md.includes(`（无 decisions.md：${join(fx.changeDir, 'decisions.md')} 不存在——声明域缺位）`), 'Before：无 decisions.md 降级注记')
  assert(md.includes(`（无 reconcile 产物且无 apply-pathspec-${CN}.txt——交付文件清单不可得，本节缺位）`), 'Delta：无清单降级注记')
  assert(md.includes(`（无 decisions.md：${join(fx.changeDir, 'decisions.md')} 不存在——决策清单缺位）`), 'Delta：决策清单缺位注记')
  assert(md.includes('（无 module-impact.md：'), 'After：无 module-impact.md 注记')
  assert(md.includes('（无 module-map：docs/demo/modules/_module-map.yaml 不存在——受影响模块无法推导，建议先跑 sillyspec modules 同步补索引）'),
    'After scan：无 module-map 建议先补索引')
  assert(/^generated_at: 2\d{3}-\d{2}-\d{2}T/m.test(md), 'now 缺省 → 当前时刻 ISO（可解析形态）')

  console.log('--- module-impact.md 存在但无「## 更新结果」小节 → 引用缺位注记 ---')
  const noSecFx = buildFixture({ impactText: '# 模块影响分析\n\n## 影响面\n\n只有散文。\n' })
  const noSecMd = buildDeltaReport({ changeDir: noSecFx.changeDir, specRoot: noSecFx.specRoot, project: noSecFx.project, runtimeRoot: noSecFx.runtimeRoot })
  assert(noSecMd.includes('（module-impact.md 存在但无「## 更新结果」小节——模块卡同步状态引用缺位）'),
    '存在但无小节 → 与「文件不存在」区分的降级注记')

  console.log('--- decisions.md 存在但均未填域 → 声明域为空注记 ---')
  const noDomFx = buildFixture({ decisionsText: '## D-009@v1 无域条目\n- type: process\n- status: confirmed\n' })
  const noDomMd = buildDeltaReport({ changeDir: noDomFx.changeDir, specRoot: noDomFx.specRoot, project: noDomFx.project, runtimeRoot: noDomFx.runtimeRoot })
  assert(noDomMd.includes('（decisions.md 解析出 1 条当前版本决策，均未填写模块域——声明域为空）'),
    '有决策无域 → 声明域为空注记（存量兼容）')
}

console.log('\n--- 2c. buildDeltaReport apply-pathspec 兜底形态（无 reconcile 也有归属表）---\n')
{
  const fx = buildFixture({ runs: [], pathspec: 'src/a/one.js\nsrc/misc/z.txt\n' })
  const md = buildDeltaReport({ changeDir: fx.changeDir, specRoot: fx.specRoot, project: fx.project, runtimeRoot: fx.runtimeRoot, now: '2026-09-07T00:00:00.000Z' })

  assert(md.includes('sources_reconcile: 未命中（apply-pathspec 兜底，2 项）'), 'frontmatter：兜底 2 项')
  assert(md.includes('（无 reconcile 产物（变更先于 P3a 或 verify 未落盘），清单取 apply-pathspec——文件级，无 missing/undeclared 差集）'),
    '兜底形态说明注记（文件级无差集）')
  assert(md.includes('| src/a/one.js | mod-a |') && md.includes('| src/misc/z.txt | —（未匹配） |'),
    '兜底清单仍出归属表（mod-a 命中 / 未匹配单元格）')
  assert(!md.includes('对账基线'), '无 reconcile → 无对账基线/missing/undeclared 行')
  assert(md.includes('未匹配文件（不归属任何模块 paths，人工裁量）：src/misc/z.txt'), '兜底文件的未匹配提示进 Before 段')
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. deriveActualModules 导出行为（归属 + 反斜杠归一 + 未匹配 + 首命中即断）
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 3. deriveActualModules（P3d 导出：文件×前缀对 → 实改模块集）===\n')
{
  const pairs = [
    { id: 'mod-a', path: 'src/a' },
    { id: 'mod-a2', path: 'src/a' },   // 同前缀第二模块：首命中即断 → 不入集
    { id: 'mod-b', path: 'src/b/one.js' },
  ]
  const got = deriveActualModules(
    ['src/a/x.js', 'src\\a\\y.js', 'src/b/one.js', 'src/other/z.js', '', 'src/a/'],
    pairs,
  )
  assert(got instanceof Set && got.size === 2 && got.has('mod-a') && got.has('mod-b'),
    `归属：目录前缀 + 全等命中 → {mod-a, mod-b}（got ${[...got].join(',')}）`)
  assert(!got.has('mod-a2'), '同文件多模块前缀时首命中即断（Set 语义与 archive-delta 归属表取全命中形成对照）')
  assert(!got.has('nonexistent'), '未命中文件（src/other/z.js）不产生推导（R-02 不猜）')

  const bsOnly = deriveActualModules(['src\\b\\one.js'], [{ id: 'mod-b', path: 'src/b/one.js' }])
  assert(bsOnly.has('mod-b'), 'Windows 反斜杠路径归一后全等命中（src\\b\\one.js ≡ src/b/one.js）')
  assert(deriveActualModules(['src/a'], pairs).has('mod-a'), '去尾斜杠后与目录前缀全等也命中')
  assert(deriveActualModules([], pairs).size === 0, '空清单 → 空集')
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. delta CLI（bin 子进程：生成/幂等覆盖/--json/缺 --change exit 2/目录不存在 exit 1）
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 4. delta CLI（bin/sillyspec.js 子进程）===\n')
{
  const { cwd, specBase } = makeRepo('ad-cli-')
  const cn = '2026-09-05-delta-cli'
  const changeDir = join(specBase, 'changes', cn)
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(changeDir, 'decisions.md'), DECISIONS_TEXT.replace(/delta-report/g, 'delta-cli'))
  // specBase/.runtime 先例：CLI resolveRuntimeRoot 本地模式落 specBase/.runtime
  const runDir = join(specBase, '.runtime', 'verify-runs', '20260905130000')
  mkdirSync(runDir, { recursive: true })
  writeFileSync(join(runDir, 'reconcile-result.json'), JSON.stringify({
    change: cn, status: 'pass', form: 'diff', sources: ['git'],
    matched: ['src/a/one.js'], missing: [], undeclared: [],
    ran_at: '2026-09-05T13:00:00.000Z',
  }, null, 2))
  const deltaPath = join(changeDir, 'delta.md')

  console.log('--- 生成：exit 0 + 落盘 + reconcile 命中（runtimeRoot 解析 .sillyspec/.runtime）---')
  const r1 = runCLI(['--dir', cwd, 'delta', '--change', cn], { cwd })
  assert(r1.status === 0, `生成 exit 0（实际 ${r1.status}，输出尾：${r1.combined.slice(-150)}）`)
  assert(existsSync(deltaPath), 'delta.md 落盘 changes/<cn>/delta.md')
  const gen = readFileSync(deltaPath, 'utf8')
  assert(gen.includes(`# 变更 Delta — ${cn}`), 'H1 含变更名')
  assert(gen.includes('sources_reconcile: 命中（ran_at=2026-09-05T13:00:00.000Z，verify-runs 按 change 过滤取最新）'),
    'CLI runtimeRoot 解析正确（.sillyspec/.runtime/verify-runs 的 reconcile 被捞起）')
  assert(gen.includes('docs/?/modules/_module-map.yaml'), 'CLI 不收 --project → project=null 走无 module-map 降级注记（与归档接线口径互补）')
  assert(gen.includes('- missing（声明未落盘）：无') && gen.includes('- undeclared（落盘未声明）：无'),
    '空差集分支：missing/undeclared 显式「无」行（不留空白）')
  assert(r1.combined.includes('已生成 delta.md'), 'stdout 含已生成提示')

  console.log('--- 幂等覆盖：重跑即刷新（与 design-init 不覆盖语义相反）---')
  writeFileSync(deltaPath, gen + '\n<!-- STALE 旧报告人工标注 -->\n')
  const r2 = runCLI(['--dir', cwd, 'delta', '--change', cn], { cwd })
  assert(r2.status === 0, `重跑 exit 0（实际 ${r2.status}）`)
  const regen = readFileSync(deltaPath, 'utf8')
  assert(!regen.includes('STALE') && regen.includes(`# 变更 Delta — ${cn}`), '旧内容被覆盖（快照语义：源数据时点刷新）')
  assert(r2.combined.includes('幂等覆盖'), '输出注明幂等覆盖')

  console.log('--- --json：{command, change, ok, path, written} ---')
  const r3 = runCLI(['--dir', cwd, 'delta', '--change', cn, '--json'], { cwd })
  const jsonOut = parseJsonOutput(r3.stdout)
  assert(r3.status === 0 && jsonOut && jsonOut.command === 'delta' && jsonOut.change === cn && jsonOut.ok === true
    && jsonOut.written === true && String(jsonOut.path).endsWith(join('changes', cn, 'delta.md')),
    `--json 输出机器可读信封（got ${JSON.stringify(jsonOut)}）`)

  console.log('--- 缺 --change → exit 2 用法 ---')
  const r4 = runCLI(['--dir', cwd, 'delta'], { cwd })
  assert(r4.status === 2, `缺 --change exit 2（实际 ${r4.status}）`)
  assert(r4.combined.includes('用法'), '用法文案')

  console.log('--- 变更目录不存在 → exit 1（--json 时信封 ok:false）---')
  const r5 = runCLI(['--dir', cwd, 'delta', '--change', '2026-09-05-no-such-change'], { cwd })
  assert(r5.status === 1, `目录不存在 exit 1（实际 ${r5.status}）`)
  assert(r5.combined.includes('变更目录不存在'), '错误消息点名目录不存在')
  const r5j = runCLI(['--dir', cwd, 'delta', '--change', '2026-09-05-no-such-change', '--json'], { cwd })
  const jsonErr = parseJsonOutput(r5j.stdout)
  assert(r5j.status === 1 && jsonErr && jsonErr.ok === false && String(jsonErr.error || '').includes('变更目录不存在'),
    '--json 错误路径信封 ok:false + error 消息')
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. 归档集成：confirm 路径 delta.md 移动前生成、随目录进 archive/ + fail-soft
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 5. 归档集成（run archive --done --confirm 子进程完整路径）===\n')

const ARCHIVE_STEPS = [
  { name: '任务完成度检查', status: 'completed' },
  { name: 'extract-module-impact', status: 'completed' },
  { name: 'sync-module-docs', status: 'completed' },
  { name: 'decision-distill 决策提炼', status: 'completed' },
  { name: '确认归档', status: 'pending' },
  { name: '更新路线图和提交', status: 'pending' },
]

async function seedArchiveToConfirm(cwd, specBase, cn) {
  const pm = new ProgressManager({ specDir: specBase })
  await pm.init(cwd)
  await pm.initChange(cwd, cn)
  runCLI(['--dir', cwd, 'run', 'archive', '--change', cn], { cwd })
  return seedStage(pm, cwd, cn, 'archive', ARCHIVE_STEPS)
}

console.log('--- confirm：delta.md 移动前生成于 changes/<cn>/ 并随归档包进 archive/ ---')
{
  const { cwd, specBase } = makeRepo('ad-arch-1-')
  const cn = '2026-09-05-archive-delta'
  await seedArchiveToConfirm(cwd, specBase, cn)
  const changeDir = join(specBase, 'changes', cn)
  writeFileSync(join(changeDir, 'plan.md'), '# Plan\n\n## Wave 1\n\n- [x] task-01: a\n')
  writeFileSync(join(changeDir, 'design.md'), '# Design\n')
  writeFileSync(join(changeDir, 'module-impact.md'), IMPACT_MD)
  // 归档接线 runtimeRoot 同口径：specBase/.runtime/verify-runs（progress.project 缺 → moduleMap 降级）
  const runDir = join(specBase, '.runtime', 'verify-runs', '20260905130000')
  mkdirSync(runDir, { recursive: true })
  writeFileSync(join(runDir, 'reconcile-result.json'), JSON.stringify({
    change: cn, status: 'pass', form: 'diff', sources: ['git'],
    matched: ['src/a/one.js'], missing: [], undeclared: [],
    ran_at: '2026-09-05T13:00:00.000Z',
  }, null, 2))

  const r = runStage('archive', cn, cwd, { done: true, confirm: true, output: '确认归档完成' })

  const date = new Date().toISOString().slice(0, 10)
  const archivedDir = join(specBase, 'changes', 'archive', archiveDestDirName(date, cn))
  assert(r.status === 0, `归档 exit 0（实际 ${r.status}，输出尾：${r.combined.slice(-150)}）`)
  assert(existsSync(archivedDir), '变更目录已移到 archive/')
  assert(r.combined.includes('归档前已生成 delta.md'), 'stdout 含「归档前已生成 delta.md」（移动前生成）')
  const archivedDelta = join(archivedDir, 'delta.md')
  assert(existsSync(archivedDelta), 'delta.md 随归档包进 archive/<cn>/delta.md')
  const deltaContent = readFileSync(archivedDelta, 'utf8')
  assert(deltaContent.includes(`# 变更 Delta — ${cn}`), '归档包内 delta.md H1 含变更名（progress.currentChange 驱动）')
  assert(deltaContent.includes('sources_reconcile: 命中（ran_at=2026-09-05T13:00:00.000Z'), '归档路径 runtimeRoot 解析正确（reconcile 命中）')
  assert(!existsSync(join(specBase, 'changes', cn, 'delta.md')), '源位置无残留（目录已整体移走）')
}

console.log('--- fail-soft：delta.md 生成失败（EISDIR）不阻断归档 + console.error 留痕 ---')
{
  const { cwd, specBase } = makeRepo('ad-arch-2-')
  const cn = '2026-09-05-archive-delta-fail'
  await seedArchiveToConfirm(cwd, specBase, cn)
  const changeDir = join(specBase, 'changes', cn)
  writeFileSync(join(changeDir, 'plan.md'), '# Plan\n\n## Wave 1\n\n- [x] task-01: a\n')
  writeFileSync(join(changeDir, 'design.md'), '# Design\n')
  writeFileSync(join(changeDir, 'module-impact.md'), IMPACT_MD)
  // delta.md 名下预置目录 → writeFileSync 抛 EISDIR（Windows chmod 不可靠，目录占位法跨平台确定）
  mkdirSync(join(changeDir, 'delta.md'), { recursive: true })

  const r = runStage('archive', cn, cwd, { done: true, confirm: true, output: '确认归档' })

  const date = new Date().toISOString().slice(0, 10)
  const archivedDir = join(specBase, 'changes', 'archive', archiveDestDirName(date, cn))
  assert(r.status === 0, `生成失败仍归档 exit 0（实际 ${r.status}，输出尾：${r.combined.slice(-150)}）`)
  assert(existsSync(archivedDir) && existsSync(join(archivedDir, 'plan.md')), '归档移动照常完成（fail-soft 零阻断）')
  assert(r.combined.includes('归档前 delta.md 自动生成失败（不阻断归档）'), 'console.error 留痕（失败不静默）')
  assert(r.combined.includes(`可手动补: sillyspec delta --change ${cn}`), '留痕附手动补跑指引（sillyspec delta --change）')
}

// ═══════════════════════════════════════════════════════════════════════════
// 收尾
// ═══════════════════════════════════════════════════════════════════════════
for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} }
cleanup()
report(count.passed, count.failed, count.failures)
