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
import { getRule } from './stage-contract-spec.js'
import {
  openSync, closeSync, unlinkSync, statSync, mkdirSync, existsSync,
  readFileSync, writeFileSync, writeSync, readdirSync, renameSync, appendFileSync,
} from 'fs'
import { randomBytes } from 'crypto'

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

/**
 * O_EXCL 文件锁。`openSync(lockPath,'wx')` 独占创建并写入持有者唯一 id；已存在则按
 * mtime 判 stale 偷锁（rename 原子抢占 + 内容校验），否则退避重试至超时。
 * CLI 短进程、低频写入，stale 阈值 30s 足够。
 *
 * 偷锁为何用 rename 而非 unlink（2026-08-20 体检 BUG-02）：两进程同偷一把 stale 锁时，
 * 后到者的 unlink 会把先到者刚重建的新锁删掉（TOCTOU）→ 双进程同时进临界区。
 * rename 到唯一名后比对内容：只有"观察时看到的那把锁"才允许删除；偷到并发者
 * 新建的锁则原路放回。残余窗口仅剩"纳秒级三方精确竞争"（放回前 existsSync 检查
 * 与 rename 之间），相比旧实现的必现双进已可忽略。
 * @param {string} lockPath 锁文件路径（建议与被保护文件同目录）
 * @param {() => (any|Promise<any>)} fn 临界区
 * @param {{staleMs?:number, timeoutMs?:number, retryMs?:number}} opts
 */
export async function withFileLock(lockPath, fn, opts = {}) {
  const { staleMs = 30000, timeoutMs = 10000, retryMs = 50 } = opts
  mkdirSync(dirname(lockPath), { recursive: true })
  const start = Date.now()
  const myId = `${process.pid}-${randomBytes(6).toString('hex')}`
  let fd = null
  // 抢锁循环
  while (true) {
    try {
      fd = openSync(lockPath, 'wx') // O_EXCL：已存在抛 EEXIST
      writeSync(fd, myId)
      break
    } catch (e) {
      if (e.code !== 'EEXIST') throw e
      // 锁已存在：判 stale（持有进程崩溃残留）
      try {
        const mtime = statSync(lockPath).mtimeMs
        if (Date.now() - mtime > staleMs) {
          try {
            const observed = readFileSync(lockPath, 'utf8') // 观察到的持有者 id
            const claim = `${lockPath}.steal-${randomBytes(6).toString('hex')}`
            renameSync(lockPath, claim) // 原子抢占：并发者只可能有一个 rename 成功
            if (readFileSync(claim, 'utf8') === observed) {
              try { unlinkSync(claim) } catch {} // 确实是那把 stale 锁 → 回收
            } else {
              // 偷到并发者新建的锁：放回（原位已被占则放弃，先占者保留）
              let restored = false
              try { if (!existsSync(lockPath)) { renameSync(claim, lockPath); restored = true } } catch {}
              if (!restored) { try { unlinkSync(claim) } catch {} }
            }
          } catch {}
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
export function sanitizeDesc(description) {
  const s = String(description || '').replace(/[\r\n]+/g, ' ').trim()
  if (!s) return '(quick 任务)'
  return s.length > 120 ? s.slice(0, 120) + '…' : s
}


// ── 平台推送（best-effort，2026-08-16-change-center-quick-tab task-06 / D-003）──

// 读 local.yaml platform 段（url+token）。quicklog 不 import sync.js（会拖 ProgressManager
// 整链），自带同款轻量解析：只取 platform.url / platform.token 两键，与 parseSimpleYaml
// 同风格（丢注释可接受——只读）。未连接返回 null（合法本地状态，静默跳过）。
function _readPlatformConfig(specBase) {
  try {
    // specBase 即 <cwd>/.sillyspec（或平台 specRoot）；local.yaml 就在 spec 根下
    const yamlPath = join(specBase, 'local.yaml')
    if (!existsSync(yamlPath)) return null
    const lines = readFileSync(yamlPath, 'utf8').split(/\r?\n/)
    let inPlatform = false
    const cfg = {}
    for (const line of lines) {
      if (!line.trim() || line.trim().startsWith('#')) continue
      if (!/^\s/.test(line)) inPlatform = line.startsWith('platform:')
      else if (inPlatform) {
        const m = line.match(/^\s+(url|token)\s*:\s*(.*)$/)
        if (m) {
          let v = m[2].trim()
          if (v.length >= 2 && ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))) v = v.slice(1, -1)
          if (v) cfg[m[1]] = v
        }
      }
    }
    if (!cfg.url || !cfg.token) return null
    return cfg
  } catch {
    return null
  }
}

const PUSH_TIMEOUT_MS = 5_000

// 从文件全文提取指定 qlId 的条目块（## 头到下一个 ## 头/文件尾）。null=未命中。
// 与平台 quicklog_parser.py 同款切分口径（剥 \r），保证 CLI 推送的 raw_block 与平台解析一致。
function extractRawBlock(content, qlId) {
  if (!content) return null
  const lines = content.split('\n')
  const start = lines.findIndex(l => l.replace(/\r$/, '').startsWith(`## ${qlId} |`))
  if (start === -1) return null
  let end = lines.length
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].replace(/\r$/, '').startsWith('## ')) { end = i; break }
  }
  return lines.slice(start, end).map(l => l.replace(/\r$/, '')).join('\n').trimEnd()
}

