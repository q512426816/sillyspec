/**
 * design-facts 测试套件 — IR P3c task-04 收官（change: 2026-09-07-ir-stage-p3c）
 *
 * 被测对象（commit 61d5ee3/3a1055c/c5c09ef）：
 *   - src/design-facts.js 四导出：parseDecisionDomains / loadModuleMap /
 *     validateDecisionModuleRefs / generateDesignSkeleton（本文件消费全部四导出，
 *     消 check-syntax 的 src 未引用导出项）。
 *   - src/run/complete.js 接线：brainstorm「生成规范文件」末步 --done 的决策模块域
 *     核验硬门（ERROR → exit 1 进度不推进；WARNING 放行；skipped 单行 info）。
 *   - src/index.js design-init CLI：幂等（已存在不覆盖）/--force 覆盖/缺 decisions exit 1。
 *   - src/run/prompt.js {SCAN_FACTS} 机械事实底稿注入（outputStep 直调渲染函数，
 *     存在注入/缺失空注入/fail-soft 三态）。
 *
 * 关键锁定点：
 *   1. 双源一致：parseDecisionDomains（文本入口，task-01 声明的 parseDecisions 行循环
 *      逐字镜像）× parseDecisions（decision-distill 权威导出，读盘）在同一 fixture 上
 *      投影 deep-equal——镜像漂移即红。
 *   2. 骨架契约：十三章节标题字面 + 真实 validateDesignForPlan（六章 readiness）+
 *      stage-contract-spec brainstorm design 三条 literal-any 规则全部命中——
 *      骨架落盘即可过门禁，不产「生成了骨架却过不了契约」的坑。
 *   3. 文件清单示例行为注释形态 → parseFileChangeListDetailed 解析为空（不产幻影文件，
 *      fileCount 判档不被示例行虚高）。
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, basename, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import {
  parseDecisionDomains,
  loadModuleMap,
  validateDecisionModuleRefs,
  generateDesignSkeleton,
} from '../src/design-facts.js'
import { parseDecisions } from '../src/decision-distill.js'
import { parseFileChangeListDetailed } from '../src/change-list.js'
import { getRule } from '../src/stage-contract-spec.js'
import { validateDesignForPlan } from '../src/stages/plan.js'
import { outputStep } from '../src/run/prompt.js'
import { makeRepo, initChange, seedStage, runCLI, runStage, cleanup, report } from './_cli-step-harness.mjs'
import { runCapturing } from './_complete-step-harness.mjs'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }
const tmpRoots = []
const deepEq = (a, b) => JSON.stringify(a) === JSON.stringify(b)

// ═══════════════════════════════════════════════════════════════════════════
// 共享 fixture
// ═══════════════════════════════════════════════════════════════════════════

/** 双源一致 + parseDecisionDomains 全分支共用的 decisions.md 文本（覆盖中英标签/列表
 *  三写法/NEW: 两形态/同号双版本/无域条目）。 */
const DECISIONS_TEXT = [
  '# 决策记录',
  '',
  '## D-001@v1 旧版条目（已被 v2 取代）',
  '- type: architecture',
  '- status: superseded（被 D-001@v2 取代）',
  '- 模块域: [old-mod]',
  '',
  '## D-001@v2 模块域投影双源镜像',
  '- type: architecture',
  '- status: confirmed',
  '- 模块域: mod-a、NEW:design-facts',
  '',
  '## D-002 无模块域条目（存量兼容）',
  '- type: scope',
  '- status: confirmed',
  '',
  '## D-003 裸 NEW 冒号后带空格',
  '- type: architecture',
  '- status: confirmed',
  '- 模块域: NEW: brand-new',
  '',
  '## D-004 英文标签 + 空格列表',
  '- type: process',
  '- status: accepted',
  '- domains: mod-b mod-c',
  '',
].join('\n')

/** 模块索引 fixture：block 数组（目录条目带尾斜杠）+ inline 数组 + core_files（Windows
 *  反斜杠路径）——覆盖 loadModuleMap 的 prefixPairs 归一（反斜杠→正斜杠、去尾斜杠）。 */
const MAP_YAML = [
  'modules:',
  '  mod-a:',
  '    paths:',
  '      - src/a/',
  '  mod-b:',
  '    paths: [src/b/one.js]',
  '    core_files:',
  '      - src\\b\\core.js',
  '',
].join('\n')

/** 单测级核验工作区：specRoot/docs/<project>/modules/_module-map.yaml + changeDir 的
 *  decisions.md/design.md（null = 不落盘）。与 complete.js 接线同形：
 *  changeDir = <specRoot>/changes/<name>。 */
function buildValidationFixture({ decisions, design, mapYaml, project = 'demo' } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'df-validate-')); tmpRoots.push(root)
  const specRoot = join(root, 'spec')
  const changeDir = join(specRoot, 'changes', 'c-demo')
  mkdirSync(changeDir, { recursive: true })
  if (decisions != null) writeFileSync(join(changeDir, 'decisions.md'), decisions)
  if (design != null) writeFileSync(join(changeDir, 'design.md'), design)
  if (mapYaml != null) {
    mkdirSync(join(specRoot, 'docs', project, 'modules'), { recursive: true })
    writeFileSync(join(specRoot, 'docs', project, 'modules', '_module-map.yaml'), mapYaml)
  }
  return { changeDir, specRoot, project }
}

