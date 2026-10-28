/**
 * quick-metrics-gate 测试 — 收口开放指标门（2026-10-29-open-metrics-gate，ub-mode 确定性质量门采纳）
 *
 * 覆盖（FR-01/FR-03 单元面）：
 *   1. runVerifyMetricsCheck 三态：未配置/unavailable → skipped（reason 含配置引导）；
 *      配置 exit 0 → passed；配置 exit 非 0 → failed（exitCode 透传）
 *   2. 超时门红：metrics_timeout_sec 帽杀 → failed（reason 含超时）
 *   3. 环境缺件降档：CNF 特征 → skipped 带修复指引（复用 lint 语义）
 *   4. 增量门注入：changeFiles → 子进程环境 SILLYSPEC_CHANGE_FILES（POSIX 路径换行分隔）；未传不注入
 *   5. persistLintResult section 泛化：独立件 kind:'metrics'；并入 test-result.json 的 metrics 节；缺省 'lint' 零变化
 *   6. 引导面三在场：AGENTS 模板规则 4 / renderExample / skipped reason
 *   7. 零依赖护栏：package.json dependencies 不含指标工具（采纳边界——机制开放不绑工具）
 *
 * 风格：自研 assert（与 quick-test-gate.test.mjs 同），tmp fixture 不引入测试框架。
 */
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'fs'
import { join, dirname } from 'path'
import { tmpdir } from 'os'
import { fileURLToPath } from 'url'

import { runVerifyMetricsCheck, persistLintResult } from '../src/verify-postcheck.js'
import { renderExample } from '../src/config-schema.js'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

let failed = 0
let total = 0
function assert(condition, msg) {
  total++
  if (!condition) { failed++; console.log(`  ❌ FAIL: ${msg}`) }
  else console.log(`  ✅ PASS: ${msg}`)
}

const tmpRoots = []
function makeSpecBase(yaml) {
  const proj = mkdtempSync(join(tmpdir(), 'metrics-'))
  tmpRoots.push(proj)
  const specBase = join(proj, '.sillyspec')
  mkdirSync(specBase, { recursive: true })
  if (yaml !== undefined) writeFileSync(join(specBase, 'local.yaml'), yaml)
  return { proj, specBase }
}

// ─── 1. 门三态 ───
console.log('--- 1. runVerifyMetricsCheck 三态 ---')
{
  // 1a. 未配置 → skipped + reason 引导（引导面③）
  {
    const { proj, specBase } = makeSpecBase('commands:\n  lint: \'node -e "process.exit(0)"\'\n')
    const r = runVerifyMetricsCheck({ cwd: proj, specBase })
    assert(r.status === 'skipped', `未配置 → skipped（实际 ${r.status}）`)
    assert(r.command === null && r.exitCode === null, '未配置不执行（command/exitCode 均 null）')
    assert(String(r.reason).includes('未配置 commands.metrics'), 'reason 点明未配置')
    assert(String(r.reason).includes('指标门') && String(r.reason).includes('SILLYSPEC_CHANGE_FILES'), 'reason 自带配置引导（引导面③：定位+增量门提示）')
  }
  // 1b. unavailable → skipped（fail-open 同款）
  {
    const { proj, specBase } = makeSpecBase('commands:\n  metrics: unavailable\n')
    const r = runVerifyMetricsCheck({ cwd: proj, specBase })
    assert(r.status === 'skipped', `unavailable → skipped（实际 ${r.status}）`)
  }
  // 1c. local.yaml 不存在 → skipped
  {
    const { proj, specBase } = makeSpecBase(undefined)
    const r = runVerifyMetricsCheck({ cwd: proj, specBase })
    assert(r.status === 'skipped' && String(r.reason).includes('不存在'), 'local.yaml 缺席 → skipped 留痕')
  }
  // 1d. 配置且通过 → passed
  {
    const { proj, specBase } = makeSpecBase('commands:\n  metrics: \'node -e "process.exit(0)"\'\n')
    const r = runVerifyMetricsCheck({ cwd: proj, specBase })
    assert(r.status === 'passed', `exit 0 → passed（实际 ${r.status}）`)
    assert(r.exitCode === 0 && typeof r.durationMs === 'number', 'passed 记录 exitCode/durationMs')
  }
  // 1e. 配置且失败 → failed + exitCode 透传
  {
    const { proj, specBase } = makeSpecBase('commands:\n  metrics: \'node -e "process.exit(7)"\'\n')
    const r = runVerifyMetricsCheck({ cwd: proj, specBase })
    assert(r.status === 'failed', `exit 7 → failed（实际 ${r.status}）`)
    assert(r.exitCode === 7, `exitCode 透传（实际 ${r.exitCode}）`)
    assert(String(r.reason).includes('7'), 'reason 指明退出码')
  }
}

