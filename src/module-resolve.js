/**
 * module-resolve.js — 模块卡两级级联解析（token 成本优化 P0a，2026-08-22-token-cost-optimization）
 *
 * 背景（multi-agent-platform 2026-08-22 实测）：monorepo 根层 _module-map.yaml 把整个子项目
 * （backend/**）映射到单张大卡（backend.md 58KB），而子项目细粒度卡（docs/backend/modules/
 * agent.md，~6KB）由 scan 生成却无人消费——execute 每个 task 子代理都被指引去读整张大卡，
 * 单卡一项全流程烧 20 万+ tokens 输入，且大卡「变更索引」段每变更追加、单调膨胀。
 *
 * 本模块 = 纯机械分类（与 module-impact.js 同性质，CLI 算事实）：
 *   - collectModuleMaps：收齐 <spec>/docs/<project>/modules/_module-map.yaml 全部层级；
 *     project 名恰为仓库顶层目录（monorepo 子项目，如 backend/）→ 其 paths 视为相对该
 *     子目录（effective = `<project>/` + path）；否则视为仓库根相对（根层粗粒度 map）
 *   - matchModuleCard：跨全部 map 最长有效前缀匹配（细卡 agent/** 胜过粗卡 backend/**）
 *   - resolveChangeModuleCards：tasks.md 注册表 × tasks/task-NN.md allowed_paths → per-task
 *     最优卡表；卡的体量（字节数）一并给出，读取建议按体量分级（>12KB 按节读）
 *
 * 铁律（对齐仓内先例）：
 *   - 纯读：不写任何文件，不跑 git
 *   - 无 map / 无 tasks.md / 无 task 卡 → 空结果（调用方注入占位说明，不抛）
 *   - 判定语义（哪个模块才是「对的」）仍归 agent——本表只是机械最优匹配
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'fs'

/** 模块卡字数预算（字节）：超限在 resolve 表标 ⚠️ 并提示精简——文档是 agent 的读取税
 * （对标 deepseek-harness verify-doc-budgets 理念：预算只降不升；2026-08-24 起 runtime.md
 * 28KB/worktree.md 24KB 已在付税）。advisory 不阻断，16 为 dogfood 校准前缺省。 */
const MODULE_CARD_BUDGET_BYTES = 16 * 1024
import { join, relative } from 'path'
import { parseModuleMapSimple } from './modules.js'
import { parseTaskRegistry } from './stages/execute.js'
import { parseAllowedPaths } from './stages/plan-postcheck.js'

/** 模块卡「整卡可读」软上限（字节）。超过则建议按节读（契约摘要/注意事项/定位），跳过历史累积段。 */
export const MODULE_CARD_SOFT_LIMIT_BYTES = 12 * 1024

/**
 * 收齐 spec 下全部模块映射层。
 * @param {{ cwd: string, specBase: string }} opts
 * @returns {Array<{ project: string, mapPath: string, modulesDir: string, prefix: string,
 *            entries: Map<string, { paths: string[], doc: string|null }> }>}
 *   prefix：project 名为仓库顶层目录时 `<project>/`（子项目细 map），否则 ''（根层粗 map）
 */
export function collectModuleMaps({ cwd, specBase }) {
  const maps = []
  const docsDir = join(specBase, 'docs')
  if (!existsSync(docsDir)) return maps
  let projects = []
  try {
    projects = readdirSync(docsDir, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name)
  } catch { return maps }
  for (const project of projects) {
    const modulesDir = join(docsDir, project, 'modules')
    const mapPath = join(modulesDir, '_module-map.yaml')
    if (!existsSync(mapPath)) continue
    let parsed = {}
    try {
      parsed = parseModuleMapSimple(readFileSync(mapPath, 'utf8'))
    } catch { continue }
    const entries = new Map()
    for (const [id, data] of Object.entries(parsed)) {
      const paths = Array.isArray(data?.paths) ? data.paths : []
      if (paths.length === 0) continue
      entries.set(id, { paths, doc: typeof data?.doc === 'string' ? data.doc : null })
    }
    if (entries.size === 0) continue
    // 子项目判定：project 名恰为仓库顶层目录 → map 的 paths 相对该子目录（monorepo 细 map）。
    // 根层 map（project = 仓名）paths 本就仓库根相对，prefix=''。
    let prefix = ''
    try {
      const topDir = join(cwd, project)
      if (existsSync(topDir) && statSync(topDir).isDirectory()) prefix = `${project}/`
    } catch { /* stat 失败按根层处理 */ }
    maps.push({ project, mapPath, modulesDir, prefix, entries })
  }
  return maps
}

