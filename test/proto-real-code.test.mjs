/**
 * proto-real-code.test.mjs — 定稿原型＝真码产物（2026-10-13-proto-real-code）
 *
 * 根因：brainstorm「生成要求」字面指令手绘单文件（内联 CSS+JS），与 ui-visual.js flow start
 * 须知（定稿必须真码、手绘仅粗选——frontend-apple-style 实证）相反；步骤 prompt 在场胜过
 * advisory，产出手搓假 HTML。本测试锁：
 *   ① brainstorm 生成要求真码五要素 + 旧手绘指令文案移除；
 *   ② explore 粗选定位 + 交接升级行；
 *   ③ design-facts 自审清单真码口径；
 *   ④ brainstorm prompt 与 buildUiGuidanceLines 共享关键词（真码/粗选/工具链）——两处规则源
 *      锁成同源，任一侧漂移即红（防复潮关键断言）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { definition as brainstormDef } from '../src/stages/brainstorm.js'
import { definition as exploreDef } from '../src/stages/explore.js'
import { generateDesignSkeleton } from '../src/design-facts.js'
import { buildUiGuidanceLines } from '../src/ui-visual.js'

const showStep = brainstormDef.steps.find(s => (s.prompt || '').includes('HTML 原型分级'))
assert.ok(showStep, 'brainstorm 应有含「HTML 原型分级」的步骤')
const prompt = showStep.prompt || ''
const genIdx = prompt.indexOf('### 生成要求')
assert.ok(genIdx > 0, '生成要求节在场')
const ironIdx = prompt.indexOf('### 铁律', genIdx)
assert.ok(ironIdx > genIdx, '生成要求节后有铁律节可界定边界')
const genTier = prompt.slice(genIdx, ironIdx)

const exploreStep = exploreDef.steps[0]
const explorePrompt = (exploreStep && exploreStep.prompt) || ''

test('① brainstorm 生成要求＝真码五要素在场', () => {
  assert.ok(genTier.includes('真码'), '定稿原型＝真码产物口径在场')
  assert.ok(genTier.includes('同方言'), '要素①同方言在场')
  assert.ok(genTier.includes('node_modules') && /不手搓仿制样式/.test(genTier), '要素①真实引入+禁手搓在场')
  assert.ok(genTier.includes('可复跑') && genTier.includes('工具链'), '要素②可复跑+工具链在场')
  assert.ok(genTier.includes('原型管线') || genTier.includes('管线'), '要素②就近发现管线在场')
  assert.ok(/手绘单文件.*仅限一次性粗选对比/.test(genTier), '要素③手绘仅粗选在场')
  assert.ok(genTier.includes('frontend-apple-style'), '要素③实证锚在场')
  assert.ok(/单文件 HTML 方言|纯静态站/.test(genTier), '要素④单文件方言例外在场')
  assert.ok(/降级.*用户裁决|用户裁决留痕/.test(genTier) && genTier.includes('UI 视觉证据'), '要素⑤降级裁决出路+探针对齐在场')
  assert.ok(genTier.includes('prototype-<名称>.html'), '入口命名契约（execute 注入）保留')
})

test('① 旧手绘指令文案已从 brainstorm 移除', () => {
  assert.ok(!prompt.includes('生成一个独立的 HTML 文件'), '旧指令「生成一个独立的 HTML 文件」须移除')
  assert.ok(!prompt.includes('内联 CSS + JS'), '旧指令「内联 CSS + JS」须移除（brainstorm 定稿面不再手绘）')
  assert.ok(!/^- 单文件，浏览器直接打开$/m.test(prompt), '旧定稿要求「单文件，浏览器直接打开」须移除')
})

test('② explore 粗选定位与交接升级行在场', () => {
  assert.ok(explorePrompt.includes('粗选对比件'), '探索期原型定位为粗选对比件')
  assert.ok(/手绘单文件.*探索期合法/.test(explorePrompt) || /探索期合法.*手绘/.test(explorePrompt), '手绘在探索期合法（显式声明）')
  assert.ok(/手绘粗选件只是方向输入/.test(explorePrompt), '交接行：手绘粗选件只是方向输入')
  assert.ok(/升级为真码/.test(explorePrompt), '交接行：定稿须升级为真码')
  assert.ok(/不得把手绘件直接当定稿登记/.test(explorePrompt), '交接行：禁止手绘件直接当定稿登记')
  assert.ok(explorePrompt.includes('prototype-<名称>.html') && explorePrompt.includes('登记复用'), '真码交接仍走登记复用+命名契约')
})

test('③ design-facts 自审清单真码口径在场', () => {
  const skeleton = generateDesignSkeleton({ changeName: '2026-10-13-x' })
  assert.ok(/定稿＝与实现同方言的真码产物/.test(skeleton), '清单项含「定稿＝真码同方言」')
  assert.ok(/手绘仅限粗选/.test(skeleton), '清单项含「手绘仅限粗选」')
  assert.ok(/prototype-\*\.html/.test(skeleton), '清单项保留 prototype-*.html 命名锚（注入契约不动）')
})

test('④ 同源锁：brainstorm 生成要求与 ui-visual 须知共享关键词（防两规则源再漂移）', () => {
  const guidance = buildUiGuidanceLines().join('\n')
  for (const kw of ['真码', '粗选', '工具链', '同方言']) {
    assert.ok(genTier.includes(kw), `brainstorm 生成要求须含「${kw}」`)
    assert.ok(guidance.includes(kw), `ui-visual 须知须含「${kw}」——两侧口径同源，缺一侧即漂移`)
  }
  assert.ok(guidance.includes('frontend-apple-style') && genTier.includes('frontend-apple-style'),
    '两侧引同一实证锚（frontend-apple-style）')
})
