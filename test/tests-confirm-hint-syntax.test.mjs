/**
 * 2026-10-05-tests-confirm-hint 回归：抽查提示命令形态与实现一致
 *
 * 背景（主清单项 2）：flow start 抽查提示曾教 `sillyspec tests confirm --anchor …`（子命令
 * 形态），实现只认 `tests --confirm`（flag 形态）——照抄静默降级为行展示，confirm 空转
 * （本会话两次 flow start 输出复现）。修正取提示语侧，与 index.js case 'tests' 的
 * has('--confirm') 及其 fail 用法文案对齐。
 *
 * 锁定：
 *   ① flow.js 抽查提示含 flag 形态 `tests --confirm --anchor`
 *   ② 全仓 src 无「tests confirm 」子命令形态提示残留
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '..')

test('① 抽查提示含 flag 形态 tests --confirm --anchor', () => {
  const flowSrc = readFileSync(join(ROOT, 'src', 'flow.js'), 'utf8')
  assert.ok(flowSrc.includes('tests --confirm --anchor <id> --evidence <真实测试路径>'),
    '提示语为 flag 形态（与 index.js has(--confirm) 实现一致）')
})

test('② 全仓 src 无「tests confirm 」子命令形态提示残留', () => {
  const hits = []
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name)
      if (e.isDirectory()) walk(p)
      else if (e.name.endsWith('.js')) {
        const text = readFileSync(p, 'utf8')
        if (text.includes('tests confirm ')) hits.push(p)
      }
    }
  }
  walk(join(ROOT, 'src'))
  assert.deepEqual(hits, [], `子命令形态提示残留（应全改为 --confirm flag 形态）: ${hits.join(', ')}`)
})
