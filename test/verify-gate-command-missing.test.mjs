// CNF（command-not-found）环境缺件降档（坑 quick-test-gate-frontend-lint-tempdir-no-nodemodules，
// 2026-09-23 multi-agent-platform 实证：纯 backend 改动被链式 commands.lint 的 frontend 段
// next CNF 拦死 --done，只能 SILLYSPEC_QUICK_TEST_GATE=skip 逃生）。
// 锁死契约：
// 1. detectCommandMissingFailure：四族签名（zh/en cmd、bash、debian sh、pnpm 横幅）+ 二进制名
//    捕获；尾部窗护栏（中段 fixture 的预期 CNF 文案不触发降档）。
// 2. runVerifyLintCheck：链尾二进制缺失 → skipped + 环境缺件 reason（含二进制名）；
//    真实 lint 债（失败输出带文件路径）维持 failed 硬拦。
// 3. runVerifyTestCheck 全量路径：链尾二进制缺失（前段 node --test 通过输出含 `# fail 0`
//    判账噪声行）→ skipped；真实挂测维持 failed。
// 4. module 子集：模块命令 CNF → 单元 skipped，aggregateStatus 聚合 skipped + reason 点名。
// 5. classifyTestFailureArtifact：next CNF 行命中 sandbox-env-missing（签名两侧形态）。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync, execSync } from 'node:child_process'
import {
  detectCommandMissingFailure,
  decodeShellOutput,
  runVerifyLintCheck,
  runVerifyTestCheck,
  aggregateStatus,
  classifyTestFailureArtifact,
} from '../src/verify-postcheck.js'

const tmpRoots = []
function mk(prefix) {
  const d = mkdtempSync(join(tmpdir(), `cnfgate-${prefix}-`))
  tmpRoots.push(d)
  return d
}
function writeLocalYaml(dir, body) {
  mkdirSync(join(dir, '.sillyspec'), { recursive: true })
  writeFileSync(join(dir, '.sillyspec', 'local.yaml'), body)
}
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

test('T1 detectCommandMissingFailure：四族签名 + 二进制捕获 + 尾部窗护栏', () => {
  const cases = [
    ["'next' 不是内部或外部命令，也不是可运行的程序", 'next'],
    ["'next' is not recognized as an internal or external command, operable program or batch file.", 'next'],
    ['bash: line 1: next: command not found', 'next'],
    ['sh: 1: next: not found', 'next'],
    ['ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL  Command "next" not found', 'next'],
  ]
  for (const [line, bin] of cases) {
    const r = detectCommandMissingFailure(line)
    assert.equal(r.matched, true, `应命中：${line}`)
    assert.equal(r.binary, bin, `二进制名捕获：${line}`)
    assert.ok(r.evidence.length > 0 && r.evidence.length <= 122, 'evidence 供 reason 引用')
  }
  // 中段 fixture 噪音（预期 CNF 文案后还有大段真实汇总）→ 尾部窗不触发
  const midOnly = 'x'.repeat(200) + '\nsome fixture: command not found\n' + 'y'.repeat(2000) + '\nTest Files  2 failed (2)\n'
  assert.equal(detectCommandMissingFailure(midOnly).matched, false, '中段 CNF fixture 不触发（尾部窗护栏）')
  // 长前缀输出 + 尾部 CNF（真实链式形态：前段全绿输出很长，横幅在链尾）→ 触发
  const tailCnf = 'a'.repeat(3000) + "\n'next' 不是内部或外部命令，也不是可运行的程序\n"
  const r2 = detectCommandMissingFailure(tailCnf)
  assert.equal(r2.matched, true, '尾部 CNF 触发')
  assert.equal(r2.binary, 'next')
  // 干净通过输出 → 不触发
  assert.equal(detectCommandMissingFailure('ok 1 - all green\n# pass 1\n# fail 0\n').matched, false)
  assert.equal(detectCommandMissingFailure('').matched, false)
  assert.equal(detectCommandMissingFailure(null).matched, false)
  // 乱码兜底签名（zh-Windows cmd 报错经错误代码页解码：引号二进制名 + U+FFFD 替换符）
  const moji = detectCommandMissingFailure("'next' \ufffd\ufffd\ufffd\ufffd\ufffd\ufffd\ufffd\r\n")
  assert.equal(moji.matched, true, '乱码形态兜底命中')
  assert.equal(moji.binary, 'next')
})

