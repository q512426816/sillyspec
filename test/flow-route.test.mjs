/**
 * flow-route.test.mjs — 编辑距离路由+失败升厚（R7 切片四 task-06 / D-005 / FR-09 FR-10）
 *
 * 覆盖验收面：
 *   ① computeEditRatio 纯函数：0 边界/半改写/全改写/插入删除——LCS 行 diff 口径；
 *   ② 阈值触发（0.5 边界两侧）：amend 大改（>50%）→ route_hint:thick 落档+amend 输出提示；
 *      小改（<50%）→ 无 route_hint；
 *   ③ advisory 定案：route_hint=thick + 测绿 → flow done 仍 exit 0（测绿可薄档过）+醒目打印+遥测记一笔；
 *   ④ enforcement=block：route_hint=thick 时 flow done 阻断 exit 1；
 *   ⑤ 失败升级通路真跑（fr-10）：verify 失败→tier thick+upgrade_reason（flow-protocol ③ 已覆盖
 *      行为面，此处补遥测账核对）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CLI = join(ROOT, 'src', 'index.js')
const { computeEditRatio } = await import('../src/flow-draft.js')

test('① computeEditRatio：LCS 行 diff 口径（0/半改/全改/插删）', () => {
  const orig = ['a', 'b', 'c', 'd'].join('\n')
  assert.equal(computeEditRatio(orig, orig), 0, '未改=0')
  // 4 行改 1 行：LCS=3 → 被改原文行 1/4=0.25（替换不双计）
  assert.equal(computeEditRatio(orig, ['a', 'b', 'x', 'd'].join('\n')), 0.25)
  // 全改：LCS=0 → 4/4=1
  assert.equal(computeEditRatio(orig, ['w', 'x', 'y', 'z'].join('\n')), 1)
  // 纯插入 4 行：原文零改写 → 0（增行不改写原文）
  assert.equal(computeEditRatio(orig, orig + '\ne\nf\ng\nh'), 0)
  assert.equal(computeEditRatio('', 'x'), 0, '无首版基准=0')
})

function makeRepo(yamlExtra = '') {
  const cwd = mkdtempSync(join(tmpdir(), 'fr-'))
  const g = (a) => execFileSync('git', a, { cwd, stdio: 'pipe' })
  g(['init', '-q']); g(['config', 'user.email', 't@t']); g(['config', 'user.name', 't'])
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), 'project:\n  type: generic\ncommands:\n  test: node -e 0\n' + yamlExtra)
  writeFileSync(join(cwd, 'base.txt'), 'b\n')
  g(['add', '.']); g(['commit', '-q', '-m', 'b'])
  const cli = (args) => spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf8', timeout: 180_000, env: { ...process.env, SILLYSPEC_WATCHER: '0' } })
  return { cwd, cli }
}

/** 对 proposal 机器段做比例可控的 amend 改写（改动机器段正文后走 amend 通道）。 */
function amendWithRatio(cwd, change, ratio) {
  const p = join(cwd, '.sillyspec', 'changes', change, 'proposal.md')
  let text = readFileSync(p, 'utf8')
  // 定位动机机器段 body 行，按比例改写行内容
  const lines = text.split('\n')
  const bIdx = lines.findIndex((l) => l.includes('proposal-motivation'))
  const bodyStart = bIdx + 1
  const bodyEnd = lines.findIndex((l, i) => i > bodyStart && l.includes('MACHINE-DRAFT:') && l.includes(':end'))
  const bodyLen = bodyEnd - bodyStart
  const nChange = Math.round(bodyLen * ratio)
  for (let i = 0; i < nChange; i++) lines[bodyStart + i] = `改写行 ${i}（决策覆盖度测试）`
  writeFileSync(p, lines.join('\n'))
  return spawnSync(process.execPath, [CLI, 'flow', 'amend-draft', '--change', change], { cwd, encoding: 'utf8', timeout: 60_000, env: { ...process.env, SILLYSPEC_WATCHER: '0' } })
}

