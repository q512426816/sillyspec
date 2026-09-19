/**
 * 自举声明表校验钉（2026-09-19，坑 blast-section-lost-skipapply）
 *
 * 当天实证：five-cuts 归档走 --skip-apply 后主仓 map 的 blast 段整体缺失——
 * loadBlastDeclarations 返回 0 条 → evidence 门恒 false、会话/租约域变更判 S1
 * 逃顶档。**丢段不报错，是安静地不设防**——任何一次 map 重写/skip-apply/手工合并
 * 都可能复发。本钉在 CI 层硬拦：本仓 map 的声明表低于自举基线即红。
 *
 * 三组断言：
 *   1. blast 段：≥3 条目；会话域关键前缀在场（worktree/progress/dispatch 域至少各一）；
 *      S3+evidence 条目 ≥1（evidence 门的本仓存续依据）；门禁判定 S2 条目在场。
 *   2. span_risk 段：loadSpanRiskPatterns ≥9 token；migration/scheduling 族各 ≥1。
 *   3. 走位抽样：worktree.js → S3+evidence；stage-contract.js → S2；datetime.js → S1
 *      （三档语义钉——丢了哪一档这组立刻指认）。
 */
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadBlastDeclarations } from '../src/blast-surface.js'
import { loadSpanRiskPatterns } from '../src/span-risk-surface.js'
import { resolveChangeRisk } from '../src/change-risk-profile.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..')
const specBase = join(repoRoot, '.sillyspec')

let passed = 0, failed = 0
function assert(name, cond, detail = '') {
  if (cond) { console.log(`✅ PASS: ${name}`); passed++ }
  else { console.log(`❌ FAIL: ${name}${detail ? ' — ' + detail : ''}`); failed++ }
}

console.log('\n=== 自举声明表校验钉（blast 段丢失防复发）===\n')

// ── 组一：blast 段基线 ──
{
  const { declarations } = loadBlastDeclarations({ specBase, project: 'sillyspec' })
  assert('组一：blast 声明 ≥3 条目（自举基线）', declarations.length >= 3, `实际 ${declarations.length}——若 <3 疑似段丢失（查 git log 该文件 + 悬空提交恢复先例 ql-016）`)
  const evidenceEntries = declarations.filter(d => d.evidence === true)
  assert('组一：S3+evidence 条目 ≥1（evidence 门的存续依据）', evidenceEntries.length >= 1, '全部无 evidence——证据门在本仓失效')
  const flat = declarations.flatMap(d => d.prefixes)
  assert('组一：会话域前缀在场（agent-session-log / friction-ledger / progress/ 之一）',
    flat.some(p => /agent-session-log|friction-ledger|progress/.test(p)))
  assert('组一：worktree 域前缀在场', flat.some(p => /worktree|wt-commit|git-helper/.test(p)))
  assert('组一：门禁判定 S2 条目在场（stage-contract / ceremony-tier 之一）',
    declarations.some(d => d.tier === 'S2' && d.prefixes.some(p => /stage-contract|ceremony-tier/.test(p))))
}

// ── 组二：span_risk 段基线 ──
{
  const compiled = loadSpanRiskPatterns({ specBase, project: 'sillyspec' })
  const tokens = compiled.map(e => e && e.pattern).filter(Boolean)
  assert('组二：span_risk ≥9 token（自举基线）', tokens.length >= 9, `实际 ${tokens.length}`)
  assert('组二：migration 族在场', tokens.some(t => /migrat/.test(t)))
  assert('组二：scheduling 族在场', tokens.some(t => /sched|cron|job/.test(t)))
}

// ── 组三：三档走位语义钉 ──
{
  const { declarations } = loadBlastDeclarations({ specBase, project: 'sillyspec' })
  const top = resolveChangeRisk({ files: ['src/worktree.js', 'src/friction-ledger.js'], blastDeclarations: declarations })
  assert('组三：会话域 → S3+evidence', top.tier === 'S3' && top.evidenceRequired === true, `实际 ${top.tier}/${top.evidenceRequired}`)
  const mid = resolveChangeRisk({ files: ['src/stage-contract.js', 'src/ceremony-tier.js'], blastDeclarations: declarations })
  assert('组三：门禁判定面 → S2', mid.tier === 'S2' && mid.evidenceRequired === false, `实际 ${mid.tier}/${mid.evidenceRequired}`)
  const low = resolveChangeRisk({ files: ['src/datetime.js', 'docs/readme.md'], blastDeclarations: declarations })
  assert('组三：零声明面 → S1', low.tier === 'S1' && low.evidenceRequired === false, `实际 ${low.tier}/${low.evidenceRequired}`)
}

console.log(`\n✅ 通过: ${passed}  ❌ 失败: ${failed}`)
if (failed > 0) {
  console.error('\n💥 自举声明表低于基线——blast/span_risk 段疑似丢失。恢复路径先例：git show <悬空提交>:.sillyspec/docs/sillyspec/modules/_module-map.yaml 取段回落（ql-20260919-016）')
  process.exit(1)
}