/** design.md 文件清单段（供域差异 WARNING 用；路径命中 mod-a/mod-b 或不命中任何模块）。 */
function designWithFileList(paths) {
  const rows = paths.map(p => `| 修改 | ${p} | 改动 |`).join('\n')
  return `# 设计文档（Design）— 域差异\n\n## 文件变更清单\n| 操作 | 文件路径 | 说明 |\n|---|---|---|\n${rows}\n`
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. parseDecisionDomains：双源一致 + 最高版过滤 + NEW: 原样 + 无模块域条目
// ═══════════════════════════════════════════════════════════════════════════
console.log('=== 1. parseDecisionDomains（文本入口：纯函数解析 + 最高版过滤）===\n')
{
  const got = parseDecisionDomains(DECISIONS_TEXT)

  console.log('--- 基本投影：当前版本条目 {id, domains}（首现顺序）---')
  assert(got.length === 4, `解析出 4 条当前版本条目（got ${got.length}）`)
  assert(got[0].id === 'D-001@v2' && got[0].domains.length === 2
    && got[0].domains[0] === 'mod-a' && got[0].domains[1] === 'NEW:design-facts',
    `D-001@v2 域 ['mod-a','NEW:design-facts']（顿号切分，NEW: 前缀原样保留；got ${JSON.stringify(got[0])}）`)
  assert(got.every(e => e.id !== 'D-001@v1'), '同号最高版过滤：D-001@v1（superseded 旧版）被剔除')
  assert(got.some(e => e.id === 'D-001@v2'), '同号只留最高版本 D-001@v2')
  assert(got[1].id === 'D-002@v1' && deepEq(got[1].domains, []), 'D-002 无模块域条目 → domains:[]（不缺席、不炸）')
  assert(got[2].id === 'D-003@v1' && deepEq(got[2].domains, ['NEW:', 'brand-new']),
    `「NEW: <名>」冒号后带空格被列表切分为裸项 ['NEW:','brand-new']（书写错误由核验层报，got ${JSON.stringify(got[2])}）`)
  assert(got[3].id === 'D-004@v1' && deepEq(got[3].domains, ['mod-b', 'mod-c']),
    '英文标签 domains + 空格分隔 → 两域（中英标签同权）')
  assert(got[3].id === 'D-004@v1' && got[3].domains[0] === 'mod-b', '无 @vN 后缀头 → 默认 @v1')

  console.log('--- 双源一致：parseDecisionDomains(文本) ≡ parseDecisions(读盘) 的当前版本投影 ---')
  {
    const root = mkdtempSync(join(tmpdir(), 'df-dual-')); tmpRoots.push(root)
    const changeDir = join(root, 'changes', 'c-dual')
    mkdirSync(changeDir, { recursive: true })
    writeFileSync(join(changeDir, 'decisions.md'), DECISIONS_TEXT)
    // 权威侧投影：parseDecisions 全量 entries → 同号只留最高 @vN → {id, domains}（design-facts
    // 内部 currentVersionEntries 的等价投影；镜像侧若与权威侧漂移，此处 deep-equal 即红）
    const highest = new Map()
    for (const e of parseDecisions(changeDir).entries) {
      const prev = highest.get(e.number)
      if (!prev || e.version > prev.version) highest.set(e.number, e)
    }
    const authoritative = [...highest.values()].map(e => ({ id: e.id, domains: e.domains ? [...e.domains] : [] }))
    assert(parseDecisions(changeDir).missing === false, '权威侧 parseDecisions 正常读盘（missing=false）')
    assert(deepEq(parseDecisionDomains(readFileSync(join(changeDir, 'decisions.md'), 'utf8')), authoritative),
      `双源一致：文本镜像解析 ≡ distill 权威解析投影（${authoritative.map(e => e.id).join(', ')}）`)
  }

  console.log('--- 容错：CRLF 行尾 / 空输入 ---')
  assert(deepEq(parseDecisionDomains(DECISIONS_TEXT.replace(/\n/g, '\r\n')), got),
    'CRLF 行尾全文解析结果与 LF 完全一致（Windows 存量仓兼容）')
  assert(deepEq(parseDecisionDomains(''), []), '空文本 → []')
  assert(deepEq(parseDecisionDomains(null), []), 'null 入参 → []（String(?? \'\') 容错）')
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. loadModuleMap：有效 map（ids + prefixPairs 归一）/ 无 map null
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 2. loadModuleMap（_module-map.yaml 只读投影）===\n')
{
  const root = mkdtempSync(join(tmpdir(), 'df-map-')); tmpRoots.push(root)
  mkdirSync(join(root, 'docs', 'demo', 'modules'), { recursive: true })
  writeFileSync(join(root, 'docs', 'demo', 'modules', '_module-map.yaml'), MAP_YAML)

  console.log('--- 有效 map：ids 集合 + prefixPairs（paths ∪ core_files，路径归一）---')
  const m = loadModuleMap(root, 'demo')
  assert(m !== null, '有效 map 返回对象（非 null）')
  assert(m.ids instanceof Set && m.ids.size === 2 && m.ids.has('mod-a') && m.ids.has('mod-b'),
    `ids = {mod-a, mod-b}（got ${[...(m?.ids || [])].join(',')}）`)
  const pairs = new Set((m?.prefixPairs || []).map(p => `${p.id}|${p.path}`))
  assert(pairs.size === 3
    && pairs.has('mod-a|src/a') && pairs.has('mod-b|src/b/one.js') && pairs.has('mod-b|src/b/core.js'),
    `prefixPairs 含 paths+core_files 并集：目录尾斜杠去除、反斜杠归一（got ${[...pairs].join(' ; ')}）`)

  console.log('--- 无 map / 空参 / 解析零模块 → null（fail-open，D-002 无索引不误拦）---')
  assert(loadModuleMap(root, 'no-such-project') === null, '项目无 _module-map.yaml → null')
  assert(loadModuleMap(null, 'demo') === null, 'specRoot 缺省 → null')
  assert(loadModuleMap(root, null) === null, 'project 缺省 → null')
  {
    const root2 = mkdtempSync(join(tmpdir(), 'df-map-empty-')); tmpRoots.push(root2)
    mkdirSync(join(root2, 'docs', 'demo', 'modules'), { recursive: true })
    writeFileSync(join(root2, 'docs', 'demo', 'modules', '_module-map.yaml'), '# 无任何模块条目\nmodules:\n')
    assert(loadModuleMap(root2, 'demo') === null, 'map 存在但解析零模块 → null（空/失配 map 视同无索引）')
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. validateDecisionModuleRefs：全分级（ERROR / WARNING / skipped）
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 3. validateDecisionModuleRefs（分级核验）===\n')

console.log('--- 幻觉模块 ERROR（接线红路径·函数级：errors 非空 → complete.js exit 1）---')
{
  const { changeDir, specRoot, project } = buildValidationFixture({
    decisions: '## D-001@v1 域声明\n- type: architecture\n- status: confirmed\n- 模块域: [mod-a, ghost-mod]\n',
    mapYaml: MAP_YAML,
  })
  const r = validateDecisionModuleRefs({ changeDir, specRoot, project })
  assert(r.ok === false, '幻觉模块 → ok=false（fail-closed）')
  assert(r.errors.length === 1, `恰一条 ERROR（got ${r.errors.length}）`)
  assert(r.errors[0].startsWith('[decision_module_ref_invalid] '), `ERROR 消息内嵌信封前缀（got "${r.errors[0].slice(0, 60)}…"）`)
  assert(r.errors[0].includes('"ghost-mod"'), 'ERROR 指名未注册模块 ghost-mod')
  assert(r.errors[0].includes('_module-map.yaml') && r.errors[0].includes('NEW:ghost-mod'),
    'ERROR 附二选一出路提示（补录 map / 改用 NEW: 前缀）')
  assert((r.warnings || []).length === 0, '无 design.md 文件清单 → 域差异静默跳过（R-02 不产噪）')
  assert(r.skipped === undefined, '非 skipped 路径无 skipped 字段')
}

console.log('--- NEW: 前缀豁免 / 裸 NEW:（冒号后带空格）书写 ERROR ---')
{
  const { changeDir, specRoot, project } = buildValidationFixture({
    decisions: '## D-001@v1 新模块声明\n- type: architecture\n- status: confirmed\n- 模块域: NEW:design-facts\n',
    mapYaml: MAP_YAML,
  })
  const r = validateDecisionModuleRefs({ changeDir, specRoot, project })
  assert(r.ok === true && r.errors.length === 0, 'NEW:<名> 前缀声明新模块 → 豁免存在性核验（D-002/D-004）')
}
{
  const { changeDir, specRoot, project } = buildValidationFixture({
    decisions: '## D-001@v1 裸 NEW\n- type: architecture\n- status: confirmed\n- 模块域: NEW: brand-new\n',
    mapYaml: MAP_YAML,
  })
  const r = validateDecisionModuleRefs({ changeDir, specRoot, project })
  assert(r.ok === false && r.errors.length === 2,
    `「NEW: <名>」切分出裸项 'NEW:' + 未注册 'brand-new' → 两条 ERROR（got ${r.errors.length}）`)
  assert(r.errors.some(e => e.includes('裸项 "NEW:"') && e.includes('正确写法 NEW:')),
    `裸 NEW: 报书写错误并附正确写法（NEW:<名> 冒号后不加空格；got "${(r.errors[0] || '').slice(0, 60)}…"）`)
  assert(r.errors.every(e => e.startsWith('[decision_module_ref_invalid] ')), '两条 ERROR 均带信封前缀')
}

console.log('--- 域差异双向 WARNING（实改未声明 × 声明未实改；NEW:/未注册域不入声明侧）---')
{
  const { changeDir, specRoot, project } = buildValidationFixture({
    decisions: [
      '## D-001@v1 域声明',
      '- type: architecture',
      '- status: confirmed',
      '- 模块域: mod-a',
      '',
      '## D-002@v1 新模块域',
      '- type: architecture',
      '- status: confirmed',
      '- 模块域: NEW:future-mod',
      '',
    ].join('\n'),
    // 文件清单：src/b/one.js 精确命中 mod-b 的 core/paths 条目（实改未声明）；
    // src/other.js 不命中任何模块（不产噪）；mod-a 声明了但清单无 src/a 文件（声明未实改）
    design: designWithFileList(['src/b/one.js', 'src/other.js']),
    mapYaml: MAP_YAML,
  })
  const r = validateDecisionModuleRefs({ changeDir, specRoot, project })
  assert(r.ok === true && r.errors.length === 0, `WARNING 不拦（ok=true 零 ERROR，措辞留人工裁量；errors=${JSON.stringify(r.errors)}）`)
  const gapWarnings = r.warnings.filter(w => w.startsWith('[decision_module_domain_gap] '))
  assert(gapWarnings.length === 2, `双向各一条域差异 WARNING（got ${gapWarnings.length}: ${JSON.stringify(r.warnings)}）`)
  assert(gapWarnings.some(w => w.includes('实改模块 "mod-b"') && w.includes('未出现在任何决策的模块域声明')),
    '方向 A：design.md 文件清单命中的实改模块未声明 → WARNING')
  assert(gapWarnings.some(w => w.includes('声明模块域 "mod-a"') && w.includes('未命中 design.md 文件清单')),
    '方向 B：声明的模块域未命中文件清单任何文件 → WARNING')
  assert(gapWarnings.every(w => !w.includes('NEW:future-mod')), 'NEW: 域按定义不在 map 内，不进声明侧比对（无重复噪音）')
}

console.log('--- 全部条目均未填模块域 → 汇总一条 WARNING（存量兼容）---')
{
  const { changeDir, specRoot, project } = buildValidationFixture({
    decisions: '## D-001@v1 无域\n- type: architecture\n- status: confirmed\n\n## D-002@v1 亦无域\n- type: scope\n- status: confirmed\n',
    mapYaml: MAP_YAML,
  })
  const r = validateDecisionModuleRefs({ changeDir, specRoot, project })
  assert(r.ok === true, '零红门禁：全缺失 → ok=true 放行')
  assert(r.warnings.length === 1 && r.warnings[0].startsWith('[decision_module_domain_gap] ')
    && r.warnings[0].includes('2') && r.warnings[0].includes('均未填写「模块域」'),
    `汇总一条 WARNING（条数计入 + 补填建议；got ${JSON.stringify(r.warnings)}）`)
  assert(r.warnings[0].includes('NEW:'), '汇总 WARNING 附 NEW:<名> 新模块写法指引')
}

console.log('--- skipped：无 changeDir / 无 decisions.md / 无 module-map → ok=true---')
{
  assert(validateDecisionModuleRefs({}).ok === true
    && validateDecisionModuleRefs({}).skipped.includes('changeDir 未提供'),
    'changeDir 未提供 → ok=true + skipped 原因')
}
{
  const { changeDir, specRoot, project } = buildValidationFixture({ mapYaml: MAP_YAML }) // 无 decisions.md
  const r = validateDecisionModuleRefs({ changeDir, specRoot, project })
  assert(r.ok === true && r.errors.length === 0 && (r.warnings || []).length === 0,
    '无 decisions.md → ok=true 零错误零警告')
  assert(r.skipped.includes('decisions.md 不存在'), `skipped 原因含 decisions.md 不存在（got "${r.skipped}"）`)
}
{
  const { changeDir, specRoot, project } = buildValidationFixture({
    decisions: '## D-001@v1 有决策\n- type: architecture\n- status: confirmed\n- 模块域: mod-a\n',
    // 不写 mapYaml → 无模块索引
  })
  const r = validateDecisionModuleRefs({ changeDir, specRoot, project })
  assert(r.ok === true && r.errors.length === 0, '无 _module-map.yaml → ok=true（无索引不误拦）')
  assert(r.skipped.includes('_module-map.yaml 不存在或不可解析'), `skipped 原因含 map 缺失（got "${r.skipped}"）`)
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. generateDesignSkeleton：十三章节契约 + 决策追踪预填 + 无幻影文件
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 4. generateDesignSkeleton（design.md 骨架渲染）===\n')

const THIRTEEN_SECTIONS = [
  '背景', '设计目标', '非目标', '拆分判断', '总体方案', '文件变更清单', '接口定义',
  '生命周期契约表', '数据模型', '兼容策略（brownfield 必填）', '风险登记', '决策追踪', '自审',
]

console.log('--- 十三章节标题契约（字面、有序、无多无漏）---')
{
  const s = generateDesignSkeleton({ changeName: 'demo-change' })
  const h2 = s.split('\n').filter(l => l.startsWith('## ')).map(l => l.slice(3))
  assert(deepEq(h2, THIRTEEN_SECTIONS),
    `## 二级标题恰为十三章节且顺序一致（got ${h2.length} 章: ${h2.join('/')}）`)
  assert(s.endsWith('\n') && !s.endsWith('\n\n'), 'LF 行尾 + 单一尾换行')
}

console.log('--- 六章 readiness（真实 validateDesignForPlan + manifest 逐 check）---')
{
  const s = generateDesignSkeleton({ changeName: 'demo-change' })
  const v = validateDesignForPlan(s)
  assert(v.ok === true && v.errors.length === 0, `六章 error 级 readiness 全过（goal/scope/decisions；errors=${JSON.stringify(v.errors)}）`)
  assert(v.warnings.length === 0, `三章 warning 级 readiness 亦全过（non-goals/constraints/file-changes；warnings=${JSON.stringify(v.warnings)}）`)
  const checks = getRule('plan.design-readiness').data.checks
  for (const c of checks) {
    const hit = c.patterns.some(p => new RegExp(p.pattern, p.flags).test(s))
    assert(hit, `readiness check "${c.id}" 逐字面命中骨架`)
  }
}

console.log('--- brainstorm design 三条 literal-any 门禁（文件清单/风险登记/自审）---')
{
  const s = generateDesignSkeleton({ changeName: 'demo-change' })
  for (const ruleId of ['brainstorm.design.file-change-list', 'brainstorm.design.risk-register', 'brainstorm.design.self-review']) {
    const literals = getRule(ruleId).data.literals
    assert(literals.some(lit => s.includes(lit)),
      `${ruleId} 字面命中（literals=${JSON.stringify(literals)}）`)
  }
}

console.log('--- 决策追踪表预填当前版本（旧版不出现）---')
{
  const decisions = [
    '## D-001@v1 旧版',
    '- 模块域: old',
    '',
    '## D-001@v2 新版',
    '- 模块域: mod-a',
    '',
    '## D-002@v1 无域',
    '- type: scope',
    '',
  ].join('\n')
  const s = generateDesignSkeleton({ changeName: 'c', decisionsText: decisions })
  assert(s.includes('| D-001@v2 | （待填覆盖点） | 待确认 |'), 'D-001@v2 预填追踪表行')
  assert(s.includes('| D-002@v1 | （待填覆盖点） | 待确认 |'), 'D-002@v1（无域条目）也预填（预填只看条目不看域）')
  assert(!s.includes('D-001@v1'), 'superseded 旧版 D-001@v1 全文不出现')
}
{
  const s = generateDesignSkeleton({ changeName: 'c' }) // 无 decisionsText
  assert(s.includes('未从 decisions.md 解析出当前版本决策条目'), '无决策 → 占位注释而非空表')
  assert(!s.includes('| D-'), '无决策时不产生任何 D-xxx 表行')
}

console.log('--- frontmatter / 标题 / 默认值兜底 ---')
{
  const s = generateDesignSkeleton({ changeName: 'demo-change', author: 'alice', now: '2026-09-07 10:00:00' })
  assert(s.startsWith('---\n'), 'frontmatter 起始')
  assert(s.includes('author: alice') && s.includes('created_at: 2026-09-07 10:00:00') && s.includes('scale: large'),
    'frontmatter 三字段（author/created_at/scale: large）')
  assert(s.includes('# 设计文档（Design）— demo-change'), 'H1 标题含变更名')
  const def = generateDesignSkeleton({})
  assert(def.includes('# 设计文档（Design）— <变更简述>'), 'changeName 缺省 → <变更简述> 占位')
  assert(def.includes('author: TODO（git 用户名）') && def.includes('created_at: TODO（ISO 时间）'),
    'author/now 缺省 → TODO 占位（不产伪造值）')
}

console.log('--- 文件清单示例行 = 注释形态 → parseFileChangeListDetailed 解析为空（不产幻影文件）---')
{
  const s = generateDesignSkeleton({ changeName: 'c' })
  assert(s.includes('src/xxx/NewFile.java'), '示例行存在（含示例路径，非真空断言）')
  assert(s.includes('<!-- 示例行'), '示例行为 HTML 注释形态')
  const root = mkdtempSync(join(tmpdir(), 'df-skel-')); tmpRoots.push(root)
  const designPath = join(root, 'design.md')
  writeFileSync(designPath, s)
  const parsed = parseFileChangeListDetailed(designPath)
  assert(deepEq(parsed.map(e => e.path), []), `清单解析为空——示例行不入 fileCount 判档（got ${JSON.stringify(parsed)}）`)
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. 接线红路径（CLI 级）：brainstorm 末步核验 exit 1 / WARNING 放行 / skipped 放行
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 5. complete.js 接线：brainstorm「生成规范文件」末步核验 ===\n')

const BRAINSTORM_STEPS = [
  '进度确认', '加载项目上下文', '对话式探索与需求澄清', '提出 2-3 种方案',
  '分段展示设计', '写设计文档并自审', 'Design Grill 交叉审查', '生成规范文件',
]
async function seedBrainstormToLast(cwd, specBase, cn) {
  const pm = await initChange(cwd, specBase, cn)
  runCLI(['--dir', cwd, 'run', 'brainstorm', '--change', cn], { cwd })
  return seedStage(pm, cwd, cn, 'brainstorm',
    BRAINSTORM_STEPS.map((name, i) => ({ name, status: i < BRAINSTORM_STEPS.length - 1 ? 'completed' : 'pending' })))
}
/** 四件套 + design（末步核验若被移除，完整产物会让流程正常完成 exit 0——红断言只归于本门禁） */
function writeCompleteArtifacts(specBase, cn, fileListRows, cwd = null) {
  const changeDir = join(specBase, 'changes', cn)
  writeFileSync(join(changeDir, 'proposal.md'), '# Proposal\n\n## 不在范围内\n无\n')
  writeFileSync(join(changeDir, 'requirements.md'), '# Requirements\n\n- FR-001: 模块域核验\n')
  writeFileSync(join(changeDir, 'tasks.md'), '# Tasks\n\n- [ ] task-01: 改 a\n')
  writeFileSync(join(changeDir, 'design.md'),
    `# 设计文档（Design）— ${cn}\n\n## 背景\n决策模块域需核验。\n\n## 总体方案\ndesign-facts 纯函数核验。\n\n## 决策\nD-001@v1: 模块域登记。\n\n## 文件变更清单\n| 操作 | 文件路径 | 说明 |\n|------|---------|------|\n${fileListRows}\n\n## 风险登记\n低风险。\n\n## 自审\n已核对。\n`)

  // 2026-09-07-ir-hardening：design 清单行级核验 gate 上线后，fixture 清单路径必须真实存在于
  // cwd（或写 NEW: 前缀）——按清单行同步落盘 stub 文件，各用例模块归属断言语义不变
  if (cwd) {
    for (const row of String(fileListRows).split('\n')) {
      const m = row.match(/\|\s*[^|]+\|\s*([^|]+?)\s*\|/)
      if (!m || !m[1]) continue
      const rel = m[1].trim().replace(/^NEW:/, '')
      if (!rel) continue
      const abs = join(cwd, rel)
      try { mkdirSync(dirname(abs), { recursive: true }); writeFileSync(abs, '// fixture stub') } catch {}
    }
  }}
/** CLI 侧模块索引：project = DB project 行名 = basename(cwd)（makeRepo+initChange 同链） */
function writeCliModuleMap(specBase, cwd) {
  const dir = join(specBase, 'docs', basename(cwd), 'modules')
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, '_module-map.yaml'), 'modules:\n  mod-a:\n    paths:\n      - src/a/\n  mod-b:\n    paths:\n      - src/b/\n')
}

console.log('--- ERROR 红路径：幻觉模块域 → exit 1 + 进度不推进（末步保持 pending）---')
{
  const { cwd, specBase } = makeRepo('df-cli-red-')
  const cn = '2026-09-07-dm-red'
  await seedBrainstormToLast(cwd, specBase, cn)
  writeCompleteArtifacts(specBase, cn, '| 修改 | src/a/x.js | a 改动 |', cwd)
  writeFileSync(join(specBase, 'changes', cn, 'decisions.md'),
    '## D-001@v1 域声明\n- type: architecture\n- status: confirmed\n- 模块域: ghost-mod\n')
  writeCliModuleMap(specBase, cwd)

  const r = runStage('brainstorm', cn, cwd, { done: true, output: '生成规范完成', answer: '确认' })

  assert(r.status === 1, `幻觉模块域 exit 1（实际 ${r.status}，输出尾：${r.combined.slice(-150)}）`)
  assert(r.combined.includes('[decision_module_ref_invalid]'), 'stderr 含 [decision_module_ref_invalid] 信封前缀')
  assert(r.combined.includes('"ghost-mod"') && r.combined.includes('NEW:ghost-mod'), '阻断消息指名幻觉模块 + NEW: 出路')
  assert(r.combined.includes('决策模块域核验阻断'), '阻断标题文案（本次 --done 未完成，进度未推进）')

  const { ProgressManager } = await import('../src/progress.js')
  const after = await new ProgressManager({ specDir: specBase }).read(cwd, cn)
  const steps = after.stages.brainstorm.steps
  assert(steps[steps.length - 1].status === 'pending', '末步「生成规范文件」保持 pending（门禁先于完成落章）')
  assert(after.stages.brainstorm.status !== 'completed', '阶段未 completed')
}

console.log('--- WARNING 放行：声明×实改差异双向 → ⚠️ 留痕但 exit 0 阶段完成 ---')
{
  const { cwd, specBase } = makeRepo('df-cli-warn-')
  const cn = '2026-09-07-dm-warn'
  await seedBrainstormToLast(cwd, specBase, cn)
  writeCompleteArtifacts(specBase, cn, '| 修改 | src/b/x.js | b 改动 |', cwd)
  writeFileSync(join(specBase, 'changes', cn, 'decisions.md'),
    '## D-001@v1 域声明\n- type: architecture\n- status: confirmed\n- 模块域: mod-a\n')
  writeCliModuleMap(specBase, cwd)

  const r = runStage('brainstorm', cn, cwd, { done: true, output: '生成规范完成', answer: '确认' })

  assert(r.status === 0, `WARNING 不拦 exit 0（实际 ${r.status}，输出尾：${r.combined.slice(-150)}）`)
  assert(r.combined.includes('[decision_module_domain_gap]') && r.combined.includes('实改模块 "mod-b"'),
    '放行前打印 实改未声明 WARNING（mod-b 命中文件清单）')
  assert(r.combined.includes('声明模块域 "mod-a"'), '放行前打印 声明未实改 WARNING（mod-a 无对应文件）')
  const { ProgressManager } = await import('../src/progress.js')
  const after = await new ProgressManager({ specDir: specBase }).read(cwd, cn)
  assert(after.stages.brainstorm.status === 'completed', 'WARNING 路径阶段正常 completed')
}

console.log('--- skipped 放行：无 _module-map.yaml → 单行 info + exit 0 ---')
{
  const { cwd, specBase } = makeRepo('df-cli-skip-')
  const cn = '2026-09-07-dm-skip'
  await seedBrainstormToLast(cwd, specBase, cn)
  writeCompleteArtifacts(specBase, cn, '| 修改 | src/a/x.js | a 改动 |', cwd)
  writeFileSync(join(specBase, 'changes', cn, 'decisions.md'),
    '## D-001@v1 域声明\n- type: architecture\n- status: confirmed\n- 模块域: mod-a\n')
  // 不写 module-map → 无索引

  const r = runStage('brainstorm', cn, cwd, { done: true, output: '生成规范完成', answer: '确认' })

  assert(r.status === 0, `无索引不误拦 exit 0（实际 ${r.status}，输出尾：${r.combined.slice(-150)}）`)
  assert(r.combined.includes('[decision_module_check_skipped]') && r.combined.includes('_module-map.yaml 不存在或不可解析'),
    '接线层包 decision_module_check_skipped 信封 code + skipped 原因')
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. design-init CLI（幂等 / --force / 缺 decisions exit 1 / --json）
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 6. design-init CLI（骨架落盘接线）===\n')
{
  const { cwd, specBase } = makeRepo('df-di-')
  const cn = '2026-09-07-design-init-demo'
  const changeDir = join(specBase, 'changes', cn)
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(changeDir, 'decisions.md'),
    '## D-001@v1 采用骨架生成\n- type: architecture\n- status: confirmed\n- 模块域: mod-a\n')
  const designPath = join(changeDir, 'design.md')

  console.log('--- 首次生成（exit 0，骨架 + 追踪表预填 + frontmatter）---')
  const r1 = runCLI(['--dir', cwd, 'design-init', '--change', cn], { cwd })
  assert(r1.status === 0, `首次生成 exit 0（实际 ${r1.status}，输出：${r1.combined.slice(-150)}）`)
  const gen = readFileSync(designPath, 'utf8')
  assert(gen.includes('# 设计文档（Design）— ' + cn), 'design.md H1 含变更名')
  assert(gen.includes('| D-001@v1 | （待填覆盖点） | 待确认 |'), '决策追踪表按当前版本预填')
  assert(gen.includes('## 自审') && gen.includes('## 风险登记'), '十三章节骨架落盘')
  assert(gen.includes('author: test'), 'author 取 git user.name（makeRepo 配置为 test）')

  console.log('--- 幂等：已存在不覆盖（agent 产出优先）---')
  writeFileSync(designPath, gen + '\n<!-- AGENT FILLED 散文已填 -->\n')
  const r2 = runCLI(['--dir', cwd, 'design-init', '--change', cn], { cwd })
  assert(r2.status === 0, `已存在再跑 exit 0（实际 ${r2.status}）`)
  assert(r2.combined.includes('已存在，不覆盖'), '提示不覆盖文案')
  assert(readFileSync(designPath, 'utf8').includes('AGENT FILLED'), '既有文件内容原样保留（未被覆盖）')

  console.log('--- --json 存在路径：written=false, reason=exists ---')
  const r2j = runCLI(['--dir', cwd, 'design-init', '--change', cn, '--json'], { cwd })
  let jsonOut = null
  try { jsonOut = JSON.parse(r2j.stdout.trim()) } catch { jsonOut = null }
  assert(r2j.status === 0 && jsonOut && jsonOut.ok === true && jsonOut.written === false && jsonOut.reason === 'exists',
    `--json 存在路径输出 {ok:true, written:false, reason:'exists'}（got ${JSON.stringify(jsonOut)}）`)
  assert(readFileSync(designPath, 'utf8').includes('AGENT FILLED'), '--json 路径同样不覆盖')

  console.log('--- --force：覆盖重生成（agent 填充内容被骨架替换）---')
  const r3 = runCLI(['--dir', cwd, 'design-init', '--change', cn, '--force'], { cwd })
  assert(r3.status === 0, `--force exit 0（实际 ${r3.status}）`)
  const forced = readFileSync(designPath, 'utf8')
  assert(!forced.includes('AGENT FILLED'), '--force 覆盖既有填充内容')
  assert(forced.includes('| D-001@v1 | （待填覆盖点） | 待确认 |'), '--force 重生成后追踪表仍预填')
  assert(r3.combined.includes('--force 覆盖'), '--force 输出注明覆盖')

  console.log('--- 缺 decisions.md → exit 1 + 指引先跑 brainstorm ---')
  const r4 = runCLI(['--dir', cwd, 'design-init', '--change', '2026-09-07-no-decisions'], { cwd })
  assert(r4.status === 1, `缺 decisions exit 1（实际 ${r4.status}）`)
  assert(r4.combined.includes('decisions.md 不存在'), '错误消息含 decisions.md 不存在')
  assert(r4.combined.includes('run brainstorm'), '指引先跑 brainstorm 形成决策')

  console.log('--- 缺 --change 参数 → exit 2 用法 ---')
  const r5 = runCLI(['--dir', cwd, 'design-init'], { cwd })
  assert(r5.status === 2, `缺 --change exit 2（实际 ${r5.status}）`)
  assert(r5.combined.includes('用法'), '用法文案')
}

// ═══════════════════════════════════════════════════════════════════════════
// 7. prompt.js {SCAN_FACTS} 注入（outputStep 直调：存在/缺失/fail-soft）
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 7. _facts 注入（outputStep 渲染函数直调）===\n')
const FACTS_PROMPT_STEPS = [{ name: '加载项目上下文', prompt: '读项目文档与 {SCAN_FACTS} 机械事实底稿。', requiresWait: false }]
{
  console.log('--- 底稿存在 → 全文注入 + 红线一句，无占位符残留 ---')
  const { cwd, specBase } = makeRepo('df-facts-yes-')
  const scanDir = join(specBase, 'docs', 'demo-proj', 'scan')
  mkdirSync(scanDir, { recursive: true })
  writeFileSync(join(scanDir, '_facts.md'), '## ENDPOINTS\n- GET /api/widgets → listWidgets\n\n## 依赖\n- node:fs\n')
  const r = await runCapturing(() =>
    outputStep('brainstorm', 0, FACTS_PROMPT_STEPS, cwd, null, 'demo-proj', {}, null))
  assert(!r.error, `渲染不抛不 exit（error=${r.error}）`)
  assert(r.stdout.includes('### 🧾 机械事实底稿'), '注入「机械事实底稿」段标题')
  assert(r.stdout.includes('GET /api/widgets → listWidgets'), '底稿全文注入（端点行原样出现）')
  assert(r.stdout.includes('⛔ 红线') && r.stdout.includes('禁止重新 grep'), '注入红线一句（禁止重新 grep 发现，冲突以底稿为准）')
  assert(!r.stdout.includes('{SCAN_FACTS}'), '无 {SCAN_FACTS} 占位符残留')

  console.log('--- 底稿缺失 → 空注入（不留残留占位符）---')
  const { cwd: cwd2 } = makeRepo('df-facts-no-')
  const r2 = await runCapturing(() =>
    outputStep('brainstorm', 0, FACTS_PROMPT_STEPS, cwd2, null, 'demo-proj', {}, null))
  assert(!r2.error, `缺失路径渲染不抛（error=${r2.error}）`)
  assert(!r2.stdout.includes('### 🧾 机械事实底稿'), '无底稿注入段标题（### 🧾 前缀是注入专属）')
  assert(!r2.stdout.includes('{SCAN_FACTS}'), '缺失 → 占位符替换为空串（无残留）')

  console.log('--- fail-soft：_facts.md 路径不可读（目录占位）→ 空注入不阻断 ---')
  const { cwd: cwd3, specBase: sb3 } = makeRepo('df-facts-eisdir-')
  // _facts.md 名下建目录：existsSync=true 但 readFileSync 抛 EISDIR → catch 空注入
  mkdirSync(join(sb3, 'docs', 'demo-proj', 'scan', '_facts.md'), { recursive: true })
  const r3 = await runCapturing(() =>
    outputStep('brainstorm', 0, FACTS_PROMPT_STEPS, cwd3, null, 'demo-proj', {}, null))
  assert(!r3.error, `读取异常被吞、渲染不阻断（error=${r3.error}）`)
  assert(!r3.stdout.includes('### 🧾 机械事实底稿'), '异常 → 无底稿注入段')
  assert(!r3.stdout.includes('{SCAN_FACTS}'), 'fail-soft 仍清占位符（无残留）')
}

// ═══════════════════════════════════════════════════════════════════════════
// 收尾
// ═══════════════════════════════════════════════════════════════════════════
for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} }
cleanup()
report(count.passed, count.failed, count.failures)
