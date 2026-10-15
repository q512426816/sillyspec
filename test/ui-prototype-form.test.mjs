/**
 * ui-prototype-form.test.mjs — 每仓原型形态契约（2026-10-15-ui-proto-form-config）
 *
 * 四例原型形态偏档（fire-equipment/deploy-release-notes/knowledge-search/server-logs-panel）
 * 后用户四点裁决落地：local.yaml ui_prototype 每仓登记 + 工具三层引导。锁：
 *   ① readUiPrototypeForm 五态解析（缺席/真码/完整豁免/缺字段豁免/repos override）；
 *   ② resolveUiPrototypeFor 子仓 override 按触达路径优先、仓级兜底；
 *   ③ buildUiGuidanceLines 四态注入 + 无参兼容（specBase=null 零新增）+ 生态命令词禁入；
 *   ④ brainstorm 生成要求四句锚（抄值≠引入/历史先例不构成管线/单开轻量变更/来源声明必填）
 *      + design-facts/gates 同步锚。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { readUiPrototypeForm, resolveUiPrototypeFor, buildUiGuidanceLines } from '../src/ui-visual.js'
import { definition as brainstormDef } from '../src/stages/brainstorm.js'
import { generateDesignSkeleton } from '../src/design-facts.js'

function makeSpecRoot(yaml = '') {
  const root = mkdtempSync(join(tmpdir(), 'uipf-'))
  mkdirSync(join(root, '.sillyspec'), { recursive: true })
  if (yaml) writeFileSync(join(root, '.sillyspec', 'local.yaml'), yaml)
  return { root, specBase: join(root, '.sillyspec') }
}

const showStep = brainstormDef.steps.find(s => (s.prompt || '').includes('HTML 原型分级'))
assert.ok(showStep, 'brainstorm 原型分级步在场')
const prompt = showStep.prompt || ''
const genIdx = prompt.indexOf('### 生成要求')
const genTier = prompt.slice(genIdx, prompt.indexOf('### 铁律', genIdx))

test('① readUiPrototypeForm 五态', () => {
  // 态1：段缺席
  const a = makeSpecRoot('project:\n  type: generic\n')
  assert.equal(readUiPrototypeForm(a.specBase).registered, false, '段缺席 → registered=false')
  // 态2：真码登记
  const b = makeSpecRoot('ui_prototype:\n  form: real-code\n')
  const rb = readUiPrototypeForm(b.specBase)
  assert.equal(rb.registered && rb.form, 'real-code', 'form=real-code 登记')
  // 态3：完整豁免
  const c = makeSpecRoot('ui_prototype:\n  form: single-html\n  ruling:\n    by: qinyi\n    at: 2026-10-15\n    reason: 本仓暂无真码原型管线，接受复刻形态\n')
  const rc = readUiPrototypeForm(c.specBase)
  assert.equal(rc.form, 'single-html') && assert.equal(rc.rulingComplete, true, '豁免 ruling 全三字段 → complete')
  // 态4：豁免缺字段
  const d = makeSpecRoot('ui_prototype:\n  form: single-html\n  ruling:\n    by: qinyi\n')
  assert.equal(readUiPrototypeForm(d.specBase).rulingComplete, false, 'ruling 缺 at/reason → incomplete')
  // 态5：repos override 同构
  const e = makeSpecRoot('ui_prototype:\n  form: real-code\n  repos:\n    spdemo:\n      form: single-html\n      ruling:\n        by: qinyi\n        at: 2026-10-15\n        reason: 小程序无 HTML 面\n')
  const re = readUiPrototypeForm(e.specBase)
  assert.equal(re.repos.spdemo.form, 'single-html', '子仓 override 解析')
  assert.equal(re.repos.spdemo.rulingComplete, true, '子仓 ruling 同构校验')
  // 坏 YAML fail-soft
  const f = makeSpecRoot('ui_prototype: [broken\n')
  assert.equal(readUiPrototypeForm(f.specBase).registered, false, '坏 YAML 零抛出 → registered=false')
  for (const r of [a, b, c, d, e, f]) rmSync(r.root, { recursive: true, force: true })
})

test('② resolveUiPrototypeFor 子仓优先、仓级兜底', () => {
  const root = mkdtempSync(join(tmpdir(), 'uipf-r-'))
  const specBase = join(root, '.sillyspec')
  mkdirSync(specBase, { recursive: true })
  const subA = join(root, 'subA'); const subB = join(root, 'subB')
  mkdirSync(subA); mkdirSync(subB)
  writeFileSync(join(specBase, 'local.yaml'), [
    'repos:',
    `  suba: ${subA.replace(/\\/g, '/')}`,
    `  subb: ${subB.replace(/\\/g, '/')}`,
    'ui_prototype:',
    '  form: real-code',
    '  repos:',
    '    suba:',
    '      form: single-html',
    '      ruling: { by: qinyi, at: 2026-10-15, reason: 无 HTML 面 }',
  ].join('\n'))
  // 触达 subA → override 生效 + 仓级兜底不重复
  const r1 = resolveUiPrototypeFor(specBase, [join(subA, 'src', 'page.tsx')])
  assert.equal(r1[0].scope, 'suba', '子仓 override 优先排首')
  assert.equal(r1[0].form, 'single-html')
  // 触达 subB（无 override）→ 仓级兜底
  const r2 = resolveUiPrototypeFor(specBase, [join(subB, 'index.js')])
  assert.equal(r2.length, 1) && assert.equal(r2[0].scope, '仓级', '无 override 子仓 → 仓级兜底')
  // 无路径 → 仓级
  const r3 = resolveUiPrototypeFor(specBase, [])
  assert.equal(r3[0].scope, '仓级')
  rmSync(root, { recursive: true, force: true })
})

test('③ buildUiGuidanceLines 四态注入 + 无参兼容', () => {
  // 无参：零形态节（与原版逐字等价——前 11 行不含 📐）
  const noArg = buildUiGuidanceLines()
  assert.equal(noArg.filter(l => l.includes('📐')).length, 0, 'specBase=null 零新增形态行')
  assert.ok(noArg[0].includes('UI 变更执行须知'), '既有四条须知保留')
  // 态：real-code
  const rc = makeSpecRoot('ui_prototype:\n  form: real-code\n')
  const lrc = buildUiGuidanceLines(rc.specBase).join('\n')
  assert.ok(lrc.includes('真码契约（real-code）') && lrc.includes('单开轻量变更搭最小入口'), '真码契约行+bootstrap 指引')
  // 态：完整豁免
  const ex = makeSpecRoot('ui_prototype:\n  form: single-html\n  ruling:\n    by: qinyi\n    at: 2026-10-15\n    reason: r\n')
  const lex = buildUiGuidanceLines(ex.specBase).join('\n')
  assert.ok(lex.includes('豁免生效') && lex.includes('by=qinyi') && lex.includes('真值 token'), '豁免生效行含裁决摘要与来源声明要求')
  // 态：豁免缺 ruling
  const bad = makeSpecRoot('ui_prototype:\n  form: single-html\n  ruling:\n    by: qinyi\n')
  const lbad = buildUiGuidanceLines(bad.specBase).join('\n')
  assert.ok(lbad.includes('豁免登记不完整') && lbad.includes('静默漂移'), '缺 ruling 警告')
  // 态：未登记强提醒
  const un = makeSpecRoot('project:\n  type: generic\n')
  const lun = buildUiGuidanceLines(un.specBase).join('\n')
  assert.ok(lun.includes('未登记原型形态') && lun.includes('阶梯') && lun.includes('收口前') && lun.includes('强提醒'), '未登记强提醒四关键词')
  // 生态命令词禁入（guidance-output-neutrality 契约面）
  const ECOSYSTEM_RE = /(pnpm|yarn|npx|npm\s+run|gradle|mvn|maven|pip\s+install|cargo\s+(build|run)|go\s+run|dotnet\s+build)\b/i
  for (const l of [lrc, lex, lbad, lun]) {
    assert.equal(ECOSYSTEM_RE.test(l), false, `形态行含生态命令词：${l.match(ECOSYSTEM_RE)?.[0]}`)
  }
  for (const r of [rc, ex, bad, un]) rmSync(r.root, { recursive: true, force: true })
})

test('④ brainstorm 生成要求四句锚 + 声明面同步', () => {
  assert.ok(/复刻≠引入，仍属手搓仿制/.test(genTier), '锚1：token 抄值=复刻≠引入')
  assert.ok(/历史原型先例同为单文件不构成管线存在/.test(genTier), '锚2：历史先例不构成管线')
  assert.ok(/单开一个轻量变更搭最小入口/.test(genTier), '锚3：bootstrap 单开轻量变更')
  assert.ok(/素材来源声明/.test(genTier) && /token 源文件路径/.test(genTier), '锚4：来源声明必填')
  assert.ok(/ui_prototype/.test(genTier) && /repos override 优先/.test(genTier), '登记优先于默认阶梯')
  assert.ok(/不是「看起来像」/.test(genTier), '高保真措辞防滑移')
  const skeleton = generateDesignSkeleton({ changeName: '2026-10-15-x' })
  assert.ok(/素材来源声明/.test(skeleton) && /ui_prototype 登记的，收口前补登记/.test(skeleton), 'design-facts 清单同步')
})

test('④ gates 软提醒文案含登记指引（源锚）', async () => {
  const { readFileSync } = await import('node:fs')
  const src = readFileSync(join(import.meta.dirname, '..', 'src', 'run', 'gates.js'), 'utf8')
  assert.ok(/ui_prototype 登记的，收口前补登记/.test(src), 'gates 软提醒含补登记指引')
})
