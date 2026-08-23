/**
 * 防回归测试：verify-postcheck test_strategy:module 支持（D-002@v1）
 *
 * 覆盖抽出的纯函数（不依赖真实 execSync/git）：
 * - extractTestStrategy：解析顶层 test_strategy
 * - extractModules：解析 modules 映射块
 * - pickHitModules：git diff 命中的模块子集
 * - aggregateStatus：多模块结果聚合
 *
 * D-005@v2 扩展（task-13 语义回归锁定，2026-08-23 adopt-harness-practices）：
 * - decideVerifyTestAction：skip 真跳过不回退全量；full/module/缺省 brownfield 语义不变
 * - resolveTestStrategy：五输入契约（full/module/skip/未配置/evidence-auto）+
 *   evidence-auto 三路径（行为→module、纯文档/门禁→skip、缺失→降级 module）+
 *   moduleImpactText 注入口可测
 * - runVerifyTestCheck E2E：skip 下必炸命令未执行；evidence-auto 行为类无块回退
 *   full 带推荐注记、纯文档/门禁面真跳过留审计痕迹
 * - outputStep {EVIDENCE_AUTO_RECOMMENDATION} 占位符注入端到端（task-12 注入分支）
 */
import {
  extractTestStrategy,
  extractModules,
  pickHitModules,
  aggregateStatus,
  computeFullFallbackReason,
  decideVerifyTestAction,
  resolveTestStrategy,
  runVerifyTestCheck,
} from '../src/verify-postcheck.js'
import { outputStep } from '../src/run/prompt.js'
import { runCapturing } from './_complete-step-harness.mjs'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

let passed = 0
let failed = 0

function assert(name, cond, detail = '') {
  if (cond) {
    console.log(`✅ PASS: ${name}`)
    passed++
  } else {
    console.error(`❌ FAIL: ${name}${detail ? ' — ' + detail : ''}`)
    failed++
  }
}

function assertEqual(name, actual, expected) {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  assert(name, a === e, `actual=${a} expected=${e}`)
}

// ── extractTestStrategy ──────────────────────────────────────────

assertEqual(
  'extractTestStrategy: module',
  extractTestStrategy('test_strategy: module\n'),
  'module',
)

assertEqual(
  'extractTestStrategy: module 带注释',
  extractTestStrategy('test_strategy: module   # 按模块子集\n'),
  'module',
)

assertEqual(
  'extractTestStrategy: full',
  extractTestStrategy('test_strategy: full\n'),
  'full',
)

assertEqual(
  'extractTestStrategy: 缺省 → null',
  extractTestStrategy('commands:\n  test: npm test\n'),
  null,
)

assertEqual(
  'extractTestStrategy: 空文本 → null',
  extractTestStrategy(null),
  null,
)

assertEqual(
  'extractTestStrategy: 未知值 → null',
  extractTestStrategy('test_strategy: weird\n'),
  null,
)

// ── extractModules ───────────────────────────────────────────────

const MODULES_YAML = `
project:
  type: monorepo

test_strategy: module

modules:
  backend: { path: "backend/", test: "cd backend && uv run pytest" }
  frontend: { path: "frontend/", test: "cd frontend && pnpm test" }
  daemon: { path: "sillyhub-daemon/", test: "cd sillyhub-daemon && pnpm test" }

commands:
  test: echo full
`

assertEqual(
  'extractModules: 标准 inline flow',
  extractModules(MODULES_YAML),
  {
    backend: { path: 'backend/', test: 'cd backend && uv run pytest' },
    frontend: { path: 'frontend/', test: 'cd frontend && pnpm test' },
    daemon: { path: 'sillyhub-daemon/', test: 'cd sillyhub-daemon && pnpm test' },
  },
)

assertEqual(
  'extractModules: 无 modules 块 → null',
  extractModules('commands:\n  test: npm test\n'),
  null,
)

assertEqual(
  'extractModules: 空文本 → null',
  extractModules(null),
  null,
)

// 单引号 path/test 值
const SINGLE_QUOTED = `
modules:
  backend: { path: 'backend/', test: 'cd backend && pytest' }
`
assertEqual(
  'extractModules: 单引号值',
  extractModules(SINGLE_QUOTED),
  { backend: { path: 'backend/', test: 'cd backend && pytest' } },
)

