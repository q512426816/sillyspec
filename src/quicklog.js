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
import { join, dirname, basename, resolve, relative, isAbsolute } from 'path'
import { getRule } from './stage-contract-spec.js'
import {
  openSync, closeSync, unlinkSync, statSync, mkdirSync, existsSync,
  readFileSync, writeFileSync, writeSync, readdirSync, renameSync, appendFileSync, rmSync,
} from 'fs'
import { randomBytes } from 'crypto'
import { safeGit } from './git-helper.js'

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
 * @param {{staleMs?:number, timeoutMs?:number, retryMs?:number, content?:string}} opts
 *   content：锁文件内容（默认 pid-randomId）。供超时报错时展示持有者语义（如 apply 锁写
 *   {pid, changeName}）——仅展示用途，抢占/偷锁逻辑只比对内容一致性不解析语义。
 */
export async function withFileLock(lockPath, fn, opts = {}) {
  const { staleMs = 30000, timeoutMs = 10000, retryMs = 50, content = null } = opts
  mkdirSync(dirname(lockPath), { recursive: true })
  const start = Date.now()
  const myId = content || `${process.pid}-${randomBytes(6).toString('hex')}`
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
          // 偷锁重试前同样受超时与退避约束（坑 quicklog-lock-steal-spin，2026-09-12 审查批 A-③）：
          // 旧版 continue 直接跳过下方检查——锁文件被 AV/索引器长期占用、renameSync 持续失败
          // （每次被外层 catch 吞掉）时忙等自旋：不检查 timeoutMs、不让出 CPU，命令挂死 + 100% CPU。
          if (Date.now() - start > timeoutMs) {
            throw new Error(`文件锁超时（${timeoutMs}ms）: ${lockPath}`)
          }
          await sleep(retryMs)
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
    // 释放前校验持有者身份（坑 quicklog-lock-release-mismatch，2026-09-12 审查批 A-③）：
    // 本进程临界区超 staleMs 被他进程偷锁后，lockPath 上可能是**他人新建**的锁——无条件
    // unlink 误删它会让第三方抢锁成功，形成双进程并发临界区。仅内容仍为本会话 myId 才删
    // （读失败=锁已不在/被偷，容忍——偷锁路径自会回收旧 claim）。
    try {
      if (readFileSync(lockPath, 'utf8') === myId) unlinkSync(lockPath)
    } catch {}
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
/**
 * QUICKLOG 结构化 sidecar（P1-4，noai-ir-roadmap §4）：completeQuicklogEntry 组装 payload 的
 * 同时把终态结构落 .runtime/quicklog-sidecar/<qlId>.json——一次解析持久化，daemon/查询/重推
 * 直读结构化数据不必再解析 md（md 只给人看）。fail-soft：sidecar 是加速层不是正确性依赖，
 * 落盘失败零阻断（读取侧自动回退 md 解析路径）。
 */
const QUICKLOG_SIDECAR_SCHEMA_VERSION = 1

export function quicklogSidecarPath(specBase, qlId) {
  return join(specBase, '.runtime', 'quicklog-sidecar', `${qlId}.json`)
}

export function writeQuicklogSidecar(specBase, payload) {
  if (!payload || !payload.ql_id) return false
  try {
    const p = quicklogSidecarPath(specBase, payload.ql_id)
    mkdirSync(dirname(p), { recursive: true })
    writeAtomic(p, JSON.stringify({ schemaVersion: QUICKLOG_SIDECAR_SCHEMA_VERSION, ...payload }, null, 2) + String.fromCharCode(10))
    return true
  } catch {
    return false
  }
}

export function readQuicklogSidecar(specBase, qlId) {
  try {
    const rec = JSON.parse(readFileSync(quicklogSidecarPath(specBase, qlId), 'utf8'))
    return rec && rec.schemaVersion === QUICKLOG_SIDECAR_SCHEMA_VERSION ? rec : null
  } catch {
    return null
  }
}

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
  // 顶层标签白名单（^ 行首锚定）：D-004@v1 根因块嵌套四子字段（- 现象：/- 根因：/- 护栏：/- 证据： 列表行）
  // 因「- 」前缀不匹配本正则——它们是根因块正文内的列表行续行，不是新顶层标签，经 lastLabel 挂载
  // 进 body_sections[根因]（见下方 inFiles 复位注释）。顶层四字段边界解析不受影响（R-03）。
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
      // 进入 需求/根因/方案/结果 字段块须关闭 inFiles/inLinked 续行模式（task-07 / D-004@v1）：否则根因块内
      // 嵌套子字段列表行（- 现象：… 等）会命中下方「文件 bullet」分支被劫进 payload.files，从根因正文截断丢失。
      else { payload.body_sections[label] = value; lastLabel = label; inFiles = false; inLinked = false }
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
    let raw = m[1].trim()
    // 标题惯例「# 提案书（Proposal）— <desc>」「# 设计文档（Design）— <desc>」→ 取破折号后的 desc。
    // 固定前缀显式剥（坑 linked-task-placeholder-title，2026-08-22 实证：标题「# 提案书（Proposal）:
    // xxx」或「# 提案书（Proposal）」无破折号时 dash 匹配失败，整串前缀落进 tasks.md 追加行）——
    // 先剥固定模板词（含全/半角冒号分隔形态），再剥破折号；剥完为空（纯模板标题）继续找下一文档
    for (const prefix of [/^提案书（Proposal）\s*[：:—\-]?\s*/, /^设计文档（Design）\s*[：:—\-]?\s*/, /^Proposal\s*[：:—\-]?\s*/i, /^Design\s*[：:—\-]?\s*/i]) {
      raw = raw.replace(prefix, '').trim()
    }
    if (!raw) continue
    const dash = raw.match(/[—-]\s*(.+)$/)
    const title = dash ? dash[1].trim() : raw
    if (title) return title
  }
  return ''
}

