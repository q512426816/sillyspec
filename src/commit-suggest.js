/**
 * commit-suggest.js — `sillyspec commit` 的语义收集 + commit message 建议生成
 * （2026-08-21 agent-手工产出审计第二批 G1-G3）。
 *
 * commit skill 此前让 agent 手工收集语义：取 LAST_COMMIT_TIME、cat 多处 QUICKLOG、
 * 扫变更目录、按时间戳过滤已勾 task、按路径模式识别来源阶段——进度库/quicklog/
 * git 全在 CLI 手里，这是「CLI 有数据却让 agent 重新收集」的最典型案例。
 *
 * 本模块一条命令产出全部上下文 + conventional commits 建议 message + 可照抄的
 * git commit 命令。**只建议不执行**（对齐 skill 绝对规则「不要自动提交」——确认权在人）。
 *
 * 语义来源（与 skill 手工流程同源）：
 *   A. QUICKLOG：specBase/quicklog/QUICKLOG-<user>.md + changes/<change>/quicklog/ 下的归属条目，
 *      条目时间 > 上次 commit 时间者（首次提交全收）
 *   B. execute 已勾 task：活跃变更 tasks.md 的 [x] 行（tasks.md mtime > 上次 commit 才计入，
 *      防旧变更全勾 task 永久污染建议）
 *   C. 阶段产出：changed paths 按路径模式归 scan/brainstorm/plan/execute/archive/knowledge
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'fs'
import { join } from 'path'
import { gitQuiet } from './git-helper.js'
import { resolveSpecDir } from './run/shared.js'

function listActiveChanges(specBase) {
  try {
    return readdirSync(join(specBase, 'changes'), { withFileTypes: true })
      .filter(e => e.isDirectory() && e.name !== 'archive')
      .map(e => e.name)
      .sort()
  } catch {
    return []
  }
}

/**
 * 解析 QUICKLOG 文件里的条目（## ql-xxx | time | title + 状态：行）
 */
