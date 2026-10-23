/**
 * push skill / 命令卡一致性回归（2026-10-23-push-squash task-05）
 *
 * 钉住：skill frontmatter 与安全纪律、命令卡四段契约、COMMAND_CARD_NAMES 注册。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = dirname(fileURLToPath(import.meta.url))
const { COMMAND_CARD_NAMES, readCardAssets } = await import(pathToFileURL(join(ROOT, '..', 'src', 'command-cards.js')).href)

test('push skill：frontmatter、命令与安全纪律', () => {
  const file = join(ROOT, '..', '.claude', 'skills', 'sillyspec-push', 'SKILL.md')
  assert.equal(existsSync(file), true, 'skill 文件必须存在')
  const text = readFileSync(file, 'utf8')
  assert.match(text, /^---\s*\nname:\s*sillyspec:push\s*$/m)
  assert.match(text, /description:/)
  assert.match(text, /sillyspec push --dry-run/)
  assert.match(text, /sillyspec push --mode one --change/)
  assert.match(text, /不要直接 `git push`/)
  assert.match(text, /不要手工 `git reset --soft`/)
  assert.match(text, /不要 `--no-verify`/)
  assert.match(text, /worktree cwd 内压扁/)
})

test('push 命令卡：资产在场、四段契约、顶层命令形态', () => {
  const assets = readCardAssets()
  assert.equal(assets.has('push'), true)
  const card = assets.get('push')
  for (const section of ['# 何时用', '# 生命周期速查', '# 防坑清单', '# 边界声明']) {
    assert.equal(card.includes(section), true, `缺少 ${section}`)
  }
  assert.match(card, /sillyspec push/)
  assert.match(card, /sillyspec push --dry-run/)
  assert.equal(COMMAND_CARD_NAMES.includes('push'), true)
})
