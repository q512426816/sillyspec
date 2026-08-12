import assert from 'node:assert/strict'
import { definition as brainstormAutoDef } from '../src/stages/brainstorm-auto.js'

// B1（multi-agent-review-2026-08-08）：brainstorm-auto Step2「需求分析与方案设计」
// 的 prompt 明确「目标明确→跳过追问，直接进入方案设计」「checklist 全 ✅ → AUTO_DECIDED」，
// 这两条路径 AI 无需追问、必须能直接 --done。故元数据须 conditionalWait（非 requiresWait）——
// requiresWait 会触发 CLI 硬门强制 --answer，逼 AI 伪造回答（Grill 第三病）。

// === 行为测试：step2 必须能不经 --answer 直接 --done ===
// conditionalWait 的语义：AI 满足 prompt 中声明的条件时，--done 直接通过（不需 --answer）。
// requiresWait 的语义：--done 必须有 --answer，否则 CLI 硬拦。
// 本测试不仅锁元数据字段，也锁 prompt 中的行为指引文本——这是 AI 读到并据此行动的契约。
const step2 = brainstormAutoDef.steps.find(s => s.name === '需求分析与方案设计')
assert.ok(step2, 'brainstorm-auto 应有「需求分析与方案设计」步骤')

// 元数据契约
assert.equal(step2.requiresWait, undefined, 'B1: Step2 不得 requiresWait（与「跳过追问」硬冲突）')
assert.equal(step2.conditionalWait, true, 'B1: Step2 须 conditionalWait（让无需追问路径直接 --done）')
assert.equal(step2.repeatableWait, true, 'B1: Step2 保留 repeatableWait（需追问时仍可多轮）')
assert.equal(step2.maxWaitRounds, 5, 'B1: Step2 保留 maxWaitRounds=5')

// prompt 行为契约：conditionalWait 的 prompt 必须包含 --done 可直接通过的指引，
// 不能有 "必须 --answer" 的硬性要求（那是 requiresWait 才有的语义）
const prompt = step2.prompt || ''
assert.ok(prompt.length > 0, 'B1: Step2 有 prompt 文本')
assert.ok(
  prompt.includes('AUTO_DECIDED') || prompt.includes('跳过追问') || prompt.includes('直接'),
  'B1: Step2 prompt 含条件直达指引（AUTO_DECIDED / 跳过追问 / 直接）——AI 据此知道何时可直接 --done'
)
// 不应出现 requiresWait 才有的硬门措辞
assert.ok(
  !prompt.includes('必须提供 --answer') && !prompt.includes('必须 --answer'),
  'B1: Step2 prompt 不含 requiresWait 硬门措辞（"必须 --answer"），避免 AI 误解'
)

// 末步「生成规范文件」仍应是 requiresWait（用户最终确认是真硬门，不变）
const lastStep = brainstormAutoDef.steps[brainstormAutoDef.steps.length - 1]
assert.equal(lastStep.requiresWait, true, 'B1: 末步「生成规范文件」保留 requiresWait（最终确认硬门）')
// 末步 prompt 应有明确的 --answer 要求（requiresWait 行为契约）
const lastPrompt = lastStep.prompt || ''
assert.ok(
  lastPrompt.includes('--answer') || lastPrompt.includes('确认'),
  'B1: 末步 prompt 含确认要求（--answer / 确认）——requiresWait 行为契约'
)

console.log('✅ B1: brainstorm-auto Step2 conditionalWait regression check passed')