// ─── 2. 超时门红 ───
console.log('--- 2. 超时门红 ---')
{
  const { proj, specBase } = makeSpecBase('commands:\n  metrics: \'node -e "setTimeout(()=>{},10000)"\'\n  metrics_timeout_sec: 1\n')
  const r = runVerifyMetricsCheck({ cwd: proj, specBase })
  assert(r.status === 'failed', `超 metrics_timeout_sec 帽 → failed（实际 ${r.status}）`)
  assert(String(r.reason).includes('超时'), 'reason 注明超时')
}

// ─── 3. 环境缺件降档（CNF）───
console.log('--- 3. 环境缺件降档 ---')
{
  const { proj, specBase } = makeSpecBase('commands:\n  metrics: sillyspec-no-such-bin-xyz-123 --flag\n')
  const r = runVerifyMetricsCheck({ cwd: proj, specBase })
  assert(r.status === 'skipped', `CNF → skipped 降档（实际 ${r.status}）`)
  assert(String(r.reason).includes('环境缺件'), 'reason 带修复指引')
}

// ─── 4. 增量门注入 SILLYSPEC_CHANGE_FILES ───
console.log('--- 4. 增量门注入 ---')
{
  // 命令含单双引号 → local.yaml 用裸值形态写（extractor 裸分支 [^\n#]+ 全量捕获；单引号包裹会把内嵌 ' 当值尾截断）
  const cmd = 'node -e "const f=process.env.SILLYSPEC_CHANGE_FILES||\'\';process.exit(f===\'src/a.js\\nsrc/b/c.js\'?0:9)"'
  // 4a. changeFiles 注入（Windows 反斜杠归一为 POSIX）
  {
    const { proj, specBase } = makeSpecBase(`commands:\n  metrics: ${cmd}\n`)
    const r = runVerifyMetricsCheck({ cwd: proj, specBase, changeFiles: ['src\\a.js', 'src/b/c.js'] })
    assert(r.status === 'passed', `注入 POSIX 换行分隔清单 → 命令读到并通过（实际 ${r.status}）`)
  }
  // 4b. 未传 changeFiles → 不注入（命令读不到 → 按其自身逻辑 exit 9）
  {
    const { proj, specBase } = makeSpecBase(`commands:\n  metrics: ${cmd}\n`)
    const r = runVerifyMetricsCheck({ cwd: proj, specBase })
    assert(r.status === 'failed' && r.exitCode === 9, `未传清单不注入（实际 ${r.status}/${r.exitCode}）——命令零感知向后兼容`)
  }
}