// bare 值（无引号）
const BARE = `
modules:
  api: { path: api/, test: make test-api }
`
assertEqual(
  'extractModules: bare 值',
  extractModules(BARE),
  { api: { path: 'api/', test: 'make test-api' } },
)

// 缺 test 的条目应被丢弃
const INCOMPLETE = `
modules:
  good: { path: "ok/", test: "echo ok" }
  bad: { path: "no-test/" }
`
assertEqual(
  'extractModules: 缺 test 的条目丢弃',
  extractModules(INCOMPLETE),
  { good: { path: 'ok/', test: 'echo ok' } },
)

// modules 块后紧跟其他顶层 key 应正确终止
const FOLLOWED = `
modules:
  a: { path: "a/", test: "ta" }
other_key: value
`
assertEqual(
  'extractModules: 块后顶层 key 终止',
  extractModules(FOLLOWED),
  { a: { path: 'a/', test: 'ta' } },
)

// ── pickHitModules ───────────────────────────────────────────────

const MODULES = {
  backend: { path: 'backend/', test: 'cd backend && pytest' },
  frontend: { path: 'frontend/', test: 'cd frontend && pnpm test' },
  daemon: { path: 'sillyhub-daemon/', test: 'cd sillyhub-daemon && pnpm test' },
}

assertEqual(
  'pickHitModules: 命中 backend + frontend',
  pickHitModules(['backend/src/main.py', 'frontend/app/page.tsx', 'README.md'], MODULES),
  [
    { name: 'backend', path: 'backend/', test: 'cd backend && pytest' },
    { name: 'frontend', path: 'frontend/', test: 'cd frontend && pnpm test' },
  ],
)

assertEqual(
  'pickHitModules: 命中 daemon（中间声明顺序，未被命中模块排除）',
  pickHitModules(['sillyhub-daemon/index.js'], MODULES),
  [
    { name: 'daemon', path: 'sillyhub-daemon/', test: 'cd sillyhub-daemon && pnpm test' },
  ],
)

assertEqual(
  'pickHitModules: 无命中 → []',
  pickHitModules(['docs/readme.md', 'README.md'], MODULES),
  [],
)

assertEqual(
  'pickHitModules: 去重（同模块多文件命中一次）',
  pickHitModules(['backend/a.py', 'backend/b.py', 'backend/c.py'], MODULES),
  [
    { name: 'backend', path: 'backend/', test: 'cd backend && pytest' },
  ],
)

assertEqual(
  'pickHitModules: 空 changedFiles → []',
  pickHitModules([], MODULES),
  [],
)

assertEqual(
  'pickHitModules: Windows 反斜杠路径归一化',
  pickHitModules(['backend\\src\\main.py'], MODULES),
  [
    { name: 'backend', path: 'backend/', test: 'cd backend && pytest' },
  ],
)

assertEqual(
  'pickHitModules: modules 为 null → []',
  pickHitModules(['backend/a.py'], null),
  [],
)

// path 无尾斜杠的模块也能命中（前缀补斜杠）
const NO_SLASH_MODULES = { api: { path: 'packages/api', test: 't' } }
assertEqual(
  'pickHitModules: path 无尾斜杠命中',
  pickHitModules(['packages/api/src/x.js', 'packages/api-utils/y.js'], NO_SLASH_MODULES),
  [{ name: 'api', path: 'packages/api', test: 't' }],
)

// ── aggregateStatus ──────────────────────────────────────────────

assertEqual(
  'aggregateStatus: 全 passed → passed',
  aggregateStatus([{ status: 'passed' }, { status: 'passed' }]),
  'passed',
)

assertEqual(
  'aggregateStatus: 单 passed → passed',
  aggregateStatus([{ status: 'passed' }]),
  'passed',
)

assertEqual(
  'aggregateStatus: 混合 → failed',
  aggregateStatus([{ status: 'passed' }, { status: 'failed' }]),
  'failed',
)

assertEqual(
  'aggregateStatus: 全 failed → failed',
  aggregateStatus([{ status: 'failed' }, { status: 'failed' }]),
  'failed',
)

assertEqual(
  'aggregateStatus: 空 → null',
  aggregateStatus([]),
  null,
)

