/**
 * 他者会话显式声明文件集（坑 verify-reconcile-foreign-wip，2026-08-23 实证：verify 实测
 * 对账在主仓共享工作区取 git diff，无 meta 回退时把并行会话在途 WIP 全量算进本变更——误
 * 命中他者模块跑他者测试 / 他者删除进本变更删除对账误报）。
 *
 * 归属口径与坑 35（quick 审计豁免，run/shared 的 collectOtherQuickSessionDeclarations）
 * 同款：只认**显式声明**——其他 quick 会话 guard.allowedFiles + 其他变更 design §6 清单；
 * 无主文件保留参与判定（fail-closed，不放松「未声明删除/越界」的抓取底线）。
 *
 * 独立零环模块：被 verify-postcheck / verify-probes / contract-matrix 共用（verify-
 * postcheck import contract-matrix，parity 侧不能反向 import verify-postcheck）。
 */
import { existsSync, readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { parseFileChangeListDetailed } from './change-list.js'
import { safeGit, unquoteGitPath } from './git-helper.js'
import { parseAllowedPaths, parseTargetFiles } from './stages/plan-postcheck.js'

/**
 * 主仓未提交文件集（staged + unstaged + untracked，rename 取新路径）。
 * 活性判定的事实源：他者声明的文件若已不在未提交集，说明其工作已 apply+commit（或从未发生），
 * 声明随之失效（坑 foreign-declared-stale-noise，2026-08-25 实证：并行会话 pathspec 重叠期
 * execute/verify 每轮重复刷「已排除 N 个并行会话声明的文件」，其中大量是对方早已 apply+commit
 * 的存量声明——design §6 清单与残留 quick guard 不随 commit 自动失效，纯噪音）。
 * @param {string} cwd 项目根
 * @returns {Set<string>|null} null = git 调用失败（调用方 fail-closed 不过滤）
 */
function getMainDirtySet(cwd) {
  const r = safeGit(cwd, ['status', '--porcelain', '--untracked-files=all'], { trim: false })
  if (r.value === null) return null
  const set = new Set()
  for (const line of r.value.split('\n')) {
    if (!line.trim()) continue
    let p = line.slice(3).trim()
    const arrow = p.lastIndexOf(' -> ')
    if (arrow !== -1) p = p.slice(arrow + 4)
    if (p.startsWith('"') && p.endsWith('"')) p = unquoteGitPath(p.slice(1, -1))
    p = p.replace(/\\/g, '/')
    if (p) set.add(p)
  }
  return set
}

/**
 * 变更 worktree 活性速查（.runtime/worktrees/<change>/meta.json）。
 * isolated=true：有存活隔离 worktree（meta 在、非 in-place、worktreePath 目录在）——
 * 其 WIP 在 worktree 内主仓 porcelain 不可见，整份 design 声明按在途处理。
 * @returns {Map<string, { isolated: boolean }>|null} null = 读取失败（fail-closed）
 */
function loadWorktreeLiveness(specBase) {
  const map = new Map()
  try {
    const dir = join(specBase, '.runtime', 'worktrees')
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (!e.isDirectory()) continue
      try {
        const meta = JSON.parse(readFileSync(join(dir, e.name, 'meta.json'), 'utf8'))
        const isolated = Boolean(meta && meta.mode !== 'in-place-fallback'
          && meta.worktreePath && existsSync(meta.worktreePath))
        map.set(meta.changeName || e.name, { isolated })
      } catch { /* 单条损坏跳过（该变更走主仓 dirty 判定） */ }
    }
  } catch { return null }
  return map
}

/**
 * 他者声明活性收敛：声明只在「工作仍在途」时有效，已 apply+commit 的存量声明自动失效。
 *   - quick 会话（主仓直接改）：文件仍在主仓未提交集才算在途
 *   - 变更：有存活隔离 worktree → 整份声明在途；否则与 quick 同口径看主仓未提交集
 * 判定所需事实读不出来（git/meta 失败）→ 一律保留（fail-closed，不放大放行面）。
 * @param {Map<string, string[]>} foreign collectForeignDeclaredFiles 的原始结果（原地收敛）
 */