function parseQuicklogEntries(file) {
  let content
  try {
    content = readFileSync(file, 'utf8')
  } catch {
    return []
  }
  const entries = []
  const lines = content.split('\n')
  let cur = null
  for (const line of lines) {
    const h = line.match(/^## (ql-\S+) \| ([0-9: -]+?) \| (.*)$/)
    if (h) {
      if (cur) entries.push(cur)
      cur = { qlId: h[1], time: h[2].trim(), title: h[3].trim(), status: '未知' }
      continue
    }
    if (cur) {
      const s = line.match(/^状态[：:]\s*(\S+)/)
      if (s) cur.status = s[1]
    }
  }
  if (cur) entries.push(cur)
  return entries
}

function classifyStagePath(p) {
  const posix = p.replace(/\\/g, '/')
  if (/^\.sillyspec\/docs\/[^/]+\/scan\//.test(posix)) return 'scan'
  if (/^\.sillyspec\/changes\/archive\//.test(posix)) return 'archive'
  if (/^\.sillyspec\/changes\/[^/]+\/(proposal|design)\.md/.test(posix)) return 'brainstorm'
  if (/^\.sillyspec\/changes\/[^/]+\/(tasks|plan)\.md/.test(posix)) return 'plan'
  if (/^\.sillyspec\/knowledge\//.test(posix)) return 'knowledge'
  return null
}

/**
 * 暂存区快照（坑 same-main-staging-pollution，2026-08-28 用户实证：同 main 两个活跃会话
 * 共享同一暂存区，A 的 commit 把 B 暂存的文件扫入——本轮竞态事故根因，无任何防护）。
 * 防护 = 提交前可见：commit 提示里带 `git diff --cached --name-only` 快照 + 他者文件告警。
 * @param {{ cwd: string, ownFiles?: string[]|null }} opts
 *   ownFiles：本会话/本变更的精确文件集（apply-pathspec 等）；提供时对快照做差集，
 *   不在集内的暂存文件 = 他者会话暂存（告警对象）。null/空数组 = 只出快照不做归属判定。
 * @returns {{ available: boolean, staged: string[], foreign: string[] }}
 *   available=false：git 不可用/非仓库（调用方静默跳过，不误报）。
 */
export function collectStagedArea({ cwd, ownFiles = null }) {
  const raw = gitQuiet(cwd, ['diff', '--cached', '--name-only'])
  if (raw === null) return { available: false, staged: [], foreign: [] }
  const staged = raw.split('\n').filter(Boolean).map(f => f.replace(/\\/g, '/'))
  let foreign = []
  if (Array.isArray(ownFiles) && ownFiles.length > 0) {
    const own = new Set(ownFiles.map(f => String(f).replace(/\\/g, '/')))
    foreign = staged.filter(f => !own.has(f))
  }
  return { available: true, staged, foreign }
}

/**
 * 收集提交上下文并生成建议 message。
 * @param {{ cwd: string, specDir?: string|null }} opts
 * @returns {{
 *   lastCommitTime: string|null, hasChanges: boolean, changedCount: number, stat: string,
 *   quickEntries: Array<{qlId,time,title,status,file}>, checkedTasks: Array<{change,item}>,
 *   stageArtifacts: string[], suggestion: {type, subject, body}|null
 * }}
 */
export function collectCommitContext({ cwd, specDir = null }) {
  const specBase = resolveSpecDir(cwd, { specDir })
  const lastCommitTime = gitQuiet(cwd, ['log', '-1', '--format=%ci'])
  const lastCommitKey = lastCommitTime ? lastCommitTime.slice(0, 19) : null

  // -uall：未跟踪目录不折叠（.sillyspec/ 整体未跟踪时默认 porcelain 只给一行 `?? .sillyspec/`，
  // 路径模式分类会瞎；-uall 逐文件列出，scan/brainstorm/plan 分类才有输入）
  const porcelain = gitQuiet(cwd, ['status', '--porcelain', '-uall']) || ''
  const changedLines = porcelain.split('\n').filter(Boolean)
  const changedPaths = changedLines.map(l => l.slice(3).trim()).filter(Boolean)
  const untrackedCount = changedLines.filter(l => l.startsWith('??')).length
  const stat = gitQuiet(cwd, ['diff', 'HEAD', '--stat']) || (changedPaths.length > 0 ? `（${changedPaths.length} 个文件待首提交）` : '')

  // ── 来源 A：QUICKLOG（主 quicklog + 各活跃变更归属 quicklog）──
  const quickFiles = []
  try {
    for (const f of readdirSync(join(specBase, 'quicklog'))) {
      if (/^QUICKLOG.*\.md$/.test(f)) quickFiles.push(join(specBase, 'quicklog', f))
    }
  } catch {}
  for (const c of listActiveChanges(specBase)) {
    try {
      for (const f of readdirSync(join(specBase, 'changes', c, 'quicklog'))) {
        if (f.endsWith('.md')) quickFiles.push(join(specBase, 'changes', c, 'quicklog', f))
      }
    } catch {}
  }
  const quickEntries = quickFiles
    .flatMap(file => parseQuicklogEntries(file).map(e => ({ ...e, file })))
    .filter(e => !lastCommitKey || e.time > lastCommitKey)
    .sort((a, b) => (a.time < b.time ? -1 : 1))
  const doneQuick = quickEntries.filter(e => e.status === '已完成')

  // ── 来源 B：活跃变更已勾 task（tasks.md mtime 晚于上次 commit 才计入）──
  const lastCommitMs = lastCommitTime ? Date.parse(lastCommitTime) : null
  const checkedTasks = []
  for (const c of listActiveChanges(specBase)) {
    const tasksPath = join(specBase, 'changes', c, 'tasks.md')
    if (!existsSync(tasksPath)) continue
    if (lastCommitMs !== null && !Number.isNaN(lastCommitMs)) {
      try {
        // epoch 对比（非字符串）：git %ci 带本地时区偏移，Date.parse 归一；字符串对比会因
        // UTC/本地时差把刚改过的 tasks.md 误判为早于上次 commit 而漏收
        if (statSync(tasksPath).mtime.getTime() <= lastCommitMs) continue
      } catch { continue }
    }
    for (const line of readFileSync(tasksPath, 'utf8').split('\n')) {
      const m = line.match(/^[-*]\s*\[[xX]\]\s*(task-\d+)\s*[:：]?\s*(.*)/)
      if (m) checkedTasks.push({ change: c, item: `${m[1]}: ${m[2].trim()}` })
    }
  }

  // ── 来源 C：阶段产出（changed paths 按模式归类去重）──
  const stageSet = new Set()
  for (const p of changedPaths) {
    const stage = classifyStagePath(p)
    if (stage) stageSet.add(stage)
  }
  const stageArtifacts = [...stageSet]

  // ── 建议 message（对齐 commit skill 的 type 表）──
  let suggestion = null
  const bodyLines = []
  const hasQuick = doneQuick.length > 0
  const hasTasks = checkedTasks.length > 0
  const hasStages = stageArtifacts.length > 0

  if (hasQuick || hasTasks || hasStages) {
    let type
    let subject
    if (hasTasks && !hasQuick) {
      type = 'feat'
      const byChange = new Map()
      for (const t of checkedTasks) {
        if (!byChange.has(t.change)) byChange.set(t.change, [])
        byChange.get(t.change).push(t.item)
      }
      const [firstChange, items] = [...byChange][0]
      subject = `feat: ${firstChange} 完成 task ×${items.length}`
    } else if (hasQuick && !hasTasks) {
      type = 'fix'
      if (doneQuick.length === 1) {
        subject = `fix: ${doneQuick[0].title}`
      } else if (doneQuick.length === 2) {
        subject = `fix: ${doneQuick[0].title}；${doneQuick[1].title}`
      } else {
        subject = `fix: quick 修复 ${doneQuick.length} 项`
      }
    } else if (hasTasks) {
      type = 'feat'
      subject = `feat: 变更交付 + quick 修复 ${doneQuick.length} 项`
    } else {
      type = 'fix'
      subject = `fix: quick 修复 + 阶段产出`
    }
    if (doneQuick.length >= 2 || hasTasks || hasStages) {
      for (const q of doneQuick) bodyLines.push(`- quick ${q.qlId}: ${q.title}`)
    }
    for (const t of checkedTasks) bodyLines.push(`- ${t.change} ${t.item}`)
    for (const s of stageArtifacts) bodyLines.push(`- 阶段产出: ${s}`)
    if (!hasStages && !hasTasks && doneQuick.length === 1) bodyLines.length = 0
    suggestion = {
      type,
      subject: subject.length > 100 ? subject.slice(0, 100) + '…' : subject,
      body: bodyLines.length > 0 ? bodyLines.join('\n') : '',
    }
  }

  return {
    lastCommitTime,
    hasChanges: changedPaths.length > 0,
    changedCount: changedPaths.length,
    untrackedCount,
    stat,
    quickEntries,
    checkedTasks,
    stageArtifacts,
    suggestion,
  }
}
