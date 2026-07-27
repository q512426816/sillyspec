/**
 * check-primitives.js — 共享的产物字面校验原语(纯函数)
 *
 * 从 workflow.js 的 checkOutput / _checkWorkflow 抽出,作为"何谓 contains_sections / min_lines /
 * no_placeholder / no_empty_files"的**全仓单一语义源**。workflow 引擎与 stage-contract 引擎
 * (stage-contract-engine.js)共用同一组谓词,杜绝"workflow 认 `## X` 子串、stage-contract 认别的"
 * 这类判定分叉(本任务的"事前==事后"同源在原语层就成立)。
 *
 * 设计原则:纯文本判定,不碰 fs。调用方负责读文件 + CRLF 归一化后传入 content——
 * 这样 Windows CRLF 差异在调用方收敛(plan-postcheck 已用 LF-normalizing reader),引擎拿到
 * 什么判什么,不在原语层二次引入 readFileSync 差异(缺陷 windows-python-crlf-taskcard 的根因)。
 */

// no_placeholder 的默认占位词。与原 workflow.js checkOutput/_checkWorkflow 逐字一致——
// 改动会破坏存量扫描文档的占位判定,属契约级常量。
const DEFAULT_PLACEHOLDER_PATTERNS = [
  '待补充', 'TODO', 'TBD', '未分析', '根据项目情况', '根据实际情况', '按需填写',
]

/** 内容非空(trim 后有字符)。用于 no_empty_files。 */
export function contentNonEmpty(content) {
  return typeof content === 'string' && content.trim().length > 0
}

/** 行数(split('\n'))。用于 min_lines 的 detail 文案与判定。 */
export function lineCount(content) {
  return typeof content === 'string' ? content.split('\n').length : 0
}

/** 行数 ≥ min。用于 min_lines 判定。 */
export function meetsMinLines(content, min) {
  return lineCount(content) >= min
}

/**
 * 返回缺失的章节(sections 中未以 `## <section>` 子串出现的)。
 * 用于 contains_sections——判定与原 workflow.js 逐字一致(`## ${s}` 前缀子串匹配)。
 */
export function missingSections(content, sections) {
  if (typeof content !== 'string') return sections.slice()
  return sections.filter(s => !content.includes(`## ${s}`))
}

/** 是否含全部章节(missingSections 为空的语法糖)。 */
export function hasAllSections(content, sections) {
  return missingSections(content, sections).length === 0
}

/**
 * 返回命中的占位词(patterns 中匹配"独立成行"的)。
 * 用于 no_placeholder——正则 `^\s*[-*]?\s*<p>\s*$`(m flag)与原 workflow.js 逐字一致。
 * patterns 为空/未传时用 DEFAULT_PLACEHOLDER_PATTERNS(等价原 `check.patterns || [defaults]`)。
 */
export function placeholderLineMatches(content, patterns) {
  if (typeof content !== 'string') return []
  const pats = (patterns && patterns.length > 0) ? patterns : DEFAULT_PLACEHOLDER_PATTERNS
  return pats.filter(p => new RegExp(`^\\s*[-*]?\\s*${p}\\s*$`, 'm').test(content))
}

/** 无占位词命中(placeholderLineMatches 为空的语法糖)。 */
export function hasNoPlaceholderLine(content, patterns) {
  return placeholderLineMatches(content, patterns).length === 0
}

export { DEFAULT_PLACEHOLDER_PATTERNS }
