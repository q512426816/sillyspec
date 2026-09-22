/**
 * quick --done test+lint 硬门禁测试（P0-2，2026-09-02 跨 agent 工单）
 *
 * 覆盖：
 *   1. env 逃生门 SILLYSPEC_QUICK_TEST_GATE=skip → skip
 *   2. changedFiles 空（brownfield 无 guard）→ skip
 *   3. 纯 doc/配置改动（未触及 src/test）→ skip（规则 8 语义）
 *   4. 触及 src + local.yaml 未配置 commands → pass（skipped 不阻断，兼容无测试项目）
 *   5. 触及 src + test/lint 均 exit 0 → pass（passed + durationMs）
 *   6. 触及 src + test exit 1 → fail（failed 含 test + outputTail 非空 + 阻断 reason）
 *   7. 触及 src + lint exit 1 → fail（failed 含 lint）
 *   8. printQuickTestLintGate 三态打印不抛错，fail 分支输出 BLOCKED 文案
 *
 * 风格：自研 assert（与 machine-interface.test.mjs 同），tmp fixture 不引入测试框架。
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { execFileSync } from 'child_process'

import { runQuickTestLintGate, printQuickTestLintGate, buildTestSurfaceAdvisory } from '../src/run/quick-audit.js'

let failed = 0
let total = 0

function assert(condition, msg) {
  total++
  if (!condition) {
    failed++
    console.log(`  ❌ FAIL: ${msg}`)
  } else {
    console.log(`  ✅ PASS: ${msg}`)
  }
}

const tmpRoots = []
function makeTmpDir(prefix) {
  const dir = mkdtempSync(join(tmpdir(), prefix))
  tmpRoots.push(dir)
  return dir
}

/** 构造 tmp 仓 fixture：.sillyspec/local.yaml（可选 commands 段）+ git 仓 */
function makeGateFixture({ yaml } = {}) {
  const proj = makeTmpDir('qgate-')
  const specBase = join(proj, '.sillyspec')
  mkdirSync(specBase, { recursive: true })
  if (yaml !== undefined) writeFileSync(join(specBase, 'local.yaml'), yaml)
  for (const args of [
    ['init', '-q'],
    ['config', 'user.email', 't@t.local'],
    ['config', 'user.name', 't'],
  ]) {
    execFileSync('git', args, { cwd: proj, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  }
  return { proj, specBase }
}

const SRC_FILES = ['src/index.js']
const DOC_FILES = ['docs/a.md', 'README.md', 'package.json']
// monorepo 子包代码路径（2026-09-19 multi-agent-platform 回带收口实证形态）
const MONOREPO_CODE_FILES = [
  'sillyhub-daemon/src/agent-log/parse-zcode-model-io.ts',
  'frontend/src/lib/agent-log-turns.tsx',
  'backend/app/modules/change/router.py',
]

// ─── 1. env 逃生门 ───
console.log('--- 1. env 逃生门 ---')
{
  const prev = process.env.SILLYSPEC_QUICK_TEST_GATE
  process.env.SILLYSPEC_QUICK_TEST_GATE = 'skip'
  const gate = await runQuickTestLintGate({ cwd: process.cwd(), specBase: '.', changedFiles: SRC_FILES })
  assert(gate.action === 'skip', `env=skip → action=skip（实际 ${gate.action}）`)
  assert(gate.test === null && gate.lint === null, 'env=skip → 不执行任何命令')
  if (prev === undefined) delete process.env.SILLYSPEC_QUICK_TEST_GATE; else process.env.SILLYSPEC_QUICK_TEST_GATE = prev
}

// ─── 2. brownfield 无变更清单 ───
console.log('--- 2. brownfield 无变更清单 ---')
{
  const { proj, specBase } = makeGateFixture()
  const gate = await runQuickTestLintGate({ cwd: proj, specBase, changedFiles: [] })
  assert(gate.action === 'skip', `空清单 → skip（实际 ${gate.action}）`)
  assert(gate.reason.includes('无变更文件清单'), 'reason 说明 brownfield 语义')
}

// ─── 3. 纯 doc/配置改动 ───
console.log('--- 3. 纯 doc/配置改动 ---')
{
  const { proj, specBase } = makeGateFixture()
  const gate = await runQuickTestLintGate({ cwd: proj, specBase, changedFiles: DOC_FILES })
  assert(gate.action === 'skip', `doc-only → skip（实际 ${gate.action}）`)
  assert(gate.reason.includes('src/test'), 'reason 点出规则 8 语义（未触及 src/test）')
  // 段全等防误蹭：src-guide 等长名不是 src 段（doc 仍 skip）
  const tricky = await runQuickTestLintGate({ cwd: proj, specBase, changedFiles: ['docs/src-guide.md', 'notes/testing-notes.md'] })
  assert(tricky.action === 'skip', '长名不误蹭（src-guide/testing-notes 非段全等 → 仍 doc skip）')
}

// ─── 3b. monorepo 子包代码路径不再误判（2026-09-19 实证修复）───
console.log('--- 3b. monorepo 子包代码 → 不再纯 doc skip ---')
{
  // 未配置 commands → 走到 pass（若被误判 doc 会 skip——本用例即旧 bug 形态）
  const { proj, specBase } = makeGateFixture({ yaml: '# 空 local.yaml\n' })
  const gate = await runQuickTestLintGate({ cwd: proj, specBase, changedFiles: MONOREPO_CODE_FILES })
  assert(gate.action === 'pass', `子包代码（<pkg>/src/**、backend/app/**.py）→ pass 不 skip（实际 ${gate.action}）`)
  assert(gate.test.status === 'skipped' && gate.lint.status === 'skipped', '未配置命令降级 skipped（同用例 4 语义）')
}

// ─── 4. 触及 src + 未配置 commands ───
console.log('--- 4. 触及 src + 未配置 commands（降级不阻断）---')
{
  const { proj, specBase } = makeGateFixture({ yaml: '# 空 local.yaml\n' })
  const gate = await runQuickTestLintGate({ cwd: proj, specBase, changedFiles: SRC_FILES })
  assert(gate.action === 'pass', `未配置命令 → pass（实际 ${gate.action}；test=${gate.test?.status} lint=${gate.lint?.status}）`)
  assert(gate.test.status === 'skipped' && gate.lint.status === 'skipped', 'test/lint 均 skipped（不执行不阻断）')
}

// ─── 5. 触及 src + test/lint 全过 ───
console.log('--- 5. 触及 src + test/lint 全过 ---')
{
  const { proj, specBase } = makeGateFixture({
    yaml: 'commands:\n  test: \'node -e "process.exit(0)"\'\n  lint: \'node -e "process.exit(0)"\'\n',
  })
  const gate = await runQuickTestLintGate({ cwd: proj, specBase, changedFiles: SRC_FILES })
  assert(gate.action === 'pass', `全过 → pass（实际 ${gate.action}）`)
  assert(gate.test.status === 'passed' && gate.lint.status === 'passed', 'test/lint 均 passed')
  assert(typeof gate.test.durationMs === 'number', 'test 记录 durationMs')
}

// ─── 6. 触及 src + test 失败 ───
console.log('--- 6. 触及 src + test 失败（阻断语义）---')
{
  const { proj, specBase } = makeGateFixture({
    yaml: 'commands:\n  test: \'node -e "process.exit(1)"\'\n  lint: \'node -e "process.exit(0)"\'\n',
  })
  const gate = await runQuickTestLintGate({ cwd: proj, specBase, changedFiles: SRC_FILES })
  assert(gate.action === 'fail', `test 失败 → fail（实际 ${gate.action}）`)
  assert(gate.failed.includes('test') && !gate.failed.includes('lint'), `failed 精确含 test（实际 ${JSON.stringify(gate.failed)}）`)
  assert(gate.test.status === 'failed' && typeof gate.test.outputTail === 'string', 'test result failed + outputTail 供定位')
}

// ─── 7. 触及 src + lint 失败 ───
console.log('--- 7. 触及 src + lint 失败 ---')
{
  const { proj, specBase } = makeGateFixture({
    yaml: 'commands:\n  test: \'node -e "process.exit(0)"\'\n  lint: \'node -e "process.exit(2)"\'\n',
  })
  const gate = await runQuickTestLintGate({ cwd: proj, specBase, changedFiles: ['src/a.js', 'test/b.test.js'] })
  assert(gate.action === 'fail', `lint 失败 → fail（实际 ${gate.action}）`)
  assert(gate.failed.includes('lint') && !gate.failed.includes('test'), `failed 精确含 lint（实际 ${JSON.stringify(gate.failed)}）`)
  assert(gate.reason.includes('lint'), 'reason 指明失败项')
}

// ─── 8. printQuickTestLintGate 三态打印 ───
console.log('--- 8. printQuickTestLintGate 三态打印 ---')
{
  const logs = []
  const errs = []
  const origLog = console.log, origErr = console.error
  console.log = (...a) => logs.push(a.join(' '))
  console.error = (...a) => errs.push(a.join(' '))

  printQuickTestLintGate({ action: 'skip', reason: 'x', failed: [], test: null, lint: null })
  printQuickTestLintGate({
    action: 'pass', reason: 'r', failed: [],
    test: { status: 'passed', command: 'npm test', durationMs: 1200 },
    lint: { status: 'skipped', command: null, reason: '未配置' },
  })
  printQuickTestLintGate({
    action: 'fail', reason: '实测失败：test', failed: ['test'],
    test: { status: 'failed', command: 'npm test', durationMs: 800, outputTail: 'AssertionError: boom' },
    lint: { status: 'skipped', command: null },
  })

  // 先恢复原 console 再断言（否则 assert 的 PASS 输出也被劫持进收集数组，不可读）
  console.log = origLog
  console.error = origErr

  assert(logs.some(l => l.includes('SKIP')), 'skip 态打印 SKIP')
  assert(logs.some(l => l.includes('PASS')), 'pass 态打印 PASS')
  assert(errs.some(e => e.includes('BLOCKED')), 'fail 态 stderr 打 BLOCKED')
  assert(errs.some(e => e.includes('AssertionError: boom')), 'fail 态输出尾部含失败详情')
}

// ─── 9. 倒推 B 模式兜底：changedFiles 空 + declaredFiles 触及 src → 实测仍跑 ───
console.log('--- 9. 倒推 B 兜底：声明边界触及 src → 实测 ---')
{
  const { proj, specBase } = makeGateFixture({
    yaml: 'commands:\n  test: \'node -e "process.exit(0)"\'\n  lint: \'node -e "process.exit(0)"\'\n',
  })
  const gate = await runQuickTestLintGate({ cwd: proj, specBase, changedFiles: [], declaredFiles: SRC_FILES })
  assert(gate.action === 'pass', `声明边界触及 src → 实测 pass（实际 ${gate.action}）`)
  assert(gate.test.status === 'passed', '兜底口径下 test 真实执行')
}

// ─── 10. 倒推 B 兜底不扩大：declaredFiles 也纯 doc → 仍 skip ───
console.log('--- 10. 倒推 B 兜底不扩大：声明边界纯 doc → skip ---')
{
  const { proj, specBase } = makeGateFixture({
    yaml: 'commands:\n  test: \'node -e "process.exit(0)"\'\n  lint: \'node -e "process.exit(0)"\'\n',
  })
  const gate = await runQuickTestLintGate({ cwd: proj, specBase, changedFiles: [], declaredFiles: DOC_FILES })
  assert(gate.action === 'skip', `声明边界纯 doc → skip（实际 ${gate.action}）`)
  assert(gate.test === null, 'doc 声明边界不触发实测')
}

// ─── 11. 测试最低面 advisory（资产三小件②：src 类交付 ≥3 且测试 0 改动 → 一行警告） ───
console.log('--- 11. buildTestSurfaceAdvisory ---')
{
  // 正例：3 个 src 类文件（monorepo 路径段 + 代码扩展名双通道）+ 0 测试 → 一行警告
  const pos = buildTestSurfaceAdvisory(['src/run/a.js', 'sillyhub-daemon/src/b.ts', 'backend/app/c.py'])
  assert(pos !== null && pos.includes('交付面 3 个 src 类文件') && pos.includes('测试面为空'),
    `11a 空测试面正例出一行警告（实际 ${JSON.stringify(pos)}）`)
  // 负例①：有测试改动 → 零输出
  assert(buildTestSurfaceAdvisory(['src/a.js', 'src/b.js', 'src/c.js', 'test/d.test.mjs']) === null,
    '11b 有测试改动 → null')
  // 负例②：纯 doc → 零输出
  assert(buildTestSurfaceAdvisory(['docs/a.md', 'README.md', 'docs/b.md', 'package.json']) === null,
    '11c 纯 doc/配置 → null')
  // 负例③：少文件（2 个 src 类）→ 零输出
  assert(buildTestSurfaceAdvisory(['src/a.js', 'src/b.js']) === null, '11d <3 个 src 类文件 → null')
  // .sillyspec 前缀剔除：spec 内部产物不算交付面（3 spec + 2 src → 不足 3 → null）
  assert(buildTestSurfaceAdvisory([
    '.sillyspec/changes/x/design.md', '.sillyspec/knowledge/INDEX.md', '.sillyspec/quicklog/QUICKLOG-x.md',
    'src/a.js', 'src/b.js',
  ]) === null, '11e .sillyspec 产物不计入交付面')
  // 测试目录段判定：裸 test/ 段（无 .test. 命名）也算测试文件
  assert(buildTestSurfaceAdvisory(['src/a.js', 'src/b.js', 'src/c.js', 'test/helper.mjs']) === null,
    '11f test/ 目录段（无 .test. 后缀）也算测试改动')
  // 反斜杠归一 + 非数组/空数组 fail-open
  assert(buildTestSurfaceAdvisory(['src\\a.js', 'src\\b.js', 'src\\c.js']) !== null, '11g 反斜杠路径归一')
  assert(buildTestSurfaceAdvisory(null) === null && buildTestSurfaceAdvisory([]) === null, '11h 非数组/空 → null')
}
// 集成：runQuickTestLintGate 内接线（console.warn 一行；负例零输出；doc-only 早退不触发）
console.log('--- 11i. runQuickTestLintGate advisory 接线 ---')
{
  const { proj, specBase } = makeGateFixture({ yaml: '# 空 local.yaml\n' })
  const capture = () => {
    const warns = []
    const orig = console.warn
    console.warn = (...a) => warns.push(a.join(' '))
    return { warns, restore: () => { console.warn = orig } }
  }
  // 正例：3 个 src 类、无测试 → gate 跑起来且出 advisory（warn 不改 action）
  {
    const c = capture()
    try {
      const gate = await runQuickTestLintGate({ cwd: proj, specBase, changedFiles: ['src/a.js', 'src/b.js', 'src/c.js'] })
      assert(gate.action === 'pass', `11i advisory 场景 gate 仍 pass（实际 ${gate.action}）`)
      assert(c.warns.some((w) => w.includes('测试面厚度 advisory') && w.includes('确认无需测试增量')),
        `11j 一行警告在门禁输出（实际 ${JSON.stringify(c.warns)}）`)
    } finally { c.restore() }
  }
  // 负例：有测试文件 → 零 advisory 输出
  {
    const c = capture()
    try {
      const gate = await runQuickTestLintGate({ cwd: proj, specBase, changedFiles: ['src/a.js', 'src/b.js', 'src/c.js', 'test/x.test.mjs'] })
      assert(gate.action === 'pass', '11k 负例 gate 正常')
      assert(!c.warns.some((w) => w.includes('测试面厚度 advisory')), '11l 有测试改动零 advisory 输出')
    } finally { c.restore() }
  }
  // 负例：纯 doc 早退 → 零 advisory 输出
  {
    const c = capture()
    try {
      const gate = await runQuickTestLintGate({ cwd: proj, specBase, changedFiles: DOC_FILES })
      assert(gate.action === 'skip', '11m doc-only 仍 skip')
      assert(!c.warns.some((w) => w.includes('测试面厚度 advisory')), '11n doc-only 早退零 advisory 输出')
    } finally { c.restore() }
  }
}

// ─── 清理 & 汇总 ───
for (const dir of tmpRoots) {
  try { rmSync(dir, { recursive: true, force: true }) } catch {}
}
console.log('\n==================================================')
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
console.log('==================================================')
if (failed > 0) process.exit(1)
