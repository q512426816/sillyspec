/**
 * 坑 module-map-list-leak 回归（2026-10-06-wallclock-entry 轻量道实测发现）：
 * 三个手写 _module-map.yaml 解析器（decision-distill.parseModulePathsSubset /
 * module-impact.parseModuleMapPaths / modules.parseModuleMapSimple）对块式列表的收集
 * 终止条件残缺——paths: 块之后遇未知字段头（tags/aliases/entrypoints/depends_on/…开放集）
 * 不终止收集，后续列表项漏进 paths/core_files。量化（jsYaml ground truth 对账）：8 个项目
 * map 真实声明 500 条带斜杠 paths；修复前解析面共 1375 条泄漏项（含 450 条带斜杠垃圾——
 * 入口注释/路由串/模块描述，早期粗计的「950 实路径」即被这 450 条污染）。散文斜杠词
 * git/DB/JSON 前缀命中 tag 'git' → flow start 触达域冒充真域 server-parser。
 *
 * 锁定语义（开放世界判据，禁止字段名枚举白名单）：任何缩进 4 的字段头行终结上一个
 * list 字段的收集——未来新增字段名自动安全；已知字段（含内联数组）语义不变。
 * 次生锁定：flow start fresh 域路由的 input token 在场过滤（文件系统当裁判），
 * 绿地草案路径提取不受过滤。
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { parseModulePathsSubset } from '../src/decision-distill.js'
import { parseModuleMapPaths } from '../src/module-impact.js'
import { parseModuleMapSimple } from '../src/modules.js'
import { resolveTouchedDomains } from '../src/fr-index.js'
import { extractRoutingInputPaths } from '../src/flow.js'
import { draftModuleMap } from '../src/greenfield-bootstrap.js'

let passed = 0, failed = 0
function assert(cond, msg) {
  if (cond) { passed++; console.log(`  ✅ PASS: ${msg}`) }
  else { failed++; console.log(`  ❌ FAIL: ${msg}`) }
}

// 实测形态 fixture：块式 paths 在前、tags/aliases/entrypoints/depends_on/used_by 在后
//（dashboard 侧 server-parser 原样缩影）＋ 未识别自定义字段 owner_tags（开放世界用例）。
const MAP_YAML = [
  'modules:',
  '  server-parser:',
  '    status: active',
  '    doc: modules/server-parser.md',
  '    paths:',
  '      - "packages/dashboard/server/parser.js"',
  '    tags:',
  '      - parser',
  '      - output',
  '      - git',
  '      - techstack',
  '    aliases:',
  '      - output-parser',
  '    entrypoints:',
  '      - parseProjectOverview',
  '    depends_on: []',
  '    used_by:',
  '      - server-index',
  '    owner_tags:',
  '      - future-field-item',
  '',
  '  core-mod:',
  '    status: active',
  '    paths:',
  '      - src/core/',
  '    core_files:',
  '      - src/core/a.js',
  '    owner_tags:',
  '      - leak-candidate',
  '',
  '  inline-mod:',
  '    paths: [src/inline/x.js, src/inline/y.js]',
  '    tags: [alpha, beta]',
  '',
  // 顶层段（span_risk/blast 形态——末模块之后）：旧行为把 6 缩进项漏进末模块 paths
  'span_risk:',
  '  - migrate',
  'blast:',
  '  - prefixes:',
  '      - src/leak-a.js',
  '    tier: S3',
  '  - prefixes:',
  '      - src/leak-b.js',
  '',
].join('\n')

console.log('\n=== Test 1: parseModulePathsSubset（decision-distill）块式多字段不泄漏 ===')
{
  const parsed = parseModulePathsSubset(MAP_YAML)
  const sp = parsed['server-parser']
  assert(JSON.stringify(sp.paths) === JSON.stringify(['packages/dashboard/server/parser.js']),
    `server-parser.paths 恰只含声明项（实际 ${JSON.stringify(sp.paths)}）`)
  const cm = parsed['core-mod']
  assert(JSON.stringify(cm.paths) === JSON.stringify(['src/core/']), `core-mod.paths 恰只含声明项`)
  assert(JSON.stringify(cm.core_files) === JSON.stringify(['src/core/a.js']),
    `core-mod.core_files 恰只含声明项（实际 ${JSON.stringify(cm.core_files)}）`)
  const im = parsed['inline-mod']
  assert(JSON.stringify(im.paths) === JSON.stringify(['src/inline/x.js', 'src/inline/y.js']),
    '内联数组行为不变')
  assert(!JSON.stringify(parsed).includes('future-field-item') && !JSON.stringify(parsed).includes('leak-candidate'),
    '未识别自定义字段（owner_tags）项不出现在任何收集字段（开放世界性）')
  const dump = JSON.stringify(parsed)
  assert(!dump.includes('src/leak-a.js') && !dump.includes('src/leak-b.js') && !dump.includes('migrate'),
    '顶层段（span_risk/blast）项不漏进末模块（bin 双重归属形态）')
}

console.log('\n=== Test 2: parseModuleMapPaths（module-impact）块式多字段不泄漏 ===')
{
  const map = parseModuleMapPaths(MAP_YAML)
  const sp = map.get('server-parser') || []
  assert(JSON.stringify(sp) === JSON.stringify(['packages/dashboard/server/parser.js']),
    `server-parser paths 恰只含声明项（实际 ${JSON.stringify(sp)}）`)
  const cm = map.get('core-mod') || []
  assert(JSON.stringify(cm) === JSON.stringify(['src/core/']), 'core-mod paths 恰只含声明项')
  const im = map.get('inline-mod') || []
  assert(JSON.stringify(im) === JSON.stringify(['src/inline/x.js', 'src/inline/y.js']),
    `内联 paths 数组可识别（sillyhub-daemon 整图内联写法此前恒漏，实际 ${JSON.stringify(im)}）`)
  const flatVals = [...map.values()].flat()
  assert(!flatVals.includes('git') && !flatVals.includes('future-field-item'),
    'tags 项与自定义字段项不进任何模块 paths')
  assert(!flatVals.includes('migrate') && !flatVals.includes('src/leak-a.js') && !flatVals.includes('src/leak-b.js'),
    '顶层段（span_risk/blast）项不漏进末模块 paths')
}

console.log('\n=== Test 3: parseModuleMapSimple（modules）未知字段头终结收集 ===')
{
  const mods = parseModuleMapSimple(MAP_YAML)
  const sp = mods['server-parser'] || {}
  // 注：本解析器块式项不剥引号是既有行为（与 module-impact 的剥引号口径不一致属另一议题，
  // 不在本修复面）——断言剥引号后比较，聚焦「不泄漏」语义。
  assert(JSON.stringify((sp.paths || []).map(p => p.replace(/^"|"$/g, ''))) === JSON.stringify(['packages/dashboard/server/parser.js']),
    `server-parser.paths 恰只含声明项（实际 ${JSON.stringify(sp.paths)}）`)
  assert(JSON.stringify(sp.tags) === JSON.stringify(['parser', 'output', 'git', 'techstack']),
    '已知字段 tags 语义不变（仍正确解析）')
  assert(JSON.stringify(sp.aliases) === JSON.stringify(['output-parser']), '已知字段 aliases 语义不变')
  const im = mods['inline-mod'] || {}
  assert(JSON.stringify(im.paths) === JSON.stringify(['src/inline/x.js', 'src/inline/y.js']),
    '内联数组行为不变')
  const all = JSON.stringify(mods)
  assert(!all.includes('future-field-item') && !all.includes('leak-candidate'),
    '枚举外字段（owner_tags）项不追加进任何 list 字段（开放世界性）')
  assert(!all.includes('src/leak-a.js') && !all.includes('src/leak-b.js') && !all.includes('migrate'),
    '顶层段（span_risk/blast）项不追加进末模块任何 list 字段')
}

console.log('\n=== Test 4: resolveTouchedDomains 端到端——散文斜杠词不再冒充真域 ===')
{
  // 模块索引来自修复后的解析器（而非手搓对象）——端到端锁「解析→路由」全链
  const moduleIndex = {}
  for (const [id, m] of Object.entries(parseModulePathsSubset(MAP_YAML))) {
    moduleIndex[id] = { paths: m.paths || [], core_files: m.core_files || [] }
  }
  const d1 = resolveTouchedDomains(tmpdir(), moduleIndex, ['git/DB/JSON'], null)
  assert(!d1.includes('server-parser'), `git/DB/JSON 不再命中 server-parser（实际 ${JSON.stringify(d1)}）`)
  const d2 = resolveTouchedDomains(tmpdir(), moduleIndex, ['api/v1/users'], null)
  assert(!d2.includes('server-parser') && !d2.includes('server-index'), 'api/v1/users 不误命中')
  const d3 = resolveTouchedDomains(tmpdir(), moduleIndex, ['packages/dashboard/server/parser.js'], null)
  assert(d3.includes('server-parser'), '真实路径仍正确路由')
}

console.log('\n=== Test 5: extractRoutingInputPaths 在场或图内过滤（文件系统+模块图当裁判） ===')
{
  const cwd = mkdtempSync(join(tmpdir(), 'mmlist-'))
  try {
    mkdirSync(join(cwd, 'src'), { recursive: true })
    writeFileSync(join(cwd, 'src', 'datetime.js'), 'export const x = 1\n')
    // 模块图声明 cli 域（src/cli/ 前缀）——图内不存在文件照常路由（thin-fr-inject-parity ④ 契约）
    const specBase = join(cwd, '.sillyspec')
    mkdirSync(join(specBase, 'docs', 'proj', 'modules'), { recursive: true })
    writeFileSync(join(specBase, 'docs', 'proj', 'modules', '_module-map.yaml'),
      'modules:\n  cli:\n    paths:\n      - src/cli/\n')
    const input = '动机：改 src/datetime.js 与将新建的 src/cli/login2.js，来源（git/DB/JSON）散词\n成功标准：\n- 登录行为保持'
    const routing = await extractRoutingInputPaths(cwd, specBase, input)
    assert(JSON.stringify(routing) === JSON.stringify(['src/datetime.js', 'src/cli/login2.js']),
      `路由 token 只留在场真实路径与图内目标（实际 ${JSON.stringify(routing)}）`)
    const none = await extractRoutingInputPaths(cwd, specBase, '动机：仅散文 git/DB/JSON 无真实路径')
    assert(JSON.stringify(none) === JSON.stringify([]), '全散文 token → 空路由面（走诚实提示不铸伪域）')
    // 目录 token 在场同样参与（模块 paths 常是目录前缀）
    mkdirSync(join(cwd, 'packages', 'api'), { recursive: true })
    const withDir = await extractRoutingInputPaths(cwd, specBase, '动机：动 packages/api 与 src/datetime.js')
    assert(withDir.includes('packages/api') && withDir.includes('src/datetime.js'), '在场目录 token 保留')
  } finally {
    rmSync(cwd, { recursive: true, force: true })
  }
}

console.log('\n=== Test 6: 绿地草案路径提取不受在场过滤影响 ===')
{
  const cwd = mkdtempSync(join(tmpdir(), 'mmgreen-'))
  const specBase = join(cwd, '.sillyspec')
  try {
    // 绿地语料指向尚不存在的目标（packages/api/server.py 等）——草案恰需它们起草（不过滤；
    // 注：目录段须非泛化（src/test/docs…被 groupByModule 视为泛化），绿地 fixture 用 packages/）
    const r = draftModuleMap({ cwd, specBase, paths: ['packages/api/server.py', 'packages/api/client.js'] })
    assert(r.written === true && r.path, `绿地草案照常起草（实际 ${JSON.stringify(r)}）`)
    if (r.path) {
      // groupByModule 按目录段聚合（packages/api/）——语料文件本身不存在正是本用例要点
      const mapText = readFileSync(r.path, 'utf8')
      assert(mapText.includes('packages/api/') && (r.moduleIds || []).includes('api'),
        '草案由尚不存在的路径语料起草（在场过滤未波及绿地草案）')
    }
  } finally {
    rmSync(cwd, { recursive: true, force: true })
  }
}

console.log(`\n结果: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