assertEqual(
  'aggregateStatus: null 输入 → null',
  aggregateStatus(null),
  null,
)

// ── computeFullFallbackReason ───────────────────────────────────
// 全量 fallback 原因判定（3.24 verify 坑1：让 fallback 不再静默）。
// hitCount 语义：-1 = git 不可用；0 = 无命中；>0 = 命中（走子集，不该 fallback）。

assertEqual(
  'computeFullFallbackReason: 显式 full → null（用户有意跑全量，不 hint）',
  computeFullFallbackReason({ strategy: 'full', modulesPresent: false, hitCount: 0 }),
  null,
)

assertEqual(
  'computeFullFallbackReason: 缺省 null → hint（默认全量）',
  computeFullFallbackReason({ strategy: null, modulesPresent: false, hitCount: 0 }),
  'local.yaml 未配置 test_strategy（默认全量 commands.test，未按变更范围收窄）',
)

assertEqual(
  'computeFullFallbackReason: module 但无 modules 块 → hint',
  computeFullFallbackReason({ strategy: 'module', modulesPresent: false, hitCount: 0 }),
  'test_strategy: module 但 local.yaml 未配置有效的 modules: 块（需 inline flow: name: { path, test }），回退全量',
)

assertEqual(
  'computeFullFallbackReason: module 有块但 git 不可用(hitCount=-1) → hint',
  computeFullFallbackReason({ strategy: 'module', modulesPresent: true, hitCount: -1 }),
  'test_strategy: module 但 git 不可用/非 git 仓库，无法判定命中模块，回退全量',
)

assertEqual(
  'computeFullFallbackReason: module 有块但 0 命中 → hint',
  computeFullFallbackReason({ strategy: 'module', modulesPresent: true, hitCount: 0 }),
  'test_strategy: module 但本次 git diff 未命中任何已配置 modules，回退全量',
)

assertEqual(
  'computeFullFallbackReason: module 命中(hitCount>0) → null（走子集，不 fallback）',
  computeFullFallbackReason({ strategy: 'module', modulesPresent: true, hitCount: 2 }),
  null,
)

// ── decideVerifyTestAction（D-005@v2：skip 真跳过 + brownfield 兜底不变）──
// R-07 行为变化锁定：配置 skip 不再回退全量——即使 modules 块存在且命中模块。

assertEqual(
  'decideVerifyTestAction: skip → skip（真跳过，不回退全量）',
  decideVerifyTestAction({ strategy: 'skip', modulesPresent: true, hitCount: 5 }),
  'skip',
)

assertEqual(
  'decideVerifyTestAction: skip 无 modules 块 → 仍 skip（不落 full 兜底）',
  decideVerifyTestAction({ strategy: 'skip', modulesPresent: false, hitCount: 0 }),
  'skip',
)

assertEqual(
  'decideVerifyTestAction: full → full（brownfield 语义不变）',
  decideVerifyTestAction({ strategy: 'full', modulesPresent: false, hitCount: 0 }),
  'full',
)

assertEqual(
  'decideVerifyTestAction: 未配置 null → full（缺省全量兜底不变）',
  decideVerifyTestAction({ strategy: null, modulesPresent: false, hitCount: 0 }),
  'full',
)

assertEqual(
  'decideVerifyTestAction: module 有块命中 → module-subset',
  decideVerifyTestAction({ strategy: 'module', modulesPresent: true, hitCount: 2 }),
  'module-subset',
)

assertEqual(
  'decideVerifyTestAction: module 有块 0 命中 → module-zero-hit-skip',
  decideVerifyTestAction({ strategy: 'module', modulesPresent: true, hitCount: 0 }),
  'module-zero-hit-skip',
)

assertEqual(
  'decideVerifyTestAction: module 无块 → full（brownfield 兜底不变）',
  decideVerifyTestAction({ strategy: 'module', modulesPresent: false, hitCount: 0 }),
  'full',
)

// ── resolveTestStrategy 五输入契约（task-11 契约 / task-13 回归锁定）──
// 非 evidence-auto 四路径（full/module/skip/未配置）原样透传且 recommendation=null。

assertEqual(
  'resolveTestStrategy: full → 透传，recommendation=null',
  resolveTestStrategy({ yamlText: 'test_strategy: full\n' }),
  { strategy: 'full', evidence_auto_recommendation: null },
)

