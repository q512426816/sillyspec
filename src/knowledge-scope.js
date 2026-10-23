/**
 * knowledge-scope.js — 知识注入作用域解析（2026-10-23-knowledge-scope-inject）
 *
 * 背景：知识注入此前只有「触达域 FR + 关键词命中」两类——AGENTS 规约 00（不枚举定义
 * 开放世界/不锁死开发语言框架）一直在指令文件里，但决策时点没有「每次都注入」通道，
 * agent 在配置/机制设计上犯语言锁定即实证（py_runner_flags 一案）。本模块让知识条目
 * 声明作用域，注入逻辑按类分流：
 *   - always：每次变更都注入（跨仓通用规约，如工具中立性）
 *   - repo：本仓库每次变更都注入（仓级约束）
 *   - module:<域>[,<域>]：仅当触达域（resolveTouchedDomains 同源）命中时注入
 *   - 无标记：关键词命中现状（不恒注入）
 *
 * 标记形态（HTML 注释，主观内容用 HTML 注释不污染渲染；置于 section heading 之后的
 * 本节内任意位置有效）：
 *   <!-- scope: always -->
 *   <!-- scope: repo -->
 *   <!-- scope: module:cli-entry,core-engine -->
 *
 * 条目粒度 = section（heading）——knowledge 的 INDEX 路由与命中面都以 file#heading 为
 * 单位，标记跟随原文、旧知识零迁移。纯读 fail-soft（坏文件/不可读跳过，异常返回空态）。
 */
import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'

const SCOPE_RE = /<!--\s*scope\s*:\s*(always|repo|module\s*:\s*([^>]+?))\s*-->/i

/**
 * 扫描 knowledgeRoot 顶层 *.md（INDEX.md 除外）收集作用域条目。
 * @returns {{ always: Array, repo: Array, modules: Record<string, Array> }}
 *   条目形如 { id: 'file.md#heading', file, heading, summary, scope, domains? }
 */
export function collectScopedKnowledge(knowledgeRoot) {
  const out = { always: [], repo: [], modules: {} }
  let entries = []
  try { entries = readdirSync(knowledgeRoot) } catch { return out }
  for (const f of entries) {
    if (!String(f).endsWith('.md') || f === 'INDEX.md') continue
    let text
    try { text = readFileSync(join(knowledgeRoot, f), 'utf8') } catch { continue }
    let cur = null // { heading, scope, domains, summary }
    const flush = () => {
      if (!cur || !cur.scope) return
      const entry = {
        id: `${f}#${cur.heading}`,
        file: f,
        heading: cur.heading,
        summary: cur.summary || '',
        scope: cur.scope,
        ...(cur.scope === 'module' ? { domains: cur.domains } : {}),
      }
      if (cur.scope === 'always') out.always.push(entry)
      else if (cur.scope === 'repo') out.repo.push(entry)
      else for (const d of cur.domains) (out.modules[d] ||= []).push(entry)
    }
    for (const line of String(text).split(/\r?\n/)) {
      const h = /^(#{1,6})\s+(.+?)\s*$/.exec(line)
      if (h) { flush(); cur = { heading: h[2].trim(), scope: null, domains: [], summary: '' }; continue }
      if (!cur) continue
      const m = SCOPE_RE.exec(line)
      if (m) {
        const kind = m[1].toLowerCase()
        if (kind === 'always' || kind === 'repo') { cur.scope = kind; cur.domains = [] }
        else {
          cur.scope = 'module'
          cur.domains = String(m[2] || '').split(',').map((s) => s.trim()).filter(Boolean)
        }
        continue
      }
      // 首行有效正文作摘要（跳空行/注释/代码围栏），≤80 字
      if (!cur.summary) {
        const t = line.trim()
        if (t && !t.startsWith('<!--') && !t.startsWith('```') && !t.startsWith('|')) {
          cur.summary = t.slice(0, 80)
        }
      }
    }
    flush()
  }
  return out
}

export default { collectScopedKnowledge }
