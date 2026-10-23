/**
 * flow 收口指引不再教 reset --soft（2026-10-23-push-squash task-06 / FR-06）
 *
 * reset --soft 会把共享暂存区内容卷进压扁提交；官方入口统一为 sillyspec push。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(fileURLToPath(import.meta.url))

test('flow done 指引：不再出现 reset --soft 压扁命令，改为 sillyspec push', () => {
  const flow = readFileSync(join(ROOT, '..', 'src', 'flow.js'), 'utf8')
  assert.equal(flow.includes('git reset --soft ${st.baseline_commit'), false, '旧的 reset --soft 动态命令必须退役')
  assert.match(flow, /sillyspec push 压扁本地未推送提交/)
  assert.match(flow, /git 中间提交归档后用 sillyspec push 压扁并推送/)
  assert.match(flow, /Git 中间提交归档后用 sillyspec push 压扁并推送/)
})

test('AGENTS 模板注入推送纪律', () => {
  const tpl = readFileSync(join(ROOT, '..', 'templates', 'agents-instruction.md'), 'utf8')
  assert.match(tpl, /推送前压扁/)
  assert.match(tpl, /sillyspec push/)
  assert.match(tpl, /git reset --soft/)
})
