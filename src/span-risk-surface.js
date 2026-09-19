/**
 * span-risk-surface.js — 项目声明风险路径面（span 轴路径模式唯一输入源，2026-09-19-span-risk-pattern-migration D-003）
 *
 * 口径真相源：knowledge/conventions.md「判级/定价/门禁输入必须项目声明」条——src/
 * change-risk-profile.js 的旧六域硬编码表（auth/permission/billing/migration/lock/
 * scheduling 全宇宙路径模式，2026-09-19-span-risk-pattern-migration 已退役删除）是
 * 判级/定价域最后一张违反该口径的表，本模块按 D-003 口径取而代之（表退役与消费面切换
 * 见本变更 design.md）。
 *
 *   主声明 = `_module-map.yaml` 顶层 `span_risk:` 段（token 扁平字符串列表，进 git 手工
 *   维护；modules rebuild --force 按未知顶层段原样回插保留——D-008@v2 机制）。token 只做
 *   字面量编译（零新文法：无通配/正则语法，防 YAML 里写正则的转义与评审不可读问题），
 *   编译口径与旧表逐字相同：前界 `(?:^|[/_-])` + 后界 `(?=[/._-]|$)` + `/i`——段边界锚定
 *   防 author/booking/lockfile 类子串假阳（旧表 R-03 口径原样继承）。
 *   未配置/坏声明项目 → 空表（span 模式维度关闭），禁止回退内置表——与 blast「未配置禁
 *   回退」（2026-09-19-ceremony-pricing-five-cuts D-008 先例）同款取舍。
 *
 * 零依赖纯函数（compile/match）+ 两个 IO 装载器（仅 fs/path/js-yaml，与 blast-surface.js
 * 同栈）；无 CLI/DB/锁副作用。装载容错立场同 parseModuleMapSimple / loadBlastDeclarations：
 * 坏数据不缺省不拦截（map 缺失/坏 YAML/段非数组 → 空表，条目脏值逐条跳过）。
 */
import { readFileSync, existsSync, readdirSync } from 'fs'
import { join } from 'path'
import jsYaml from 'js-yaml'

/** 正则字面量转义（先例：knowledge-classify.js escapeRegExp——token 只做字面量编译，防特殊字符注入文法） */
function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * token 编译（纯函数）：token 字符串数组 → 边界锚定正则表。
 *   逐 token：非字符串跳过（design 兼容策略：条目非字符串逐条跳过）；trim 后空串跳过；
 *   重复 token 去重（首个保留，按 trim 后字面量判重）。产物 { pattern, re } 与旧六域
 *   硬编码表条目同形（两消费面现有循环零适配消费）——pattern 为 token
 *   原始字面量（审计标签，ceremony reasons / quick riskHits 输出用），re 编译为
 *   `(?:^|[/_-])<token>(?=[/._-]|$)` /i。
 * @param {string[]} tokens
 * @returns {Array<{pattern: string, re: RegExp}>}
 */
export function compileSpanRiskPatterns(tokens) {
  if (!Array.isArray(tokens)) return []
  const seen = new Set()
  const out = []
  for (const raw of tokens) {
    if (typeof raw !== 'string') continue // 条目非字符串逐条跳过（手工维护数据容错）
    const token = String(raw).trim()
    if (token === '') continue // 空/纯空白 token 跳过
    if (seen.has(token)) continue // 重复 token 去重（首个保留）
    seen.add(token)
    out.push({ pattern: token, re: new RegExp('(?:^|[/_-])' + escapeRegExp(token) + '(?=[/._-]|$)', 'i') })
  }
  return out
}

/**
 * 共享命中语义（纯函数）：files × patterns → `[{ pattern, file }]` 扁平命中数组
 * （两消费面 span 命中的单一语义）。files 逐条反斜杠归一 POSIX（Windows 兼容）并过滤
 * 空串；patterns 逐条防御（null/非对象/re 非 RegExp 跳过）；global 正则每次 test 前归零
 * lastIndex——调用方多次调用语义安全（先例：src/ceremony-tier.js span 命中循环同款写法）。
 * @param {string[]} files 变更文件面
 * @param {Array<{pattern: string, re: RegExp}>} patterns compileSpanRiskPatterns 产物
 * @returns {Array<{pattern: string, file: string}>} file 为归一后（POSIX）路径
 */
export function matchSpanRiskPatterns(files, patterns) {
  const norm = (Array.isArray(files) ? files : []).map((f) => String(f).replace(/\\/g, '/')).filter(Boolean)
  const list = Array.isArray(patterns) ? patterns : []
  const hits = []
  for (const file of norm) {
    for (const entry of list) {
      if (entry == null || typeof entry !== 'object') continue
      const re = entry.re
      if (!(re instanceof RegExp)) continue
      if (re.global) re.lastIndex = 0 // 防调用方传入 /g 正则跨文件携带 lastIndex 状态
      if (re.test(file)) hits.push({ pattern: entry.pattern, file })
    }
  }
  return hits
}

/**
 * 声明面装载（IO，project 域）：`docs/<project>/modules/_module-map.yaml` 顶层 `span_risk:`
 * 段（token 字符串数组）→ 编译产物。容错逐款对照 loadBlastDeclarations（src/blast-surface.js）：
 * map 缺失/坏 YAML/顶层非对象/段非数组 → 空表（不缺省不拦截）；条目脏值经
 * compileSpanRiskPatterns 逐条跳过。无声明 = span 模式维度关闭（禁回退内置表）。
 * @param {{ specBase: string, project?: string|null }} opts specBase=.sillyspec 根；project=子项目名
 * @returns {Array<{pattern: string, re: RegExp}>}
 */
export function loadSpanRiskPatterns({ specBase, project = null } = {}) {
  if (!specBase || !project) return []
  const mapPath = join(specBase, 'docs', project, 'modules', '_module-map.yaml')
  try {
    if (existsSync(mapPath)) {
      const doc = jsYaml.load(readFileSync(mapPath, 'utf8'))
      const spanRisk = doc && typeof doc === 'object' ? doc.span_risk : null
      if (Array.isArray(spanRisk)) return compileSpanRiskPatterns(spanRisk)
    }
  } catch { /* 坏 map → 空表（手工数据容错，不拦截判级） */ }
  return []
}

/**
 * 多项目并集装载（事实面用——调用方无 project 语境时扫各 docs/<project>/modules/
 * _module-map.yaml 取全部项目声明并集）：跨项目 token 按 trim 后字面量去重（并集语义，
 * 防重复 pattern 在消费面重复计命中条数）；任一项目装载异常 → 该项目按空表跳过
 * （loadSpanRiskPatterns 内建 catch；形态对照 loadBlastDeclarationsAllProjects）。
 * @param {{ specBase: string }} opts
 * @returns {Array<{pattern: string, re: RegExp}>}
 */
export function loadSpanRiskPatternsAllProjects({ specBase } = {}) {
  const all = []
  if (!specBase) return all
  try {
    const docsDir = join(specBase, 'docs')
    if (!existsSync(docsDir)) return all
    const seen = new Set()
    for (const entry of readdirSync(docsDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      for (const p of loadSpanRiskPatterns({ specBase, project: entry.name })) {
        if (seen.has(p.pattern)) continue
        seen.add(p.pattern)
        all.push(p)
      }
    }
  } catch { /* docs 目录不可读 → 空表（手工数据容错） */ }
  return all
}