function filterStaleForeignDeclarations(foreign, cwd, specBase) {
  if (foreign.size === 0) return
  const dirty = getMainDirtySet(cwd)
  const worktrees = loadWorktreeLiveness(specBase)
  if (dirty === null && worktrees === null) return // 两个事实源全失败 → 原样保留
  for (const [file, owners] of [...foreign.entries()]) {
    const live = owners.filter(owner => {
      if (!owner.startsWith('quick-')) {
        const wt = worktrees ? worktrees.get(owner) : undefined
        if (wt && wt.isolated) return true // 隔离 worktree 在途，声明整份有效
      }
      // quick 会话 / 无存活 worktree 的变更：看主仓未提交集；dirty 集不可用则保守保留
      return dirty === null ? true : dirty.has(file)
    })
    if (live.length === 0) foreign.delete(file)
    else if (live.length < owners.length) foreign.set(file, live)
  }
}

/**
 * @param {string} cwd 项目根
 * @param {string|null} currentChangeName 本变更名（quick 会话名或 change 名，排除自身）
 * @param {{ specBase?: string, runtimeRoot?: string }} [opts] 平台模式路径（A4 同族）：
 *   specBase 覆盖默认 join(cwd,'.sillyspec')（他者 design 清单 / quick 会话所在 spec 根），
 *   runtimeRoot 覆盖 quick-sessions 目录（平台模式 runtime 可与 specBase/.runtime 分离）。
 *   不传保持本地行为，零回归。
 * @returns {Map<string, string[]>} file → 声明者列表（quick-<hex> 或变更名）
 */
export function collectForeignDeclaredFiles(cwd, currentChangeName, opts = {}) {
  const foreign = new Map()
  const add = (file, owner) => {
    const f = String(file || '').replace(/\\/g, '/')
    if (!f) return
    if (!foreign.has(f)) foreign.set(f, [])
    if (!foreign.get(f).includes(owner)) foreign.get(f).push(owner)
  }
  const specBase = opts.specBase || join(cwd, '.sillyspec')
  const runtimeRoot = opts.runtimeRoot || join(specBase, '.runtime')
  try {
    // ① 其他 quick 会话的 --files 显式声明（guard.json）
    const sessionsDir = join(runtimeRoot, 'quick-sessions')
    let sessionDirs = []
    try { sessionDirs = readdirSync(sessionsDir, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name) } catch {}
    for (const sid of sessionDirs) {
      if (sid === currentChangeName) continue
      try {
        const guard = JSON.parse(readFileSync(join(sessionsDir, sid, 'guard.json'), 'utf8'))
        for (const f of Array.isArray(guard.allowedFiles) ? guard.allowedFiles : []) add(f, sid)
      } catch { /* 损坏/缺失跳过 */ }
    }
    // ② 其他变更的 design §6 清单（目录在即视为在途变更；archive/ 下不算）
    const changesDir = join(specBase, 'changes')
    let changeDirs = []
    try { changeDirs = readdirSync(changesDir, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name) } catch {}
    for (const cn of changeDirs) {
      if (cn === currentChangeName || cn === 'archive') continue
      const designPath = join(changesDir, cn, 'design.md')
      if (!existsSync(designPath)) continue
      try {
        for (const e of parseFileChangeListDetailed(designPath)) add(e.path, cn)
      } catch { /* 清单解析失败跳过该变更 */ }
    }
  } catch { /* 整体异常 → 空集（等价不过滤，回到原行为） */ }
  // 活性收敛（坑 foreign-declared-stale-noise）：已 apply+commit 的他者声明不再产生排除噪音
  try { filterStaleForeignDeclarations(foreign, cwd, specBase) } catch { /* 收敛失败 → 原样保留（fail-closed） */ }
  return foreign
}

