/**
 * spec 树下行覆盖仲裁（2026-11-28-spec-downstream-write-arbitration）。
 *
 * 背景：下行写点此前只在 daemon 侧有 mtime 级回灌闸，CLI 的
 * `resolve --take-platform` / `pull --spec` 会对本地文件裸覆盖——本地未同步的
 * 改动被服务器版本（可能是他端旧副本）静默替换，且被覆盖路径随后写入基线快照，
 * 改动就此被标记成「已同步」，永久丢失（2026-11-28 decisions.md 双向抖动实证）。
 *
 * 判据（用户裁决：内容 hash + 本地较新胜出）：
 *   - force（显式 --force / 用户裁决）→ 不保留，照常覆盖；
 *   - 本地无该文件 → 不保留（直接落地，新文件无本地改动可言）；
 *   - 基线缺失（首次同步 / 文件损坏）→ 保守保留（不赌，宁可少覆盖）；
 *   - 基线有且 ≠ 本地当前 hash → 本地自上次同步后改过 → 保留本地；
 *   - 基线有且 = 本地当前 hash → 本地未改动 → 可覆盖。
 *
 * 免疫 git 操作：hash 是内容语义，不受 checkout/pull 刷新 mtime 影响（daemon 侧
 * mtime 判定的已知缺陷）。
 */

import { createHash } from 'crypto'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

import { runtimeStatePath } from './runtime-paths.js'

/**
 * 同步基线快照文件名（与 spec-sync.js BASE_SNAPSHOT / sync.js 读写点同源）。
 * 模块私有：src/test 无外部消费（2026-11-28-spec-sync-guard-dead-exports 清 22e-b
 * 死码），需要复用时按实际调用面重新导出。
 */
const SPEC_SYNC_BASE_FILENAME = 'spec-sync-base.json'

/**
 * 读同步基线 hash 表（`specDir/.runtime/spec-sync-base.json` 的 hashes 键）。
 *
 * @returns {Record<string, string> | null} 缺失/损坏/形状异常 → null（调用方按
 *   「基线缺失」保守处理，见 shouldKeepLocal）
 */
export function readBaseHashes(specDir) {
  try {
    const p = runtimeStatePath(join(specDir, '.runtime'), SPEC_SYNC_BASE_FILENAME)
    const base = JSON.parse(readFileSync(p, 'utf8'))
    if (base && typeof base.hashes === 'object' && base.hashes !== null) return base.hashes
    return null
  } catch {
    return null
  }
}

/** 单文件内容 sha256（读失败/不存在 → null）。模块私有（同上，无外部消费）。 */
function hashFileContent(absPath) {
  try {
    return createHash('sha256').update(readFileSync(absPath)).digest('hex')
  } catch {
    return null
  }
}

/**
 * 下行覆盖仲裁（纯逻辑 + 一次本地读）。
 *
 * @param {object} args
 * @param {string} args.specDir spec 树根
 * @param {string} args.relPath 相对 specDir 的 POSIX 路径（与基线键同形）
 * @param {Record<string, string> | null} args.baseHashes 基线 hash 表（readBaseHashes 产物）
 * @param {boolean} [args.force] 显式强制 → 旁路仲裁
 * @returns {{ keep: boolean, reason: 'forced' | 'missing' | 'no-baseline' | 'local-dirty' | 'clean' }}
 */
export function shouldKeepLocal({ specDir, relPath, baseHashes, force = false }) {
  if (force) return { keep: false, reason: 'forced' }
  const abs = join(specDir, relPath)
  if (!existsSync(abs)) return { keep: false, reason: 'missing' }
  const localHash = hashFileContent(abs)
  if (localHash === null) return { keep: false, reason: 'missing' } // 读不到按不存在处理（写入会覆盖，与现状一致）
  if (!baseHashes) return { keep: true, reason: 'no-baseline' }
  const base = baseHashes[relPath]
  if (typeof base !== 'string') return { keep: true, reason: 'no-baseline' } // 基线无该路径 = 无法证明本地未改
  if (base === localHash) return { keep: false, reason: 'clean' }
  return { keep: true, reason: 'local-dirty' }
}

/** 保留原因 → 人读文案（CLI 输出与审计共用单一源）。 */
export const KEEP_REASON_LABEL = {
  'local-dirty': '本地有未同步改动',
  'no-baseline': '基线缺失或未覆盖该路径',
}

export default { shouldKeepLocal, readBaseHashes, hashFileContent, KEEP_REASON_LABEL, SPEC_SYNC_BASE_FILENAME }