// 落盘条目块 → 推送 payload（design §5.3：以落盘终态为准，不从入参拼）。
// 宽松标签解析对齐平台：全半角冒号、多条状态行取最后、文件行单行/多行 bullet。
function buildPushPayloadFromRaw(rawBlock, { ql_id, author_raw, status, linked_changes, fallback_title }) {
  const payload = {
    ql_id,
    timestamp: null,
    title: fallback_title || '(quick 任务)',
    status,
    status_note: null,
    author_raw,
    linked_changes: Array.isArray(linked_changes) ? linked_changes : [],
    files: [],
    body_sections: {},
    raw_block: rawBlock,
  }
  if (!rawBlock) return payload
  const lines = rawBlock.split('\n')
  const header = lines[0] || ''
  const parts = header.split('|').map(s => s.trim())
  if (parts.length >= 3) {
    payload.timestamp = parts[1] || null
    payload.title = parts.slice(2).join('|').trim() || payload.title
  }
  const labelRe = /^(状态|关联变更|文件|审计|需求|根因|方案|结果)\s*[：:]\s*(.*)$/
  const bulletRe = /^-\s+(.*)$/
  let inFiles = false
  let inLinked = false
  let lastLabel = null
  let lastStatus = null
  for (const line of lines.slice(1)) {
    const stripped = line.trim()
    if (!stripped) { inFiles = false; inLinked = false; continue }
    const m = stripped.match(labelRe)
    if (m) {
      const [, label, value] = m
      if (label === '状态') lastStatus = value
      else if (label === '关联变更') { payload.linked_changes = value.split(/[，,、+；;]/).map(s => s.trim()).filter(Boolean); inLinked = true; inFiles = false }
      else if (label === '文件') { if (value) payload.files.push(...value.split(/[，,、+；;]/).map(s => s.trim()).filter(Boolean).map(p => ({ path: p, note: null }))); inFiles = true; inLinked = false }
      else if (label === '审计') { /* D-8 advisory 行：只进 raw_block 不进结构化段（body_sections 不扩 schema），并阻断续行误挂 */ lastLabel = null; inFiles = false; inLinked = false }
      else { payload.body_sections[label] = value; lastLabel = label }
      continue
    }
    if (bulletRe.test(stripped) && inFiles) {
      payload.files.push({ path: stripped.replace(/^-\s+/, ''), note: null })
      continue
    }
    if (bulletRe.test(stripped) && inLinked) {
      payload.linked_changes.push(...stripped.replace(/^-\s+/, '').split(/[，,、+；;]/).map(s => s.trim()).filter(Boolean))
      continue
    }
    if (lastLabel) payload.body_sections[lastLabel] += '\n' + stripped
  }
  // 状态以落盘为准（flip 后是「已完成」或「已完成（括注）」）——多条取最后
  if (lastStatus) {
    payload.status = lastStatus.startsWith('已完成') ? 'completed'
      : lastStatus.startsWith('已暂存') ? 'partial_done'
      : lastStatus.startsWith('进行中') ? 'in_progress'
      : status
    const note = lastStatus.match(/（(.+)）$/)
    payload.status_note = note ? note[1] : null
  }
  // 白名单正则对齐平台（^\d{4}-\d{2}-\d{2}- 才进列表，防自由文本进反向区块）
  payload.linked_changes = payload.linked_changes.filter(c => /^\d{4}-\d{2}-\d{2}-/.test(c))
  return payload
}

