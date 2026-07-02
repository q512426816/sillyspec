/**
 * quick-recommend.js — quick 阶段多变更关联推荐打分
 *
 * 多变更场景下，quick 启动前用「脏文件 + 任务描述」双信号，
 * 推测当前 quick 改动最可能归属哪些活跃变更，供交互式多选默认勾选。
 *
 * 纯函数 + 只读文件系统，无副作用，便于单测。
 */
import { join } from 'path'
import { existsSync, readFileSync } from 'fs'
import { parseFileChangeList } from './change-list.js'

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * 单个 token 是否命中上下文（参考 knowledge-match.js 的 keywordMatchesContext 思路）。
 * - 过短（<2 字符）视为噪音
 * - 非 ASCII（中文等）用子串匹配
 * - ASCII 用词边界匹配，避免 "DB" 误命中 "dashboard"
 */
function tokenInContext(token, contextLower) {
  const t = token.toLowerCase().trim()
  if (t.length < 2) return false
  if (/[^\x00-\x7f]/.test(t)) {
    // 中文（等非 ASCII）：用 2-gram 重叠匹配。
    // 避免整串子串匹配漏召回（如 token「修解析器」与 context「修复解析器」整串不等，
    // 但共享 2-gram「解析」）。2-gram 足以抑制单字噪音，又能覆盖词形变化。
    for (let i = 0; i <= t.length - 2; i++) {
      if (contextLower.includes(t.slice(i, i + 2))) return true
    }
    return false
  }
  return new RegExp(`(^|[^a-z0-9])${escapeRegex(t)}([^a-z0-9]|$)`).test(contextLower)
}

/**
 * 把任务描述切成用于匹配的 token（按空白/标点切分，过滤空串）。
 * 保留中英文混排，不做分词——推荐只求召回，精确度靠用户最终勾选把关。
 */
function tokenizeDescription(desc) {
  if (!desc) return []
  return desc
    .split(/[\s,，。、;；:：()（）\[\]{}"'`/\\|]+/)
    .map(t => t.trim())
    .filter(Boolean)
}

/** 读取变更 proposal.md 的全文（小写），用于任务描述信号匹配；缺失返回空串。 */
function readProposalContext(specDir, changeName) {
  const p = join(specDir, 'changes', changeName, 'proposal.md')
  if (!existsSync(p)) return ''
  try {
    return readFileSync(p, 'utf8').toLowerCase()
  } catch {
    return ''
  }
}

/**
 * 判断单个脏文件是否命中 design.md 声明的文件清单。
 * 支持精确匹配 + 目录前缀匹配（design 可能写目录、脏文件是目录下文件，或反之）。
 */
function fileHitsList(dirtyFile, fileList) {
  if (fileList.has(dirtyFile)) return true
  for (const declared of fileList) {
    if (declared === dirtyFile) continue
    if (dirtyFile.startsWith(declared + '/') || declared.startsWith(dirtyFile + '/')) return true
  }
  return false
}

/**
 * 推荐关联变更。
 * @param {{ activeChanges: string[], specDir: string, baselineFiles?: string[], quickFiles?: string[], taskDescription?: string }} opts
 * @returns {{ name: string, score: number, reasons: string[] }[]} 按 score 降序、同名升序
 */
export function recommendChanges({
  activeChanges,
  specDir,
  baselineFiles = [],
  quickFiles = [],
  taskDescription = '',
}) {
  if (!activeChanges || activeChanges.length === 0) return []

  const dirtyFiles = [...new Set([...baselineFiles, ...quickFiles])]
    .filter(f => f && !f.startsWith('.sillyspec/'))
  const descTokens = [...new Set(tokenizeDescription(taskDescription))]

  const results = activeChanges.map(name => {
    const reasons = []

    // 信号 1：脏文件命中 design.md 文件变更清单
    const fileList = parseFileChangeList(join(specDir, 'changes', name, 'design.md'))
    if (fileList.size > 0 && dirtyFiles.length > 0) {
      for (const f of dirtyFiles) {
        if (fileHitsList(f, fileList)) reasons.push(`脏文件命中: ${f}`)
      }
    }

    // 信号 2：任务描述 token 命中 proposal.md
    const proposalCtx = readProposalContext(specDir, name)
    if (proposalCtx && descTokens.length > 0) {
      for (const t of descTokens) {
        if (tokenInContext(t, proposalCtx)) reasons.push(`任务描述命中: ${t}`)
      }
    }

    return { name, score: reasons.length, reasons }
  })

  return results.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
}
