/**
 * flow-route.test.mjs — 编辑距离路由+失败升厚（R7 切片四 task-06 / D-005 / FR-09 FR-10）
 *
 * 覆盖验收面：
 *   ① computeEditRatio 纯函数：0 边界/半改写/全改写/插入删除——LCS 行 diff 口径；
 *   ② 阈值触发（0.5 边界两侧）：amend 大改（>50%）→ route_hint:thick 落档+amend 输出提示；
 *      小改（<50%）→ 无 route_hint；
 *   ③ advisory 定案：route_hint=thick + 测绿 → flow done 仍 exit 0（测绿可轻量档过）+醒目打印+遥测记一笔；
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

/** 对 proposal 做比例可控的 amend 改写（v2 纯 markdown：改首版正文行后走 amend 通道——
 *  v2 的 editRatio 对「首版全文↔当前全文」算，基准=ledger.files[].text）。 */
function amendWithRatio(cwd, change, ratio) {
  const p = join(cwd, '.sillyspec', 'changes', change, 'proposal.md')
  const lines = readFileSync(p, 'utf8').split('\n')
  // 可改写行=非 frontmatter/标题/空行（frontmatter 与 #/## 标题不动——改它们是结构破坏非决策改写）
  const editable = []
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim()
    if (!t || t === '---' || t.startsWith('#')) continue
    editable.push(i)
  }
  const nChange = Math.max(1, Math.round(editable.length * ratio))
  for (let i = 0; i < nChange && i < editable.length; i++) lines[editable[i]] = `改写行 ${i}（决策覆盖度测试）`
  writeFileSync(p, lines.join('\n'))
  return spawnSync(process.execPath, [CLI, 'flow', 'amend-draft', '--change', change], { cwd, encoding: 'utf8', timeout: 60_000, env: { ...process.env, SILLYSPEC_WATCHER: '0' } })
}

/** agent 例行动作（双代格式：v2 纯 markdown 正文作答 / v1 AGENT 槽兼容）。 */
function fillDesignSlots(cwd, change) {
  const base = join(cwd, '.sillyspec', 'changes', change)
  const dp = join(base, 'design.md')
  const dText = readFileSync(dp, 'utf8')
  if (/<!--AGENT:槽\d+/.test(dText)) {
    writeFileSync(dp, dText.replace(/(<!--AGENT:槽\d+[^\n]*-->)/g, '$1\n不适用：路由测试夹具——一行作答即合规'))
    writeFileSync(join(base, 'requirements.md'), readFileSync(join(base, 'requirements.md'), 'utf8')
      .replace(/(<!--AGENT:FR区[^\n]*-->)/g, '$1\n### FR-01: 路由测试夹具行为\nGiven 轻量变更在跑\nWhen flow done 执行\nThen 全部子步通过')
      .replace(/(<!--AGENT:测试绑定FR-\d+[^\n]*-->)/g, '$1\n不适用：路由测试夹具——无独立测试面'))
  } else {
    writeFileSync(dp, dText.replace(/^(本变更怎么解决问题|动了哪些函数|1\. 乱序|2\. 并发写|3\. 切换|4\. 作用域|本方案最大的风险)([^\n]*)$/gm, '$&\n不适用：路由测试夹具——一行作答即合规'))
    writeFileSync(join(base, 'requirements.md'), readFileSync(join(base, 'requirements.md'), 'utf8')
      .replace(/^- （待撰写.*$/gm, '- 系统 MUST 达成该条标准行为（路由夹具行为句）')
      .replace(/^FR-\d{2}: （待填.*$/gm, (m) => m.split(':')[0] + ': 不适用：路由测试夹具——无独立测试面'))
  }
}

