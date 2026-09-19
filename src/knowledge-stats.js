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

import { existsSync, readdirSync } from 'fs'
import { join } from 'path'
import { readKnowledgeHits } from './knowledge-hits.js'
import { parseKnowledgeIndex } from './knowledge-match.js'
import { scanFrIndex } from './fr-index.js'

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

// ── FR 索引实验聚合（2026-09-18-fr-index-l1 后续钩子·L3 裁决仪表盘）──

/**
 * 聚合 L1 四类 fr-* 遥测事件 + knowledge/fr/ 索引面统计——L3 裁决（design 实验证伪条款）
 * 的出数面：观察期满一眼读出 注入命中/取代链跟随/重复拦截/删除缺口信号 与 承接引用率。
 *
 * 口径：
 * - 事件面（jsonl，sinceDays 窗口）：fr-inject 计数+涉及变更数；fr-supersede 计数+涉及变更数；
 *   fr-duplicate-warning 计数+命中候选数；fr-unreferenced 按域聚合 count 总和；
 * - 索引面（knowledge/fr/*.md，全量——索引是累积账本非窗口流）：条目/active/superseded 计数、
 *   来源变更数（承接引用率分母——事件流无 fr-added 事件，分母从索引读，不加归档管线事件）；
 * - 承接引用率 = fr-supersede 涉及变更数 / 索引来源变更数（分母 0 → null）。
 *   注意分子是 sinceDays 窗口内、分母是全量——窗口≠全量时比率偏低是口径事实，
 *   裁决时用大窗口（--since-days 9999）读全口径。
 *
 * @returns {{ present: boolean, events: {...}, index: {...}, supersedeRate: number|null }}
 *   present=false（无 fr/ 目录且零 fr-* 事件）→ 其余字段零值，消费方可整体略过。
 */