/**
 * 路径归一：反斜杠→正斜杠，剥尾部 glob（/** 与 /*）与目录斜杠。
 * `backend/**` / `backend/` / `backend` → `backend`。
 */
function normalizeMapPath(raw) {
  return String(raw).replace(/\\/g, '/').replace(/\/\*\*$/, '').replace(/\/\*$/, '').replace(/\/$/, '')
}

/**
 * 跨全部 map 最长有效前缀匹配一个仓库根相对路径。
 * @param {string} posixPath 仓库根相对 posix 路径
 * @param {Array} maps collectModuleMaps 产物
 * @returns {{ moduleId: string, map: object, effectivePrefix: string }|null}
 */
export function matchModuleCard(posixPath, maps) {
  const p = String(posixPath).replace(/\\/g, '/')
  let best = null
  for (const map of maps) {
    for (const [moduleId, entry] of map.entries) {
      for (const raw of entry.paths) {
        const effective = (map.prefix + normalizeMapPath(raw)).replace(/\/+$/, '')
        if (!effective) continue
        if (p === effective || p.startsWith(effective + '/')) {
          if (!best || effective.length > best.effectivePrefix.length) {
            best = { moduleId, map, effectivePrefix: effective }
          }
        }
      }
    }
  }
  return best
}

/**
 * 解析变更全部 task 的最优模块卡。
 * @param {{ cwd: string, specBase: string, changeName: string }} opts
 * @returns {{ hasMaps: boolean, rows: Array<{ taskId: string, taskName: string,
 *            moduleId: string|null, granularity: 'fine'|'coarse'|null,
 *            cardPath: string|null, cardBytes: number, advice: string,
 *            matchedCount: number, pathCount: number }> }}
 *   granularity：按胜者有效前缀段数判——1 段（整子项目）=coarse 大卡，≥2 段=fine 细卡
 */
export function resolveChangeModuleCards({ cwd, specBase, changeName }) {
  const maps = collectModuleMaps({ cwd, specBase })
  const changeDir = join(specBase, 'changes', changeName || '')
  let registry = []
  const tasksMd = join(changeDir, 'tasks.md')
  if (existsSync(tasksMd)) {
    registry = parseTaskRegistry(readFileSync(tasksMd, 'utf8'))
  }
  const rows = []
  for (const task of registry) {
    // 任务路径源：task 卡 allowed_paths（主）> 注册表行内 (文件路径) 尾注（兜底）
    let paths = []
    const cardFile = join(changeDir, 'tasks', `${task.id}.md`)
    if (existsSync(cardFile)) {
      paths = parseAllowedPaths(readFileSync(cardFile, 'utf8'))
    }
    if (paths.length === 0 && task.file) paths = [task.file]
    paths = paths.map(p => p.replace(/\\/g, '/')).filter(Boolean)

    // 全路径逐个匹配，取「最长有效前缀」的模块为该 task 的最优卡。粒度按有效前缀段数判：
    // 1 段（backend/frontend 整子项目）=粗层大卡；≥2 段=细层卡（段数与卡体量正相关，
    // SillyHub 这类根相对细 map 同样正确——不能按 map 的 prefix 有无判，会误标）
    let winner = null
    let matchedCount = 0
    for (const p of paths) {
      const m = matchModuleCard(p, maps)
      if (!m) continue
      matchedCount++
      if (!winner || m.effectivePrefix.length > winner.effectivePrefix.length) winner = m
    }
    let granularity = null
    if (winner) {
      const segs = winner.effectivePrefix.split('/').filter(Boolean).length
      granularity = segs >= 2 ? 'fine' : 'coarse'
    }

    let cardPath = null
    let cardBytes = 0
    let advice = '—'
    if (winner) {
      const docRel = winner.map.entries.get(winner.moduleId)?.doc || `modules/${winner.moduleId}.md`
      const abs = join(winner.map.modulesDir, '..', docRel)
      if (existsSync(abs)) {
        const rel = relative(cwd, abs).replace(/\\/g, '/')
        cardPath = rel.startsWith('..') ? abs.replace(/\\/g, '/') : rel
        try { cardBytes = statSync(abs).size } catch { cardBytes = 0 }
        advice = cardBytes > MODULE_CARD_SOFT_LIMIT_BYTES
          ? `按节读（契约摘要/注意事项/定位；跳过变更索引/人工备注）`
          : '整卡可读'
      } else {
        cardPath = relative(cwd, abs).replace(/\\/g, '/')
        advice = '卡文件缺失（modules rebuild？）'
      }
    }
    rows.push({
      taskId: task.id,
      taskName: task.name,
      moduleId: winner ? winner.moduleId : null,
      granularity,
      cardPath,
      cardBytes,
      advice,
      matchedCount,
      pathCount: paths.length,
    })
  }
  return { hasMaps: maps.length > 0, rows }
}

