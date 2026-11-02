/**
 * eval/knowledge/lib/snapshot.mjs — 评测快照指纹（git HEAD + knowledge 树内容 sha256）
 *
 * 指纹口径：相对路径 POSIX 归一后按字典序排序，逐文件喂 "路径\0内容\0" 到单一 sha256。
 * 目录缺失 = 空树哈希（合法形态：平台仓可能有 knowledge 但无 fr/ 子目录等）。
 * baseline 对比只在指纹一致时可信——不一致必须显式告警（runner 输出 snapshot_mismatch）。
 */
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

export function gitHead(repoRoot) {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: repoRoot, encoding: 'utf8', timeout: 5000, stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return ''
  }
}

/** 递归收集文件相对路径（POSIX 归一、字典序稳定；目录缺失 = 空数组）。 */
function listFiles(dir, base = dir, out = []) {
  let entries
  try { entries = readdirSync(dir, { withFileTypes: true }) } catch { return out }
  for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const p = join(dir, e.name)
    if (e.isDirectory()) listFiles(p, base, out)
    else if (e.isFile()) out.push(relative(base, p).replace(/\\/g, '/'))
  }
  return out
}

/** knowledge 树内容哈希（相对路径排序 + \0 分隔喂 sha256）。 */
export function hashKnowledgeTree(knowledgeDir) {
  const h = createHash('sha256')
  for (const rel of listFiles(knowledgeDir).sort()) {
    h.update(rel)
    h.update('\0')
    try { h.update(readFileSync(join(knowledgeDir, rel))) } catch { h.update('<unreadable>') }
    h.update('\0')
  }
  return h.digest('hex')
}

/** 仓快照指纹（head + knowledge_hash + 文件数，供 baseline 比对与输出）。 */
export function snapshotFingerprint(repoRoot) {
  const knowledgeDir = join(repoRoot, '.sillyspec', 'knowledge')
  return {
    head: gitHead(repoRoot),
    knowledge_hash: hashKnowledgeTree(knowledgeDir),
    knowledge_files: listFiles(knowledgeDir).length,
  }
}
