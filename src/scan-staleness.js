/**
 * scan-staleness — scan 文档新鲜度提示（债单 D-7 方案 A，change: 2026-08-15 ql-20260815-013；
 * 2026-08-16 ql-20260816-009-fb44 修正判定语义）
 *
 * 原则（doc-consistency-debt 第六节用户裁决）：CLI 算事实注入——git 算出 scan 文档落后程度，
 * 注入给 agent 的是一行结论不是一段劝说指令。brainstorm「加载项目上下文」读 scan 文档前
 * 就知道"我读的 scan 文档可能没跟上近期结构变更"，按提示核对或重扫，而非盲信。
 *
 * 判定语义（2026-08-16 修正，与第七节「behind 计数不参与判定」对齐）：source_commit vs HEAD
 * 的 `rev-list --count` 落后数只是「建议核对/重扫」的提示信号（旧快照可能未收录近期新增模块），
 * 不是「文档失效/失真」的判据——文档引用是否失效由 docs-check（直接信号，src/docs-check.js）
 * 负责，与 docs-gate 原则一致。status 三态 fresh / needs-refresh / unknown：needs-refresh =
 * 该刷新/核对，不是文档判错。
 *
 * 纯读操作（git 只读 + frontmatter 解析），任何失败降级 null/unknown（advisory 信号不阻断流程）。
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { safeGit } from './git-helper.js'

/** 刷新提示阈值（commit 数 / 天数，超过任一即 needs-refresh；advisory 提示允许保守默认） */
export const STALENESS_THRESHOLDS = { commits: 50, days: 14 }

/**
 * 纯函数：从 scan 文档内容解析 frontmatter 的 source_commit。
 * @param {string} content 文档全文
 * @returns {string|null} commit hex（短/长均可）；无字段/无 frontmatter → null
 */
export function parseSourceCommit(content) {
  if (!content || typeof content !== 'string') return null
  // \r? 容错 CRLF（$ 前的 \r 会致 LF 正则失配）
  const m = content.match(/^---\r?\n[\s\S]*?^source_commit:\s*([0-9a-f]{7,40})\s*\r?$/m)
  return m ? m[1] : null
}

/**
 * 计算单个 project 的 scan 文档漂移事实。
 * @param {{ projectRoot: string, specBase: string, projectName: string, thresholds?: { commits: number, days: number } }} opts
 * @returns {{ status: 'fresh'|'needs-refresh'|'unknown', behindCommits: number|null, daysSinceScan: number|null, sourceCommit: string|null, message: string }|null}
 *   null = 无 scan 文档目录（绿地项目等），调用方直接跳过；unknown = 有文档但算不出（无
 *   source_commit 字段 / git 失败），message 说明降级原因。
 */
export function computeScanStaleness(opts) {
  const { projectRoot, specBase, projectName, thresholds = STALENESS_THRESHOLDS } = opts || {}
  if (!projectRoot || !specBase || !projectName) return null
  const scanDir = join(specBase, 'docs', projectName, 'scan')
  if (!existsSync(scanDir)) return null

  // 任一 scan 文档带 source_commit 即可代表整批（modules.js 同批写入同值）
  let sourceCommit = null
  let checked = 0
  for (const f of readdirSync(scanDir)) {
    if (!f.endsWith('.md')) continue
    checked++
    const c = parseSourceCommit(readFileSync(join(scanDir, f), 'utf8'))
    if (c) { sourceCommit = c; break }
  }
  if (checked === 0) return null
  if (!sourceCommit) {
    return { status: 'unknown', behindCommits: null, daysSinceScan: null, sourceCommit: null,
      message: 'scan 文档无 source_commit 字段（旧版生成），无法算漂移提示——文档引用是否失效以 docs check 为准；如架构已大改建议重跑 sillyspec run scan --standard' }
  }

  const head = safeGit(projectRoot, ['rev-parse', 'HEAD'])
  if (head.error || !head.value) {
    return { status: 'unknown', behindCommits: null, daysSinceScan: null, sourceCommit,
      message: `git 读取失败（${head.error || '无 HEAD'}），跳过漂移判定` }
  }
  const isAncestor = safeGit(projectRoot, ['merge-base', '--is-ancestor', sourceCommit, head.value.trim()])
  if (isAncestor.error) {
    return { status: 'unknown', behindCommits: null, daysSinceScan: null, sourceCommit,
      message: `source_commit ${sourceCommit.slice(0, 7)} 不在当前分支历史（分支切换/rebase），跳过漂移判定` }
  }
  const countRes = safeGit(projectRoot, ['rev-list', '--count', `${sourceCommit}..HEAD`])
  const behindCommits = countRes.error ? null : parseInt(countRes.value, 10)
  if (behindCommits === null || Number.isNaN(behindCommits)) {
    return { status: 'unknown', behindCommits: null, daysSinceScan: null, sourceCommit,
      message: 'rev-list 计数失败，跳过漂移判定' }
  }
  const dateRes = safeGit(projectRoot, ['log', '-1', '--format=%cI', sourceCommit])
  const daysSinceScan = dateRes.error ? null
    : Math.floor((Date.now() - new Date(dateRes.value.trim()).getTime()) / 86400000)

  const stale = behindCommits >= thresholds.commits || (daysSinceScan !== null && daysSinceScan >= thresholds.days)
  if (!stale) {
    return { status: 'fresh', behindCommits, daysSinceScan, sourceCommit,
      message: `scan 文档无需刷新（落后 ${behindCommits} commit / ${daysSinceScan ?? '?'} 天，低于提示阈值）` }
  }
  return {
    status: 'needs-refresh', behindCommits, daysSinceScan, sourceCommit,
    message: `⚠️ scan 文档已落后源码 ${behindCommits} commit / ${daysSinceScan ?? '?'} 天（基线 ${sourceCommit.slice(0, 7)}）。` +
      `落后数≠文档错误——文档引用是否失效由 docs check 判定；旧快照可能未收录近期新增模块/流程，` +
      `涉及结构/模块判断建议核对源码，或跑 sillyspec run scan --standard --force-rescan 刷新基线`,
  }
}
