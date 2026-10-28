/**
 * overlap-detect.js — 活跃变更 target-file 声明重叠检测（2026-10-28-overlap-route）
 *
 * 定位：同 target-file 并行的事前路由信号——落地侧机器已厚（worktree apply --3way 三方
 * 合并、main-repo.lock 全仓串行、guard 相交预检、base 漂移 re-anchor），缺的是干活期的
 * 「两个活跃变更声明了同一文件」检测：重叠拖到落地才撞见，错失把后到者分流进 worktree
 * 的窗口。本模块只做检测与呈现（advisory），不做调度不做阻断——「不是禁止，是分流」。
 *
 * 机制：声明加载单一源复用 foreign-declared.loadOwnDeclaredSet（design §6 文件变更
 * 清单 ∪ task 卡 allowed_paths/target_files，quick 会话 guard 形态），构建文件→变更集
 * 反查表，声明同一文件的变更数 ≥2 即重叠条目。瞬时快照零持久状态；归档（目录移入
 * changes/archive/）天然退出反查表。
 *
 * 消费面：sillyspec overlap 仓级查询动词；flow verify-drafts 通过分支的路由 advisory。
 */
import { readdirSync } from 'fs'
import { join } from 'path'
import { loadOwnDeclaredSet } from './foreign-declared.js'

/**
 * 检测活跃变更间的 target-file 声明重叠。
 * @param {{cwd?: string, specBase?: string}} opts 二选一（specBase 优先）
 * @returns {Array<{file: string, changes: string[]}>} file 正斜杠归一、changes 字典序、
 *   条目按 file 排序；无重叠返回 []。任何读取失败 fail-open（该变更空集），绝不抛出。
 */
export function detectDeclaredOverlaps({ cwd, specBase } = {}) {
  const base = specBase || join(cwd || process.cwd(), '.sillyspec')
  const runtimeRoot = join(base, '.runtime')
  let names = []
  try {
    names = readdirSync(join(base, 'changes'), { withFileTypes: true })
      .filter((e) => e.isDirectory() && e.name !== 'archive')
      .map((e) => e.name)
  } catch {
    return [] // 无 changes/ 目录：零活跃变更
  }
  const byFile = new Map()
  for (const name of names) {
    const own = loadOwnDeclaredSet(base, runtimeRoot, name) // 内部 fail-open：解析失败空集
    if (!own || own.size === 0) continue
    for (const f of own) {
      if (!byFile.has(f)) byFile.set(f, new Set())
      byFile.get(f).add(name)
    }
  }
  const overlaps = []
  for (const [file, changes] of byFile) {
    if (changes.size >= 2) overlaps.push({ file, changes: [...changes].sort() })
  }
  return overlaps.sort((a, b) => a.file.localeCompare(b.file))
}

/**
 * 指定变更的重叠路由提示文案（verify-drafts 通过分支钩子用）。
 * @returns {string|null} null=该变更无重叠（调用方零输出）；有则返回一行提示
 *   （分流建议 + 落地序列 + 详查指引）。纯函数：检测异常由上层 try/catch fail-open。
 */
export function overlapAdvisoryFor(changeName, { cwd, specBase } = {}) {
  const name = String(changeName || '')
  if (!name) return null
  const mine = detectDeclaredOverlaps({ cwd, specBase }).filter((o) => o.changes.includes(name))
  if (mine.length === 0) return null
  const others = [...new Set(mine.flatMap((o) => o.changes).filter((c) => c !== name))].join('、')
  const files = mine.slice(0, 3).map((o) => `${o.file}←${o.changes.join(',')}`).join('；') + (mine.length > 3 ? ` 等 ${mine.length} 个` : '')
  return `⚠️ [重叠路由] 本变更与活跃变更 ${others} 声明了相同文件（${files}）——并行改同一文件是冲突地带，建议其一转 worktree 形态（sillyspec worktree apply <名>）；落地序列：先落地干净进、后落地 apply --3way 三方合并（并发由 main-repo.lock 串行）。详见 sillyspec overlap`
}

export default { detectDeclaredOverlaps, overlapAdvisoryFor }
