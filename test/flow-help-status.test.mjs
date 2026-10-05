/**
 * 2026-10-05-flow-help-status 回归：flow 用法行列出 flow status 子命令
 *
 * 背景：flow status 子命令存在（src/flow.js status 分支）且 flow.js 多处输出引导用户
 * 使用它（「随时可查进度：sillyspec flow status --change <名>」），但 `sillyspec flow`
 * 无子命令的用法行只列 start/done——帮助面与实际能力不一致，恢复入口从帮助面发现不了。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '..')
const flowSrc = readFileSync(join(ROOT, 'src/flow.js'), 'utf8')

const USAGE_LINE = '用法: sillyspec flow start --change <名>'

test('用法行列出 flow status 子命令', () => {
  const line = flowSrc.split('\n').find((l) => l.includes(USAGE_LINE))
  assert.ok(line, '用法行在场')
  assert.ok(line.includes('flow status --change <名>'), '用法行含 status 子命令提示')
})

test('用法行保留 start/done 与 --input 格式教学', () => {
  const line = flowSrc.split('\n').find((l) => l.includes(USAGE_LINE))
  assert.ok(line, '用法行在场')
  assert.ok(line.includes('sillyspec flow done --change <名>'), '用法行保留 done 子命令')
  assert.ok(line.includes('--input "<动机与背景＋独立一行『成功标准：』＋每行一条『- 可验证标准』>"'), '用法行保留 --input 过门格式教学')
})
