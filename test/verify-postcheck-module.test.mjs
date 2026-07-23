/**
 * 防回归测试：verify-postcheck test_strategy:module 支持（D-002@v1）
 *
 * 覆盖抽出的纯函数（不依赖真实 execSync/git）：
 * - extractTestStrategy：解析顶层 test_strategy
 * - extractModules：解析 modules 映射块
 * - pickHitModules：git diff 命中的模块子集
 * - aggregateStatus：多模块结果聚合
 */
import {
  extractTestStrategy,
  extractModules,
  pickHitModules,
  aggregateStatus,
  computeFullFallbackReason,
} from '../src/verify-postcheck.js'

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
