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
  assert(agentsTpl.includes('metrics_routes'), '引导面② AGENTS 模板提及路由门形态（多语言/monorepo）')
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

// ─── 10. 路由门单元（metrics_routes，2026-10-29-metrics-routes task-01）───
console.log('--- 10. runVerifyMetricsRoutesCheck 路由 ---')
{
  const { runVerifyMetricsRoutesCheck, extractMetricsRoutes } = await import('../src/verify-postcheck.js')

  // 10a. 命中执行：仅命中 gate 跑 + 命中子集注入 + 未命中 gate 不跑
  {
    const { proj, specBase } = makeSpecBase([
      'metrics_routes:',
      '  web:',
      '    paths: ["src/web/", "packages/web/"]',
      '    command: \'node -e "process.exit(0)"\'',
      '  jvm:',
      '    paths: ["backend/"]',
      '    command: \'node -e "process.exit(3)"\'',
    ].join('\n') + '\n')
    const r = runVerifyMetricsRoutesCheck({ cwd: proj, specBase, changeFiles: ['src/web/a.js'] })
    assert(r.kind === 'routes', `kind: routes（实际 ${r.kind}）`)
    assert(r.status === 'passed', `仅 web 命中且过 → 整体 passed（实际 ${r.status}）`)
    assert(r.gates.length === 1 && r.gates[0].name === 'web', `只有 web gate 执行（实际 ${JSON.stringify(r.gates.map(g => g.name))}）——jvm 未命中不跑（exit 3 不触发）`)
    assert(Array.isArray(r.gates[0].matchedFiles) && r.gates[0].matchedFiles[0] === 'src/web/a.js', 'gate 记录命中子集')
  }
  // 10b. 段全等前缀：frontend/ 不误蹭 frontend-v2/；深路径子目录命中
  {
    const { proj, specBase } = makeSpecBase([
      'metrics_routes:',
      '  web:',
      '    paths: ["frontend/"]',
      '    command: \'node -e "process.exit(0)"\'',
    ].join('\n') + '\n')
    const noHit = runVerifyMetricsRoutesCheck({ cwd: proj, specBase, changeFiles: ['frontend-v2/a.js', 'other/b.js'] })
    assert(noHit.status === 'skipped' && String(noHit.reason).includes('零命中'), `frontend-v2 不被 frontend/ 误蹭 → 零命中 skipped（实际 ${noHit.status}）`)
    const deep = runVerifyMetricsRoutesCheck({ cwd: proj, specBase, changeFiles: ['frontend/a/b/c.js'] })
    assert(deep.status === 'passed' && deep.gates.length === 1, '深路径子目录命中')
  }
  // 10c. POSIX 归一：Windows 反斜杠变更文件命中
  {
    const { proj, specBase } = makeSpecBase([
      'metrics_routes:',
      '  web:',
      '    paths: ["src/web/"]',
      '    command: \'node -e "process.exit(0)"\'',
    ].join('\n') + '\n')
    const r = runVerifyMetricsRoutesCheck({ cwd: proj, specBase, changeFiles: ['src\\web\\a.js'] })
    assert(r.status === 'passed' && r.gates.length === 1, `反斜杠变更文件归一后命中（实际 ${r.status}）`)
  }
  // 10d. 部分失败：任一 gate 非零 → 整体 failed + gates 逐 gate 形状 + 输出尾部
  {
    const { proj, specBase } = makeSpecBase([
      'metrics_routes:',
      '  ok:',
      '    paths: ["src/ok/"]',
      '    command: \'node -e "process.exit(0)"\'',
      '  bad:',
      '    paths: ["src/bad/"]',
      '    command: \'node -e "process.exit(4)"\'',
    ].join('\n') + '\n')
    const r = runVerifyMetricsRoutesCheck({ cwd: proj, specBase, changeFiles: ['src/ok/a.js', 'src/bad/b.js'] })
    assert(r.status === 'failed', `部分失败 → 整体 failed（实际 ${r.status}）`)
    assert(r.reason.includes('bad') && String(r.outputTail).includes('gate「bad」'), '聚合 reason/outputTail 指名失败 gate')
    const badGate = r.gates.find((g) => g.name === 'bad')
    assert(badGate && badGate.status === 'failed' && badGate.exitCode === 4, 'gates 数组逐 gate 带 status/exitCode')
  }
  // 10e. 零命中跳过 / 未配置零回归
  {
    const { proj, specBase } = makeSpecBase('commands:\n  lint: x\n')
    const none = runVerifyMetricsRoutesCheck({ cwd: proj, specBase, changeFiles: ['src/a.js'] })
    assert(none.status === 'skipped' && String(none.reason).includes('未配置 metrics_routes'), '未配置段 → skipped 留痕（含路由引导）')
    assert(extractMetricsRoutes('commands:\n  lint: x\n') === null, 'extractor 无段 → null')
  }
  // 10f. per-gate 超时：gate timeout_sec 帽杀 → 该 gate failed 并入整体
  {
    const { proj, specBase } = makeSpecBase([
      'metrics_routes:',
      '  slow:',
      '    paths: ["src/"]',
      '    command: \'node -e "setTimeout(()=>{},10000)"\'',
      '    timeout_sec: 1',
    ].join('\n') + '\n')
    const r = runVerifyMetricsRoutesCheck({ cwd: proj, specBase, changeFiles: ['src/a.js'] })
    assert(r.status === 'failed', `per-gate 超时 → failed（实际 ${r.status}）`)
    assert(String(r.gates[0].reason).includes('超时') || String(r.outputTail || '').includes('超时'), `gate 级 reason/输出尾部注明超时（gate reason=${r.gates[0].reason}）`)
  }
  // 10g. gate CNF 降档：单 CNF 不掩盖真 failed；全 CNF → 整体 skipped
  {
    const { proj, specBase } = makeSpecBase([
      'metrics_routes:',
      '  missing:',
      '    paths: ["src/a/"]',
      '    command: sillyspec-no-such-gate-bin-9 --flag',
      '  real:',
      '    paths: ["src/b/"]',
      '    command: \'node -e "process.exit(2)"\'',
    ].join('\n') + '\n')
    const mixed = runVerifyMetricsRoutesCheck({ cwd: proj, specBase, changeFiles: ['src/a/x.js', 'src/b/y.js'] })
    assert(mixed.status === 'failed', `CNF gate 不掩盖真 failed（实际 ${mixed.status}）`)
    const missingGate = mixed.gates.find((g) => g.name === 'missing')
    assert(missingGate && missingGate.status === 'skipped' && String(missingGate.reason).includes('环境缺件'), 'CNF gate 降档 skipped 带指引')
    const { proj: p2, specBase: s2 } = makeSpecBase([
      'metrics_routes:',
      '  missing:',
      '    paths: ["src/"]',
      '    command: sillyspec-no-such-gate-bin-9 --flag',
    ].join('\n') + '\n')
    const allCnf = runVerifyMetricsRoutesCheck({ cwd: p2, specBase: s2, changeFiles: ['src/a.js'] })
    assert(allCnf.status === 'skipped', `全 CNF → 整体 skipped（实际 ${allCnf.status}）`)
  }
  // 10h. inline flow 形态解析
  {
    const routes = extractMetricsRoutes('metrics_routes:\n  web: { paths: "frontend/, packages/web/", command: "make web-check", timeout_sec: 90 }\n')
    assert(routes && routes.web && routes.web.paths.length === 2 && routes.web.command === 'make web-check' && routes.web.timeoutSec === 90, `inline flow 形态解析（实际 ${JSON.stringify(routes)}）`)
  }
}

