/**
 * quicklog.js — QUICKLOG 记录的 CLI 接管层
 *
 * 历史问题：QUICKLOG 条目（ql-ID 分配 + 追加）原本由 Agent（LLM）手写
 * （见 src/stages/quick.js 旧 prompt）。两个后果：
 *   1. 漏写静默通过：CLI 只查目录级存在性，agent 漏写仍报「3/3 SAFE」。
 *   2. 并发丢更新：多 quick 会话并发写同一 per-user QUICKLOG 文件，读-改-写非原子，
 *      已有实证（QUICKLOG-qinyi.md 同一 ql-20260604-001-7a4c 出现两次）。
 *
 * 本模块把分配与写入下沉到 CLI 进程内，O_EXCL lockfile 串行化，彻底消除上述问题。
 * 无新 npm 依赖（仅 fs/path/crypto）——匹配项目零 FS 工具依赖的风格。
 */
import { join, dirname, basename } from 'path'
import {
  openSync, closeSync, unlinkSync, statSync, mkdirSync, existsSync,
  readFileSync, writeFileSync, readdirSync, renameSync, appendFileSync,
} from 'fs'
import { randomBytes } from 'crypto'

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

/**
 * O_EXCL 文件锁。`openSync(lockPath,'wx')` 独占创建；已存在则按 mtime 判 stale 偷锁，
 * 否则退避重试至超时。CLI 短进程、低频写入，stale 阈值 30s 足够。
 * @param {string} lockPath 锁文件路径（建议与被保护文件同目录）
 * @param {() => (any|Promise<any>)} fn 临界区
 * @param {{staleMs?:number, timeoutMs?:number, retryMs?:number}} opts
 */
export async function withFileLock(lockPath, fn, opts = {}) {
  const { staleMs = 30000, timeoutMs = 10000, retryMs = 50 } = opts
  mkdirSync(dirname(lockPath), { recursive: true })
  const start = Date.now()
  let fd = null
  // 抢锁循环
  while (true) {
    try {
      fd = openSync(lockPath, 'wx') // O_EXCL：已存在抛 EEXIST
      break
    } catch (e) {
      if (e.code !== 'EEXIST') throw e
      // 锁已存在：判 stale（持有进程崩溃残留）
      try {
        const mtime = statSync(lockPath).mtimeMs
        if (Date.now() - mtime > staleMs) {
          try { unlinkSync(lockPath) } catch {} // 偷 stale 锁后重试
          continue
        }
      } catch {}
      if (Date.now() - start > timeoutMs) {
        throw new Error(`文件锁超时（${timeoutMs}ms）: ${lockPath}`)
      }
      await sleep(retryMs)
    }
  }
  try {
    return await fn()
  } finally {
    try { closeSync(fd) } catch {}
    try { unlinkSync(lockPath) } catch {} // 释放（容忍已不存在）
  }
}

// ── 内部工具 ──

function todayStamp(d = new Date()) {
  return d.getFullYear()
    + String(d.getMonth() + 1).padStart(2, '0')
    + String(d.getDate()).padStart(2, '0')
}

function nowDatetime(d = new Date()) {
  return todayStamp(d).slice(0, 4) + '-' + todayStamp(d).slice(4, 6) + '-' + todayStamp(d).slice(6, 8)
    + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ':' + String(d.getSeconds()).padStart(2, '0')
}

// 描述压成一行、限长，避免破坏 QUICKLOG 条目结构
function sanitizeDesc(description) {
  const s = String(description || '').replace(/[\r\n]+/g, ' ').trim()
  if (!s) return '(quick 任务)'
  return s.length > 120 ? s.slice(0, 120) + '…' : s
}

function sanitizeResult(resultText) {
  // 保留换行：结果块支持字段化结构（需求：/根因：/方案：/结果：...）。多行时 flipEntryInContent
  // 写成字段块（追加在「状态：」行下方），不是单条「结果：<长行>」。仅去首尾空白。
  return String(resultText || '').trim()
}

