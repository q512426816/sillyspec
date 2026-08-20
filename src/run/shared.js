/**
 * run.js 共享纯工具（W6 Step1 从 run.js 抽出）。
 *
 * 安全锚：run.js 始终是 barrel。这些函数搬至此模块后，run.js import 回来；
 * parsePorcelainPath + auditQuickCompletion 被 test 直接 import，run.js 必须 re-export。
 *
 * 路径修正（相对 src/run/）：
 *   - resolvePromptIncludes 的 templates/prompts 在仓库根 → __dirname 上两层
 *   - triggerSync 的动态 import './sync.js' → '../sync.js'（src/sync.js）
 *   - safeGit 已收口到 src/git-helper.js（单一公共 git 调用入口，数组形式不经 shell），
 *     本模块仅 re-export，run/ 层现有调用方路径与行为不变。
 */
import { basename, join, resolve, dirname, sep } from 'node:path'
import { existsSync, readdirSync, readFileSync, statSync, mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import os from 'node:os'

// safeGit 收口至 src/git-helper.js：import 建本地词法绑定（本模块内部 L128/130/431 调用）+
// re-export 供 run/ 层现有调用方继续从 shared.js 引用（pure re-export 不建本地绑定，会致内部 ReferenceError）。
import { safeGit } from '../git-helper.js'
import { createHash } from 'node:crypto'
export { safeGit }

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── Wait State Constants ──（W6 Step3 从 run.js 搬入：prompt.js outputStep 与 run.js wait-detection 共用）
// 正则匹配：只识别独立一行的标记，避免误伤文档正文引用
export const WAIT_MARKER_RE = /^\s*\[(WAIT_FOR_USER|NEEDS_CONFIRM|NEEDS_DECISION)\]\s*$/m

// ── did-you-mean（命令级 + flag 级 typo 建议，零依赖）──
// 历史：agent 打错命令名/flag 名只报「未知」+整屏列表，要自己捞正确拼写。
export function levenshtein(a, b) {
  const m = String(a).length, n = String(b).length
  if (!m) return n; if (!n) return m
  let prev = Array.from({ length: n + 1 }, (_, i) => i)
  for (let i = 1; i <= m; i++) {
    const cur = [i]
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    prev = cur
  }
  return prev[n]
}
export function didYouMean(input, candidates) {
  if (!input) return null
  let best = null, bestD = Infinity
  for (const c of candidates) {
    const d = levenshtein(String(input).toLowerCase(), String(c).toLowerCase())
    if (d < bestD) { bestD = d; best = c }
  }
  return (best !== null && bestD <= Math.max(1, Math.floor(String(input).length / 2))) ? best : null
}

// ── 变更名路径穿越消毒（F6）──
// change 名会被 join 进 .sillyspec/changes/<name>/ 当目录用。若含 ../ 或路径分隔符，
// 会逃出 changes/ 写到任意位置（如 --change ../../etc/x 把 proposal.md 写到 changes 同级之外）。
// 在 --change 解析边界统一消毒，比在每个 join 点守卫更集中。合法名：字母/数字/._-，禁分隔符与 ..
export function assertSafeChangeName(name, label = '变更名') {
  if (name == null) return
  const s = String(name)
  if (s === '') throw new Error(`${label}不能为空`)
  // 含路径分隔符 或 父目录穿越段 → 拒绝（Windows 下 \\ 也算）
  if (/[\\/]/.test(s) || /(^|[/\\])\.\.(?=$|[/\\])/.test(s) || s === '..' || s.includes('..')) {
    throw new Error(`${label}「${s}」含路径分隔符或 ..，禁止路径穿越（变更名只能是 .sillyspec/changes/ 下的一个目录名，不能逃出）`)
  }
  if (!/^[\w.\-]+$/.test(s)) {
    throw new Error(`${label}「${s}」含非法字符（仅允许字母、数字、._-）`)
  }
}

import { buildExecuteSteps } from '../stages/execute.js'
import { buildPlanSteps } from '../stages/plan.js'
import { stageRegistry } from '../stages/index.js'
import { parseRepo, parseRepoRegistry } from '../stages/plan-postcheck.js'
import { MultiRepoContext } from './multi-repo-context.js'

/**
 * 解析 prompt 中的 {{include: <name>}} 占位符：读包内 templates/prompts/<name>.md 注入。
 * 把 stage step prompt 里 self-contained 的大块抽到外部模板，CLI 端组装时注入——
 * agent 收到的仍是自包含 prompt 字符串，无需自己 Read。单次替换（不递归）；
 * 模板缺失则保留占位符并 warn，便于发现配置错误。
 */
export function resolvePromptIncludes(text) {
  return text.replace(/\{\{include:\s*([\w.-]+)\s*\}\}/g, (match, name) => {
    // shared.js 在 src/run/，templates/prompts 在仓库根 → 上两层
    const tplPath = join(__dirname, '..', '..', 'templates', 'prompts', `${name}.md`)
    if (!existsSync(tplPath)) {
      console.warn(`⚠️ prompt include 模板缺失: ${name} (期望: ${tplPath})`)
      return match
    }
    return readFileSync(tplPath, 'utf8')
  })
}

/**
 * 找 .sillyspec 祖先目录：用户指定 specDir 优先，否则从 cwd 向上找。
 * home 拒绝守卫：home 下的 .sillyspec 恒不命中——历史污染源（smoke 测试在 home 下临时目录
 * 跑 CLI，_ensureDB 读路径即建库，~/.sillyspec 长出一整套平行进度库后，任何 home 子目录
 * 跑命令都会向上撞它，污染自我延续）。撞 home 即停，回退 cwd/.sillyspec（子目录自建）。
 * @param {string} cwd
 * @param {object} [opts]
 * @param {string} [opts.specDir] - 用户指定的 specDir（通过 --spec-dir 或 --spec-root）
 * @returns {string} 规范目录的绝对路径
 */
export function resolveSpecDir(cwd, opts = {}) {
  if (opts.specDir) return resolve(opts.specDir)
  const home = os.homedir()
  let dir = resolve(cwd)
  while (true) {
    // home 拒绝守卫：cwd 本身就在 home 下（含恰好在 home 跑命令）时，home 层不匹配 .sillyspec，
    // 继续向上只会离项目更远（home 的父目录不可能有真项目 .sillyspec），直接回退 cwd/.sillyspec。
    if (dir !== home) {
      const candidate = join(dir, '.sillyspec')
      if (existsSync(candidate)) return candidate
    }
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return join(resolve(cwd), '.sillyspec')
}

/**
 * 枚举 cwd 祖先链（含自身）上所有 .sillyspec 目录的绝对路径，上界 = git root。
 *
 * 返回顺序：从 cwd 最近开始向上到 git root（含两端命中项）。单实例项目任意子目录恒返回 [自身]。
 *
 * 上界 = git root（monorepo 天然边界）。必须有限上界：一路数到文件系统根会撞 home 等
 * 无关祖先的孤立 .sillyspec（home 下任何项目都被误报多实例）。非 git 仓库：不向上数，
 * 只看 cwd 自身（≤1，永不误报）。
 *
 * 被 countAncestorSpecDirs（漂移提醒 warn）与 locateQuickSessionGuard（quick 漂移 fail-fast
 * 守卫，坑 quick-cwd-drift-splits-specdir）共用 —— 单一真相源，避免两处各自重写祖先枚举漂移。
 */
export function ancestorSpecDirs(cwd) {
  const resolved = resolve(cwd)
  // 上界 = git root。但 linked worktree 内 --show-toplevel 返回 worktree 根(非主仓根),
  // 祖先链到不了主仓 .sillyspec → 漂移提醒/quick 守卫全哑(坑 worktree-execute-spec-drift)。
  // 复刻 worktree.js _resolveMainRepoRoot:--git-common-dir 的 dirname 才是主仓根,取更靠上者作 ceiling。
  // (git 可能返回相对路径,须 resolve(cwd, commonDir) 绝对化,否则相对 process.cwd 误解析。)
  const topLevel = safeGit(resolved, ['rev-parse', '--show-toplevel']).value
  let ceiling = topLevel ? resolve(topLevel) : null
  const commonDir = safeGit(resolved, ['rev-parse', '--git-common-dir']).value
  if (commonDir) {
    const absCommonDir = resolve(resolved, commonDir)
    if (existsSync(absCommonDir) && statSync(absCommonDir).isDirectory()) {
      const mainRoot = dirname(absCommonDir)
      // 主仓根是 worktree 根的祖先时取它(更靠上);monorepo/单仓两者相等不替换,行为不变
      if (!ceiling || resolve(ceiling).startsWith(resolve(mainRoot) + sep)) ceiling = mainRoot
    }
  }
  const dirs = []
  let dir = resolved
  while (true) {
    if (existsSync(join(dir, '.sillyspec'))) dirs.push(join(dir, '.sillyspec'))
    if (!ceiling || resolve(dir) === resolve(ceiling)) break
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return dirs
}

/**
 * 统计 cwd 祖先链上有多少个 .sillyspec 目录（= ancestorSpecDirs(cwd).length）。
 *
 * ≥2 个 = monorepo 多实例（子项目独立 .sillyspec + 根 .sillyspec 并存），resolveSpecDir 命中的
 * 「最近」实例未必是用户意图的项目（如 cd 进被独立 scan 的子项目跑测试后忘回根）→ 漂移风险。
 * 单实例项目在任意子目录工作恒返回 1，不误报。
 */
export function countAncestorSpecDirs(cwd) {
  return ancestorSpecDirs(cwd).length
}

/**
 * 在 cwd 祖先链的各 specBase 中查找 quick 会话 guard.json（坑 quick-cwd-drift-splits-specdir）。
 *
 * sessionId（quick-<uuid8>）全局唯一，但 guard.json 按 specBase 分散落盘
 * （<specBase>/.runtime/quick-sessions/<sessionId>/guard.json）。cd 漂移到子项目后，当前 specBase
 * 下读不到本 session 的 guard，但祖先链别处的 specBase（创建 session 的根）仍有它 → 据此定位
 * session 真正归属，供 detectQuickSessionDrift 的 fail-fast 守卫判断。
 *
 * 遍历顺序 = ancestorSpecDirs（cwd 最近 → git root），返回第一个命中。
 *
 * @param {string} cwd
 * @param {string} sessionId - quick-<uuid8>
 * @returns {{ specBase: string, guard: object } | null}
 */
export function locateQuickSessionGuard(cwd, sessionId) {
  if (!sessionId) return null
  for (const specBase of ancestorSpecDirs(cwd)) {
    const guardFile = join(specBase, '.runtime', 'quick-sessions', sessionId, 'guard.json')
    if (existsSync(guardFile)) {
      try {
        const guard = JSON.parse(readFileSync(guardFile, 'utf8'))
        return { specBase, guard }
      } catch {
        // guard.json 损坏：当作不存在，继续找下一个（不阻断主流程）
      }
    }
  }
  return null
}

/**
 * 检测 quick 会话是否跨 specDir 漂移（坑 quick-cwd-drift-splits-specdir）。
 *
 * quick 被 validateChangeExists 的 sessionId 豁免（quick-<8hex> 不在 changes/ 下），故 quick
 * 漂移除 countAncestorSpecDirs 的 warn 外无硬守卫 → 无声分裂（progress/artifact/QUICKLOG 落
 * 子项目、根 session 停滞）。本函数补这个口：
 *   - 当前 specBase 已有本 session guard → null（同一 specDir，无漂移）
 *   - 当前 specBase 没有，但祖先链别处有同 sessionId guard → 判漂移，返回引导信息供调用方 fail-fast
 *   - 别处也没有 → null（真·新会话首次启动，guard 尚未建，放行 —— 不误伤子项目主动启新 quick）
 *
 * 风格仿 validateChangeExists：null = 通过，对象 = 失败（含 message）。
 *
 * @param {string} cwd
 * @param {string} currentSpecBase - 当前命中的 specBase
 * @param {string} sessionId - quick-<uuid8>
 * @returns {{ realSpecBase: string, message: string } | null}
 */
export function detectQuickSessionDrift(cwd, currentSpecBase, sessionId) {
  if (!sessionId || !currentSpecBase) return null
  // 当前 specBase 已有本 session guard → 同一 specDir，无漂移
  const currentGuard = join(currentSpecBase, '.runtime', 'quick-sessions', sessionId, 'guard.json')
  if (existsSync(currentGuard)) return null
  // 当前没有 → 看祖先链别处有没有同 sessionId 的 guard
  const located = locateQuickSessionGuard(cwd, sessionId)
  if (!located) return null // 别处也没有 = 真·新会话首次启动，放行
  return {
    realSpecBase: located.specBase,
    message: `quick 会话 "${sessionId}" 创建于 ${located.specBase}，当前 cwd 解析到 ${currentSpecBase}（跨 specDir 漂移）。` +
      `继续会把 progress/artifact/QUICKLOG 写到错误的 spec，与原会话分裂。` +
      `排查：① cd 回 ${dirname(located.specBase)}（原 spec 所属项目根）再跑；② 或显式 --spec-dir ${located.specBase} 指定原 spec。`,
  }
}

/**
 * 检测 specBase 是否命中 worktree 内 checkout 出来的 .sillyspec 副本（坑 worktree-execute-spec-drift）。
 *
 * worktree 根 = <mainRepo>/.sillyspec/.runtime/worktrees/<changeName>/（worktree.js WORKTREES_REL）。
 * worktree 是主仓完整 checkout,若 .sillyspec/changes/ 被跟踪 → 副本里 change 目录真实存在,
 * validateChangeExists 被骗放行 → 进度/产出写进副本,与主仓 .sillyspec 分裂(副本随工作树清理丢失)。
 *
 * 判据:specBase 路径含 `.sillyspec/.runtime/worktrees/<seg>/.sillyspec`。主仓 specBase=<mainRepo>/.sillyspec
 * 无此段 → null,零误伤。返回 null=通过;对象=漂移(含 mainSpecBase/changeName/message),风格仿
 * validateChangeExists。覆盖 plan/execute/verify/archive(同 Set)——都要求 change 已存在、都会被副本骗过。
 * 平台模式/--spec-dir 已明确指定,由调用方跳过。
 */
export function detectWorktreeSpecDrift(specBase) {
  if (!specBase) return null
  const seg = resolve(specBase).split(sep)
  // specBase 恒以 .sillyspec 结尾(command.js specBase=join(cwd,'.sillyspec'))。worktree 副本形如
  // <mainRepo>/.sillyspec/.runtime/worktrees/<change>/.sillyspec —— 尾段也须是 .sillyspec,
  // 否则 worktree 根目录本身(<.../worktrees/<change>)会被误判(它不是 spec,不会作 specBase 传入)。
  if (seg[seg.length - 1] !== '.sillyspec') return null
  for (let i = 0; i + 3 < seg.length; i++) {
    if (seg[i] === '.sillyspec' && seg[i + 1] === '.runtime' && seg[i + 2] === 'worktrees') {
      const changeName = seg[i + 3]
      const mainSpec = seg.slice(0, i + 1).join(sep) // <mainRepo>/.sillyspec
      return {
        changeName,
        mainSpecBase: mainSpec,
        message: `当前 spec 命中 worktree 副本(${specBase})——这是 ${changeName} 隔离工作树内 checkout 出来的 .sillyspec,不是主仓 spec。\n` +
          `   在此跑 plan/execute/verify/archive 会把进度与产出写到副本,与主仓 .sillyspec 分裂(副本随工作树清理而丢失)。\n` +
          `   排查:① cd 回 ${dirname(mainSpec)}(主仓根)再跑;② 或 --spec-dir ${mainSpec} 显式指定主仓 spec。`,
      }
    }
  }
  return null
}

/**
 * 统一解析 .runtime 根目录（坑 execute-runs-isolation）。
 *
 * 优先级：平台模式 runtimeRoot > drift 锚点 specDriftAnchor > 本地 specBase/.runtime。
 * specDriftAnchor 仅在此处消费，不参与平台 sentinel（specRoot||runtimeRoot）判定，
 * 避免误跳 triggerSync（:286）/ checkApproval（:313）/ 平台渲染分支（D-02）。
 *
 * 历史：drift 守卫（command.js）命中时只重写本地 specBase/specRoot/specDir/pm（progress 落主仓），
 * 但漏设 platformOpts 字段——下游 15 处 runtimeRoot 解析从 cwd（仍 worktree）重算 → execute-runs /
 * stage-reviews 落 worktree，被 cleanup 整目录删。本函数 + specDriftAnchor 锚点堵此源头。
 *
 * @param {object} [platformOpts] - { runtimeRoot?, specDriftAnchor?, ... }（可 null/undefined）
 * @param {string} localSpecBase - 本地 specBase（cwd/.sillyspec），兜底落点
 * @returns {string} .runtime 根目录绝对路径
 */
export function resolveRuntimeRoot(platformOpts, localSpecBase) {
  if (platformOpts?.runtimeRoot) return platformOpts.runtimeRoot
  if (platformOpts?.specDriftAnchor) return join(platformOpts.specDriftAnchor, '.runtime')
  return join(localSpecBase, '.runtime')
}

/**
 * quick 会话目录（.runtime/quick-sessions）的单一解析入口（multi-agent-review Q4）。
 *
 * 历史 bug：stage.js 写 guard 用 `specBase/.runtime/quick-sessions/`，收尾 handleQuickStageCompletion
 * 读/清理用 `resolveRuntimeRoot`（runtimeRoot 被设时返回 runtimeRoot）。两者在平台模式（runtimeRoot 与
 * specBase/.runtime 不同）下分裂——guard 写到 specBase/.runtime、收尾从 runtimeRoot 读不到 → guard=null
 * brownfield 分支整体跳过边界审计 + 兜底重分配 qlId + session 目录清错位置。
 *
 * 收敛到此函数后，写/读/清理三处共用同一解析（基于 resolveRuntimeRoot），任何平台/漂移模式都对齐。
 *
 * @param {object} [platformOpts] - { runtimeRoot?, specDriftAnchor?, ... }（可 null/undefined）
 * @param {string} localSpecBase - 本地 specBase（cwd/.sillyspec），兜底落点
 * @returns {string} quick-sessions 目录绝对路径
 */
export function resolveQuickSessionsDir(platformOpts, localSpecBase) {
  return join(resolveRuntimeRoot(platformOpts, localSpecBase), 'quick-sessions')
}

/**
 * 平台指针三写（单一数据源，runCommand scan 与 cmdInit 平台模式共用）。
 *
 * 写三处：
 *   1. <specRoot>/.runtime/platform-scan.json — 主持久化文件（后续 run/--done 恢复）
 *   2. <cwd>/.sillyspec-platform.json — 轻量恢复指针（供裸调——不带 --spec-root——找回 specDir）
 *   3. <cwd>/.sillyspec-platform-managed — 平台接管声明（无过期，独立于指针生命周期；
 *      指针被 cleanup/STALE 清理后它仍在，resolvePlatformSpecDir/runCommand 恢复链靠它
 *      fail-closed 防静默落本地库。唯一删除路径 = platform disconnect）
 *
 * status 字段语义（POINTER_STATUS）：
 *   - init 落盘时传 status: 'active'（已接入未 scan，24h STALE 清理不作用于它）
 *   - scan 完成时 complete-handlers 升级为 'scan_completed'
 *   - 不传 status 则省略（与 runCommand 历史行为一致）
 *
 * 写失败静默（不阻断主流程），返回 true/false 供调用方决定是否提示。
 *
 * @param {string} cwd - 恢复指针落盘目录（= 调用方命令的 cwd，通常为项目根）
 * @param {object} platformOpts - { specRoot, runtimeRoot?, workspaceId?, scanRunId? }
 * @param {object} [extra] - 追加字段（如 { status: 'active' }，只进指针/主文件不进声明）
 * @returns {boolean} 是否全部写入成功
 */
export const PLATFORM_MANAGED_FILENAME = '.sillyspec-platform-managed'

export function writePlatformPointer(cwd, platformOpts, extra = {}) {
  if (!platformOpts || (!platformOpts.specRoot && !platformOpts.runtimeRoot)) return false
  // HUB-05：合并保留既有生命周期字段。scan 完成时指针被写入 status/completedAt/scanStatus
  //（complete-handlers），但下一次任何平台模式 run（含只读 --status）都会重写指针——
  // 恢复链只回填 specRoot 等四字段，不保留 status → 指针永远回 active、isPointerStale
  // 恒 false、`platform pointer --cleanup` 的 STALE 分支不可达。extra 显式传值仍可覆盖。
  let preserved = {}
  try {
    const existing = JSON.parse(readFileSync(join(cwd, '.sillyspec-platform.json'), 'utf8'))
    if (existing && typeof existing === 'object') {
      for (const k of ['status', 'completedAt', 'scanStatus']) {
        if (existing[k] !== undefined && extra[k] === undefined) preserved[k] = existing[k]
      }
    }
  } catch { /* 无既有指针/损坏 → 全新写入 */ }
  const payload = {
    specRoot: platformOpts.specRoot || null,
    runtimeRoot: platformOpts.runtimeRoot || null,
    workspaceId: platformOpts.workspaceId || null,
    scanRunId: platformOpts.scanRunId || null,
    savedAt: new Date().toISOString(),
    ...preserved,
    ...extra,
  }
  // 声明文件字段集独立于指针 payload（D-E@v2 四字段：无 status/savedAt/scanRunId——
  // 声明语义是"项目归平台管"这一持久事实，非 scan 会话状态）
  const declaration = {
    managed: true,
    specRoot: platformOpts.specRoot || null,
    workspaceId: platformOpts.workspaceId || null,
    declaredAt: new Date().toISOString(),
  }
  try {
    mkdirSync(join(platformOpts.specRoot, '.runtime'), { recursive: true })
    writeFileSync(join(platformOpts.specRoot, '.runtime', 'platform-scan.json'), JSON.stringify(payload, null, 2) + '\n')
    writeFileSync(join(cwd, '.sillyspec-platform.json'), JSON.stringify(payload, null, 2) + '\n')
    writeFileSync(join(cwd, PLATFORM_MANAGED_FILENAME), JSON.stringify(declaration, null, 2) + '\n')
    return true
  } catch {
    return false
  }
}

/**
 * 读平台接管声明（读侧宽容：任何异常情况返回 null = 视同无声明，不抛错）。
 * 供 resolvePlatformSpecDir / runCommand 恢复链 / doctor 诊断三处消费。
 *
 * @param {string} cwd - 项目根（声明查找目录）
 * @returns {{managed:true, specRoot, workspaceId, declaredAt}|null}
 *   文件不存在 / JSON 损坏 / managed 非 true → null
 */
export function checkPlatformManaged(cwd) {
  const p = join(resolve(cwd), PLATFORM_MANAGED_FILENAME)
  if (!existsSync(p)) return null
  try {
    const decl = JSON.parse(readFileSync(p, 'utf8'))
    if (!decl || decl.managed !== true) return null
    return {
      managed: true,
      specRoot: decl.specRoot || null,
      workspaceId: decl.workspaceId || null,
      declaredAt: decl.declaredAt || null,
    }
  } catch {
    return null
  }
}

/**
 * 统一查找变更目录（与 progress.js 的变更检测逻辑一致）。
 */
export function resolveChangeDir(cwd, progress, specDir = null) {
  const changesDir = join(specDir || resolveSpecDir(cwd), 'changes')
  if (!existsSync(changesDir)) return null

  // 1. 优先用 currentChange
  if (progress.currentChange) {
    const target = join(changesDir, progress.currentChange)
    if (existsSync(target)) return target
  }

  // 2. fallback：唯一非 archive 目录
  const entries = readdirSync(changesDir, { withFileTypes: true })
    .filter(e => e.isDirectory() && e.name !== 'archive')
  if (entries.length === 1) return join(changesDir, entries[0].name)

  return null
}

/**
 * 触发 sync（平台模式走自己的链路，跳过；否则 await import sync.js）。
 */
// sync 总超时熔断：sync.js 是 best-effort 后台回传（每请求已有 10s 超时），但 sync() 可能串行多次
// fetchJson 累积等待、阻塞 --done。给 8s 总超时，超时放弃（best-effort，失败不影响正确性，下次 --done 重试）。
// 历史痛点：--done 在 sync 慢时体感 hang，用户被迫用外部 timeout 兜底。
const SYNC_TOTAL_TIMEOUT_MS = 8_000

// quick 会话 ID 形态（quick-<hex8>）。与 run/command.js QUICK_SID_RE、progress.js
// initChange 的跳过实体目录判断同源；shared.js 不反向 import command.js（重模块），
// 局部复制正则保持轻载——改形态时三处同改。
const QUICK_SID_RE = /^quick-[0-9a-f]{8}$/

export async function triggerSync(cwd, changeName, platformOpts = {}) {
  // 平台模式（SillyHub）走自己的回传链路，不走 CLI 内置 sync
  if (platformOpts?.specRoot || platformOpts?.runtimeRoot) return
  try {
    if (changeName && !existsSync(join(cwd, '.sillyspec', 'changes', changeName))) {
      // ql-20260818-011：quick 会话按设计无实体变更目录（progress.js initChange 同款
      // 跳过建目录），progress/四件套上行对它是孤儿数据；但 spec 树增量（QUICKLOG/
      // 模块文档的上行通道）以服务器清单为锚，与变更目录无关——降级只推 spec 树。
      // 其余形态（真实变更名拼错）维持静默 return，防噪音混入 spec 树通道。
      if (QUICK_SID_RE.test(changeName)) {
        // shared.js 在 src/run/，sync.js 在 src/ → 退一层
        const syncMod = await import('../sync.js')
        let timer
        try {
          await Promise.race([
            syncMod.syncSpecTreeOnly(changeName, cwd),
            new Promise((resolve) => { timer = setTimeout(resolve, SYNC_TOTAL_TIMEOUT_MS) }),
          ])
        } finally {
          clearTimeout(timer)
        }
      }
      return
    }
    // shared.js 在 src/run/，sync.js 在 src/ → 退一层
    const syncMod = await import('../sync.js')
    let timer
    try {
      await Promise.race([
        syncMod.sync(changeName, cwd),
        new Promise((resolve) => { timer = setTimeout(resolve, SYNC_TOTAL_TIMEOUT_MS) }),
      ])
    } finally {
      clearTimeout(timer) // sync 先完成则清掉未触发的 timer，避免泄漏
    }
  } catch (e) {
    // sync.js 不存在或同步失败，静默跳过
    console.warn('⚠️ 同步失败:', e.message)
  }
}

/**
 * 自动 pull 节流（体检 PERF-02）：triggerPull/triggerPullActiveChange 在每条 stage 命令
 * 启动时注入，agent 命令往往是秒级连发——每次都发 HTTP GET（daemon 挂/慢时单命令最多
 * 阻塞 8s）。跨进程 marker 节流：10s 内已有自动 pull 则跳过（手动 `platform pull` 不走
 * 此门，语义不变）。错过窗口的平台更新由下一条 >10s 的命令或 push 409 自愈兜底。
 */
const AUTO_PULL_THROTTLE_MS = 10_000

function _autoPullThrottlePath(cwd) {
  return join(cwd, '.sillyspec', '.runtime', 'auto-pull-throttle.json')
}

function _autoPullRecently(cwd) {
  try {
    const t = JSON.parse(readFileSync(_autoPullThrottlePath(cwd), 'utf8'))
    return typeof t.at === 'number' && Date.now() - t.at < AUTO_PULL_THROTTLE_MS
  } catch {
    return false
  }
}

function _stampAutoPull(cwd) {
  try {
    mkdirSync(dirname(_autoPullThrottlePath(cwd)), { recursive: true })
    writeFileSync(_autoPullThrottlePath(cwd), JSON.stringify({ at: Date.now() }) + '\n', 'utf8')
  } catch { /* best-effort：节流失效仅退化为逐次 pull */ }
}

/**
 * 触发 pull（下行同步，task-10 / D-009 / FR-04 / FR-06）。
 * 复用 triggerSync 的 8s 熔断与 Best Effort 语义；未连接平台静默跳过（与现状一致）。
 * 注入时机：stage 命令启动（顶层别名 + case 'run'，ql-20260818-008 补齐后者）+ 关键决策点
 * （approve 前）+ 手动 platform pull。不在每步 pull（避免高频写入与网络压力），仅低频边界点。
 * 自动注入走 skipIfLocalDirty 保守守卫：本地有未同步改动时 pull 内部跳过 import，
 * 防「本地领先」被平台旧快照覆盖（手动 platform pull 不受影响）。
 * @param {string} cwd
 * @param {string} changeName - 当前活跃变更（多变更时传 null 跳过，避免误拉）
 * @param {object} [platformOpts] - 平台模式 opts（specRoot/runtimeRoot 存在则跳过，走平台自有链路）
 */
export async function triggerPull(cwd, changeName, platformOpts = {}) {
  // 平台模式（SillyHub）走自己的链路，跳过
  if (platformOpts?.specRoot || platformOpts?.runtimeRoot) return
  try {
    const syncMod = await import('../sync.js')
    const sm = new syncMod.SyncManager(cwd)
    // 未连接平台静默跳过（本地独立用户合法状态，不噪音）——节流 stamp 必须在此之后：
    // 否则未连接的项目每次 run 都写 .sillyspec/.runtime/ 标记（凭空造目录）
    if (!sm._getPlatform()) return
    if (_autoPullRecently(cwd)) return
    _stampAutoPull(cwd)
    let timer
    try {
      await Promise.race([
        sm.pull(changeName, { skipIfLocalDirty: true }),
        new Promise((resolve) => { timer = setTimeout(resolve, SYNC_TOTAL_TIMEOUT_MS) }),
      ])
    } finally {
      clearTimeout(timer)
    }
  } catch (e) {
    // pull 失败静默跳过（Best Effort，失败不影响正确性）
    console.warn('⚠️ 拉取失败:', e.message)
  }
}

/**
 * triggerPull 的便捷封装：未显式传 changeName 时自动推导单活跃变更（task-10）。
 * 多活跃 / 无活跃变更时跳过（无法确定目标，避免误拉）；其余语义同 triggerPull。
 * 供 index.js 在 stage 命令（run/--done/archive）与 approve 决策点注入一行调用。
 */
export async function triggerPullActiveChange(cwd, platformOpts = {}) {
  if (platformOpts?.specRoot || platformOpts?.runtimeRoot) return
  // 先检查是否连接平台：未连接直接 return，避免 _ensureDB 在无 local.yaml 的 cwd 创建空 DB 污染
  let sm = null
  try {
    const syncMod = await import('../sync.js')
    sm = new syncMod.SyncManager(cwd)
    if (!sm._getPlatform()) return
  } catch {
    return
  }
  // PERF-02 节流（连接确认后才 stamp——未连接项目不得凭空写 .sillyspec/.runtime/）：
  // 与 triggerPull 共用同一 marker（本函数与它在同一命令启动链上互斥出现）
  if (_autoPullRecently(cwd)) return
  _stampAutoPull(cwd)
  let cn = null
  try {
    const { ProgressManager } = await import('../progress.js')
    const pm = new ProgressManager({})
    const changes = pm.listChanges(cwd)
    if (changes.length === 1) cn = changes[0]
  } catch {
    // progress 不可达则跳过（Best Effort）
  }
  if (!cn) return
  // 已确认连接 + 单活跃变更，调 pull（复用 triggerPull 的 8s 熔断；skipIfLocalDirty 保守守卫
  // 同 triggerPull——本地脏时跳过 import，防平台旧快照覆盖本地领先进度，ql-20260818-008）
  try {
    let timer
    try {
      await Promise.race([
        sm.pull(cn, { skipIfLocalDirty: true }),
        new Promise((resolve) => { timer = setTimeout(resolve, SYNC_TOTAL_TIMEOUT_MS) }),
      ])
    } finally {
      clearTimeout(timer)
    }
  } catch (e) {
    console.warn('⚠️ 拉取失败:', e.message)
  }
}

/**
 * 审批检查：execute 阶段启动前检查（W6 Step8a 从 run.js 搬入，runStage + runAutoMode 共用）。
 * 平台模式走自己的链路，跳过；否则 await import sync.js。
 * @returns {{ status: string, reason?: string } | null}
 */
export async function checkApproval(cwd, changeName, platformOpts = {}) {
  // 平台模式不需要 CLI 内置审批检查
  if (platformOpts?.specRoot || platformOpts?.runtimeRoot) return null
  try {
    // shared.js 在 src/run/，sync.js 在 src/ → 退一层
    const syncMod = await import('../sync.js')
    return await syncMod.checkApproval(changeName, cwd)
  } catch (e) {
    return null
  }
}

/**
 * 解析 git status --porcelain 单行 → 文件路径（去引号/处理 rename/归一化）。
 * 注意：line.slice(3) —— porcelain 行前 2 字符是状态码 + 1 空格，路径从 index 3 开始。
 */
export function parsePorcelainPath(line) {
  if (!line) return ''
  let path = line.slice(3).trim()
  if (path.length >= 2 && path.startsWith('"') && path.endsWith('"')) {
    path = path.slice(1, -1).replace(/\\(.)/g, (_, c) => c)
  }
  const arrow = path.indexOf(' -> ')
  if (arrow !== -1) path = path.slice(arrow + 4)
  return path.replace(/\\/g, '/')
}

/**
 * quick 自身写入的 .sillyspec/ 元数据判定（auditQuickCompletion 审计 与 QUICKLOG「文件：」行回填
 * 单源）。回填文件行时复用：review.changedFiles 含这些元数据时过滤掉，只留真实业务文件。
 *
 * 归类口径：
 * - quicklog/.runtime/modules/_module-map/knowledge-uncategorized 等 quick 自身产物 → 元数据
 * - .sillyspec/changes/：quick 自己没有该目录，其下文件要么是关联变更（reverse-sync），
 *   要么是并发他者会话的工作。非关联变更目录整体视为元数据放行；关联变更文件不算（属本 quick 真实改动）
 *
 * 「并发工作 vs 偷建变更」的意图软判定留给 sillyhub，确定性校验只做路径归类。
 *
 * @param {string} p 文件路径（容错 \\ / 混用）
 * @param {string[]} [linkedChanges] 关联变更名列表（影响 changes/ 归类）
 * @returns {boolean} true=quick 元数据，应从业务文件列表过滤掉
 */
export function isQuickMetadata(p, linkedChanges = []) {
  const normalizeGitPath = (x) => String(x).replace(/\\/g, '/')
  const file = normalizeGitPath(p)
  if (file.startsWith('.sillyspec/quicklog/')
    || file.startsWith('.sillyspec/.runtime/')
    || file === '.sillyspec/knowledge/uncategorized.md'
    || (/^\.sillyspec\/docs\/[^/]+\/modules\/[^/]+\.md$/.test(file))
    || (/^\.sillyspec\/docs\/[^/]+\/modules\/_module-map\.yaml$/.test(file))) return true
  if (file.startsWith('.sillyspec/changes/')) {
    const linkedChangeNames = new Set((Array.isArray(linkedChanges) ? linkedChanges : []).map(c => normalizeGitPath(c)))
    const m = file.match(/^\.sillyspec\/changes\/([^/]+)(\/|$)/)
    // bare 折叠 token（git 把全新未跟踪 changes/ 折叠成 `changes/`）或具体但非关联的变更 → 放行
    if (!m || !linkedChangeNames.has(m[1])) return true
  }
  return false
}

/**
 * quick 完成审计：对比 baseline 与实际变更。
 * @returns {{ status: 'safe'|'warning'|'blocked', reasons: string[], changedFiles: string[], newFiles: string[], deletedFiles: string[], baselineHit: string[], stagedTotal: number, attributedFiles: string[], undeclaredFiles: string[] }}
 */
/**
 * D-8 O-1 模块归属（2026-08-15 docs-signals-o12）：quick 欠账 hint 从"改了 N 文件"升级为
 * "涉及哪些模块卡"。只做归属（matchFilesToModules 纯函数零 git），不算 behind——对账是
 * execute Wave [docs-debt] 的职责（design D-001 轻量边界）。map 缺失/解析空/异常 → 空数组
 * 降级（hint 仍打，modules 省略），不报错不阻断。
 * 动态 import docs-debt.js/modules.js：prompt.js 已静态 import shared（本模块），静态互引成 ESM 环。
 */
async function matchQuickModules(srcChanged, specBase, projectName) {
  if (!specBase || !projectName || srcChanged.length === 0) return []
  try {
    const { join } = await import('node:path')
    const { existsSync: ex, readFileSync: rf } = await import('node:fs')
    const mapPath = join(specBase, 'docs', projectName, 'modules', '_module-map.yaml')
    if (!ex(mapPath)) return []
    const { parseModuleMapSimple } = await import('../modules.js')
    const idx = parseModuleMapSimple(rf(mapPath, 'utf8'))
    if (!idx || Object.keys(idx).length === 0) return []
    const { matchFilesToModules } = await import('../docs-debt.js')
    const cardsDir = join(specBase, 'docs', projectName, 'modules')
    const { byModule } = matchFilesToModules(srcChanged, idx, { cardsDir })
    return [...byModule.entries()].map(([id, e]) => ({ id, doc: e.doc }))
  } catch {
    return []
  }
}

// ── task-03（2026-08-16-state-split-fixes）: 活文档漂移提示辅助 ──
// 背景：platform-interface-map.md 等活文档持续维护 src 主入口的 file:line 映射；并行会话改
// src/ 后引用行号静默失效，docs gate 只能事后拦到别人的流程上。审计（auditQuickCompletion）
// 当场检测「本次改动的 src 文件是否被活文档引用」并提示（advisory 不阻断，docs gate 语义不变）。

/** 缺省活文档：src 主入口 ↔ 文档接口映射（file:line 锚点密度最高的持续维护文档）。 */
export const DEFAULT_LIVING_DOC = 'docs/sillyspec/platform-interface-map.md'

/**
 * 解析活文档集合：local.yaml `docs-check.living-docs` 列表【只追加不覆盖】缺省集合。
 * 与 docs-check.paths 的覆盖语义刻意不同——paths 是扫描范围（配了即整体替换缺省），
 * living-docs 是监控点登记（配了是加哨兵，不该把缺省监控点挤掉）。读配置走本模块现成的
 * readLocalYamlRaw + js-yaml 动态 import（readDocsCheckConfig 不回 living-docs 键；动态
 * import 与上方 docs-check 的隔离约定一致）；坏 YAML / 非数组 / 读失败 → 仅缺省。
 * @param {string} cwd 仓库根（local.yaml 在 <cwd>/.sillyspec/local.yaml）
 * @returns {Promise<string[]>} 去重后的活文档相对路径（仓库根相对 POSIX）
 */
export async function resolveLivingDocs(cwd) {
  let configured = []
  const raw = readLocalYamlRaw(cwd)
  if (raw) {
    try {
      const mod = await import('js-yaml')
      const yamlLoad = mod.load || mod.default?.load
      const doc = yamlLoad(raw)
      const dc = doc && typeof doc === 'object' ? doc['docs-check'] : null
      const ld = dc && typeof dc === 'object' ? dc['living-docs'] : null
      if (Array.isArray(ld)) configured = ld.filter((s) => typeof s === 'string' && s.trim() !== '')
    } catch { /* 坏 YAML → 忽略配置，仅缺省 */ }
  }
  return [...new Set([DEFAULT_LIVING_DOC, ...configured])]
}

/**
 * 纯函数：活文档引用的源码文件与本次改动的 src/ 文件求交。
 * 匹配口径对齐 docs-check resolveCandidates 的三形态（纯路径比对，不查盘）：
 *   ①仓库根相对：changed === ref（如 src/a.js）
 *   ②src 内部相对：changed === 'src/' + ref（如 run/b.js → src/run/b.js）
 *   ③裸名/中缀后缀：changed.endsWith('/' + ref)（如 b.js；前导斜杠防 aa.js 被引用 a.js 误吃）
 * changedFiles 口径 = git status porcelain 归一后的仓库根相对 POSIX 路径（parsePorcelainPath 产物）。
 * 同名多文件时后缀形态可能多报——与 docs-check 多候选宽容同向，advisory 仅提示可接受。
 * @param {string[]} srcChangedFiles changedFiles 中 src/ 前缀的文件
 * @param {Array<{file: string}>} refs collectDocRefs(md) 产物（只用 .file）
 * @returns {string[]} 命中的 srcChangedFiles 子集（去重保序）
 */
export function matchLivingDocRefs(srcChangedFiles, refs) {
  const hit = new Set()
  for (const c of srcChangedFiles) {
    if (refs.some((r) => r && typeof r.file === 'string' &&
      (c === r.file || c === 'src/' + r.file || c.endsWith('/' + r.file)))) {
      hit.add(c)
    }
  }
  return [...hit]
}

/**
 * 纯函数：docs check invalid 条目与本次改动 src 文件求交（2026-08-18 漂移提示精度对齐）。
 * runDocsCheck 的 invalid 只带 ref 全串（`path:line(-end)`）——剥尾部行号段还原引用文件，
 * 再按 matchLivingDocRefs 同款三形态匹配（仓库根相对 / src 内部相对 / 裸名后缀）。
 * ref 空串（文档不存在条目）不匹配。
 * @param {Array<{ref?: string, doc?: string, docLine?: number, reason?: string}>} invalidRefs runDocsCheck().invalid
 * @param {string[]} srcChangedFiles changedFiles 中 src/ 前缀的文件
 * @returns {Array<{changed: string, doc: string, docLine: number, ref: string, reason: string}>} 真失效且指向本次改动文件的引用
 */
export function matchInvalidRefsToChanged(invalidRefs, srcChangedFiles) {
  const out = []
  for (const x of Array.isArray(invalidRefs) ? invalidRefs : []) {
    if (!x || typeof x.ref !== 'string' || x.ref === '') continue
    const refFile = x.ref.replace(/:\d+(-\d+)?$/, '')
    const changed = srcChangedFiles.find((c) => c === refFile || c === 'src/' + refFile || c.endsWith('/' + refFile))
    if (changed) out.push({ changed, doc: x.doc || '', docLine: x.docLine || 0, ref: x.ref, reason: x.reason || '' })
  }
  return out
}

export async function auditQuickCompletion(cwd, guard, options = {}) {
  const { baselineFiles, allowedFiles = [], allowNew = false, forceBaseline = false, allowDelete = false, specBase = null, projectName = null } = guard
  const { isConfirm } = options
  // stagedTotal：当前所有非 quick 元数据的未提交条目（含前序 baseline 残留）。
  // 与 changedFiles（扣 baseline 后的本轮新增）区分，供审计文案同时展示「本轮新增 vs 累计暂存」，
  // 避免叠加 quick 会话时把前序会话未提交文件误读为「本会话只动了 N 个」。
  const result = { status: 'safe', reasons: [], changedFiles: [], newFiles: [], deletedFiles: [], baselineHit: [], stagedTotal: 0, attributedFiles: [], undeclaredFiles: [] }

  try {
    // safeGit 带 -c safe.directory，避免 linked worktree/容器异 uid/挂载点下裸 `git status` 抛错被
    // 外层 catch 吞成 warning（multi-agent-review Q3）。safeGit 返回 {value,error} 不抛；若仍有 error
    // 说明真读不到 git 状态，保守阻断（审计无锚点不能放行），不静默降级。
    // trim:false 必传：porcelain 首行前导空格是状态码一部分，trim 会削掉致 parsePorcelainPath 丢首字符。
    // timeout 15000 + retryOnTimeout：机器忙时 git 子进程启动慢，默认 5s 偏紧易瞬时超时（ETIMEDOUT），
    // 审计锚点失败即 blocked 中断 quick。加大到 15s 并对 ETIMEDOUT 重试一次（重试 30s），消化绝大多数
    // 瞬时抖动，免去用户手工重跑（实测反馈：审计 git 偶发 ETIMEDOUT，重试即过）。
    const statusResult = safeGit(cwd, ['status', '--porcelain'], { trim: false, timeout: 15000, retryOnTimeout: true })
    if (statusResult.error) {
      result.reasons.push(`审计失败（git status）: ${statusResult.error}`)
      result.status = 'blocked'
      return result
    }
    const gitStatus = statusResult.value || ''
    // 不对整段 .trim()：会削首行前导空格致首文件路径丢首字符（见 parsePorcelainPath 注释）。
    const currentEntries = gitStatus.split('\n').filter(Boolean)

    const normalizeGitPath = (p) => p.replace(/\\/g, '/')
    // step1 启动时记录的全量脏文件 = 预存改动（非本次 quick 产生）。审计必须排除它们，
    // 否则脏工作区下预存文件持续留在 git status → 命中 baselineFiles → 误判「覆盖 baseline」
    // → 永远 blocked（--force-baseline 也救不回来，因为 status 判定看 baselineHit 数组）。
    // 前缀匹配：baseline 录入时未跟踪目录会被 git 折叠成 `dir/`（带尾斜杠）token，审计时若该
    // 目录下文件被跟踪则展开成文件级 `dir/file`——精确匹配对不上，故尾斜杠 token 按目录前缀放行。
    const normBaseline = (baselineFiles || []).map(f => normalizeGitPath(f))
    const baselineExact = new Set(normBaseline.filter(f => !f.endsWith('/')))
    const baselineDirs = normBaseline.filter(f => f.endsWith('/'))
    const isBaselineFile = (p) => {
      const f = normalizeGitPath(p)
      return baselineExact.has(f) || baselineDirs.some(d => f.startsWith(d))
    }
    const DANGEROUS_PATTERNS = [
      'package.json',
      'package-lock.json',
      'yarn.lock',
      'pnpm-lock.yaml',
      '.eslintrc',
      'tsconfig.json',
      // SillySpec 核心流程代码。W6 重构后 src/run.js（23 行 barrel）/ src/progress.js（facade）
      // 把真正逻辑下沉到 src/run/、src/progress/ 子目录——旧的精确文件名匹配
      // （file === 'src/run.js'）命中不到 src/run/command.js（. 与 / 不可混同），致危险文件门
      // 静默失效。改用「目录前缀（带尾斜杠，startsWith 不会误伤 src/runtime-* 等同名前缀）+
      // barrel/facade 本体精确名」双重覆盖。重构 src/ 模块时须同步本清单（multi-agent-review Q5）。
      'src/run.js',
      'src/run/',
      'src/progress.js',
      'src/progress/',
      'src/db.js',
      'src/stage-contract.js',
      'src/stage-contract-spec.js',
      'src/worktree.js',
      'src/worktree-apply.js',
      'src/hooks/',
    ]

    for (const entry of currentEntries) {
      // porcelain 两字符状态码（X=暂存区 Y=工作区）不能先 trim：' D'.trim()==='D' 使第二分支恒假、
      // 'DD'/'AD' 等 trim 后不等于 'D' 而漏检——--allow-delete 门对此类删除静默放行（体检 BUG-04）。
      // 用原始两字符判定任一侧为 D 即删除。
      const rawStatus = entry.slice(0, 2)
      const status = rawStatus.trim()
      const file = parsePorcelainPath(entry)   // 已去引号/处理 rename/归一化，修正首行丢首字符
      if (!file) continue

      // 累计暂存计数：所有非 quick 元数据的未提交条目（含下方将被 baseline 跳过的前序残留）。
      // 放在 isBaselineFile 跳过之前，确保 baseline 内文件也计入「累计暂存」。
      if (!isQuickMetadata(file, guard.linkedChanges)) result.stagedTotal++

      // 预存脏文件：step1 baseline 已记录，非本次 quick 产生，跳过审计（含折叠目录前缀匹配）
      if (isBaselineFile(file)) continue

      result.changedFiles.push(file)
      if (rawStatus[0] === 'D' || rawStatus[1] === 'D') result.deletedFiles.push(file)
      if (status === '??') result.newFiles.push(file)

      // 检查是否命中 baseline protected files
      if (baselineFiles.includes(file)) {
        result.baselineHit.push(file)
      }

      // 检查危险文件（除非 force-baseline）
      if (file.startsWith('.sillyspec/') && !isQuickMetadata(file, guard.linkedChanges) && !forceBaseline) {
        result.reasons.push(`危险文件变更: ${file}`)
      }

      if (DANGEROUS_PATTERNS.some(p => file === p || file.startsWith(p)) && !forceBaseline) {
        result.reasons.push(`危险文件变更: ${file}`)
      }
    }

    // 检查 deleted files（--allow-delete 显式放行：删除是破坏性操作，默认 fail-closed，flag 即知情 opt-in）
    if (!allowDelete) {
      for (const f of result.deletedFiles) {
        result.reasons.push(`删除文件: ${f}`)
      }
    }

    // 检查 baseline hit（除非 force-baseline）
    if (!forceBaseline) {
      for (const f of result.baselineHit) {
        result.reasons.push(`覆盖 baseline 文件: ${f}`)
      }
    }

    // 检查 new files（除非 allow-new）
    if (!allowNew) {
      for (const f of result.newFiles) {
        if (!isQuickMetadata(f, guard.linkedChanges)) {
          result.reasons.push(`新增文件（需 --allow-new）: ${f}`)
        }
      }
    }

    // 检查 allowedFiles 范围
    if (allowedFiles.length > 0) {
      for (const f of result.changedFiles) {
        if (!allowedFiles.includes(f) && !isQuickMetadata(f, guard.linkedChanges)) {
          result.reasons.push(`超出 allowedFiles: ${f}`)
        }
      }
    }

    // 判定结果（force-baseline 降级 baselineHit → 非 blocked；allow-new 降级新增文件 → 非 warning；
    // allow-delete 降级删除文件 → 非 blocked。reasons 文案本就受 flag 控制，但原判定直接看数组长度，
    // 致 flag 对 status 失效。）
    if ((!forceBaseline && result.baselineHit.length > 0) || (!allowDelete && result.deletedFiles.length > 0) || result.reasons.some(r => r.startsWith('危险') || r.startsWith('删除'))) {
      result.status = 'blocked'
    } else if ((!allowNew && result.newFiles.length > 0) || (allowedFiles.length > 0 && result.reasons.some(r => r.startsWith('超出')))) {
      result.status = 'warning'
    }

    // quicklog 存在性检查
    try {
      const quicklogDir = join(cwd, '.sillyspec', 'quicklog')
      if (existsSync(quicklogDir)) {
        const qlFiles = readdirSync(quicklogDir).filter(f => f.endsWith('.md'))
        if (qlFiles.length === 0) {
          result.reasons.push('quicklog 目录为空（无任务记录）')
          if (result.status === 'safe') result.status = 'warning'
        }
      } else {
        result.reasons.push('quicklog 目录不存在（agent 未创建任务记录）')
        if (result.status === 'safe') result.status = 'warning'
      }
    } catch {}

    // D-8 文档欠账显性化（advisory）：本次改动含源码文件但不含任何文档文件 → 打标记 warn。
    // quick 是低摩擦通道（不强制文档同步），但欠账要显性化——72% 流量 86% 不动文档是系统性欠账
    // 主通道（doc-consistency-debt D-8）。不阻断不改 status，只 warn + 记 reasons 供 QUICKLOG 追溯。
    const isDocFile = (f) =>
      f.endsWith('.md') || f.endsWith('.yaml') || f.endsWith('.yml') ||
      f.startsWith('docs/') || f.startsWith('.sillyspec/docs/')
    const srcChanged = result.changedFiles.filter(f => !isDocFile(f) && !isQuickMetadata(f, guard.linkedChanges))
    const docChanged = result.changedFiles.filter(isDocFile)
    if (srcChanged.length > 0 && docChanged.length === 0) {
      result.reasons.push(`本次未同步模块文档（${srcChanged.length} 个源码文件改动，无文档文件）`)
      result.docSyncHint = { touchedSource: srcChanged.length, docFiles: [], modules: await matchQuickModules(srcChanged, specBase, projectName) }
    } else if (srcChanged.length > 0 && docChanged.length > 0) {
      result.docSyncHint = { touchedSource: srcChanged.length, docFiles: docChanged }
    }

    // docs check advisory（doc-consistency-debt D-6 后续）：本次改动的 .md 文档跑 file:line
    // 引用校验，失效即 warn + reasons——检测能力落地后欠账只涨不跌的最后一公里。只查本次
    // changedFiles 的文档（归因到本次改动），不扫全仓历史欠账（那是存量问题，quick 不背锅）。
    // 排除删除文件（troubleshooting #9）：删除的 .md 不在盘，runDocsCheck 只会报「文档不存在」
    // 假失效——删除语义归 --allow-delete 管，无引用校验可言（并行会话的删除尤其不该归属本会话）。
    // docs-check 是 IO 面（walkGlob/existsSync），动态 import 隔离；任何异常 fail-open 只跳过。
    const deletedSet = new Set(result.deletedFiles)
    const mdChanged = result.changedFiles.filter((f) => f.endsWith('.md') && !deletedSet.has(f) && !isQuickMetadata(f, guard.linkedChanges))
    if (mdChanged.length > 0) {
      try {
        const { runDocsCheck, readDocsCheckConfig } = await import('../docs-check.js')
        // HUB-06：补传 crossRepoRoots（与 docs gate / index.js docs check 同口径）——
        // 否则 repo:// 跨仓引用在这条链路恒跳过；无 local.yaml 配置时 undefined = 不启用
        let quickCfg = {}
        try { quickCfg = readDocsCheckConfig(cwd) || {} } catch { quickCfg = {} }
        const dc = runDocsCheck({ projectRoot: cwd, docs: mdChanged, crossRepoRoots: quickCfg.crossRepoRoots })
        if (!dc.ok) {
          result.reasons.push(`本次改动文档含 ${dc.invalid.length} 处失效 file:line 引用（sillyspec docs check 可复现）`)
          result.docsCheckHint = { invalid: dc.invalid.length, total: dc.total }
          if (result.status === 'safe') result.status = 'warning'
        }
      } catch { /* docs-check 不可用（老版本包等）→ 静默跳过，不阻断 quick */ }
    }

    // task-03: 活文档漂移提示（advisory，不阻断不改 status，docs gate 语义不变）。
    // 方向与上方 docsCheckHint 相反：那是「本次改的文档引用失效吗」，这是「本次改的 src 被活文档
    // 引用吗」——并行会话改 src/ 主入口后 platform-interface-map.md 的 file:line 行号静默失效，
    // gate 事后拦到别人流程上。fail-open：活文档缺失/读失败/校验机器不可用 → 静默跳过（不误报不阻断）。
    // 2026-08-18 精度对齐：原路径级「被引用即提示」在行号锚未真断时误报（实测 advisory 报漂移、
    // docs check 417/417 全过）。升级为复用 runDocsCheck 分层真校验（存在 + 行界 + 关键词窗口），
    // 只报「真失效且指向本次改动文件」的引用；全过 → 零输出（与 docs check 结论同源）。
    // matchLivingDocRefs 留作廉价预过滤：该文档不引用任何本次改动文件时跳过整档真校验（省 IO）。
    const srcChangedFiles = result.changedFiles.filter((f) => f.startsWith('src/') && !deletedSet.has(f))
    if (srcChangedFiles.length > 0) {
      try {
        const { collectDocRefs, runDocsCheck, readDocsCheckConfig } = await import('../docs-check.js')
        // HUB-06：活文档（platform-interface-map.md 等最可能写 repo:// 引用的文档）同样补传
        // crossRepoRoots；配置读一次提到循环外（per-cwd 恒同）
        let livingCfg = {}
        try { livingCfg = readDocsCheckConfig(cwd) || {} } catch { livingCfg = {} }
        const livingDocs = await resolveLivingDocs(cwd)
        const files = []
        const docs = []
        const invalidAll = []
        for (const docRel of livingDocs) {
          let md
          try { md = readFileSync(join(cwd, docRel), 'utf8') } catch { continue } // 活文档缺失/读失败 → 跳过
          const hit = matchLivingDocRefs(srcChangedFiles, collectDocRefs(md))
          if (hit.length === 0) continue
          files.push(...hit)
          docs.push(docRel)
          const r = runDocsCheck({ projectRoot: cwd, docs: [docRel], keywordAssert: true, crossRepoRoots: livingCfg.crossRepoRoots })
          for (const x of r.invalid) invalidAll.push({ ...x, doc: docRel })
        }
        const invalid = matchInvalidRefsToChanged(invalidAll, srcChangedFiles)
        if (invalid.length > 0) {
          const uniqFiles = [...new Set(files)]
          result.docsCheckHint = { ...(result.docsCheckHint || {}), livingDocDrift: { files: uniqFiles, docs, total: srcChangedFiles.length, invalid } }
          result.reasons.push(`活文档引用真失效: ${invalid.length} 处指向本次改动文件的引用校验失败（${docs.join(', ')}）`)
        }
      } catch { /* 校验机器不可用 → 静默跳过 */ }
    }

    // task-02: 同文件并发检测——allowedFile 在 baseline（他者改过）且当前 hash ≠ step1 hash（我也改了）
    // → commit 整文件 pathspec 会夹带他者 hunk，warn 给分离指引（advisory，不阻断，D-002）
    // sameFileHits 提升到本层作用域：下方归属切分要把「baseline 声明文件且我也改了」并入
    // attributedFiles（这类文件先被 isBaselineFile 跳过不进 changedFiles，但确属本会话产物）。
    const sameFileHits = []
    if (allowedFiles.length > 0 && guard.allowedFilesHash) {
      for (const f of allowedFiles) {
        if (isBaselineFile(f) && guard.allowedFilesHash[f] !== undefined) {
          try {
            const cur = createHash('sha256').update(readFileSync(join(cwd, f))).digest('hex')
            if (cur !== guard.allowedFilesHash[f]) sameFileHits.push(f)
          } catch {} // 文件读失败（删除等）跳过
        }
      }
      if (sameFileHits.length > 0) {
        result.reasons.push(`同文件并发: ${sameFileHits.length} 个 allowedFile 含他者+你的改动（${sameFileHits.join(', ')}）`)
        console.warn(`\n⚠️ 同文件并发（${sameFileHits.length} 个 allowedFile 含他者改动+你的改动，commit 整文件会夹带他者 hunk）：`)
        for (const f of sameFileHits) {
          console.warn(`   - ${f}`)
          console.warn(`     分离：git add -p ${f}（交互选你的 hunk）或 git diff ${f} > mine.patch（编辑留你的）+ git apply --cached mine.patch`)
        }
      }
    }

    // 归属切分（2026-08-18 误归属修复，ql-20260818-003 实证）：窗口 diff（changedFiles）在多 agent
    // 并发仓库分不清「本会话改」与「他者窗口内改」，他者文件会污染 QUICKLOG「文件：」行。声明即归属：
    // allowedFiles 非空时 attributedFiles = 窗口∩声明 ∪ sameFileHits（同文件并发 = 我也改了），
    // undeclaredFiles = 窗口−声明（他者或漏声明，供「审计：」行落盘追溯——不静默丢，防漏声明时
    // 真实改动被挤走无痕）。未声明会话无归属信息不猜，维持全量口径（attributed = changed）。
    const declaredNorm = new Set(allowedFiles.map(f => normalizeGitPath(f)))
    if (declaredNorm.size > 0) {
      const own = result.changedFiles.filter(f => declaredNorm.has(normalizeGitPath(f)))
      for (const f of sameFileHits) if (!own.includes(f)) own.push(f)
      result.attributedFiles = own
      result.undeclaredFiles = result.changedFiles.filter(f => !declaredNorm.has(normalizeGitPath(f)))
    } else {
      result.attributedFiles = result.changedFiles
      result.undeclaredFiles = []
    }

    // --confirm 模式：展示 diff 并等待确认
    if (isConfirm && (result.status === 'warning' || result.status === 'blocked')) {
      console.log(`\n📋 quick 变更概览：`)
      console.log(`   新增: ${result.newFiles.length}, 修改: ${result.changedFiles.length - result.newFiles.length - result.deletedFiles.length}, 删除: ${result.deletedFiles.length}`)
      if (result.changedFiles.length > 0) {
        console.log(`\n   变更文件：`)
        for (const f of result.changedFiles) {
          const isBaseline = baselineFiles.includes(f)
          const isDangerous = DANGEROUS_PATTERNS.some(p => f.includes(p))
          const marker = isBaseline ? '🔴' : isDangerous ? '⚠️' : '  '
          console.log(`   ${marker} ${f}`)
        }
      }
      console.log(`\n   状态: ${result.status.toUpperCase()}`)
      if (result.reasons.length > 0) {
        console.log(`   原因:`)
        for (const r of result.reasons) {
          console.log(`     - ${r}`)
        }
      }
      if (result.deletedFiles.length > 0) {
        if (guard.allowDelete) {
          console.log(`\n   ℹ️ 已确认删除文件 ${result.deletedFiles.length} 个（--allow-delete 显式解锁）：${result.deletedFiles.join(', ')}`)
        } else {
          console.log(`\n   ⛔ 本次含删除文件 ${result.deletedFiles.length} 个——删除是破坏性操作默认 fail-closed，确认删除请带 --allow-delete 显式解锁：`)
          console.log(`     sillyspec run quick --done --allow-delete --change <id> --output "..."`)
          console.log(`     （--force-baseline / --allow-new 不能解锁删除；不确认请 git restore 撤回删除后再 --done，或走完整流程 execute 由 review 把关）`)
        }
      } else {
        console.log(`\n   如确认接受这些变更，重新运行 --done 时带上对应 flag 即可解锁：`)
        console.log(`     sillyspec run quick --done --force-baseline --allow-new --change <id> --output "..."`)
        console.log(`     （--force-baseline 覆盖受保护/危险文件如 src/run.js；--allow-new 允许新增文件；--allow-delete 允许删除文件）`)
        console.log(`   或在首个 sillyspec run quick 启动（step 1）时就声明这些 flag，持久化进 guard。`)
      }
    }
  } catch (e) {
    result.reasons.push(`审计失败: ${e.message}`)
    result.status = 'warning'
  }

  return result
}

// ── Step 处理辅助（W6 Step7a 从 run.js 搬入：getStageSteps/formatWaitOptions 被 run.js + complete.js 共用）──
/**
 * 格式化 waitOptions 为人类可读字符串
 */
export function formatWaitOptions(raw) {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed.join(', ')
    return raw
  } catch {
    return raw
  }
}


/**
 * 进程级 MultiRepoContext 缓存（D-013 G2：execute 启动构造一次，贯穿 execute/apply/verify 不重建）。
 *
 * key = `${cwd} ${changeName}`（cwd 隔离防多仓并发串扰；changeName 隔离防同进程多 change 切换串扰）。
 * 跨 CLI 命令（execute vs apply vs verify 各是独立进程）各自构造——design §7.2 G2 明确 apply/verify
 * 「复用 execute 实例，**或**从 review.json.repo + local.yaml repos 反推」，进程级缓存指同一 CLI 命令内复用。
 *
 * 失效语义：ctx 是纯内存对象（task-01 不持久化），进程结束自动释放。无需手动清理。
 * 缓存命中场景：execute 单次 --done 内 getStageSteps（派发）+ completeStageGates（gate）+ 阶段完成
 * 收尾多次取同一 ctx；apply/verify 同理。fail-closed 抛错不缓存（下次重试重新构造）。
 */
const _multiRepoCtxCache = new Map()

/**
 * 读 local.yaml 原始文本（best-effort，不存在/读失败返 ''）。
 * 与 sync.js readLocalYamlRaw 同风格，但本模块不引 sync.js（避免循环依赖 + sync.js 非 export）。
 * local.yaml 路径 = `<cwd>/.sillyspec/local.yaml`（与 sync.js/config-schema.js 一致）。
 * @param {string} cwd
 * @returns {string}
 */
function readLocalYamlRaw(cwd) {
  const p = join(cwd, '.sillyspec', 'local.yaml')
  if (!existsSync(p)) return ''
  try {
    return readFileSync(p, 'utf8')
  } catch {
    return ''
  }
}

/**
 * 从 plan.md 内容聚合所有 task 卡片声明的 repo:（去重，含 'main' 隐式）。
 *
 * design §5.4 execute 启动段 + §7.2：扫 plan.md 所有 task 卡片 frontmatter，用 parseRepo 解析
 * repo: 字段（缺省='main'），去重后返回数组。'main' 永远隐式在列（主仓 task 不写 repo: 也算主仓）。
 *
 * 聚合策略：plan.md 由 plan 阶段生成，task 卡片 frontmatter 形如 `---\nrepo: sillyspec\n...\n---`
 * （与 task-NN.md 同源）。本函数全局匹配所有 frontmatter 块（`/^---\n([\s\S]*?)\n---/mg`），
 * 每块重新拼成完整 frontmatter 喂 parseRepo（parseRepo 内部 `^---\n...\n---` 锚开头）。
 *
 * @param {string} planContent
 * @returns {string[]} 去重后的 repo 数组（至少含 'main'）
 */
export function aggregateDeclaredRepos(planContent) {
  const seen = new Set(['main']) // main 永远隐式
  if (!planContent) return ['main']
  // 全局匹配所有 frontmatter 块（m 标志让 ^ 匹配每行行首，但此处 ^--- 要求行首 ---，
  // 配合 [\s\S]*? 非贪婪到下一个 ---）。每块重新拼完整 frontmatter 喂 parseRepo。
  const fmRegex = /^---\r?\n([\s\S]*?)\r?\n---/gm
  let match
  while ((match = fmRegex.exec(planContent)) !== null) {
    const fmBody = match[1]
    // 重新拼成 parseRepo 期望的完整 frontmatter（---\n<body>\n---）
    const repo = parseRepo(`---\n${fmBody}\n---`)
    if (repo && !seen.has(repo)) seen.add(repo)
  }
  return Array.from(seen)
}

/**
 * 坑7 补扫：读 tasks/task-NN.md 独立卡片，拼成可被 aggregateDeclaredRepos 的 frontmatter
 * 正则识别的文本（每张卡内容原样拼接，卡内容自带的 ---\n…\n--- frontmatter 会被同一正则命中）。
 *
 * plan 阶段标准产出形态是 plan.md 内联卡片块 + tasks/ 独立卡片双写，但实际执行中 plan.md
 * 可能只留 checkbox 行（卡片全在 tasks/）——此时 plan.md 聚合不到跨仓 repo，跨仓 review
 * 误报伪造。本函数读 tasks/ 目录兜底，任一文件读失败跳过（fail-open，兜底源不引入新阻断）。
 *
 * @param {string} specDir - spec 根（change 目录的父级）
 * @param {string} changeName
 * @returns {string} 拼接文本（无 tasks/ 或全空 → ''，plan.md 原行为零回归）
 */
function collectTaskCardReposFallback(specDir, changeName) {
  const tasksDir = join(specDir, 'changes', changeName, 'tasks')
  if (!existsSync(tasksDir)) return ''
  let merged = ''
  for (const f of readdirSync(tasksDir)) {
    if (!/^task-\d+\.md$/i.test(f)) continue
    const p = join(tasksDir, f)
    // CRLF 卡片：\r?\n 容差在 aggregateDeclaredRepos 正则里，这里只管拼接不归一
    try {
      merged += '\n' + readFileSync(p, 'utf8') + '\n'
    } catch {
      // 单文件读失败跳过——兜底源缺失不该阻断主聚合
    }
  }
  return merged
}

/**
 * 构造或取进程级 MultiRepoContext 单例（D-013 G2）。
 *
 * design §5.4 execute 启动段 + §7.2 G2 + 决策 D-001/D-013：
 *   - 读 local.yaml repos: 段（parseRepoRegistry）→ repoRegistry Map（main 隐式不注册）
 *   - 扫 plan.md 所有 task 卡片 repo:（aggregateDeclaredRepos）→ declaredRepos（含 'main'）
 *   - 构造 MultiRepoContext（约束② fail-closed：未注册 repo / 跨仓 git 不可用抛错阻断）
 *   - 按 `${cwd} ${changeName}` 缓存，同进程同 change 复用
 *
 * **单仓退化**（design §7.2 「main 隐式为 cwd 不用注册」）：local.yaml 无 repos: 段 + 单仓 change
 * （declaredRepos=['main']）→ repoRegistry=空 Map，MultiRepoContext 退化为 {main:{...}} 单值 map，
 * hasCrossRepo()=false，所有 ctx 透传点缺省行为零回归（task-01/04/05/06/07/08 各模块 ctx=null 等价）。
 *
 * **跨仓 fail-closed**（约束② D-007）：declaredRepos 含 local.yaml 未注册的 repo key，或跨仓仓
 * git rev-parse 失败 → MultiRepoContext 构造抛错，本函数**不缓存**该错误，原样上抛阻断 execute 启动。
 *
 * 缓存语义：命中返回已构造实例；未命中且构造成功则缓存后返回；构造失败不缓存（下次重试重新构造）。
 *
 * @param {Object} opts
 * @param {string} opts.cwd - 主仓 cwd
 * @param {string} opts.changeName - 当前 change 名
 * @param {Object} [opts.platformOpts] - 平台选项（specRoot 等，透传给 MultiRepoContext 预留）
 * @param {boolean} [opts.noCache=false] - 跳过缓存（测试 / 显式重建场景）
 * @returns {MultiRepoContext|null} changeName/cwd 缺失或无 plan.md 时返回 null（单仓退化，调用方按 ctx=null 处理）
 * @throws {Error} MultiRepoContext 构造 fail-closed（约束②未注册/跨仓git不可用）
 */
export async function getOrCreateMultiRepoContext({ cwd, changeName, platformOpts = {}, noCache = false } = {}) {
  if (!cwd || !changeName) return null
  const cacheKey = `${cwd} ${changeName}`
  if (!noCache && _multiRepoCtxCache.has(cacheKey)) {
    return _multiRepoCtxCache.get(cacheKey)
  }

  // 读 plan.md（execute 启动入口的 change 目录），无 plan.md → 无法聚合 declaredRepos → 退化 null
  const specDir = platformOpts?.specRoot || resolveSpecDir(cwd)
  const planFile = join(specDir, 'changes', changeName, 'plan.md')
  let planContent = ''
  if (existsSync(planFile)) {
    try {
      planContent = readFileSync(planFile, 'utf8')
    } catch {
      planContent = ''
    }
  }
  if (!planContent) {
    // 无 plan.md（plan 未完成 / brainstorm 阶段 / quick 等场景）→ 无 task 卡片可扫，
    // 不构造 ctx（返 null 退化单仓）。跨仓 task 必须 plan.md 落地后才进 execute，此处安全。
    return null
  }

  // 聚合 declaredRepos（扫 plan.md task 卡片 repo:）+ 读 local.yaml repos: 段
  // 坑7 兼扫 tasks/task-NN.md：plan 阶段把卡片写到 tasks/、plan.md 只留 checkbox 行时，
  // plan.md 内联 frontmatter 聚合不到跨仓 repo → ctx 不含跨仓 entry → 跨仓 review 退回主仓
  // gitDir 校验，误报「base 不是真实 commit — 疑似伪造」（真实 commit 在跨仓仓可达）。
  // 两源并入同一聚合：plan.md 内联块（原行为，零回归）+ tasks/ 独立卡片（坑7 补扫）。
  const declaredRepos = aggregateDeclaredRepos(
    planContent + collectTaskCardReposFallback(specDir, changeName)
  )
  const repoRegistry = parseRepoRegistry(readLocalYamlRaw(cwd))

  // 构造 WorktreeManager（主仓 meta 读取；与 getStageSteps 同源范式）
  let worktreeManager
  try {
    const { WorktreeManager } = await import('../worktree.js')
    worktreeManager = new WorktreeManager({ cwd })
  } catch {
    // WorktreeManager 不可用 → 退化为最小桩（in-place-fallback 兜底 cwd）
    worktreeManager = { getMeta: () => null }
  }

  const ctx = new MultiRepoContext({
    cwd,
    changeName,
    platformOpts,
    declaredRepos,
    repoRegistry,
    worktreeManager,
  })

  if (!noCache) {
    _multiRepoCtxCache.set(cacheKey, ctx)
  }
  return ctx
}

/**
 * 清除进程级 MultiRepoContext 缓存（测试隔离用）。生产代码不需手动清。
 * @param {string} [cwd]
 * @param {string} [changeName]
 */
export function _clearMultiRepoCtxCache(cwd, changeName) {
  if (cwd && changeName) {
    _multiRepoCtxCache.delete(`${cwd} ${changeName}`)
  } else {
    _multiRepoCtxCache.clear()
  }
}


/**
 * 获取阶段的步骤定义（execute 需要动态构建）
 */
export async function getStageSteps(stageName, cwd, progress, specDir = null) {
  if (stageName === 'execute') {
    const changeDir = resolveChangeDir(cwd, progress, specDir)
    let planFile = null
    let worktreePath = null
    let changeName = null
    if (changeDir) {
      const p = join(changeDir, 'plan.md')
      if (existsSync(p)) planFile = p
      changeName = basename(changeDir)
      // 自动检测 worktree 路径，注入 Wave prompt 的 workdir 指令
      // 修复：之前未传 worktreePath 给 buildExecuteSteps，导致 Wave prompt 缺失工作目录指令，
      // 子代理可能把文件写到主工作区而非 worktree 内，破坏隔离。
      try {
        const { WorktreeManager } = await import('../worktree.js')
        const wm = new WorktreeManager({ cwd })
        const meta = wm.getMeta(changeName)
        if (meta?.worktreePath && existsSync(meta.worktreePath)) {
          worktreePath = meta.worktreePath
        }
      } catch {
        // 无 worktree meta 不阻断——可能是首次启动或 in-place 模式
      }
    }
    // W3 task-09：execute 启动入口构造 MultiRepoContext 单例（D-013 G2），贯穿 execute/apply/verify。
    // 单仓 change（无 repo: / 无 local.yaml repos 段）→ ctx=null 退化单仓零回归（task-08 buildExecuteSteps 缺省 null）。
    // 跨仓 change 缺注册 / 跨仓 git 不可用 → getOrCreateMultiRepoContext 抛错阻断 execute 启动（约束②）。
    let ctx = null
    if (changeName) {
      try {
        ctx = await getOrCreateMultiRepoContext({ cwd, changeName, platformOpts: specDir ? { specRoot: specDir } : {} })
      } catch (e) {
        // fail-closed 阻断：execute 启动期 ctx 构造失败（未注册 repo / 跨仓 git 不可用），
        // 抛错让上层 runCommand 把错误返回给 Agent（不降级单仓跑——跨仓 apply 走错仓=数据所有权事故）。
        throw new Error(`execute 启动失败：跨仓 MultiRepoContext 构造失败（${e.message}）`)
      }
    }
    return buildExecuteSteps(planFile, { worktreePath, ctx })
  }
  if (stageName === 'plan') {
    const changeDir = resolveChangeDir(cwd, progress, specDir)
    return buildPlanSteps(changeDir)
  }
  const def = stageRegistry[stageName]
  return def ? def.steps : null
}

