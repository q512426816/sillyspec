/**
 * cross-repo-reconcile.js — 跨仓 per-repo 对账 + 共享采集内核 collectRepoActual。
 *
 * 坑 cross-repo-reconcile-blindness（2026-09-15 复盘实证：三端变更的对账表只有主仓机器可见，
 * 22 个跨仓文件在归档表全标「计划未动」、探针5 报「0 frontend calls」，跨仓全靠人工到对应仓
 * 解释）：reconcileTargetFiles 主链按 D-004 把跨仓卡从声明侧剔除——主仓 actual 永远对不上跨仓
 * 声明，剔除本身正确；但「留待后续分期」一直没有兑现，跨仓侧零机器可见性。
 *
 * 本模块兑现该分期：对每张跨仓卡声明的 repo key，读 local.yaml repos 注册表解析仓根，在**该仓**
 * 取 actual，按主仓同款三类差集对账（matched / missing / undeclared + 脚手架软桶）。
 *
 * collectRepoActual（2026-09-20 scope-audit-cross-repo，D-001@v1）：per-repo actual 采集**共享
 * 内核**（scope-audit 与 verify 侧 reconcile 双侧消费、单一真相源，防两份口径漂移）——职责 =
 * 仓注册解析 → 仓根 → 锚点四级（A reviews-range[execute task 锡点区间并集 ∪ status 未提交尾巴]
 * > B head~1-window[HEAD~1..HEAD ∪ status，与 resolveVerifyChangedFiles 跨仓分支同源口径]
 * > C head-uncommitted-window[仅 status] > degraded[未注册/路径不可达/git 双源失败合并判定]）
 * → actual 文件集。**行数采集不进内核**（评审 G3）：内核绝不 import scope-audit（否则与本模块
 * 消费方 scope-audit 成环），stats 由调用方对内核产物自行跑 collectNumstatByPath。
 *
 * 定位与边界（与主仓对账的差异，显式声明防误读）：
 * - **advisory 不阻断**：B/C 档锚点是最近提交/未提交窗口（多 task 同仓时 B 档只反映最近一笔，
 *   精确范围要 task 卡 base/head 锡点——A 档即该锡点档，verify-postcheck:1119 先例同款限制），
 *   锚点脆弱期（已 commit 多笔 / 全在 working-tree）会产②类假信号，故只报告不翻转 verify 状态。
 * - 仓未注册 / 路径不可达 / 非 git 仓 → 该 repo degraded 一行说明，不炸整体。
 * - 不 import verify-postcheck（后者 import 本模块，反向成环）；import task-review 的
 *   resolveLatestExecuteRunIdWithTasks/readReview 不新增环边：task-review 本身不 import 本模块，
 *   「本模块→worktree-apply→task-review→verify-postcheck→本模块」的环今日已存在（worktree-apply
 *   静态 import 同批函数先例），直连只是抄近路，且全为调用期求值的函数声明（ESM live binding）。
 * - 路径归一/大小写折叠与主仓 normalizeReconcilePath/pathKey 同口径本地实现，注释锚定不漂移。
 */
import { existsSync, readFileSync, readdirSync } from 'fs'
import { join, isAbsolute, resolve } from 'path'
import { gitQuiet } from './git-helper.js'
import { parseRepoRegistry } from './stages/plan-postcheck.js'
import { filterDeliverableFiles, classifyToolScaffold } from './worktree-apply.js'
import { resolveLatestExecuteRunIdWithTasks, readReview } from './task-review.js'

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

// ── collectRepoActual 共享采集内核（D-001@v1）────────────────────────────────

const GIT_TIMEOUT = 30 * 1000 // 与本模块既有 gitQuiet 调用一致

function degradedAnchor() {
  return { source: 'degraded', base: null, head: null, label: 'degraded' }
}

// git rev-list --count a..b = b 可达集减 a 可达集的 commit 数；null = git 失败（commit 缺失等），
// 调用方按「无法判序」降级 B 档
function revListCount(repoPath, a, b) {
  const out = gitQuiet(repoPath, ['rev-list', '--count', `${a}..${b}`], { timeout: GIT_TIMEOUT })
  if (out === null) return null
  const n = Number(String(out).trim())
  return Number.isFinite(n) ? n : null
}

