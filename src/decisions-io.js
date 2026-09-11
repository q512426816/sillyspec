/**
 * decisions-io.js（P1-5，noai-ir-roadmap §4）：decisions.md 的 CLI 单一写入者。
 *
 * 背景：decisions.md 此前由 agent 手拼自由 markdown，13 处解析点里它占两处
 * （decision-distill parseDecisions × design-facts 镜像），历史事故全在「手写格式走样」：
 * 扁平列表静默 0 条（decision-flat-list-silent-zero）、CRLF 状态行恒失败、字段标签拼写漂移。
 * 单一写入者 = canonical 格式只此一家：标题式条目（`## D-001@v2 标题` + `- 字段：值`，
 * 字段标签用 applyField 白名单的中文正统名），读取侧 parseDecisions 零改动双向兼容。
 *
 * 语义：
 *   - upsertDecision：同 id@v 条目整块替换（幂等，重跑同输入零 diff）；新条目追加文末。
 *     不碰 frontmatter 与其他条目；EOL 跟随原文件；原子写。
 *   - 校验：number 形态 D-xxx、version 正整数、status/type 白名单外的值拒绝
 *     （fail-fast——写入者先于解析者挡格式错误，这正是单一写入者的意义）。
 *   - agent 仍可手写正文散文（决策动机等），但结构化字段一律走本写入者。
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { writeAtomicSync } from './fs-atomic.js'

const STATUS_VALUES = new Set(['confirmed', 'accepted', 'implemented', 'rejected', 'proposed', 'superseded', 'draft'])
const TYPE_VALUES = new Set(['architecture', 'compatibility', 'boundary', 'definition', 'process', 'scope'])

/**
 * canonical 条目渲染（正文散文行原样保留在 body 数组）。
 * @param {{ number: string, version: number, title: string, body?: string[], status?: string, type?: string, question?: string, answer?: string, anchor?: string, domains?: string[], rejectReason?: string, revisitWhen?: string, supersedes?: string, impacts?: string, normalizedRequirement?: string }} d
 * @returns {string} 条目 markdown 块（不含首尾空行）
 */
export function renderDecisionEntry(d) {
  if (!d || !/^D-\d+$/.test(d.number || '')) throw new Error(`决策编号形态非法（期望 D-xxx，实得 ${JSON.stringify(d && d.number)}）`)
  const version = parseInt(d.version, 10)
  if (!Number.isInteger(version) || version < 1) throw new Error(`决策版本非法（期望正整数，实得 ${JSON.stringify(d.version)}）`)
  if (d.status && !STATUS_VALUES.has(d.status)) throw new Error(`status 白名单外：${d.status}（合法：${[...STATUS_VALUES].join(' / ')}）`)
  if (d.type && !TYPE_VALUES.has(d.type)) throw new Error(`type 白名单外：${d.type}（合法：${[...TYPE_VALUES].join(' / ')}）`)
  const lines = [`## ${d.number}@v${version} ${String(d.title || '').trim()}`]
  if (d.status) lines.push(`- 状态：${d.status}`)
  if (d.type) lines.push(`- 类型：${d.type}`)
  if (Array.isArray(d.domains) && d.domains.length > 0) lines.push(`- 模块域：${d.domains.join(', ')}`)
  if (d.question) lines.push(`- 问题：${d.question}`)
  if (d.answer) lines.push(`- 答案：${d.answer}`)
  if (d.anchor) lines.push(`- 锚点：${d.anchor}`)
  if (d.supersedes) lines.push(`- supersedes：${d.supersedes}`)
  if (d.impacts) lines.push(`- 影响：${d.impacts}`)
  if (d.rejectReason) lines.push(`- 否决理由：${d.rejectReason}`)
  if (d.revisitWhen) lines.push(`- 复潮条件：${d.revisitWhen}`)
  if (d.normalizedRequirement) lines.push(`- normalized_requirement：${d.normalizedRequirement}`)
  for (const prose of (Array.isArray(d.body) ? d.body : [])) {
    if (typeof prose === 'string' && prose.trim() !== '') lines.push(prose.trimEnd())
  }
  return lines.join('\n')
}

/**
 * upsert 一条决策：同 id@v 整块替换，否则文末追加。返回 { path, action: 'replaced'|'appended' }。
 * 文件不存在 → 以新文件创建（含空 frontmatter 占位不写——decisions.md 可无 frontmatter，
 * 但本仓惯例有 author/created_at；创建时写最小 frontmatter 由调用方 flag 补充）。
 */
export function upsertDecision(changeDir, decision) {
  const filePath = join(changeDir, 'decisions.md')
  const block = renderDecisionEntry(decision)
  const id = `${decision.number}@v${parseInt(decision.version, 10)}`
  if (!existsSync(filePath)) {
    const content = `# 决策记录\n\n${block}\n`
    writeAtomicSync(filePath, content)
    return { path: filePath, action: 'appended' }
  }
  const raw = readFileSync(filePath, 'utf8')
  const eol = raw.includes('\r\n') ? '\r\n' : '\n'
  const normalized = raw.replace(/\r\n/g, '\n')
  const lines = normalized.split('\n')
  const header = `## ${id} `
  const startIdx = lines.findIndex((l) => l.startsWith(`## ${id} `) || l.trim() === `## ${id}`)
  if (startIdx === -1) {
    const next = normalized.replace(/\n*$/, '\n') + '\n' + block + '\n'
    writeAtomicSync(filePath, eol === '\n' ? next : next.replace(/\n/g, '\r\n'))
    return { path: filePath, action: 'appended' }
  }
  let endIdx = lines.length
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (lines[i].startsWith('## ')) { endIdx = i; break }
  }
  // 保留原条目正文散文（非「- 字段：值」白名单行）随替换块回填——CLI 拥有字段，散文归作者
  const preservedProse = []
  for (const line of lines.slice(startIdx + 1, endIdx)) {
    const t = line.trim()
    if (t === '' ) continue
    if (/^(?: {1,4})?[-*]\s+(状态|类型|模块域|问题|答案|锚点|否决理由|复潮条件|影响)\s*[：:]/.test(t)) continue
    if (/^(?: {1,4})?[-*]\s+(supersedes|impacts|normalized_requirement|status|type|domains|domain|question|answer|anchor|reject_reason|revisit_when)\s*[：:]/i.test(t)) continue
    preservedProse.push(line)
  }
  const merged = { ...decision, body: [...(decision.body || []), ...preservedProse] }
  const mergedBlock = renderDecisionEntry(merged)
  const next = [...lines.slice(0, startIdx), ...mergedBlock.split('\n'), '', ...lines.slice(endIdx)].join('\n')
  writeAtomicSync(filePath, eol === '\n' ? next : next.replace(/\n/g, '\r\n'))
  return { path: filePath, action: 'replaced' }
}
