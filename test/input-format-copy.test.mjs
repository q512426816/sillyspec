/**
 * 2026-10-05-input-format-copy 回归：flow start 教学点 --input 过门格式齐备
 *
 * 背景（主清单项 3）：AGENTS.md 已补过门格式，CLI 输出面 4 处教学点未同步——最坑是
 * run/command.js 空态引导教紧凑内联形态「<动机；成功标准：每行一条可验证标准>」，
 * extractSuccessCriteria 实测提取 0 条（照抄必弹 exit 2，学到的形态不过门）。
 *
 * 锁定：
 *   ① 紧凑内联旧形态零残留（全仓 src）
 *   ② 4 处教学点（command.js 空态引导 / flow.js 重试提示 / flow.js 用法行 /
 *      worktree-guard 三处 stage 提示）均带独立一行『成功标准：』教学
 *   ③ quick 会话一句话 --input 与 run --done 用户原话 --input（另一语义门）不受影响（仍在场）
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '..')
const read = (p) => readFileSync(join(ROOT, p), 'utf8')

test('① 紧凑内联旧形态零残留', () => {
  // 评审 P3 处置：扫描面与断言口径一致——本测试扫的是 flow start 教学所在 5 文件（非全仓 src）
  for (const p of ['src/run/command.js', 'src/flow.js', 'src/index.js', 'src/hooks/worktree-guard.js', 'src/stages/brainstorm.js']) {
    assert.ok(!read(p).includes('--input "<动机；成功标准：每行一条可验证标准>"'), `${p} 无紧凑内联形态`)
  }
})

test('② 教学点均带可照抄多行实例（2026-10-05-input-teach-copyable 形态升级：描述式→实例式）', () => {
  for (const p of ['src/run/command.js', 'src/flow.js', 'src/stages/brainstorm.js']) {
    assert.ok(read(p).includes('--input "<动机与背景>'), `${p} 教学带实例起行`)
  }
  assert.ok(read('src/flow.js').includes('用法: sillyspec flow start --change <名> --input "<动机与背景＋独立一行『成功标准：』＋每行一条『- 可验证标准』>"'), 'flow 用法行带格式')
  const guard = read('src/hooks/worktree-guard.js')
  assert.ok(!guard.includes('--input "<描述+成功标准>"'), 'worktree-guard 无模糊形态残留')
  assert.ok((guard.match(/- <可验证标准>/g) || []).length >= 3, 'worktree-guard 三处 stage 提示各带实例')
})

test('③ 另一语义门的 --input 不受影响', () => {
  const cmd = read('src/run/command.js')
  assert.ok(cmd.includes('--input "<一句话任务描述>"'), 'quick 会话一句话 --input 保留')
  assert.ok(cmd.includes('--input "用户原话"') || read('src/index.js').includes('[--input "用户原话"]'), 'run --done 用户原话 --input 保留')
})
