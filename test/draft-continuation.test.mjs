/**
 * draft-continuation.test.mjs — 摘录续行合并与渲染放宽（2026-09-25-cli-protocol-trust A2）
 *
 * 覆盖验收面：
 *   ① 续行合并：括号/引号未闭合跨行并回（R17 实证「放行（含：\n未知参数校验…）」被拆两碎片）；
 *     行尾悬空冒号/顿号续行合并；节标题行不被误合并；
 *   ② 渲染放宽：tasks 行 clipTaskText 句界感知（80 窗内句读截断+省略号，不再 60 字硬切半词）；
 *   ③ 碎片特征检测：括号不平衡条目 console.warn（不阻断，不进返回值）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const { extractSuccessCriteria, clipTaskText } = await import(pathToFileURL(join(ROOT, 'src', 'flow-draft.js')).href)

test('① 续行合并：括号未闭合跨行并回成单条', () => {
  const input = [
    '动机：修复',
    '成功标准：',
    '- 未知参数放行（含：',
    '新增 flag 同步登记与白名单一致性）',
    '- 独立第二条',
  ].join('\n')
  const crit = extractSuccessCriteria(input)
  assert.equal(crit.length, 2, `括号换行应并回（实际 ${crit.length} 条：${JSON.stringify(crit)}）`)
  assert.ok(crit[0].includes('未知参数放行（含：新增 flag 同步登记与白名单一致性）'), '并回后条目完整')
  assert.equal(crit[1], '独立第二条')
})

test('①b 行尾悬空冒号续行合并 + 节标题不被误合并', () => {
  const input = [
    '成功标准：',
    '- 两态分径：',
    'null 需评审与空串豁免各自成立',
  ].join('\n')
  const crit = extractSuccessCriteria(input)
  assert.equal(crit.length, 1, `悬空冒号续行应并回（实际 ${crit.length}）`)
  assert.ok(crit[0].includes('null 需评审'), '并回后语义完整')
  // 节标题「成功标准：」自身不被并入条目（节检测正则依赖独立成行）
  assert.ok(!crit[0].startsWith('成功标准'), '节标题未被误合并进条目')
})

test('② 渲染放宽：tasks 行句界感知截断（不再 60 字硬切半词）', () => {
  const long = '这是一条非常长的成功标准条目需要被截断处理，其中包含多个句读符号比如逗号，以及句号。后半句内容足够长以至于远远超过八十个字符的窗口边界，需要句界感知截断而不是硬切半个词语收尾'
  const body = clipTaskText(long)
  assert.ok(body.endsWith('…'), `截断应带省略号收尾（实际结尾「${body.slice(-6)}」）`)
  assert.ok(body.length < long.length, '应发生截断')
  assert.ok(long.startsWith(body.slice(0, -1)), '截断体应是原文前缀（不造词）')
  assert.ok(!/[,，、;；:]$/.test(body.slice(0, -1)), `省略号前不应残留悬空连接符（实际「${body.slice(-4)}」）`)
})

test('②b 短条目不截断（≤80 原样透传）', () => {
  assert.equal(clipTaskText('短条目原样保留'), '短条目原样保留')
})