// ─── 5. persistLintResult section 泛化 ───
console.log('--- 5. persistLintResult section ---')
{
  const mk = () => makeSpecBase(undefined)
  const sample = { status: 'passed', command: 'npx jscpd src', exitCode: 0, durationMs: 3, outputTail: '', reason: null }
  // 5a. 独立件 kind: 'metrics'
  {
    const { specBase } = mk()
    const p = persistLintResult({ specBase, changeName: 'c-metrics', testResultPath: null, lint: sample, section: 'metrics' })
    assert(typeof p === 'string' && existsSync(p), '独立落盘返回路径且文件在场')
    if (p && existsSync(p)) {
      const j = JSON.parse(readFileSync(p, 'utf8'))
      assert(j.kind === 'metrics', `独立件 kind: metrics（实际 ${j.kind}）`)
      assert(j.status === 'passed' && j.command === 'npx jscpd src', '独立件携带命令与状态')
    }
  }
  // 5b. 并入 test-result.json 的 metrics 节（lint 节不串）
  {
    const { specBase } = mk()
    const tp = join(specBase, 'verify-runs-x.json')
    writeFileSync(tp, JSON.stringify({ status: 'passed', kind: 'test' }))
    const p = persistLintResult({ specBase, changeName: 'c-metrics', testResultPath: tp, lint: sample, section: 'metrics' })
    assert(p === tp, '并入返回 test-result 路径')
    const j = JSON.parse(readFileSync(tp, 'utf8'))
    assert(j.metrics && j.metrics.status === 'passed', '并入节 metrics 在场')
    assert(j.lint === undefined, 'lint 节不受串扰（section 隔离）')
    assert(j.status === 'passed', 'test 主体字段不动')
  }
  // 5c. 缺省 section='lint' 零变化（回归钉）
  {
    const { specBase } = mk()
    const p = persistLintResult({ specBase, changeName: 'c-lint', testResultPath: null, lint: sample })
    if (p && existsSync(p)) {
      const j = JSON.parse(readFileSync(p, 'utf8'))
      assert(j.kind === 'lint', `缺省 kind 仍 lint（实际 ${j.kind}）`)
    } else {
      assert(false, '缺省落盘失败')
    }
  }
  // 5d. skipped 不落盘（best-effort 语义不变）
  {
    const { specBase } = mk()
    const p = persistLintResult({ specBase, changeName: 'c', testResultPath: null, lint: { status: 'skipped', command: null, exitCode: null, durationMs: null, outputTail: null, reason: 'x' }, section: 'metrics' })
    assert(p === null, 'skipped 态不落盘')
  }
}

// ─── 6. 引导面三在场（FR-03）───
console.log('--- 6. 引导面三在场 ---')
{
  const agentsTpl = readFileSync(join(repoRoot, 'templates', 'agents-instruction.md'), 'utf8')
  assert(agentsTpl.includes('commands.metrics'), '引导面② AGENTS 模板规则 4 并列 metrics 语义句')
  assert(agentsTpl.includes('SILLYSPEC_CHANGE_FILES'), '引导面② AGENTS 模板含增量门注入提示')
  const ex = renderExample()
  assert(ex.includes('metrics:') && ex.includes('metrics_timeout_sec:'), '引导面① renderExample 含两键行')
  assert(ex.includes('SILLYSPEC_CHANGE_FILES'), '引导面① example 注释含增量门提示')
}

// ─── 7. 零依赖护栏 ───
console.log('--- 7. 零依赖护栏 ---')
{
  const pkg = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8'))
  const deps = Object.keys(pkg.dependencies || {})
  const forbidden = deps.filter((d) => /jscpd|crapper|dryer|mutator|stryker|mutation/i.test(d))
  assert(forbidden.length === 0, `dependencies 不含指标工具（实际命中 ${JSON.stringify(forbidden)}）——机制开放不绑工具`)
}

