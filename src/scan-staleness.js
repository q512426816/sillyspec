/**
 * scan-staleness — scan 文档漂移检测（债单 D-7 方案 A，change: 2026-08-15 ql-20260815-013）
 *
 * 原则（doc-consistency-debt 第六节用户裁决）：CLI 算事实注入——git 算出 scan 文档落后程度，
 * 注入给 agent 的是一行结论不是一段劝说指令。brainstorm「加载项目上下文」读 scan 文档前
 * 就知道"我读的架构描述可能过期"，不再盲信。
 *
 * 判定口径：scan 文档 frontmatter 的 source_commit（modules.js 写入、worktree-guard 覆盖
 * 保护同源字段）vs 当前 HEAD——`git rev-list --count <source_commit>..HEAD` + 提交时间差。
 * 纯读操作（git 只读 + frontmatter 解析），任何失败降级 null（advisory 信号不阻断流程）。
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { safeGit } from './git-helper.js'

/** 漂移阈值（commit 数 / 天数，超过任一即 stale；advisory 性质允许保守默认） */
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
 * @returns {{ status: 'fresh'|'stale'|'unknown', behindCommits: number|null, daysSinceScan: number|null, sourceCommit: string|null, message: string }|null}
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
      message: 'scan 文档无 source_commit 字段（旧版生成），无法判漂移——如架构已大改建议重跑 sillyspec run scan --standard' }
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
      message: `scan 文档新鲜（落后 ${behindCommits} commit / ${daysSinceScan ?? '?'} 天）` }
  }
  return {
    status: 'stale', behindCommits, daysSinceScan, sourceCommit,
    message: `⚠️ scan 文档过期：停在 ${sourceCommit.slice(0, 7)}（${daysSinceScan ?? '?'} 天前），期间源码已推进 ${behindCommits} commit。` +
      `本次加载的架构/结构描述可能失真——涉及结构变更的 design 不要盲信 scan 文档，以实读代码为准；` +
      `如需刷新基线跑 sillyspec run scan --standard --force-rescan`,
  }
}