// 单条推送：payload 字段对齐平台 QuicklogEntryPushRequest（snake_case）。测试经 allocate/complete 间接触发。
// 任何失败（无配置/网络/非 2xx/超时）静默 warn 一行不抛（FR-02 best-effort，quick 主流程零阻断）。
async function pushQuicklogEntryToPlatform(specBase, entry) {
  const cfg = _readPlatformConfig(specBase)
  if (!cfg) {
    if (process.env.SILLYSPEC_DEBUG_SYNC) console.warn('[quicklog-push] 未配置 platform 段，跳过推送')
    return false
  }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), PUSH_TIMEOUT_MS)
  try {
    const res = await fetch(`${cfg.url.replace(/\/$/, '')}/api/quicklog-entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.token}` },
      body: JSON.stringify(entry),
      signal: controller.signal,
    })
    if (!res.ok) {
      console.warn(`[quicklog-push] ${entry.ql_id} → ${res.status}（文件链路兜底，不影响本地记录）`)
      return false
    }
    return true
  } catch (err) {
    console.warn(`[quicklog-push] ${entry.ql_id} 推送失败: ${err && err.name === 'AbortError' ? '超时' : (err.message || err)}（文件链路兜底）`)
    return false
  } finally {
    clearTimeout(timer)
  }
}

// git user.name → 文件名安全形式：白名单保留字母数字._- 与中文等 Unicode 字，
// 剥路径元字符（/ \ ..）与控制字符。防 QUICKLOG-<user>.md / 锁文件 / 轮转归档穿越写。
function sanitizeQuicklogUser(user) {
  const s = String(user || '').replace(/[\\/\r\n\0]/g, '').replace(/\.{2,}/g, '.').trim()
  if (!s) return ''
  return s.length > 64 ? s.slice(0, 64) : s
}