assertEqual(
  'resolveTestStrategy: module → 透传，recommendation=null',
  resolveTestStrategy({ yamlText: 'test_strategy: module\n' }),
  { strategy: 'module', evidence_auto_recommendation: null },
)

assertEqual(
  'resolveTestStrategy: skip → 透传，recommendation=null',
  resolveTestStrategy({ yamlText: 'test_strategy: skip\n' }),
  { strategy: 'skip', evidence_auto_recommendation: null },
)

assertEqual(
  'resolveTestStrategy: 未配置 → null/null（缺省全量语义不变）',
  resolveTestStrategy({ yamlText: 'commands:\n  test: npm test\n' }),
  { strategy: null, evidence_auto_recommendation: null },
)

// evidence-auto 三路径（moduleImpactText 注入口——提供则不读盘，可测）

const EA_YAML = 'commands:\n  test: npm test\ntest_strategy: evidence-auto\n'
const MD_BEHAVIORAL = '## 模块影响矩阵\n\n| 模块 | 变更文件 | 影响类型 |\n| --- | --- | --- |\n| core | `src/run/prompt.js` | 修改 |\n| api | `src/api/routes.js` | 接口变更 |\n'
const MD_DOCS_GATE = '## 模块影响矩阵\n\n| 模块 | 变更文件 | 影响类型 |\n| --- | --- | --- |\n| docs | `docs/guide.md` | 新增 |\n| gate | `src/docs-gate.js` | 修改 |\n'

{
  const r = resolveTestStrategy({ yamlText: EA_YAML, moduleImpactText: MD_BEHAVIORAL })
  assertEqual('resolveTestStrategy: evidence-auto 行为类 → module', r.strategy, 'module')
  assert(!!r.evidence_auto_recommendation, 'resolveTestStrategy: evidence-auto 行为类 → recommendation 非空')
  const rec = r.evidence_auto_recommendation
  assertEqual('resolveTestStrategy: rec.resolved_strategy=module / degraded=false', [rec.resolved_strategy, rec.degraded], ['module', false])
  assert(rec.impact.behavioral.includes('src/run/prompt.js') && rec.impact.behavioral.includes('src/api/routes.js'), 'resolveTestStrategy: rec.impact.behavioral 含两处行为影响')
  assert(rec.checks.some(c => c.kind === 'module-tests'), 'resolveTestStrategy: 推荐组合含 module-tests')
  assert(rec.summary.includes('test_strategy=module 聚焦测试'), 'resolveTestStrategy: summary 含聚焦测试推荐理由')
  assert(rec.summary.includes('否决本推荐并改跑全量'), 'resolveTestStrategy: summary 含否决路径')
}

{
  const r = resolveTestStrategy({ yamlText: EA_YAML, moduleImpactText: MD_DOCS_GATE })
  assertEqual('resolveTestStrategy: evidence-auto 纯文档/门禁面 → skip', r.strategy, 'skip')
  const rec = r.evidence_auto_recommendation
  assertEqual('resolveTestStrategy: rec.resolved_strategy=skip', rec.resolved_strategy, 'skip')
  assert(rec.checks.some(c => c.kind === 'docs-check') && rec.checks.some(c => c.kind === 'gate'), 'resolveTestStrategy: 推荐组合含 docs-check + gate')
  assert(!rec.checks.some(c => c.kind === 'module-tests'), 'resolveTestStrategy: 纯文档/门禁面组合不含测试')
  assert(rec.summary.includes('测试不在推荐组合内'), 'resolveTestStrategy: summary 含「测试不在推荐组合内」说明')
}

{
  const r = resolveTestStrategy({ yamlText: EA_YAML, moduleImpactText: '' })
  assertEqual('resolveTestStrategy: evidence-auto 缺失/不可解析 → 降级 module', r.strategy, 'module')
  const rec = r.evidence_auto_recommendation
  assertEqual('resolveTestStrategy: degraded=true', rec.degraded, true)
  assert(!!rec.degraded_reason && rec.degraded_reason.includes('缺失或不可解析'), 'resolveTestStrategy: degraded_reason 含缺失/不可解析注记')
  assert(rec.summary.includes('降级注记'), 'resolveTestStrategy: summary 含降级注记')
}