/**
 * 本变更（currentChangeName）的 own 声明集——own 优先判据（坑
 * verify-reconcile-own-file-foreign-false-positive，2026-09-09 实证）：
 * quick 会话 = guard.allowedFiles；变更 = design §6 清单 ∪ task 卡 allowed_paths/target_files。
 * 文件被本变更与他者**双方声明**时归 own：foreign 排除的职责是「他者的工作不混进我的
 * 判定」，不是「我声明并真实修改的文件因他者（尤其未归档旧变更的陈旧 design 声明）也
 * 声明过就被剔出我的对账」。读不出来（无 design/无 task 卡/quick guard 损坏）→ 空集
 * （退回旧 foreign-first 行为，fail-closed 不放大放行面）。
 * @returns {Set<string>} 正斜杠归一后的声明路径集
 */
function loadOwnDeclaredSet(specBase, runtimeRoot, currentChangeName) {
  const set = new Set()
  if (!currentChangeName) return set
  const norm = (p) => String(p || '').replace(/\\/g, '/')
  const addAll = (paths) => { for (const p of paths) { const n = norm(p); if (n) set.add(n) } }
  try {
    if (/^quick-[0-9a-f]{8}$/.test(currentChangeName)) {
      try {
        const guard = JSON.parse(readFileSync(join(runtimeRoot, 'quick-sessions', currentChangeName, 'guard.json'), 'utf8'))
        addAll(Array.isArray(guard?.allowedFiles) ? guard.allowedFiles : [])
      } catch { /* guard 缺失/损坏 → 空集退回旧行为 */ }
      return set
    }
    const changeDir = join(specBase, 'changes', currentChangeName)
    try { addAll(parseFileChangeListDetailed(join(changeDir, 'design.md')).map(e => e.path)) } catch {}
    let taskFiles = []
    try { taskFiles = readdirSync(join(changeDir, 'tasks')).filter(f => /^task-\d+\.md$/.test(f)) } catch {}
    for (const tf of taskFiles) {
      try {
        const content = readFileSync(join(changeDir, 'tasks', tf), 'utf8')
        addAll(parseAllowedPaths(content))
        addAll(parseTargetFiles(content).entries.map(e => e.path))
      } catch { /* 单卡损坏跳过 */ }
    }
  } catch { /* 整体异常 → 空集 */ }
  return set
}

/**
 * 按他者声明集切分 diff 文件（collectForeignDeclaredFiles 的消费端快捷封装）。
 *
 * own 优先（2026-09-09 坑 verify-reconcile-own-file-foreign-false-positive 修复）：文件在
 * 本变更 own 声明集（design §6 / task allowed_paths / target_files / quick guard）内时
 * 永不判 foreign——哪怕他者变更（含未归档旧变更的陈旧声明，其活性被本变更自己的 dirty
 * 反向喂活）也声明过。双方都声明 = 归属歧义按「自己声明优先」收敛：本变更的 dirty 是
 * 自己工作的一部分，剔除它只会制造「声明未做」假红。
 *
 * @param {string} cwd 项目根
 * @param {string|null} currentChangeName 本变更名
 * @param {string[]|null} diffFiles 待切分文件列表（null 透传，保持调用方 null 语义）
 * @param {{ specBase?: string, runtimeRoot?: string }} [opts] 平台模式路径（透传 collectForeignDeclaredFiles）
 * @returns {{ own: string[]|null, foreign: Array<{file: string, owners: string[]}> }}
 */
export function splitOwnVsForeignDiffFiles(cwd, currentChangeName, diffFiles, opts = {}) {
  if (!Array.isArray(diffFiles)) return { own: diffFiles, foreign: [] }
  const specBase = opts.specBase || join(cwd, '.sillyspec')
  const runtimeRoot = opts.runtimeRoot || join(specBase, '.runtime')
  const foreignMap = collectForeignDeclaredFiles(cwd, currentChangeName, { specBase, runtimeRoot })
  if (foreignMap.size === 0) return { own: diffFiles, foreign: [] }
  const ownDeclared = loadOwnDeclaredSet(specBase, runtimeRoot, currentChangeName)
  const own = []
  const foreign = []
  for (const f of diffFiles) {
    const n = String(f).replace(/\\/g, '/')
    if (ownDeclared.size > 0 && ownDeclared.has(n)) { own.push(f); continue } // own 优先
    const owners = foreignMap.get(n)
    if (owners) foreign.push({ file: f, owners })
    else own.push(f)
  }
  return { own, foreign }
}
