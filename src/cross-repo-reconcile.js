/**
 * cross-repo-reconcile.js — 跨仓 task 卡 target_files 的 per-repo 对账（零环新模块）。
 *
 * 坑 cross-repo-reconcile-blindness（2026-09-15 复盘实证：三端变更的对账表只有主仓机器可见，
 * 22 个跨仓文件在归档表全标「计划未动」、探针5 报「0 frontend calls」，跨仓全靠人工到对应仓
 * 解释）：reconcileTargetFiles 主链按 D-004 把跨仓卡从声明侧剔除——主仓 actual 永远对不上跨仓
 * 声明，剔除本身正确；但「留待后续分期」一直没有兑现，跨仓侧零机器可见性。
 *
 * 本模块兑现该分期：对每张跨仓卡声明的 repo key，读 local.yaml repos 注册表解析仓根，在**该仓**
 * 取 actual（diff HEAD~1..HEAD ∪ status porcelain untracked，与 resolveVerifyChangedFiles 跨仓
 * 分支同源口径），按主仓同款三类差集对账（matched / missing / undeclared + 脚手架软桶）。
 *
 * 定位与边界（与主仓对账的差异，显式声明防误读）：
 * - **advisory 不阻断**：跨仓 diff 锚点是 HEAD~1..HEAD 最近提交窗口（多 task 同仓时只反映最近
 *   一笔，精确范围要 task 卡 base/head 锡点——verify-postcheck:1119 先例同款限制），锚点脆弱期
 *   （已 commit 多笔 / 全在 working-tree）会产②类假信号，故只报告不翻转 verify 状态。
 * - 仓未注册 / 路径不可达 / 非 git 仓 → 该 repo degraded 一行说明，不炸整体。
 * - 不 import verify-postcheck（后者 import 本模块，反向成环）；路径归一/大小写折叠与主仓
 *   normalizeReconcilePath/pathKey 同口径本地实现，注释锚定不漂移。
 */
import { existsSync, readFileSync } from 'fs'
import { join, isAbsolute, resolve } from 'path'
import { gitQuiet } from './git-helper.js'
import { parseRepoRegistry } from './stages/plan-postcheck.js'
import { filterDeliverableFiles, classifyToolScaffold } from './worktree-apply.js'