// 从关联变更的 proposal/design 提取首个 # 标题（去「提案书（Proposal）— / 设计文档（Design）—」固定前缀）。
// 让 quick --linked-changes 启动时（用户常不带 --input）也能拿到语义标题，而非 (quick 任务) 占位。
// 读不到任何标题返回 ''（调用方再回退占位符，保持向后兼容）。
export function deriveTitleFromLinkedChange(specBase, change) {
  if (!change) return ''
  for (const f of ['proposal.md', 'design.md']) {
    let content
    try { content = readFileSync(join(specBase, 'changes', change, f), 'utf8') } catch { continue }
    const m = content.match(/^#\s+(.+?)\s*$/m)
    if (!m) continue
    const raw = m[1].trim()
    // 标题惯例「# 提案书（Proposal）— <desc>」「# 设计文档（Design）— <desc>」→ 取破折号后的 desc
    const dash = raw.match(/[—-]\s*(.+)$/)
    return dash ? dash[1].trim() : raw
  }
  return ''
}

// 从 quick step3 --output 四字段提取「需求：」摘要，用于翻完成时刷新标题行
// （覆盖启动时的占位/弱标题）。提取失败返回 ''（不刷新）。
export function extractTitleFromResult(result) {
  if (!result) return ''
  const m = String(result).match(/需求：([^\n\r]*?)(?:\s+根因：|$)/)
  if (!m) return ''
  let t = m[1].replace(/[，。；,;].*$/, '').trim() // 截到首个标点，取核心句
  if (!t) return ''
  if (t.length > 80) t = t.slice(0, 80) + '…'
  return t
}

function sanitizeResult(resultText) {
  // 保留换行：结果块支持字段化结构（需求：/根因：/方案：/结果：...）。多行时 flipEntryInContent
  // 写成字段块（追加在「状态：」行下方），不是单条「结果：<长行>」。仅去首尾空白。
  return String(resultText || '').trim()
}

// ── quick step3 --file-notes 旁路通道 ──
// flag 在 command.js 解析（--file-notes），completeQuicklogEntry 在 quick 收尾时消费。
// 不经 completeStep → handleQuickStageCompletion → completeQuicklogEntry 三层透传（会扩 3 处签名，
// 且 quick 收尾路径是多 agent 并发改热点）；用 per-process setter，CLI 单进程生命周期内有效，
// completeQuicklogEntry 读后即清。无 --file-notes 时为 '' → 回退 changedFiles 单行（向后兼容）。
let _pendingFileNotes = ''
export function setQuickFileNotes(raw) { _pendingFileNotes = raw == null ? '' : String(raw) }
export function getQuickFileNotes() { return _pendingFileNotes }

/**
 * 解析 --file-notes 原文 → [{path, note}]。
 * 格式：「path1::括注1 || path2::括注2」——`||` 分隔条目，`::` 分隔路径与括注（首个 `::` 为界，
 * 括注内含 `::` 不误切）；路径反斜杠归一正斜杠（匹配 git 路径风格）。无 `::` 的段 → note=''。
 * 空 / 全空段 → []（调用方回退 changedFiles 单行）。导出供测试 + 未来直接调用。
 */
export function parseFileNotes(raw) {
  if (!raw) return []
  // note 单行化 + 限长：bullet 是「数组元素内嵌 \n」落盘（flipEntryInContent），note 带换行会伪造
  // QUICKLOG 条目结构（\n## ql-… 可伪造后续条目头）。与 sanitizeDesc 同风格。
  const sanitizeNote = (n) => n.replace(/[\r\n]+/g, ' ').trim().slice(0, 200)
  return String(raw)
    .split('||')
    .map((seg) => {
      const s = seg.trim()
      if (!s) return null
      const idx = s.indexOf('::')
      const path = (idx === -1 ? s : s.slice(0, idx)).replace(/\\/g, '/').trim()
      const note = idx === -1 ? '' : sanitizeNote(s.slice(idx + 2))
      return path ? { path, note } : null
    })
    .filter(Boolean)
}

// 结果块必填字段（quick step3 --done --output 的结构化结果模板，见 src/stages/quick.js）。
// 4 个必填字段标签从 manifest 同源(stage-contract-spec.js quick.result-labels),prompt 事前契约与本校验单源。
const RESULT_REQUIRED_LABELS = getRule('quick.result-labels').data.literals

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
  const tmp = join(dirname(filePath), basename(filePath) + '.tmp-' + process.pid + '-' + randomBytes(4).toString('hex')) // 随机段：Windows PID 重用激进，仅 pid 会撞名（对齐 fs-atomic.js 的同款修复）
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
  // E22c：轮转归档按文件名日期过滤——归档名 = QUICKLOG-<user>-<YYYY-MM-DD>.md（最后条目日期），
  // 归档内全部条目 ≤ 名内日期；名内日期早于今天的归档不可能含当日条目，跳过读取
  // （O(全历史归档) → O(当日文件)，consumer 已 10 归档文件 756KB 时免全量扫描）。
  const todayDashed = today.length === 8 ? `${today.slice(0, 4)}-${today.slice(4, 6)}-${today.slice(6, 8)}` : today
  for (const f of listQuicklogFiles(quicklogDir)) {
    const dm = f.match(/-(\d{4}-\d{2}-\d{2})\.md$/)
    if (dm && dm[1] < todayDashed) continue // 早于今天的归档，必无当日条目
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
  const archiveFile = join(dirname(userFile), `QUICKLOG-${sanitizeQuicklogUser(gitUser) || 'unknown'}-${dateStr}.md`)
  // 同日已轮转过：两步各自原子化（append+clear 无法单原子，reader 容忍中间态——见 writeAtomic 注释）
  if (existsSync(archiveFile)) {
    const existing = readFileSync(archiveFile, 'utf8')
    await writeAtomic(archiveFile, existing + content)
    await writeAtomic(userFile, '')
  } else {
    renameSync(userFile, archiveFile)
  }
  // echo 轮转：归档文件是 git 跟踪的新文件，提交时带上（勿漏，否则旧 ql 条目只在本地）
  console.log(`🔄 QUICKLOG 已轮转（>500 行）：${basename(userFile)} → ${basename(archiveFile)}（提交时带上归档文件，勿漏）`)
}

function tasksPath(specBase, change) {
  return join(specBase, 'changes', change, 'tasks.md')
}

// 追加未勾选 task；幂等（已含同 qlId 则跳过）。
// 关联变更目录不存在（笔误 / 未建 / 仅作标签关联）→ 不 fabricate stub 目录（历史坑 quick-change-phantom：
// mkdirSync 硬造 changes/<名>/tasks.md，致 quick --done 边界审计自造自拦 BLOCK）。关联仍记入
// QUICKLOG「关联变更」行（allocateQuicklogEntry 独立写入，不依赖本函数）。
// 体检 BUG-17：tasks.md 是跨用户共享文件——QUICKLOG 按 <user> 分锁只串行化同用户会话，
// 用户 A 勾选与用户 B 追加跨用户并发时须按目标文件加锁，否则读-改-写互相覆盖。
function tasksLockPath(p) {
  return p + '.tasklock'
}

async function appendTaskCheckbox(specBase, change, qlId, desc) {
  const dir = join(specBase, 'changes', change)
  if (!existsSync(dir)) return
  const p = tasksPath(specBase, change)
  await withFileLock(tasksLockPath(p), () => {
    let content = existsSync(p) ? readFileSync(p, 'utf8') : ''
    if (content.includes(qlId)) return
    const prefix = content && !content.endsWith('\n') ? '\n' : ''
    appendFileSync(p, `${prefix}- [ ] ${qlId} ${desc}\n`)
  })
}

// 勾选该 qlId 对应 task：- [ ] → - [x]（同 BUG-17：按 tasks.md 文件锁串行化跨用户读-改-写）
async function checkTaskCheckbox(specBase, change, qlId) {
  const p = tasksPath(specBase, change)
  if (!existsSync(p)) return
  await withFileLock(tasksLockPath(p), async () => {
    let content = readFileSync(p, 'utf8')
    const re = new RegExp(`- \\[ \\] (${escapeRe(qlId)})`)
    content = content.replace(re, '- [x] $1')
    await writeAtomic(p, content)
  })
}

// 就地翻某 qlId 条目：状态进行中→已完成，追加结果行
// CRLF 修复（缺陷 quick-done-quicklog-duplicate-status-line）：QUICKLOG 在 Windows 下
// 可能是 CRLF，split('\n') 后每行带 \r。原代码 `lines[i] === '状态：进行中'` 精确匹配
// 恒失败 → 走 splice「兜底插入」→ 条目内同时出现「状态：已完成」+「状态：进行中」。
// 状态行匹配与「已完成」判断统一用行首前缀匹配，容忍行尾 \r；写入保持 CRLF 不扩大改动。
// 单行四字段（需求：/根因：/方案：/结果：）切段。先按「字段边界」严格扫描：真实标签 = 上一标签之后首次
// 出现的、前导是串首/空白/句末标点（。；！？）的对应标签——字段正文引用标签字样（根因写「双层「结果：」
// 前缀」或正则 split(/(?=需求：|根因：|方案：|结果：)/)）因前导是「/|( 等非边界字符而跳过。严格失败
// （如真实标签前导是「，」这类弱标点）退回宽松顺序扫描（上一标签之后首次出现）。缺标签返回 null → 落单行
// 兜底（--done 契约校验仍会拦缺字段）。残余边界：正文引用标签且前导恰好是空白/句末标点时仍可能错位。
function isFieldBoundary(body, idx) {
  if (idx <= 0) return true
  const prev = body[idx - 1]
  return /\s/.test(prev) || '。；！？'.includes(prev)
}
function findBoundaryLabel(body, label, from) {
  let idx = body.indexOf(label, from)
  while (idx !== -1 && !isFieldBoundary(body, idx)) {
    idx = body.indexOf(label, idx + label.length)
  }
  return idx
}
function scanFields(body, findLabel) {
  const labels = ['需求：', '根因：', '方案：', '结果：']
  const positions = []
  let cursor = 0
  for (const label of labels) {
    const idx = findLabel(body, label, cursor)
    if (idx === -1) return null
    positions.push(idx)
    cursor = idx + label.length
  }
  return positions.map((start, i) => {
    const end = i + 1 < positions.length ? positions[i + 1] : body.length
    return body.slice(start, end).trim()
  })
}
function splitSingleLineFields(body) {
  return scanFields(body, findBoundaryLabel) ?? scanFields(body, (b, l, f) => b.indexOf(l, f))
}

function flipEntryInContent(content, qlId, result, changedFiles = [], fileNotes = [], auditNotes = []) {
  const lines = content.split('\n')
  const startIdx = lines.findIndex(l => l.startsWith(`## ${qlId} |`))
  if (startIdx === -1) return null
  // 翻完成时若能从结果提取「需求：」摘要，刷新标题行（覆盖启动时的占位/弱标题）
  const newTitle = extractTitleFromResult(result)
  if (newTitle) {
    const headerCore = lines[startIdx].match(/^(## \S+ \| [^|]+ \| )/)
    if (headerCore) lines[startIdx] = headerCore[1] + newTitle
  }
  let endIdx = lines.length
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (lines[i].startsWith('## ')) { endIdx = i; break }
  }
  let hasResult = false
  let flipped = false
  for (let i = startIdx + 1; i < endIdx; i++) {
    if (/^状态：进行中\r?$/.test(lines[i])) { lines[i] = '状态：已完成'; flipped = true }
    if (lines[i].startsWith('结果：')) hasResult = true
    // 文件行落盘：--file-notes 优先（多行 bullet 带括注），否则回填审计到的实际改动文件单行，
    // 都空则不动（保持「（见实际改动）」）。bullet 用「数组元素内嵌 \n」写——lines.join('\n') 展平为
    // 多行，数组长度不变 → 与下方状态/结果 splice 的索引完全解耦（changedFiles 单行同理原地替换）。
    if (lines[i].startsWith('文件：')) {
      if (fileNotes.length > 0) {
        const bullets = fileNotes.map((n) => `- ${n.path}${n.note ? `（${n.note}）` : ''}`)
        lines[i] = `文件：\n${bullets.join('\n')}`
      } else if (changedFiles.length > 0) {
        lines[i] = `文件：${changedFiles.join(', ')}`
      }
    }
  }
  if (!flipped && !lines.slice(startIdx, endIdx).some(l => /^状态：已完成\r?$/.test(l))) {
    // 无状态行（异常），插一条已完成
    lines.splice(startIdx + 1, 0, '状态：已完成')
    endIdx += 1
  }
  if (result && !hasResult) {
    // quick step3 --output 常被压成单行「需求：…根因：…方案：…结果：…」（agent 未加换行），
    // 直接落盘会得到双层前缀「结果：需求：…结果：…」。把单行四字段归一为多行字段块，省 agent 手工
    // 拆行精修（prompt-control-debt quick-①）。多行 / 单句结果不受影响。
    let body = result
    if (!/\r?\n/.test(body) && /^需求：/.test(body)) {
      // 单行四字段归一为多行。不能 split(/(?=需求：|根因：|方案：|结果：)/)——正文引用字段标签字样
      // （如根因里写「双层「结果：」前缀」）会被任意位置误切。改按序扫描：真实标签 = 上一标签之后
      // 首次出现，字段正文引用更靠后的标签不误断（quick-① 2026-08-04 实证补丁）。缺标签返回 null
      // → 落单行兜底（--done 契约校验仍会拦缺字段）。
      const segs = splitSingleLineFields(body)
      if (segs) body = segs.join('\n')
    }
    // 多行结果（结构化 需求/根因/方案/结果 字段块）：逐行插入为独立字段行。
    // 单行结果：保持「结果：<一句话>」一行，向后兼容简单用例。
    const resultLines = /\r?\n/.test(body)
      ? body.split(/\r?\n/).filter(l => l.trim() !== '')
      : [`结果：${body}`]
    // 结果块属本条目：从 endIdx 往前跳过本条目尾部空行，在最后一个非空行之后插入。
    // 否则结果块会落在尾空行「之后」，与下一条目标题紧贴（缺空行分隔），且被空行从本条目
    // 「文件：」行隔开——视觉上像属于下一条目（用户实证多条目 QUICKLOG 间距 bug）。
    let insertAt = endIdx
    while (insertAt - 1 > startIdx && lines[insertAt - 1].trim() === '') insertAt--
    lines.splice(insertAt, 0, ...resultLines)
    // 兜底：结果块之后、下一个 ## 标题之间若无空行（条目原本无尾空行 / 轮转归档手改等），补一个。
    const after = insertAt + resultLines.length
    if (after < lines.length && lines[after].startsWith('## ')) {
      lines.splice(after, 0, '')
    }
  }
  // D-8 落盘（2026-08-18 修）：advisory 审计行（文档欠账 / 引用失效）写入条目尾部——修复
  // quick-audit「欠账已记录（QUICKLOG reasons）」的不实承诺（原先纯 console 打印，事后不可审计；
  // 两周实测需要分母：信号触发次数必须可追溯）。幂等：条目内已有 审计： 行则不重复写（--done 重跑安全）。
  // 位置：结果块之后 / 条目尾部（重算边界，不吃上方 splice 的陈旧索引）。
  if (auditNotes.length > 0) {
    let entryEnd = -1
    for (let i = startIdx + 1; i < lines.length; i++) {
      if (lines[i].startsWith('## ')) { entryEnd = i; break }
    }
    if (entryEnd === -1) entryEnd = lines.length
    if (!lines.slice(startIdx, entryEnd).some((l) => l.startsWith('审计：'))) {
      let insertAt = entryEnd
      while (insertAt - 1 > startIdx && lines[insertAt - 1].trim() === '') insertAt--
      lines.splice(insertAt, 0, ...auditNotes.map((n) => `审计：${n}`))
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
  // git user.name 无字符限制，可含 / \ .. 等路径元字符（git config 或 .git/config 可控）——
  // 白名单消毒防穿越写（QUICKLOG-<user>.md / 锁文件 / 轮转归档三处拼接），与 assertSafeChangeName 同风格
  const user = sanitizeQuicklogUser(gitUser) || 'unknown'
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

    for (const c of linked) await appendTaskCheckbox(specBase, c, qlId, desc)

    // 平台推送（task-06 / FR-02 / D-003）：锁外语义等同（推送不回写本地），但放锁内
    // 保证「分配即推送」顺序一致；best-effort 失败不影响返回。
    await pushQuicklogEntryToPlatform(specBase, {
      ql_id: qlId,
      timestamp: nowDatetime(),
      title: desc,
      status: 'in_progress',
      status_note: null,
      author_raw: user,
      // 白名单正则对齐平台（^\d{4}-\d{2}-\d{2}- 才进列表；原文在 raw_block 不丢）
      linked_changes: linked.filter(c => /^\d{4}-\d{2}-\d{2}-/.test(c)),
      files: files.map(f => ({ path: f, note: null })),
      body_sections: {},
      raw_block: entry,
    }).catch(() => {}) // pushQuicklogEntryToPlatform 自身已吞错；双保险防未来改动破坏 best-effort 契约

    return { qlId }
  })
}

/**
 * 翻某 qlId 条目为「已完成」+ 追加结果 + 勾选关联 tasks.md。持锁。
 */
export async function completeQuicklogEntry(specBase, gitUser, qlId, { resultText = '', linkedChanges = [], changedFiles = [], auditNotes = [] } = {}) {
  const quicklogDir = join(specBase, 'quicklog')
  // 与 allocateQuicklogEntry 同源消毒：锁文件路径含 user（防穿越写，两入口必须一致否则锁不上同一文件）
  const user = sanitizeQuicklogUser(gitUser) || 'unknown'
  const lockPath = join(quicklogDir, `.QUICKLOG-${user}.md.lock`)
  const result = sanitizeResult(resultText)
  const linked = Array.isArray(linkedChanges) ? linkedChanges : []
  // 实际改动文件（调用方 complete-handlers 已用 isQuickMetadata 过滤 quick 自身元数据）。空 → 不动文件行。
  const realFiles = Array.isArray(changedFiles) ? changedFiles.filter(Boolean) : []
  // --file-notes（command.js 经 setQuickFileNotes 注入）：有则文件行写多行 bullet 带括注。
  // 读后即清（per-process，防残留跨调用）。flipEntryInContent 优先用 fileNotes，空则回退 realFiles。
  const fileNotes = parseFileNotes(_pendingFileNotes)
  _pendingFileNotes = ''

  await withFileLock(lockPath, async () => {
    // 条目可能在主文件或轮转归档中
    let updatedContent = null
    let updatedFile = null
    for (const f of listQuicklogFiles(quicklogDir)) {
      const filePath = join(quicklogDir, f)
      let content = ''
      try { content = readFileSync(filePath, 'utf8') } catch { continue }
      const updated = flipEntryInContent(content, qlId, result, realFiles, fileNotes,
        Array.isArray(auditNotes) ? auditNotes.filter((n) => typeof n === 'string' && n.trim() !== '') : [])
      if (updated !== null) {
        await writeAtomic(filePath, updated) // 命中处原子落盘（只改含目标条目的那一个文件）
        updatedContent = updated
        updatedFile = filePath
        break
      }
    }
    for (const c of linked) await checkTaskCheckbox(specBase, c, qlId)

    // 平台推送（task-06 / FR-02 / D-003）：**以落盘终态为准**读回条目组装 payload
    // （design §5.3：翻完成时标题行被 extractTitleFromResult 刷新，推送须与落盘一致，
    // 不能用入参拼——标题/结果块/文件行都会在 flipEntryInContent 中重写）。
    const rawBlock = extractRawBlock(updatedContent, qlId)
    await pushQuicklogEntryToPlatform(specBase, buildPushPayloadFromRaw(rawBlock, {
      ql_id: qlId,
      author_raw: user,
      status: 'completed',
      linked_changes: linked,
    })).catch(() => {})
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
