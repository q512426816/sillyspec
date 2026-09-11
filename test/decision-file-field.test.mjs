/**
 * decision-distill 文件字段契约（change: 2026-09-11-cross-change-decision-guard，FR-01，D-001@v1）：
 * decisions.md 条目支持「文件：」/「files:」标签 → entry.files（parseListValue 刌分 + 逐项
 * 反斜杠归一 POSIX 分隔符）；归档渲染在「锚点：」行后增条件「文件：」行——仅非空渲染，
 * 存量条目零迁移、幂等重归档不添空行。
 *
 * 锁定验收（task-01 五条）：
 *   1. 含「文件：src/a.js, src/b.js」的条目渲染输出含精确行「文件：src/a.js, src/b.js」（锚点行后）
 *   2. 不含文件字段的既有条目渲染输出与改动前字节级一致（存量零迁移）
 *   3. 「files: src\foo.js」反斜杠形态解析为 src/foo.js
 *   4. 「a.js，b.js、c.js」全角分隔符切分为 3 项
 *   5. 同一条目二次归档（幂等路径）不新增空「文件：」行
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { parseDecisions, distillIntoKnowledge } from '../src/decision-distill.js'

const tmpRoots = []
function mk(p) { const d = mkdtempSync(join(tmpdir(), p)); tmpRoots.push(d); return d }
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

/** 固定变更名建 change 目录（basename 即变更名 → 「变更：」行内容确定，字节级断言可用） */
function mkChange(name, decisionsMd) {
  const root = mk('dff-')
  const changeDir = join(root, name)
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(changeDir, 'decisions.md'), decisionsMd)
  return changeDir
}

test('验收1：有文件字段条目渲染精确「文件：src/a.js, src/b.js」行，位于锚点行后；重跑仍恰一行', () => {
  const md = [
    '# 决策追踪',
    '',
    '## D-001@v1 引入文件锚定',
    '- type: architecture',
    '- status: accepted',
    '- answer: 以文件字段锚定代码位置',
    '- 文件：src/a.js, src/b.js',
    '',
  ].join('\n') + '\n'
  const changeDir = mkChange('feat-file-field', md)

  const r = parseDecisions(changeDir)
  const e = r.entries.find(x => x.number === 'D-001')
  assert.ok(e, '条目可解析')
  assert.deepEqual(e.files, ['src/a.js', 'src/b.js'], '解析侧 entry.files 为字符串数组')

  const k = mk('dff-k1-')
  distillIntoKnowledge(changeDir, k, 'deadbeef')
  const content = readFileSync(join(k, 'decisions', 'unmapped.md'), 'utf8')
  const lines = content.split('\n')
  const anchorIdx = lines.indexOf('锚点：未记录')
  const filesIdx = lines.indexOf('文件：src/a.js, src/b.js')
  assert.ok(anchorIdx > -1, '锚点行存在')
  assert.ok(filesIdx > -1, `渲染含精确行「文件：src/a.js, src/b.js」（实际 ${JSON.stringify(content)}）`)
  assert.equal(filesIdx, anchorIdx + 1, '文件行紧跟锚点行后')

  // 幂等重跑：同号同变更 update 原地重写，仍恰一行文件行
  distillIntoKnowledge(changeDir, k, 'deadbeef')
  const content2 = readFileSync(join(k, 'decisions', 'unmapped.md'), 'utf8')
  assert.equal((content2.match(/文件：src\/a\.js, src\/b\.js/g) || []).length, 1, '重跑仍恰一行文件行')
})

test('验收2：无文件字段条目渲染输出与改动前字节级一致（存量零迁移）', () => {
  const md = [
    '## D-002@v1 存量条目',
    '- type: architecture',
    '- status: accepted',
    '- answer: 无文件字段',
    '',
  ].join('\n') + '\n'
  const changeDir = mkChange('legacy-no-files', md)
  const k = mk('dff-k2-')
  distillIntoKnowledge(changeDir, k, 'cafe1234')
  const content = readFileSync(join(k, 'decisions', 'unmapped.md'), 'utf8')
  const expected = [
    '# 决策知识 — unmapped',
    '',
    '> decision-distill 从变更 decisions.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为 docs-check 机械解析契约，勿手改。',
    '',
    '## D-002@v1 存量条目',
    '状态：implemented',
    '变更：legacy-no-files',
    '锚点：未记录',
    '最近确认：cafe1234',
    '理由：无文件字段',
    '',
  ].join('\n')
  assert.equal(content, expected, '无文件字段条目渲染字节级一致（不出现空「文件：」行）')
})

test('验收3+4：files 反斜杠归一 POSIX；全角分隔符切分', () => {
  const md = [
    '## D-003@v1 反斜杠归一',
    '- type: definition',
    '- status: confirmed',
    '- files: src\\foo.js',
    '',
    '## D-004@v1 全角切分',
    '- type: process',
    '- status: accepted',
    '- 文件：a.js，b.js、c.js',
    '',
  ].join('\n') + '\n'
  const changeDir = mkChange('sep-normalize', md)

  const r = parseDecisions(changeDir)
  const d3 = r.entries.find(x => x.number === 'D-003')
  const d4 = r.entries.find(x => x.number === 'D-004')
  assert.deepEqual(d3.files, ['src/foo.js'], 'files: src\\foo.js → src/foo.js（反斜杠归一）')
  assert.deepEqual(d4.files, ['a.js', 'b.js', 'c.js'], 'a.js，b.js、c.js → 3 项（全角分隔符切分）')

  const k = mk('dff-k3-')
  distillIntoKnowledge(changeDir, k, 'beef5678')
  const content = readFileSync(join(k, 'decisions', 'unmapped.md'), 'utf8')
  assert.ok(content.includes('\n文件：src/foo.js\n'), '反斜杠条目渲染归一后的精确行')
})

test('验收5：同条目二次归档不新增空「文件：」行，内容字节稳定', () => {
  const md = [
    '## D-005@v1 幂等重归档',
    '- type: architecture',
    '- status: accepted',
    '- answer: 二次归档稳定',
    '',
  ].join('\n') + '\n'
  const changeDir = mkChange('idem-files', md)
  const k = mk('dff-k5-')
  distillIntoKnowledge(changeDir, k, 'abc0001')
  const c1 = readFileSync(join(k, 'decisions', 'unmapped.md'), 'utf8')
  assert.ok(!/^文件：/m.test(c1), '一次归档无「文件：」行')
  distillIntoKnowledge(changeDir, k, 'abc0001')
  const c2 = readFileSync(join(k, 'decisions', 'unmapped.md'), 'utf8')
  assert.equal(c2, c1, '二次归档字节级一致')
  assert.ok(!/^文件：/m.test(c2), '二次归档仍不新增空「文件：」行')
})