/**
 * 多 task review 区间的最早 base / 最晚 head（A 档锚点核心）。
 * 判序口径：rev-list --count x..y === 0 ⟺ y ⊆ x（y 是 x 的祖先或相等，即 y 更早或相等）。
 * - base（要最早）：count(base..b)===0 → b 更早或相等 → base=b；否则 b 含 base 外 commit（后代
 *   或分叉）→ merge-base 统一兜底（后代时 merge-base===base 为 no-op；分叉时退公共祖先，保持
 *   base 是已见区间的共同起点）；merge-base 失败保持现值（保守）。
 * - head（要最晚）：count(h..head)===0 → head ⊆ h（h 更晚或相等）→ head=h；否则保持——head 无
 *   merge-base 语义（公共祖先更早，取了反而丢区间），分叉宁保守。
 * rev-list 失败（null）→ 整体 null（调用方降 B 档）。
 */
function computeReviewsRangeAnchor(repoPath, reviews) {
  try {
    let base = reviews[0].base
    for (let i = 1; i < reviews.length; i++) {
      const b = reviews[i].base
      const cnt = revListCount(repoPath, base, b)
      if (cnt === null) return null
      if (cnt === 0) { base = b; continue }
      const mb = gitQuiet(repoPath, ['merge-base', base, b], { timeout: GIT_TIMEOUT })
      const mbTrim = mb === null ? '' : String(mb).trim()
      if (mbTrim) base = mbTrim
    }
    let head = reviews[0].head
    for (let i = 1; i < reviews.length; i++) {
      const h = reviews[i].head
      const cnt = revListCount(repoPath, h, head)
      if (cnt === null) return null
      if (cnt === 0) head = h
    }
    return { base, head }
  } catch { return null }
}

/**
 * A 档采集尝试：resolveLatestExecuteRunIdWithTasks 定位 run → 遍历 task-NN/review.json →
 * review.repo===repoKey 且 base/head 均为非空 string 的条目 → 各自 base..head 区间 diff
 * --name-only（有 diffPaths 按其收窄——统一 commit 模式语义，与 task-review 校验切片同款）
 * 输出归一求并集。
 * @returns {{anchor:{source:string,base:string,head:string,label:string}, files:string[]}|null}
 *   null = A 档不可用（无 run / 无匹配 review / 全部区间 diff 失败 / 锚点判序 git 失败）
 *   → 调用方落 B 档。
 */
function tryCollectReviewsRange(repoPath, runtimeRoot, changeName, repoKey) {
  let runId
  try {
    runId = resolveLatestExecuteRunIdWithTasks({ runtimeRoot, changeName })
  } catch { return null }
  if (!runId) return null
  const tasksDir = join(runtimeRoot, 'execute-runs', runId, 'tasks')
  let taskDirs
  try {
    if (!existsSync(tasksDir)) return null
    taskDirs = readdirSync(tasksDir, { withFileTypes: true })
      .filter(e => e.isDirectory()).map(e => e.name).sort()
  } catch { return null }
  const reviews = []
  for (const name of taskDirs) {
    let rr
    try { rr = readReview(join(tasksDir, name, 'review.json')) } catch { continue }
    if (!rr || !rr.ok || !rr.review) continue
    const rv = rr.review
    if (rv.repo !== repoKey) continue
    if (typeof rv.base !== 'string' || !rv.base.trim()) continue
    if (typeof rv.head !== 'string' || !rv.head.trim()) continue
    const diffPaths = Array.isArray(rv.diffPaths)
      ? rv.diffPaths.filter(p => typeof p === 'string' && p.trim()) : []
    reviews.push({ base: rv.base.trim(), head: rv.head.trim(), diffPaths })
  }
  if (reviews.length === 0) return null
  const union = new Set()
  let anyDiff = false
  for (const rv of reviews) {
    const args = ['diff', '--name-only', `${rv.base}..${rv.head}`]
    if (rv.diffPaths.length > 0) args.push('--', ...rv.diffPaths)
    const out = gitQuiet(repoPath, args, { timeout: GIT_TIMEOUT })
    if (out === null) continue // 单条区间失败跳过（其余区间仍算数）；全失败由 anyDiff 兜底落 B 档
    anyDiff = true
    for (const f of String(out).split('\n')) {
      const n = normalizeRepoPath(f)
      if (n) union.add(n)
    }
  }
  if (!anyDiff) return null
  const range = computeReviewsRangeAnchor(repoPath, reviews)
  if (!range) return null
  return {
    anchor: { source: 'reviews-range', base: range.base, head: range.head,
      label: `reviews base..head（execute task 锡点，${reviews.length} task 区间并集）` },
    files: [...union],
  }
}

