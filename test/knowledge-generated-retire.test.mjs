// 2026-11-07-knowledge-generated-retire——generated 切块死区退库
// 双仓审计实证：generated 是零消费死区 + 双源漂移源（平台仓同事实矛盾实证）。
// 本文件锁 FR-01~03：refresh 废弃提示零写盘 / validate-search 零回归 / help-SKILL 废弃文案。

import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'

const root = join(fileURLToPath(import.meta.url), '..', '..')
const { cmdRefresh, cmdValidate } = await import(
  pathToFileURL(join(root, 'src', 'stages', 'knowledge.js')).href
)

let passed = 0, failed = 0
function ok(cond, msg) {
  if (cond) { console.log(`  ✅ PASS: ${msg}`); passed++ }
  else { console.log(`  ❌ FAIL: ${msg}`); failed++ }
}

function snapshot(dir) {
  const out = []
  const walk = (d, prefix) => {
    if (!existsSync(d)) return
    for (const f of readdirSync(d, { withFileTypes: true })) {
      const rel = prefix ? `${prefix}/${f.name}` : f.name
      if (f.isDirectory()) walk(join(d, f.name), rel)
      else out.push(rel)
    }
  }
  walk(dir, '')
  return out.sort().join('|')
}

// ── T1: refresh 废弃提示零写盘（FR-01）──
console.log('\n=== T1: refresh 废弃提示 ===')
{
  const dir = join(tmpdir(), `kgr-t1`)
  rmSync(dir, { recursive: true, force: true })
  const kr = join(dir, '.sillyspec', 'knowledge')
  mkdirSync(kr, { recursive: true })
  writeFileSync(join(kr, 'INDEX.md'), '# Knowledge Index\n', 'utf8')
  const before = snapshot(kr)
  const lines = []
  const orig = console.log
  console.log = (...a) => lines.push(a.join(' '))
  try {
    await cmdRefresh(dir, [], {})
  } finally { console.log = orig }
  const text = lines.join('\n')
  const s = text.indexOf('{')
  const r = s >= 0 ? JSON.parse(text.slice(s)) : null
  ok(r && r.ok === true && r.deprecated === true, `废弃标记（实得 ${JSON.stringify(r && { ok: r.ok, deprecated: r.deprecated })}）`)
  ok(text.includes('scan') || (r && String(r.message || '').includes('scan')), '说明含 scan 本体指引')
  ok(snapshot(kr) === before, 'knowledge 目录零写盘')
  try { rmSync(dir, { recursive: true, force: true }) } catch {}
}

// ── T2: validate 零回归（无 generated 前提，FR-02）──
console.log('\n=== T2: validate 零回归 ===')
{
  const dir = join(tmpdir(), `kgr-t2`)
  rmSync(dir, { recursive: true, force: true })
  const kr = join(dir, '.sillyspec', 'knowledge')
  mkdirSync(kr, { recursive: true })
  writeFileSync(join(kr, 'INDEX.md'), '# Knowledge Index\n\n## Patterns\n- 坑|x → [patterns.md](patterns.md)\n', 'utf8')
  writeFileSync(join(kr, 'patterns.md'), '# Patterns\n\n## 坑条目\n\n正文。\n', 'utf8')
  const lines = []
  const orig = console.log
  console.log = (...a) => lines.push(a.join(' '))
  try {
    await cmdValidate(dir, [], {})
  } finally { console.log = orig }
  const text = lines.join('\n')
  const s = text.indexOf('{')
  const r = s >= 0 ? JSON.parse(text.slice(s)) : null
  ok(r && r.ok === true, `generated 缺席时 validate ok（实得 ${JSON.stringify(r && r.ok)}）`)
  ok(!existsSync(join(kr, 'generated')), '无 generated 目录（存量已退库形态）')
  try { rmSync(dir, { recursive: true, force: true }) } catch {}
}

// ── T3: help 与 SKILL 废弃文案同步（FR-03）──
console.log('\n=== T3: help-SKILL 废弃文案 ===')
{
  const kj = readFileSync(join(root, 'src', 'stages', 'knowledge.js'), 'utf8')
  ok(/refresh.*废弃|refresh.*退役/.test(kj), 'help 行含废弃/退役说明')
  const skill = readFileSync(join(root, '.claude', 'skills', 'sillyspec-knowledge', 'SKILL.md'), 'utf8')
  ok(/refresh/.test(skill), 'SKILL 仍提及 refresh（防误用指引）')
  ok(!/重扫 scan 文档重写|仅写 `generated\/`|自动知识走 `refresh`|scan 完成后 `refresh`/.test(skill), 'SKILL 不再诱导跑 refresh 旧语义')
}

console.log(`\n结果: ${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
