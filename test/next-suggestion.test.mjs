/**
 * _getNextSuggestion 回归测试（stage-machine.js）
 *
 * 锁住反馈②修复：brainstorm 完成后必须推 plan，不能误推 archive。
 * 历史根因：第4步 steps.length>0 要求 + upstream 把 pending 当就绪 → plan/execute/verify
 * 惰性未初始化(steps 空)被跳过，漏到 archive(steps 非空)误推，违反流程顺序。
 */
import { StageMachine } from '../src/progress/stage-machine.js'
import { STAGE_ORDER, emptyStage } from '../src/progress/shared.js'

const sm = new StageMachine({})

/** 按覆盖构造 progress.stages；未列出的阶段取 emptyStage 默认(pending + steps=[]) */
function mk(over) {
  const stages = {}
  for (const s of STAGE_ORDER) {
    stages[s] = { ...emptyStage(), status: over[s]?.status ?? 'pending', steps: over[s]?.steps ?? [] }
  }
  return { stages }
}

const PEND_STEP = { name: 'x', status: 'pending' }
let pass = 0, fail = 0
function check(name, got, want) {
  if (got === want) { pass++; console.log(`  ✅ ${name}`) }
  else { fail++; console.log(`  ❌ ${name}\n     期望: ${want}\n     实际: ${got}`) }
}

console.log('=== _getNextSuggestion：brainstorm 完推 plan，不误推 archive ===\n')

// Case 1: 正常流程 scan+brainstorm 完，plan 未初始化 → 推 plan
{
  const d = mk({ scan: { status: 'completed' }, brainstorm: { status: 'completed' } })
  check('Case1 正常流程 → 推 plan', sm._getNextSuggestion(d)?.command, 'sillyspec run plan')
}

// Case 2（核心回归）: archive 有 steps + plan/execute/verify 未初始化 → 必须推 plan 不推 archive
{
  const d = mk({ scan: { status: 'completed' }, brainstorm: { status: 'completed' }, archive: { steps: [PEND_STEP] } })
  check('Case2 archive 有 steps 也推 plan（不误推 archive）', sm._getNextSuggestion(d)?.command, 'sillyspec run plan')
}

// Case 3: plan 也完成 → 推 execute（即使 execute 未初始化）
{
  const d = mk({ scan: { status: 'completed' }, brainstorm: { status: 'completed' }, plan: { status: 'completed' } })
  check('Case3 plan 完 → 推 execute', sm._getNextSuggestion(d)?.command, 'sillyspec run execute')
}

// Case 4: verify 完，archive 未初始化 → 推 archive（archive 此时是合法下一步）
{
  const d = mk({ scan: { status: 'completed' }, brainstorm: { status: 'completed' }, plan: { status: 'completed' }, execute: { status: 'completed' }, verify: { status: 'completed' } })
  check('Case4 verify 完 → 推 archive', sm._getNextSuggestion(d)?.command, 'sillyspec run archive')
}

// Case plan-c（回归）: scan 未完成（auxiliary 常态）+ brainstorm 完 → 必须推 plan，不推 scan（回头路）
// 历史根因：scan 是 STAGE_ORDER 首位、auxiliary 常未 completed → 恒 upstream 空→就绪→误推 scan。
// 修：_getNextSuggestion 建议循环跳过 scan（prompt-control-debt plan-c）。
{
  const d = mk({ brainstorm: { status: 'completed' } })  // scan 取默认 pending（未 completed）
  check('plan-c: scan 未完成 + brainstorm 完 → 推 plan 不推 scan', sm._getNextSuggestion(d)?.command, 'sillyspec run plan')
}

// Case 5: 全完成（含 archive）→ null（流程结束）
{
  const d = mk({ scan: { status: 'completed' }, brainstorm: { status: 'completed' }, plan: { status: 'completed' }, execute: { status: 'completed' }, verify: { status: 'completed' }, archive: { status: 'completed' } })
  check('Case5 全完成 → null', sm._getNextSuggestion(d)?.command ?? null, null)
}

// Case 6: execute 进行中 + 有 pending step → 推 execute 继续（第3步 in-progress 分支）
{
  const d = mk({ scan: { status: 'completed' }, brainstorm: { status: 'completed' }, plan: { status: 'completed' }, execute: { status: 'in-progress', steps: [PEND_STEP] } })
  check('Case6 execute 进行中 → 继续推 execute', sm._getNextSuggestion(d)?.command, 'sillyspec run execute')
}

// Case 7: brainstorm revising → 第1步优先（revision-v1 已覆盖，这里再守一道）
{
  const d = mk({ scan: { status: 'completed' }, brainstorm: { status: 'revising', revision: 1 }, plan: { status: 'stale' } })
  check('Case7 revising 优先 → 推 brainstorm', sm._getNextSuggestion(d)?.command, 'sillyspec run brainstorm')
}

// Case 8: 中间阶段 pending（非完成）时，后面的阶段绝不被推荐（archive 上游 plan pending → 不推 archive）
{
  const d = mk({ scan: { status: 'completed' }, brainstorm: { status: 'completed' }, plan: { status: 'pending' }, execute: { status: 'pending' }, verify: { status: 'pending' }, archive: { steps: [PEND_STEP] } })
  check('Case8 plan 未完成时 archive 不被推 → 推 plan', sm._getNextSuggestion(d)?.command, 'sillyspec run plan')
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${pass}  ❌ 失败: ${fail}`)
if (fail > 0) process.exit(1)
