import assert from 'node:assert/strict'
import { definition as brainstormAutoDef } from '../src/stages/brainstorm-auto.js'

// B1（multi-agent-review-2026-08-08）：brainstorm-auto Step2「需求分析与方案设计」
// 的 prompt 明确「目标明确→跳过追问，直接进入方案设计」「checklist 全 ✅ → AUTO_DECIDED」，
// 这两条路径 AI 无需追问、必须能直接 --done。故元数据须 conditionalWait（非 requiresWait）——
// requiresWait 会触发 CLI 硬门强制 --answer，逼 AI 伪造回答（Grill 第三病）。
const step2 = brainstormAutoDef.steps.find(s => s.name === '需求分析与方案设计')
assert.ok(step2, 'brainstorm-auto 应有「需求分析与方案设计」步骤')

assert.equal(step2.requiresWait, undefined, 'B1: Step2 不得 requiresWait（与「跳过追问」硬冲突）')
assert.equal(step2.conditionalWait, true, 'B1: Step2 须 conditionalWait（让无需追问路径直接 --done）')
// repeatableWait / maxWaitRounds 保留（真正需要追问时仍可多轮）
assert.equal(step2.repeatableWait, true, 'B1: Step2 保留 repeatableWait')
assert.equal(step2.maxWaitRounds, 5, 'B1: Step2 保留 maxWaitRounds=5')

// 末步「生成规范文件」仍应是 requiresWait（用户最终确认是真硬门，不变）
const lastStep = brainstormAutoDef.steps[brainstormAutoDef.steps.length - 1]
assert.equal(lastStep.requiresWait, true, 'B1: 末步「生成规范文件」保留 requiresWait（最终确认硬门）')

console.log('✅ B1: brainstorm-auto Step2 conditionalWait regression check passed')