// 结果块必填字段（quick step3 --done --output 的结构化结果模板，见 src/stages/quick.js）。
const RESULT_REQUIRED_LABELS = ['需求：', '根因：', '方案：', '结果：']

/**
 * quick step3 结果摘要结构校验（确定性：只查「必填字段是否都在」，不判内容质量——
 * 内容好坏属语义软判定，不归 CLI）。对齐 docs/sillyspec/quick-done-quicklog-duplicate-status-line
 * 的第二诉求：--output 不自动展开丰富格式时，用约束模板 + 结构校验保证 QUICKLOG 记录完整。
 * @param {string} text --done --output 原文
 * @returns {{ ok: boolean, missing: string[] }} ok=true 通过；missing=缺失的字段名列表
 */
export function validateQuickResult(text) {
  const missing = RESULT_REQUIRED_LABELS.filter(label => !String(text || '').includes(label))
  return { ok: missing.length === 0, missing }
}

function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function listQuicklogFiles(quicklogDir) {
  try {
    return readdirSync(quicklogDir).filter(f => f.endsWith('.md') && f.startsWith('QUICKLOG'))
  } catch {
    return []
  }
}

// 原子写：同目录临时文件 + rename 覆盖。reader 不持锁（agent cat / dashboard 轮询），
// 若直接 writeFileSync 覆盖整文件，reader 会在 truncate→write 间隙读到空/半截（reader-writer 竞态）。
// rename 同文件系统内原子（POSIX rename / Win MoveFileEx REPLACE_EXISTING），
// reader 永远看到完整旧版或完整新版，绝不读半截。
// Windows 差异：rename 覆盖「正被另一进程读取的目标」会抛 EPERM/EBUSY（POSIX 无此问题）。
// reader 句柄是瞬时的，故对占用类错误做异步重试+退避；非占用错误立即抛。
async function writeAtomic(filePath, content, opts = {}) {
  const { retries = 100, baseDelayMs = 5, maxDelayMs = 100 } = opts
  const tmp = join(dirname(filePath), basename(filePath) + '.tmp-' + process.pid)
  writeFileSync(tmp, content) // 同目录 = 同文件系统，rename 才原子（跨 fs 会退化 copy+delete）
  for (let attempt = 0; ; attempt++) {
    try {
      renameSync(tmp, filePath)
      return
    } catch (e) {
      const retryable = e.code === 'EBUSY' || e.code === 'EPERM' || e.code === 'EACCES'
      if (!retryable || attempt >= retries) {
        try { unlinkSync(tmp) } catch {}
        throw e
      }
      await sleep(Math.min(baseDelayMs * (attempt + 1), maxDelayMs)) // 线性退避，让出 loop
    }
  }
}

// 扫描所有 QUICKLOG-*.md（含轮转归档）当天最大 NNN + 已用 XXXX 后缀集
function scanExisting(quicklogDir, today) {
  let maxSeq = 0
  const usedSuffix = new Set()
  const re = /^## ql-(\d{8})-(\d{3})-([0-9a-fA-F]{4})\b/gm
  for (const f of listQuicklogFiles(quicklogDir)) {
    let content = ''
    try { content = readFileSync(join(quicklogDir, f), 'utf8') } catch { continue }
    let m
    re.lastIndex = 0
    while ((m = re.exec(content)) !== null) {
      if (m[1] === today) {
        maxSeq = Math.max(maxSeq, parseInt(m[2], 10))
        usedSuffix.add(m[3].toLowerCase())
      }
    }
  }
  return { maxSeq, usedSuffix }
}

