/**
 * decision-files-autofill.test.mjs — 文件字段自动填充测试
 * ① 蒸馏时单决策变更自动填全部交付文件
 * ② 多决策变更仅填正文提到的文件（信号匹配）
 * ③ 已有锚点/文件的条目不动
 * ④ decisions add --files 参数生效
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = join(fileURLToPath(new URL('.', import.meta.url)).replace(/^\/([A-Za-z]:)/, '$1'), '..')
const { distillIntoKnowledge } = await import(
  pathToFileURL(join(root, 'src', 'decision-distill.js')).href
)
const { parseDecisions } = await import(
  pathToFileURL(join(root, 'src', 'decision-distill.js')).href
)

function buildChange(name, decisionsMd, patchFiles) {
  const prefix = join(tmpdir(), `dfa-${name}-`)
  const d = mkdtempSync(prefix)
  mkdirSync(join(d, 'knowledge', 'decisions'), { recursive: true })
  if (decisionsMd) writeFileSync(join(d, 'decisions.md'), decisionsMd)
  if (patchFiles) writeFileSync(join(d, 'change-patch.json'), JSON.stringify({ files: patchFiles }))
  return { changeDir: d, knowledgeRoot: join(d, 'knowledge') }
}
function clean(d) { rmSync(d, { recursive: true, force: true }) }

// agent 实际写的 decisions.md 格式：`- 字段：值` 列表行
const md = (id, title, extra = []) => [
  `## ${id}@v1 ${title}`, '- 类型：architecture', '- 状态：confirmed', ...extra, '',
].join('\n')

test('① 单决策变更 → 全部交付文件自动填入', () => {
  const { changeDir, knowledgeRoot } = buildChange('single',
    ['# 决策记录', '', md('D-001', '用 SQLite 持久化', ['- 答案：选 SQLite 因为可靠'])].join('\n'),
    ['src/db.js', 'src/config.js', 'test/db.test.js'])
  try {
    distillIntoKnowledge(changeDir, knowledgeRoot, 'abc1234')
    const text = readFileSync(join(knowledgeRoot, 'decisions', 'unmapped.md'), 'utf8')
    assert.ok(text.includes('文件：src/db.js, src/config.js, test/db.test.js'), '交付面 3 文件全填')
  } finally { clean(changeDir) }
})

test('② 多决策变更 → 仅填正文提到的文件', () => {
  const { changeDir, knowledgeRoot } = buildChange('multi',
    ['# 决策记录', '', md('D-001', '用 SQLite 持久化', ['- 答案：选 src/db.js 做 SQLite']), md('D-002', 'API 用 REST', ['- 答案：REST 够用'])].join('\n'),
    ['src/db.js', 'src/api.js', 'test/db.test.js'])
  try {
    distillIntoKnowledge(changeDir, knowledgeRoot, 'abc1234')
    const text = readFileSync(join(knowledgeRoot, 'decisions', 'unmapped.md'), 'utf8')
    const d1 = text.split(/^## /m).find(b => b.includes('SQLite'))
    assert.ok(d1 && /文件[：:]\s*src\/db\.js/.test(d1), 'D-001 正文提到 src/db.js → 填入')
    const d2 = text.split(/^## /m).find(b => b.includes('REST'))
    assert.ok(d2 && !/^文件[：:]/m.test(d2), 'D-002 正文无文件提及 → 不填')
  } finally { clean(changeDir) }
})

test('③ 已有锚点/文件的条目不动', () => {
  const { changeDir, knowledgeRoot } = buildChange('existing',
    ['# 决策记录', '',
      md('D-001', '有锚点', ['- 锚点：src/existing.js:10', '- 答案：已有关联']),
      md('D-002', '有文件', ['- 文件：src/other.js', '- 答案：已有文件']),
    ].join('\n'),
    ['src/delivery.js'])
  try {
    distillIntoKnowledge(changeDir, knowledgeRoot, 'abc1234')
    const text = readFileSync(join(knowledgeRoot, 'decisions', 'unmapped.md'), 'utf8')
    assert.ok(text.includes('锚点：src/existing.js:10'), '已有锚点不动')
    assert.ok(text.includes('文件：src/other.js'), '已有文件不动')
    assert.ok(!text.includes('src/delivery.js'), '交付面文件不覆盖已有字段')
  } finally { clean(changeDir) }
})

test('④ 无 change-patch.json 时零填充不报错', () => {
  const { changeDir, knowledgeRoot } = buildChange('nopatch',
    ['# 决策记录', '', md('D-001', '无交付面', ['- 答案：无 patch 数据'])].join('\n'),
    null)
  try {
    const r = distillIntoKnowledge(changeDir, knowledgeRoot, 'abc1234')
    assert.ok(r.written.length > 0, '蒸馏正常')
    const text = readFileSync(join(knowledgeRoot, 'decisions', 'unmapped.md'), 'utf8')
    assert.ok(!/文件[：:]/.test(text), '无交付面 → 零填充')
  } finally { clean(changeDir) }
})