test('②③ 阈值两侧：大改 route_hint=thick + advisory 测绿轻量过+醒目打印+遥测；小改无 hint', () => {
  const { cwd, cli } = makeRepo('flow:\n  mode: thin\n')
  const change = '2026-09-01-fr-r1'
  // --no-review：本用例测 route 面——大改 amend 的 editRatio 会触发评审必评抢先拦截，声明豁免
  assert.equal(cli(['flow', 'start', '--change', change, '--input', '成功标准：\n- 条件A', '--no-review']).status, 0)
  // 大改（≥0.75 行）→ route_hint
  const big = amendWithRatio(cwd, change, 0.75)
  assert.equal(big.status, 0)
  assert.match(big.stdout + big.stderr, /route_hint: thick/)
  assert.match(big.stdout + big.stderr, /决策覆盖度低/)
  let st = readFileSync(join(cwd, '.sillyspec', 'changes', change, 'flow-state.yaml'), 'utf8')
  assert.match(st, /route_hint: thick/)

  // advisory（缺省）：测绿 → flow done exit 0 + 醒目打印 + 遥测记一笔
  writeFileSync(join(cwd, 'work.js'), 'export const a = 1\n')
  // 全勾硬门夹具配套：token 提交（autopilot 自动勾 task-01）——路由面用例不测任务门
  execFileSync('git', ['add', 'work.js'], { cwd, stdio: 'pipe' })
  execFileSync('git', ['commit', '-q', '-m', 'work (task-01)'], { cwd, stdio: 'pipe' })
  fillDesignSlots(cwd, change)
  assert.equal(cli(['flow', 'approve', '--change', change]).status, 0, 'spec 断点批准')
  const done = cli(['flow', 'done', '--change', change])
  assert.equal(done.status, 0, `advisory 应轻量档过: ${done.stdout}\n${done.stderr}`)
  assert.match(done.stdout + done.stderr, /route_hint: thick/)
  const telemetry = readFileSync(join(cwd, '.sillyspec', '.runtime', 'flow-telemetry.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l))
  const rec = telemetry.find((r) => r.change === change)
  assert.ok(rec && rec.protocolCalls === 2 && rec.routeHint === 'thick' && rec.editRatio > 0.5, `遥测四列记一笔: ${JSON.stringify(rec)}`)
  rmSync(cwd, { recursive: true, force: true })

  // 小改（≤0.25）→ 无 route_hint
  const s2 = makeRepo('flow:\n  mode: thin\n')
  const change2 = '2026-09-01-fr-r2'
  assert.equal(s2.cli(['flow', 'start', '--change', change2, '--input', '成功标准：\n- 条件A']).status, 0)
  const small = amendWithRatio(s2.cwd, change2, 0.25)
  assert.equal(small.status, 0)
  const st2 = readFileSync(join(s2.cwd, '.sillyspec', 'changes', change2, 'flow-state.yaml'), 'utf8')
  assert.doesNotMatch(st2, /route_hint: thick/)
  rmSync(s2.cwd, { recursive: true, force: true })
})

test('④ enforcement=block：route_hint=thick 阻断 flow done exit 1', () => {
  const { cwd, cli } = makeRepo('flow:\n  mode: thin\n  edit_ratio_enforcement: block\n')
  const change = '2026-09-01-fr-b1'
  // --no-review：本用例测 route block 面——editRatio 0.75 会触发评审必评抢先拦截，声明豁免
  assert.equal(cli(['flow', 'start', '--change', change, '--input', '成功标准：\n- 条件A', '--no-review']).status, 0)
  const big = amendWithRatio(cwd, change, 0.75)
  assert.match(big.stdout + big.stderr, /route_hint: thick|edit_ratio_enforcement/)
  writeFileSync(join(cwd, 'work.js'), 'export const a = 1\n')
  // 全勾硬门夹具配套：token 提交（block 档断言的是路由门文案，须先过任务门）
  execFileSync('git', ['add', 'work.js'], { cwd, stdio: 'pipe' })
  execFileSync('git', ['commit', '-q', '-m', 'work (task-01)'], { cwd, stdio: 'pipe' })
  fillDesignSlots(cwd, change)
  assert.equal(cli(['flow', 'approve', '--change', change]).status, 0, 'spec 断点批准')
  const done = cli(['flow', 'done', '--change', change])
  assert.equal(done.status, 1, 'block 档应阻断')
  assert.match(done.stdout + done.stderr, /edit_ratio_enforcement=block/)
  rmSync(cwd, { recursive: true, force: true })
})