// ─── 11. 路由门集成（runQuickTestLintGate 共存与归并，task-02）───
console.log('--- 11. 路由门与单命令共存 ---')
{
  const { runQuickTestLintGate, printQuickTestLintGate } = await import('../src/run/quick-audit.js')
  const execFileSync = (await import('child_process')).execFileSync
  function makeGateFixture2({ yaml } = {}) {
    const proj = mkdtempSync(join(tmpdir(), 'rgate-'))
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

  // 11a. 单命令过 + 路由 gate 红 → fail，failed 归并 'metrics' 一次，双证据在场
  {
    const yaml = [
      'commands:',
      '  test: \'node -e "process.exit(0)"\'',
      '  lint: \'node -e "process.exit(0)"\'',
      '  metrics: \'node -e "process.exit(0)"\'',
      'metrics_routes:',
      '  web:',
      '    paths: ["src/"]',
      '    command: \'node -e "process.exit(4)"\'',
    ].join('\n') + '\n'
    const { proj, specBase } = makeGateFixture2({ yaml })
    const gate = await runQuickTestLintGate({ cwd: proj, specBase, changedFiles: SRC })
    assert(gate.action === 'fail', `路由 gate 红 → fail（实际 ${gate.action}）`)
    assert(gate.failed.filter((k) => k === 'metrics').length === 1, `failed 归并 'metrics' 恰一次（实际 ${JSON.stringify(gate.failed)}）`)
    assert(gate.metrics && gate.metrics.status === 'passed', '单命令门照常独立判定（passed）')
    assert(gate.metricsRoutes && gate.metricsRoutes.status === 'failed', '路由门 failed 挂 metricsRoutes 字段')
    const rp = gate.metricsRoutes.resultPath
    if (typeof rp === 'string' && existsSync(rp)) {
      const j = JSON.parse(readFileSync(rp, 'utf8'))
      assert(j.kind === 'routes' || (j.routes && j.routes.kind === 'routes'), '路由证据 kind: routes')
      const gatesArr = j.gates || (j.routes && j.routes.gates)
      assert(Array.isArray(gatesArr) && gatesArr.some((g) => g.name === 'web' && g.status === 'failed'), '路由证据 gates 数组带 gate 名与状态')
    } else {
      assert(false, `路由证据落盘缺失（resultPath=${rp}）`)
    }
    // 打印面：metrics-routes 行带 gates 注记；BLOCKED 尾部取路由输出（归并键回退）
    const logs = [], errs = []
    const origLog = console.log, origErr = console.error
    console.log = (...a) => logs.push(a.join(' '))
    console.error = (...a) => errs.push(a.join(' '))
    printQuickTestLintGate(gate)
    console.log = origLog; console.error = origErr
    assert(logs.some((l) => l.includes('metrics-routes') && l.includes('web=failed')), '打印含路由行与 gates 注记')
    assert(errs.some((e) => e.includes('gate「web」')), 'BLOCKED 尾部经归并键回退呈现路由 gate 输出')
  }
  // 11b. 双绿 → pass，reason 提及路由门
  {
    const yaml = [
      'commands:',
      '  test: \'node -e "process.exit(0)"\'',
      '  lint: \'node -e "process.exit(0)"\'',
      '  metrics: \'node -e "process.exit(0)"\'',
      'metrics_routes:',
      '  web:',
      '    paths: ["src/"]',
      '    command: \'node -e "process.exit(0)"\'',
    ].join('\n') + '\n'
    const { proj, specBase } = makeGateFixture2({ yaml })
    const gate = await runQuickTestLintGate({ cwd: proj, specBase, changedFiles: SRC })
    assert(gate.action === 'pass', `双绿 → pass（实际 ${gate.action}）`)
    assert(gate.reason.includes('路由门全过'), 'pass reason 提及路由门')
  }
  // 11c. 未配置路由 → metricsRoutes 为 skipped 留痕（含路由引导），不拦
  {
    const { proj, specBase } = makeGateFixture2({ yaml: '# 空 local.yaml\n' })
    const gate = await runQuickTestLintGate({ cwd: proj, specBase, changedFiles: SRC })
    assert(gate.action === 'pass' && gate.metricsRoutes && gate.metricsRoutes.status === 'skipped', '未配置路由 → skipped 留痕零回归')
    assert(String(gate.metricsRoutes.reason).includes('metrics_routes'), '留痕含路由形态引导')
  }
}

console.log('\n==================================================')
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
console.log('==================================================')
for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} }
if (failed > 0) process.exit(1)
