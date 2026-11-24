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
import { existsSync, readFileSync, readdirSync, statSync } from 'fs'
import { join, relative, resolve } from 'path'
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
 * 双根扫描（坑 platform-dual-root-fourth-consumer，2026-09-16 hunt 实证）：平台模式
 * specBase=specRoot 下只挂跨仓 worktree，主仓 worktree 在项目侧 <cwd>/.sillyspec——单扫
 * specBase 会把主仓 worktree 变更误判 stale → 其声明失效 → 文件被误归属当前变更（③类
 * 噪音/误扣）。specBase 与 cwd 项目侧两目录都扫，按变更名合并（specBase 先入）。
 * @returns {Map<string, { isolated: boolean }>|null} null = 两目录均读取失败（fail-closed）
 */
export function loadWorktreeLiveness(specBase, cwd) {
  const map = new Map()
  const roots = [...new Set([specBase, join(cwd || process.cwd(), '.sillyspec')].filter(Boolean))]
  let anyDirOk = false
  for (const base of roots) {
    try {
      const dir = join(base, '.runtime', 'worktrees')
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        if (!e.isDirectory()) continue
        try {
          const meta = JSON.parse(readFileSync(join(dir, e.name, 'meta.json'), 'utf8'))
          const isolated = Boolean(meta && meta.mode !== 'in-place-fallback'
            && meta.worktreePath && existsSync(meta.worktreePath))
          map.set(meta.changeName || e.name, { isolated })
        } catch { /* 单条损坏跳过（该变更走主仓 dirty 判定） */ }
      }
      anyDirOk = true
    } catch { /* 该根不存在/不可读 → 试下一根 */ }
  }
  return anyDirOk ? map : null
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
  const worktrees = loadWorktreeLiveness(specBase, cwd)
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
    // 时效判据（2026-09-25-platform-feedback-batch2 B）：变更目录 mtime 超 7 天未动 → 声明视为
    // 陈旧忽略（平台狗粮实证：9-21 未归档旧变更 9-25 还在抢文件——活性被 dirty 反向喂活但
    // 变更本身已死。mtime 是最便宜的活性信号：任何文件写入/勾选/槽位填写都会 touch 目录）。
    const STALE_CHANGE_MS = 7 * 24 * 60 * 60 * 1000
    const changesDir = join(specBase, 'changes')
    let changeDirs = []
    try { changeDirs = readdirSync(changesDir, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name) } catch {}
    for (const cn of changeDirs) {
      if (cn === currentChangeName || cn === 'archive') continue
      const designPath = join(changesDir, cn, 'design.md')
      if (!existsSync(designPath)) continue
      // 时效：变更目录内最新文件 mtime 超 7 天 → 陈旧（目录 mtime 在 POSIX 上只反映子项增删
      // 不反映文件内容修改——用目录内所有文件的最大 mtime 做活性信号，跨平台一致）
      try {
        let newestMtime = 0
        const changePath = join(changesDir, cn)
        for (const fe of readdirSync(changePath)) {
          try { const m = statSync(join(changePath, fe)).mtimeMs; if (m > newestMtime) newestMtime = m } catch { /* 个别文件 stat 失败跳过 */ }
        }
        if (newestMtime > 0 && Date.now() - newestMtime > STALE_CHANGE_MS) {
          continue // 陈旧变更——声明已死，不抢活人的文件
        }
      } catch { /* stat 失败保守保留 */ }
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
// export 补齐（2026-10-28-overlap-route）：重叠检测复用声明加载单一源，防口径漂移
export function loadOwnDeclaredSet(specBase, runtimeRoot, currentChangeName) {
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
 * 提交标题 → 变更名数组（2026-10-05-diff-commit-attribution）：项目提交惯例 message 尾部
 * 携带变更名括号后缀（多变更并列各自提取；归档提交 chore(archive): <名> 的标题首部同名
 * 形态不提取——归档提交触碰的是治理面移动，交付文件归属看交付提交）。
 * 括号形态双收（2026-10-08-thin-done-dirty-gate-and-paren-attribution，坑
 * thin-done-src-commit-order-and-attribution-paren：中文输入法惯例写全角
 * `（thin <名>；…）`，旧正则只认半角 → drift 归因静默失灵）：开/闭括号半全角任意组合，
 * 括号内允许 `thin ` 前缀与名字后附注文本；变更名本体模式（日期前缀 + 白名单字符）不放宽。
 */
export function parseChangeNamesFromSubject(subject) {
  const out = []
  const re = /[（(]\s*(?:thin\s+)?(\d{4}-\d{2}-\d{2}-[A-Za-z0-9._-]+)[^()（）]*[)）]/g
  let m
  while ((m = re.exec(String(subject || '')))) out.push(m[1])
  return out
}

/** 提交标题的 task token（交付协议证据，thin-tasks-v3 起勾选证据=task token 提交）。 */
const TASK_TOKEN_RE = /task-\d+/i

/**
 * 提交触及的变更目录名集合（2026-11-24-token-commit-change-dir-attribution）。
 * 变更根下的直接子目录名即变更名；归档目录 `archive/<变更名>/…` 同样记为触及该变更名
 * （归档提交若带 task token 也不落到别的变更头上）。这是提交事实，不是声明——task tick 的
 * 提交指引把该变更的 tasks.md 与侧车随交付同一提交入库，故「一笔任务提交触及哪个变更的
 * 目录」可用于区分是谁的 task。2026-11-08-bare-commit-attribution-narrow 当时因「token 无
 * 变更名限定，区分不了是谁的 task」而保守 own；共享仓并行会话下该保守把所有他侧 task
 * 提交算成本变更的（multi-agent-platform 2026-11-24 实证：冻结补丁由 7 文件膨胀到 34 文件，
 * 仅 3 个属于该变更；已通过的评审被隔离作废，重跑即再触发）。
 * @param {string[]} files 提交触及的文件路径（git 输出，正反斜杠均可）
 * @param {string} [changesDirPrefix] 变更根在仓内的相对前缀（缺省 `.sillyspec/changes/`；空串=禁用目录归属）
 * @returns {Set<string>}
 */
export function touchedChangeDirs(files, changesDirPrefix) {
  const out = new Set()
  const raw = changesDirPrefix === undefined ? '.sillyspec/changes/' : String(changesDirPrefix == null ? '' : changesDirPrefix)
  const prefix = raw.replace(/\\/g, '/')
  if (!prefix) return out
  const p = prefix.endsWith('/') ? prefix : `${prefix}/`
  for (const f0 of files || []) {
    const f = String(f0 || '').replace(/\\/g, '/')
    if (!f.startsWith(p)) continue
    const rest = f.slice(p.length)
    // 分支互斥而非可选前缀：`archive/x.md`（归档根下散文件）不得回退成变更名 archive
    const m = rest.startsWith('archive/') ? /^archive\/([^/]+)\//.exec(rest) : /^([^/]+)\//.exec(rest)
    if (m) out.add(m[1])
  }
  return out
}

/**
 * 含作者的 git log 参数（2026-11-24-token-commit-change-dir-attribution FR-07）：每提交 =
 * NUL + sha␟作者名␟邮箱␟标题，随后 `--name-only` 的文件行。提交级归属、文件级归属与提示清单
 * 共用本参数与 parseCommitLog，防三处解析口径再漂。
 */
export const COMMIT_LOG_ARGS = ['log', '--name-only', '--format=%x00%H%x1f%an%x1f%ae%x1f%s']

/**
 * git log 文本 → 提交清单（git 顺序，新→旧）。兼容仅标题的旧格式（NUL + 标题 + 文件行）：
 * sha 与 author 为空串（作者未知——FR-07 的作者补判对其不生效，维持保守）。
 * @param {string} logText
 * @returns {Array<{ sha: string, author: string, subject: string, files: string[] }>} author=`姓名 <邮箱>`；文件面正斜杠归一
 */
export function parseCommitLog(logText) {
  const out = []
  for (const block of String(logText || '').split('\x00')) {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean)
    if (lines.length === 0) continue
    const head = lines[0]
    const files = lines.slice(1).map((f) => f.replace(/\\/g, '/'))
    if (head.includes('\x1f')) {
      const [sha, name, email, ...rest] = head.split('\x1f')
      out.push({ sha, author: `${name} <${email}>`, subject: rest.join('\x1f'), files })
    } else {
      out.push({ sha: '', author: '', subject: head, files })
    }
  }
  return out
}

/**
 * 目录规则层（2026-11-24-token-commit-change-dir-attribution，三值）：
 *   true  = own——标题提及本变更名，或无名 task 提交触及本变更目录；
 *   false = 非 own——标题提及了变更名但不是本变更（即便同时带 task token——漂移检测旧条件
 *           「提本变更名 或 含 task token」缺「标题未提任何变更名」前提，把他变更名提交带
 *           token 的形态误判为本变更：test/thin-done-dirty-gate「全角括号交付提交判 drifted」
 *           第 99 行自 2026-11-13 起在主干即红）；纯裸提交（无名无 token）；无名 task 提交
 *           只触及他变更目录；
 *   null  = 分不清——无名、带 task token、什么变更目录都没触及（2026-11-13-flow-done-patch-
 *           refreeze-skip-on-rework 的返工提交形态：只带 token、只触及源文件，其回归 test ⑦
 *           不得破）。是否 own 交由上层按作者身份补判（isOwnCommitForChange）或保守 own。
 * 触及哪个变更目录是提交事实而非声明——task tick 的提交指引把该变更的 tasks.md 与侧车随交付
 * 同一提交入库。共享仓并行会话下，旧的「含 task token 即 own」把他侧任务提交算成本变更的
 * （multi-agent-platform 2026-11-24 实证：冻结补丁由 7 文件膨胀到 34 文件）。
 * @param {{ subject: string, files: string[] }} commit
 * @param {string} changeName
 * @param {string} [changesDirPrefix]
 * @returns {boolean|null}
 */
export function isOwnByFacts({ subject, files }, changeName, changesDirPrefix) {
  const names = parseChangeNamesFromSubject(subject)
  if (names.length > 0) return names.includes(changeName)
  if (!TASK_TOKEN_RE.test(String(subject || ''))) return false
  const touched = touchedChangeDirs(files, changesDirPrefix)
  if (touched.size === 0) return null
  return touched.has(changeName)
}

/**
 * 本变更作者集（FR-07）：窗口内目录规则层判 own 的提交（标题提及本变更名，或无名 task 提交
 * 触及本变更目录）的作者身份集合。从提交事实现算，不落盘、不依赖配置。空集 = 窗口内没有
 * 本变更自身提交，无从比较。
 * @param {Array<{ subject: string, files: string[], author?: string }>} commits
 * @returns {Set<string>}
 */
export function collectOwnAuthors(commits, changeName, changesDirPrefix) {
  const set = new Set()
  for (const c of commits || []) {
    if (c && c.author && isOwnByFacts(c, changeName, changesDirPrefix) === true) set.add(c.author)
  }
  return set
}

/**
 * 提交级「本变更提交」判定单一源（2026-11-24-token-commit-change-dir-attribution）。
 * 先走目录规则层 isOwnByFacts；分不清（null）时按作者身份补判（FR-07，用户选定）：
 * 本变更作者集非空、且本提交作者不在其中 → 非 own；其余（作者集未提供/为空、作者未知、
 * 作者在集内）→ 保守 own。
 * 实证（multi-agent-platform 2026-11-24-voice-meeting-leak-retry-fix）：窗口内 17 笔分不清的
 * 提交作者全部不是该变更自身提交的作者，冻结补丁 45 文件中仅 12 个属于该变更。取舍：本变更
 * 自身的提交若换了 git 身份、又不带变更名、又不触及变更目录，会被判他侧——由收口提示点名
 * （listAmbiguousTokenCommits 的 byAuthorExcluded）兜底；提交标题带变更名即免疫。
 * 提交级（漂移检测 detectPatchDrift / deliveryFaceAnchoredAfter）与文件级
 * （buildCommitAttribution / isForeignByCommit）必须共用本口径，防两处再漂。
 * @param {{ subject: string, files: string[], author?: string }} commit
 * @param {string} changeName 当前变更名
 * @param {string} [changesDirPrefix]
 * @param {Set<string>|null} [ownAuthors] 本变更作者集（collectOwnAuthors）；未提供 = 不做作者补判
 * @returns {boolean}
 */
export function isOwnCommitForChange({ subject, files, author }, changeName, changesDirPrefix, ownAuthors) {
  const facts = isOwnByFacts({ subject, files }, changeName, changesDirPrefix)
  if (facts !== null) return facts
  if (ownAuthors && ownAuthors.size > 0 && author && !ownAuthors.has(author)) return false
  return true
}

/**
 * 变更根在仓内的相对前缀（带尾斜杠，正斜杠；供 touchedChangeDirs / isOwnCommitForChange）。
 * 变更根取自 specBase（不写死 `.sillyspec`——规则 00）。不可得——spec 目录在仓外、跨盘符
 * （Windows 下 path.relative 返回绝对路径）、入参缺失——返回空串：目录归属禁用，无名 task
 * 提交退回保守 own，不抛错。
 * @param {string} cwd 仓根
 * @param {string} specBase spec 目录
 * @returns {string}
 */
export function changesDirPrefixFor(cwd, specBase) {
  try {
    if (!cwd || !specBase) return ''
    const rel = relative(resolve(cwd), resolve(cwd, join(specBase, 'changes'))).replace(/\\/g, '/')
    if (!rel || rel === '..' || rel.startsWith('../') || rel.startsWith('/') || /^[A-Za-z]:/.test(rel)) return ''
    return `${rel}/`
  } catch { return '' }
}

/**
 * 窗口内「分不清」的无名 task 提交清单（2026-11-24-token-commit-change-dir-attribution FR-06，
 * advisory 用）：标题未提变更名、带 task token、且不触及任何变更目录（目录规则层 isOwnByFacts
 * 判 null）。落地验证该形态真实存在：multi-agent-platform 最近 300 笔提交里只带 task token 的
 * 59 笔中有 29 笔属此形态；单个变更窗口内最多见过 17 笔。误判时须能直接看出是哪笔所致。
 * FR-07：提供 ownAuthors 时每项带 byAuthorExcluded——作者不在本变更作者集（且集合非空）即已按
 * 他侧处理；未提供时恒为 false。
 * @param {{ cwd: string, sinceRef: string, changesDirPrefix?: string, ownAuthors?: Set<string>|null }} opts sinceRef=窗口起点（不含）
 * @returns {Array<{ sha: string, author: string, subject: string, files: string[], byAuthorExcluded: boolean }>|null} git 新→旧；null=入参缺失/git 失败（调用方静默跳过）
 */
export function listAmbiguousTokenCommits({ cwd, sinceRef, changesDirPrefix, ownAuthors } = {}) {
  try {
    if (!cwd || !sinceRef) return null
    const r = safeGit(cwd, [...COMMIT_LOG_ARGS, `${sinceRef}..HEAD`], { trim: false })
    if (r.value === null) return null
    const out = []
    for (const c of parseCommitLog(r.value)) {
      if (!c.sha || !c.subject) continue
      if (isOwnByFacts(c, '', changesDirPrefix) !== null) continue
      out.push({ ...c, byAuthorExcluded: !!(ownAuthors && ownAuthors.size > 0 && c.author && !ownAuthors.has(c.author)) })
    }
    return out
  } catch { return null }
}

/** listAmbiguousTokenCommits 结果的提示行格式：`<短 sha> <标题截 60>`，分号连接；空清单得空串。 */
export function formatAmbiguousTokenCommits(list) {
  return (Array.isArray(list) ? list : [])
    .map((c) => `${String((c && c.sha) || '').slice(0, 9)} ${String((c && c.subject) || '').slice(0, 60)}`)
    .join('；')
}

/**
 * git log 文本（--format=%x00%s --name-only，每提交 NUL+标题+文件行）→ 文件提交归属映射。
 * 每文件聚合：owners=触碰过它的全部提交携带的变更名；unknown=被无变更名裸提交触碰过；
 * tokened=无名 touch 中存在带 task-NN token 者（`task-\d+`——交付协议证据，thin-tasks-v3
 * 起勾选证据=task token 提交，收口哨兵按它逐格核）。2026-11-08-bare-commit-attribution-narrow
 * 起细分：纯裸 touch（无名无 token——release 生成器/Merge/归档 chore 形态）不再保守保留
 * （判 foreign，见 isForeignByCommit）；token 裸 touch 原先保守 own（task token 无变更名限定，
 * 无法区分是谁的 task——fail-closed 不误剔交付）。原「unknown 恒 own」的 fail-closed 前提
 * （自己的交付提交可能不带变更名）已随 token 协议过时——坑②（shared-repo multi-session
 * frictions）10-28 实证：release-record 归档 chore 提交穿透冻结面。
 * token 裸 touch 的归属收窄（2026-11-24-token-commit-change-dir-attribution）：按该提交触及的
 * 变更目录区分是谁的 task——tokenDirs=这些提交触及的变更名并集；tokenAmbiguous=存在什么都
 * 不触及、且仍算本变更的触碰（分不清：作者未知、作者集为空或作者在集内）；tokenAmbiguousForeign
 * =存在什么都不触及、但作者不在本变更作者集的触碰（FR-07，已按他侧处理）。判 foreign 的条件见
 * isForeignByCommit。
 * @param {string} logText
 * @param {{ changesDirPrefix?: string, changeName?: string }} [opts] changesDirPrefix=变更根在仓内的相对前缀（缺省 .sillyspec/changes/，空串=禁用目录归属）；changeName=当前变更名（提供时按其作者集做 FR-07 作者补判，未提供维持保守）
 */
export function buildCommitAttribution(logText, opts = {}) {
  const o = opts && typeof opts === 'object' ? opts : {}
  const changesDirPrefix = 'changesDirPrefix' in o ? o.changesDirPrefix : undefined
  const commits = parseCommitLog(logText)
  // FR-07：仅当调用方给出当前变更名时才做作者补判（需要本变更作者集）；旧调用形态不做。
  const ownAuthors = o.changeName ? collectOwnAuthors(commits, o.changeName, changesDirPrefix) : new Set()
  const map = new Map()
  for (const c of commits) {
    const names = parseChangeNamesFromSubject(c.subject)
    // 提交级事实：该无名 task 提交触及的变更目录（对本提交的全部文件同样成立）
    const touched = names.length === 0 && TASK_TOKEN_RE.test(c.subject) ? touchedChangeDirs(c.files, changesDirPrefix) : null
    const authorExcluded = touched !== null && touched.size === 0 && ownAuthors.size > 0 && !!c.author && !ownAuthors.has(c.author)
    for (const file of c.files) {
      let e = map.get(file)
      if (!e) { e = { owners: new Set(), unknown: false, tokened: false, tokenDirs: new Set(), tokenAmbiguous: false, tokenAmbiguousForeign: false }; map.set(file, e) }
      if (names.length === 0) {
        e.unknown = true
        if (touched) {
          e.tokened = true
          if (touched.size > 0) { for (const n of touched) e.tokenDirs.add(n) } else if (authorExcluded) e.tokenAmbiguousForeign = true
          else e.tokenAmbiguous = true
        }
      } else for (const n of names) e.owners.add(n)
    }
  }
  return map
}

/**
 * 提交事实归属切分（2026-10-05-diff-commit-attribution）：声明面（collectForeignDeclaredFiles
 * ②扫描）对已归档他侧变更不可见——他会话在 baseline..HEAD 窗口内交付并归档后目录进
 * archive/（「archive/ 下不算」），其文件漏归本变更 → patch 冻结面夹带 + FR 域路由触达
 * 他侧域（双 P1 实证）。按提交 message 变更名归属是已发生的提交事实，不是声明抢文件——
 * 不触碰否决决策 sentinel-evidence-freeze⑤（其禁的是陈旧声明的意图抢夺）。
 * baseline 自取：opts.baselineCommit 优先，缺省读当前变更 flow-state.yaml（调用点零改动）。
 * @returns {Map|null} null=不可得（非 git 仓/无 baseline/git 失败）——消费端退化现状。
 */
export function commitAttributionForChange(cwd, specBase, currentChangeName, baselineCommit) {
  try {
    let base = baselineCommit || null
    if (!base && currentChangeName) {
      const st = readFileSync(join(specBase, 'changes', currentChangeName, 'flow-state.yaml'), 'utf8')
      const m = /^baseline_commit:\s*(\S+)/m.exec(st)
      if (m) base = m[1]
    }
    if (!base) return null
    const r = safeGit(cwd, [...COMMIT_LOG_ARGS, `${base}..HEAD`], { trim: false })
    if (r.value === null) return null
    // 变更根取自 specBase（2026-11-24-token-commit-change-dir-attribution）：无名 task 提交按触及的
    // 变更目录归属；给出当前变更名以启用 FR-07 作者补判（与提交级 detectPatchDrift 同口径）。
    return buildCommitAttribution(r.value, { changesDirPrefix: changesDirPrefixFor(cwd, specBase), changeName: currentChangeName })
  } catch { return null }
}

/** 纯他侧文件判定（2026-11-08-bare-commit-attribution-narrow 细分）：
 *  own 路径——①记录缺位（窗口外文件）②含本变更名 touch ③无名 touch 带 task-NN token
 *    （交付协议证据）且下列 foreign 条件不成立。
 *  foreign 路径——①纯他侧具名（旧语义）②纯裸 touch（无名无 token：release 生成器/
 *    Merge/归档 chore 形态——坑②污染源；误剔由收口「提交面夹带嫌疑 advisory」点名兜底）
 *    ③无名 task 提交的触碰全部有「触及他变更目录」的提交事实、且没有任何一次「分不清」的
 *    触碰（2026-11-24-token-commit-change-dir-attribution：token 无变更名限定时，该提交随
 *    tick 指引同提交其变更目录下的 tasks.md——触及哪个变更目录即是谁的 task；共享仓并行下
 *    旧的「token 裸恒 own」把他侧任务提交的文件冻进本变更补丁）
 *    ④无名 task 提交的触碰全部「分不清且作者不在本变更作者集」（FR-07：buildCommitAttribution
 *    以 changeName 调用时记 tokenAmbiguousForeign），且没有任何一次仍算 own 的分不清触碰。
 *  entry 无 tokenDirs/tokenAmbiguous 字段（旧调用方/手工构造）→ 行为与旧版一致（own）。 */
export function isForeignByCommit(entry, currentChangeName) {
  if (!entry) return false
  if (entry.owners.has(currentChangeName)) return false
  if (entry.tokened) {
    if (entry.tokenAmbiguous === true) return false // 仍有「分不清且算 own」的触碰 → 保守 own
    if (entry.tokenDirs && entry.tokenDirs.size > 0) return !entry.tokenDirs.has(currentChangeName)
    return entry.tokenAmbiguousForeign === true
  }
  return entry.owners.size > 0 || entry.unknown === true
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
 * @param {{ specBase?: string, runtimeRoot?: string, baselineCommit?: string }} [opts] 平台模式路径（透传 collectForeignDeclaredFiles）+ 显式 baseline（缺省自取 flow-state）
 * @returns {{ own: string[]|null, foreign: Array<{file: string, owners: string[]}> }}
 */
export function splitOwnVsForeignDiffFiles(cwd, currentChangeName, diffFiles, opts = {}) {
  if (!Array.isArray(diffFiles)) return { own: diffFiles, foreign: [] }
  const specBase = opts.specBase || join(cwd, '.sillyspec')
  const runtimeRoot = opts.runtimeRoot || join(specBase, '.runtime')
  const foreignMap = collectForeignDeclaredFiles(cwd, currentChangeName, { specBase, runtimeRoot })
  // 提交事实归属补位（声明面归档盲区）：优先级 ownDeclared > 声明面 foreign > 提交归属 foreign > own
  const commitAttr = commitAttributionForChange(cwd, specBase, currentChangeName, opts.baselineCommit)
  if (foreignMap.size === 0 && !commitAttr) return { own: diffFiles, foreign: [] }
  const ownDeclared = loadOwnDeclaredSet(specBase, runtimeRoot, currentChangeName)
  const own = []
  const foreign = []
  for (const f of diffFiles) {
    const n = String(f).replace(/\\/g, '/')
    if (ownDeclared.size > 0 && ownDeclared.has(n)) { own.push(f); continue } // own 优先
    const owners = foreignMap.get(n)
    if (owners) { foreign.push({ file: f, owners }); continue }
    const ce = commitAttr ? commitAttr.get(n) : null
    if (isForeignByCommit(ce, currentChangeName)) foreign.push({ file: f, owners: [...ce.owners] })
    else own.push(f)
  }
  return { own, foreign }
}
