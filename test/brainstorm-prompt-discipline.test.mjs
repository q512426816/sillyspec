/**
 * 提问分型与子代理豁免条款（2026-11-04-question-typing-subagent-guard）
 *
 * ①头脑风暴提问规则不得保留「多选题优于开放式问题」一刀切通则——意图/动机类
 *   问题必须开放式且不附选项（选项会锚定用户自己的措辞，superpowers 7.0.2 盲测
 *   实证：意图类给选项诱导用户，决策类具名选项+推荐把「裸问 which one」8/8 收敛）；
 * ②子代理豁免条款必须在模板源与仓库 AGENTS.md 双份一致（子代理不跑流程命令，
 *   状态归主会话——superpowers #2536 同型实证）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(fileURLToPath(import.meta.url))

/** 截取 `## 标题` 节全文（到下一个 `\n## ` 为止），无该节返回 null。 */
function extractSection(text, heading) {
  const start = text.indexOf(heading)
  if (start === -1) return null
  const end = text.indexOf('\n## ', start + heading.length)
  return text.slice(start, end === -1 ? text.length : end)
}

test('提问分型规则文本断言：一刀切通则移除，意图开放式/决策具名+推荐就位', () => {
  const src = readFileSync(join(ROOT, '..', 'src', 'stages', 'brainstorm.js'), 'utf8')
  assert.equal(
    src.includes('多选题优于开放式问题'),
    false,
    '「多选题优于开放式问题」一刀切通则必须移除（意图类给选项会锚定用户）'
  )
  assert.match(src, /意图\/动机类问题[^`]*?必须开放式提出[^`]*?不附任何示例选项/, '意图/动机类：开放式且不附示例选项')
  assert.match(src, /决策类问题[^`]*?具名选项[^`]*?必带推荐/, '决策类：具名选项+必带推荐')
  assert.match(src, /禁止裸问「选哪个」/, '决策类禁止裸问「选哪个」')
  assert.match(src, /被问「你觉得呢\/先猜一个」时给一个具体方案并标「我的判断」/, '原尾句保留：被问你觉得呢给具体方案标我的判断')
})

test('子代理豁免条款双文件同步断言', () => {
  const tpl = readFileSync(join(ROOT, '..', 'templates', 'agents-instruction.md'), 'utf8')
  const repoAgents = readFileSync(join(ROOT, '..', 'AGENTS.md'), 'utf8')
  const tplSection = extractSection(tpl, '## 子代理豁免')
  const repoSection = extractSection(repoAgents, '## 子代理豁免')
  assert.ok(tplSection, '模板源必须含「## 子代理豁免」节')
  assert.ok(repoSection, '仓库 AGENTS.md 必须含「## 子代理豁免」节')
  assert.equal(tplSection, repoSection, '两份豁免节文本必须逐字一致（防双份漂移）')
  assert.match(tplSection, /禁止运行[^`]*?sillyspec 流程命令|不运行[^`]*?流程命令/, '豁免语义：子代理不跑流程命令')
  assert.match(tplSection, /主会话/, '状态所有权归主会话')
})
