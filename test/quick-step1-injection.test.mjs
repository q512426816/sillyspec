/**
 * quick step1 注入化（刀①，ql-20260908-013-3eb1）。
 *
 * quick step1 原让 agent cat projects/*.yaml、CONVENTIONS.md、_module-map.yaml 挑模块卡
 * ——CLI 已有全部数据（注入先例 {LOCAL_COMMANDS}/{SCAN_FACTS}），改为 CLI 代读注入：
 *   {QUICK_CONTEXT_DIGEST}（buildQuickContextDigest：projects 摘要 + CONVENTIONS 开头）
 *   + 模块上下文匹配注入（outputStep 扩展到 quick 首步，任务描述取 guard.taskDescription）
 * 保留语义出口：任务模糊则问一句；关联变更 design.md / knowledge INDEX 仍可按需读。
 *
 * 覆盖：
 *   digest：项目摘要 + CONVENTIONS 头注入 / 长文截断标注 / 空库降级单行
 *   guard 字段读取：taskDescription 命中 / 缺失回退空串
 *   step1 prompt 结构：含 {QUICK_CONTEXT_DIGEST} 占位、删除 projects/module-map cat 指令、保留模糊提问出口
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { buildQuickContextDigest, readQuickGuardField, loadModuleContextIndex, buildModuleContextInjection } from '../src/run/prompt.js'
import { definition as quickDef } from '../src/stages/quick.js'

function makeSpecBase({ projects = true, conventions = true, conventionsBody = null } = {}) {
  const specBase = mkdtempSync(join(tmpdir(), 'sillyspec-quick-inj-'))
  if (projects) {
    mkdirSync(join(specBase, 'projects'), { recursive: true })
    writeFileSync(join(specBase, 'projects', 'app.yaml'), 'name: app\npath: .\nstatus: active\n')
  }
  if (conventions) {
    const dir = join(specBase, 'docs', 'app', 'scan')
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'CONVENTIONS.md'), conventionsBody || '# 约定\n\n- 全部模块单测走 node:test\n')
  }
  return specBase
}

test('digest：projects 摘要 + CONVENTIONS 开头都注入', () => {
  const specBase = makeSpecBase()
  try {
    const d = buildQuickContextDigest(specBase, 'app')
    assert.ok(d.includes('### 项目登记'), '含项目登记段')
    assert.ok(d.includes('app（.）'), '项目 name/path 摘要行')
    assert.ok(d.includes('### 项目约定'), '含项目约定段')
    assert.ok(d.includes('node:test'), 'CONVENTIONS 内容透传')
  } finally { rmSync(specBase, { recursive: true, force: true }) }
})

test('digest：超长 CONVENTIONS 截断并标注全文路径', () => {
  const specBase = makeSpecBase({ conventionsBody: 'x'.repeat(5000) })
  try {
    const d = buildQuickContextDigest(specBase, 'app')
    assert.ok(d.includes('（截断——全文'), '截断标注在场')
    assert.ok(d.length < 3000, '注入体量受控（不含 5000 字全文）')
  } finally { rmSync(specBase, { recursive: true, force: true }) }
})

test('digest：空库降级单行说明（不抛、不留占位符）', () => {
  const specBase = makeSpecBase({ projects: false, conventions: false })
  try {
    const d = buildQuickContextDigest(specBase, 'app')
    assert.ok(d.includes('无项目登记'), `空库降级文案（实际: ${d}）`)
  } finally { rmSync(specBase, { recursive: true, force: true }) }
})

test('readQuickGuardField：session guard taskDescription 命中', () => {
  const specBase = mkdtempSync(join(tmpdir(), 'sillyspec-quick-guard-'))
  try {
    const dir = join(specBase, '.runtime', 'quick-sessions', 'quick-abcd1234')
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'guard.json'), JSON.stringify({ quicklogId: 'ql-1', taskDescription: '修复登录限流' }))
    assert.equal(readQuickGuardField('quick-abcd1234', specBase, 'taskDescription'), '修复登录限流')
    assert.equal(readQuickGuardField('quick-none9999', specBase, 'taskDescription'), '', '会话不存在 → 空串')
    assert.equal(readQuickGuardField('quick-abcd1234', specBase, 'quicklogId'), 'ql-1', '通用字段读取')
  } finally { rmSync(specBase, { recursive: true, force: true }) }
})

test('step1 prompt 结构：注入占位在场、cat 指令退场、语义出口保留', () => {
  const step1 = quickDef.steps[0]
  assert.equal(step1.name, '理解任务')
  assert.ok(step1.prompt.includes('{QUICK_CONTEXT_DIGEST}'), '含项目上下文注入占位符')
  assert.ok(step1.prompt.includes('{LOCAL_COMMANDS}'), '构建命令注入保留')
  assert.ok(!step1.prompt.includes('cat {SPEC_ROOT}/projects'), 'projects cat 指令已删')
  assert.ok(!step1.prompt.includes('### 模块文档加载'), '模块 map 读取操作段已删')
  assert.ok(step1.prompt.includes('模糊则问一个问题确认'), '语义出口保留（不删成启动横幅）')
  assert.ok(step1.prompt.includes('changes/<c>/design.md'), '关联变更 design.md 按需读保留')
})


// ── FR 活需求注入期 join（ql-20260919-002，L2 替代形态）：buildModuleContextInjection 直驱 ──
test('FR join：匹配模块的活需求行注入（id+标题、截 5、溢出指针、来源注记）', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'frjoin-'))
  try {
    const specBase = join(tmp, '.sillyspec')
    // 造 module-map（两模块：一个有 FR 一个无）
    mkdirSync(join(specBase, 'docs', 'proj', 'modules'), { recursive: true })
    writeFileSync(join(specBase, 'docs', 'proj', 'modules', '_module-map.yaml'),
      'schema_version: 2' + String.fromCharCode(10) + 'modules:' + String.fromCharCode(10) +
      '  core-engine:' + String.fromCharCode(10) + '    status: active' + String.fromCharCode(10) +
      '    doc: modules/core-engine.md' + String.fromCharCode(10) + '    paths: [src/ceremony-tier.js]' + String.fromCharCode(10) +
      '  bare-mod:' + String.fromCharCode(10) + '    status: active' + String.fromCharCode(10) +
      '    doc: modules/bare.md' + String.fromCharCode(10) + '    paths: [src/bare.js]' + String.fromCharCode(10))
    // 造 FR 索引（core-engine 域 7 条 active+1 superseded；bare-mod 域无文件）
    mkdirSync(join(specBase, 'knowledge', 'fr'), { recursive: true })
    const frLines = ['# FR 索引 — core-engine', '']
    for (let i = 1; i <= 7; i++) {
      frLines.push('## FR-core-engine-00' + i + ' 需求' + i)
      frLines.push('变更：2026-09-18-c1')
      frLines.push('状态：active')
      frLines.push('摘要：s' + i)
      frLines.push('')
    }
    frLines.push('## FR-core-engine-008 被取代的')
    frLines.push('变更：2026-09-18-c1')
    frLines.push('状态：superseded')
    frLines.push('superseded_by：2026-09-18-c2')
    frLines.push('')
    writeFileSync(join(specBase, 'knowledge', 'fr', 'core-engine.md'), frLines.join(String.fromCharCode(10)))

    const idx = loadModuleContextIndex(specBase, 'proj')
    const r = buildModuleContextInjection('修改 core-engine 与 bare-mod', idx, specBase, 'proj')
    // 活需求行：前 5 条 id+标题+溢出指针；superseded 不进
    const NL = String.fromCharCode(10)
    const frLine = r.text.split(NL).find(l => l.startsWith('- **活需求**'))
    assert.ok(frLine, '活需求行在场')
    assert.ok(frLine.includes('FR-core-engine-001 需求1'), 'id+标题形态')
    assert.ok(frLine.includes('FR-core-engine-005 需求5'), '截前 5')
    assert.ok(!frLine.includes('需求6；') || frLine.includes('条见'), '第 6 条只以溢出行出现')
    assert.ok(frLine.includes('+2 条见 knowledge/fr/core-engine.md'), '溢出指针行（7 active−5=2）')
    assert.ok(!r.text.includes('被取代的'), 'superseded 不注入')
    // 无 FR 模块空段消隐（bare-mod 段无活需求行）
    const bareSection = r.text.split('#### bare-mod')[1] || ''
    assert.ok(!bareSection.includes('活需求'), '无 FR 模块空段消隐')
    // 来源注记（全局一行）
    assert.ok(r.text.includes('活需求来自 knowledge/fr 索引'), '来源注记在场')
    // frModules 遥测清单：count=7（不含 superseded）
    assert.deepEqual(r.frModules, [{ id: 'core-engine', count: 7 }])
    // 无匹配任务：空 text+空 frModules
    const none = buildModuleContextInjection('完全不相关的任务描述', idx, specBase, 'proj')
    assert.equal(none.text, '')
    assert.deepEqual(none.frModules, [])
  } finally { rmSync(tmp, { recursive: true, force: true }) }
})
