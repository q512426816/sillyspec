/**
 * 紧急包六项小修回归（ql-20260911-029，全仓审查报告 P1/P2 紧急包）。
 *
 * 锁行为：
 *  1. parseMakefileTestCommand：\s 吞换行两失效模式（空目标跳下一目标行 / prereq 当命令）
 *     + `;` 同行配方 + 配方边界（下一目标的配方不再泄漏给 test）
 *  2. detectModuleDocHealth：\\w 双重转义致整文件当一块、needs_review 只查首个模块
 *  3. skipStep/waitStep 谓词纳入 blocked（坑 deps-gate-blocked-invisible 在 completeStep
 *     修过但 skip/wait 未同步：blocked 后 --skip/--wait 落到其后第一个 pending 步错步记账）
 *  4. --wait-interactive 注册进 knownFlags（此前进命令前即被未知参数 exit(2) 拦死）
 *  5. modules resolve --json 用顶层 json 变量（查 filteredArgs 恒 false，机器输出死路）
 *  6. next --apply 的 ESM __dirname 崩溃 + binSelf 路径层级（fileURLToPath 化）
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { parseMakefileTestCommand } from '../src/local-detect.js'
import { detectModuleDocHealth } from '../src/doctor-diagnostics.js'
import { resolveBinSelfPath } from '../src/run/command.js'
import { skipStep, waitStep } from '../src/run/complete.js'
import { makeRepo, initChange, seedStage, runStage, runCLI, cleanup, report } from './_cli-step-harness.mjs'
import { ProgressManager } from '../src/progress.js'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

console.log('=== ① Makefile test 命令解析（\\s 吞换行两失效模式 + prereq 语义）===')
{
  const cases = [
    // [输入, 期望, 说明]
    ['test:\n\tnpm test\n', 'npm test', 'tab 配方'],
    ['test:\n    pytest -k a # 单测\n', 'pytest -k a', '空格缩进配方 + 行尾注释剥除'],
    ['test:\nbuild:\n\tnpm run build\n', 'make test', '空目标后不吞下一目标行（旧：返回 build:）/ 不泄漏 build 配方（旧：npm run build）'],
    ['test: unit integration\nbuild:\n\techo b\n', 'make test', 'prereq 风格回退 make test（旧：返回 "unit integration" 当命令）'],
    ['test: unit\n\tnpm test\n', 'npm test', 'prereq + 配方并存 → 取配方'],
    ['test: ; npm test\n', 'npm test', '`;` 同行配方形态'],
    ['build:\n\techo b\ntest := VAR\n', 'make test', 'test := 变量赋值不匹配目标 + 无 test 目标'],
    ['test: npm test', 'make test', '行内裸词是 prereq 不是命令（make 语义）'],
    ['test:\r\n\tnpm test\r\n', 'npm test', 'CRLF 耐受'],
  ]
  for (const [input, expected, label] of cases) {
    const got = parseMakefileTestCommand(input)
    assert(got === expected, `${label}（实得 ${JSON.stringify(got)}）`)
  }
}

console.log('\n=== ② doctor needs_review 分块（\\w 双重转义）===')
{
  const tmp = mkdtempSync(join(tmpdir(), 'doc-modhealth-'))
  try {
    const modulesDir = join(tmp, '.sillyspec', 'docs', 'main', 'modules')
    mkdirSync(modulesDir, { recursive: true })
    writeFileSync(join(modulesDir, '_module-map.yaml'), [
      'schema_version: 1',
      'project: demo',
      '',
      'modules:',
      '  auth:',
      '    status: active',
      '    needs_review: false',
      '  billing:',
      '    status: active',
      '    needs_review: true',
      '    review_reasons: [scan 后未复核]',
      '',
    ].join('\n'))
    const r = detectModuleDocHealth(tmp)
    assert(!r.pass && r.findings.some(f => f.includes('billing')),
      `第二个模块的 needs_review=true 被检出且归因到正确模块（findings: ${JSON.stringify(r.findings)}）`)
    assert(!r.findings.some(f => f.includes('auth')), '首模块 needs_review=false 不误报')
  } finally { rmSync(tmp, { recursive: true, force: true }) }
}

console.log('\n=== ③ skipStep/waitStep 谓词纳入 blocked ===')
console.log('--- ③a --wait 落在 blocked 步（CLI 载体 brainstorm）---')
{
  const { cwd, specBase } = makeRepo('ub-wait-blocked-')
  const cn = '2026-09-11-ub-wait'
  const pm = await initChange(cwd, specBase, cn)
  runCLI(['--dir', cwd, 'run', 'brainstorm', '--change', cn], { cwd })
  const real = (await pm.read(cwd, cn)).stages.brainstorm.steps
  const seeded = real.map((s, i) => ({ name: s.name, status: i === 0 ? 'blocked' : i === 1 ? 'pending' : 'completed' }))
  await seedStage(pm, cwd, cn, 'brainstorm', seeded)

  const r = runStage('brainstorm', cn, cwd, { wait: true, reason: '需要用户拍板' })

  const after = await new ProgressManager({ specDir: specBase }).read(cwd, cn)
  const steps = after.stages.brainstorm.steps
  assert(steps[0].status === 'waiting', `blocked 步（idx0）被置 waiting（实际 ${steps[0].status}）`)
  assert(steps[1].status === 'pending', `后续 pending 步不被错标（实际 ${steps[1].status}）`)
  assert(r.combined.includes(steps[0].name), `提示点名 blocked 步「${steps[0].name}」`)
}
console.log('--- ③b --skip 报错点名 blocked 步（全步骤 optional:false 走拒绝分支）---')
{
  const { cwd, specBase } = makeRepo('ub-skip-blocked-')
  const cn = '2026-09-11-ub-skip'
  const pm = await initChange(cwd, specBase, cn)
  runCLI(['--dir', cwd, 'run', 'brainstorm', '--change', cn], { cwd })
  const real = (await pm.read(cwd, cn)).stages.brainstorm.steps
  const seeded = real.map((s, i) => ({ name: s.name, status: i === 0 ? 'blocked' : i === 1 ? 'pending' : 'completed' }))
  await seedStage(pm, cwd, cn, 'brainstorm', seeded)

  const r = runCLI(['--dir', cwd, 'run', 'brainstorm', '--change', cn, '--skip'], { cwd })

  assert(r.status !== 0, `非 optional 步骤拒绝跳过（exit ${r.status}）`)
  assert(r.combined.includes(seeded[0].name) && r.combined.includes('不可跳过'),
    `拒绝的是 blocked 步「${seeded[0].name}」而非其后 pending 步`)
  const after = await new ProgressManager({ specDir: specBase }).read(cwd, cn)
  const steps = after.stages.brainstorm.steps
  assert(steps[0].status === 'blocked' && steps[1].status === 'pending', '拒绝后状态不被错改')
}
console.log('--- ③c skipStep 正向：blocked 步被标记 skipped（进程内直调，未知阶段使 defSteps=null 绕 optional 门）---')
{
  const { cwd, specBase } = makeRepo('ub-skip-pos-')
  const cn = '2026-09-11-ub-skip-pos'
  const pm = await initChange(cwd, specBase, cn)
  const steps = [
    { name: 'blocked-step', status: 'blocked' },
    { name: 'pending-step', status: 'pending' },
  ]
  await seedStage(pm, cwd, cn, 'customstage', steps)
  const progress = await pm.read(cwd, cn)
  await skipStep(pm, progress, 'customstage', cwd, cn, {})

  const after = await new ProgressManager({ specDir: specBase }).read(cwd, cn)
  const st = after.stages.customstage.steps
  assert(st[0].status === 'skipped', `blocked 步本身被 skip（实际 ${st[0].status}）`)
  assert(st[1].status === 'pending', `后续步不动（实际 ${st[1].status}）`)
}

console.log('\n=== ④ --wait-interactive 注册进 knownFlags ===')
{
  const { cwd } = makeRepo('ub-wi-flag-')
  const r = runCLI(['--dir', cwd, 'run', 'quick', '--status', '--wait-interactive', 'true'], { cwd })
  assert(!(r.status === 2 && /未知参数|你是想输入|wait-interactive/.test(r.combined)),
    `--wait-interactive true 不再被未知参数拦死（exit ${r.status}，输出 ${JSON.stringify(r.combined.slice(0, 100))}）`)
}

console.log('\n=== ⑤ modules resolve --json 走顶层 json 变量 ===')
{
  const { cwd } = makeRepo('ub-mr-json-')
  const cn = '2026-09-11-ub-mr'
  mkdirSync(join(cwd, '.sillyspec', 'changes', cn), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', 'changes', cn, 'tasks.md'), '- [ ] task-01: 示例\n')
  const r = runCLI(['--dir', cwd, 'modules', 'resolve', '--change', cn, '--json'], { cwd })
  const first = r.combined.indexOf('{')
  const last = r.combined.lastIndexOf('}')
  let parsed = null
  try { parsed = JSON.parse(r.combined.slice(first, last + 1)) } catch { /* 留 null */ }
  assert(parsed !== null && typeof parsed.hasMaps === 'boolean' && Array.isArray(parsed.rows),
    `--json 输出可解析的机器 JSON（hasMaps/rows 形状）而非人类表格`)
}

console.log('\n=== ⑥ ESM 路径：next --apply 与 binSelf ===')
console.log('--- ⑥a next --apply 不再 __dirname 崩溃 ---')
{
  const d = mkdtempSync(join(tmpdir(), 'ub-next-apply-'))
  try {
    execSync('git init -q', { cwd: d, stdio: 'pipe' })
    const r = runCLI(['--dir', d, 'next', '--apply'], { cwd: d })
    assert(!r.combined.includes('__dirname'), `无 __dirname ReferenceError（输出 ${JSON.stringify(r.combined.slice(0, 120))}）`)
    assert(r.combined.includes('代跑'), '进入子进程代跑分支')
  } finally { rmSync(d, { recursive: true, force: true }) }
}
console.log('--- ⑥b binSelf 指向真实存在的 CLI 入口 ---')
{
  const p = resolveBinSelfPath()
  assert(existsSync(p), `resolveBinSelfPath 指向存在文件（${p}）`)
}

cleanup()
report(count.passed, count.failed, count.failures)
