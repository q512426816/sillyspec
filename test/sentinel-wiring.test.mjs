/**
 * sentinel-wiring.test.mjs — 哨兵断言两道收口接线（2026-09-25-sentinel-wiring）
 *
 * 验收面：①flow done 侧：tasks.md 全勾零证据 → 拒收 exit 1 点名缺失任务；全勾+提交标题或
 * 正文带 task-NN token → 放行（勾选直改不走 amend——2026-09-25 哈希勾选态归一后正常勾选
 * 不再触发指纹门，坑1/坑2 口径对齐）；非全勾 → 放行不变；②接线钉（同源 import）。
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
  writeFileSync(rp, readFileSync(rp, 'utf8')
    .replace(/(<!--AGENT:FR区[^\n]*-->)/g, '$1\n### FR-01: 哨兵夹具行为\nGiven 轻量变更在跑\nWhen flow done 执行\nThen 哨兵通过')
    .replace(/(<!--AGENT:测试绑定FR-\d+[^\n]*-->)/g, '$1\n不适用：哨兵夹具'))
}

test('① flow done 哨兵：全勾零证据拒收 / 全勾+token 放行 / 非全勾放行', () => {
  // 形态 A：全勾零证据 → 拒
  {
    const { cwd, cli } = makeRepo()
    const change = 'sw-fake'
    assert.equal(cli(['flow', 'start', '--change', change, '--input', '任务\n成功标准：\n- 行为 X']).status, 0)
    const cd = join(cwd, '.sillyspec', 'changes', change)
    fillSlots(cwd, change)
    // tasks.md 全勾——直接改勾选（哈希勾选态归一后是合法书写面，不走 amend：走 amend 反而
    // 会计入 edit_ratio 触发 route_hint——坑1 修复后的规范动作）
    writeFileSync(join(cd, 'tasks.md'), readFileSync(join(cd, 'tasks.md'), 'utf8').replace(/- \[ \]/g, '- [x]'))
    writeFileSync(join(cwd, 'work.js'), 'export const a = 1\n')
    execFileSync('git', ['add', 'work.js'], { cwd, stdio: 'pipe' })
    execFileSync('git', ['commit', '-q', '-m', 'work（无 task token）'], { cwd, stdio: 'pipe' })
    const f = cli(['flow', 'done', '--change', change])
    assert.equal(f.status, 1, '全勾零证据应拒')
    assert.doesNotMatch(f.stdout + f.stderr, /指纹失配/, '坑1：正常勾选不再触发指纹门（拒在哨兵不在指纹）')
    assert.match(f.stdout + f.stderr, /哨兵断言拒收/, '哨兵文案')
    rmSync(cwd, { recursive: true, force: true })
  }
  // 形态 B：全勾 + 提交标题带 token → 过（哨兵绿行，收口继续）
  {
    const { cwd, cli } = makeRepo()
    const change = 'sw-real'
    // --no-review：聚焦哨兵不测评审（勾选直改后无 edit_ratio，评审定档与本用例无关）
    assert.equal(cli(['flow', 'start', '--change', change, '--input', '任务\n成功标准：\n- 行为 X', '--no-review']).status, 0)
    const cd = join(cwd, '.sillyspec', 'changes', change)
    fillSlots(cwd, change)
    writeFileSync(join(cd, 'tasks.md'), readFileSync(join(cd, 'tasks.md'), 'utf8').replace(/- \[ \]/g, '- [x]'))
    writeFileSync(join(cwd, 'work.js'), 'export const a = 1\n')
    execFileSync('git', ['add', 'work.js'], { cwd, stdio: 'pipe' })
    execFileSync('git', ['commit', '-q', '-m', 'feat: task-01 行为 X'], { cwd, stdio: 'pipe' })
    const ok = cli(['flow', 'done', '--change', change])
    assert.equal(ok.status, 0, `全勾+token 应放行收口: ${ok.stdout}\n${ok.stderr}`)
    assert.match(ok.stdout, /哨兵：全勾/, '哨兵绿行在场')
    assert.doesNotMatch(ok.stdout + ok.stderr, /指纹失配/, '坑1：勾选直改过指纹门')
    rmSync(cwd, { recursive: true, force: true })
  }
  // 形态 B2：全勾 + token 只在提交正文（标题无 token）→ 过（坑2：证据面=整条提交消息）
  {
    const { cwd, cli } = makeRepo()
    const change = 'sw-body-token'
    assert.equal(cli(['flow', 'start', '--change', change, '--input', '任务\n成功标准：\n- 行为 X', '--no-review']).status, 0)
    const cd = join(cwd, '.sillyspec', 'changes', change)
    fillSlots(cwd, change)
    writeFileSync(join(cd, 'tasks.md'), readFileSync(join(cd, 'tasks.md'), 'utf8').replace(/- \[ \]/g, '- [x]'))
    writeFileSync(join(cwd, 'work.js'), 'export const a = 1\n')
    execFileSync('git', ['add', 'work.js'], { cwd, stdio: 'pipe' })
    execFileSync('git', ['commit', '-q', '-m', 'feat: 行为 X 落地（token 在正文）\n\n任务证据（哨兵 token）：task-01'], { cwd, stdio: 'pipe' })
    const ok = cli(['flow', 'done', '--change', change])
    assert.equal(ok.status, 0, `正文 token 应过哨兵放行收口: ${ok.stdout}\n${ok.stderr}`)
    assert.match(ok.stdout, /哨兵：全勾/, '哨兵绿行在场（正文 token 计证据）')
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
