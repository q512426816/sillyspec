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
 *     注入为全文原样注入（不做逐条解析重渲染，保留维护者的排版）。
 *
 * 膨胀防线（mattpocock-absorb ticket-03）：词汇正文行数超过 VOCAB_MAX_LINES（缺省 40，
 * 行数口径＝glossary.md 归一后正文，不含段头与截断标记行）时截断到上限并在段尾附截断
 * 标记行；同时 console.warn 恰一次留痕（含截断说明与「词汇文件需精简」提示——去重口径
 * 为按注入调用即一次，每次截断的注入调用各 warn 一次，不做跨进程/跨调用去重）。
 *
 * 旁路语义（spec Implementation Decision 1，勿破）：不经 matchKnowledge 的任何匹配层
 * （路由 tag / 词片 / 停车场兜底——glossary.md 不登记进 INDEX.md 即天然零参与）、不占
 * top-3 命中名额、不进命中分母——读取词汇文件是独立路径，本模块是唯一入口。
 *
 * 遥测（ticket-03）：词汇注入在拼装进 prompt 输出时落一行独立 type:`vocab-inject` 的
 * hits.jsonl 记录（appendVocabInjectTelemetry，fail-soft），与检索命中的 type:`inject`
 * 可区分；记录无 matchedFiles 字段——词汇不进命中分母。
 *
 * 缺失语义（Implementation Decision 2，proceed silently）：文件缺失/不可读/全空白 →
 * 返回 ''，不告警不阻断（绿地仓零仪式成本）；调用方拼接时 '' 即零输出，行为与没有
 * 本特性时逐字一致。
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { appendKnowledgeHit } from './knowledge-hits.js'

/** 词汇文件名（相对 knowledge 目录；约定锚，勿改名——改名即所有仓词汇静默失效） */
export const VOCAB_FILE = 'glossary.md'

/** 词汇段段头（与「📚 命中知识」段并列的独立小节；消费端测试以此作段锚） */
export const VOCAB_SECTION_HEADER = '📖 词汇基准（本仓域术语约定，恒注入；维护于 knowledge/glossary.md）'

/**
 * 词汇正文行数上限（ticket-03 膨胀防线缺省值）。
 * 口径：glossary.md 归一（CRLF→LF、首尾空行 trim）后按 \n 切分的行数；恰等于上限不截断，
 * 超过即截到上限。段头与截断标记行不计入。词汇是「一行一条」的术语表，40 行 ≈ 40 条术语
 * ——足够覆盖域词汇基准，又把恒注入（每次阶段注入都在场）的膨胀面压在数十行量级。
 */
export const VOCAB_MAX_LINES = 40

/**
 * 读词汇文件并渲染词汇基准段（含截断元数据；ticket-03 截断与超限留痕挂这里）。
 * @param {string} knowledgeDir - knowledge 目录路径（INDEX.md 同级）
 * @param {number} [maxLines=VOCAB_MAX_LINES] - 词汇正文行数上限（正整数）
 * @returns {{section: string, lines: number, truncated: boolean}}
 *   section：段头 + 词汇正文（CRLF 归一、首尾空行 trim）；超限时正文截到上限并尾附截断
 *   标记行，且 console.warn 恰一次（按调用即一次）。lines：实际注入的正文行数（截断后）。
 *   truncated：是否发生截断。文件缺失/不可读/全空白 → { section: '', lines: 0,
 *   truncated: false }（proceed silently，零告警）。
 */
export function readVocabSectionDetailed(knowledgeDir, maxLines = VOCAB_MAX_LINES) {
  if (!knowledgeDir) return { section: '', lines: 0, truncated: false }
  let text
  try {
    text = readFileSync(join(knowledgeDir, VOCAB_FILE), 'utf8')
  } catch {
    return { section: '', lines: 0, truncated: false } // 缺失/不可读 → 静默跳过（零告警、不阻断）
  }
  // CRLF/CR 归一（Windows 知识文件；与 renderKnowledgeInjectSection 同款口径）
  const body = String(text).replace(/\r\n?/g, '\n').replace(/^\n+/, '').replace(/\n+$/, '')
  if (body.trim() === '') return { section: '', lines: 0, truncated: false } // 全空白与缺失同态
  const bodyLines = body.split('\n')
  if (bodyLines.length > maxLines) {
    // 膨胀防线（ticket-03）：截到上限 + warn 恰一次（按调用即一次，不做跨调用去重）。
    // warn 面向维护者（词汇文件需精简），截断标记行面向消费端 agent（知道段被裁过）。
    console.warn(
      `[sillyspec] 词汇基准段超限截断：knowledge/${VOCAB_FILE} 正文 ${bodyLines.length} 行 > 上限 ${maxLines} 行，仅注入前 ${maxLines} 行——词汇文件需精简（一行一条「术语：定义」）`
    )
    return {
      section: `${VOCAB_SECTION_HEADER}\n${bodyLines.slice(0, maxLines).join('\n')}\n…（词汇超行截断：正文 ${bodyLines.length} 行 > 上限 ${maxLines} 行，词汇文件需精简）`,
      lines: maxLines,
      truncated: true,
    }
  }
  return { section: `${VOCAB_SECTION_HEADER}\n${body}`, lines: bodyLines.length, truncated: false }
}

/**
 * 读词汇文件并渲染词汇基准段（兼容入口，ticket-01 契约签名不变——只关心段文本的调用方用）。
 * 截断行为与 readVocabSectionDetailed 完全一致（含截断 warn）。
 * @param {string} knowledgeDir - knowledge 目录路径（INDEX.md 同级）
 * @param {number} [maxLines=VOCAB_MAX_LINES] - 词汇正文行数上限
 * @returns {string} 词汇基准段文本；文件缺失/不可读/全空白 → ''（proceed silently）。
 */
export function readVocabSection(knowledgeDir, maxLines = VOCAB_MAX_LINES) {
  return readVocabSectionDetailed(knowledgeDir, maxLines).section
}

/**
 * 词汇注入独立遥测（ticket-03）：词汇段拼装进 prompt 输出时落一行 type:`vocab-inject`
 * 记录，与检索命中的 type:`inject` 可区分；无 matchedFiles 字段——词汇不进命中分母。
 * fail-soft：遥测写失败不影响注入本体（与 buildKnowledgeInjection 内 inject 遥测同款口径）。
 * @param {string} runtimeDir - .runtime 目录（hits.jsonl 落点）
 * @param {string} change - 变更名 / quick sessionId（进遥测记录 change 字段）
 * @param {{lines: number, truncated: boolean}} meta - readVocabSectionDetailed 产出的截断元数据
 */
export function appendVocabInjectTelemetry(runtimeDir, change, meta) {
  try {
    appendKnowledgeHit(runtimeDir, {
      type: 'vocab-inject',
      change: change || '',
      lines: meta && typeof meta.lines === 'number' ? meta.lines : 0,
      truncated: Boolean(meta && meta.truncated),
    })
  } catch { /* 遥测 fail-soft：hits 落盘失败不阻断注入本体 */ }
}
