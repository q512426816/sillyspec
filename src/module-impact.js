/**
 * module-impact.js — `sillyspec module-impact` 的归类骨架生成
 * （2026-08-21 agent-手工产出审计第三批 D3）。
 *
 * archive 阶段的 module-impact.md 要求「模块影响矩阵」+「未匹配文件」两章节、≥20 行，
 * agent 此前从零手写整份矩阵。文件 × 模块的归属是纯机械分类（module-map paths 前缀匹配，
 * 与 scan diff 归属同源），影响类型判定（逻辑/数据结构/接口/调用关系/配置/新增）是语义——
 * 骨架预填「模块|文件|状态」三列，影响类型列留 <!--TODO--> 由 agent 逐行填。
 *
 * diff 源：resolveVerifyChangedFiles（worktree-aware，与 task-review 同源）；
 * module-map：.sillyspec/docs/<p>/modules/_module-map.yaml 的 modules.<id>.paths
 * （目录条目以 / 结尾按前缀匹配，与模块上下文索引读侧口径一致）。
 */
import { existsSync, readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { resolveVerifyChangedFiles } from './verify-postcheck.js'
import { resolveSpecDir } from './run/shared.js'

/**
 * 轻量解析 _module-map.yaml：modules.<id>.paths 列表（手写解析同 parseRepoRegistry 风格，
 * 只取 paths 平面信息，status/doc 等忽略）。
 * @returns {Map<string, string[]>} moduleId → paths（posix）
 */
export function parseModuleMapPaths(yamlText) {
  const map = new Map()
  if (!yamlText) return map
  let currentModule = null
  let inPaths = false
  for (const line of yamlText.split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue
    if (!/^\s/.test(line)) {
      inPaths = line.startsWith('modules:')
      currentModule = null
      continue
    }
    const modMatch = line.match(/^  ([A-Za-z0-9_.\-]+):\s*$/)
    if (modMatch) {
      currentModule = modMatch[1]
      inPaths = false
      continue
    }
    if (currentModule && /^    paths:\s*$/.test(line)) {
      inPaths = true
      if (!map.has(currentModule)) map.set(currentModule, [])
      continue
    }
    if (inPaths && currentModule) {
      const item = line.match(/^      - (.+)$/)
      if (item) map.get(currentModule).push(item[1].trim().replace(/\\/g, '/'))
    }
  }
  return map
}

function classifyFile(posixPath, modulePaths) {
  for (const [moduleId, paths] of modulePaths) {
    for (const p of paths) {
      // 目录条目以 / 结尾 → 前缀匹配；文件条目 → 精确或子路径（与模块上下文索引读侧口径一致）
      if (p.endsWith('/')) {
        if (posixPath.startsWith(p)) return moduleId
      } else if (posixPath === p || posixPath.startsWith(p + '/')) {
        return moduleId
      }
    }
  }
  return null
}

/**
 * 生成 module-impact.md 骨架。
 * @param {{ cwd: string, changeName: string, specDir?: string|null }} opts
 * @returns {{ markdown: string, matchedCount: number, unmatchedCount: number }|null}
 *   无 module-map / 无 diff → null（无可归类输入，agent 全手写）
 */
export function generateModuleImpactSkeleton({ cwd, changeName, specDir = null }) {
  const specBase = resolveSpecDir(cwd, { specDir })

  // 找 _module-map.yaml（docs/<p>/modules/；多项目取首个含 modules 索引的）
  let moduleMapPath = null
  try {
    for (const p of readdirSync(join(specBase, 'docs'), { withFileTypes: true })) {
      if (!p.isDirectory()) continue
      const candidate = join(specBase, 'docs', p.name, 'modules', '_module-map.yaml')
      if (existsSync(candidate)) {
        moduleMapPath = candidate
        break
      }
    }
  } catch { /* 无 docs/ */ }
  if (!moduleMapPath) return null

  const modulePaths = parseModuleMapPaths(readFileSync(moduleMapPath, 'utf8'))
  if (modulePaths.size === 0) return null

  const diffFiles = resolveVerifyChangedFiles(cwd, changeName) || []
  const sourceFiles = diffFiles.map(f => f.split('\\').join('/')).filter(f => !f.startsWith('.sillyspec/'))
  if (sourceFiles.length === 0) return null

  const byModule = new Map()
  const unmatched = []
  for (const f of sourceFiles) {
    const mod = classifyFile(f, modulePaths)
    if (mod) {
      if (!byModule.has(mod)) byModule.set(mod, [])
      byModule.get(mod).push(f)
    } else {
      unmatched.push(f)
    }
  }

  const L = [
    '# 模块影响分析（骨架由 `sillyspec module-impact --change <变更名>` 生成）',
    '',
    '> 文件×模块归属由 CLI 按 _module-map.yaml paths 前缀匹配预填；',
    '> **影响类型**（逻辑变更/数据结构变更/接口变更/调用关系变更/配置变更/新增）与 review 标记是语义判断，',
    '> 逐行把 <!--TODO--> 替换为真实结论——以 git diff 为准（真实 > 声明）。',
    '',
    '## 模块影响矩阵',
    '',
    '| 模块 | 变更文件 | 影响类型 | 需 review |',
    '|---|---|---|---|',
  ]
  const rows = [...byModule.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  for (const [moduleId, files] of rows) {
    for (const f of files) {
      L.push(`| ${moduleId} | \`${f}\` | <!--TODO--> | <!--TODO--> |`)
    }
  }
  L.push('')
  L.push('## 未匹配文件')
  L.push('')
  if (unmatched.length === 0) {
    L.push('无（全部变更文件已归属到模块）。')
  } else {
    L.push('以下变更文件未命中 _module-map.yaml 任何模块 paths——确认是模块索引过期（该跑 `sillyspec modules rebuild`）还是真的游离文件：')
    L.push('')
    for (const f of unmatched) L.push(`- \`${f}\` <!--TODO: 归属判定-->`)
  }
  L.push('')
  L.push('## 影响类型说明')
  L.push('')
  L.push('逻辑变更 / 数据结构变更 / 接口变更 / 调用关系变更 / 配置变更 / 新增；不确定的影响标 needs review。')
  L.push('')
  // 「更新结果」表骨架（2026-08-21 审查 CLI-3）：verify --done 死信门（extractPendingDocSyncRows）
  // 与 archive 移动前校验同一口径硬校验本表无 pending 行，但骨架此前不产出该表——agent 只能
  // 从 gate 报错反推格式（plan.js prompt 自认的坑）。此处按矩阵命中模块机械生成行，agent 只回填状态。
  L.push('## 更新结果')
  L.push('')
  L.push('| 目标 | 操作 | 状态 |')
  L.push('|------|------|------|')
  for (const [moduleId] of rows) {
    L.push(`| \`modules/${moduleId}.md\` | 更新${moduleId}模块卡（本次变更涉及） | pending |`)
  }
  if (unmatched.length > 0) {
    L.push('| `_module-map.yaml` | <!--TODO: 有未匹配文件，判定模块索引是否需增改（modules rebuild）--> | pending |')
  } else {
    L.push('| `_module-map.yaml` | 无变化（未增删模块） | skipped |')
  }
  L.push('')
  L.push('规则：execute/verify 完成文档同步后把对应行回填 done；确定不同步的行改 skipped 并在操作列写明原因。')
  L.push('')

  return { markdown: L.join('\n'), matchedCount: sourceFiles.length - unmatched.length, unmatchedCount: unmatched.length }
}