{
  const r = resolveTestStrategy({ yamlText: EA_YAML, changeDir: null, moduleImpactText: null })
  assertEqual('resolveTestStrategy: 无 changeDir 无注入 → 降级 module', r.strategy, 'module')
  assert(r.evidence_auto_recommendation.degraded_reason.includes('未提供变更目录'), 'resolveTestStrategy: degraded_reason 指明缺 changeDir')
}

{
  // moduleImpactText 注入口优先：changeDir 指向不存在目录，注入文本仍生效（不落盘读）
  const r = resolveTestStrategy({ yamlText: EA_YAML, changeDir: '/nonexistent/path-xyz', moduleImpactText: MD_BEHAVIORAL })
  assertEqual('resolveTestStrategy: moduleImpactText 注入口优先于 changeDir 读盘', [r.strategy, r.evidence_auto_recommendation.degraded], ['module', false])
}

// ── runVerifyTestCheck E2E（D-005@v2：skip 真跳过 + evidence-auto 三路径）──
// E2E 语义锁定（tmp 目录 + 真实 execSync，不 mock）：skip 下 commands.test 指向必炸命令
// 也必须未执行；evidence-auto 各路径的生效策略与审计痕迹。

const tmpRoots = []
function mkCase(prefix, yamlText, impactMd) {
  const cwd = mkdtempSync(join(tmpdir(), prefix))
  tmpRoots.push(cwd)
  const specBase = join(cwd, '.sillyspec')
  mkdirSync(specBase, { recursive: true })
  writeFileSync(join(specBase, 'local.yaml'), yamlText)
  if (impactMd != null) {
    const changeDir = join(specBase, 'changes', 'c-ea')
    mkdirSync(changeDir, { recursive: true })
    writeFileSync(join(changeDir, 'module-impact.md'), impactMd)
  }
  return { cwd, specBase, changeName: 'c-ea' }
}

console.log('\n--- E2E ① skip：commands.test 指向必炸命令，skip 下未执行（不回退全量）---')
{
  const { cwd, specBase } = mkCase('vpc-skip-', 'commands:\n  test: node -e process.exit(7)\ntest_strategy: skip\n')
  const r = runVerifyTestCheck({ cwd, specBase, changeName: 'c-ea' })
  assertEqual('E2E skip: status=skipped（必炸命令未回退执行）', r.status, 'skipped')
  assertEqual('E2E skip: command=null（未执行）', r.command, null)
  assertEqual('E2E skip: exitCode/outputTail=null（无实测痕迹）', [r.exitCode, r.outputTail], [null, null])
  assertEqual('E2E skip: mode=strategy-skip', r.mode, 'strategy-skip')
  assert(r.reason.includes('test_strategy=skip') && r.reason.includes('不回退全量'), 'E2E skip: reason 显式标注不回退全量（R-07 审计）')
  assert(r.resultPath && existsSync(r.resultPath), 'E2E skip: 审计痕迹落盘 test-result.json')
}

console.log('\n--- E2E ② evidence-auto 行为类 → module；无 modules 块回退 full 且带推荐注记 ---')
{
  const { cwd, specBase, changeName } = mkCase('vpc-ea-mod-', 'commands:\n  test: node -v\ntest_strategy: evidence-auto\n', MD_BEHAVIORAL)
  const r = runVerifyTestCheck({ cwd, specBase, changeName })
  assertEqual('E2E ea-module: 无 modules 块 → 回退 full 实测通过', [r.status, r.mode], ['passed', 'full'])
  assertEqual('E2E ea-module: 执行的是 commands.test 本体', r.command, 'node -v')
  assert(!!r.fallbackReason && r.fallbackReason.includes('evidence-auto 推荐'), 'E2E ea-module: fallbackReason 带推荐来源注记')
}