export function buildFrIndexStats(knowledgeDir, runtimeDir, { sinceDays = 30 } = {}) {
  const records = readKnowledgeHits(runtimeDir, { sinceDays })
  const frEvents = records.filter((r) => typeof r.type === 'string' && r.type.startsWith('fr-'))

  const injectChanges = new Set()
  const supersedeChanges = new Set()
  const duplicateCandidates = new Set()
  const unreferencedByDomain = new Map()
  // fr-inject 按来源分组（ql-20260919-002 口径：source='module-inject'（注入期 join，四面消费）
  // vs 'digest'（brainstorm step8 写作期）。存量事件无 source 读数归 digest 桶——保总数口径稳定，
  // 只增归因维度；新发射面一律带 source 勿开新 type（未知 fr-* 类型静默漏过下方 if 链）。
  const frInjectBySource = new Map()
  const rotSuspectByDomain = new Map()
  const rotSuspectChanges = new Set()
  let frInject = 0
  let frSupersede = 0
  let frDuplicateWarning = 0
  let frRotSuspect = 0
  for (const r of frEvents) {
    if (r.type === 'fr-inject') {
      frInject += 1
      const src = typeof r.source === 'string' && r.source ? r.source : 'digest'
      frInjectBySource.set(src, (frInjectBySource.get(src) || 0) + 1)
      if (r.change) injectChanges.add(r.change)
    } else if (r.type === 'fr-supersede') {
      frSupersede += 1
      if (r.change) supersedeChanges.add(r.change)
    } else if (r.type === 'fr-duplicate-warning') {
      frDuplicateWarning += 1
      if (r.candidate) duplicateCandidates.add(r.candidate)
    } else if (r.type === 'fr-rot-suspect') {
      // 钩子 #1（quick 写面腐烂 suspect，source=quick-done）：按域求和（count=触达 active FR 数），
      // 总数按事件计（多域事件不重复计）；涉及变更去重——L3 裁决核心读数。盲区：unmapped 漏
      // join / map 漂移——此计数是下界不是全量。
      frRotSuspect += 1
      for (const domain of Array.isArray(r.domains) ? r.domains : [r.domain || 'unknown']) {
        const row = rotSuspectByDomain.get(domain) || { domain, events: 0, count: 0 }
        row.events += 1
        row.count += Number.isFinite(Number(r.count)) ? Number(r.count) : 0
        rotSuspectByDomain.set(domain, row)
      }
      if (r.change) rotSuspectChanges.add(r.change)
    } else if (r.type === 'fr-unreferenced') {
      const domain = r.domain || 'unknown'
      const row = unreferencedByDomain.get(domain) || { domain, events: 0, count: 0 }
      row.events += 1
      row.count += Number.isFinite(Number(r.count)) ? Number(r.count) : 0
      unreferencedByDomain.set(domain, row)
    }
  }

  const frDir = join(knowledgeDir, 'fr')
  const frDirExists = existsSync(frDir)
  const entries = frDirExists ? scanFrIndex(knowledgeDir) : []
  const sourceChanges = new Set(entries.map((e) => e.change).filter(Boolean))
  const supersededCount = entries.filter((e) => e.supersededBy).length

  const denominator = sourceChanges.size
  const supersedeRate = denominator > 0 ? supersedeChanges.size / denominator : null

  return {
    present: frDirExists || frEvents.length > 0,
    events: {
      frInject,
      frInjectBySource: Object.fromEntries(frInjectBySource),
      frRotSuspect,
      frRotSuspectByDomain: [...rotSuspectByDomain.values()],
      frRotSuspectChanges: rotSuspectChanges.size,
      frInjectChanges: injectChanges.size,
      frSupersede,
      frSupersedeChanges: supersedeChanges.size,
      frDuplicateWarning,
      frDuplicateCandidates: duplicateCandidates.size,
      frUnreferenced: [...unreferencedByDomain.values()].sort((a, b) => b.count - a.count),
    },
    index: {
      entries: entries.length,
      active: entries.length - supersededCount,
      superseded: supersededCount,
      sourceChanges: denominator,
      domains: frDirExists ? readdirSync(frDir).filter((f) => f.endsWith('.md')).map((f) => f.replace(/\.md$/, '')) : [],
    },
    supersedeRate,
  }
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
  const frIndex = buildFrIndexStats(knowledgeDir, runtimeDir, { sinceDays })

  if (asJson) {
    outputJson(true, { sinceDays, hasTelemetry, ...result, frIndex })
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

  // FR 索引实验（L3 裁决仪表盘——证伪条款出数面；裁决时建议 --since-days 大窗口读全口径）
  if (frIndex.present) {
    const e = frIndex.events
    const i = frIndex.index
    lines.push('')
    lines.push(`🔬 FR 索引实验（窗口内事件 / 索引面全量——L3 裁决指标，证伪条款见 2026-09-18-fr-index-l1 design）`)
    lines.push(`  注入 fr-inject ${e.frInject} 次（${e.frInjectChanges} 变更） | 取代链 fr-supersede ${e.frSupersede} 次（${e.frSupersedeChanges} 变更） | 重复拦截 fr-duplicate-warning ${e.frDuplicateWarning} 次（${e.frDuplicateCandidates} 候选）`)
    if (e.frUnreferenced.length > 0) {
      const top = e.frUnreferenced.slice(0, 5).map((u) => `${u.domain}×${u.count}`).join('，')
      lines.push(`  删除缺口信号 fr-unreferenced：${top}${e.frUnreferenced.length > 5 ? ' …' : ''}（观察信号·不算 L3 门禁）`)
    }
    lines.push(`  索引面：${i.entries} 条（active ${i.active} / superseded ${i.superseded}）| 来源变更 ${i.sourceChanges} 个 | 域 ${i.domains.join(', ') || '—'}`)
    lines.push(`  承接引用率：${frIndex.supersedeRate === null ? '—（索引空）' : `${(frIndex.supersedeRate * 100).toFixed(0)}%（${e.frSupersedeChanges}/${i.sourceChanges}，分子窗口内/分母全量——裁决用大窗口）`}`)
  }

  console.log(lines.join('\n'))
}
