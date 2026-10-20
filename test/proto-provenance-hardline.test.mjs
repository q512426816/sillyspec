/**
 * proto-provenance-hardline.test.mjs — 原型产物溯源硬边界（2026-10-20-proto-provenance-hardline）
 *
 * dsh 会话 sess_a6c2804d 实证：agent 读过真码五要素并走过管线后，视觉稿轨道仍手写 HTML
 * 直接交付（23KB 手写 CSS+截图抄 hex），v2 自创 SSR 捕获旁门——粗选豁免边界松+管线撑不起
 * 页面级时无指引。用户裁决：平台仓不应单独做事，一切由工具引导驾驭。本测试锁：
 *   ① 生成要求四要素锚：三通道/手写禁令/对比稿即定稿无豁免/现状须捕获；
 *   ② 三处声明面同步（ui-visual 须知/design-facts 清单/gates 软提醒）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { definition as brainstormDef } from '../src/stages/brainstorm.js'
import { buildUiGuidanceLines } from '../src/ui-visual.js'
import { generateDesignSkeleton } from '../src/design-facts.js'

const ROOT = join(fileURLToPath(import.meta.url), '..')
const showStep = brainstormDef.steps.find(s => (s.prompt || '').includes('HTML 原型分级'))
assert.ok(showStep, 'brainstorm 原型分级步在场')
const prompt = showStep.prompt || ''
const genIdx = prompt.indexOf('### 生成要求')
const genTier = prompt.slice(genIdx, prompt.indexOf('### 铁律', genIdx))

test('① 生成要求四要素锚', () => {
  assert.ok(genTier.includes('产物必须可溯源到源码（三通道，手写 HTML 无合法出口）'), '硬边界标题+手写禁令在场')
  assert.ok(/①本仓原型管线的编译产物/.test(genTier) && /②项目真实运行面的渲染捕获产物/.test(genTier) && /③登记复用的既有真码原型/.test(genTier), '三通道枚举齐')
  assert.ok(genTier.includes('捕获脚本可随变更交付，捕获物仍是渲染结果，禁手改'), '通道②捕获物禁手改')
  assert.ok(/对比稿\/视觉稿同样适用：凡供用户评审决策的原型即定稿提案，无粗选豁免/.test(genTier), '对比稿即定稿无豁免')
  assert.ok(genTier.includes('禁止凭主题默认值想象现状、禁止手写复刻现状'), '现状基线须捕获/截图')
  assert.ok(genTier.includes('2026-10-20 dsh 会话实证'), '实证锚在场')
})

test('② ui-visual 须知同步（含既有关键词回归）', () => {
  const text = buildUiGuidanceLines().join('\n')
  assert.ok(text.includes('可溯源到源码') && text.includes('三通道'), '须知含溯源三通道')
  assert.ok(text.includes('手写 HTML') && text.includes('无合法出口'), '须知含手写禁令')
  assert.ok(text.includes('供用户决策即定稿，无粗选豁免'), '须知含对比稿边界')
  assert.ok(text.includes('禁止凭主题默认值想象现状'), '须知含现状捕获要求')
  // 既有关键词回归（guidance-output-neutrality 契约面）
  for (const key of ['真码产物', '就近发现', '仅限一次性粗选', '用户裁决', '边改边渲染对照']) {
    assert.ok(text.includes(key), `须知缺既有关键词：${key}`)
  }
})

test('② design-facts 清单与 gates 软提醒同步', () => {
  const skeleton = generateDesignSkeleton({ changeName: '2026-10-20-x' })
  assert.ok(/可溯源到源码（管线编译\/真实渲染捕获\/登记复用三通道）/.test(skeleton), '清单含三通道')
  assert.ok(/手写 HTML 不得交付，对比稿供用户决策即定稿/.test(skeleton), '清单含禁令+对比稿边界')
  const gates = readFileSync(join(ROOT, '..', 'src', 'run', 'gates.js'), 'utf8')
  assert.ok(/产物须可溯源到源码（管线编译\/真实渲染捕获\/登记复用），手写 HTML 不得交付/.test(gates), 'gates 软提醒同步')
})
