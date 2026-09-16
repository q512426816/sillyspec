/**
 * 回执双形态解析直测（2026-09-16-friction5-hardening FR-01 / D-001@v1）。
 *
 * 多行 YAML 聚合（字段序无关）+ 单行管道形态逐字节兼容 + fail-closed（缺任一字段/占位
 * 不收）。坑锚定：agent 手写回执列错位/字段序调换/多行书写致单行正则整行不命中 → 回执槽
 * 收 0 条 → integration-critical 误报无绿回执（receipt-fullwidth-parse 两轮补丁后的形态
 * 自由度根除收口）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseEvidenceSlots } from '../src/verify-facts-schema.js'

const HEAD = '## 集成验证回执 [层：自述声明——CLI 一致性校验]'

test('多行四字段任意序等价进 runtimeEvidence（command 在前 / log 在前 / claim 续行）', () => {
  const md = HEAD + '\n'
    + '- claim: 服务真实启动\n'
    + '  command: uvicorn main:app\n'
    + '  exit: 0\n'
    + '  log: logs/run.log\n'
    + '- claim: 反序条目\n'
    + '  log: logs/reverse.log\n'
    + '  exit: 3\n'
    + '  command: `npm run reverse`\n'
    + '- claim:\n'
    + '  claim: 续行承载claim\n'
    + '  command: c\n'
    + '  exit: 0\n'
    + '  log: c.log\n'
  const r = parseEvidenceSlots(md)
  assert.equal(r.runtimeEvidence.length, 3)
  assert.deepEqual(r.runtimeEvidence[0], { claim: '服务真实启动', command: 'uvicorn main:app', exitCode: 0, logPath: 'logs/run.log' })
  assert.deepEqual(r.runtimeEvidence[1], { claim: '反序条目', command: 'npm run reverse', exitCode: 3, logPath: 'logs/reverse.log' },
    '字段序无关 + command 成对反引号剥除')
  assert.equal(r.runtimeEvidence[2].claim, '续行承载claim', '首行行内空时 claim 取续行键值')
})

test('多行缺任一字段 fail-closed 不收（无 exit / 空 claim / exit 非数字）', () => {
  const md = HEAD + '\n'
    + '- claim: 无exit\n'
    + '  command: x\n'
    + '  log: l.log\n'
    + '- claim:\n'
    + '  command: x\n'
    + '  exit: 0\n'
    + '  log: l.log\n'
    + '- claim: exit非数字\n'
    + '  command: x\n'
    + '  exit: 非 0\n'
    + '  log: l.log\n'
    + '- claim: 尾注剥除条目应收\n'
    + '  command: x\n'
    + '  exit: 0\n'
    + '  log: logs/l.log ｜ 重跑第 2 次确认\n'
  const r = parseEvidenceSlots(md)
  assert.equal(r.runtimeEvidence.length, 1, '缺字段三条不收，仅尾注条目命中')
  assert.equal(r.runtimeEvidence[0].logPath, 'logs/l.log', '多行形态 ｜ 尾注取首段（同单行口径）')
})

test('存量单行形态逐字节不变（半角 | / 全角 ｜ / log 含空格与全角括号路径）', () => {
  const md = HEAD + '\n'
    + '- claim: A | command: x | exit: 0 | log: l.log\n'
    + '- claim: 服务真实启动 ｜ command: uvicorn main:app ｜ exit: 0 ｜ log: logs/run.log\n'
    + '- claim: C | command: lint | exit: 0 | log: logs/运行日志（第 1 次）.log\n'
    + '- claim: D | command: lint | exit: 0 | log: logs/lint.log ｜ 重跑第 2 次确认\n'
  const r = parseEvidenceSlots(md)
  assert.equal(r.runtimeEvidence.length, 4)
  assert.deepEqual(r.runtimeEvidence.map(e => e.claim), ['A', '服务真实启动', 'C', 'D'])
  assert.deepEqual(r.runtimeEvidence.map(e => e.command), ['x', 'uvicorn main:app', 'lint', 'lint'])
  assert.deepEqual(r.runtimeEvidence.map(e => e.logPath),
    ['l.log', 'logs/run.log', 'logs/运行日志（第 1 次）.log', 'logs/lint.log'],
    '含空格+全角括号路径完整保留、行尾 ｜ 尾注剥除（旧实现语义逐字段对照）')
})

test('混合槽段：单行 + 多行 + 占位行逐条独立互不干扰', () => {
  const md = HEAD + '\n'
    + '- claim: 单行 | command: s | exit: 0 | log: s.log\n'
    + '- claim: 多行\n'
    + '  command: m\n'
    + '  exit: 0\n'
    + '  log: m.log\n'
    + '- claim: <待填：一句话>\n'
    + '  command: <待填：命令>\n'
    + '  exit: <待填：0 或非 0>\n'
    + '  log: <待填：日志路径>\n'
  const r = parseEvidenceSlots(md)
  assert.equal(r.runtimeEvidence.length, 2, '占位条目不收，单行/多行各自命中')
  assert.equal(r.runtimeEvidence[0].logPath, 's.log')
  assert.equal(r.runtimeEvidence[1].logPath, 'm.log')
})

test('占位 <待填：*> 行首 - claim: 触发聚合但四字段不齐（exit 非纯数字）不收', () => {
  const md = HEAD + '\n- claim: <待填：一句话>\n  command: <待填：命令>\n  exit: <待填：0 或非 0>\n  log: <待填：日志路径>\n'
  const r = parseEvidenceSlots(md)
  assert.equal(r.runtimeEvidence.length, 0, '占位形态 fail-closed（exit 数字闸兜底）')
})

test('首行 claim 值含管道符只作 claim 值不截断（多行形态承载）', () => {
  const md = HEAD + '\n'
    + '- claim: a|b\n'
    + '  command: x\n'
    + '  exit: 0\n'
    + '  log: l.log\n'
  const r = parseEvidenceSlots(md)
  assert.equal(r.runtimeEvidence.length, 1)
  assert.equal(r.runtimeEvidence[0].claim, 'a|b', '单行正则整行不命中（管道在 claim 值内），多行聚合一字不截')
})

test('聚合遇非 key: 缩进正文即止，不误吃后续条目', () => {
  const md = HEAD + '\n'
    + '- claim: 聚合截止\n'
    + '  command: x\n'
    + '  exit: 0\n'
    + '  log: l.log\n'
    + '  这一行是缩进正文而非 key: value 续行，聚合应在此止步\n'
    + '- claim: 下一条 | command: y | exit: 0 | log: y.log\n'
  const r = parseEvidenceSlots(md)
  assert.equal(r.runtimeEvidence.length, 2)
  assert.equal(r.runtimeEvidence[0].claim, '聚合截止')
  assert.equal(r.runtimeEvidence[1].command, 'y')
})
