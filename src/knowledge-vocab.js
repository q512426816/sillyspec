/**
 * knowledge-vocab.js — 词汇通道（常读词汇旁路注入）
 *
 * 背景（mattpocock-absorb ticket-01 / spec Implementation Decisions 1-3）：域词汇（术语
 * 与定义）散落在 knowledge 各文件里，只有检索命中才注入——agent 没主动检索时拿不到术语
 * 基准，导致对话中术语漂移、每个会话重新定义一遍。本通道给 knowledge 目录提供一份
 * 常读词汇文件，CLI 在知识注入时点无条件旁路注入。
 *
 * 词汇约定（单一源，本文件即约定的机器面）：
 *   - 位置：knowledge 目录下 `glossary.md`（单一词汇文件，维护者集中一处维护，改一个
 *     定义所有会话立即生效）。
 *   - 格式：markdown 术语行式——每行一条「术语：定义」（中文冒号「：」或英文冒号「:」皆
 *     可，行内首个冒号前为术语、后为一两句定义）；`#` 开头行为标题/注释行，空行分隔。
 *     注入为全文原样注入（不做逐条解析重渲染，保留维护者的排版），截断与超限留痕归
 *     ticket-03（本版全文）。
 *
 * 旁路语义（spec Implementation Decision 1，勿破）：不经 matchKnowledge 的任何匹配层
 * （路由 tag / 词片 / 停车场兜底——glossary.md 不登记进 INDEX.md 即天然零参与）、不占
 * top-3 命中名额、不进命中分母——读取词汇文件是独立路径，本函数是唯一入口。
 *
 * 缺失语义（Implementation Decision 2，proceed silently）：文件缺失/不可读/全空白 →
 * 返回 ''，不告警不阻断（绿地仓零仪式成本）；调用方拼接时 '' 即零输出，行为与没有
 * 本特性时逐字一致。
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/** 词汇文件名（相对 knowledge 目录；约定锚，勿改名——改名即所有仓词汇静默失效） */
export const VOCAB_FILE = 'glossary.md'

/** 词汇段段头（与「📚 命中知识」段并列的独立小节；消费端测试以此作段锚） */
export const VOCAB_SECTION_HEADER = '📖 词汇基准（本仓域术语约定，恒注入；维护于 knowledge/glossary.md）'

/**
 * 读词汇文件并渲染词汇基准段（纯函数，无副作用、无遥测——遥测归 ticket-03）。
 * @param {string} knowledgeDir - knowledge 目录路径（INDEX.md 同级）
 * @returns {string} 词汇基准段文本（段头 + 文件正文，CRLF 归一、首尾空行 trim）；
 *   文件缺失/不可读/全空白 → ''（proceed silently，零告警）。
 */
export function readVocabSection(knowledgeDir) {
  if (!knowledgeDir) return ''
  let text
  try {
    text = readFileSync(join(knowledgeDir, VOCAB_FILE), 'utf8')
  } catch {
    return '' // 缺失/不可读 → 静默跳过（消费端纪律：不告警、不阻断）
  }
  // CRLF/CR 归一（Windows 知识文件；与 renderKnowledgeInjectSection 同款口径）
  const body = String(text).replace(/\r\n?/g, '\n').replace(/^\n+/, '').replace(/\n+$/, '')
  if (body.trim() === '') return '' // 全空白与缺失同态（无内容即无段）
  return `${VOCAB_SECTION_HEADER}\n${body}`
}