test('T1b decodeShellOutput：utf8 无损直通；GBK 控制台报错解出可读中文（真实 cmd 捕获）', () => {
  // utf8/ASCII：与旧口径逐字节一致
  assert.equal(decodeShellOutput(Buffer.from('ok 1 - all green\n# pass 1\n', 'utf8')), 'ok 1 - all green\n# pass 1\n')
  assert.equal(decodeShellOutput(Buffer.from('中文 vitest 输出', 'utf8')), '中文 vitest 输出', '合法 UTF-8 直通不试 GBK')
  assert.equal(decodeShellOutput(''), '')
  assert.equal(decodeShellOutput(null), '')
  // 真实 cmd CNF 捕获（Windows 限定）：GBK 控制台消息应解出可读短语（en 控制台走 is not recognized）
  if (process.platform === 'win32') {
    let stderrBuf = null
    try {
      execSync('definitely-missing-bin-qwe --version', { encoding: 'buffer', stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true })
    } catch (e) { stderrBuf = e.stderr }
    assert.ok(Buffer.isBuffer(stderrBuf) && stderrBuf.length > 0, 'CNF 有 stderr 捕获')
    const decoded = decodeShellOutput(stderrBuf)
    assert.ok(/不是内部或外部命令|is not recognized as an internal or external command/.test(decoded),
      `解码后应含可读 CNF 短语，实际：${JSON.stringify(decoded.slice(0, 80))}`)
  }
})

test('T2 aggregateStatus：skipped 单元族（无 failed 非 all-passed → skipped）', () => {
  assert.equal(aggregateStatus([{ status: 'passed' }, { status: 'skipped' }]), 'skipped')
  assert.equal(aggregateStatus([{ status: 'skipped' }]), 'skipped')
  assert.equal(aggregateStatus([{ status: 'passed' }, { status: 'failed' }]), 'failed', '任一 failed 优先不变')
  assert.equal(aggregateStatus([{ status: 'passed' }, { status: 'passed' }]), 'passed', '全 passed 不变')
  assert.equal(aggregateStatus([]), null)
})

test('T3 runVerifyLintCheck：链尾二进制缺失 → skipped；真实 lint 债（带路径）维持 failed', () => {
  const dir = mk('lint')
  writeFileSync(join(dir, 'ok.cjs'), "console.log('seg1 ok')\n")
  writeLocalYaml(dir, 'commands:\n  lint: "node ok.cjs && definitely-missing-bin-qwe --version"\n')
  const r = runVerifyLintCheck({ cwd: dir, specBase: join(dir, '.sillyspec') })
  assert.equal(r.status, 'skipped', 'CNF 环境缺件降档为跳过')
  assert.match(r.reason, /环境缺件/)
  assert.match(r.reason, /definitely-missing-bin-qwe/)
  assert.match(r.reason, /恢复实测/)

  // 真实 lint 债：失败输出带文件路径 → 不降档维持硬拦
  writeFileSync(join(dir, 'debt.cjs'), "process.stderr.write('src/app/foo.js:1:1 lint-debt error\\n'); process.exit(1)\n")
  writeLocalYaml(dir, 'commands:\n  lint: "node debt.cjs"\n')
  const r2 = runVerifyLintCheck({ cwd: dir, specBase: join(dir, '.sillyspec') })
  assert.equal(r2.status, 'failed', '真实 lint 债不降档')
  assert.ok((r2.failureFiles || []).some(f => f.includes('foo.js')), '失败面路径可归属')
})

