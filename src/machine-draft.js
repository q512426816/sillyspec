/**
 * machine-draft.js — MACHINE-DRAFT 指纹三件套泛化（R7 切片三 task-04 / D-004 / FR-08）。
 *
 * 从 verify-draft.js（verify 填槽制 v2 件二）抽出通用原语，供 flow 四件机器稿（flow-draft）
 * 复用；verify-draft 改为消费方（导出签名与行为逐字不动，零回归硬门）。
 *
 * 三件套语义（护栏#2：守卫必须是验收侧的机制，永远不是生成侧的劝说）：
 *   - wrapSection：机器预填段以 MACHINE-DRAFT begin/end 注释对包裹，begin 内嵌段内容
 *     sha256（CRLF 归一）；amendCmd 按消费方参数化（verify-result 指向 verify-probes
 *     --amend-draft，flow 稿指向 flow amend-draft——勿把 agent 引向错误命令）；
 *   - verifyMarkers：三态拒收判定——标记缺失（被删/整份重写）/内容哈希失配（改写）/
 *     手工重锚未审计（标记哈希与台账不一致）；
 *   - reanchorText：按当前内容重锚哈希的纯文本变换（amend 留痕通道的机械半边；
 *     台账审计与落盘归消费方）。
 *
 * 本模块纯函数（无 fs）——md 文本与台账对象由消费方读写；段 key 命名空间归消费方
 * （verify-result 单文件段键 / flow 按文件名+段键组合）。
 */
import { createHash } from 'node:crypto'

export const MARK_BEGIN_RE = /^<!--\s*MACHINE-DRAFT:([\w.-]+):([0-9a-f]{64}):begin.*-->\s*$/
const MARK_END_RE = /^<!--\s*MACHINE-DRAFT:([\w.-]+):end.*-->\s*$/

/** 段内容哈希（CRLF 归一——跨平台写盘行尾漂移不炸指纹）。 */
export function bodyHash(s) {
  return createHash('sha256').update(String(s).replace(/\r\n/g, '\n')).digest('hex')
}

/**
 * 包裹机器段（begin 标记 + body + end 标记 + 尾空行）。标记格式与既有 MARK_*_RE 逐字兼容。
 * @returns {string} 四行块（含尾空行，消费方按原位替换）
 */
export function wrapSection({ key, body, amendCmd, guardNote = '整段改写会被 verify --done 拒收' }) {
  return [
    `<!-- MACHINE-DRAFT:${key}:${bodyHash(body)}:begin 机器预填段——${guardNote}；确要修改：${amendCmd} 留痕重锚 -->`,
    body,
    `<!-- MACHINE-DRAFT:${key}:end -->`,
    '',
  ].join('\n')
}

/**
 * 解析 md 中全部标记段（CRLF 归一）。
 * @returns {{key:string, markerHash:string, contentLines:string[]}[]}
 */
export function parseMarkerBlocks(text) {
  const lines = String(text).replace(/\r\n/g, '\n').split('\n')
  const blocks = []
  let current = null
  for (const line of lines) {
    const b = line.match(MARK_BEGIN_RE)
    if (b) { current = { key: b[1], markerHash: b[2], contentLines: [] }; blocks.push(current); continue }
    const e = line.match(MARK_END_RE)
    if (e) { current = null; continue }
    if (current) current.contentLines.push(line)
  }
  return blocks
}

/**
 * 三态拒收判定（--done 验收侧承重件的纯函数半边）。
 * @param {object} p
 * @param {string} p.text md 全文
 * @param {Object<string,{hash:string}>} p.sections 台账段哈希（sidecar.sections 形态）
 * @param {string} p.amendCmd 修复指引命令文案（消费方参数化）
 * @returns {string[]} violations（空=干净；文案含修复指引）
 */
export function verifyMarkers({ text, sections, amendCmd }) {
  const blocks = parseMarkerBlocks(text)
  const byKey = new Map(blocks.map((b) => [b.key, b]))
  const violations = []
  const fix = (key) => `还原机器段原文，或确要修改时跑 ${amendCmd} 留痕重锚（段键 ${key}）`
  for (const [key, rec] of Object.entries(sections || {})) {
    const b = byKey.get(key)
    if (!b) {
      violations.push(`机器段「${key}」的 MACHINE-DRAFT 标记缺失（被删除或整份重写）——${fix(key)}`)
      continue
    }
    const actual = bodyHash(b.contentLines.join('\n'))
    if (actual !== rec.hash) {
      violations.push(`机器段「${key}」内容与指纹失配（被改写）——${fix(key)}`)
    } else if (b.markerHash !== rec.hash) {
      // 内容未动但标记哈希与台账不一致 = 标记被手工重锚而未经 amend 审计
      violations.push(`机器段「${key}」标记指纹与 sidecar 台账不一致（未经 --amend-draft 的手工重锚）——${fix(key)}`)
    }
  }
  return violations
}

/**
 * 按当前内容重锚全部标记段（纯文本变换；不落盘不记台账——消费方持 mdPath/台账）。
 * @returns {{text:string, keys:string[], contentByKey:Object<string,string>}}
 */
export function reanchorText({ text, amendCmd, guardNote = '整段改写会被 verify --done 拒收' }) {
  const lines = String(text).replace(/\r\n/g, '\n').split('\n')
  const contentLinesByKey = new Map()
  let current = null
  for (const line of lines) {
    const b = line.match(MARK_BEGIN_RE)
    if (b) { current = b[1]; contentLinesByKey.set(current, []); continue }
    const e = line.match(MARK_END_RE)
    if (e) { current = null; continue }
    if (current) contentLinesByKey.get(current).push(line)
  }
  const keys = [...contentLinesByKey.keys()]
  const next = lines.map((line) => {
    const b = line.match(MARK_BEGIN_RE)
    if (!b) return line
    const content = (contentLinesByKey.get(b[1]) || []).join('\n')
    return `<!-- MACHINE-DRAFT:${b[1]}:${bodyHash(content)}:begin 机器预填段——${guardNote}；确要修改：${amendCmd} 留痕重锚 -->`
  }).join('\n')
  const contentByKey = {}
  for (const k of keys) contentByKey[k] = (contentLinesByKey.get(k) || []).join('\n')
  return { text: next, keys, contentByKey }
}

export default { wrapSection, parseMarkerBlocks, verifyMarkers, reanchorText, bodyHash, MARK_BEGIN_RE }
