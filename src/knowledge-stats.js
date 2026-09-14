/**
 * knowledge-stats.js — knowledge stats 子命令核心（2026-09-14-knowledge-loop-close task-05，FR-05 / D-002@v1）
 *
 * 职责：聚合 .runtime/knowledge-hits.jsonl 遥测事件流（task-01 KnowledgeHitsAPI 写入：
 * task-04 注入点写 type:inject、task-02 classify 写 type:classify），输出近 N 天命中矩阵
 * （文件 × 次数 × 最近命中时间）与从未命中清单（对照 INDEX.md 全集标注疑似死重）。
 * 纯只读：不写 hits/INDEX/知识文件任何输入；死重清单只报告，不自动删除/合并（非目标）。
 *
 * 计数口径：
 * - inject 记录：matchedFiles 每个条目（`file#anchor` 形态，prompt.js 注入侧逐条落盘）计 1 次
 *   命中，归属剥 # 后的 file；classify 记录：targetFile 计 1 次（归类审计同样视作一次消费命中）；
 * - lastHitAt = 引用该文件的记录 at 最大值（ISO 原样保留；sinceDays 窗口启时时幸存记录
 *   必有可解析 at——readKnowledgeHits 契约滤掉 at 缺失/坏值，'' 兜底仅防御性）；
 * - totalInjects / totalClassifies = 窗口内两类记录条数（按记录计，与 matrix 按条目计独立）；
 * - 未知 type 不进矩阵不进计数（前向兼容：新事件类型不炸聚合）。
 *
 * neverHit：parseKnowledgeIndex（src/knowledge-match.js 同款解析）得 INDEX.md 唯一 file 全集
 * （保持 INDEX 行序）减去 matrix 中出现过的 file。不在 INDEX 但被命中过的 file 照进 matrix
 * （informative），不影响 neverHit。INDEX 缺失 → neverHit=[]（无对照面）。
 *
 * 空数据：hits.jsonl 缺失/无有效记录 → 空矩阵 + totals 0 + neverHit=INDEX 全集；CLI 人类可读
 * 模式此时输出「暂无遥测数据」提示（--json 输出 hasTelemetry:false 供机读区分「无遥测」与
 * 「窗口内无命中」两种空矩阵——后者死重对照无意义，人类可读模式同样略过 neverHit 段）。
 */

import { existsSync } from 'fs'
import { join } from 'path'
import { readKnowledgeHits } from './knowledge-hits.js'
import { parseKnowledgeIndex } from './knowledge-match.js'

// ── 聚合核心 ──

/** `file#anchor` 引用 → file 部分（反斜杠归一 POSIX、剥首个 # 后段；空引用 → ''） */
function fileOfRef(ref) {
  const s = String(ref || '').trim().replace(/\\/g, '/')
  if (!s) return ''
  const hash = s.indexOf('#')
  return (hash >= 0 ? s.slice(0, hash) : s).trim()
}

/**
 * 聚合命中矩阵与死重对照。
 *
 * @param {string} knowledgeDir - knowledge 目录（INDEX.md 全集来源）
 * @param {string} runtimeDir - .runtime 目录（knowledge-hits.jsonl 落点）
 * @param {object} [opts] - { sinceDays = 30 }：仅统计近 N 天记录（at 过滤沿 readKnowledgeHits 契约，
 *   坏行/残行读取侧已跳过）
 * @returns {{ matrix: { file: string, hits: number, lastHitAt: string }[],
 *             neverHit: string[], totalInjects: number, totalClassifies: number }}
 *   matrix 按 hits 降序（同数按 file 字典序稳定 tie-break）；neverHit 保持 INDEX 行序。
 */
export function buildHitMatrix(knowledgeDir, runtimeDir, { sinceDays = 30 } = {}) {
  const records = readKnowledgeHits(runtimeDir, { sinceDays })

  const byFile = new Map()
  const touch = (file, at) => {
    if (!file) return
    const row = byFile.get(file) || { file, hits: 0, lastHitAt: '', lastTs: -Infinity }
    row.hits += 1
    const ts = Date.parse(at)
    if (Number.isFinite(ts) && ts >= row.lastTs) {
      row.lastTs = ts
      row.lastHitAt = String(at)
    }
    byFile.set(file, row)
  }

  let totalInjects = 0
  let totalClassifies = 0
  for (const record of records) {
    if (record.type === 'inject') {
      totalInjects += 1
      const refs = Array.isArray(record.matchedFiles) ? record.matchedFiles : []
      for (const ref of refs) touch(fileOfRef(ref), record.at)
    } else if (record.type === 'classify') {
      totalClassifies += 1
      touch(fileOfRef(record.targetFile), record.at)
    }
  }

  const matrix = [...byFile.values()]
    .map(({ lastTs, ...row }) => row) // 内部时间比较键不下发
    .sort((a, b) => b.hits - a.hits || (a.file < b.file ? -1 : a.file > b.file ? 1 : 0))

  const hitFiles = new Set(matrix.map((row) => row.file))
  const seen = new Set()
  const neverHit = []
  for (const entry of parseKnowledgeIndex(knowledgeDir)) {
    const file = fileOfRef(entry.file)
    if (!file || seen.has(file) || hitFiles.has(file)) continue
    seen.add(file)
    neverHit.push(file)
  }

  return { matrix, neverHit, totalInjects, totalClassifies }
}

