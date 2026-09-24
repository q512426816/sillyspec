/**
 * sentinel-wiring.test.mjs — 哨兵断言两道收口接线（2026-09-25-sentinel-wiring）
 *
 * 验收面：①flow done 侧：tasks.md 全勾零证据 → 拒收 exit 1 点名缺失任务；全勾+提交带
 * task-NN token → 放行；非全勾 → 放行不变；②接线钉（quick 侧与 flow 侧同源 import）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CLI = join(ROOT, 'src', 'index.js')

function makeRepo() {
  const cwd = mkdtempSync(join(tmpdir(), 'sw-'))
  const g = (a) => execFileSync('git', a, { cwd, stdio: 'pipe' })
  g(['init', '-q']); g(['config', 'user.email', 't@t']); g(['config', 'user.name', 't'])
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), 'project:\n  type: generic\ncommands:\n  test: "node -e \\"0\\""\n')
  writeFileSync(join(cwd, 'base.txt'), 'b\n')
  g(['add', '.']); g(['commit', '-q', '-m', 'b'])
  const cli = (args) => spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf-8', timeout: 180_000, env: { ...process.env, SILLYSPEC_WATCHER: '0' } })
  return { cwd, cli }
}

function fillSlots(cwd, change) {
  const base = join(cwd, '.sillyspec', 'changes', change)
  const dp = join(base, 'design.md')
  writeFileSync(dp, readFileSync(dp, 'utf8').replace(/(<!--AGENT:槽\d+[^\n]*-->)/g, '$1\n不适用：哨兵夹具'))
  const rp = join(base, 'requirements.md')
  writeFileSync(rp, readFileSync(rp, 'utf8').replace(/(<!--AGENT:测试绑定FR-\d+[^\n]*-->)/g, '$1\n不适用：哨兵夹具'))
}

test('① flow done 哨兵：全勾零证据拒收 / 全勾+token 放行 / 非全勾放行', () => {
  // 形态 A：全勾零证据 → 拒
  {
    const { cwd, cli } = makeRepo()
    const change = 'sw-fake'
    assert.equal(cli(['flow', 'start', '--change', change, '--input', '任务\n成功标准：\n- 行为 X']).status, 0)
    const cd = join(cwd, '.sillyspec', 'changes', change)
    fillSlots(cwd, change)
    // tasks.md 全勾（机器段内改勾须走 amend 留痕重锚——模拟真实勾选面）
    writeFileSync(join(cd, 'tasks.md'), readFileSync(join(cd, 'tasks.md'), 'utf8').replace(/- \[ \]/g, '- [x]'))
    spawnSync(process.execPath, [CLI, 'flow', 'amend-draft', '--change', change], { cwd, encoding: 'utf8', timeout: 60_000 })
    writeFileSync(join(cwd, 'work.js'), 'export const a = 1\n')
    execFileSync('git', ['add', 'work.js'], { cwd, stdio: 'pipe' })
    execFileSync('git', ['commit', '-q', '-m', 'work（无 task token）'], { cwd, stdio: 'pipe' })
    const f = cli(['flow', 'done', '--change', change])
    assert.equal(f.status, 1, '全勾零证据应拒')
    assert.match(f.stdout + f.stderr, /哨兵断言拒收/, '哨兵文案')
    rmSync(cwd, { recursive: true, force: true })
  }
  // 形态 B：全勾 + 提交带 token → 过（哨兵绿行，收口继续）
  {
    const { cwd, cli } = makeRepo()
    const change = 'sw-real'
    // --no-review：amend 改勾触发 edit_ratio=1 → 评审必评会拦在收口前，本用例测哨兵不测评审
    assert.equal(cli(['flow', 'start', '--change', change, '--input', '任务\n成功标准：\n- 行为 X', '--no-review']).status, 0)
    const cd = join(cwd, '.sillyspec', 'changes', change)
    fillSlots(cwd, change)
    writeFileSync(join(cd, 'tasks.md'), readFileSync(join(cd, 'tasks.md'), 'utf8').replace(/- \[ \]/g, '- [x]'))
    spawnSync(process.execPath, [CLI, 'flow', 'amend-draft', '--change', change], { cwd, encoding: 'utf8', timeout: 60_000 })
    writeFileSync(join(cwd, 'work.js'), 'export const a = 1\n')
    execFileSync('git', ['add', 'work.js'], { cwd, stdio: 'pipe' })
    execFileSync('git', ['commit', '-q', '-m', 'feat: task-01 行为 X'], { cwd, stdio: 'pipe' })
    const ok = cli(['flow', 'done', '--change', change])
    assert.equal(ok.status, 0, `全勾+token 应放行收口: ${ok.stdout}\n${ok.stderr}`)
    assert.match(ok.stdout, /哨兵：全勾/, '哨兵绿行在场')
    rmSync(cwd, { recursive: true, force: true })
  }
  // 形态 C：非全勾（默认未勾）→ 哨兵 status=none 不拦（既有全部测试已隐式覆盖——显式断言一次）
  {
    const { cwd, cli } = makeRepo()
    const change = 'sw-partial'
    assert.equal(cli(['flow', 'start', '--change', change, '--input', '任务\n成功标准：\n- 行为 X']).status, 0)
    fillSlots(cwd, change)
    writeFileSync(join(cwd, 'work.js'), 'export const a = 1\n')
    execFileSync('git', ['add', 'work.js'], { cwd, stdio: 'pipe' })
    execFileSync('git', ['commit', '-q', '-m', 'work'], { cwd, stdio: 'pipe' })
    const ok = cli(['flow', 'done', '--change', change])
    assert.equal(ok.status, 0, '非全勾放行不变')
    assert.doesNotMatch(ok.stdout, /哨兵断言拒收/)
    rmSync(cwd, { recursive: true, force: true })
  }
})

test('② 接线钉：flow done 与 quick 门两侧同源 import detectFakeCheckCompletion', () => {
  const flowSrc = readFileSync(join(ROOT, 'src', 'flow.js'), 'utf8')
  const quickSrc = readFileSync(join(ROOT, 'src', 'run', 'quick-audit.js'), 'utf8')
  assert.match(flowSrc, /sentinel-assertions/, 'flow 侧接线')
  assert.match(quickSrc, /sentinel-assertions/, 'quick 侧接线')
})
