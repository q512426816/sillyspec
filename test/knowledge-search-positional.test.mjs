// 2026-11-04-knowledge-search-positional——search 位置参数形态与 --query 等效性
// 平台仓反馈实证：AGENTS.md 模板写 search "<关键词>"（位置形态）但 CLI 只认 --query，
// 文档与 CLI 不一致。本文件锁 FR-01~04：位置参数可用、--query 优先、flag-as-value
// 防护保持、help 面与实际行为一致。

import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'

const root = join(fileURLToPath(import.meta.url), '..', '..')
const { cmdSearch } = await import(pathToFileURL(join(root, 'src', 'stages', 'knowledge.js')).href)

let passed = 0, failed = 0
function ok(cond, msg) {
  if (cond) { console.log(`  ✅ PASS: ${msg}`); passed++ }
  else { console.log(`  ❌ FAIL: ${msg}`); failed++ }
}

function setup(name) {
  const dir = join(tmpdir(), `ksp-test-${name}`)
  rmSync(dir, { recursive: true, force: true })
  const kr = join(dir, '.sillyspec', 'knowledge')
  mkdirSync(join(kr, 'decisions'), { recursive: true })
  writeFileSync(join(kr, 'INDEX.md'), [
    '# Knowledge Index', '',
    '## Decisions',
    '- 知识图谱|decision|决策 → [decisions/knowledge.md](decisions/knowledge.md)',
  ].join('\n'))
  writeFileSync(join(kr, 'decisions', 'knowledge.md'), [
    '# 决策知识 — knowledge', '',
    '## D-001@v1 知识图谱检索条目',
    '状态：confirmed',
    '变更：2026-01-01-a',
    '理由：知识图谱检索语义测试条目',
    '',
  ].join('\n'))
  return dir
}
function clean(dir) { try { rmSync(dir, { recursive: true, force: true }) } catch {} }

/** 捕获 console.log 跑 cmdSearch，返回解析后的输出 JSON（多段取首个 { 起）。 */
async function runSearch(dir, args) {
  const lines = []
  const orig = console.log
  console.log = (...a) => lines.push(a.join(' '))
  try {
    await cmdSearch(dir, args, {})
  } finally { console.log = orig }
  const text = lines.join('\n')
  const start = text.indexOf('{')
  return start >= 0 ? JSON.parse(text.slice(start)) : { ok: false, _raw: text }
}

// ── FR-01：位置参数与 --query 等效 ──
console.log('\n=== T1: 位置参数与 --query 等效 ===')
{
  const dir = setup('t1')
  try {
    const pos = await runSearch(dir, ['知识图谱'])
    ok(pos.ok === true, `位置参数形态 ok:true（实得 ok=${pos.ok}）`)
    ok(pos.query === '知识图谱', 'query 回显位置参数词')
    const flag = await runSearch(dir, ['--query', '知识图谱'])
    ok(flag.ok === true && flag.query === '知识图谱', '--query 形态同样可用')
    ok(JSON.stringify(pos.matches) === JSON.stringify(flag.matches), '两形态 matches 逐字段一致')

    const mixedA = await runSearch(dir, ['--limit', '2', '知识图谱'])
    const mixedB = await runSearch(dir, ['知识图谱', '--limit', '2'])
    ok(mixedA.ok === true && mixedA.query === '知识图谱', 'flag 前/位置后混排可解析')
    ok(mixedB.ok === true && mixedB.query === '知识图谱', '位置前/flag 后混排可解析')
  } finally { clean(dir) }
}

// ── FR-02：两形态并存 --query 优先 ──
console.log('\n=== T2: 两形态并存 --query 优先 ===')
{
  const dir = setup('t2')
  try {
    const r = await runSearch(dir, ['位置词', '--query', '知识图谱'])
    ok(r.query === '知识图谱', `--query 压过位置词（实得 query=${r.query}）`)
    ok(!JSON.stringify(r).includes('位置词') || r.query === '知识图谱', '位置词不泄漏进查询面')
  } finally { clean(dir) }
}

// ── FR-03：flag-as-value 防护保持 ──
console.log('\n=== T3: flag-as-value 防护保持 ===')
{
  const dir = setup('t3')
  try {
    const r = await runSearch(dir, ['--query', '--limit', '3'])
    ok(r.ok === false, `--query 后跟 flag 按缺参（实得 ok=${r.ok}）`)
    ok(String(r.error || '').includes('--query is required'), '缺参报错文案保持')
    const none = await runSearch(dir, [])
    ok(none.ok === false && String(none.error || '').includes('--query is required'), '零参数仍报缺参')
    const limitOnly = await runSearch(dir, ['--limit', '2'])
    ok(limitOnly.ok === false, '--limit 的值不被误拾为查询词（仍按缺参）')
  } finally { clean(dir) }
}

// ── FR-04：help 面位置参数形态一致 ──
console.log('\n=== T4: help 面位置参数形态一致 ===')
{
  const idx = readFileSync(join(root, 'src', 'index.js'), 'utf8')
  ok(/knowledge <search "<关键词>"/.test(idx), '主 help 含 search "<关键词>" 位置形态')
  ok(/--query 等效/.test(idx), '主 help 注明 --query 等效')
  const kj = readFileSync(join(root, 'src', 'stages', 'knowledge.js'), 'utf8')
  ok(/search "<关键词>"     检索知识库/.test(kj), '子命令 help 含位置形态')
  const tpl = readFileSync(join(root, 'templates', 'agents-instruction.md'), 'utf8')
  ok(/knowledge search "<关键词>"/.test(tpl), 'AGENTS.md 模板写法与 CLI 行为一致（模板零改动即为真）')
  ok(/function positionalQuery/.test(kj), '位置取词器存在（positionalQuery）')
}

console.log(`\n结果: ${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