// 从 quick step3 --output 四字段提取「需求：」摘要，用于翻完成时刷新标题行
// （覆盖启动时的占位/弱标题）。提取失败返回 ''（不刷新）。
export function extractTitleFromResult(result) {
  if (!result) return ''
  const m = String(result).match(/需求：([^\n\r]*?)(?:\s+根因：|$)/)
  if (!m) return ''
  // 不再截到首个标点（2026-09-08 用户反馈②）：旧口径迫使 agent 刻意避开标点写标题，
  // 「A，B」被截成「A」反而降低可读性。--req 的模板指引本就要求一句话短标题，
  // 标点由写者自主掌控；CLI 只兜底超长截断。
  let t = m[1].trim()
  if (!t) return ''
  if (t.length > 80) {
    // 超长截断优先在标点/空格处断（标题残句可读），找不到就近边界才硬截。
    const cut = t.slice(0, 80)
    const m2 = cut.match(/^[\s\S]*[，。；：,;:]\s*/)
    t = (m2 && m2[0].length >= 40 ? m2[0] : cut).replace(/[，。；：,;:\s]+$/, '') + '…'
  }
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

/**
 * 校验 --file-notes 原文格式（坑 quick-file-notes-format-silent，2026-08-24 用户反馈二期②：
 * 多文件分隔符是 `||` 双竖线，写错成 `|`/`,` 时整段被当成第一个文件的括注静默落盘，只能手工修
 * QUICKLOG）。命令入口 fail-fast 用：每个 `||` 段必须是 `path::括注`（`::` 必填，括注可空）；
 * 括注内再出现 `::` 视为疑似漏写 `||` 分隔符。返回问题清单供调用方拼报错。
 * @param {string} raw
 * @returns {{ ok: boolean, problems: Array<{ seg: string, reason: string, hint: string }> }}
 */
export function validateFileNotesFormat(raw) {
  const problems = []
  if (!raw) return { ok: true, problems }
  for (const seg of String(raw).split('||')) {
    const s = seg.trim()
    if (!s) continue
    const idx = s.indexOf('::')
    if (idx === -1) {
      problems.push({ seg: s, reason: '缺 `::` 路径/括注分隔符', hint: '格式为 path::括注；不要括注也要写 path::（括注可空）' })
      continue
    }
    const path = s.slice(0, idx).trim()
    if (!path) {
      problems.push({ seg: s, reason: '`::` 前路径为空', hint: '格式为 path::括注' })
      continue
    }
    if (s.slice(idx + 2).includes('::')) {
      problems.push({ seg: s, reason: '括注内出现 `::`', hint: '疑似多文件漏写 `||` 分隔符（双竖线）——多文件写法：path1::括注1 || path2::括注2' })
    }
  }
  return { ok: problems.length === 0, problems }
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
  // 子串包含判定：根因块含嵌套四子字段列表行（- 现象：… 等，task-07 / D-004@v1 合法形态）时，
  // 顶层四标签仍须齐备（模板契约），嵌套行不影响判定（「- 」前缀不构成顶层标签，亦不缺字段）。
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

// 扫描所有 QUICKLOG-*.md（含轮转归档）当天最大 NNN + 已用 XXXX 后缀集 + 当天已用全 ID 集
// （坑 ql-id-double-occupancy 配套：全 ID 集供分配末检防整 ID 复用；容错正则见下）
function scanExisting(quicklogDir, today) {
  let maxSeq = 0
  const usedSuffix = new Set()
  const usedIds = new Set()
  const re = /^## ql-(\d{8})-(\d{3})-([0-9a-fA-F]{4})\b/gm
  // 容错形态：手改/工具写入的畸形头（双空格、后缀紧贴 |）不匹配严格正则 → maxSeq 漏计 →
  // 新分配复用同序号。第二正则只宽松空白，日期/序号/后缀结构仍须齐整；命中的序号并入
  // maxSeq（防同序号双条目），全 ID 进 usedIds（防整 ID 复用）。引用字样（行首带前缀）不命中。
  const reLoose = /^##[ \t]*ql-(\d{8})-(\d{3})-([0-9a-fA-F]{4})[ \t]*\|/gm
  // E22c：轮转归档按文件名日期过滤——归档名 = QUICKLOG-<user>-<YYYY-MM-DD>.md（最后条目日期），
  // 归档内全部条目 ≤ 名内日期；名内日期早于今天的归档不可能含当日条目，跳过读取
  // （O(全历史归档) → O(当日文件)，consumer 已 10 归档文件 756KB 时免全量扫描）。
  const todayDashed = today.length === 8 ? `${today.slice(0, 4)}-${today.slice(4, 6)}-${today.slice(6, 8)}` : today
  for (const f of listQuicklogFiles(quicklogDir)) {
    const dm = f.match(/-(\d{4}-\d{2}-\d{2})\.md$/)
    if (dm && dm[1] < todayDashed) continue // 早于今天的归档，必无当日条目
    let content = ''
    try { content = readFileSync(join(quicklogDir, f), 'utf8') } catch { continue }
    for (const reOne of [re, reLoose]) {
      let m
      reOne.lastIndex = 0
      while ((m = reOne.exec(content)) !== null) {
        if (m[1] === today) {
          maxSeq = Math.max(maxSeq, parseInt(m[2], 10))
          usedSuffix.add(m[3].toLowerCase())
          usedIds.add(`ql-${today}-${m[2]}-${m[3].toLowerCase()}`)
        }
      }
    }
  }
  return { maxSeq, usedSuffix, usedIds }
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
// task-07 / D-004@v1 声明：本切分只作用于「单行四字段压缩归一」路径，嵌套四子字段（- 现象：/- 根因：/
// - 护栏：/- 证据： 列表行）必须以多行列表行形态写入根因块正文——按序扫描先命中顶层「根因：」标签，
// 其后的嵌套「- 根因：」等字样落在根因字段正文内不构成新边界，无需改动三个边界函数即天然兼容（Grill C-15）。
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

function flipEntryInContent(content, qlId, result, changedFiles = [], fileNotes = [], auditNotes = [], softFiles = []) {
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
      // 软归属（2026-09-10 用户反馈）：softFiles = 审计判定的「窗口内未声明同模块测试文件」——
      // 补入文件行 bullet 带括注标记，消每回手工核对；fileNotes 已显式括注的不重复加。
      // fileNotes 空但有 softFiles 时同样升级 bullet（单行格式放不下括注标记）。
      const notedPaths = new Set(fileNotes.map((n) => n.path))
      const softBullets = []
      for (const f of softFiles) {
        if (!notedPaths.has(f)) softBullets.push(`- ${f}（软归属·同模块测试，未声明）`)
      }
      if (fileNotes.length > 0) {
        const bullets = [...fileNotes.map((n) => `- ${n.path}${n.note ? `（${n.note}）` : ''}`), ...softBullets]
        lines[i] = `文件：\n${bullets.join('\n')}`
      } else if (softBullets.length > 0) {
        lines[i] = `文件：\n${[...changedFiles.map((f) => `- ${f}`), ...softBullets].join('\n')}`
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
    // 根因块嵌套四子字段（- 现象：/- 根因：/- 护栏：/- 证据： 列表行，D-004@v1 postmortem 形态）属
    // 根因块正文：在此随多行结果逐行原样落盘（带「- 」前缀、保序含换行），不被字段边界扫描误切——
    // 单行归一切分只认「- 」前缀之外的需求：/根因：/方案：/结果： 标签，嵌套行天然不参与边界判定。
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

// 他者会话 guard 预留 ql-ID 的采集阈值：超龄会话的预留不再钉序号。与 run/shared.js
// collectOtherQuickSessionDeclarations 的 FOREIGN_SESSION_STALE_MS 同口径（7 天）——正常并发
// 会话间隔在分钟/小时级，7 天未收尾的会话按僵尸处理。本模块不 import run 层（分层：
// run/* → quicklog，反向会成环），阈值在此独立声明。
const GUARD_CLAIM_STALE_MS = 7 * 24 * 60 * 60 * 1000

/**
 * 采集当前库内各 quick 会话 guard.json 已预留的 ql-ID（坑 ql-id-double-occupancy）。
 *
 * quick 启动在锁内追加 QUICKLOG 条目后把 ql-ID 写入 guard.json。条目随后丢失（并行 git
 * 操作回滚未提交 QUICKLOG / worktree 分裂合并等）时，QUICKLOG 扫描看不到该预留 → 下一个
 * 会话分配复用同一序号（suffix 再撞上即整 ID 双占用，2026-09-13 实证 007-1351、历史
 * 2026-06-04 001-7a4c 同款）。分配期对 guard 预留让位（allocateQuicklogEntry）、--done 期
 * 对残留占用校验（complete-handlers）都以此为准。
 *
 * fail-open：目录不存在/损坏 guard.json/超龄僵尸/任何异常 → 跳过或空集，采集失败回到
 * 无预留现状（不放大让位面）。
 *
 * @param {string} specBase .sillyspec 根目录
 * @param {string|null} [sessionsDirHint] quick-sessions 目录（run 层经 resolveQuickSessionsDir
 *   解析后传入；缺省 <specBase>/.runtime/quick-sessions）
 * @param {number} [nowMs] 当前时间戳（可注入，测试用）
 * @returns {Map<string, string[]>} qlId → 预留该 ID 的 sessionId 列表
 */
/**
 * 遍历 quick-sessions 目录，按同一僵尸窗口口径读各会话 guard.json（collectGuardReservedQuicklogIds
 * 与 collectActiveQuickGuardFiles 共用，活跃判定勿分叉）：guard.json 损坏/缺失 → guard=null 保留
 * 条目（消费方各自决定跳过或视为空声明）；startedAt 可解析且超 GUARD_CLAIM_STALE_MS → 僵尸剔除。
 *
 * @param {string} dir quick-sessions 目录
 * @param {number} [nowMs] 当前时间戳（可注入，测试用）
 * @returns {Array<{sessionId: string, guard: object|null}>}
 */
function listQuickSessionGuards(dir, nowMs = Date.now()) {
  const out = []
  let sessionDirs = []
  try {
    sessionDirs = readdirSync(dir, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name)
  } catch { return out } // 目录不存在/不可读 → 无会话
  for (const sessionName of sessionDirs) {
    let guard = null
    try { guard = JSON.parse(readFileSync(join(dir, sessionName, 'guard.json'), 'utf8')) } catch { guard = null } // 损坏/缺失 → null
    if (guard && guard.startedAt) {
      const startedAtMs = Date.parse(guard.startedAt)
      if (Number.isFinite(startedAtMs) && nowMs - startedAtMs > GUARD_CLAIM_STALE_MS) continue // 僵尸不活跃
    }
    out.push({ sessionId: sessionName, guard })
  }
  return out
}

export function collectGuardReservedQuicklogIds(specBase, sessionsDirHint = null, nowMs = Date.now()) {
  const out = new Map()
  try {
    const dir = sessionsDirHint || join(specBase, '.runtime', 'quick-sessions')
    for (const { sessionId, guard } of listQuickSessionGuards(dir, nowMs)) {
      if (!guard || typeof guard.quicklogId !== 'string' || !guard.quicklogId) continue
      if (!out.has(guard.quicklogId)) out.set(guard.quicklogId, [])
      out.get(guard.quicklogId).push(sessionId)
    }
  } catch { /* fail-open：采集失败等同无预留 */ }
  return out
}

/**
 * 采集各活跃 quick 会话 guard.json 声明的 allowedFiles（apply 前 guard 相交预检，FR-03 / D-002@v1）。
 *
 * 活跃口径与 collectGuardReservedQuicklogIds 同源（listQuickSessionGuards）：guard 目录存在即活跃
 * （quick --done 完成时清理 guard 目录，完成态天然退出），超 7 天僵尸窗口（GUARD_CLAIM_STALE_MS，
 * 异常残留不钉死）剔除。勿用 changes.last_active 判活跃（非周期心跳，D-002）。
 *
 * @param {string} specBase .sillyspec 根目录
 * @param {{ excludeChange?: string|null, sessionsDir?: string|null, nowMs?: number }} [opts]
 *   - excludeChange：排除自身 change 的 quick 会话——sessionId == changeName（quick 会话 id 即
 *     change 名）或 guard.linkedChanges 显式关联该 change 的协作会话（自己人，非拦截面）
 *   - sessionsDir：quick-sessions 目录（缺省 <specBase>/.runtime/quick-sessions）
 *   - nowMs：当前时间戳（可注入，测试用）
 * @returns {Map<string, string[]>} sessionId → guard.allowedFiles（无 guard/无声明 → 空数组；fail-open）
 */
export function collectActiveQuickGuardFiles(specBase, { excludeChange = null, sessionsDir = null, nowMs = Date.now() } = {}) {
  const out = new Map()
  try {
    const dir = sessionsDir || join(specBase, '.runtime', 'quick-sessions')
    for (const { sessionId, guard } of listQuickSessionGuards(dir, nowMs)) {
      if (excludeChange && (sessionId === excludeChange
        || (guard && Array.isArray(guard.linkedChanges) && guard.linkedChanges.includes(excludeChange)))) continue
      const allowed = (guard && Array.isArray(guard.allowedFiles))
        ? guard.allowedFiles.filter(f => typeof f === 'string' && f.length > 0)
        : []
      out.set(sessionId, allowed)
    }
  } catch { /* fail-open：采集失败等同无活跃 guard（不放大拦截面） */ }
  return out
}

/**
 * 数某 qlId 在所有 QUICKLOG-*.md 里的条目头出现次数（--done 占用校验用）。
 * ≥2 = 分配竞态残留已损坏记录（同 ID 双条目）；容错空白形态与 scanExisting 的 reLoose 同口径。
 * @returns {{count: number, files: string[]}} count=命中头总数；files=「文件名×次数」列表
 */
export function countQuicklogEntries(specBase, qlId) {
  const out = { count: 0, files: [] }
  if (!qlId || typeof qlId !== 'string') return out
  const quicklogDir = join(specBase, 'quicklog')
  if (!existsSync(quicklogDir)) return out
  const re = new RegExp(`^##[ \\t]*${escapeRe(qlId)}[ \\t]*\\|`, 'gm')
  for (const f of listQuicklogFiles(quicklogDir)) {
    let content = ''
    try { content = readFileSync(join(quicklogDir, f), 'utf8') } catch { continue }
    const n = (content.match(re) || []).length
    if (n > 0) { out.count += n; out.files.push(`${f}×${n}`) }
  }
  return out
}

/**
 * 分配 ql-ID 并写「进行中」条目 + 关联 tasks.md。持锁、当天唯一。
 * 分配查重（坑 ql-id-double-occupancy）：盘上当天全 ID（含容错空白形态）+ 他者活跃会话
 * guard 预留（sessionsDir）的序号一并让位，maxSeq 取三者最大后再 +1。
 * @returns {Promise<{qlId: string}>}
 */
export async function allocateQuicklogEntry(specBase, gitUser, { description, linkedChanges = [], allowedFiles = [], sessionsDir = null } = {}) {
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

  // 平台推送在锁外执行（2026-09-11 审查性能包①）：锁内 5s 网络推送 + 逐变更 tasks 锁
  // （最坏各 10s）可使临界区突破 30s stale 偷锁阈值——他进程偷锁后双写者并发，正是本模块
  // 头声明要根治的并发丢更新被重新打开。推送 best-effort 不回写本地，锁外语义等同（原注释
  // 自证），仅放弃「分配即推送」的顺序一致性（平台为 best-effort 面板，乱序窗口极小）。
  let pushPayload = null
  const { qlId } = await withFileLock(lockPath, async () => {
    const { maxSeq: diskMaxSeq, usedSuffix, usedIds } = scanExisting(quicklogDir, today)
    // 他者 guard 预留让位（坑 ql-id-double-occupancy）：同日预留序号并入 maxSeq；整 ID 进
    // 末检集。QUICKLOG 条目丢失但 guard 仍在的窗口内，盘上扫描看不见该预留——正是
    // 2026-09-13 007-1351 双占用的形态。
    const claims = collectGuardReservedQuicklogIds(specBase, sessionsDir)
    let maxSeq = diskMaxSeq
    const claimedIds = new Set()
    for (const [claimedId] of claims) {
      claimedIds.add(claimedId.toLowerCase())
      const cm = claimedId.match(/^ql-(\d{8})-(\d{3})-([0-9a-fA-F]{4})$/)
      if (cm && cm[1] === today) maxSeq = Math.max(maxSeq, parseInt(cm[2], 10))
    }
    const nextSeq = maxSeq + 1
    // XXXX 4 位 hex 随机后缀（消歧；NNN 已让位到所有已知占用之后，此处 belt-and-suspenders：
    // usedSuffix 全日后缀避让 + 全 ID 末检，理论撞号需单日后缀空间耗尽，200 次兜底抛错）
    let suffix
    let qlId
    let guard = 0
    do {
      suffix = randomBytes(2).toString('hex')
      qlId = `ql-${today}-${String(nextSeq).padStart(3, '0')}-${suffix}`
      guard++
    } while ((usedSuffix.has(suffix) || usedIds.has(qlId) || claimedIds.has(qlId)) && guard < 200)
    if (usedIds.has(qlId) || claimedIds.has(qlId)) {
      throw new Error('allocateQuicklogEntry: ql-ID 查重 200 次仍未命中空闲号（当日条目异常膨胀，请检查 quicklog/）')
    }

    await rotateIfNeeded(userFile, user)
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

    pushPayload = {
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
    }
    return { qlId }
  })
  if (pushPayload) {
    await pushQuicklogEntryToPlatform(specBase, pushPayload).catch(() => {}) // 自身已吞错；双保险防未来改动破坏 best-effort 契约
  }
  return { qlId }
}

/**
 * 以**给定 ql-ID** 追加一条「进行中」骨架条目（不分配新 ID）。
 *
 * 坑 platform-takeover-phantom-progress-db 同日变体：quick --done 兜底复用启动分配的
 * ql-ID（进度库 changes.quicklog_id 可查）时，该 ID 的条目可能不在当前 specBase 的
 * QUICKLOG 文件里（启动与 --done 落到不同库/文件的分裂形态）——用原 ID 补建骨架再走
 * 完成翻态，保证「同一次会话只有一个 ql-ID」。条目已存在则幂等跳过（不重复追加）。
 * 与 allocateQuicklogEntry 同锁同格式同平台推送，仅跳过 ID 分配段。
 */
export async function appendQuicklogEntryWithId(specBase, gitUser, qlId, { description = '(guard 缺失补建)', linkedChanges = [], allowedFiles = [] } = {}) {
  if (!qlId || typeof qlId !== 'string') throw new Error('appendQuicklogEntryWithId: qlId 必填')
  if (findQuicklogEntry(specBase, gitUser, qlId)) return { qlId, existed: true }
  const quicklogDir = join(specBase, 'quicklog')
  mkdirSync(quicklogDir, { recursive: true })
  const user = sanitizeQuicklogUser(gitUser) || 'unknown'
  const userFile = join(quicklogDir, `QUICKLOG-${user}.md`)
  const lockPath = join(quicklogDir, `.QUICKLOG-${user}.md.lock`)
  const desc = sanitizeDesc(description)
  const linked = Array.isArray(linkedChanges) ? linkedChanges : []
  const files = Array.isArray(allowedFiles) ? allowedFiles : []

  // 推送出锁（同 allocateQuicklogEntry 性能包①：临界区只留本地写 + tasks 挂载）
  let pushPayload = null
  const { existed } = await withFileLock(lockPath, async () => {
    // 双检（锁内）：并发兜底同 ID 只落一条
    if (findQuicklogEntry(specBase, gitUser, qlId)) return { existed: true }
    await rotateIfNeeded(userFile, user)
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
    pushPayload = {
      ql_id: qlId,
      timestamp: nowDatetime(),
      title: desc,
      status: 'in_progress',
      status_note: null,
      author_raw: user,
      linked_changes: linked.filter(c => /^\d{4}-\d{2}-\d{2}-/.test(c)),
      files: files.map(f => ({ path: f, note: null })),
      body_sections: {},
      raw_block: entry,
    }
    return { existed: false }
  })
  if (pushPayload && !existed) {
    await pushQuicklogEntryToPlatform(specBase, pushPayload).catch(() => {})
  }
  return { qlId, existed }
}

/**
 * 翻某 qlId 条目为「已完成」+ 追加结果 + 勾选关联 tasks.md。持锁。
 */
export async function completeQuicklogEntry(specBase, gitUser, qlId, { resultText = '', linkedChanges = [], changedFiles = [], auditNotes = [], softFiles = [] } = {}) {
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
  // 软归属文件（complete-handlers 传入，已过 isQuickMetadata；反斜杠归一与 fileNotes 同口径）：
  // 窗口内未声明同模块测试文件，flipEntryInContent 补入文件行 bullet 带「软归属」括注。
  const soft = Array.isArray(softFiles)
    ? softFiles.filter(Boolean).map((f) => String(f).replace(/\\/g, '/'))
    : []

  // 推送出锁（性能包①）：终态 payload 以锁内落盘结果组装，锁外 best-effort 推送 + sidecar 持久化
  // （sidecar 与推送同源同解析器，同移锁外不改变「以落盘终态为准」语义）
  let finalPayload = null
  await withFileLock(lockPath, async () => {
    // 条目可能在主文件或轮转归档中
    let updatedContent = null
    for (const f of listQuicklogFiles(quicklogDir)) {
      const filePath = join(quicklogDir, f)
      let content = ''
      try { content = readFileSync(filePath, 'utf8') } catch { continue }
      const updated = flipEntryInContent(content, qlId, result, realFiles, fileNotes,
        Array.isArray(auditNotes) ? auditNotes.filter((n) => typeof n === 'string' && n.trim() !== '') : [], soft)
      if (updated !== null) {
        await writeAtomic(filePath, updated) // 命中处原子落盘（只改含目标条目的那一个文件）
        updatedContent = updated
        break
      }
    }
    for (const c of linked) await checkTaskCheckbox(specBase, c, qlId)

    // 平台推送（task-06 / FR-02 / D-003）：**以落盘终态为准**读回条目组装 payload
    // （design §5.3：翻完成时标题行被 extractTitleFromResult 刷新，推送须与落盘一致，
    // 不能用入参拼——标题/结果块/文件行都会在 flipEntryInContent 中重写）。
    const rawBlock = extractRawBlock(updatedContent, qlId)
    finalPayload = buildPushPayloadFromRaw(rawBlock, {
      ql_id: qlId,
      author_raw: user,
      status: 'completed',
      linked_changes: linked,
    })
  })
  // P1-4：终态结构 sidecar 持久化（同一解析器产出，md/sidecar 恒一致；fail-soft）
  writeQuicklogSidecar(specBase, finalPayload)
  await pushQuicklogEntryToPlatform(specBase, finalPayload).catch(() => {})
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

/**
 * 取消一个 quick 会话（2026-08-21 agent-手工产出审计第四批 C-2，`run quick --cancel` 数据源）。
 *
 * 误启动/放弃的 quick 会话此前无取消出口：QUICKLOG「进行中」条目 + 关联变更 tasks.md 挂载行
 * + .runtime/quick-sessions/<id>/ 永久残留，doctor --cleanup-ghosts 只清 db 幽灵行不清这三处。
 * 本函数做 allocateQuicklogEntry 的反操作（三步全是已有函数的反面）：
 *   1. QUICKLOG 条目状态翻「已取消」（非删除——保留痕迹可审计，与 doctor 宁漏勿杀口径一致）
 *   2. tasks.md 里该 qlId 的挂载行整行移除（未勾的空壳行，勾了说明实际做了工作 → 拒绝取消）
 *   3. 会话 guard 目录删除（quick-sessions/<sessionId>/，含 guard.json）
 *   4. current-quick-run-id 若指向本会话则删除（防后续 --done fallback 命中死会话）
 * db 侧 change 行由调用方 unregisterChange（quick 会话行，非真实变更）。
 *
 * fail-closed：已翻「已完成」的条目拒绝取消（那是真实工作）；tasks.md 挂载行已勾选同样拒绝。
 *
 * @param {{ specBase: string, gitUser: string, qlId: string, sessionId: string|null }} opts
 * @returns {Promise<{ ok: boolean, reason?: string, quicklogFile?: string, removedTaskRows: string[] }>}
 */
export async function cancelQuickSession({ specBase, gitUser, qlId, sessionId = null }) {
  if (!qlId) return { ok: false, reason: '缺 qlId（--change <quick-会话ID> 或 --ql <ql-xxx>）' }
  const quicklogDir = join(specBase, 'quicklog')
  const user = sanitizeQuicklogUser(gitUser) || 'unknown'
  const lockPath = join(quicklogDir, `.QUICKLOG-${user}.md.lock`)

  // 1. QUICKLOG 翻「已取消」：找到条目，校验未完成，就地改状态行
  let quicklogFile = null
  let flipped = false
  await withFileLock(lockPath, async () => {
    // 坑 quick-cancel-blind-after-quicklog-rotation（2026-09-16 实证）：主文件存在时旧逻辑
    // 只扫主文件——轮转发生后历史条目在归档文件（QUICKLOG-<user>-<日期>.md）里永久不可达，
    // 「提示清理 → 清理必失败」死循环。恒扫全部 QUICKLOG 文件（主文件优先，命中即停），
    // 用户文件缺失的 CI user 漂移场景语义不变。
    const allFiles = listQuicklogFiles(quicklogDir)
    const mainFile = `QUICKLOG-${user}.md`
    const files = existsSync(join(quicklogDir, mainFile))
      ? [mainFile, ...allFiles.filter(f => f !== mainFile)]
      : allFiles
    for (const f of files) {
      const p = join(quicklogDir, f)
      const content = existsSync(p) ? readFileSync(p, 'utf8') : ''
      if (!content.includes(`## ${qlId} |`)) continue
      quicklogFile = p
      const lines = content.split(/\r?\n/)
      const startIdx = lines.findIndex(l => l.startsWith(`## ${qlId} |`))
      let endIdx = lines.length
      for (let i = startIdx + 1; i < lines.length; i++) {
        if (lines[i].startsWith('## ')) { endIdx = i; break }
      }
      for (let i = startIdx + 1; i < endIdx; i++) {
        if (/^状态：已完成/.test(lines[i])) {
          throw new Error(`${qlId} 已完成（真实工作记录），拒绝取消；如需修正请手改 QUICKLOG`)
        }
      }
      for (let i = startIdx + 1; i < endIdx; i++) {
        if (/^状态：进行中/.test(lines[i])) {
          lines[i] = '状态：已取消'
          flipped = true
          break
        }
      }
      if (flipped) {
        // split(/\r?\n/) 吃掉行尾 \r 再按原 eol join：旧写法 split('\n') 保留 \r 又 join('\r\n')
        // 会产出 \r\r\n 字节级污染（git diff 全文件红）；原子写防 agent/dashboard 轮询读半截
        const eol = content.includes('\r\n') ? '\r\n' : '\n'
        await writeAtomic(p, lines.join(eol))
        // P1-4：sidecar 同步翻「已取消」（无 sidecar 的存量条目跳过——md 仍是真相源）
        const _sc = readQuicklogSidecar(specBase, qlId)
        if (_sc) writeQuicklogSidecar(specBase, { ..._sc, status: '已取消' })
      }
      break
    }
  })
  if (!quicklogFile) return { ok: false, reason: `未在任何 QUICKLOG 文件找到条目 ${qlId}` }
  if (!flipped) return { ok: false, reason: `${qlId} 状态行异常（非进行中也非已完成），请手查 QUICKLOG` }

  // 2. tasks.md 挂载行移除（所有活跃变更统一扫——allocate 时可能挂多个关联变更）
  const removedTaskRows = []
  const changesRoot = join(specBase, 'changes')
  if (existsSync(changesRoot)) {
    for (const c of readdirSync(changesRoot, { withFileTypes: true })) {
      if (!c.isDirectory() || c.name === 'archive') continue
      const tp = tasksPath(specBase, c.name)
      if (!existsSync(tp)) continue
      await withFileLock(tasksLockPath(tp), async () => {
        const content = readFileSync(tp, 'utf8')
        if (!content.includes(qlId)) return
        const lines = content.split(/\r?\n/)
        const kept = lines.filter(l => {
          const m = l.match(/^[-*]\s*\[([ xX])\]\s*(\S+)/)
          if (m && m[2] === qlId) {
            if (m[1] !== ' ') throw new Error(`${c.name}/tasks.md 的 ${qlId} 行已勾选（实际做了工作），拒绝取消`)
            removedTaskRows.push(`${c.name}/tasks.md`)
            return false
          }
          return true
        })
        if (kept.length !== lines.length) {
          const eol = content.includes('\r\n') ? '\r\n' : '\n'
          await writeAtomic(tp, kept.join(eol))
        }
      })
    }
  }

  // 3+4. 会话目录与 current marker
  if (sessionId) {
    try { rmSync(join(specBase, '.runtime', 'quick-sessions', sessionId), { recursive: true, force: true }) } catch {}
    const marker = join(specBase, '.runtime', 'current-quick-run-id')
    try {
      if (existsSync(marker) && readFileSync(marker, 'utf8').trim() === sessionId) unlinkSync(marker)
    } catch {}
  }

  return { ok: true, quicklogFile, removedTaskRows }
}

// ── quicklog commit（known-issues ④ v1：本会话条目切片提交，2026-09-16）──
//
// 坑 QUICKLOG 多会话条目交织：QUICKLOG 是多会话共享追加的单文件，某会话 `git add` 整文件
// 会夹带并行会话未完成条目（违反显式 pathspec 隔离纪律，AGENTS.md 第 18 条），只能
// 「备份 → 剥离并行条目 → commit pathspec → 恢复」四步舞（2026-09-15/16 单会话实证 6 次）。
// 本命令把四步舞机制化：
//   切片（工作区 = HEAD 基线 + 本会话条目块）→ git add/commit 显式 pathspec（含 patches
//   sidecar 与额外 pathspec）→ finally 恢复工作区全量（并行条目留「未提交」预期态）。
// 任一步失败 fail-fast 打印人工兜底；恢复在 finally，commit 失败也不留半态。
// 「完整文件化」（entries sidecar 权威 + 聚合渲染）不在 v1 范围，见 known-issues 条目。

// git 子操作退避重试：与 wt-commit.js gitWithLockRetry 同款（本文件锁只约束 quicklog 写方，
// 锁队列外裸跑 git 的并行进程仍可能短暂持 index.lock/HEAD 锁，等待重试消化）。
async function quicklogGitRetry(cwd, args, label, { retries = 6, waitMs = 1000 } = {}) {
  for (let i = 0; ; i++) {
    const { value, error } = safeGit(cwd, args, { timeout: 30000 })
    if (!error) return value
    const msg = String((error && error.message) || error)
    if (/index\.lock|HEAD\.lock|cannot lock ref/i.test(msg) && i < retries) {
      await sleep(waitMs)
      continue
    }
    throw new Error(`${label} 失败：${msg.split('\n')[0].trim()}`)
  }
}

// 行级条目头匹配（容错口径与 countQuicklogEntries 一致：## 后空白可省、ID 与 | 间空白可变）
function findQuicklogEntryLineIdx(lines, qlId) {
  const re = new RegExp(`^##[ \\t]*${escapeRe(qlId)}[ \\t]*\\|`)
  return lines.findIndex(l => re.test(l))
}

/**
 * 切片：工作区全量 → 「基线 + 指定条目块」。
 * 块界 = `## ql-<id>` 头到下一个 `## ` 头/文件尾（extractRawBlock 同口径）；条目间补单空行
 * 分隔（对齐 allocateQuicklogEntry 条目模板形态）。EOL 随工作区文件——HEAD blob 归一到
 * 工作区 EOL 再拼（.gitattributes eol=lf + autocrlf=true 环境下 blob 是 LF、工作区 CRLF；
 * git add 时按配置归一回去，不产生整文件行尾假差异）。条目头已在基线（先前提交过）→
 * 跳过不重复（重跑幂等）。返回 null = 无任何目标条目；blocks 为空 = 全部已在基线
 * （调用方不落盘不动文件，避免基线归一化重写制造假提交）。
 */
function sliceQuicklogFileContent(fullContent, baselineContent, qlIds) {
  const eol = fullContent.includes('\r\n') ? '\r\n' : '\n'
  const norm = (s) => String(s || '').replace(/\r\n/g, '\n')
  const lines = norm(fullContent).split('\n')
  const baseLines = norm(baselineContent).split('\n')
  while (baseLines.length && baseLines[baseLines.length - 1].trim() === '') baseLines.pop()
  const blocks = []
  const blockIds = []
  const alreadyIncluded = []
  for (const qlId of qlIds) {
    const startIdx = findQuicklogEntryLineIdx(lines, qlId)
    if (startIdx === -1) continue
    if (findQuicklogEntryLineIdx(baseLines, qlId) !== -1) { alreadyIncluded.push(qlId); continue }
    let endIdx = lines.length
    for (let i = startIdx + 1; i < lines.length; i++) {
      if (/^##[ \t]*\S/.test(lines[i])) { endIdx = i; break }
    }
    const block = lines.slice(startIdx, endIdx)
    while (block.length && block[block.length - 1].trim() === '') block.pop()
    blocks.push(block)
    blockIds.push(qlId)
  }
  if (blocks.length === 0 && alreadyIncluded.length === 0) return null
  const outLines = [...baseLines]
  for (const block of blocks) {
    if (outLines.length > 0) outLines.push('') // 条目间空行分隔
    outLines.push(...block)
  }
  let sliced = outLines.join('\n') + '\n'
  if (eol === '\r\n') sliced = sliced.replace(/\n/g, '\r\n')
  return { content: sliced, blockIds, alreadyIncluded }
}

const QUICKLOG_COMMIT_MANUAL_FALLBACK = [
  '人工兜底（四步舞）：',
  '  ① 备份 QUICKLOG 文件：cp <文件> /tmp/quicklog-backup.md',
  '  ② 从工作区文件剥离并行会话条目（只留本会话条目，条目块 = "## ql-…" 行到下一个 "## " 头）',
  '  ③ git add -- <QUICKLOG文件> .sillyspec/quicklog/patches/<ql-id>.* && git commit -m "..."',
  '  ④ 从备份恢复工作区全量（并行条目回到未提交态）',
].join('\n')

/**
 * 一键收编本会话 QUICKLOG 条目（`sillyspec quicklog commit`，known-issues ④ v1）。
 *
 * 持用户 QUICKLOG 锁（与 allocate/complete/cancel 同锁）跨「定位 → 切片 → 提交 → 恢复」
 * 全程——锁内重读文件，并发追加的并行条目不丢（恢复用的就是锁内读到的最新全量）。
 *
 * @param {object} opts
 * @param {string} opts.specBase .sillyspec 根目录
 * @param {string} [opts.cwd] 调用方 cwd（git rev-parse --show-toplevel 的起点）
 * @param {string} opts.gitUser git user.name（定位本用户 QUICKLOG 文件与锁）
 * @param {string[]} [opts.qlIds] 显式 ql-ID（--ql，可含已取消条目——历史一并收编）
 * @param {string|null} [opts.changeName] quick 会话 ID（缺 --ql 时读其 guard.json 的 quicklogId）
 * @param {string|null} [opts.sessionsDir] quick-sessions 目录（平台模式异位时由 dispatch 传入）
 * @param {string} opts.message 提交信息
 * @param {string[]} [opts.extraPathspecs] 额外 pathspec（-- 后透传，随本次提交带上）
 * @returns {Promise<{ok:boolean,skipped:boolean,head:string,shortHead:string,files:string[],
 *   quicklogFiles:string[],committedQlIds:string[],skippedQlIds:string[],backupPaths:string[]}>}
 */
export async function runQuicklogCommit({ specBase, cwd = process.cwd(), gitUser, qlIds = [], changeName = null, sessionsDir = null, message = '', extraPathspecs = [] }) {
  if (!message || !message.trim()) throw new Error('缺少 -m/--message <提交信息>（建议 "chore: 收编本会话 QUICKLOG 条目——<一句话>"）')
  const ids = [...new Set((Array.isArray(qlIds) ? qlIds : []).filter(id => typeof id === 'string' && id.trim()).map(id => id.trim()))]

  // ql-ID 解析优先级：--ql 显式 > 会话 guard.json（写侧字段 quicklogId，兼容旧 .qlId）
  if (ids.length === 0 && changeName) {
    const guardPath = join(sessionsDir || join(specBase, '.runtime', 'quick-sessions'), changeName, 'guard.json')
    try {
      if (existsSync(guardPath)) {
        const g = JSON.parse(readFileSync(guardPath, 'utf8'))
        const q = g.quicklogId || g.qlId
        if (typeof q === 'string' && q.trim()) ids.push(q.trim())
      }
    } catch { /* guard 损坏 → 按缺失走下方 fail-fast */ }
  }
  if (ids.length === 0) {
    throw new Error(`无法定位 ql-ID：--change 会话的 guard.json 缺失/损坏且未传 --ql——显式传 --ql <ql-xxx>（可重复传多个；含已取消条目，cancelled 也是历史一并收编；ID 即 QUICKLOG 条目头 "## ql-…" 的 ID）`)
  }

  const quicklogDir = join(specBase, 'quicklog')
  const user = sanitizeQuicklogUser(gitUser) || 'unknown'
  const lockPath = join(quicklogDir, `.QUICKLOG-${user}.md.lock`)
  const repoRootRaw = safeGit(cwd, ['rev-parse', '--show-toplevel'], { timeout: 10000 }).value
  if (!repoRootRaw) throw new Error(`git 仓库定位失败（cwd=${cwd} 的 git rev-parse --show-toplevel 无输出）`)
  const repoRoot = resolve(repoRootRaw)
  const toRel = (abs) => relative(repoRoot, abs).replace(/\\/g, '/')

  const result = await withFileLock(lockPath, async () => {
    // 锁内重扫（并发追加不丢）：主文件优先，恒扫全部 QUICKLOG 文件（含轮转归档——
    // 2026-09-16 实证 ql-013 落轮转新文件、ql-014 又落回旧文件，新旧都可能有本会话条目）
    const allFiles = listQuicklogFiles(quicklogDir)
    const mainName = `QUICKLOG-${user}.md`
    const ordered = existsSync(join(quicklogDir, mainName))
      ? [mainName, ...allFiles.filter(f => f !== mainName)] : allFiles
    const plans = []
    const found = new Set()
    for (const f of ordered) {
      const p = join(quicklogDir, f)
      let content = ''
      try { content = readFileSync(p, 'utf8') } catch { continue }
      const contentLines = content.split(/\r?\n/)
      const hit = ids.filter(id => findQuicklogEntryLineIdx(contentLines, id) !== -1)
      for (const id of hit) found.add(id)
      if (hit.length > 0) plans.push({ file: p, rel: toRel(p), content, hitIds: hit })
    }
    // 工作区未命中者查 HEAD 基线：已在 = 幂等跳过；两边都无 = fail-fast（--ql 笔误防护）
    const alreadyCommitted = []
    for (const id of ids.filter(i => !found.has(i))) {
      let inHead = false
      for (const f of ordered) {
        const blob = safeGit(repoRoot, ['show', `HEAD:${toRel(join(quicklogDir, f))}`], { trim: false, timeout: 10000 }).value
        if (blob && findQuicklogEntryLineIdx(blob.replace(/\r\n/g, '\n').split('\n'), id) !== -1) { inHead = true; break }
      }
      if (inHead) alreadyCommitted.push(id)
      else throw new Error(`条目 ${id} 在所有 QUICKLOG-*.md（含轮转归档）与 HEAD 中均未找到——核对 --ql 的 ql-ID。\n${QUICKLOG_COMMIT_MANUAL_FALLBACK}`)
    }

    // 切片 + 备份（.runtime 不入库，恢复失败时的最后兜底）。无新块的文件不动不落盘——
    // 已收编条目重跑形态下按基线归一化重写会制造只差尾部空行的假提交。
    const now = new Date()
    const stamp = `${todayStamp(now)}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
    mkdirSync(join(specBase, '.runtime'), { recursive: true })
    const backups = []
    const originals = []
    const slicePlans = []
    for (const plan of plans) {
      const baseline = safeGit(repoRoot, ['show', `HEAD:${plan.rel}`], { trim: false, timeout: 10000 }).value || ''
      const sliced = sliceQuicklogFileContent(plan.content, baseline, plan.hitIds)
      if (!sliced) continue // 不可能（plan.hitIds 非空才进 plans），防御
      for (const id of sliced.alreadyIncluded) alreadyCommitted.push(id)
      if (sliced.blockIds.length === 0) continue // 全部已在基线：文件不动、不进提交
      const backupPath = join(specBase, '.runtime', `quicklog-slice-${stamp}-${basename(plan.file)}`)
      writeFileSync(backupPath, plan.content)
      backups.push(backupPath)
      originals.push({ file: plan.file, content: plan.content })
      await writeAtomic(plan.file, sliced.content)
      slicePlans.push(plan)
    }

    // pathspec 组装：QUICKLOG 文件 + patches sidecar（--done 冻结件，存在才加）+ 额外透传
    const addPaths = slicePlans.map(pl => pl.rel)
    for (const id of ids) {
      for (const ext of ['.json', '.patch']) {
        const sp = join(quicklogDir, 'patches', id + ext)
        if (existsSync(sp)) addPaths.push(toRel(sp))
      }
    }
    for (const extra of (Array.isArray(extraPathspecs) ? extraPathspecs : []).filter(Boolean)) {
      addPaths.push(toRel(isAbsolute(extra) ? extra : resolve(cwd, extra)))
    }
    if (addPaths.length === 0) {
      // 条目均已收编且无 sidecar/额外 pathspec → 无事可做（幂等重跑）
      return { skipped: true, head: safeGit(repoRoot, ['rev-parse', 'HEAD'], { timeout: 10000 }).value || '', addPaths: [], backups, alreadyCommitted, quicklogFiles: slicePlans.map(pl => basename(pl.file)) }
    }

    try {
      await quicklogGitRetry(repoRoot, ['add', '--', ...addPaths], 'git add')
      // pathspec 范围内无 staged 变更 = 条目均已收编（幂等重跑），HEAD 不动不算失败
      const staged = safeGit(repoRoot, ['diff', '--cached', '--name-only', '--', ...addPaths], { timeout: 10000 }).value || ''
      if (!staged.trim()) {
        return { skipped: true, head: safeGit(repoRoot, ['rev-parse', 'HEAD'], { timeout: 10000 }).value || '', addPaths, backups, alreadyCommitted, quicklogFiles: slicePlans.map(pl => basename(pl.file)) }
      }
      await quicklogGitRetry(repoRoot, ['commit', '-m', message, '--', ...addPaths], 'git commit')
      const head = safeGit(repoRoot, ['rev-parse', 'HEAD'], { timeout: 10000 }).value || ''
      return { skipped: false, head, addPaths, backups, alreadyCommitted, quicklogFiles: slicePlans.map(pl => basename(pl.file)) }
    } finally {
      // 恢复：切片前工作区全量写回（并行会话条目回到「未提交」预期态；原子写防轮询读半截）
      for (const o of originals) await writeAtomic(o.file, o.content)
    }
  }, {
    staleMs: 120000, // 临界区含 git add/commit（AV 扫描的 Windows 上秒级起步），30s 默认会被误偷锁
    timeoutMs: 120000,
    content: JSON.stringify({ pid: process.pid, purpose: 'quicklog-commit' }),
  })

  const already = [...new Set(result.alreadyCommitted)]
  return {
    ok: true,
    skipped: !!result.skipped,
    head: result.head,
    shortHead: (result.head || '').slice(0, 8),
    files: result.addPaths,
    quicklogFiles: result.quicklogFiles,
    committedQlIds: ids.filter(id => !already.includes(id)),
    skippedQlIds: already,
    backupPaths: result.backups,
  }
}
