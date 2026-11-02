/**
 * eval/knowledge/lib/repos.mjs — 评测仓参数解析（项目中立：不枚举任何具体项目）
 *
 * 约定：--repo 接受逗号分隔的路径列表；每项可写 `<label>:<path>` 显式指定仓标签
 * （label 用于 organic 数据集匹配与 baseline 键），省略时取路径 basename。
 * 缺省（不传 --repo）= 当前仓。Windows 盘符（C:/、C:\）不当作 label 分隔符。
 */
import { basename, resolve } from 'node:path'

/** 解析单项：`label:path` 或裸 path → { label, path }。盘符形态（`C:\` / `C:/`）不当作 label。 */
export function parseRepoSpec(item) {
  const raw = String(item || '').trim()
  if (!raw) throw new Error('--repo 含空项')
  if (/^[A-Za-z]:[\\/]/.test(raw)) {
    const abs = resolve(raw)
    return { label: basename(abs) || abs, path: abs }
  }
  const m = /^([^:/\\]+):(.+)$/.exec(raw)
  if (m) return { label: m[1], path: resolve(m[2]) }
  const abs = resolve(raw)
  return { label: basename(abs) || abs, path: abs }
}

/**
 * 解析 --repo 参数 → Map<label, absPath>。
 * @param {string|null} arg 原始值（逗号分隔；null/''/'all' = 缺省当前仓）
 * @param {string} cwd 当前仓根
 * @returns {Map<string,string>}
 */
export function parseRepoArgs(arg, cwd) {
  const items = arg && arg !== 'all' ? String(arg).split(',').map((s) => s.trim()).filter(Boolean) : []
  const specs = items.length > 0 ? items.map(parseRepoSpec) : [parseRepoSpec(cwd)]
  const out = new Map()
  for (const { label, path } of specs) {
    if (out.has(label) && out.get(label) !== path) {
      throw new Error(`仓标签冲突：${label}（${out.get(label)} 与 ${path}）——请用 label:path 显式区分`)
    }
    out.set(label, path)
  }
  return out
}
