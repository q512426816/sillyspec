/**
 * 模块卡「变更索引」解析回归（2026-08-31 变更关联审计 P1）。
 *
 * 钉住真实数据里的全部格式变体（12 张卡 + 6 个 sidecar 实测）：
 *   标题两种（## 变更索引（表格，初始为空）/ ## 变更索引）、行体两种（表格/列表）混合、
 *   `（quick）` 后缀、ql-* quicklog id、纯日期遗留行与 sidecar 迁出指针行跳过、
 *   sidecar frontmatter 剥离、卡内表与 sidecar 同名去重（卡优先）、日期降序。
 */
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parseChangelogEntries, readModuleRecentChanges } from '../src/module-changelog.js'

let failed = 0, total = 0
const failures = []
function assertTrue(cond, msg) {
  total++
  if (cond) { console.log(`  ✅ ${msg}`) }
  else { failed++; failures.push(msg); console.error(`  ❌ ${msg}`) }
}

console.log('=== parseChangelogEntries：格式变体（纯函数，输入为已切出的段文本）===')
{
  const text = [
    '| 日期 | 变更名 | 摘要 |',
    '|------|--------|------|',
    '| 2026-08-13 | 2026-08-13-worktree-execute-loss-guard | cleanup fail-closed 保护 |',
    '| 2026-08-11 | ql-20260811-003-b023（quick） | execute 复盘 c |',
    '| 2026-06-28 | 2026-06-28-worktree-deps-provision | 依赖供给 |',
    '',
    '- 2026-08-16-state-machine-fail-open | 状态机 fail-open 组修复 |',
    '- 2026-06-03 | 初始文档',
    '- 见 `runtime.changelog.md`——历史条目已迁出',
  ].join('\n')
  const es = parseChangelogEntries(text)
  assertTrue(es.length === 4, `表格+列表混合 4 条（表头/分隔/纯日期/指针行跳过，实得 ${es.length}）`)
  assertTrue(es[1].name === 'ql-20260811-003-b023', `（quick）后缀剥除（实得 ${es[1].name}）`)
  assertTrue(es[3].name === '2026-08-16-state-machine-fail-open' && es[3].summary === '状态机 fail-open 组修复',
    `列表行名/摘要正确，行尾悬空竖线不吃摘要（实得 ${es[3].summary}）`)
}
{
  // CRLF + 缺摘要列表行（整行只有名字）
  const es = parseChangelogEntries('## 变更索引（表格，初始为空）\r\n\r\n- 2026-05-28-agent-log-streaming\r\n')
  assertTrue(es.length === 1 && es[0].name === '2026-05-28-agent-log-streaming' && es[0].summary === '',
    `CRLF 容忍 + 无摘要列表行（实得 ${JSON.stringify(es)}）`)
}

console.log('\n=== readModuleRecentChanges：卡 + sidecar 合并（IO）===')
{
  const dir = mkdtempSync(join(tmpdir(), 'mod-changelog-'))
  try {
    writeFileSync(join(dir, 'demo.md'), [
      '# 演示（demo）', '',
      '## 变更索引（表格，初始为空）',
      '| 日期 | 变更名 | 摘要 |',
      '|------|--------|------|',
      '| 2026-08-01 | 2026-08-01-older | 卡内旧条目 |',
      '| 2026-08-20 | 2026-08-20-card-only | 仅卡内 |',
      '',
      '## 人工备注',
      '',
      '- 2026-99-99-not-in-section | 段外行不该被解析 |',,
    ].join('\n'))
    writeFileSync(join(dir, 'demo.changelog.md'), [
      '---',
      'doc_type: module-changelog',
      'module_id: demo',
      '---',
      '',
      '# demo 变更索引（changelog sidecar）',
      '',
      '| 日期 | 变更名 | 摘要 |',
      '|------|--------|------|',
      '| 2026-08-01 | 2026-08-01-older | sidecar 重复条目应被去重 |',
      '| 2026-08-25 | 2026-08-25-sidecar-new | sidecar 新条目 |',
      '',
    ].join('\n'))
    const es = readModuleRecentChanges(dir, 'demo')
    assertTrue(es.length === 3, `卡∪sidecar 同名去重后 3 条（实得 ${es.length}）`)
    assertTrue(es[0].name === '2026-08-25-sidecar-new', `日期降序最近在前（实得 ${es[0].name}）`)
    assertTrue(es.find(e => e.name === '2026-08-01-older')?.summary === '卡内旧条目', '同名去重卡优先（摘要取卡内）')
    assertTrue(!es.some(e => e.name === '2026-99-99-not-in-section'), '「## 变更索引」段外（人工备注之后）的行不解析')
    assertTrue(readModuleRecentChanges(dir, 'no-such-module').length === 0, '无卡无 sidecar → [] 不抛')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
if (failures.length) { console.log('失败项:'); failures.forEach(f => console.log('  - ' + f)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