// >500 行则轮转：rename QUICKLOG-<user>.md → QUICKLOG-<user>-<最后记录日期>.md
async function rotateIfNeeded(userFile, gitUser) {
  if (!existsSync(userFile)) return
  const content = readFileSync(userFile, 'utf8')
  const lines = content.split('\n')
  if (lines.length <= 500) return
  let lastDate = null
  for (let i = lines.length - 1; i >= 0; i--) {
    const m = lines[i].match(/^## ql-(\d{8})-/)
    if (m) { lastDate = m[1]; break }
  }
  const dateStr = lastDate
    ? `${lastDate.slice(0, 4)}-${lastDate.slice(4, 6)}-${lastDate.slice(6, 8)}`
    : nowDatetime().slice(0, 10)
  const archiveFile = join(dirname(userFile), `QUICKLOG-${gitUser}-${dateStr}.md`)
  // 同日已轮转过：两步各自原子化（append+clear 无法单原子，reader 容忍中间态——见 writeAtomic 注释）
  if (existsSync(archiveFile)) {
    const existing = readFileSync(archiveFile, 'utf8')
    await writeAtomic(archiveFile, existing + content)
    await writeAtomic(userFile, '')
  } else {
    renameSync(userFile, archiveFile)
  }
}

function tasksPath(specBase, change) {
  return join(specBase, 'changes', change, 'tasks.md')
}

// 追加未勾选 task；幂等（已含同 qlId 则跳过）
function appendTaskCheckbox(specBase, change, qlId, desc) {
  const dir = join(specBase, 'changes', change)
  mkdirSync(dir, { recursive: true })
  const p = tasksPath(specBase, change)
  let content = existsSync(p) ? readFileSync(p, 'utf8') : ''
  if (content.includes(qlId)) return
  const prefix = content && !content.endsWith('\n') ? '\n' : ''
  appendFileSync(p, `${prefix}- [ ] ${qlId} ${desc}\n`)
}

// 勾选该 qlId 对应 task：- [ ] → - [x]
async function checkTaskCheckbox(specBase, change, qlId) {
  const p = tasksPath(specBase, change)
  if (!existsSync(p)) return
  let content = readFileSync(p, 'utf8')
  const re = new RegExp(`- \\[ \\] (${escapeRe(qlId)})`)
  content = content.replace(re, '- [x] $1')
  await writeAtomic(p, content)
}

// 就地翻某 qlId 条目：状态进行中→已完成，追加结果行
// CRLF 修复（缺陷 quick-done-quicklog-duplicate-status-line）：QUICKLOG 在 Windows 下
// 可能是 CRLF，split('\n') 后每行带 \r。原代码 `lines[i] === '状态：进行中'` 精确匹配
// 恒失败 → 走 splice「兜底插入」→ 条目内同时出现「状态：已完成」+「状态：进行中」。
// 状态行匹配与「已完成」判断统一用行首前缀匹配，容忍行尾 \r；写入保持 CRLF 不扩大改动。
function flipEntryInContent(content, qlId, result) {
  const lines = content.split('\n')
  const startIdx = lines.findIndex(l => l.startsWith(`## ${qlId} |`))
  if (startIdx === -1) return null
  let endIdx = lines.length
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (lines[i].startsWith('## ')) { endIdx = i; break }
  }
  let hasResult = false
  let flipped = false
  for (let i = startIdx + 1; i < endIdx; i++) {
    if (/^状态：进行中\r?$/.test(lines[i])) { lines[i] = '状态：已完成'; flipped = true }
    if (lines[i].startsWith('结果：')) hasResult = true
  }
  if (!flipped && !lines.slice(startIdx, endIdx).some(l => /^状态：已完成\r?$/.test(l))) {
    // 无状态行（异常），插一条已完成
    lines.splice(startIdx + 1, 0, '状态：已完成')
    endIdx += 1
  }
  if (result && !hasResult) {
    // 多行结果（结构化 需求/根因/方案/结果 字段块）：逐行插入为独立字段行。
    // 单行结果：保持「结果：<一句话>」一行，向后兼容简单用例。
    if (/\r?\n/.test(result)) {
      const resultLines = result.split(/\r?\n/).filter(l => l.trim() !== '')
      lines.splice(endIdx, 0, ...resultLines)
    } else {
      lines.splice(endIdx, 0, `结果：${result}`)
    }
  }
  return lines.join('\n')
}

