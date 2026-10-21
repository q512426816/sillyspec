/**
 * hot-cache.js — 跨进程热路径缓存小工具（2026-10-21-knowledge-tier-denoise FR-03）
 *
 * 服务对象：纯读派生面（quicklog flow 归档伪条目扫描、knowledge-graph 构建）——输入是
 * 冻结/低频变更面（归档目录、知识库、模块图），派生结果跨进程可复用。落点
 * .sillyspec/.runtime/cache/（gitignored 且被平台 spec 上传排除——与 vector-capability
 * 同款纪律；writeAtomicSync 自建父目录）。
 *
 * 契约：
 *   - 读：SILLYSPEC_HOT_CACHE=off 逃生阀直 null；version/fingerprint 任一不匹配 → null；
 *     ttlMs>0 且 savedAt 超窗 → null；坏 JSON/缺文件 → null（fail-open，缓存非真相源）
 *   - 写：原子；写失败 fail-soft 返回 false（加速面失败不阻断本体）
 *   - fingerprint 须可 JSON 稳定序列化且键序/元素序确定（数组按序构造，dirStamp 已排序）
 */
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import { writeAtomicSync } from './fs-atomic.js'

/** 读缓存：命中返回 payload，任何不匹配/损坏/关闭 → null。 */
export function readHotCache(cachePath, { version, fingerprint, ttlMs = 0, now = Date.now() }) {
  if (process.env.SILLYSPEC_HOT_CACHE === 'off') return null
  try {
    const obj = JSON.parse(readFileSync(cachePath, 'utf-8'))
    if (!obj || obj.version !== version) return null
    if (JSON.stringify(obj.fingerprint) !== JSON.stringify(fingerprint)) return null
    if (ttlMs > 0 && !(typeof obj.savedAt === 'number' && now - obj.savedAt <= ttlMs)) return null
    return obj.payload
  } catch { return null }
}

/** 写缓存：原子落盘 {version, fingerprint, savedAt, payload}；失败 fail-soft。 */
export function writeHotCache(cachePath, { version, fingerprint, payload, now = Date.now() }) {
  try {
    writeAtomicSync(cachePath, JSON.stringify({ version, fingerprint, savedAt: now, payload }))
    return true
  } catch { return false }
}

/** 目录级指纹：子项名全集 + 目录 mtimeMs——子项增删/改名必变；不感知深层内容变化
 *  （配冻结输入面用：归档目录、或配 TTL 硬上限）。目录缺席 → null。 */
export function dirStamp(dir) {
  try {
    return { names: readdirSync(dir).sort(), mtimeMs: statSync(dir).mtimeMs }
  } catch { return null }
}

/** 文件级指纹：目录内全部文件（含 _module-map.yaml 等非 md）名 → mtimeMs:size，按名排序。
 *  感知本目录文件的新增/删除/就地重写（模块卡归档重写、知识文件蒸馏都在此列）；
 *  不递归子目录（子目录增删由上层逐目录 fileDirStamp 覆盖）。目录缺席 → null。 */
export function fileDirStamp(dir) {
  try {
    const out = []
    for (const f of readdirSync(dir).sort()) {
      const st = statSync(join(dir, f))
      if (st.isDirectory()) continue
      out.push([f, `${st.mtimeMs}:${st.size}`])
    }
    return out
  } catch { return null }
}