// ── CLI 入口（形态对齐 src/stages/knowledge.js cmdSearch / src/knowledge-classify.js cmdKnowledgeClassify）──

function outputJson(ok, data, error) {
  const result = { ok, ...data }
  if (error) result.error = error
  console.log(JSON.stringify(result, null, 2))
}

/**
 * `sillyspec knowledge stats` 子命令入口（stages/knowledge.js 二级路由动态 import 转发）。
 *
 * 用法：stats [--since-days N] [--json]
 * 默认人类可读输出（命中矩阵表 + 从未命中清单 + 遥测计数）；--json 输出结构化结果
 * （{ ok, sinceDays, hasTelemetry, matrix, neverHit, totalInjects, totalClassifies }）。
 * 纯只读。
 *
 * @param {string} dir - 项目根目录
 * @param {string[]} args - 二级路由切掉 'stats' 后的参数
 * @param {object} [opts] - { specDir, runtimeDir }
 */
export async function cmdKnowledgeStats(dir, args, opts = {}) {
  const base = opts.specDir || join(dir, '.sillyspec')
  const knowledgeDir = join(base, 'knowledge')
  const runtimeDir = opts.runtimeDir || join(base, '.runtime')

  const pick = (name) => {
    const i = args.indexOf(name)
    return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : ''
  }
  let sinceDays = 30
  const sinceRaw = pick('--since-days')
  if (sinceRaw !== '') {
    const n = Number.parseInt(sinceRaw, 10)
    if (!Number.isFinite(n) || n < 0) {
      outputJson(false, {}, '--since-days must be a non-negative integer')
      return
    }
    sinceDays = n
  }
  const asJson = args.includes('--json')

  // 遥测在场判定用全量读取（不加窗口）：文件缺失/只有坏行 → 无遥测
  const hasTelemetry = readKnowledgeHits(runtimeDir).length > 0
  const result = buildHitMatrix(knowledgeDir, runtimeDir, { sinceDays })

  if (asJson) {
    outputJson(true, { sinceDays, hasTelemetry, ...result })
    return
  }

  const lines = []
  lines.push(`📚 knowledge stats（近 ${sinceDays} 天，数据源 .runtime/knowledge-hits.jsonl）`)
  lines.push('')

  if (!hasTelemetry) {
    lines.push('暂无遥测数据（hits.jsonl 缺失或无有效记录）——机械注入（execute/quick prompt）与 knowledge classify 产生命中后此处可查')
    lines.push('')
  } else if (result.matrix.length === 0) {
    lines.push(`近 ${sinceDays} 天无命中记录（可用 --since-days 扩大窗口；窗口内死重对照无意义，已略过）`)
    lines.push('')
  } else {
    const fileCol = Math.max(2, ...result.matrix.map((row) => row.file.length))
    lines.push('命中矩阵（按次数降序）：')
    lines.push(`  ${'文件'.padEnd(fileCol)}  命中  最近命中`)
    for (const row of result.matrix) {
      const last = row.lastHitAt ? row.lastHitAt.slice(0, 10) : '—'
      lines.push(`  ${row.file.padEnd(fileCol)}  ${String(row.hits).padStart(4)}  ${last}`)
    }
    lines.push('')
    if (!existsSync(join(knowledgeDir, 'INDEX.md'))) {
      lines.push('（knowledge/INDEX.md 缺失——从未命中清单无从对照）')
    } else if (result.neverHit.length > 0) {
      lines.push('从未命中（对照 INDEX 全集，疑似死重——仅报告，不自动删除/合并）：')
      for (const file of result.neverHit) lines.push(`  - ${file}`)
    } else {
      lines.push('INDEX 路由的全部文件在窗口内均有过命中（无死重）')
    }
    lines.push('')
  }

  lines.push(`遥测计数（窗口内）：注入 ${result.totalInjects} 次 | 归类 ${result.totalClassifies} 次`)
  console.log(lines.join('\n'))
}
