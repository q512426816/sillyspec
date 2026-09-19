/**
 * blast-surface.js — 项目声明危险面（blast 轴唯一输入源，2026-09-19-ceremony-pricing-five-cuts D-008）
 *
 * 背景（词表退役的根因，详见 knowledge/conventions.md「判级/定价/门禁输入必须项目声明」条）：
 * 旧 detectChangeRisk 用硬编码全宇宙词表对文档措辞/文件内容做机械匹配——「撞词≠危险」（换仓
 * HTTP session / lifecycle 回调 / 变量名 entryPoint 全是良性词）且自指（判级引擎自身源码与教学
 * 文案写满关键词，改引擎的变更被自家门禁打顶档）。本模块按 D-008 口径取而代之：
 *
 *   主声明 = `_module-map.yaml` 顶层 `blast:` 段（进 git、手工维护、modules rebuild --force
 *   写盘时从 existingMap 文本回插保留——见 modules.js）：按路径前缀挂 `tier: S0~S3` 与
 *   `evidence: true`（需要真实集成证据的显式标记，D-009——证据门只认它，不从仪式档推断）。
 *   local.yaml `ceremony.blast_surfaces` 只升不降（逐文件取 max；不承载 evidence——证据语义
 *   属共享 map）。
 *   未命中声明面 → blast S1；未配置项目禁止回退旧词表（D-008：无默认词表兜底）。
 *
 * 零依赖纯函数 + 一个 IO 装载器；前缀匹配复用 matchModuleForFile 同款语义（字面量或目录
 * 前缀，matchModuleForFile 先例：src/ceremony-tier.js / src/quick-gate-profile.js）——零新
 * 正则族、不造第二套文法。
 */
import { readFileSync, existsSync, readdirSync } from 'fs'
import { join } from 'path'
import jsYaml from 'js-yaml'

/** 未命中任何声明面时的 blast 缺省档（D-008：S1 起步，无词表兜底） */
export const BLAST_NO_HIT_TIER = 'S1'

/** 档位序（与 ceremony-tier.js CEREMONY_TIERS 同序；本地声明避免 core-engine↔本模块循环依赖） */
const TIER_ORDER = ['S0', 'S1', 'S2', 'S3']

function tierRank(t) {
  return TIER_ORDER.indexOf(t)
}

function maxTier(a, b) {
  return tierRank(a) >= tierRank(b) ? a : b
}

/** POSIX 归一（Windows 反斜杠兼容） */
function toPosix(p) {
  return String(p).replace(/\\/g, '/')
}

/**
 * 单文件 × 单前缀匹配（matchModuleForFile 同款语义）：字面量相等或目录前缀命中
 * （prefix 以 / 结尾时先剥尾斜杠；`src/a` 命中 `src/a.js` 与 `src/a/x.js`，不命中 `src/ab.js`）。
 */
export function blastPrefixMatches(file, prefix) {
  const posix = toPosix(file)
  const p = toPosix(prefix).replace(/\/+$/, '')
  if (!p) return false
  return posix === p || posix.startsWith(p + '/')
}

/**
 * 声明面解析（纯函数）：files × 声明条目 → { tier, evidence, hitPrefixes }。
 *   tier = 命中条目最高档（无命中 BLAST_NO_HIT_TIER）；evidence = 任一命中条目带
 *   `evidence: true`；hitPrefixes = 命中的前缀（POSIX 化去重，审计/文案用）。
 * 非法条目（tier 不在序、prefixes 非数组）逐条跳过不抛错（声明面是手工维护数据，
 * 容错立场同 parseModuleMapSimple：坏段不缺省不拦截）。
 *
 * @param {string[]} files 变更文件面（声明面或实际 diff；反斜杠自动归一）
 * @param {Array<{prefixes: string[], tier: string, evidence?: boolean}>} declarations
 */
export function resolveBlastSurfaces(files, declarations) {
  const norm = (Array.isArray(files) ? files : []).map(toPosix).filter(Boolean)
  const list = Array.isArray(declarations) ? declarations : []
  let tier = BLAST_NO_HIT_TIER
  let evidence = false
  const hitSet = new Set()
  for (const entry of list) {
    if (entry == null || typeof entry !== 'object') continue
    const prefixes = Array.isArray(entry.prefixes) ? entry.prefixes : []
    const entryTier = TIER_ORDER.includes(entry.tier) ? entry.tier : null
    const entryEvidence = entry.evidence === true
    if (!entryTier && !entryEvidence) continue
    for (const file of norm) {
      for (const rawPrefix of prefixes) {
        const prefix = toPosix(rawPrefix).replace(/\/+$/, '')
        if (!prefix) continue
        if (blastPrefixMatches(file, prefix)) {
          if (entryTier) tier = maxTier(tier, entryTier)
          if (entryEvidence) evidence = true
          hitSet.add(prefix)
          break // 该文件对该条目命中一次即止
        }
      }
    }
  }
  return { tier, evidence, hitPrefixes: [...hitSet] }
}

