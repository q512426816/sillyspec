/**
 * 自维护税治理字段链（change: 2026-09-15-tax-governance，FR-01，D-001@v1）：
 * 「故障面/退役判据」决策字段——distill 双触点（applyField case + FIELD_LABEL_RE 白名单）
 * 解析并携带渲染进 knowledge/decisions，stage-contract 对 architecture+accepted 缺字段
 * 条目打软警告不阻断（gate 侧经 warnings 通道打印）。
 *
 * 锁定验收（task-01 五面）：
 *   1. 双 case 解析——标题式 `- 故障面：F` 字段行与扁平式行内 ｜ 分段均进
 *      entry.failureMode/entry.retireWhen；白名单外标签不进字段（对照：白名单未收录的
 *      标签永远留 raw、扁平式分段漏进标题）
 *   2. renderBlockLines 携带渲染（AC-2 机器验收）——含字段条目蒸馏输出含「故障面：」「退役判据：」
 *      精确行；无字段条目不出现两行（存量零迁移、幂等重归档不添空行）
 *   3. 软警告三分支——architecture+accepted 缺字段 warning（含条目 ID 与存量可忽略指引、
 *      不产生 error）；definition 缺字段不警告；补齐两字段不警告
 *   4. 行序红线——「锚点：」行后紧跟「文件：」行不被新行打断（decision-file-field.test 断言）
 *   5. plan 阶段 gate 同款软警告（validatePlanOutputs 复用解析先例）
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { parseDecisions, distillIntoKnowledge } from '../src/decision-distill.js'
import { runValidators } from '../src/stage-contract.js'

const tmpRoots = []
function mk(p) { const d = mkdtempSync(join(tmpdir(), p)); tmpRoots.push(d); return d }
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

/** 固定变更名建 change 目录（basename 即变更名，渲染「变更：」行内容确定） */
function mkChange(name, decisionsMd) {
  const root = mk('tgf-')
  const changeDir = join(root, name)
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(changeDir, 'decisions.md'), decisionsMd)
  return changeDir
}

/** 建本地模式 .sillyspec/changes/<name> 变更目录（runValidators 的 cwd 布局） */
function mkSpecChange(name, decisionsMd, extra = {}) {
  const root = mk('tgf-spec-')
  const changeDir = join(root, '.sillyspec', 'changes', name)
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(changeDir, 'decisions.md'), decisionsMd)
  for (const [file, content] of Object.entries(extra)) {
    writeFileSync(join(changeDir, file), content)
  }
  return { root, changeDir }
}

test('验收1：双 case 解析——标题式字段行与扁平式 ｜ 分段均进 failureMode/retireWhen；白名单外标签不进字段', () => {
  const md = [
    '# 决策记录（Decisions）',
    '',
    '## D-001@v1 新机制引入治理字段',
    '- type: architecture',
    '- status: accepted',
    '- answer: 落地故障面与退役判据字段',
    '- 故障面: 归档模板多两行导致 agent 抄写出错',
    '- 退役判据: 两个观测周期内字段覆盖率持续为零',
    '',
    '- D-002@v1 扁平式条目 ｜ 类型：architecture ｜ 状态：accepted ｜ 故障面：F-flat ｜ 退役判据：R-flat',
    '  - 未知标签：白名单外不进字段',
    '',
  ].join('\n') + '\n'
  const r = parseDecisions(mkChange('feat-fields', md))

  // 标题式：半角冒号字段行（模板同款格式）
  const d1 = r.entries.find(x => x.number === 'D-001')
  assert.ok(d1, '标题式条目可解析')
  assert.equal(d1.type, 'architecture')
  assert.equal(d1.failureMode, '归档模板多两行导致 agent 抄写出错', '故障面进 entry.failureMode')
  assert.equal(d1.retireWhen, '两个观测周期内字段覆盖率持续为零', '退役判据进 entry.retireWhen')

  // 扁平式：行内 ｜ 分段 + 缩进子项（FIELD_LABEL_RE 白名单命中面）
  const d2 = r.entries.find(x => x.number === 'D-002')
  assert.ok(d2, '扁平式条目可解析')
  assert.equal(d2.type, 'architecture', '行内分段字段命中白名单')
  assert.equal(d2.status, 'accepted')
  assert.equal(d2.failureMode, 'F-flat', '行内故障面分段进字段（白名单命中）')
  assert.equal(d2.retireWhen, 'R-flat', '行内退役判据分段进字段（白名单命中）')
  assert.equal(d2.title, '扁平式条目', '白名单命中的分段不漏进标题（不扩白名单则整段漏进标题）')

  // 对照：白名单外标签（未知标签）不进字段——FIELD_LABEL_RE 未收录的标签永远留 raw
  assert.ok(!('未知标签' in d2), '白名单外标签不成为条目字段')
  assert.equal(d2.unknown, undefined)
})