console.log('\n--- E2E ③ evidence-auto 纯文档/门禁面 → 真跳过（必炸命令未执行）+ 审计痕迹 ---')
{
  const { cwd, specBase, changeName } = mkCase('vpc-ea-skip-', 'commands:\n  test: node -e process.exit(9)\ntest_strategy: evidence-auto\n', MD_DOCS_GATE)
  const r = runVerifyTestCheck({ cwd, specBase, changeName })
  assertEqual('E2E ea-skip: status=skipped（测试不在推荐组合内）', r.status, 'skipped')
  assertEqual('E2E ea-skip: command=null（必炸命令未执行）', r.command, null)
  assert(r.reason.includes('evidence-auto 推荐跳过'), 'E2E ea-skip: reason 标注推荐跳过依据')
  const audit = JSON.parse(readFileSync(r.resultPath, 'utf8'))
  assertEqual('E2E ea-skip: 审计 JSON resolved_strategy=skip', audit.evidence_auto.resolved_strategy, 'skip')
  assertEqual('E2E ea-skip: 审计 JSON strategy=evidence-auto（配置面）', audit.strategy, 'evidence-auto')
}

console.log('\n--- E2E ④ evidence-auto module-impact 缺失 → 降级 module（无块回退 full 带注记）---')
{
  const { cwd, specBase, changeName } = mkCase('vpc-ea-deg-', 'commands:\n  test: node -v\ntest_strategy: evidence-auto\n')
  // E2E 走 changeDir 读盘口：module-impact.md 不存在 → 降级
  const res = resolveTestStrategy({ yamlText: 'test_strategy: evidence-auto\n', changeDir: join(specBase, 'changes', changeName) })
  assertEqual('E2E ea-degraded: changeDir 读盘口缺失 → module + degraded', [res.strategy, res.evidence_auto_recommendation.degraded], ['module', true])
  const r = runVerifyTestCheck({ cwd, specBase, changeName })
  assertEqual('E2E ea-degraded: 回退 full 实测通过', r.status, 'passed')
  assert(!!r.fallbackReason && r.fallbackReason.includes('evidence-auto 推荐'), 'E2E ea-degraded: fallbackReason 带推荐来源注记')
}

// ── {EVIDENCE_AUTO_RECOMMENDATION} 占位符注入端到端（task-12 注入分支 / task-13 锁定）──
// 照 verify-baseline-injection.test.mjs 的 outputStep + runCapturing 范式。

const EA_STEP = { name: '运行测试和质量扫描', prompt: '扫描:\n{EVIDENCE_AUTO_RECOMMENDATION}\n收尾。', requiresWait: false }

console.log('\n--- 占位符 ① evidence-auto → 渲染推荐 summary（否决说明在，无裸占位符）---')
{
  const { cwd, changeName } = mkCase('vpc-inj-ea-', 'commands:\n  test: npm test\ntest_strategy: evidence-auto\n', MD_BEHAVIORAL)
  const r = await runCapturing(() => outputStep('verify', 0, [EA_STEP], cwd, changeName, null, {}, null))
  assert(!r.error, '占位符 ea: outputStep 渲染不报错')
  assert(!r.stdout.includes('{EVIDENCE_AUTO_RECOMMENDATION}'), '占位符 ea: 无裸占位符残留')
  assert(r.stdout.includes('evidence-auto 推荐'), '占位符 ea: 渲染推荐块头')
  assert(r.stdout.includes('test_strategy=module 聚焦测试'), '占位符 ea: 含 module 聚焦测试推荐理由')
  assert(r.stdout.includes('否决本推荐并改跑全量'), '占位符 ea: 含否决路径说明')
}

console.log('\n--- 占位符 ② full → 空串零输出（占位符替换，无推荐块）---')
{
  const { cwd } = mkCase('vpc-inj-full-', 'commands:\n  test: npm test\ntest_strategy: full\n')
  const r = await runCapturing(() => outputStep('verify', 0, [EA_STEP], cwd, 'c-ea', null, {}, null))
  assert(!r.error, '占位符 full: 渲染不报错')
  assert(!r.stdout.includes('{EVIDENCE_AUTO_RECOMMENDATION}'), '占位符 full: 占位符替换为空串（无残留）')
  assert(!r.stdout.includes('evidence-auto 推荐'), '占位符 full: 零推荐输出（full 路径输出不变）')
}

// tmp 清理（E2E/占位符 fixture）
for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} }

// ── 汇总 ─────────────────────────────────────────────────────────

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
console.log(`${'='.repeat(50)}`)

if (failed > 0) {
  console.error('\n💥 verify-postcheck module 子集测试有失败！')
  throw new Error('test failed')
} else {
  console.log('\n✅ 全部通过 — verify-postcheck test_strategy:module 纯函数测试 OK')
}
