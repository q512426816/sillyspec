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
import { buildQuickContextDigest, readQuickGuardField } from '../src/run/prompt.js'
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