test('验收2（AC-2）：含字段条目蒸馏输出含「故障面：」「退役判据：」精确行；无字段条目不出现两行；幂等重跑字节稳定', () => {
  const md = [
    '## D-001@v1 字段链机制',
    '- type: architecture',
    '- status: accepted',
    '- answer: 携带治理字段',
    '- 故障面：软警告长期被无视导致覆盖率不涨',
    '- 退役判据：一个观测周期后按棘轮评估升级或删除',
    '',
    '## D-002@v1 存量条目',
    '- type: architecture',
    '- status: accepted',
    '- answer: 无治理字段',
    '',
  ].join('\n') + '\n'
  const changeDir = mkChange('feat-render', md)
  const k = mk('tgf-k1-')
  distillIntoKnowledge(changeDir, k, 'deadbeef')
  const content = readFileSync(join(k, 'decisions', 'unmapped.md'), 'utf8')

  assert.ok(content.includes('\n故障面：软警告长期被无视导致覆盖率不涨\n'), '输出含精确「故障面：」行')
  assert.ok(content.includes('\n退役判据：一个观测周期后按棘轮评估升级或删除\n'), '输出含精确「退役判据：」行')

  // 无字段条目：两行均不出现（仅非空渲染，存量零迁移）
  const d002Block = content.slice(content.indexOf('## D-002@v1'))
  assert.ok(!d002Block.includes('故障面：'), '存量条目无故障面行')
  assert.ok(!d002Block.includes('退役判据：'), '存量条目无退役判据行')

  // 幂等重跑：不添空行、字节级一致
  distillIntoKnowledge(changeDir, k, 'deadbeef')
  const content2 = readFileSync(join(k, 'decisions', 'unmapped.md'), 'utf8')
  assert.equal((content2.match(/^故障面：/gm) || []).length, 1, '重跑仍恰一行故障面行')
  assert.equal((content2.match(/^退役判据：/gm) || []).length, 1, '重跑仍恰一行退役判据行')
  assert.equal(content2, content, '二次归档字节级一致')
})

test('验收4（行序红线）：「文件：」行仍紧跟「锚点：」行；新行落在「理由：」之后不阻断', () => {
  const md = [
    '## D-001@v1 文件与治理字段并存',
    '- type: architecture',
    '- status: accepted',
    '- answer: 同时携带文件字段与治理字段',
    '- 锚点：src/stages/brainstorm.js:166',
    '- 文件：src/a.js, src/b.js',
    '- 故障面：并存时行序可能被扰动',
    '- 退役判据：行序断言全绿后可简化本用例',
    '',
  ].join('\n') + '\n'
  const changeDir = mkChange('feat-order', md)
  const k = mk('tgf-k2-')
  distillIntoKnowledge(changeDir, k, 'deadbeef')
  const lines = readFileSync(join(k, 'decisions', 'unmapped.md'), 'utf8').split('\n')

  const anchorIdx = lines.indexOf('锚点：src/stages/brainstorm.js:166')
  const filesIdx = lines.indexOf('文件：src/a.js, src/b.js')
  assert.ok(anchorIdx > -1, '锚点行存在')
  assert.ok(filesIdx > -1, '文件行存在')
  assert.equal(filesIdx, anchorIdx + 1, '文件行紧跟锚点行（decision-file-field.test 行序断言不可扰动）')

  const reasonIdx = lines.findIndex(l => l.startsWith('理由：'))
  const failIdx = lines.indexOf('故障面：并存时行序可能被扰动')
  const retireIdx = lines.indexOf('退役判据：行序断言全绿后可简化本用例')
  assert.ok(failIdx > reasonIdx && retireIdx > reasonIdx, '两新行落在「理由：」行之后')
  assert.ok(failIdx > filesIdx && retireIdx > filesIdx, '新行不落在锚点行与文件行之间')
})

test('验收3：软警告三分支——architecture+accepted 缺字段 warning 含条目 ID 不产生 error；definition 不警告；补齐不警告', () => {
  const md = [
    '# 决策记录（Decisions）',
    '',
    '## D-001@v1 字段链机制',
    '- type: architecture',
    '- status: accepted',
    '- priority: P1',
    '',
    '## D-002@v1 术语裁决',
    '- type: definition',
    '- status: accepted',
    '- priority: P2',
    '',
    '## D-003@v1 补齐治理字段条目',
    '- type: architecture',
    '- status: accepted',
    '- priority: P1',
    '- 故障面: F',
    '- 退役判据: R',
    '',
  ].join('\n') + '\n'
  const { root } = mkSpecChange('2026-09-15-gate', md)
  const r = runValidators('brainstorm', root, '2026-09-15-gate')

  const gov = r.warnings.filter(w => w.includes('故障面/退役判据'))
  assert.equal(gov.length, 1, `恰一条治理软警告（实际 warnings: ${JSON.stringify(r.warnings)}）`)
  assert.ok(gov[0].includes('D-001@V1'), '警告含条目 ID')
  assert.ok(gov[0].includes('（architecture）'), '警告标注条目类型')
  assert.ok(gov[0].includes('存量条目可忽略'), '文案含存量可忽略、新决策建议补齐修复指引')
  assert.ok(!r.errors.some(e => e.includes('故障面') || e.includes('退役判据')), '缺字段只 warning 不产生 error（不阻断）')

  assert.ok(!gov.some(w => w.includes('D-002@V1')), 'definition 条目缺字段不警告')
  assert.ok(!gov.some(w => w.includes('D-003@V1')), 'architecture+accepted 补齐两字段不警告')
})

test('验收5：plan 阶段 gate 同款软警告（validatePlanOutputs 复用 decisions 解析先例）', () => {
  const md = [
    '# 决策记录（Decisions）',
    '',
    '## D-001@v1 plan 侧字段链',
    '- type: architecture',
    '- status: accepted',
    '- priority: P1',
    '',
  ].join('\n') + '\n'
  const { root } = mkSpecChange('2026-09-15-plan-gate', md, { 'plan.md': '# 计划\n\n## 实现路径\n- task-01: 实现\n' })
  const r = runValidators('plan', root, '2026-09-15-plan-gate')

  const gov = r.warnings.filter(w => w.includes('故障面/退役判据'))
  assert.equal(gov.length, 1, `plan gate 恰一条治理软警告（实际 warnings: ${JSON.stringify(r.warnings)}）`)
  assert.ok(gov[0].includes('D-001@V1'), '警告含条目 ID')
  assert.ok(!r.errors.some(e => e.includes('故障面') || e.includes('退役判据')), '软警告走 warnings 通道不阻断')
})
