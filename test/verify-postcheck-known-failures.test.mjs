/**
 * 防回归测试：known_failures 豁免（Fix 2）+ 0 命中人工出口（Fix 3）
 * 坑 verify-worktree-mode-test-reconciliation-fallback-full 修复方向 2/3。
 *
 * 覆盖纯函数（不依赖真实 execSync）：
 * - extractKnownFailures：解析 known_failures 声明
 * - partitionFailures：失败行筛分（排除 summary 行）+ 已豁免/未豁免
 * - judgeWithKnownFailures：fail-safe 判定
 * - decideVerifyTestAction：module 0 命中 → skip
 */
import {
  extractKnownFailures,
  partitionFailures,
  judgeWithKnownFailures,
  decideVerifyTestAction,
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

// ── extractKnownFailures ─────────────────────────────────────────

assertEqual(
  'extractKnownFailures: 块式',
  extractKnownFailures('known_failures:\n  - "tests/test_ppm.py::test_legacy"\n  - app/modules/plan/test_old\n'),
  ['tests/test_ppm.py::test_legacy', 'app/modules/plan/test_old'],
)
assertEqual(
  'extractKnownFailures: 流式',
  extractKnownFailures('known_failures: [foo, "bar baz"]\n'),
  ['foo', 'bar baz'],
)
assertEqual('extractKnownFailures: 无声明 → []', extractKnownFailures('commands:\n  test: npm test\n'), [])
assertEqual('extractKnownFailures: null → []', extractKnownFailures(null), [])
assertEqual(
  'extractKnownFailures: 行内注释剥离',
  extractKnownFailures('known_failures:\n  - foo  # 预存\n  - bar\n'),
  ['foo', 'bar'],
)
// 坑 verify-known-failures-comment-line-truncation（2026-08-28 连续踩两次）：
// 块内注释行/空行打断连续列表项捕获链 → 注释后的项静默丢失 → 豁免清单残缺假红
assertEqual(
  'extractKnownFailures: 块内注释行不截断（坑：注释后项丢失）',
  extractKnownFailures('known_failures:\n  - "tests/test_ppm.py::test_legacy"\n  # 2026-08-27 追加：plan 旧债\n  - app/modules/plan/test_old\n'),
  ['tests/test_ppm.py::test_legacy', 'app/modules/plan/test_old'],
)
assertEqual(
  'extractKnownFailures: 块内空行不截断',
  extractKnownFailures('known_failures:\n  - foo\n\n  - bar\n'),
  ['foo', 'bar'],
)
assertEqual(
  'extractKnownFailures: 首项前的注释行不失效',
  extractKnownFailures('known_failures:\n  # 逐条注明豁免理由\n  - foo\n'),
  ['foo'],
)
assertEqual(
  'extractKnownFailures: 注释行在列表尾不吞后续键',
  extractKnownFailures('known_failures:\n  - foo\n  # 尾注释\ncommands:\n  test: npm test\n'),
  ['foo'],
)
assertEqual(
  'extractKnownFailures: 引号值含 # 原样保留',
  extractKnownFailures('known_failures:\n  - "tests/a.py::test_hash#1"\n'),
  ['tests/a.py::test_hash#1'],
)
assertEqual(
  'extractKnownFailures: 引号值 + 行尾注释',
  extractKnownFailures('known_failures:\n  - "tests/a.py::t1"  # 预存\n'),
  ['tests/a.py::t1'],
)

// ── partitionFailures（关键：summary 行不计入失败行）──────────────

const PYTEST_OUT = `============================= test session starts ==============================
collected 5 items

tests/test_ppm.py::test_legacy FAILED                                [ 20%]
tests/test_plan.py::test_old FAILED                                  [ 40%]
tests/test_workspace.py::test_new PASSED                             [ 60%]

=================================== FAILURES ===================================
=========================== short test summary info ============================
FAILED tests/test_ppm.py::test_legacy - assert false
FAILED tests/test_plan.py::test_old - assert false
========================= 2 failed, 1 passed in 0.05s =========================
`
{
  const r = partitionFailures(PYTEST_OUT, ['test_ppm', 'test_plan'])
  assertEqual(
    'partitionFailures: pytest 失败行=4（2 inline + 2 summary-info），summary 计数行排除',
    r.failureLines.length,
    4,
  )
  assertEqual('partitionFailures: 全豁免 → remaining=0', r.remaining, [])
  assertEqual('partitionFailures: exempted=4', r.exempted.length, 4)
}
{
  // 只豁免 ppm → plan 的 2 行 remaining
  const r = partitionFailures(PYTEST_OUT, ['test_ppm'])
  assertEqual('partitionFailures: 部分豁免 remaining=2（plan 相关）', r.remaining.length, 2)
}
{
  // 大小写不敏感
  const r = partitionFailures('FAILED Test_PPM_Thing\n', ['test_ppm_thing'])
  assertEqual('partitionFailures: 大小写不敏感匹配', r.exempted.length, 1)
}
{
  // jest 风格：FAIL 文件 + ✕ 用例；"Tests: N failed" summary 排除
  const jest = `FAIL src/app.test.js
  ✕ should work (5 ms)
  ✓ should pass (3 ms)

Tests: 1 failed, 1 passed
`
  const r = partitionFailures(jest, ['app.test.js', 'should work'])
  assertEqual('partitionFailures: jest 失败行=2（FAIL + ✕），summary 排除', r.failureLines.length, 2)
  assertEqual('partitionFailures: jest 全豁免', r.remaining, [])
}
{
  // 坑 verify-known-failures-pass-line-false-positive：vitest 通过行用例名含
  // failed/error/exception 字样（如「超时后 syncStatus=failed」）不得判为失败行
  const vitest = ` ✓ src/lib/__tests__/sync.test.ts > 同步 5min 上限：超时后 syncStatus=failed (12 ms)
 ✓ src/lib/__tests__/queue.test.ts > 服务端 failed 排队条目 (8 ms)
 ✓ src/lib/__tests__/err.test.ts > handles exception gracefully (5 ms)
 × src/lib/__tests__/broken.test.ts > 真实失败用例 (30 ms)
 ❯ src/lib/__tests__/broken.test.ts (2 tests | 1 failed) 456ms

 Test Files  1 failed (1) | 2 passed (2)
      Tests  1 failed | 5 passed (6)
`
  const r = partitionFailures(vitest, ['broken.test.ts'])
  assertEqual(
    'partitionFailures: vitest 通过行（✓+用例名含 failed/error 字样）不计入失败行',
    r.failureLines.length,
    2, // × 用例行 + ❯ 文件摘要行（可按文件名豁免）
  )
  assertEqual('partitionFailures: 按文件名豁免后 remaining=0', r.remaining, [])
  assert('partitionFailures: ×(U+00D7) 失败行被识别', r.failureLines.some(l => l.includes('真实失败用例')),
    JSON.stringify(r.failureLines))
}
{
  // ANSI 色码包裹的通过标记同样剔除（TTY 捕获形态）
  const ansi = '\u001b[32m ✓ \u001b[0msrc/lib/x.test.ts > syncStatus=failed 断言 (10 ms)\n'
  const r = partitionFailures(ansi, [])
  assertEqual('partitionFailures: ANSI 色码内的 ✓ 通过行不计入', r.failureLines, [])
}
{
  // vitest 控制台捕获噪声：stderr 横幅（用例名含 failed 字样）+ jsdom Not implemented 警告
  const noise = `stderr | src/components/card.test.tsx > 卡片操作 > 同步 5min 上限：超时后 syncStatus=failed + syncError 非空
Warning: An update to Card inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):
Error: Not implemented: window.getComputedStyle(elt, pseudoElt)
 × src/components/broken.test.tsx > 真实失败 (30 ms)
 ELIFECYCLE  Test failed. See above for more details.
`
  const r = partitionFailures(noise, ['broken.test.tsx'])
  assertEqual(
    'partitionFailures: stderr 捕获横幅/not implemented 噪声/ELIFECYCLE 退出横幅不计入，× 行保留',
    r.failureLines,
    [' × src/components/broken.test.tsx > 真实失败 (30 ms)'],
  )
}
assertEqual('partitionFailures: 空输出', partitionFailures('', ['x']), { failureLines: [], exempted: [], remaining: [] })

// ── judgeWithKnownFailures（fail-safe）───────────────────────────

assertEqual(
  'judge: exit 0 → passed（无需豁免）',
  judgeWithKnownFailures(0, PYTEST_OUT, null, ['test_ppm']),
  { status: 'passed', reason: null, exemptedCount: 0 },
)
{
  const j = judgeWithKnownFailures(1, PYTEST_OUT, '退出码 1', [])
  assert('judge: exit≠0 无 known_failures → failed', j.status === 'failed', JSON.stringify(j))
  assert('judge: exit≠0 无 known_failures exemptedCount=0', j.exemptedCount === 0)
}
{
  // 全豁免 → passed（披露）
  const j = judgeWithKnownFailures(1, PYTEST_OUT, '退出码 1', ['test_ppm', 'test_plan'])
  assert('judge: exit≠0 全豁免 → passed', j.status === 'passed', JSON.stringify(j))
  assert('judge: 全豁免 exemptedCount>0', j.exemptedCount > 0)
  assert('judge: 全豁免 reason 含「请人工复核」', (j.reason || '').includes('请人工复核'))
}
{
  // 部分豁免 → failed
  const j = judgeWithKnownFailures(1, PYTEST_OUT, '退出码 1', ['test_ppm'])
  assert('judge: 部分豁免 → failed', j.status === 'failed', JSON.stringify(j))
  assert('judge: 部分豁免 reason 含未命中提示', (j.reason || '').includes('未命中'))
}
{
  // fail-safe：exit≠0 但检测不到失败行（无标记）→ 即使有 known_failures 也 failed
  const j = judgeWithKnownFailures(1, 'build started\ncompiling...\ndone with warnings\n', '退出码 1', ['anything'])
  assert('judge: fail-safe 检测不到失败行 → failed', j.status === 'failed', JSON.stringify(j))
  assert('judge: fail-safe reason 含保守提示', (j.reason || '').includes('保守判 fail'))
}

// ── decideVerifyTestAction（Fix 3：0 命中 skip）─────────────────

assertEqual('decide: module + 命中 → subset', decideVerifyTestAction({ strategy: 'module', modulesPresent: true, hitCount: 2 }), 'module-subset')
assertEqual('decide: module + 0 命中 → skip', decideVerifyTestAction({ strategy: 'module', modulesPresent: true, hitCount: 0 }), 'module-zero-hit-skip')
assertEqual('decide: module + git 不可用(hitCount=-1) → full', decideVerifyTestAction({ strategy: 'module', modulesPresent: true, hitCount: -1 }), 'full')
assertEqual('decide: module 但无 modules 块 → full', decideVerifyTestAction({ strategy: 'module', modulesPresent: false, hitCount: 0 }), 'full')
assertEqual('decide: 显式 full → full', decideVerifyTestAction({ strategy: 'full', modulesPresent: false, hitCount: 0 }), 'full')
assertEqual('decide: 缺省 null → full', decideVerifyTestAction({ strategy: null, modulesPresent: false, hitCount: 0 }), 'full')

// ── 汇总 ─────────────────────────────────────────────────────────

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
console.log(`${'='.repeat(50)}`)

if (failed > 0) {
  console.error('\n💥 known_failures / 0命中skip 测试有失败！')
  throw new Error('test failed')
} else {
  console.log('\n✅ 全部通过 — known_failures 豁免 + 0 命中 skip OK')
}