// status porcelain 未提交尾巴并入集合；返回 git 是否成功（C 档判据）
function collectStatusInto(repoPath, union) {
  const statusOut = gitQuiet(repoPath, ['status', '--porcelain', '--untracked-files=all'],
    { timeout: GIT_TIMEOUT, trim: false })
  if (statusOut === null) return false
  for (const f of parsePorcelain(statusOut)) union.add(f)
  return true
}

/**
 * per-repo actual 采集共享内核（scope-audit 与 verify 侧 reconcile 双侧消费，D-001@v1 单一
 * 真相源）：仓注册解析（local.yaml repos）→ 仓根 → 锚点四级 → actual 文件集（相对该仓根、
 * 正斜杠、去重排序）。
 *
 * @param {{ repoKey: string, specBase: string, cwd: string, runtimeRoot?: string|null,
 *           changeName?: string|null }} args
 *   runtimeRoot：平台模式与 specBase 分离时传 execute-runs 读取根；changeName：A 档 reviews
 *   解析入参。任一缺省 → 跳 A 档走 B 档（向后兼容现行调用）。
 *   行数采集不进内核（防循环 import，评审 G3）——stats 由调用方（scope-audit 集成层）对返回
 *   files 跑 collectNumstatByPath(repoPath, files, { baseRef: anchor.base })。
 * @returns {{ repo: string, repoPath: string|null,
 *   anchor: { source: 'reviews-range'|'head~1-window'|'head-uncommitted-window'|'degraded',
 *             base: string|null, head: string|null, label: string },
 *   files: string[], degradedReason: string|null }}
 *   degradedReason 非空时 anchor.source='degraded'、files=[]；files 为原始集（**不做**
 *   filterDeliverableFiles 过滤——过滤归调用方，verify 侧现行过滤保持在 reconcile 内）。
 *   纯读 fail-soft：任何异常 → degraded 形态返回（degradedReason=`内核采集异常: <msg首行>`），
 *   绝不 throw。
 */
export function collectRepoActual({ repoKey, specBase, cwd, runtimeRoot = null, changeName = null }) {
  try {
    // 1) 仓注册解析（与 reconcile 旧口径同源：local.yaml repos 段，读失败 → 空注册表落「未注册」）
    let registry = new Map()
    try {
      const yamlPath = join(specBase || '', 'local.yaml')
      if (specBase && existsSync(yamlPath)) registry = parseRepoRegistry(readFileSync(yamlPath, 'utf8'))
    } catch { /* local.yaml 不可读 → 空注册表 → 落「未注册」degraded */ }
    const rawPath = registry.get(repoKey)
    if (!rawPath) {
      return { repo: repoKey, repoPath: null, anchor: degradedAnchor(), files: [],
        degradedReason: `repo key「${repoKey}」未在 local.yaml repos 注册——跨仓对账不可达，请人工到对应仓核对` }
    }

    // 2) 仓根（isAbsolute/resolve 兼容 Windows 盘符绝对注册与相对 cwd 注册）
    const repoPath = isAbsolute(rawPath) ? rawPath : resolve(cwd, rawPath)
    if (!existsSync(repoPath)) {
      return { repo: repoKey, repoPath, anchor: degradedAnchor(), files: [],
        degradedReason: `注册路径不可达：${repoPath}` }
    }

    // 3) A 档 reviews-range：runtimeRoot 与 changeName 双提供才尝试（缺省跳过 = 向后兼容）
    if (runtimeRoot && changeName) {
      const range = tryCollectReviewsRange(repoPath, runtimeRoot, changeName, repoKey)
      if (range) {
        const union = new Set(range.files)
        collectStatusInto(repoPath, union) // 未提交尾巴并入；status 失败不降级（A 档由锡点区间确立）
        return { repo: repoKey, repoPath, anchor: range.anchor, files: [...union].sort(), degradedReason: null }
      }
    }

    // 4) B/C 档：diff HEAD~1..HEAD（现行 reconcile 口径）∪ status；diff 失败仅 status → C 档
    const union = new Set()
    const diffOut = gitQuiet(repoPath, ['diff', '--name-only', 'HEAD~1..HEAD'], { timeout: GIT_TIMEOUT })
    if (diffOut !== null) {
      for (const f of String(diffOut).split('\n')) {
        const n = normalizeRepoPath(f)
        if (n) union.add(n)
      }
      collectStatusInto(repoPath, union)
      return { repo: repoKey, repoPath,
        anchor: { source: 'head~1-window', base: null, head: null, label: 'HEAD~1..HEAD 最近提交窗口（降级——无可用 reviews）' },
        files: [...union].sort(), degradedReason: null }
    }
    if (collectStatusInto(repoPath, union)) {
      return { repo: repoKey, repoPath,
        anchor: { source: 'head-uncommitted-window', base: null, head: null, label: 'HEAD 未提交窗口（降级——无可用 diff 锚）' },
        files: [...union].sort(), degradedReason: null }
    }

    // 5) degraded：diff 与 status 双源失败合并判定（不拆「非 git 仓」——形态不可区分，G4）
    return { repo: repoKey, repoPath, anchor: degradedAnchor(), files: [],
      degradedReason: '该仓 git 不可用/非仓库（diff 与 status 双失败）' }
  } catch (e) {
    return { repo: repoKey, repoPath: null, anchor: degradedAnchor(), files: [],
      degradedReason: `内核采集异常: ${String((e && e.message) || e).split('\n')[0]}` }
  }
}

