/**
 * 轻量道注入遥测导线（2026-10-15-thin-inject-telemetry）
 *
 * 背景：flowKnowledgeDigest（src/flow.js 轻量道知识注入面）此前不落 hits.jsonl——thin 道
 * 常态化后 inject 事件流断流（本仓 10-09 后归零实证），knowledge stats 从未命中判定被盲区
 * 污染（30 文件「疑似死重」实为遥测不可见）。本文件锁三态：
 *   ① thin 命中 → inject 事件落盘：change/query 与既有事件同形，分级字段
 *      injectedFiles（恒空，thin 面只出按需 Read 行）/ mentionedFiles（📚 行 top-3）/
 *      source:'thin-start' 在场；既有 matchedFiles 口径不变
 *   ② 未命中（无 entries 且无 rejected）→ 零落盘
 *   ③ 遥测写失败 fail-soft：.runtime 为普通文件时注入本体照常出命中行
 *
 * fixture：临时 spec 树（mkdtempSync，Windows 兼容）——同 test/knowledge-inject.test.mjs 先例。
 */
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { flowKnowledgeDigest } from '../src/flow.js'
import { readKnowledgeHits } from '../src/knowledge-hits.js'

let failed = 0
const failures = []
function assertTrue(cond, msg) {
  if (cond) console.log(`  ✅ PASS: ${msg}`)
  else { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
}

function makeSpecRoot({ runtimeAsFile = false } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'thin-tel-'))
  const specBase = join(root, '.sillyspec')
  mkdirSync(join(specBase, 'knowledge'), { recursive: true })
  const changeDir = join(specBase, 'changes', '2026-10-15-thin-fixture')
  mkdirSync(changeDir, { recursive: true })
  if (runtimeAsFile) {
    writeFileSync(join(specBase, '.runtime'), 'not-a-dir', 'utf8')
  } else {
    mkdirSync(join(specBase, '.runtime'), { recursive: true })
  }
  return { root, specBase, runtimeDir: join(specBase, '.runtime'), knowledgeDir: join(specBase, 'knowledge'), changeDir }
}

function cleanup({ root }) {
  try { rmSync(root, { recursive: true, force: true }) } catch { /* Windows 句柄迟滞容忍 */ }
}

/** 命中 fixture：INDEX 两锚点行（worktree/限流），query 语料命中两条 */
function writeMatchFixture(knowledgeDir) {
  writeFileSync(join(knowledgeDir, 'ka.md'), '# ka\n\nka-限流正文行A\n', 'utf8')
  writeFileSync(join(knowledgeDir, 'kb.md'), '# kb\n\nkb-worktree正文行A\n', 'utf8')
  writeFileSync(join(knowledgeDir, 'INDEX.md'), [
    '## Known Issues',
    '- 限流 → [限流坑](ka.md#限流坑锚点)',
    '- worktree → [worktree坑](kb.md)',
    ''
  ].join('\n'), 'utf8')
}

const THIN_ONLY_TOKEN = 'thin-tel-唯一语料'

async function main() {
  console.log('── ① thin 命中落盘：事件同形 + 分级字段 ──')
  {
    const fx = makeSpecRoot()
    try {
      writeMatchFixture(fx.knowledgeDir)
      const hitsBefore = existsSync(join(fx.runtimeDir, 'state', 'knowledge-hits.jsonl'))
        ? readKnowledgeHits(fx.runtimeDir).length
        : 0
      const { lines } = await flowKnowledgeDigest({
        specBase: fx.specBase,
        change: '2026-10-15-thin-fixture',
        changeDir: fx.changeDir,
        input: `修 worktree 限流坑 ${THIN_ONLY_TOKEN}`,
        filesOverride: ['src/worktree/foo.js'],
      })
      const out = lines.join('\n')
      assertTrue(out.includes('📚 知识命中'), '① 注入本体出「📚 知识命中」行（遥测不影响注入）')
      const events = readKnowledgeHits(fx.runtimeDir).filter((h) => h.type === 'inject')
      assertTrue(events.length === hitsBefore + 1, `① 恰落一条 inject 事件（${hitsBefore} → ${events.length}）`)
      const ev = events[events.length - 1]
      assertTrue(ev.change === '2026-10-15-thin-fixture', '① change 字段与既有事件同形')
      assertTrue(typeof ev.query === 'string' && ev.query.startsWith('2026-10-15-thin-fixture\n'), '① query=change\\ninput 形态')
      assertTrue(Array.isArray(ev.matchedFiles) && ev.matchedFiles.length === 2, `① matchedFiles 两条全量（${(ev.matchedFiles || []).length}）`)
      assertTrue(ev.matchedFiles.every((f) => typeof f === 'string'), '① matchedFiles 为 file#anchor 字符串数组（既有口径）')
      assertTrue(Array.isArray(ev.injectedFiles) && ev.injectedFiles.length === 0, '① injectedFiles 恒空（thin 面只出按需 Read 行）')
      assertTrue(Array.isArray(ev.mentionedFiles) && ev.mentionedFiles.length === 2, `① mentionedFiles=📚 行展示锚点（${(ev.mentionedFiles || []).length}）`)
      assertTrue(ev.source === 'thin-start', '① source=thin-start（区分注入点）')
      assertTrue(typeof ev.at === 'string' && ev.at.length > 0, '① at 时间戳在场（appendKnowledgeHit 既有行为）')
    } finally { cleanup(fx) }
  }

  console.log('── ② 未命中零落盘 ──')
  {
    const fx = makeSpecRoot()
    try {
      writeFileSync(join(fx.knowledgeDir, 'INDEX.md'), '## Known Issues\n\n', 'utf8')
      await flowKnowledgeDigest({
        specBase: fx.specBase,
        change: '2026-10-15-thin-fixture',
        changeDir: fx.changeDir,
        input: `${THIN_ONLY_TOKEN} 完全不相关语料`,
        filesOverride: ['src/unrelated/bar.js'],
      })
      const events = existsSync(join(fx.runtimeDir, 'state', 'knowledge-hits.jsonl'))
        ? readKnowledgeHits(fx.runtimeDir).filter((h) => h.type === 'inject')
        : []
      assertTrue(events.length === 0, `② 无命中零落盘（events=${events.length}）`)
    } finally { cleanup(fx) }
  }

  console.log('── ③ 遥测写失败 fail-soft：注入本体不受阻 ──')
  {
    const fx = makeSpecRoot({ runtimeAsFile: true })
    try {
      writeMatchFixture(fx.knowledgeDir)
      let lines = []
      let threw = false
      try {
        ({ lines } = await flowKnowledgeDigest({
          specBase: fx.specBase,
          change: '2026-10-15-thin-fixture',
          changeDir: fx.changeDir,
          input: `修 worktree 限流坑 ${THIN_ONLY_TOKEN}`,
          filesOverride: ['src/worktree/foo.js'],
        }))
      } catch (e) {
        threw = true
        console.log(`    （异常：${e && e.message}）`)
      }
      assertTrue(!threw, '③ appendKnowledgeHit 失败不向上抛（fail-soft）')
      assertTrue(lines.join('\n').includes('📚 知识命中'), '③ 注入命中行照常输出')
    } finally { cleanup(fx) }
  }

  console.log(failed === 0 ? `\n全部通过（3 组）` : `\n${failed} 项失败：\n${failures.map((f) => `  - ${f}`).join('\n')}`)
  process.exit(failed === 0 ? 0 : 1)
}

main().catch((e) => { console.error(e); process.exit(1) })
