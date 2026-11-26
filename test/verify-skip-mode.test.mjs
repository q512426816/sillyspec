/**
 * verify-skip-mode.test.mjs — verify.mode=skip 仓级关停（2026-11-26-verify-skip-switch）
 *
 * 覆盖：
 *   FR-01 skip 档判定与留痕文案；
 *   FR-02 缺省/非法配置回落 full（零行为变化）；
 *   FR-03 skip 档 resolveFactsExpected 强制 false（facts 在场也不 fail-closed）；
 *   FR-04 next 推断：skip 档全勾无 report 直接指向 archive，full 档仍指向 verify。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync, spawnSync } from 'node:child_process'
import { readVerifyMode, shouldSkipVerify, renderVerifySkipNotice } from '../src/verify-mode.js'
import { resolveFactsExpected } from '../src/stage-contract.js'
import { detectNextStep } from '../src/run/next.js'
import { ProgressManager } from '../src/progress.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CLI = join(ROOT, 'src', 'index.js')

function makeRepo(localYaml) {
  const root = mkdtempSync(join(tmpdir(), 'vsm-'))
  const spec = join(root, '.sillyspec')
  mkdirSync(spec, { recursive: true })
  if (localYaml != null) writeFileSync(join(spec, 'local.yaml'), localYaml)
  return { root, spec, cleanup: () => rmSync(root, { recursive: true, force: true }) }
}

function makeChange(spec, name = '2026-11-26-demo') {
  const changeDir = join(spec, 'changes', name)
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(changeDir, 'design.md'), '# design\n')
  writeFileSync(join(changeDir, 'plan.md'), '# plan\n')
  writeFileSync(join(changeDir, 'tasks.md'), '- [x] task-01: demo\n')
  return changeDir
}

test('readVerifyMode: skip 档返回 skip', () => {
  const r = makeRepo('verify:\n  mode: skip\n')
  try {
    assert.equal(readVerifyMode(r.spec), 'skip')
  } finally { r.cleanup() }
})

test('readVerifyMode: 缺省/非法/缺文件一律 full', () => {
  const cases = [
    ['无 local.yaml', null],
    ['无 verify 段', 'project:\n  type: generic\n'],
    ['mode 非法值', 'verify:\n  mode: off\n'],
    ['mode 非字符串', 'verify:\n  mode: 1\n'],
    ['YAML 坏格式', 'verify: [unclosed\n'],
  ]
  for (const [label, yaml] of cases) {
    const r = makeRepo(yaml)
    try {
      assert.equal(readVerifyMode(r.spec), 'full', label)
    } finally { r.cleanup() }
  }
})

test('shouldSkipVerify: 仅 verify + skip 为 true', () => {
  const r = makeRepo('verify:\n  mode: skip\n')
  try {
    assert.equal(shouldSkipVerify({ specBase: r.spec, stageName: 'verify' }), true)
    assert.equal(shouldSkipVerify({ specBase: r.spec, stageName: 'execute' }), false)
    assert.equal(shouldSkipVerify({ specBase: r.spec, stageName: 'archive' }), false)
  } finally { r.cleanup() }
})

test('renderVerifySkipNotice: 含跳过与恢复关键词', () => {
  const text = renderVerifySkipNotice()
  assert.match(text, /verify 阶段跳过/)
  assert.match(text, /verify\.mode: skip/)
  assert.match(text, /--reopen/)
})

test('resolveFactsExpected: skip 档即使 facts 在场也返回 false', () => {
  const r = makeRepo('verify:\n  mode: skip\n')
  try {
    const changeDir = makeChange(r.spec)
    writeFileSync(join(changeDir, 'verify-facts.json'), '{}')
    assert.equal(resolveFactsExpected(changeDir), false)
  } finally { r.cleanup() }
})

test('resolveFactsExpected: 缺省 full 档 facts 在场返回 true', () => {
  const r = makeRepo('verify:\n  mode: full\n')
  try {
    const changeDir = makeChange(r.spec)
    writeFileSync(join(changeDir, 'verify-facts.json'), '{}')
    assert.equal(resolveFactsExpected(changeDir), true)
  } finally { r.cleanup() }
})

test('detectNextStep: skip 档全勾无 report 指向 archive', () => {
  const r = makeRepo('verify:\n  mode: skip\n')
  try {
    makeChange(r.spec)
    const out = detectNextStep({ cwd: r.root })
    assert.match(out.next, /run archive/)
    assert.match(out.state, /待归档/)
  } finally { r.cleanup() }
})

test('detectNextStep: 缺省 full 档仍指向 verify', () => {
  const r = makeRepo('project:\n  type: generic\n')
  try {
    makeChange(r.spec)
    const out = detectNextStep({ cwd: r.root })
    assert.match(out.next, /run verify/)
    assert.match(out.state, /待验证/)
  } finally { r.cleanup() }
})

test('run verify 端到端: skip 档短路、阶段 completed、零 verify 产物', async () => {
  const root = mkdtempSync(join(tmpdir(), 'vsm-e2e-'))
  const spec = join(root, '.sillyspec')
  mkdirSync(spec, { recursive: true })
  writeFileSync(join(spec, 'local.yaml'), 'verify:\n  mode: skip\n')
  writeFileSync(join(root, '.gitignore'), '.sillyspec/\n')
  const git = (args) => execFileSync('git', args, { cwd: root, stdio: 'pipe' })
  git(['init', '-q'])
  git(['config', 'user.email', 't@t.local'])
  git(['config', 'user.name', 't'])
  git(['add', '.gitignore'])
  git(['commit', '-q', '-m', 'init'])
  try {
    const name = '2026-11-26-demo'
    await new ProgressManager({ specDir: spec }).init(root)
    // CLI 的变更存在性校验读目录；verify 阶段本身由 run 自动初始化
    mkdirSync(join(spec, 'changes', name), { recursive: true })
    const res = spawnSync(process.execPath, [CLI, 'run', 'verify', '--change', name, '--non-interactive', '--skip-approval'], {
      cwd: root, encoding: 'utf8', timeout: 90_000,
      env: { ...process.env, SILLYSPEC_WATCHER: '0' },
    })
    const out = (res.stdout || '') + (res.stderr || '')
    assert.match(out, /verify 阶段跳过/)
    const prog = await new ProgressManager({ specDir: spec }).read(root, name)
    assert.equal(prog.stages.verify.status, 'completed')
    assert.ok(prog.stages.verify.steps.every(s => s.status === 'completed' || s.status === 'skipped'))
    assert.equal(existsSync(join(spec, 'changes', name, 'verify-result.md')), false)
    assert.equal(existsSync(join(spec, 'changes', name, 'verify-facts.json')), false)
  } finally {
    // Windows：SQLite 句柄未释放时 rm 会 EPERM——临时目录留给 OS 清理，不因清理失败误判用例
    try { rmSync(root, { recursive: true, force: true }) } catch { /* best-effort */ }
  }
})
