/**
 * knowledge-hits.js — 知识闭环遥测事件流（.runtime/knowledge-hits.jsonl）
 *
 * 2026-09-14-knowledge-loop-close task-01 交付的共享底座（KnowledgeHitsAPI）：
 * - 写：appendKnowledgeHit —— 每次恰好一行 JSON + '\n'（Node fs 不做换行翻译，Windows 下同为 LF）
 * - 读：readKnowledgeHits —— 逐行 JSON.parse，坏行/残行跳过不抛（R-04：并发 append 交错容忍）
 * - 记录类型：inject（机械注入命中，task-04 写入）/ classify（归类审计，task-02 写入）；
 *   聚合侧 stats（task-05）统一经 readKnowledgeHits 读取
 *
 * 数据模型按 design.md：{"type":"inject"|"classify","change":…,"query":…,"matchedFiles":[…],"at":"ISO-8601"}
 * classify 记录可携带 qlId/targetFile（字段原样序列化，不裁剪）。
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'fs'
import { join } from 'path'

const HITS_FILENAME = 'knowledge-hits.jsonl'

function hitsFilePath(runtimeDir) {
  return join(runtimeDir, HITS_FILENAME)
}

/**
 * 追加一条遥测记录（目录/文件缺失自动创建）。
 *
 * @param {string} runtimeDir - .runtime 目录
 * @param {object} hit - 记录对象，常用字段 { type:'inject'|'classify', change, query, matchedFiles, at }
 *   （at 缺省时补当前 ISO 时间；其余字段原样序列化，classify 的 qlId/targetFile 等照写）
 * @returns {object} 实际落盘的记录对象
 */
export function appendKnowledgeHit(runtimeDir, hit) {
  const record = { ...hit }
  if (record.at === undefined || record.at === null) {
    record.at = new Date().toISOString()
  }
  mkdirSync(runtimeDir, { recursive: true })
  appendFileSync(hitsFilePath(runtimeDir), JSON.stringify(record) + '\n', 'utf8')
  return record
}

/**
 * 读取遥测记录（坏行/残行容忍，解析失败不抛）。
 *
 * @param {string} runtimeDir - .runtime 目录
 * @param {object} [opts] - { sinceDays }：仅保留 at 在近 N 天内的记录
 *   （过滤启用时 at 缺失/不可解析的记录一并跳过——无法证明在窗口内）
 * @returns {object[]} 解析成功的记录数组（文件缺失/为空 → []）
 */
export function readKnowledgeHits(runtimeDir, opts = {}) {
  const file = hitsFilePath(runtimeDir)
  if (!existsSync(file)) return []

  const records = []
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    let record
    try {
      record = JSON.parse(trimmed)
    } catch {
      continue // 坏行/残行：跳过不抛（R-04）
    }
    if (!record || typeof record !== 'object' || Array.isArray(record)) continue
    records.push(record)
  }

  const sinceDays = opts ? Number(opts.sinceDays) : NaN
  if (!Number.isFinite(sinceDays) || sinceDays < 0) return records
  const cutoff = Date.now() - sinceDays * 24 * 60 * 60 * 1000
  return records.filter((record) => {
    const at = Date.parse(record.at)
    return Number.isFinite(at) && at >= cutoff
  })
}