/**
 * 声明面装载（IO）：`_module-map.yaml` 顶层 `blast:` 段 + `local.yaml ceremony.blast_surfaces`
 * 合并——**local 只升不降**（D-008：逐文件取 max；local 不承载 evidence，证据语义属共享 map）。
 * 合并实现口径：map 声明原样透传；local 条目以「影子 tier 条目」参与解析（evidence 恒 false），
 * resolveBlastSurfaces 的 max 语义天然保证只升不降。
 *
 * 容错：map/local 缺失、坏 YAML、blast 段/键形态非法 → 该源按空表（不缺省不拦截）。
 *
 * @param {{ specBase: string, project?: string|null, localCeremonyConfig?: object|null }} opts
 *   specBase=.sillyspec 根；project=子项目名（缺省只试 docs/<project> 不猜）；
 *   localCeremonyConfig=已读好的 local ceremony 段（缺省内部直读 local.yaml，容错）
 * @returns {{ declarations: Array, mapDeclarations: Array, localDeclarations: Array }}
 */
export function loadBlastDeclarations({ specBase, project = null, localCeremonyConfig = null } = {}) {
  const mapDeclarations = []
  if (specBase && project) {
    const mapPath = join(specBase, 'docs', project, 'modules', '_module-map.yaml')
    try {
      if (existsSync(mapPath)) {
        const doc = jsYaml.load(readFileSync(mapPath, 'utf8'))
        const blast = doc && typeof doc === 'object' ? doc.blast : null
        if (Array.isArray(blast)) {
          for (const entry of blast) {
            if (entry == null || typeof entry !== 'object') continue
            if (!Array.isArray(entry.prefixes) || entry.prefixes.length === 0) continue
            if (!TIER_ORDER.includes(entry.tier)) continue
            mapDeclarations.push({ prefixes: entry.prefixes.map(String), tier: entry.tier, evidence: entry.evidence === true })
          }
        }
      }
    } catch { /* 坏 map → 空表（手工数据容错，不拦截判级） */ }
  }

  let localCeremony = localCeremonyConfig
  if (localCeremony == null && specBase) {
    try {
      const localPath = join(specBase, 'local.yaml')
      if (existsSync(localPath)) {
        const doc = jsYaml.load(readFileSync(localPath, 'utf8'))
        localCeremony = doc && typeof doc === 'object' ? doc.ceremony : null
      }
    } catch { /* 坏 local → 无本地覆盖 */ }
  }
  const localDeclarations = []
  const surfaces = localCeremony && Array.isArray(localCeremony.blast_surfaces) ? localCeremony.blast_surfaces : []
  for (const entry of surfaces) {
    if (entry == null || typeof entry !== 'object') continue
    if (!Array.isArray(entry.prefixes) || entry.prefixes.length === 0) continue
    if (!TIER_ORDER.includes(entry.tier)) continue
    // local 只升 tier 不承载 evidence（evidence 恒 false——证据语义属共享 map，D-009）
    localDeclarations.push({ prefixes: entry.prefixes.map(String), tier: entry.tier, evidence: false })
  }

  return { declarations: [...mapDeclarations, ...localDeclarations], mapDeclarations, localDeclarations }
}

/**
 * 多项目并集装载（事实面用——调用方无 project 语境时扫各 docs/<project>/modules/_module-map.yaml
 * 取全部项目声明并集）：多项目仓对 repo 级文件面的变更按全声明面保守计价；local.yaml 覆盖
 * 同入（specBase 只有一份 local，全项目共享升档面）。任一项目装载异常 → 该项目按空表跳过。
 * @param {{ specBase: string, localCeremonyConfig?: object|null }} opts
 * @returns {Array<{prefixes: string[], tier: string, evidence?: boolean}>}
 */
export function loadBlastDeclarationsAllProjects({ specBase, localCeremonyConfig = null } = {}) {
  const all = []
  if (!specBase) return all
  try {
    const docsDir = join(specBase, 'docs')
    if (!existsSync(docsDir)) return all
    for (const entry of readdirSync(docsDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      const { declarations } = loadBlastDeclarations({ specBase, project: entry.name, localCeremonyConfig })
      all.push(...declarations)
    }
  } catch { /* docs 目录不可读 → 空表（手工数据容错） */ }
  return all
}