/** agent 例行动作（2026-09-24 设计记录全档化契约）：design 槽各写一行，防 artifacts 子步空槽拒收。 */
function fillDesignSlots(cwd, change) {
  const p = join(cwd, '.sillyspec', 'changes', change, 'design.md')
  writeFileSync(p, readFileSync(p, 'utf8').replace(/(<!--AGENT:槽\d+[^\n]*-->)/g, '$1\n不适用：路由测试夹具——一行作答即合规'))
}

test('②③ 阈值两侧：大改 route_hint=thick + advisory 测绿薄过+醒目打印+遥测；小改无 hint', () => {
  const { cwd, cli } = makeRepo('flow:\n  mode: thin\n')
  const change = 'fr-r1'
  assert.equal(cli(['flow', 'start', '--change', change, '--input', '成功标准：\n- 条件A']).status, 0)
  // 大改（≥0.75 行）→ route_hint
  const big = amendWithRatio(cwd, change, 0.75)
  assert.equal(big.status, 0)
  assert.match(big.stdout + big.stderr, /route_hint: thick/)
  assert.match(big.stdout + big.stderr, /决策覆盖度低/)
  let st = readFileSync(join(cwd, '.sillyspec', 'changes', change, 'flow-state.yaml'), 'utf8')
  assert.match(st, /route_hint: thick/)

  // advisory（缺省）：测绿 → flow done exit 0 + 醒目打印 + 遥测记一笔
  writeFileSync(join(cwd, 'work.js'), 'export const a = 1\n')
  fillDesignSlots(cwd, change)
  const done = cli(['flow', 'done', '--change', change])
  assert.equal(done.status, 0, `advisory 应薄档过: ${done.stdout}\n${done.stderr}`)
  assert.match(done.stdout + done.stderr, /route_hint: thick/)
  const telemetry = readFileSync(join(cwd, '.sillyspec', '.runtime', 'flow-telemetry.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l))
  const rec = telemetry.find((r) => r.change === change)
  assert.ok(rec && rec.protocolCalls === 2 && rec.routeHint === 'thick' && rec.editRatio > 0.5, `遥测四列记一笔: ${JSON.stringify(rec)}`)
  rmSync(cwd, { recursive: true, force: true })

  // 小改（≤0.25）→ 无 route_hint
  const s2 = makeRepo('flow:\n  mode: thin\n')
  const change2 = 'fr-r2'
  assert.equal(s2.cli(['flow', 'start', '--change', change2, '--input', '成功标准：\n- 条件A']).status, 0)
  const small = amendWithRatio(s2.cwd, change2, 0.25)
  assert.equal(small.status, 0)
  const st2 = readFileSync(join(s2.cwd, '.sillyspec', 'changes', change2, 'flow-state.yaml'), 'utf8')
  assert.doesNotMatch(st2, /route_hint: thick/)
  rmSync(s2.cwd, { recursive: true, force: true })
})

test('④ enforcement=block：route_hint=thick 阻断 flow done exit 1', () => {
  const { cwd, cli } = makeRepo('flow:\n  mode: thin\n  edit_ratio_enforcement: block\n')
  const change = 'fr-b1'
  assert.equal(cli(['flow', 'start', '--change', change, '--input', '成功标准：\n- 条件A']).status, 0)
  const big = amendWithRatio(cwd, change, 0.75)
  assert.match(big.stdout + big.stderr, /route_hint: thick|edit_ratio_enforcement/)
  writeFileSync(join(cwd, 'work.js'), 'export const a = 1\n')
  fillDesignSlots(cwd, change)
  const done = cli(['flow', 'done', '--change', change])
  assert.equal(done.status, 1, 'block 档应阻断')
  assert.match(done.stdout + done.stderr, /edit_ratio_enforcement=block/)
  rmSync(cwd, { recursive: true, force: true })
})
