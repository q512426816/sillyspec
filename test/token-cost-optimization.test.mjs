/**
 * token 成本优化测试（2026-08-22-token-cost-optimization）
 *
 * 覆盖四块：
 *  1. module-resolve：跨层 _module-map.yaml 级联匹配（细卡 agent/** 胜过粗卡 backend/**）、
 *     per-task 解析与渲染表（P0a）
 *  2. buildWavePrompt：模块卡分级段 + design.md 热区（非目标/兼容策略两节 + 行号索引）注入，
 *     无 fixture 时零回归（原文案原样保留）（P0a/P1a）
 *  3. modules split-changelog：dry-run 不写盘 / --force 迁出 + 卡内留指针（P0b）
 *  4. generateSymbolImpactSkeleton：tasks.md 内容指纹（P2a）；detectDocBloat：模块卡/知识库
 *     软上限告警（P0b/P2b）
 *
 * 风格：自研 assert + mkdtempSync fixture，参照 backfill-reviews.test.mjs。
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { tmpdir } from 'os'
import { fileURLToPath } from 'url'

import { collectModuleMaps, matchModuleCard, resolveChangeModuleCards, renderModuleResolveTable } from '../src/module-resolve.js'
import { splitChangelog } from '../src/modules.js'
import { buildWavePrompt } from '../src/stages/execute.js'
import { generateSymbolImpactSkeleton } from '../src/run/gates.js'
import { detectDocBloat } from '../src/doctor-diagnostics.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

let passed = 0
let failed = 0
const tmpRoots = []

function assert(cond, msg) {
  if (cond) { console.log(`  ✅ PASS: ${msg}`); passed++ }
  else { console.log(`  ❌ FAIL: ${msg}`); failed++ }
}

function mkTmp(label) {
  const d = mkdtempSync(join(tmpdir(), `sillyspec-tco-${label}-`))
  tmpRoots.push(d)
  return d
}

// ── fixture：两层 map（根层粗卡 backend/frontend + 子项目细卡 agent）+ change 目录 ──
function buildCascadeFixture() {
  const root = mkTmp('cascade')
  // 顶层子项目目录（前缀判定锚）：backend/ 存在 → docs/backend map 视为子项目细 map
  mkdirSync(join(root, 'backend'), { recursive: true })
  writeFileSync(join(root, 'backend', '.gitkeep'), '')
  const specBase = join(root, '.sillyspec')

  // 根层粗 map（project 'demo' 非顶层目录 → prefix ''）
  mkdirSync(join(specBase, 'docs', 'demo', 'modules'), { recursive: true })
  writeFileSync(join(specBase, 'docs', 'demo', 'modules', '_module-map.yaml'), [
    'schema_version: 1',
    'modules:',
    '  backend:',
    '    status: active',
    '    doc: modules/backend.md',
    '    paths:',
    '      - backend/**',
    '  frontend:',
    '    status: active',
    '    doc: modules/frontend.md',
    '    paths:',
    '      - frontend/**',
    '',
  ].join('\n'))
  writeFileSync(join(specBase, 'docs', 'demo', 'modules', 'backend.md'), '# backend 大卡\n\n## 定位\n粗卡\n')
  writeFileSync(join(specBase, 'docs', 'demo', 'modules', 'frontend.md'), '# frontend 大卡\n')

  // 子项目细 map（project 'backend' 是顶层目录 → prefix 'backend/'）
  mkdirSync(join(specBase, 'docs', 'backend', 'modules'), { recursive: true })
  writeFileSync(join(specBase, 'docs', 'backend', 'modules', '_module-map.yaml'), [
    'schema_version: 1',
    'modules:',
    '  agent:',
    '    status: active',
    '    doc: modules/agent.md',
    '    paths:',
    '      - app/modules/agent/**',
    '',
  ].join('\n'))
  writeFileSync(join(specBase, 'docs', 'backend', 'modules', 'agent.md'), '# agent 细卡\n\n## 契约摘要\n小卡\n')

  // change 目录：注册表 + 两张 task 卡 + design.md
  const changeDir = join(specBase, 'changes', 'c1')
  mkdirSync(join(changeDir, 'tasks'), { recursive: true })
  writeFileSync(join(changeDir, 'tasks.md'), [
    '---', 'author: t', '---', '',
    '# 任务清单', '',
    '- [ ] task-01: backend agent 模块改造',
    '- [ ] task-02: backend 根配置调整',
    '',
  ].join('\n'))
  writeFileSync(join(changeDir, 'tasks', 'task-01.md'), [
    '---', 'id: task-01', 'allowed_paths:', '  - backend/app/modules/agent/model.py', '---', '',
  ].join('\n'))
  writeFileSync(join(changeDir, 'tasks', 'task-02.md'), [
    '---', 'id: task-02', 'allowed_paths:', '  - backend/pyproject.toml', '---', '',
  ].join('\n'))
  writeFileSync(join(changeDir, 'design.md'), [
    '# 设计', '',
    '## 目标', '', '做一件事', '',
    '## 非目标', '', '- 不做数据迁移回填', '- 不动前端', '',
    '## 兼容策略', '', '- 旧字段保留一个版本周期', '',
    '## 数据模型', '', '（长节，按需读）', '',
  ].join('\n'))
  return { root, specBase, changeDir }
}

console.log('── 1. module-resolve 级联匹配 ──')
{
  const { root, specBase } = buildCascadeFixture()
  const maps = collectModuleMaps({ cwd: root, specBase })
  assert(maps.length === 2, `收齐两层 map（实际 ${maps.length}）`)
  const fineMap = maps.find(m => m.prefix === 'backend/')
  const coarseMap = maps.find(m => m.prefix === '')
  assert(!!fineMap && !!coarseMap, `前缀判定：backend 子项目 map 得 'backend/'、demo 根 map 得 ''`)

  const fineHit = matchModuleCard('backend/app/modules/agent/model.py', maps)
  assert(fineHit && fineHit.moduleId === 'agent', `细卡胜出：agent 模块命中 backend/app/modules/agent/**（实际 ${fineHit && fineHit.moduleId}）`)
  const coarseHit = matchModuleCard('backend/pyproject.toml', maps)
  assert(coarseHit && coarseHit.moduleId === 'backend', `粗卡兜底：游离文件落 backend 粗卡（实际 ${coarseHit && coarseHit.moduleId}）`)
  assert(matchModuleCard('docs/other.md', maps) === null, '未命中任何模块 → null')
}

console.log('── 2. resolveChangeModuleCards + 渲染表 ──')
{
  const { root, specBase } = buildCascadeFixture()
  const { hasMaps, rows } = resolveChangeModuleCards({ cwd: root, specBase, changeName: 'c1' })
  assert(hasMaps, 'hasMaps=true')
  const r1 = rows.find(r => r.taskId === 'task-01')
  const r2 = rows.find(r => r.taskId === 'task-02')
  assert(r1 && r1.moduleId === 'agent' && r1.granularity === 'fine', `task-01 → agent 细卡（实际 ${r1 && r1.moduleId}/${r1 && r1.granularity}）`)
  assert(r1 && r1.cardPath && r1.cardPath.endsWith('.sillyspec/docs/backend/modules/agent.md'), `task-01 卡路径指向细卡（实际 ${r1 && r1.cardPath}）`)
  assert(r1 && r1.advice === '整卡可读', `细卡建议整卡读（实际 ${r1 && r1.advice}）`)
  assert(r2 && r2.moduleId === 'backend' && r2.granularity === 'coarse', `task-02 → backend 粗卡（实际 ${r2 && r2.moduleId}/${r2 && r2.granularity}）`)

  const table = renderModuleResolveTable({ cwd: root, specBase, changeName: 'c1' })
  assert(table.includes('agent') && table.includes('细'), '渲染表含 agent 细卡行')
  assert(table.includes('按节读'), '粗大卡行给出按节读建议')

  const noMaps = renderModuleResolveTable({ cwd: mkTmp('nomap'), specBase: join(mkTmp('nomap2'), '.sillyspec'), changeName: 'x' })
  assert(noMaps.includes('跳过模块文档加载'), '无 map → 渲染表给跳过提示（占位符恒被替换）')
}

console.log('── 3. buildWavePrompt：模块卡分级 + design 热区（P0a/P1a）──')
{
  const { root, changeDir } = buildCascadeFixture()
  const wave = { index: 1, tasks: [{ index: 1, name: 'agent 改造' }, { index: 2, name: '根配置' }] }
  const out = buildWavePrompt(wave, 1, changeDir, join(root, 'wt'))

  assert(out.includes('### 模块卡分级（本 Wave 子代理按表引用'), 'Wave prompt 含模块卡分级段')
  assert(out.includes('agent') && out.includes('细卡'), '分级段列出 agent 细卡')
  assert(out.includes('### design.md 热区'), 'Wave prompt 含 design.md 热区段')
  assert(out.includes('#### 非目标') && out.includes('#### 兼容策略'), '热区含非目标/兼容策略两节')
  assert(out.includes('不做数据迁移回填'), '热区正文来自 design.md 对应节')
  assert(out.includes('### design.md 章节行号索引'), '热区附章节行号索引')
  assert(out.includes('- L3 ## 目标'), '行号索引含节锚（- L3 ## 目标）')
  assert(out.includes('不要再整读 design.md'), 'Wave 开始前第 1 条换成「勿整读」版文案')
  assert(out.includes('模块卡分级**：把上方「模块卡分级」表'), '子代理要点 4 换成分级表版文案')
  // 契约/测试用例注入不受影响
  assert(out.includes('{{include: testcase-design}}'), 'testcase-design include 原样保留')
}
{
  // 零回归：无 changeDir（无 map / 无 design）→ 新段全部不注入，原文案保留
  const wave = { index: 1, tasks: [{ index: 1, name: 'x' }] }
  const out = buildWavePrompt(wave, 1, null, '/tmp/wt')
  assert(!out.includes('### 模块卡分级'), '无 changeDir → 不注入模块卡分级段')
  assert(!out.includes('### design.md 热区'), '无 changeDir → 不注入热区段')
  assert(out.includes('读取 design.md 的「非目标」与「兼容策略」章节'), 'Wave 开始前第 1 条保留原文案')
  assert(out.includes('4. 如存在模块文档'), '子代理要点 4 保留原文案')
}

console.log('── 4. split-changelog（P0b）──')
{
  const root = mkTmp('split')
  const modulesDir = join(root, '.sillyspec', 'docs', 'demo', 'modules')
  mkdirSync(modulesDir, { recursive: true })
  const card = join(modulesDir, 'backend.md')
  writeFileSync(card, [
    '# backend', '',
    '## 定位', '', '后端服务', '',
    '## 变更索引', '',
    '- ql-20260822-001 | 加 session_id 列',
    '- ql-20260822-002 | 测试提速',
    '- ql-20260822-003 | 并行收尾',
    '',
    '## 注意事项', '', '迁移头注释规则', '',
  ].join('\n'))

  const dry = splitChangelog(root, { force: false })
  assert(dry.dryRun === true && dry.files.length === 1, 'dry-run：识别 1 张卡待迁出')
  assert(!existsSync(join(modulesDir, 'backend.changelog.md')), 'dry-run：不写盘')
  assert(readFileSync(card, 'utf8').includes('ql-20260822-001'), 'dry-run：原卡不变')

  const wet = splitChangelog(root, { force: true })
  assert(wet.dryRun === false && wet.files.length === 1, '--force：执行迁出')
  const sidecar = join(modulesDir, 'backend.changelog.md')
  assert(existsSync(sidecar), 'sidecar 已创建')
  const sc = readFileSync(sidecar, 'utf8')
  assert(sc.includes('ql-20260822-001') && sc.includes('ql-20260822-003'), 'sidecar 含全部历史条目')
  const after = readFileSync(card, 'utf8')
  assert(!after.includes('ql-20260822-001'), '卡内历史条目已移除')
  assert(after.includes('backend.changelog.md'), '卡内留指针行')
  assert(after.includes('## 定位') && after.includes('## 注意事项'), '其余节原样保留')

  // 幂等：再跑一次无待迁出
  const again = splitChangelog(root, { force: true })
  assert(again.files.length === 0, '重复执行 → 无待迁出（幂等）')
}

console.log('── 5. symbol-impact 指纹 + doc bloat 告警（P2a/P2b）──')
{
  const tasksA = '- [ ] task-01: a\n- [ ] task-02: b\n'
  const sk = generateSymbolImpactSkeleton(tasksA)
  assert(sk.includes('tasks.md 内容指纹'), '骨架含指纹行')
  const fp = (sk.match(/指纹（生成时）: ([0-9a-f]{16})/) || [])[1]
  assert(!!fp, `指纹为 16 位 hex（实际 ${fp}）`)
  const skB = generateSymbolImpactSkeleton(tasksA + '- [ ] task-03: c\n')
  const fpB = (skB.match(/指纹（生成时）: ([0-9a-f]{16})/) || [])[1]
  assert(fp && fpB && fp !== fpB, 'tasks.md 变化 → 指纹变化（重入沿用的判定锚）')
  assert(sk.includes('- task-01: <!--TODO-->'), '骨架逐 task 占位原样')

  const root = mkTmp('bloat')
  const modulesDir = join(root, '.sillyspec', 'docs', 'demo', 'modules')
  mkdirSync(modulesDir, { recursive: true })
  writeFileSync(join(modulesDir, 'big.md'), 'x'.repeat(13 * 1024))
  writeFileSync(join(modulesDir, 'big.changelog.md'), 'x'.repeat(15 * 1024)) // sidecar 不计
  mkdirSync(join(root, '.sillyspec', 'knowledge'), { recursive: true })
  writeFileSync(join(root, '.sillyspec', 'knowledge', 'uncategorized.md'), 'x'.repeat(21 * 1024))
  const dim = detectDocBloat(join(root, '.sillyspec'))
  assert(dim.pass === false && dim.severity === 'warning', `超限 → WARNING 级维度（实际 ${dim.severity}）`)
  assert(dim.findings.some(f => f.includes('big.md')), '模块卡超限 finding')
  assert(!dim.findings.some(f => f.includes('big.changelog.md')), 'sidecar 不计入卡上限')
  assert(dim.findings.some(f => f.includes('uncategorized.md')), 'knowledge 超限 finding')
  assert(dim.safe_actions.some(a => a.action.includes('split-changelog')), 'safe_action 指路 split-changelog')

  const clean = mkTmp('clean')
  mkdirSync(join(clean, '.sillyspec'), { recursive: true })
  const dimOk = detectDocBloat(join(clean, '.sillyspec'))
  assert(dimOk.pass === true, '空 spec → pass')
}

console.log(`\n✅ 通过: ${passed}  ❌ 失败: ${failed}`)
for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} }
if (failed > 0) throw new Error(`${failed} test(s) failed`)