/**
 * 渲染 per-task 模块卡表（注入 execute「加载上下文」步 prompt 用）。
 * 无 map → 提示跳过；有 map 无命中行 → 单行说明。恒返回非空字符串（占位符必被替换）。
 */
export function renderModuleResolveTable({ cwd, specBase, changeName }) {
  const { hasMaps, rows } = resolveChangeModuleCards({ cwd, specBase, changeName })
  if (!hasMaps) return '（未找到 _module-map.yaml——本项目无模块卡，跳过模块文档加载）'
  const withMatch = rows.filter(r => r.moduleId)
  if (withMatch.length === 0) {
    return '（已找到 _module-map.yaml，但当前变更任务未命中任何模块 paths——跳过模块文档加载；游离文件可在 Wave 收尾后跑 `sillyspec modules rebuild`）'
  }
  const kb = (n) => n > 0 ? `${(n / 1024).toFixed(1)}KB` : '?'
  const L = [
    '| task | 模块 | 粒度 | 模块卡（只读命中的卡，勿按目录整读） | 体量 | 读取建议 |',
    '|---|---|---|---|---|---|',
  ]
  const budgetBreached = new Set()
  for (const r of rows) {
    if (r.moduleId) {
      const over = r.cardBytes > MODULE_CARD_BUDGET_BYTES
      if (over) budgetBreached.add(r.moduleId)
      L.push(`| ${r.taskId} | ${r.moduleId} | ${r.granularity === 'fine' ? '细' : '粗'} | \`${r.cardPath}\` | ${kb(r.cardBytes)}${over ? ' ⚠️超预算' : ''} | ${r.advice} |`)
    } else {
      L.push(`| ${r.taskId} | — | — | （无命中，跳过模块文档） | — | — |`)
    }
  }
  L.push('')
  L.push('> 匹配规则：全部 _module-map.yaml 跨层最长前缀（子项目细卡优先于根层大卡），源=tasks 卡 allowed_paths。')
  L.push('> 细卡整卡可读；仅粗卡命中且体量大时**按节读**——只读「契约摘要/注意事项/定位」，跳过「变更索引/人工备注」历史累积段。')
  if (budgetBreached.size > 0) {
    L.push(`> ⚠️ 模块卡超预算（>${Math.round(MODULE_CARD_BUDGET_BYTES / 1024)}KB）：${[...budgetBreached].join('、')}——文档是 agent 的读取税，本次变更触及该模块，收尾时顺手 \`sillyspec modules split-changelog\` 迁出历史段或精简正文（对标 deepseek-harness verify-doc-budgets：预算只降不升）。`)
  }
  return L.join('\n')
}
