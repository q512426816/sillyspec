/**
 * knowledge-scope-cmd.test.mjs — 知识作用域发现面（2026-10-23-knowledge-scope-discoverability）
 *
 * ① CLI e2e：knowledge scope --json 列 scoped 条目（always/repo/module 分桶）＋guide 语法在场；
 *    空态人类输出明示「仅关键词档在用」并给出三形态标记语法（FR-01）
 * ② 发现面锚：knowledge help 列 scope；AGENTS 模板知识库行含作用域指引；sillyspec-config
 *    技能含「知识注入作用域」节与标记语法（FR-02）
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CLI = join(ROOT, 'src', 'index.js')

function cli(cwd, args) {
  const r = spawnSync(process.execPath, [CLI, '--dir', cwd, ...args], { cwd, encoding: 'utf8', timeout: 60_000, env: { ...process.env, SILLYSPEC_WATCHER: '0' } })
  return { status: r.status, out: (r.stdout || '') + (r.stderr || ''), stdout: r.stdout || '' }
}
function jsonOf(stdout) {
  const i = stdout.indexOf('{')
  assert.ok(i !== -1, `stdout 无 JSON：${stdout.slice(0, 200)}`)
  return JSON.parse(stdout.slice(i))
}

test('① CLI e2e：有 scoped 条目 → --json 分桶；人类输出含语义', () => {
  const d = mkdtempSync(join(tmpdir(), 'kscmd-'))
  try {
    mkdirSync(join(d, '.sillyspec', 'knowledge'), { recursive: true })
    writeFileSync(join(d, '.sillyspec', 'knowledge', 'rules.md'), [
      '## 通用规约',
      '<!-- scope: always -->',
      '每次变更都要注入的规约。',
      '',
      '## 仓级约束',
      '<!-- scope: repo -->',
      '本仓发布前跑锚套件。',
      '',
      '## 模块路由',
      '<!-- scope: module:cli-entry,core-engine -->',
      '模块域 id 与 FR 域同源。',
    ].join('\n'))
    const r = cli(d, ['knowledge', 'scope', '--json'])
    assert.equal(r.status, 0, `exit 0（${r.out.slice(0, 300)}）`)
    const j = jsonOf(r.stdout)
    assert.equal(j.ok, true)
    assert.equal(j.total, 3, `total 3（实际 ${j.total}）`)
    assert.equal(j.always[0].id, 'rules.md#通用规约')
    assert.equal(j.repo[0].id, 'rules.md#仓级约束')
    assert.deepEqual(Object.keys(j.modules).sort(), ['cli-entry', 'core-engine'])
    assert.ok(Array.isArray(j.guide) && j.guide.some((l) => l.includes('scope: always')), 'guide 含标记语法')
    // 人类输出
    const h = cli(d, ['knowledge', 'scope'])
    assert.equal(h.status, 0)
    assert.match(h.out, /知识注入作用域现状（3 条 scoped/, '人类输出计数')
    assert.match(h.out, /always（每次变更恒注入）/, 'always 分节')
    assert.match(h.out, /scope: module:<域>/, '语法教学在场')
  } finally { rmSync(d, { recursive: true, force: true, maxRetries: 3 }) }
})

test('①b 空态：明示仅关键词档在用 + 三形态语法 + 放置位置教学', () => {
  const d = mkdtempSync(join(tmpdir(), 'kscmd-'))
  try {
    mkdirSync(join(d, '.sillyspec', 'knowledge'), { recursive: true })
    const r = cli(d, ['knowledge', 'scope'])
    assert.equal(r.status, 0)
    assert.match(r.out, /当前仅关键词档在用/, '空态明示')
    for (const token of ['scope: always', 'scope: repo', 'scope: module:<域>', 'section heading 之下']) {
      assert.ok(r.out.includes(token), `语法教学含「${token}」`)
    }
  } finally { rmSync(d, { recursive: true, force: true, maxRetries: 3 }) }
})

test('② 发现面锚：help/模板/技能三处引导', () => {
  const help = readFileSync(join(ROOT, 'src', 'stages', 'knowledge.js'), 'utf8')
  assert.match(help, /scope\s+知识注入作用域现状与标记语法/, 'knowledge help 列 scope')
  const tpl = readFileSync(join(ROOT, 'templates', 'agents-instruction.md'), 'utf8')
  assert.ok(tpl.includes('scope: always|repo|module:<域>'), 'AGENTS 模板含标记语法')
  assert.ok(tpl.includes('sillyspec knowledge scope'), 'AGENTS 模板含命令指针')
  const skill = readFileSync(join(ROOT, '.claude', 'skills', 'sillyspec-config', 'SKILL.md'), 'utf8')
  assert.match(skill, /知识注入作用域/, '技能节在场')
  assert.ok(skill.includes('scope: always') && skill.includes('sillyspec knowledge scope'), '技能含语法与命令')
})