// ── 对外 API ──

/**
 * 分配 ql-ID 并写「进行中」条目 + 关联 tasks.md。持锁、当天唯一。
 * @returns {Promise<{qlId: string}>}
 */
export async function allocateQuicklogEntry(specBase, gitUser, { description, linkedChanges = [], allowedFiles = [] } = {}) {
  const quicklogDir = join(specBase, 'quicklog')
  mkdirSync(quicklogDir, { recursive: true })
  const user = gitUser || 'unknown'
  const userFile = join(quicklogDir, `QUICKLOG-${user}.md`)
  const lockPath = join(quicklogDir, `.QUICKLOG-${user}.md.lock`)
  const desc = sanitizeDesc(description)
  const linked = Array.isArray(linkedChanges) ? linkedChanges : []
  const files = Array.isArray(allowedFiles) ? allowedFiles : []
  const today = todayStamp()

  return await withFileLock(lockPath, async () => {
    const { maxSeq, usedSuffix } = scanExisting(quicklogDir, today)
    const nextSeq = maxSeq + 1
    // XXXX 4 位 hex 随机后缀（消歧；NNN 已在锁内顺序分配保证唯一，此处仅 belt-and-suspenders）
    let suffix
    let guard = 0
    do {
      suffix = randomBytes(2).toString('hex')
      guard++
    } while (usedSuffix.has(suffix) && guard < 100)

    await rotateIfNeeded(userFile, user)

    const qlId = `ql-${today}-${String(nextSeq).padStart(3, '0')}-${suffix}`
    const entry = [
      '',
      `## ${qlId} | ${nowDatetime()} | ${desc}`,
      '状态：进行中',
      `关联变更：${linked.length > 0 ? linked.join(', ') : '（无）'}`,
      `文件：${files.length > 0 ? files.join(', ') : '（见实际改动）'}`,
      '',
    ].join('\n')
    appendFileSync(userFile, entry)

    for (const c of linked) appendTaskCheckbox(specBase, c, qlId, desc)

    return { qlId }
  })
}

/**
 * 翻某 qlId 条目为「已完成」+ 追加结果 + 勾选关联 tasks.md。持锁。
 */
export async function completeQuicklogEntry(specBase, gitUser, qlId, { resultText = '', linkedChanges = [] } = {}) {
  const quicklogDir = join(specBase, 'quicklog')
  const lockPath = join(quicklogDir, `.QUICKLOG-${(gitUser || 'unknown')}.md.lock`)
  const result = sanitizeResult(resultText)
  const linked = Array.isArray(linkedChanges) ? linkedChanges : []

  await withFileLock(lockPath, async () => {
    // 条目可能在主文件或轮转归档中
    for (const f of listQuicklogFiles(quicklogDir)) {
      const filePath = join(quicklogDir, f)
      let content = ''
      try { content = readFileSync(filePath, 'utf8') } catch { continue }
      const updated = flipEntryInContent(content, qlId, result)
      if (updated !== null) {
        await writeAtomic(filePath, updated) // 命中处原子落盘（只改含目标条目的那一个文件）
        break
      }
    }
    for (const c of linked) await checkTaskCheckbox(specBase, c, qlId)
  })
}

/**
 * 查某 qlId 条目是否存在（只读，跨所有 QUICKLOG-*.md）。
 */
export function findQuicklogEntry(specBase, gitUser, qlId) {
  const quicklogDir = join(specBase, 'quicklog')
  if (!existsSync(quicklogDir)) return false
  const header = `## ${qlId} |`
  for (const f of listQuicklogFiles(quicklogDir)) {
    let content = ''
    try { content = readFileSync(join(quicklogDir, f), 'utf8') } catch { continue }
    if (content.includes(header)) return true
  }
  return false
}