// ─── 8. 门级集成（runQuickTestLintGate 挂载，task-03）───
console.log('--- 8. runQuickTestLintGate 挂载 ---')
{
  const { runQuickTestLintGate, printQuickTestLintGate } = await import('../src/run/quick-audit.js')
  const execFileSync = (await import('child_process')).execFileSync
  delete process.env.NODE_TEST_CONTEXT // 嵌套 runner 防污染（同 quick-test-gate.test.mjs）
  function makeGateFixture({ yaml } = {}) {
    const proj = mkdtempSync(join(tmpdir(), 'mgate-'))
    tmpRoots.push(proj)
    const specBase = join(proj, '.sillyspec')
    mkdirSync(specBase, { recursive: true })
    if (yaml !== undefined) writeFileSync(join(specBase, 'local.yaml'), yaml)
    for (const args of [['init', '-q'], ['config', 'user.email', 't@t.local'], ['config', 'user.name', 't']]) {
      execFileSync('git', args, { cwd: proj, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    }
    return { proj, specBase }
  }
  const SRC = ['src/index.js']
  const DOC = ['docs/a.md', 'README.md']

  // 8a. 纯 doc 早退 → metrics 不执行（null 字段）
  {
    const { proj, specBase } = makeGateFixture({ yaml: 'commands:\n  metrics: \'node -e "process.exit(1)"\'\n' })
    const gate = await runQuickTestLintGate({ cwd: proj, specBase, changedFiles: DOC })
    assert(gate.action === 'skip' && gate.metrics === null, `纯 doc 早退 → metrics=null 不执行（实际 ${gate.action}/${gate.metrics}）`)
  }
  // 8b. 未配置 → gate pass + metrics skipped（reason 含引导）
  {
    const { proj, specBase } = makeGateFixture({ yaml: '# 空 local.yaml\n' })
    const gate = await runQuickTestLintGate({ cwd: proj, specBase, changedFiles: SRC })
    assert(gate.action === 'pass', `未配置 → pass（实际 ${gate.action}）`)
    assert(gate.metrics && gate.metrics.status === 'skipped', 'gate.metrics skipped 留痕')
    assert(String(gate.metrics.reason).includes('指标门'), 'gate.metrics reason 含引导句')
  }
  // 8c. 配置通过 → pass + metrics passed + 证据落盘（kind: metrics 或并入节）
  {
    const { proj, specBase } = makeGateFixture({
      yaml: 'commands:\n  test: \'node -e "process.exit(0)"\'\n  lint: \'node -e "process.exit(0)"\'\n  metrics: \'node -e "process.exit(0)"\'\n',
    })
    const gate = await runQuickTestLintGate({ cwd: proj, specBase, changedFiles: SRC })
    assert(gate.action === 'pass', `配置通过 → pass（实际 ${gate.action}）`)
    assert(gate.metrics.status === 'passed', 'gate.metrics passed')
    const rp = gate.metrics.resultPath
    if (typeof rp === 'string' && existsSync(rp)) {
      const j = JSON.parse(readFileSync(rp, 'utf8'))
      assert(j.kind === 'metrics' || (j.metrics && j.metrics.status === 'passed'), '证据件含 metrics 结果（独立 kind 或并入节）')
    } else {
      assert(false, `metrics 证据落盘缺失（resultPath=${rp}）`)
    }
  }
  // 8d. 配置失败 → fail 阻断 + failed 精确含 metrics
  {
    const { proj, specBase } = makeGateFixture({
      yaml: 'commands:\n  test: \'node -e "process.exit(0)"\'\n  lint: \'node -e "process.exit(0)"\'\n  metrics: \'node -e "process.exit(5)"\'\n',
    })
    const gate = await runQuickTestLintGate({ cwd: proj, specBase, changedFiles: SRC })
    assert(gate.action === 'fail', `配置失败 → fail（实际 ${gate.action}）`)
    assert(gate.failed.includes('metrics') && !gate.failed.includes('test') && !gate.failed.includes('lint'), `failed 精确含 metrics（实际 ${JSON.stringify(gate.failed)}）`)
    // 汇总打印含 metrics 行
    const logs = [], errs = []
    const origLog = console.log, origErr = console.error
    console.log = (...a) => logs.push(a.join(' '))
    console.error = (...a) => errs.push(a.join(' '))
    printQuickTestLintGate(gate)
    console.log = origLog; console.error = origErr
    assert(logs.some((l) => l.includes('metrics:') && l.includes('failed')), 'printQuickTestLintGate 输出 metrics 失败行')
    assert(errs.some((e) => e.includes('metrics')), 'BLOCKED 输出尾部含 metrics 输出')
  }
}

// ─── 9. 测试厚度 advisory 附空实现判据（FR-02，task-04）───
console.log('--- 9. buildTestSurfaceAdvisory 附判据 ---')
{
  const { buildTestSurfaceAdvisory } = await import('../src/run/quick-audit.js')
  // 9a. 命中（≥3 src 文件 0 测试改动）→ 附空实现判据句
  const hit = buildTestSurfaceAdvisory(['src/a.js', 'src/b.js', 'src/c.js'])
  assert(typeof hit === 'string', '命中返回文案')
  assert(hit.includes('空实现判据') && hit.includes('摆设'), '命中文案附空实现判据句')
  // 9b. 负例：有测试改动 → null（行为不变）
  assert(buildTestSurfaceAdvisory(['src/a.js', 'src/b.js', 'src/c.js', 'test/a.test.js']) === null, '有测试改动 → null 不变')
  // 9c. 负例：纯 doc → null
  assert(buildTestSurfaceAdvisory(['docs/a.md', 'README.md', 'notes/b.md']) === null, '纯 doc → null 不变')
}

console.log('\n==================================================')
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
console.log('==================================================')
for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} }
if (failed > 0) process.exit(1)
