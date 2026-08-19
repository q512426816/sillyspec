/**
 * SillySpec spec 目录拼写变体检测
 *
 * review.json missing 时调用：检测 SPEC_ROOT 父目录下是否存在 .sillyspec 的
 * 近似拼写变体目录（如 .silyspec / .sillyspc），命中则提示「路径疑似拼错」。
 *
 * 触发场景：agent/用户手动创建 review.json 时把 .sillyspec 拼错（少 l / 多 k 等），
 * 文件落到变体目录，CLI 按规范名找不到。给一条模糊匹配提示比静默报 missing 友好。
 *
 * 放独立模块（而非 stage-review.js / task-review.js 内联）的原因：两者已存在
 * stage-review → task-review 的常量依赖，反向 import 会形成循环依赖。
 */

import { dirname, basename, join } from 'path'
import { readdirSync } from 'fs'
// levenshtein 单一实现收敛到 run/shared.js（原本地副本与 shared.js 逐行相同）；
// shared.js 不静态 import review 族，此处引入不成环
import { levenshtein } from './run/shared.js'

/**
 * 检测 spec 目录拼写变体。
 * @param {string} runtimeRoot — .runtime 目录绝对路径（= <SPEC_ROOT>/.runtime）
 * @returns {{ typoDir: string, canonical: string } | null} 命中返回变体目录与规范名，否则 null
 */
export function detectSpecDirTypo(runtimeRoot) {
  if (!runtimeRoot) return null
  // runtimeRoot = <SPEC_ROOT>/.runtime → SPEC_ROOT = dirname(runtimeRoot)
  const specRoot = dirname(runtimeRoot)
  const parent = dirname(specRoot)
  const canonical = basename(specRoot) // 期望 '.sillyspec'
  if (!canonical.startsWith('.')) return null // 非隐藏目录命名，跳过（避免误报）

  let siblings = []
  try {
    siblings = readdirSync(parent, { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name.startsWith('.') && !d.name.startsWith('..') && d.name !== canonical)
      .map((d) => d.name)
  } catch {
    return null
  }
  if (siblings.length === 0) return null

  // 编辑距离 ≤2 视为拼写变体（覆盖少 l / 多 k / 漏字母等常见笔误）
  const typo = siblings.find((name) => {
    const dist = levenshtein(name, canonical)
    return dist > 0 && dist <= 2
  })
  if (!typo) return null
  return { typoDir: join(parent, typo), canonical }
}