/**
 * 跨仓声明对账（collectRepoActual 内核的 verify 侧消费入口）。declarationsByRepo 由声明侧
 * 收集（collectDeclaredTargetFiles 跨仓卡分支）：`{ [repoKey]: Array<{task, path, isNew}> }`——
 * path 相对该仓根（跨仓卡口径）。
 *
 * @param {{ specBase: string, cwd: string,
 *           declarationsByRepo: Record<string, Array<{task:string,path:string,isNew:boolean}>>,
 *           runtimeRoot?: string|null, changeName?: string|null }} args
 *   runtimeRoot/changeName 为可选增量（缺省 null → 内核跳 A 档走 B 档，向后兼容现行调用）；
 *   双提供时锚点升级 reviews-range 锡点档（②类假信号面收窄，advisory 定位不变）。
 * @returns {Array<{repo:string, repoPath:string|null, declaredCount:number, actualCount:number,
 *   matched:string[], missing:Array<{task:string,path:string,isNew?:boolean}>,
 *   undeclared:string[], scaffoldCount:number, degradedReason:string|null,
 *   anchor:{source:string,base:string|null,head:string|null,label:string}}>}
 *   每 repo 一项；degradedReason 非空时 matched/missing/undeclared 为空数组（该仓无结论）。
 *   anchor 为增量字段（内核透传的锚点档）——既有字段形状零变化，verify-postcheck 消费点无感。
 */
export function reconcileCrossRepoDeclarations({ specBase, cwd, declarationsByRepo, runtimeRoot = null, changeName = null }) {
  const results = []
  const repos = declarationsByRepo && typeof declarationsByRepo === 'object' ? Object.keys(declarationsByRepo) : []
  if (repos.length === 0) return results

  for (const repoKey of repos) {
    const declarations = declarationsByRepo[repoKey] || []
    const base = { repo: repoKey, repoPath: null, declaredCount: declarations.length, actualCount: 0,
      matched: [], missing: [], undeclared: [], scaffoldCount: 0, degradedReason: null, anchor: null }

    // 采集半边全权委托内核（仓注册解析→仓根→锚点四级→actual 文件集）；纯读 fail-soft 不 throw
    const actual = collectRepoActual({ repoKey, specBase, cwd, runtimeRoot, changeName })
    base.repoPath = actual.repoPath
    base.anchor = actual.anchor
    if (actual.degradedReason) {
      base.degradedReason = actual.degradedReason
      results.push(base)
      continue
    }

    // 声明差集半边保持不动（主仓 reconcileTargetFiles 同款三类差集 + 脚手架软桶）；
    // filterDeliverableFiles 过滤归本消费方（内核产原始集，职责边界见 collectRepoActual JSDoc）
    const actualFiles = [...new Set(filterDeliverableFiles(actual.files).filter(Boolean))].sort()
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
