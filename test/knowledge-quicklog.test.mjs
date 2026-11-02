/**
 * knowledge-quicklog.test.mjs — 解析面测试（检索面已下线 2026-11-02-quicklog-inject-retire，
 * matchQuicklogContext/renderQuicklogSection 已删除；仅保留 parseQuicklogEntries/parseFlowArchiveEntries）
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parseQuicklogEntries, parseFlowArchiveEntries } from '../src/knowledge-quicklog.js'

let passed = 0
let failed = 0
function assert(cond, msg) {
  if (cond) { console.log(`  ✅ PASS: ${msg}`); passed++ }
  else { console.log(`  ❌ FAIL: ${msg}`); failed++ }
}

// ── parseQuicklogEntries 基础解析 ──
console.log('\n--- 1. parseQuicklogEntries ---')
{
  const specBase = mkdtempSync(join(tmpdir(), 'kl-parse-'))
  try {
    const qdir = join(specBase, 'quicklog')
    mkdirSync(qdir, { recursive: true })
    writeFileSync(join(qdir, 'QUICKLOG-test.md'), [
      '# QUICKLOG', '',
      '## ql-20260920-007-x | 2026-09-20 17:27:00 | claude 引擎 autocompact 做成 provider 级可配',
      '- backend/app/cursor.py', '',
    ].join('\n'))
    const entries = parseQuicklogEntries(specBase)
    assert(entries.length === 1 && entries[0].qlId === 'ql-20260920-007-x', '单条目解析（qlId）')
  } finally { rmSync(specBase, { recursive: true, force: true }) }
}

// ── parseFlowArchiveEntries 归档源 ──
console.log('\n--- 2. parseFlowArchiveEntries ---')
{
  const specBase = mkdtempSync(join(tmpdir(), 'kl-flow-'))
  try {
    const archive = join(specBase, 'changes', 'archive', '2026-09-14-flow-demo')
    mkdirSync(archive, { recursive: true })
    writeFileSync(join(archive, 'flow-state.yaml'), 'tier: thin\ninput: flow 测试\n')
    const entries = parseFlowArchiveEntries(specBase)
    assert(entries.length === 1 && entries[0].qlId === '2026-09-14-flow-demo', '归档 flow 变更伪条目')
  } finally { rmSync(specBase, { recursive: true, force: true }) }
}

// ── 汇总 ──
console.log(`\nquicklog-parse tests: ${passed} passed, ${failed} failed, ${passed + failed} total`)
process.exit(failed > 0 ? 1 : 0)