test('T4 runVerifyTestCheck 全量路径：链尾二进制缺失（前段 runner 汇总噪声行）→ skipped；真实挂测维持 failed', () => {
  // 被测命令用受控脚本而非 node --test 本体：父 node --test 会给子进程注入
  // NODE_TEST_CONTEXT（测试协议子模式），子 node --test 零输出零退出码——测试基建伪影，
  // 生产门禁从 CLI 进程跑不受影响。前段脚本打印真实形态的 TAP 汇总（含会进判账行集的
  // `# fail 0` 噪声行）验证降档护栏不被其误杀。
  const dir = mk('testfull')
  writeFileSync(join(dir, 'tap-ok.cjs'), "console.log('TAP version 13')\nconsole.log('ok 1 - green')\nconsole.log('# pass 1')\nconsole.log('# fail 0')\n")
  writeLocalYaml(dir, 'commands:\n  test: "node tap-ok.cjs && definitely-missing-bin-qwe run"\n')
  const r = runVerifyTestCheck({ cwd: dir, specBase: join(dir, '.sillyspec') })
  assert.equal(r.status, 'skipped', 'CNF 环境缺件降档为跳过（# fail 0 噪声行不阻断降档）')
  assert.match(r.reason, /环境缺件/)
  assert.match(r.reason, /definitely-missing-bin-qwe/)

  const dir2 = mk('testfail')
  writeFileSync(join(dir2, 'bad.cjs'), "process.stderr.write('not ok 1 - boom\\n  error: expected 1 to equal 2 (src/app/foo.js:3:5)\\n')\nprocess.exit(1)\n")
  writeLocalYaml(dir2, 'commands:\n  test: "node bad.cjs"\n')
  const r2 = runVerifyTestCheck({ cwd: dir2, specBase: join(dir2, '.sillyspec') })
  assert.equal(r2.status, 'failed', '真实挂测不降档')
})

test('T5 module 子集：模块命令 CNF → 单元 skipped，聚合 skipped + reason 点名', () => {
  const dir = mk('testmod')
  const git = (args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8', windowsHide: true })
  git(['init', '--quiet'])
  git(['config', 'user.email', 't@t'])
  git(['config', 'user.name', 't'])
  mkdirSync(join(dir, 'backend/app/modules/x'), { recursive: true })
  writeFileSync(join(dir, 'backend/app/modules/x/mod.py'), 'v1\n')
  git(['add', '.'])
  git(['commit', '--quiet', '-m', 'init'])
  writeFileSync(join(dir, 'backend/app/modules/x/mod.py'), 'v2-dirty\n') // 制造 diff 命中模块
  writeLocalYaml(dir, [
    'test_strategy: module',
    'modules:',
    '  mx: { path: "backend/app/modules/x/", test: "definitely-missing-bin-qwe run" }',
    '',
  ].join('\n'))
  const r = runVerifyTestCheck({ cwd: dir, specBase: join(dir, '.sillyspec') })
  assert.equal(r.status, 'skipped', '模块命令 CNF → 单元 skipped → 聚合 skipped')
  assert.match(r.reason, /环境缺件跳过/)
  assert.match(r.reason, /mx/)
  assert.ok(Array.isArray(r.modules) && r.modules.some(u => u.name === 'mx' && u.status === 'skipped'), '逐模块结论含 skipped 单元')
})

test('T6 classifyTestFailureArtifact：next CNF 行命中 sandbox-env-missing（签名两侧形态）', () => {
  const a = classifyTestFailureArtifact({ status: 'failed', failureRemaining: ["'next' 不是内部或外部命令，也不是可运行的程序"], outputTail: null })
  assert.equal(a.matched, true)
  assert.equal(a.kind, 'sandbox-env-missing', '工具名前置于短语（Windows cmd 形态）')
  const b = classifyTestFailureArtifact({ status: 'failed', failureRemaining: ['sh: 1: next: command not found'] })
  assert.equal(b.kind, 'sandbox-env-missing', 'POSIX 形态')
})
