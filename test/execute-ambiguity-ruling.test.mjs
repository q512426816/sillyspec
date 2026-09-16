/**
 * execute 歧义裁决权限声明单测（ql-20260917-001，Superpowers v6.3 recorded rulings 采纳⑤剩余）
 *
 * 背景：执行中撞 plan/design 歧义（任务描述与代码现实不符、两任务契约打架、design 未覆盖的
 * 边界情况）原先无分级协议——可控歧义也停人等用户（obra/superpowers v6.3 实测一个会话因
 * controller 可自决的问题停摆 9 小时），或反向静默猜测零记录。
 *
 * 锁死契约（关键词面，钉住两处 prompt 都在位）：
 * 1. 「确认执行范围」步骤 prompt 含完整「歧义裁决权限」段：
 *    - 非破坏性=自行裁决 + decisions.md 新条目（D-xxx@v1 接续编号）+ Wave 完成披露
 *    - 破坏性/不可逆=--wait 停人
 *    - 拿不准按破坏性（fail-closed）+ 重复歧义引用既有条目
 *    - decisions.md 写主仓路径（勿写 worktree 副本——随 cleanup 蒸发）
 * 2. buildWavePrompt 产物含紧凑回呼段（主代理裁决位 + 子代理不自行记 decisions）
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildWavePrompt, buildExecuteSteps } from '../src/stages/execute.js'

let passed = 0
let failed = 0
function assert(cond, msg) {
  if (cond) { console.log(`✅ ${msg}`); passed++ }
  else { console.error(`❌ ${msg}`); failed++ }
}

// ── 场景 1：「确认执行范围」步骤含完整裁决协议 ───────────────────────────────
{
  // definition.steps 为空（动态构建）——buildExecuteSteps(null) 走默认 Wave 兜底，
  // 返回 [fixedPrefix(含确认执行范围), waveSteps, acceptanceSteps, fixedSuffix]
  const allSteps = buildExecuteSteps(null)
  const scopeStep = allSteps.find(s => s.name === '确认执行范围')
  assert(scopeStep !== undefined, '场景1：「确认执行范围」步骤存在')
  const p = scopeStep.prompt
  assert(p.includes('歧义裁决权限'), '场景1：含「歧义裁决权限」段标题')
  assert(p.includes('非破坏性') && p.includes('自行裁决'), '场景1：非破坏性=自行裁决语义在位')
  assert(p.includes('decisions.md'), '场景1：裁决落盘 decisions.md 指引在位')
  assert(p.includes('D-xxx@v1'), '场景1：D-xxx@v1 条目格式指引在位')
  assert(p.includes('接续'), '场景1：编号接续既有最大号指引在位')
  assert(p.includes('披露'), '场景1：Wave 完成输出披露裁决在位')
  assert(p.includes('--wait'), '场景1：破坏性停人走 --wait 在位')
  assert(p.includes('按破坏性处理') || p.includes('按破坏性'), '场景1：拿不准按破坏性（fail-closed）在位')
  assert(p.includes('worktree 副本') || p.includes('勿写 worktree'), '场景1：主仓路径铁律（勿写 worktree 副本）在位')
}

// ── 场景 2：buildWavePrompt 含紧凑回呼 ───────────────────────────────────────
{
  const changeDir = mkdtempSync(join(tmpdir(), 'exec-ruling-'))
  mkdirSync(join(changeDir, 'tasks'), { recursive: true })
  writeFileSync(join(changeDir, 'tasks', 'task-01.md'), '# task-01 测试任务\n\n实现示例功能。\n')
  const wave = { index: 0, tasks: [{ name: 'task-01 测试任务', file: 'tasks/task-01.md' }] }
  const wp = buildWavePrompt(wave, 1, changeDir, join(changeDir, 'wt'), {})
  assert(typeof wp === 'string' && wp.length > 0, '场景2：wave prompt 生成成功')
  assert(wp.includes('歧义裁决'), '场景2：含「歧义裁决」回呼段')
  assert(wp.includes('非破坏性') && wp.includes('decisions.md'), '场景2：非破坏性裁决+落盘位在位')
  assert(wp.includes('--wait'), '场景2：破坏性停人在位')
  assert(wp.includes('子代理') && wp.includes('不自行'), '场景2：子代理不自行记 decisions（裁决归主代理）在位')
  rmSync(changeDir, { recursive: true, force: true })
}

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