// 与 verify-postcheck normalizeReconcilePath 同口径（本地实现防环）：剥 ./ 前缀、反斜杠归一
function normalizeRepoPath(p) {
  return String(p || '').trim().replace(/^\.\//, '').replace(/\\/g, '/')
}

// 与 verify-postcheck reconcileTargetFiles 的 foldCase 同口径：win32/darwin 文件系统大小写
// 不敏感，两形指同一文件；Linux 保持敏感
const foldCase = process.platform === 'win32' || process.platform === 'darwin'
const pathKey = (p) => {
  const n = normalizeRepoPath(p)
  return foldCase ? n.toLowerCase() : n
}

// 与 verify-postcheck parsePorcelainFilePaths 同口径（本地实现防环）：剥 XY 状态列、rename 取
// -> 后新路径、剥包裹引号、反斜杠归一
function parsePorcelain(raw) {
  return String(raw || '').split('\n')
    .map(l => l.slice(3).trim())
    .map(p => (p.includes(' -> ') ? p.slice(p.lastIndexOf(' -> ') + 4) : p).trim())
    .map(p => p.replace(/^"|"$/g, ''))
    .map(p => p.replace(/\\/g, '/'))
    .filter(Boolean)
}

/**
 * 跨仓声明对账。declarationsByRepo 由声明侧收集（collectDeclaredTargetFiles 跨仓卡分支）：
 * `{ [repoKey]: Array<{task, path, isNew}> }`——path 相对该仓根（跨仓卡口径）。
 *
 * @param {{ specBase: string, cwd: string, declarationsByRepo: Record<string, Array<{task:string,path:string,isNew:boolean}>> }} args
 * @returns {Array<{repo:string, repoPath:string|null, declaredCount:number, actualCount:number,
 *   matched:string[], missing:Array<{task:string,path:string,isNew?:boolean}>,
 *   undeclared:string[], scaffoldCount:number, degradedReason:string|null}>}
 *   每 repo 一项；degradedReason 非空时 matched/missing/undeclared 为空数组（该仓无结论）。
 */
export function reconcileCrossRepoDeclarations({ specBase, cwd, declarationsByRepo }) {
  const results = []
  const repos = declarationsByRepo && typeof declarationsByRepo === 'object' ? Object.keys(declarationsByRepo) : []
  if (repos.length === 0) return results

  let registry = new Map()
  try {
    const yamlPath = join(specBase || '', 'local.yaml')
    if (specBase && existsSync(yamlPath)) {
      registry = parseRepoRegistry(readFileSync(yamlPath, 'utf8'))
    }
  } catch { /* local.yaml 不可读 → 空注册表，各 repo 落「未注册」degraded */ }

  for (const repoKey of repos) {
    const declarations = declarationsByRepo[repoKey] || []
    const base = { repo: repoKey, repoPath: null, declaredCount: declarations.length, actualCount: 0,
      matched: [], missing: [], undeclared: [], scaffoldCount: 0, degradedReason: null }

    const rawPath = registry.get(repoKey)
    if (!rawPath) {
      results.push({ ...base, degradedReason: `repo key「${repoKey}」未在 local.yaml repos 注册——跨仓对账不可达，请人工到对应仓核对` })
      continue
    }
    const repoPath = isAbsolute(rawPath) ? rawPath : resolve(cwd, rawPath)
    base.repoPath = repoPath
    if (!existsSync(repoPath)) {
      results.push({ ...base, degradedReason: `注册路径不可达：${repoPath}` })
      continue
    }

    // actual 双源（resolveVerifyChangedFiles 跨仓分支同源）：已提交窗口 + working-tree 未提交
    const union = new Set()
    let anySource = false
    const diffOut = gitQuiet(repoPath, ['diff', '--name-only', 'HEAD~1..HEAD'], { timeout: 30 * 1000 })
    if (diffOut !== null) {
      anySource = true
      for (const f of String(diffOut).split('\n')) {
        const n = normalizeRepoPath(f)
        if (n) union.add(n)
      }
    }
    const statusOut = gitQuiet(repoPath, ['status', '--porcelain', '--untracked-files=all'], { timeout: 30 * 1000, trim: false })
    if (statusOut !== null) {
      anySource = true
      for (const f of parsePorcelain(statusOut)) union.add(f)
    }
    if (!anySource) {
      results.push({ ...base, degradedReason: '该仓 git 不可用/非仓库（diff 与 status 双失败）' })
      continue
    }

    const actualFiles = [...new Set(filterDeliverableFiles([...union]).filter(Boolean))].sort()
    base.actualCount = actualFiles.length
    const actualKeySet = new Set(actualFiles.map(pathKey))
    const declaredPaths = [...new Set(declarations.map(d => d.path))].sort()
    const declaredKeySet = new Set(declaredPaths.map(pathKey))
    for (const path of declaredPaths) {
      if (actualKeySet.has(pathKey(path))) base.matched.push(path)
    }
    for (const d of declarations) {
      if (!actualKeySet.has(pathKey(d.path))) {
        base.missing.push(d.isNew ? { task: d.task, path: d.path, isNew: true } : { task: d.task, path: d.path })
      }
    }
    // 脚手架软桶（主仓 reconcileTargetFiles 同口径）：工具/平台设施文件不进③类逐条清单
    for (const path of actualFiles) {
      if (declaredKeySet.has(pathKey(path))) continue
      if (classifyToolScaffold(path)) { base.scaffoldCount++; continue }
      base.undeclared.push(path)
    }
    results.push(base)
  }
  return results
}
